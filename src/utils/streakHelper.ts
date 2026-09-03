export interface WeekDayStatus {
  dayName: string; // 'M', 'T', 'W', 'T', 'F', 'S', 'S'
  dateStr: string; // 'YYYY-MM-DD'
  status: 'completed' | 'missed' | 'today_pending' | 'future';
  isToday: boolean;
}

export const processStudentStreakAndWeekStatus = async (student: any): Promise<{ streak: number; weekStatus: WeekDayStatus[] }> => {
  if (!student) return { streak: 0, weekStatus: [] };

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  // Calculate Yesterday YYYY-MM-DD
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  // Current active history array
  let activeHistory: string[] = Array.isArray(student.activeDaysHistory) ? student.activeDaysHistory : [];

  // Ensure today's login/activity is recorded in active history
  if (!activeHistory.includes(todayStr)) {
    activeHistory = [...activeHistory, todayStr];
  }

  // Find most recent active date prior to today
  const pastActiveDates = activeHistory
    .filter((d) => d !== todayStr)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  let currentStreak = student.streak || 0;

  if (pastActiveDates.length === 0) {
    // Brand new or 1st active day
    currentStreak = 1;
  } else {
    const lastActiveDate = pastActiveDates[0];
    if (lastActiveDate === yesterdayStr) {
      // Consecutive day! Keep current streak (or 1 if was 0)
      if (currentStreak === 0) currentStreak = 1;
    } else if (lastActiveDate < yesterdayStr) {
      // MISSED 1 OR MORE DAYS! Reset streak back to 1 for today!
      currentStreak = 1;
    }
  }

  // Update DB if streak or activeHistory changed
  if (student.streak !== currentStreak || JSON.stringify(student.activeDaysHistory) !== JSON.stringify(activeHistory)) {
    student.streak = currentStreak;
    student.activeDaysHistory = activeHistory;
    student.lastLoginAt = now;
    await student.save().catch(() => {});
  }

  // Generate Current Week Status (Monday to Sunday)
  const dayOfWeek = now.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);

  const activeSet = new Set(activeHistory);
  const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  const weekStatus: WeekDayStatus[] = dayLabels.map((dayName, index) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + index);
    const dateStr = d.toISOString().split('T')[0];

    const isToday = dateStr === todayStr;
    const isPast = d < new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let status: 'completed' | 'missed' | 'today_pending' | 'future' = 'future';

    if (activeSet.has(dateStr)) {
      status = 'completed';
    } else if (isPast) {
      status = 'missed'; // ❌ MISSED DAY!
    } else if (isToday) {
      status = student.lastRoutineDate === todayStr ? 'completed' : 'today_pending';
    }

    return {
      dayName,
      dateStr,
      status,
      isToday,
    };
  });

  return { streak: currentStreak, weekStatus };
};

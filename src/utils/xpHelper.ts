export const XP_TABLE = {
  DAILY_STREAK: 20,
  COURSE_COMPLETION_50: 25,
  COURSE_COMPLETION_100: 50,
  LIVE_EVENT_ATTENDANCE: 100,
  COURSE_PRODUCT_SUBMISSION: 50,
  TODAYS_FOCUS: 30,
  FEED_COMMENT: 5,
  FEED_LIKE: 2,
  FEED_POST: 15,
  WIN_WALL_SHARE: 30,
  ART_O_THON_FINISHER: 500,
  HOF: 1000,
  ARTISTRY_PINNACLE_AWARD: 2000,
};

/**
 * Strictly checks whether a student is in L3 (Diamond Club) tier.
 * ONLY L3 students earn XP across all modules.
 */
export const isL3Student = (user: any): boolean => {
  if (!user) return false;
  const level = ((user.membershipLevel || user.rank || '') + '').toUpperCase();
  return level.includes('L3') || level.includes('DIAMOND') || level.includes('RENAISSANCE');
};

/**
 * Safely awards XP to a user IF AND ONLY IF they belong to L3 level.
 * Returns the amount of XP awarded (0 for non-L3 students).
 */
export const awardXpIfL3 = async (user: any, xpAmount: number): Promise<number> => {
  if (!user) return 0;
  if (!isL3Student(user)) return 0;

  user.points = (user.points || 0) + xpAmount;
  user.xpPoints = (user.xpPoints || 0) + xpAmount;
  await user.save();

  return xpAmount;
};

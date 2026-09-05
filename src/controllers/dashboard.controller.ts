import { Request, Response } from 'express';
import db from '../models';
import { AuthRequest } from '../middleware/auth.middleware';
import { processStudentStreakAndWeekStatus } from '../utils/streakHelper';

const { User, Course, Submission, Skill, Badge, Portfolio, Milestone, SalesRecord, Notification } = db;

// In-memory cache for level tiers
let cachedLevelTiers: any[] | null = null;
let levelTierCacheAt = 0;
const LEVEL_CACHE_TTL_MS = 5000; // 5 seconds cache for fast response and instant updates

export function clearLevelTierCache() {
  cachedLevelTiers = null;
  levelTierCacheAt = 0;
}

async function getLevelTiers() {
  const now = Date.now();
  if (cachedLevelTiers && (now - levelTierCacheAt) < LEVEL_CACHE_TTL_MS) {
    return cachedLevelTiers;
  }
  let tiers = await db.LevelTier.findAll({ order: [['order', 'ASC'], ['minPoints', 'ASC']] });
  if (!tiers || tiers.length === 0) {
    const DEFAULT_LEVELS = [
      { code: 'L0', name: 'Fast Track: Resin FastStart Bundle', minPoints: 0, maxPoints: 499, icon: '⚡', badgeColor: 'emerald', order: 0, description: 'Foundations, chemistry, and first creations', price: '₹499' },
      { code: 'L1', name: 'Silver Membership: Explore Membership', minPoints: 500, maxPoints: 4999, icon: '🥈', badgeColor: 'slate', order: 1, description: 'Core techniques, first client sale, and portfolio building', price: '₹4,999' },
      { code: 'L2', name: 'Gold Membership: Master Membership', minPoints: 5000, maxPoints: 9999, icon: '🏆', badgeColor: 'amber', order: 2, description: 'High-ticket geode clocks, bridal preservation, and consistent revenue', price: '₹19,999' },
      { code: 'L3', name: 'Diamond Membership: Renaissance Certification', minPoints: 10000, maxPoints: 49999, icon: '💎', badgeColor: 'cyan', order: 3, description: 'Scale beyond ₹50K/month, furniture river tables, and corporate orders', price: '₹59,999' },
      { code: 'L3+', name: 'Masters Club: Artistry Pinnacle', minPoints: 50000, maxPoints: null, icon: '👑', badgeColor: 'purple', order: 4, description: 'Offline city workshops, mentorship, and signature brand empire', price: 'Exclusive' },
    ];
    await db.LevelTier.bulkCreate(DEFAULT_LEVELS);
    tiers = await db.LevelTier.findAll({ order: [['order', 'ASC'], ['minPoints', 'ASC']] });
  }
  cachedLevelTiers = tiers;
  levelTierCacheAt = now;
  return tiers;
}

export const getAdminStats = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const [totalStudents, activeCourses, pendingAssignments] = await Promise.all([
      User.count({ where: { role: 'student' } }),
      Course.count(),
      Submission.count({ where: { status: 'pending' } }),
    ]);
    res.status(200).json({ totalStudents, activeCourses, pendingAssignments, rewardsDistributed: 0 });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getStudentStats = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const studentId = req.user?.id;
    if (!studentId) return res.status(401).json({ message: 'Unauthorized' });

    // Fire all independent queries in PARALLEL
    const [student, allCourses, communityWins, levelTiers] = await Promise.all([
      User.findByPk(studentId, {
        attributes: { exclude: ['password'] },
        include: [
          { model: Skill, as: 'skills' },
          { model: Badge, as: 'badges' },
          { model: Portfolio, as: 'portfolios', attributes: ['id', 'title', 'technique', 'imageUrl', 'feedback', 'createdAt'] },
          { model: Milestone, as: 'milestones', attributes: ['id', 'name', 'completed', 'completedAt', 'order'] },
          { model: SalesRecord, as: 'salesRecords', attributes: ['id', 'amount', 'productName', 'date'] },
          { model: Course, as: 'courses', attributes: ['id', 'title', 'description'] },
          { model: Notification, as: 'notifications', attributes: ['id', 'title', 'message', 'type', 'link', 'isRead', 'createdAt'] },
        ]
      }),
      Course.findAll({ attributes: ['id', 'title', 'description', 'image'] }),
      db.CommunityWin.findAll({ order: [['createdAt', 'DESC']], limit: 5 }),
      getLevelTiers(),
    ]);

    if (!student) return res.status(404).json({ message: 'Student not found' });

    const studentLevelRaw = (student.membershipLevel || 'GENERAL').toUpperCase();
    let currentTier: any = null;
    if (studentLevelRaw === 'GENERAL' || studentLevelRaw.includes('GENERAL')) {
      currentTier = {
        code: 'GENERAL',
        name: 'General Member',
        icon: '🌱',
        badgeColor: 'slate',
        order: -1,
        description: 'Direct registered student with preview access',
      };
    } else {
      const matchedTier = levelTiers.find((t: any) => t.code.toUpperCase() === studentLevelRaw);
      currentTier = matchedTier || levelTiers[0];
    }

    const nextMilestone = student.milestones?.find((m: any) => !m.completed);
    const nextGoal = nextMilestone ? `Next Milestone: ${nextMilestone.name}` : 'Complete pending missions';

    // Validity & Expiration check for student
    const now = new Date();
    const membershipExpiresAt = student.membershipExpiresAt ? new Date(student.membershipExpiresAt) : null;
    const isExpired = Boolean(membershipExpiresAt && now > membershipExpiresAt);
    let daysRemaining: number | null = null;
    if (membershipExpiresAt) {
      const diffTime = membershipExpiresAt.getTime() - now.getTime();
      daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    }

    // Process streak reset and calculate current week status
    const { streak: calculatedStreak, weekStatus } = await processStudentStreakAndWeekStatus(student);

    res.status(200).json({
      points: student.points,
      xpPoints: student.xpPoints,
      streak: calculatedStreak,
      weekStatus,
      membershipLevel: student.membershipLevel || currentTier?.name || 'GENERAL',
      currentTier,
      levelTiers,
      rank: student.rank,
      membershipExpiresAt,
      isExpired,
      daysRemaining,
      skills: student.skills,
      badges: student.badges,
      portfolios: student.portfolios,
      milestones: student.milestones,
      salesRecords: student.salesRecords,
      courses: (student as any).courses,
      notifications: (student as any).notifications,
      allCourses,
      communityWins,
      nextGoal
    });
  } catch (error) {
    console.error('Error fetching student stats:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getPublicLevelTiers = async (req: Request, res: Response): Promise<any> => {
  try {
    const levels = await getLevelTiers();
    return res.status(200).json(levels);
  } catch (error) {
    console.error('Error fetching public level tiers:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const likeCommunityWin = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const win = await db.CommunityWin.findByPk(id);
    if (!win) return res.status(404).json({ message: 'Win not found' });
    win.likes += 1;
    await win.save();
    return res.status(200).json(win);
  } catch (error) {
    console.error('Error liking win:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const commentCommunityWin = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const { text } = req.body;
    const authorName = (req.user as any)?.name || 'Student';
    if (!text) return res.status(400).json({ message: 'Comment text is required' });

    const student = await User.findByPk(req.user?.id);
    const studentLevel = (student?.membershipLevel || 'GENERAL').toUpperCase();
    if (studentLevel === 'GENERAL' || studentLevel === 'L0') {
      return res.status(403).json({
        message: 'General and Level 0 members have view-only access to the feed. Please upgrade to participate.'
      });
    }

    const win = await db.CommunityWin.findByPk(id);
    if (!win) return res.status(404).json({ message: 'Win not found' });
    win.comments = [...(win.comments || []), { author: authorName, text }];
    await win.save();
    return res.status(200).json(win);
  } catch (error) {
    console.error('Error commenting win:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const postCommunityWin = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { achievement, title, salesAmount, technique, imageUrl, image } = req.body;
    const studentId = req.user?.id;
    const studentName = (req.user as any)?.name || 'Student';
    if (!achievement && !title) return res.status(400).json({ message: 'Achievement text is required' });

    const student = await User.findByPk(studentId);
    const studentLevel = (student?.membershipLevel || 'GENERAL').toUpperCase();
    if (studentLevel === 'GENERAL' || studentLevel === 'L0') {
      return res.status(403).json({
        message: 'General and Level 0 members have view-only access to the community feed. Please upgrade your membership to post.'
      });
    }

    let fullAchievement = achievement || title;
    if (salesAmount) fullAchievement += ` (₹${Number(salesAmount).toLocaleString()} sale!)`;
    if (technique) fullAchievement += ` • Technique: ${technique}`;

    const win = await db.CommunityWin.create({
      studentName,
      achievement: fullAchievement,
      likes: 0,
      image: imageUrl || image || null,
      timeAgo: 'Just now'
    });

    let awardedXp = 0;
    let updatedPoints = 0;
    if (studentId) {
      const student = await User.findByPk(studentId);
      if (student) {
        // ONLY L3 (Diamond Club) students earn XP from Community Win posts
        const isL3Student =
          (student.membershipLevel || '').toUpperCase() === 'L3' ||
          (student.rank || '').toUpperCase().includes('DIAMOND') ||
          (student.membershipLevel || '').toUpperCase().includes('DIAMOND');

        if (isL3Student) {
          student.points = (student.points || 0) + 100;
          student.xpPoints = (student.xpPoints || 0) + 100;
          await student.save();
          awardedXp = 100;
          updatedPoints = student.points;
        } else {
          updatedPoints = student.points;
        }
      }
    }

    return res.status(201).json({
      success: true,
      win,
      awardedXp,
      updatedPoints,
      message: awardedXp > 0 ? `🎉 +${awardedXp} XP Awarded to Diamond (L3) Member!` : 'Post published to Community Feed successfully!'
    });
  } catch (error) {
    console.error('Error creating community win:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Student: Add Sale Record for Northstar Tracking System (+100 XP)
export const addStudentSalesRecord = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const studentId = req.user?.id;
    const { amount, productName, date } = req.body;

    if (!studentId) return res.status(401).json({ message: 'Unauthorized' });
    if (!amount || !productName) return res.status(400).json({ message: 'Amount and Product Name are required' });

    const record = await SalesRecord.create({
      userId: studentId,
      amount: parseFloat(amount),
      productName,
      date: date || new Date()
    });

    // Credit student with +100 XP for making a sale
    const student = await User.findByPk(studentId);
    if (student) {
      student.points = (student.points || 0) + 100;
      student.xpPoints = (student.xpPoints || 0) + 100;
      await student.save();
    }

    return res.status(201).json({
      success: true,
      record,
      message: 'Sales record logged successfully! +100 XP awarded!'
    });
  } catch (error) {
    console.error('Error adding sales record:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Student: Delete Sale Record
export const deleteStudentSalesRecord = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const studentId = req.user?.id;
    const { id } = req.params;

    if (!studentId) return res.status(401).json({ message: 'Unauthorized' });

    const record = await SalesRecord.findOne({ where: { id, userId: studentId } });
    if (!record) return res.status(404).json({ message: 'Sales record not found' });

    await record.destroy();
    return res.status(200).json({ success: true, message: 'Sales record deleted' });
  } catch (error) {
    console.error('Error deleting sales record:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Public/Student: Get All Active & Upcoming Events from DB
export const getPublicEventsList = async (_req: Request, res: Response): Promise<any> => {
  try {
    const events = await db.WebinarEvent.findAll({
      order: [['scheduledAt', 'ASC']],
    });
    return res.status(200).json({ success: true, data: events });
  } catch (error) {
    console.error('Error fetching events list:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// 6-Step Daily Routine Completion API (+10 XP & keeps Streak active)
export const completeDailyRoutine = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const studentId = req.user?.id;
    if (!studentId) return res.status(401).json({ message: 'Unauthorized' });

    const student = await User.findByPk(studentId);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const todayStr = new Date().toISOString().split('T')[0];

    if ((student as any).lastRoutineDate === todayStr) {
      return res.status(200).json({
        success: true,
        alreadyCompletedToday: true,
        streak: student.streak,
        points: student.points,
        message: 'Daily routine already completed for today!'
      });
    }

    // First time completing today: record active history, increment streak & award +10 XP
    const newStreak = (student.streak || 0) + 1;
    const newPoints = (student.points || 0) + 10;
    const newXp = (student.xpPoints || 0) + 10;

    let activeHistory: string[] = Array.isArray(student.activeDaysHistory) ? student.activeDaysHistory : [];
    if (!activeHistory.includes(todayStr)) {
      activeHistory = [...activeHistory, todayStr];
    }

    await student.update({
      streak: newStreak,
      points: newPoints,
      xpPoints: newXp,
      lastRoutineDate: todayStr,
      activeDaysHistory: activeHistory
    } as any);

    const { weekStatus } = await processStudentStreakAndWeekStatus(student);

    return res.status(200).json({
      success: true,
      alreadyCompletedToday: false,
      streak: newStreak,
      points: newPoints,
      weekStatus,
      xpAwarded: 10,
      message: 'Awesome job! +10 XP awarded and streak kept active!'
    });
  } catch (error) {
    console.error('Error completing daily routine:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// GET all community wins (Student / Authenticated users)
export const getCommunityWins = async (req: Request, res: Response): Promise<any> => {
  try {
    const wins = await db.CommunityWin.findAll({
      order: [['createdAt', 'DESC']]
    });
    return res.status(200).json(wins);
  } catch (error) {
    console.error('Error fetching community wins:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// GET all public badges (Student / Authenticated users)
export const getPublicBadges = async (req: Request, res: Response): Promise<any> => {
  try {
    const badges = await db.Badge.findAll({
      order: [['pointsRequired', 'ASC']]
    });
    return res.status(200).json(badges);
  } catch (error) {
    console.error('Error fetching public badges:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// GET all public courses (For landing page dynamic level mapping)
export const getPublicCourses = async (req: Request, res: Response): Promise<any> => {
  try {
    const courses = await db.Course.findAll({
      order: [['order', 'ASC'], ['createdAt', 'ASC']]
    });
    return res.status(200).json(courses);
  } catch (error) {
    console.error('Error fetching public courses:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
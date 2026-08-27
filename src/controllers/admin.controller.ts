import { Request, Response } from 'express';
import db from '../models';
import { AuthRequest } from '../middleware/auth.middleware';

const { User, Skill, Badge, UserBadge, Portfolio, Milestone, SalesRecord, Course, UserCourse, Notification, CommunityWin, LevelTier } = db;

// ===== STUDENT MANAGEMENT =====

// GET all students with full data
export const getAllStudents = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const students = await User.findAll({
      where: { role: 'student' },
      include: [
        { model: Skill, as: 'skills' },
        { model: Badge, as: 'badges' },
        { model: Portfolio, as: 'portfolios' },
        { model: Milestone, as: 'milestones', order: [['order', 'ASC']] },
        { model: SalesRecord, as: 'salesRecords' },
        { model: Course, as: 'courses' },
      ],
      order: [['points', 'DESC']]
    });
    return res.status(200).json(students);
  } catch (error) {
    console.error('Error fetching students:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// GET single student with full data
export const getStudentById = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { studentId } = req.params;
    const student = await User.findByPk(studentId, {
      include: [
        { model: Skill, as: 'skills' },
        { model: Badge, as: 'badges' },
        { model: Portfolio, as: 'portfolios' },
        { model: Milestone, as: 'milestones' },
        { model: SalesRecord, as: 'salesRecords' },
        { model: Course, as: 'courses' },
      ]
    });
    if (!student) return res.status(404).json({ message: 'Student not found' });
    return res.status(200).json(student);
  } catch (error) {
    console.error('Error fetching student:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// UPDATE student (points, streak, level, etc)
export const updateStudent = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { studentId } = req.params;
    const { name, points, xpPoints, streak, membershipLevel, rank, city, membershipExpiresAt } = req.body;
    const student = await User.findByPk(studentId);
    if (!student) return res.status(404).json({ message: 'Student not found' });
    await student.update({
      name: name !== undefined ? name : student.name,
      points: points !== undefined ? points : student.points,
      xpPoints: xpPoints !== undefined ? xpPoints : student.xpPoints,
      streak: streak !== undefined ? streak : student.streak,
      membershipLevel: membershipLevel !== undefined ? membershipLevel : student.membershipLevel,
      rank: rank !== undefined ? rank : student.rank,
      city: city !== undefined ? city : student.city,
      membershipExpiresAt: membershipExpiresAt !== undefined ? (membershipExpiresAt ? new Date(membershipExpiresAt) : null) : student.membershipExpiresAt,
    });
    return res.status(200).json(student);
  } catch (error) {
    console.error('Error updating student:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ===== MILESTONE MANAGEMENT =====

// ADD milestone for student
export const addMilestone = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { studentId } = req.params;
    const { name, completed, completedAt, order } = req.body;
    const milestone = await Milestone.create({ userId: studentId, name, completed: completed || false, completedAt, order: order || 0 });
    return res.status(201).json(milestone);
  } catch (error) {
    console.error('Error adding milestone:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// UPDATE milestone
export const updateMilestone = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { milestoneId } = req.params;
    const { name, completed, completedAt, order } = req.body;
    const milestone = await Milestone.findByPk(milestoneId);
    if (!milestone) return res.status(404).json({ message: 'Milestone not found' });
    await milestone.update({ name, completed, completedAt: completed && !completedAt ? new Date() : completedAt, order });
    return res.status(200).json(milestone);
  } catch (error) {
    console.error('Error updating milestone:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// DELETE milestone
export const deleteMilestone = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { milestoneId } = req.params;
    await Milestone.destroy({ where: { id: milestoneId } });
    return res.status(200).json({ message: 'Milestone deleted' });
  } catch (error) {
    console.error('Error deleting milestone:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ===== SALES RECORD MANAGEMENT =====

// ADD sales record
export const addSalesRecord = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { studentId } = req.params;
    const { amount, productName, date } = req.body;
    const record = await SalesRecord.create({ userId: studentId, amount, productName, date: date || new Date() });
    return res.status(201).json(record);
  } catch (error) {
    console.error('Error adding sales record:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// DELETE sales record
export const deleteSalesRecord = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { recordId } = req.params;
    await SalesRecord.destroy({ where: { id: recordId } });
    return res.status(200).json({ message: 'Sales record deleted' });
  } catch (error) {
    console.error('Error deleting sales record:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ===== BADGE MANAGEMENT =====

// GET all badges
const DEFAULT_BADGES = [
  { name: 'First Resin Pour', icon: '🎨', color: 'orange', description: 'Completed their first resin workshop project', pointsRequired: 100 },
  { name: 'First Client Sale', icon: '💰', color: 'emerald', description: 'Sold their first art piece to a paying client', pointsRequired: 500 },
  { name: 'Geode Master', icon: '💎', color: 'purple', description: 'Mastered 3D geode crystal inlays & agate shapes', pointsRequired: 2000 },
  { name: 'Clock Artisan', icon: '⏰', color: 'amber', description: 'Handcrafted luxury roman mechanical wall clock', pointsRequired: 1500 },
  { name: 'Streak Champion', icon: '🔥', color: 'rose', description: 'Maintained a 30-day active daily missions streak', pointsRequired: 1000 },
  { name: 'Ocean Waves Specialist', icon: '🌊', color: 'cyan', description: 'Perfected white foam cell formation & sea gradients', pointsRequired: 1200 },
  { name: 'Bridal Preservationist', icon: '💐', color: 'pink', description: 'Cast clear deep-pour wedding floral keepsake', pointsRequired: 3000 },
  { name: 'Hall of Fame Creator', icon: '👑', color: 'yellow', description: 'Reached ₹50,000+ in total art career sales', pointsRequired: 10000 },
];

export const getAllBadges = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    let badges = await Badge.findAll({
      order: [['pointsRequired', 'ASC'], ['name', 'ASC']]
    });
    if (!badges || badges.length === 0) {
      await Badge.bulkCreate(DEFAULT_BADGES);
      badges = await Badge.findAll({
        order: [['pointsRequired', 'ASC'], ['name', 'ASC']]
      });
    }
    return res.status(200).json(badges);
  } catch (error) {
    console.error('Error fetching badges:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// CREATE a new badge
export const createBadge = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { name, icon, color, description, pointsRequired } = req.body;
    if (!name) return res.status(400).json({ message: 'Badge name is required' });

    const badge = await Badge.create({
      name: name.trim(),
      icon: icon || '🎨',
      color: color || 'orange',
      description: description || '',
      pointsRequired: parseInt(pointsRequired) || 0,
    });

    return res.status(201).json(badge);
  } catch (error) {
    console.error('Error creating badge:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// UPDATE an existing badge
export const updateBadge = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { badgeId } = req.params;
    const { name, icon, color, description, pointsRequired } = req.body;

    const badge = await Badge.findByPk(badgeId);
    if (!badge) return res.status(404).json({ message: 'Badge not found' });

    await badge.update({
      name: name !== undefined ? name.trim() : badge.name,
      icon: icon !== undefined ? icon : badge.icon,
      color: color !== undefined ? color : badge.color,
      description: description !== undefined ? description : badge.description,
      pointsRequired: pointsRequired !== undefined ? parseInt(pointsRequired) : badge.pointsRequired,
    });

    return res.status(200).json(badge);
  } catch (error) {
    console.error('Error updating badge:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// DELETE a badge
export const deleteBadge = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { badgeId } = req.params;
    const badge = await Badge.findByPk(badgeId);
    if (!badge) return res.status(404).json({ message: 'Badge not found' });

    await UserBadge.destroy({ where: { badgeId } });
    await badge.destroy();

    return res.status(200).json({ message: 'Badge deleted successfully' });
  } catch (error) {
    console.error('Error deleting badge:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Award badge to student
export const awardBadge = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { studentId } = req.params;
    const { badgeId } = req.body;

    if (studentId === 'all') {
      const students = await User.findAll({ where: { role: 'student' } });
      for (const st of students) {
        await UserBadge.findOrCreate({ where: { userId: st.id, badgeId } });
      }
      return res.status(200).json({ message: 'Badge awarded to all students successfully' });
    }

    const existing = await UserBadge.findOne({ where: { userId: studentId, badgeId } });
    if (existing) return res.status(409).json({ message: 'Badge already awarded to this student' });
    await UserBadge.create({ userId: studentId, badgeId });
    return res.status(201).json({ message: 'Badge awarded successfully' });
  } catch (error) {
    console.error('Error awarding badge:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Remove badge from student
export const removeBadgeFromStudent = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { studentId, badgeId } = req.params;
    await UserBadge.destroy({ where: { userId: studentId, badgeId } });
    return res.status(200).json({ message: 'Badge removed from student' });
  } catch (error) {
    console.error('Error removing badge:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};


// ===== SKILL MANAGEMENT =====

// UPDATE student skills
export const updateStudentSkills = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { studentId } = req.params;
    const { resinBasics, mixing, colourTheory, finishing, creativity, professionalQuality } = req.body;
    
    let skill = await Skill.findOne({ where: { userId: studentId } });
    if (skill) {
      await skill.update({ resinBasics, mixing, colourTheory, finishing, creativity, professionalQuality });
    } else {
      skill = await Skill.create({ userId: studentId, resinBasics, mixing, colourTheory, finishing, creativity, professionalQuality });
    }
    return res.status(200).json(skill);
  } catch (error) {
    console.error('Error updating skills:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ===== COURSE ENROLLMENT =====

// Enroll/Update student course
export const enrollStudentInCourse = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { studentId } = req.params;
    const { courseId, progress, status } = req.body;
    
    const [record, created] = await UserCourse.findOrCreate({
      where: { userId: studentId, courseId },
      defaults: { progress: progress || 0, status: status || 'enrolled' }
    });
    
    if (!created) {
      await record.update({ progress, status });
    }
    return res.status(200).json(record);
  } catch (error) {
    console.error('Error enrolling student:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ===== NOTIFICATION MANAGEMENT =====

// SEND notification to a student
export const sendNotification = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { studentId } = req.params;
    const { title, message } = req.body;

    if (!title || !message) {
      return res.status(400).json({ message: 'Title and message are required' });
    }

    const student = await User.findByPk(studentId);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const notification = await Notification.create({
      userId: studentId,
      title,
      message,
      isRead: false
    });

    return res.status(201).json(notification);
  } catch (error) {
    console.error('Error sending notification:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// GET all notifications (admin view)
export const getAllNotifications = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const notifications = await Notification.findAll({
      include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }],
      order: [['createdAt', 'DESC']]
    });
    return res.status(200).json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ===== COMMUNITY WIN MANAGEMENT =====

// CREATE community win
export const createCommunityWin = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { studentName, achievement, title, likes, timeAgo, image, imageUrl, salesAmount, technique } = req.body;

    const name = studentName || 'Patel Vrajangna (Admin)';
    const mainTitle = achievement || title;

    if (!mainTitle) {
      return res.status(400).json({ message: 'Achievement title is required' });
    }

    let fullAchievement = mainTitle;
    if (salesAmount) fullAchievement += ` (₹${Number(salesAmount).toLocaleString('en-IN')} sale!)`;
    if (technique) fullAchievement += ` • Technique: ${technique}`;

    const win = await CommunityWin.create({
      studentName: name,
      achievement: fullAchievement,
      likes: likes || 0,
      image: image || imageUrl || null,
      timeAgo: timeAgo || 'Just now'
    });
    return res.status(201).json(win);
  } catch (error) {
    console.error('Error creating community win:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// GET all community wins
export const getAllCommunityWins = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const wins = await CommunityWin.findAll({
      order: [['createdAt', 'DESC']]
    });
    return res.status(200).json(wins);
  } catch (error) {
    console.error('Error fetching community wins:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// DELETE community win
export const deleteCommunityWin = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { winId } = req.params;
    await CommunityWin.destroy({ where: { id: winId } });
    return res.status(200).json({ message: 'Community win deleted' });
  } catch (error) {
    console.error('Error deleting community win:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ===== LEVEL & TIER SETTINGS MANAGEMENT =====

const DEFAULT_LEVELS = [
  { code: 'L0', name: 'Fast Track', price: '₹499', minPoints: 0, maxPoints: 499, icon: '⚡', badgeColor: 'emerald', order: 0, description: 'Resin fundamentals, safety protocols, and foundational finishing techniques.' },
  { code: 'L1', name: 'Silver Member', price: '₹4,999', minPoints: 500, maxPoints: 4999, icon: '🥈', badgeColor: 'slate', order: 1, description: 'Coasters, fridge magnets, marbling, lotus pond, and beach theme creations.' },
  { code: 'L2', name: 'Gold Member', price: '₹19,999', minPoints: 5000, maxPoints: 9999, icon: '🏆', badgeColor: 'amber', order: 2, description: 'Geode art, vein effect, Tree of Life clocks, and 3D wave masterclasses.' },
  { code: 'L3', name: 'Diamond Club', price: '₹59,999', minPoints: 10000, maxPoints: 49999, icon: '💎', badgeColor: 'cyan', order: 3, description: 'River wood tables, bridal varmala preservation, 3D photo art, concrete candles, and business scaling.' },
  { code: 'L3+', name: 'Masters Club', price: 'Exclusive', minPoints: 50000, maxPoints: null, icon: '👑', badgeColor: 'purple', order: 4, description: 'City workshops, franchise license, bespoke mentorship, and signature brand.' },
];

// GET all configured level tiers (with auto-seeding if empty)
export const getAllLevelTiers = async (req: Request, res: Response): Promise<any> => {
  try {
    let levels = await LevelTier.findAll({
      order: [['order', 'ASC'], ['minPoints', 'ASC']]
    });

    if (!levels || levels.length === 0) {
      // Auto-seed default levels
      await LevelTier.bulkCreate(DEFAULT_LEVELS);
      levels = await LevelTier.findAll({
        order: [['order', 'ASC'], ['minPoints', 'ASC']]
      });
    }

    return res.status(200).json(levels);
  } catch (error) {
    console.error('Error fetching level tiers:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// CREATE a new level tier
export const createLevelTier = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const {
      code,
      name,
      price,
      minPoints,
      maxPoints,
      icon,
      badgeColor,
      order,
      description,
      category,
      validityDays,
      isPublished,
      discountType,
      discountValue,
      offerStartDate,
      offerEndDate,
      offerActive,
      offerTitle,
    } = req.body;

    if (!code || !name) {
      return res.status(400).json({ message: 'Code and name are required' });
    }

    const tier = await LevelTier.create({
      code,
      name,
      price: price || '₹499',
      minPoints: Number(minPoints) || 0,
      maxPoints: maxPoints !== undefined && maxPoints !== null && maxPoints !== '' ? Number(maxPoints) : null,
      icon: icon || '⚡',
      badgeColor: badgeColor || 'emerald',
      order: Number(order) || 0,
      description: description || '',
      category: category || 'General',
      validityDays: validityDays !== undefined && validityDays !== null ? Number(validityDays) : 0,
      isPublished: isPublished !== undefined ? Boolean(isPublished) : true,
      discountType: discountType || null,
      discountValue: discountValue !== undefined && discountValue !== null ? parseFloat(discountValue) : 0,
      offerStartDate: offerStartDate ? new Date(offerStartDate) : null,
      offerEndDate: offerEndDate ? new Date(offerEndDate) : null,
      offerActive: Boolean(offerActive),
      offerTitle: offerTitle || 'Special Level Offer',
    });

    return res.status(201).json(tier);
  } catch (error) {
    console.error('Error creating level tier:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// UPDATE a level tier
export const updateLevelTier = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { levelId } = req.params;
    const {
      code,
      name,
      price,
      minPoints,
      maxPoints,
      icon,
      badgeColor,
      order,
      description,
      category,
      validityDays,
      isPublished,
      discountType,
      discountValue,
      offerStartDate,
      offerEndDate,
      offerActive,
      offerTitle,
    } = req.body;

    const tier = await LevelTier.findByPk(levelId);
    if (!tier) return res.status(404).json({ message: 'Level tier not found' });

    await tier.update({
      code: code !== undefined ? code : tier.code,
      name: name !== undefined ? name : tier.name,
      price: price !== undefined ? price : tier.price,
      minPoints: minPoints !== undefined ? Number(minPoints) : tier.minPoints,
      maxPoints: maxPoints !== undefined ? (maxPoints !== null && maxPoints !== '' ? Number(maxPoints) : null) : tier.maxPoints,
      icon: icon !== undefined ? icon : tier.icon,
      badgeColor: badgeColor !== undefined ? badgeColor : tier.badgeColor,
      order: order !== undefined ? Number(order) : tier.order,
      description: description !== undefined ? description : tier.description,
      category: category !== undefined ? category : tier.category,
      validityDays: validityDays !== undefined ? Number(validityDays) : tier.validityDays,
      isPublished: isPublished !== undefined ? Boolean(isPublished) : tier.isPublished,
      discountType: discountType !== undefined ? discountType : tier.discountType,
      discountValue: discountValue !== undefined ? parseFloat(discountValue) : tier.discountValue,
      offerStartDate: offerStartDate !== undefined ? (offerStartDate ? new Date(offerStartDate) : null) : tier.offerStartDate,
      offerEndDate: offerEndDate !== undefined ? (offerEndDate ? new Date(offerEndDate) : null) : tier.offerEndDate,
      offerActive: offerActive !== undefined ? Boolean(offerActive) : tier.offerActive,
      offerTitle: offerTitle !== undefined ? offerTitle : tier.offerTitle,
    });

    return res.status(200).json(tier);
  } catch (error) {
    console.error('Error updating level tier:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// DELETE a level tier
export const deleteLevelTier = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { levelId } = req.params;
    const tier = await LevelTier.findByPk(levelId);
    if (!tier) return res.status(404).json({ message: 'Level tier not found' });

    await tier.destroy();
    return res.status(200).json({ message: 'Level tier deleted successfully' });
  } catch (error) {
    console.error('Error deleting level tier:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// GET Level-wise Revenue Analytics
export const getRevenueByTier = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const tiers: any[] = await LevelTier.findAll({ order: [['order', 'ASC']] });
    const students: any[] = await User.findAll({ where: { role: 'student' } });
    const sales: any[] = await SalesRecord.findAll();

    const tierBreakdown = tiers.map((tier: any) => {
      const tierCode = (tier.code || '').toUpperCase();
      const enrolledCount = students.filter(
        (s: any) => (s.membershipLevel || 'L0').toUpperCase() === tierCode
      ).length;

      const numPrice = parseInt((tier.price || '0').replace(/[^0-9]/g, '')) || 0;
      const estimatedRevenue = enrolledCount * numPrice;

      return {
        id: tier.id,
        code: tier.code,
        name: tier.name,
        price: tier.price || '₹0',
        numericPrice: numPrice,
        enrolledCount,
        estimatedRevenue,
        icon: tier.icon || '⚡',
        badgeColor: tier.badgeColor || 'emerald',
        category: tier.category || 'General',
        isPublished: tier.isPublished !== false,
      };
    });

    const totalRevenue = tierBreakdown.reduce((sum: number, t: any) => sum + t.estimatedRevenue, 0);

    return res.status(200).json({
      totalRevenue,
      totalStudents: students.length,
      totalSalesRecords: sales.length,
      tiers: tierBreakdown,
    });
  } catch (error: any) {
    console.error('Error fetching revenue by tier:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ===== TARGETED BROADCAST NOTIFICATIONS =====

// SEND targeted broadcast notification (all, L0, L1, L2, L3, webinar)
export const broadcastNotification = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { title, message, targetAudience, type, link } = req.body;

    if (!title || !message) {
      return res.status(400).json({ message: 'Title and message are required' });
    }

    let targetUsers: any[] = [];
    if (targetAudience === 'all' || !targetAudience) {
      targetUsers = await User.findAll({ where: { role: 'student' } });
    } else if (['L0', 'L1', 'L2', 'L3'].includes(targetAudience)) {
      targetUsers = await User.findAll({
        where: {
          role: 'student',
          membershipLevel: targetAudience,
        },
      });
    } else if (targetAudience === 'webinar') {
      // Send to all students / webinar registrants
      targetUsers = await User.findAll({ where: { role: 'student' } });
    }

    if (targetUsers.length === 0) {
      return res.status(200).json({
        message: `No active students found in target group: ${targetAudience}`,
        count: 0,
      });
    }

    const notificationsToCreate = targetUsers.map((u) => ({
      userId: u.id,
      title,
      message,
      type: type || 'info',
      link: link || '',
      targetAudience: targetAudience || 'all',
      isRead: false,
    }));

    await Notification.bulkCreate(notificationsToCreate);

    return res.status(200).json({
      message: `Notification broadcasted successfully to ${notificationsToCreate.length} students (${targetAudience})!`,
      count: notificationsToCreate.length,
    });
  } catch (error: any) {
    console.error('Error broadcasting notification:', error);
    return res.status(500).json({ message: 'Internal server error', error: error?.message });
  }
};

// GET recent notifications history
export const getNotificationBroadcasts = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const notifications = await Notification.findAll({
      order: [['createdAt', 'DESC']],
      limit: 50,
      include: [
        { model: User, as: 'user', attributes: ['id', 'name', 'email', 'membershipLevel'] },
      ],
    });
    return res.status(200).json(notifications);
  } catch (error: any) {
    console.error('Error fetching notification broadcasts:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};




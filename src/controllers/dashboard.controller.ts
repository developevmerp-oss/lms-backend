import { Request, Response } from 'express';
import db from '../models';
import { AuthRequest } from '../middleware/auth.middleware';

const { User, Course, Submission, Reward, Skill, Badge, Portfolio, Milestone, SalesRecord, Notification } = db;

export const getAdminStats = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    // Total Students
    const totalStudents = await User.count({ where: { role: 'student' } });

    // Active Courses
    const activeCourses = await Course.count();

    // Pending Assignments
    const pendingAssignments = await Submission.count({ where: { status: 'pending' } });

    // Rewards Distributed (Mocked for now since UserReward pivot doesn't exist yet)
    // Could also just query total rewards available for now or count a redeemed log
    const rewardsDistributed = 0; 

    res.status(200).json({
      totalStudents,
      activeCourses,
      pendingAssignments,
      rewardsDistributed
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getStudentStats = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const studentId = req.user?.id;
    if (!studentId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const student = await User.findByPk(studentId, {
      include: [
        { model: Skill, as: 'skills' },
        { model: Badge, as: 'badges' },
        { model: Portfolio, as: 'portfolios' },
        { model: Milestone, as: 'milestones' },
        { model: SalesRecord, as: 'salesRecords' },
        { model: Course, as: 'courses' },
        { model: Notification, as: 'notifications' }
      ]
    });
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Fetch ALL courses to determine what is locked
    const allCourses = await Course.findAll();
    
    // Fetch community wins
    const communityWins = await db.CommunityWin.findAll({
      order: [['createdAt', 'DESC']],
      limit: 5
    });

    // Compute next goal
    // Try to find the first incomplete milestone
    const nextMilestone = student.milestones?.find((m: any) => !m.completed);
    let nextGoal = 'Complete pending missions';
    if (nextMilestone) {
      nextGoal = `Next Milestone: ${nextMilestone.name}`;
    }

    res.status(200).json({
      points: student.points,
      xpPoints: student.xpPoints,
      streak: student.streak,
      membershipLevel: student.membershipLevel,
      rank: student.rank,
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

    const win = await db.CommunityWin.findByPk(id);
    if (!win) return res.status(404).json({ message: 'Win not found' });
    
    const newComment = { author: authorName, text };
    // JSON arrays in sequelize need to be reassigned to trigger an update sometimes
    const currentComments = win.comments || [];
    win.comments = [...currentComments, newComment];
    await win.save();

    return res.status(200).json(win);
  } catch (error) {
    console.error('Error commenting win:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const postCommunityWin = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { achievement } = req.body;
    const studentName = (req.user as any)?.name || 'Student';

    if (!achievement) return res.status(400).json({ message: 'Achievement text is required' });

    const win = await db.CommunityWin.create({
      studentName,
      achievement,
      likes: 0,
      timeAgo: 'Just now'
    });

    return res.status(201).json(win);
  } catch (error) {
    console.error('Error posting community win:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

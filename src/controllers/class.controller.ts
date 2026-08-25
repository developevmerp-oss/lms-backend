import { Request, Response } from 'express';
import db from '../models';
import { AuthRequest } from '../middleware/auth.middleware';

const { LiveClass, ClassAttendance, User, Notification } = db;

const DEFAULT_SAMPLE_CLASSES = [
  {
    title: 'Live Q&A & Resin Chemistry Masterclass',
    description: 'Interactive live coaching on bubble-free mixing, humidity control, and personalized portfolio critique with Vrajangna.',
    scheduledAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // In 2 days
    durationMinutes: 60,
    meetingUrl: 'https://zoom.us/j/sample-live-class-ravishing',
    targetLevel: 'All',
    status: 'upcoming',
    instructor: 'Vrajangna Patel',
  },
  {
    title: 'Advanced 3D Ocean Waves & Cell Lacing Clinic',
    description: 'Live heat gun wave manipulation, pigment saturation, and creating multi-layer sea spray effects.',
    scheduledAt: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000), // In 6 days
    durationMinutes: 90,
    meetingUrl: 'https://zoom.us/j/sample-ocean-waves-class',
    targetLevel: 'L2',
    status: 'upcoming',
    instructor: 'Vrajangna Patel',
  },
  {
    title: 'Bridal Varmala & Floral Deep-Pour Preservation Workshop',
    description: 'Preserving wedding garlands, silica gel drying techniques, and bubble-free deep casting.',
    scheduledAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    durationMinutes: 75,
    meetingUrl: 'https://zoom.us/j/sample-bridal-class',
    recordingUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    targetLevel: 'L3',
    status: 'completed',
    instructor: 'Vrajangna Patel',
  },
];

// ── GET ALL CLASSES (FOR STUDENTS & ADMIN) ──
export const getAllClasses = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user?.id;

    let classes = await LiveClass.findAll({
      order: [['scheduledAt', 'DESC']],
      include: [
        {
          model: ClassAttendance,
          as: 'attendances',
          include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email', 'membershipLevel', 'avatarUrl'] }],
        },
      ],
    });

    if (!classes || classes.length === 0) {
      await LiveClass.bulkCreate(DEFAULT_SAMPLE_CLASSES);
      classes = await LiveClass.findAll({
        order: [['scheduledAt', 'DESC']],
        include: [
          {
            model: ClassAttendance,
            as: 'attendances',
            include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email', 'membershipLevel', 'avatarUrl'] }],
          },
        ],
      });
    }

    // Format output with student-specific attendance flag
    const formatted = classes.map((cls: any) => {
      const attendances = cls.attendances || [];
      const userAttendance = userId ? attendances.find((a: any) => a.userId === userId) : null;

      return {
        id: cls.id,
        title: cls.title,
        description: cls.description,
        scheduledAt: cls.scheduledAt,
        durationMinutes: cls.durationMinutes,
        meetingUrl: cls.meetingUrl,
        recordingUrl: cls.recordingUrl,
        targetLevel: cls.targetLevel,
        status: cls.status,
        instructor: cls.instructor,
        totalAttendees: attendances.length,
        attendees: attendances.map((a: any) => ({
          attendanceId: a.id,
          userId: a.userId,
          studentName: a.user?.name || 'Student',
          studentEmail: a.user?.email || '',
          membershipLevel: a.user?.membershipLevel || 'L0 Fast Track',
          joinedAt: a.joinedAt,
          attended: a.attended,
        })),
        isAttended: !!(userAttendance && userAttendance.attended),
        joinedAt: userAttendance?.joinedAt || null,
      };
    });

    return res.status(200).json({ success: true, data: formatted });
  } catch (error: any) {
    console.error('Error fetching live classes:', error);
    return res.status(500).json({ message: 'Internal server error', error: error?.message });
  }
};

// ── CREATE LIVE CLASS (ADMIN) ──
export const createClass = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { title, description, scheduledAt, durationMinutes, meetingUrl, recordingUrl, targetLevel, status, instructor } = req.body;

    if (!title || !scheduledAt) {
      return res.status(400).json({ message: 'Class title and scheduled date/time are required' });
    }

    const newClass = await LiveClass.create({
      title: title.trim(),
      description: description || '',
      scheduledAt: new Date(scheduledAt),
      durationMinutes: parseInt(durationMinutes) || 60,
      meetingUrl: meetingUrl || '',
      recordingUrl: recordingUrl || '',
      targetLevel: targetLevel || 'All',
      status: status || 'upcoming',
      instructor: instructor || 'Vrajangna Patel',
    });

    return res.status(201).json({ success: true, message: 'Live class scheduled successfully', data: newClass });
  } catch (error: any) {
    console.error('Error creating class:', error);
    return res.status(500).json({ message: 'Failed to create class', error: error?.message });
  }
};

// ── UPDATE LIVE CLASS (ADMIN) ──
export const updateClass = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { classId } = req.params;
    const { title, description, scheduledAt, durationMinutes, meetingUrl, recordingUrl, targetLevel, status, instructor } = req.body;

    const liveClass = await LiveClass.findByPk(classId);
    if (!liveClass) return res.status(404).json({ message: 'Live class not found' });

    await liveClass.update({
      title: title !== undefined ? title.trim() : liveClass.title,
      description: description !== undefined ? description : liveClass.description,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : liveClass.scheduledAt,
      durationMinutes: durationMinutes !== undefined ? parseInt(durationMinutes) : liveClass.durationMinutes,
      meetingUrl: meetingUrl !== undefined ? meetingUrl : liveClass.meetingUrl,
      recordingUrl: recordingUrl !== undefined ? recordingUrl : liveClass.recordingUrl,
      targetLevel: targetLevel !== undefined ? targetLevel : liveClass.targetLevel,
      status: status !== undefined ? status : liveClass.status,
      instructor: instructor !== undefined ? instructor : liveClass.instructor,
    });

    return res.status(200).json({ success: true, message: 'Class updated successfully', data: liveClass });
  } catch (error: any) {
    console.error('Error updating class:', error);
    return res.status(500).json({ message: 'Failed to update class', error: error?.message });
  }
};

// ── DELETE LIVE CLASS (ADMIN) ──
export const deleteClass = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { classId } = req.params;
    const liveClass = await LiveClass.findByPk(classId);
    if (!liveClass) return res.status(404).json({ message: 'Live class not found' });

    await ClassAttendance.destroy({ where: { classId } });
    await liveClass.destroy();

    return res.status(200).json({ success: true, message: 'Class deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting class:', error);
    return res.status(500).json({ message: 'Failed to delete class', error: error?.message });
  }
};

// ── STUDENT JOINS LIVE CLASS -> MARKS ATTENDANCE & AWARDS XP ──
export const joinClassAndMarkAttendance = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { classId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized. Please login.' });
    }

    const liveClass = await LiveClass.findByPk(classId);
    if (!liveClass) {
      return res.status(404).json({ message: 'Live class not found' });
    }

    // 1. Record or update attendance
    const [attendance, created] = await ClassAttendance.findOrCreate({
      where: { classId, userId },
      defaults: {
        classId,
        userId,
        joinedAt: new Date(),
        attended: true,
      },
    });

    if (!created) {
      await attendance.update({ attended: true, joinedAt: new Date() });
    }

    // 2. Award Attendance XP to student (+50 XP)
    const student = await User.findByPk(userId);
    if (student && created) {
      await student.update({
        points: (student.points || 0) + 50,
        xpPoints: (student.xpPoints || 0) + 50,
      });

      // Send confirmation notification
      try {
        await Notification.create({
          userId,
          title: `✅ Live Class Attendance Marked (+50 XP)!`,
          message: `Your attendance for "${liveClass.title}" was recorded. Keep mastering your resin artistry!`,
          type: 'milestone',
          read: false,
        });
      } catch (_) {}
    }

    return res.status(200).json({
      success: true,
      message: 'Attendance recorded successfully (+50 XP Awarded!)',
      meetingUrl: liveClass.meetingUrl || 'https://zoom.us',
      joinedAt: attendance.joinedAt,
    });
  } catch (error: any) {
    console.error('Error recording attendance:', error);
    return res.status(500).json({ message: 'Failed to record attendance', error: error?.message });
  }
};

// ── TOGGLE ATTENDANCE MANUALLY (ADMIN) ──
export const toggleStudentAttendance = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { classId, studentId } = req.params;
    const { attended, notes } = req.body;

    const [attendance] = await ClassAttendance.findOrCreate({
      where: { classId, userId: studentId },
      defaults: {
        classId,
        userId: studentId,
        joinedAt: new Date(),
        attended: attended !== undefined ? attended : true,
        notes: notes || '',
      },
    });

    if (attended !== undefined || notes !== undefined) {
      await attendance.update({
        attended: attended !== undefined ? attended : attendance.attended,
        notes: notes !== undefined ? notes : attendance.notes,
      });
    }

    return res.status(200).json({ success: true, message: 'Attendance updated successfully', data: attendance });
  } catch (error: any) {
    console.error('Error toggling attendance:', error);
    return res.status(500).json({ message: 'Failed to toggle attendance', error: error?.message });
  }
};

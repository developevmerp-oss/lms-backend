import { Request, Response } from 'express';
import { Op } from 'sequelize';
import db from '../models';
import { AuthRequest } from '../middleware/auth.middleware';

const { LiveClass, ClassAttendance, User, Notification, LevelTier } = db;

const isStudentMatchingTiers = (student: any, targetLevels: string[], dbTiers: any[] = []): boolean => {
  if (!targetLevels || targetLevels.length === 0) return true;
  if (targetLevels.some(l => l.toUpperCase() === 'ALL')) return true;

  const raw = ((student.membershipLevel || student.rank || '') + '').toUpperCase().trim();
  if (!raw) {
    return targetLevels.some(l => l.toUpperCase() === 'L0' || l.toUpperCase() === 'GENERAL');
  }

  for (const target of targetLevels) {
    const t = target.toUpperCase().trim();
    if (!t) continue;
    if (t === 'ALL') return true;

    // Direct match
    if (raw.includes(t)) return true;

    // Check against DB tiers dynamically
    const matchedDbTier = dbTiers.find((d: any) => 
      (d.code && d.code.toUpperCase() === t) ||
      (d.name && d.name.toUpperCase() === t)
    );
    if (matchedDbTier) {
      if (raw.includes((matchedDbTier.name || '').toUpperCase()) || 
          raw.includes((matchedDbTier.code || '').toUpperCase())) {
        return true;
      }
    }

    // Standard naming conventions
    if (t === 'L0' && (raw.includes('FAST START') || raw.includes('FAST TRACK') || raw === 'L0')) return true;
    if (t === 'L1' && (raw.includes('SILVER') || raw.includes('LEVEL 1') || raw.includes('LEVEL-1'))) return true;
    if (t === 'L2' && (raw.includes('GOLD') || raw.includes('LEVEL 2') || raw.includes('LEVEL-2'))) return true;
    if (t === 'L3' && (raw.includes('DIAMOND') || raw.includes('RENAISSANCE') || raw.includes('LEVEL 3') || raw.includes('LEVEL-3'))) return true;
    if (t === 'L3+' && (raw.includes('MASTERS') || raw.includes('L3+'))) return true;
  }

  return false;
};

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
      where: {
        status: { [Op.ne]: 'deleted' }
      },
      order: [['scheduledAt', 'DESC']],
      include: [
        {
          model: ClassAttendance,
          as: 'attendances',
          include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email', 'membershipLevel', 'avatarUrl'] }],
        },
      ],
    });

    const totalCount = await LiveClass.count();
    if (totalCount === 0) {
      await LiveClass.bulkCreate(DEFAULT_SAMPLE_CLASSES);
      classes = await LiveClass.findAll({
        where: {
          status: { [Op.ne]: 'deleted' }
        },
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
    const { title, description, scheduledAt, durationMinutes, meetingUrl, recordingUrl, targetLevel, status, instructor, sendNotification } = req.body;

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

    // ── DISPATCH NOTIFICATIONS TO TARGET LEVEL STUDENTS ──
    if (sendNotification !== false) {
      try {
        const targetStr = (targetLevel || 'All').toString().trim();
        let targetLevels: string[] = [];
        if (targetStr !== 'All' && targetStr.toLowerCase() !== 'all') {
          targetLevels = targetStr.split(',').map((s: string) => s.trim().toUpperCase());
        }

        const [students, dbTiers] = await Promise.all([
          User.findAll({
            where: { role: 'student' },
            attributes: ['id', 'name', 'membershipLevel', 'rank']
          }),
          LevelTier ? LevelTier.findAll() : Promise.resolve([])
        ]);

        const eligibleStudents = students.filter((s: any) => isStudentMatchingTiers(s, targetLevels, dbTiers));

        if (eligibleStudents.length > 0) {
          const dateObj = new Date(scheduledAt);
          const dateStr = dateObj.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
          });

          const notificationRecords = eligibleStudents.map((s: any) => ({
            userId: s.id,
            title: `🔴 Live Class: ${title.trim()}`,
            message: `Live class "${title.trim()}" is scheduled for ${dateStr}. Click to view details and join live!`,
            type: 'event',
            link: '/student/events',
            targetAudience: targetStr,
            isRead: false,
          }));

          await Notification.bulkCreate(notificationRecords);
        }
      } catch (notifErr) {
        console.warn('Could not dispatch live class notifications:', notifErr);
      }
    }

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
    const { title, description, scheduledAt, durationMinutes, meetingUrl, recordingUrl, targetLevel, status, instructor, sendNotification } = req.body;

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

    if (sendNotification) {
      try {
        const targetStr = (liveClass.targetLevel || 'All').toString().trim();
        let targetLevels: string[] = [];
        if (targetStr !== 'All' && targetStr.toLowerCase() !== 'all') {
          targetLevels = targetStr.split(',').map((s: string) => s.trim().toUpperCase());
        }

        const [students, dbTiers] = await Promise.all([
          User.findAll({
            where: { role: 'student' },
            attributes: ['id', 'name', 'membershipLevel', 'rank']
          }),
          LevelTier ? LevelTier.findAll() : Promise.resolve([])
        ]);

        const eligibleStudents = students.filter((s: any) => isStudentMatchingTiers(s, targetLevels, dbTiers));

        if (eligibleStudents.length > 0) {
          const dateObj = new Date(liveClass.scheduledAt);
          const dateStr = dateObj.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
          });

          const notificationRecords = eligibleStudents.map((s: any) => ({
            userId: s.id,
            title: `🔔 Live Class Update: ${liveClass.title}`,
            message: `Update for live class "${liveClass.title}" scheduled for ${dateStr}. Click to view details!`,
            type: 'event',
            link: '/student/events',
            targetAudience: targetStr,
            isRead: false,
          }));

          await Notification.bulkCreate(notificationRecords);
        }
      } catch (notifErr) {
        console.warn('Could not dispatch live class update notification:', notifErr);
      }
    }

    return res.status(200).json({ success: true, message: 'Class updated successfully', data: liveClass });
  } catch (error: any) {
    console.error('Error updating class:', error);
    return res.status(500).json({ message: 'Failed to update class', error: error?.message });
  }
};

// ── DELETE LIVE CLASS (ADMIN) ──
// Marks class status as 'deleted' so it is removed from active schedules,
// but PRESERVES the student attendance history and XP records for Excel export!
export const deleteClass = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { classId } = req.params;
    const liveClass = await LiveClass.findByPk(classId);
    if (!liveClass) return res.status(404).json({ message: 'Live class not found' });

    // Do NOT delete ClassAttendance rows! Mark class as deleted so history is preserved.
    await liveClass.update({ status: 'deleted' });

    return res.status(200).json({
      success: true,
      message: 'Class removed from active schedule. Student attendance records have been safely preserved for Excel export.',
    });
  } catch (error: any) {
    console.error('Error deleting class:', error);
    return res.status(500).json({ message: 'Failed to delete class', error: error?.message });
  }
};

// ── STUDENT JOINS LIVE CLASS -> MARKS ATTENDANCE & AWARDS +100 XP ──
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

    // 2. Award Attendance XP to student (+100 XP)
    const student = await User.findByPk(userId);
    if (student && created) {
      await student.update({
        points: (student.points || 0) + 100,
        xpPoints: (student.xpPoints || 0) + 100,
      });

      // Send confirmation notification
      try {
        await Notification.create({
          userId,
          title: `✅ Live Class Attendance Marked (+100 XP)!`,
          message: `Your attendance for "${liveClass.title}" was recorded. +100 XP awarded to your profile!`,
          type: 'milestone',
          isRead: false,
        });
      } catch (_) {}
    }

    return res.status(200).json({
      success: true,
      message: 'Attendance recorded successfully (+100 XP Awarded!)',
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

// ── GET FULL ATTENDANCE HISTORY (ADMIN) ──
export const getAttendanceHistory = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { classId } = req.query;

    const whereCondition: any = {};
    if (classId) {
      whereCondition.classId = classId;
    }

    const attendances = await ClassAttendance.findAll({
      where: whereCondition,
      order: [['joinedAt', 'DESC']],
      include: [
        {
          model: LiveClass,
          as: 'class',
          attributes: ['id', 'title', 'scheduledAt', 'durationMinutes', 'instructor', 'targetLevel', 'status'],
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'phone', 'membershipLevel', 'rank', 'points', 'xpPoints', 'city', 'avatarUrl'],
        },
      ],
    });

    const formatted = attendances.map((att: any) => ({
      id: att.id,
      classId: att.classId,
      classTitle: att.class?.title || 'Concluded Masterclass',
      classDate: att.class?.scheduledAt || att.joinedAt,
      classStatus: att.class?.status === 'deleted' ? 'Removed / Archived' : (att.class?.status || 'Concluded'),
      instructor: att.class?.instructor || 'Vrajangna Patel',
      targetLevel: att.class?.targetLevel || 'All',
      userId: att.userId,
      studentName: att.user?.name || 'Unknown Student',
      studentEmail: att.user?.email || 'N/A',
      studentPhone: att.user?.phone || 'N/A',
      studentLevel: att.user?.membershipLevel || att.user?.rank || 'Fast Track (L0)',
      studentCity: att.user?.city || 'N/A',
      studentAvatar: att.user?.avatarUrl,
      attended: att.attended,
      joinedAt: att.joinedAt,
      xpAwarded: 100,
      totalPoints: att.user?.points || 0,
      notes: att.notes,
    }));

    return res.status(200).json({ success: true, count: formatted.length, data: formatted });
  } catch (error: any) {
    console.error('Error fetching attendance history:', error);
    return res.status(500).json({ message: 'Failed to fetch attendance history', error: error?.message });
  }
};

// ── EXPORT ATTENDANCE HISTORY TO CSV / EXCEL FORMAT (ADMIN) ──
export const exportAttendanceHistory = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { classId } = req.query;

    const whereCondition: any = {};
    if (classId) {
      whereCondition.classId = classId;
    }

    const attendances = await ClassAttendance.findAll({
      where: whereCondition,
      order: [['joinedAt', 'DESC']],
      include: [
        {
          model: LiveClass,
          as: 'class',
          attributes: ['id', 'title', 'scheduledAt', 'durationMinutes', 'instructor', 'targetLevel', 'status'],
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'phone', 'membershipLevel', 'rank', 'points', 'xpPoints', 'city'],
        },
      ],
    });

    const headers = [
      'Class Title',
      'Class Date & Time',
      'Duration (Mins)',
      'Mentor / Instructor',
      'Target Level Access',
      'Class Status',
      'Student Name',
      'Student Email',
      'Student Phone',
      'Student City',
      'Membership Tier',
      'Attended Status',
      'Joined Date & Time',
      'Attendance XP Earned',
      'Student Current Total XP'
    ];

    const escapeCsv = (str: any) => {
      if (str === null || str === undefined) return '""';
      const s = String(str).replace(/"/g, '""');
      return `"${s}"`;
    };

    const rows = attendances.map((att: any) => {
      const cls = att.class || {};
      const usr = att.user || {};

      const classDateStr = cls.scheduledAt
        ? new Date(cls.scheduledAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
        : 'N/A';

      const joinDateStr = att.joinedAt
        ? new Date(att.joinedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
        : 'N/A';

      const classStatusLabel = cls.status === 'deleted'
        ? 'Removed (Session Concluded)'
        : (cls.status ? cls.status.toUpperCase() : 'CONCLUDED');

      return [
        escapeCsv(cls.title || 'Live Masterclass Session'),
        escapeCsv(classDateStr),
        escapeCsv(cls.durationMinutes || 60),
        escapeCsv(cls.instructor || 'Vrajangna Patel'),
        escapeCsv(cls.targetLevel || 'All'),
        escapeCsv(classStatusLabel),
        escapeCsv(usr.name || 'Unknown Student'),
        escapeCsv(usr.email || 'N/A'),
        escapeCsv(usr.phone || 'N/A'),
        escapeCsv(usr.city || 'N/A'),
        escapeCsv(usr.membershipLevel || usr.rank || 'Fast Track (L0)'),
        escapeCsv(att.attended ? 'Present / Attended' : 'Registered'),
        escapeCsv(joinDateStr),
        escapeCsv(att.attended ? '100 XP' : '0 XP'),
        escapeCsv(usr.points || 0),
      ].join(',');
    });

    // Add BOM for Microsoft Excel UTF-8 display
    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');

    const filename = classId
      ? `live_class_attendance_${String(classId).slice(0, 8)}.csv`
      : `all_live_classes_attendance_history_${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(csvContent);
  } catch (error: any) {
    console.error('Error exporting attendance history:', error);
    return res.status(500).json({ message: 'Failed to export attendance history', error: error?.message });
  }
};

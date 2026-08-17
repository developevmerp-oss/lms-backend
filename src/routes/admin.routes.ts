import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';
import {
  getAllStudents,
  getStudentById,
  updateStudent,
  addMilestone,
  updateMilestone,
  deleteMilestone,
  addSalesRecord,
  deleteSalesRecord,
  getAllBadges,
  awardBadge,
  updateStudentSkills,
  enrollStudentInCourse,
  sendNotification,
  getAllNotifications,
  createCommunityWin,
  getAllCommunityWins,
  deleteCommunityWin,
} from '../controllers/admin.controller';

const router = Router();

// All admin routes require auth + admin role
router.use(authenticate, requireAdmin);

// Students
router.get('/students', getAllStudents);
router.get('/students/:studentId', getStudentById);
router.put('/students/:studentId', updateStudent);

// Milestones
router.post('/students/:studentId/milestones', addMilestone);
router.put('/milestones/:milestoneId', updateMilestone);
router.delete('/milestones/:milestoneId', deleteMilestone);

// Sales Records
router.post('/students/:studentId/sales', addSalesRecord);
router.delete('/sales/:recordId', deleteSalesRecord);

// Badges
router.get('/badges', getAllBadges);
router.post('/students/:studentId/badges', awardBadge);

// Skills
router.put('/students/:studentId/skills', updateStudentSkills);

// Course Enrollment
router.post('/students/:studentId/courses', enrollStudentInCourse);

// Notifications
router.post('/students/:studentId/notifications', sendNotification);
router.get('/notifications', getAllNotifications);

// Community Wins
router.post('/community-wins', createCommunityWin);
router.get('/community-wins', getAllCommunityWins);
router.delete('/community-wins/:winId', deleteCommunityWin);

export default router;

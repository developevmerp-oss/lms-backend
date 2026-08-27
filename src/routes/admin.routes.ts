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
  createBadge,
  updateBadge,
  deleteBadge,
  awardBadge,
  removeBadgeFromStudent,
  updateStudentSkills,
  enrollStudentInCourse,
  sendNotification,
  getAllNotifications,
  broadcastNotification,
  getNotificationBroadcasts,
  createCommunityWin,
  getAllCommunityWins,
  deleteCommunityWin,
  getAllLevelTiers,
  createLevelTier,
  updateLevelTier,
  deleteLevelTier,
  getRevenueByTier,
} from '../controllers/admin.controller';
import {
  getAllOffers,
  createOffer,
  updateOffer,
  toggleOffer,
  deleteOffer,
  getActiveOffers,
} from '../controllers/offer.controller';

const router = Router();

// Public active offers endpoint
router.get('/offers/active', getActiveOffers);

// All admin routes require auth + admin role
router.use(authenticate, requireAdmin);

// Offers Module (Separate Module)
router.get('/offers', getAllOffers);
router.post('/offers', createOffer);
router.put('/offers/:id', updateOffer);
router.patch('/offers/:id/toggle', toggleOffer);
router.delete('/offers/:id', deleteOffer);

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
router.post('/badges', createBadge);
router.put('/badges/:badgeId', updateBadge);
router.delete('/badges/:badgeId', deleteBadge);
router.post('/students/:studentId/badges', awardBadge);
router.delete('/students/:studentId/badges/:badgeId', removeBadgeFromStudent);

// Skills
router.put('/students/:studentId/skills', updateStudentSkills);

// Course Enrollment
router.post('/students/:studentId/courses', enrollStudentInCourse);

// Notifications
router.post('/notifications/broadcast', broadcastNotification);
router.post('/students/:studentId/notifications', sendNotification);
router.get('/notifications', getAllNotifications);

// Community Wins
router.post('/community-wins', createCommunityWin);
router.get('/community-wins', getAllCommunityWins);
router.delete('/community-wins/:winId', deleteCommunityWin);

// Level & Tier Settings
router.get('/levels', getAllLevelTiers);
router.post('/levels', createLevelTier);
router.put('/levels/:levelId', updateLevelTier);
router.delete('/levels/:levelId', deleteLevelTier);
router.get('/revenue-by-tier', getRevenueByTier);

export default router;


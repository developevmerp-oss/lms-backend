import { Router } from 'express';
import {
  getAdminStats,
  getStudentStats,
  likeCommunityWin,
  commentCommunityWin,
  postCommunityWin,
  updateCommunityWin,
  deleteStudentCommunityWin,
  getCommunityWins,
  getPublicBadges,
  getPublicCourses,
  getPublicLevelTiers,
  completeDailyRoutine,
  addStudentSalesRecord,
  deleteStudentSalesRecord,
  getPublicEventsList,
  markNotificationsAsSeen
} from '../controllers/dashboard.controller';
import { getActiveOffers } from '../controllers/offer.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { cachePublic } from '../middleware/publicCache';

const router = Router();

// Public / Student active level offers route
// (public routes are cached in memory for a short time to protect the free Neon network quota)
router.get('/offers', cachePublic(60), getActiveOffers);

// Public / Student levels route
router.get('/levels', cachePublic(120), getPublicLevelTiers);

// Public / Student courses route (For landing page level progression)
router.get('/courses', cachePublic(300), getPublicCourses);

// Public / Student events list route
router.get('/events', cachePublic(120), getPublicEventsList);

// Public / Student badges route
router.get('/badges', authenticate, getPublicBadges);

// Admin stats route
router.get('/admin', authenticate, authorize(['admin']), getAdminStats);

// Student stats route
router.get('/student', authenticate, authorize(['student']), getStudentStats);

// Student Northstar sales tracking routes
router.post('/student/sales', authenticate, addStudentSalesRecord);
router.delete('/student/sales/:id', authenticate, deleteStudentSalesRecord);

// 6-Habit Daily Routine Completion route
router.post('/student/routine', authenticate, completeDailyRoutine);

// Community Win routes (Student / Authenticated users)
router.get('/community-wins', authenticate, getCommunityWins);
router.post('/community-wins', authenticate, postCommunityWin);
router.put('/community-wins/:id', authenticate, updateCommunityWin);
router.delete('/community-wins/:id', authenticate, deleteStudentCommunityWin);
router.post('/community-wins/:id/like', authenticate, likeCommunityWin);
router.post('/community-wins/:id/comment', authenticate, commentCommunityWin);

// Notification seen/read routes (Student)
router.post('/notifications/mark-seen', authenticate, markNotificationsAsSeen);
router.post('/notifications/mark-read', authenticate, markNotificationsAsSeen);
router.patch('/notifications/:id/seen', authenticate, markNotificationsAsSeen);

export default router;

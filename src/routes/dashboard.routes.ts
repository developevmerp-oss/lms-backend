import { Router } from 'express';
import {
  getAdminStats,
  getStudentStats,
  likeCommunityWin,
  commentCommunityWin,
  postCommunityWin,
  getPublicLevelTiers,
  completeDailyRoutine,
  addStudentSalesRecord,
  deleteStudentSalesRecord,
  getPublicEventsList
} from '../controllers/dashboard.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

// Public / Student levels route
router.get('/levels', getPublicLevelTiers);

// Public / Student events list route
router.get('/events', getPublicEventsList);

// Admin stats route
router.get('/admin', authenticate, authorize(['admin']), getAdminStats);

// Student stats route
router.get('/student', authenticate, authorize(['student']), getStudentStats);

// Student Northstar sales tracking routes
router.post('/student/sales', authenticate, addStudentSalesRecord);
router.delete('/student/sales/:id', authenticate, deleteStudentSalesRecord);

// 6-Habit Daily Routine Completion route
router.post('/student/routine', authenticate, completeDailyRoutine);

// Community Win interactions
router.post('/community-wins', authenticate, postCommunityWin);
router.post('/community-wins/:id/like', authenticate, likeCommunityWin);
router.post('/community-wins/:id/comment', authenticate, commentCommunityWin);

export default router;

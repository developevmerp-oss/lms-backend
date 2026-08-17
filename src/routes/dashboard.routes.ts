import { Router } from 'express';
import { getAdminStats, getStudentStats, likeCommunityWin, commentCommunityWin, postCommunityWin } from '../controllers/dashboard.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

// Admin stats route
router.get('/admin', authenticate, authorize(['admin']), getAdminStats);

// Student stats route
router.get('/student', authenticate, authorize(['student']), getStudentStats);

// Community Win interactions (allowed for both students and admins ideally, but usually students use dashboard)
router.post('/community-wins', authenticate, postCommunityWin);
router.post('/community-wins/:id/like', authenticate, likeCommunityWin);
router.post('/community-wins/:id/comment', authenticate, commentCommunityWin);

export default router;

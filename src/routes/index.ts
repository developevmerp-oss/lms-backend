import { Router } from 'express';

import authRoutes from './auth.routes';
import courseRoutes from './course.routes';
import assignmentRoutes from './assignment.routes';
import rewardRoutes from './reward.routes';
import dashboardRoutes from './dashboard.routes';
import leaderboardRoutes from './leaderboard.routes';
import certificateRoutes from './certificate.routes';
import portfolioRoutes from './portfolio.routes';
import adminRoutes from './admin.routes';
import webinarRoutes from './webinar.routes';
import paymentRoutes from './payment.routes';
import classRoutes from './class.routes';
import uploadRoutes from './upload.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/courses', courseRoutes);
router.use('/assignments', assignmentRoutes);
router.use('/rewards', rewardRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/leaderboard', leaderboardRoutes);
router.use('/certificates', certificateRoutes);
router.use('/portfolio', portfolioRoutes);
router.use('/portfolios', portfolioRoutes);
router.use('/admin', adminRoutes);
router.use('/webinar', webinarRoutes);
router.use('/payments', paymentRoutes);
router.use('/classes', classRoutes);
router.use('/upload', uploadRoutes);

export default router;

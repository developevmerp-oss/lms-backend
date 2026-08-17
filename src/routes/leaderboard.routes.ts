import { Router } from 'express';
import { getLeaderboard } from '../controllers/leaderboard.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Everyone authenticated can view the leaderboard
router.get('/', authenticate, getLeaderboard);

export default router;

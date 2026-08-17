import { Router } from 'express';
import { getRewards, createReward, redeemReward } from '../controllers/reward.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

// Everyone can view rewards
router.get('/', authenticate, getRewards);

// Admin can create rewards
router.post('/', authenticate, authorize(['admin']), createReward);

// Students can redeem rewards
router.post('/:rewardId/redeem', authenticate, authorize(['student']), redeemReward);

export default router;

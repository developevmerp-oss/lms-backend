import { Router } from 'express';
import { getRewards, createReward, redeemReward, updateReward, deleteReward } from '../controllers/reward.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

// Everyone can view rewards
router.get('/', authenticate, getRewards);

// Admin can create, update, delete rewards
router.post('/', authenticate, authorize(['admin']), createReward);
router.put('/:rewardId', authenticate, authorize(['admin']), updateReward);
router.delete('/:rewardId', authenticate, authorize(['admin']), deleteReward);

// Students can redeem rewards
router.post('/:rewardId/redeem', authenticate, authorize(['student']), redeemReward);

export default router;

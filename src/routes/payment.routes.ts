import { Router } from 'express';
import {
  getRazorpayKey,
  createPaymentOrder,
  verifyPayment,
  updateRazorpayConfig,
  recordPaymentFailure,
  getPaymentHistory,
  deletePaymentTransaction,
} from '../controllers/payment.controller';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';

const router = Router();

// Public / Student payment endpoints
router.get('/key', getRazorpayKey);
router.post('/create-order', createPaymentOrder);
router.post('/record-failure', recordPaymentFailure);
router.post('/verify', verifyPayment);

// Admin-only management & history endpoints
router.post('/config', authenticate, requireAdmin, updateRazorpayConfig);
router.get('/history', authenticate, requireAdmin, getPaymentHistory);
router.delete('/transaction/:id', authenticate, requireAdmin, deletePaymentTransaction);

export default router;

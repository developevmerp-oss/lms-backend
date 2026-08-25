import { Router } from 'express';
import { getRazorpayKey, createPaymentOrder, verifyPayment, updateRazorpayConfig } from '../controllers/payment.controller';

const router = Router();

router.get('/key', getRazorpayKey);
router.post('/config', updateRazorpayConfig);
router.post('/create-order', createPaymentOrder);
router.post('/verify', verifyPayment);

export default router;

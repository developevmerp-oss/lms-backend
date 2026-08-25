import { Router } from 'express';
import { getRazorpayKey, createPaymentOrder, verifyPayment } from '../controllers/payment.controller';

const router = Router();

router.get('/key', getRazorpayKey);
router.post('/create-order', createPaymentOrder);
router.post('/verify', verifyPayment);

export default router;

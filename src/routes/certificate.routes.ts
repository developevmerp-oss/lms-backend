import { Router } from 'express';
import { awardCertificate, getAllCertificates, getMyCertificates } from '../controllers/certificate.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

// Admins can view all certificates and award new ones
router.get('/', authenticate, authorize(['admin']), getAllCertificates);
router.post('/award', authenticate, authorize(['admin']), awardCertificate);

// Students can view their own certificates
router.get('/mine', authenticate, authorize(['student']), getMyCertificates);

export default router;

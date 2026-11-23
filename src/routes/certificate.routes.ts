import { Router } from 'express';
import { awardCertificate, getAllCertificates, getMyCertificates, updateCertificate } from '../controllers/certificate.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

// Admins can view all certificates, award new ones, and update existing ones
router.get('/', authenticate, authorize(['admin']), getAllCertificates);
router.post('/award', authenticate, authorize(['admin']), awardCertificate);
router.put('/:id', authenticate, authorize(['admin']), updateCertificate);

// Students can view their own certificates
router.get('/mine', authenticate, authorize(['student']), getMyCertificates);

export default router;

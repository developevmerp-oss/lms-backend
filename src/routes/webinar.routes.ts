import { Router } from 'express';
import {
  registerLead,
  getAllRegistrations,
  getWebinarStats,
  deleteRegistration,
} from '../controllers/webinar.controller';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';

const router = Router();

// Public Routes
router.post('/register', registerLead);
router.get('/stats', getWebinarStats);

// Admin CRM Protected Routes
router.get('/registrations', authenticate, requireAdmin, getAllRegistrations);
router.delete('/registrations/:id', authenticate, requireAdmin, deleteRegistration);

export default router;

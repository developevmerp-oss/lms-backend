import { Router } from 'express';
import {
  getNextUpcomingWebinar,
  getRecentRegistrations,
  registerLead,
  getWebinarStats,
  getAllWebinarEvents,
  createWebinarEvent,
  updateWebinarEvent,
  deleteWebinarEvent,
  getAllRegistrations,
  deleteRegistration,
} from '../controllers/webinar.controller';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';

const router = Router();

// Public Routes
router.get('/next', getNextUpcomingWebinar);
router.get('/recent-registrations', getRecentRegistrations);
router.get('/stats', getWebinarStats);
router.post('/register', registerLead);

// Webinar Multi-Event Routes (Accessible to authenticated students & admins)
router.get('/events', authenticate, getAllWebinarEvents);
router.post('/events', authenticate, requireAdmin, createWebinarEvent);
router.put('/events/:id', authenticate, requireAdmin, updateWebinarEvent);
router.delete('/events/:id', authenticate, requireAdmin, deleteWebinarEvent);

// Admin CRM Registration Leads Routes
router.get('/registrations', authenticate, requireAdmin, getAllRegistrations);
router.delete('/registrations/:id', authenticate, requireAdmin, deleteRegistration);

export default router;

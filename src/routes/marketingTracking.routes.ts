import { Router } from 'express';
import {
  getPublicTrackingConfig,
  getAdminTrackingSettings,
  saveAdminTrackingSettings,
  updateAdminTrackingSettings,
  toggleTrackingStatus,
} from '../controllers/marketingTracking.controller';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';

const router = Router();

// ── Public Endpoint (Used by React Frontend MetaPixelProvider) ──
router.get('/config', getPublicTrackingConfig);

// ── Admin Protected Endpoints ──
router.get('/admin', authenticate, requireAdmin, getAdminTrackingSettings);
router.post('/admin', authenticate, requireAdmin, saveAdminTrackingSettings);
router.put('/admin/:id', authenticate, requireAdmin, updateAdminTrackingSettings);
router.patch('/admin/:id/status', authenticate, requireAdmin, toggleTrackingStatus);

export default router;

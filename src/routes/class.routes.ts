import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';
import {
  getAllClasses,
  createClass,
  updateClass,
  deleteClass,
  joinClassAndMarkAttendance,
  toggleStudentAttendance,
  getAttendanceHistory,
  exportAttendanceHistory,
} from '../controllers/class.controller';

const router = Router();

// Student & Admin accessible
router.use(authenticate);
router.get('/', getAllClasses);

// Attendance History & Excel Export (Admin) — declared before /:classId
router.get('/attendance/export', requireAdmin, exportAttendanceHistory);
router.get('/attendance/history', requireAdmin, getAttendanceHistory);

router.post('/:classId/join', joinClassAndMarkAttendance);

// Admin-only management routes
router.post('/', requireAdmin, createClass);
router.put('/:classId', requireAdmin, updateClass);
router.delete('/:classId', requireAdmin, deleteClass);
router.post('/:classId/attendance/:studentId', requireAdmin, toggleStudentAttendance);

export default router;

import { Router } from 'express';
import {
  getCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  addChapter,
  updateChapter,
  deleteChapter,
  triggerSeedCourses
} from '../controllers/course.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

// Everyone (authenticated) can get courses
router.get('/', authenticate, getCourses);

// Admin course management
router.post('/seed', authenticate, authorize(['admin']), triggerSeedCourses);
router.post('/', authenticate, authorize(['admin']), createCourse);
router.put('/:id', authenticate, authorize(['admin']), updateCourse);
router.delete('/:id', authenticate, authorize(['admin']), deleteCourse);

// Admin chapter management
router.post('/:courseId/chapters', authenticate, authorize(['admin']), addChapter);
router.put('/chapters/:chapterId', authenticate, authorize(['admin']), updateChapter);
router.delete('/chapters/:chapterId', authenticate, authorize(['admin']), deleteChapter);

export default router;

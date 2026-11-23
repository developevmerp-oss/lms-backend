import { Router } from 'express';
import {
  getCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
  addChapter,
  updateChapter,
  deleteChapter,
  triggerSeedCourses
} from '../controllers/course.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { cachePublic } from '../middleware/publicCache';

const router = Router();

// Everyone (public / authenticated) can get courses (cached 2 min in-memory to preserve DB quota)
router.get('/', cachePublic(120), getCourses);
router.get('/:id', cachePublic(120), getCourseById);

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

import { Router } from 'express';
import { getCourses, createCourse, addChapter } from '../controllers/course.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

// Everyone (authenticated) can get courses
router.get('/', authenticate, getCourses);

// Only admins can create courses and add chapters
router.post('/', authenticate, authorize(['admin']), createCourse);
router.post('/:courseId/chapters', authenticate, authorize(['admin']), addChapter);

export default router;

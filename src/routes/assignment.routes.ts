import { Router } from 'express';
import { createAssignment, submitAssignment, reviewSubmission, getAssignments, getAllSubmissions } from '../controllers/assignment.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

// Admins can view all assignments and submissions
router.get('/', authenticate, authorize(['admin']), getAssignments);
router.get('/submissions', authenticate, authorize(['admin']), getAllSubmissions);

// Admins can create assignments and review submissions
router.post('/', authenticate, authorize(['admin']), createAssignment);
router.put('/submissions/:submissionId/review', authenticate, authorize(['admin']), reviewSubmission);

// Students can view assignments (we reuse the getAssignments endpoint but normally we'd filter or have a specific one, we'll allow students here)
router.get('/student', authenticate, authorize(['student']), getAssignments);

// Students can submit assignments
router.post('/:assignmentId/submit', authenticate, authorize(['student']), submitAssignment);

export default router;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const assignment_controller_1 = require("../controllers/assignment.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Admins can view all assignments and submissions
router.get('/', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(['admin']), assignment_controller_1.getAssignments);
router.get('/submissions', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(['admin']), assignment_controller_1.getAllSubmissions);
// Admins can create assignments and review submissions
router.post('/', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(['admin']), assignment_controller_1.createAssignment);
router.put('/submissions/:submissionId/review', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(['admin']), assignment_controller_1.reviewSubmission);
// Students can view assignments (we reuse the getAssignments endpoint but normally we'd filter or have a specific one, we'll allow students here)
router.get('/student', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(['student']), assignment_controller_1.getAssignments);
// Students can submit assignments
router.post('/:assignmentId/submit', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(['student']), assignment_controller_1.submitAssignment);
exports.default = router;

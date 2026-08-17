"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const course_controller_1 = require("../controllers/course.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Everyone (authenticated) can get courses
router.get('/', auth_middleware_1.authenticate, course_controller_1.getCourses);
// Only admins can create courses and add chapters
router.post('/', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(['admin']), course_controller_1.createCourse);
router.post('/:courseId/chapters', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(['admin']), course_controller_1.addChapter);
exports.default = router;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const admin_controller_1 = require("../controllers/admin.controller");
const router = (0, express_1.Router)();
// All admin routes require auth + admin role
router.use(auth_middleware_1.authenticate, auth_middleware_1.requireAdmin);
// Students
router.get('/students', admin_controller_1.getAllStudents);
router.get('/students/:studentId', admin_controller_1.getStudentById);
router.put('/students/:studentId', admin_controller_1.updateStudent);
// Milestones
router.post('/students/:studentId/milestones', admin_controller_1.addMilestone);
router.put('/milestones/:milestoneId', admin_controller_1.updateMilestone);
router.delete('/milestones/:milestoneId', admin_controller_1.deleteMilestone);
// Sales Records
router.post('/students/:studentId/sales', admin_controller_1.addSalesRecord);
router.delete('/sales/:recordId', admin_controller_1.deleteSalesRecord);
// Badges
router.get('/badges', admin_controller_1.getAllBadges);
router.post('/students/:studentId/badges', admin_controller_1.awardBadge);
// Skills
router.put('/students/:studentId/skills', admin_controller_1.updateStudentSkills);
// Course Enrollment
router.post('/students/:studentId/courses', admin_controller_1.enrollStudentInCourse);
// Notifications
router.post('/students/:studentId/notifications', admin_controller_1.sendNotification);
router.get('/notifications', admin_controller_1.getAllNotifications);
// Community Wins
router.post('/community-wins', admin_controller_1.createCommunityWin);
router.get('/community-wins', admin_controller_1.getAllCommunityWins);
router.delete('/community-wins/:winId', admin_controller_1.deleteCommunityWin);
exports.default = router;

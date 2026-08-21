"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const dashboard_controller_1 = require("../controllers/dashboard.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Public / Student levels route
router.get('/levels', dashboard_controller_1.getPublicLevelTiers);
// Admin stats route
router.get('/admin', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(['admin']), dashboard_controller_1.getAdminStats);
// Student stats route
router.get('/student', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(['student']), dashboard_controller_1.getStudentStats);
// Community Win interactions (allowed for both students and admins ideally, but usually students use dashboard)
router.post('/community-wins', auth_middleware_1.authenticate, dashboard_controller_1.postCommunityWin);
router.post('/community-wins/:id/like', auth_middleware_1.authenticate, dashboard_controller_1.likeCommunityWin);
router.post('/community-wins/:id/comment', auth_middleware_1.authenticate, dashboard_controller_1.commentCommunityWin);
exports.default = router;

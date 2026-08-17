"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const certificate_controller_1 = require("../controllers/certificate.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Admins can view all certificates and award new ones
router.get('/', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(['admin']), certificate_controller_1.getAllCertificates);
router.post('/award', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(['admin']), certificate_controller_1.awardCertificate);
// Students can view their own certificates
router.get('/mine', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(['student']), certificate_controller_1.getMyCertificates);
exports.default = router;

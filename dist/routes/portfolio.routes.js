"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const portfolio_controller_1 = require("../controllers/portfolio.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Student creates a new portfolio item
router.post('/', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(['student']), portfolio_controller_1.createPortfolio);
// Admin gets all pending portfolios to review
router.get('/pending', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(['admin']), portfolio_controller_1.getPendingPortfolios);
// Admin submits review and scores for a portfolio item
router.put('/:id/review', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(['admin']), portfolio_controller_1.reviewPortfolio);
exports.default = router;

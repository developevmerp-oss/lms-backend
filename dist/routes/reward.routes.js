"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const reward_controller_1 = require("../controllers/reward.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Everyone can view rewards
router.get('/', auth_middleware_1.authenticate, reward_controller_1.getRewards);
// Admin can create rewards
router.post('/', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(['admin']), reward_controller_1.createReward);
// Students can redeem rewards
router.post('/:rewardId/redeem', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(['student']), reward_controller_1.redeemReward);
exports.default = router;

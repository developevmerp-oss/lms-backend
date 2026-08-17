"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redeemReward = exports.createReward = exports.getRewards = void 0;
const models_1 = __importDefault(require("../models"));
const { Reward, User } = models_1.default;
// Get all rewards (store)
const getRewards = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const rewards = yield Reward.findAll();
        res.status(200).json(rewards);
    }
    catch (error) {
        console.error('Error fetching rewards:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.getRewards = getRewards;
// Admin creates a reward
const createReward = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { title, description, pointCost, imageUrl } = req.body;
        const reward = yield Reward.create({ title, description, pointCost, imageUrl });
        res.status(201).json({ message: 'Reward created', reward });
    }
    catch (error) {
        console.error('Error creating reward:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.createReward = createReward;
// Student redeems a reward
const redeemReward = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { rewardId } = req.params;
        const studentId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const reward = yield Reward.findByPk(rewardId);
        if (!reward)
            return res.status(404).json({ message: 'Reward not found' });
        const student = yield User.findByPk(studentId);
        if (!student)
            return res.status(404).json({ message: 'Student not found' });
        if (student.points < reward.pointCost) {
            return res.status(400).json({ message: 'Not enough points to redeem this reward' });
        }
        // Deduct points
        student.points -= reward.pointCost;
        yield student.save();
        // In a real system, you might create a UserReward pivot table to track redemptions
        res.status(200).json({ message: 'Reward redeemed successfully', reward, newPoints: student.points });
    }
    catch (error) {
        console.error('Error redeeming reward:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.redeemReward = redeemReward;

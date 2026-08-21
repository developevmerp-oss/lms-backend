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
exports.reviewPortfolio = exports.getPendingPortfolios = exports.createPortfolio = void 0;
const models_1 = __importDefault(require("../models"));
const { Portfolio, User, Skill } = models_1.default;
const createPortfolio = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const { title, technique, imageUrl } = req.body;
        if (!title || !technique || !imageUrl) {
            return res.status(400).json({ message: 'Title, technique, and image URL are required.' });
        }
        const portfolio = yield Portfolio.create({
            userId,
            title,
            technique,
            imageUrl,
        });
        res.status(201).json({ message: 'Portfolio submitted successfully', portfolio });
    }
    catch (error) {
        console.error('Error creating portfolio:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.createPortfolio = createPortfolio;
const getPendingPortfolios = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Portfolios without mentor feedback are considered pending
        const portfolios = yield Portfolio.findAll({
            where: {
                feedback: null
            },
            include: [
                { model: User, attributes: ['name', 'email', 'avatarUrl'] }
            ],
            order: [['createdAt', 'DESC']]
        });
        res.status(200).json(portfolios);
    }
    catch (error) {
        console.error('Error fetching pending portfolios:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.getPendingPortfolios = getPendingPortfolios;
const reviewPortfolio = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _b, _c, _d, _e, _f, _g, _h;
    try {
        const { id } = req.params;
        const feedback = req.body.feedback || req.body.notes || 'Artwork reviewed & approved by mentor.';
        const skillScores = req.body.scores || req.body.skills || {};
        const mentorName = ((_b = req.user) === null || _b === void 0 ? void 0 : _b.name) || 'Admin Mentor';
        const portfolio = yield Portfolio.findByPk(id);
        if (!portfolio) {
            return res.status(404).json({ message: 'Portfolio not found' });
        }
        // Update Portfolio with feedback
        yield portfolio.update({
            feedback,
            mentorName
        });
        // Update Student Skills dynamically
        // Find or create skill record for user
        let userSkill = yield Skill.findOne({ where: { userId: portfolio.userId } });
        if (!userSkill) {
            userSkill = yield Skill.create({ userId: portfolio.userId });
        }
        // Update moving average for skills (simplified logic: just overwriting for MVP, or averaging)
        // For MVP, we'll just set it to the new score. A real app might do a moving average.
        yield userSkill.update({
            resinBasics: (_c = skillScores.resinBasics) !== null && _c !== void 0 ? _c : userSkill.resinBasics,
            mixing: (_d = skillScores.mixing) !== null && _d !== void 0 ? _d : userSkill.mixing,
            colourTheory: (_e = skillScores.colourTheory) !== null && _e !== void 0 ? _e : userSkill.colourTheory,
            finishing: (_f = skillScores.finishing) !== null && _f !== void 0 ? _f : userSkill.finishing,
            creativity: (_g = skillScores.creativity) !== null && _g !== void 0 ? _g : userSkill.creativity,
            professionalQuality: (_h = skillScores.professionalQuality) !== null && _h !== void 0 ? _h : userSkill.professionalQuality,
        });
        // Add some XP for the review!
        const user = yield User.findByPk(portfolio.userId);
        if (user) {
            yield user.update({
                xpPoints: (user.xpPoints || 0) + 500,
                points: (user.points || 0) + 500
            });
        }
        res.status(200).json({ message: 'Portfolio reviewed successfully', portfolio });
    }
    catch (error) {
        console.error('Error reviewing portfolio:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.reviewPortfolio = reviewPortfolio;

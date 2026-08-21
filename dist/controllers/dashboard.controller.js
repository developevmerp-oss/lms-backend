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
exports.postCommunityWin = exports.commentCommunityWin = exports.likeCommunityWin = exports.getPublicLevelTiers = exports.getStudentStats = exports.getAdminStats = void 0;
const models_1 = __importDefault(require("../models"));
const { User, Course, Submission, Skill, Badge, Portfolio, Milestone, SalesRecord, Notification } = models_1.default;
// In-memory cache for level tiers (barely changes, no need to re-query every request)
let cachedLevelTiers = null;
let levelTierCacheAt = 0;
const LEVEL_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
function getLevelTiers() {
    return __awaiter(this, void 0, void 0, function* () {
        const now = Date.now();
        if (cachedLevelTiers && (now - levelTierCacheAt) < LEVEL_CACHE_TTL_MS) {
            return cachedLevelTiers;
        }
        let tiers = yield models_1.default.LevelTier.findAll({ order: [['minPoints', 'ASC'], ['order', 'ASC']] });
        if (!tiers || tiers.length === 0) {
            const DEFAULT_LEVELS = [
                { code: 'L0', name: 'Fast Start', minPoints: 0, maxPoints: 499, icon: '⚡', badgeColor: 'emerald', order: 0, description: 'Resin basics and first 5 creations' },
                { code: 'L1', name: 'Silver Member', minPoints: 500, maxPoints: 4999, icon: '🥈', badgeColor: 'slate', order: 1, description: 'Core techniques and first client sale' },
                { code: 'L2', name: 'Gold Member', minPoints: 5000, maxPoints: 9999, icon: '🏆', badgeColor: 'amber', order: 2, description: '₹25K–₹50K monthly revenue and custom orders' },
                { code: 'L3', name: 'Diamond Club', minPoints: 10000, maxPoints: 49999, icon: '💎', badgeColor: 'cyan', order: 3, description: 'Scale beyond ₹50K/month and corporate contracts' },
                { code: 'L3+', name: 'Masters Club', minPoints: 50000, maxPoints: null, icon: '👑', badgeColor: 'purple', order: 4, description: 'Offline city workshops and signature brand empire' },
            ];
            yield models_1.default.LevelTier.bulkCreate(DEFAULT_LEVELS);
            tiers = yield models_1.default.LevelTier.findAll({ order: [['minPoints', 'ASC'], ['order', 'ASC']] });
        }
        cachedLevelTiers = tiers;
        levelTierCacheAt = now;
        return tiers;
    });
}
const getAdminStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const [totalStudents, activeCourses, pendingAssignments] = yield Promise.all([
            User.count({ where: { role: 'student' } }),
            Course.count(),
            Submission.count({ where: { status: 'pending' } }),
        ]);
        res.status(200).json({ totalStudents, activeCourses, pendingAssignments, rewardsDistributed: 0 });
    }
    catch (error) {
        console.error('Error fetching admin stats:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.getAdminStats = getAdminStats;
const getStudentStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const studentId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!studentId)
            return res.status(401).json({ message: 'Unauthorized' });
        // Fire all independent queries in PARALLEL
        const [student, allCourses, communityWins, levelTiers] = yield Promise.all([
            User.findByPk(studentId, {
                attributes: { exclude: ['password'] },
                include: [
                    { model: Skill, as: 'skills' },
                    { model: Badge, as: 'badges' },
                    { model: Portfolio, as: 'portfolios', attributes: ['id', 'title', 'technique', 'imageUrl', 'feedback', 'createdAt'] },
                    { model: Milestone, as: 'milestones', attributes: ['id', 'name', 'completed', 'completedAt', 'order'] },
                    { model: SalesRecord, as: 'salesRecords', attributes: ['id', 'amount', 'productName', 'date'] },
                    { model: Course, as: 'courses', attributes: ['id', 'title', 'description'] },
                    { model: Notification, as: 'notifications', attributes: ['id', 'title', 'message', 'isRead', 'createdAt'] },
                ]
            }),
            Course.findAll({ attributes: ['id', 'title', 'description', 'image'] }),
            models_1.default.CommunityWin.findAll({ order: [['createdAt', 'DESC']], limit: 5 }),
            getLevelTiers(),
        ]);
        if (!student)
            return res.status(404).json({ message: 'Student not found' });
        let currentTier = levelTiers[0];
        for (const tier of levelTiers) {
            if ((student.points || 0) >= tier.minPoints)
                currentTier = tier;
        }
        const nextMilestone = (_b = student.milestones) === null || _b === void 0 ? void 0 : _b.find((m) => !m.completed);
        const nextGoal = nextMilestone ? `Next Milestone: ${nextMilestone.name}` : 'Complete pending missions';
        res.status(200).json({
            points: student.points,
            xpPoints: student.xpPoints,
            streak: student.streak,
            membershipLevel: (currentTier === null || currentTier === void 0 ? void 0 : currentTier.name) || student.membershipLevel,
            currentTier,
            levelTiers,
            rank: student.rank,
            skills: student.skills,
            badges: student.badges,
            portfolios: student.portfolios,
            milestones: student.milestones,
            salesRecords: student.salesRecords,
            courses: student.courses,
            notifications: student.notifications,
            allCourses,
            communityWins,
            nextGoal
        });
    }
    catch (error) {
        console.error('Error fetching student stats:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.getStudentStats = getStudentStats;
const getPublicLevelTiers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const levels = yield getLevelTiers();
        return res.status(200).json(levels);
    }
    catch (error) {
        console.error('Error fetching public level tiers:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});
exports.getPublicLevelTiers = getPublicLevelTiers;
const likeCommunityWin = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const win = yield models_1.default.CommunityWin.findByPk(id);
        if (!win)
            return res.status(404).json({ message: 'Win not found' });
        win.likes += 1;
        yield win.save();
        return res.status(200).json(win);
    }
    catch (error) {
        console.error('Error liking win:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.likeCommunityWin = likeCommunityWin;
const commentCommunityWin = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _c;
    try {
        const { id } = req.params;
        const { text } = req.body;
        const authorName = ((_c = req.user) === null || _c === void 0 ? void 0 : _c.name) || 'Student';
        if (!text)
            return res.status(400).json({ message: 'Comment text is required' });
        const win = yield models_1.default.CommunityWin.findByPk(id);
        if (!win)
            return res.status(404).json({ message: 'Win not found' });
        win.comments = [...(win.comments || []), { author: authorName, text }];
        yield win.save();
        return res.status(200).json(win);
    }
    catch (error) {
        console.error('Error commenting win:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.commentCommunityWin = commentCommunityWin;
const postCommunityWin = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _d;
    try {
        const { achievement } = req.body;
        const studentName = ((_d = req.user) === null || _d === void 0 ? void 0 : _d.name) || 'Student';
        if (!achievement)
            return res.status(400).json({ message: 'Achievement text is required' });
        const win = yield models_1.default.CommunityWin.create({ studentName, achievement, likes: 0, timeAgo: 'Just now' });
        return res.status(201).json(win);
    }
    catch (error) {
        console.error('Error posting community win:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.postCommunityWin = postCommunityWin;

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
exports.postCommunityWin = exports.commentCommunityWin = exports.likeCommunityWin = exports.getStudentStats = exports.getAdminStats = void 0;
const models_1 = __importDefault(require("../models"));
const { User, Course, Submission, Reward, Skill, Badge, Portfolio, Milestone, SalesRecord, Notification } = models_1.default;
const getAdminStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Total Students
        const totalStudents = yield User.count({ where: { role: 'student' } });
        // Active Courses
        const activeCourses = yield Course.count();
        // Pending Assignments
        const pendingAssignments = yield Submission.count({ where: { status: 'pending' } });
        // Rewards Distributed (Mocked for now since UserReward pivot doesn't exist yet)
        // Could also just query total rewards available for now or count a redeemed log
        const rewardsDistributed = 0;
        res.status(200).json({
            totalStudents,
            activeCourses,
            pendingAssignments,
            rewardsDistributed
        });
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
        if (!studentId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const student = yield User.findByPk(studentId, {
            include: [
                { model: Skill, as: 'skills' },
                { model: Badge, as: 'badges' },
                { model: Portfolio, as: 'portfolios' },
                { model: Milestone, as: 'milestones' },
                { model: SalesRecord, as: 'salesRecords' },
                { model: Course, as: 'courses' },
                { model: Notification, as: 'notifications' }
            ]
        });
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }
        // Fetch ALL courses to determine what is locked
        const allCourses = yield Course.findAll();
        // Fetch community wins
        const communityWins = yield models_1.default.CommunityWin.findAll({
            order: [['createdAt', 'DESC']],
            limit: 5
        });
        // Compute next goal
        // Try to find the first incomplete milestone
        const nextMilestone = (_b = student.milestones) === null || _b === void 0 ? void 0 : _b.find((m) => !m.completed);
        let nextGoal = 'Complete pending missions';
        if (nextMilestone) {
            nextGoal = `Next Milestone: ${nextMilestone.name}`;
        }
        res.status(200).json({
            points: student.points,
            xpPoints: student.xpPoints,
            streak: student.streak,
            membershipLevel: student.membershipLevel,
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
        const newComment = { author: authorName, text };
        // JSON arrays in sequelize need to be reassigned to trigger an update sometimes
        const currentComments = win.comments || [];
        win.comments = [...currentComments, newComment];
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
        const win = yield models_1.default.CommunityWin.create({
            studentName,
            achievement,
            likes: 0,
            timeAgo: 'Just now'
        });
        return res.status(201).json(win);
    }
    catch (error) {
        console.error('Error posting community win:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.postCommunityWin = postCommunityWin;

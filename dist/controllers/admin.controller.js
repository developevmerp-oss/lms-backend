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
exports.deleteCommunityWin = exports.getAllCommunityWins = exports.createCommunityWin = exports.getAllNotifications = exports.sendNotification = exports.enrollStudentInCourse = exports.updateStudentSkills = exports.awardBadge = exports.getAllBadges = exports.deleteSalesRecord = exports.addSalesRecord = exports.deleteMilestone = exports.updateMilestone = exports.addMilestone = exports.updateStudent = exports.getStudentById = exports.getAllStudents = void 0;
const models_1 = __importDefault(require("../models"));
const { User, Skill, Badge, UserBadge, Portfolio, Milestone, SalesRecord, Course, UserCourse, Notification, CommunityWin } = models_1.default;
// ===== STUDENT MANAGEMENT =====
// GET all students with full data
const getAllStudents = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const students = yield User.findAll({
            where: { role: 'student' },
            include: [
                { model: Skill, as: 'skills' },
                { model: Badge, as: 'badges' },
                { model: Portfolio, as: 'portfolios' },
                { model: Milestone, as: 'milestones', order: [['order', 'ASC']] },
                { model: SalesRecord, as: 'salesRecords' },
                { model: Course, as: 'courses' },
            ],
            order: [['points', 'DESC']]
        });
        return res.status(200).json(students);
    }
    catch (error) {
        console.error('Error fetching students:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});
exports.getAllStudents = getAllStudents;
// GET single student with full data
const getStudentById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { studentId } = req.params;
        const student = yield User.findByPk(studentId, {
            include: [
                { model: Skill, as: 'skills' },
                { model: Badge, as: 'badges' },
                { model: Portfolio, as: 'portfolios' },
                { model: Milestone, as: 'milestones' },
                { model: SalesRecord, as: 'salesRecords' },
                { model: Course, as: 'courses' },
            ]
        });
        if (!student)
            return res.status(404).json({ message: 'Student not found' });
        return res.status(200).json(student);
    }
    catch (error) {
        console.error('Error fetching student:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});
exports.getStudentById = getStudentById;
// UPDATE student (points, streak, level, etc)
const updateStudent = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { studentId } = req.params;
        const { name, points, xpPoints, streak, membershipLevel, rank, city } = req.body;
        const student = yield User.findByPk(studentId);
        if (!student)
            return res.status(404).json({ message: 'Student not found' });
        yield student.update({ name, points, xpPoints, streak, membershipLevel, rank, city });
        return res.status(200).json(student);
    }
    catch (error) {
        console.error('Error updating student:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});
exports.updateStudent = updateStudent;
// ===== MILESTONE MANAGEMENT =====
// ADD milestone for student
const addMilestone = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { studentId } = req.params;
        const { name, completed, completedAt, order } = req.body;
        const milestone = yield Milestone.create({ userId: studentId, name, completed: completed || false, completedAt, order: order || 0 });
        return res.status(201).json(milestone);
    }
    catch (error) {
        console.error('Error adding milestone:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});
exports.addMilestone = addMilestone;
// UPDATE milestone
const updateMilestone = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { milestoneId } = req.params;
        const { name, completed, completedAt, order } = req.body;
        const milestone = yield Milestone.findByPk(milestoneId);
        if (!milestone)
            return res.status(404).json({ message: 'Milestone not found' });
        yield milestone.update({ name, completed, completedAt: completed && !completedAt ? new Date() : completedAt, order });
        return res.status(200).json(milestone);
    }
    catch (error) {
        console.error('Error updating milestone:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});
exports.updateMilestone = updateMilestone;
// DELETE milestone
const deleteMilestone = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { milestoneId } = req.params;
        yield Milestone.destroy({ where: { id: milestoneId } });
        return res.status(200).json({ message: 'Milestone deleted' });
    }
    catch (error) {
        console.error('Error deleting milestone:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});
exports.deleteMilestone = deleteMilestone;
// ===== SALES RECORD MANAGEMENT =====
// ADD sales record
const addSalesRecord = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { studentId } = req.params;
        const { amount, productName, date } = req.body;
        const record = yield SalesRecord.create({ userId: studentId, amount, productName, date: date || new Date() });
        return res.status(201).json(record);
    }
    catch (error) {
        console.error('Error adding sales record:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});
exports.addSalesRecord = addSalesRecord;
// DELETE sales record
const deleteSalesRecord = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { recordId } = req.params;
        yield SalesRecord.destroy({ where: { id: recordId } });
        return res.status(200).json({ message: 'Sales record deleted' });
    }
    catch (error) {
        console.error('Error deleting sales record:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});
exports.deleteSalesRecord = deleteSalesRecord;
// ===== BADGE MANAGEMENT =====
// GET all badges
const getAllBadges = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const badges = yield Badge.findAll();
        return res.status(200).json(badges);
    }
    catch (error) {
        return res.status(500).json({ message: 'Internal server error' });
    }
});
exports.getAllBadges = getAllBadges;
// Award badge to student
const awardBadge = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { studentId } = req.params;
        const { badgeId } = req.body;
        const existing = yield UserBadge.findOne({ where: { userId: studentId, badgeId } });
        if (existing)
            return res.status(409).json({ message: 'Badge already awarded' });
        yield UserBadge.create({ userId: studentId, badgeId });
        return res.status(201).json({ message: 'Badge awarded' });
    }
    catch (error) {
        console.error('Error awarding badge:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});
exports.awardBadge = awardBadge;
// ===== SKILL MANAGEMENT =====
// UPDATE student skills
const updateStudentSkills = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { studentId } = req.params;
        const { resinBasics, mixing, colourTheory, finishing, creativity, professionalQuality } = req.body;
        let skill = yield Skill.findOne({ where: { userId: studentId } });
        if (skill) {
            yield skill.update({ resinBasics, mixing, colourTheory, finishing, creativity, professionalQuality });
        }
        else {
            skill = yield Skill.create({ userId: studentId, resinBasics, mixing, colourTheory, finishing, creativity, professionalQuality });
        }
        return res.status(200).json(skill);
    }
    catch (error) {
        console.error('Error updating skills:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});
exports.updateStudentSkills = updateStudentSkills;
// ===== COURSE ENROLLMENT =====
// Enroll/Update student course
const enrollStudentInCourse = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { studentId } = req.params;
        const { courseId, progress, status } = req.body;
        const [record, created] = yield UserCourse.findOrCreate({
            where: { userId: studentId, courseId },
            defaults: { progress: progress || 0, status: status || 'enrolled' }
        });
        if (!created) {
            yield record.update({ progress, status });
        }
        return res.status(200).json(record);
    }
    catch (error) {
        console.error('Error enrolling student:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});
exports.enrollStudentInCourse = enrollStudentInCourse;
// ===== NOTIFICATION MANAGEMENT =====
// SEND notification to a student
const sendNotification = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { studentId } = req.params;
        const { title, message } = req.body;
        if (!title || !message) {
            return res.status(400).json({ message: 'Title and message are required' });
        }
        const student = yield User.findByPk(studentId);
        if (!student)
            return res.status(404).json({ message: 'Student not found' });
        const notification = yield Notification.create({
            userId: studentId,
            title,
            message,
            isRead: false
        });
        return res.status(201).json(notification);
    }
    catch (error) {
        console.error('Error sending notification:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});
exports.sendNotification = sendNotification;
// GET all notifications (admin view)
const getAllNotifications = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const notifications = yield Notification.findAll({
            include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }],
            order: [['createdAt', 'DESC']]
        });
        return res.status(200).json(notifications);
    }
    catch (error) {
        console.error('Error fetching notifications:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});
exports.getAllNotifications = getAllNotifications;
// ===== COMMUNITY WIN MANAGEMENT =====
// CREATE community win
const createCommunityWin = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { studentName, achievement, likes, timeAgo } = req.body;
        if (!studentName || !achievement) {
            return res.status(400).json({ message: 'studentName and achievement are required' });
        }
        const win = yield CommunityWin.create({
            studentName,
            achievement,
            likes: likes || 0,
            timeAgo: timeAgo || 'Just now'
        });
        return res.status(201).json(win);
    }
    catch (error) {
        console.error('Error creating community win:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});
exports.createCommunityWin = createCommunityWin;
// GET all community wins
const getAllCommunityWins = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const wins = yield CommunityWin.findAll({
            order: [['createdAt', 'DESC']]
        });
        return res.status(200).json(wins);
    }
    catch (error) {
        console.error('Error fetching community wins:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});
exports.getAllCommunityWins = getAllCommunityWins;
// DELETE community win
const deleteCommunityWin = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { winId } = req.params;
        yield CommunityWin.destroy({ where: { id: winId } });
        return res.status(200).json({ message: 'Community win deleted' });
    }
    catch (error) {
        console.error('Error deleting community win:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});
exports.deleteCommunityWin = deleteCommunityWin;

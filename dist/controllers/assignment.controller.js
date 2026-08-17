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
exports.reviewSubmission = exports.submitAssignment = exports.createAssignment = exports.getAllSubmissions = exports.getAssignments = void 0;
const models_1 = __importDefault(require("../models"));
const { Assignment, Submission, User, Course } = models_1.default;
// Get all assignments
const getAssignments = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const assignments = yield Assignment.findAll({
            include: [
                { model: Course, as: 'course' },
                { model: Submission, as: 'submissions', include: [{ model: User, as: 'student' }] }
            ],
            order: [['createdAt', 'DESC']]
        });
        res.status(200).json(assignments);
    }
    catch (error) {
        console.error('Error fetching assignments:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.getAssignments = getAssignments;
// Get all submissions for review
const getAllSubmissions = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const submissions = yield Submission.findAll({
            include: [
                { model: User, as: 'student' },
                { model: Assignment, as: 'assignment' }
            ],
            order: [['createdAt', 'DESC']]
        });
        res.status(200).json(submissions);
    }
    catch (error) {
        console.error('Error fetching submissions:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.getAllSubmissions = getAllSubmissions;
// Create assignment
const createAssignment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { title, description, points, dueDate, courseId } = req.body;
        const assignment = yield Assignment.create({ title, description, points, dueDate, courseId });
        res.status(201).json({ message: 'Assignment created', assignment });
    }
    catch (error) {
        console.error('Error creating assignment:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.createAssignment = createAssignment;
// Student submits an assignment
const submitAssignment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { assignmentId } = req.params;
        const { fileUrl } = req.body;
        const studentId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const submission = yield Submission.create({ fileUrl, assignmentId, studentId });
        res.status(201).json({ message: 'Assignment submitted', submission });
    }
    catch (error) {
        console.error('Error submitting assignment:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.submitAssignment = submitAssignment;
// Admin reviews and awards points
const reviewSubmission = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { submissionId } = req.params;
        const { status, pointsAwarded } = req.body; // status: 'approved' | 'rejected'
        const submission = yield Submission.findByPk(submissionId);
        if (!submission)
            return res.status(404).json({ message: 'Submission not found' });
        submission.status = status;
        submission.pointsAwarded = pointsAwarded;
        yield submission.save();
        // If approved, update student points and streak
        if (status === 'approved') {
            const student = yield User.findByPk(submission.studentId);
            if (student) {
                student.points += pointsAwarded;
                student.streak += 1;
                yield student.save();
            }
        }
        res.status(200).json({ message: 'Submission reviewed', submission });
    }
    catch (error) {
        console.error('Error reviewing submission:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.reviewSubmission = reviewSubmission;

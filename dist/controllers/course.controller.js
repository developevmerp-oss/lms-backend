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
exports.addChapter = exports.createCourse = exports.getCourses = void 0;
const models_1 = __importDefault(require("../models"));
const { Course, Chapter, Assignment } = models_1.default;
// Get all courses
const getCourses = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const courses = yield Course.findAll({
            include: [
                { model: Chapter, as: 'chapters' },
                { model: Assignment, as: 'assignments' }
            ]
        });
        res.status(200).json(courses);
    }
    catch (error) {
        console.error('Error fetching courses:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.getCourses = getCourses;
// Create a new course
const createCourse = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { title, description, image } = req.body;
        const course = yield Course.create({ title, description, image });
        res.status(201).json({ message: 'Course created successfully', course });
    }
    catch (error) {
        console.error('Error creating course:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.createCourse = createCourse;
// Add a chapter to a course
const addChapter = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { courseId } = req.params;
        const { title, videoUrl, pdfUrl } = req.body;
        const course = yield Course.findByPk(courseId);
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }
        const chapter = yield Chapter.create({ title, videoUrl, pdfUrl, courseId });
        res.status(201).json({ message: 'Chapter added successfully', chapter });
    }
    catch (error) {
        console.error('Error adding chapter:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.addChapter = addChapter;

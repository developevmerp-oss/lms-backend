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
exports.awardCertificate = exports.getMyCertificates = exports.getAllCertificates = void 0;
const models_1 = __importDefault(require("../models"));
const { Certificate, User, Course } = models_1.default;
// Get all certificates (Admin)
const getAllCertificates = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const certificates = yield Certificate.findAll({
            include: [
                { model: User, as: 'student' },
                { model: Course, as: 'course' }
            ],
            order: [['createdAt', 'DESC']]
        });
        res.status(200).json(certificates);
    }
    catch (error) {
        console.error('Error fetching certificates:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.getAllCertificates = getAllCertificates;
// Get a student's certificates (Student)
const getMyCertificates = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const studentId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const certificates = yield Certificate.findAll({
            where: { studentId },
            include: [
                { model: Course, as: 'course' }
            ],
            order: [['createdAt', 'DESC']]
        });
        res.status(200).json(certificates);
    }
    catch (error) {
        console.error('Error fetching my certificates:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.getMyCertificates = getMyCertificates;
// Award a certificate (Admin)
const awardCertificate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { studentId, courseId, pdfUrl } = req.body;
        // Create the certificate
        const certificate = yield Certificate.create({ studentId, courseId, pdfUrl });
        res.status(201).json({ message: 'Certificate awarded', certificate });
    }
    catch (error) {
        console.error('Error awarding certificate:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.awardCertificate = awardCertificate;

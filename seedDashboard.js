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
const models_1 = __importDefault(require("./src/models"));
const database_1 = require("./src/config/database");
const seedDashboard = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield database_1.sequelize.authenticate();
        console.log('Database connected.');
        // Find our test student
        let student = yield models_1.default.User.findOne({ where: { role: 'student' } });
        if (!student) {
            console.log('No student found. Creating test@test.com...');
            student = yield models_1.default.User.create({
                name: 'Test Student',
                email: 'test@test.com',
                password: 'hashed_password', // Mock since it is just seeding
                role: 'student',
                points: 0,
                xpPoints: 0,
                streak: 5,
                membershipLevel: 'L0'
            });
        }
        console.log('Seeding dashboard data for:', student.name);
        // 1. Seed Milestones
        yield models_1.default.Milestone.destroy({ where: { userId: student.id } });
        yield models_1.default.Milestone.bulkCreate([
            { userId: student.id, name: 'First Product Made', completed: true, completedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), order: 1 },
            { userId: student.id, name: 'Instagram Page Launched', completed: true, completedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000), order: 2 },
            { userId: student.id, name: 'First Sale (₹2,500)', completed: true, completedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), order: 3 },
            { userId: student.id, name: 'Registered Business', completed: false, order: 4 },
            { userId: student.id, name: 'Consistent ₹25k/month', completed: false, order: 5 },
            { userId: student.id, name: 'Taught First Workshop', completed: false, order: 6 },
            { userId: student.id, name: 'Launched Own Course', completed: false, order: 7 },
        ]);
        // 2. Seed Sales Records
        yield models_1.default.SalesRecord.destroy({ where: { userId: student.id } });
        yield models_1.default.SalesRecord.bulkCreate([
            { userId: student.id, amount: 2500, productName: 'Resin Coasters Set', date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) },
            { userId: student.id, amount: 5000, productName: 'Custom Clock', date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
            { userId: student.id, amount: 3000, productName: 'Geode Art Piece', date: new Date() },
        ]);
        // 3. Seed Courses
        // Clean old courses
        yield models_1.default.Course.destroy({ where: {} });
        const c1 = yield models_1.default.Course.create({ title: 'Resin Geode Masterclass', description: 'Master the art of geode resin pouring.' });
        const c2 = yield models_1.default.Course.create({ title: 'Resin Clock Making', description: 'Create stunning functional art.' });
        const c3 = yield models_1.default.Course.create({ title: 'Beach Theme Resin', description: 'Create realistic ocean waves.' });
        yield models_1.default.UserCourse.destroy({ where: { userId: student.id } });
        yield models_1.default.UserCourse.bulkCreate([
            { userId: student.id, courseId: c1.id, progress: 100, status: 'completed' },
            { userId: student.id, courseId: c2.id, progress: 100, status: 'completed' },
            { userId: student.id, courseId: c3.id, progress: 35, status: 'enrolled' },
        ]);
        console.log('Seeding complete!');
        process.exit(0);
    }
    catch (error) {
        console.error('Seeding failed:', error);
        process.exit(1);
    }
});
seedDashboard();

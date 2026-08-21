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
exports.updateProfile = exports.getMe = exports.login = exports.register = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const models_1 = __importDefault(require("../models"));
const { User } = models_1.default;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey_change_in_production';
const register = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, email, password, role, city, phone, bio } = req.body;
        // Check if user already exists
        const existingUser = yield User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }
        // Hash password
        const hashedPassword = yield bcrypt_1.default.hash(password, 10);
        // Create user
        const user = yield User.create({
            name,
            email,
            password: hashedPassword,
            role: role || 'student',
            city: city || null,
            phone: phone || null,
            bio: bio || null,
        });
        res.status(201).json({
            message: 'User registered successfully',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });
    }
    catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.register = register;
const login = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password } = req.body;
        // Find user
        const user = yield User.findOne({ where: { email } });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        // Check password
        const isMatch = yield bcrypt_1.default.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        // Generate token
        const token = jsonwebtoken_1.default.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '1d' });
        res.status(200).json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                points: user.points,
                streak: user.streak,
                avatarUrl: user.avatarUrl || null,
                city: user.city || null,
                phone: user.phone || null,
                bio: user.bio || null,
            },
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.login = login;
// GET current logged-in user profile
const getMe = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId)
            return res.status(401).json({ message: 'Unauthorized' });
        const user = yield User.findByPk(userId, {
            attributes: ['id', 'name', 'email', 'role', 'points', 'streak', 'membershipLevel', 'city', 'phone', 'bio', 'avatarUrl', 'createdAt']
        });
        if (!user)
            return res.status(404).json({ message: 'User not found' });
        return res.status(200).json(user);
    }
    catch (error) {
        console.error('getMe error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});
exports.getMe = getMe;
// UPDATE current user profile (for both student and admin)
const updateProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _b;
    try {
        const userId = (_b = req.user) === null || _b === void 0 ? void 0 : _b.id;
        if (!userId)
            return res.status(401).json({ message: 'Unauthorized' });
        const { name, avatarUrl, city, phone, bio, password } = req.body;
        const user = yield User.findByPk(userId);
        if (!user)
            return res.status(404).json({ message: 'User not found' });
        const updateData = {};
        if (name !== undefined)
            updateData.name = name;
        if (avatarUrl !== undefined)
            updateData.avatarUrl = avatarUrl;
        if (city !== undefined)
            updateData.city = city;
        if (phone !== undefined)
            updateData.phone = phone;
        if (bio !== undefined)
            updateData.bio = bio;
        if (password && password.trim().length >= 6) {
            updateData.password = yield bcrypt_1.default.hash(password, 10);
        }
        yield user.update(updateData);
        return res.status(200).json({
            message: 'Profile updated successfully',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                points: user.points,
                streak: user.streak,
                avatarUrl: user.avatarUrl,
                city: user.city,
                phone: user.phone,
                bio: user.bio,
            }
        });
    }
    catch (error) {
        console.error('updateProfile error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});
exports.updateProfile = updateProfile;

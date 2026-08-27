import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import db from '../models';

const { User, Skill } = db;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey_change_in_production';

export const register = async (req: Request, res: Response): Promise<any> => {
  try {
    const { name, email, password, role, city, phone, bio } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email: cleanEmail } });
    if (existingUser) {
      return res.status(400).json({ message: 'An account with this email already exists. Please sign in.' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user with Fast Start (L0) initialized
    const user = await User.create({
      name: name.trim(),
      email: cleanEmail,
      password: hashedPassword,
      role: role || 'student',
      city: city || null,
      phone: phone || null,
      bio: bio || null,
      rank: 'Fast Start',
      points: 0,
      xpPoints: 0,
      streak: 1,
    });

    // Initialize default skills
    if (Skill) {
      await Skill.create({ userId: user.id, level: 'Beginner' }).catch(() => {});
    }

    // Generate instant authentication token
    const token = jwt.sign(
      { id: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.status(201).json({
      message: 'Account created and Fast Start (Level 0) enrolled successfully!',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        rank: user.rank,
        points: user.points,
        city: user.city,
        phone: user.phone,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const login = async (req: Request, res: Response): Promise<any> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Find user
    const user = await User.findOne({ where: { email: cleanEmail } });
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    if (!user.password) {
      return res.status(400).json({ message: 'Account does not have password login enabled. Please register.' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // Update lastLoginAt
    await user.update({ lastLoginAt: new Date() }).catch(() => {});

    // Generate token
    const token = jwt.sign(
      { id: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    return res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
        rank: user.rank,
        membershipLevel: user.membershipLevel || 'L0',
        points: user.points || 0,
        xpPoints: user.xpPoints || 0,
        lastLoginAt: user.lastLoginAt,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(500).json({ message: error?.message || 'Internal server error' });
  }
};

export const getMe = async (req: any, res: Response): Promise<any> => {
  try {
    const userId = req.user?.id;
    const user = await User.findByPk(userId, {
      attributes: { exclude: ['password'] },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ user });
  } catch (error) {
    console.error('GetMe error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateProfile = async (req: any, res: Response): Promise<any> => {
  try {
    const userId = req.user?.id;
    const { name, city, phone, bio, avatarUrl } = req.body;

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await user.update({
      name: name !== undefined ? name : user.name,
      city: city !== undefined ? city : user.city,
      phone: phone !== undefined ? phone : user.phone,
      bio: bio !== undefined ? bio : user.bio,
      avatarUrl: avatarUrl !== undefined ? avatarUrl : user.avatarUrl,
    });

    res.status(200).json({
      message: 'Profile updated successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        city: user.city,
        phone: user.phone,
        bio: user.bio,
        avatarUrl: user.avatarUrl,
        rank: user.rank,
        points: user.points,
      },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

import { Request, Response } from 'express';
import db from '../models';

const { User } = db;

export const getLeaderboard = async (req: Request, res: Response): Promise<any> => {
  try {
    const students = await User.findAll({
      where: { role: 'student' },
      order: [['points', 'DESC'], ['streak', 'DESC']],
      // Only select fields needed for leaderboard display — never select all columns
      attributes: ['id', 'name', 'points', 'xpPoints', 'streak', 'membershipLevel', 'rank', 'avatarUrl'],
      limit: 100, // Cap at top 100 — prevents full table scan on every page load
    });
    res.status(200).json(students);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

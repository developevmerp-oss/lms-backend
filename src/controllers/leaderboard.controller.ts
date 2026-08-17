import { Request, Response } from 'express';
import db from '../models';

const { User } = db;

export const getLeaderboard = async (req: Request, res: Response): Promise<any> => {
  try {
    const students = await User.findAll({
      where: { role: 'student' },
      order: [['points', 'DESC'], ['streak', 'DESC']],
      attributes: ['id', 'name', 'points', 'streak'] // don't expose email or password
    });
    res.status(200).json(students);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

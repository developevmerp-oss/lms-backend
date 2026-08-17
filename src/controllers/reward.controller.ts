import { Request, Response } from 'express';
import db from '../models';
import { AuthRequest } from '../middleware/auth.middleware';

const { Reward, User } = db;

// Get all rewards (store)
export const getRewards = async (req: Request, res: Response): Promise<any> => {
  try {
    const rewards = await Reward.findAll();
    res.status(200).json(rewards);
  } catch (error) {
    console.error('Error fetching rewards:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Admin creates a reward
export const createReward = async (req: Request, res: Response): Promise<any> => {
  try {
    const { title, description, pointCost, imageUrl } = req.body;
    const reward = await Reward.create({ title, description, pointCost, imageUrl });
    res.status(201).json({ message: 'Reward created', reward });
  } catch (error) {
    console.error('Error creating reward:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Student redeems a reward
export const redeemReward = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { rewardId } = req.params;
    const studentId = req.user?.id;

    const reward = await Reward.findByPk(rewardId);
    if (!reward) return res.status(404).json({ message: 'Reward not found' });

    const student = await User.findByPk(studentId);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    if (student.points < reward.pointCost) {
      return res.status(400).json({ message: 'Not enough points to redeem this reward' });
    }

    // Deduct points
    student.points -= reward.pointCost;
    await student.save();

    // In a real system, you might create a UserReward pivot table to track redemptions
    res.status(200).json({ message: 'Reward redeemed successfully', reward, newPoints: student.points });
  } catch (error) {
    console.error('Error redeeming reward:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

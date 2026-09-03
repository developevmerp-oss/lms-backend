import { Request, Response } from 'express';
import db from '../models';
import { AuthRequest } from '../middleware/auth.middleware';
import { isL3Student } from '../utils/xpHelper';

const { Reward, User } = db;

export const SPREADSHEET_MERCH_ITEMS = [
  {
    title: '30 min 1-on-1 Mentoring Call',
    description: 'Private 1-on-1 strategy & portfolio review session with Vrajangna Patel (Prior booking required).',
    pointCost: 1500,
    imageUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=80',
  },
  {
    title: 'Custom Artistry Journal with Pen',
    description: 'Premium hardcover resin artist planner & goal tracking journal with signature metallic gel pen.',
    pointCost: 2000,
    imageUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80',
  },
  {
    title: 'Ravishing Art Physical Merch Kit',
    description: 'Complete 9-Piece Merch Bundle: Badge/Fridge Magnet, Credit Card Goal Card, Lanyard Keychain, A5 Customized Notebook (80 pgs), Corrugated Box, Logo Pen, 8x4 Voucher, A5 Appreciation Card & 20mm Silicone Wrist Band.',
    pointCost: 3000,
    imageUrl: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=600&q=80',
  },
  {
    title: '15% Off Discount Voucher',
    description: 'Redeem 15% discount on any advanced masterclass course or live offline workshop ticket.',
    pointCost: 5000,
    imageUrl: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=600&q=80',
  },
  {
    title: '50% OFF Live Ticket + Physical Renaissance Certificate',
    description: '50% discount on live event ticket + physical printed Renaissance Master Certification awarded live on stage during event.',
    pointCost: 10000,
    imageUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=600&q=80',
  },
];

// Get all rewards (store)
export const getRewards = async (req: Request, res: Response): Promise<any> => {
  try {
    let rewards = await Reward.findAll({ order: [['pointCost', 'ASC']] });
    if (!rewards || rewards.length === 0) {
      await Reward.bulkCreate(SPREADSHEET_MERCH_ITEMS);
      rewards = await Reward.findAll({ order: [['pointCost', 'ASC']] });
    }
    return res.status(200).json(rewards);
  } catch (error) {
    console.error('Error fetching rewards:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Admin creates a reward
export const createReward = async (req: Request, res: Response): Promise<any> => {
  try {
    const { title, description, pointCost, imageUrl } = req.body;
    const reward = await Reward.create({ title, description, pointCost: Number(pointCost) || 0, imageUrl });
    return res.status(201).json({ message: 'Reward created', reward });
  } catch (error: any) {
    console.error('Error creating reward:', error);
    return res.status(500).json({ message: error?.message || 'Internal server error' });
  }
};

// Student redeems a reward (L3 Diamond Club Exclusive)
export const redeemReward = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { rewardId } = req.params;
    const studentId = req.user?.id;

    const reward = await Reward.findByPk(rewardId);
    if (!reward) return res.status(404).json({ message: 'Reward not found' });

    const student = await User.findByPk(studentId);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    if (!isL3Student(student)) {
      return res.status(403).json({
        message: '🔒 XP Earning and Reward Store redemption is exclusively available for L3 Diamond Club Members!'
      });
    }

    const currentPoints = student.xpPoints !== undefined ? student.xpPoints : (student.points || 0);
    if (currentPoints < reward.pointCost) {
      return res.status(400).json({ message: `Not enough XP points to redeem this reward. You need ${reward.pointCost - currentPoints} more XP!` });
    }

    // Deduct points safely
    student.points = Math.max(0, (student.points || 0) - reward.pointCost);
    student.xpPoints = Math.max(0, (student.xpPoints || 0) - reward.pointCost);
    await student.save();

    return res.status(200).json({
      success: true,
      message: `🎉 Reward "${reward.title}" redeemed successfully! Team Ravishing Art Hub will contact you shortly.`,
      reward,
      newPoints: student.xpPoints,
    });
  } catch (error) {
    console.error('Error redeeming reward:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Admin updates a reward
export const updateReward = async (req: Request, res: Response): Promise<any> => {
  try {
    const { rewardId } = req.params;
    const { title, description, pointCost, imageUrl } = req.body;
    const reward = await Reward.findByPk(rewardId);
    if (!reward) return res.status(404).json({ message: 'Reward not found' });

    await reward.update({
      title: title !== undefined ? title : reward.title,
      description: description !== undefined ? description : reward.description,
      pointCost: pointCost !== undefined ? Number(pointCost) : reward.pointCost,
      imageUrl: imageUrl !== undefined ? imageUrl : reward.imageUrl,
    });

    return res.status(200).json({ message: 'Reward updated successfully', reward });
  } catch (error) {
    console.error('Error updating reward:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Admin deletes a reward
export const deleteReward = async (req: Request, res: Response): Promise<any> => {
  try {
    const { rewardId } = req.params;
    const reward = await Reward.findByPk(rewardId);
    if (!reward) return res.status(404).json({ message: 'Reward not found' });

    await reward.destroy();
    return res.status(200).json({ message: 'Reward deleted successfully' });
  } catch (error) {
    console.error('Error deleting reward:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

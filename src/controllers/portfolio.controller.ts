import { Request, Response } from 'express';
import db from '../models';
import { AuthRequest } from '../middleware/auth.middleware';

const { Portfolio, User, Skill } = db;

export const createPortfolio = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user?.id;
    const { title, technique, imageUrl } = req.body;

    if (!title || !technique || !imageUrl) {
      return res.status(400).json({ message: 'Title, technique, and image URL are required.' });
    }

    const portfolio = await Portfolio.create({
      userId,
      title,
      technique,
      imageUrl,
    });

    res.status(201).json({ message: 'Portfolio submitted successfully', portfolio });
  } catch (error) {
    console.error('Error creating portfolio:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getPendingPortfolios = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    // Portfolios without mentor feedback are considered pending
    const portfolios = await Portfolio.findAll({
      where: {
        feedback: null
      },
      include: [
        { model: User, attributes: ['name', 'email', 'avatarUrl'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json(portfolios);
  } catch (error) {
    console.error('Error fetching pending portfolios:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const reviewPortfolio = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const { feedback, scores } = req.body;
    const mentorName = (req.user as any)?.name || 'Admin Mentor';

    if (!feedback || !scores) {
      return res.status(400).json({ message: 'Feedback and scores are required.' });
    }

    const portfolio = await Portfolio.findByPk(id);
    if (!portfolio) {
      return res.status(404).json({ message: 'Portfolio not found' });
    }

    // Update Portfolio with feedback
    await portfolio.update({
      feedback,
      mentorName
    });

    // Update Student Skills dynamically
    // Find or create skill record for user
    let userSkill = await Skill.findOne({ where: { userId: portfolio.userId } });
    if (!userSkill) {
      userSkill = await Skill.create({ userId: portfolio.userId });
    }

    // Update moving average for skills (simplified logic: just overwriting for MVP, or averaging)
    // For MVP, we'll just set it to the new score. A real app might do a moving average.
    await userSkill.update({
      resinBasics: scores.resinBasics || userSkill.resinBasics,
      mixing: scores.mixing || userSkill.mixing,
      colourTheory: scores.colourTheory || userSkill.colourTheory,
      finishing: scores.finishing || userSkill.finishing,
      creativity: scores.creativity || userSkill.creativity,
      professionalQuality: scores.professionalQuality || userSkill.professionalQuality,
    });

    // Add some XP for the review!
    const user = await User.findByPk(portfolio.userId);
    if (user) {
      await user.update({
        xpPoints: (user.xpPoints || 0) + 500,
        points: (user.points || 0) + 500
      });
    }

    res.status(200).json({ message: 'Portfolio reviewed successfully', portfolio });
  } catch (error) {
    console.error('Error reviewing portfolio:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

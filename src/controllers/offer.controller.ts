import { Request, Response } from 'express';
import db from '../models';
import { AuthRequest } from '../middleware/auth.middleware';

const { LevelOffer } = db;

// GET all offers (Admin)
export const getAllOffers = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const offers = await LevelOffer.findAll({
      order: [['createdAt', 'DESC']],
    });
    return res.status(200).json(offers);
  } catch (error) {
    console.error('Error fetching level offers:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// GET active valid campaign offers (Public / Students)
export const getActiveOffers = async (_req: Request, res: Response): Promise<any> => {
  try {
    const offers = await LevelOffer.findAll({
      where: { isActive: true },
      order: [['createdAt', 'DESC']],
    });

    const now = new Date();
    const validOffers = offers.filter((o: any) => {
      if (o.startDate && new Date(o.startDate) > now) return false;
      if (o.endDate && new Date(o.endDate) < now) return false;
      return true;
    });

    return res.status(200).json(validOffers);
  } catch (error) {
    console.error('Error fetching active offers:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// CREATE a new level offer (Admin)
export const createOffer = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { title, levelCode, discountType, discountValue, startDate, endDate, isActive, bannerText } = req.body;

    if (!title || !levelCode || discountValue === undefined) {
      return res.status(400).json({ message: 'Title, levelCode, and discountValue are required' });
    }

    const offer = await LevelOffer.create({
      title,
      levelCode: levelCode.toUpperCase(),
      discountType: discountType || 'percentage',
      discountValue: parseFloat(discountValue) || 0,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      bannerText: bannerText || title,
    });

    return res.status(201).json(offer);
  } catch (error) {
    console.error('Error creating level offer:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// UPDATE a level offer (Admin)
export const updateOffer = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const { title, levelCode, discountType, discountValue, startDate, endDate, isActive, bannerText } = req.body;

    const offer = await LevelOffer.findByPk(id);
    if (!offer) return res.status(404).json({ message: 'Offer not found' });

    await offer.update({
      title: title !== undefined ? title : offer.title,
      levelCode: levelCode !== undefined ? levelCode.toUpperCase() : offer.levelCode,
      discountType: discountType !== undefined ? discountType : offer.discountType,
      discountValue: discountValue !== undefined ? parseFloat(discountValue) : offer.discountValue,
      startDate: startDate !== undefined ? (startDate ? new Date(startDate) : null) : offer.startDate,
      endDate: endDate !== undefined ? (endDate ? new Date(endDate) : null) : offer.endDate,
      isActive: isActive !== undefined ? Boolean(isActive) : offer.isActive,
      bannerText: bannerText !== undefined ? bannerText : offer.bannerText,
    });

    return res.status(200).json(offer);
  } catch (error) {
    console.error('Error updating level offer:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// TOGGLE offer status
export const toggleOffer = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const offer = await LevelOffer.findByPk(id);
    if (!offer) return res.status(404).json({ message: 'Offer not found' });

    await offer.update({ isActive: !offer.isActive });
    return res.status(200).json(offer);
  } catch (error) {
    console.error('Error toggling offer:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// DELETE a level offer
export const deleteOffer = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const offer = await LevelOffer.findByPk(id);
    if (!offer) return res.status(404).json({ message: 'Offer not found' });

    await offer.destroy();
    return res.status(200).json({ message: 'Offer deleted successfully' });
  } catch (error) {
    console.error('Error deleting offer:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

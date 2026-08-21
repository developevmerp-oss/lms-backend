import { Request, Response } from 'express';
import WebinarRegistration from '../models/webinarRegistration';
import { Op } from 'sequelize';

export const registerLead = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, phone, challenge, source } = req.body;

    if (!name || !email || !phone) {
      res.status(400).json({
        success: false,
        message: 'Full Name, Email address, and WhatsApp Phone number are required.',
      });
      return;
    }

    // Clean data
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim();

    // Check if lead already registered
    let registration = await WebinarRegistration.findOne({
      where: {
        [Op.or]: [{ email: cleanEmail }, { phone: cleanPhone }],
      },
    });

    if (registration) {
      // Update with latest challenge or source
      await registration.update({
        name: name.trim(),
        challenge: challenge || registration.challenge,
        source: source || registration.source,
      });
    } else {
      registration = await WebinarRegistration.create({
        name: name.trim(),
        email: cleanEmail,
        phone: cleanPhone,
        challenge: challenge || null,
        source: source || 'webinar-landing-page',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Your seat has been successfully reserved!',
      data: {
        id: registration.id,
        name: registration.name,
        email: registration.email,
        phone: registration.phone,
        whatsappGroupUrl: 'https://chat.whatsapp.com/sample-art-webinar-vip',
        webinarTitle: 'Resin Mastery Masterclass — Live with Vrajangna Patel',
        webinarDate: 'Sunday, 8:00 PM IST',
        zoomLinkPlaceholder: 'Emailed directly to your registered address',
      },
    });
  } catch (error: any) {
    console.error('Webinar Registration Error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while reserving your seat. Please try again.',
      error: error.message,
    });
  }
};

export const getAllRegistrations = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, page = '1', limit = '50' } = req.query;
    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 50;
    const offset = (pageNum - 1) * limitNum;

    const whereClause: any = {};
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { phone: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const { count, rows } = await WebinarRegistration.findAndCountAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
      limit: limitNum,
      offset,
    });

    res.status(200).json({
      success: true,
      data: rows,
      meta: {
        total: count,
        page: pageNum,
        totalPages: Math.ceil(count / limitNum),
      },
    });
  } catch (error: any) {
    console.error('Fetch Registrations Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getWebinarStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    const totalCount = await WebinarRegistration.count();
    
    // Calculate live scarcity numbers
    const totalSeats = 500;
    const baseRegistered = 412; // Social proof baseline
    const dynamicRegistered = Math.min(totalSeats - 12, baseRegistered + totalCount);
    const seatsRemaining = Math.max(12, totalSeats - dynamicRegistered);
    const percentFull = Math.round((dynamicRegistered / totalSeats) * 100);

    res.status(200).json({
      success: true,
      data: {
        totalRegistrations: totalCount,
        dynamicRegistered,
        seatsRemaining,
        percentFull,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteRegistration = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await WebinarRegistration.destroy({ where: { id } });
    res.status(200).json({ success: true, message: 'Registration removed successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

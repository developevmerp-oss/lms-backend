import { Request, Response } from 'express';
import WebinarRegistration from '../models/webinarRegistration';
import WebinarEvent from '../models/webinarEvent';
import { Op } from 'sequelize';

// Helper to format relative time
function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins === 1) return '1 minute ago';
  if (diffMins < 60) return `${diffMins} minutes ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours === 1) return '1 hour ago';
  if (diffHours < 24) return `${diffHours} hours ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} days ago`;
}

// Public: Get Next Upcoming Active Webinar for Live Countdown Timer & Links
export const getNextUpcomingWebinar = async (_req: Request, res: Response): Promise<void> => {
  try {
    const now = new Date();

    let event = await WebinarEvent.findOne({
      where: {
        isActive: true,
        scheduledAt: { [Op.gt]: now },
        status: { [Op.ne]: 'completed' },
      },
      order: [['scheduledAt', 'ASC']],
    });

    if (!event) {
      const target = new Date();
      const day = target.getDay();
      const diff = (7 - day) % 7;
      target.setDate(target.getDate() + (diff === 0 && target.getHours() >= 20 ? 7 : diff));
      target.setHours(20, 0, 0, 0);

      res.status(200).json({
        success: true,
        data: {
          id: null,
          title: 'Resin Mastery Masterclass — Live with Vrajangna Patel',
          scheduledAt: target.toISOString(),
          durationMinutes: 90,
          zoomJoinUrl: 'Emailed directly upon registration',
          whatsappGroupUrl: 'https://chat.whatsapp.com/sample-art-webinar-vip',
          totalSeats: 500,
          registeredCount: 0,
          isDefault: true,
        },
      });
      return;
    }

    const regCount = await WebinarRegistration.count({
      where: { webinarEventId: event.id },
    });

    res.status(200).json({
      success: true,
      data: {
        id: event.id,
        title: event.title,
        description: event.description,
        scheduledAt: event.scheduledAt,
        durationMinutes: event.durationMinutes,
        zoomJoinUrl: event.zoomJoinUrl || 'Emailed directly upon registration',
        whatsappGroupUrl: event.whatsappGroupUrl || 'https://chat.whatsapp.com/sample-art-webinar-vip',
        prepVideoUrl: event.prepVideoUrl,
        totalSeats: event.totalSeats,
        registeredCount: regCount,
        isDefault: false,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Public: Get Dynamic Recent Registrations for Social Proof Notification Pill (100% Real from DB)
export const getRecentRegistrations = async (_req: Request, res: Response): Promise<void> => {
  try {
    const recentRows = await WebinarRegistration.findAll({
      order: [['createdAt', 'DESC']],
      limit: 20,
      attributes: ['name', 'city', 'createdAt'],
    });

    const items = recentRows.map((r) => {
      const parts = (r.name || 'Student').trim().split(' ');
      const formattedName = parts.length > 1 ? `${parts[0]} ${parts[1][0]}.` : parts[0];
      const city = r.city || 'India';
      const time = formatRelativeTime(r.createdAt || new Date());

      return {
        name: formattedName,
        city,
        time,
      };
    });

    res.status(200).json({ success: true, data: items });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Public: Register Lead
export const registerLead = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, phone, city, challenge, source, webinarEventId } = req.body;

    if (!name || !email || !phone) {
      res.status(400).json({
        success: false,
        message: 'Full Name, Email address, and WhatsApp Phone number are required.',
      });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim();

    let targetEventId = webinarEventId;
    let activeEvent: any = null;

    if (targetEventId) {
      activeEvent = await WebinarEvent.findByPk(targetEventId as string);
      // If event is expired in the past or inactive, discard and auto-find next upcoming future event
      if (!activeEvent || !activeEvent.isActive || new Date(activeEvent.scheduledAt).getTime() <= Date.now()) {
        activeEvent = null;
        targetEventId = null;
      }
    }

    if (!activeEvent) {
      activeEvent = await WebinarEvent.findOne({
        where: {
          isActive: true,
          scheduledAt: { [Op.gt]: new Date() },
          status: { [Op.ne]: 'completed' },
        },
        order: [['scheduledAt', 'ASC']],
      });
      if (activeEvent) targetEventId = activeEvent.id;
    }

    let registration = await WebinarRegistration.findOne({
      where: {
        [Op.or]: [{ email: cleanEmail }, { phone: cleanPhone }],
      },
    });

    if (registration) {
      await registration.update({
        name: name.trim(),
        city: city || registration.city,
        challenge: challenge || registration.challenge,
        source: source || registration.source,
        webinarEventId: targetEventId || registration.webinarEventId,
      });
    } else {
      registration = await WebinarRegistration.create({
        name: name.trim(),
        email: cleanEmail,
        phone: cleanPhone,
        city: city || null,
        challenge: challenge || null,
        source: source || 'webinar-landing-page',
        webinarEventId: targetEventId || null,
      });
    }

    const whatsappUrl = activeEvent?.whatsappGroupUrl || 'https://chat.whatsapp.com/sample-art-webinar-vip';
    const zoomUrl = activeEvent?.zoomJoinUrl || 'Emailed directly to your registered address';

    res.status(200).json({
      success: true,
      message: 'Your seat has been successfully reserved!',
      data: {
        id: registration.id,
        name: registration.name,
        email: registration.email,
        phone: registration.phone,
        city: registration.city,
        whatsappGroupUrl: whatsappUrl,
        zoomLink: zoomUrl,
        webinarTitle: activeEvent?.title || 'Resin Mastery Masterclass — Live with Vrajangna Patel',
        scheduledAt: activeEvent?.scheduledAt || null,
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

// Admin: Get All Webinar Events
export const getAllWebinarEvents = async (_req: Request, res: Response): Promise<void> => {
  try {
    const events = await WebinarEvent.findAll({
      order: [['scheduledAt', 'DESC']],
      include: [
        {
          model: WebinarRegistration,
          as: 'registrations',
          attributes: ['id'],
        },
      ],
    });

    const data = events.map((e: any) => ({
      ...e.toJSON(),
      attendeesCount: e.registrations ? e.registrations.length : 0,
    }));

    res.status(200).json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Admin: Create New Webinar Event
export const createWebinarEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      title,
      description,
      scheduledAt,
      durationMinutes,
      zoomJoinUrl,
      whatsappGroupUrl,
      prepVideoUrl,
      totalSeats,
      status,
      isActive,
    } = req.body;

    if (!scheduledAt) {
      res.status(400).json({ success: false, message: 'Webinar scheduled date/time is required.' });
      return;
    }

    const event = await WebinarEvent.create({
      title: title || 'Resin Mastery Masterclass — Live with Vrajangna Patel',
      description,
      scheduledAt: new Date(scheduledAt),
      durationMinutes: durationMinutes ? parseInt(durationMinutes, 10) : 90,
      zoomJoinUrl,
      whatsappGroupUrl,
      prepVideoUrl,
      totalSeats: totalSeats ? parseInt(totalSeats, 10) : 500,
      status: status || 'upcoming',
      isActive: isActive !== undefined ? isActive : true,
    });

    res.status(201).json({ success: true, message: 'Webinar event created successfully', data: event });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Admin: Update Webinar Event
export const updateWebinarEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const event = await WebinarEvent.findByPk(id);

    if (!event) {
      res.status(404).json({ success: false, message: 'Webinar event not found' });
      return;
    }

    await event.update(req.body);
    res.status(200).json({ success: true, message: 'Webinar event updated successfully', data: event });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Admin: Delete Webinar Event
export const deleteWebinarEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    await WebinarEvent.destroy({ where: { id } });
    res.status(200).json({ success: true, message: 'Webinar event removed successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Admin: Get All Registrations
export const getAllRegistrations = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, webinarEventId, page = '1', limit = '100' } = req.query;
    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 100;
    const offset = (pageNum - 1) * limitNum;

    const whereClause: any = {};
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { phone: { [Op.iLike]: `%${search}%` } },
        { city: { [Op.iLike]: `%${search}%` } },
      ];
    }

    if (webinarEventId) {
      whereClause.webinarEventId = webinarEventId;
    }

    const { count, rows } = await WebinarRegistration.findAndCountAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: WebinarEvent,
          as: 'webinarEvent',
          attributes: ['id', 'title', 'scheduledAt'],
        },
      ],
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
    res.status(500).json({ success: false, message: error.message });
  }
};

// Public: Get 100% Real Scarcity & Registrations Stats from Database
export const getWebinarStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    const totalCount = await WebinarRegistration.count();

    const activeEvent = await WebinarEvent.findOne({
      where: {
        isActive: true,
        scheduledAt: { [Op.gte]: new Date(Date.now() - 90 * 60 * 1000) },
        status: { [Op.ne]: 'completed' },
      },
      order: [['scheduledAt', 'ASC']],
    });

    const totalSeats = activeEvent?.totalSeats || 500;
    let claimedSeats = 0;

    if (activeEvent) {
      claimedSeats = await WebinarRegistration.count({ where: { webinarEventId: activeEvent.id } });
    } else {
      claimedSeats = totalCount;
    }

    // Exact database numbers
    const seatsRemaining = Math.max(0, totalSeats - claimedSeats);
    const percentFull = totalSeats > 0 ? Math.min(100, Math.round((claimedSeats / totalSeats) * 100)) : 0;

    res.status(200).json({
      success: true,
      data: {
        totalRegistrations: totalCount,
        claimedSeats,
        totalSeats,
        seatsRemaining,
        percentFull,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Admin: Delete Registration Lead
export const deleteRegistration = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    await WebinarRegistration.destroy({ where: { id } });
    res.status(200).json({ success: true, message: 'Registration removed successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

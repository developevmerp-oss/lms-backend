import { Request, Response } from 'express';
import { MarketingTrackingSetting } from '../models/marketingTrackingSetting';

// Validate Pixel ID format (standard Meta Pixel IDs are 15-16 digit numbers, but allow flexible numeric strings)
const isValidPixelId = (pixelId: string): boolean => {
  if (!pixelId) return false;
  const trimmed = pixelId.trim();
  return /^[0-9]{6,25}$/.test(trimmed);
};

// ── GET /api/marketing-tracking/config (PUBLIC) ──
// Safe, sanitized endpoint consumed by the frontend SPA
export const getPublicTrackingConfig = async (_req: Request, res: Response): Promise<any> => {
  try {
    const metaSetting = await MarketingTrackingSetting.findOne({
      where: { platform: 'META' },
    });

    const isMetaActive = Boolean(metaSetting?.enabled && metaSetting?.pixelId && metaSetting.pixelId.trim().length > 0);

    return res.status(200).json({
      meta: {
        enabled: isMetaActive,
        pixelId: isMetaActive ? metaSetting!.pixelId!.trim() : '',
        events: {
          pageView: metaSetting ? Boolean(metaSetting.trackPageView) : true,
          viewContent: metaSetting ? Boolean(metaSetting.trackViewContent) : true,
          lead: metaSetting ? Boolean(metaSetting.trackLead) : true,
          registration: metaSetting ? Boolean(metaSetting.trackRegistration) : true,
          contact: metaSetting ? Boolean(metaSetting.trackContact) : true,
          booking: metaSetting ? Boolean(metaSetting.trackBooking) : true,
          checkout: metaSetting ? Boolean(metaSetting.trackCheckout) : true,
          purchase: metaSetting ? Boolean(metaSetting.trackPurchase) : true,
        },
      },
    });
  } catch (error: any) {
    console.error('Error fetching public tracking config:', error?.message);
    // Return safe fallback so the frontend never crashes
    return res.status(200).json({
      meta: {
        enabled: false,
        pixelId: '',
        events: {
          pageView: false,
          viewContent: false,
          lead: false,
          registration: false,
          contact: false,
          booking: false,
          checkout: false,
          purchase: false,
        },
      },
    });
  }
};

// ── GET /api/admin/marketing-tracking (ADMIN ONLY) ──
export const getAdminTrackingSettings = async (_req: Request, res: Response): Promise<any> => {
  try {
    let settings = await MarketingTrackingSetting.findAll({
      order: [['createdAt', 'ASC']],
    });

    // If no settings exist yet, ensure default META setting is returned
    let metaSetting = settings.find((s) => s.platform === 'META');
    if (!metaSetting) {
      metaSetting = await MarketingTrackingSetting.create({
        platform: 'META',
        pixelId: '',
        enabled: false,
        trackPageView: true,
        trackViewContent: true,
        trackLead: true,
        trackRegistration: true,
        trackContact: true,
        trackBooking: true,
        trackCheckout: true,
        trackPurchase: true,
      });
      settings = [metaSetting, ...settings];
    }

    return res.status(200).json({
      success: true,
      settings,
      meta: metaSetting,
    });
  } catch (error: any) {
    console.error('Error in getAdminTrackingSettings:', error);
    return res.status(500).json({ message: 'Failed to retrieve tracking settings', error: error?.message });
  }
};

// ── POST /api/admin/marketing-tracking (ADMIN ONLY) ──
// Upsert tracking configuration (e.g. META)
export const saveAdminTrackingSettings = async (req: Request, res: Response): Promise<any> => {
  try {
    const {
      platform = 'META',
      pixelId,
      enabled = false,
      trackPageView = true,
      trackViewContent = true,
      trackLead = true,
      trackRegistration = true,
      trackContact = true,
      trackBooking = true,
      trackCheckout = true,
      trackPurchase = true,
      customData = {},
    } = req.body;

    const trimmedPixelId = typeof pixelId === 'string' ? pixelId.trim() : '';

    // If admin is attempting to enable tracking, validate the Pixel ID
    if (enabled && platform === 'META') {
      if (!trimmedPixelId) {
        return res.status(400).json({
          message: 'Pixel ID is required when Meta Pixel is enabled.',
        });
      }
      if (!isValidPixelId(trimmedPixelId)) {
        return res.status(400).json({
          message: 'Invalid Meta Pixel ID. Meta Pixel IDs are typically 15-16 digit numbers.',
        });
      }
    }

    // Find existing or create
    let setting = await MarketingTrackingSetting.findOne({
      where: { platform },
    });

    if (setting) {
      await setting.update({
        pixelId: trimmedPixelId,
        enabled: Boolean(enabled),
        trackPageView: Boolean(trackPageView),
        trackViewContent: Boolean(trackViewContent),
        trackLead: Boolean(trackLead),
        trackRegistration: Boolean(trackRegistration),
        trackContact: Boolean(trackContact),
        trackBooking: Boolean(trackBooking),
        trackCheckout: Boolean(trackCheckout),
        trackPurchase: Boolean(trackPurchase),
        customData: customData || setting.customData,
      });
    } else {
      setting = await MarketingTrackingSetting.create({
        platform,
        pixelId: trimmedPixelId,
        enabled: Boolean(enabled),
        trackPageView: Boolean(trackPageView),
        trackViewContent: Boolean(trackViewContent),
        trackLead: Boolean(trackLead),
        trackRegistration: Boolean(trackRegistration),
        trackContact: Boolean(trackContact),
        trackBooking: Boolean(trackBooking),
        trackCheckout: Boolean(trackCheckout),
        trackPurchase: Boolean(trackPurchase),
        customData: customData || {},
      });
    }

    return res.status(200).json({
      success: true,
      message: `${platform} tracking configuration saved successfully.`,
      setting,
    });
  } catch (error: any) {
    console.error('Error saving marketing tracking configuration:', error);
    return res.status(500).json({ message: 'Failed to save tracking configuration', error: error?.message });
  }
};

// ── PUT /api/admin/marketing-tracking/:id (ADMIN ONLY) ──
export const updateAdminTrackingSettings = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const setting = await MarketingTrackingSetting.findByPk(String(id));

    if (!setting) {
      return res.status(404).json({ message: 'Tracking setting not found' });
    }

    const {
      pixelId,
      enabled,
      trackPageView,
      trackViewContent,
      trackLead,
      trackRegistration,
      trackContact,
      trackBooking,
      trackCheckout,
      trackPurchase,
      customData,
    } = req.body;

    const trimmedPixelId = pixelId !== undefined ? (typeof pixelId === 'string' ? pixelId.trim() : '') : setting.pixelId;
    const nextEnabled = enabled !== undefined ? Boolean(enabled) : setting.enabled;

    if (nextEnabled && setting.platform === 'META') {
      if (!trimmedPixelId) {
        return res.status(400).json({ message: 'Pixel ID cannot be empty when Meta Pixel is enabled.' });
      }
      if (!isValidPixelId(trimmedPixelId)) {
        return res.status(400).json({ message: 'Invalid Meta Pixel ID format.' });
      }
    }

    await setting.update({
      pixelId: trimmedPixelId,
      enabled: nextEnabled,
      trackPageView: trackPageView !== undefined ? Boolean(trackPageView) : setting.trackPageView,
      trackViewContent: trackViewContent !== undefined ? Boolean(trackViewContent) : setting.trackViewContent,
      trackLead: trackLead !== undefined ? Boolean(trackLead) : setting.trackLead,
      trackRegistration: trackRegistration !== undefined ? Boolean(trackRegistration) : setting.trackRegistration,
      trackContact: trackContact !== undefined ? Boolean(trackContact) : setting.trackContact,
      trackBooking: trackBooking !== undefined ? Boolean(trackBooking) : setting.trackBooking,
      trackCheckout: trackCheckout !== undefined ? Boolean(trackCheckout) : setting.trackCheckout,
      trackPurchase: trackPurchase !== undefined ? Boolean(trackPurchase) : setting.trackPurchase,
      customData: customData !== undefined ? customData : setting.customData,
    });

    return res.status(200).json({
      success: true,
      message: 'Tracking setting updated successfully.',
      setting,
    });
  } catch (error: any) {
    console.error('Error updating marketing tracking configuration:', error);
    return res.status(500).json({ message: 'Failed to update tracking configuration', error: error?.message });
  }
};

// ── PATCH /api/admin/marketing-tracking/:id/status (ADMIN ONLY) ──
export const toggleTrackingStatus = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const { enabled } = req.body;

    const setting = await MarketingTrackingSetting.findByPk(String(id));
    if (!setting) {
      return res.status(404).json({ message: 'Tracking setting not found' });
    }

    const nextEnabled = enabled !== undefined ? Boolean(enabled) : !setting.enabled;

    if (nextEnabled && (!setting.pixelId || !setting.pixelId.trim())) {
      return res.status(400).json({
        message: 'Cannot enable tracking without a configured Pixel ID. Please enter a valid Pixel ID first.',
      });
    }

    await setting.update({ enabled: nextEnabled });

    return res.status(200).json({
      success: true,
      message: `${setting.platform} tracking has been ${nextEnabled ? 'enabled' : 'disabled'}.`,
      setting,
    });
  } catch (error: any) {
    console.error('Error toggling tracking status:', error);
    return res.status(500).json({ message: 'Failed to toggle tracking status', error: error?.message });
  }
};

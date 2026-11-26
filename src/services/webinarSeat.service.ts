import { Op } from 'sequelize';
import WebinarRegistration from '../models/webinarRegistration';
import WebinarEvent from '../models/webinarEvent';
import { sendWebinarRegistrationEmails } from './webinarEmail';

export const DEFAULT_WEBINAR_TITLE = 'Resin Mastery Masterclass — Live with Vrajangna Patel';
export const DEFAULT_WHATSAPP_URL = 'https://chat.whatsapp.com/sample-art-webinar-vip';

export type SeatInput = {
  name: string;
  email: string;
  phone?: string | null;
  city?: string | null;
  challenge?: string | null;
  source?: string | null;
  webinarEventId?: string | null;
};

/**
 * Reserves a webinar seat for a person (creating or updating their WebinarRegistration) and returns the
 * webinar they were booked on. Shared by the public webinar form and the student sign-up flow.
 * `alreadyRegistered` is true when this person already held a seat for that same webinar before this call.
 */
export async function reserveWebinarSeat(input: SeatInput) {
  const cleanEmail = input.email.trim().toLowerCase();
  const cleanPhone = (input.phone || '').trim();

  let targetEventId: string | null = input.webinarEventId || null;
  let activeEvent: any = null;

  if (targetEventId) {
    activeEvent = await WebinarEvent.findByPk(targetEventId);
    // If the event is in the past or inactive, discard it and fall back to the next upcoming one
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

  const matchers: any[] = [{ email: cleanEmail }];
  if (cleanPhone) matchers.push({ phone: cleanPhone });

  let registration = await WebinarRegistration.findOne({ where: { [Op.or]: matchers } });
  const alreadyRegistered = Boolean(registration && targetEventId && registration.webinarEventId === targetEventId);

  if (registration) {
    await registration.update({
      name: input.name.trim(),
      city: input.city || registration.city,
      challenge: input.challenge || registration.challenge,
      source: input.source || registration.source,
      webinarEventId: targetEventId || registration.webinarEventId,
    });
  } else {
    registration = await WebinarRegistration.create({
      name: input.name.trim(),
      email: cleanEmail,
      phone: cleanPhone,
      city: input.city || null,
      challenge: input.challenge || null,
      source: input.source || 'webinar-landing-page',
      webinarEventId: targetEventId || null,
    } as any);
  }

  return { registration, activeEvent, alreadyRegistered };
}

/** Sends the webinar emails (registration confirmation, then join link) for a reserved seat. Never throws. */
export function sendSeatEmails(
  seat: { registration: WebinarRegistration; activeEvent: any; alreadyRegistered: boolean },
  opts: { skipRegistrationEmailIfAlreadyRegistered?: boolean } = {}
): Promise<{ registration: boolean; join: boolean }> {
  const { registration, activeEvent, alreadyRegistered } = seat;
  return sendWebinarRegistrationEmails({
    name: registration.name,
    email: registration.email,
    webinarTitle: activeEvent?.title || DEFAULT_WEBINAR_TITLE,
    scheduledAt: activeEvent?.scheduledAt || null,
    durationMinutes: activeEvent?.durationMinutes || 90,
    zoomJoinUrl: activeEvent?.zoomJoinUrl || null,
    whatsappGroupUrl: activeEvent?.whatsappGroupUrl || DEFAULT_WHATSAPP_URL,
    prepVideoUrl: activeEvent?.prepVideoUrl || null,
    skipRegistrationEmail: Boolean(opts.skipRegistrationEmailIfAlreadyRegistered && alreadyRegistered),
  });
}

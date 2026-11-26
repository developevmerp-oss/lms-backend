import { sendMail } from './email.service';
import { esc, siteUrl, emailLogoUrl } from './welcomeEmail';

/**
 * Webinar emails. When someone reserves a seat they get TWO emails, in this order:
 *   1. "You're registered"  – confirms the registration (seat reserved, date/time, what happens next).
 *   2. "Your join link"     – the Zoom link + WhatsApp VIP group + add-to-calendar button.
 * Colours match the Ravishing Art Hub app: rust #c4431d, deep #942008, cream #faf8f5.
 */

export type WebinarEmailInput = {
  name: string;
  email: string;
  webinarTitle: string;
  scheduledAt?: Date | string | null;
  durationMinutes?: number | null;
  zoomJoinUrl?: string | null;
  whatsappGroupUrl?: string | null;
  prepVideoUrl?: string | null;
  logoUrl?: string;
  /** Skip the "You're registered" email (e.g. the person was already registered) and send only the join link. */
  skipRegistrationEmail?: boolean;
};

type Built = { subject: string; html: string; text: string };

const IST = 'Asia/Kolkata';

function parseDate(value?: Date | string | null): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatWhen(d: Date | null): { date: string; time: string } {
  if (!d) return { date: 'To be announced', time: 'We will email you the exact time' };
  const date = new Intl.DateTimeFormat('en-IN', {
    timeZone: IST,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
  const time = new Intl.DateTimeFormat('en-IN', {
    timeZone: IST,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
    .format(d)
    .toUpperCase();
  return { date, time: `${time} IST` };
}

function googleCalendarUrl(title: string, start: Date | null, minutes: number, joinUrl: string): string | null {
  if (!start) return null;
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const end = new Date(start.getTime() + minutes * 60 * 1000);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${fmt(start)}/${fmt(end)}`,
    details: `Live webinar by Ravishing Art Hub.${joinUrl ? ` Join link: ${joinUrl}` : ''}`,
    location: joinUrl || 'Zoom (live)',
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function isUrl(v?: string | null): v is string {
  return Boolean(v && /^https?:\/\//i.test(v.trim()));
}

/* ------------------------------------------------------------------ shared layout pieces */

function shell(opts: { title: string; preheader: string; logoUrl: string; footerNote: string; body: string }): string {
  const site = siteUrl();
  const year = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<title>${esc(opts.title)}</title>
</head>
<body style="margin:0;padding:0;background-color:#faf8f5;-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#faf8f5;font-size:1px;line-height:1px;">${esc(opts.preheader)}</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#faf8f5;">
  <tr>
    <td align="center" style="padding:32px 14px;">

      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background-color:#ffffff;border:1px solid #ecdccb;border-radius:22px;overflow:hidden;">

        <!-- Brand header -->
        <tr>
          <td align="center" style="background-color:#fff2ea;padding:30px 24px 22px;border-bottom:1px solid #fbdcd0;">
            <img src="${esc(opts.logoUrl)}" width="64" height="64" alt="Ravishing Art" style="display:block;margin:0 auto 10px;border:0;outline:none;width:64px;height:64px;object-fit:contain;">
            <div style="font-family:Arial,Helvetica,sans-serif;font-size:22px;line-height:26px;font-weight:700;letter-spacing:3px;color:#942008;text-transform:uppercase;">Ravishing Art</div>
            <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:16px;letter-spacing:2.4px;color:#c4431d;text-transform:uppercase;margin-top:4px;">Live Masterclass &middot; Resin Art Hub</div>
          </td>
        </tr>
        <tr><td style="height:4px;line-height:4px;font-size:0;background-color:#c4431d;background-image:linear-gradient(90deg,#942008,#c4431d,#ea580c);">&nbsp;</td></tr>

${opts.body}

        <!-- Footer -->
        <tr>
          <td align="center" style="background-color:#fff2ea;border-top:1px solid #fbdcd0;padding:22px 28px;font-family:Arial,Helvetica,sans-serif;">
            <div style="font-size:12.5px;line-height:19px;color:#78716c;">Questions? Just reply to this email and our team will help you.</div>
            <div style="margin-top:10px;font-size:11.5px;line-height:18px;color:#a8a29e;">
              &copy; ${year} Ravishing Art Hub. All rights reserved.<br>
              <a href="${esc(site)}" target="_blank" style="color:#942008;text-decoration:none;">${esc(site.replace(/^https?:\/\//, ''))}</a>
            </div>
          </td>
        </tr>
      </table>

      <div style="max-width:600px;margin:14px auto 0;font-family:Arial,Helvetica,sans-serif;font-size:11.5px;line-height:17px;color:#a8a29e;text-align:center;">
        ${opts.footerNote}
      </div>
    </td>
  </tr>
</table>
</body>
</html>`;
}

function detailsCard(title: string, when: { date: string; time: string }, minutes: number): string {
  const row = (icon: string, label: string, value: string, last = false) => `
              <tr>
                <td style="padding:${last ? '12px 24px 22px' : '12px 24px 0'};font-family:Arial,Helvetica,sans-serif;">
                  <div style="font-size:12px;line-height:18px;color:#78716c;margin-bottom:4px;">${icon} ${label}</div>
                  <div style="font-size:16px;line-height:23px;font-weight:700;color:#1c1917;">${value}</div>
                </td>
              </tr>`;
  return `
        <tr>
          <td style="padding:22px 36px 6px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#fff2ea;border:1px solid #fbdcd0;border-radius:16px;">
              <tr>
                <td style="padding:20px 24px 0;font-family:Arial,Helvetica,sans-serif;">
                  <div style="font-size:11.5px;line-height:16px;letter-spacing:2px;font-weight:700;color:#942008;text-transform:uppercase;">Your webinar</div>
                  <div style="font-size:18px;line-height:26px;font-weight:700;color:#1c1917;margin-top:6px;">${esc(title)}</div>
                </td>
              </tr>
${row('📅', 'Date', esc(when.date))}
${row('⏰', 'Time', esc(when.time))}
${row('⏳', 'Duration', `About ${minutes} minutes &middot; Live on Zoom`, true)}
            </table>
          </td>
        </tr>`;
}

function button(href: string, label: string): string {
  return `
        <tr>
          <td align="center" style="padding:26px 36px 6px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="center" bgcolor="#c4431d" style="border-radius:12px;background-color:#c4431d;background-image:linear-gradient(135deg,#c4431d,#ea580c);">
                  <a href="${esc(href)}" target="_blank" style="display:inline-block;padding:16px 38px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:20px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:12px;">${label}</a>
                </td>
              </tr>
            </table>
            <p style="margin:14px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12.5px;line-height:19px;color:#78716c;">
              Button not working? Copy this link into your browser:<br>
              <a href="${esc(href)}" target="_blank" style="color:#c4431d;text-decoration:underline;word-break:break-all;">${esc(href)}</a>
            </p>
          </td>
        </tr>`;
}

function steps(items: Array<[string, string]>): string {
  const rows = items
    .map(
      ([head, desc], i) => `
              <tr>
                <td width="38" valign="top" style="padding:0 0 ${i === items.length - 1 ? 0 : 12}px;"><div style="width:28px;height:28px;border-radius:14px;background-color:#fde5d6;color:#942008;font-size:13px;line-height:28px;font-weight:700;text-align:center;">${i + 1}</div></td>
                <td valign="top" style="padding:3px 0 ${i === items.length - 1 ? 0 : 12}px;font-family:Arial,Helvetica,sans-serif;font-size:14.5px;line-height:22px;color:#44403c;"><strong style="color:#1c1917;">${head}</strong> ${desc}</td>
              </tr>`
    )
    .join('');
  return rows;
}

/* ------------------------------------------------------------------ EMAIL 1: registration confirmed */

export function buildWebinarRegistrationEmail(input: WebinarEmailInput): Built {
  const logoUrl = input.logoUrl || emailLogoUrl();
  const firstName = (input.name || 'Artist').trim().split(/\s+/)[0];
  const minutes = input.durationMinutes || 90;
  const start = parseDate(input.scheduledAt);
  const when = formatWhen(start);
  const name = esc(firstName);

  const subject = `You're registered, ${firstName}! Your seat is reserved 🎨`;

  const body = `
        <tr>
          <td style="padding:36px 36px 4px;font-family:Arial,Helvetica,sans-serif;">
            <div style="font-size:30px;line-height:38px;font-weight:700;color:#1c1917;">You're in, ${name}! 🎉</div>
            <p style="margin:14px 0 0;font-size:15.5px;line-height:25px;color:#57534e;">
              Thank you for registering. Your seat for our live resin art masterclass is <strong style="color:#942008;">confirmed</strong>. We have saved your details with this email address: <strong style="color:#1c1917;">${esc(input.email)}</strong>.
            </p>
          </td>
        </tr>
${detailsCard(input.webinarTitle, when, minutes)}
        <tr>
          <td style="padding:24px 36px 6px;font-family:Arial,Helvetica,sans-serif;">
            <div style="font-size:19px;line-height:26px;font-weight:700;color:#1c1917;margin-bottom:12px;">What happens next</div>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
${steps([
  ['Check your inbox in a minute.', 'We are sending your <strong>webinar join link</strong> in a separate email right after this one.'],
  ['Save the date.', 'Add the webinar to your calendar so you do not miss the live session.'],
  ['Join live.', 'Be on Zoom 5 minutes early &mdash; live Q&amp;A is only for people who attend live.'],
])}
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 36px 34px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#faf8f5;border:1px solid #ecdccb;border-radius:12px;">
              <tr>
                <td style="padding:15px 18px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;color:#57534e;">
                  📩 <strong style="color:#1c1917;">Can't find the next email?</strong> Look in your Promotions or Spam folder and mark Ravishing Art as &ldquo;not spam&rdquo; so you never miss a reminder.
                </td>
              </tr>
            </table>
          </td>
        </tr>`;

  const html = shell({
    title: "You're registered — Ravishing Art Hub",
    preheader: `Your seat is reserved for ${input.webinarTitle}. Your join link is in the next email.`,
    logoUrl,
    footerNote: `You received this email because ${esc(input.email)} was used to register for a Ravishing Art Hub webinar.`,
    body,
  });

  const text = [
    `You're registered, ${firstName}!`,
    '',
    `Your seat is confirmed for: ${input.webinarTitle}`,
    `Date: ${when.date}`,
    `Time: ${when.time}`,
    `Duration: about ${minutes} minutes (live on Zoom)`,
    '',
    'What happens next:',
    '1. Your webinar join link arrives in a separate email right after this one.',
    '2. Save the date in your calendar.',
    '3. Join live 5 minutes early.',
    '',
    `© ${new Date().getFullYear()} Ravishing Art Hub`,
  ].join('\n');

  return { subject, html, text };
}

/* ------------------------------------------------------------------ EMAIL 2: webinar join link */

export function buildWebinarJoinEmail(input: WebinarEmailInput): Built {
  const logoUrl = input.logoUrl || emailLogoUrl();
  const firstName = (input.name || 'Artist').trim().split(/\s+/)[0];
  const minutes = input.durationMinutes || 90;
  const start = parseDate(input.scheduledAt);
  const when = formatWhen(start);
  const name = esc(firstName);
  const zoom = isUrl(input.zoomJoinUrl) ? input.zoomJoinUrl!.trim() : '';
  const whatsapp = isUrl(input.whatsappGroupUrl) ? input.whatsappGroupUrl!.trim() : '';
  const prep = isUrl(input.prepVideoUrl) ? input.prepVideoUrl!.trim() : '';
  const calendar = googleCalendarUrl(input.webinarTitle, start, minutes, zoom);

  const subject = start
    ? `Your webinar join link — ${when.date}, ${when.time}`
    : 'Your webinar join details — Ravishing Art Hub';

  const joinBlock = zoom
    ? button(zoom, 'Join the live webinar &rarr;')
    : `
        <tr>
          <td style="padding:26px 36px 6px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#fff8e1;border:1px solid #f3dd9b;border-radius:12px;">
              <tr>
                <td style="padding:16px 18px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:22px;color:#57534e;">
                  🔗 <strong style="color:#1c1917;">Your Zoom link is being finalised.</strong> We will email it to you before the session starts &mdash; keep an eye on this inbox.
                </td>
              </tr>
            </table>
          </td>
        </tr>`;

  const calendarBlock = calendar
    ? `
        <tr>
          <td align="center" style="padding:14px 36px 0;font-family:Arial,Helvetica,sans-serif;">
            <a href="${esc(calendar)}" target="_blank" style="display:inline-block;padding:11px 22px;font-size:14px;line-height:18px;font-weight:700;color:#942008;text-decoration:none;border:2px solid #f0c9b4;border-radius:10px;background-color:#ffffff;">📅 Add to Google Calendar</a>
          </td>
        </tr>`
    : '';

  const whatsappBlock = whatsapp
    ? `
        <tr>
          <td style="padding:26px 36px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#ecfdf3;border:1px solid #b7ebcb;border-radius:14px;">
              <tr>
                <td style="padding:18px 20px;font-family:Arial,Helvetica,sans-serif;">
                  <div style="font-size:15px;line-height:22px;font-weight:700;color:#166534;">💬 Join the VIP WhatsApp group</div>
                  <div style="font-size:13.5px;line-height:21px;color:#3f6212;margin-top:4px;">Get reminders, prep worksheets and pre-webinar support from the team.</div>
                  <a href="${esc(whatsapp)}" target="_blank" style="display:inline-block;margin-top:12px;padding:10px 20px;font-size:14px;line-height:18px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:9px;background-color:#16a34a;">Join WhatsApp group</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>`
    : '';

  const prepBlock = prep
    ? `
        <tr>
          <td style="padding:14px 36px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:22px;color:#57534e;">
            🎬 <strong style="color:#1c1917;">Watch before you join:</strong>
            <a href="${esc(prep)}" target="_blank" style="color:#c4431d;text-decoration:underline;">webinar preparation video</a>
          </td>
        </tr>`
    : '';

  const body = `
        <tr>
          <td style="padding:36px 36px 4px;font-family:Arial,Helvetica,sans-serif;">
            <div style="font-size:30px;line-height:38px;font-weight:700;color:#1c1917;">Here's your join link, ${name}! 🎥</div>
            <p style="margin:14px 0 0;font-size:15.5px;line-height:25px;color:#57534e;">
              ${
                zoom
                  ? 'You are registered, so everything you need to attend is below. Click the button at the time of the webinar &mdash; no password or sign-up needed.'
                  : 'You are registered, so you are on our list. We will email you the date, time and Zoom link as soon as the next live webinar is scheduled &mdash; no password or sign-up needed to join.'
              }
            </p>
          </td>
        </tr>
${detailsCard(input.webinarTitle, when, minutes)}
${joinBlock}
${calendarBlock}
${whatsappBlock}
${prepBlock}
        <tr>
          <td style="padding:28px 36px 34px;font-family:Arial,Helvetica,sans-serif;">
            <div style="font-size:19px;line-height:26px;font-weight:700;color:#1c1917;margin-bottom:12px;">Before you join</div>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
${steps([
  ['Join 5 minutes early', 'so you can test your audio and settle in.'],
  ['Keep a notebook handy', 'and questions ready for the live Q&amp;A.'],
  ['Use a stable connection.', 'Zoom works on mobile, tablet and laptop.'],
])}
            </table>
          </td>
        </tr>`;

  const html = shell({
    title: 'Your webinar join link — Ravishing Art Hub',
    preheader: `${input.webinarTitle} — ${when.date}, ${when.time}. Tap to join on Zoom.`,
    logoUrl,
    footerNote: `This join link is personal to ${esc(input.email)}. Please do not forward it.`,
    body,
  });

  const text = [
    `Here's your webinar join link, ${firstName}!`,
    '',
    input.webinarTitle,
    `Date: ${when.date}`,
    `Time: ${when.time}`,
    `Duration: about ${minutes} minutes`,
    '',
    zoom ? `Join on Zoom: ${zoom}` : 'Your Zoom link is being finalised — we will email it before the session starts.',
    calendar ? `Add to calendar: ${calendar}` : '',
    whatsapp ? `VIP WhatsApp group: ${whatsapp}` : '',
    prep ? `Preparation video: ${prep}` : '',
    '',
    'Join 5 minutes early, keep a notebook handy, and use a stable connection.',
    '',
    `© ${new Date().getFullYear()} Ravishing Art Hub`,
  ]
    .filter((l, i, a) => l !== '' || a[i - 1] !== '')
    .join('\n');

  return { subject, html, text };
}

/**
 * Sends the two webinar emails in order: registration confirmation first, then the join link.
 * Never throws — a failed email must never break webinar registration.
 */
export async function sendWebinarRegistrationEmails(input: WebinarEmailInput): Promise<{ registration: boolean; join: boolean }> {
  const result = { registration: false, join: false };
  if (!input.email) return result;

  if (!input.skipRegistrationEmail) {
    try {
      const reg = buildWebinarRegistrationEmail(input);
      result.registration = (await sendMail({ to: input.email, subject: reg.subject, html: reg.html, text: reg.text })).sent;
    } catch (err) {
      console.error('[webinar-email] registration email failed:', (err as Error).message);
    }
  }

  try {
    const join = buildWebinarJoinEmail(input);
    result.join = (await sendMail({ to: input.email, subject: join.subject, html: join.html, text: join.text })).sent;
  } catch (err) {
    console.error('[webinar-email] join email failed:', (err as Error).message);
  }

  return result;
}

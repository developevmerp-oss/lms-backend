import { sendMail } from './email.service';
import { esc, siteUrl, emailLogoUrl } from './welcomeEmail';

/**
 * Webinar registration email. Someone who reserves a seat gets ONE email that:
 *   - confirms they are successfully registered,
 *   - contains their webinar join link (Zoom) + calendar + WhatsApp group,
 *   - has a Login button for the Ravishing Art Hub dashboard.
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
};

type Built = { subject: string; html: string; text: string };

const IST = 'Asia/Kolkata';
const FONT = 'font-family:Arial,Helvetica,sans-serif;';

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

/** Solid (primary) or outlined (secondary) button, centred. */
function ctaButton(href: string, label: string, kind: 'primary' | 'outline' = 'primary'): string {
  const solid = kind === 'primary';
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
              <tr>
                <td align="center" bgcolor="${solid ? '#c4431d' : '#ffffff'}" style="border-radius:12px;${solid ? 'background-color:#c4431d;background-image:linear-gradient(135deg,#c4431d,#ea580c);' : 'background-color:#ffffff;border:2px solid #c4431d;'}">
                  <a href="${esc(href)}" target="_blank" style="display:inline-block;padding:${solid ? '16px 38px' : '13px 32px'};${FONT}font-size:${solid ? '16' : '15'}px;line-height:20px;font-weight:700;color:${solid ? '#ffffff' : '#942008'};text-decoration:none;border-radius:12px;">${label}</a>
                </td>
              </tr>
            </table>`;
}

function steps(items: Array<[string, string]>): string {
  return items
    .map(
      ([head, desc], i) => `
              <tr>
                <td width="38" valign="top" style="padding:0 0 ${i === items.length - 1 ? 0 : 12}px;"><div style="width:28px;height:28px;border-radius:14px;background-color:#fde5d6;color:#942008;font-size:13px;line-height:28px;font-weight:700;text-align:center;">${i + 1}</div></td>
                <td valign="top" style="padding:3px 0 ${i === items.length - 1 ? 0 : 12}px;${FONT}font-size:14.5px;line-height:22px;color:#44403c;"><strong style="color:#1c1917;">${head}</strong> ${desc}</td>
              </tr>`
    )
    .join('');
}

/* ------------------------------------------------------------------ the email */

export function buildWebinarRegistrationEmail(input: WebinarEmailInput): Built {
  const site = siteUrl();
  const logoUrl = input.logoUrl || emailLogoUrl();
  const loginUrl = `${site}/login`;
  const year = new Date().getFullYear();

  const firstName = (input.name || 'Artist').trim().split(/\s+/)[0];
  const name = esc(firstName);
  const minutes = input.durationMinutes || 90;
  const start = parseDate(input.scheduledAt);
  const when = formatWhen(start);

  const zoom = isUrl(input.zoomJoinUrl) ? input.zoomJoinUrl!.trim() : '';
  const whatsapp = isUrl(input.whatsappGroupUrl) ? input.whatsappGroupUrl!.trim() : '';
  const prep = isUrl(input.prepVideoUrl) ? input.prepVideoUrl!.trim() : '';
  const calendar = googleCalendarUrl(input.webinarTitle, start, minutes, zoom);

  const subject = `Successfully registered, ${firstName}! Your webinar join link is inside 🎨`;

  /* --- the "how to join" card: this is the part students must understand --- */
  const whenLine = start ? `on <strong style="color:#942008;">${esc(when.date)} at ${esc(when.time)}</strong>` : 'when the webinar starts';
  const joinCard = zoom
    ? `
        <tr>
          <td style="padding:22px 36px 4px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff;border:2px solid #c4431d;border-radius:16px;">
              <tr>
                <td align="center" style="padding:22px 22px 24px;${FONT}">
                  <div style="font-size:11.5px;line-height:16px;letter-spacing:2px;font-weight:700;color:#942008;text-transform:uppercase;">Your webinar join link</div>
                  <div style="font-size:15px;line-height:24px;color:#44403c;margin:10px 0 18px;">
                    <strong style="color:#1c1917;">Keep this email &mdash; it is your joining pass.</strong><br>
                    ${whenLine}, click the button below to join the live webinar on Zoom. No password or sign-up needed.
                  </div>
                  ${ctaButton(zoom, 'Join the live webinar &rarr;')}
                  <div style="margin-top:14px;font-size:12.5px;line-height:19px;color:#78716c;">
                    Button not working? Copy this link into your browser:<br>
                    <a href="${esc(zoom)}" target="_blank" style="color:#c4431d;text-decoration:underline;word-break:break-all;">${esc(zoom)}</a>
                  </div>
                  ${
                    calendar
                      ? `<div style="margin-top:16px;"><a href="${esc(calendar)}" target="_blank" style="display:inline-block;padding:10px 20px;font-size:13.5px;line-height:18px;font-weight:700;color:#942008;text-decoration:none;border:1px solid #f0c9b4;border-radius:10px;background-color:#fff7f2;">📅 Add to Google Calendar</a></div>`
                      : ''
                  }
                </td>
              </tr>
            </table>
          </td>
        </tr>`
    : `
        <tr>
          <td style="padding:22px 36px 4px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#fff8e1;border:1px solid #f3dd9b;border-radius:12px;">
              <tr>
                <td style="padding:16px 18px;${FONT}font-size:14px;line-height:22px;color:#57534e;">
                  🔗 <strong style="color:#1c1917;">Your Zoom join link is being finalised.</strong> We will email it to you before the session starts &mdash; keep an eye on this inbox.
                </td>
              </tr>
            </table>
          </td>
        </tr>`;

  const whatsappCard = whatsapp
    ? `
        <tr>
          <td style="padding:16px 36px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#ecfdf3;border:1px solid #b7ebcb;border-radius:14px;">
              <tr>
                <td style="padding:16px 20px;${FONT}">
                  <div style="font-size:15px;line-height:22px;font-weight:700;color:#166534;">💬 Join the VIP WhatsApp group</div>
                  <div style="font-size:13.5px;line-height:21px;color:#3f6212;margin-top:4px;">Get reminders, prep worksheets and pre-webinar support from the team.</div>
                  <a href="${esc(whatsapp)}" target="_blank" style="display:inline-block;margin-top:12px;padding:10px 20px;font-size:14px;line-height:18px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:9px;background-color:#16a34a;">Join WhatsApp group</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>`
    : '';

  const prepLine = prep
    ? `
        <tr>
          <td style="padding:14px 36px 0;${FONT}font-size:14px;line-height:22px;color:#57534e;">
            🎬 <strong style="color:#1c1917;">Watch before you join:</strong>
            <a href="${esc(prep)}" target="_blank" style="color:#c4431d;text-decoration:underline;">webinar preparation video</a>
          </td>
        </tr>`
    : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<title>Successfully registered — Ravishing Art Hub</title>
</head>
<body style="margin:0;padding:0;background-color:#faf8f5;-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#faf8f5;font-size:1px;line-height:1px;">${esc(
    `You are registered, ${firstName}. Your webinar join link is inside this email — keep it to join the live session.`
  )}</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#faf8f5;">
  <tr>
    <td align="center" style="padding:32px 14px;">

      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background-color:#ffffff;border:1px solid #ecdccb;border-radius:22px;overflow:hidden;">

        <!-- Brand header -->
        <tr>
          <td align="center" style="background-color:#fff2ea;padding:30px 24px 22px;border-bottom:1px solid #fbdcd0;">
            <img src="${esc(logoUrl)}" width="64" height="64" alt="Ravishing Art" style="display:block;margin:0 auto 10px;border:0;outline:none;width:64px;height:64px;object-fit:contain;">
            <div style="${FONT}font-size:22px;line-height:26px;font-weight:700;letter-spacing:3px;color:#942008;text-transform:uppercase;">Ravishing Art</div>
            <div style="${FONT}font-size:11px;line-height:16px;letter-spacing:2.4px;color:#c4431d;text-transform:uppercase;margin-top:4px;">Resin Art Hub &middot; Learn &middot; Create &middot; Earn</div>
          </td>
        </tr>
        <tr><td style="height:4px;line-height:4px;font-size:0;background-color:#c4431d;background-image:linear-gradient(90deg,#942008,#c4431d,#ea580c);">&nbsp;</td></tr>

        <!-- Greeting -->
        <tr>
          <td style="padding:36px 36px 4px;${FONT}">
            <div style="font-size:30px;line-height:38px;font-weight:700;color:#1c1917;">Successfully registered, ${name}! 🎨</div>
            <p style="margin:14px 0 0;font-size:15.5px;line-height:25px;color:#57534e;">
              Thank you for registering with Ravishing Art Hub. Your seat for our live resin art masterclass is <strong style="color:#942008;">confirmed</strong>, and we have saved your details with <strong style="color:#1c1917;">${esc(input.email)}</strong>.
            </p>
          </td>
        </tr>

        <!-- Webinar details -->
        <tr>
          <td style="padding:22px 36px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#fff2ea;border:1px solid #fbdcd0;border-radius:16px;">
              <tr>
                <td style="padding:20px 24px 0;${FONT}">
                  <div style="font-size:11.5px;line-height:16px;letter-spacing:2px;font-weight:700;color:#942008;text-transform:uppercase;">Your webinar</div>
                  <div style="font-size:18px;line-height:26px;font-weight:700;color:#1c1917;margin-top:6px;">${esc(input.webinarTitle)}</div>
                </td>
              </tr>
              <tr>
                <td style="padding:12px 24px 22px;${FONT}">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td width="38%" valign="top" style="padding:4px 10px 4px 0;font-size:13px;line-height:20px;color:#78716c;">📅 Date</td>
                      <td valign="top" style="padding:4px 0;font-size:15px;line-height:20px;font-weight:700;color:#1c1917;">${esc(when.date)}</td>
                    </tr>
                    <tr>
                      <td valign="top" style="padding:4px 10px 4px 0;font-size:13px;line-height:20px;color:#78716c;">⏰ Time</td>
                      <td valign="top" style="padding:4px 0;font-size:15px;line-height:20px;font-weight:700;color:#1c1917;">${esc(when.time)}</td>
                    </tr>
                    <tr>
                      <td valign="top" style="padding:4px 10px 4px 0;font-size:13px;line-height:20px;color:#78716c;">⏳ Duration</td>
                      <td valign="top" style="padding:4px 0;font-size:15px;line-height:20px;font-weight:700;color:#1c1917;">About ${minutes} minutes &middot; Live on Zoom</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
${joinCard}
${whatsappCard}
${prepLine}

        <!-- Login -->
        <tr>
          <td align="center" style="padding:30px 36px 0;${FONT}">
            <div style="border-top:1px solid #f0e4d6;padding-top:26px;">
              <div style="font-size:17px;line-height:24px;font-weight:700;color:#1c1917;">Your student dashboard</div>
              <p style="margin:6px 0 16px;font-size:14px;line-height:22px;color:#57534e;">Log in to Ravishing Art Hub to explore courses, live classes and rewards.</p>
              ${ctaButton(loginUrl, 'Log in to your dashboard &rarr;', 'outline')}
            </div>
          </td>
        </tr>

        <!-- Before you join -->
        <tr>
          <td style="padding:28px 36px 34px;${FONT}">
            <div style="font-size:19px;line-height:26px;font-weight:700;color:#1c1917;margin-bottom:12px;">Before you join</div>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
${steps([
  ['Save this email.', 'Your join link is in it &mdash; search &ldquo;Ravishing Art&rdquo; in your inbox on webinar day.'],
  ['Join 5 minutes early', 'so you can test your audio and settle in.'],
  ['Be there live.', 'Keep a notebook handy &mdash; Q&amp;A is only for people who attend live.'],
])}
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td align="center" style="background-color:#fff2ea;border-top:1px solid #fbdcd0;padding:22px 28px;${FONT}">
            <div style="font-size:12.5px;line-height:19px;color:#78716c;">Questions? Just reply to this email and our team will help you.</div>
            <div style="margin-top:10px;font-size:11.5px;line-height:18px;color:#a8a29e;">
              &copy; ${year} Ravishing Art Hub. All rights reserved.<br>
              <a href="${esc(site)}" target="_blank" style="color:#942008;text-decoration:none;">${esc(site.replace(/^https?:\/\//, ''))}</a>
            </div>
          </td>
        </tr>
      </table>

      <div style="max-width:600px;margin:14px auto 0;${FONT}font-size:11.5px;line-height:17px;color:#a8a29e;text-align:center;">
        You received this email because ${esc(input.email)} was used to register for a Ravishing Art Hub webinar.
      </div>
    </td>
  </tr>
</table>
</body>
</html>`;

  const text = [
    `Successfully registered, ${firstName}!`,
    '',
    `Your seat is confirmed for: ${input.webinarTitle}`,
    `Date: ${when.date}`,
    `Time: ${when.time}`,
    `Duration: about ${minutes} minutes (live on Zoom)`,
    '',
    zoom
      ? `YOUR WEBINAR JOIN LINK (keep this email - use this link to join at the webinar time):\n${zoom}`
      : 'Your Zoom join link is being finalised - we will email it to you before the session starts.',
    calendar ? `Add to calendar: ${calendar}` : '',
    whatsapp ? `VIP WhatsApp group: ${whatsapp}` : '',
    prep ? `Preparation video: ${prep}` : '',
    '',
    `Log in to your student dashboard: ${loginUrl}`,
    '',
    'Join 5 minutes early, keep a notebook handy, and be there live for the Q&A.',
    '',
    `© ${year} Ravishing Art Hub`,
  ]
    .filter((line, i, all) => line !== '' || all[i - 1] !== '')
    .join('\n');

  return { subject, html, text };
}

/**
 * Sends the webinar registration email (confirmation + join link + login button).
 * Never throws — a failed email must never break webinar registration.
 */
export async function sendWebinarRegistrationEmail(input: WebinarEmailInput): Promise<boolean> {
  try {
    if (!input.email) return false;
    const mail = buildWebinarRegistrationEmail(input);
    return (await sendMail({ to: input.email, subject: mail.subject, html: mail.html, text: mail.text })).sent;
  } catch (err) {
    console.error('[webinar-email] failed:', (err as Error).message);
    return false;
  }
}

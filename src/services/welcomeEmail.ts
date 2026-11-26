import { sendMail } from './email.service';

/**
 * "Welcome" email sent when a student account is created (self sign-up, admin-created, or created
 * automatically after a purchase). It contains the student's User ID (their email), password and a link
 * to the login page. Colours match the Ravishing Art Hub app: rust #c4431d, deep #942008, cream #faf8f5.
 */

export const esc = (value: string): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export const siteUrl = (): string => (process.env.FRONTEND_URL || 'https://ravishingarthub.com').trim().replace(/\/+$/, '');

/**
 * Absolute URL of the logo shown at the top of every email. Email clients cannot load images that sit behind a
 * redirect reliably, and the apex domain (ravishingarthub.com) redirects to www, so point straight at www.
 * Set EMAIL_LOGO_URL to use any other image.
 */
export const emailLogoUrl = (): string => {
  const custom = (process.env.EMAIL_LOGO_URL || '').trim();
  if (custom) return custom;
  const site = siteUrl().replace(/^(https?:\/\/)(ravishingarthub\.com)/i, '$1www.$2');
  return `${site}/favicon.png`;
};

export type WelcomeEmailInput = {
  name: string;
  email: string;
  password: string;
  loginUrl?: string;
  logoUrl?: string;
};

export function buildWelcomeEmail(input: WelcomeEmailInput): { subject: string; html: string; text: string } {
  const site = siteUrl();
  const loginUrl = input.loginUrl || `${site}/login`;
  const logoUrl = input.logoUrl || emailLogoUrl();
  const firstName = (input.name || 'Artist').trim().split(/\s+/)[0];
  const year = new Date().getFullYear();

  const name = esc(firstName);
  const email = esc(input.email);
  const password = esc(input.password);
  const link = esc(loginUrl);

  const subject = 'Welcome to Ravishing Art Hub — your login details inside';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<title>Welcome to Ravishing Art Hub</title>
</head>
<body style="margin:0;padding:0;background-color:#faf8f5;-webkit-text-size-adjust:100%;">
<!-- preheader (hidden preview text) -->
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#faf8f5;font-size:1px;line-height:1px;">
  Your account is ready, ${name}. Here is your User ID, password and the link to log in.
</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#faf8f5;">
  <tr>
    <td align="center" style="padding:32px 14px;">

      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background-color:#ffffff;border:1px solid #ecdccb;border-radius:22px;overflow:hidden;">

        <!-- Brand header -->
        <tr>
          <td align="center" style="background-color:#fff2ea;padding:30px 24px 22px;border-bottom:1px solid #fbdcd0;">
            <img src="${esc(logoUrl)}" width="64" height="64" alt="Ravishing Art" style="display:block;margin:0 auto 10px;border:0;outline:none;width:64px;height:64px;object-fit:contain;">
            <div style="font-family:Arial,Helvetica,sans-serif;font-size:22px;line-height:26px;font-weight:700;letter-spacing:3px;color:#942008;text-transform:uppercase;">Ravishing Art</div>
            <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:16px;letter-spacing:2.4px;color:#c4431d;text-transform:uppercase;margin-top:4px;">Resin Art Hub &middot; Learn &middot; Create &middot; Earn</div>
          </td>
        </tr>
        <tr><td style="height:4px;line-height:4px;font-size:0;background-color:#c4431d;background-image:linear-gradient(90deg,#942008,#c4431d,#ea580c);">&nbsp;</td></tr>

        <!-- Greeting -->
        <tr>
          <td style="padding:36px 36px 8px;font-family:Arial,Helvetica,sans-serif;">
            <div style="font-family:Arial,Helvetica,sans-serif;font-size:30px;line-height:38px;font-weight:700;color:#1c1917;">Welcome aboard, ${name}! 🎨</div>
            <p style="margin:14px 0 0;font-size:15.5px;line-height:25px;color:#57534e;">
              Your Ravishing Art Hub student account is ready. Everything you need to start your resin art journey is waiting inside &mdash; courses, live classes, rewards and a community of fellow artists.
            </p>
          </td>
        </tr>

        <!-- Credentials card -->
        <tr>
          <td style="padding:24px 36px 6px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#fff2ea;border:1px solid #fbdcd0;border-radius:16px;">
              <tr>
                <td style="padding:22px 24px 8px;font-family:Arial,Helvetica,sans-serif;">
                  <div style="font-size:11.5px;line-height:16px;letter-spacing:2px;font-weight:700;color:#942008;text-transform:uppercase;">Your login details</div>
                </td>
              </tr>
              <tr>
                <td style="padding:6px 24px 4px;font-family:Arial,Helvetica,sans-serif;">
                  <div style="font-size:12px;line-height:18px;color:#78716c;margin-bottom:5px;">User ID (your email)</div>
                  <div style="background-color:#ffffff;border:1px solid #ecdccb;border-radius:10px;padding:13px 14px;font-family:Arial,Helvetica,sans-serif;letter-spacing:0.4px;font-size:15.5px;line-height:22px;font-weight:700;color:#1c1917;word-break:break-all;">${email}</div>
                </td>
              </tr>
              <tr>
                <td style="padding:14px 24px 24px;font-family:Arial,Helvetica,sans-serif;">
                  <div style="font-size:12px;line-height:18px;color:#78716c;margin-bottom:5px;">Password</div>
                  <div style="background-color:#ffffff;border:1px solid #ecdccb;border-radius:10px;padding:13px 14px;font-family:Arial,Helvetica,sans-serif;letter-spacing:0.4px;font-size:15.5px;line-height:22px;font-weight:700;color:#c4431d;word-break:break-all;">${password}</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- CTA button -->
        <tr>
          <td align="center" style="padding:26px 36px 8px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="center" bgcolor="#c4431d" style="border-radius:12px;background-color:#c4431d;background-image:linear-gradient(135deg,#c4431d,#ea580c);">
                  <a href="${link}" target="_blank" style="display:inline-block;padding:16px 38px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:20px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:12px;">Log in to your dashboard &rarr;</a>
                </td>
              </tr>
            </table>
            <p style="margin:14px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12.5px;line-height:19px;color:#78716c;">
              Button not working? Copy this link into your browser:<br>
              <a href="${link}" target="_blank" style="color:#c4431d;text-decoration:underline;word-break:break-all;">${link}</a>
            </p>
          </td>
        </tr>

        <!-- What's next -->
        <tr>
          <td style="padding:28px 36px 6px;font-family:Arial,Helvetica,sans-serif;">
            <div style="font-family:Arial,Helvetica,sans-serif;font-size:19px;line-height:26px;font-weight:700;color:#1c1917;margin-bottom:12px;">Your first three steps</div>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td width="38" valign="top" style="padding:0 0 12px;"><div style="width:28px;height:28px;border-radius:14px;background-color:#fde5d6;color:#942008;font-size:13px;line-height:28px;font-weight:700;text-align:center;">1</div></td>
                <td valign="top" style="padding:3px 0 12px;font-size:14.5px;line-height:22px;color:#44403c;"><strong style="color:#1c1917;">Log in</strong> with the details above.</td>
              </tr>
              <tr>
                <td width="38" valign="top" style="padding:0 0 12px;"><div style="width:28px;height:28px;border-radius:14px;background-color:#fde5d6;color:#942008;font-size:13px;line-height:28px;font-weight:700;text-align:center;">2</div></td>
                <td valign="top" style="padding:3px 0 12px;font-size:14.5px;line-height:22px;color:#44403c;"><strong style="color:#1c1917;">Complete your profile</strong> and set a password only you know.</td>
              </tr>
              <tr>
                <td width="38" valign="top" style="padding:0;"><div style="width:28px;height:28px;border-radius:14px;background-color:#fde5d6;color:#942008;font-size:13px;line-height:28px;font-weight:700;text-align:center;">3</div></td>
                <td valign="top" style="padding:3px 0 0;font-size:14.5px;line-height:22px;color:#44403c;"><strong style="color:#1c1917;">Start your first lesson</strong> and earn your first reward points.</td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Security note -->
        <tr>
          <td style="padding:24px 36px 34px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#faf8f5;border:1px solid #ecdccb;border-radius:12px;">
              <tr>
                <td style="padding:15px 18px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;color:#57534e;">
                  🔒 <strong style="color:#1c1917;">Keep this email safe.</strong> For your security, please change your password after your first login and never share it with anyone. Ravishing Art will never ask you for your password.
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td align="center" style="background-color:#fff2ea;border-top:1px solid #fbdcd0;padding:22px 28px;font-family:Arial,Helvetica,sans-serif;">
            <div style="font-size:12.5px;line-height:19px;color:#78716c;">
              Need help? Just reply to this email and our team will get back to you.
            </div>
            <div style="margin-top:10px;font-size:11.5px;line-height:18px;color:#a8a29e;">
              &copy; ${year} Ravishing Art Hub. All rights reserved.<br>
              <a href="${esc(site)}" target="_blank" style="color:#942008;text-decoration:none;">${esc(site.replace(/^https?:\/\//, ''))}</a>
            </div>
          </td>
        </tr>

      </table>

      <div style="max-width:600px;margin:14px auto 0;font-family:Arial,Helvetica,sans-serif;font-size:11.5px;line-height:17px;color:#a8a29e;text-align:center;">
        You received this email because an account was created for ${email} on Ravishing Art Hub.
      </div>
    </td>
  </tr>
</table>
</body>
</html>`;

  const text = [
    `Welcome to Ravishing Art Hub, ${firstName}!`,
    '',
    'Your student account is ready. Here are your login details:',
    '',
    `User ID (your email): ${input.email}`,
    `Password: ${input.password}`,
    '',
    `Log in here: ${loginUrl}`,
    '',
    'For your security, please change your password after your first login and never share it with anyone.',
    '',
    `© ${year} Ravishing Art Hub`,
  ].join('\n');

  return { subject, html, text };
}

/**
 * Sends the welcome email. Never throws: a failed email must never break account creation.
 * Resolves to true when Brevo / SMTP accepted the message.
 */
export async function sendStudentWelcomeEmail(input: WelcomeEmailInput): Promise<boolean> {
  try {
    if (!input.email || !input.password) return false;
    const { subject, html, text } = buildWelcomeEmail(input);
    const result = await sendMail({ to: input.email, subject, html, text });
    return result.sent;
  } catch (err) {
    console.error('[welcome-email] failed:', (err as Error).message);
    return false;
  }
}

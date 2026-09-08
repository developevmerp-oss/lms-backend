import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import dns from 'dns';

if (typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
}

let transporter: Transporter | null = null;

export function isEmailConfigured(): boolean {
  return Boolean(
    process.env.BREVO_API_KEY ||
    process.env.RESEND_API_KEY ||
    (process.env.SMTP_USER && process.env.SMTP_PASS)
  );
}

async function resolveHostToIpv4(host: string): Promise<string> {
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(host) || host === 'localhost' || host === '127.0.0.1') {
    return host;
  }
  return new Promise((resolve) => {
    dns.resolve4(host, (err, addresses) => {
      if (!err && addresses && addresses.length > 0) {
        return resolve(addresses[0]);
      }
      return resolve(host);
    });
  });
}

async function getTransporter(): Promise<Transporter | null> {
  if (!isEmailConfigured()) {
    console.warn('[email] SMTP not configured — emails are logged to console.');
    return null;
  }
  if (!transporter) {
    const rawHost = (process.env.SMTP_HOST || 'smtp-relay.brevo.com').trim();
    const port = Number(process.env.SMTP_PORT || (rawHost.includes('gmail') ? 465 : 587));
    const isSecure = process.env.SMTP_SECURE === 'true' || port === 465;
    const hostIpv4 = await resolveHostToIpv4(rawHost);

    transporter = nodemailer.createTransport({
      host: hostIpv4,
      port,
      secure: isSecure,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 20000,
      tls: {
        servername: rawHost,
        rejectUnauthorized: false,
      },
    });
  }
  return transporter;
}

export function mailFrom(): string {
  const customFrom = (process.env.SMTP_FROM || process.env.SMTP_USER || '').trim();
  return customFrom || 'Ravishing Art Hub <noreply@ravishingarthub.com>';
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

export type SendMailInput = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
};

export async function sendMail(input: SendMailInput): Promise<{ sent: boolean; preview?: string }> {
  const to = Array.isArray(input.to) ? input.to.filter(Boolean) : [input.to].filter(Boolean);
  if (to.length === 0) {
    console.warn('[email] No recipients provided — skipped:', input.subject);
    return { sent: false };
  }

  // 1. If BREVO_API_KEY is provided, use Brevo HTTPS REST API (Port 443 — works without SMTP firewall blocks)
  if (process.env.BREVO_API_KEY) {
    try {
      const fromAddress = mailFrom();
      const senderEmail = fromAddress.includes('<') ? fromAddress.replace(/.*<([^>]+)>.*/, '$1') : fromAddress;
      const senderName = fromAddress.includes('<') ? fromAddress.replace(/^"?([^"<]*)"?\s*<.*$/, '$1').trim() || 'Ravishing Art Hub' : 'Ravishing Art Hub';

      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': process.env.BREVO_API_KEY.trim(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender: { name: senderName, email: senderEmail },
          to: to.map((email) => ({ email })),
          subject: input.subject,
          htmlContent: input.html,
          textContent: input.text || stripHtml(input.html),
        }),
      });

      if (!res.ok) {
        const data: any = await res.json().catch(() => ({}));
        throw new Error(data?.message || JSON.stringify(data));
      }
      console.log('[email:brevo] Sent:', input.subject, '→', to.join(', '));
      return { sent: true };
    } catch (err) {
      console.error('[email:brevo] Failed:', (err as Error).message);
    }
  }

  // 2. Fallback to standard SMTP (Gmail / Brevo relay / etc.)
  const transport = await getTransporter();
  if (!transport) {
    console.log('[email:dry-run]', {
      to,
      subject: input.subject,
      text: input.text || stripHtml(input.html).slice(0, 400),
    });
    return { sent: false, preview: 'dry-run' };
  }

  try {
    await transport.sendMail({
      from: mailFrom(),
      to: to.join(', '),
      subject: input.subject,
      html: input.html,
      text: input.text || stripHtml(input.html),
    });
    console.log('[email:smtp] Sent:', input.subject, '→', to.join(', '));
    return { sent: true };
  } catch (err) {
    console.error('[email:smtp] Failed:', (err as Error).message);
    return { sent: false };
  }
}

/** Password Reset OTP Email with branded template */
export async function sendPasswordResetOtpEmail(opts: {
  to: string;
  name: string;
  otp: string;
}): Promise<{ sent: boolean; devMode: boolean }> {
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #0f172a; color: #f8fafc; border-radius: 16px; border: 1px solid #1e293b;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #f97316; font-size: 24px; font-weight: 900; margin: 0; letter-spacing: 0.5px;">RAVISHING ART HUB</h1>
        <p style="color: #94a3b8; font-size: 13px; margin-top: 4px;">Password Reset Verification</p>
      </div>

      <div style="background-color: #1e293b; border-radius: 12px; padding: 24px; margin-bottom: 20px; border: 1px solid #334155;">
        <p style="font-size: 15px; margin: 0 0 16px; color: #e2e8f0;">Hello <strong>${opts.name || 'Fellow Artist'}</strong>,</p>
        <p style="font-size: 14px; margin: 0 0 20px; color: #cbd5e1; line-height: 1.5;">
          We received a request to reset your password for your Ravishing Art Hub account. Use the 6-digit verification code below to complete your password reset:
        </p>

        <div style="text-align: center; margin: 28px 0;">
          <span style="display: inline-block; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #f97316; background-color: #0f172a; padding: 14px 28px; border-radius: 10px; border: 2px dashed #f97316; font-family: monospace;">
            ${opts.otp}
          </span>
        </div>

        <p style="font-size: 13px; color: #94a3b8; margin: 0; text-align: center;">
          ⏱ This code is valid for <strong>15 minutes</strong> and can only be used once.
        </p>
      </div>

      <p style="font-size: 12px; color: #64748b; line-height: 1.5; margin: 0 0 12px;">
        If you did not request a password reset, please ignore this email or contact support if you suspect unauthorized activity. Your current password will remain unchanged.
      </p>

      <div style="border-top: 1px solid #1e293b; padding-top: 16px; text-align: center; font-size: 11px; color: #475569;">
        &copy; ${new Date().getFullYear()} Ravishing Art Hub. All rights reserved.
      </div>
    </div>
  `;

  const result = await sendMail({
    to: opts.to,
    subject: `Your Password Reset Code: ${opts.otp} - Ravishing Art Hub`,
    html: htmlContent,
    text: `Hello ${opts.name},\n\nYour password reset code is: ${opts.otp}\n\nThis code is valid for 15 minutes.\n\nIf you did not request this, please ignore this email.`,
  });

  return {
    sent: result.sent,
    devMode: !result.sent,
  };
}

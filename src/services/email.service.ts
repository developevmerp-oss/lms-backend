import nodemailer from 'nodemailer';

interface SendPasswordResetEmailParams {
  to: string;
  name: string;
  otp: string;
}

export const sendPasswordResetOtpEmail = async ({
  to,
  name,
  otp,
}: SendPasswordResetEmailParams): Promise<{ sent: boolean; devMode: boolean }> => {
  const brevoApiKey = process.env.BREVO_API_KEY;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const rawFrom = process.env.SMTP_FROM || process.env.FROM_EMAIL || 'Ravishing Art Hub <noreply@ravishingarthub.com>';
  
  // Default host to Brevo relay if host is missing but Brevo credentials exist
  const host = process.env.SMTP_HOST || (brevoApiKey || (user && user.includes('@')) ? 'smtp-relay.brevo.com' : undefined);
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  // Extract clean sender name and email
  let senderName = 'Ravishing Art Hub';
  let senderEmail = 'noreply@ravishingarthub.com';

  const match = rawFrom.match(/^(?:"?([^"<]*)"?\s*)?(?:<?([^>]+)>?)$/);
  if (match) {
    if (match[1]?.trim()) senderName = match[1].trim();
    if (match[2]?.trim()) senderEmail = match[2].trim();
  } else if (rawFrom.includes('@')) {
    senderEmail = rawFrom.trim();
  }

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #0f172a; color: #f8fafc; border-radius: 16px; border: 1px solid #1e293b;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #f97316; font-size: 24px; font-weight: 900; margin: 0; letter-spacing: 0.5px;">RAVISHING ART HUB</h1>
        <p style="color: #94a3b8; font-size: 13px; margin-top: 4px;">Password Reset Verification</p>
      </div>

      <div style="background-color: #1e293b; border-radius: 12px; padding: 24px; margin-bottom: 20px; border: 1px solid #334155;">
        <p style="font-size: 15px; margin: 0 0 16px; color: #e2e8f0;">Hello <strong>${name || 'Fellow Artist'}</strong>,</p>
        <p style="font-size: 14px; margin: 0 0 20px; color: #cbd5e1; line-height: 1.5;">
          We received a request to reset your password for your Ravishing Art Hub account. Use the 6-digit verification code below to complete your password reset:
        </p>

        <div style="text-align: center; margin: 28px 0;">
          <span style="display: inline-block; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #f97316; background-color: #0f172a; padding: 14px 28px; border-radius: 10px; border: 2px dashed #f97316; font-family: monospace;">
            ${otp}
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

  // 1. First Attempt: Brevo Direct REST API (fastest, reliable, never blocked by cloud firewall)
  if (brevoApiKey) {
    try {
      console.log(`[EmailService] Attempting to send OTP email via Brevo REST API to: ${to}`);
      const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': brevoApiKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sender: { name: senderName, email: senderEmail },
          to: [{ email: to, name: name || 'Student' }],
          subject: `Your Password Reset Code: ${otp} - Ravishing Art Hub`,
          htmlContent,
        }),
      });

      const brevoData = await brevoRes.json().catch(() => ({}));
      if (brevoRes.ok) {
        console.log(`[EmailService] Successfully sent OTP email via Brevo API. Message ID:`, (brevoData as any).messageId);
        return { sent: true, devMode: false };
      } else {
        console.error(`[EmailService] Brevo API responded with error:`, brevoData);
      }
    } catch (apiErr) {
      console.error('[EmailService] Brevo API fetch failed:', apiErr);
    }
  }

  // 2. Second Attempt: Nodemailer SMTP
  if (host && user && pass) {
    try {
      console.log(`[EmailService] Attempting to send OTP email via SMTP relay (${host}:${port})...`);
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
      });

      await transporter.sendMail({
        from: `"${senderName}" <${senderEmail}>`,
        to,
        subject: `Your Password Reset Code: ${otp} - Ravishing Art Hub`,
        text: `Hello ${name},\n\nYour password reset code is: ${otp}\n\nThis code is valid for 15 minutes.\n\nIf you did not request this, please ignore this email.`,
        html: htmlContent,
      });

      console.log(`[EmailService] Successfully sent OTP email via SMTP to: ${to}`);
      return { sent: true, devMode: false };
    } catch (smtpErr) {
      console.error('[EmailService] SMTP delivery failed:', smtpErr);
    }
  }

  // Fallback: If neither sent, log OTP for safety
  console.log('\n============================================================');
  console.log(`[PASSWORD RESET OTP] For: ${to} (${name})`);
  console.log(`[OTP CODE]: ${otp}`);
  console.log('Valid for 15 minutes.');
  console.log('============================================================\n');

  return { sent: false, devMode: true };
};

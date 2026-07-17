import nodemailer from 'nodemailer';

let transporter = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'localhost',
      port: process.env.SMTP_PORT || 25,
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER ? {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      } : undefined,
    });
  }
  return transporter;
}

export function buildEmailTemplate({ title, content, buttonLabel, buttonUrl }) {
  const buttonHtml = buttonLabel && buttonUrl ? `
    <div style="text-align: left; margin: 30px 0;">
      <a href="${buttonUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 14px; display: inline-block;">
        ${buttonLabel}
      </a>
    </div>
  ` : '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
              <tr>
                <td style="background-color: #0f172a; padding: 24px 32px; border-bottom: 3px solid #2563eb;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 600; letter-spacing: 0.5px;">
                    ${process.env.APP_NAME || 'RHG MU Ticketing'}
                  </h1>
                </td>
              </tr>
              <tr>
                <td style="padding: 40px 32px;">
                  <h2 style="color: #0f172a; margin-top: 0; margin-bottom: 24px; font-size: 22px; font-weight: 600;">
                    ${title}
                  </h2>
                  <div style="color: #334155; font-size: 16px; line-height: 1.6;">
                    ${content}
                  </div>
                  ${buttonHtml}
                </td>
              </tr>
              <tr>
                <td style="background-color: #f1f5f9; padding: 24px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
                  <p style="color: #64748b; margin: 0; font-size: 13px; line-height: 1.5;">
                    This is an automated message from ${process.env.APP_NAME || 'RHG MU Ticketing'}.<br>
                    Please do not reply directly to this email.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

export async function sendEmail({ to, subject, text, html }, throwError = false) {
  try {
    // If we're missing real SMTP credentials, just mock it out so the system doesn't crash
    if (!process.env.SMTP_USER) {
      console.log('\n--- 📧 MOCK EMAIL SENT ---');
      console.log(`To: ${to}`);
      console.log(`Subject: ${subject}`);
      console.log(`Text Body:\n${text}`);
      console.log('--------------------------\n');
      return true;
    }

    const t = getTransporter();
    const info = await t.sendMail({
      from: process.env.SMTP_FROM || '"HotelOps System" <noreply@hotel.local>',
      to,
      subject,
      text,
      html,
    });
    
    console.log(`Email sent: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    if (throwError) throw error;
    return false;
  }
}

export async function sendMFACodeEmail(email, code) {
  const subject = 'Your Login Verification Code';
  const text = `Your login verification code is: ${code}\n\nThis code will expire in 10 minutes.\nIf you did not request this code, please ignore this email.`;
  const html = buildEmailTemplate({
    title: 'Login Verification',
    content: `
      <p>A login attempt was made using this email address. Please use the following verification code to proceed:</p>
      <div style="background-color: #f1f5f9; border-left: 4px solid #2563eb; padding: 16px 20px; margin: 24px 0; font-family: monospace; font-size: 28px; font-weight: 700; color: #0f172a; letter-spacing: 4px;">
        ${code}
      </div>
      <p style="margin-bottom: 0;">This code will expire in 10 minutes. If you did not request this login, you can safely ignore this email.</p>
    `
  });

  return sendEmail({ to: email, subject, text, html });
}

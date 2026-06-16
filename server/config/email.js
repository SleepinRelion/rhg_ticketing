import nodemailer from 'nodemailer';

let transporter = null;

export function getMailTransporter() {
  if (transporter) return transporter;

  const enabled = process.env.SMTP_ENABLED === 'true';
  if (!enabled) {
    // Create a test transport that logs to console
    transporter = {
      sendMail: async (mailOptions) => {
        console.log('[EMAIL PREVIEW - SMTP NOT CONFIGURED]');
        console.log(`  To: ${mailOptions.to}`);
        console.log(`  Subject: ${mailOptions.subject}`);
        console.log(`  Body: ${mailOptions.text || mailOptions.html?.substring(0, 200)}`);
        return { messageId: 'preview-' + Date.now() };
      },
    };
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return transporter;
}

export const SMTP_FROM = process.env.SMTP_FROM || 'noreply@hotel.com';

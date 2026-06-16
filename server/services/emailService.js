import nodemailer from 'nodemailer';

// Configure standard nodemailer transport
// For local testing, we'll log out to console if no SMTP credentials are provided
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'localhost',
  port: process.env.SMTP_PORT || 25,
  secure: process.env.SMTP_SECURE === 'true',
  auth: process.env.SMTP_USER ? {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  } : undefined,
});

export async function sendEmail({ to, subject, text, html }) {
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

    const info = await transporter.sendMail({
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
    // Don't throw for now, to not break critical flows if email is misconfigured
    return false;
  }
}

export async function sendMFACodeEmail(email, code) {
  const subject = 'Your Login Verification Code';
  const text = `Your login verification code is: ${code}\n\nThis code will expire in 10 minutes.\nIf you did not request this code, please ignore this email.`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2>Login Verification</h2>
      <p>Your login verification code is:</p>
      <div style="font-size: 32px; font-weight: bold; letter-spacing: 5px; padding: 20px; background-color: #f3f4f6; border-radius: 8px; text-align: center; margin: 20px 0;">
        ${code}
      </div>
      <p>This code will expire in 10 minutes.</p>
      <p style="color: #6b7280; font-size: 12px; margin-top: 40px;">If you did not request this code, please ignore this email or contact IT support.</p>
    </div>
  `;

  return sendEmail({ to: email, subject, text, html });
}

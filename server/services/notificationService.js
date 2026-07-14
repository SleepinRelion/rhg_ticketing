import db from '../config/database.js';
import { getMailTransporter, SMTP_FROM } from '../config/email.js';

/**
 * Create an in-app notification and optionally send email.
 */
export async function createNotification(userId, ticketId, title, message, type, hotelId = null) {
  try {
    await db('notifications').insert({
      user_id: userId,
      ticket_id: ticketId,
      title,
      message,
      type,
      hotel_id: hotelId,
      is_read: false,
      created_at: new Date(),
    });

    // Try to send email notification
    await sendEmailNotification(userId, title, message, ticketId);
  } catch (error) {
    console.error('Failed to create notification:', error);
  }
}

/**
 * Send email notification to user.
 */
async function sendEmailNotification(userId, subject, body, ticketId) {
  try {
    const user = await db('users').where({ id: userId }).first();
    if (!user || !user.email) return;

    const transporter = getMailTransporter();
    // Only build a ticket link if APP_URL is explicitly configured.
    // Never fall back to localhost — that URL is meaningless to email recipients.
    const appUrl = process.env.APP_URL;
    const ticketLink = appUrl && ticketId ? `${appUrl}/tickets/${ticketId}` : null;

    await transporter.sendMail({
      from: `"${process.env.APP_NAME || 'Hotel Operations'}" <${SMTP_FROM}>`,
      to: user.email,
      subject: `[Hotel Ops] ${subject}`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 8px 8px 0 0;">
            <h2 style="color: white; margin: 0;">${process.env.APP_NAME || 'Hotel Operations System'}</h2>
          </div>
          <div style="padding: 24px; background: #ffffff; border: 1px solid #e5e7eb;">
            <h3 style="color: #1f2937; margin-top: 0;">${subject}</h3>
            <p style="color: #4b5563; line-height: 1.6;">${body}</p>
            ${ticketLink ? `<a href="${ticketLink}" style="display: inline-block; padding: 10px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin-top: 16px;">View Ticket</a>` : ''}
          </div>
          <div style="padding: 12px 24px; background: #f9fafb; border-radius: 0 0 8px 8px; text-align: center;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">This is an automated notification from ${process.env.APP_NAME || 'Hotel Operations System'}.</p>
          </div>
        </div>
      `,
      text: `${subject}\n\n${body}\n\n${ticketLink ? `View ticket: ${ticketLink}` : ''}`,
    });
  } catch (error) {
    console.error('Failed to send email notification:', error.message);
  }
}

/**
 * Notify multiple users at once.
 */
export async function notifyUsers(userIds, ticketId, title, message, type, hotelId = null) {
  const uniqueIds = [...new Set(userIds)];
  for (const userId of uniqueIds) {
    await createNotification(userId, ticketId, title, message, type, hotelId);
  }
}

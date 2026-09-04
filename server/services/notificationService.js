import db from '../config/database.js';
import { getMailTransporter, SMTP_FROM } from '../config/email.js';
import { buildEmailTemplate } from './emailService.js';
import { sendPushNotification } from './pushService.js';

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
    
    // Try to send push notification
    await sendPushNotification(userId, {
      title,
      body: message,
      url: ticketId ? `/tickets/${ticketId}` : '/',
      type
    });
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
      html: buildEmailTemplate({
        title: subject,
        content: `<p style="margin: 0;">${body.replace(/\n/g, '<br>')}</p>`,
        buttonLabel: ticketLink ? 'View Ticket in System' : null,
        buttonUrl: ticketLink
      }),
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

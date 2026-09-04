import webpush from 'web-push';
import db from '../config/database.js';
import logger from '../config/logger.js';

// VAPID keys should be generated once and stored in .env
// You can generate them using: npx web-push generate-vapid-keys
const publicVapidKey = process.env.VAPID_PUBLIC_KEY || 'BGebdjLrPk0ZY4WzLhQhJHVjLMLIS2QHqS5djhdxp2t-aJ8jB6Er8obDoL_ao7tvsq0QrXdQTzyo_JmRzLiSUdA';
const privateVapidKey = process.env.VAPID_PRIVATE_KEY || 'jyAg17eB3qm9BpFORmweYAmeySJKcAMHOWLmSaQV_fI';

webpush.setVapidDetails(
  'mailto:support@hotelticketing.com',
  publicVapidKey,
  privateVapidKey
);

export async function sendPushNotification(userId, payload) {
  try {
    const subscriptions = await db('push_subscriptions').where({ user_id: userId });
    
    const notifications = subscriptions.map(sub => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth
        }
      };

      return webpush.sendNotification(pushSubscription, JSON.stringify(payload))
        .catch(async (error) => {
          if (error.statusCode === 404 || error.statusCode === 410) {
            // Subscription has expired or is no longer valid
            await db('push_subscriptions').where({ id: sub.id }).del();
          } else {
            logger.error(`[PushService] Error sending to user ${userId}:`, error);
          }
        });
    });

    await Promise.all(notifications);
  } catch (error) {
    logger.error(`[PushService] Failed to send push to user ${userId}:`, error);
  }
}

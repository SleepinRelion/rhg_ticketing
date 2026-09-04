import api from '../api/client.js';

const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

export const subscribeToPush = async () => {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('Push notifications are not supported by your browser.');
  }

  const registration = await navigator.serviceWorker.ready;
  const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY || 'BGebdjLrPk0ZY4WzLhQhJHVjLMLIS2QHqS5djhdxp2t-aJ8jB6Er8obDoL_ao7tvsq0QrXdQTzyo_JmRzLiSUdA';

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
  });

  await api('/notifications/push/subscribe', {
    method: 'POST',
    body: JSON.stringify(subscription)
  });

  return subscription;
};

export const unsubscribeFromPush = async () => {
  if (!('serviceWorker' in navigator)) return;

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  
  if (subscription) {
    await api('/notifications/push/unsubscribe', {
      method: 'DELETE',
      body: JSON.stringify({ endpoint: subscription.endpoint })
    });
    await subscription.unsubscribe();
  }
};

export const getPushSubscriptionStatus = async () => {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  return !!subscription;
};

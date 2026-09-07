import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkOnly, NetworkFirst } from 'workbox-strategies';
import { BackgroundSyncPlugin } from 'workbox-background-sync';

// Required for vite-plugin-pwa injectManifest
precacheAndRoute(self.__WB_MANIFEST || []);

// Configure Background Sync for tickets API
const bgSyncPlugin = new BackgroundSyncPlugin('ticketQueue', {
  maxRetentionTime: 24 * 60 // Retry for max of 24 Hours (specified in minutes)
});

// Cache POST/PUT/DELETE requests to the API
registerRoute(
  ({url}) => url.pathname.startsWith('/api/'),
  new NetworkOnly({
    plugins: [bgSyncPlugin]
  }),
  'POST'
);

registerRoute(
  ({url}) => url.pathname.startsWith('/api/'),
  new NetworkOnly({
    plugins: [bgSyncPlugin]
  }),
  'PUT'
);

// Cache GET requests to the API for offline reading
registerRoute(
  ({url}) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'api-cache',
    networkTimeoutSeconds: 3,
  }),
  'GET'
);

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', () => {
  self.clients.claim();
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const title = data.title || 'New Notification';
    const options = {
      body: data.body,
      icon: '/logo.png',
      badge: '/logo.png',
      data: data.url || '/'
    };

    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  } catch (err) {
    console.error('Error processing push event', err);
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data;
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there is already a window/tab open with the target URL
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        // If so, just focus it.
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }
      // If not, then open the target URL in a new window/tab.
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});

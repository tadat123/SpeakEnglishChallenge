// Speak Right 2026 - Official PWA & Web Push Service Worker

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Pass-through network handler to satisfy PWA installability requirements
  if (event.request.method !== 'GET') return;
});

// Nhận Web Push Notification từ Server (Được gửi chia đều từng request từ Staggered Queue)
self.addEventListener('push', (event) => {
  let payload = {
    title: 'SPEAK RIGHT 2026',
    body: 'Bạn có thông báo mới từ thử thách phát âm!',
    icon: './logo.png',
    badge: './logo.png',
    tag: 'speak-right-push',
    url: './#challenges',
    type: 'NEW_DAY_UNLOCKED',
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      payload = { ...payload, ...parsed };
    } catch {
      payload.body = event.data.text();
    }
  }

  const showPromise = self.registration.showNotification(payload.title, {
    body: payload.body,
    icon: payload.icon || './logo.png',
    badge: payload.badge || './logo.png',
    tag: payload.tag || `sr-${Date.now()}`,
    renotify: true,
    vibrate: [200, 100, 200],
    data: {
      url: payload.url || './#challenges',
      type: payload.type,
    },
  });

  const notifyClientsPromise = self.clients
    .matchAll({ type: 'window', includeUncontrolled: true })
    .then((windowClients) => {
      for (const client of windowClients) {
        client.postMessage({
          type: 'PWA_PUSH_RECEIVED',
          payload,
        });
      }
    });

  event.waitUntil(Promise.all([showPromise, notifyClientsPromise]));
});

// Hỗ trợ hiển thị Native OS/PWA Notification khi nhận tín hiệu từ Staggered Queue Sync
self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || data.type !== 'SHOW_NATIVE_PWA_NOTIFICATION') return;

  const payload = data.payload || {};
  if (self.Notification && self.Notification.permission === 'granted') {
    event.waitUntil(
      self.registration.showNotification(payload.title || 'SPEAK RIGHT 2026', {
        body: payload.body || '',
        icon: './logo.png',
        badge: './logo.png',
        tag: payload.tag || `sr-local-${Date.now()}`,
        renotify: true,
        vibrate: [200, 100, 200],
        data: {
          url: payload.targetUrl || payload.url || './#challenges',
          type: payload.type,
        },
      })
    );
  }
});

// Khi người dùng bấm vào thông báo đẩy trên điện thoại / máy tính -> Mở thẳng vào trang tương ứng của PWA
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || './#challenges';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ('focus' in client) {
            client.focus();
            client.postMessage({
              type: 'PWA_NOTIFICATION_CLICK',
              targetUrl,
            });
            return;
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});

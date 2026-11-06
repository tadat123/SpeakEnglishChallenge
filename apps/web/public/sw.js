// Speak Right 2026 - Official PWA & Web Push Service Worker
// Build ID: __BUILD_ID__
// Build Timestamp: __BUILD_TIMESTAMP__

const BUILD_ID = '__BUILD_ID__';
const BUILD_TIMESTAMP = '__BUILD_TIMESTAMP__';
const CACHE_NAME = `speak-right-v${BUILD_ID}`;

// 1. Cài đặt Service Worker mới: bỏ qua trạng thái chờ (skipWaiting) để kích hoạt ngay
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// 2. Kích hoạt: xóa toàn bộ cache cũ và chiếm quyền điều khiển (clients.claim)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

// 3. Fetch handler: Network-first, không can thiệp cache ngầm gây lỗi cũ phiên bản
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
});

// 4. Nhận Web Push Notification từ Server (Được gửi chia đều từng request từ Staggered Queue)
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

  const iconUrl = new URL(payload.icon || 'logo.png', self.registration.scope).href;
  const badgeUrl = new URL(payload.badge || 'logo.png', self.registration.scope).href;
  const todayStr = new Date().toISOString().slice(0, 10);
  const notifTag =
    payload.tag ||
    (payload.type
      ? `sr-${payload.type}-${todayStr}`
      : `sr-general-${todayStr}`);

  const showPromise = self.registration.showNotification(payload.title, {
    body: payload.body,
    icon: iconUrl,
    badge: badgeUrl,
    tag: notifTag,
    renotify: true,
    vibrate: [200, 100, 200],
    requireInteraction: false,
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

// 5. Hỗ trợ hiển thị Native Notification & Giao tiếp vòng đời cập nhật phiên bản
self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data) return;

  // Lệnh skipWaiting từ App Client
  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  // Hỏi phiên bản hiện tại của Service Worker
  if (data.type === 'GET_SW_VERSION') {
    event.source?.postMessage({
      type: 'SW_VERSION',
      buildId: BUILD_ID,
      buildTimestamp: BUILD_TIMESTAMP,
    });
    return;
  }

  // Hỗ trợ hiển thị Native OS/PWA Notification khi nhận tín hiệu từ Staggered Queue Sync
  if (data.type === 'SHOW_NATIVE_PWA_NOTIFICATION') {
    const payload = data.payload || {};
    if (self.Notification && self.Notification.permission === 'granted') {
      const iconUrl = new URL(payload.icon || 'logo.png', self.registration.scope).href;
      const badgeUrl = new URL(payload.badge || 'logo.png', self.registration.scope).href;
      const todayStr = new Date().toISOString().slice(0, 10);
      const notifTag =
        payload.tag ||
        (payload.type
          ? `sr-${payload.type}-${todayStr}`
          : `sr-local-${todayStr}`);

      event.waitUntil(
        self.registration.showNotification(payload.title || 'SPEAK RIGHT 2026', {
          body: payload.body || '',
          icon: iconUrl,
          badge: badgeUrl,
          tag: notifTag,
          renotify: true,
          vibrate: [200, 100, 200],
          requireInteraction: false,
          data: {
            url: payload.targetUrl || payload.url || './#challenges',
            type: payload.type,
          },
        })
      );
    }
  }
});

// 6. Khi người dùng bấm vào thông báo đẩy trên điện thoại / máy tính -> Mở thẳng vào trang tương ứng của PWA
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

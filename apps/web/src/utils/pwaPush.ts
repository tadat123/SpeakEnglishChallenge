// Quản lý cài đặt PWA, đăng ký Service Worker & Web Push Notification

const PWA_INSTALLED_KEY = 'sr_pwa_installed_v1';
const PWA_DEVICE_ID_KEY = 'sr_pwa_device_id_v1';

export function getOrCreatePwaDeviceId(): string {
  let id = localStorage.getItem(PWA_DEVICE_ID_KEY);
  if (!id) {
    id = `dev-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    localStorage.setItem(PWA_DEVICE_ID_KEY, id);
  }
  return id;
}

export function isRunningStandalonePwa(): boolean {
  if (typeof window === 'undefined') return false;
  const isStandaloneDisplay =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://');

  if (isStandaloneDisplay) {
    localStorage.setItem(PWA_INSTALLED_KEY, 'true');
    return true;
  }

  return localStorage.getItem(PWA_INSTALLED_KEY) === 'true';
}

export function markPwaAsInstalled() {
  localStorage.setItem(PWA_INSTALLED_KEY, 'true');
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

type UpdateCallback = (hasUpdate: boolean, details?: { current?: string; latest?: string }) => void;
const updateListeners = new Set<UpdateCallback>();

export function onPwaUpdate(callback: UpdateCallback): () => void {
  updateListeners.add(callback);
  return () => updateListeners.delete(callback);
}

function notifyUpdateListeners(hasUpdate: boolean, details?: { current?: string; latest?: string }) {
  for (const listener of updateListeners) {
    try {
      listener(hasUpdate, details);
    } catch {}
  }
}

let globalRegistration: ServiceWorkerRegistration | null = null;

export async function registerPwaServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }
  if (globalRegistration) {
    return globalRegistration;
  }
  try {
    const swUrl = `${import.meta.env.BASE_URL || './'}sw.js`;
    // Thêm { updateViaCache: 'none' } để trình duyệt bỏ qua HTTP cache khi kiểm tra sw.js
    const registration = await navigator.serviceWorker.register(swUrl, {
      updateViaCache: 'none',
    });
    globalRegistration = registration;

    // 1. Nếu có Service Worker mới đang chờ kích hoạt (waiting)
    if (registration.waiting) {
      notifyUpdateListeners(true);
    }

    // 2. Lắng nghe phát hiện Service Worker mới (updatefound)
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // Phiên bản mới đã được tải và sẵn sàng kích hoạt
          notifyUpdateListeners(true);
        }
      });
    });

    // 3. Lắng nghe khi worker mới đã chiếm quyền điều khiển (controllerchange)
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      if (sessionStorage.getItem('sr_auto_reload_pending') === 'true') {
        sessionStorage.removeItem('sr_auto_reload_pending');
        refreshing = true;
        window.location.reload();
      } else {
        notifyUpdateListeners(true);
      }
    });

    // 4. Chủ động kiểm tra cập nhật ngay khi đăng ký
    registration.update().catch(() => {});

    return registration;
  } catch (err) {
    console.warn('Không thể đăng ký Service Worker:', err);
    return null;
  }
}

export async function checkForAppUpdate(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  try {
    // 1. Kiểm tra Service Worker
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        await reg.update().catch(() => {});
        if (reg.waiting) {
          notifyUpdateListeners(true);
          return true;
        }
      }
    }

    // 2. Kiểm tra version.json từ static assets
    const currentBuildTime = typeof __APP_BUILD_TIME__ !== 'undefined' ? __APP_BUILD_TIME__ : '';
    const res = await fetch(`./version.json?_t=${Date.now()}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
      },
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.buildTime && currentBuildTime && data.buildTime !== currentBuildTime) {
        notifyUpdateListeners(true, { current: currentBuildTime, latest: data.buildTime });
        return true;
      }
    }
  } catch {
    // ignore
  }
  return false;
}

export async function applyAppUpdate(): Promise<void> {
  if (typeof window === 'undefined') return;

  sessionStorage.setItem('sr_auto_reload_pending', 'true');

  try {
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        if (reg.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
        await reg.update().catch(() => {});
      }
    }
    await fetch(window.location.pathname, { cache: 'reload' }).catch(() => {});
  } catch {}

  // Đợi nhẹ để worker hoàn tất kích hoạt rồi tải lại trang
  setTimeout(() => {
    window.location.reload();
  }, 250);
}

export function getNotificationPermissionState(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

export async function syncAndSubscribePwaPush(options: {
  user?: { id?: string; employeeId?: string; fullName?: string } | null;
  token?: string | null;
  askPermission?: boolean;
  forcePwaFlag?: boolean;
}): Promise<{
  ok: boolean;
  permission: NotificationPermission | 'unsupported';
  message: string;
}> {
  const { user, token, askPermission = false, forcePwaFlag = false } = options;

  // Khách vãng lai (chưa đăng nhập) tuyệt đối không đăng ký Web Push
  if (!token || !user?.id) {
    return {
      ok: false,
      permission: getNotificationPermissionState(),
      message: 'Vui lòng đăng nhập tài khoản trước khi bật thông báo.',
    };
  }

  if (forcePwaFlag) {
    markPwaAsInstalled();
  }

  const isPwa = isRunningStandalonePwa() || forcePwaFlag;
  const registration = await registerPwaServiceWorker();

  let permission = getNotificationPermissionState();
  if (askPermission && permission === 'default' && 'Notification' in window) {
    try {
      permission = await Notification.requestPermission();
    } catch {
      // ignore
    }
  }

  // Nếu chưa cài PWA và người dùng cũng chưa chủ động bấm bật thông báo PWA thì không tự ý đăng ký
  if (!isPwa && !askPermission && permission !== 'granted') {
    return {
      ok: false,
      permission,
      message: 'Thiết bị chưa cài đặt PWA.',
    };
  }

  let pushSubscriptionJson: any = null;

  if (registration && 'pushManager' in registration && permission === 'granted') {
    try {
      let sub = await registration.pushManager.getSubscription();
      if (!sub) {
        const keyRes = await fetch('/api/push/vapid-public-key');
        if (keyRes.ok) {
          const { publicKey } = await keyRes.json();
          if (publicKey) {
            const convertedKey = urlBase64ToUint8Array(publicKey);
            sub = await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: convertedKey as any,
            });
          }
        }
      }
      if (sub) {
        pushSubscriptionJson = sub.toJSON();
      }
    } catch (err) {
      console.warn('Fallback sang đồng bộ Push PWA nội bộ:', err);
    }
  }

  const deviceId = getOrCreatePwaDeviceId();
  const fallbackEndpoint = `https://pwa-client.speakright.local/device/${user?.employeeId || deviceId}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const res = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        subscription: pushSubscriptionJson || {
          endpoint: fallbackEndpoint,
          keys: { p256dh: `pwa_${deviceId}`, auth: `auth_${deviceId}` },
        },
        deviceId,
        employeeId: user?.employeeId || null,
        fullName: user?.fullName || null,
        isPwaInstalled: true,
        userAgent: navigator.userAgent,
      }),
    });

    if (res.ok) {
      markPwaAsInstalled();
      return {
        ok: true,
        permission,
        message: 'Đã bật thông báo đẩy cho ứng dụng PWA thành công!',
      };
    }
  } catch (err) {
    console.warn('Lỗi gửi đăng ký PWA Push:', err);
  }

  return {
    ok: false,
    permission,
    message: 'Không thể kết nối máy chủ thông báo.',
  };
}

export async function unsubscribePwaPush(token?: string | null): Promise<void> {
  try {
    const deviceId = getOrCreatePwaDeviceId();
    let endpoint: string | undefined;
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager?.getSubscription().catch(() => null);
      if (sub?.endpoint) endpoint = sub.endpoint;
    }
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    await fetch('/api/push/unsubscribe', {
      method: 'POST',
      headers,
      body: JSON.stringify({ endpoint, deviceId }),
    }).catch(() => {});
  } catch {
    // ignore
  }
}

export async function triggerLocalServiceWorkerNotification(payload: {
  title: string;
  body: string;
  targetUrl?: string;
  type?: string;
  tag?: string;
}) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg && reg.active) {
      reg.active.postMessage({
        type: 'SHOW_NATIVE_PWA_NOTIFICATION',
        payload,
      });
      return;
    }
    if (reg && 'showNotification' in reg) {
      await reg.showNotification(payload.title, {
        body: payload.body,
        icon: './logo.png',
        badge: './logo.png',
        tag: payload.tag || `sr-notif-${Date.now()}`,
        data: { url: payload.targetUrl || './#challenges', type: payload.type },
      });
      return;
    }
    new Notification(payload.title, {
      body: payload.body,
      icon: './logo.png',
    });
  } catch {
    // ignore
  }
}

export async function sendTestNativeNotification(): Promise<{ ok: boolean; message: string }> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return { ok: false, message: 'Trình duyệt này không hỗ trợ thông báo đẩy ngoài app.' };
  }

  if (Notification.permission !== 'granted') {
    let perm: NotificationPermission = 'default';
    try {
      perm = await Notification.requestPermission();
    } catch {
      // ignore
    }
    if (perm !== 'granted') {
      return {
        ok: false,
        message: 'Bạn chưa cấp quyền "Cho phép thông báo". Vui lòng bấm Cho phép để nhận thông báo ngoài màn hình!',
      };
    }
  }

  try {
    const reg = await registerPwaServiceWorker();
    const testPayload = {
      title: '🔔 SPEAK RIGHT 2026',
      body: '🎉 Kiểm tra thành công! Thông báo đã xuất hiện ngoài màn hình (Lock screen / Khay hệ thống) của bạn!',
      targetUrl: './#challenges',
      type: 'TEST_NOTIFICATION',
      tag: `sr-test-${Date.now()}`,
    };

    if (reg && reg.active) {
      reg.active.postMessage({
        type: 'SHOW_NATIVE_PWA_NOTIFICATION',
        payload: testPayload,
      });
      return { ok: true, message: 'Đã gửi thông báo ra ngoài màn hình thành công!' };
    }

    if (reg && 'showNotification' in reg) {
      await reg.showNotification(testPayload.title, {
        body: testPayload.body,
        icon: './logo.png',
        badge: './logo.png',
        tag: testPayload.tag,
        data: { url: testPayload.targetUrl },
      });
      return { ok: true, message: 'Đã gửi thông báo ra ngoài màn hình thành công!' };
    }

    new Notification(testPayload.title, {
      body: testPayload.body,
      icon: './logo.png',
    });
    return { ok: true, message: 'Đã gửi thông báo ra ngoài màn hình thành công!' };
  } catch (err: any) {
    return { ok: false, message: `Lỗi kích hoạt thông báo: ${err?.message || err}` };
  }
}

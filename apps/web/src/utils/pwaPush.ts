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

export async function registerPwaServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }
  try {
    const swUrl = `${import.meta.env.BASE_URL || './'}sw.js`;
    const registration = await navigator.serviceWorker.register(swUrl);
    return registration;
  } catch (err) {
    console.warn('Không thể đăng ký Service Worker:', err);
    return null;
  }
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
        userId: user?.id || null,
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

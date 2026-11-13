import React, { useEffect, useRef, useState } from 'react';
import {
  checkForAppUpdate,
  getNotificationPermissionState,
  getOrCreatePwaDeviceId,
  onPwaUpdate,
  registerPwaServiceWorker,
  syncAndSubscribePwaPush,
  triggerLocalServiceWorkerNotification,
} from '../utils/pwaPush';
import { Lang } from '../utils/i18n';
import { EventState, TabType, VALID_TABS } from '../components/app/appTypes';

interface UsePwaAndCountdownsParams {
  token: string | null;
  user: any;
  lang: Lang;
  eventState: EventState;
  notifications: any[];
  setNotifications: React.Dispatch<React.SetStateAction<any[]>>;
  onRefreshData: () => void | Promise<void>;
  onNavigateTab: (tab: TabType) => void;
}

const getLastReadNotifKey = (uid?: string | null) => `sr_last_read_notif_${uid || 'guest'}`;

export function usePwaAndCountdowns({
  token,
  user,
  lang,
  eventState,
  notifications,
  setNotifications,
  onRefreshData,
  onNavigateTab,
}: UsePwaAndCountdownsParams) {
  const [midnightCountdown, setMidnightCountdown] = useState<string>('00:00:00');
  const [eventCountdown, setEventCountdown] = useState<string>('');
  const [pwaUpdateReady, setPwaUpdateReady] = useState<boolean>(false);
  const lastServerBootTimeRef = useRef<string | null>(null);
  const lastDbMtimeRef = useRef<number | null>(null);

  const [lastReadNotifTime, setLastReadNotifTime] = useState<number>(() => {
    const saved = localStorage.getItem(getLastReadNotifKey(user?.id));
    return saved ? Number(saved) : 0;
  });

  useEffect(() => {
    const saved = localStorage.getItem(getLastReadNotifKey(user?.id));
    setLastReadNotifTime(saved ? Number(saved) : 0);
  }, [user?.id]);

  const markAllNotifsAsRead = () => {
    const now = Date.now();
    setLastReadNotifTime(now);
    localStorage.setItem(getLastReadNotifKey(user?.id), String(now));
  };

  const unreadNotifCount =
    (user?.id
      ? notifications.filter((n) => new Date(n.deliveredAt).getTime() > lastReadNotifTime).length
      : 0) + (pwaUpdateReady ? 1 : 0);

  // Tự động đếm ngược đến 00:00 mỗi ngày & tự động mở Challenge mới đúng 00:00:00
  useEffect(() => {
    let lastDateNum = new Date().getDate();
    const updateClock = () => {
      const now = new Date();
      const nextMidnight = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,
        0,
        0,
        0,
        0
      );
      const diffSec = Math.max(0, Math.floor((nextMidnight.getTime() - now.getTime()) / 1000));
      const hh = String(Math.floor(diffSec / 3600)).padStart(2, '0');
      const mm = String(Math.floor((diffSec % 3600) / 60)).padStart(2, '0');
      const ss = String(diffSec % 60).padStart(2, '0');
      setMidnightCountdown(`${hh}:${mm}:${ss}`);

      // Khi bước qua 00:00 sang ngày mới -> Tự động mở khóa Challenge tiếp theo và công bố kết quả ngày vừa kết thúc
      if (now.getDate() !== lastDateNum) {
        lastDateNum = now.getDate();
        onRefreshData();
      }
    };
    updateClock();
    const timerId = setInterval(updateClock, 1000);
    return () => clearInterval(timerId);
  }, [token]);

  // Đếm ngược tới ngày sự kiện chính thức bắt đầu (khi Admin hẹn ngày bắt đầu > ngày hiện tại)
  useEffect(() => {
    if (eventState.eventStatus !== 'COUNTDOWN' || !eventState.eventStartAt) {
      setEventCountdown('');
      return;
    }
    const targetMs = new Date(eventState.eventStartAt).getTime();
    let triggeredRefresh = false;

    const tick = () => {
      const diffMs = targetMs - Date.now();
      if (diffMs <= 0) {
        setEventCountdown('00:00:00');
        if (!triggeredRefresh) {
          triggeredRefresh = true;
          onRefreshData();
        }
        return;
      }
      const totalSec = Math.floor(diffMs / 1000);
      const days = Math.floor(totalSec / 86400);
      const hh = String(Math.floor((totalSec % 86400) / 3600)).padStart(2, '0');
      const mm = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
      const ss = String(totalSec % 60).padStart(2, '0');
      if (days > 0) {
        const dayUnit = lang === 'en' ? 'd' : lang === 'ko' ? '일' : ' ngày';
        setEventCountdown(`${days}${dayUnit} ${hh}:${mm}:${ss}`);
      } else {
        setEventCountdown(`${hh}:${mm}:${ss}`);
      }
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [eventState.eventStatus, eventState.eventStartAt, lang]);

  // Khách chưa đăng nhập: tự đồng bộ trạng thái sự kiện mỗi 15s nếu đang chờ bắt đầu
  useEffect(() => {
    if (token || eventState.eventStatus === 'ACTIVE') return;
    const pollId = setInterval(() => {
      onRefreshData();
    }, 15000);
    return () => clearInterval(pollId);
  }, [token, eventState.eventStatus]);

  // Đăng ký Service Worker PWA, đồng bộ cập nhật phiên bản & Nhận thông báo đẩy
  useEffect(() => {
    registerPwaServiceWorker();

    const unsubscribePwaUpdate = onPwaUpdate((hasUpdate) => {
      if (hasUpdate) {
        setPwaUpdateReady(true);
      }
    });

    checkForAppUpdate();

    const isAuthenticated = Boolean(token && user?.id);
    const SEEN_NOTIF_KEY = `sr_seen_notif_${user?.id || 'guest'}`;
    const LAST_POLL_KEY = `sr_last_poll_${user?.id || 'guest'}`;

    const seenIds = (() => {
      try {
        return new Set<string>(JSON.parse(localStorage.getItem(SEEN_NOTIF_KEY) || '[]'));
      } catch {
        return new Set<string>();
      }
    })();

    const saveSeenId = (id: string) => {
      if (!id) return;
      seenIds.add(id);
      try {
        const arr = Array.from(seenIds).slice(-200);
        localStorage.setItem(SEEN_NOTIF_KEY, JSON.stringify(arr));
      } catch {
        // ignore
      }
    };

    const onSwMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data) return;

      if (data.type === 'PWA_PUSH_RECEIVED' && data.payload) {
        if (!isAuthenticated) return;

        const realId = data.payload.notificationId || data.payload.tag || `sw-${Date.now()}`;
        saveSeenId(realId);

        const incomingNotif = {
          id: realId,
          title: data.payload.title || 'SPEAK RIGHT 2026',
          body: data.payload.body || '',
          targetUrl: data.payload.url || '/#challenges',
          type: data.payload.type || 'NEW_TOP_1',
          deliveredAt: new Date().toISOString(),
        };
        setNotifications((prev) =>
          prev.some((item) => item.id === incomingNotif.id) ? prev : [incomingNotif, ...prev]
        );
        onRefreshData();
      } else if (data.type === 'PWA_NOTIFICATION_CLICK' && data.targetUrl) {
        const cleanTab = data.targetUrl.replace(/^.*#/, '').split('/')[0] as TabType;
        if (VALID_TABS.includes(cleanTab)) {
          onNavigateTab(cleanTab);
        }
      }
    };

    navigator.serviceWorker?.addEventListener('message', onSwMessage);

    registerPwaServiceWorker().then(() => {
      if (isAuthenticated && getNotificationPermissionState() === 'granted') {
        syncAndSubscribePwaPush({ user, token, askPermission: false });
      }
    });

    let lastPollTime = (() => {
      if (!isAuthenticated) return 0;
      const saved = Number(localStorage.getItem(LAST_POLL_KEY) || 0);
      return Number.isFinite(saved) && saved > 0 ? saved : 0;
    })();
    let pollTimer: any = null;
    let consecutiveEmpties = 0;
    const deviceId = getOrCreatePwaDeviceId();

    const executePoll = async () => {
      if (!isAuthenticated || !token || !user?.id) return;

      try {
        const res = await fetch(
          `/api/push/poll?since=${lastPollTime}&deviceId=${encodeURIComponent(deviceId)}`,
          {
            headers: { Authorization: `Bearer ${token}` },
            cache: 'no-store',
          }
        );
        if (!res.ok) return;
        const data = await res.json();

        if (data.serverBootTime) {
          if (lastServerBootTimeRef.current && lastServerBootTimeRef.current !== data.serverBootTime) {
            console.log('[PWA Sync] Backend vừa khởi động lại / cập nhật mới. Đang đồng bộ lại dữ liệu...');
            onRefreshData();
          }
          lastServerBootTimeRef.current = data.serverBootTime;
        }
        if (data.dbMtime) {
          if (lastDbMtimeRef.current && lastDbMtimeRef.current !== data.dbMtime) {
            console.log('[PWA Sync] Dữ liệu Backend vừa được cập nhật. Đang đồng bộ lại dữ liệu...');
            onRefreshData();
          }
          lastDbMtimeRef.current = data.dbMtime;
        }

        const notifs = Array.isArray(data.notifications) ? data.notifications : [];
        if (data.serverTime) {
          lastPollTime = data.serverTime;
          try {
            localStorage.setItem(LAST_POLL_KEY, String(data.serverTime));
          } catch {
            // ignore
          }
        }

        if (notifs.length > 0) {
          consecutiveEmpties = 0;
          for (const n of notifs) {
            if (seenIds.has(n.id)) continue;
            saveSeenId(n.id);

            setNotifications((prev) =>
              prev.some((item) => item.id === n.id)
                ? prev
                : [
                    {
                      ...n,
                      deliveredAt: n.deliveredAt || new Date().toISOString(),
                    },
                    ...prev,
                  ]
            );

            triggerLocalServiceWorkerNotification({
              title: n.title,
              body: n.body,
              targetUrl: n.targetUrl || './#challenges',
              type: n.type,
              tag: n.id,
            });

            onRefreshData();
          }
        } else {
          consecutiveEmpties += 1;
        }
      } catch {
        // ignore transient poll error
      }
    };

    const scheduleNextPoll = () => {
      if (pollTimer) clearTimeout(pollTimer);

      let delay = 5000;
      if (typeof document !== 'undefined' && document.hidden) {
        delay = 25000;
      } else if (consecutiveEmpties > 5) {
        delay = 10000;
      }

      pollTimer = setTimeout(async () => {
        await executePoll();
        scheduleNextPoll();
      }, delay);
    };

    const onVisibilityChange = () => {
      if (typeof document !== 'undefined' && !document.hidden) {
        consecutiveEmpties = 0;
        executePoll();
        scheduleNextPoll();
        checkForAppUpdate();
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    scheduleNextPoll();

    const pwaCheckInterval = setInterval(() => {
      checkForAppUpdate();
    }, 3 * 60 * 1000);

    return () => {
      unsubscribePwaUpdate();
      navigator.serviceWorker?.removeEventListener('message', onSwMessage);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (pollTimer) clearTimeout(pollTimer);
      clearInterval(pwaCheckInterval);
    };
  }, [token, user?.id]);

  return {
    midnightCountdown,
    eventCountdown,
    pwaUpdateReady,
    unreadNotifCount,
    markAllNotifsAsRead,
  };
}

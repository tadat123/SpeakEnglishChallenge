import { FastifyInstance } from 'fastify';
import { store } from '../services/store.js';
import { pushService } from '../services/pushNotification.js';

export function registerPushAndEventRoutes(app: FastifyInstance, serverBootTime: string) {
  app.get('/api/push/vapid-public-key', async () => ({
    publicKey: pushService.getVapidPublicKey(),
  }));

  app.post('/api/push/subscribe', async (request: any, reply) => {
    const body = (request.body || {}) as {
      subscription?: { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
      deviceId?: string | null;
      employeeId?: string | null;
      fullName?: string | null;
      isPwaInstalled?: boolean;
      userAgent?: string;
    };

    let authUserId: string | null = null;
    try {
      await request.jwtVerify();
      if (request.user?.sub) authUserId = request.user.sub;
    } catch {}

    if (!authUserId) {
      return reply.code(401).send({
        message: 'Vui lòng đăng nhập tài khoản trước khi bật thông báo.',
        ignored: true,
      });
    }

    const endpoint =
      body.subscription?.endpoint ||
      `https://pwa-client.speakright.local/device/${authUserId}${body.deviceId ? `-${body.deviceId}` : ''}`;

    const record = store.upsertPwaSubscription({
      endpoint,
      keys: body.subscription?.keys,
      userId: authUserId,
      deviceId: body.deviceId || null,
      employeeId: body.employeeId || null,
      fullName: body.fullName || null,
      isPwaInstalled: body.isPwaInstalled ?? true,
      userAgent: body.userAgent || (request.headers['user-agent'] as string) || 'PWA Standalone',
    });

    return reply.send({
      message: 'Đã kích hoạt nhận thông báo PWA thành công!',
      subscription: record,
    });
  });

  app.post('/api/push/unsubscribe', async (request: any) => {
    const { endpoint, deviceId } = (request.body || {}) as { endpoint?: string; deviceId?: string | null };
    let authUserId: string | null = null;
    try {
      await request.jwtVerify();
      if (request.user?.sub) authUserId = request.user.sub;
    } catch {}
    store.unbindDeviceSubscriptions(authUserId, endpoint || null, deviceId || null);
    return { message: 'Đã tắt nhận thông báo PWA trên thiết bị này.' };
  });

  app.get('/api/push/poll', async (request: any, reply: any) => {
    const since = Number(request.query?.since || 0);
    const deviceId = (request.query?.deviceId as string) || null;

    let authUserId: string | null = null;
    try {
      await request.jwtVerify();
      if (request.user?.sub) authUserId = request.user.sub;
    } catch {}

    reply.header('Cache-Control', 'no-store');

    if (!authUserId) {
      return {
        notifications: [],
        serverTime: Date.now(),
        serverBootTime,
        dbMtime: store.getLastMtime(),
      };
    }

    const lastNotifTime = store.getLastNotificationTimestamp();
    if (since > 0 && since >= lastNotifTime) {
      reply.header('X-Notif-Cache', 'HIT-EMPTY');
      return {
        notifications: [],
        serverTime: Date.now(),
        serverBootTime,
        dbMtime: store.getLastMtime(),
      };
    }

    const notifications = store.getRecentInAppNotifications(authUserId, since, {
      forPushPoll: true,
      deviceId,
    });

    if (notifications.length > 0) {
      store.markNotificationsDelivered(
        notifications.map((n) => n.id),
        authUserId,
        deviceId
      );
    }

    return {
      notifications,
      serverTime: Date.now(),
      serverBootTime,
      dbMtime: store.getLastMtime(),
    };
  });

  app.get('/api/notifications', async (request: any, reply: any) => {
    let userId: string | null = null;
    try {
      await request.jwtVerify();
      if (request.user?.sub) userId = request.user.sub;
    } catch {}

    reply.header('Cache-Control', 'no-store');

    if (!userId) {
      return { notifications: [], total: 0, serverTime: Date.now() };
    }

    const list = store.getRecentInAppNotifications(userId, 0);
    const sorted = [...list]
      .sort((a, b) => new Date(b.deliveredAt).getTime() - new Date(a.deliveredAt).getTime())
      .slice(0, 50);

    return { notifications: sorted, total: sorted.length, serverTime: Date.now() };
  });

  app.get(
    '/api/admin/push/status',
    { preHandler: [(app as any).requireAdmin] },
    async () => {
      const pwaSubs = store.getPwaSubscriptions(true);
      const unstudiedList = store.getUnstudiedAccountsWithPwa();
      const leaderboard = store.getLeaderboard();
      const latestDay = store.getLatestUnlockedChallenge();

      return {
        vapidPublicKey: pushService.getVapidPublicKey(),
        queueStatus: pushService.getQueueStatus(),
        stats: {
          totalPwaDevices: pwaSubs.length,
          unstudiedAccountsCount: unstudiedList.length,
          unstudiedAccounts: unstudiedList.map((item) => ({
            id: item.user.id,
            employeeId: item.user.employeeId,
            fullName: item.user.fullName,
            completedDays: item.user.completedDays,
            totalScore: item.user.totalScore,
            targetDayNumber: item.targetDay.dayNumber,
            targetDayTitle: item.targetDay.title,
            neverStudiedAnyDay: item.neverStudiedAnyDay,
            pwaDevicesCount: item.subscriptions.length,
          })),
          currentTop1: leaderboard[0] || null,
          latestUnlockedDay: {
            dayNumber: latestDay.dayNumber,
            title: latestDay.title,
            dateLabel: latestDay.dateLabel,
          },
        },
        subscriptions: pwaSubs,
        campaigns: store.getPushCampaigns(),
      };
    }
  );

  app.put(
    '/api/admin/push/config',
    { preHandler: [(app as any).requireAdmin] },
    async (request: any) => {
      const body = (request.body || {}) as {
        spreadWindowSeconds?: number;
        minIntervalMs?: number;
        maxIntervalMs?: number;
        autoRemindUnstudied?: boolean;
        morningHour?: number;
        morningMinute?: number;
        eveningTop1Hour?: number;
        eveningTop1Minute?: number;
        nightUnstudiedHour?: number;
        nightUnstudiedMinute?: number;
        resetTodayQuota?: boolean;
      };

      const updated = store.updatePushConfig({
        ...(body.spreadWindowSeconds !== undefined
          ? { spreadWindowSeconds: Math.max(3, Math.min(3600, Number(body.spreadWindowSeconds))) }
          : {}),
        ...(body.minIntervalMs !== undefined
          ? { minIntervalMs: Math.max(200, Math.min(30000, Number(body.minIntervalMs))) }
          : {}),
        ...(body.maxIntervalMs !== undefined
          ? { maxIntervalMs: Math.max(500, Math.min(60000, Number(body.maxIntervalMs))) }
          : {}),
        ...(body.autoRemindUnstudied !== undefined
          ? { autoRemindUnstudied: Boolean(body.autoRemindUnstudied) }
          : {}),
        ...(body.morningHour !== undefined
          ? { morningHour: Math.max(0, Math.min(23, Number(body.morningHour))) }
          : {}),
        ...(body.morningMinute !== undefined
          ? { morningMinute: Math.max(0, Math.min(59, Number(body.morningMinute))) }
          : {}),
        ...(body.eveningTop1Hour !== undefined
          ? { eveningTop1Hour: Math.max(0, Math.min(23, Number(body.eveningTop1Hour))) }
          : {}),
        ...(body.eveningTop1Minute !== undefined
          ? { eveningTop1Minute: Math.max(0, Math.min(59, Number(body.eveningTop1Minute))) }
          : {}),
        ...(body.nightUnstudiedHour !== undefined
          ? { nightUnstudiedHour: Math.max(0, Math.min(23, Number(body.nightUnstudiedHour))) }
          : {}),
        ...(body.nightUnstudiedMinute !== undefined
          ? { nightUnstudiedMinute: Math.max(0, Math.min(59, Number(body.nightUnstudiedMinute))) }
          : {}),
        ...(body.resetTodayQuota
          ? {
              lastMorningNotifiedDate: null,
              lastEveningTop1NotifiedDate: null,
              lastNightUnstudiedNotifiedDate: null,
            }
          : {}),
      });

      const mTime = `${String(updated.morningHour).padStart(2, '0')}:${String(updated.morningMinute || 0).padStart(2, '0')}`;
      const eTime = `${String(updated.eveningTop1Hour).padStart(2, '0')}:${String(updated.eveningTop1Minute || 0).padStart(2, '0')}`;
      const nTime = `${String(updated.nightUnstudiedHour).padStart(2, '0')}:${String(updated.nightUnstudiedMinute || 0).padStart(2, '0')}`;

      return {
        message: `Đã lưu cấu hình lịch thông báo tự động (${mTime} TOP 1 & Bài mới • ${eTime} Khen ngợi • ${nTime} Cảnh báo chưa làm bài) & chia đều ${updated.spreadWindowSeconds}s!`,
        config: updated,
      };
    }
  );

  app.post(
    '/api/admin/push/trigger',
    { preHandler: [(app as any).requireAdmin] },
    async (request: any, reply) => {
      const { type, dayNumber, force } = (request.body || {}) as {
        type: 'NEW_DAY_UNLOCKED' | 'NEW_TOP_1' | 'UNSTUDIED_REMINDER';
        dayNumber?: number;
        force?: boolean;
      };

      const qStatus = pushService.getQueueStatus();

      if (type === 'NEW_DAY_UNLOCKED') {
        if (qStatus.sentToday.morningNewDay && !force) {
          return reply.status(429).send({
            alreadySentToday: true,
            message:
              '🛡️ Chống spam: Hôm nay đã gửi thông báo "07:00 TOP 1 lộ diện & Bài thi mới mở" (1 lần/ngày) rồi! Bấm "Gửi lại (Force)" nếu bạn vẫn muốn phát thêm.',
          });
        }
        const targetDay =
          (dayNumber ? store.getChallengeByDay(Number(dayNumber)) : undefined) ||
          store.getLatestUnlockedChallenge();
        const campaign = pushService.enqueueNewDayUnlocked(targetDay);
        return {
          message: `🔥 Đã phát thông báo 07:00 sáng: "TOP 1 đã lộ diện – Bài thi mới đã mở!" (${targetDay.title}) tới quả chuông 🔔 & ${campaign.totalTargets} thiết bị PWA!`,
          campaign,
        };
      }

      if (type === 'NEW_TOP_1') {
        if (qStatus.sentToday.evening19hTop1 && !force) {
          return reply.status(429).send({
            alreadySentToday: true,
            message:
              '🛡️ Chống spam: Hôm nay đã gửi thông báo "19:00 Khen ngợi" (1 lần/ngày) rồi! Bấm "Gửi lại (Force)" nếu bạn vẫn muốn phát thêm.',
          });
        }
        const lb = store.getLeaderboard();
        const top1 = lb.find((u) => u.totalScore > 0) || lb[0] || null;
        const top2 = lb[1] || null;
        const campaign = pushService.enqueueNewTop1(top1, top2);
        return {
          message: `🌟 Đã phát bản tin Khen ngợi 19:00 tới quả chuông 🔔 & ${campaign.totalTargets} thiết bị PWA!`,
          campaign,
        };
      }

      if (type === 'UNSTUDIED_REMINDER') {
        if (qStatus.sentToday.night23hUnstudied && !force) {
          return reply.status(429).send({
            alreadySentToday: true,
            message:
              '🛡️ Chống spam: Hôm nay đã gửi thông báo "21:00 Cảnh báo chưa làm bài" (1 lần/ngày) rồi! Bấm "Gửi lại (Force)" nếu bạn vẫn muốn phát thêm.',
          });
        }
        const unstudiedCount = store.getUnstudiedAccountsWithPwa().length;
        const campaign = pushService.enqueueUnstudiedAccountsReminder();
        return {
          message:
            unstudiedCount > 0
              ? `⚠️ Đã gửi cảnh báo 21:00 tới ${unstudiedCount} tài khoản USER chưa làm bài (quả chuông 🔔 & ${campaign.totalTargets} thiết bị PWA)!`
              : '🎉 Tuyệt vời! Tất cả tài khoản USER đều đã hoàn thành bài thi hôm nay.',
          campaign,
        };
      }

      return reply.status(400).send({ message: 'Loại thông báo Push không hợp lệ.' });
    }
  );

  // Events CRUD & visibility endpoints
  app.get('/api/public/events', async (_request, reply) => {
    reply.header('Cache-Control', 'no-store, no-cache, must-revalidate');
    return { events: store.getEvents(true) };
  });

  app.get('/api/events', async (request: any, reply) => {
    reply.header('Cache-Control', 'no-store, no-cache, must-revalidate');
    let isAdmin = false;
    try {
      const authHeader = request.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const decoded: any = app.jwt.verify(authHeader.substring(7));
        if (decoded && decoded.role === 'ADMIN') isAdmin = true;
      }
    } catch {}
    return { events: store.getEvents(!isAdmin) };
  });

  app.get('/api/admin/events', { preHandler: [(app as any).requireAdmin] }, async (_request, reply) => {
    reply.header('Cache-Control', 'no-store, no-cache, must-revalidate');
    return { events: store.getEvents(false) };
  });

  app.post(
    '/api/admin/events',
    { bodyLimit: 15 * 1024 * 1024, preHandler: [(app as any).requireAdmin] },
    async (request: any, reply) => {
      const body = request.body || {};
      if (!body.titleA && !body.titleC) {
        return reply.status(400).send({ message: 'Vui lòng nhập tiêu đề sự kiện.' });
      }
      const newEvent = store.createEvent(body);
      return {
        message: 'Đã tạo sự kiện mới thành công!',
        event: newEvent,
        events: store.getEvents(false),
      };
    }
  );

  app.put(
    '/api/admin/events/:id',
    { bodyLimit: 15 * 1024 * 1024, preHandler: [(app as any).requireAdmin] },
    async (request: any, reply) => {
      const updated = store.updateEvent(request.params.id, request.body || {});
      if (!updated) {
        return reply.status(404).send({ message: 'Không tìm thấy sự kiện cần cập nhật.' });
      }
      return {
        message: 'Đã cập nhật thông tin sự kiện thành công!',
        event: updated,
        events: store.getEvents(false),
      };
    }
  );

  const toggleEventHandler = async (request: any, reply: any) => {
    const updated = store.toggleEventVisibility(request.params.id);
    if (!updated) {
      return reply.status(404).send({ message: 'Không tìm thấy sự kiện cần đổi trạng thái.' });
    }
    return {
      message: updated.isVisible
        ? `Đã MỞ hiển thị sự kiện "${updated.titleA} ${updated.titleC}" cho học viên!`
        : `Đã ẨN sự kiện "${updated.titleA} ${updated.titleC}" khỏi giao diện học viên!`,
      event: updated,
      events: store.getEvents(false),
    };
  };

  app.patch('/api/admin/events/:id/toggle', { preHandler: [(app as any).requireAdmin] }, toggleEventHandler);
  app.post('/api/admin/events/:id/toggle', { preHandler: [(app as any).requireAdmin] }, toggleEventHandler);

  app.delete('/api/admin/events/:id', { preHandler: [(app as any).requireAdmin] }, async (request: any, reply) => {
    const success = store.deleteEvent(request.params.id);
    if (!success) {
      return reply.status(404).send({ message: 'Không tìm thấy sự kiện cần xóa.' });
    }
    return { message: 'Đã xóa sự kiện thành công!', events: store.getEvents(false) };
  });

  app.post('/api/admin/events/reset', { preHandler: [(app as any).requireAdmin] }, async () => ({
    message: 'Đã khôi phục 3 sự kiện mẫu ban đầu của Speak Right 2026 thành công!',
    events: store.resetEventsToDefault(),
  }));
}

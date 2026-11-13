import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import webpush from 'web-push';
import {
  store,
  PushNotificationType,
  ALLOWED_NOTIFICATION_TYPES,
  PwaPushSubscriptionRecord,
  PushCampaignRecord,
} from './store.js';
import { DailyChallengeItem } from './seedData.js';

interface VapidKeysFile {
  publicKey: string;
  privateKey: string;
}

interface QueuedPushTask {
  campaignId: string;
  notificationId?: string;
  subscription: PwaPushSubscriptionRecord;
  type: PushNotificationType;
  userId: string | null;
  recipientName: string;
  employeeId: string;
  title: string;
  body: string;
  targetUrl: string;
  orderIndex: number;
  totalInCampaign: number;
  delayAfterMs: number;
}

const resolveDataDir = () => {
  const fromRepoRoot = path.resolve(process.cwd(), 'apps', 'api', 'data');
  if (fs.existsSync(path.resolve(process.cwd(), 'apps', 'api'))) {
    return fromRepoRoot;
  }
  return path.resolve(process.cwd(), 'data');
};

const DATA_DIR = resolveDataDir();
const VAPID_FILE = path.join(DATA_DIR, 'vapid.json');

function loadOrCreateVapidKeys(): VapidKeysFile {
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    return {
      publicKey: process.env.VAPID_PUBLIC_KEY,
      privateKey: process.env.VAPID_PRIVATE_KEY,
    };
  }

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (fs.existsSync(VAPID_FILE)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(VAPID_FILE, 'utf-8')) as VapidKeysFile;
      if (parsed.publicKey && parsed.privateKey) {
        return parsed;
      }
    } catch {
      // regenerate below
    }
  }

  const generated = webpush.generateVAPIDKeys();
  const keys: VapidKeysFile = {
    publicKey: generated.publicKey,
    privateKey: generated.privateKey,
  };
  fs.writeFileSync(VAPID_FILE, JSON.stringify(keys, null, 2), 'utf-8');
  return keys;
}

const vapidKeys = loadOrCreateVapidKeys();
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:admin.speakright@gmail.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getVietnamDateAndHour(): {
  dateKey: string;
  hour: number;
  minute: number;
} {
  const now = new Date();
  // Tính theo múi giờ Việt Nam (UTC+7)
  const vnTime = new Date(now.getTime() + (7 * 60 + now.getTimezoneOffset()) * 60000);
  const yyyy = vnTime.getFullYear();
  const mm = String(vnTime.getMonth() + 1).padStart(2, '0');
  const dd = String(vnTime.getDate()).padStart(2, '0');
  return {
    dateKey: `${yyyy}-${mm}-${dd}`,
    hour: vnTime.getHours(),
    minute: vnTime.getMinutes(),
  };
}

class StaggeredPushService {
  private pendingQueue: QueuedPushTask[] = [];
  private isProcessing = false;
  private schedulerTimer: NodeJS.Timeout | null = null;

  public getVapidPublicKey(): string {
    return vapidKeys.publicKey;
  }

  public getQueueStatus() {
    const { dateKey, hour, minute } = getVietnamDateAndHour();
    const cfg = store.getPushConfig();
    return {
      isProcessing: this.isProcessing,
      pendingRequestsCount: this.pendingQueue.length,
      currentVnDate: dateKey,
      currentVnTime: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
      sentToday: {
        morningNewDay: cfg.lastMorningNotifiedDate === dateKey,
        evening19hTop1: cfg.lastEveningTop1NotifiedDate === dateKey,
        night23hUnstudied: cfg.lastNightUnstudiedNotifiedDate === dateKey,
      },
      config: cfg,
    };
  }

  /**
   * Tính khoảng cách thời gian (ms) chia đều giữa các request
   * để đảm bảo KHÔNG gửi dồn cùng một lúc mà rải đều theo từng nhịp.
   */
  public computeStaggerIntervalMs(totalRecipients: number): number {
    if (totalRecipients <= 1) return 0;
    const cfg = store.getPushConfig();
    const totalWindowMs = Math.max(3000, cfg.spreadWindowSeconds * 1000);
    const rawInterval = Math.floor(totalWindowMs / totalRecipients);
    return Math.max(cfg.minIntervalMs, Math.min(cfg.maxIntervalMs, rawInterval));
  }

  /**
   * KHUNG 1 — 07:00 SÁNG (1 LẦN/NGÀY):
   * "🔥 TOP 1 đã lộ diện – Bài thi mới đã mở!"
   * "🏆 Chúc mừng [Tên] đã xuất sắc dẫn đầu bảng xếp hạng hiện tại! Bài thi mới đã mở, nhanh tay vào chiến thôi, chậm một giây là đối thủ vượt mặt mất rồi! 😆⚡"
   */
  public enqueueNewDayUnlocked(challenge: DailyChallengeItem): PushCampaignRecord {
    const { dateKey } = getVietnamDateAndHour();
    // Chỉ gửi Web Push tới các thiết bị PWA đã đăng nhập tài khoản (không gửi cho khách vãng lai)
    const pwaSubs = store.getPwaSubscriptions(true).filter((s) => Boolean(s.userId));
    const leaderboard = store.getLeaderboard();
    const top1 = leaderboard.find((u) => u.totalScore > 0) || leaderboard[0] || null;

    const title = `🔥 TOP 1 đã lộ diện – Bài thi mới đã mở!`;
    const body = top1
      ? `🏆 Chúc mừng ${top1.fullName} đã xuất sắc dẫn đầu bảng xếp hạng hiện tại! Bài thi mới đã mở, nhanh tay vào chiến thôi, chậm một giây là đối thủ vượt mặt mất rồi! 😆⚡`
      : `🏆 Bài thi mới (${challenge.title}) đã mở, nhanh tay vào chiến thôi, chậm một giây là đối thủ vượt mặt mất rồi! 😆⚡`;
    const targetUrl = '/#challenges';

    const campaignId = `camp-morning-${Date.now()}`;
    const notificationId = `notif-morning-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`;

    // Luôn lưu thông báo vào quả chuông 🔔 trên web cho người dùng đã đăng nhập
    store.addInAppNotification({
      id: notificationId,
      campaignId,
      type: 'NEW_DAY_UNLOCKED',
      userId: null,
      title,
      body,
      targetUrl,
      deliveredAt: new Date().toISOString(),
    });

    const tasks = pwaSubs.map((sub) => ({
      notificationId,
      subscription: sub,
      userId: sub.userId,
      recipientName: sub.fullName || 'Người dùng PWA',
      employeeId: sub.employeeId || 'PWA',
      title,
      body,
      targetUrl,
    }));

    const cfg = store.getPushConfig();
    store.updatePushConfig({
      lastMorningNotifiedDate: dateKey,
      notifiedUnlockedDays: cfg.notifiedUnlockedDays.includes(challenge.dayNumber)
        ? cfg.notifiedUnlockedDays
        : [...cfg.notifiedUnlockedDays, challenge.dayNumber],
    });

    return this.createAndDispatchStaggeredCampaign(
      'NEW_DAY_UNLOCKED',
      title,
      body,
      targetUrl,
      tasks
    );
  }

  /**
   * KHUNG 2 — 19:00 TỐI (1 LẦN/NGÀY): Bản tin Khen ngợi
   * Tuyên dương các thành viên đã hoàn thành bài thi hôm nay & khen ngợi Top dẫn đầu BXH.
   */
  public enqueueNewTop1(
    currentTop1?: { id: string; fullName: string; employeeId: string; totalScore: number } | null,
    runnerUp?: { id: string; fullName: string; employeeId: string; totalScore: number } | null
  ): PushCampaignRecord {
    const { dateKey } = getVietnamDateAndHour();
    // Chỉ gửi Web Push tới thiết bị PWA gắn với tài khoản thật
    const pwaSubs = store.getPwaSubscriptions(true).filter((s) => Boolean(s.userId));
    const latestDay = store.getLatestUnlockedChallenge();
    const completedList = store.getCompletedAccountsForCurrentDay();
    const completedUserIds = new Set(completedList.map((c) => c.user.id));

    const title = `🌟 Bản tin Khen ngợi 19:00 – Tinh thần học tập xuất sắc!`;
    const body =
      currentTop1 && completedList.length > 0
        ? `👏 Tuyên dương ${completedList.length} thành viên đã hoàn thành xuất sắc ${latestDay.title} hôm nay! 🏆 Chúc mừng ${currentTop1.fullName} đang dẫn đầu BXH (${currentTop1.totalScore.toLocaleString()} điểm)${runnerUp && runnerUp.id !== currentTop1.id ? `, theo sát là ${runnerUp.fullName}` : ''}. Tiếp tục giữ vững phong độ nhé! ✨🔥`
        : currentTop1
        ? `👏 Tuyên dương tinh thần học tập tuyệt vời hôm nay! 🏆 Chúc mừng ${currentTop1.fullName} (GEN ${currentTop1.employeeId}) đang dẫn đầu BXH với ${currentTop1.totalScore.toLocaleString()} điểm. Hãy tiếp tục bứt phá nhé! ✨🔥`
        : `👏 Bản tin Khen ngợi 19:00: Tuyên dương các thành viên chăm chỉ rèn luyện tại Speak Right 2026! Hãy tiếp tục giữ vững phong độ mỗi ngày nhé! 🏆✨`;
    const targetUrl = '/#leaderboard';
    const campaignId = `camp-praise-${Date.now()}`;
    const broadcastNotifId = `notif-praise-all-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`;

    const inAppList: any[] = [
      {
        id: broadcastNotifId,
        campaignId,
        type: 'NEW_TOP_1',
        userId: null,
        excludedUserIds: Array.from(completedUserIds),
        title,
        body,
        targetUrl,
        deliveredAt: new Date().toISOString(),
      },
    ];

    const tasks: {
      notificationId?: string;
      subscription: PwaPushSubscriptionRecord;
      userId: string | null;
      recipientName: string;
      employeeId: string;
      title: string;
      body: string;
      targetUrl: string;
    }[] = [];

    // Gửi lời khen ngợi cá nhân hóa cho từng thành viên đã hoàn thành bài thi hôm nay
    for (const item of completedList) {
      const personalTitle = `🌟 Khen ngợi ${item.user.fullName} đã hoàn thành xuất sắc ${item.targetDay.title}!`;
      const personalBody = `👏 Chúc mừng ${item.user.fullName} (GEN ${item.user.employeeId}) đã chinh phục ${item.targetDay.title} (đạt ${item.attemptScore} điểm)! Tổng điểm tích lũy của bạn là ${item.user.totalScore} điểm. Hãy tiếp tục giữ vững phong độ tuyệt vời này nhé! 🏆🔥`;
      const personalNotifId = `notif-praise-${Date.now()}-${item.user.id}-${crypto.randomBytes(2).toString('hex')}`;

      inAppList.push({
        id: personalNotifId,
        campaignId,
        type: 'NEW_TOP_1',
        userId: item.user.id,
        title: personalTitle,
        body: personalBody,
        targetUrl,
        deliveredAt: new Date().toISOString(),
      });

      for (const sub of item.subscriptions) {
        if (!sub.userId) continue;
        tasks.push({
          notificationId: personalNotifId,
          subscription: sub,
          userId: item.user.id,
          recipientName: item.user.fullName,
          employeeId: item.user.employeeId,
          title: personalTitle,
          body: personalBody,
          targetUrl,
        });
      }
    }

    // Các thiết bị PWA khác nhận bản tin Khen ngợi chung
    for (const sub of pwaSubs) {
      if (!sub.userId) continue;
      if (completedUserIds.has(sub.userId)) continue;
      tasks.push({
        notificationId: broadcastNotifId,
        subscription: sub,
        userId: sub.userId,
        recipientName: sub.fullName || 'Người dùng PWA',
        employeeId: sub.employeeId || 'PWA',
        title,
        body,
        targetUrl,
      });
    }

    store.addBatchInAppNotifications(inAppList);

    store.updatePushConfig({
      lastEveningTop1NotifiedDate: dateKey,
      lastTop1UserId: currentTop1?.id || null,
    });

    return this.createAndDispatchStaggeredCampaign(
      'NEW_TOP_1',
      title,
      body,
      targetUrl,
      tasks
    );
  }

  /**
   * KHUNG 3 — 21:00 TỐI (1 LẦN/NGÀY): Cảnh báo với ai chưa làm bài
   * Gửi thông báo cá nhân hóa vào quả chuông 🔔 + Web Push tới các tài khoản USER chưa hoàn thành bài thi hôm nay.
   */
  public enqueueUnstudiedAccountsReminder(): PushCampaignRecord {
    const { dateKey } = getVietnamDateAndHour();
    const unstudiedList = store.getUnstudiedAccountsWithPwa();
    const latestDay = store.getLatestUnlockedChallenge();

    const summaryTitle = `⚠️ Cảnh báo 21:00: ${unstudiedList.length} thành viên chưa làm ${latestDay.title}`;
    const summaryBody = `Thông báo cảnh báo lúc 21:00 gửi tới ${unstudiedList.length} tài khoản USER chưa hoàn thành ${latestDay.title} trước giờ đóng đề 00:00.`;
    const targetUrl = '/#challenges';
    const campaignId = `camp-warn-${Date.now()}`;

    const tasks: {
      notificationId?: string;
      subscription: PwaPushSubscriptionRecord;
      userId: string | null;
      recipientName: string;
      employeeId: string;
      title: string;
      body: string;
      targetUrl: string;
    }[] = [];

    const inAppList: any[] = [];

    for (const item of unstudiedList) {
      const personalTitle = `⚠️ Cảnh báo 21:00: ${item.user.fullName} ơi, bạn chưa làm bài thi hôm nay!`;

      const personalBody = item.neverStudiedAnyDay
        ? `⏰ Đã 21:00 rồi! Tài khoản ${item.user.fullName} (GEN ${item.user.employeeId}) vẫn chưa làm bài thi nào. ${item.targetDay.title} sẽ đóng lúc 00:00 đêm nay, nhanh tay vào làm ngay kẻo lỡ chuỗi điểm nhé! 🔥⚡`
        : `⏰ Đã 21:00 rồi! Chào ${item.user.fullName} (GEN ${item.user.employeeId}), bạn vẫn chưa hoàn thành ${item.targetDay.title}. Bài thi sẽ đóng lúc 00:00 đêm nay, nhanh tay vào chiến ngay kẻo đối thủ bỏ xa nhé! 🔥⚡`;

      const personalNotifId = `notif-warn-${Date.now()}-${item.user.id}-${crypto.randomBytes(2).toString('hex')}`;
      inAppList.push({
        id: personalNotifId,
        campaignId,
        type: 'UNSTUDIED_REMINDER',
        userId: item.user.id,
        title: personalTitle,
        body: personalBody,
        targetUrl,
        deliveredAt: new Date().toISOString(),
      });

      for (const sub of item.subscriptions) {
        if (!sub.userId) continue;
        tasks.push({
          notificationId: personalNotifId,
          subscription: sub,
          userId: item.user.id,
          recipientName: item.user.fullName,
          employeeId: item.user.employeeId,
          title: personalTitle,
          body: personalBody,
          targetUrl,
        });
      }
    }

    if (inAppList.length > 0) {
      store.addBatchInAppNotifications(inAppList);
    }

    store.updatePushConfig({
      lastNightUnstudiedNotifiedDate: dateKey,
    });

    return this.createAndDispatchStaggeredCampaign(
      'UNSTUDIED_REMINDER',
      summaryTitle,
      summaryBody,
      targetUrl,
      tasks
    );
  }

  /**
   * SOẠN & GỬI THÔNG BÁO CÁ NHÂN HÓA (PUSH & IN-APP)
   * Đồng thời tạo In-App Notification VÀ dispatch Web Push tới tất cả thiết bị PWA của người nhận.
   */
  public enqueuePersonalizedNotification(payload: {
    targetType: 'all' | 'user';
    targetValue?: string;
    notifType?: PushNotificationType;
    title: string;
    body: string;
    targetUrl?: string;
  }): {
    success: boolean;
    message: string;
    sentCount: number;
    pwaDevicesCount: number;
    campaign?: PushCampaignRecord;
  } {
    let targets: any[] = [];
    const allUsers = store.getUsers();
    const resolvedType: PushNotificationType = ALLOWED_NOTIFICATION_TYPES.has(payload.notifType || '')
      ? (payload.notifType as PushNotificationType)
      : 'NEW_TOP_1';

    if (payload.targetType === 'user') {
      if (!payload.targetValue) {
        return {
          success: false,
          message: 'Vui lòng chọn một nhân viên cụ thể.',
          sentCount: 0,
          pwaDevicesCount: 0,
        };
      }
      const u = allUsers.find(
        (user) => user.id === payload.targetValue || user.employeeId === payload.targetValue
      );
      if (!u) {
        return {
          success: false,
          message: 'Không tìm thấy nhân viên được chỉ định.',
          sentCount: 0,
          pwaDevicesCount: 0,
        };
      }
      targets = [u];
    } else {
      targets = allUsers;
    }

    if (targets.length === 0) {
      return {
        success: false,
        message: 'Không có nhân viên nào trong danh sách nhận thông báo.',
        sentCount: 0,
        pwaDevicesCount: 0,
      };
    }

    const campaignId = `camp-custom-${Date.now()}`;
    const targetUrl = payload.targetUrl || '/#challenges';
    const allPwaSubs = store.getPwaSubscriptions(true).filter((s) => Boolean(s.userId));

    const tasks: {
      notificationId?: string;
      subscription: PwaPushSubscriptionRecord;
      userId: string | null;
      recipientName: string;
      employeeId: string;
      title: string;
      body: string;
      targetUrl: string;
    }[] = [];

    const inAppList: any[] = [];

    targets.forEach((user) => {
      const personalTitle = payload.title
        .replace(/\{name\}/gi, user.fullName)
        .replace(/\{gen\}/gi, user.employeeId)
        .replace(/\{score\}/gi, String(user.totalScore || 0));

      const personalBody = payload.body
        .replace(/\{name\}/gi, user.fullName)
        .replace(/\{gen\}/gi, user.employeeId)
        .replace(/\{score\}/gi, String(user.totalScore || 0));

      const personalNotifId = `inapp-${Date.now()}-${user.id}-${crypto.randomBytes(2).toString('hex')}`;
      inAppList.push({
        id: personalNotifId,
        campaignId,
        type: resolvedType,
        userId: user.id,
        title: personalTitle,
        body: personalBody,
        targetUrl,
        deliveredAt: new Date().toISOString(),
      });

      // Tìm thiết bị PWA của user này
      const userSubs = allPwaSubs.filter(
        (s) => s.userId === user.id || (s.employeeId && s.employeeId === user.employeeId)
      );

      for (const sub of userSubs) {
        tasks.push({
          notificationId: personalNotifId,
          subscription: sub,
          userId: user.id,
          recipientName: user.fullName,
          employeeId: user.employeeId,
          title: personalTitle,
          body: personalBody,
          targetUrl,
        });
      }
    });

    // Thêm đồng loạt In-App Notification (ghi file 1 lần duy nhất)
    store.addBatchInAppNotifications(inAppList);

    // Kích hoạt hàng đợi Web Push nếu có thiết bị PWA
    let campaign: PushCampaignRecord;
    if (tasks.length > 0) {
      campaign = this.createAndDispatchStaggeredCampaign(
        resolvedType,
        payload.title,
        payload.body,
        targetUrl,
        tasks,
        true // Gửi thủ công từ Admin CMS -> Dispatch tốc độ cao (150ms/request)
      );
    } else {
      campaign = {
        id: campaignId,
        type: resolvedType,
        title: payload.title,
        body: payload.body,
        targetUrl,
        totalTargets: 0,
        sentCount: 0,
        successCount: 0,
        failedCount: 0,
        staggerIntervalMs: 0,
        totalSpreadMs: 0,
        status: 'COMPLETED',
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        recentLogs: [],
      };
      store.addPushCampaign(campaign);
    }

    console.log(
      `[PERSONALIZED NOTIF] 📢 Đã gửi thông báo cá nhân hóa tới ${targets.length} nhân viên (${tasks.length} thiết bị PWA)`
    );

    return {
      success: true,
      message: `Đã gửi thành công thông báo cá nhân hóa tới ${targets.length} nhân viên (${tasks.length} thiết bị PWA)!`,
      sentCount: targets.length,
      pwaDevicesCount: tasks.length,
      campaign,
    };
  }

  private createAndDispatchStaggeredCampaign(
    type: PushNotificationType,
    title: string,
    body: string,
    targetUrl: string,
    rawTasks: {
      notificationId?: string;
      subscription: PwaPushSubscriptionRecord;
      userId: string | null;
      recipientName: string;
      employeeId: string;
      title: string;
      body: string;
      targetUrl: string;
    }[],
    isManualAdmin = false
  ): PushCampaignRecord {
    const totalTargets = rawTasks.length;
    const staggerIntervalMs = isManualAdmin
      ? (totalTargets <= 1 ? 0 : 150)
      : this.computeStaggerIntervalMs(totalTargets);
    const totalSpreadMs = Math.max(0, (totalTargets - 1) * staggerIntervalMs);

    const campaign: PushCampaignRecord = {
      id: `camp-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
      type,
      title,
      body,
      targetUrl,
      totalTargets,
      sentCount: 0,
      successCount: 0,
      failedCount: 0,
      staggerIntervalMs,
      totalSpreadMs,
      status: totalTargets === 0 ? 'COMPLETED' : 'QUEUED',
      createdAt: new Date().toISOString(),
      completedAt: totalTargets === 0 ? new Date().toISOString() : null,
      recentLogs: [],
    };

    store.addPushCampaign(campaign);

    console.log(
      `[PUSH QUEUE] 🚀 Khởi tạo chiến dịch [${type}] "${title}" cho ${totalTargets} thiết bị | Chia đều: ${staggerIntervalMs}ms/request (Tổng thời gian: ${(totalSpreadMs / 1000).toFixed(1)}s)`
    );

    if (totalTargets === 0) {
      return campaign;
    }

    rawTasks.forEach((t, idx) => {
      this.pendingQueue.push({
        campaignId: campaign.id,
        notificationId: t.notificationId,
        subscription: t.subscription,
        type,
        userId: t.userId,
        recipientName: t.recipientName,
        employeeId: t.employeeId,
        title: t.title,
        body: t.body,
        targetUrl: t.targetUrl,
        orderIndex: idx + 1,
        totalInCampaign: totalTargets,
        delayAfterMs: idx < totalTargets - 1 ? staggerIntervalMs : 300,
      });
    });

    // Bắt đầu chạy Worker gửi tuần tự từng request cách đều nhau
    void this.processQueueLoop();

    return campaign;
  }

  private async processQueueLoop(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      while (this.pendingQueue.length > 0) {
        const task = this.pendingQueue.shift()!;
        const campaigns = store.getPushCampaigns();
        const campaign = campaigns.find((c) => c.id === task.campaignId);

        if (campaign && campaign.status === 'QUEUED') {
          campaign.status = 'SENDING';
          store.save();
        }

        let deliveryStatus: 'SENT' | 'DELIVERED_LOCAL' | 'FAILED' = 'DELIVERED_LOCAL';

        const notifTag = task.notificationId || `${task.type}-${task.campaignId}`;
        const pushPayload = JSON.stringify({
          notificationId: task.notificationId || notifTag,
          title: task.title,
          body: task.body,
          icon: './logo.png',
          badge: './logo.png',
          tag: notifTag,
          url: task.targetUrl,
          type: task.type,
          timestamp: Date.now(),
        });

        // Chỉ gửi Web Push nếu subscription gắn với tài khoản userId hợp lệ (không gửi cho khách vãng lai)
        if (
          task.subscription.userId &&
          !task.subscription.isSimulated &&
          task.subscription.endpoint.startsWith('http') &&
          task.subscription.keys?.p256dh &&
          task.subscription.keys?.auth
        ) {
          try {
            await webpush.sendNotification(
              {
                endpoint: task.subscription.endpoint,
                keys: {
                  p256dh: task.subscription.keys.p256dh,
                  auth: task.subscription.keys.auth,
                },
              },
              pushPayload,
              { TTL: 86400 }
            );
            deliveryStatus = 'SENT';
            if (task.notificationId) {
              store.markNotificationsDelivered(
                [task.notificationId],
                task.userId || task.subscription.userId,
                task.subscription.deviceId
              );
            }
          } catch (err: any) {
            console.error(
              `[PUSH ERROR] Lỗi gửi tới ${task.recipientName} (${task.subscription.endpoint.slice(0, 45)}...):`,
              err?.message || err
            );
            if (err?.statusCode === 404 || err?.statusCode === 410) {
              store.removePwaSubscription(task.subscription.endpoint);
            }
            deliveryStatus = 'FAILED';
          }
        }

        console.log(
          `[PUSH DISPATCH] 📨 [${task.orderIndex}/${task.totalInCampaign}] ${task.recipientName} (GEN ${task.employeeId}) -> Trạng thái: ${deliveryStatus} | Đợi tiếp: ${task.delayAfterMs}ms`
        );

        // Ghi chú: Tất cả chiến dịch (NEW_DAY_UNLOCKED, NEW_TOP_1, UNSTUDIED_REMINDER, PERSONALIZED)
        // đều đã lưu thông báo vào quả chuông 🔔 (In-App Notification) ngay khi khởi tạo chiến dịch.

        task.subscription.lastNotifiedAt = new Date().toISOString();

        if (campaign) {
          campaign.sentCount += 1;
          if (deliveryStatus === 'FAILED') {
            campaign.failedCount += 1;
          } else {
            campaign.successCount += 1;
          }

          campaign.recentLogs.unshift({
            recipientName: task.recipientName,
            employeeId: task.employeeId,
            sentAt: new Date().toISOString(),
            orderIndex: task.orderIndex,
            total: task.totalInCampaign,
            status: deliveryStatus,
          });
          if (campaign.recentLogs.length > 25) {
            campaign.recentLogs = campaign.recentLogs.slice(0, 25);
          }

          if (campaign.sentCount >= campaign.totalTargets) {
            campaign.status = 'COMPLETED';
            campaign.completedAt = new Date().toISOString();
            console.log(
              `[PUSH COMPLETED] ✅ Hoàn tất chiến dịch ${campaign.id}: Tổng ${campaign.totalTargets}, Thành công: ${campaign.successCount}, Lỗi: ${campaign.failedCount}`
            );
          }
          store.save();
        }

        // CHIA ĐỀU REQUEST: Nghỉ đúng khoảng thời gian staggerIntervalMs trước khi bắn request tiếp theo
        if (this.pendingQueue.length > 0 && task.delayAfterMs > 0) {
          await sleep(task.delayAfterMs);
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Bộ lập lịch tự động chống tràn lan thông báo (Chỉ thông báo đúng 3 mốc cố định trong ngày theo giờ VN):
   * 1. 07:00 sáng (1 lần/ngày): "🔥 TOP 1 đã lộ diện – Bài thi mới đã mở!"
   * 2. 19:00 tối (1 lần/ngày): Bản tin Khen ngợi tinh thần học tập & Vinh danh Top dẫn đầu.
   * 3. 21:00 tối (1 lần/ngày): Cảnh báo nhắc riêng những tài khoản USER chưa hoàn thành bài thi hôm nay.
   */
  public startAutoScheduler() {
    if (this.schedulerTimer) return;

    this.schedulerTimer = setInterval(() => {
      try {
        if (this.isProcessing) return;

        const cfg = store.getPushConfig();
        if (!cfg.autoRemindUnstudied) return;

        // Chỉ gửi thông báo tự động khi Admin đã mở ít nhất 1 ngày thử thách
        const latestDay = store.getLatestUnlockedChallenge();
        if (!latestDay || !store.isDayUnlocked(latestDay)) {
          return;
        }

        const { dateKey, hour, minute } = getVietnamDateAndHour();

        // TẦNG CACHE 2: Nếu cả 3 khung thông báo trong ngày (07:00, 19:00, 21:00) đã hoàn thành hôm nay,
        // không cần tính toán hay quét gì thêm trong các chu kỳ 20 giây tiếp theo của ngày hôm nay!
        const alreadyDoneMorning = cfg.lastMorningNotifiedDate === dateKey;
        const alreadyDoneEvening = cfg.lastEveningTop1NotifiedDate === dateKey;
        const alreadyDoneNight = cfg.lastNightUnstudiedNotifiedDate === dateKey;

        if (alreadyDoneMorning && alreadyDoneEvening && alreadyDoneNight) {
          return;
        }

        const currentMinutes = hour * 60 + minute;

        const morningHour = cfg.morningHour ?? 7; // Mặc định 07:00 sáng: TOP 1 lộ diện & Bài thi mới mở
        const morningMinute = cfg.morningMinute ?? 0;
        const morningTargetMinutes = morningHour * 60 + morningMinute;

        const top1Hour = cfg.eveningTop1Hour ?? 19; // Mặc định 19:00 tối: Bản tin Khen ngợi
        const top1Minute = cfg.eveningTop1Minute ?? 0;
        const top1TargetMinutes = top1Hour * 60 + top1Minute;

        const nightUnstudiedHour = cfg.nightUnstudiedHour ?? 21; // Mặc định 21:00 tối: Cảnh báo chưa làm bài
        const nightUnstudiedMinute = cfg.nightUnstudiedMinute ?? 0;
        const nightTargetMinutes = nightUnstudiedHour * 60 + nightUnstudiedMinute;

        // 1. Khung 07:00 sáng (1 lần/ngày): TOP 1 đã lộ diện – Bài thi mới đã mở!
        if (currentMinutes >= morningTargetMinutes && cfg.lastMorningNotifiedDate !== dateKey) {
          store.updatePushConfig({ lastMorningNotifiedDate: dateKey });
          this.enqueueNewDayUnlocked(latestDay);
          return;
        }

        // 2. Khung 19:00 tối (1 lần/ngày): Khen ngợi
        if (currentMinutes >= top1TargetMinutes && cfg.lastEveningTop1NotifiedDate !== dateKey) {
          store.updatePushConfig({ lastEveningTop1NotifiedDate: dateKey });
          const leaderboard = store.getLeaderboard();
          const currentTop1 = leaderboard.find((u) => u.totalScore > 0) || leaderboard[0] || null;
          const runnerUp = leaderboard[1] || null;
          this.enqueueNewTop1(currentTop1, runnerUp);
          return;
        }

        // 3. Khung 21:00 tối (1 lần/ngày): Cảnh báo với những ai là USER mà chưa làm bài
        if (currentMinutes >= nightTargetMinutes && cfg.lastNightUnstudiedNotifiedDate !== dateKey) {
          store.updatePushConfig({ lastNightUnstudiedNotifiedDate: dateKey });
          const unstudied = store.getUnstudiedAccountsWithPwa();
          if (unstudied.length > 0) {
            this.enqueueUnstudiedAccountsReminder();
          }
        }
      } catch (e) {
        console.error('Push scheduler error:', e);
      }
    }, 20000);
  }
}

export const pushService = new StaggeredPushService();

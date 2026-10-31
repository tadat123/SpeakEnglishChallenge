import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import webpush from 'web-push';
import {
  store,
  PushNotificationType,
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

const DATA_DIR = path.resolve(process.cwd(), 'data');
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
   * KHUNG 1 — BUỔI SÁNG (1 LẦN/NGÀY): Thông báo "Có bài mới"
   * Gửi chia đều request cho tất cả ai cài PWA.
   */
  public enqueueNewDayUnlocked(challenge: DailyChallengeItem): PushCampaignRecord {
    const { dateKey } = getVietnamDateAndHour();
    const pwaSubs = store.getPwaSubscriptions(true);
    const title = `🌅 Chào buổi sáng! Đã có bài mới: ${challenge.title} (${challenge.dateLabel})`;
    const body = `Bài học phát âm mới của ${challenge.title} đã mở khóa. Vào hoàn thành 10 câu hỏi để tích điểm ngay hôm nay nhé!`;
    const targetUrl = '/#challenges';

    const tasks = pwaSubs.map((sub) => ({
      subscription: sub,
      userId: null, // Broadcast tới tất cả người cài PWA
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
   * KHUNG 2 — 19H TỐI (1 LẦN/NGÀY): Thông báo "Top 1 hiện tại"
   * Chống spam khi Top 1 đổi liên tục trong ngày: Chỉ tổng hợp và thông báo 1 lần lúc 19h tối cho tất cả ai cài PWA.
   */
  public enqueueNewTop1(
    currentTop1: { id: string; fullName: string; employeeId: string; totalScore: number },
    runnerUp?: { id: string; fullName: string; employeeId: string; totalScore: number } | null
  ): PushCampaignRecord {
    const { dateKey } = getVietnamDateAndHour();
    const pwaSubs = store.getPwaSubscriptions(true);
    const title = `👑 Bản tin BXH 19h: Top 1 hiện tại là ${currentTop1.fullName}!`;
    const body =
      runnerUp && runnerUp.id !== currentTop1.id
        ? `Cập nhật 19h tối: ${currentTop1.fullName} (GEN ${currentTop1.employeeId}) đang dẫn đầu Top 1 với ${currentTop1.totalScore.toLocaleString()} điểm (theo sát là ${runnerUp.fullName}). Vào bứt phá ngay!`
        : `Cập nhật 19h tối: ${currentTop1.fullName} (GEN ${currentTop1.employeeId}) đang giữ vị trí Top 1 Bảng Xếp Hạng với ${currentTop1.totalScore.toLocaleString()} điểm!`;
    const targetUrl = '/#leaderboard';

    const tasks = pwaSubs.map((sub) => ({
      subscription: sub,
      userId: null, // Broadcast tới tất cả người cài PWA
      recipientName: sub.fullName || 'Người dùng PWA',
      employeeId: sub.employeeId || 'PWA',
      title,
      body,
      targetUrl,
    }));

    store.updatePushConfig({
      lastEveningTop1NotifiedDate: dateKey,
      lastTop1UserId: currentTop1.id,
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
   * KHUNG 3 — 23H ĐÊM (1 LẦN/NGÀY): Thông báo cho những ai là USER mà chưa làm bài
   * Chỉ gửi cá nhân hóa và chia đều request cho các tài khoản role === 'USER' đã cài PWA nhưng chưa làm bài.
   */
  public enqueueUnstudiedAccountsReminder(): PushCampaignRecord {
    const { dateKey } = getVietnamDateAndHour();
    const unstudiedList = store.getUnstudiedAccountsWithPwa();
    const latestDay = store.getLatestUnlockedChallenge();

    const summaryTitle = `⏰ Nhắc học 23h tối: ${unstudiedList.length} USER chưa làm ${latestDay.title}`;
    const summaryBody = `Thông báo lúc 23h gửi rải đều tới ${unstudiedList.length} tài khoản USER cài PWA nhưng chưa hoàn thành ${latestDay.title}.`;
    const targetUrl = '/#challenges';

    const tasks: {
      subscription: PwaPushSubscriptionRecord;
      userId: string | null;
      recipientName: string;
      employeeId: string;
      title: string;
      body: string;
      targetUrl: string;
    }[] = [];

    for (const item of unstudiedList) {
      const personalTitle = item.neverStudiedAnyDay
        ? `⏰ 23h Nhắc học: ${item.user.fullName} ơi, bạn chưa làm bài nào!`
        : `⏰ 23h Nhắc học: ${item.user.fullName} chưa hoàn thành ${item.targetDay.title}!`;

      const personalBody = item.neverStudiedAnyDay
        ? `Chỉ còn 1 tiếng nữa là hết ngày! Tài khoản GEN ${item.user.employeeId} chưa làm bài học nào. ${item.targetDay.title} đang mở, vào hoàn thành 2 phút ngay nhé!`
        : `Chỉ còn 1 tiếng nữa là khép lại ngày hôm nay! Chào ${item.user.fullName} (GEN ${item.user.employeeId}), đừng quên hoàn thành ${item.targetDay.title} trước 24h nhé!`;

      for (const sub of item.subscriptions) {
        tasks.push({
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

  private createAndDispatchStaggeredCampaign(
    type: PushNotificationType,
    title: string,
    body: string,
    targetUrl: string,
    rawTasks: {
      subscription: PwaPushSubscriptionRecord;
      userId: string | null;
      recipientName: string;
      employeeId: string;
      title: string;
      body: string;
      targetUrl: string;
    }[]
  ): PushCampaignRecord {
    const totalTargets = rawTasks.length;
    const staggerIntervalMs = this.computeStaggerIntervalMs(totalTargets);
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

    if (totalTargets === 0) {
      return campaign;
    }

    rawTasks.forEach((t, idx) => {
      this.pendingQueue.push({
        campaignId: campaign.id,
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

        const pushPayload = JSON.stringify({
          title: task.title,
          body: task.body,
          icon: './logo.png',
          badge: './logo.png',
          tag: `${task.type}-${task.campaignId}`,
          url: task.targetUrl,
          type: task.type,
          timestamp: Date.now(),
        });

        // Nếu là Web Push Subscription thật trên trình duyệt/PWA -> Gửi qua giao thức VAPID Web Push
        if (
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
          } catch (err: any) {
            if (err?.statusCode === 404 || err?.statusCode === 410) {
              store.removePwaSubscription(task.subscription.endpoint);
            }
            deliveryStatus = 'FAILED';
          }
        }

        // Lưu thông báo vào In-App / Service Worker Sync đúng thời điểm request của người này được gửi
        if (task.orderIndex === 1 || task.userId !== null) {
          store.addInAppNotification({
            id: `notif-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
            campaignId: task.campaignId,
            type: task.type,
            userId: task.userId,
            endpoint: task.subscription.endpoint,
            title: task.title,
            body: task.body,
            targetUrl: task.targetUrl,
            deliveredAt: new Date().toISOString(),
          });
        }

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
   * Bộ lập lịch tự động chống tràn lan thông báo (Chỉ thông báo đúng 3 mốc cố định trong ngày):
   * 1. Buổi sáng (mặc định 08:00 - 1 lần/ngày): Thông báo "Có bài mới" tới tất cả PWA.
   * 2. 19h tối (19:00 - 1 lần/ngày): Thông báo "Top 1 hiện tại" tới tất cả PWA.
   * 3. 23h đêm (23:00 - 1 lần/ngày): Thông báo nhắc riêng những ai là USER cài PWA mà chưa làm bài.
   */
  public startAutoScheduler() {
    if (this.schedulerTimer) return;

    this.schedulerTimer = setInterval(() => {
      try {
        if (this.isProcessing) return;

        const cfg = store.getPushConfig();
        if (!cfg.autoRemindUnstudied) return;

        const { dateKey, hour } = getVietnamDateAndHour();
        const morningHour = cfg.morningHour ?? 8;
        const eveningTop1Hour = cfg.eveningTop1Hour ?? 19;
        const nightUnstudiedHour = cfg.nightUnstudiedHour ?? 23;

        // 1. Khung buổi sáng (1 lần/ngày): Thông báo Có bài mới
        if (hour === morningHour && cfg.lastMorningNotifiedDate !== dateKey) {
          const latestDay = store.getLatestUnlockedChallenge();
          if (latestDay && store.isDayUnlocked(latestDay)) {
            this.enqueueNewDayUnlocked(latestDay);
            return;
          }
        }

        // 2. Khung 19h tối (1 lần/ngày): Thông báo Top 1 hiện tại
        if (hour === eveningTop1Hour && cfg.lastEveningTop1NotifiedDate !== dateKey) {
          const leaderboard = store.getLeaderboard();
          const currentTop1 = leaderboard[0];
          const runnerUp = leaderboard[1] || null;
          if (currentTop1) {
            this.enqueueNewTop1(currentTop1, runnerUp);
            return;
          }
        }

        // 3. Khung 23h tối (1 lần/ngày): Thông báo cho những ai là USER mà chưa làm bài
        if (hour === nightUnstudiedHour && cfg.lastNightUnstudiedNotifiedDate !== dateKey) {
          const unstudied = store.getUnstudiedAccountsWithPwa();
          if (unstudied.length > 0) {
            this.enqueueUnstudiedAccountsReminder();
          } else {
            store.updatePushConfig({ lastNightUnstudiedNotifiedDate: dateKey });
          }
        }
      } catch (e) {
        console.error('Push scheduler error:', e);
      }
    }, 20000);
  }
}

export const pushService = new StaggeredPushService();

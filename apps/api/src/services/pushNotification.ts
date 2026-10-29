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

class StaggeredPushService {
  private pendingQueue: QueuedPushTask[] = [];
  private isProcessing = false;
  private schedulerTimer: NodeJS.Timeout | null = null;

  public getVapidPublicKey(): string {
    return vapidKeys.publicKey;
  }

  public getQueueStatus() {
    return {
      isProcessing: this.isProcessing,
      pendingRequestsCount: this.pendingQueue.length,
      config: store.getPushConfig(),
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
   * 1. THÔNG BÁO MỞ KHÓA NGÀY MỚI ĐỂ HỌC (Gửi chia đều cho tất cả ai cài PWA)
   */
  public enqueueNewDayUnlocked(challenge: DailyChallengeItem): PushCampaignRecord {
    const pwaSubs = store.getPwaSubscriptions(true);
    const title = `🔓 Đã mở khóa ${challenge.title} (${challenge.dateLabel})!`;
    const body = `Bài học phát âm mới của ${challenge.title} đã sẵn sàng. Vào hoàn thành 10 câu hỏi để tích điểm ngay nhé!`;
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

    // Đánh dấu ngày này đã thông báo để không bị lặp tự động
    const cfg = store.getPushConfig();
    if (!cfg.notifiedUnlockedDays.includes(challenge.dayNumber)) {
      store.updatePushConfig({
        notifiedUnlockedDays: [...cfg.notifiedUnlockedDays, challenge.dayNumber],
      });
    }

    return this.createAndDispatchStaggeredCampaign(
      'NEW_DAY_UNLOCKED',
      title,
      body,
      targetUrl,
      tasks
    );
  }

  /**
   * 2. THÔNG BÁO CÓ NGƯỜI LEO LÊN VỊ TRÍ TOP 1 MỚI (Gửi chia đều cho tất cả ai cài PWA)
   */
  public enqueueNewTop1(
    newTop1: { id: string; fullName: string; employeeId: string; totalScore: number },
    previousTop1?: { id: string; fullName: string; employeeId: string; totalScore: number } | null
  ): PushCampaignRecord {
    const pwaSubs = store.getPwaSubscriptions(true);
    const title = `👑 Ngôi vương đổi chủ! Top 1 mới lộ diện!`;
    const body =
      previousTop1 && previousTop1.id !== newTop1.id
        ? `${newTop1.fullName} (GEN ${newTop1.employeeId}) vừa vượt qua ${previousTop1.fullName} để leo lên vị trí Top 1 với ${newTop1.totalScore.toLocaleString()} điểm! Vào đua Top ngay!`
        : `${newTop1.fullName} (GEN ${newTop1.employeeId}) vừa vươn lên dẫn đầu Bảng Xếp Hạng Top 1 với ${newTop1.totalScore.toLocaleString()} điểm!`;
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

    return this.createAndDispatchStaggeredCampaign(
      'NEW_TOP_1',
      title,
      body,
      targetUrl,
      tasks
    );
  }

  /**
   * 3. THÔNG BÁO NHỮNG AI CÓ TÀI KHOẢN MÀ CHƯA HỌC (Chỉ gửi cho người có TK trên PWA mà chưa học, chia đều request)
   */
  public enqueueUnstudiedAccountsReminder(): PushCampaignRecord {
    const unstudiedList = store.getUnstudiedAccountsWithPwa();
    const latestDay = store.getLatestUnlockedChallenge();

    const summaryTitle = `⏰ Nhắc học: Tài khoản chưa hoàn thành ${latestDay.title}`;
    const summaryBody = `Thông báo cá nhân hóa gửi rải đều tới ${unstudiedList.length} tài khoản đã cài PWA nhưng chưa học ${latestDay.title} (hoặc chưa học ngày nào).`;
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
        ? `👋 ${item.user.fullName} ơi, bạn có tài khoản nhưng chưa học bài nào!`
        : `⏰ Nhắc học: ${item.user.fullName} chưa hoàn thành ${item.targetDay.title}!`;

      const personalBody = item.neverStudiedAnyDay
        ? `Tài khoản GEN ${item.user.employeeId} chưa bắt đầu ngày thử thách nào. ${item.targetDay.title} (${item.targetDay.dateLabel}) đang mở, vào học 2 phút ngay nhé!`
        : `Chào ${item.user.fullName} (GEN ${item.user.employeeId}), bạn đừng quên hoàn thành 10 câu hỏi của ${item.targetDay.title} hôm nay để giữ vững thứ hạng trên PWA nhé!`;

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
              // Endpoint PWA đã gỡ cài đặt hoặc hết hạn -> xóa khỏi danh sách
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
   * Bộ lập lịch tự động kiểm tra:
   * 1. Phát hiện khi có Ngày mới vừa đến giờ mở khóa tự động (00:00) -> Push thông báo mở khóa ngày mới.
   * 2. Phát hiện những tài khoản cài PWA nhưng chưa học ngày hiện tại -> Push nhắc học tự động 1 lần/ngày.
   */
  public startAutoScheduler() {
    if (this.schedulerTimer) return;

    this.schedulerTimer = setInterval(() => {
      try {
        const cfg = store.getPushConfig();
        const challenges = store.getChallenges();

        // 1. Tự động kiểm tra có ngày mới nào vừa được mở khóa theo lịch hay không
        for (const c of challenges) {
          if (store.isDayUnlocked(c) && !cfg.notifiedUnlockedDays.includes(c.dayNumber)) {
            this.enqueueNewDayUnlocked(c);
            break;
          }
        }

        // 2. Tự động nhắc học hàng ngày đối với tài khoản chưa học (nếu bật autoRemindUnstudied)
        if (cfg.autoRemindUnstudied && !this.isProcessing) {
          const latestDay = store.getLatestUnlockedChallenge();
          const todayStr = new Date().toISOString().slice(0, 10);
          const reminderKey = `${todayStr}:day-${latestDay.dayNumber}`;
          const hourLocal = new Date().getHours();

          // Tự động nhắc vào khung giờ 08:00 - 21:00 nếu trong ngày chưa nhắc cho Day này
          if (
            hourLocal >= 8 &&
            hourLocal <= 21 &&
            !cfg.notifiedUnstudiedKeys.includes(reminderKey)
          ) {
            const unstudied = store.getUnstudiedAccountsWithPwa();
            if (unstudied.length > 0) {
              store.updatePushConfig({
                notifiedUnstudiedKeys: [...cfg.notifiedUnstudiedKeys.slice(-30), reminderKey],
              });
              this.enqueueUnstudiedAccountsReminder();
            }
          }
        }
      } catch (e) {
        console.error('Push scheduler error:', e);
      }
    }, 30000);
  }
}

export const pushService = new StaggeredPushService();

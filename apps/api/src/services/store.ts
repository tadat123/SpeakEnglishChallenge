import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import {
  DailyChallengeItem,
  QuestionItem,
  QuestionOption,
  QuestionType,
  WorkplaceWordItem,
  DEFAULT_Q11_5_WORDS,
  generate21DaysChallenges,
  generate30DaysChallenges,
} from './seedData.js';

const dbUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
let prisma: PrismaClient | null = null;
if (dbUrl) {
  try {
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: dbUrl,
        },
      },
    });
    console.log('[DB] Đã khởi tạo Prisma Client kết nối tới PostgreSQL!');
  } catch (err) {
    console.warn('Prisma Client init warning:', err);
  }
}

export interface UserRecord {
  id: string;
  employeeId: string; // 8-digit GEN ID
  fullName: string;
  email: string; // Personal email (No @samsung.com)
  phone: string;
  department: string;
  avatarUrl: string;
  passwordHash: string;
  role: 'USER' | 'ADMIN';
  totalScore: number;
  totalTimeMs: number;
  completedDays: number;
  resetOtpCode?: string | null;
  resetToken?: string | null;
  resetExpiresAt?: string | null;
  createdAt: string;
}

export interface UserDeviceRecord {
  id: string;
  userId: string;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  deviceName: string;
  browser: string;
  os: string;
  ip?: string;
  userAgent: string;
  isCurrent?: boolean;
  isPwaInstalled?: boolean;
  createdAt: string;
  lastActiveAt: string;
}

export interface BulkImportQuestionRow {
  dayNumber?: number | string;
  orderIndex?: number | string;
  questionType?: string;
  categoryLabel?: string;
  promptText: string;
  statementText?: string;
  targetWord?: string;
  optionA?: string;
  optionB?: string;
  optionC?: string;
  optionD?: string;
  correctOptionId?: string;
  explanation?: string;
  points?: number | string;
  promptAudioUrl?: string;
  promptVideoUrl?: string;
}

export function parseDeviceFromUserAgent(ua = ''): {
  deviceType: 'mobile' | 'tablet' | 'desktop';
  browser: string;
  os: string;
} {
  let deviceType: 'mobile' | 'tablet' | 'desktop' = 'desktop';
  if (/ipad|tablet/i.test(ua) || (/android/i.test(ua) && !/mobile/i.test(ua))) {
    deviceType = 'tablet';
  } else if (/iphone|mobile|android/i.test(ua)) {
    deviceType = 'mobile';
  }

  let browser = 'Trình duyệt Web';
  if (/samsungbrowser/i.test(ua)) browser = 'Samsung Internet';
  else if (/edg/i.test(ua)) browser = 'Microsoft Edge';
  else if (/chrome|crios/i.test(ua)) browser = 'Google Chrome';
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Apple Safari';
  else if (/firefox|fxios/i.test(ua)) browser = 'Mozilla Firefox';

  let os = 'Thiết bị';
  if (/windows/i.test(ua)) os = 'Windows PC';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/iphone|ipad|ios/i.test(ua)) os = 'Apple iOS';
  else if (/mac os/i.test(ua)) os = 'Apple macOS';
  else if (/linux/i.test(ua)) os = 'Linux';

  return { deviceType, browser, os };
}

export interface AttemptRecord {
  id: string;
  userId: string;
  challengeId: number;
  dayNumber: number;
  score: number;
  practiceScore?: number; // Điểm luyện tập thực tế (nếu quá hạn thì score = 0, practiceScore = điểm làm được)
  isExpired?: boolean; // Nộp bài sau khi ngày thi đã quá hạn
  correctCount: number;
  wrongCount: number;
  timeSpentMs: number;
  answersDetail: Record<string, any>;
  startedAt: string;
  completedAt: string;
}

export interface ActiveQuizSession {
  userId: string;
  employeeId: string;
  fullName: string;
  dayNumber: number;
  startedAt: number;
  q10FinishedAt?: number;
  elapsedSeconds?: number;
  q10ElapsedSeconds?: number;
  currentIndex?: number;
  answers?: Record<string, string>;
  lastSyncedAt?: number;
  // Snapshot bộ câu hỏi lúc nhân viên bắt đầu làm bài để nếu Admin sửa câu hỏi giữa chừng không làm lỗi bài đang thi
  questionsSnapshot: QuestionItem[];
}

export type PushNotificationType =
  | 'NEW_DAY_UNLOCKED'
  | 'NEW_TOP_1'
  | 'UNSTUDIED_REMINDER'
  | 'PERSONALIZED';

export interface PwaPushSubscriptionRecord {
  id: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userId: string | null;
  deviceId?: string | null;
  employeeId: string | null;
  fullName: string | null;
  isPwaInstalled: boolean;
  isSimulated?: boolean;
  userAgent: string;
  createdAt: string;
  updatedAt: string;
  lastNotifiedAt?: string | null;
}

export interface PushCampaignRecord {
  id: string;
  type: PushNotificationType;
  title: string;
  body: string;
  targetUrl: string;
  totalTargets: number;
  sentCount: number;
  successCount: number;
  failedCount: number;
  staggerIntervalMs: number;
  totalSpreadMs: number;
  status: 'QUEUED' | 'SENDING' | 'COMPLETED';
  createdAt: string;
  completedAt?: string | null;
  recentLogs: {
    recipientName: string;
    employeeId: string;
    sentAt: string;
    orderIndex: number;
    total: number;
    status: 'SENT' | 'DELIVERED_LOCAL' | 'FAILED';
  }[];
}

export interface InAppNotificationRecord {
  id: string;
  campaignId: string;
  type: PushNotificationType;
  userId: string | null; // null = gửi cho mọi người dùng đã đăng nhập
  excludedUserIds?: string[]; // Những userId đã có thông báo cá nhân hóa riêng (tránh nhận trùng 2 lần)
  deliveredToUserIds?: string[]; // Danh sách userId đã nhận thông báo này (chống gửi lại)
  deliveredToDeviceIds?: string[]; // Danh sách deviceId đã nhận thông báo này
  endpoint?: string;
  title: string;
  body: string;
  targetUrl: string;
  deliveredAt: string;
}

export interface PushStaggerConfig {
  spreadWindowSeconds: number; // Tổng thời gian chia đều chiến dịch (giây), VD: 30s
  minIntervalMs: number;       // Khoảng cách tối thiểu giữa 2 request liên tiếp (ms), VD: 1200ms
  maxIntervalMs: number;       // Khoảng cách tối đa giữa 2 request liên tiếp (ms), VD: 6000ms
  autoRemindUnstudied: boolean;
  morningHour: number;         // Giờ thông báo buổi sáng (mặc định 8h sáng): Có bài mới (1 lần/ngày)
  morningMinute?: number;      // Phút thông báo buổi sáng (0-59)
  eveningTop1Hour: number;     // Giờ thông báo Top 1 hiện tại (mặc định 19h tối, 1 lần/ngày)
  eveningTop1Minute?: number;  // Phút thông báo Top 1 hiện tại (0-59)
  nightUnstudiedHour: number;  // Giờ nhắc những ai là USER mà chưa làm bài (mặc định 23h tối, 1 lần/ngày)
  nightUnstudiedMinute?: number; // Phút nhắc USER chưa làm bài (0-59)
  lastMorningNotifiedDate: string | null;       // YYYY-MM-DD đã gửi thông báo buổi sáng
  lastEveningTop1NotifiedDate: string | null;   // YYYY-MM-DD đã gửi thông báo Top 1 lúc 19h
  lastNightUnstudiedNotifiedDate: string | null;// YYYY-MM-DD đã gửi nhắc USER chưa làm lúc 23h
  lastTop1UserId: string | null;
  notifiedUnlockedDays: number[];
  notifiedUnstudiedKeys: string[];
}

export interface EventPopupItem {
  id: string;
  orderIndex: number;
  num: string; // e.g. '01', '02', '03'
  titleA: string;
  titleB?: string;
  titleC: string;
  desc: string;
  img: string; // Đường dẫn ảnh, VD: 'events/golden-bell.jpg' hoặc URL upload
  iconName?: string; // 'Bell', 'Clapperboard', 'CalendarDays', 'Trophy', 'Sparkles', 'Star', 'Users', 'Flame', 'Zap'
  chips: string[]; // VD: ['~100 thí sinh', 'Trắc nghiệm', '1 Chung kết']
  note?: string; // Ghi chú nhỏ ở chân thẻ
  more?: string[]; // Danh sách gạch đầu dòng thể lệ khi bấm mở rộng
  themeColor: 'amber' | 'blue' | 'purple' | 'emerald' | 'rose' | 'indigo';
  actionType: 'expand' | 'daily' | 'link';
  actionUrl?: string;
  isVisible: boolean; // Trạng thái Ẩn / Hiện (Admin có thể ẩn sau mới mở từng sự kiện một)
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_POPUP_EVENTS: EventPopupItem[] = [
  {
    id: 'bell',
    orderIndex: 1,
    num: '01',
    titleA: 'RING',
    titleB: 'the',
    titleC: 'GOLDEN BELL',
    desc: 'Kiểm tra kiến thức tiếng Anh và trở thành người trụ lại cuối cùng!',
    img: 'events/golden-bell.jpg',
    iconName: 'Bell',
    chips: ['~100 thí sinh', 'Trắc nghiệm', '1 Chung kết'],
    note: 'Mỗi bộ phận tự tổng hợp danh sách đăng ký và tổ chức vòng sơ loại.',
    more: [
      'Vòng sơ loại do từng bộ phận tự tổ chức để chọn đại diện.',
      'Vòng Chung kết offline: trả lời trắc nghiệm, sai là bị loại.',
      'Người cuối cùng trụ lại sẽ rung Chuông Vàng 🔔.',
    ],
    themeColor: 'amber',
    actionType: 'expand',
    isVisible: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'dub',
    orderIndex: 2,
    num: '02',
    titleA: 'DUB',
    titleB: 'IT',
    titleC: 'RIGHT',
    desc: 'Lập đội, lồng tiếng cho nhân vật và thổi hồn vào video!',
    img: 'events/dub-it-right.jpg',
    iconName: 'Clapperboard',
    chips: ['~3 bạn / đội', 'Lồng tiếng video', '1 Chung kết'],
    note: 'Mỗi bộ phận tự tổng hợp danh sách đăng ký và tổ chức vòng sơ loại.',
    more: [
      'Mỗi đội khoảng 3 người, nhận 1 đoạn video được chỉ định.',
      'Lồng tiếng tiếng Anh: chú trọng phát âm, ngữ điệu và cảm xúc.',
      'Các đội xuất sắc nhất vào thẳng vòng Chung kết.',
    ],
    themeColor: 'blue',
    actionType: 'expand',
    isVisible: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'daily',
    orderIndex: 3,
    num: '03',
    titleA: 'DAILY',
    titleB: '',
    titleC: 'CHALLENGE',
    desc: 'Mỗi ngày một bước nhỏ, tiến bộ lớn phía trước!',
    img: 'events/daily-challenge.jpg',
    iconName: 'CalendarDays',
    chips: ['Không giới hạn', '21 ngày thi', 'Tích điểm & thưởng'],
    note: '',
    more: [
      'Tham gia trả lời 10 câu trắc nghiệm & điền từ mỗi ngày.',
      'Tự luyện phát âm 5 từ vựng công sở ở câu 11 với hướng dẫn khẩu hình & hình ảnh minh họa.',
      'Tích lũy điểm số và thời gian làm bài để tranh top trên Bảng xếp hạng.',
    ],
    themeColor: 'purple',
    actionType: 'daily',
    isVisible: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

interface DatabaseShape {
  users: UserRecord[];
  challenges: DailyChallengeItem[];
  attempts: AttemptRecord[];
  devices?: UserDeviceRecord[];
  pwaSubscriptions?: PwaPushSubscriptionRecord[];
  pushCampaigns?: PushCampaignRecord[];
  inAppNotifications?: InAppNotificationRecord[];
  pushConfig?: PushStaggerConfig;
  events?: EventPopupItem[];
  activeSessions?: Record<string, ActiveQuizSession>;
}

const resolveDataDir = () => {
  const fromRepoRoot = path.resolve(process.cwd(), 'apps', 'api', 'data');
  if (fs.existsSync(path.resolve(process.cwd(), 'apps', 'api'))) {
    return fromRepoRoot;
  }
  return path.resolve(process.cwd(), 'data');
};

const DATA_DIR = resolveDataDir();
const DB_FILE = path.join(DATA_DIR, 'db.json');

const T_MAX = 9999999;
// Thời gian lưu phiên thi đang làm dở (24 giờ để nhân viên thoát ra vào lại vẫn tiếp tục được câu hỏi và thời gian trước đó)
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

export function computeCompositeLeaderboardScore(totalScore: number, totalTimeMs: number): number {
  const totalSeconds = Math.min(T_MAX, Math.floor(totalTimeMs / 1000));
  return totalScore * 10_000_000 + (T_MAX - totalSeconds);
}

class DataStore {
  private data: DatabaseShape;
  // key = `${userId}:${dayNumber}` -> ActiveQuizSession
  private activeSessions = new Map<string, ActiveQuizSession>();
  // Lưu thời điểm Admin thực hiện Force Lock cho từng ngày
  private forceLockedDays = new Map<number, number>();
  private lastLoadedMtime = 0;
  private lastLoadedSize = 0;
  // Timestamp thông báo mới nhất (dùng cho Fast-Path Cache kiểm tra polling cực nhanh 0ms)
  private lastNotificationTimestamp = 0;

  constructor() {
    this.data = this.loadOrSeed();
    this.syncFromPostgres();
  }

  private reloadIfChanged(): void {
    try {
      if (!fs.existsSync(DB_FILE)) return;
      const stat = fs.statSync(DB_FILE);
      if (stat.mtimeMs !== this.lastLoadedMtime || stat.size !== this.lastLoadedSize) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw) as DatabaseShape;
        if (parsed && Array.isArray(parsed.challenges) && Array.isArray(parsed.users)) {
          this.data = this.ensurePushState(parsed);
          if (parsed.activeSessions && typeof parsed.activeSessions === 'object') {
            this.activeSessions = new Map(Object.entries(parsed.activeSessions));
          }
          this.lastLoadedMtime = stat.mtimeMs;
          this.lastLoadedSize = stat.size;
          if (Array.isArray(parsed.inAppNotifications) && parsed.inAppNotifications.length > 0) {
            this.lastNotificationTimestamp = new Date(parsed.inAppNotifications[0].deliveredAt).getTime();
          }
        }
      }
    } catch {
      // Bỏ qua lỗi đọc tức thời khi tiến trình khác đang ghi
    }
  }

  public getPrisma(): PrismaClient | null {
    return prisma;
  }

  public getLastMtime(): number {
    return this.lastLoadedMtime;
  }

  public async syncFromPostgres() {
    this.reloadIfChanged();
    if (!prisma) return;
    try {
      const [dbUsers, dbAttempts] = await Promise.all([
        prisma.user.findMany(),
        prisma.challengeAttempt.findMany().catch(() => []),
      ]);

      // Tải lại từ đĩa ngay sau khi await để không ghi đè thay đổi của instance khác (như events / challenges)
      this.reloadIfChanged();

      if (dbUsers && dbUsers.length > 0) {
        for (const u of dbUsers) {
          const idx = this.data.users.findIndex(
            (local) => local.id === u.id || local.employeeId === u.employeeId
          );
          const userRec: UserRecord = {
            id: u.id,
            employeeId: u.employeeId,
            fullName: u.fullName,
            email: u.email,
            phone: u.phone || '',
            department: u.department || '',
            avatarUrl: u.avatarUrl || '',
            passwordHash: u.passwordHash,
            role: u.role as 'USER' | 'ADMIN',
            totalScore: u.totalScore,
            totalTimeMs: u.totalTimeMs,
            completedDays: u.completedDays,
            resetOtpCode: u.resetOtpCode || null,
            resetToken: u.resetToken || null,
            resetExpiresAt: u.resetExpiresAt ? u.resetExpiresAt.toISOString() : null,
            createdAt: u.createdAt.toISOString(),
          };

          if (idx >= 0) {
            this.data.users[idx] = { ...this.data.users[idx], ...userRec };
          } else {
            this.data.users.push(userRec);
          }
        }
      }

      if (dbAttempts && dbAttempts.length > 0) {
        for (const a of dbAttempts) {
          const exists = this.data.attempts.some((att) => att.id === a.id);
          if (!exists) {
            this.data.attempts.push({
              id: a.id,
              userId: a.userId,
              challengeId: a.challengeId,
              dayNumber: a.challengeId,
              score: a.score,
              practiceScore:
                (a.answersDetail as any)?._meta?.practiceScore ??
                (a.answersDetail as any)?._meta?.rawScore ??
                a.score,
              isExpired: Boolean((a.answersDetail as any)?._meta?.isExpired),
              correctCount: a.correctCount,
              wrongCount: a.wrongCount,
              timeSpentMs: a.timeSpentMs,
              answersDetail: (a.answersDetail as any) || {},
              startedAt: a.startedAt.toISOString(),
              completedAt: a.completedAt.toISOString(),
            });
          }
        }
      }

      this.save();

      // Hai chiều: Đồng bộ ngược toàn bộ users có trong local store lên PostgreSQL
      for (const local of this.data.users) {
        try {
          await prisma.user.upsert({
            where: { employeeId: local.employeeId },
            update: {
              fullName: local.fullName,
              email: local.email,
              phone: local.phone || null,
              department: local.department || null,
              avatarUrl: local.avatarUrl || null,
              passwordHash: local.passwordHash,
              role: local.role,
              totalScore: local.totalScore,
              totalTimeMs: local.totalTimeMs,
              completedDays: local.completedDays,
            },
            create: {
              id: local.id,
              employeeId: local.employeeId,
              fullName: local.fullName,
              email: local.email,
              phone: local.phone || null,
              department: local.department || null,
              avatarUrl: local.avatarUrl || null,
              passwordHash: local.passwordHash,
              role: local.role,
              totalScore: local.totalScore,
              totalTimeMs: local.totalTimeMs,
              completedDays: local.completedDays,
            },
          });
        } catch (syncErr: any) {
          // Bỏ qua nếu lỗi
        }
      }
    } catch (e: any) {
      console.warn('Prisma syncFromPostgres notice:', e?.message || e);
    }
  }

  private ensurePushState(parsed: DatabaseShape): DatabaseShape {
    if (!Array.isArray(parsed.pwaSubscriptions)) {
      parsed.pwaSubscriptions = [];
    } else {
      parsed.pwaSubscriptions = parsed.pwaSubscriptions.filter(
        (s) => !s.isSimulated && !String(s.id).startsWith('pwa-seed-')
      );
    }

    if (!Array.isArray(parsed.pushCampaigns)) {
      parsed.pushCampaigns = [];
    }

    if (!Array.isArray(parsed.inAppNotifications)) {
      parsed.inAppNotifications = [];
    }

    if (!Array.isArray(parsed.events) || parsed.events.length === 0) {
      parsed.events = JSON.parse(JSON.stringify(DEFAULT_POPUP_EVENTS));
    }

    const unlockedNow = (parsed.challenges || [])
      .filter((c) => new Date(c.unlockDate).getTime() <= Date.now() && c.isPublished)
      .map((c) => c.dayNumber);

    if (!parsed.pushConfig) {
      parsed.pushConfig = {
        spreadWindowSeconds: 18,
        minIntervalMs: 1200,
        maxIntervalMs: 5000,
        autoRemindUnstudied: true,
        morningHour: 7,
        morningMinute: 0,
        eveningTop1Hour: 19,
        eveningTop1Minute: 0,
        nightUnstudiedHour: 21,
        nightUnstudiedMinute: 0,
        lastMorningNotifiedDate: null,
        lastEveningTop1NotifiedDate: null,
        lastNightUnstudiedNotifiedDate: null,
        lastTop1UserId: null,
        notifiedUnlockedDays: unlockedNow.length ? unlockedNow : [1],
        notifiedUnstudiedKeys: [],
      };
    } else {
      // Tự động nâng cấp từ cấu hình mặc định cũ (08:00 / 19:00 / 23:00) sang (07:00 / 19:00 / 21:00)
      if (parsed.pushConfig.morningHour === 8 && parsed.pushConfig.nightUnstudiedHour === 23) {
        parsed.pushConfig.morningHour = 7;
        parsed.pushConfig.nightUnstudiedHour = 21;
      }
      parsed.pushConfig.morningHour = parsed.pushConfig.morningHour ?? 7;
      parsed.pushConfig.morningMinute = parsed.pushConfig.morningMinute ?? 0;
      parsed.pushConfig.eveningTop1Hour = parsed.pushConfig.eveningTop1Hour ?? 19;
      parsed.pushConfig.eveningTop1Minute = parsed.pushConfig.eveningTop1Minute ?? 0;
      parsed.pushConfig.nightUnstudiedHour = parsed.pushConfig.nightUnstudiedHour ?? 21;
      parsed.pushConfig.nightUnstudiedMinute = parsed.pushConfig.nightUnstudiedMinute ?? 0;
      parsed.pushConfig.lastMorningNotifiedDate = parsed.pushConfig.lastMorningNotifiedDate ?? null;
      parsed.pushConfig.lastEveningTop1NotifiedDate = parsed.pushConfig.lastEveningTop1NotifiedDate ?? null;
      parsed.pushConfig.lastNightUnstudiedNotifiedDate = parsed.pushConfig.lastNightUnstudiedNotifiedDate ?? null;
    }

    return parsed;
  }

  private loadOrSeed(): DatabaseShape {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_FILE)) {
      try {
        this.lastLoadedMtime = fs.statSync(DB_FILE).mtimeMs;
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw) as DatabaseShape;
        const firstQ = parsed.challenges?.[0]?.questions?.[0] as any;
        if (!firstQ || !firstQ.questionType || !parsed.challenges || parsed.challenges.length === 0) {
          parsed.challenges = generate21DaysChallenges();
        } else {
          // Cập nhật số ngày từ 30 ngày sang 21 ngày theo yêu cầu
          parsed.challenges = parsed.challenges.filter((c) => c.dayNumber <= 21);
          for (const c of parsed.challenges) {
            if (!c.q11Words || !c.q11Words.length) {
              c.q11Words = JSON.parse(JSON.stringify(DEFAULT_Q11_5_WORDS));
            } else if (c.q11Words.length > 5) {
              c.q11Words = c.q11Words.slice(0, 5);
            }
            // Dạng Multiple choice chỉ hiện 3 đáp án (A, B, C)
            for (const q of c.questions || []) {
              if (
                q.questionType !== 'TRUE_FALSE' &&
                q.questionType !== 'FILL_IN_THE_BLANK' &&
                q.options &&
                q.options.length > 3
              ) {
                const correct = q.options.find((o: any) => o.id === q.correctOptionId);
                const others = q.options.filter((o: any) => o.id !== q.correctOptionId);
                if (correct) {
                  q.options = [correct, ...others.slice(0, 2)].sort((a: any, b: any) =>
                    a.id.localeCompare(b.id)
                  );
                } else {
                  q.options = q.options.slice(0, 3);
                }
              }
            }
          }
        }
        // Đảm bảo luôn có tài khoản Admin GEN: 88888888 và giữ nguyên mật khẩu mới nếu Admin đã đổi
        if (!Array.isArray(parsed.users)) parsed.users = [];
        if (!Array.isArray(parsed.attempts)) parsed.attempts = [];

        const defaultAdminPass = process.env.ADMIN_DEFAULT_PASSWORD || 'Admin@2026';
        const adminUser = parsed.users.find((u) => u.employeeId === '88888888');
        if (!adminUser) {
          const adminPassHash = bcrypt.hashSync(defaultAdminPass, 10);
          parsed.users.unshift({
            id: 'u-admin',
            employeeId: '88888888',
            fullName: 'Ban Tổ Chức (Admin)',
            email: 'admin.speakright@gmail.com',
            phone: '0901234567',
            department: 'HR & Training',
            avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=AdminSpeak',
            passwordHash: adminPassHash,
            role: 'ADMIN',
            totalScore: 0,
            totalTimeMs: 0,
            completedDays: 0,
            createdAt: new Date().toISOString(),
          });
        } else {
          adminUser.role = 'ADMIN';
          if (!adminUser.passwordHash) {
            adminUser.passwordHash = bcrypt.hashSync(defaultAdminPass, 10);
          }
        }
        const hydrated = this.ensurePushState(parsed);
        // Nếu db.json đang dính bản seed cũ cố định ngày 02/11/2026 -> Khóa toàn bộ 21 ngày để chờ Admin bấm Start Challenge
        if (
          Array.isArray(hydrated.challenges) &&
          hydrated.challenges.length >= 10 &&
          hydrated.challenges[0]?.dateLabel === '02/11/2026'
        ) {
          const freshSchedule = generate21DaysChallenges();
          const farFuture = new Date(Date.now() + 86400000 * 365).toISOString();
          hydrated.challenges = hydrated.challenges.map((c, idx) => ({
            ...c,
            dateLabel: freshSchedule[idx]?.dateLabel || c.dateLabel,
            unlockDate: farFuture,
            isPublished: false,
            forceLockedAt: null,
            forceRevealed: false,
          }));
        }
        if (hydrated.activeSessions && typeof hydrated.activeSessions === 'object') {
          this.activeSessions = new Map(Object.entries(hydrated.activeSessions));
        }
        if (Array.isArray(hydrated.inAppNotifications) && hydrated.inAppNotifications.length > 0) {
          this.lastNotificationTimestamp = new Date(hydrated.inAppNotifications[0].deliveredAt).getTime();
        }
        fs.writeFileSync(DB_FILE, JSON.stringify(hydrated, null, 2), 'utf-8');
        if (fs.existsSync(DB_FILE)) {
          const st = fs.statSync(DB_FILE);
          this.lastLoadedMtime = st.mtimeMs;
          this.lastLoadedSize = st.size;
        }
        return hydrated;
      } catch (e) {
        console.warn('Khởi tạo lại dữ liệu mẫu do file db.json lỗi:', e);
      }
    }

    const adminPassHash = bcrypt.hashSync(process.env.ADMIN_DEFAULT_PASSWORD || 'Admin@2026', 10);

    const initialUsers: UserRecord[] = [
      {
        id: 'u-admin',
        employeeId: '88888888',
        fullName: 'Ban Tổ Chức (Admin)',
        email: 'admin.speakright@gmail.com',
        phone: '0901234567',
        department: 'HR & Training',
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=AdminSpeak',
        passwordHash: adminPassHash,
        role: 'ADMIN',
        totalScore: 0,
        totalTimeMs: 0,
        completedDays: 0,
        createdAt: new Date().toISOString(),
      },
    ];

    const challenges = generate21DaysChallenges();

    const initialData: DatabaseShape = this.ensurePushState({
      users: initialUsers,
      challenges,
      attempts: [],
    });

    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
    if (fs.existsSync(DB_FILE)) {
      const st = fs.statSync(DB_FILE);
      this.lastLoadedMtime = st.mtimeMs;
      this.lastLoadedSize = st.size;
    }
    return initialData;
  }

  public save() {
    try {
      this.data.activeSessions = Object.fromEntries(this.activeSessions.entries());
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
      if (fs.existsSync(DB_FILE)) {
        const st = fs.statSync(DB_FILE);
        this.lastLoadedMtime = st.mtimeMs;
        this.lastLoadedSize = st.size;
      }
    } catch (err) {
      console.error('[Store] Failed to write DB_FILE:', err);
    }
  }

  public resetAndReseed(): DatabaseShape {
    if (fs.existsSync(DB_FILE)) {
      fs.unlinkSync(DB_FILE);
    }
    this.activeSessions.clear();
    this.forceLockedDays.clear();
    this.data = this.loadOrSeed();
    return this.data;
  }

  public async resetToFreshAdminOnly(): Promise<{ success: boolean; message: string }> {
    this.reloadIfChanged();
    const existingAdmin = this.data.users.find((u) => u.employeeId === '88888888');
    const adminPassHash =
      existingAdmin?.passwordHash ||
      bcrypt.hashSync(process.env.ADMIN_DEFAULT_PASSWORD || 'Admin@2026', 10);
    const adminUser: UserRecord = {
      id: existingAdmin?.id || 'u-admin',
      employeeId: '88888888',
      fullName: existingAdmin?.fullName || 'Ban Tổ Chức (Admin)',
      email: existingAdmin?.email || 'admin.speakright@gmail.com',
      phone: existingAdmin?.phone || '0901234567',
      department: existingAdmin?.department || 'HR & Training',
      avatarUrl: existingAdmin?.avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=AdminSpeak',
      passwordHash: adminPassHash,
      role: 'ADMIN',
      totalScore: 0,
      totalTimeMs: 0,
      completedDays: 0,
      resetOtpCode: null,
      resetToken: null,
      resetExpiresAt: null,
      createdAt: existingAdmin?.createdAt || new Date().toISOString(),
    };

    this.data.users = [adminUser];
    this.data.attempts = [];
    this.data.inAppNotifications = [];
    this.data.pushCampaigns = [];
    this.data.pwaSubscriptions = [];
    this.activeSessions.clear();
    this.forceLockedDays.clear();

    // Mặc định khi reset mới toanh: KHÓA toàn bộ 21 ngày chờ đến khi Admin bấm Start Challenge
    this.startChallengeSchedule({ lockAllUntilStart: true });

    this.save();

    if (prisma) {
      try {
        await prisma.challengeAttempt.deleteMany();
        await prisma.pwaPushSubscription.deleteMany();
        await prisma.user.deleteMany({
          where: { employeeId: { not: '88888888' } },
        });
        await prisma.user.upsert({
          where: { employeeId: '88888888' },
          update: {
            role: 'ADMIN',
            passwordHash: adminPassHash,
            totalScore: 0,
            totalTimeMs: 0,
            completedDays: 0,
          },
          create: {
            employeeId: '88888888',
            fullName: 'Ban Tổ Chức (Admin)',
            email: 'admin.speakright@gmail.com',
            phone: '0901234567',
            department: 'HR & Training',
            passwordHash: adminPassHash,
            role: 'ADMIN',
            totalScore: 0,
            totalTimeMs: 0,
            completedDays: 0,
          },
        });
      } catch (err: any) {
        console.error('[DB Reset] Lỗi khi dọn dẹp PostgreSQL:', err?.message || err);
      }
    }

    return {
      success: true,
      message: 'Hệ thống đã được thiết lập mới toanh! Chỉ còn duy nhất tài khoản Admin (GEN: 88888888 / Mật khẩu: Admin@2026).',
    };
  }

  private pruneExpiredSessions() {
    const now = Date.now();
    for (const [key, session] of this.activeSessions.entries()) {
      if (now - session.startedAt > SESSION_TTL_MS) {
        this.activeSessions.delete(key);
      }
    }
  }

  public getUsers() {
    this.reloadIfChanged();
    return this.data.users;
  }

  public findUserByIdentifier(identifier: string): UserRecord | undefined {
    this.reloadIfChanged();
    const clean = identifier.trim().toLowerCase();
    return this.data.users.find(
      (u) => u.employeeId.toLowerCase() === clean || u.email.toLowerCase() === clean
    );
  }

  public findUserById(id: string): UserRecord | undefined {
    this.reloadIfChanged();
    return this.data.users.find((u) => u.id === id);
  }

  public async createUser(user: UserRecord): Promise<UserRecord> {
    this.reloadIfChanged();
    this.data.users.push(user);
    this.save();

    if (prisma) {
      try {
        await prisma.user.upsert({
          where: { employeeId: user.employeeId },
          update: {
            fullName: user.fullName,
            email: user.email,
            phone: user.phone || null,
            department: user.department || null,
            avatarUrl: user.avatarUrl || null,
            passwordHash: user.passwordHash,
            role: user.role,
            totalScore: user.totalScore,
            totalTimeMs: user.totalTimeMs,
            completedDays: user.completedDays,
          },
          create: {
            id: user.id,
            employeeId: user.employeeId,
            fullName: user.fullName,
            email: user.email,
            phone: user.phone || null,
            department: user.department || null,
            avatarUrl: user.avatarUrl || null,
            passwordHash: user.passwordHash,
            role: user.role,
            totalScore: user.totalScore,
            totalTimeMs: user.totalTimeMs,
            completedDays: user.completedDays,
          },
        });
        console.log(`[DB] Đã lưu thành công user ${user.employeeId} (${user.fullName}) vào PostgreSQL!`);
      } catch (err: any) {
        console.error('[DB Error] Không thể lưu user vào PostgreSQL:', err?.message || err);
      }
    }

    return user;
  }

  public getChallenges(): DailyChallengeItem[] {
    this.reloadIfChanged();
    return this.data.challenges;
  }

  public getChallengeByDay(dayNumber: number): DailyChallengeItem | undefined {
    this.reloadIfChanged();
    return this.data.challenges.find((c) => c.dayNumber === dayNumber);
  }

  public isDayUnlocked(challenge: DailyChallengeItem): boolean {
    if (!challenge.isPublished) return false;
    if (challenge.forceLockedAt != null) return false;
    if (this.forceLockedDays.has(challenge.dayNumber)) return false;
    return new Date(challenge.unlockDate).getTime() <= Date.now();
  }

  public getDayEndDate(challenge: DailyChallengeItem): string {
    // 1. Căn cứ theo dateLabel (định dạng DD/MM/YYYY): Kết thúc lúc 00:00:00 ngày tiếp theo theo giờ VN (UTC+7)
    // Tương đương 17:00:00 UTC của ngày ghi trên dateLabel
    if (challenge.dateLabel && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(challenge.dateLabel.trim())) {
      const [dd, mm, yyyy] = challenge.dateLabel.trim().split('/').map(Number);
      const endMs = Date.UTC(yyyy, mm - 1, dd, 17, 0, 0, 0);
      return new Date(endMs).toISOString();
    }
    // 2. Fallback: Lấy mốc 00:00:00 của ngày tiếp theo dựa trên unlockDate
    const unlockMs = new Date(challenge.unlockDate).getTime();
    const d = new Date(unlockMs + 7 * 3600 * 1000);
    const nextVnMidnightUtc = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1, 17, 0, 0, 0);
    return new Date(nextVnMidnightUtc).toISOString();
  }

  // Kiểm tra xem ngày thi đã thực tế trôi qua hạn chót 00:00 đêm hay chưa (căn cứ theo đồng hồ thực, KHÔNG phụ thuộc Admin reveal)
  public isDayPassedDeadline(challenge: DailyChallengeItem): boolean {
    return Date.now() >= new Date(this.getDayEndDate(challenge)).getTime();
  }

  // Kiểm tra xem ngày này đã đến lúc công bố đáp án và điểm chi tiết hay chưa (Admin bấm công bố sớm HOẶC đã qua 00:00)
  public isResultsRevealed(challenge: DailyChallengeItem): boolean {
    if (challenge.forceRevealed) return true;
    return this.isDayPassedDeadline(challenge);
  }

  // Ngày thi đã kết thúc theo lịch (chỉ phụ thuộc thời gian, không phụ thuộc cờ forceRevealed)
  public isDayEnded(challenge: DailyChallengeItem): boolean {
    return this.isDayPassedDeadline(challenge);
  }

  public toggleRevealResults(dayNumber: number, forceRevealed?: boolean): DailyChallengeItem | null {
    const challenge = this.getChallengeByDay(dayNumber);
    if (!challenge) return null;
    challenge.forceRevealed = forceRevealed !== undefined ? forceRevealed : !challenge.forceRevealed;
    this.save();
    return challenge;
  }

  public getUserAttempts(userId: string): AttemptRecord[] {
    return this.data.attempts.filter((a) => a.userId === userId);
  }

  public getAttempt(userId: string, dayNumber: number): AttemptRecord | undefined {
    return this.data.attempts.find(
      (a) => a.userId === userId && a.dayNumber === dayNumber
    );
  }

  // Xáo trộn mảng ngẫu nhiên theo PRNG với seed xác định
  private shuffleArray<T>(items: T[], seedStr: string): T[] {
    const cloned = JSON.parse(JSON.stringify(items)) as T[];
    let hash = 2166136261;
    for (let i = 0; i < seedStr.length; i++) {
      hash ^= seedStr.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    let state = (hash >>> 0) || 123456789;
    const nextRand = () => {
      state = (Math.imul(1664525, state) + 1013904223) >>> 0;
      return state / 4294967296;
    };

    for (let i = cloned.length - 1; i > 0; i--) {
      const j = Math.floor(nextRand() * (i + 1));
      const tmp = cloned[i];
      cloned[i] = cloned[j];
      cloned[j] = tmp;
    }
    return cloned;
  }

  // Chuẩn bị và xáo trộn đáp án cho từng câu hỏi:
  // - Multiple choice chỉ giữ đúng 3 đáp án (1 đúng + 2 nhiễu)
  // - Bỏ ký hiệu Audio A/B/C/D cứng nhắc
  private prepareOptionsForQuiz(
    options: QuestionItem['options'],
    questionType: QuestionItem['questionType'],
    correctOptionId: string,
    seedStr: string
  ): QuestionItem['options'] {
    if (questionType === 'FILL_IN_THE_BLANK') {
      return [];
    }

    let candidateOptions = JSON.parse(JSON.stringify(options || [])) as QuestionItem['options'];

    // Dạng multiple choice chỉ hiện 3 đáp án:
    if (questionType !== 'TRUE_FALSE' && candidateOptions.length > 3) {
      const correctOpt = candidateOptions.find((o) => o.id === correctOptionId);
      const otherOpts = candidateOptions.filter((o) => o.id !== correctOptionId);
      if (correctOpt) {
        candidateOptions = [correctOpt, ...otherOpts.slice(0, 2)];
      } else {
        candidateOptions = candidateOptions.slice(0, 3);
      }
    }

    return this.shuffleOptionsForUser(candidateOptions, questionType, seedStr);
  }

  // Xáo trộn đáp án ngẫu nhiên khác nhau cho từng người chơi & bỏ ký hiệu Audio A/B/C/D
  private shuffleOptionsForUser(
    options: QuestionItem['options'],
    questionType: QuestionItem['questionType'],
    seedStr: string
  ): QuestionItem['options'] {
    if (questionType === 'FILL_IN_THE_BLANK') return [];
    const cloned = this.shuffleArray(options, seedStr);

    if (questionType === 'CHOOSE_AUDIO') {
      return cloned.map((opt, idx) => ({
        ...opt,
        text: `Mẫu phát âm ${idx + 1}`,
      }));
    }

    return cloned;
  }

  // ==================== CHẾ ĐỘ KHÁCH (KHÔNG ĐĂNG NHẬP) ====================

  /** Thử thách của ngày hôm nay: đã mở khóa và chưa kết thúc (00:00 hôm sau), hoặc fallback về ngày mới nhất đã mở khóa / Day 1 */
  public getTodayChallenge(): DailyChallengeItem | undefined {
    const nowVn = new Date(Date.now() + 7 * 3600 * 1000);
    const dd = String(nowVn.getUTCDate()).padStart(2, '0');
    const mm = String(nowVn.getUTCMonth() + 1).padStart(2, '0');
    const yyyy = nowVn.getUTCFullYear();
    const todayVnDateLabel = `${dd}/${mm}/${yyyy}`;

    // 1. Ưu tiên khớp chính xác dateLabel của ngày hôm nay theo lịch Việt Nam (UTC+7)
    const matchByDate = this.data.challenges.find(
      (c) => c.dateLabel?.trim() === todayVnDateLabel && this.isDayUnlocked(c)
    );
    if (matchByDate) return matchByDate;

    // 2. Tìm bài đã mở khóa và chưa qua hạn 00:00 (không phụ thuộc cờ forceRevealed)
    const open = this.data.challenges
      .filter((c) => this.isDayUnlocked(c) && !this.isDayPassedDeadline(c))
      .sort((a, b) => b.dayNumber - a.dayNumber);
    return open[0] || this.data.challenges.filter((c) => this.isDayUnlocked(c)).sort((a, b) => b.dayNumber - a.dayNumber)[0] || this.data.challenges[0];
  }

  /** Đề thi cho khách: xáo trộn CẢ câu hỏi VÀ đáp án, multiple choice chỉ hiện 3 đáp án */
  public buildGuestQuestions(dayNumber: number, guestSeed: string): QuestionItem[] {
    const challenge = this.getChallengeByDay(dayNumber);
    if (!challenge) return [];
    const now = Date.now();
    const rawQuestions: QuestionItem[] = JSON.parse(JSON.stringify(challenge.questions));
    // Đảo câu hỏi ngẫu nhiên cho khách
    const shuffledQuestions = this.shuffleArray(
      rawQuestions,
      `guest-${guestSeed}-day${dayNumber}-questions-${now}`
    );
    // Đảo đáp án & chỉ giữ 3 phương án cho multiple choice
    return shuffledQuestions.map((q, idx) => ({
      ...q,
      orderIndex: idx + 1,
      options: this.prepareOptionsForQuiz(
        q.options,
        q.questionType,
        q.correctOptionId,
        `guest-${guestSeed}-day${dayNumber}-${q.id}-${now}`
      ),
    }));
  }

  // ==================== QUẢN LÝ PHIÊN THI ĐANG DIỄN RA & CHỐNG XUNG ĐỘT KHI KHÓA ====================

  public startQuizSession(userId: string, dayNumber: number): ActiveQuizSession | null {
    this.reloadIfChanged();
    this.pruneExpiredSessions();
    const user = this.findUserById(userId);
    const challenge = this.getChallengeByDay(dayNumber);
    if (!user || !challenge || !this.isDayUnlocked(challenge)) return null;

    const sessionKey = `${userId}:${dayNumber}`;
    const existing = this.activeSessions.get(sessionKey);
    if (
      existing &&
      Array.isArray(existing.questionsSnapshot) &&
      existing.questionsSnapshot.length > 0 &&
      !this.isSessionForceLocked(dayNumber, existing.startedAt)
    ) {
      return existing;
    }

    const now = Date.now();
    // Chụp lại bản sao bộ câu hỏi ngay thời điểm nhân viên bắt đầu làm bài
    // Đảo CẢ câu hỏi VÀ đáp án theo từng người chơi; Multiple choice chỉ 3 đáp án
    const rawQuestions: QuestionItem[] = JSON.parse(
      JSON.stringify(challenge.questions)
    );
    const shuffledQuestions = this.shuffleArray(
      rawQuestions,
      `${user.id}-${user.employeeId}-day${dayNumber}-questions-${now}`
    );
    const questionsSnapshot: QuestionItem[] = shuffledQuestions.map((q, idx) => ({
      ...q,
      orderIndex: idx + 1,
      options: this.prepareOptionsForQuiz(
        q.options,
        q.questionType,
        q.correctOptionId,
        `${user.id}-${user.employeeId}-day${dayNumber}-${q.id}-${now}`
      ),
    }));

    const session: ActiveQuizSession = {
      userId: user.id,
      employeeId: user.employeeId,
      fullName: user.fullName,
      dayNumber,
      startedAt: now,
      elapsedSeconds: 0,
      currentIndex: 0,
      answers: {},
      lastSyncedAt: now,
      questionsSnapshot,
    };

    this.activeSessions.set(sessionKey, session);
    this.save();
    return session;
  }

  public syncQuizSessionProgress(
    userId: string,
    dayNumber: number,
    progress: {
      currentIndex?: number;
      answers?: Record<string, string>;
      elapsedSeconds?: number;
      q10ElapsedSeconds?: number;
    }
  ): ActiveQuizSession | null {
    this.reloadIfChanged();
    this.pruneExpiredSessions();
    const sessionKey = `${userId}:${dayNumber}`;
    const session = this.activeSessions.get(sessionKey);
    if (!session) return null;

    if (typeof progress.currentIndex === 'number' && progress.currentIndex >= 0) {
      session.currentIndex = progress.currentIndex;
    }
    if (progress.answers && typeof progress.answers === 'object') {
      session.answers = { ...(session.answers || {}), ...progress.answers };
    }
    if (typeof progress.elapsedSeconds === 'number' && progress.elapsedSeconds >= 0) {
      session.elapsedSeconds = Math.max(session.elapsedSeconds || 0, Math.floor(progress.elapsedSeconds));
    }
    if (typeof progress.q10ElapsedSeconds === 'number' && progress.q10ElapsedSeconds >= 0) {
      session.q10ElapsedSeconds = Math.floor(progress.q10ElapsedSeconds);
    }
    session.lastSyncedAt = Date.now();
    this.activeSessions.set(sessionKey, session);
    this.save();
    return session;
  }

  public getActiveSession(userId: string, dayNumber: number): ActiveQuizSession | undefined {
    this.reloadIfChanged();
    this.pruneExpiredSessions();
    return this.activeSessions.get(`${userId}:${dayNumber}`);
  }

  public completeActiveSession(userId: string, dayNumber: number) {
    this.reloadIfChanged();
    this.activeSessions.delete(`${userId}:${dayNumber}`);
    this.save();
  }

  /** Chốt thời gian kết thúc Câu 10 (Câu 11 không tính giờ) */
  public markSessionQ10Finished(userId: string, dayNumber: number, clientElapsedSeconds?: number): number | null {
    this.reloadIfChanged();
    const session = this.getActiveSession(userId, dayNumber);
    if (!session) return null;
    if (!session.q10FinishedAt) {
      session.q10FinishedAt = Date.now();
    }
    if (typeof clientElapsedSeconds === 'number' && clientElapsedSeconds > 0) {
      session.q10ElapsedSeconds = Math.max(1, Math.floor(clientElapsedSeconds));
      session.elapsedSeconds = Math.max(session.elapsedSeconds || 0, session.q10ElapsedSeconds);
    } else if (!session.q10ElapsedSeconds && session.elapsedSeconds) {
      session.q10ElapsedSeconds = session.elapsedSeconds;
    }
    this.save();
    if (session.q10ElapsedSeconds && session.q10ElapsedSeconds > 0) {
      return Math.max(2000, session.q10ElapsedSeconds * 1000);
    }
    return Math.max(2000, session.q10FinishedAt - session.startedAt);
  }

  /** Nếu người dùng bấm quay lại câu 1-10 từ câu 11 thì mở lại bộ đếm */
  public clearSessionQ10Finished(userId: string, dayNumber: number): void {
    this.reloadIfChanged();
    const session = this.getActiveSession(userId, dayNumber);
    if (session) {
      delete session.q10FinishedAt;
      delete session.q10ElapsedSeconds;
      this.save();
    }
  }

  public getActiveSessionsForDay(dayNumber: number): ActiveQuizSession[] {
    this.pruneExpiredSessions();
    const list: ActiveQuizSession[] = [];
    for (const s of this.activeSessions.values()) {
      if (s.dayNumber === dayNumber) {
        list.push(s);
      }
    }
    return list;
  }

  public getAllActiveSessionCounts(): Record<number, number> {
    this.pruneExpiredSessions();
    const counts: Record<number, number> = {};
    for (const s of this.activeSessions.values()) {
      counts[s.dayNumber] = (counts[s.dayNumber] || 0) + 1;
    }
    return counts;
  }

  // Kiểm tra xem ngày thi có bị Admin khóa cưỡng chế (Force Lock) hay không
  public isSessionForceLocked(dayNumber: number, sessionStartedAt?: number): boolean {
    this.reloadIfChanged();
    const challenge = this.getChallengeByDay(dayNumber);
    if (challenge && (challenge.forceLockedAt != null || !challenge.isPublished)) return true;
    const forceLockTime = this.forceLockedDays.get(dayNumber);
    if (!forceLockTime) return false;
    return true;
  }

  // Cập nhật thông tin ngày thi + Cơ chế Khóa Mềm (Graceful) hoặc Khóa Cưỡng Chế (Force)
  public updateChallengeDay(
    dayNumber: number,
    payload: {
      title?: string;
      dateLabel?: string;
      unlockNow?: boolean;
      lockMode?: 'GRACEFUL' | 'FORCE';
      forceRevealed?: boolean;
    }
  ): {
    challenge: DailyChallengeItem | undefined;
    activePlayersAffected: number;
    lockModeUsed?: 'GRACEFUL' | 'FORCE';
    isUnlocked: boolean;
    resultsRevealed: boolean;
  } {
    this.reloadIfChanged();
    const challenge = this.getChallengeByDay(dayNumber);
    if (!challenge) return { challenge: undefined, activePlayersAffected: 0, isUnlocked: false, resultsRevealed: false };

    if (payload.title !== undefined) challenge.title = payload.title.trim();
    if (payload.dateLabel !== undefined) challenge.dateLabel = payload.dateLabel.trim();
    if (payload.forceRevealed !== undefined) challenge.forceRevealed = Boolean(payload.forceRevealed);

    const activePlayers = this.getActiveSessionsForDay(dayNumber);

    if (payload.unlockNow !== undefined) {
      if (payload.unlockNow) {
        // Mở khóa ngày thi
        challenge.unlockDate = new Date(Date.now() - 60000).toISOString();
        challenge.isPublished = true;
        challenge.forceLockedAt = null;
        this.forceLockedDays.delete(dayNumber);
      } else {
        // Khóa ngày thi
        challenge.unlockDate = new Date(Date.now() + 86400000 * 365).toISOString();
        challenge.isPublished = false;
        const mode = payload.lockMode || 'GRACEFUL';
        if (mode === 'FORCE') {
          // Khóa cưỡng chế: Hủy toàn bộ phiên đang làm dở của ngày này ngay lập tức
          challenge.forceLockedAt = Date.now();
          this.forceLockedDays.set(dayNumber, Date.now());
          for (const s of activePlayers) {
            this.activeSessions.delete(`${s.userId}:${dayNumber}`);
          }
        } else {
          // Khóa mềm: Không hủy active sessions đang làm dở, nhưng xóa forceLock nếu có và ngăn người mới
          challenge.forceLockedAt = null;
          this.forceLockedDays.delete(dayNumber);
        }
      }
    }

    this.save();
    return {
      challenge,
      activePlayersAffected: activePlayers.length,
      lockModeUsed: payload.lockMode || 'GRACEFUL',
      isUnlocked: this.isDayUnlocked(challenge),
      resultsRevealed: this.isDayEnded(challenge),
    };
  }

  /**
   * Thiết lập / Bắt đầu hành trình 21 ngày thử thách (Start Challenge):
   * - Cho phép Admin bấm "Bắt đầu Challenge" từ một ngày chỉ định (mặc định Day 1 = hôm nay theo giờ VN).
   * - Ngày được chọn làm mốc (startFromDayNumber) sẽ gắn với startDate (mặc định hôm nay) và MỞ NGAY nếu startDate <= hôm nay.
   * - Toàn bộ các ngày phía sau (startFromDayNumber + 1 .. 21) tự động cập nhật dateLabel nối tiếp nhau, đặt trạng thái KHÓA và tự động mở lần lượt vào 00:00 mỗi ngày tiếp theo.
   * - Nếu lockAllUntilStart = true: Khóa toàn bộ 21 ngày cho tới khi Admin bấm Start.
   */
  public startChallengeSchedule(options?: {
    startFromDayNumber?: number;
    startDateStr?: string; // 'YYYY-MM-DD' hoặc 'DD/MM/YYYY'
    lockPreviousDays?: boolean;
    lockAllUntilStart?: boolean;
  }): {
    startFromDayNumber: number;
    startDateLabel: string;
    unlockedDays: number[];
    lockedDays: number[];
    challenges: DailyChallengeItem[];
  } {
    this.reloadIfChanged();
    this.forceLockedDays.clear();

    if (options?.lockAllUntilStart) {
      const farFuture = new Date(Date.now() + 86400000 * 365).toISOString();
      for (const c of this.data.challenges) {
        c.isPublished = false;
        c.unlockDate = farFuture;
        c.forceLockedAt = null;
        c.forceRevealed = false;
      }
      this.activeSessions.clear();
      this.save();
      return {
        startFromDayNumber: 1,
        startDateLabel: '',
        unlockedDays: [],
        lockedDays: this.data.challenges.map((c) => c.dayNumber),
        challenges: this.data.challenges,
      };
    }

    const startDay = Math.min(21, Math.max(1, Number(options?.startFromDayNumber) || 1));
    const lockPrev = Boolean(options?.lockPreviousDays);

    // Xác định mốc 00:00:00 giờ Việt Nam (UTC+7) của ngày bắt đầu
    let vnYear: number;
    let vnMonth: number; // 0-indexed
    let vnDate: number;

    const rawDate = (options?.startDateStr || '').trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
      const [y, m, d] = rawDate.split('-').map(Number);
      vnYear = y;
      vnMonth = m - 1;
      vnDate = d;
    } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(rawDate)) {
      const [d, m, y] = rawDate.split('/').map(Number);
      vnYear = y;
      vnMonth = m - 1;
      vnDate = d;
    } else {
      const vnNow = new Date(Date.now() + 7 * 3600 * 1000);
      vnYear = vnNow.getUTCFullYear();
      vnMonth = vnNow.getUTCMonth();
      vnDate = vnNow.getUTCDate();
    }

    const baseVnMidnightUtcMs = Date.UTC(vnYear, vnMonth, vnDate, 0, 0, 0, 0) - 7 * 3600 * 1000;
    const startDateLabel = `${String(vnDate).padStart(2, '0')}/${String(vnMonth + 1).padStart(2, '0')}/${vnYear}`;

    const unlockedDays: number[] = [];
    const lockedDays: number[] = [];

    for (const c of this.data.challenges) {
      const dayOffset = c.dayNumber - startDay;
      const targetUnlockUtcMs = baseVnMidnightUtcMs + dayOffset * 86400 * 1000;
      const vnDayObj = new Date(targetUnlockUtcMs + 7 * 3600 * 1000);
      const dd = String(vnDayObj.getUTCDate()).padStart(2, '0');
      const mm = String(vnDayObj.getUTCMonth() + 1).padStart(2, '0');
      const yyyy = vnDayObj.getUTCFullYear();

      c.dateLabel = `${dd}/${mm}/${yyyy}`;
      c.unlockDate = new Date(targetUnlockUtcMs).toISOString();
      c.forceLockedAt = null;
      c.forceRevealed = false;

      if (c.dayNumber < startDay && lockPrev) {
        c.isPublished = false;
      } else {
        c.isPublished = true;
      }

      if (this.isDayUnlocked(c)) {
        unlockedDays.push(c.dayNumber);
      } else {
        lockedDays.push(c.dayNumber);
      }
    }

    if (this.data.pushConfig) {
      this.data.pushConfig.notifiedUnlockedDays = [...unlockedDays];
    }

    this.save();
    return {
      startFromDayNumber: startDay,
      startDateLabel,
      unlockedDays,
      lockedDays,
      challenges: this.data.challenges,
    };
  }

  // ==================== CRUD CÂU HỎI (TEXT, AUDIO, VIDEO) CHO ADMIN ====================

  public addQuestionToDay(
    dayNumber: number,
    qData: Omit<QuestionItem, 'id' | 'challengeId' | 'orderIndex'>
  ): QuestionItem | null {
    this.reloadIfChanged();
    const challenge = this.getChallengeByDay(dayNumber);
    if (!challenge) return null;

    const newOrderIndex = challenge.questions.length + 1;
    const newQuestion: QuestionItem = {
      ...qData,
      id: `day-${dayNumber}-q-${crypto.randomUUID().slice(0, 8)}`,
      challengeId: challenge.id,
      orderIndex: newOrderIndex,
    };

    challenge.questions.push(newQuestion);
    this.save();
    return newQuestion;
  }

  public updateQuestionInDay(
    dayNumber: number,
    questionId: string,
    qData: Partial<QuestionItem>
  ): QuestionItem | null {
    this.reloadIfChanged();
    const challenge = this.getChallengeByDay(dayNumber);
    if (!challenge) return null;

    const cleanId = String(questionId).trim();
    const idx = challenge.questions.findIndex(
      (q) =>
        q.id === cleanId ||
        String(q.orderIndex) === cleanId ||
        q.id.toLowerCase() === cleanId.toLowerCase()
    );
    if (idx === -1) return null;

    challenge.questions[idx] = {
      ...challenge.questions[idx],
      ...qData,
      id: challenge.questions[idx].id,
      challengeId: challenge.id,
      orderIndex: challenge.questions[idx].orderIndex,
    };

    this.save();
    return challenge.questions[idx];
  }

  public deleteQuestionFromDay(dayNumber: number, questionId: string): boolean {
    this.reloadIfChanged();
    const challenge = this.getChallengeByDay(dayNumber);
    if (!challenge) return false;

    const cleanId = String(questionId).trim();
    const beforeLen = challenge.questions.length;
    challenge.questions = challenge.questions
      .filter(
        (q) =>
          q.id !== cleanId &&
          String(q.orderIndex) !== cleanId &&
          q.id.toLowerCase() !== cleanId.toLowerCase()
      )
      .map((q, index) => ({
        ...q,
        orderIndex: index + 1,
      }));

    if (challenge.questions.length === beforeLen) return false;
    this.save();
    return true;
  }

  public copyQuestionsToAllDays(sourceDayNumber: number): number {
    this.reloadIfChanged();
    const source = this.getChallengeByDay(sourceDayNumber);
    if (!source) return 0;

    let updatedCount = 0;
    for (const c of this.data.challenges) {
      if (c.dayNumber === sourceDayNumber) continue;
      c.questions = source.questions.map((q, idx) => ({
        ...JSON.parse(JSON.stringify(q)),
        id: `day-${c.dayNumber}-q-${idx + 1}`,
        challengeId: c.id,
        orderIndex: idx + 1,
      }));
      updatedCount++;
    }
    this.save();
    return updatedCount;
  }

  // Quản lý bộ 5 từ vựng luyện đọc trong Câu 11 của ngày thi
  public updateDayQ11Words(
    dayNumber: number,
    words: WorkplaceWordItem[],
    cloneToAllDays = false
  ): DailyChallengeItem | null {
    this.reloadIfChanged();
    const cleanWords = (words || []).slice(0, 5).map((w, idx) => ({
      ...w,
      id: idx + 1,
    }));
    const challenge = this.getChallengeByDay(dayNumber);
    if (!challenge) return null;

    challenge.q11Words = cleanWords;
    if (cloneToAllDays) {
      for (const c of this.data.challenges) {
        c.q11Words = JSON.parse(JSON.stringify(cleanWords));
      }
    }
    this.save();
    return challenge;
  }

  // Nhập câu hỏi hàng loạt từ Excel / CSV (Hỗ trợ 1 ngày hoặc toàn bộ các ngày)
  public bulkImportQuestions(
    rows: BulkImportQuestionRow[],
    options?: {
      mode?: 'overwrite' | 'append';
      targetDayNumber?: number;
    }
  ): {
    success: boolean;
    totalImported: number;
    daysAffected: number[];
    daySummaries: Record<number, number>;
  } {
    this.reloadIfChanged();
    const mode = options?.mode || 'overwrite';
    const targetDay = options?.targetDayNumber;

    // Gom nhóm câu hỏi theo số ngày thi (DayNumber)
    const grouped = new Map<number, BulkImportQuestionRow[]>();

    for (const rawRow of rows) {
      if (!rawRow || !rawRow.promptText?.trim()) continue;

      let day = targetDay;
      if (!day) {
        const parsedDay = Number(rawRow.dayNumber);
        day = !isNaN(parsedDay) && parsedDay >= 1 && parsedDay <= 30 ? parsedDay : 1;
      }

      if (!grouped.has(day)) {
        grouped.set(day, []);
      }
      grouped.get(day)!.push(rawRow);
    }

    const daysAffected: number[] = [];
    const daySummaries: Record<number, number> = {};
    let totalImported = 0;

    for (const [dayNumber, dayRows] of grouped.entries()) {
      let challenge = this.getChallengeByDay(dayNumber);
      if (!challenge) {
        challenge = {
          id: dayNumber,
          dayNumber,
          title: `Day ${dayNumber}`,
          dateLabel: `Day ${dayNumber}`,
          unlockDate: new Date(Date.now() + (dayNumber - 1) * 86400000).toISOString(),
          isPublished: true,
          questions: [],
        };
        this.data.challenges.push(challenge);
        this.data.challenges.sort((a, b) => a.dayNumber - b.dayNumber);
      }

      if (mode === 'overwrite') {
        challenge.questions = [];
      }

      let currentOrder = challenge.questions.length;

      for (const row of dayRows) {
        currentOrder++;
        const rawType = String(row.questionType || '').trim().toUpperCase();
        let questionType: QuestionType = 'LISTEN_AND_CHOOSE';

        if (rawType.includes('CHOOSE_AUDIO') || rawType === '1' || rawType.includes('AUDIO')) {
          questionType = 'CHOOSE_AUDIO';
        } else if (
          rawType.includes('TRUE_FALSE') ||
          rawType === '2' ||
          rawType.includes('TF') ||
          rawType.includes('TRUE')
        ) {
          questionType = 'TRUE_FALSE';
        } else if (rawType.includes('VOCAB') || rawType === '4' || rawType.includes('MEANING')) {
          questionType = 'VOCAB_MEANING';
        } else if (rawType.includes('FILL') || rawType.includes('BLANK') || rawType === '5') {
          questionType = 'FILL_IN_THE_BLANK';
        } else {
          questionType = 'LISTEN_AND_CHOOSE';
        }

        // Tự động gán nhãn danh mục nếu để trống
        let categoryLabel = String(row.categoryLabel || '').trim();
        if (!categoryLabel) {
          if (questionType === 'CHOOSE_AUDIO') categoryLabel = 'Phát âm chuẩn (Audio)';
          else if (questionType === 'TRUE_FALSE') categoryLabel = 'True / False (Đúng/Sai)';
          else if (questionType === 'LISTEN_AND_CHOOSE') categoryLabel = 'Nghe & Chọn đáp án';
          else if (questionType === 'VOCAB_MEANING') categoryLabel = 'Nghĩa từ vựng & Viết tắt';
          else if (questionType === 'FILL_IN_THE_BLANK') categoryLabel = 'Điền từ chính xác';
        }

        const targetWord = String(row.targetWord || '').trim();
        const statementText = row.statementText?.trim() || undefined;
        const promptText = String(row.promptText || '').trim();
        const promptAudioUrl = row.promptAudioUrl?.trim() || undefined;
        const promptVideoUrl = row.promptVideoUrl?.trim() || undefined;
        const explanation = row.explanation?.trim() || '';
        const points = Number(row.points) > 0 ? Number(row.points) : 10;

        let options: QuestionOption[] = [];
        let correctOptionId: string = 'A';

        if (questionType === 'TRUE_FALSE') {
          options = [
            { id: 'A', text: row.optionA?.trim() || 'True – Đúng', hasOptionAudio: false },
            { id: 'B', text: row.optionB?.trim() || 'False – Sai', hasOptionAudio: false },
          ];
          const rawCorr = String(row.correctOptionId || '').trim().toUpperCase();
          if (rawCorr === 'B' || rawCorr.includes('FALSE') || rawCorr.includes('SAI')) {
            correctOptionId = 'B';
          } else {
            correctOptionId = 'A';
          }
        } else if (questionType === 'FILL_IN_THE_BLANK') {
          options = [];
          const ans = targetWord || String(row.correctOptionId || '').trim();
          correctOptionId = ans.toLowerCase();
        } else if (questionType === 'CHOOSE_AUDIO') {
          const optA = row.optionA?.trim() || 'Audio A';
          const optB = row.optionB?.trim() || 'Audio B';
          const optC = row.optionC?.trim() || 'Audio C';
          options = [
            { id: 'A', text: optA, spokenText: targetWord || optA, hasOptionAudio: true },
            { id: 'B', text: optB, spokenText: targetWord || optB, hasOptionAudio: true },
            { id: 'C', text: optC, spokenText: targetWord || optC, hasOptionAudio: true },
          ];
          if (row.optionD?.trim()) {
            options.push({
              id: 'D',
              text: row.optionD.trim(),
              spokenText: targetWord || row.optionD.trim(),
              hasOptionAudio: true,
            });
          }
          const rawCorr = String(row.correctOptionId || 'A').trim().toUpperCase();
          correctOptionId = ['A', 'B', 'C', 'D'].includes(rawCorr) ? rawCorr : 'A';
        } else {
          // LISTEN_AND_CHOOSE hoặc VOCAB_MEANING
          const optA = row.optionA?.trim() || 'Option A';
          const optB = row.optionB?.trim() || 'Option B';
          const optC = row.optionC?.trim() || '';
          const optD = row.optionD?.trim() || '';

          options = [
            { id: 'A', text: optA, spokenText: optA, hasOptionAudio: false },
            { id: 'B', text: optB, spokenText: optB, hasOptionAudio: false },
          ];
          if (optC) {
            options.push({ id: 'C', text: optC, spokenText: optC, hasOptionAudio: false });
          }
          if (optD) {
            options.push({ id: 'D', text: optD, spokenText: optD, hasOptionAudio: false });
          }
          const rawCorr = String(row.correctOptionId || 'A').trim().toUpperCase();
          correctOptionId = ['A', 'B', 'C', 'D'].includes(rawCorr) ? rawCorr : 'A';
        }

        const hasPromptAudio = Boolean(
          promptAudioUrl ||
            questionType === 'TRUE_FALSE' ||
            questionType === 'LISTEN_AND_CHOOSE' ||
            questionType === 'FILL_IN_THE_BLANK'
        );

        const parsedOrder = Number(row.orderIndex);
        const finalOrder = !isNaN(parsedOrder) && parsedOrder > 0 ? parsedOrder : currentOrder;

        const newQ: QuestionItem = {
          id: `day-${dayNumber}-q-${crypto.randomUUID().slice(0, 8)}`,
          challengeId: challenge.id,
          orderIndex: finalOrder,
          questionType,
          categoryLabel,
          promptText,
          statementText,
          targetWord,
          hasPromptAudio,
          audioNote: 'Được tạo hàng loạt qua Excel/CSV',
          promptAudioUrl,
          promptVideoUrl,
          options,
          correctOptionId,
          explanation,
          points,
        };

        challenge.questions.push(newQ);
        totalImported++;
      }

      // Đánh số thứ tự sạch sẽ 1..N
      challenge.questions.forEach((q, idx) => {
        q.orderIndex = idx + 1;
      });

      daysAffected.push(dayNumber);
      daySummaries[dayNumber] = challenge.questions.length;
    }

    this.save();

    // Đồng bộ sang Postgres nếu Prisma đang hoạt động
    if (prisma) {
      (async () => {
        try {
          for (const dayNum of daysAffected) {
            const ch = this.getChallengeByDay(dayNum);
            if (!ch) continue;
            const pChallenge = await prisma.dailyChallenge.upsert({
              where: { dayNumber: ch.dayNumber },
              update: {
                title: ch.title,
                unlockDate: new Date(ch.unlockDate),
                isPublished: ch.isPublished,
              },
              create: {
                dayNumber: ch.dayNumber,
                title: ch.title,
                unlockDate: new Date(ch.unlockDate),
                isPublished: ch.isPublished,
              },
            });
            if (mode === 'overwrite') {
              await prisma.question.deleteMany({ where: { challengeId: pChallenge.id } });
            }
            for (const q of ch.questions) {
              await prisma.question.create({
                data: {
                  challengeId: pChallenge.id,
                  orderIndex: q.orderIndex,
                  promptText: q.promptText,
                  targetWord: q.targetWord,
                  promptAudioUrl: q.promptAudioUrl,
                  options: q.options as any,
                  correctOptionId: q.correctOptionId,
                  explanation: q.explanation,
                  points: q.points,
                },
              });
            }
          }
        } catch (err: any) {
          console.warn('[Prisma Sync Questions] Failed or table Question not present:', err?.message);
        }
      })().catch((err: any) => console.warn('[Prisma Question Sync Error]', err?.message));
    }

    return {
      success: true,
      totalImported,
      daysAffected: daysAffected.sort((a, b) => a - b),
      daySummaries,
    };
  }

  public async recordAttempt(attempt: AttemptRecord): Promise<{
    isFirstOfficialAttempt: boolean;
    climbedToTop1: boolean;
    previousTop1: { id: string; fullName: string; employeeId: string; totalScore: number } | null;
    newTop1: { id: string; fullName: string; employeeId: string; totalScore: number } | null;
  }> {
    const existing = this.getAttempt(attempt.userId, attempt.dayNumber);
    if (existing) {
      return {
        isFirstOfficialAttempt: false,
        climbedToTop1: false,
        previousTop1: null,
        newTop1: null,
      };
    }

    const prevLeaderboard = this.getLeaderboard();
    const prevTop1 = prevLeaderboard[0] || null;
    const cfg = this.getPushConfig();
    const baselineTop1Id = cfg.lastTop1UserId || prevTop1?.id || null;

    this.data.attempts.push(attempt);
    const user = this.findUserById(attempt.userId);
    if (user) {
      user.totalScore += attempt.score;
      user.totalTimeMs += attempt.timeSpentMs;
      user.completedDays += 1;
    }

    const nextLeaderboard = this.getLeaderboard();
    const newTop1 = nextLeaderboard[0] || null;
    const climbedToTop1 = Boolean(
      newTop1 &&
        newTop1.totalScore > 0 &&
        baselineTop1Id !== newTop1.id
    );

    if (newTop1) {
      cfg.lastTop1UserId = newTop1.id;
    }

    if (prisma) {
      try {
        await prisma.challengeAttempt.create({
          data: {
            id: attempt.id,
            userId: attempt.userId,
            challengeId: attempt.challengeId,
            score: attempt.score,
            correctCount: attempt.correctCount,
            wrongCount: attempt.wrongCount,
            timeSpentMs: attempt.timeSpentMs,
            answersDetail: attempt.answersDetail as any,
            startedAt: new Date(attempt.startedAt),
            completedAt: new Date(attempt.completedAt),
          },
        });
        await prisma.user.update({
          where: { id: attempt.userId },
          data: {
            totalScore: { increment: attempt.score },
            totalTimeMs: { increment: attempt.timeSpentMs },
            completedDays: { increment: 1 },
          },
        });
        console.log(`[DB] Đã lưu bài nộp Day ${attempt.dayNumber} của user ${attempt.userId} vào PostgreSQL!`);
      } catch (err: any) {
        console.error('[DB Error] Không thể lưu bài nộp vào PostgreSQL:', err?.message || err);
      }
    }

    this.save();
    return {
      isFirstOfficialAttempt: true,
      climbedToTop1,
      previousTop1: prevTop1
        ? {
            id: prevTop1.id,
            fullName: prevTop1.fullName,
            employeeId: prevTop1.employeeId,
            totalScore: prevTop1.totalScore,
          }
        : null,
      newTop1: newTop1
        ? {
            id: newTop1.id,
            fullName: newTop1.fullName,
            employeeId: newTop1.employeeId,
            totalScore: newTop1.totalScore,
          }
        : null,
    };
  }

  public getLeaderboard(department?: string, includeUnrevealed = false) {
    const revealedDayMap = new Map<number, boolean>();
    for (const c of this.data.challenges) {
      revealedDayMap.set(c.dayNumber, this.isResultsRevealed(c));
    }

    const filtered = department
      ? this.data.users.filter((u) => u.department === department)
      : this.data.users;

    const userScores = filtered.map((u) => {
      if (includeUnrevealed) {
        return {
          user: u,
          score: u.totalScore,
          timeMs: u.totalTimeMs,
          completedDays: u.completedDays,
        };
      }

      // Chỉ cộng điểm các ngày đã kết thúc hoặc được Admin công bố
      const attempts = this.getUserAttempts(u.id);
      let revealedScore = 0;
      let revealedTimeMs = 0;
      let revealedCompleted = 0;

      for (const a of attempts) {
        if (revealedDayMap.get(a.dayNumber)) {
          revealedScore += a.score;
          revealedTimeMs += a.timeSpentMs;
          revealedCompleted += 1;
        }
      }

      return {
        user: u,
        score: revealedScore,
        timeMs: revealedTimeMs,
        completedDays: revealedCompleted,
      };
    });

    const sorted = [...userScores].sort((a, b) => {
      const scoreA = computeCompositeLeaderboardScore(a.score, a.timeMs);
      const scoreB = computeCompositeLeaderboardScore(b.score, b.timeMs);
      return scoreB - scoreA;
    });

    return sorted.map((item, idx) => ({
      rank: idx + 1,
      id: item.user.id,
      employeeId: item.user.employeeId,
      fullName: item.user.fullName,
      department: item.user.department,
      avatarUrl: item.user.avatarUrl,
      totalScore: item.score,
      totalTimeMs: item.timeMs,
      completedDays: item.completedDays,
    }));
  }

  // ==================== QUẢN LÝ PWA PUSH SUBSCRIPTIONS & CHIẾN DỊCH CHIA ĐỀU REQUEST ====================

  public getPushConfig(): PushStaggerConfig {
    this.reloadIfChanged();
    if (!this.data.pushConfig) {
      this.ensurePushState(this.data);
    }
    return this.data.pushConfig!;
  }

  public updatePushConfig(patch: Partial<PushStaggerConfig>): PushStaggerConfig {
    this.reloadIfChanged();
    const current = this.getPushConfig();
    this.data.pushConfig = {
      ...current,
      ...patch,
    };
    this.save();
    return this.data.pushConfig;
  }

  public getPwaSubscriptions(onlyInstalledPwa = true): PwaPushSubscriptionRecord[] {
    this.reloadIfChanged();
    const list = this.data.pwaSubscriptions || [];
    return onlyInstalledPwa ? list.filter((s) => s.isPwaInstalled) : list;
  }

  public upsertPwaSubscription(input: {
    endpoint: string;
    keys?: { p256dh?: string; auth?: string };
    userId?: string | null;
    deviceId?: string | null;
    employeeId?: string | null;
    fullName?: string | null;
    isPwaInstalled?: boolean;
    userAgent?: string;
  }): PwaPushSubscriptionRecord {
    this.reloadIfChanged();
    if (!this.data.pwaSubscriptions) {
      this.data.pwaSubscriptions = [];
    }

    // Dọn dẹp mọi bản ghi subscription cũ chưa gắn userId (khách vãng lai từ phiên bản cũ)
    this.data.pwaSubscriptions = this.data.pwaSubscriptions.filter(
      (s) => Boolean(s.userId)
    );

    const now = new Date().toISOString();
    const userObj = input.userId ? this.findUserById(input.userId) : undefined;
    const resolvedEmployeeId = input.employeeId || userObj?.employeeId || null;
    const resolvedFullName = input.fullName || userObj?.fullName || null;

    // Nếu user này trước đó có bản ghi PWA giả lập (seed) thì nâng cấp sang endpoint thật của thiết bị
    const existingByEndpoint = this.data.pwaSubscriptions.find(
      (s) => s.endpoint === input.endpoint
    );
    const existingSeedByUser =
      input.userId && !input.endpoint.includes('speakright.local')
        ? this.data.pwaSubscriptions.find(
            (s) => s.userId === input.userId && s.isSimulated
          )
        : undefined;

    const target = existingByEndpoint || existingSeedByUser;

    if (target) {
      target.endpoint = input.endpoint;
      target.keys = {
        p256dh: input.keys?.p256dh || target.keys.p256dh || '',
        auth: input.keys?.auth || target.keys.auth || '',
      };
      if (input.userId !== undefined) target.userId = input.userId;
      if (input.deviceId !== undefined) target.deviceId = input.deviceId;
      target.employeeId = resolvedEmployeeId;
      target.fullName = resolvedFullName;
      target.isPwaInstalled = input.isPwaInstalled ?? true;
      target.isSimulated = input.endpoint.includes('speakright.local');
      if (input.userAgent) target.userAgent = input.userAgent;
      target.updatedAt = now;
      this.save();
      return target;
    }

    const created: PwaPushSubscriptionRecord = {
      id: `pwa-${crypto.randomUUID().slice(0, 8)}`,
      endpoint: input.endpoint,
      keys: {
        p256dh: input.keys?.p256dh || '',
        auth: input.keys?.auth || '',
      },
      userId: input.userId || null,
      deviceId: input.deviceId || null,
      employeeId: resolvedEmployeeId,
      fullName: resolvedFullName,
      isPwaInstalled: input.isPwaInstalled ?? true,
      isSimulated: input.endpoint.includes('speakright.local'),
      userAgent: input.userAgent || 'PWA Client',
      createdAt: now,
      updatedAt: now,
      lastNotifiedAt: null,
    };

    this.data.pwaSubscriptions.push(created);
    this.save();
    return created;
  }

  public removePwaSubscription(endpoint: string): boolean {
    this.reloadIfChanged();
    if (!this.data.pwaSubscriptions) return false;
    const before = this.data.pwaSubscriptions.length;
    this.data.pwaSubscriptions = this.data.pwaSubscriptions.filter(
      (s) => s.endpoint !== endpoint
    );
    if (this.data.pwaSubscriptions.length !== before) {
      this.save();
      return true;
    }
    return false;
  }

  public unbindDeviceSubscriptions(
    userId?: string | null,
    endpoint?: string | null,
    deviceId?: string | null
  ): number {
    this.reloadIfChanged();
    if (!this.data.pwaSubscriptions || this.data.pwaSubscriptions.length === 0) return 0;
    const before = this.data.pwaSubscriptions.length;
    this.data.pwaSubscriptions = this.data.pwaSubscriptions.filter((s) => {
      if (!s.userId) return false; // luôn dọn bản ghi không có userId
      const matchEndpoint = Boolean(endpoint && s.endpoint === endpoint);
      const matchDevice = Boolean(deviceId && s.deviceId === deviceId);
      const matchUserDevice = Boolean(userId && s.userId === userId && (matchEndpoint || matchDevice));
      if (matchEndpoint || matchUserDevice || (matchDevice && !userId)) {
        return false;
      }
      return true;
    });
    const removed = before - this.data.pwaSubscriptions.length;
    if (removed > 0) {
      this.save();
    }
    return removed;
  }

  public getLatestUnlockedChallenge(): DailyChallengeItem {
    const unlocked = this.data.challenges
      .filter((c) => this.isDayUnlocked(c))
      .sort((a, b) => b.dayNumber - a.dayNumber);
    return unlocked[0] || this.data.challenges[0];
  }

  // Lấy danh sách những người có tài khoản USER nhưng CHƯA HỌC (chưa làm bài ngày mới nhất đang mở hoặc completedDays === 0)
  // Bao gồm cả những tài khoản chưa đăng ký Web Push PWA để luôn nhận thông báo trong quả chuông 🔔
  public getUnstudiedAccountsWithPwa(): {
    user: UserRecord;
    subscriptions: PwaPushSubscriptionRecord[];
    targetDay: DailyChallengeItem;
    neverStudiedAnyDay: boolean;
  }[] {
    const targetDay = this.getLatestUnlockedChallenge();
    const pwaSubs = this.getPwaSubscriptions(true);

    const results: {
      user: UserRecord;
      subscriptions: PwaPushSubscriptionRecord[];
      targetDay: DailyChallengeItem;
      neverStudiedAnyDay: boolean;
    }[] = [];

    for (const user of this.data.users) {
      // Chỉ thông báo cho những ai là USER (không gửi nhắc học cho tài khoản ADMIN)
      if (user.role !== 'USER') continue;

      const doneTargetDay = Boolean(this.getAttempt(user.id, targetDay.dayNumber));
      const neverStudiedAnyDay = user.completedDays === 0 && this.getUserAttempts(user.id).length === 0;

      // Chưa học ngày đang mở hiện tại HOẶC có tài khoản mà chưa học bất kỳ ngày nào
      if (!doneTargetDay || neverStudiedAnyDay) {
        const userSubs = pwaSubs.filter(
          (s) => s.userId === user.id || (s.employeeId && s.employeeId === user.employeeId)
        );
        results.push({
          user,
          subscriptions: userSubs,
          targetDay,
          neverStudiedAnyDay,
        });
      }
    }

    return results;
  }

  // Lấy danh sách những tài khoản USER ĐÃ HOÀN THÀNH bài thi ngày đang mở để khen ngợi lúc 19:00
  public getCompletedAccountsForCurrentDay(): {
    user: UserRecord;
    subscriptions: PwaPushSubscriptionRecord[];
    targetDay: DailyChallengeItem;
    attemptScore: number;
  }[] {
    const targetDay = this.getLatestUnlockedChallenge();
    const pwaSubs = this.getPwaSubscriptions(true);

    const results: {
      user: UserRecord;
      subscriptions: PwaPushSubscriptionRecord[];
      targetDay: DailyChallengeItem;
      attemptScore: number;
    }[] = [];

    for (const user of this.data.users) {
      if (user.role !== 'USER') continue;
      const attempt = this.getAttempt(user.id, targetDay.dayNumber);
      if (attempt) {
        const userSubs = pwaSubs.filter(
          (s) => s.userId === user.id || (s.employeeId && s.employeeId === user.employeeId)
        );
        results.push({
          user,
          subscriptions: userSubs,
          targetDay,
          attemptScore: attempt.score,
        });
      }
    }

    return results;
  }

  public getPushCampaigns(): PushCampaignRecord[] {
    this.reloadIfChanged();
    if (!this.data.pushCampaigns) {
      this.data.pushCampaigns = [];
    }
    return this.data.pushCampaigns;
  }

  public addPushCampaign(campaign: PushCampaignRecord): PushCampaignRecord {
    this.reloadIfChanged();
    if (!this.data.pushCampaigns) {
      this.data.pushCampaigns = [];
    }
    this.data.pushCampaigns.unshift(campaign);
    if (this.data.pushCampaigns.length > 30) {
      this.data.pushCampaigns = this.data.pushCampaigns.slice(0, 30);
    }
    this.save();
    return campaign;
  }

  public addInAppNotification(notif: InAppNotificationRecord) {
    this.reloadIfChanged();
    if (!this.data.inAppNotifications) {
      this.data.inAppNotifications = [];
    }
    this.data.inAppNotifications.unshift(notif);
    if (this.data.inAppNotifications.length > 1000) {
      this.data.inAppNotifications = this.data.inAppNotifications.slice(0, 1000);
    }
    this.lastNotificationTimestamp = Date.now();
    this.save();
  }

  public addBatchInAppNotifications(notifs: InAppNotificationRecord[]) {
    this.reloadIfChanged();
    if (!notifs || notifs.length === 0) return;
    if (!this.data.inAppNotifications) {
      this.data.inAppNotifications = [];
    }
    this.data.inAppNotifications.unshift(...notifs);
    if (this.data.inAppNotifications.length > 1000) {
      this.data.inAppNotifications = this.data.inAppNotifications.slice(0, 1000);
    }
    this.lastNotificationTimestamp = Date.now();
    this.save();
  }

  public getLastNotificationTimestamp(): number {
    this.reloadIfChanged();
    return this.lastNotificationTimestamp;
  }

  public markNotificationsDelivered(
    notificationIds: string[],
    userId?: string | null,
    deviceId?: string | null
  ): boolean {
    if (!notificationIds || notificationIds.length === 0) return false;
    if (!userId && !deviceId) return false;

    this.reloadIfChanged();
    const list = this.data.inAppNotifications;
    if (!list || list.length === 0) return false;

    const idSet = new Set(notificationIds);
    let changed = false;

    for (const n of list) {
      if (!idSet.has(n.id)) continue;
      if (userId) {
        if (!n.deliveredToUserIds) n.deliveredToUserIds = [];
        if (!n.deliveredToUserIds.includes(userId)) {
          n.deliveredToUserIds.push(userId);
          changed = true;
        }
      }
      if (deviceId) {
        if (!n.deliveredToDeviceIds) n.deliveredToDeviceIds = [];
        if (!n.deliveredToDeviceIds.includes(deviceId)) {
          n.deliveredToDeviceIds.push(deviceId);
          changed = true;
        }
      }
    }

    if (changed) {
      this.save();
    }
    return changed;
  }

  public getRecentInAppNotifications(
    userId?: string | null,
    sinceMs = 0,
    options?: { forPushPoll?: boolean; deviceId?: string | null }
  ): InAppNotificationRecord[] {
    this.reloadIfChanged();

    // Khách vãng lai (chưa đăng nhập) tuyệt đối KHÔNG nhận thông báo hệ thống/chiến dịch
    if (!userId) {
      return [];
    }

    // FAST-PATH CACHE CHỐNG QUÁ TẢI (O(1)):
    // Nếu client gửi sinceMs >= mốc thông báo mới nhất của toàn hệ thống,
    // chắc chắn 100% không có tin mới -> Trả về [] ngay lập tức (0ms, 0 loop CPU/RAM)
    if (sinceMs > 0 && sinceMs >= this.lastNotificationTimestamp) {
      return [];
    }

    const list = this.data.inAppNotifications || [];
    if (list.length === 0) return [];

    const userObj = this.findUserById(userId);
    const userCreatedMs = userObj?.createdAt ? new Date(userObj.createdAt).getTime() : 0;
    const pollWindowFloorMs = options?.forPushPoll
      ? Math.max(sinceMs, Date.now() - 24 * 60 * 60 * 1000)
      : sinceMs;

    return list.filter((n) => {
      const deliveredMs = new Date(n.deliveredAt).getTime();
      if (deliveredMs <= pollWindowFloorMs) return false;

      // Không gửi lại thông báo broadcast tạo từ trước khi user đăng ký tài khoản
      if (n.userId === null && Number.isFinite(userCreatedMs) && userCreatedMs > 0) {
        if (deliveredMs < userCreatedMs - 60_000) {
          return false;
        }
      }

      // Kiểm tra đích danh hoặc broadcast (loại trừ những user đã có bản cá nhân hóa riêng)
      if (n.userId !== null && n.userId !== userId) return false;
      if (n.excludedUserIds && n.excludedUserIds.includes(userId)) return false;

      // Nếu đang poll để bật thông báo / toast:
      // Chỉ trả về nếu userId này CHƯA TỪNG nhận thông báo N này trước đó
      if (options?.forPushPoll) {
        if (n.deliveredToUserIds && n.deliveredToUserIds.includes(userId)) {
          return false;
        }
      }

      return true;
    });
  }

  // ==================== QUẢN LÝ THIẾT BỊ ĐÃ ĐĂNG NHẬP (USER DEVICES) ====================

  public getUserDevices(userId: string, currentUa = ''): UserDeviceRecord[] {
    this.reloadIfChanged();
    if (!this.data.devices) {
      this.data.devices = [];
    }
    const userDevices = this.data.devices.filter((d) => d.userId === userId);
    if (userDevices.length === 0) {
      const parsed = parseDeviceFromUserAgent(currentUa);
      const defaultDevice: UserDeviceRecord = {
        id: `dev-${userId}-main`,
        userId,
        deviceType: parsed.deviceType,
        deviceName: `${parsed.browser} trên ${parsed.os}`,
        browser: parsed.browser,
        os: parsed.os,
        userAgent: currentUa || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        isCurrent: true,
        isPwaInstalled: true,
        createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
        lastActiveAt: new Date().toISOString(),
      };
      this.data.devices.push(defaultDevice);
      this.save();
      return [defaultDevice];
    }

    return userDevices.map((d) => ({
      ...d,
      isCurrent: Boolean(currentUa && d.userAgent === currentUa),
    }));
  }

  public recordUserDevice(userId: string, userAgent = '', ip = ''): UserDeviceRecord {
    this.reloadIfChanged();
    if (!this.data.devices) {
      this.data.devices = [];
    }
    const parsed = parseDeviceFromUserAgent(userAgent);
    const existing = this.data.devices.find(
      (d) =>
        d.userId === userId &&
        (d.userAgent === userAgent ||
          (d.browser === parsed.browser && d.os === parsed.os))
    );
    const now = new Date().toISOString();
    if (existing) {
      existing.lastActiveAt = now;
      if (ip) existing.ip = ip;
      this.save();
      return existing;
    }

    const newDevice: UserDeviceRecord = {
      id: `dev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      userId,
      deviceType: parsed.deviceType,
      deviceName: `${parsed.browser} trên ${parsed.os}`,
      browser: parsed.browser,
      os: parsed.os,
      ip,
      userAgent,
      isCurrent: true,
      isPwaInstalled: /standalone|pwa/i.test(userAgent),
      createdAt: now,
      lastActiveAt: now,
    };
    this.data.devices.push(newDevice);
    this.save();
    return newDevice;
  }

  public removeUserDevice(userId: string, deviceId: string): boolean {
    this.reloadIfChanged();
    if (!this.data.devices) return false;
    const initialLen = this.data.devices.length;
    this.data.devices = this.data.devices.filter(
      (d) => !(d.userId === userId && d.id === deviceId)
    );
    if (this.data.devices.length !== initialLen) {
      this.save();
      return true;
    }
    return false;
  }

  // ==================== ADMIN: DASHBOARD THỐNG KÊ TỶ LỆ HOÀN THÀNH ====================

  public async getDashboardStats(dayFilter?: number) {
    await this.syncFromPostgres();
    const totalUsers =
      this.data.users.filter((u) => u.role === 'USER').length || this.data.users.length;
    const usersList = this.data.users.filter((u) => u.role === 'USER');
    const completedUsersCount = usersList.filter((u) => u.completedDays >= 1).length;
    const overallCompletionRate =
      totalUsers > 0 ? Math.round((completedUsersCount / totalUsers) * 100) : 0;

    const totalScoreSum = usersList.reduce((acc, u) => acc + (u.totalScore || 0), 0);
    const avgScore = totalUsers > 0 ? Math.round(totalScoreSum / totalUsers) : 0;

    const challenges = this.data.challenges;
    const todayChallenge = this.getTodayChallenge() || challenges[0];

    const allDaysStats = challenges.map((c) => {
      const attemptsForDay = this.data.attempts.filter((a) => a.dayNumber === c.dayNumber);
      const uniqueCompletedUserIds = new Set(attemptsForDay.map((a) => a.userId));
      const participantsCount = uniqueCompletedUserIds.size;
      const completionRate =
        totalUsers > 0 ? Math.round((participantsCount / totalUsers) * 100) : 0;

      const totalScore = attemptsForDay.reduce((acc, a) => acc + a.score, 0);
      const averageScore =
        attemptsForDay.length > 0 ? Math.round(totalScore / attemptsForDay.length) : 0;
      const passCount = attemptsForDay.filter((a) => a.score >= 60).length;
      const perfectCount = attemptsForDay.filter((a) => a.score === 100).length;
      const totalTime = attemptsForDay.reduce((acc, a) => acc + (a.timeSpentMs || 0), 0);
      const averageTimeSec =
        attemptsForDay.length > 0
          ? Math.round(totalTime / attemptsForDay.length / 1000)
          : 0;

      return {
        dayNumber: c.dayNumber,
        title: c.title,
        dateLabel: c.dateLabel,
        isUnlocked: this.isDayUnlocked(c),
        isEnded: this.isDayEnded(c),
        participantsCount,
        completionRate,
        averageScore,
        passCount,
        perfectCount,
        averageTimeSec,
      };
    });

    const targetDayNumber = dayFilter || todayChallenge?.dayNumber || 1;
    const selectedDayStat =
      allDaysStats.find((d) => d.dayNumber === targetDayNumber) || allDaysStats[0];

    return {
      totalUsers,
      completedUsersCount,
      overallCompletionRate,
      avgScore,
      totalAttempts: this.data.attempts.length,
      todayChallenge: {
        dayNumber: todayChallenge?.dayNumber || 1,
        title: todayChallenge?.title || 'Day 1',
        dateLabel: todayChallenge?.dateLabel || '',
      },
      selectedDayStat,
      allDaysStats,
    };
  }

  // ==================== ADMIN: QUẢN LÝ NGƯỜI DÙNG & TÌM KIẾM ====================

  public async getAdminUsers(search = '', department = '') {
    await this.syncFromPostgres();
    let users = this.data.users.map((u) => {
      const userAttempts = this.data.attempts.filter((a) => a.userId === u.id);
      const lastAttempt = userAttempts.sort(
        (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
      )[0];
      const devices = this.getUserDevices(u.id);

      return {
        id: u.id,
        employeeId: u.employeeId,
        fullName: u.fullName,
        email: u.email,
        phone: u.phone,
        department: u.department || 'General',
        avatarUrl: u.avatarUrl,
        role: u.role,
        totalScore: u.totalScore || 0,
        completedDays: u.completedDays || 0,
        createdAt: u.createdAt,
        lastActiveAt: lastAttempt?.completedAt || u.createdAt,
        deviceCount: devices.length,
        primaryDevice: devices[0]?.deviceName || 'Thiết bị di động',
      };
    });

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      users = users.filter(
        (u) =>
          u.employeeId.includes(q) ||
          u.fullName.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q)
      );
    }

    if (department && department !== 'ALL') {
      users = users.filter((u) => u.department === department);
    }

    users.sort((a, b) => b.totalScore - a.totalScore || b.completedDays - a.completedDays);
    return users.map((u, idx) => ({ ...u, rank: idx + 1 }));
  }

  public async getAdminUserDetails(userId: string) {
    await this.syncFromPostgres();
    const user = this.findUserById(userId);
    if (!user) return null;
    const attempts = this.data.attempts
      .filter((a) => a.userId === userId)
      .sort((a, b) => a.dayNumber - b.dayNumber);
    const devices = this.getUserDevices(userId);
    return {
      user: {
        id: user.id,
        employeeId: user.employeeId,
        fullName: user.fullName,
        email: user.email,
        department: user.department,
        role: user.role,
        totalScore: user.totalScore,
        completedDays: user.completedDays,
        createdAt: user.createdAt,
      },
      attempts,
      devices,
    };
  }

  public async deleteUser(userId: string): Promise<boolean> {
    this.reloadIfChanged();
    const idx = this.data.users.findIndex((u) => u.id === userId || u.employeeId === userId);
    if (idx === -1) return false;
    const removed = this.data.users.splice(idx, 1)[0];
    this.data.attempts = this.data.attempts.filter((a) => a.userId !== removed.id);
    this.save();

    if (prisma) {
      try {
        await prisma.challengeAttempt.deleteMany({ where: { userId: removed.id } });
        await prisma.user.delete({ where: { id: removed.id } });
        console.log(`[DB] Đã xóa user ${removed.employeeId} khỏi PostgreSQL!`);
      } catch (err: any) {
        console.error('[DB Error] Không thể xóa user trong PostgreSQL:', err?.message || err);
      }
    }
    return true;
  }

  public async adminResetUserPassword(userId: string, newPassPlain: string): Promise<boolean> {
    this.reloadIfChanged();
    const user = this.findUserById(userId);
    if (!user) return false;
    const hash = await bcrypt.hash(newPassPlain, 10);
    this.reloadIfChanged();
    const freshUser = this.findUserById(userId);
    if (!freshUser) return false;
    freshUser.passwordHash = hash;
    this.save();

    if (prisma) {
      try {
        await prisma.user.update({
          where: { id: freshUser.id },
          data: { passwordHash: hash },
        });
        console.log(`[DB] Đã đổi mật khẩu cho user ${freshUser.employeeId} trong PostgreSQL!`);
      } catch (err: any) {
        console.error('[DB Error] Không thể update password user trong PostgreSQL:', err?.message || err);
      }
    }
    return true;
  }

  public async adminResetUserProgress(userId: string): Promise<boolean> {
    this.reloadIfChanged();
    const user = this.findUserById(userId);
    if (!user) return false;
    user.totalScore = 0;
    user.totalTimeMs = 0;
    user.completedDays = 0;
    this.data.attempts = this.data.attempts.filter((a) => a.userId !== user.id);
    this.save();

    if (prisma) {
      try {
        await prisma.challengeAttempt.deleteMany({ where: { userId: user.id } });
        await prisma.user.update({
          where: { id: user.id },
          data: { totalScore: 0, totalTimeMs: 0, completedDays: 0 },
        });
        console.log(`[DB] Đã reset tiến độ cho user ${user.employeeId} trong PostgreSQL!`);
      } catch (err: any) {
        console.error('[DB Error] Không thể reset progress user trong PostgreSQL:', err?.message || err);
      }
    }
    return true;
  }

  // ==================== ADMIN: GỬI THÔNG BÁO CÁ NHÂN HÓA ====================

  public sendPersonalizedNotification(payload: {
    targetType: 'all' | 'department' | 'user';
    targetValue?: string;
    title: string;
    body: string;
    targetUrl?: string;
    type?: string;
  }): { sentCount: number; success: boolean } {
    let targets: UserRecord[] = [];
    if (payload.targetType === 'user' && payload.targetValue) {
      const u = this.findUserById(payload.targetValue);
      if (u) targets = [u];
    } else if (payload.targetType === 'department' && payload.targetValue) {
      targets = this.data.users.filter((u) => u.department === payload.targetValue);
    } else {
      targets = this.data.users;
    }

    if (targets.length === 0) return { sentCount: 0, success: false };

    const campaignId = `camp-custom-${Date.now()}`;
    const targetUrl = payload.targetUrl || '#challenges';
    const notifType = (payload.type || 'PERSONALIZED') as any;

    targets.forEach((user) => {
      const personalizedTitle = payload.title
        .replace(/\{name\}/gi, user.fullName)
        .replace(/\{gen\}/gi, user.employeeId)
        .replace(/\{score\}/gi, String(user.totalScore || 0));

      const personalizedBody = payload.body
        .replace(/\{name\}/gi, user.fullName)
        .replace(/\{gen\}/gi, user.employeeId)
        .replace(/\{score\}/gi, String(user.totalScore || 0));

      this.addInAppNotification({
        id: `inapp-${Date.now()}-${user.id}`,
        campaignId,
        type: notifType,
        userId: user.id,
        title: personalizedTitle,
        body: personalizedBody,
        targetUrl,
        deliveredAt: new Date().toISOString(),
      });
    });

    console.log(
      `[IN-APP NOTIF] 📢 Đã gửi thông báo cá nhân hóa tới ${targets.length} nhân viên (targetType: ${payload.targetType}${payload.targetValue ? `=${payload.targetValue}` : ''})`
    );

    return { sentCount: targets.length, success: true };
  }

  // ==================== QUẢN LÝ POP-UP SỰ KIỆN (EVENTS CRUD & TOGGLE ẨN/HIỆN) ====================

  public getEvents(onlyVisible = false): EventPopupItem[] {
    this.reloadIfChanged();
    if (!Array.isArray(this.data.events) || this.data.events.length === 0) {
      this.data.events = JSON.parse(JSON.stringify(DEFAULT_POPUP_EVENTS));
      this.save();
    }
    const events = this.data.events || [];
    const list = [...events];
    list.sort((a, b) => a.orderIndex - b.orderIndex);
    if (onlyVisible) {
      return list.filter((e) => e.isVisible);
    }
    return list;
  }

  public getEventById(id: string): EventPopupItem | undefined {
    this.reloadIfChanged();
    return (this.data.events || []).find((e) => e.id === id);
  }

  public createEvent(input: Partial<EventPopupItem>): EventPopupItem {
    this.reloadIfChanged();
    if (!Array.isArray(this.data.events)) {
      this.data.events = JSON.parse(JSON.stringify(DEFAULT_POPUP_EVENTS));
    }
    const events = this.data.events || [];
    const id = input.id?.trim() || `event-${Date.now()}`;
    const nextOrder = events.length + 1;
    const num = input.num?.trim() || String(input.orderIndex || nextOrder).padStart(2, '0');

    const newEvent: EventPopupItem = {
      id,
      orderIndex: input.orderIndex !== undefined ? Number(input.orderIndex) : nextOrder,
      num,
      titleA: input.titleA?.trim() || 'SỰ KIỆN',
      titleB: input.titleB?.trim() || '',
      titleC: input.titleC?.trim() || 'MỚI',
      desc: input.desc?.trim() || '',
      img: input.img?.trim() || 'events/golden-bell.jpg',
      iconName: input.iconName || 'Sparkles',
      chips: Array.isArray(input.chips) ? input.chips.filter(Boolean) : [],
      note: input.note?.trim() || '',
      more: Array.isArray(input.more) ? input.more.filter(Boolean) : [],
      themeColor: input.themeColor || 'amber',
      actionType: input.actionType || 'expand',
      actionUrl: input.actionUrl?.trim() || '',
      isVisible: input.isVisible ?? true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    events.push(newEvent);
    this.data.events = events;
    this.save();
    return newEvent;
  }

  public updateEvent(id: string, patch: Partial<EventPopupItem>): EventPopupItem | null {
    this.reloadIfChanged();
    if (!Array.isArray(this.data.events)) {
      this.data.events = JSON.parse(JSON.stringify(DEFAULT_POPUP_EVENTS));
    }
    const events = this.data.events || [];
    const idx = events.findIndex((e) => e.id === id);
    if (idx === -1) return null;

    const current = events[idx];
    const updated: EventPopupItem = {
      ...current,
      ...patch,
      id: current.id,
      orderIndex: patch.orderIndex !== undefined ? Number(patch.orderIndex) : current.orderIndex,
      num: patch.num !== undefined ? String(patch.num) : current.num,
      chips: Array.isArray(patch.chips) ? patch.chips.filter(Boolean) : current.chips,
      more: Array.isArray(patch.more) ? patch.more.filter(Boolean) : current.more,
      updatedAt: new Date().toISOString(),
    };

    events[idx] = updated;
    this.data.events = events;
    this.save();
    return updated;
  }

  public toggleEventVisibility(id: string): EventPopupItem | null {
    this.reloadIfChanged();
    if (!Array.isArray(this.data.events)) {
      this.data.events = JSON.parse(JSON.stringify(DEFAULT_POPUP_EVENTS));
    }
    const events = this.data.events || [];
    const event = events.find((e) => e.id === id);
    if (!event) return null;

    event.isVisible = !event.isVisible;
    event.updatedAt = new Date().toISOString();
    this.data.events = events;
    this.save();
    return event;
  }

  public deleteEvent(id: string): boolean {
    this.reloadIfChanged();
    if (!Array.isArray(this.data.events)) return false;
    const initialLen = this.data.events.length;
    this.data.events = this.data.events.filter((e) => e.id !== id);
    if (this.data.events.length !== initialLen) {
      this.save();
      return true;
    }
    return false;
  }

  public resetEventsToDefault(): EventPopupItem[] {
    this.reloadIfChanged();
    const defaults: EventPopupItem[] = JSON.parse(JSON.stringify(DEFAULT_POPUP_EVENTS));
    this.data.events = defaults;
    this.save();
    return defaults;
  }
}

export const store = new DataStore();

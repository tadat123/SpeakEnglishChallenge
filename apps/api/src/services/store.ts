import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import {
  DailyChallengeItem,
  QuestionItem,
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
  correctCount: number;
  wrongCount: number;
  timeSpentMs: number;
  answersDetail: Record<string, 'A' | 'B' | 'C' | 'D'>;
  startedAt: string;
  completedAt: string;
}

export interface ActiveQuizSession {
  userId: string;
  employeeId: string;
  fullName: string;
  dayNumber: number;
  startedAt: number;
  // Snapshot bộ câu hỏi lúc nhân viên bắt đầu làm bài để nếu Admin sửa câu hỏi giữa chừng không làm lỗi bài đang thi
  questionsSnapshot: QuestionItem[];
}

export type PushNotificationType =
  | 'NEW_DAY_UNLOCKED'
  | 'NEW_TOP_1'
  | 'UNSTUDIED_REMINDER';

export interface PwaPushSubscriptionRecord {
  id: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userId: string | null;
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
  userId: string | null; // null = gửi cho mọi PWA
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

interface DatabaseShape {
  users: UserRecord[];
  challenges: DailyChallengeItem[];
  attempts: AttemptRecord[];
  devices?: UserDeviceRecord[];
  pwaSubscriptions?: PwaPushSubscriptionRecord[];
  pushCampaigns?: PushCampaignRecord[];
  inAppNotifications?: InAppNotificationRecord[];
  pushConfig?: PushStaggerConfig;
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
// Thời gian ân hạn tối đa cho người đang làm bài khi Admin khóa mềm (15 phút)
const SESSION_TTL_MS = 15 * 60 * 1000;

export function computeCompositeLeaderboardScore(totalScore: number, totalTimeMs: number): number {
  const totalSeconds = Math.min(T_MAX, Math.floor(totalTimeMs / 1000));
  return totalScore * 10_000_000 + (T_MAX - totalSeconds);
}

const defaultUserPassHash = bcrypt.hashSync('User@2026', 10);
const DEFAULT_EMPLOYEES: UserRecord[] = [
  {
    id: 'u-1',
    employeeId: '20260001',
    fullName: 'Nguyễn Minh Anh',
    email: 'minhanh.dev@gmail.com',
    phone: '0912345001',
    department: 'R&D Center',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=MinhAnh',
    passwordHash: defaultUserPassHash,
    role: 'USER',
    totalScore: 100,
    totalTimeMs: 45000,
    completedDays: 1,
    createdAt: '2026-10-29T14:40:54.932Z',
  },
  {
    id: 'u-2',
    employeeId: '20260002',
    fullName: 'Trần Quốc Huy',
    email: 'quochuy.eng@gmail.com',
    phone: '0912345002',
    department: 'Production',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=QuocHuy',
    passwordHash: defaultUserPassHash,
    role: 'USER',
    totalScore: 90,
    totalTimeMs: 52000,
    completedDays: 1,
    createdAt: '2026-10-29T14:40:54.932Z',
  },
  {
    id: 'u-3',
    employeeId: '20260003',
    fullName: 'Lê Thu Hương',
    email: 'thuhuong.qa@gmail.com',
    phone: '0912345003',
    department: 'Quality Assurance (QA)',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ThuHuong',
    passwordHash: defaultUserPassHash,
    role: 'USER',
    totalScore: 90,
    totalTimeMs: 58000,
    completedDays: 1,
    createdAt: '2026-10-29T14:40:54.932Z',
  },
  {
    id: 'u-4',
    employeeId: '20260004',
    fullName: 'Phạm Hoàng Nam',
    email: 'hoangnam.it@gmail.com',
    phone: '0912345004',
    department: 'IT & System',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=HoangNam',
    passwordHash: defaultUserPassHash,
    role: 'USER',
    totalScore: 80,
    totalTimeMs: 65000,
    completedDays: 1,
    createdAt: '2026-10-29T14:40:54.932Z',
  },
  {
    id: 'u-5',
    employeeId: '20260005',
    fullName: 'Đỗ Mai Linh',
    email: 'mailinh.hr@gmail.com',
    phone: '0912345005',
    department: 'HR & Training',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=MaiLinh',
    passwordHash: defaultUserPassHash,
    role: 'USER',
    totalScore: 80,
    totalTimeMs: 70000,
    completedDays: 1,
    createdAt: '2026-10-29T14:40:54.932Z',
  },
  {
    id: 'u-thao',
    employeeId: '20261234',
    fullName: 'Nguyễn Thị Thảo',
    email: 'thaonguyen.work@gmail.com',
    phone: '0987654321',
    department: 'Quality Assurance (QA)',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ThaoNguyen',
    passwordHash: defaultUserPassHash,
    role: 'USER',
    totalScore: 70,
    totalTimeMs: 80000,
    completedDays: 1,
    createdAt: '2026-10-29T14:40:54.932Z',
  },
  {
    id: 'u-6',
    employeeId: '20260006',
    fullName: 'Vũ Đức Thắng',
    email: 'ducthang.eng@gmail.com',
    phone: '0912345006',
    department: 'Quality Assurance (QA)',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=DucThang',
    passwordHash: defaultUserPassHash,
    role: 'USER',
    totalScore: 0,
    totalTimeMs: 0,
    completedDays: 0,
    createdAt: '2026-10-29T14:40:54.932Z',
  },
  {
    id: 'u-7',
    employeeId: '20260007',
    fullName: 'Hoàng Bích Ngọc',
    email: 'bichngoc.fin@gmail.com',
    phone: '0912345007',
    department: 'Logistics & Supply',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=BichNgoc',
    passwordHash: defaultUserPassHash,
    role: 'USER',
    totalScore: 0,
    totalTimeMs: 0,
    completedDays: 0,
    createdAt: '2026-10-29T14:40:54.932Z',
  },
  {
    id: 'u-8',
    employeeId: '20260008',
    fullName: 'Bùi Tiến Dũng',
    email: 'tiendung.pe@gmail.com',
    phone: '0912345008',
    department: 'Production',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=TienDung',
    passwordHash: defaultUserPassHash,
    role: 'USER',
    totalScore: 0,
    totalTimeMs: 0,
    completedDays: 0,
    createdAt: '2026-10-29T14:40:54.932Z',
  },
  {
    id: 'u-9',
    employeeId: '20260009',
    fullName: 'Đặng Khánh Vy',
    email: 'khanhvy.mkt@gmail.com',
    phone: '0912345009',
    department: 'R&D Center',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=KhanhVy',
    passwordHash: defaultUserPassHash,
    role: 'USER',
    totalScore: 0,
    totalTimeMs: 0,
    completedDays: 0,
    createdAt: '2026-10-29T14:40:54.932Z',
  },
  {
    id: 'u-10',
    employeeId: '20260010',
    fullName: 'Ngô Quang Hải',
    email: 'quanghai.qa@gmail.com',
    phone: '0912345010',
    department: 'Quality Assurance (QA)',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=QuangHai',
    passwordHash: defaultUserPassHash,
    role: 'USER',
    totalScore: 0,
    totalTimeMs: 0,
    completedDays: 0,
    createdAt: '2026-10-29T14:40:54.932Z',
  },
];

class DataStore {
  private data: DatabaseShape;
  // key = `${userId}:${dayNumber}` -> ActiveQuizSession
  private activeSessions = new Map<string, ActiveQuizSession>();
  // Lưu thời điểm Admin thực hiện Force Lock cho từng ngày
  private forceLockedDays = new Map<number, number>();
  private lastLoadedMtime = 0;

  constructor() {
    this.data = this.loadOrSeed();
    this.syncFromPostgres();
  }

  private reloadIfChanged(): void {
    try {
      if (!fs.existsSync(DB_FILE)) return;
      const stat = fs.statSync(DB_FILE);
      if (stat.mtimeMs > this.lastLoadedMtime) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw) as DatabaseShape;
        if (parsed && Array.isArray(parsed.challenges) && Array.isArray(parsed.users)) {
          this.data = this.ensurePushState(parsed);
          this.lastLoadedMtime = stat.mtimeMs;
        }
      }
    } catch {
      // Bỏ qua lỗi đọc tức thời khi tiến trình khác đang ghi
    }
  }

  public getPrisma(): PrismaClient | null {
    return prisma;
  }

  public async syncFromPostgres() {
    if (!prisma) return;
    try {
      const [dbUsers, dbAttempts] = await Promise.all([
        prisma.user.findMany(),
        prisma.challengeAttempt.findMany().catch(() => []),
      ]);

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
      this.save();
    } catch (e: any) {
      console.warn('Prisma syncFromPostgres notice:', e?.message || e);
    }
  }

  private ensurePushState(parsed: DatabaseShape): DatabaseShape {
    const defaultSubs: PwaPushSubscriptionRecord[] = parsed.users
      .filter((u) => u.role === 'USER')
      .map((u, idx) => ({
        id: `pwa-seed-${u.id}`,
        endpoint: `https://pwa-device.speakright.local/endpoint/${u.employeeId}`,
        keys: {
          p256dh: `seed_p256dh_${u.employeeId}`,
          auth: `seed_auth_${u.employeeId}`,
        },
        userId: u.id,
        employeeId: u.employeeId,
        fullName: u.fullName,
        isPwaInstalled: true,
        isSimulated: true,
        userAgent: idx % 2 === 0 ? 'iPhone iOS 17.5 Standalone PWA' : 'Android 14 Chrome Standalone PWA',
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        updatedAt: new Date().toISOString(),
        lastNotifiedAt: null,
      }));

    if (!Array.isArray(parsed.pwaSubscriptions) || parsed.pwaSubscriptions.length === 0) {
      parsed.pwaSubscriptions = defaultSubs;
    }

    if (!Array.isArray(parsed.pushCampaigns)) {
      parsed.pushCampaigns = [];
    }

    if (!Array.isArray(parsed.inAppNotifications)) {
      parsed.inAppNotifications = [];
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
        morningHour: 8,
        morningMinute: 0,
        eveningTop1Hour: 19,
        eveningTop1Minute: 0,
        nightUnstudiedHour: 23,
        nightUnstudiedMinute: 0,
        lastMorningNotifiedDate: null,
        lastEveningTop1NotifiedDate: null,
        lastNightUnstudiedNotifiedDate: null,
        lastTop1UserId: null,
        notifiedUnlockedDays: unlockedNow.length ? unlockedNow : [1],
        notifiedUnstudiedKeys: [],
      };
    } else {
      parsed.pushConfig.morningHour = parsed.pushConfig.morningHour ?? 8;
      parsed.pushConfig.morningMinute = parsed.pushConfig.morningMinute ?? 0;
      parsed.pushConfig.eveningTop1Hour = parsed.pushConfig.eveningTop1Hour ?? 19;
      parsed.pushConfig.eveningTop1Minute = parsed.pushConfig.eveningTop1Minute ?? 0;
      parsed.pushConfig.nightUnstudiedHour = parsed.pushConfig.nightUnstudiedHour ?? 23;
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
        // Đảm bảo luôn có tài khoản Admin GEN: 88888888 với mật khẩu Admin@2026 và role ADMIN
        if (!Array.isArray(parsed.users)) parsed.users = [];
        const normalUsers = parsed.users.filter((u) => u.role === 'USER');
        if (normalUsers.length === 0) {
          parsed.users.push(...DEFAULT_EMPLOYEES);
        }
        if (!Array.isArray(parsed.attempts) || parsed.attempts.length === 0) {
          const now = Date.now();
          parsed.attempts = [
            {
              id: 'att-seed-1',
              userId: 'u-1',
              challengeId: 1,
              dayNumber: 1,
              score: 100,
              correctCount: 10,
              wrongCount: 0,
              timeSpentMs: 45000,
              answersDetail: {},
              startedAt: new Date(now - 7200000).toISOString(),
              completedAt: new Date(now - 7155000).toISOString(),
            },
            {
              id: 'att-seed-2',
              userId: 'u-2',
              challengeId: 1,
              dayNumber: 1,
              score: 90,
              correctCount: 9,
              wrongCount: 1,
              timeSpentMs: 52000,
              answersDetail: {},
              startedAt: new Date(now - 6500000).toISOString(),
              completedAt: new Date(now - 6448000).toISOString(),
            },
            {
              id: 'att-seed-3',
              userId: 'u-3',
              challengeId: 1,
              dayNumber: 1,
              score: 90,
              correctCount: 9,
              wrongCount: 1,
              timeSpentMs: 58000,
              answersDetail: {},
              startedAt: new Date(now - 5500000).toISOString(),
              completedAt: new Date(now - 5442000).toISOString(),
            },
            {
              id: 'att-seed-4',
              userId: 'u-4',
              challengeId: 1,
              dayNumber: 1,
              score: 80,
              correctCount: 8,
              wrongCount: 2,
              timeSpentMs: 65000,
              answersDetail: {},
              startedAt: new Date(now - 4500000).toISOString(),
              completedAt: new Date(now - 4435000).toISOString(),
            },
            {
              id: 'att-seed-5',
              userId: 'u-5',
              challengeId: 1,
              dayNumber: 1,
              score: 80,
              correctCount: 8,
              wrongCount: 2,
              timeSpentMs: 70000,
              answersDetail: {},
              startedAt: new Date(now - 3500000).toISOString(),
              completedAt: new Date(now - 3430000).toISOString(),
            },
            {
              id: 'att-seed-thao',
              userId: 'u-thao',
              challengeId: 1,
              dayNumber: 1,
              score: 70,
              correctCount: 7,
              wrongCount: 3,
              timeSpentMs: 80000,
              answersDetail: {},
              startedAt: new Date(now - 2500000).toISOString(),
              completedAt: new Date(now - 2420000).toISOString(),
            },
          ];
        }
        const adminUser = parsed.users.find((u) => u.employeeId === '88888888');
        const adminPassHash = bcrypt.hashSync('Admin@2026', 10);
        if (!adminUser) {
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
          if (!bcrypt.compareSync('Admin@2026', adminUser.passwordHash)) {
            adminUser.passwordHash = adminPassHash;
          }
        }
        const hydrated = this.ensurePushState(parsed);
        fs.writeFileSync(DB_FILE, JSON.stringify(hydrated, null, 2), 'utf-8');
        return hydrated;
      } catch (e) {
        console.warn('Khởi tạo lại dữ liệu mẫu do file db.json lỗi:', e);
      }
    }

    const adminPassHash = bcrypt.hashSync('Admin@2026', 10);

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
      ...DEFAULT_EMPLOYEES,
    ];

    const challenges = generate21DaysChallenges();

    const initialData: DatabaseShape = this.ensurePushState({
      users: initialUsers,
      challenges,
      attempts: [],
    });

    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
    if (fs.existsSync(DB_FILE)) {
      this.lastLoadedMtime = fs.statSync(DB_FILE).mtimeMs;
    }
    return initialData;
  }

  public save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
      if (fs.existsSync(DB_FILE)) {
        this.lastLoadedMtime = fs.statSync(DB_FILE).mtimeMs;
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

  private pruneExpiredSessions() {
    const now = Date.now();
    for (const [key, session] of this.activeSessions.entries()) {
      if (now - session.startedAt > SESSION_TTL_MS) {
        this.activeSessions.delete(key);
      }
    }
  }

  public getUsers() {
    return this.data.users;
  }

  public findUserByIdentifier(identifier: string): UserRecord | undefined {
    const clean = identifier.trim().toLowerCase();
    return this.data.users.find(
      (u) => u.employeeId.toLowerCase() === clean || u.email.toLowerCase() === clean
    );
  }

  public findUserById(id: string): UserRecord | undefined {
    return this.data.users.find((u) => u.id === id);
  }

  public async createUser(user: UserRecord): Promise<UserRecord> {
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
    const unlockMs = new Date(challenge.unlockDate).getTime();
    return new Date(unlockMs + 24 * 60 * 60 * 1000).toISOString();
  }

  public isDayEnded(challenge: DailyChallengeItem): boolean {
    return Date.now() >= new Date(this.getDayEndDate(challenge)).getTime();
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
    const open = this.data.challenges
      .filter((c) => this.isDayUnlocked(c) && !this.isDayEnded(c))
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
    this.pruneExpiredSessions();
    const user = this.findUserById(userId);
    const challenge = this.getChallengeByDay(dayNumber);
    if (!user || !challenge || !this.isDayUnlocked(challenge)) return null;

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
      questionsSnapshot,
    };

    this.activeSessions.set(`${userId}:${dayNumber}`, session);
    return session;
  }

  public getActiveSession(userId: string, dayNumber: number): ActiveQuizSession | undefined {
    this.pruneExpiredSessions();
    return this.activeSessions.get(`${userId}:${dayNumber}`);
  }

  public completeActiveSession(userId: string, dayNumber: number) {
    this.activeSessions.delete(`${userId}:${dayNumber}`);
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
    }
  ): {
    challenge: DailyChallengeItem | undefined;
    activePlayersAffected: number;
    lockModeUsed?: 'GRACEFUL' | 'FORCE';
    isUnlocked: boolean;
  } {
    this.reloadIfChanged();
    const challenge = this.getChallengeByDay(dayNumber);
    if (!challenge) return { challenge: undefined, activePlayersAffected: 0, isUnlocked: false };

    if (payload.title !== undefined) challenge.title = payload.title.trim();
    if (payload.dateLabel !== undefined) challenge.dateLabel = payload.dateLabel.trim();

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

  public getLeaderboard(department?: string) {
    const filtered = department
      ? this.data.users.filter((u) => u.department === department)
      : this.data.users;

    const sorted = [...filtered].sort((a, b) => {
      const scoreA = computeCompositeLeaderboardScore(a.totalScore, a.totalTimeMs);
      const scoreB = computeCompositeLeaderboardScore(b.totalScore, b.totalTimeMs);
      return scoreB - scoreA;
    });

    return sorted.map((u, idx) => ({
      rank: idx + 1,
      id: u.id,
      employeeId: u.employeeId,
      fullName: u.fullName,
      department: u.department,
      avatarUrl: u.avatarUrl,
      totalScore: u.totalScore,
      totalTimeMs: u.totalTimeMs,
      completedDays: u.completedDays,
    }));
  }

  // ==================== QUẢN LÝ PWA PUSH SUBSCRIPTIONS & CHIẾN DỊCH CHIA ĐỀU REQUEST ====================

  public getPushConfig(): PushStaggerConfig {
    if (!this.data.pushConfig) {
      this.ensurePushState(this.data);
    }
    return this.data.pushConfig!;
  }

  public updatePushConfig(patch: Partial<PushStaggerConfig>): PushStaggerConfig {
    const current = this.getPushConfig();
    this.data.pushConfig = {
      ...current,
      ...patch,
    };
    this.save();
    return this.data.pushConfig;
  }

  public getPwaSubscriptions(onlyInstalledPwa = true): PwaPushSubscriptionRecord[] {
    const list = this.data.pwaSubscriptions || [];
    return onlyInstalledPwa ? list.filter((s) => s.isPwaInstalled) : list;
  }

  public upsertPwaSubscription(input: {
    endpoint: string;
    keys?: { p256dh?: string; auth?: string };
    userId?: string | null;
    employeeId?: string | null;
    fullName?: string | null;
    isPwaInstalled?: boolean;
    userAgent?: string;
  }): PwaPushSubscriptionRecord {
    if (!this.data.pwaSubscriptions) {
      this.data.pwaSubscriptions = [];
    }

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
      if (resolvedEmployeeId) target.employeeId = resolvedEmployeeId;
      if (resolvedFullName) target.fullName = resolvedFullName;
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

  public getLatestUnlockedChallenge(): DailyChallengeItem {
    const unlocked = this.data.challenges
      .filter((c) => this.isDayUnlocked(c))
      .sort((a, b) => b.dayNumber - a.dayNumber);
    return unlocked[0] || this.data.challenges[0];
  }

  // Lấy danh sách những người có tài khoản + đã cài PWA nhưng CHƯA HỌC (chưa làm bài ngày mới nhất đang mở hoặc completedDays === 0)
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
        const userSubs = pwaSubs.filter((s) => s.userId === user.id);
        if (userSubs.length > 0) {
          results.push({
            user,
            subscriptions: userSubs,
            targetDay,
            neverStudiedAnyDay,
          });
        }
      }
    }

    return results;
  }

  public getPushCampaigns(): PushCampaignRecord[] {
    if (!this.data.pushCampaigns) {
      this.data.pushCampaigns = [];
    }
    return this.data.pushCampaigns;
  }

  public addPushCampaign(campaign: PushCampaignRecord): PushCampaignRecord {
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
    if (!this.data.inAppNotifications) {
      this.data.inAppNotifications = [];
    }
    this.data.inAppNotifications.unshift(notif);
    if (this.data.inAppNotifications.length > 100) {
      this.data.inAppNotifications = this.data.inAppNotifications.slice(0, 100);
    }
    this.save();
  }

  public getRecentInAppNotifications(userId?: string | null, sinceMs = 0): InAppNotificationRecord[] {
    const list = this.data.inAppNotifications || [];
    return list.filter((n) => {
      const timeOk = new Date(n.deliveredAt).getTime() > sinceMs;
      if (!timeOk) return false;
      // Gửi cho tất cả PWA (userId === null) hoặc gửi đích danh cho tài khoản chưa học (n.userId === userId)
      return n.userId === null || (userId && n.userId === userId);
    });
  }

  // ==================== QUẢN LÝ THIẾT BỊ ĐÃ ĐĂNG NHẬP (USER DEVICES) ====================

  public getUserDevices(userId: string, currentUa = ''): UserDeviceRecord[] {
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
    const user = this.findUserById(userId);
    if (!user) return false;
    const hash = await bcrypt.hash(newPassPlain, 10);
    user.passwordHash = hash;
    this.save();

    if (prisma) {
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: { passwordHash: hash },
        });
        console.log(`[DB] Đã đổi mật khẩu cho user ${user.employeeId} trong PostgreSQL!`);
      } catch (err: any) {
        console.error('[DB Error] Không thể update password user trong PostgreSQL:', err?.message || err);
      }
    }
    return true;
  }

  public async adminResetUserProgress(userId: string): Promise<boolean> {
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

    return { sentCount: targets.length, success: true };
  }
}

export const store = new DataStore();

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { DailyChallengeItem, QuestionItem, generate30DaysChallenges } from './seedData.js';

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
  eveningTop1Hour: number;     // Giờ thông báo Top 1 hiện tại (mặc định 19h tối, 1 lần/ngày)
  nightUnstudiedHour: number;  // Giờ nhắc những ai là USER mà chưa làm bài (mặc định 23h tối, 1 lần/ngày)
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

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

const T_MAX = 9999999;
// Thời gian ân hạn tối đa cho người đang làm bài khi Admin khóa mềm (15 phút)
const SESSION_TTL_MS = 15 * 60 * 1000;

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

  constructor() {
    this.data = this.loadOrSeed();
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
        eveningTop1Hour: 19,
        nightUnstudiedHour: 23,
        lastMorningNotifiedDate: null,
        lastEveningTop1NotifiedDate: null,
        lastNightUnstudiedNotifiedDate: null,
        lastTop1UserId: 'u-1',
        notifiedUnlockedDays: unlockedNow.length ? unlockedNow : [1],
        notifiedUnstudiedKeys: [],
      };
    } else {
      parsed.pushConfig.morningHour = parsed.pushConfig.morningHour ?? 8;
      parsed.pushConfig.eveningTop1Hour = parsed.pushConfig.eveningTop1Hour ?? 19;
      parsed.pushConfig.nightUnstudiedHour = parsed.pushConfig.nightUnstudiedHour ?? 23;
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
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw) as DatabaseShape;
        const firstQ = parsed.challenges?.[0]?.questions?.[0] as any;
        if (!firstQ || !firstQ.questionType) {
          parsed.challenges = generate30DaysChallenges();
        }
        const hydrated = this.ensurePushState(parsed);
        fs.writeFileSync(DB_FILE, JSON.stringify(hydrated, null, 2), 'utf-8');
        return hydrated;
      } catch (e) {
        console.warn('Khởi tạo lại dữ liệu mẫu do file db.json lỗi:', e);
      }
    }

    const defaultPassHash = bcrypt.hashSync('Speak@2026', 10);
    const adminPassHash = bcrypt.hashSync('Admin@2026', 10);

    const sampleUsers: UserRecord[] = [
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
        totalScore: 2500,
        totalTimeMs: 650000,
        completedDays: 12,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'u-thao',
        employeeId: '20261234',
        fullName: 'Nguyễn Thị Thảo',
        email: 'thaonguyen.work@gmail.com',
        phone: '0987654321',
        department: 'Quality Assurance (QA)',
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ThaoNguyen',
        passwordHash: defaultPassHash,
        role: 'USER',
        totalScore: 2150,
        totalTimeMs: 740000,
        completedDays: 12,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'u-1',
        employeeId: '20260001',
        fullName: 'Nguyễn Minh Anh',
        email: 'minhanh.dev@gmail.com',
        phone: '0912345001',
        department: 'R&D Center',
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=MinhAnh',
        passwordHash: defaultPassHash,
        role: 'USER',
        totalScore: 2980,
        totalTimeMs: 510000,
        completedDays: 15,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'u-2',
        employeeId: '20260002',
        fullName: 'Trần Quốc Huy',
        email: 'quochuy.eng@gmail.com',
        phone: '0912345002',
        department: 'Production',
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=QuocHuy',
        passwordHash: defaultPassHash,
        role: 'USER',
        totalScore: 2850,
        totalTimeMs: 540000,
        completedDays: 14,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'u-3',
        employeeId: '20260003',
        fullName: 'Lê Thu Hương',
        email: 'thuhuong.qa@gmail.com',
        phone: '0912345003',
        department: 'Quality Assurance (QA)',
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ThuHuong',
        passwordHash: defaultPassHash,
        role: 'USER',
        totalScore: 2720,
        totalTimeMs: 590000,
        completedDays: 14,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'u-4',
        employeeId: '20260004',
        fullName: 'Phạm Hoàng Nam',
        email: 'hoangnam.it@gmail.com',
        phone: '0912345004',
        department: 'IT & System',
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=HoangNam',
        passwordHash: defaultPassHash,
        role: 'USER',
        totalScore: 2650,
        totalTimeMs: 610000,
        completedDays: 13,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'u-5',
        employeeId: '20260005',
        fullName: 'Đỗ Mai Linh',
        email: 'mailinh.hr@gmail.com',
        phone: '0912345005',
        department: 'HR & Training',
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=MaiLinh',
        passwordHash: defaultPassHash,
        role: 'USER',
        totalScore: 2600,
        totalTimeMs: 630000,
        completedDays: 13,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'u-6',
        employeeId: '20260006',
        fullName: 'Vũ Đức Trọng',
        email: 'ductrong.eng@gmail.com',
        phone: '0912345006',
        department: 'Production',
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=DucTrong',
        passwordHash: defaultPassHash,
        role: 'USER',
        totalScore: 0,
        totalTimeMs: 0,
        completedDays: 0,
        createdAt: new Date().toISOString(),
      },
    ];

    const challenges = generate30DaysChallenges();

    const initialData: DatabaseShape = this.ensurePushState({
      users: sampleUsers,
      challenges,
      attempts: [],
    });

    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
    return initialData;
  }

  public save() {
    fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
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
      (u) => u.employeeId === clean || u.email.toLowerCase() === clean
    );
  }

  public findUserById(id: string): UserRecord | undefined {
    return this.data.users.find((u) => u.id === id);
  }

  public createUser(user: UserRecord): UserRecord {
    this.data.users.push(user);
    this.save();
    return user;
  }

  public getChallenges(): DailyChallengeItem[] {
    return this.data.challenges;
  }

  public getChallengeByDay(dayNumber: number): DailyChallengeItem | undefined {
    return this.data.challenges.find((c) => c.dayNumber === dayNumber);
  }

  public isDayUnlocked(challenge: DailyChallengeItem): boolean {
    return new Date(challenge.unlockDate).getTime() <= Date.now() && challenge.isPublished;
  }

  public getDayEndDate(challenge: DailyChallengeItem): string {
    const unlockMs = new Date(challenge.unlockDate).getTime();
    const d = new Date(unlockMs);
    const nextMidnight = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 0, 0);
    return nextMidnight.toISOString();
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

  // Xáo trộn đáp án ngẫu nhiên khác nhau cho từng người chơi & bỏ ký hiệu Audio A/B/C/D
  private shuffleOptionsForUser(
    options: QuestionItem['options'],
    questionType: QuestionItem['questionType'],
    seedStr: string
  ): QuestionItem['options'] {
    const cloned = JSON.parse(JSON.stringify(options)) as QuestionItem['options'];
    // Kết hợp seed theo userId + questionId + random salt nhẹ để mỗi người chơi có thứ tự khác nhau
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

    if (questionType === 'CHOOSE_AUDIO') {
      return cloned.map((opt, idx) => ({
        ...opt,
        text: `Mẫu phát âm ${idx + 1}`,
      }));
    }

    return cloned;
  }

  // ==================== CHẾ ĐỘ KHÁCH (KHÔNG ĐĂNG NHẬP) ====================

  /** Thử thách của ngày hôm nay: đã mở khóa và chưa kết thúc (00:00 hôm sau) */
  public getTodayChallenge(): DailyChallengeItem | undefined {
    const open = this.data.challenges
      .filter((c) => this.isDayUnlocked(c) && !this.isDayEnded(c))
      .sort((a, b) => b.dayNumber - a.dayNumber);
    return open[0];
  }

  /** Đề thi cho khách: xáo trộn đáp án nhưng KHÔNG tạo phiên thi & KHÔNG lưu điểm */
  public buildGuestQuestions(dayNumber: number, guestSeed: string): QuestionItem[] {
    const challenge = this.getChallengeByDay(dayNumber);
    if (!challenge) return [];
    const now = Date.now();
    const rawQuestions: QuestionItem[] = JSON.parse(JSON.stringify(challenge.questions));
    return rawQuestions.map((q) => ({
      ...q,
      options: this.shuffleOptionsForUser(
        q.options,
        q.questionType,
        `guest-${guestSeed}-day${dayNumber}-${q.id}-${now}`
      ),
    }));
  }

  // ==================== QUẢN LÝ PHIÊN THI ĐANG DIỄN RA & CHỐNG XUNG ĐỘT KHI KHÓA ====================

  public startQuizSession(userId: string, dayNumber: number): ActiveQuizSession | null {
    this.pruneExpiredSessions();
    const user = this.findUserById(userId);
    const challenge = this.getChallengeByDay(dayNumber);
    if (!user || !challenge) return null;

    const now = Date.now();
    // Chụp lại bản sao bộ câu hỏi ngay thời điểm nhân viên bắt đầu làm bài & xáo trộn đáp án theo từng nhân viên
    const rawQuestions: QuestionItem[] = JSON.parse(
      JSON.stringify(challenge.questions)
    );
    const questionsSnapshot: QuestionItem[] = rawQuestions.map((q) => ({
      ...q,
      options: this.shuffleOptionsForUser(
        q.options,
        q.questionType,
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

  // Kiểm tra xem ngày thi có bị Admin khóa cưỡng chế (Force Lock) sau khi user bắt đầu làm bài hay không
  public isSessionForceLocked(dayNumber: number, sessionStartedAt?: number): boolean {
    const forceLockTime = this.forceLockedDays.get(dayNumber);
    if (!forceLockTime) return false;
    if (!sessionStartedAt) return true;
    return forceLockTime >= sessionStartedAt;
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
  } {
    const challenge = this.getChallengeByDay(dayNumber);
    if (!challenge) return { challenge: undefined, activePlayersAffected: 0 };

    if (payload.title !== undefined) challenge.title = payload.title.trim();
    if (payload.dateLabel !== undefined) challenge.dateLabel = payload.dateLabel.trim();

    const activePlayers = this.getActiveSessionsForDay(dayNumber);

    if (payload.unlockNow !== undefined) {
      if (payload.unlockNow) {
        // Mở khóa ngày thi
        challenge.unlockDate = new Date(Date.now() - 60000).toISOString();
        challenge.isPublished = true;
        this.forceLockedDays.delete(dayNumber);
      } else {
        // Khóa ngày thi
        challenge.unlockDate = new Date(Date.now() + 86400000 * 30).toISOString();
        const mode = payload.lockMode || 'GRACEFUL';
        if (mode === 'FORCE') {
          // Khóa cưỡng chế: Hủy toàn bộ phiên đang làm dở của ngày này ngay lập tức
          this.forceLockedDays.set(dayNumber, Date.now());
          for (const s of activePlayers) {
            this.activeSessions.delete(`${s.userId}:${dayNumber}`);
          }
        }
        // Nếu mode === 'GRACEFUL' (Khóa mềm): Người mới không vào được, nhưng activeSessions cũ vẫn giữ nguyên để họ nộp bài nốt!
      }
    }

    this.save();
    return {
      challenge,
      activePlayersAffected: activePlayers.length,
      lockModeUsed: payload.lockMode || 'GRACEFUL',
    };
  }

  // ==================== CRUD CÂU HỎI (TEXT, AUDIO, VIDEO) CHO ADMIN ====================

  public addQuestionToDay(
    dayNumber: number,
    qData: Omit<QuestionItem, 'id' | 'challengeId' | 'orderIndex'>
  ): QuestionItem | null {
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
    const challenge = this.getChallengeByDay(dayNumber);
    if (!challenge) return null;

    const idx = challenge.questions.findIndex((q) => q.id === questionId);
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
    const challenge = this.getChallengeByDay(dayNumber);
    if (!challenge) return false;

    const beforeLen = challenge.questions.length;
    challenge.questions = challenge.questions
      .filter((q) => q.id !== questionId)
      .map((q, index) => ({
        ...q,
        orderIndex: index + 1,
      }));

    if (challenge.questions.length === beforeLen) return false;
    this.save();
    return true;
  }

  public copyQuestionsToAllDays(sourceDayNumber: number): number {
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

  public recordAttempt(attempt: AttemptRecord): {
    isFirstOfficialAttempt: boolean;
    climbedToTop1: boolean;
    previousTop1: { id: string; fullName: string; employeeId: string; totalScore: number } | null;
    newTop1: { id: string; fullName: string; employeeId: string; totalScore: number } | null;
  } {
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

  public getDashboardStats(dayFilter?: number) {
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

  public getAdminUsers(search = '', department = '') {
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

  public getAdminUserDetails(userId: string) {
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

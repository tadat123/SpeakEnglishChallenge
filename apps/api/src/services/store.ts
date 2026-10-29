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
  lastTop1UserId: string | null;
  notifiedUnlockedDays: number[];
  notifiedUnstudiedKeys: string[];
}

interface DatabaseShape {
  users: UserRecord[];
  challenges: DailyChallengeItem[];
  attempts: AttemptRecord[];
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
        lastTop1UserId: 'u-1',
        notifiedUnlockedDays: unlockedNow.length ? unlockedNow : [1],
        notifiedUnstudiedKeys: [],
      };
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

  public getUserAttempts(userId: string): AttemptRecord[] {
    return this.data.attempts.filter((a) => a.userId === userId);
  }

  public getAttempt(userId: string, dayNumber: number): AttemptRecord | undefined {
    return this.data.attempts.find(
      (a) => a.userId === userId && a.dayNumber === dayNumber
    );
  }

  // ==================== QUẢN LÝ PHIÊN THI ĐANG DIỄN RA & CHỐNG XUNG ĐỘT KHI KHÓA ====================

  public startQuizSession(userId: string, dayNumber: number): ActiveQuizSession | null {
    this.pruneExpiredSessions();
    const user = this.findUserById(userId);
    const challenge = this.getChallengeByDay(dayNumber);
    if (!user || !challenge) return null;

    const now = Date.now();
    // Chụp lại bản sao bộ câu hỏi ngay thời điểm nhân viên bắt đầu làm bài
    const questionsSnapshot: QuestionItem[] = JSON.parse(
      JSON.stringify(challenge.questions)
    );

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
}

export const store = new DataStore();

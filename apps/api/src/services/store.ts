import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import {
  DailyChallengeItem,
  QuestionItem,
  WorkplaceWordItem,
  generateChallengeDays,
} from './seedData.js';
import {
  ActiveQuizSession,
  AttemptRecord,
  BulkImportQuestionRow,
  ChallengeEventState,
  DEFAULT_POPUP_EVENTS,
  DatabaseShape,
  EventPopupItem,
  InAppNotificationRecord,
  PushCampaignRecord,
  PushStaggerConfig,
  StoreContext,
  UserDeviceRecord,
  UserRecord,
} from './store/storeTypes.js';
import {
  checkAndReloadAppStateFromPostgres,
  ensurePostgresAppStateTable,
  loadAppStateFromPostgres,
  saveAppStateToPostgres,
  syncAttemptToPostgres,
  syncDatabaseWithPostgres,
  syncUserCreateToPostgres,
  waitForPendingPostgresSave,
} from './store/postgresSync.js';
import * as challengeOps from './store/challengeStore.js';
import * as pushEventOps from './store/pushEventStore.js';
import * as adminStatsOps from './store/adminStatsStore.js';

export * from './store/storeTypes.js';

const dbUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
let prisma: PrismaClient | null = null;
if (dbUrl) {
  try {
    prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });
    console.log('[DB] Đã khởi tạo Prisma Client kết nối trực tiếp tới PostgreSQL (100% Database Mode - No db.json)!');
  } catch (err) {
    console.warn('Prisma Client init warning:', err);
  }
}

const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

class DataStore {
  private data: DatabaseShape;
  private activeSessions = new Map<string, ActiveQuizSession>();
  private forceLockedDays = new Map<number, number>();
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private lastNotificationTimestamp = 0;
  private readonly ctx: StoreContext;

  constructor() {
    this.ctx = {
      getData: () => this.data,
      getPrisma: () => prisma,
      reloadIfChanged: () => this.reloadIfChanged(),
      save: () => this.save(),
      ensurePushState: (parsed) => this.ensurePushState(parsed),
      activeSessions: this.activeSessions,
      forceLockedDays: this.forceLockedDays,
      getLastNotificationTimestamp: () => this.lastNotificationTimestamp,
      setLastNotificationTimestamp: (ts) => {
        this.lastNotificationTimestamp = ts;
      },
    };

    this.data = this.createInitialInMemorySeed();
    void this.bootstrapFromPostgres();

    // Đồng bộ ngầm cực nhẹ giữa các container api-1, api-2, api-3 thông qua PostgreSQL
    setInterval(() => {
      void checkAndReloadAppStateFromPostgres(this.ctx);
    }, 450);

    setInterval(() => {
      void syncDatabaseWithPostgres(this.ctx, true);
    }, 3000);
  }

  private async bootstrapFromPostgres(): Promise<void> {
    if (!prisma) return;
    try {
      await ensurePostgresAppStateTable(prisma);
      await loadAppStateFromPostgres(this.ctx);
      await syncDatabaseWithPostgres(this.ctx, true);
      const admin = this.data.users.find((u) => u.employeeId === '88888888');
      if (admin) {
        await syncUserCreateToPostgres(prisma, admin);
      }
      console.log(
        `[PostgreSQL] Đã nạp thành công ${this.data.users.length} users, ${this.data.challenges.length} ngày thi, ${this.data.attempts.length} lượt nộp bài từ PostgreSQL!`
      );
    } catch (err: any) {
      console.warn('[PostgreSQL] Bootstrap notice:', err?.message || err);
    }
  }

  private reloadIfChanged(): void {
    // Mọi đồng bộ được thực hiện hoàn toàn qua PostgreSQL (AppStateStore + User + ChallengeAttempt).
    // Tuyệt đối không đọc/ghi bất kỳ file db.json nào trên ổ đĩa.
  }

  public getPrisma(): PrismaClient | null {
    return prisma;
  }

  public getLastMtime(): number {
    return Date.now();
  }

  public async syncFromPostgres(): Promise<void> {
    await syncDatabaseWithPostgres(this.ctx, true);
  }

  public async checkPostgresVersion(): Promise<void> {
    await checkAndReloadAppStateFromPostgres(this.ctx);
  }

  public async waitForPendingWrites(): Promise<void> {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
      await saveAppStateToPostgres(this.ctx);
    }
    await waitForPendingPostgresSave();
  }

  private ensurePushState(parsed: DatabaseShape): DatabaseShape {
    if (!Array.isArray(parsed.pwaSubscriptions)) {
      parsed.pwaSubscriptions = [];
    } else {
      parsed.pwaSubscriptions = parsed.pwaSubscriptions.filter(
        (s) => !s.isSimulated && !String(s.id).startsWith('pwa-seed-')
      );
    }

    if (!Array.isArray(parsed.pushCampaigns)) parsed.pushCampaigns = [];
    if (!Array.isArray(parsed.inAppNotifications)) parsed.inAppNotifications = [];
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

  private createInitialInMemorySeed(): DatabaseShape {
    const adminPassHash = bcrypt.hashSync(process.env.ADMIN_DEFAULT_PASSWORD || 'Admin@2026', 8);
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
    const challenges = generateChallengeDays(21);
    const farFuture = new Date(Date.now() + 86400000 * 365).toISOString();
    for (const c of challenges) {
      c.dateLabel = '';
      c.unlockDate = farFuture;
      c.isPublished = false;
      c.forceLockedAt = null;
      c.forceRevealed = false;
    }
    return this.ensurePushState({
      users: initialUsers,
      challenges,
      challengeTotalDays: challenges.length,
      attempts: [],
    });
  }

  /**
   * Lưu trạng thái trực tiếp vào PostgreSQL (bảng AppStateStore). Tuyệt đối không dùng db.json.
   */
  public save() {
    adminStatsOps.invalidateLeaderboardCache();
    void saveAppStateToPostgres(this.ctx);
  }

  /**
   * Lưu trì hoãn 300ms vào PostgreSQL cho các nhịp heartbeat tần suất cao.
   */
  public saveDeferred() {
    if (this.saveTimer) return;
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      void saveAppStateToPostgres(this.ctx);
    }, 300);
  }

  public async resetToFreshAdminOnly(): Promise<{ success: boolean; message: string }> {
    const existingAdmin = this.data.users.find((u) => u.employeeId === '88888888');
    const adminPassHash =
      existingAdmin?.passwordHash ||
      bcrypt.hashSync(process.env.ADMIN_DEFAULT_PASSWORD || 'Admin@2026', 8);
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
    this.data.challenges = generateChallengeDays(this.data.challengeTotalDays || this.data.challenges.length || 21);

    this.startChallengeSchedule({ lockAllUntilStart: true });
    await saveAppStateToPostgres(this.ctx);

    if (prisma) {
      try {
        await prisma.challengeAttempt.deleteMany();
        await prisma.pwaPushSubscription.deleteMany();
        await prisma.user.deleteMany({ where: { employeeId: { not: '88888888' } } });
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
      message:
        'Hệ thống đã được thiết lập mới hoàn toàn trong PostgreSQL! Chỉ còn duy nhất tài khoản Admin (GEN: 88888888 / Mật khẩu: Admin@2026).',
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

  // ==================== USER QUERIES & ATTEMPTS ====================

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
    adminStatsOps.invalidateLeaderboardCache();
    await syncUserCreateToPostgres(prisma, user);
    return user;
  }

  public getUserAttempts(userId: string): AttemptRecord[] {
    return this.data.attempts.filter((a) => a.userId === userId);
  }

  public getAttempt(userId: string, dayNumber: number): AttemptRecord | undefined {
    return this.data.attempts.find((a) => a.userId === userId && a.dayNumber === dayNumber);
  }

  public async recordAttempt(attempt: AttemptRecord) {
    const existing = this.getAttempt(attempt.userId, attempt.dayNumber);
    if (existing) {
      return {
        isFirstOfficialAttempt: false,
        climbedToTop1: false,
        previousTop1: null,
        newTop1: null,
      };
    }

    const prevTop1 = this.getLeaderboard()[0] || null;
    const cfg = this.getPushConfig();
    const baselineTop1Id = cfg.lastTop1UserId || prevTop1?.id || null;

    this.data.attempts.push(attempt);
    const user = this.findUserById(attempt.userId);
    if (user) {
      const userAttempts = this.data.attempts.filter((a) => a.userId === user.id);
      user.totalScore = userAttempts.reduce((acc, a) => acc + (Number(a.score) || 0), 0);
      user.totalTimeMs = userAttempts.reduce((acc, a) => acc + (Number(a.timeSpentMs) || 0), 0);
      user.completedDays = new Set(userAttempts.map((a) => a.dayNumber)).size;
    }

    adminStatsOps.invalidateLeaderboardCache();
    const newTop1 = this.getLeaderboard()[0] || null;
    const climbedToTop1 = Boolean(
      newTop1 && newTop1.totalScore > 0 && baselineTop1Id !== newTop1.id
    );
    if (newTop1) {
      cfg.lastTop1UserId = newTop1.id;
      this.saveDeferred();
    }

    const challengeItem = this.data.challenges.find((c) => c.dayNumber === attempt.dayNumber);
    await syncAttemptToPostgres(prisma, user, challengeItem, attempt);

    return {
      isFirstOfficialAttempt: true,
      climbedToTop1,
      previousTop1: prevTop1
        ? { id: prevTop1.id, fullName: prevTop1.fullName, employeeId: prevTop1.employeeId, totalScore: prevTop1.totalScore }
        : null,
      newTop1: newTop1
        ? { id: newTop1.id, fullName: newTop1.fullName, employeeId: newTop1.employeeId, totalScore: newTop1.totalScore }
        : null,
    };
  }

  // ==================== ACTIVE QUIZ SESSIONS ====================

  public startQuizSession(userId: string, dayNumber: number): ActiveQuizSession | null {
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
    const rawQuestions: QuestionItem[] = JSON.parse(JSON.stringify(challenge.questions));
    const shuffledQuestions = challengeOps.shuffleArray(
      rawQuestions,
      `${user.id}-${user.employeeId}-day${dayNumber}-questions-${now}`
    );
    const questionsSnapshot: QuestionItem[] = shuffledQuestions.map((q, idx) => ({
      ...q,
      orderIndex: idx + 1,
      options: challengeOps.prepareOptionsForQuiz(
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
    this.saveDeferred();
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
    this.saveDeferred();
    return session;
  }

  public getActiveSession(userId: string, dayNumber: number): ActiveQuizSession | undefined {
    this.pruneExpiredSessions();
    return this.activeSessions.get(`${userId}:${dayNumber}`);
  }

  public completeActiveSession(userId: string, dayNumber: number) {
    this.activeSessions.delete(`${userId}:${dayNumber}`);
    this.saveDeferred();
  }

  public markSessionQ10Finished(userId: string, dayNumber: number, clientElapsedSeconds?: number): number | null {
    const session = this.getActiveSession(userId, dayNumber);
    if (!session) return null;
    if (!session.q10FinishedAt) session.q10FinishedAt = Date.now();
    if (typeof clientElapsedSeconds === 'number' && clientElapsedSeconds > 0) {
      session.q10ElapsedSeconds = Math.max(1, Math.floor(clientElapsedSeconds));
      session.elapsedSeconds = Math.max(session.elapsedSeconds || 0, session.q10ElapsedSeconds);
    } else if (!session.q10ElapsedSeconds && session.elapsedSeconds) {
      session.q10ElapsedSeconds = session.elapsedSeconds;
    }
    this.saveDeferred();
    if (session.q10ElapsedSeconds && session.q10ElapsedSeconds > 0) {
      return Math.max(2000, session.q10ElapsedSeconds * 1000);
    }
    return Math.max(2000, session.q10FinishedAt - session.startedAt);
  }

  public clearSessionQ10Finished(userId: string, dayNumber: number): void {
    const session = this.getActiveSession(userId, dayNumber);
    if (session) {
      delete session.q10FinishedAt;
      delete session.q10ElapsedSeconds;
      this.saveDeferred();
    }
  }

  public getActiveSessionsForDay(dayNumber: number): ActiveQuizSession[] {
    this.pruneExpiredSessions();
    return Array.from(this.activeSessions.values()).filter((s) => s.dayNumber === dayNumber);
  }

  public getAllActiveSessionCounts(): Record<number, number> {
    this.pruneExpiredSessions();
    const counts: Record<number, number> = {};
    for (const s of this.activeSessions.values()) {
      counts[s.dayNumber] = (counts[s.dayNumber] || 0) + 1;
    }
    return counts;
  }

  public isSessionForceLocked(dayNumber: number, _sessionStartedAt?: number): boolean {
    const challenge = this.getChallengeByDay(dayNumber);
    if (challenge && (challenge.forceLockedAt != null || !challenge.isPublished)) return true;
    return Boolean(this.forceLockedDays.get(dayNumber));
  }

  // ==================== CHALLENGES & QUESTIONS DELEGATORS ====================

  public getChallenges(): DailyChallengeItem[] {
    return this.data.challenges;
  }
  public getChallengeByDay(dayNumber: number) {
    return this.data.challenges.find((c) => c.dayNumber === dayNumber);
  }
  public isDayUnlocked = (c: DailyChallengeItem) => challengeOps.isDayUnlocked(this.ctx, c);
  public getDayEndDate = (c: DailyChallengeItem) => challengeOps.getDayEndDate(c);
  public isDayPassedDeadline = (c: DailyChallengeItem) => challengeOps.isDayPassedDeadline(c);
  public isResultsRevealed = (c: DailyChallengeItem) => challengeOps.isResultsRevealed(c);
  public isDayEnded = (c: DailyChallengeItem) => challengeOps.isDayPassedDeadline(c);
  public toggleRevealResults(dayNumber: number, forceRevealed?: boolean): DailyChallengeItem | null {
    const challenge = this.getChallengeByDay(dayNumber);
    if (!challenge) return null;
    challenge.forceRevealed = forceRevealed !== undefined ? forceRevealed : !challenge.forceRevealed;
    this.save();
    return challenge;
  }
  public getChallengeEventState = (): ChallengeEventState => challengeOps.getChallengeEventState(this.ctx);
  public getTodayChallenge = () => challengeOps.getTodayChallenge(this.ctx);
  public buildGuestQuestions = (dayNumber: number, guestSeed: string) =>
    challengeOps.buildGuestQuestions(this.ctx, dayNumber, guestSeed);
  public updateChallengeDay = (
    dayNumber: number,
    payload: Parameters<typeof challengeOps.updateChallengeDay>[2]
  ) => challengeOps.updateChallengeDay(this.ctx, dayNumber, payload);
  public configureChallengeDays = (totalDaysInput: number) =>
    challengeOps.configureChallengeDays(this.ctx, totalDaysInput);
  public startChallengeSchedule = (
    options?: Parameters<typeof challengeOps.startChallengeSchedule>[1]
  ) => challengeOps.startChallengeSchedule(this.ctx, options);
  public addQuestionToDay = (
    dayNumber: number,
    qData: Omit<QuestionItem, 'id' | 'challengeId' | 'orderIndex'>
  ) => challengeOps.addQuestionToDay(this.ctx, dayNumber, qData);
  public updateQuestionInDay = (
    dayNumber: number,
    questionId: string,
    qData: Partial<QuestionItem>
  ) => challengeOps.updateQuestionInDay(this.ctx, dayNumber, questionId, qData);
  public deleteQuestionFromDay = (dayNumber: number, questionId: string) =>
    challengeOps.deleteQuestionFromDay(this.ctx, dayNumber, questionId);
  public copyQuestionsToAllDays = (sourceDayNumber: number) =>
    challengeOps.copyQuestionsToAllDays(this.ctx, sourceDayNumber);
  public updateDayQ11Words = (dayNumber: number, words: WorkplaceWordItem[], cloneToAllDays = false) =>
    challengeOps.updateDayQ11Words(this.ctx, dayNumber, words, cloneToAllDays);
  public bulkImportQuestions = (
    rows: BulkImportQuestionRow[],
    options?: { mode?: 'overwrite' | 'append'; targetDayNumber?: number }
  ) => challengeOps.bulkImportQuestions(this.ctx, rows, options);

  // ==================== LEADERBOARD, STATS, ADMIN USERS ====================

  public getLeaderboard = (includeUnrevealed = false) =>
    adminStatsOps.getLeaderboard(this.ctx, includeUnrevealed);
  public getDashboardStats = (dayFilter?: number) => adminStatsOps.getDashboardStats(this.ctx, dayFilter);
  public getAdminUsers = (search = '') => adminStatsOps.getAdminUsers(this.ctx, search);
  public getAdminUserDetails = (userId: string) => adminStatsOps.getAdminUserDetails(this.ctx, userId);
  public deleteUser = (userId: string) => adminStatsOps.deleteUserRecord(this.ctx, userId);
  public adminResetUserPassword = (userId: string, newPassPlain: string) =>
    adminStatsOps.adminResetUserPassword(this.ctx, userId, newPassPlain);
  public adminResetUserProgress = (userId: string) =>
    adminStatsOps.adminResetUserProgress(this.ctx, userId);

  // ==================== PUSH, NOTIFICATIONS, DEVICES, EVENTS ====================

  public getPushConfig = (): PushStaggerConfig => pushEventOps.getPushConfig(this.ctx);
  public updatePushConfig = (patch: Partial<PushStaggerConfig>) => pushEventOps.updatePushConfig(this.ctx, patch);
  public getPwaSubscriptions = (onlyInstalledPwa = true) =>
    pushEventOps.getPwaSubscriptions(this.ctx, onlyInstalledPwa);
  public upsertPwaSubscription = (input: Parameters<typeof pushEventOps.upsertPwaSubscription>[1]) =>
    pushEventOps.upsertPwaSubscription(this.ctx, input);
  public removePwaSubscription = (endpoint: string) => pushEventOps.removePwaSubscription(this.ctx, endpoint);
  public unbindDeviceSubscriptions = (userId?: string | null, endpoint?: string | null, deviceId?: string | null) =>
    pushEventOps.unbindDeviceSubscriptions(this.ctx, userId, endpoint, deviceId);
  public getLatestUnlockedChallenge = () => pushEventOps.getLatestUnlockedChallenge(this.ctx);
  public getUnstudiedAccountsWithPwa = () => pushEventOps.getUnstudiedAccountsWithPwa(this.ctx);
  public getCompletedAccountsForCurrentDay = () => pushEventOps.getCompletedAccountsForCurrentDay(this.ctx);
  public getPushCampaigns = (): PushCampaignRecord[] => pushEventOps.getPushCampaigns(this.ctx);
  public addPushCampaign = (campaign: PushCampaignRecord) => pushEventOps.addPushCampaign(this.ctx, campaign);
  public addInAppNotification = (notif: InAppNotificationRecord) =>
    pushEventOps.addInAppNotification(this.ctx, notif);
  public addBatchInAppNotifications = (notifs: InAppNotificationRecord[]) =>
    pushEventOps.addBatchInAppNotifications(this.ctx, notifs);
  public getLastNotificationTimestamp(): number {
    return this.lastNotificationTimestamp;
  }
  public markNotificationsDelivered = (
    notificationIds: string[],
    userId?: string | null,
    deviceId?: string | null
  ) => pushEventOps.markNotificationsDelivered(this.ctx, notificationIds, userId, deviceId);
  public getRecentInAppNotifications = (
    userId?: string | null,
    sinceMs = 0,
    options?: { forPushPoll?: boolean; deviceId?: string | null }
  ) => pushEventOps.getRecentInAppNotifications(this.ctx, userId, sinceMs, options);
  public sendPersonalizedNotification = (
    payload: Parameters<typeof pushEventOps.sendPersonalizedNotification>[1]
  ) => pushEventOps.sendPersonalizedNotification(this.ctx, payload);
  public getUserDevices = (userId: string, currentUa = ''): UserDeviceRecord[] =>
    pushEventOps.getUserDevices(this.ctx, userId, currentUa);
  public recordUserDevice = (userId: string, userAgent = '', ip = '') =>
    pushEventOps.recordUserDevice(this.ctx, userId, userAgent, ip);
  public removeUserDevice = (userId: string, deviceId: string) =>
    pushEventOps.removeUserDevice(this.ctx, userId, deviceId);
  public getEvents = (onlyVisible = false): EventPopupItem[] => pushEventOps.getEvents(this.ctx, onlyVisible);
  public getEventById = (id: string) => this.getEvents(false).find((e) => e.id === id);
  public createEvent = (input: Partial<EventPopupItem>) => pushEventOps.createEvent(this.ctx, input);
  public updateEvent = (id: string, patch: Partial<EventPopupItem>) => pushEventOps.updateEvent(this.ctx, id, patch);
  public toggleEventVisibility = (id: string) => pushEventOps.toggleEventVisibility(this.ctx, id);
  public deleteEvent = (id: string) => pushEventOps.deleteEvent(this.ctx, id);
  public resetEventsToDefault = () => pushEventOps.resetEventsToDefault(this.ctx);
}

export const store = new DataStore();

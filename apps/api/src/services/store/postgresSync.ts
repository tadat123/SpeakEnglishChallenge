import fs from 'fs';
import path from 'path';
import { AttemptRecord, DatabaseShape, StoreContext, UserRecord } from './storeTypes.js';
import { DailyChallengeItem } from '../seedData.js';
import { invalidateLeaderboardCache } from './adminStatsStore.js';

/**
 * Xóa triệt để mọi tàn dư file db.json cũ trên ổ đĩa sau khi đã chuyển 100% sang PostgreSQL.
 */
function purgeLegacyJsonFiles(): any | null {
  let legacyParsed: any | null = null;
  const dirs = [
    path.resolve(process.cwd(), 'apps', 'api', 'data'),
    path.resolve(process.cwd(), 'data'),
  ];
  for (const dir of dirs) {
    try {
      if (!fs.existsSync(dir)) continue;
      const legacyFile = path.join(dir, 'db.json');
      if (fs.existsSync(legacyFile)) {
        try {
          legacyParsed = JSON.parse(fs.readFileSync(legacyFile, 'utf-8'));
        } catch {}
      }
      for (const name of fs.readdirSync(dir)) {
        if (name === 'db.json' || name.startsWith('db.json.tmp')) {
          try {
            fs.unlinkSync(path.join(dir, name));
            console.log(`[PostgreSQL Migration] Đã xóa vĩnh viễn file cũ: ${name}`);
          } catch {}
        }
      }
    } catch {}
  }
  return legacyParsed;
}

let lastPgSyncMs = 0;
let localAppStateVersion = 0;
let tableInitialized = false;
let pendingSavePromise: Promise<void> | null = null;

/**
 * Khởi tạo bảng AppStateStore trong PostgreSQL (lưu lịch trình, câu hỏi chi tiết, sự kiện, cấu hình push, phiên thi).
 * Tuyệt đối KHÔNG sử dụng file db.json trên ổ đĩa.
 */
export async function ensurePostgresAppStateTable(
  prisma: ReturnType<StoreContext['getPrisma']>
): Promise<void> {
  if (!prisma || tableInitialized) return;
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "AppStateStore" (
        "key" TEXT NOT NULL,
        "payload" JSONB NOT NULL,
        "version" BIGINT NOT NULL DEFAULT 1,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "AppStateStore_pkey" PRIMARY KEY ("key")
      );
    `);
    tableInitialized = true;
  } catch (err: any) {
    console.warn('[PostgreSQL] ensurePostgresAppStateTable notice:', err?.message || err);
  }
}

/**
 * Ghi trạng thái cấu hình & đề thi vào bảng AppStateStore của PostgreSQL (tăng version nguyên tử để đồng bộ giữa các container api-1, api-2, api-3).
 */
export function saveAppStateToPostgres(ctx: StoreContext): Promise<void> {
  const prisma = ctx.getPrisma();
  if (!prisma) return Promise.resolve();

  const runSave = async () => {
    try {
      await ensurePostgresAppStateTable(prisma);
      const data = ctx.getData();
      const activeSessionsObj = Object.fromEntries(ctx.activeSessions.entries());

      // Chỉ lưu cấu hình, đề thi, sự kiện, thông báo và phiên thi (~45KB) vào AppStateStore.
      // Toàn bộ 30.000 Users và 600.000 Attempts được lưu riêng trong bảng chuẩn "User" và "ChallengeAttempt".
      const statePayload = {
        challenges: data.challenges,
        challengeTotalDays: data.challengeTotalDays || data.challenges.length || 21,
        events: data.events || [],
        pushConfig: data.pushConfig,
        inAppNotifications: (data.inAppNotifications || []).slice(0, 200),
        pwaSubscriptions: data.pwaSubscriptions || [],
        pushCampaigns: (data.pushCampaigns || []).slice(0, 100),
        devices: data.devices || [],
        activeSessions: activeSessionsObj,
      };

      const jsonStr = JSON.stringify(statePayload);
      const rows = await prisma.$queryRawUnsafe<Array<{ version: string }>>(
        `INSERT INTO "AppStateStore" ("key", "payload", "version", "updatedAt")
         VALUES ('app_state', $1::jsonb, 1, CURRENT_TIMESTAMP)
         ON CONFLICT ("key") DO UPDATE
         SET "payload" = EXCLUDED."payload",
             "version" = "AppStateStore"."version" + 1,
             "updatedAt" = CURRENT_TIMESTAMP
         RETURNING "version"::text AS "version"`,
        jsonStr
      );

      if (rows && rows[0]?.version) {
        localAppStateVersion = Number(rows[0].version) || localAppStateVersion + 1;
      }
    } catch (err: any) {
      console.error('[PostgreSQL] Lỗi khi lưu AppStateStore:', err?.message || err);
    }
  };

  const nextPromise = (pendingSavePromise || Promise.resolve()).then(runSave, runSave);
  pendingSavePromise = nextPromise;
  return nextPromise;
}

export async function waitForPendingPostgresSave(): Promise<void> {
  if (pendingSavePromise) {
    await pendingSavePromise;
  }
}

/**
 * Nạp trạng thái AppStateStore từ PostgreSQL khi khởi động hoặc khi phát hiện container khác vừa cập nhật version mới.
 */
export async function loadAppStateFromPostgres(ctx: StoreContext): Promise<boolean> {
  const prisma = ctx.getPrisma();
  if (!prisma) return false;

  try {
    await ensurePostgresAppStateTable(prisma);
    const rows = await prisma.$queryRawUnsafe<Array<{ payload: any; version: string }>>(
      `SELECT "payload", "version"::text AS "version" FROM "AppStateStore" WHERE "key" = 'app_state' LIMIT 1`
    );

    const legacyData = purgeLegacyJsonFiles();

    if (!rows || rows.length === 0 || !rows[0].payload) {
      // Nếu có dữ liệu đề thi từ bản cũ vừa được di trú thì nạp vào PostgreSQL trước khi xóa hẳn file
      if (legacyData) {
        const data = ctx.getData();
        if (Array.isArray(legacyData.challenges) && legacyData.challenges.length > 0) {
          data.challenges = legacyData.challenges;
          data.challengeTotalDays =
            typeof legacyData.challengeTotalDays === 'number'
              ? legacyData.challengeTotalDays
              : legacyData.challenges.length;
        }
        if (Array.isArray(legacyData.events) && legacyData.events.length > 0) {
          data.events = legacyData.events;
        }
        if (legacyData.pushConfig) {
          data.pushConfig = legacyData.pushConfig;
        }
      }
      await saveAppStateToPostgres(ctx);
      return true;
    }

    const remoteVersion = Number(rows[0].version) || 1;
    const rawPayload =
      typeof rows[0].payload === 'string' ? JSON.parse(rows[0].payload) : rows[0].payload;

    const data = ctx.getData();
    if (Array.isArray(rawPayload.challenges) && rawPayload.challenges.length > 0) {
      data.challenges = rawPayload.challenges;
      data.challengeTotalDays =
        typeof rawPayload.challengeTotalDays === 'number'
          ? rawPayload.challengeTotalDays
          : rawPayload.challenges.length;
    }
    if (Array.isArray(rawPayload.events) && rawPayload.events.length > 0) {
      data.events = rawPayload.events;
    }
    if (rawPayload.pushConfig) {
      data.pushConfig = rawPayload.pushConfig;
    }
    if (Array.isArray(rawPayload.inAppNotifications)) {
      const notifs = rawPayload.inAppNotifications;
      data.inAppNotifications = notifs;
      if (notifs.length > 0 && notifs[0]?.deliveredAt) {
        ctx.setLastNotificationTimestamp(
          new Date(notifs[0].deliveredAt).getTime()
        );
      }
    }
    if (Array.isArray(rawPayload.pwaSubscriptions)) {
      data.pwaSubscriptions = rawPayload.pwaSubscriptions;
    }
    if (Array.isArray(rawPayload.pushCampaigns)) {
      data.pushCampaigns = rawPayload.pushCampaigns;
    }
    if (Array.isArray(rawPayload.devices)) {
      data.devices = rawPayload.devices;
    }
    if (rawPayload.activeSessions && typeof rawPayload.activeSessions === 'object') {
      ctx.activeSessions.clear();
      for (const [k, v] of Object.entries(rawPayload.activeSessions)) {
        ctx.activeSessions.set(k, v as any);
      }
    }

    ctx.ensurePushState(data as DatabaseShape);
    localAppStateVersion = remoteVersion;
    invalidateLeaderboardCache();
    return true;
  } catch (err: any) {
    console.warn('[PostgreSQL] loadAppStateFromPostgres notice:', err?.message || err);
    return false;
  }
}

/**
 * Kiểm tra nhanh version trong PostgreSQL (chỉ ~0.2ms) để đồng bộ tức thì giữa api-1, api-2, api-3.
 */
export async function checkAndReloadAppStateFromPostgres(ctx: StoreContext): Promise<void> {
  const prisma = ctx.getPrisma();
  if (!prisma) return;
  try {
    await ensurePostgresAppStateTable(prisma);
    const rows = await prisma.$queryRawUnsafe<Array<{ version: string }>>(
      `SELECT "version"::text AS "version" FROM "AppStateStore" WHERE "key" = 'app_state' LIMIT 1`
    );
    if (rows && rows[0]?.version) {
      const remoteVersion = Number(rows[0].version) || 0;
      if (remoteVersion !== localAppStateVersion) {
        await loadAppStateFromPostgres(ctx);
      }
    }
  } catch {
    // Ignore transient query errors
  }
}

/** Đồng bộ dữ liệu Users & ChallengeAttempts từ PostgreSQL lên bộ nhớ đệm RAM (tối ưu O(N+M) cho 30.000 người dùng) */
export async function syncDatabaseWithPostgres(ctx: StoreContext, force = false): Promise<void> {
  const prisma = ctx.getPrisma();
  if (!prisma) return;

  const now = Date.now();
  if (!force && now - lastPgSyncMs < 2000) {
    await checkAndReloadAppStateFromPostgres(ctx);
    return;
  }
  lastPgSyncMs = now;

  try {
    await checkAndReloadAppStateFromPostgres(ctx);

    const [dbUsers, dbChallenges, dbAttempts] = await Promise.all([
      prisma.user.findMany(),
      prisma.dailyChallenge.findMany().catch(() => []),
      prisma.challengeAttempt.findMany().catch(() => []),
    ]);

    const data = ctx.getData();

    const challengeIdToDay = new Map<number, number>();
    for (const dc of dbChallenges || []) {
      challengeIdToDay.set(dc.id, dc.dayNumber);
    }

    // 1. Xây dựng Map index O(1) thay vì findIndex O(N^2) để chạy mượt với 30.000 users
    const localById = new Map<string, number>();
    const localByEmpId = new Map<string, number>();
    data.users.forEach((u, i) => {
      localById.set(u.id, i);
      localByEmpId.set(u.employeeId, i);
    });

    if (dbUsers && dbUsers.length > 0) {
      for (const u of dbUsers) {
        const idx = localById.get(u.id) ?? localByEmpId.get(u.employeeId) ?? -1;
        const local = idx >= 0 ? data.users[idx] : null;
        if (local && local.id !== u.id) {
          const oldId = local.id;
          for (const att of data.attempts) {
            if (att.userId === oldId) att.userId = u.id;
          }
          for (const dev of data.devices || []) {
            if (dev.userId === oldId) dev.userId = u.id;
          }
          for (const sub of data.pwaSubscriptions || []) {
            if (sub.userId === oldId) sub.userId = u.id;
          }
        }

        const nextScore = Math.max(u.totalScore || 0, local?.totalScore || 0);
        const nextTime = Math.max(u.totalTimeMs || 0, local?.totalTimeMs || 0);
        const nextDays = Math.max(u.completedDays || 0, local?.completedDays || 0);

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
          totalScore: nextScore,
          totalTimeMs: nextTime,
          completedDays: nextDays,
          resetOtpCode: u.resetOtpCode || null,
          resetToken: u.resetToken || null,
          resetExpiresAt: u.resetExpiresAt ? u.resetExpiresAt.toISOString() : null,
          createdAt: u.createdAt.toISOString(),
        };

        if (idx >= 0) {
          data.users[idx] = { ...data.users[idx], ...userRec };
        } else {
          const newIdx = data.users.push(userRec) - 1;
          localById.set(userRec.id, newIdx);
          localByEmpId.set(userRec.employeeId, newIdx);
        }
      }
    }

    // 2. Đồng bộ Attempts với Set O(1) thay vì .some() O(M^2)
    const localAttemptIds = new Set<string>();
    const localAttemptUserDays = new Set<string>();
    for (const att of data.attempts) {
      localAttemptIds.add(att.id);
      localAttemptUserDays.add(`${att.userId}:${att.dayNumber}`);
    }

    if (dbAttempts && dbAttempts.length > 0) {
      for (const a of dbAttempts) {
        const dayNum = challengeIdToDay.get(a.challengeId) ?? a.challengeId;
        const userDayKey = `${a.userId}:${dayNum}`;
        if (!localAttemptIds.has(a.id) && !localAttemptUserDays.has(userDayKey)) {
          data.attempts.push({
            id: a.id,
            userId: a.userId,
            challengeId: a.challengeId,
            dayNumber: dayNum,
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
          localAttemptIds.add(a.id);
          localAttemptUserDays.add(userDayKey);
        }
      }
    }

    // 3. Gom nhóm attempts theo userId trong 1 lượt duyệt O(M)
    const attemptsByUser = new Map<string, AttemptRecord[]>();
    for (const a of data.attempts) {
      let arr = attemptsByUser.get(a.userId);
      if (!arr) {
        arr = [];
        attemptsByUser.set(a.userId, arr);
      }
      arr.push(a);
    }

    for (const local of data.users) {
      const userAttempts = attemptsByUser.get(local.id);
      if (userAttempts && userAttempts.length > 0) {
        local.totalScore = userAttempts.reduce((acc, a) => acc + (Number(a.score) || 0), 0);
        local.totalTimeMs = userAttempts.reduce((acc, a) => acc + (Number(a.timeSpentMs) || 0), 0);
        local.completedDays = new Set(userAttempts.map((a) => a.dayNumber)).size;
      }
    }

    const dbUserByEmpId = new Map<string, any>();
    for (const u of dbUsers || []) {
      dbUserByEmpId.set(u.employeeId, u);
    }

    for (const local of data.users) {
      const pgUser = dbUserByEmpId.get(local.employeeId);
      if (
        pgUser &&
        pgUser.totalScore === local.totalScore &&
        pgUser.completedDays === local.completedDays &&
        pgUser.totalTimeMs === local.totalTimeMs
      ) {
        continue;
      }
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
      } catch {
        // Ignore transient per-user sync errors
      }
    }

    invalidateLeaderboardCache();
  } catch (e: any) {
    console.warn('Prisma syncFromPostgres notice:', e?.message || e);
  }
}

export async function syncUserCreateToPostgres(
  prisma: ReturnType<StoreContext['getPrisma']>,
  user: UserRecord
): Promise<void> {
  if (!prisma) return;
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
  } catch (err: any) {
    console.error('[DB Error] Không thể lưu user vào PostgreSQL:', err?.message || err);
  }
}

export async function syncAttemptToPostgres(
  prisma: ReturnType<StoreContext['getPrisma']>,
  user: UserRecord | undefined,
  challengeItem: DailyChallengeItem | undefined,
  attempt: AttemptRecord
): Promise<void> {
  if (!prisma) return;
  try {
    if (user) {
      await prisma.user.upsert({
        where: { employeeId: user.employeeId },
        update: {
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
    }

    const pgChallenge = await prisma.dailyChallenge.upsert({
      where: { dayNumber: attempt.dayNumber },
      update: {
        title: challengeItem?.title || `Day ${attempt.dayNumber}`,
        unlockDate: new Date(challengeItem?.unlockDate || Date.now()),
        isPublished: Boolean(challengeItem?.isPublished ?? true),
      },
      create: {
        dayNumber: attempt.dayNumber,
        title: challengeItem?.title || `Day ${attempt.dayNumber}`,
        unlockDate: new Date(challengeItem?.unlockDate || Date.now()),
        isPublished: Boolean(challengeItem?.isPublished ?? true),
      },
    });

    await prisma.challengeAttempt.upsert({
      where: {
        userId_challengeId: { userId: attempt.userId, challengeId: pgChallenge.id },
      },
      update: {
        score: attempt.score,
        correctCount: attempt.correctCount,
        wrongCount: attempt.wrongCount,
        timeSpentMs: attempt.timeSpentMs,
        answersDetail: attempt.answersDetail as any,
      },
      create: {
        id: attempt.id,
        userId: attempt.userId,
        challengeId: pgChallenge.id,
        score: attempt.score,
        correctCount: attempt.correctCount,
        wrongCount: attempt.wrongCount,
        timeSpentMs: attempt.timeSpentMs,
        answersDetail: attempt.answersDetail as any,
        startedAt: new Date(attempt.startedAt),
        completedAt: new Date(attempt.completedAt),
      },
    });
  } catch (err: any) {
    console.error('[DB Error] Không thể lưu bài nộp vào PostgreSQL:', err?.message || err);
  }
}

export function syncBulkQuestionsToPostgresAsync(
  ctx: StoreContext,
  daysAffected: number[],
  mode: 'overwrite' | 'append'
): void {
  const prisma = ctx.getPrisma();
  if (!prisma) return;
  (async () => {
    try {
      const data = ctx.getData();
      for (const dayNum of daysAffected) {
        const ch = data.challenges.find((c) => c.dayNumber === dayNum);
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

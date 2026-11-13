import { AttemptRecord, StoreContext, UserRecord } from './storeTypes.js';
import { DailyChallengeItem } from '../seedData.js';

/** Đồng bộ hai chiều giữa JSON store và PostgreSQL qua Prisma */
export async function syncDatabaseWithPostgres(ctx: StoreContext): Promise<void> {
  ctx.reloadIfChanged();
  const prisma = ctx.getPrisma();
  if (!prisma) return;

  try {
    const [dbUsers, dbChallenges, dbAttempts] = await Promise.all([
      prisma.user.findMany(),
      prisma.dailyChallenge.findMany().catch(() => []),
      prisma.challengeAttempt.findMany().catch(() => []),
    ]);

    ctx.reloadIfChanged();
    const data = ctx.getData();

    const challengeIdToDay = new Map<number, number>();
    for (const dc of dbChallenges || []) {
      challengeIdToDay.set(dc.id, dc.dayNumber);
    }

    if (dbUsers && dbUsers.length > 0) {
      for (const u of dbUsers) {
        const idx = data.users.findIndex(
          (local) => local.id === u.id || local.employeeId === u.employeeId
        );
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
          totalScore: Math.max(u.totalScore || 0, local?.totalScore || 0),
          totalTimeMs: Math.max(u.totalTimeMs || 0, local?.totalTimeMs || 0),
          completedDays: Math.max(u.completedDays || 0, local?.completedDays || 0),
          resetOtpCode: u.resetOtpCode || null,
          resetToken: u.resetToken || null,
          resetExpiresAt: u.resetExpiresAt ? u.resetExpiresAt.toISOString() : null,
          createdAt: u.createdAt.toISOString(),
        };

        if (idx >= 0) {
          data.users[idx] = { ...data.users[idx], ...userRec };
        } else {
          data.users.push(userRec);
        }
      }
    }

    if (dbAttempts && dbAttempts.length > 0) {
      for (const a of dbAttempts) {
        const dayNum = challengeIdToDay.get(a.challengeId) ?? a.challengeId;
        const exists = data.attempts.some(
          (att) => att.id === a.id || (att.userId === a.userId && att.dayNumber === dayNum)
        );
        if (!exists) {
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
        }
      }
    }

    for (const local of data.users) {
      const userAttempts = data.attempts.filter((a) => a.userId === local.id);
      if (userAttempts.length > 0) {
        local.totalScore = userAttempts.reduce((acc, a) => acc + (Number(a.score) || 0), 0);
        local.totalTimeMs = userAttempts.reduce((acc, a) => acc + (Number(a.timeSpentMs) || 0), 0);
        local.completedDays = new Set(userAttempts.map((a) => a.dayNumber)).size;
      }
    }

    ctx.save();

    for (const local of data.users) {
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

    const pgAttemptKeys = new Set(
      (dbAttempts || []).map((a) => `${a.userId}:${challengeIdToDay.get(a.challengeId) ?? a.challengeId}`)
    );
    for (const att of data.attempts) {
      if (pgAttemptKeys.has(`${att.userId}:${att.dayNumber}`)) continue;
      try {
        const ch = data.challenges.find((c) => c.dayNumber === att.dayNumber);
        const pgChallenge = await prisma.dailyChallenge.upsert({
          where: { dayNumber: att.dayNumber },
          update: { title: ch?.title || `Day ${att.dayNumber}` },
          create: {
            dayNumber: att.dayNumber,
            title: ch?.title || `Day ${att.dayNumber}`,
            unlockDate: new Date(ch?.unlockDate || Date.now()),
            isPublished: Boolean(ch?.isPublished ?? true),
          },
        });
        await prisma.challengeAttempt.upsert({
          where: {
            userId_challengeId: { userId: att.userId, challengeId: pgChallenge.id },
          },
          update: {
            score: att.score,
            correctCount: att.correctCount,
            wrongCount: att.wrongCount,
            timeSpentMs: att.timeSpentMs,
            answersDetail: att.answersDetail as any,
          },
          create: {
            id: att.id,
            userId: att.userId,
            challengeId: pgChallenge.id,
            score: att.score,
            correctCount: att.correctCount,
            wrongCount: att.wrongCount,
            timeSpentMs: att.timeSpentMs,
            answersDetail: att.answersDetail as any,
            startedAt: new Date(att.startedAt),
            completedAt: new Date(att.completedAt),
          },
        });
      } catch {
        // Ignore transient per-attempt sync errors
      }
    }
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
    console.log(`[DB] Đã lưu thành công user ${user.employeeId} (${user.fullName}) vào PostgreSQL!`);
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
    console.log(`[DB] Đã lưu bài nộp Day ${attempt.dayNumber} của user ${attempt.userId} vào PostgreSQL!`);
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

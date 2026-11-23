import bcrypt from 'bcryptjs';
import {
  StoreContext,
  calcChallengeMaxPoints,
  computeCompositeLeaderboardScore,
} from './storeTypes.js';
import {
  getChallengeEventState,
  getTodayChallenge,
  isDayPassedDeadline,
  isDayUnlocked,
  isResultsRevealed,
} from './challengeStore.js';
import { getUserDevices } from './pushEventStore.js';
import { syncDatabaseWithPostgres } from './postgresSync.js';

let lbCacheRevealed: { ts: number; userCount: number; attemptCount: number; list: any[] } | null = null;
let lbCacheUnrevealed: { ts: number; userCount: number; attemptCount: number; list: any[] } | null = null;
const LB_CACHE_TTL_MS = 1500;

export function invalidateLeaderboardCache() {
  lbCacheRevealed = null;
  lbCacheUnrevealed = null;
}

export function getLeaderboard(ctx: StoreContext, includeUnrevealed = false) {
  ctx.reloadIfChanged();
  const data = ctx.getData();
  const now = Date.now();
  const uLen = data.users.length;
  const aLen = data.attempts.length;

  const currentCache = includeUnrevealed ? lbCacheUnrevealed : lbCacheRevealed;
  if (
    currentCache &&
    now - currentCache.ts < LB_CACHE_TTL_MS &&
    currentCache.userCount === uLen &&
    currentCache.attemptCount === aLen
  ) {
    return currentCache.list;
  }

  const revealedDayMap = new Map<number, boolean>();
  for (const c of data.challenges) {
    revealedDayMap.set(c.dayNumber, isResultsRevealed(c));
  }

  // Gom nhóm điểm đã công bố trong 1 lượt duyệt duy nhất O(M) thay vì O(N*M)
  const revealedStatsByUser = new Map<string, { score: number; timeMs: number; completed: number }>();
  if (!includeUnrevealed) {
    for (const a of data.attempts) {
      if (revealedDayMap.get(a.dayNumber)) {
        let st = revealedStatsByUser.get(a.userId);
        if (!st) {
          st = { score: 0, timeMs: 0, completed: 0 };
          revealedStatsByUser.set(a.userId, st);
        }
        st.score += a.score;
        st.timeMs += a.timeSpentMs;
        st.completed += 1;
      }
    }
  }

  const eligibleUsers = data.users.filter((u) => u.role !== 'ADMIN');

  const userScores = eligibleUsers.map((u) => {
    if (includeUnrevealed) {
      const comp = computeCompositeLeaderboardScore(u.totalScore, u.totalTimeMs);
      return {
        user: u,
        score: u.totalScore,
        timeMs: u.totalTimeMs,
        completedDays: u.completedDays,
        composite: comp,
      };
    }

    const st = revealedStatsByUser.get(u.id);
    const revealedScore = st ? st.score : 0;
    const revealedTimeMs = st ? st.timeMs : 0;
    const revealedCompleted = st ? st.completed : 0;

    return {
      user: u,
      score: revealedScore,
      timeMs: revealedTimeMs,
      completedDays: revealedCompleted,
      composite: computeCompositeLeaderboardScore(revealedScore, revealedTimeMs),
    };
  });

  userScores.sort((a, b) => b.composite - a.composite);

  const result = userScores.map((item, idx) => ({
    rank: idx + 1,
    id: item.user.id,
    employeeId: item.user.employeeId,
    fullName: item.user.fullName,
    avatarUrl: item.user.avatarUrl,
    totalScore: item.score,
    totalTimeMs: item.timeMs,
    completedDays: item.completedDays,
  }));

  if (includeUnrevealed) {
    lbCacheUnrevealed = { ts: now, userCount: uLen, attemptCount: aLen, list: result };
  } else {
    lbCacheRevealed = { ts: now, userCount: uLen, attemptCount: aLen, list: result };
  }

  return result;
}

export async function getDashboardStats(ctx: StoreContext, dayFilter?: number) {
  await syncDatabaseWithPostgres(ctx);
  const data = ctx.getData();
  const totalUsers =
    data.users.filter((u) => u.role === 'USER').length || data.users.length;
  const usersList = data.users.filter((u) => u.role === 'USER');
  const completedUsersCount = usersList.filter((u) => u.completedDays >= 1).length;
  const overallCompletionRate =
    totalUsers > 0 ? Math.round((completedUsersCount / totalUsers) * 100) : 0;

  const totalScoreSum = usersList.reduce((acc, u) => acc + (u.totalScore || 0), 0);
  const avgScore = totalUsers > 0 ? Math.round(totalScoreSum / totalUsers) : 0;

  const challenges = data.challenges;
  const todayChallenge = getTodayChallenge(ctx) || challenges[0];

  const allDaysStats = challenges.map((c) => {
    const attemptsForDay = data.attempts.filter((a) => a.dayNumber === c.dayNumber);
    const participantsCount = new Set(attemptsForDay.map((a) => a.userId)).size;
    const completionRate =
      totalUsers > 0 ? Math.round((participantsCount / totalUsers) * 100) : 0;

    const maxPoints = calcChallengeMaxPoints(c.questions);
    const totalScore = attemptsForDay.reduce((acc, a) => acc + a.score, 0);
    const averageScore =
      attemptsForDay.length > 0 ? Math.round(totalScore / attemptsForDay.length) : 0;
    const passCount = attemptsForDay.filter((a) =>
      maxPoints > 0 ? a.score / maxPoints >= 0.6 : false
    ).length;
    const perfectCount = attemptsForDay.filter((a) =>
      maxPoints > 0 ? a.score >= maxPoints : false
    ).length;
    const totalTime = attemptsForDay.reduce((acc, a) => acc + (a.timeSpentMs || 0), 0);
    const averageTimeSec =
      attemptsForDay.length > 0 ? Math.round(totalTime / attemptsForDay.length / 1000) : 0;

    return {
      dayNumber: c.dayNumber,
      title: c.title,
      dateLabel: c.dateLabel,
      maxPoints,
      isUnlocked: isDayUnlocked(ctx, c),
      isEnded: isDayPassedDeadline(c),
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
    totalAttempts: data.attempts.length,
    eventState: getChallengeEventState(ctx),
    todayChallenge: {
      dayNumber: todayChallenge?.dayNumber || 1,
      title: todayChallenge?.title || 'Day 1',
      dateLabel: todayChallenge?.dateLabel || '',
    },
    selectedDayStat,
    allDaysStats,
  };
}

export async function getAdminUsers(ctx: StoreContext, search = '') {
  await syncDatabaseWithPostgres(ctx);
  const data = ctx.getData();
  let users = data.users.map((u) => {
    const userAttempts = data.attempts.filter((a) => a.userId === u.id);
    const lastAttempt = [...userAttempts].sort(
      (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
    )[0];
    const devices = getUserDevices(ctx, u.id);

    const attemptsScoreSum = userAttempts.reduce((acc, a) => acc + (Number(a.score) || 0), 0);
    const attemptsPracticeScoreSum = userAttempts.reduce(
      (acc, a) => acc + (Number(a.practiceScore ?? a.score) || 0),
      0
    );
    const attemptsCompletedDays = new Set(userAttempts.map((a) => a.dayNumber)).size;

    const resolvedTotalScore =
      userAttempts.length > 0 ? Math.max(u.totalScore || 0, attemptsScoreSum) : u.totalScore || 0;
    const resolvedCompletedDays =
      userAttempts.length > 0
        ? Math.max(u.completedDays || 0, attemptsCompletedDays)
        : u.completedDays || 0;

    return {
      id: u.id,
      employeeId: u.employeeId,
      fullName: u.fullName,
      email: u.email,
      phone: u.phone,
      avatarUrl: u.avatarUrl,
      role: u.role,
      totalScore: resolvedTotalScore,
      practiceScore: attemptsPracticeScoreSum,
      completedDays: resolvedCompletedDays,
      attemptsCount: userAttempts.length,
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

  users.sort((a, b) => b.totalScore - a.totalScore || b.completedDays - a.completedDays);
  return users.map((u, idx) => ({ ...u, rank: idx + 1 }));
}

export async function getAdminUserDetails(ctx: StoreContext, userId: string) {
  await syncDatabaseWithPostgres(ctx);
  const data = ctx.getData();
  const user = data.users.find((u) => u.id === userId);
  if (!user) return null;
  const challengeByDay = new Map(data.challenges.map((c) => [c.dayNumber, c]));
  const attempts = data.attempts
    .filter((a) => a.userId === userId)
    .sort((a, b) => a.dayNumber - b.dayNumber)
    .map((a) => {
      const challenge = challengeByDay.get(a.dayNumber);
      return {
        ...a,
        dayTitle: challenge?.title || `Bài thi ngày ${a.dayNumber}`,
        totalPoints: challenge ? calcChallengeMaxPoints(challenge.questions) : 100,
      };
    });
  const devices = getUserDevices(ctx, userId);

  const attemptsScoreSum = attempts.reduce((acc, a) => acc + (Number(a.score) || 0), 0);
  const attemptsPracticeScoreSum = attempts.reduce(
    (acc, a) => acc + (Number(a.practiceScore ?? a.score) || 0),
    0
  );
  const attemptsCompletedDays = new Set(attempts.map((a) => a.dayNumber)).size;

  return {
    user: {
      id: user.id,
      employeeId: user.employeeId,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      totalScore: attempts.length > 0 ? Math.max(user.totalScore || 0, attemptsScoreSum) : user.totalScore || 0,
      practiceScore: attemptsPracticeScoreSum,
      completedDays:
        attempts.length > 0
          ? Math.max(user.completedDays || 0, attemptsCompletedDays)
          : user.completedDays || 0,
      createdAt: user.createdAt,
    },
    attempts,
    devices,
  };
}

export async function deleteUserRecord(ctx: StoreContext, userId: string): Promise<boolean> {
  ctx.reloadIfChanged();
  const data = ctx.getData();
  const idx = data.users.findIndex((u) => u.id === userId || u.employeeId === userId);
  if (idx === -1) return false;
  const removed = data.users.splice(idx, 1)[0];
  data.attempts = data.attempts.filter((a) => a.userId !== removed.id);
  ctx.save();

  const prisma = ctx.getPrisma();
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

export async function adminResetUserPassword(
  ctx: StoreContext,
  userId: string,
  newPassPlain: string
): Promise<boolean> {
  ctx.reloadIfChanged();
  const data = ctx.getData();
  const user = data.users.find((u) => u.id === userId);
  if (!user) return false;
  const hash = await bcrypt.hash(newPassPlain, 10);
  ctx.reloadIfChanged();
  const freshUser = ctx.getData().users.find((u) => u.id === userId);
  if (!freshUser) return false;
  freshUser.passwordHash = hash;
  ctx.save();

  const prisma = ctx.getPrisma();
  if (prisma) {
    try {
      await prisma.user.update({ where: { id: freshUser.id }, data: { passwordHash: hash } });
      console.log(`[DB] Đã đổi mật khẩu cho user ${freshUser.employeeId} trong PostgreSQL!`);
    } catch (err: any) {
      console.error('[DB Error] Không thể update password user trong PostgreSQL:', err?.message || err);
    }
  }
  return true;
}

export async function adminResetUserProgress(ctx: StoreContext, userId: string): Promise<boolean> {
  ctx.reloadIfChanged();
  const data = ctx.getData();
  const user = data.users.find((u) => u.id === userId);
  if (!user) return false;
  user.totalScore = 0;
  user.totalTimeMs = 0;
  user.completedDays = 0;
  data.attempts = data.attempts.filter((a) => a.userId !== user.id);
  ctx.save();

  const prisma = ctx.getPrisma();
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

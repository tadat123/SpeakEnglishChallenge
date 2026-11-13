import crypto from 'crypto';
import {
  DailyChallengeItem,
  QuestionItem,
  QuestionOption,
  QuestionType,
  WorkplaceWordItem,
  generateChallengeDays,
} from '../seedData.js';
import {
  BulkImportQuestionRow,
  ChallengeEventState,
  StoreContext,
} from './storeTypes.js';
import { syncBulkQuestionsToPostgresAsync } from './postgresSync.js';

export function isDayUnlocked(ctx: StoreContext, challenge: DailyChallengeItem): boolean {
  if (!challenge.isPublished) return false;
  if (challenge.forceLockedAt != null) return false;
  if (ctx.forceLockedDays.has(challenge.dayNumber)) return false;
  return new Date(challenge.unlockDate).getTime() <= Date.now();
}

export function getDayEndDate(challenge: DailyChallengeItem): string {
  if (challenge.dateLabel && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(challenge.dateLabel.trim())) {
    const [dd, mm, yyyy] = challenge.dateLabel.trim().split('/').map(Number);
    const endMs = Date.UTC(yyyy, mm - 1, dd, 17, 0, 0, 0);
    return new Date(endMs).toISOString();
  }
  const unlockMs = new Date(challenge.unlockDate).getTime();
  const d = new Date(unlockMs + 7 * 3600 * 1000);
  const nextVnMidnightUtc = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1, 17, 0, 0, 0);
  return new Date(nextVnMidnightUtc).toISOString();
}

export function isDayPassedDeadline(challenge: DailyChallengeItem): boolean {
  return Date.now() >= new Date(getDayEndDate(challenge)).getTime();
}

export function isResultsRevealed(challenge: DailyChallengeItem): boolean {
  if (challenge.forceRevealed) return true;
  return isDayPassedDeadline(challenge);
}

export function shuffleArray<T>(items: T[], seedStr: string): T[] {
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

export function prepareOptionsForQuiz(
  options: QuestionItem['options'],
  questionType: QuestionItem['questionType'],
  correctOptionId: string,
  seedStr: string
): QuestionItem['options'] {
  if (questionType === 'FILL_IN_THE_BLANK') return [];

  let candidateOptions = JSON.parse(JSON.stringify(options || [])) as QuestionItem['options'];

  if (questionType !== 'TRUE_FALSE' && candidateOptions.length > 3) {
    const correctOpt = candidateOptions.find((o) => o.id === correctOptionId);
    const otherOpts = candidateOptions.filter((o) => o.id !== correctOptionId);
    if (correctOpt) {
      candidateOptions = [correctOpt, ...otherOpts.slice(0, 2)];
    } else {
      candidateOptions = candidateOptions.slice(0, 3);
    }
  }

  const cloned = shuffleArray(candidateOptions, seedStr);
  if (questionType === 'CHOOSE_AUDIO') {
    return cloned.map((opt, idx) => ({
      ...opt,
      text: `Mẫu phát âm ${idx + 1}`,
    }));
  }
  return cloned;
}

export function getChallengeEventState(ctx: StoreContext): ChallengeEventState {
  ctx.reloadIfChanged();
  const data = ctx.getData();
  const sorted = [...data.challenges].sort((a, b) => a.dayNumber - b.dayNumber);
  const totalDays = sorted.length;
  const unlockedDaysCount = sorted.filter((c) => isDayUnlocked(ctx, c)).length;
  const publishedDays = sorted.filter((c) => c.isPublished && c.forceLockedAt == null);

  if (publishedDays.length === 0) {
    return {
      eventStatus: 'NOT_STARTED',
      eventStartAt: null,
      startDateLabel: null,
      startFromDayNumber: null,
      totalDays,
      unlockedDaysCount,
    };
  }

  const byUnlockAsc = [...publishedDays].sort(
    (a, b) =>
      new Date(a.unlockDate).getTime() - new Date(b.unlockDate).getTime() ||
      a.dayNumber - b.dayNumber
  );
  const earliest = byUnlockAsc[0];
  const earliestMs = new Date(earliest.unlockDate).getTime();

  if (unlockedDaysCount > 0) {
    return {
      eventStatus: 'ACTIVE',
      eventStartAt: earliest.unlockDate,
      startDateLabel: earliest.dateLabel,
      startFromDayNumber: earliest.dayNumber,
      totalDays,
      unlockedDaysCount,
    };
  }

  const now = Date.now();
  if (Number.isFinite(earliestMs) && earliestMs > now && earliestMs - now < 180 * 86400 * 1000) {
    return {
      eventStatus: 'COUNTDOWN',
      eventStartAt: earliest.unlockDate,
      startDateLabel: earliest.dateLabel,
      startFromDayNumber: earliest.dayNumber,
      totalDays,
      unlockedDaysCount,
    };
  }

  return {
    eventStatus: 'NOT_STARTED',
    eventStartAt: null,
    startDateLabel: null,
    startFromDayNumber: null,
    totalDays,
    unlockedDaysCount,
  };
}

export function getTodayChallenge(ctx: StoreContext): DailyChallengeItem | undefined {
  const data = ctx.getData();
  const nowVn = new Date(Date.now() + 7 * 3600 * 1000);
  const dd = String(nowVn.getUTCDate()).padStart(2, '0');
  const mm = String(nowVn.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = nowVn.getUTCFullYear();
  const todayVnDateLabel = `${dd}/${mm}/${yyyy}`;

  const matchByDate = data.challenges.find(
    (c) => c.dateLabel?.trim() === todayVnDateLabel && isDayUnlocked(ctx, c)
  );
  if (matchByDate) return matchByDate;

  const open = data.challenges
    .filter((c) => isDayUnlocked(ctx, c) && !isDayPassedDeadline(c))
    .sort((a, b) => b.dayNumber - a.dayNumber);
  if (open[0]) return open[0];

  const unlocked = data.challenges
    .filter((c) => isDayUnlocked(ctx, c))
    .sort((a, b) => b.dayNumber - a.dayNumber);
  return unlocked[0];
}

export function buildGuestQuestions(
  ctx: StoreContext,
  dayNumber: number,
  guestSeed: string
): QuestionItem[] {
  const challenge = ctx.getData().challenges.find((c) => c.dayNumber === dayNumber);
  if (!challenge) return [];
  const now = Date.now();
  const rawQuestions: QuestionItem[] = JSON.parse(JSON.stringify(challenge.questions));
  const shuffledQuestions = shuffleArray(
    rawQuestions,
    `guest-${guestSeed}-day${dayNumber}-questions-${now}`
  );
  return shuffledQuestions.map((q, idx) => ({
    ...q,
    orderIndex: idx + 1,
    options: prepareOptionsForQuiz(
      q.options,
      q.questionType,
      q.correctOptionId,
      `guest-${guestSeed}-day${dayNumber}-${q.id}-${now}`
    ),
  }));
}

export function updateChallengeDay(
  ctx: StoreContext,
  dayNumber: number,
  payload: {
    title?: string;
    dateLabel?: string;
    unlockNow?: boolean;
    lockMode?: 'GRACEFUL' | 'FORCE';
    forceRevealed?: boolean;
  }
) {
  ctx.reloadIfChanged();
  const challenge = ctx.getData().challenges.find((c) => c.dayNumber === dayNumber);
  if (!challenge) {
    return { challenge: undefined, activePlayersAffected: 0, isUnlocked: false, resultsRevealed: false };
  }

  if (payload.title !== undefined) challenge.title = payload.title.trim();
  if (payload.dateLabel !== undefined) challenge.dateLabel = payload.dateLabel.trim();
  if (payload.forceRevealed !== undefined) challenge.forceRevealed = Boolean(payload.forceRevealed);

  const activePlayers = Array.from(ctx.activeSessions.values()).filter(
    (s) => s.dayNumber === dayNumber
  );

  if (payload.unlockNow !== undefined) {
    if (payload.unlockNow) {
      challenge.unlockDate = new Date(Date.now() - 60000).toISOString();
      challenge.isPublished = true;
      challenge.forceLockedAt = null;
      ctx.forceLockedDays.delete(dayNumber);
    } else {
      challenge.unlockDate = new Date(Date.now() + 86400000 * 365).toISOString();
      challenge.isPublished = false;
      const mode = payload.lockMode || 'GRACEFUL';
      if (mode === 'FORCE') {
        challenge.forceLockedAt = Date.now();
        ctx.forceLockedDays.set(dayNumber, Date.now());
        for (const s of activePlayers) {
          ctx.activeSessions.delete(`${s.userId}:${dayNumber}`);
        }
      } else {
        challenge.forceLockedAt = null;
        ctx.forceLockedDays.delete(dayNumber);
      }
    }
  }

  ctx.save();
  return {
    challenge,
    activePlayersAffected: activePlayers.length,
    lockModeUsed: payload.lockMode || ('GRACEFUL' as const),
    isUnlocked: isDayUnlocked(ctx, challenge),
    resultsRevealed: isDayPassedDeadline(challenge),
  };
}

export function configureChallengeDays(ctx: StoreContext, totalDaysInput: number) {
  ctx.reloadIfChanged();
  const data = ctx.getData();
  const totalDays = Math.min(90, Math.max(1, Math.round(Number(totalDaysInput) || 21)));
  const existing = [...data.challenges].sort((a, b) => a.dayNumber - b.dayNumber);
  const previousTotalDays = existing.length;
  const prevEventState = getChallengeEventState(ctx);

  data.challengeTotalDays = totalDays;

  if (totalDays > previousTotalDays) {
    const generated = generateChallengeDays(totalDays);
    const lastDay = existing[existing.length - 1];
    const hasSchedule = prevEventState.eventStatus !== 'NOT_STARTED' && Boolean(lastDay?.unlockDate);
    const lastUnlockMs = lastDay ? new Date(lastDay.unlockDate).getTime() : Date.now();
    const farFuture = new Date(Date.now() + 86400000 * 365).toISOString();

    const additions: DailyChallengeItem[] = [];
    for (let d = previousTotalDays + 1; d <= totalDays; d++) {
      const baseItem = generated.find((g) => g.dayNumber === d)!;
      if (hasSchedule && Number.isFinite(lastUnlockMs)) {
        const offsetFromLast = d - previousTotalDays;
        const targetMs = lastUnlockMs + offsetFromLast * 86400 * 1000;
        const vnObj = new Date(targetMs + 7 * 3600 * 1000);
        const dd = String(vnObj.getUTCDate()).padStart(2, '0');
        const mm = String(vnObj.getUTCMonth() + 1).padStart(2, '0');
        const yyyy = vnObj.getUTCFullYear();
        baseItem.dateLabel = `${dd}/${mm}/${yyyy}`;
        baseItem.unlockDate = new Date(targetMs).toISOString();
        baseItem.isPublished = true;
      } else {
        baseItem.unlockDate = farFuture;
        baseItem.isPublished = false;
      }
      additions.push(baseItem);
    }
    data.challenges = [...existing, ...additions].sort((a, b) => a.dayNumber - b.dayNumber);
  } else if (totalDays < previousTotalDays) {
    data.challenges = existing.filter((c) => c.dayNumber <= totalDays);
    for (const [key] of ctx.activeSessions.entries()) {
      const dayNum = Number(key.split(':').pop());
      if (dayNum > totalDays) ctx.activeSessions.delete(key);
    }
    for (const dayNum of Array.from(ctx.forceLockedDays.keys())) {
      if (dayNum > totalDays) ctx.forceLockedDays.delete(dayNum);
    }
    for (const user of data.users) {
      const validAttempts = data.attempts.filter(
        (a) => a.userId === user.id && a.dayNumber >= 1 && a.dayNumber <= totalDays
      );
      user.completedDays = new Set(validAttempts.map((a) => a.dayNumber)).size;
    }
  }

  ctx.save();
  return {
    totalDays: data.challenges.length,
    previousTotalDays,
    challenges: data.challenges,
  };
}

export function startChallengeSchedule(
  ctx: StoreContext,
  options?: {
    totalDays?: number;
    startFromDayNumber?: number;
    startDateStr?: string;
    lockPreviousDays?: boolean;
    lockAllUntilStart?: boolean;
  }
) {
  ctx.reloadIfChanged();
  ctx.forceLockedDays.clear();
  const data = ctx.getData();

  if (typeof options?.totalDays === 'number' && options.totalDays >= 1) {
    configureChallengeDays(ctx, options.totalDays);
  }

  if (options?.lockAllUntilStart) {
    const farFuture = new Date(Date.now() + 86400000 * 365).toISOString();
    for (const c of data.challenges) {
      c.isPublished = false;
      c.unlockDate = farFuture;
      c.forceLockedAt = null;
      c.forceRevealed = false;
    }
    ctx.activeSessions.clear();
    ctx.save();
    return {
      startFromDayNumber: 1,
      startDateLabel: '',
      totalDays: data.challenges.length,
      unlockedDays: [] as number[],
      lockedDays: data.challenges.map((c) => c.dayNumber),
      challenges: data.challenges,
    };
  }

  const maxDay = Math.max(1, data.challenges.length);
  const startDay = Math.min(maxDay, Math.max(1, Number(options?.startFromDayNumber) || 1));
  const lockPrev = Boolean(options?.lockPreviousDays);

  let vnYear: number;
  let vnMonth: number;
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

  for (const c of data.challenges) {
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
    c.isPublished = !(c.dayNumber < startDay && lockPrev);

    if (isDayUnlocked(ctx, c)) unlockedDays.push(c.dayNumber);
    else lockedDays.push(c.dayNumber);
  }

  if (data.pushConfig) {
    data.pushConfig.notifiedUnlockedDays = [...unlockedDays];
  }

  ctx.save();
  return {
    startFromDayNumber: startDay,
    startDateLabel,
    totalDays: data.challenges.length,
    unlockedDays,
    lockedDays,
    challenges: data.challenges,
  };
}

export function addQuestionToDay(
  ctx: StoreContext,
  dayNumber: number,
  qData: Omit<QuestionItem, 'id' | 'challengeId' | 'orderIndex'>
): QuestionItem | null {
  ctx.reloadIfChanged();
  const challenge = ctx.getData().challenges.find((c) => c.dayNumber === dayNumber);
  if (!challenge) return null;

  const newQuestion: QuestionItem = {
    ...qData,
    id: `day-${dayNumber}-q-${crypto.randomUUID().slice(0, 8)}`,
    challengeId: challenge.id,
    orderIndex: challenge.questions.length + 1,
  };

  challenge.questions.push(newQuestion);
  ctx.save();
  return newQuestion;
}

export function updateQuestionInDay(
  ctx: StoreContext,
  dayNumber: number,
  questionId: string,
  qData: Partial<QuestionItem>
): QuestionItem | null {
  ctx.reloadIfChanged();
  const challenge = ctx.getData().challenges.find((c) => c.dayNumber === dayNumber);
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

  ctx.save();
  return challenge.questions[idx];
}

export function deleteQuestionFromDay(
  ctx: StoreContext,
  dayNumber: number,
  questionId: string
): boolean {
  ctx.reloadIfChanged();
  const challenge = ctx.getData().challenges.find((c) => c.dayNumber === dayNumber);
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
    .map((q, index) => ({ ...q, orderIndex: index + 1 }));

  if (challenge.questions.length === beforeLen) return false;
  ctx.save();
  return true;
}

export function copyQuestionsToAllDays(ctx: StoreContext, sourceDayNumber: number): number {
  ctx.reloadIfChanged();
  const data = ctx.getData();
  const source = data.challenges.find((c) => c.dayNumber === sourceDayNumber);
  if (!source) return 0;

  let updatedCount = 0;
  for (const c of data.challenges) {
    if (c.dayNumber === sourceDayNumber) continue;
    c.questions = source.questions.map((q, idx) => ({
      ...JSON.parse(JSON.stringify(q)),
      id: `day-${c.dayNumber}-q-${idx + 1}`,
      challengeId: c.id,
      orderIndex: idx + 1,
    }));
    updatedCount++;
  }
  ctx.save();
  return updatedCount;
}

export function updateDayQ11Words(
  ctx: StoreContext,
  dayNumber: number,
  words: WorkplaceWordItem[],
  cloneToAllDays = false
): DailyChallengeItem | null {
  ctx.reloadIfChanged();
  const data = ctx.getData();
  const cleanWords = (words || [])
    .filter((w) => w && String(w.word || '').trim().length > 0)
    .slice(0, 5)
    .map((w, idx) => ({ ...w, id: idx + 1 }));
  const challenge = data.challenges.find((c) => c.dayNumber === dayNumber);
  if (!challenge) return null;

  challenge.q11Words = cleanWords;
  if (cloneToAllDays) {
    for (const c of data.challenges) {
      c.q11Words = JSON.parse(JSON.stringify(cleanWords));
    }
  }
  ctx.save();
  return challenge;
}

export function bulkImportQuestions(
  ctx: StoreContext,
  rows: BulkImportQuestionRow[],
  options?: { mode?: 'overwrite' | 'append'; targetDayNumber?: number }
) {
  ctx.reloadIfChanged();
  const data = ctx.getData();
  const mode = options?.mode || 'overwrite';
  const targetDay = options?.targetDayNumber;
  const grouped = new Map<number, BulkImportQuestionRow[]>();

  for (const rawRow of rows) {
    if (!rawRow || !rawRow.promptText?.trim()) continue;
    let day = targetDay;
    if (!day) {
      const parsedDay = Number(rawRow.dayNumber);
      day = !isNaN(parsedDay) && parsedDay >= 1 && parsedDay <= 90 ? parsedDay : 1;
    }
    if (!grouped.has(day)) grouped.set(day, []);
    grouped.get(day)!.push(rawRow);
  }

  const daysAffected: number[] = [];
  const daySummaries: Record<number, number> = {};
  let totalImported = 0;

  for (const [dayNumber, dayRows] of grouped.entries()) {
    let challenge = data.challenges.find((c) => c.dayNumber === dayNumber);
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
      data.challenges.push(challenge);
      data.challenges.sort((a, b) => a.dayNumber - b.dayNumber);
    }

    if (mode === 'overwrite') challenge.questions = [];
    let currentOrder = challenge.questions.length;

    for (const row of dayRows) {
      currentOrder++;
      const rawType = String(row.questionType || '').trim().toUpperCase();
      let questionType: QuestionType = 'LISTEN_AND_CHOOSE';

      if (rawType.includes('CHOOSE_AUDIO') || rawType === '1' || rawType.includes('AUDIO')) {
        questionType = 'CHOOSE_AUDIO';
      } else if (rawType.includes('TRUE_FALSE') || rawType === '2' || rawType.includes('TF') || rawType.includes('TRUE')) {
        questionType = 'TRUE_FALSE';
      } else if (rawType.includes('VOCAB') || rawType === '4' || rawType.includes('MEANING')) {
        questionType = 'VOCAB_MEANING';
      } else if (rawType.includes('FILL') || rawType.includes('BLANK') || rawType === '5') {
        questionType = 'FILL_IN_THE_BLANK';
      }

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
      let correctOptionId = 'A';

      if (questionType === 'TRUE_FALSE') {
        options = [
          { id: 'A', text: row.optionA?.trim() || 'True – Đúng', hasOptionAudio: false },
          { id: 'B', text: row.optionB?.trim() || 'False – Sai', hasOptionAudio: false },
        ];
        const rawCorr = String(row.correctOptionId || '').trim().toUpperCase();
        correctOptionId = rawCorr === 'B' || rawCorr.includes('FALSE') || rawCorr.includes('SAI') ? 'B' : 'A';
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
        const optA = row.optionA?.trim() || 'Option A';
        const optB = row.optionB?.trim() || 'Option B';
        options = [
          { id: 'A', text: optA, spokenText: optA, hasOptionAudio: false },
          { id: 'B', text: optB, spokenText: optB, hasOptionAudio: false },
        ];
        if (row.optionC?.trim()) options.push({ id: 'C', text: row.optionC.trim(), spokenText: row.optionC.trim(), hasOptionAudio: false });
        if (row.optionD?.trim()) options.push({ id: 'D', text: row.optionD.trim(), spokenText: row.optionD.trim(), hasOptionAudio: false });
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

      challenge.questions.push({
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
      });
      totalImported++;
    }

    challenge.questions.forEach((q, idx) => {
      q.orderIndex = idx + 1;
    });

    daysAffected.push(dayNumber);
    daySummaries[dayNumber] = challenge.questions.length;
  }

  ctx.save();
  syncBulkQuestionsToPostgresAsync(ctx, daysAffected, mode);

  return {
    success: true,
    totalImported,
    daysAffected: daysAffected.sort((a, b) => a - b),
    daySummaries,
  };
}

import { FastifyInstance } from 'fastify';
import crypto from 'crypto';
import { calcChallengeMaxPoints, store } from '../services/store.js';
import { QuestionItem } from '../services/seedData.js';

function sanitizeQuizQuestions(questions: QuestionItem[]) {
  return questions.map((q) => ({
    id: q.id,
    orderIndex: q.orderIndex,
    questionType: q.questionType,
    categoryLabel: q.categoryLabel,
    promptText: q.promptText,
    statementText: q.statementText,
    targetWord: q.targetWord,
    hasPromptAudio: q.hasPromptAudio,
    audioNote: q.audioNote,
    promptAudioUrl: q.promptAudioUrl,
    promptVideoUrl: q.promptVideoUrl,
    options: q.options,
    points: q.points,
  }));
}

function gradeQuestionsForReview(questions: QuestionItem[], answers: Record<string, any> | undefined) {
  let score = 0;
  let totalPoints = 0;
  let correctCount = 0;
  let wrongCount = 0;

  const detailedReview = questions.map((q) => {
    const qPoints = Number(q.points) > 0 ? Number(q.points) : 10;
    totalPoints += qPoints;

    const selectedOptionId = answers?.[q.id] || null;
    let isCorrect = false;

    if (q.questionType === 'FILL_IN_THE_BLANK') {
      const userText = String(answers?.[q.id] || '')
        .trim()
        .toLowerCase()
        .replace(/['’]/g, "'");
      const expected = String(q.targetWord || '')
        .trim()
        .toLowerCase()
        .replace(/['’]/g, "'");
      isCorrect = userText.length > 0 && userText === expected;
    } else {
      isCorrect = selectedOptionId === q.correctOptionId;
    }

    if (isCorrect) {
      score += qPoints;
      correctCount += 1;
    } else {
      wrongCount += 1;
    }

    const correctOption = q.options?.find((o) => o.id === q.correctOptionId);
    const selectedOption = q.options?.find((o) => o.id === selectedOptionId);

    return {
      questionId: q.id,
      orderIndex: q.orderIndex,
      questionType: q.questionType,
      promptText: q.promptText,
      statementText: q.statementText,
      targetWord: q.targetWord,
      promptAudioUrl: q.promptAudioUrl,
      promptVideoUrl: q.promptVideoUrl,
      options: q.options || [],
      selectedOptionId,
      selectedOptionText:
        q.questionType === 'FILL_IN_THE_BLANK'
          ? answers?.[q.id] || 'Chưa điền'
          : selectedOption?.text || 'Chưa chọn',
      correctOptionId: q.correctOptionId,
      correctOptionText:
        q.questionType === 'FILL_IN_THE_BLANK' ? q.targetWord : correctOption?.text || '',
      isCorrect,
      explanation: q.explanation,
    };
  });

  return { score, totalPoints, correctCount, wrongCount, detailedReview };
}

export function registerChallengeRoutes(app: FastifyInstance) {
  app.get('/api/event-status', async () => store.getChallengeEventState());

  app.get('/api/public/today', async () => {
    const eventState = store.getChallengeEventState();
    const c = store.getTodayChallenge();
    if (!c) return { challenge: null, ...eventState };
    return {
      challenge: {
        id: c.id,
        dayNumber: c.dayNumber,
        title: c.title,
        dateLabel: c.dateLabel,
        unlockDate: c.unlockDate,
        endsAt: store.getDayEndDate(c),
        resultsRevealed: store.isResultsRevealed(c),
        questionCount: c.questions.length,
        totalPoints: calcChallengeMaxPoints(c.questions),
        status: 'OPEN',
        isCompletedByMe: false,
        stars: 0,
        score: null,
        timeSpentMs: null,
      },
      ...eventState,
    };
  });

  app.post('/api/public/challenges/:dayNumber/start', async (request: any, reply) => {
    const dayNumber = Number(request.params.dayNumber);
    const challenge = store.getChallengeByDay(dayNumber);
    if (!challenge || !store.isDayUnlocked(challenge)) {
      return reply.status(403).send({
        code: 'DAY_LOCKED',
        message: 'Bài học hôm nay chưa được mở hoặc đang bị khóa bởi Ban tổ chức.',
      });
    }

    if (!challenge.questions || challenge.questions.length === 0) {
      return reply.status(400).send({
        code: 'NO_QUESTIONS',
        message: `${challenge.title} hiện chưa có câu hỏi nào. Vui lòng chờ Ban tổ chức cập nhật đề thi!`,
      });
    }

    const today = store.getTodayChallenge();
    if (!today || today.dayNumber !== dayNumber) {
      return reply.status(403).send({
        code: 'LOGIN_REQUIRED',
        message: 'Khách chỉ được làm bài của ngày hôm nay. Vui lòng đăng nhập để làm các bài khác.',
      });
    }

    const guestSeed = String(request.body?.guestId || crypto.randomUUID());
    const questions = sanitizeQuizQuestions(store.buildGuestQuestions(dayNumber, guestSeed));

    return {
      dayNumber: today.dayNumber,
      title: today.title,
      dateLabel: today.dateLabel,
      startedAt: Date.now(),
      isGuest: true,
      questions,
      q11Words: Array.isArray(challenge?.q11Words) ? challenge.q11Words : [],
    };
  });

  app.get('/api/public/leaderboard', async () => {
    const list = store.getLeaderboard();
    return {
      topList: list.slice(0, 50),
      myRank: null,
    };
  });

  app.get('/api/challenges', { preHandler: [(app as any).authenticate] }, async (request: any) => {
    const userId = request.user.sub;
    const challenges = store.getChallenges();
    const attempts = store.getUserAttempts(userId);
    const activeCounts = store.getAllActiveSessionCounts();
    const today = store.getTodayChallenge();

    return challenges.map((c) => {
      const attempt = attempts.find((a) => a.dayNumber === c.dayNumber);
      const activeSession = store.getActiveSession(userId, c.dayNumber);
      const isUnlocked = store.isDayUnlocked(c);
      const isToday = today?.dayNumber === c.dayNumber;
      const isPassedDeadline = store.isDayPassedDeadline(c);
      const resultsRevealed = store.isResultsRevealed(c);
      const endsAt = store.getDayEndDate(c);

      const maxPoints = calcChallengeMaxPoints(c.questions);
      let stars = 0;
      if (attempt && resultsRevealed) {
        const displayScore = attempt.practiceScore ?? attempt.score;
        const ratio = maxPoints > 0 ? displayScore / maxPoints : 0;
        if (ratio >= 0.9) stars = 3;
        else if (ratio >= 0.6) stars = 2;
        else stars = 1;
      }

      let status: 'COMPLETED' | 'EXPIRED' | 'IN_PROGRESS' | 'OPEN' | 'LOCKED' = 'LOCKED';
      if (attempt) status = 'COMPLETED';
      else if (activeSession) status = 'IN_PROGRESS';
      else if (!isToday && isPassedDeadline && isUnlocked) status = 'EXPIRED';
      else if (isUnlocked) status = 'OPEN';

      return {
        id: c.id,
        dayNumber: c.dayNumber,
        title: c.title,
        dateLabel: c.dateLabel,
        unlockDate: c.unlockDate,
        endsAt,
        isToday,
        resultsRevealed,
        isPublished: c.isPublished,
        questionCount: c.questions.length,
        totalPoints: maxPoints,
        activePlayersCount: activeCounts[c.dayNumber] || 0,
        status,
        isCompletedByMe: Boolean(attempt),
        isExpired: Boolean(attempt?.isExpired || (!attempt && !isToday && isPassedDeadline && isUnlocked)),
        stars,
        score: attempt ? (resultsRevealed ? attempt.score : null) : null,
        practiceScore: attempt ? (resultsRevealed ? attempt.practiceScore ?? attempt.score : null) : null,
        timeSpentMs: attempt?.timeSpentMs ?? null,
      };
    });
  });

  app.post(
    '/api/challenges/:dayNumber/start',
    { preHandler: [(app as any).authenticate] },
    async (request: any, reply) => {
      const dayNumber = Number(request.params.dayNumber);
      const userId = request.user.sub;
      const challenge = store.getChallengeByDay(dayNumber);

      if (!challenge) {
        return reply.status(404).send({ message: 'Không tìm thấy ngày thử thách này.' });
      }
      if (!store.isDayUnlocked(challenge)) {
        return reply.status(403).send({
          code: 'DAY_LOCKED',
          message: `${challenge.title} hiện đang khóa hoặc chưa được mở! Vui lòng quay lại sau khi Ban tổ chức mở khóa.`,
        });
      }

      if (!challenge.questions || challenge.questions.length === 0) {
        return reply.status(400).send({
          code: 'NO_QUESTIONS',
          message: `${challenge.title} hiện chưa có câu hỏi nào. Vui lòng quay lại sau khi Ban tổ chức cập nhật đề.`,
        });
      }

      const session = store.startQuizSession(userId, dayNumber);
      if (!session) {
        return reply.status(400).send({ message: 'Không thể khởi tạo phiên làm bài.' });
      }

      const sanitizedQuestions = sanitizeQuizQuestions(session.questionsSnapshot);
      const isToday = store.getTodayChallenge()?.dayNumber === challenge.dayNumber;
      const isExpired = !isToday && store.isDayPassedDeadline(challenge);
      const hasProgress =
        (session.elapsedSeconds && session.elapsedSeconds > 0) ||
        (session.currentIndex && session.currentIndex > 0) ||
        (session.answers && Object.keys(session.answers).length > 0);

      return {
        dayNumber: challenge.dayNumber,
        title: challenge.title,
        dateLabel: challenge.dateLabel,
        startedAt: session.startedAt,
        currentIndex: session.currentIndex ?? 0,
        answers: session.answers ?? {},
        elapsedSeconds: session.elapsedSeconds ?? 0,
        q10ElapsedSeconds: session.q10ElapsedSeconds,
        resumed: Boolean(hasProgress),
        isExpired,
        questions: sanitizedQuestions,
        q11Words: Array.isArray(challenge.q11Words) ? challenge.q11Words : [],
      };
    }
  );

  app.post(
    '/api/challenges/:dayNumber/sync-progress',
    { preHandler: [(app as any).authenticate] },
    async (request: any, reply) => {
      const dayNumber = Number(request.params.dayNumber);
      const body = (request.body || {}) as {
        currentIndex?: number;
        answers?: Record<string, string>;
        elapsedSeconds?: number;
        q10ElapsedSeconds?: number;
      };
      const session = store.syncQuizSessionProgress(request.user.sub, dayNumber, body);
      if (!session) {
        return reply.status(404).send({ ok: false, message: 'Không tìm thấy phiên làm bài.' });
      }
      return {
        ok: true,
        currentIndex: session.currentIndex ?? 0,
        elapsedSeconds: session.elapsedSeconds ?? 0,
        q10ElapsedSeconds: session.q10ElapsedSeconds,
      };
    }
  );

  app.get(
    '/api/challenges/:dayNumber/session-status',
    { preHandler: [(app as any).authenticate] },
    async (request: any, reply) => {
      const dayNumber = Number(request.params.dayNumber);
      const userId = request.user.sub;
      const challenge = store.getChallengeByDay(dayNumber);
      if (!challenge) return reply.status(404).send({ status: 'NOT_FOUND' });

      const session = store.getActiveSession(userId, dayNumber);
      const isUnlocked = store.isDayUnlocked(challenge);

      if (store.isSessionForceLocked(dayNumber, session?.startedAt)) {
        return {
          status: 'FORCE_LOCKED',
          message:
            '🔒 Ban tổ chức vừa khóa khẩn cấp thử thách này để cập nhật nội dung. Lượt làm hiện tại chưa bị tính, bạn có thể làm lại sau khi mở khóa!',
        };
      }
      if (!isUnlocked && session) {
        return {
          status: 'GRACE_PERIOD',
          message:
            '⚠️ Ban tổ chức vừa đóng cổng nhận người mới cho ngày này. Vì bạn đã vào thi trước khi khóa, bạn vẫn được phép hoàn thành và nộp bài bình thường!',
        };
      }
      if (!isUnlocked && !session) {
        return { status: 'FORCE_LOCKED', message: '🔒 Ngày thử thách này hiện đã bị khóa.' };
      }
      return { status: 'ACTIVE', message: null };
    }
  );

  app.post(
    '/api/challenges/:dayNumber/finish-q10',
    { preHandler: [(app as any).authenticate] },
    async (request: any) => {
      const dayNumber = Number(request.params.dayNumber);
      const body = (request.body || {}) as { elapsedSeconds?: number };
      const elapsedMs = store.markSessionQ10Finished(request.user.sub, dayNumber, body.elapsedSeconds);
      return { ok: true, elapsedMs };
    }
  );

  app.post(
    '/api/challenges/:dayNumber/resume-quiz',
    { preHandler: [(app as any).authenticate] },
    async (request: any) => {
      store.clearSessionQ10Finished(request.user.sub, Number(request.params.dayNumber));
      return { ok: true };
    }
  );

  app.post(
    '/api/challenges/:dayNumber/submit',
    { preHandler: [(app as any).authenticate] },
    async (request: any, reply) => {
      const dayNumber = Number(request.params.dayNumber);
      const userId = request.user.sub;
      const body = request.body as {
        answers: Record<string, 'A' | 'B' | 'C' | 'D'>;
        clientTimeMs?: number;
      };

      const challenge = store.getChallengeByDay(dayNumber);
      if (!challenge) {
        return reply.status(404).send({ message: 'Không tìm thấy thử thách.' });
      }

      const session = store.getActiveSession(userId, dayNumber);
      const isUnlocked = store.isDayUnlocked(challenge);

      if (store.isSessionForceLocked(dayNumber, session?.startedAt)) {
        return reply.status(423).send({
          code: 'FORCE_LOCKED',
          message:
            '🔒 Ban tổ chức vừa khóa khẩn cấp ngày thi này để cập nhật đề. Lượt làm của bạn chưa bị tính, vui lòng quay lại sau!',
        });
      }
      if (!isUnlocked && !session) {
        return reply.status(403).send({
          code: 'DAY_LOCKED',
          message: 'Thử thách này đã đóng trước khi bạn bắt đầu làm bài.',
        });
      }

      const questionsToGrade = session?.questionsSnapshot || challenge.questions;

      let serverElapsedMs: number;
      if (typeof body.clientTimeMs === 'number' && body.clientTimeMs > 0) {
        const syncedMinMs = (session?.q10ElapsedSeconds || session?.elapsedSeconds || 0) * 1000;
        serverElapsedMs = Math.max(2000, Math.round(body.clientTimeMs), syncedMinMs);
      } else if (session?.q10ElapsedSeconds && session.q10ElapsedSeconds > 0) {
        serverElapsedMs = Math.max(2000, session.q10ElapsedSeconds * 1000);
      } else if (session?.elapsedSeconds && session.elapsedSeconds > 0) {
        serverElapsedMs = Math.max(2000, session.elapsedSeconds * 1000);
      } else if (session) {
        const totalSessionMs = Math.max(2000, Date.now() - session.startedAt);
        serverElapsedMs =
          session.q10FinishedAt && session.q10FinishedAt >= session.startedAt
            ? Math.max(2000, Math.min(session.q10FinishedAt - session.startedAt, totalSessionMs))
            : totalSessionMs;
      } else {
        serverElapsedMs = 60000;
      }

      const { score: rawScore, totalPoints, correctCount, wrongCount, detailedReview } =
        gradeQuestionsForReview(questionsToGrade, body.answers);

      const endsAt = store.getDayEndDate(challenge);
      const isToday = store.getTodayChallenge()?.dayNumber === challenge.dayNumber;
      const isExpired = !isToday && store.isDayPassedDeadline(challenge);
      const officialScore = isExpired ? 0 : rawScore;

      const { isFirstOfficialAttempt, climbedToTop1 } = await store.recordAttempt({
        id: crypto.randomUUID(),
        userId,
        challengeId: challenge.id,
        dayNumber,
        score: officialScore,
        practiceScore: rawScore,
        isExpired,
        correctCount,
        wrongCount,
        timeSpentMs: serverElapsedMs,
        answersDetail: { ...(body.answers || {}), _meta: { isExpired, rawScore } },
        startedAt: new Date(session?.startedAt || Date.now() - serverElapsedMs).toISOString(),
        completedAt: new Date().toISOString(),
      });

      store.completeActiveSession(userId, dayNumber);
      const resultsRevealed = isExpired ? true : store.isResultsRevealed(challenge);

      return {
        dayNumber,
        score: resultsRevealed ? officialScore : null,
        practiceScore: resultsRevealed ? rawScore : null,
        isExpired,
        totalPoints,
        correctCount: resultsRevealed ? correctCount : null,
        wrongCount: resultsRevealed ? wrongCount : null,
        timeSpentMs: serverElapsedMs,
        isFirstOfficialAttempt,
        climbedToTop1,
        top1PushCampaign: null,
        submittedDuringGracePeriod: !isUnlocked && Boolean(session),
        endsAt,
        resultsRevealed,
        detailedReview: resultsRevealed ? detailedReview : null,
        notice: isExpired
          ? 'Chế độ luyện tập. Bạn đã hoàn thành bài để luyện tập và xem đáp án, nhưng không được tính điểm vào Bảng Xếp Hạng.'
          : undefined,
      };
    }
  );

  app.get(
    '/api/challenges/:dayNumber/result',
    { preHandler: [(app as any).authenticate] },
    async (request: any, reply) => {
      const dayNumber = Number(request.params.dayNumber);
      const userId = request.user.sub;
      const challenge = store.getChallengeByDay(dayNumber);
      if (!challenge) {
        return reply.status(404).send({ message: 'Không tìm thấy ngày thử thách.' });
      }

      const attempt = store.getAttempt(userId, dayNumber);
      if (!attempt) {
        return reply.status(404).send({ message: 'Bạn chưa hoàn thành thử thách này.' });
      }

      const isToday = store.getTodayChallenge()?.dayNumber === challenge.dayNumber;
      const isExpired = Boolean(
        attempt.isExpired || (!isToday && store.isDayPassedDeadline(challenge))
      );
      const resultsRevealed = isExpired ? true : store.isResultsRevealed(challenge);
      const endsAt = store.getDayEndDate(challenge);

      if (!resultsRevealed) {
        return {
          dayNumber,
          completed: true,
          resultsRevealed: false,
          isExpired,
          endsAt,
          score: null,
          practiceScore: null,
          totalPoints: calcChallengeMaxPoints(challenge.questions),
          correctCount: null,
          wrongCount: null,
          timeSpentMs: attempt.timeSpentMs,
          completedAt: attempt.completedAt,
          detailedReview: null,
          message:
            'Bài thi đã được ghi nhận thành công! Điểm và đáp án chi tiết sẽ được công bố vào lúc 00:00.',
        };
      }

      const { totalPoints, detailedReview } = gradeQuestionsForReview(
        challenge.questions,
        attempt.answersDetail
      );

      return {
        dayNumber,
        score: attempt.score,
        practiceScore: attempt.practiceScore ?? attempt.score,
        isExpired,
        totalPoints,
        correctCount: attempt.correctCount,
        wrongCount: attempt.wrongCount,
        timeSpentMs: attempt.timeSpentMs,
        resultsRevealed,
        endsAt,
        detailedReview,
      };
    }
  );

  app.get('/api/leaderboard', { preHandler: [(app as any).authenticate] }, async (request: any) => {
    const userId = request.user.sub;
    let currentUser = store.findUserById(userId);
    if (!currentUser) {
      await store.syncFromPostgres();
      currentUser = store.findUserById(userId);
    }
    const list = store.getLeaderboard();

    return {
      topList: list.slice(0, 50),
      myRank: list.find((item) => item.id === userId) || null,
    };
  });

  app.get('/api/profile/me', { preHandler: [(app as any).authenticate] }, async (request: any, reply) => {
    const userId = request.user.sub;
    let user = store.findUserById(userId);
    if (!user) {
      await store.syncFromPostgres();
      user = store.findUserById(userId);
    }
    if (!user) {
      return reply.status(404).send({ message: 'Không tìm thấy thông tin nhân viên.' });
    }

    const allRankings = store.getLeaderboard();
    const myRankItem = allRankings.find((r) => r.id === userId);
    const isAdmin = user.role === 'ADMIN';
    const myRank = isAdmin ? null : (myRankItem?.rank || allRankings.length);
    const attempts = store.getUserAttempts(userId);

    const safeAttempts = attempts.map((a) => {
      const c = store.getChallengeByDay(a.dayNumber);
      const isRevealed = c ? store.isResultsRevealed(c) : true;
      if (!isRevealed) {
        return {
          ...a,
          score: null,
          correctCount: null,
          wrongCount: null,
          answersDetail: {},
          resultsRevealed: false,
        };
      }
      return { ...a, resultsRevealed: true };
    });

    const revealedAttempts = safeAttempts.filter((a) => a.resultsRevealed);
    const resolvedTotalScore = isAdmin
      ? revealedAttempts.reduce((sum, a) => sum + (a.score || 0), 0)
      : myRankItem?.totalScore ?? user.totalScore;
    const resolvedTotalTimeMs = isAdmin
      ? revealedAttempts.reduce((sum, a) => sum + (a.timeSpentMs || 0), 0)
      : myRankItem?.totalTimeMs ?? user.totalTimeMs;
    const resolvedCompletedDays = isAdmin
      ? revealedAttempts.length
      : myRankItem?.completedDays ?? user.completedDays;

    return {
      user: {
        id: user.id,
        employeeId: user.employeeId,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        role: user.role,
        totalScore: resolvedTotalScore,
        totalTimeMs: resolvedTotalTimeMs,
        completedDays: resolvedCompletedDays,
        rank: myRank,
      },
      attempts: safeAttempts,
    };
  });

  app.get('/api/profile/devices', { preHandler: [(app as any).authenticate] }, async (request: any) => {
    const currentUa = (request.headers['user-agent'] as string) || '';
    return { devices: store.getUserDevices(request.user.sub, currentUa) };
  });

  app.delete('/api/profile/devices/:deviceId', { preHandler: [(app as any).authenticate] }, async (request: any) => {
    return { success: store.removeUserDevice(request.user.sub, request.params.deviceId) };
  });
}

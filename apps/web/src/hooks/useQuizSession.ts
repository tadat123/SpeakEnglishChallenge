import { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { appDialog } from '../components/AppDialogProvider';
import {
  ActiveQuizState,
  EventState,
  GUEST_PENDING_KEY,
  GuestPendingSubmission,
  Q11SubmissionData,
  getNextMidnightMs,
  gradeGuestQuiz,
} from '../components/app/appTypes';

interface UseQuizSessionParams {
  token: string | null;
  user: any;
  isGuest: boolean;
  challenges: any[];
  todayChallenge: any;
  eventState: EventState;
  eventCountdown: string;
  getHeaders: (withJson?: boolean) => Record<string, string>;
  handleSpeak: (id: string, textToSpeak: string, audioUrl?: string) => void;
  onRefreshData: () => void | Promise<void>;
  setLockedModalDay: (day: any | null) => void;
  setLoginPromptMsg: (msg: string | null) => void;
  showMessage: (msg: string, isErr?: boolean) => void;
  L: (vi: string, en: string, ko?: string) => string;
}

export function useQuizSession({
  token,
  user,
  isGuest,
  challenges,
  todayChallenge,
  eventState,
  eventCountdown,
  getHeaders,
  handleSpeak,
  onRefreshData,
  setLockedModalDay,
  setLoginPromptMsg,
  showMessage,
  L,
}: UseQuizSessionParams) {
  const [activeQuiz, setActiveQuiz] = useState<ActiveQuizState | null>(null);
  const [quizResult, setQuizResult] = useState<any | null>(null);
  const [showDetailedReview, setShowDetailedReview] = useState(false);
  const [adminPreviewResult, setAdminPreviewResult] = useState(false);
  const [startingDay, setStartingDay] = useState<number | null>(null);
  const [submittingQuiz, setSubmittingQuiz] = useState<boolean>(false);
  const [guestSubmittedDay, setGuestSubmittedDay] = useState<any | null>(null);
  const [q11Data, setQ11Data] = useState<Q11SubmissionData | null>(null);
  const [autoNextOnSelect, setAutoNextOnSelect] = useState<boolean>(true);
  const [gracePeriodNotice, setGracePeriodNotice] = useState<string | null>(null);
  const [forceLockModalMsg, setForceLockModalMsg] = useState<string | null>(null);

  const getQuizProgressKey = (dayNum: number) =>
    `sr_quiz_progress_${user?.id || 'guest'}_day_${dayNum}`;

  const readSavedQuizProgress = (
    dayNum: number
  ): {
    currentIndex?: number;
    answers?: Record<string, string>;
    elapsedSeconds?: number;
    q10ElapsedSeconds?: number;
    q11Data?: Q11SubmissionData | null;
    questions?: any[];
  } | null => {
    try {
      const raw = localStorage.getItem(getQuizProgressKey(dayNum));
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  };

  const clearSavedQuizProgress = (dayNum: number) => {
    try {
      localStorage.removeItem(getQuizProgressKey(dayNum));
    } catch {}
  };

  // Timer đếm giờ làm bài (dừng khi tới Câu 11) + kiểm tra Force Lock mỗi 4s
  useEffect(() => {
    if (!activeQuiz) {
      setGracePeriodNotice(null);
      return;
    }
    const timer = setInterval(() => {
      setActiveQuiz((prev) => {
        if (!prev) return null;
        if (prev.currentIndex >= prev.questions.length) {
          return prev;
        }
        return { ...prev, elapsedSeconds: prev.elapsedSeconds + 1 };
      });
    }, 1000);

    const lockCheckTimer = setInterval(async () => {
      if (!token) return;
      try {
        const res = await fetch(`/api/challenges/${activeQuiz.dayNumber}/session-status`, {
          headers: getHeaders(),
        });
        if (!res.ok) return;
        const statusData = await res.json();
        if (statusData.status === 'GRACE_PERIOD') {
          setGracePeriodNotice(statusData.message);
        } else if (statusData.status === 'FORCE_LOCKED') {
          clearSavedQuizProgress(activeQuiz.dayNumber);
          setActiveQuiz(null);
          setGracePeriodNotice(null);
          setForceLockModalMsg(statusData.message);
          onRefreshData();
        }
      } catch {
        // Ignore transient network errors
      }
    }, 4000);

    return () => {
      clearInterval(timer);
      clearInterval(lockCheckTimer);
    };
  }, [activeQuiz?.dayNumber]);

  // Tự động lưu tiến độ làm bài vào LocalStorage & đồng bộ lên Server
  useEffect(() => {
    if (!activeQuiz) return;
    try {
      localStorage.setItem(
        getQuizProgressKey(activeQuiz.dayNumber),
        JSON.stringify({
          dayNumber: activeQuiz.dayNumber,
          currentIndex: activeQuiz.currentIndex,
          answers: activeQuiz.answers,
          elapsedSeconds: activeQuiz.elapsedSeconds,
          q10ElapsedSeconds: activeQuiz.q10ElapsedSeconds,
          q11Data,
          questions: activeQuiz.questions,
          updatedAt: Date.now(),
        })
      );
    } catch {}

    if (token && (activeQuiz.elapsedSeconds % 3 === 0 || activeQuiz.currentIndex >= 0)) {
      const syncTimeout = setTimeout(() => {
        fetch(`/api/challenges/${activeQuiz.dayNumber}/sync-progress`, {
          method: 'POST',
          headers: getHeaders(true),
          body: JSON.stringify({
            currentIndex: activeQuiz.currentIndex,
            answers: activeQuiz.answers,
            elapsedSeconds: activeQuiz.elapsedSeconds,
            q10ElapsedSeconds: activeQuiz.q10ElapsedSeconds,
          }),
        }).catch(() => {});
      }, 350);
      return () => clearTimeout(syncTimeout);
    }
  }, [
    activeQuiz?.dayNumber,
    activeQuiz?.currentIndex,
    activeQuiz?.answers,
    activeQuiz?.elapsedSeconds,
    activeQuiz?.q10ElapsedSeconds,
    q11Data,
    token,
  ]);

  // Tự động khôi phục bài đang làm nếu người dùng F5 ở #quiz/:dayNumber
  useEffect(() => {
    if (activeQuiz || startingDay || challenges.length === 0) return;
    const h = window.location.hash.replace('#', '');
    if (h.startsWith('quiz/')) {
      const dayNum = parseInt(h.split('/')[1], 10);
      const targetChallenge = challenges.find((c: any) => c.dayNumber === dayNum);
      if (targetChallenge && targetChallenge.status !== 'COMPLETED') {
        handleStartDay(targetChallenge);
      }
    }
  }, [challenges.length]);

  // Khôi phục trang kết quả #result/:dayNumber hoặc #review/:dayNumber sau khi F5
  useEffect(() => {
    if (!token) return;
    const h = window.location.hash.replace('#', '');
    if ((h.startsWith('result/') || h.startsWith('review/')) && !quizResult) {
      const dayNum = parseInt(h.split('/')[1], 10);
      if (dayNum) {
        fetch(`/api/challenges/${dayNum}/result`, { headers: getHeaders(true) })
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (data) {
              setQuizResult(data);
              setShowDetailedReview(h.startsWith('review/'));
            }
          })
          .catch(() => {});
      }
    }
  }, [token]);

  const handleStartDay = async (dayItem: any) => {
    if (eventState.eventStatus !== 'ACTIVE') {
      showMessage(
        eventState.eventStatus === 'COUNTDOWN'
          ? L(
              `⏳ Đang chờ sự kiện bắt đầu trong ${eventCountdown || '...'}!`,
              `⏳ Event starts in ${eventCountdown || '...'}!`,
              `⏳ 이벤트 시작까지 ${eventCountdown || '...'} 남았습니다!`
            )
          : L(
              '⏳ Đang chờ Ban tổ chức khởi động sự kiện!',
              '⏳ Waiting for the organizers to start the event!',
              '⏳ 운영진이 이벤트를 시작하기를 기다리고 있습니다!'
            ),
        true
      );
      return;
    }
    if (!dayItem) return;

    if (dayItem.status === 'LOCKED') {
      setLockedModalDay(dayItem);
      return;
    }

    if (dayItem.status === 'COMPLETED' && token) {
      setStartingDay(dayItem.dayNumber);
      try {
        const res = await fetch(`/api/challenges/${dayItem.dayNumber}/result`, {
          headers: getHeaders(true),
        });
        if (res.ok) {
          const resultData = await res.json();
          setActiveQuiz(null);
          setQuizResult(resultData);
          setShowDetailedReview(false);
          window.location.hash = `#result/${dayItem.dayNumber}`;
          window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }
      } catch (e) {
        console.error('Failed to load completed challenge result:', e);
      } finally {
        setStartingDay(null);
      }
    }

    setStartingDay(dayItem.dayNumber);
    try {
      if (isGuest) {
        if (todayChallenge && dayItem.dayNumber !== todayChallenge.dayNumber) {
          setLoginPromptMsg(
            L(
              'Khách chỉ được làm thử bài thi của ngày hôm nay. Vui lòng đăng nhập hoặc tạo tài khoản để làm các ngày khác!',
              "Guests can only take today's challenge. Please log in or register to take challenges from other days!",
              '게스트는 오늘의 챌린지만 참여할 수 있습니다. 다른 날짜의 챌린지는 로그인 후 이용해 주세요!'
            )
          );
          return;
        }

        const guestId = localStorage.getItem('sr_guest_id') || `g-${Date.now()}`;
        localStorage.setItem('sr_guest_id', guestId);
        const res = await fetch(`/api/public/challenges/${dayItem.dayNumber}/start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ guestId }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);

        const localSaved = readSavedQuizProgress(data.dayNumber);
        const questionsToUse =
          Array.isArray(localSaved?.questions) && localSaved.questions.length > 0
            ? localSaved.questions
            : data.questions;
        const maxIdx = Array.isArray(questionsToUse) ? questionsToUse.length : 10;
        const restoredIdx =
          typeof localSaved?.currentIndex === 'number'
            ? Math.min(Math.max(0, localSaved.currentIndex), maxIdx)
            : 0;
        const restoredAnswers = localSaved?.answers || {};
        const restoredElapsed = Math.max(0, localSaved?.elapsedSeconds || 0);

        setQuizResult(null);
        setShowDetailedReview(false);
        setAdminPreviewResult(false);
        setQ11Data(localSaved?.q11Data || null);
        setActiveQuiz({
          dayNumber: data.dayNumber,
          title: data.title,
          dateLabel: data.dateLabel,
          questions: questionsToUse,
          currentIndex: restoredIdx,
          answers: restoredAnswers,
          elapsedSeconds: restoredElapsed,
          q10ElapsedSeconds: localSaved?.q10ElapsedSeconds,
          q11Words: data.q11Words,
          isExpired: Boolean(data.isExpired || dayItem.status === 'EXPIRED'),
        });
        window.location.hash = `#quiz/${data.dayNumber}`;
        window.scrollTo({ top: 0, behavior: 'smooth' });

        const currentQ = questionsToUse?.[restoredIdx];
        if (currentQ?.hasPromptAudio && currentQ?.targetWord) {
          setTimeout(() => handleSpeak(`prompt-${currentQ.id}`, currentQ.targetWord), 350);
        }
        return;
      }

      const res = await fetch(`/api/challenges/${dayItem.dayNumber}/start`, {
        method: 'POST',
        headers: getHeaders(true),
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      const localSaved = readSavedQuizProgress(data.dayNumber);
      const maxIdx = Array.isArray(data.questions) ? data.questions.length : 10;
      const mergedAnswers: Record<string, string> = {
        ...(data.answers || {}),
        ...(localSaved?.answers || {}),
      };
      const rawIdx =
        typeof localSaved?.currentIndex === 'number'
          ? localSaved.currentIndex
          : typeof data.currentIndex === 'number'
          ? data.currentIndex
          : 0;
      const restoredIdx = Math.min(Math.max(0, rawIdx), maxIdx);
      const restoredElapsed = Math.max(
        0,
        localSaved?.elapsedSeconds || 0,
        data.elapsedSeconds || 0
      );
      const restoredQ10Elapsed = localSaved?.q10ElapsedSeconds ?? data.q10ElapsedSeconds;

      setQuizResult(null);
      setShowDetailedReview(false);
      setAdminPreviewResult(false);
      setQ11Data(localSaved?.q11Data || null);
      setActiveQuiz({
        dayNumber: data.dayNumber,
        title: data.title,
        dateLabel: data.dateLabel,
        questions: data.questions,
        currentIndex: restoredIdx,
        answers: mergedAnswers,
        elapsedSeconds: restoredElapsed,
        q10ElapsedSeconds: restoredQ10Elapsed,
        q11Words: data.q11Words,
        isExpired: Boolean(data.isExpired || dayItem.status === 'EXPIRED'),
      });
      window.location.hash = `#quiz/${data.dayNumber}`;
      window.scrollTo({ top: 0, behavior: 'smooth' });

      const currentQ = data.questions?.[restoredIdx];
      if (currentQ?.hasPromptAudio && currentQ?.targetWord) {
        setTimeout(() => handleSpeak(`prompt-${currentQ.id}`, currentQ.targetWord), 350);
      }
    } catch (err: any) {
      await appDialog.alert({
        title: 'Không thể bắt đầu bài thi',
        message: err.message || 'Không thể bắt đầu thử thách',
        variant: 'warning',
      });
    } finally {
      setStartingDay(null);
    }
  };

  const handleSelectOption = (question: any, optionId: string) => {
    if (!activeQuiz) return;

    setActiveQuiz((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        answers: { ...prev.answers, [question.id]: optionId },
      };
    });

    if (autoNextOnSelect) {
      setTimeout(() => {
        setActiveQuiz((prev) => {
          if (!prev || prev.currentIndex >= prev.questions.length) return prev;
          const hasQ11 = Array.isArray(prev.q11Words) && prev.q11Words.length > 0;
          const nextIdx = prev.currentIndex + 1;
          const isEnteringQ11 = nextIdx >= prev.questions.length;
          if (isEnteringQ11 && !hasQ11) {
            return prev;
          }
          if (isEnteringQ11 && token) {
            fetch(`/api/challenges/${prev.dayNumber}/finish-q10`, {
              method: 'POST',
              headers: getHeaders(true),
              body: JSON.stringify({
                elapsedSeconds: prev.q10ElapsedSeconds ?? prev.elapsedSeconds,
              }),
            }).catch(() => {});
          }
          const nextQ = prev.questions[nextIdx];
          if (nextQ?.hasPromptAudio && nextQ?.targetWord) {
            setTimeout(() => handleSpeak(`prompt-${nextQ.id}`, nextQ.targetWord), 250);
          }
          return {
            ...prev,
            currentIndex: nextIdx,
            ...(isEnteringQ11
              ? { q10ElapsedSeconds: prev.q10ElapsedSeconds ?? prev.elapsedSeconds }
              : {}),
          };
        });
      }, 280);
    }
  };

  const handleSubmitQuiz = async () => {
    if (!activeQuiz) return;
    setSubmittingQuiz(true);
    try {
      const completionSeconds =
        activeQuiz.currentIndex >= activeQuiz.questions.length
          ? activeQuiz.q10ElapsedSeconds ?? activeQuiz.elapsedSeconds
          : activeQuiz.elapsedSeconds;
      const clientTimeMs = Math.max(1, completionSeconds) * 1000;

      if (isGuest) {
        const questionsToGrade = activeQuiz.questions;
        const { score, totalPoints, correctCount, wrongCount, detailedReview } = gradeGuestQuiz(
          questionsToGrade,
          activeQuiz.answers
        );

        const pending: GuestPendingSubmission = {
          dayNumber: activeQuiz.dayNumber,
          title: activeQuiz.title,
          dateLabel: activeQuiz.dateLabel,
          answers: activeQuiz.answers as Record<string, 'A' | 'B' | 'C' | 'D'>,
          clientTimeMs,
          q11Pronunciation: q11Data,
          expiresAt: getNextMidnightMs(),
        };
        localStorage.setItem(GUEST_PENDING_KEY, JSON.stringify(pending));
        clearSavedQuizProgress(activeQuiz.dayNumber);

        setActiveQuiz(null);
        setGracePeriodNotice(null);
        setGuestSubmittedDay({
          dayNumber: activeQuiz.dayNumber,
          score,
          totalPoints,
          correctCount,
          wrongCount,
        });

        setQuizResult({
          dayNumber: activeQuiz.dayNumber,
          score,
          totalPoints,
          correctCount,
          wrongCount,
          timeSpentMs: clientTimeMs,
          isGuest: true,
          resultsRevealed: false,
          endsAt: new Date(getNextMidnightMs()).toISOString(),
          detailedReview,
          q11Pronunciation: q11Data,
        });

        window.location.hash = `#result/${activeQuiz.dayNumber}`;
        window.scrollTo({ top: 0, behavior: 'smooth' });
        confetti({
          particleCount: 80,
          spread: 65,
          origin: { y: 0.6 },
        });
        return;
      }

      const res = await fetch(`/api/challenges/${activeQuiz.dayNumber}/submit`, {
        method: 'POST',
        headers: getHeaders(true),
        body: JSON.stringify({
          answers: activeQuiz.answers as Record<string, 'A' | 'B' | 'C' | 'D'>,
          clientTimeMs,
          q11Pronunciation: q11Data,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 423 || data.code === 'FORCE_LOCKED') {
          clearSavedQuizProgress(activeQuiz.dayNumber);
          setActiveQuiz(null);
          setForceLockModalMsg(data.message);
          onRefreshData();
          return;
        }
        throw new Error(data.message);
      }

      clearSavedQuizProgress(activeQuiz.dayNumber);
      setActiveQuiz(null);
      setGracePeriodNotice(null);
      setQuizResult({
        ...data,
        q11Pronunciation: q11Data,
      });
      window.location.hash = `#result/${data.dayNumber}`;
      window.scrollTo({ top: 0, behavior: 'smooth' });
      confetti({
        particleCount: 80,
        spread: 65,
        origin: { y: 0.6 },
      });
      onRefreshData();
    } catch (err: any) {
      await appDialog.alert({
        title: 'Không thể nộp bài',
        message: err.message || 'Lỗi nộp bài',
        variant: 'danger',
      });
    } finally {
      setSubmittingQuiz(false);
    }
  };

  return {
    activeQuiz,
    setActiveQuiz,
    quizResult,
    setQuizResult,
    showDetailedReview,
    setShowDetailedReview,
    adminPreviewResult,
    setAdminPreviewResult,
    startingDay,
    submittingQuiz,
    guestSubmittedDay,
    q11Data,
    setQ11Data,
    autoNextOnSelect,
    setAutoNextOnSelect,
    gracePeriodNotice,
    forceLockModalMsg,
    setForceLockModalMsg,
    handleStartDay,
    handleSelectOption,
    handleSubmitQuiz,
  };
}

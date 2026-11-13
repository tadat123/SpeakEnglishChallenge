import { Q11SubmissionData } from '../PronunciationChallengeQ11';
import { isAdminUrl } from '../../utils/adminRoutes';
import { Lang } from '../../utils/i18n';

export type TabType = 'home' | 'challenges' | 'leaderboard' | 'profile' | 'admin';

export const VALID_TABS: TabType[] = ['home', 'challenges', 'leaderboard', 'profile', 'admin'];
/** Các tab khách (chưa đăng nhập) được phép xem */
export const GUEST_TABS: TabType[] = ['home', 'leaderboard'];
export const GUEST_MODE_KEY = 'sr_guest_mode';
export const GUEST_PENDING_KEY = 'sr_guest_pending_submission';

export interface GuestPendingSubmission {
  dayNumber: number;
  title: string;
  dateLabel: string;
  answers: Record<string, 'A' | 'B' | 'C' | 'D'>;
  clientTimeMs: number;
  q11Pronunciation: any;
  /** Hạn cuối để lưu (00:00 ngày hôm sau) */
  expiresAt: number;
}

export interface ActiveQuizState {
  dayNumber: number;
  title: string;
  dateLabel: string;
  questions: any[];
  currentIndex: number;
  answers: Record<string, string>;
  elapsedSeconds: number;
  q10ElapsedSeconds?: number;
  q11Words?: any[];
  isExpired?: boolean;
}

export interface EventState {
  eventStatus: 'NOT_STARTED' | 'COUNTDOWN' | 'ACTIVE';
  eventStartAt: string | null;
  startDateLabel: string | null;
  startFromDayNumber: number | null;
  totalDays?: number;
  unlockedDaysCount?: number;
}

export interface SharedThemeProps {
  lang: Lang;
  darkMode: boolean;
  cardBg: string;
  subCardBg: string;
  textPrimary: string;
  textSecondary: string;
  t: any;
  L: (vi: string, en: string, ko?: string) => string;
}

export function getNextMidnightMs(): number {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0).getTime();
}

export function readGuestPending(): GuestPendingSubmission | null {
  try {
    const raw = localStorage.getItem(GUEST_PENDING_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GuestPendingSubmission;
    if (!parsed || Date.now() >= parsed.expiresAt) {
      localStorage.removeItem(GUEST_PENDING_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function getTabFromHash(): TabType {
  if (isAdminUrl()) {
    return 'admin';
  }
  const hash = window.location.hash.replace(/^#\/?/, '').split('/')[0] as TabType;
  return VALID_TABS.includes(hash) ? hash : 'home';
}

export function getChallengeMilestones(totalDays: number): number[] {
  if (!totalDays || totalDays <= 0) return [1, 2, 3, 4, 5];
  if (totalDays <= 5) {
    return Array.from({ length: totalDays }, (_, i) => i + 1);
  }
  if (totalDays === 21) return [1, 5, 10, 15, 21];
  const points = [
    1,
    Math.max(2, Math.round(totalDays * 0.25)),
    Math.max(3, Math.round(totalDays * 0.5)),
    Math.max(4, Math.round(totalDays * 0.75)),
    totalDays,
  ];
  return Array.from(new Set(points)).sort((a, b) => a - b);
}

export function formatTimeMmSs(totalSec: number): string {
  const m = String(Math.floor(totalSec / 60)).padStart(2, '0');
  const s = String(totalSec % 60).padStart(2, '0');
  return `${m}:${s}`;
}

export function formatRelativeTime(
  isoString: string | undefined,
  L: (vi: string, en: string, ko?: string) => string
): string {
  if (!isoString) return '';
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return L('Vừa xong', 'Just now', '방금 전');
  if (diffMins < 60) return `${diffMins} ${L('phút trước', 'mins ago', '분 전')}`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} ${L('giờ trước', 'hours ago', '시간 전')}`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return L('Hôm qua', 'Yesterday', '어제');
  if (diffDays < 7) return `${diffDays} ${L('ngày trước', 'days ago', '일 전')}`;
  const d = new Date(isoString);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function getChallengeMaxPoints(c: any): number {
  if (typeof c?.totalPoints === 'number' && c.totalPoints > 0) return c.totalPoints;
  if (typeof c?.questionCount === 'number' && c.questionCount > 0) return c.questionCount * 10;
  return 100;
}

export function gradeGuestQuiz(questions: any[], answers: Record<string, string>) {
  let score = 0;
  let totalPoints = 0;
  let correctCount = 0;
  let wrongCount = 0;

  const detailedReview = questions.map((q: any) => {
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
    const correctOption = q.options?.find((o: any) => o.id === q.correctOptionId);
    const selectedOption = q.options?.find((o: any) => o.id === selectedOptionId);
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

export const HOME_EVENT_THEMES: Record<
  string,
  {
    borderBg: string;
    badgeBg: string;
    titleColor: string;
    chipBg: string;
    noteBg: string;
    arrowBg: string;
  }
> = {
  amber: {
    borderBg:
      'border-amber-300 dark:border-amber-800/60 bg-gradient-to-r from-amber-50/90 via-orange-50/60 to-amber-100/50 dark:from-amber-950/40 dark:via-slate-900 dark:to-amber-950/30',
    badgeBg: 'bg-amber-500',
    titleColor: 'text-amber-900 dark:text-amber-300',
    chipBg: 'border-amber-200 dark:border-amber-800/40 text-amber-900 dark:text-amber-200',
    noteBg: 'bg-amber-100/60 dark:bg-amber-950/60 text-amber-900/80 dark:text-amber-200/80',
    arrowBg: 'bg-amber-500 hover:bg-amber-400 shadow-amber-500/30',
  },
  blue: {
    borderBg:
      'border-sky-300 dark:border-sky-800/60 bg-gradient-to-r from-sky-50/90 via-blue-50/60 to-sky-100/50 dark:from-sky-950/40 dark:via-slate-900 dark:to-blue-950/30',
    badgeBg: 'bg-blue-600',
    titleColor: 'text-blue-900 dark:text-sky-300',
    chipBg: 'border-sky-200 dark:border-sky-800/40 text-blue-900 dark:text-sky-200',
    noteBg: 'bg-sky-100/60 dark:bg-sky-950/60 text-blue-900/80 dark:text-sky-200/80',
    arrowBg: 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/30',
  },
  purple: {
    borderBg:
      'border-purple-300 dark:border-purple-800/60 bg-gradient-to-r from-purple-50/90 via-violet-50/60 to-purple-100/50 dark:from-purple-950/40 dark:via-slate-900 dark:to-violet-950/30',
    badgeBg: 'bg-purple-600',
    titleColor: 'text-purple-900 dark:text-purple-300',
    chipBg: 'border-purple-200 dark:border-purple-800/40 text-purple-900 dark:text-purple-200',
    noteBg: 'bg-purple-100/60 dark:bg-purple-950/60 text-purple-900/80 dark:text-purple-200/80',
    arrowBg: 'bg-purple-600 hover:bg-purple-500 shadow-purple-600/30',
  },
  emerald: {
    borderBg:
      'border-emerald-300 dark:border-emerald-800/60 bg-gradient-to-r from-emerald-50/90 via-teal-50/60 to-emerald-100/50 dark:from-emerald-950/40 dark:via-slate-900 dark:to-emerald-950/30',
    badgeBg: 'bg-emerald-600',
    titleColor: 'text-emerald-900 dark:text-emerald-300',
    chipBg: 'border-emerald-200 dark:border-emerald-800/40 text-emerald-900 dark:text-emerald-200',
    noteBg: 'bg-emerald-100/60 dark:bg-emerald-950/60 text-emerald-900/80 dark:text-emerald-200/80',
    arrowBg: 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30',
  },
  rose: {
    borderBg:
      'border-rose-300 dark:border-rose-800/60 bg-gradient-to-r from-rose-50/90 via-pink-50/60 to-rose-100/50 dark:from-rose-950/40 dark:via-slate-900 dark:to-rose-950/30',
    badgeBg: 'bg-rose-600',
    titleColor: 'text-rose-900 dark:text-rose-300',
    chipBg: 'border-rose-200 dark:border-rose-800/40 text-rose-900 dark:text-rose-200',
    noteBg: 'bg-rose-100/60 dark:bg-rose-950/60 text-rose-900/80 dark:text-rose-200/80',
    arrowBg: 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30',
  },
  indigo: {
    borderBg:
      'border-indigo-300 dark:border-indigo-800/60 bg-gradient-to-r from-indigo-50/90 via-blue-50/60 to-indigo-100/50 dark:from-indigo-950/40 dark:via-slate-900 dark:to-indigo-950/30',
    badgeBg: 'bg-indigo-600',
    titleColor: 'text-indigo-900 dark:text-indigo-300',
    chipBg: 'border-indigo-200 dark:border-indigo-800/40 text-indigo-900 dark:text-indigo-200',
    noteBg: 'bg-indigo-100/60 dark:bg-indigo-950/60 text-indigo-900/80 dark:text-indigo-200/80',
    arrowBg: 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30',
  },
};

export type { Q11SubmissionData };

import React from 'react';
import {
  CheckCircle2,
  Clock,
  Loader2,
  Lock,
  Play,
  Sparkles,
  Star,
} from 'lucide-react';
import { EventState, SharedThemeProps, TabType, getChallengeMaxPoints } from '../app/appTypes';

interface ChallengesTabProps extends SharedThemeProps {
  challenges: any[];
  todayChallenge: any;
  isTodayLocked: boolean;
  eventState: EventState;
  isEventWaiting: boolean;
  isEventCountdown: boolean;
  eventCountdown: string;
  totalDays: number;
  totalDaysLabel: string;
  completedCount: number;
  startingDay: number | null;
  challengeFilter: 'ALL' | 'COMPLETED' | 'EXPIRED' | 'IN_PROGRESS' | 'UNSTARTED';
  setChallengeFilter: (v: 'ALL' | 'COMPLETED' | 'EXPIRED' | 'IN_PROGRESS' | 'UNSTARTED') => void;
  onStartDay: (dayItem: any) => void;
  onNavigateTab: (tab: TabType) => void;
}

export const ChallengesTab: React.FC<ChallengesTabProps> = ({
  challenges,
  todayChallenge,
  isTodayLocked,
  eventState,
  isEventWaiting,
  isEventCountdown,
  eventCountdown,
  totalDays,
  totalDaysLabel,
  completedCount,
  startingDay,
  challengeFilter,
  setChallengeFilter,
  onStartDay,
  onNavigateTab,
  darkMode,
  cardBg,
  textPrimary,
  textSecondary,
  t,
  L,
}) => {
  return (
    <div className="space-y-4">
      {isEventWaiting ? (
        <div className={`rounded-3xl p-6 sm:p-8 border shadow-sm text-center space-y-4 ${cardBg}`}>
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-500/15 border border-indigo-400/30 mx-auto">
            {isEventCountdown ? (
              <Clock className="w-7 h-7 text-indigo-500 animate-pulse" />
            ) : (
              <Lock className="w-7 h-7 text-amber-500" />
            )}
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h2 className={`text-lg sm:text-xl font-black ${textPrimary}`}>
              {isEventCountdown
                ? L('Đang chờ sự kiện bắt đầu trong...', 'Waiting for event to start in...', '이벤트 시작 대기 중...')
                : L('Đang chờ Admin sắp xếp lịch trình', 'Waiting for Admin to arrange schedule', '운영진 일정 조율 대기 중')}
            </h2>
            <p className={`text-xs sm:text-sm ${textSecondary}`}>
              {isEventCountdown
                ? L(
                    `Sự kiện ${totalDays > 0 ? `${totalDays} ngày` : ''} sẽ chính thức mở vào lúc 00:00 ngày ${eventState.startDateLabel || ''}.`,
                    `The ${totalDays > 0 ? `${totalDays}-day` : ''} challenge will officially open at 00:00 on ${eventState.startDateLabel || ''}.`,
                    `${totalDays > 0 ? `${totalDays}일 ` : ''}챌린지는 ${eventState.startDateLabel || ''} 00:00에 공식 오픈됩니다.`
                  )
                : L(
                    `Ban tổ chức đang sắp xếp lịch trình thử thách (${totalDays > 0 ? `${totalDays} ngày` : 'đang cập nhật'}). Lộ trình bài thi sẽ hiển thị ngay khi sự kiện bắt đầu.`,
                    `The organizer is configuring the challenge schedule (${totalDays > 0 ? `${totalDays} days` : 'pending'}). The schedule will appear as soon as the event starts.`,
                    `주최 측이 챌린지 일정을 준비 중입니다 (${totalDays > 0 ? `${totalDays}일` : '예정'}). 이벤트가 시작되면 일정이 표시됩니다.`
                  )}
            </p>
          </div>
          {isEventCountdown && eventCountdown && (
            <div
              className={`inline-flex flex-col items-center px-5 py-3 rounded-2xl border ${
                darkMode
                  ? 'bg-indigo-950/40 border-indigo-500/40 text-indigo-200'
                  : 'bg-indigo-50 border-indigo-200 text-indigo-800'
              }`}
            >
              <span className="text-[11px] font-bold uppercase tracking-wider opacity-80">
                {L('Đếm ngược thời gian mở bài', 'Countdown to start', '오픈 카운트다운')}
              </span>
              <span className="text-xl sm:text-2xl font-black font-mono mt-0.5">{eventCountdown}</span>
            </div>
          )}
          <div>
            <button
              onClick={() => onNavigateTab('home')}
              className="px-4 py-2 rounded-xl text-xs font-extrabold bg-blue-600 hover:bg-blue-700 text-white transition"
            >
              {L('Quay về Trang chủ', 'Back to Home', '홈으로 돌아가기')}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className={`rounded-2xl p-4 border shadow-sm flex items-center justify-between ${cardBg}`}>
            <div>
              <h2 className={`text-base font-black ${textPrimary}`}>
                {t.journey30Days.replace('{n}', totalDaysLabel)}
              </h2>
              <p className={`text-xs ${textSecondary}`}>
                {t.completedDaysLabel}:{' '}
                <strong>
                  {completedCount}/{totalDaysLabel} {t.daysUnit}
                </strong>
              </p>
            </div>
            <button
              onClick={() => onStartDay(todayChallenge)}
              disabled={startingDay !== null}
              className={`px-4 py-2.5 rounded-xl font-extrabold text-xs shadow-sm flex items-center gap-1.5 transition disabled:opacity-75 ${
                isTodayLocked
                  ? 'bg-slate-700/90 hover:bg-slate-700 text-slate-200 border border-slate-600'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {startingDay === todayChallenge?.dayNumber ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : isTodayLocked ? (
                <Lock className="w-3.5 h-3.5 text-amber-300" />
              ) : null}
              {isTodayLocked
                ? L('Bài chưa mở / Đang khóa', 'Not open / Locked', '미오픈 / 잠김')
                : t.doTodayBtn}
            </button>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs font-bold">
            <button
              onClick={() => setChallengeFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl transition ${
                challengeFilter === 'ALL'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : darkMode
                  ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border'
              }`}
            >
              {L('Tất cả', 'All', '전체')} ({challenges.length})
            </button>
            <button
              onClick={() => setChallengeFilter('COMPLETED')}
              className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1 ${
                challengeFilter === 'COMPLETED'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : darkMode
                  ? 'bg-emerald-950/40 text-emerald-300 hover:bg-emerald-950/60 border border-emerald-800'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {L('Đã làm', 'Done', '완료')} ({challenges.filter((c) => c.status === 'COMPLETED').length})
            </button>
            <button
              onClick={() => setChallengeFilter('EXPIRED')}
              className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1 ${
                challengeFilter === 'EXPIRED'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : darkMode
                  ? 'bg-amber-950/40 text-amber-300 hover:bg-amber-950/60 border border-amber-800'
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              {L('Luyện tập', 'Practice', '연습')} ({challenges.filter((c) => c.status === 'EXPIRED').length})
            </button>
            <button
              onClick={() => setChallengeFilter('IN_PROGRESS')}
              className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1 ${
                challengeFilter === 'IN_PROGRESS'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : darkMode
                  ? 'bg-blue-950/40 text-blue-300 hover:bg-blue-950/60 border border-blue-800'
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
              }`}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              {L('Đang làm', 'Doing', '진행중')} ({challenges.filter((c) => c.status === 'IN_PROGRESS').length})
            </button>
            <button
              onClick={() => setChallengeFilter('UNSTARTED')}
              className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1 ${
                challengeFilter === 'UNSTARTED'
                  ? 'bg-slate-700 text-white shadow-sm'
                  : darkMode
                  ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              {L('Chưa làm', 'Not started', '미완료')} (
              {challenges.filter((c) => c.status === 'OPEN' || c.status === 'LOCKED').length})
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
            {challenges
              .filter((c) => {
                if (challengeFilter === 'COMPLETED') return c.status === 'COMPLETED';
                if (challengeFilter === 'EXPIRED') return c.status === 'EXPIRED';
                if (challengeFilter === 'IN_PROGRESS') return c.status === 'IN_PROGRESS';
                if (challengeFilter === 'UNSTARTED') return c.status === 'OPEN' || c.status === 'LOCKED';
                return true;
              })
              .map((c) => {
                const isCompleted = c.status === 'COMPLETED';
                const isExpired = c.status === 'EXPIRED';
                const isInProgress = c.status === 'IN_PROGRESS';
                const isOpen = c.status === 'OPEN';
                return (
                  <div
                    key={c.dayNumber}
                    onClick={() => onStartDay(c)}
                    className={`p-3.5 rounded-2xl border-2 transition cursor-pointer select-none flex flex-col justify-between min-h-[105px] backdrop-blur-[2px] ${
                      isCompleted
                        ? darkMode
                          ? 'bg-slate-900/60 border-emerald-500 shadow-sm'
                          : 'bg-white/65 border-emerald-500 shadow-sm'
                        : isExpired
                        ? darkMode
                          ? 'bg-amber-950/40 border-amber-500/80 shadow-sm'
                          : 'bg-amber-50/70 border-amber-400 shadow-sm'
                        : isInProgress
                        ? darkMode
                          ? 'bg-blue-950/50 border-blue-500 ring-2 ring-blue-400/50 shadow-sm'
                          : 'bg-blue-50/80 border-blue-600 ring-2 ring-blue-300 shadow-sm'
                        : isOpen
                        ? darkMode
                          ? 'bg-sky-950/45 border-sky-500 shadow-sm'
                          : 'bg-sky-50/70 border-sky-600 ring-2 ring-sky-100 shadow-sm'
                        : darkMode
                        ? 'bg-slate-900/55 border-slate-700/70 text-slate-300'
                        : 'bg-white/60 border-white/75 text-slate-600'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <div>
                        <div className={`text-sm sm:text-base font-black ${textPrimary}`}>{c.title}</div>
                        <div className={`text-[11px] ${textSecondary}`}>{c.dateLabel}</div>
                      </div>

                      {startingDay === c.dayNumber ? (
                        <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                      ) : isCompleted ? (
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-600 text-white flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> {L('Đã làm', 'Done', '완료')}
                        </span>
                      ) : isExpired ? (
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-600 text-white flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {L('Luyện tập', 'Practice', '연습')}
                        </span>
                      ) : isInProgress ? (
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-600 text-white flex items-center gap-1 animate-pulse">
                          <Play className="w-3 h-3 fill-current" /> {L('Đang làm', 'Doing', '진행중')}
                        </span>
                      ) : isOpen ? (
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-sky-600 text-white flex items-center gap-1">
                          <Sparkles className="w-3 h-3" /> {L('Chưa làm', 'Not started', '미완료')}
                        </span>
                      ) : (
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-500/80 text-white flex items-center gap-1">
                          <Lock className="w-3 h-3" /> {L('Chưa làm', 'Locked', '잠김')}
                        </span>
                      )}
                    </div>

                    <div className="mt-2 flex items-center justify-between">
                      {isCompleted ? (
                        c.isExpired ? (
                          <span className="text-xs font-extrabold text-amber-600 dark:text-amber-400">
                            0{t.pointsSuffix} ({L('Luyện tập', 'Practice', '연습')})
                          </span>
                        ) : c.resultsRevealed ? (
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3].map((s) => (
                              <Star
                                key={s}
                                className={`w-3.5 h-3.5 ${
                                  s <= (c.stars || 3)
                                    ? 'text-amber-400 fill-amber-400'
                                    : 'text-slate-200'
                                }`}
                              />
                            ))}
                            <span className="text-xs font-extrabold text-emerald-600 ml-1">
                              {c.score}/{getChallengeMaxPoints(c)}
                              {t.pointsSuffix}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[11px] font-extrabold text-amber-600 dark:text-amber-400">
                            ⏳ {t.waitingMidnightShort}
                          </span>
                        )
                      ) : isExpired ? (
                        <span className="text-xs font-extrabold text-amber-600 dark:text-amber-400">
                          {L('Luyện tập (0đ BXH)', 'Practice (0 pts)', '연습하기 (0점)')}
                        </span>
                      ) : isInProgress ? (
                        <span className="text-xs font-extrabold text-blue-600 dark:text-blue-400 animate-pulse">
                          {L('Tiếp tục làm bài', 'Continue quiz', '이어서 풀기')}
                        </span>
                      ) : isOpen ? (
                        <span className="text-xs font-extrabold text-sky-600 dark:text-sky-400">
                          {t.tapToStart}
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">{t.lockedShort}</span>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </>
      )}
    </div>
  );
};

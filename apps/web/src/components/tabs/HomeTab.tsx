import React from 'react';
import {
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  Gift,
  Infinity as InfinityIcon,
  Loader2,
  Lock,
  Play,
  Sparkles,
  Target,
  Trophy,
  Users,
} from 'lucide-react';
import { resolveMediaUrl } from '../../utils/clientApiFallback';
import { EventPopupItem } from '../SpeakRightEventsPopup';
import {
  EventState,
  HOME_EVENT_THEMES,
  SharedThemeProps,
  TabType,
  formatTimeMmSs,
  getChallengeMaxPoints,
} from '../app/appTypes';

interface HomeTabProps extends SharedThemeProps {
  isGuest: boolean;
  user: any;
  challenges: any[];
  todayChallenge: any;
  isTodayLocked: boolean;
  eventState: EventState;
  isEventWaiting: boolean;
  isEventCountdown: boolean;
  eventCountdown: string;
  midnightCountdown: string;
  totalDays: number;
  totalDaysLabel: string;
  completedCount: number;
  myTotalScore: number;
  myRankNumber: any;
  startingDay: number | null;
  guestSubmittedDay: any | null;
  leaderboardData: any;
  popupEvents: EventPopupItem[];
  onShowEventsPopup: () => void;
  onStartDay: (dayItem: any) => void;
  onNavigateTab: (tab: TabType) => void;
}

export const HomeTab: React.FC<HomeTabProps> = ({
  isGuest,
  user,
  challenges,
  todayChallenge,
  isTodayLocked,
  eventState,
  isEventWaiting,
  isEventCountdown,
  eventCountdown,
  midnightCountdown,
  totalDays,
  totalDaysLabel,
  completedCount,
  myTotalScore,
  myRankNumber,
  startingDay,
  guestSubmittedDay,
  leaderboardData,
  popupEvents,
  onShowEventsPopup,
  onStartDay,
  onNavigateTab,
  darkMode,
  cardBg,
  textPrimary,
  textSecondary,
  t,
  L,
}) => {
  const visibleActivities = Array.isArray(popupEvents)
    ? popupEvents.filter((e) => e.isVisible !== false)
    : [];
  const displayCount = visibleActivities.length;
  const cleanActTitle = t.activitiesTitle.replace(/^\d+\s*/, '');
  const displayTitle = displayCount > 0 ? `${displayCount} ${cleanActTitle}` : cleanActTitle;
  const chipIcons = [Users, FileText, Trophy, Target, Gift, InfinityIcon];

  return (
    <div className="space-y-4">
      {/* Hero Banner */}
      <div className="bg-gradient-to-br from-blue-600/75 via-blue-600/70 to-indigo-700/75 backdrop-blur-[2px] border border-white/30 rounded-3xl p-5 sm:p-6 text-white shadow-xl">
        {isEventWaiting ? (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-1.5 bg-amber-400 text-slate-950 px-3 py-0.5 rounded-full text-xs font-black shadow-sm">
                  {isEventCountdown ? (
                    <>
                      📅 {L('Khai mạc:', 'Starts on:', '시작 예정일:')} {eventState.startDateLabel} (00:00)
                    </>
                  ) : (
                    <>⏳ {L('Sắp diễn ra', 'Coming Soon', '오픈 예정')}</>
                  )}
                </div>
                <button
                  type="button"
                  onClick={onShowEventsPopup}
                  className="inline-flex items-center gap-1 bg-white/20 hover:bg-white/30 text-white px-2.5 py-0.5 rounded-full text-[11px] font-extrabold transition"
                >
                  🎉 {t.speakRightEventsBtn}
                </button>
              </div>

              <h1 className="text-xl sm:text-2xl font-black flex items-center gap-2">
                {isEventCountdown
                  ? L('⏳ Đang chờ sự kiện bắt đầu trong...', '⏳ Event starts in...', '⏳ 이벤트 시작까지 남은 시간...')
                  : L('⏳ Đang chờ sự kiện bắt đầu', '⏳ Waiting for the event to start', '⏳ 이벤트 시작 대기 중')}
              </h1>
              <p className="text-xs sm:text-sm text-blue-100/95 font-medium max-w-xl leading-relaxed">
                {isEventCountdown
                  ? L(
                      `Hành trình ${totalDays > 0 ? `${totalDays} ngày` : 'thử thách'} phát âm sẽ chính thức mở khóa lúc 00:00 ngày ${eventState.startDateLabel || ''}. Hãy sẵn sàng chinh phục nhé!`,
                      `The ${totalDays > 0 ? `${totalDays}-day` : ''} pronunciation challenge will officially unlock at 00:00 on ${eventState.startDateLabel || ''}. Get ready!`,
                      `${eventState.startDateLabel || ''} 00:00에 ${totalDays > 0 ? `${totalDays}일 ` : ''}발음 챌린지가 공식 오픈됩니다. 준비해 주세요!`
                    )
                  : L(
                      `Ban tổ chức đang sắp xếp lịch trình thử thách (${totalDays > 0 ? `${totalDays} ngày` : 'đang cập nhật'}). Lộ trình và bài thi sẽ hiển thị ngay khi sự kiện chính thức bắt đầu.`,
                      `The organizers are configuring the challenge schedule (${totalDays > 0 ? `${totalDays} days` : 'pending'}). The roadmap and daily quizzes will appear once the event starts.`,
                      `운영진이 챌린지 일정을 준비 중입니다 (${totalDays > 0 ? `${totalDays}일 과정` : '일정 조율 중'}). 이벤트가 시작되면 로드맵과 퀴즈가 표시됩니다.`
                    )}
              </p>
            </div>

            <div className="shrink-0">
              {isEventCountdown ? (
                <div className="px-6 py-4 rounded-2xl bg-slate-950/60 border-2 border-amber-400/80 text-center shadow-xl min-w-[220px]">
                  <div className="text-[11px] font-extrabold uppercase tracking-wider text-amber-300 mb-1">
                    {L('Sự kiện bắt đầu sau', 'Starts in', '시작까지 남은 시간')}
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-white tabular-nums tracking-tight">
                    {eventCountdown || '00:00:00'}
                  </div>
                </div>
              ) : (
                <div className="px-6 py-4 rounded-2xl bg-slate-900/70 border border-white/25 text-blue-100 font-black text-sm flex items-center justify-center gap-2 shadow-lg">
                  <Clock className="w-5 h-5 text-amber-300 animate-pulse" />
                  <span>{L('Đang chờ sự kiện bắt đầu', 'Waiting for event to start', '시작 대기 중')}</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-1.5 bg-white/20 px-3 py-0.5 rounded-full text-xs font-extrabold">
                  {isTodayLocked ? (
                    <>
                      🔒 {L('Bài học đang khóa', 'Lesson is locked', '강의 잠김')} •{' '}
                      {todayChallenge?.title || 'Day 1'} (
                      {todayChallenge?.dateLabel || new Date().toLocaleDateString('vi-VN')})
                    </>
                  ) : (
                    <>
                      🔥 {t.todayChallengeBadge} • {todayChallenge?.title || 'Day 1'} (
                      {todayChallenge?.dateLabel || new Date().toLocaleDateString('vi-VN')})
                    </>
                  )}
                </div>
                <div className="inline-flex items-center gap-1 bg-amber-400/90 text-slate-950 px-2.5 py-0.5 rounded-full text-[11px] font-black">
                  🕛 {t.newChallengeAtMidnight}{' '}
                  {L(`(còn ${midnightCountdown})`, `(${midnightCountdown} left)`, `(${midnightCountdown} 남음)`)}
                </div>
                <button
                  type="button"
                  onClick={onShowEventsPopup}
                  className="inline-flex items-center gap-1 bg-white/20 hover:bg-white/30 text-white px-2.5 py-0.5 rounded-full text-[11px] font-extrabold transition"
                >
                  🎉 {t.speakRightEventsBtn}
                </button>
              </div>
              <h1 className="text-xl sm:text-2xl font-black">
                {t.todayTitle.replace('10', String(todayChallenge?.questionCount || 10))}
              </h1>
            </div>

            <div className="shrink-0">
              <button
                onClick={() => onStartDay(todayChallenge)}
                disabled={startingDay !== null}
                className={`w-full md:w-auto px-6 py-4 rounded-2xl active:scale-95 font-black text-sm sm:text-base shadow-xl flex items-center justify-center gap-2 transition disabled:opacity-75 ${
                  isTodayLocked
                    ? 'bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 border-2 border-slate-600/80'
                    : 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                }`}
              >
                {startingDay === todayChallenge?.dayNumber ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : isTodayLocked ? (
                  <Lock className="w-5 h-5 text-amber-300" />
                ) : (
                  <Play className="w-5 h-5 fill-slate-950" />
                )}
                {isTodayLocked
                  ? `${todayChallenge?.title || 'Bài học'}: ${L(
                      'Bài học chưa được mở (Đang khóa)',
                      'Lesson not open (Locked)',
                      '강의가 아직 열리지 않았습니다 (잠김)'
                    )}`
                  : todayChallenge?.status === 'COMPLETED'
                  ? todayChallenge.resultsRevealed
                    ? `${t.retryTodayBtn} ${todayChallenge.title} (${todayChallenge.score}/${getChallengeMaxPoints(todayChallenge)}${t.pointsSuffix})`
                    : `${t.retryTodayBtn} ${todayChallenge.title} (⏳ ${t.waitingMidnightShort})`
                  : isGuest && guestSubmittedDay?.dayNumber === todayChallenge?.dayNumber
                  ? L(
                      `Đã làm thử ${todayChallenge?.title || 'Day 1'} • Đăng nhập để lưu điểm`,
                      `Practiced ${todayChallenge?.title || 'Day 1'} • Sign in to save`,
                      `${todayChallenge?.title || 'Day 1'} 연습 완료 • 점수 저장하려면 로그인`
                    )
                  : `${t.startTodayBtn} (${todayChallenge?.title || 'Day 1'})`}
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2.5 mt-5 pt-4 border-t border-white/20 text-center">
          <div
            onClick={() => onNavigateTab('challenges')}
            className="bg-white/15 hover:bg-white/25 rounded-2xl p-2.5 cursor-pointer transition"
          >
            <div className="text-lg sm:text-2xl font-black text-amber-300">
              {isGuest ? `0/${totalDaysLabel}` : `${completedCount}/${totalDaysLabel}`} {t.daysUnit}
            </div>
            <div className="text-[11px] text-blue-100 font-semibold">{t.completedDaysLabel}</div>
          </div>

          <div
            onClick={() => onNavigateTab('profile')}
            className="bg-white/15 hover:bg-white/25 rounded-2xl p-2.5 cursor-pointer transition"
          >
            <div className="text-lg sm:text-2xl font-black text-white">
              {isGuest ? '0' : myTotalScore.toLocaleString()} {t.pointsSuffix}
            </div>
            <div className="text-[11px] text-blue-100 font-semibold">{t.totalScoreLabel}</div>
          </div>

          <div
            onClick={() => onNavigateTab('leaderboard')}
            className="bg-white/15 hover:bg-white/25 rounded-2xl p-2.5 cursor-pointer transition"
          >
            <div className="text-lg sm:text-2xl font-black text-emerald-300">
              {isGuest || user?.role === 'ADMIN' || myRankNumber === '-' ? '--' : `#${myRankNumber}`}
            </div>
            <div className="text-[11px] text-blue-100 font-semibold">{t.rankLabel}</div>
          </div>
        </div>
      </div>

      {/* Lộ trình nhanh + Top 5 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className={`lg:col-span-6 rounded-3xl p-4 sm:p-5 border shadow-md flex flex-col ${cardBg}`}>
          <div className="flex items-center justify-between mb-3">
            <h2 className={`text-sm sm:text-base font-black flex items-center gap-1.5 ${textPrimary}`}>
              <Calendar className="w-4 h-4 text-blue-600" /> {t.progressTitle} ({completedCount}/
              {totalDaysLabel})
            </h2>
            {!isEventWaiting && (
              <button
                onClick={() => onNavigateTab('challenges')}
                className="text-xs font-extrabold text-blue-600 hover:underline flex items-center"
              >
                {t.viewAll30Days.replace('{n}', totalDaysLabel)} <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>

          {isEventWaiting ? (
            <div
              className={`flex-1 flex flex-col items-center justify-center text-center p-6 rounded-2xl border border-dashed ${
                darkMode
                  ? 'bg-slate-800/40 border-slate-700 text-slate-300'
                  : 'bg-blue-50/60 border-blue-200 text-slate-700'
              }`}
            >
              <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3 shadow-inner">
                <Clock className="w-6 h-6 animate-pulse" />
              </div>
              <div className={`text-sm sm:text-base font-black ${textPrimary}`}>
                {isEventCountdown
                  ? L(
                      `⏳ Đang chờ sự kiện bắt đầu trong ${eventCountdown || '...'}`,
                      `⏳ Event starts in ${eventCountdown || '...'}`,
                      `⏳ 이벤트 시작까지 ${eventCountdown || '...'}`
                    )
                  : L(
                      '⏳ Đang chờ Admin sắp xếp lịch trình',
                      '⏳ Waiting for Admin to arrange schedule',
                      '⏳ 운영진 일정 조율 대기 중'
                    )}
              </div>
              <p className={`text-xs mt-1.5 max-w-sm leading-relaxed ${textSecondary}`}>
                {isEventCountdown
                  ? L(
                      `Lộ trình ${totalDays > 0 ? `${totalDays} ngày` : 'thử thách'} sẽ chính thức mở vào lúc 00:00 ngày ${eventState.startDateLabel || ''}.`,
                      `The ${totalDays > 0 ? `${totalDays}-day` : 'challenge'} roadmap will open at 00:00 on ${eventState.startDateLabel || ''}.`,
                      `${totalDays > 0 ? `${totalDays}일 ` : ''}로드맵이 ${eventState.startDateLabel || ''} 00:00에 열립니다.`
                    )
                  : L(
                      `Danh sách thử thách (${totalDays > 0 ? `${totalDays} ngày` : 'đang cập nhật'}) sẽ hiển thị tại đây ngay khi Ban tổ chức khởi động sự kiện.`,
                      `The challenge schedule (${totalDays > 0 ? `${totalDays} days` : 'pending'}) will appear here as soon as the organizers start the event.`,
                      `운영진이 이벤트를 시작하면 챌린지 일정 (${totalDays > 0 ? `${totalDays}일` : '예정'})이 여기에 표시됩니다.`
                    )}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {challenges.slice(0, 6).map((c) => {
                const isCompleted = c.status === 'COMPLETED';
                const isExpired = c.status === 'EXPIRED';
                const isInProgress = c.status === 'IN_PROGRESS';
                const isOpen = c.status === 'OPEN';

                return (
                  <div
                    key={c.dayNumber}
                    onClick={() => onStartDay(c)}
                    className={`p-3 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between ${
                      isCompleted
                        ? darkMode
                          ? 'bg-emerald-950/40 border-emerald-500'
                          : 'bg-emerald-50/60 border-emerald-400'
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
                          : 'bg-sky-50/65 border-sky-600 shadow-sm'
                        : darkMode
                        ? 'bg-slate-800/50 border-slate-700/70 text-slate-300'
                        : 'bg-white/55 border-white/70 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className={`text-sm font-black ${textPrimary}`}>{c.title}</span>
                      {startingDay === c.dayNumber ? (
                        <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
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
                    <div className={`text-[11px] mt-1 ${textSecondary}`}>{c.dateLabel}</div>
                    <div className="mt-2 text-xs font-extrabold">
                      {isCompleted ? (
                        c.isExpired ? (
                          <span className="text-amber-600 dark:text-amber-400">
                            0{t.pointsSuffix} ({L('Luyện tập', 'Practice', '연습')})
                          </span>
                        ) : c.resultsRevealed ? (
                          <span className="text-emerald-600">
                            {c.score}/{getChallengeMaxPoints(c)}{t.pointsSuffix}
                          </span>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400">
                            ⏳ {t.submittedWaitingMidnight}
                          </span>
                        )
                      ) : isExpired ? (
                        <span className="text-amber-600 dark:text-amber-400">
                          {L('Luyện tập (0đ BXH)', 'Practice (0 pts)', '연습하기 (0점)')}
                        </span>
                      ) : isInProgress ? (
                        <span className="text-blue-600 dark:text-blue-400 animate-pulse">
                          {L('Tiếp tục làm bài', 'Continue quiz', '이어서 풀기')}
                        </span>
                      ) : isOpen ? (
                        <span className="text-sky-600 dark:text-sky-400">{t.tapToStart}</span>
                      ) : (
                        <span className="text-slate-400">{t.lockedBadge}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Bảng Xếp Hạng Top 5 */}
        <div className={`lg:col-span-6 rounded-3xl p-4 sm:p-5 border shadow-md flex flex-col justify-between ${cardBg}`}>
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className={`text-sm sm:text-base font-black flex items-center gap-1.5 ${textPrimary}`}>
                <Trophy className="w-4 h-4 text-amber-500" /> {t.topLeaderboardTitle}
              </h2>
              <button
                onClick={() => onNavigateTab('leaderboard')}
                className="text-xs font-extrabold text-blue-600 hover:underline flex items-center"
              >
                {t.viewTop50} <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className={`divide-y ${darkMode ? 'divide-slate-700/60' : 'divide-slate-200/60'}`}>
              {(leaderboardData.topList || []).length === 0 ? (
                <div className="py-6 text-center text-xs font-semibold text-slate-400">
                  {t.noLeaderboardData}
                </div>
              ) : (
                (leaderboardData.topList || []).slice(0, 5).map((item: any) => (
                  <div key={item.id} className="py-2.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-6 text-center text-sm font-black">
                        {item.rank === 1
                          ? '🥇'
                          : item.rank === 2
                          ? '🥈'
                          : item.rank === 3
                          ? '🥉'
                          : `#${item.rank}`}
                      </span>
                      <img
                        src={item.avatarUrl}
                        alt={item.fullName}
                        className="w-8 h-8 rounded-full bg-slate-100 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className={`text-xs sm:text-sm font-extrabold truncate ${textPrimary}`}>
                          {item.fullName}
                        </div>
                        <div className={`text-[10px] truncate ${textSecondary}`}>
                          GEN {item.employeeId} • {item.completedDays}/{totalDaysLabel} {t.daysUnit}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs sm:text-sm font-black text-blue-600 block">
                        {item.totalScore.toLocaleString()} {t.pointsSuffix}
                      </span>
                      <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center justify-end gap-0.5">
                        <Clock className="w-2.5 h-2.5 inline" />
                        {formatTimeMmSs(Math.round((item.totalTimeMs || 0) / 1000))}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div
            className={`mt-3 pt-3 border-t flex items-center justify-between px-3.5 py-2.5 rounded-2xl ${
              darkMode
                ? 'border-slate-700/60 bg-blue-950/50 text-blue-200'
                : 'border-white/70 bg-blue-50/75 text-blue-950'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-black bg-blue-600 text-white px-2 py-0.5 rounded-md">
                {user?.role === 'ADMIN' || myRankNumber === '-' ? '--' : `#${myRankNumber}`}
              </span>
              <span className="text-xs font-extrabold">
                {user?.fullName} ({t.youBadge})
              </span>
            </div>
            <span className="text-xs font-black text-blue-600">
              {myTotalScore.toLocaleString()}
              {t.pointsSuffix} • {completedCount}/{totalDaysLabel} {t.daysUnit}
            </span>
          </div>
        </div>
      </div>

      {/* Exciting Activities */}
      <div className={`rounded-3xl p-4 sm:p-6 border shadow-md space-y-4 ${cardBg}`}>
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-2 text-xs sm:text-sm font-black text-amber-500 uppercase tracking-widest">
            <span>✦</span> {displayTitle} <span>✦</span>
          </div>
          <h2 className={`text-base sm:text-xl font-black ${textPrimary}`}>{t.activitiesHeading}</h2>
          <p className={`text-xs sm:text-sm ${textSecondary}`}>{t.activitiesSub}</p>
        </div>

        {visibleActivities.length === 0 ? (
          <div className="py-8 px-4 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
            <Sparkles className="w-8 h-8 mx-auto text-amber-500 mb-2 opacity-80" />
            <p className={`text-xs sm:text-sm font-bold ${textPrimary}`}>
              Chuỗi hoạt động sự kiện đang được cập nhật!
            </p>
            <p className={`text-[11px] sm:text-xs mt-1 ${textSecondary}`}>
              Ban tổ chức sẽ sớm mở các hoạt động hấp dẫn tiếp theo. Hãy đón chờ nhé!
            </p>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-3.5">
            {visibleActivities.map((act, actIdx) => {
              const theme = HOME_EVENT_THEMES[act.themeColor] || HOME_EVENT_THEMES.amber;
              const imgSrc = resolveMediaUrl(act.img, 'events/golden-bell.jpg');

              return (
                <div
                  key={act.id || actIdx}
                  onClick={() => {
                    if (act.actionType === 'daily') {
                      onNavigateTab('challenges');
                    } else if (act.actionType === 'link' && act.actionUrl) {
                      window.open(act.actionUrl, '_blank');
                    } else {
                      onShowEventsPopup();
                    }
                  }}
                  className={`group cursor-pointer rounded-2xl sm:rounded-3xl border shadow-sm hover:shadow-md transition overflow-hidden ${theme.borderBg}`}
                >
                  <div className="flex flex-col sm:flex-row">
                    <div className="relative w-full sm:w-44 md:w-56 h-36 sm:h-auto shrink-0 overflow-hidden bg-slate-100 dark:bg-slate-900">
                      <img
                        src={imgSrc}
                        alt={act.titleC}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                    </div>

                    <div className="flex-1 min-w-0 p-3.5 sm:p-4 flex flex-col justify-between gap-2.5">
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <h3
                            className={`text-base sm:text-lg font-black flex items-center gap-1.5 ${theme.titleColor}`}
                          >
                            {act.titleA} {act.titleB ? `${act.titleB} ` : ''}
                            {act.titleC}
                          </h3>
                          <span
                            className={`hidden sm:inline-flex items-center gap-1 text-xs font-black group-hover:translate-x-1 transition ${theme.titleColor}`}
                          >
                            {act.actionType === 'daily'
                              ? t.joinDaily
                              : act.actionType === 'link'
                              ? 'Tham gia'
                              : t.viewDetails}
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 mt-1 leading-snug">
                          {act.desc}
                        </p>
                      </div>

                      {act.chips && act.chips.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 text-[11px] font-bold">
                          {act.chips.map((chip, cIdx) => {
                            const IconComp = chipIcons[cIdx % chipIcons.length];
                            return (
                              <span
                                key={cIdx}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/90 dark:bg-slate-800/80 border shadow-xs ${theme.chipBg}`}
                              >
                                <IconComp className="w-3.5 h-3.5 shrink-0" />
                                <span>{chip}</span>
                              </span>
                            );
                          })}
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/50 dark:border-slate-700/40">
                        <div
                          className={`flex items-center gap-1.5 text-[10px] sm:text-[11px] font-medium px-2.5 py-1 rounded-lg truncate ${theme.noteBg}`}
                        >
                          <Users className="w-3 h-3 shrink-0" />
                          <span className="truncate">{act.note || t.deptNote}</span>
                        </div>
                        <button
                          type="button"
                          className={`w-8 h-8 rounded-full text-white flex items-center justify-center shadow-md shrink-0 group-hover:scale-110 transition active:scale-95 ${theme.arrowBg}`}
                          title={act.actionType === 'daily' ? t.joinDaily : t.viewDetails}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="relative rounded-2xl px-4 py-3 bg-gradient-to-r from-blue-700 via-blue-600 to-sky-500 text-white flex flex-col sm:flex-row items-center justify-between gap-2 shadow-sm">
          <div className="leading-tight text-center sm:text-left">
            <div className="text-xs sm:text-sm font-bold italic opacity-90">{t.bePartOf}</div>
            <div className="text-sm sm:text-base font-black text-amber-300 italic">
              SPEAK RIGHT 2026 ✦
            </div>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-white text-blue-700 text-xs font-black italic text-center shadow -rotate-1 max-w-full sm:max-w-[55%]">
            “{t.tagline}” 🙂
          </div>
        </div>
      </div>
    </div>
  );
};

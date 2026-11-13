import React from 'react';
import { Clock, Trophy } from 'lucide-react';
import { SharedThemeProps, formatTimeMmSs } from '../app/appTypes';

interface LeaderboardTabProps extends SharedThemeProps {
  leaderboardData: any;
  user: any;
  isGuest: boolean;
  totalDaysLabel: string;
  onOpenAuth: (mode: 'login' | 'register') => void;
}

export const LeaderboardTab: React.FC<LeaderboardTabProps> = ({
  leaderboardData,
  user,
  isGuest,
  totalDaysLabel,
  onOpenAuth,
  darkMode,
  cardBg,
  textPrimary,
  textSecondary,
  t,
  L,
}) => {
  return (
    <div className="max-w-3xl mx-auto space-y-3.5">
      <div className={`flex items-center justify-between p-4 rounded-2xl border backdrop-blur-md ${cardBg}`}>
        <h2 className={`text-base font-black flex items-center gap-2 ${textPrimary}`}>
          <Trophy className="w-5 h-5 text-amber-500" /> {t.leaderboard} Top 50
        </h2>
        <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-xl">
          {t.realtimeUpdate}
        </span>
      </div>

      <div
        className={`rounded-3xl border shadow-sm divide-y overflow-hidden backdrop-blur-md ${cardBg} ${
          darkMode ? 'divide-slate-800' : 'divide-slate-100'
        }`}
      >
        {(leaderboardData.topList || []).length === 0 ? (
          <div className="p-8 text-center text-sm font-semibold text-slate-400">
            {t.noLeaderboardPlayers}
          </div>
        ) : (
          (leaderboardData.topList || []).map((item: any) => {
            const isMe = item.id === user?.id;
            return (
              <div
                key={item.id}
                className={`flex items-center justify-between p-3.5 sm:px-5 ${
                  isMe ? (darkMode ? 'bg-blue-950/50 font-bold' : 'bg-blue-50/90 font-bold') : ''
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-7 text-center shrink-0">
                    {item.rank === 1 ? (
                      <span className="text-xl">🥇</span>
                    ) : item.rank === 2 ? (
                      <span className="text-xl">🥈</span>
                    ) : item.rank === 3 ? (
                      <span className="text-xl">🥉</span>
                    ) : (
                      <span className={`text-xs font-black ${textSecondary}`}>#{item.rank}</span>
                    )}
                  </div>
                  <img
                    src={item.avatarUrl}
                    alt={item.fullName}
                    className="w-9 h-9 rounded-full bg-slate-100 shrink-0"
                  />
                  <div className="min-w-0">
                    <div className={`text-xs sm:text-sm font-extrabold truncate ${textPrimary}`}>
                      {item.fullName}{' '}
                      {isMe && (
                        <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full ml-1">
                          {t.youBadge}
                        </span>
                      )}
                    </div>
                    <div className={`text-[11px] truncate ${textSecondary}`}>
                      GEN {item.employeeId}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-sm sm:text-base font-black text-blue-600">
                    {item.totalScore.toLocaleString()}
                    {t.pointsSuffix}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {item.completedDays}/{totalDaysLabel} {t.daysUnit}
                  </div>
                  <div className="text-[11px] font-bold text-amber-600 dark:text-amber-400 flex items-center justify-end gap-1 mt-0.5">
                    <Clock className="w-3 h-3 inline" />
                    <span>{formatTimeMmSs(Math.round((item.totalTimeMs || 0) / 1000))}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {leaderboardData.myRank && (
        <div className="bg-blue-700 text-white p-3.5 rounded-2xl shadow-xl flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="px-2.5 py-1 rounded-lg bg-white/20 font-black text-xs">
              #{leaderboardData.myRank.rank}
            </span>
            <span className="text-xs sm:text-sm font-extrabold">
              {user?.fullName} ({t.youBadge})
            </span>
          </div>
          <div className="text-right">
            <span className="text-sm sm:text-base font-black text-amber-300 block">
              {leaderboardData.myRank.totalScore.toLocaleString()} {t.pointsSuffix}
            </span>
            <span className="text-[10px] text-blue-200 font-bold flex items-center justify-end gap-0.5">
              <Clock className="w-2.5 h-2.5 inline" />
              {formatTimeMmSs(Math.round((leaderboardData.myRank.totalTimeMs || 0) / 1000))}
            </span>
          </div>
        </div>
      )}

      {!leaderboardData.myRank && user?.role === 'ADMIN' && (
        <div className="p-3.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-xs sm:text-sm font-semibold text-amber-700 dark:text-amber-300">
          {L(
            'Tài khoản Admin vẫn được chấm và lưu điểm cá nhân khi làm thử thách, nhưng không hiển thị trong bảng xếp hạng.',
            'Admin accounts still earn and save personal quiz scores, but are excluded from leaderboard rankings.',
            '관리자 계정은 챌린지 점수가 개인 기록으로 저장되지만 랭킹 보드에는 표시되지 않습니다.'
          )}
        </div>
      )}

      {isGuest && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs sm:text-sm font-bold leading-relaxed">
            💡{' '}
            <strong>
              {L(
                'Bạn đang xem Bảng xếp hạng ở Chế độ Khách.',
                'You are viewing Leaderboard in Guest Mode.',
                '게스트 모드로 랭킹을 보고 있습니다.'
              )}
            </strong>
            <br className="hidden sm:inline" />{' '}
            {L(
              'Đăng nhập bằng Số GEN hoặc Tạo tài khoản để lưu điểm và vinh danh thứ hạng của bạn!',
              'Log in with GEN ID or create an account to save score and rank on the leaderboard!',
              '사번으로 로그인하거나 가입하여 점수를 저장하고 순위를 올려보세요!'
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onOpenAuth('login')}
              className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-sm transition"
            >
              {L('Đăng nhập ngay', 'Log in now', '지금 로그인')}
            </button>
            <button
              type="button"
              onClick={() => onOpenAuth('register')}
              className="px-3 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white font-extrabold text-xs transition"
            >
              {L('Tạo tài khoản', 'Sign up', '가입')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

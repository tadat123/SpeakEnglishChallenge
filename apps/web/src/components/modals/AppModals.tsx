import React from 'react';
import { Bell, BellRing, Lock, Sparkles, Unlock, X } from 'lucide-react';
import {
  applyAppUpdate,
  getNotificationPermissionState,
  syncAndSubscribePwaPush,
} from '../../utils/pwaPush';
import {
  SharedThemeProps,
  TabType,
  formatRelativeTime,
} from '../app/appTypes';

interface AppModalsProps extends SharedThemeProps {
  user: any;
  token: string | null;
  forceLockModalMsg: string | null;
  setForceLockModalMsg: (v: string | null) => void;
  showNotifModal: boolean;
  setShowNotifModal: (v: boolean) => void;
  notifications: any[];
  pwaUpdateReady: boolean;
  markAllNotifsAsRead: () => void;
  lockedModalDay: any | null;
  setLockedModalDay: (v: any | null) => void;
  loginPromptMsg: string | null;
  setLoginPromptMsg: (v: string | null) => void;
  onAdminToggleUnlock: (dayNumber: number, unlockNow: boolean) => void;
  onOpenAuth: (mode: 'login' | 'register') => void;
  onNavigateTab: (tab: TabType) => void;
  onToast: (msg: string, isErr?: boolean) => void;
}

export const AppModals: React.FC<AppModalsProps> = ({
  user,
  token,
  forceLockModalMsg,
  setForceLockModalMsg,
  showNotifModal,
  setShowNotifModal,
  notifications,
  pwaUpdateReady,
  markAllNotifsAsRead,
  lockedModalDay,
  setLockedModalDay,
  loginPromptMsg,
  setLoginPromptMsg,
  onAdminToggleUnlock,
  onOpenAuth,
  onNavigateTab,
  onToast,
  darkMode,
  cardBg,
  subCardBg,
  textPrimary,
  textSecondary,
  t,
  L,
}) => {
  return (
    <>
      {forceLockModalMsg && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-sm rounded-3xl p-6 text-center shadow-2xl space-y-4 border ${cardBg}`}>
            <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <Lock className="w-7 h-7" />
            </div>
            <p className="text-xs sm:text-sm leading-relaxed font-semibold">{forceLockModalMsg}</p>
            <button
              onClick={() => {
                setForceLockModalMsg(null);
                onNavigateTab('home');
              }}
              className="w-full py-3 rounded-2xl bg-blue-600 text-white font-extrabold text-sm"
            >
              {t.backToHome}
            </button>
          </div>
        </div>
      )}

      {showNotifModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div
            className={`w-full max-w-lg rounded-3xl p-4 sm:p-6 shadow-2xl relative border flex flex-col max-h-[85vh] ${cardBg}`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-slate-700/60">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`text-base font-black flex items-center gap-2 ${textPrimary}`}>
                    {L('Thông báo Ban tổ chức', 'Admin Announcements', '운영진 공지사항')}
                    {notifications.length > 0 && (
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-600 text-white">
                        {notifications.length}
                      </span>
                    )}
                  </h3>
                  <p className={`text-[11px] font-medium ${textSecondary}`}>
                    {L(
                      'Bản tin Bảng Xếp Hạng, bài thi mới & thông báo chính thức',
                      'Leaderboard bulletin, challenges & announcements',
                      '리더보드 소식, 새 챌린지 및 공식 공지'
                    )}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowNotifModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                title={L('Đóng', 'Close', '닫기')}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto my-3 space-y-2.5 pr-1 divide-y divide-slate-100 dark:divide-slate-800/60">
              {pwaUpdateReady && (
                <div className="p-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 text-white flex items-center justify-between gap-3 shadow-sm">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Sparkles className="w-5 h-5 text-amber-300 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-black">
                        {L('Đã có bản cập nhật ứng dụng mới!', 'New app update available!', '새로운 앱 업데이트가 있습니다!')}
                      </div>
                      <div className="text-[11px] text-blue-100">
                        {L('Bấm để tải lại phiên bản mới nhất.', 'Tap to reload the latest version.', '최신 버전으로 새로고침하세요.')}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => applyAppUpdate()}
                    className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shrink-0"
                  >
                    {L('Cập nhật', 'Update', '업데이트')}
                  </button>
                </div>
              )}

              {getNotificationPermissionState() !== 'granted' &&
                getNotificationPermissionState() !== 'unsupported' && (
                  <div className={`p-3 rounded-2xl border flex items-center justify-between gap-3 ${subCardBg}`}>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <BellRing className="w-4 h-4 text-blue-500 shrink-0" />
                      <div className="text-xs font-bold leading-snug">
                        {L(
                          'Nhận thông báo khi có Bài mới & Bảng xếp hạng trên thiết bị',
                          'Get device notifications for new challenges & rankings',
                          '새 챌린지 및 랭킹 기기 알림 받기'
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        const res = await syncAndSubscribePwaPush({
                          user,
                          token,
                          askPermission: true,
                        });
                        if (res.ok) {
                          onToast(
                            L('Đã bật thông báo trên thiết bị!', 'Device notifications enabled!', '기기 알림이 활성화되었습니다!')
                          );
                        }
                      }}
                      className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shrink-0"
                    >
                      {L('Bật chuông', 'Enable', '알림 켜기')}
                    </button>
                  </div>
                )}

              {notifications.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                    <Bell className="w-6 h-6" />
                  </div>
                  <p className={`text-sm font-bold ${textPrimary}`}>
                    {L('Chưa có thông báo nào', 'No notifications yet', '새로운 알림이 없습니다')}
                  </p>
                  <p className={`text-xs ${textSecondary}`}>
                    {L('Các thông báo từ Ban tổ chức sẽ hiển thị ở đây.', 'Announcements from admin will appear here.', '운영진 공지사항이 여기에 표시됩니다.')}
                  </p>
                </div>
              ) : (
                notifications.map((notif, idx) => {
                  const isTop1 = notif.type === 'NEW_TOP_1';
                  const isNewDay = notif.type === 'NEW_DAY_UNLOCKED';
                  const isReminder = notif.type === 'UNSTUDIED_REMINDER';

                  return (
                    <div
                      key={notif.id || idx}
                      onClick={() => {
                        setShowNotifModal(false);
                        if (notif.targetUrl) {
                          if (notif.targetUrl.includes('challenges')) onNavigateTab('challenges');
                          else if (notif.targetUrl.includes('leaderboard')) onNavigateTab('leaderboard');
                          else if (notif.targetUrl.includes('profile')) onNavigateTab('profile');
                          else onNavigateTab('home');
                        }
                      }}
                      className={`pt-3 pb-2 px-3 rounded-2xl transition cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-start gap-3 ${
                        isTop1
                          ? 'border-l-4 border-amber-500 bg-amber-50/40 dark:bg-amber-950/20'
                          : isNewDay
                          ? 'border-l-4 border-blue-500 bg-blue-50/40 dark:bg-blue-950/20'
                          : isReminder
                          ? 'border-l-4 border-rose-500 bg-rose-50/40 dark:bg-rose-950/20'
                          : 'border-l-4 border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/20'
                      }`}
                    >
                      <div className="text-2xl mt-0.5 shrink-0">
                        {isTop1 ? '👑' : isNewDay ? '🌅' : isReminder ? '⏰' : '📢'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className={`text-xs sm:text-sm font-black truncate ${textPrimary}`}>
                            {notif.title}
                          </h4>
                          <span className="text-[10px] font-semibold text-slate-400 shrink-0">
                            {formatRelativeTime(notif.deliveredAt, L)}
                          </span>
                        </div>
                        <p className={`text-xs mt-1 leading-relaxed ${textSecondary}`}>{notif.body}</p>
                        {notif.targetUrl && (
                          <div className="mt-1.5 text-[11px] font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                            <span>{L('Bấm để xem chi tiết', 'Tap to view', '자세히 보기')} →</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-xs">
              <span className={`text-[11px] ${textSecondary}`}>
                {L('Tự động cập nhật mỗi khi có tin mới', 'Auto-updates on new messages', '새 메시지 시 자동 업데이트')}
              </span>
              <button
                type="button"
                onClick={() => {
                  markAllNotifsAsRead();
                  setShowNotifModal(false);
                }}
                className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-sm transition"
              >
                {L('Đóng', 'Close', '닫기')}
              </button>
            </div>
          </div>
        </div>
      )}

      {lockedModalDay && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-sm rounded-3xl p-6 text-center shadow-2xl relative border ${cardBg}`}>
            <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center">
              <Lock className="w-7 h-7" />
            </div>
            <h3 className={`text-xl font-black mt-3 ${textPrimary}`}>{lockedModalDay.title}</h3>
            <p className={`text-xs font-semibold ${textSecondary}`}>{lockedModalDay.dateLabel}</p>

            <div className="bg-amber-50 dark:bg-amber-950/60 rounded-2xl p-4 my-4 border border-amber-300 dark:border-amber-800 text-xs sm:text-sm font-extrabold text-amber-950 dark:text-amber-200 text-left space-y-1.5">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-black text-sm">
                <Lock className="w-4 h-4 shrink-0" />
                <span>
                  {L('Bài học chưa có sẵn hoặc đang bị khóa', 'Lesson not available or currently locked', '강의가 아직 준비되지 않았거나 잠겨 있습니다')}
                </span>
              </div>
              <p className="text-xs text-amber-900/90 dark:text-amber-300 font-medium leading-relaxed">
                {L(
                  'Ban tổ chức hiện đang khóa ngày thử thách này để chuẩn bị đề thi hoặc đã tạm đóng. Vui lòng quay lại sau khi Ban tổ chức mở khóa!',
                  'The organizers have locked this challenge day for preparation or maintenance. Please check back when it is unlocked!',
                  '운영진이 시험 준비 hoặc 점검을 위해 이 챌린지 날짜를 잠갔습니다. 잠금 해제 알림 후 다시 이용해 주세요!'
                )}
              </p>
            </div>

            <p className="text-xs font-bold italic text-blue-700">
              “Keep practicing, better pronunciation is coming!”
            </p>

            <div className="mt-5 space-y-2">
              <button
                onClick={() => setLockedModalDay(null)}
                className="w-full py-3 rounded-2xl bg-blue-600 text-white font-extrabold text-sm"
              >
                {t.understoodBtn}
              </button>
              {user?.role === 'ADMIN' && (
                <button
                  onClick={() => onAdminToggleUnlock(lockedModalDay.dayNumber, true)}
                  className="w-full py-2.5 rounded-2xl bg-amber-100 text-amber-900 font-bold text-xs flex items-center justify-center gap-1"
                >
                  <Unlock className="w-3.5 h-3.5" />{' '}
                  {L(
                    `Mở khóa ngay ${lockedModalDay.title} (Admin)`,
                    `Unlock ${lockedModalDay.title} now (Admin)`,
                    `지금 ${lockedModalDay.title} 잠금 해제 (관리자)`
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {loginPromptMsg && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-sm rounded-3xl p-6 text-center shadow-2xl space-y-4 border ${cardBg}`}>
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center">
              <Lock className="w-7 h-7" />
            </div>
            <h3 className={`text-base font-black ${textPrimary}`}>{t.loginRequiredTitle}</h3>
            <p className="text-xs sm:text-sm leading-relaxed font-semibold">{loginPromptMsg}</p>
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setLoginPromptMsg(null);
                  onOpenAuth('login');
                }}
                className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm shadow-md"
              >
                {t.loginNowBtn}
              </button>
              <button
                type="button"
                onClick={() => {
                  setLoginPromptMsg(null);
                  onOpenAuth('register');
                }}
                className="w-full py-2.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-sm"
              >
                {t.registerSaveScoreBtn}
              </button>
              <button
                type="button"
                onClick={() => setLoginPromptMsg(null)}
                className={`w-full py-2 rounded-xl text-xs font-bold ${
                  darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {t.laterGuestBtn}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

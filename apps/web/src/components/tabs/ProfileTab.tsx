import React from 'react';
import {
  ArrowRight,
  Award,
  BarChart3,
  BellRing,
  CheckCircle2,
  Download,
  Laptop,
  ShieldCheck,
  Smartphone,
  Tablet,
  Trash2,
} from 'lucide-react';
import {
  getNotificationPermissionState,
  syncAndSubscribePwaPush,
} from '../../utils/pwaPush';
import {
  SharedThemeProps,
  TabType,
  getChallengeMilestones,
} from '../app/appTypes';

interface ProfileTabProps extends SharedThemeProps {
  user: any;
  token: string | null;
  profileData: any;
  userDevices: any[];
  totalDays: number;
  totalDaysLabel: string;
  completedCount: number;
  myTotalScore: number;
  myRankNumber: any;
  onNavigateTab: (tab: TabType) => void;
  onRemoveDevice: (deviceId: string) => void;
  onOpenPwaInstallGuide: () => void;
  onToast: (msg: string, isErr?: boolean) => void;
}

export const ProfileTab: React.FC<ProfileTabProps> = ({
  user,
  token,
  profileData,
  userDevices,
  totalDays,
  totalDaysLabel,
  completedCount,
  myTotalScore,
  myRankNumber,
  onNavigateTab,
  onRemoveDevice,
  onOpenPwaInstallGuide,
  onToast,
  lang,
  cardBg,
  subCardBg,
  textPrimary,
  textSecondary,
  t,
  L,
}) => {
  const realAttempts = (profileData?.attempts || []).slice(-7);

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {user?.role === 'ADMIN' && (
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-xl shadow-blue-600/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-blue-400/30">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/30">
              <ShieldCheck className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-wider">
                  Quyền Quản Trị Hệ Thống
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black mt-1">
                {t.adminPortal || 'Cổng Quản Trị Admin CMS'}
              </h3>
              <p className="text-xs text-blue-100 mt-0.5">
                {L(
                  `Quản lý lịch trình (${totalDays > 0 ? `${totalDays} ngày` : 'tùy chỉnh'}), tạo đề bulk Excel, duyệt danh sách nhân viên và gửi thông báo Push.`,
                  `Manage schedule (${totalDays > 0 ? `${totalDays} days` : 'custom'}), bulk import questions via Excel, inspect users, and dispatch push alerts.`,
                  `일정(${totalDays > 0 ? `${totalDays}일` : '맞춤'}) 관리, Excel 대량 문제 등록 및 공지 발송`
                )}
              </p>
            </div>
          </div>
          <a
            href="#admin/dashboard"
            onClick={(e) => {
              if (!e.metaKey && !e.ctrlKey && !e.shiftKey && e.button === 0) {
                e.preventDefault();
                onNavigateTab('admin');
              }
            }}
            className="px-5 py-2.5 rounded-2xl bg-white hover:bg-blue-50 text-blue-900 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shrink-0 transition active:scale-95 cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 text-blue-700" />
            <span>{L('Vào Trang Quản Trị', 'Open Admin Portal', '관리자 포털')}</span>
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      )}

      <div className={`rounded-3xl p-5 border shadow-sm backdrop-blur-md ${cardBg}`}>
        <div className="flex items-center gap-4">
          <img
            src={user?.avatarUrl}
            alt={user?.fullName}
            className="w-16 h-16 rounded-full bg-blue-50 border-2 border-blue-100"
          />
          <div>
            <div className="flex items-center gap-2">
              <h2 className={`text-lg font-black ${textPrimary}`}>{user?.fullName}</h2>
              {user?.role === 'ADMIN' && (
                <span className="px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 font-black text-[10px] tracking-wider uppercase shadow-xs">
                  Admin
                </span>
              )}
            </div>
            <p className={`text-xs ${textSecondary}`}>
              GEN <strong>{user?.employeeId}</strong>
            </p>
            <p className="text-xs text-blue-600 font-semibold">{user?.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2.5 mt-4 pt-4 border-t border-slate-200/60 text-center">
          <div className={`p-3 rounded-2xl border ${subCardBg}`}>
            <div className="text-lg sm:text-xl font-black text-blue-600">
              {myTotalScore.toLocaleString()}
            </div>
            <div className={`text-[11px] ${textSecondary}`}>{t.totalScoreLabel}</div>
          </div>
          <div className={`p-3 rounded-2xl border ${subCardBg}`}>
            <div className={`text-lg sm:text-xl font-black ${textPrimary}`}>
              {completedCount}/{totalDaysLabel}
            </div>
            <div className={`text-[11px] ${textSecondary}`}>{t.completedDaysLabel}</div>
          </div>
          <div className={`p-3 rounded-2xl border ${subCardBg}`}>
            <div className="text-lg sm:text-xl font-black text-emerald-600">
              {user?.role === 'ADMIN' || myRankNumber === '-' ? '--' : `#${myRankNumber}`}
            </div>
            <div className={`text-[11px] ${textSecondary}`}>{t.rankLabel}</div>
          </div>
        </div>
      </div>

      <div className={`rounded-3xl p-5 border shadow-sm backdrop-blur-md ${cardBg}`}>
        <h3 className={`text-sm font-black flex items-center gap-1.5 mb-3 ${textPrimary}`}>
          <Award className="w-4 h-4 text-amber-500" /> {t.milestonesTitle}
        </h3>
        <div
          className="grid gap-2 text-center"
          style={{
            gridTemplateColumns: `repeat(${getChallengeMilestones(totalDays).length}, minmax(0, 1fr))`,
          }}
        >
          {getChallengeMilestones(totalDays).map((m) => {
            const unlocked = completedCount >= m;
            return (
              <div
                key={m}
                className={`p-2.5 rounded-2xl border ${
                  unlocked ? 'bg-amber-50/90 border-amber-300 text-amber-900' : `${subCardBg} opacity-70`
                }`}
              >
                <div className="text-base">{unlocked ? '🏅' : '🔒'}</div>
                <div className="text-[11px] font-extrabold mt-1">Day {m}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className={`rounded-3xl p-5 border shadow-sm backdrop-blur-md ${cardBg}`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className={`text-sm font-black flex items-center gap-1.5 ${textPrimary}`}>
            <BarChart3 className="w-4 h-4 text-blue-600" /> {t.statsCorrectWrong}
          </h3>
          <div className="flex gap-3 text-[11px] font-bold">
            <span className="text-emerald-600">{t.correctShort}</span>
            <span className="text-rose-500">{t.wrongShort}</span>
          </div>
        </div>

        {realAttempts.length === 0 ? (
          <div className={`p-6 rounded-2xl border text-center ${subCardBg}`}>
            <p className={`text-xs font-semibold ${textSecondary}`}>
              {L(
                'Chưa có dữ liệu bài thi. Hãy hoàn thành thử thách để xem thống kê đúng / sai!',
                'No quiz data yet. Complete daily challenges to see accuracy statistics!',
                '아직 데이터가 없습니다. 매일 챌린지를 풀고 정답/오답 통계를 확인하세요!'
              )}
            </p>
          </div>
        ) : (
          <div className={`grid grid-cols-7 gap-2 items-end h-28 pt-4 px-2 rounded-2xl border ${subCardBg}`}>
            {realAttempts.map((att: any) => {
              const totalQ = (att.correctCount || 0) + (att.wrongCount || 0) || 10;
              return (
                <div key={att.id || att.dayNumber} className="flex flex-col items-center gap-1 h-full justify-end">
                  <div className="flex items-end gap-1 w-full justify-center h-20">
                    <div
                      className="w-2.5 bg-emerald-500 rounded-t"
                      title={`${L('Đúng', 'Correct', '정답')}: ${att.correctCount}`}
                      style={{ height: `${Math.min(100, Math.round(((att.correctCount || 0) / totalQ) * 100))}%` }}
                    />
                    <div
                      className="w-2.5 bg-rose-400 rounded-t"
                      title={`${L('Sai', 'Wrong', '오답')}: ${att.wrongCount}`}
                      style={{ height: `${Math.min(100, Math.max(8, Math.round(((att.wrongCount || 0) / totalQ) * 100)))}%` }}
                    />
                  </div>
                  <span className={`text-[10px] font-bold ${textSecondary}`}>D{att.dayNumber}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Thiết bị đã đăng nhập */}
      <div className={`rounded-3xl p-5 border shadow-sm backdrop-blur-md space-y-3 ${cardBg}`}>
        <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-800">
          <div>
            <h3 className={`text-sm font-black flex items-center gap-1.5 ${textPrimary}`}>
              <Smartphone className="w-4 h-4 text-blue-600" /> {t.userDevicesTitle}
            </h3>
            <p className={`text-[11px] ${textSecondary}`}>{t.userDevicesDesc}</p>
          </div>
          <span className="text-[11px] font-black px-2.5 py-1 rounded-xl bg-blue-50 text-blue-700 dark:bg-slate-800 dark:text-blue-300">
            {userDevices.length} {t.devicesUnit}
          </span>
        </div>

        <div className="space-y-2">
          {userDevices.map((dev) => (
            <div
              key={dev.id}
              className={`p-3 rounded-2xl border flex items-center justify-between gap-3 ${subCardBg} ${
                dev.isCurrent ? 'ring-2 ring-emerald-500/30' : ''
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  {dev.deviceType === 'desktop' ? (
                    <Laptop className="w-4 h-4" />
                  ) : dev.deviceType === 'tablet' ? (
                    <Tablet className="w-4 h-4" />
                  ) : (
                    <Smartphone className="w-4 h-4" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-extrabold text-xs sm:text-sm truncate">{dev.deviceName}</span>
                    {dev.isCurrent && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        {t.thisDevice}
                      </span>
                    )}
                    {dev.isPwaInstalled && (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300">
                        ⚡ PWA
                      </span>
                    )}
                  </div>
                  <div className={`text-[10px] sm:text-[11px] truncate mt-0.5 ${textSecondary}`}>
                    {dev.browser} • {dev.os} • {t.activeAt}{' '}
                    {new Date(dev.lastActiveAt).toLocaleString(
                      lang === 'ko' ? 'ko-KR' : lang === 'en' ? 'en-US' : 'vi-VN'
                    )}
                  </div>
                </div>
              </div>

              {!dev.isCurrent && (
                <button
                  onClick={() => onRemoveDevice(dev.id)}
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition shrink-0"
                  title={t.removeDevice}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Thông báo Ngoài Màn Hình */}
      <div className={`rounded-3xl p-5 border shadow-sm backdrop-blur-md space-y-3 ${cardBg}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-800 gap-2">
          <div>
            <h3 className={`text-sm font-black flex items-center gap-1.5 ${textPrimary}`}>
              <BellRing className="w-4 h-4 text-amber-500" />
              {L(
                'Thông báo Ngoài Màn hình (Màn hình khóa & Banner hệ điều hành)',
                'System Push Notifications (Lock Screen & OS Banner)',
                '잠금화면 및 시스템 푸시 알림'
              )}
            </h3>
            <p className={`text-[11px] ${textSecondary}`}>
              {L(
                'Cho phép ứng dụng gửi thông báo khi có thử thách mới, cập nhật Top 1 Bảng xếp hạng và nhắc nhở học tập ra ngoài màn hình khóa ngay cả khi đã tắt app.',
                'Receive alerts for new daily challenges, Top 1 leaderboard updates, and study reminders on your lock screen even when the app is closed.',
                '앱을 종료해도 새 일일 챌린지, 랭킹 1위 소식 및 학습 알림을 잠금화면에서 바로 수신합니다.'
              )}
            </p>
          </div>
          <span
            className={`text-[11px] font-black px-2.5 py-1 rounded-xl self-start sm:self-auto shrink-0 ${
              getNotificationPermissionState() === 'granted'
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
            }`}
          >
            {getNotificationPermissionState() === 'granted'
              ? L('✓ Đang bật ngoài màn hình', '✓ System Push Active', '✓ 시스템 알림 켜짐')
              : L('⚠️ Chưa cấp quyền ngoài app', '⚠️ Not enabled', '⚠️ 알림 권한 없음')}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div className="text-xs space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-extrabold">{L('Trạng thái:', 'Status:', '상태:')}</span>
              {getNotificationPermissionState() === 'granted' ? (
                <span className="text-emerald-600 font-bold">
                  {L(
                    'Đã cấp quyền hiển thị ngoài màn hình (Native Notification)',
                    'Granted (Native OS notifications enabled)',
                    '허용됨 (시스템 알림 수신 가능)'
                  )}
                </span>
              ) : (
                <span className="text-amber-600 font-bold">
                  {L(
                    'Chỉ hiển thị pop-up khi đang mở app (Chưa cấp quyền ra ngoài)',
                    'In-app only (System notification permission needed)',
                    '앱 내부 팝업만 표시됨'
                  )}
                </span>
              )}
            </div>
            <p className={`text-[11px] ${textSecondary}`}>
              {L(
                'Sau khi bấm Cho phép, hệ thống sẽ gửi 1 thông báo thử nghiệm ra ngoài khay thông báo của bạn.',
                'After granting permission, a test notification will be delivered to your device.',
                '권한 허용 시 기기 알림창으로 테스트 알림이 즉시 전송됩니다.'
              )}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={onOpenPwaInstallGuide}
              className="px-3.5 py-2.5 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 hover:bg-blue-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-blue-700 dark:text-blue-300 font-extrabold text-xs shadow-sm transition flex items-center gap-1.5"
              title={L(
                'Xem hướng dẫn thêm icon Speak Right ra màn hình chính',
                'View Home Screen Shortcut Guide',
                '홈 화면 바로가기 추가 가이드 보기'
              )}
            >
              <Download className="w-4 h-4" />
              {L('Hướng dẫn cài đặt', 'Install Guide', '설치 가이드')}
            </button>

            {getNotificationPermissionState() !== 'granted' ? (
              <button
                type="button"
                onClick={async () => {
                  const res = await syncAndSubscribePwaPush({
                    user,
                    token,
                    askPermission: true,
                    forcePwaFlag: true,
                  });
                  if (res.permission === 'granted') {
                    onToast('🎉 Đã bật nhận thông báo thành công!');
                  } else {
                    onToast(
                      '⚠️ Chưa cấp quyền thông báo. Hãy bấm Cho phép trên hộp thoại trình duyệt.',
                      true
                    );
                  }
                }}
                className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md transition flex items-center gap-1.5"
              >
                <BellRing className="w-4 h-4" />
                {L('Bật thông báo ngoài màn hình', 'Enable System Notifications', '시스템 알림 켜기')}
              </button>
            ) : (
              <div className="px-4 py-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-black text-xs border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                {L('Đã bật thông báo hệ thống', 'System Notifications Enabled', '시스템 알림 활성화됨')}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

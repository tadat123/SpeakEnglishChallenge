import React from 'react';
import { BellRing, Save, Send, Smartphone, Trophy } from 'lucide-react';

interface AdminPushSectionProps {
  pushStatus: any | null;
  totalDays: number;
  spreadWindowSeconds: number;
  setSpreadWindowSeconds: (val: number) => void;
  minIntervalMs: number;
  setMinIntervalMs: (val: number) => void;
  autoRemindUnstudied: boolean;
  setAutoRemindUnstudied: (val: boolean) => void;
  morningHour: number;
  setMorningHour: (val: number) => void;
  morningMinute: number;
  setMorningMinute: (val: number) => void;
  eveningTop1Hour: number;
  setEveningTop1Hour: (val: number) => void;
  eveningTop1Minute: number;
  setEveningTop1Minute: (val: number) => void;
  nightUnstudiedHour: number;
  setNightUnstudiedHour: (val: number) => void;
  nightUnstudiedMinute: number;
  setNightUnstudiedMinute: (val: number) => void;
  handleSavePushConfig: (resetTodayQuota?: boolean) => void;
  handleTriggerPush: (
    type: 'NEW_DAY_UNLOCKED' | 'NEW_TOP_1' | 'UNSTUDIED_REMINDER',
    force?: boolean
  ) => void;
  darkMode: boolean;
  cardBg: string;
  subCardBg: string;
  inputBg: string;
  textPrimary: string;
  textSecondary: string;
}

export const AdminPushSection: React.FC<AdminPushSectionProps> = ({
  pushStatus,
  totalDays,
  spreadWindowSeconds,
  setSpreadWindowSeconds,
  minIntervalMs,
  setMinIntervalMs,
  autoRemindUnstudied,
  setAutoRemindUnstudied,
  morningHour,
  setMorningHour,
  morningMinute,
  setMorningMinute,
  eveningTop1Hour,
  setEveningTop1Hour,
  eveningTop1Minute,
  setEveningTop1Minute,
  nightUnstudiedHour,
  setNightUnstudiedHour,
  nightUnstudiedMinute,
  setNightUnstudiedMinute,
  handleSavePushConfig,
  handleTriggerPush,
  darkMode,
  cardBg,
  subCardBg,
  inputBg,
  textPrimary,
  textSecondary,
}) => {
  if (!pushStatus) return null;

  return (
    <div className={`rounded-3xl p-4 sm:p-6 border shadow-sm backdrop-blur-md space-y-5 ${cardBg}`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-200/60 dark:border-slate-800">
        <div>
          <h3 className={`text-sm sm:text-base font-black flex items-center gap-2 ${textPrimary}`}>
            <BellRing className="w-5 h-5 text-amber-500" />
            Lịch Thông Báo Tự Động
          </h3>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {pushStatus.queueStatus?.currentVnTime && (
            <span className="px-2.5 py-1.5 rounded-xl text-[11px] font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              🕒 Giờ VN: {pushStatus.queueStatus.currentVnTime} ({pushStatus.queueStatus.currentVnDate})
            </span>
          )}
          <span
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 ${
              pushStatus.queueStatus?.isProcessing
                ? 'bg-amber-100 text-amber-900 border border-amber-300 animate-pulse'
                : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            {pushStatus.queueStatus?.isProcessing
              ? `Đang gửi: còn ${pushStatus.queueStatus.pendingRequestsCount}...`
              : `${pushStatus.stats?.totalPwaDevices || 0} Thiết bị PWA`}
          </span>
        </div>
      </div>

      {/* 3 Khung giờ Push trong ngày */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {/* Khung 1: Buổi sáng */}
        <div className={`p-4 rounded-2xl border flex flex-col justify-between space-y-3 ${subCardBg}`}>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-600 text-white">
                Sáng ({String(morningHour).padStart(2, '0')}:
                {String(morningMinute).padStart(2, '0')})
              </span>
              <span
                className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                  pushStatus.queueStatus?.sentToday?.morningNewDay
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {pushStatus.queueStatus?.sentToday?.morningNewDay ? 'Đã gửi hôm nay' : 'Chưa gửi'}
              </span>
            </div>
            <h4 className={`text-sm font-black ${textPrimary}`}>
              🔥 TOP 1 lộ diện & Bài thi mới mở
            </h4>
          </div>
          <button
            type="button"
            onClick={() => handleTriggerPush('NEW_DAY_UNLOCKED')}
            className="w-full py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-sm transition"
          >
            <Send className="w-3.5 h-3.5" />
            {pushStatus.queueStatus?.sentToday?.morningNewDay
              ? `Gửi lại tin ${String(morningHour).padStart(2, '0')}:${String(morningMinute).padStart(2, '0')}`
              : `Gửi ngay tin ${String(morningHour).padStart(2, '0')}:${String(morningMinute).padStart(2, '0')}`}
          </button>
        </div>

        {/* Khung 2: Khen ngợi buổi tối */}
        <div className={`p-4 rounded-2xl border flex flex-col justify-between space-y-3 ${subCardBg}`}>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950">
                Tối ({String(eveningTop1Hour).padStart(2, '0')}:
                {String(eveningTop1Minute).padStart(2, '0')})
              </span>
              <span
                className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                  pushStatus.queueStatus?.sentToday?.evening19hTop1
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {pushStatus.queueStatus?.sentToday?.evening19hTop1 ? 'Đã gửi hôm nay' : 'Chưa gửi'}
              </span>
            </div>
            <h4 className={`text-sm font-black ${textPrimary}`}>
              🌟 Khen ngợi tinh thần học tập
            </h4>
          </div>
          <button
            type="button"
            onClick={() => handleTriggerPush('NEW_TOP_1')}
            className="w-full py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-sm transition"
          >
            <Trophy className="w-3.5 h-3.5" />
            {pushStatus.queueStatus?.sentToday?.evening19hTop1
              ? `Gửi lại Khen ngợi ${String(eveningTop1Hour).padStart(2, '0')}:${String(eveningTop1Minute).padStart(2, '0')}`
              : `Gửi Khen ngợi ${String(eveningTop1Hour).padStart(2, '0')}:${String(eveningTop1Minute).padStart(2, '0')}`}
          </button>
        </div>

        {/* Khung 3: Cảnh báo người chưa làm bài */}
        <div className={`p-4 rounded-2xl border flex flex-col justify-between space-y-3 ${subCardBg}`}>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-rose-600 text-white">
                Tối ({String(nightUnstudiedHour).padStart(2, '0')}:
                {String(nightUnstudiedMinute).padStart(2, '0')})
              </span>
              <span
                className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                  pushStatus.queueStatus?.sentToday?.night23hUnstudied
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {pushStatus.queueStatus?.sentToday?.night23hUnstudied ? 'Đã gửi hôm nay' : 'Chưa gửi'}
              </span>
            </div>
            <h4 className={`text-sm font-black ${textPrimary}`}>
              ⚠️ Cảnh báo chưa làm bài ({pushStatus.stats?.unstudiedAccountsCount || 0})
            </h4>
          </div>
          <button
            type="button"
            onClick={() => handleTriggerPush('UNSTUDIED_REMINDER')}
            className="w-full py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-sm transition"
          >
            <BellRing className="w-3.5 h-3.5" />
            {pushStatus.queueStatus?.sentToday?.night23hUnstudied
              ? `Gửi lại Cảnh báo ${String(nightUnstudiedHour).padStart(2, '0')}:${String(nightUnstudiedMinute).padStart(2, '0')}`
              : `Gửi Cảnh báo ${String(nightUnstudiedHour).padStart(2, '0')}:${String(nightUnstudiedMinute).padStart(2, '0')}`}
          </button>
        </div>
      </div>

      {/* Bộ điều khiển Khung Giờ & Tốc độ */}
      <div className={`p-4 rounded-2xl border space-y-3 ${subCardBg}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className={`text-xs sm:text-sm font-black ${textPrimary}`}>
              ⚙️ Cài đặt khung giờ & Tốc độ gửi
            </h4>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-xs font-extrabold flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={autoRemindUnstudied}
                onChange={(e) => setAutoRemindUnstudied(e.target.checked)}
              />
              <span>Tự động theo lịch</span>
            </label>
            <button
              type="button"
              onClick={() => handleSavePushConfig(true)}
              className="px-2.5 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-[11px] font-extrabold transition"
            >
              Đặt lại lượt hôm nay
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <div>
            <label className={`block text-[11px] font-bold mb-1 ${textSecondary}`}>
              {String(morningHour).padStart(2, '0')}:{String(morningMinute).padStart(2, '0')} Sáng (TOP 1 & Bài mới)
            </label>
            <input
              type="time"
              value={`${String(morningHour).padStart(2, '0')}:${String(morningMinute).padStart(2, '0')}`}
              onChange={(e) => {
                const val = e.target.value;
                if (val && val.includes(':')) {
                  const [h, m] = val.split(':').map(Number);
                  if (!isNaN(h) && !isNaN(m)) {
                    setMorningHour(Math.max(0, Math.min(23, h)));
                    setMorningMinute(Math.max(0, Math.min(59, m)));
                  }
                }
              }}
              style={{ colorScheme: darkMode ? 'dark' : 'light' }}
              className={`w-full px-2.5 py-2 rounded-xl border text-center text-xs sm:text-sm font-black outline-none tracking-wide cursor-pointer ${inputBg}`}
            />
            <div className="flex items-center justify-between gap-1 mt-1.5">
              {[0, 15, 30, 45].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMorningMinute(m)}
                  className={`flex-1 py-0.5 rounded text-[10px] font-extrabold transition ${
                    morningMinute === m
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  :{String(m).padStart(2, '0')}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={`block text-[11px] font-bold mb-1 ${textSecondary}`}>
              {String(eveningTop1Hour).padStart(2, '0')}:{String(eveningTop1Minute).padStart(2, '0')} Tối (Khen ngợi)
            </label>
            <input
              type="time"
              value={`${String(eveningTop1Hour).padStart(2, '0')}:${String(eveningTop1Minute).padStart(2, '0')}`}
              onChange={(e) => {
                const val = e.target.value;
                if (val && val.includes(':')) {
                  const [h, m] = val.split(':').map(Number);
                  if (!isNaN(h) && !isNaN(m)) {
                    setEveningTop1Hour(Math.max(0, Math.min(23, h)));
                    setEveningTop1Minute(Math.max(0, Math.min(59, m)));
                  }
                }
              }}
              style={{ colorScheme: darkMode ? 'dark' : 'light' }}
              className={`w-full px-2.5 py-2 rounded-xl border text-center text-xs sm:text-sm font-black outline-none tracking-wide cursor-pointer ${inputBg}`}
            />
            <div className="flex items-center justify-between gap-1 mt-1.5">
              {[0, 15, 30, 45].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setEveningTop1Minute(m)}
                  className={`flex-1 py-0.5 rounded text-[10px] font-extrabold transition ${
                    eveningTop1Minute === m
                      ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  :{String(m).padStart(2, '0')}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={`block text-[11px] font-bold mb-1 ${textSecondary}`}>
              {String(nightUnstudiedHour).padStart(2, '0')}:{String(nightUnstudiedMinute).padStart(2, '0')} Tối (Cảnh báo chưa làm)
            </label>
            <input
              type="time"
              value={`${String(nightUnstudiedHour).padStart(2, '0')}:${String(nightUnstudiedMinute).padStart(2, '0')}`}
              onChange={(e) => {
                const val = e.target.value;
                if (val && val.includes(':')) {
                  const [h, m] = val.split(':').map(Number);
                  if (!isNaN(h) && !isNaN(m)) {
                    setNightUnstudiedHour(Math.max(0, Math.min(23, h)));
                    setNightUnstudiedMinute(Math.max(0, Math.min(59, m)));
                  }
                }
              }}
              style={{ colorScheme: darkMode ? 'dark' : 'light' }}
              className={`w-full px-2.5 py-2 rounded-xl border text-center text-xs sm:text-sm font-black outline-none tracking-wide cursor-pointer ${inputBg}`}
            />
            <div className="flex items-center justify-between gap-1 mt-1.5">
              {[0, 15, 30, 45].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setNightUnstudiedMinute(m)}
                  className={`flex-1 py-0.5 rounded text-[10px] font-extrabold transition ${
                    nightUnstudiedMinute === m
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  :{String(m).padStart(2, '0')}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={`block text-[11px] font-bold mb-1 ${textSecondary}`}>
              Thời gian rải đều (giây)
            </label>
            <input
              type="number"
              min={3}
              max={3600}
              value={spreadWindowSeconds}
              onChange={(e) => setSpreadWindowSeconds(Number(e.target.value))}
              className={`w-full px-3 py-2 rounded-xl border text-xs sm:text-sm font-bold ${inputBg}`}
            />
            <div className="flex items-center justify-between gap-1 mt-1.5">
              {[10, 18, 30, 60].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSpreadWindowSeconds(s)}
                  className={`flex-1 py-0.5 rounded text-[10px] font-bold transition ${
                    spreadWindowSeconds === s
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {s}s
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={`block text-[11px] font-bold mb-1 ${textSecondary}`}>
              Khoảng cách tối thiểu (ms)
            </label>
            <input
              type="number"
              min={200}
              max={15000}
              step={100}
              value={minIntervalMs}
              onChange={(e) => setMinIntervalMs(Number(e.target.value))}
              className={`w-full px-3 py-2 rounded-xl border text-xs sm:text-sm font-bold ${inputBg}`}
            />
            <div className="flex items-center justify-between gap-1 mt-1.5">
              {[500, 1000, 1200, 2000].map((ms) => (
                <button
                  key={ms}
                  type="button"
                  onClick={() => setMinIntervalMs(ms)}
                  className={`flex-1 py-0.5 rounded text-[10px] font-bold transition ${
                    minIntervalMs === ms
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {ms >= 1000 ? `${ms / 1000}s` : `${ms}ms`}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col justify-end">
            <button
              type="button"
              onClick={() => handleSavePushConfig(false)}
              className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 h-[38px] shadow-sm transition hover:scale-[1.02]"
            >
              <Save className="w-3.5 h-3.5" />
              Lưu cấu hình
            </button>
          </div>
        </div>
      </div>

      {/* Danh sách tài khoản chưa học & Tiến độ gửi */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Cột trái: Chưa học */}
        <div className={`lg:col-span-5 p-4 rounded-2xl border space-y-2.5 ${subCardBg}`}>
          <div className="flex items-center justify-between">
            <h4 className={`text-xs font-black uppercase tracking-wider ${textPrimary}`}>
              Chưa làm bài ({pushStatus.stats?.unstudiedAccountsCount || 0})
            </h4>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
              {String(nightUnstudiedHour).padStart(2, '0')}:{String(nightUnstudiedMinute).padStart(2, '0')}
            </span>
          </div>

          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
            {(pushStatus.stats?.unstudiedAccounts || []).length === 0 ? (
              <p className="text-xs text-emerald-600 font-bold py-4 text-center">
                Tất cả tài khoản đều đã hoàn thành bài học hôm nay!
              </p>
            ) : (
              (pushStatus.stats?.unstudiedAccounts || []).map((u: any) => (
                <div
                  key={u.id}
                  className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs ${
                    darkMode ? 'bg-slate-900/70 border-slate-700' : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="min-w-0">
                    <div className={`font-extrabold truncate ${textPrimary}`}>
                      {u.fullName}{' '}
                      <span className="text-[10px] font-bold text-blue-500">
                        (GEN {u.employeeId})
                      </span>
                    </div>
                    <div className={`text-[10px] ${textSecondary}`}>
                      {u.neverStudiedAnyDay
                        ? `Chưa học ngày nào (0/${totalDays || '--'})`
                        : `Đã học ${u.completedDays}/${totalDays || '--'} ngày`}
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 text-[10px] font-extrabold shrink-0">
                    Chưa học
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Cột phải: Tiến độ */}
        <div className={`lg:col-span-7 p-4 rounded-2xl border space-y-2.5 ${subCardBg}`}>
          <div className="flex items-center justify-between">
            <h4 className={`text-xs font-black uppercase tracking-wider ${textPrimary}`}>
              Tiến độ gửi thông báo
            </h4>
          </div>

          <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
            {(pushStatus.campaigns || []).length === 0 ? (
              <p className={`text-xs py-6 text-center ${textSecondary}`}>
                Chưa có thông báo nào.
              </p>
            ) : (
              (pushStatus.campaigns || []).slice(0, 5).map((camp: any) => {
                const pct =
                  camp.totalTargets > 0
                    ? Math.round((camp.sentCount / camp.totalTargets) * 100)
                    : 100;
                return (
                  <div
                    key={camp.id}
                    className={`p-3 rounded-xl border space-y-2 text-xs ${
                      darkMode ? 'bg-slate-900/70 border-slate-700' : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={`font-extrabold truncate ${textPrimary}`}>{camp.title}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
                          camp.status === 'SENDING'
                            ? 'bg-amber-100 text-amber-800 animate-pulse'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {camp.status === 'SENDING'
                          ? `Đang gửi ${camp.sentCount}/${camp.totalTargets}`
                          : `Hoàn tất ${camp.sentCount}/${camp.totalTargets}`}
                      </span>
                    </div>

                    <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                      <div
                        className="h-full bg-blue-600 transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    <div className={`flex flex-wrap items-center justify-between gap-1 text-[10px] ${textSecondary}`}>
                      <span>
                        ⏱️ Chia đều: <strong>{camp.staggerIntervalMs}ms / 1 request</strong> (Tổng khung ~
                        {Math.round((camp.totalSpreadMs || 0) / 1000)}s)
                      </span>
                      <span>
                        {camp.recentLogs?.[0]
                          ? `Vừa gửi [${camp.recentLogs[0].orderIndex}/${camp.recentLogs[0].total}]: ${camp.recentLogs[0].recipientName} (GEN ${camp.recentLogs[0].employeeId})`
                          : ''}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

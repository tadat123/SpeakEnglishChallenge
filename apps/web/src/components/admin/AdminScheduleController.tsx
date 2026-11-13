import React, { useEffect, useState } from 'react';
import {
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Loader2,
  Play,
  SlidersHorizontal,
  Square,
} from 'lucide-react';
import { formatYmdToDmy, getTodayVnYmd } from './adminTypes';
import { appDialog } from '../AppDialogProvider';

const parseDmyToYmd = (dmy?: string | null): string | null => {
  if (!dmy) return null;
  const parts = dmy.trim().split('/');
  if (parts.length !== 3) return null;
  const [dd, mm, yyyy] = parts;
  if (!dd || !mm || !yyyy || yyyy.length !== 4) return null;
  return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
};

interface AdminScheduleControllerProps {
  token: string;
  challengesLength: number;
  totalDays: number;
  unlockedDaysCount: number;
  eventStatus: 'NOT_STARTED' | 'COUNTDOWN' | 'ACTIVE';
  dashboardStats: any | null;
  selectedDay: number;
  onRefreshGlobal: () => void;
  onRefreshDashboardStats: (day?: number) => void;
  onTotalDaysConfigured?: (cleanTotal: number) => void;
  onDayDetailNeedsRefresh: (day: number) => void;
  darkMode: boolean;
  cardBg: string;
  inputBg: string;
  textPrimary: string;
  textSecondary: string;
  showMessage: (msg: string, isErr?: boolean) => void;
}

/**
 * Thanh điều khiển lịch trình sự kiện (tùy chỉnh số ngày 1-90, ngày khai mạc 00:00, ngày bắt đầu mở & khóa toàn giải).
 */
export const AdminScheduleController: React.FC<AdminScheduleControllerProps> = ({
  token,
  challengesLength,
  totalDays,
  unlockedDaysCount,
  eventStatus,
  dashboardStats,
  selectedDay,
  onRefreshGlobal,
  onRefreshDashboardStats,
  onTotalDaysConfigured,
  onDayDetailNeedsRefresh,
  darkMode,
  cardBg,
  inputBg,
  textPrimary,
  textSecondary,
  showMessage,
}) => {
  const activeEventState = dashboardStats?.eventState;
  const activeStartYmd =
    eventStatus !== 'NOT_STARTED' ? parseDmyToYmd(activeEventState?.startDateLabel) : null;
  const activeStartDay =
    eventStatus !== 'NOT_STARTED' && activeEventState?.startFromDayNumber
      ? Number(activeEventState.startFromDayNumber)
      : 1;

  const [totalDaysInput, setTotalDaysInput] = useState<number>(() => challengesLength || 21);
  const [savingTotalDays, setSavingTotalDays] = useState<boolean>(false);
  const [scheduleStartDate, setScheduleStartDate] = useState<string>(
    () => activeStartYmd || getTodayVnYmd()
  );
  const [scheduleStartDay, setScheduleStartDay] = useState<number>(() => activeStartDay);
  const [showSchedulePanel, setShowSchedulePanel] = useState<boolean>(() => eventStatus !== 'ACTIVE');

  useEffect(() => {
    if (challengesLength > 0) {
      setTotalDaysInput(challengesLength);
    }
  }, [challengesLength]);

  useEffect(() => {
    if (activeStartYmd) {
      setScheduleStartDate(activeStartYmd);
    }
    if (eventStatus !== 'NOT_STARTED' && activeEventState?.startFromDayNumber) {
      setScheduleStartDay(Number(activeEventState.startFromDayNumber));
    }
  }, [activeStartYmd, activeEventState?.startFromDayNumber, eventStatus]);

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  const effectiveTotalDays = totalDays || challengesLength || totalDaysInput;
  const isTotalDaysDirty = totalDaysInput !== effectiveTotalDays;
  const isFutureSchedule = scheduleStartDate > getTodayVnYmd();
  const hasScheduleChanges =
    isTotalDaysDirty ||
    (activeStartYmd !== null && scheduleStartDate !== activeStartYmd) ||
    (eventStatus !== 'NOT_STARTED' && scheduleStartDay !== activeStartDay);

  const handleConfigureTotalDays = async (rawTotal: number) => {
    const cleanTotal = Math.min(90, Math.max(1, Math.round(Number(rawTotal) || 1)));
    setTotalDaysInput(cleanTotal);
    setSavingTotalDays(true);
    try {
      const res = await fetch('/api/admin/challenges/total-days', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ totalDays: cleanTotal }),
      });
      const data = await res.json();
      if (res.ok) {
        showMessage(data.message || `Đã cập nhật tổng số ngày thành ${cleanTotal} ngày!`);
        const safeDay = Math.min(selectedDay, cleanTotal);
        onTotalDaysConfigured?.(cleanTotal);
        onDayDetailNeedsRefresh(safeDay);
        onRefreshDashboardStats(safeDay);
        onRefreshGlobal();
      } else {
        showMessage(data.message || 'Không thể cập nhật tổng số ngày!', true);
      }
    } catch (e: any) {
      showMessage(e?.message || 'Lỗi kết nối máy chủ!', true);
    } finally {
      setSavingTotalDays(false);
    }
  };

  const handleStartChallengeSchedule = async (options: {
    startFromDayNumber?: number;
    startDateStr?: string;
    lockPreviousDays?: boolean;
    lockAllUntilStart?: boolean;
  }) => {
    const computedTotalDays = Math.min(90, Math.max(1, Number(totalDaysInput) || totalDays || 21));
    const targetDay = Math.min(computedTotalDays, options.startFromDayNumber || 1);
    const chosenDate = options.startDateStr || scheduleStartDate || getTodayVnYmd();
    const todayYmd = getTodayVnYmd();
    const isFutureStart = !options.lockAllUntilStart && chosenDate > todayYmd;
    const dateLabelDmy = formatYmdToDmy(chosenDate);

    const confirmText = options.lockAllUntilStart
      ? eventStatus === 'COUNTDOWN'
        ? `Hủy lịch đếm ngược và dừng (Stop) sự kiện? Dashboard người dùng sẽ quay về "Đang chờ sự kiện bắt đầu".`
        : `Dừng (Stop) sự kiện và khóa toàn bộ ${computedTotalDays} ngày thử thách? Dashboard người dùng sẽ hiển thị "Đang chờ sự kiện bắt đầu".`
      : isFutureStart
      ? `⏳ Hẹn lịch sự kiện ${computedTotalDays} ngày bắt đầu từ Day ${targetDay} vào ngày ${dateLabelDmy} (00:00)? Từ nay đến ${dateLabelDmy}, Dashboard người dùng sẽ hiển thị đếm ngược "Đang chờ sự kiện bắt đầu trong...".`
      : targetDay === 1
      ? `🚀 Bắt đầu hành trình ${computedTotalDays} ngày tính từ ${dateLabelDmy} (Day 1 mở ngay, các ngày Day 2 → Day ${computedTotalDays} sẽ khóa lại và tự động mở lần lượt lúc 00:00 mỗi ngày tiếp theo)?`
      : `🚀 Bắt đầu mở thử thách (${computedTotalDays} ngày) tính từ Day ${targetDay} = ${dateLabelDmy} (Day ${targetDay} mở ngay, các ngày sau Day ${targetDay} sẽ khóa lại và tự động mở lần lượt lúc 00:00 mỗi ngày tiếp theo)?`;

    const confirmed = await appDialog.confirm({
      title: options.lockAllUntilStart
        ? eventStatus === 'COUNTDOWN'
          ? 'Hủy lịch đếm ngược'
          : 'Dừng sự kiện Challenge'
        : isFutureStart
        ? 'Xác nhận hẹn lịch khai mạc'
        : 'Khởi động sự kiện Challenge',
      message: confirmText,
      confirmText: options.lockAllUntilStart
        ? eventStatus === 'COUNTDOWN'
          ? 'Hủy lịch (Stop)'
          : 'Dừng sự kiện'
        : isFutureStart
        ? 'Hẹn lịch ngay'
        : 'Start Challenge',
      variant: options.lockAllUntilStart ? 'danger' : isFutureStart ? 'warning' : 'primary',
    });
    if (!confirmed) return;

    try {
      const payload = options.lockAllUntilStart
        ? { ...options, totalDays: computedTotalDays }
        : { ...options, totalDays: computedTotalDays, startDateStr: chosenDate };
      const res = await fetch('/api/admin/challenges/start-schedule', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        showMessage(data.message || `Đã cập nhật lịch trình ${computedTotalDays} ngày thành công!`);
        const safeDay = Math.min(selectedDay, computedTotalDays);
        onDayDetailNeedsRefresh(safeDay);
        onRefreshDashboardStats(safeDay);
        onRefreshGlobal();
      } else {
        showMessage(data.message || `Không thể cập nhật lịch trình ${computedTotalDays} ngày!`, true);
      }
    } catch (e: any) {
      showMessage(e?.message || 'Lỗi kết nối máy chủ!', true);
    }
  };

  return (
    <div className={`rounded-2xl border shadow-sm backdrop-blur-md overflow-hidden ${cardBg}`}>
      <div className="px-4 py-3.5 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
            <SlidersHorizontal className="w-4 h-4 text-blue-500" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className={`text-sm font-black tracking-tight ${textPrimary}`}>
                Lịch Trình Challenge
              </h3>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                  eventStatus === 'ACTIVE'
                    ? darkMode
                      ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/80'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : eventStatus === 'COUNTDOWN'
                    ? darkMode
                      ? 'bg-amber-950/60 text-amber-300 border-amber-800/80'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                    : darkMode
                    ? 'bg-rose-950/50 text-rose-300 border-rose-800/70'
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    eventStatus === 'ACTIVE'
                      ? 'bg-emerald-500'
                      : eventStatus === 'COUNTDOWN'
                      ? 'bg-amber-500 animate-pulse'
                      : 'bg-rose-500'
                  }`}
                />
                {eventStatus === 'ACTIVE'
                  ? 'Đang diễn ra'
                  : eventStatus === 'COUNTDOWN'
                  ? `Đếm ngược: ${dashboardStats?.eventState?.startDateLabel || ''} (00:00)`
                  : 'Chưa khởi động'}
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                  darkMode
                    ? 'bg-slate-800/80 text-slate-300 border-slate-700'
                    : 'bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                {unlockedDaysCount}/{effectiveTotalDays} ngày mở
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowSchedulePanel((v) => !v)}
          className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 self-start sm:self-auto transition ${
            darkMode
              ? 'border-slate-700 bg-slate-800/70 hover:bg-slate-800 text-slate-200'
              : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
          }`}
        >
          <Calendar className="w-3.5 h-3.5 text-blue-500" />
          <span>{showSchedulePanel ? 'Thu gọn cấu hình' : 'Cấu hình & Start Challenge'}</span>
          {showSchedulePanel ? (
            <ChevronUp className="w-3.5 h-3.5 opacity-70" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 opacity-70" />
          )}
        </button>
      </div>

      {showSchedulePanel && (
        <div
          className={`px-4 py-3.5 sm:px-5 border-t grid grid-cols-1 lg:grid-cols-12 gap-4 items-end ${
            darkMode ? 'border-slate-800 bg-slate-900/35' : 'border-slate-100 bg-slate-50/60'
          }`}
        >
          {/* Cấu hình số ngày & ngày bắt đầu */}
          <div className="lg:col-span-8 flex flex-wrap items-end gap-3.5">
            <div>
              <label className={`block text-[11px] font-bold mb-1.5 ${textSecondary}`}>
                Tổng số ngày thi
              </label>
              <div className="flex items-center gap-1.5">
                <div
                  className={`inline-flex p-0.5 rounded-xl border ${
                    darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
                  }`}
                >
                  {[7, 14, 21, 30].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setTotalDaysInput(preset)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition ${
                        totalDaysInput === preset
                          ? 'bg-blue-600 text-white shadow-xs'
                          : darkMode
                          ? 'text-slate-400 hover:text-slate-200'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {preset}d
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min={1}
                  max={90}
                  value={totalDaysInput}
                  onChange={(e) =>
                    setTotalDaysInput(Math.min(90, Math.max(1, Number(e.target.value) || 1)))
                  }
                  className={`w-14 px-2 py-1.5 rounded-xl border text-xs font-black text-center outline-none ${inputBg}`}
                  aria-label="Số ngày tùy chỉnh"
                />
                {isTotalDaysDirty && (
                  <button
                    type="button"
                    onClick={() => handleConfigureTotalDays(totalDaysInput)}
                    disabled={savingTotalDays}
                    className="px-2.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1 transition disabled:opacity-60"
                  >
                    {savingTotalDays ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    <span>Áp dụng</span>
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className={`block text-[11px] font-bold mb-1.5 ${textSecondary}`}>
                Ngày khai mạc (00:00)
              </label>
              <input
                type="date"
                value={scheduleStartDate}
                onChange={(e) => setScheduleStartDate(e.target.value || getTodayVnYmd())}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold outline-none ${inputBg}`}
              />
            </div>

            <div>
              <label className={`block text-[11px] font-bold mb-1.5 ${textSecondary}`}>
                Mở bắt đầu từ
              </label>
              <select
                value={Math.min(scheduleStartDay, effectiveTotalDays)}
                onChange={(e) => setScheduleStartDay(Number(e.target.value) || 1)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold outline-none ${inputBg}`}
              >
                {Array.from({ length: effectiveTotalDays }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>
                    Day {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Hành động toàn giải theo trạng thái (NOT_STARTED -> Start | COUNTDOWN/ACTIVE -> Stop) */}
          <div className="lg:col-span-4 flex flex-wrap sm:flex-nowrap items-center justify-start lg:justify-end gap-2">
            {eventStatus === 'NOT_STARTED' ? (
              <button
                type="button"
                onClick={() =>
                  handleStartChallengeSchedule({
                    startFromDayNumber: Math.min(scheduleStartDay, effectiveTotalDays),
                    startDateStr: scheduleStartDate,
                    lockPreviousDays: scheduleStartDay > 1,
                  })
                }
                className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-extrabold text-xs shadow-sm flex items-center justify-center gap-1.5 transition whitespace-nowrap"
              >
                {isFutureSchedule ? (
                  <>
                    <Clock className="w-3.5 h-3.5" />
                    <span>Hẹn lịch ({formatYmdToDmy(scheduleStartDate)})</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Start Challenge</span>
                  </>
                )}
              </button>
            ) : (
              <>
                {hasScheduleChanges && (
                  <button
                    type="button"
                    onClick={() =>
                      handleStartChallengeSchedule({
                        startFromDayNumber: Math.min(scheduleStartDay, effectiveTotalDays),
                        startDateStr: scheduleStartDate,
                        lockPreviousDays: scheduleStartDay > 1,
                      })
                    }
                    className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-extrabold text-xs shadow-sm flex items-center justify-center gap-1.5 transition whitespace-nowrap"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>
                      {isFutureSchedule
                        ? `Cập nhật lịch (${formatYmdToDmy(scheduleStartDate)})`
                        : 'Cập nhật lịch ngay'}
                    </span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleStartChallengeSchedule({ lockAllUntilStart: true })}
                  className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white font-extrabold text-xs shadow-sm flex items-center justify-center gap-1.5 transition whitespace-nowrap"
                  title={
                    eventStatus === 'COUNTDOWN'
                      ? 'Hủy lịch đếm ngược và dừng sự kiện về trạng thái chưa bắt đầu'
                      : `Dừng sự kiện và khóa toàn bộ ${effectiveTotalDays} ngày`
                  }
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>{eventStatus === 'COUNTDOWN' ? 'Hủy lịch (Stop)' : 'Stop Challenge'}</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

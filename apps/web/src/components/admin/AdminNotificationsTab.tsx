import React, { useState } from 'react';
import { Send, Sparkles } from 'lucide-react';
import { appDialog } from '../AppDialogProvider';
import { AdminPushSection } from './AdminPushSection';

interface AdminNotificationsTabProps {
  token: string;
  totalDays: number;
  selectedDay: number;
  allUsersList: any[];
  userList: any[];
  notifTargetType: 'all' | 'user';
  setNotifTargetType: (val: 'all' | 'user') => void;
  notifTargetValue: string;
  setNotifTargetValue: (val: string) => void;
  notifTitle: string;
  setNotifTitle: React.Dispatch<React.SetStateAction<string>>;
  notifBody: string;
  setNotifBody: React.Dispatch<React.SetStateAction<string>>;
  notifTargetUrl: string;
  setNotifTargetUrl: (val: string) => void;
  pushStatus: any | null;
  setPushStatus: React.Dispatch<React.SetStateAction<any | null>>;
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
  fetchPushStatus: (syncInputs?: boolean) => void;
  onRefreshGlobal?: () => void;
  showMessage: (msg: string, isErr?: boolean) => void;
  darkMode: boolean;
  cardBg: string;
  subCardBg: string;
  inputBg: string;
  textPrimary: string;
  textSecondary: string;
}

export const AdminNotificationsTab: React.FC<AdminNotificationsTabProps> = ({
  token,
  totalDays,
  selectedDay,
  allUsersList,
  userList,
  notifTargetType,
  setNotifTargetType,
  notifTargetValue,
  setNotifTargetValue,
  notifTitle,
  setNotifTitle,
  notifBody,
  setNotifBody,
  notifTargetUrl,
  setNotifTargetUrl,
  pushStatus,
  setPushStatus,
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
  fetchPushStatus,
  onRefreshGlobal,
  showMessage,
  darkMode,
  cardBg,
  subCardBg,
  inputBg,
  textPrimary,
  textSecondary,
}) => {
  const [sendingNotif, setSendingNotif] = useState<boolean>(false);

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  const handleSendPersonalizedNotif = async () => {
    if (!notifTitle.trim() || !notifBody.trim()) {
      showMessage('Vui lòng nhập đầy đủ tiêu đề và nội dung thông báo', true);
      return;
    }
    if (notifTargetType === 'user' && !notifTargetValue) {
      showMessage('Vui lòng chọn 1 Nhân Viên cụ thể nhận thông báo', true);
      return;
    }
    setSendingNotif(true);
    try {
      const res = await fetch('/api/admin/notifications/send', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          targetType: notifTargetType,
          targetValue: notifTargetValue,
          title: notifTitle,
          body: notifBody,
          targetUrl: notifTargetUrl,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showMessage(
          `📢 Đã gửi thành công tới ${data.sentCount} nhân viên (${data.pwaDevicesCount || 0} thiết bị PWA)!`
        );
        fetchPushStatus(false);
        if (onRefreshGlobal) {
          onRefreshGlobal();
        }
      } else {
        showMessage(data.message || 'Lỗi gửi thông báo', true);
      }
    } catch (e: any) {
      showMessage(e.message || 'Lỗi mạng khi gửi thông báo', true);
    } finally {
      setSendingNotif(false);
    }
  };

  const handleSavePushConfig = async (resetTodayQuota = false) => {
    try {
      const res = await fetch('/api/admin/push/config', {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          spreadWindowSeconds: Number(spreadWindowSeconds),
          minIntervalMs: Number(minIntervalMs),
          autoRemindUnstudied,
          morningHour: Number(morningHour),
          morningMinute: Number(morningMinute),
          eveningTop1Hour: Number(eveningTop1Hour),
          eveningTop1Minute: Number(eveningTop1Minute),
          nightUnstudiedHour: Number(nightUnstudiedHour),
          nightUnstudiedMinute: Number(nightUnstudiedMinute),
          resetTodayQuota,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.config) {
          setSpreadWindowSeconds(data.config.spreadWindowSeconds ?? 18);
          setMinIntervalMs(data.config.minIntervalMs ?? 1200);
          setAutoRemindUnstudied(Boolean(data.config.autoRemindUnstudied));
          setMorningHour(data.config.morningHour ?? 8);
          setMorningMinute(data.config.morningMinute ?? 0);
          setEveningTop1Hour(data.config.eveningTop1Hour ?? 19);
          setEveningTop1Minute(data.config.eveningTop1Minute ?? 0);
          setNightUnstudiedHour(data.config.nightUnstudiedHour ?? 23);
          setNightUnstudiedMinute(data.config.nightUnstudiedMinute ?? 0);
          setPushStatus((prev: any) => ({
            ...prev,
            queueStatus: {
              ...(prev?.queueStatus || {}),
              config: data.config,
            },
          }));
        }
        showMessage(
          resetTodayQuota
            ? 'Đã đặt lại hạn mức 3 khung thông báo hôm nay (Sáng bài mới / Tối Top 1 / Đêm Nhắc học)!'
            : data.message || 'Đã lưu cấu hình thông báo thành công!'
        );
      } else {
        showMessage(data.message || 'Lỗi khi lưu cấu hình', true);
      }
    } catch (e: any) {
      showMessage(e?.message || 'Lỗi mạng khi lưu cấu hình', true);
    }
  };

  const handleTriggerPush = async (
    type: 'NEW_DAY_UNLOCKED' | 'NEW_TOP_1' | 'UNSTUDIED_REMINDER',
    force = false
  ) => {
    const res = await fetch('/api/admin/push/trigger', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        type,
        dayNumber: selectedDay,
        force,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      if (data.alreadySentToday && !force) {
        const confirmForce = await appDialog.confirm({
          title: 'Thông báo đã gửi hôm nay',
          message: `${data.message}\n\nBạn có muốn GỬI LẠI CƯỠNG BỨC (Force Push) cho khung giờ này ngay bây giờ không?`,
          confirmText: 'Gửi lại ngay',
          variant: 'warning',
        });
        if (confirmForce) {
          await handleTriggerPush(type, true);
        }
        return;
      }
      showMessage(data.message || 'Lỗi gửi thông báo Push', true);
      return;
    }
    showMessage(data.message);
    fetchPushStatus(false);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Cột trái: Form Soạn Thông Báo Cá Nhân Hóa */}
        <div
          className={`lg:col-span-7 rounded-3xl p-5 sm:p-6 border shadow-sm backdrop-blur-md space-y-4 ${cardBg}`}
        >
          <div>
            <h3 className={`text-sm sm:text-base font-black flex items-center gap-2 ${textPrimary}`}>
              <Send className="w-4 h-4 text-amber-500" />
              Soạn & Gửi Thông Báo
            </h3>
          </div>

          {/* Đối tượng nhận */}
          <div className="space-y-1.5">
            <label className={`block text-xs font-bold ${textSecondary}`}>Đối tượng</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'all', label: 'Toàn Công Ty' },
                { id: 'user', label: 'Cá Nhân' },
              ].map((tg) => (
                <button
                  key={tg.id}
                  type="button"
                  onClick={() => {
                    setNotifTargetType(tg.id as any);
                    setNotifTargetValue('');
                  }}
                  className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition text-center ${
                    notifTargetType === tg.id
                      ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                      : subCardBg
                  }`}
                >
                  {tg.label}
                </button>
              ))}
            </div>
          </div>

          {notifTargetType === 'user' && (
            <div className="space-y-1">
              <label className={`block text-xs font-bold ${textSecondary}`}>Nhân Viên:</label>
              <select
                value={notifTargetValue}
                onChange={(e) => setNotifTargetValue(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl border text-xs font-bold outline-none ${inputBg}`}
              >
                <option value="">-- Chọn nhân viên nhận tin --</option>
                {(allUsersList.length > 0 ? allUsersList : userList).map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName} (GEN: {u.employeeId} — {u.totalScore || 0}đ)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Các mẫu gợi ý sẵn */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className={textSecondary}>Mẫu gợi ý:</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setNotifTitle('🔥 TOP 1 đã lộ diện – Bài thi mới đã mở!');
                  setNotifBody(
                    '🏆 Chúc mừng {name} đã xuất sắc dẫn đầu bảng xếp hạng hiện tại! Bài thi mới đã mở, nhanh tay vào chiến thôi, chậm một giây là đối thủ vượt mặt mất rồi! 😆⚡'
                  );
                }}
                className="px-2.5 py-1.5 rounded-lg border text-[11px] font-bold bg-amber-50 dark:bg-amber-950/40 border-amber-200 text-amber-900 dark:text-amber-300 hover:scale-[1.02] transition"
              >
                🔥 07:00 Mở bài & TOP 1
              </button>
              <button
                type="button"
                onClick={() => {
                  setNotifTitle('🌟 Khen ngợi {name} đã hoàn thành xuất sắc!');
                  setNotifBody(
                    '👏 Chúc mừng {name} (GEN {gen})! Bạn đang có {score} điểm trên bảng xếp hạng. Hãy tiếp tục giữ vững phong độ tuyệt vời này nhé! 🏆🔥'
                  );
                }}
                className="px-2.5 py-1.5 rounded-lg border text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 text-emerald-900 dark:text-emerald-300 hover:scale-[1.02] transition"
              >
                🌟 19:00 Khen ngợi
              </button>
              <button
                type="button"
                onClick={() => {
                  setNotifTitle('⚠️ Cảnh báo 21:00: {name} ơi, bạn chưa làm bài thi hôm nay!');
                  setNotifBody(
                    '⏰ Đã 21:00 rồi! Chào {name} (GEN {gen}), bài thi hôm nay sẽ đóng lúc 00:00 đêm nay, nhanh tay vào chiến ngay kẻo đối thủ bỏ xa nhé! 🔥⚡'
                  );
                }}
                className="px-2.5 py-1.5 rounded-lg border text-[11px] font-bold bg-purple-50 dark:bg-purple-950/40 border-purple-200 text-purple-900 dark:text-purple-300 hover:scale-[1.02] transition"
              >
                ⚠️ 21:00 Cảnh báo chưa làm
              </button>
            </div>
          </div>

          {/* Tiêu đề & Nội dung */}
          <div className="space-y-1">
            <label className={`block text-xs font-bold ${textSecondary}`}>Tiêu đề</label>
            <input
              type="text"
              value={notifTitle}
              onChange={(e) => setNotifTitle(e.target.value)}
              placeholder="Tiêu đề..."
              className={`w-full px-3 py-2 rounded-xl border text-xs sm:text-sm font-bold outline-none ${inputBg}`}
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className={`block text-xs font-bold ${textSecondary}`}>Nội dung</label>
              <div className="flex items-center gap-1">
                <span className={`text-[10px] ${textSecondary}`}>Chèn:</span>
                <button
                  type="button"
                  onClick={() => setNotifBody((prev) => prev + ' {name}')}
                  className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 text-[10px] font-bold"
                >
                  {'{name}'}
                </button>
                <button
                  type="button"
                  onClick={() => setNotifBody((prev) => prev + ' {gen}')}
                  className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 text-[10px] font-bold"
                >
                  {'{gen}'}
                </button>
                <button
                  type="button"
                  onClick={() => setNotifBody((prev) => prev + ' {score}')}
                  className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 text-[10px] font-bold"
                >
                  {'{score}'}
                </button>
              </div>
            </div>
            <textarea
              rows={4}
              value={notifBody}
              onChange={(e) => setNotifBody(e.target.value)}
              placeholder="Nội dung..."
              className={`w-full px-3 py-2 rounded-xl border text-xs sm:text-sm font-medium outline-none ${inputBg}`}
            />
          </div>

          <div className="space-y-1">
            <label className={`block text-xs font-bold ${textSecondary}`}>Đường dẫn (URL)</label>
            <input
              type="text"
              value={notifTargetUrl}
              onChange={(e) => setNotifTargetUrl(e.target.value)}
              placeholder="#challenges"
              className={`w-full px-3 py-2 rounded-xl border text-xs font-bold outline-none ${inputBg}`}
            />
          </div>

          <button
            type="button"
            disabled={sendingNotif}
            onClick={handleSendPersonalizedNotif}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-sm shadow-lg flex items-center justify-center gap-2 transition active:scale-[0.98] disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            {sendingNotif ? 'Đang gửi thông báo...' : 'Gửi Thông Báo Cá Nhân Hóa Ngay'}
          </button>
        </div>

        {/* Cột phải: Live Mobile Preview Mockup */}
        <div
          className={`lg:col-span-5 rounded-3xl p-5 border shadow-sm backdrop-blur-md space-y-3 flex flex-col items-center justify-center ${subCardBg}`}
        >
          <div className={`text-xs font-black uppercase tracking-wider ${textSecondary}`}>
            Xem trước
          </div>

          <div className="w-full max-w-[280px] rounded-[36px] border-4 border-slate-700 bg-slate-950 p-3 shadow-2xl relative">
            <div className="w-20 h-3.5 bg-slate-800 rounded-full mx-auto mb-3" />

            <div className="rounded-[24px] bg-gradient-to-b from-blue-600 via-indigo-700 to-slate-900 p-3 text-white min-h-[360px] flex flex-col justify-between">
              <div className="flex items-center justify-between text-[10px] text-white/80 font-bold px-1">
                <span>9:41</span>
                <span>5G • 100%</span>
              </div>

              <div className="bg-white/95 text-slate-900 rounded-2xl p-3 shadow-xl backdrop-blur-md border border-white/60 space-y-1.5 transform hover:scale-105 transition">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <img src="./logo.png" alt="" className="w-5 h-5 object-contain" />
                    <span className="text-[11px] font-black text-blue-700">Speak Right 2026</span>
                  </div>
                  <span className="text-[9px] text-slate-500 font-bold">Vừa xong</span>
                </div>

                <div className="font-extrabold text-xs text-slate-900 leading-snug">
                  {notifTitle
                    .replace(/\{name\}/gi, 'Nguyễn Văn A')
                    .replace(/\{gen\}/gi, '20261234')
                    .replace(/\{score\}/gi, '85')}
                </div>

                <div className="text-[11px] text-slate-700 leading-relaxed font-medium">
                  {notifBody
                    .replace(/\{name\}/gi, 'Nguyễn Văn A')
                    .replace(/\{gen\}/gi, '20261234')
                    .replace(/\{score\}/gi, '85')}
                </div>

                <div className="text-[9px] font-black text-blue-600 pt-1 border-t border-slate-100 flex items-center justify-between">
                  <span>Bấm để mở thử thách</span>
                  <span>→</span>
                </div>
              </div>

              <div className="text-center text-[10px] text-white/60 font-medium">
                Shin-chan Daily Challenge 2026
              </div>
            </div>
          </div>
        </div>
      </div>

      <AdminPushSection
        pushStatus={pushStatus}
        totalDays={totalDays}
        spreadWindowSeconds={spreadWindowSeconds}
        setSpreadWindowSeconds={setSpreadWindowSeconds}
        minIntervalMs={minIntervalMs}
        setMinIntervalMs={setMinIntervalMs}
        autoRemindUnstudied={autoRemindUnstudied}
        setAutoRemindUnstudied={setAutoRemindUnstudied}
        morningHour={morningHour}
        setMorningHour={setMorningHour}
        morningMinute={morningMinute}
        setMorningMinute={setMorningMinute}
        eveningTop1Hour={eveningTop1Hour}
        setEveningTop1Hour={setEveningTop1Hour}
        eveningTop1Minute={eveningTop1Minute}
        setEveningTop1Minute={setEveningTop1Minute}
        nightUnstudiedHour={nightUnstudiedHour}
        setNightUnstudiedHour={setNightUnstudiedHour}
        nightUnstudiedMinute={nightUnstudiedMinute}
        setNightUnstudiedMinute={setNightUnstudiedMinute}
        handleSavePushConfig={handleSavePushConfig}
        handleTriggerPush={handleTriggerPush}
        darkMode={darkMode}
        cardBg={cardBg}
        subCardBg={subCardBg}
        inputBg={inputBg}
        textPrimary={textPrimary}
        textSecondary={textSecondary}
      />
    </div>
  );
};

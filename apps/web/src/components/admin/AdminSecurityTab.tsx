import React from 'react';
import { ShieldCheck } from 'lucide-react';

interface AdminSecurityTabProps {
  securityStats: any | null;
  onUnbanIp: (ip: string) => void;
  darkMode: boolean;
  cardBg: string;
  subCardBg: string;
  textPrimary: string;
  textSecondary: string;
}

export const AdminSecurityTab: React.FC<AdminSecurityTabProps> = ({
  securityStats,
  onUnbanIp,
  darkMode,
  cardBg,
  subCardBg,
  textPrimary,
  textSecondary,
}) => {
  return (
    <div className="space-y-4">
      <div className={`rounded-3xl p-4 sm:p-6 border shadow-sm backdrop-blur-md space-y-5 ${cardBg}`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-200/60 dark:border-slate-800">
          <div>
            <h3 className={`text-sm sm:text-base font-black flex items-center gap-2 ${textPrimary}`}>
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
              Bảo Mật & Tường Lửa
            </h3>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="px-3 py-1.5 rounded-xl text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              Đang hoạt động
            </span>
          </div>
        </div>

        {/* 3 Cột chức năng an ninh */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* Cột 1: Chống SQL Injection */}
          <div className={`p-4 rounded-2xl border flex flex-col justify-between space-y-3 ${subCardBg}`}>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-600 text-white">
                  WAF
                </span>
                <span className="text-xs font-black text-indigo-500">Active</span>
              </div>
              <h4 className={`text-sm font-black flex items-center gap-1.5 ${textPrimary}`}>
                Chống SQL Injection
              </h4>
              <ul className="text-[11px] space-y-1 font-bold text-slate-600 dark:text-slate-300">
                <li className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  ✓ Chặn <code>UNION SELECT</code> & DDL
                </li>
                <li className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  ✓ Chặn Tautology (<code>' OR '1'='1</code>)
                </li>
                <li className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  ✓ Chặn Time-based Blind
                </li>
                <li className="flex items-center gap-1 text-rose-500">
                  ⚡ 3 strikes = Khóa IP lập tức
                </li>
              </ul>
            </div>
          </div>

          {/* Cột 2: Không cho F12 & Chống Gian Lận */}
          <div className={`p-4 rounded-2xl border flex flex-col justify-between space-y-3 ${subCardBg}`}>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-rose-600 text-white">
                  Client
                </span>
                <span className="text-xs font-black text-rose-500">Anti-Cheat</span>
              </div>
              <h4 className={`text-sm font-black flex items-center gap-1.5 ${textPrimary}`}>
                Chống F12 & DevTools
              </h4>
              <ul className="text-[11px] space-y-1 font-bold text-slate-600 dark:text-slate-300">
                <li className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  ✓ Chặn phím <code>F12</code>, <code>Ctrl+Shift+I</code>
                </li>
                <li className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  ✓ Vô hiệu hóa chuột phải
                </li>
                <li className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  ✓ Bẫy phát hiện DevTools
                </li>
                <li className="flex items-center gap-1 text-amber-500">
                  ⚠️ Cảnh báo khi mở DevTools
                </li>
              </ul>
            </div>
          </div>

          {/* Cột 3: Chống DDoS & Bot Scanners */}
          <div className={`p-4 rounded-2xl border flex flex-col justify-between space-y-3 ${subCardBg}`}>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950">
                  IP Jail
                </span>
                <span className="text-xs font-black text-amber-500">DDoS Defense</span>
              </div>
              <h4 className={`text-sm font-black flex items-center gap-1.5 ${textPrimary}`}>
                Chống DDoS & Bot
              </h4>
              <ul className="text-[11px] space-y-1 font-bold text-slate-600 dark:text-slate-300">
                <li className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  ✓ Rate-limit phân tầng API
                </li>
                <li className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  ✓ Chặn Bot quét file hệ thống
                </li>
                <li className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  ✓ Chặn Burst Flood (&gt;35 req/s)
                </li>
                <li className="flex items-center gap-1 text-indigo-500">
                  🛡️ Timeout 10s & Body Limit
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Danh sách IP đang bị khóa */}
        <div className={`p-4 rounded-2xl border space-y-3 ${subCardBg}`}>
          <div className="flex items-center justify-between">
            <div>
              <h4 className={`text-xs sm:text-sm font-black flex items-center gap-1.5 ${textPrimary}`}>
                🔒 Danh sách IP bị khóa (IP Jail)
              </h4>
            </div>
            <span
              className={`px-2.5 py-1 rounded-xl text-xs font-black ${
                (securityStats?.threatStats?.totalBannedCount || 0) > 0
                  ? 'bg-rose-100 text-rose-800 border border-rose-300'
                  : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
              }`}
            >
              {securityStats?.threatStats?.totalBannedCount || 0} IP đang bị giam
            </span>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto">
            {(!securityStats?.threatStats?.bannedIps || securityStats.threatStats.bannedIps.length === 0) ? (
              <p className="text-xs text-center py-4 text-emerald-600 dark:text-emerald-400 font-bold">
                Không có địa chỉ IP nào bị cấm.
              </p>
            ) : (
              securityStats.threatStats.bannedIps.map((item: any) => (
                <div
                  key={item.ip}
                  className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                    darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="font-extrabold text-rose-500 flex items-center gap-1.5">
                      <span>IP: {item.ip}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold">
                        Còn lại {item.remainingSeconds}s
                      </span>
                    </div>
                    <div className={`text-[10px] truncate ${textSecondary}`}>
                      Lý do: {item.reason}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onUnbanIp(item.ip)}
                    className="px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-xs font-extrabold transition shrink-0"
                  >
                    Gỡ cấm
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

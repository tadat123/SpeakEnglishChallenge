import React from 'react';
import { Award, BarChart3, Calendar, CheckCircle2, Trophy, Users } from 'lucide-react';
import { AdminSubTab } from '../../utils/adminRoutes';
import { formatDayHeading } from './adminTypes';

interface AdminDashboardStatsTabProps {
  dashboardStats: any | null;
  totalDays: number;
  unlockedDaysCount: number;
  selectedStatDay: number;
  navigateAdmin: (nextTab: AdminSubTab, dayNumber?: number) => void;
  darkMode: boolean;
  cardBg: string;
  subCardBg: string;
  inputBg: string;
  textPrimary: string;
  textSecondary: string;
}

export const AdminDashboardStatsTab: React.FC<AdminDashboardStatsTabProps> = ({
  dashboardStats,
  totalDays,
  unlockedDaysCount,
  selectedStatDay,
  navigateAdmin,
  darkMode,
  cardBg,
  subCardBg,
  inputBg,
  textPrimary,
  textSecondary,
}) => {
  return (
    <div className="space-y-4">
      {/* 4 Thẻ KPI Tổng quan */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className={`p-4 rounded-3xl border shadow-sm backdrop-blur-md ${cardBg}`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold ${textSecondary}`}>Nhân viên</span>
            <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-blue-600 mt-2">
            {dashboardStats?.totalUsers ?? '...'}
          </div>
          <div className={`text-[11px] mt-1 ${textSecondary}`}>
            {dashboardStats?.completedUsersCount ?? 0} đã làm bài
          </div>
        </div>

        <div className={`p-4 rounded-3xl border shadow-sm backdrop-blur-md ${cardBg}`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold ${textSecondary}`}>Hoàn thành</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center">
              <Trophy className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600 mt-2">
            {dashboardStats?.overallCompletionRate ?? 0}%
          </div>
          <div className={`text-[11px] mt-1 ${textSecondary}`}>
            Toàn bộ {totalDays || '--'} ngày ({unlockedDaysCount} đã mở)
          </div>
        </div>

        <div className={`p-4 rounded-3xl border shadow-sm backdrop-blur-md ${cardBg}`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold ${textSecondary}`}>Điểm trung bình</span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-500 mt-2">
            {dashboardStats?.avgScore ?? 0}đ
          </div>
          <div className={`text-[11px] mt-1 ${textSecondary}`}>
            Điểm tích lũy TB/user
          </div>
        </div>

        <div className={`p-4 rounded-3xl border shadow-sm backdrop-blur-md ${cardBg}`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold ${textSecondary}`}>Lượt nộp bài</span>
            <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-purple-600 mt-2">
            {dashboardStats?.totalAttempts ?? 0}
          </div>
          <div className={`text-[11px] mt-1 ${textSecondary}`}>
            Đã ghi nhận
          </div>
        </div>
      </div>

      {/* Bộ lọc & Thống kê Tỉ lệ người hoàn thành THEO NGÀY CỤ THỂ */}
      <div className={`rounded-3xl p-5 border shadow-sm backdrop-blur-md space-y-4 ${cardBg}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200/60 dark:border-slate-800">
          <div>
            <h3 className={`text-sm sm:text-base font-black flex items-center gap-2 ${textPrimary}`}>
              <Calendar className="w-4 h-4 text-blue-600" />
              Tỉ Lệ Theo Ngày
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold ${textSecondary}`}>Ngày:</span>
            <select
              value={selectedStatDay}
              onChange={(e) => navigateAdmin('dashboard', Number(e.target.value))}
              className={`px-3 py-1.5 rounded-xl border text-xs font-extrabold outline-none ${inputBg}`}
            >
              {Array.from({ length: totalDays || dashboardStats?.allDaysStats?.length || 1 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>
                  Day {d}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Dải nút chọn ngày nhanh */}
        <div className="grid grid-cols-7 sm:grid-cols-7 gap-1.5">
          {Array.from({ length: totalDays || dashboardStats?.allDaysStats?.length || 1 }, (_, i) => i + 1).map((d) => {
            const dayStat = dashboardStats?.allDaysStats?.find((s: any) => s.dayNumber === d);
            const isSelected = selectedStatDay === d;
            return (
              <button
                key={d}
                onClick={() => navigateAdmin('dashboard', d)}
                className={`p-2 rounded-xl border text-center transition ${
                  isSelected
                    ? 'bg-blue-600 border-blue-600 text-white shadow-md scale-105'
                    : dayStat?.completionRate > 0
                    ? darkMode
                      ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300 hover:bg-emerald-900/60'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                    : subCardBg
                }`}
              >
                <div className="text-xs font-black">Day {d}</div>
                <div className="text-[10px] font-bold opacity-80">
                  {dayStat ? `${dayStat.completionRate}%` : '0%'}
                </div>
              </button>
            );
          })}
        </div>

        {/* Chi tiết Thống kê Ngày đang chọn */}
        {dashboardStats?.selectedDayStat && (
          <div className={`p-4 rounded-2xl border space-y-3 ${subCardBg}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-blue-600">
                  {formatDayHeading(
                    dashboardStats.selectedDayStat.dayNumber,
                    dashboardStats.selectedDayStat.title
                  )}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                    dashboardStats.selectedDayStat.isUnlocked
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300'
                      : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                  }`}
                >
                  {dashboardStats.selectedDayStat.isUnlocked ? '🔓 Đang Mở' : '🔒 Đang Khóa'}
                </span>
              </div>
              <span className={`text-xs ${textSecondary}`}>
                Ngày hiển thị: <strong>{dashboardStats.selectedDayStat.dateLabel}</strong>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2 text-center">
              <div className={`p-3 rounded-xl border ${cardBg}`}>
                <div className="text-lg sm:text-xl font-black text-blue-600">
                  {dashboardStats.selectedDayStat.participantsCount}
                </div>
                <div className={`text-[11px] ${textSecondary}`}>Người nộp bài</div>
              </div>
              <div className={`p-3 rounded-xl border ${cardBg}`}>
                <div className="text-lg sm:text-xl font-black text-emerald-600">
                  {dashboardStats.selectedDayStat.completionRate}%
                </div>
                <div className={`text-[11px] ${textSecondary}`}>Tỉ lệ hoàn thành</div>
              </div>
              <div className={`p-3 rounded-xl border ${cardBg}`}>
                <div className="text-lg sm:text-xl font-black text-amber-500">
                  {dashboardStats.selectedDayStat.averageScore}đ
                </div>
                <div className={`text-[11px] ${textSecondary}`}>Điểm trung bình</div>
              </div>
              <div className={`p-3 rounded-xl border ${cardBg}`}>
                <div className="text-lg sm:text-xl font-black text-indigo-600">
                  {dashboardStats.selectedDayStat.passCount}
                </div>
                <div className={`text-[11px] ${textSecondary}`}>Đạt chuẩn (≥60%)</div>
              </div>
              <div className={`p-3 rounded-xl border ${cardBg}`}>
                <div className="text-lg sm:text-xl font-black text-rose-500">
                  {dashboardStats.selectedDayStat.perfectCount}
                </div>
                <div className={`text-[11px] ${textSecondary}`}>
                  Điểm tối đa ({dashboardStats.selectedDayStat.maxPoints ?? '--'}đ)
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bảng Tiến độ Hoàn thành toàn bộ các ngày */}
      <div className={`rounded-3xl p-5 border shadow-sm backdrop-blur-md space-y-3 ${cardBg}`}>
        <h3 className={`text-sm sm:text-base font-black flex items-center gap-2 ${textPrimary}`}>
          <BarChart3 className="w-4 h-4 text-emerald-600" />
          Tiến độ {totalDays || dashboardStats?.allDaysStats?.length || '--'} Ngày
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {dashboardStats?.allDaysStats?.map((st: any) => (
            <div
              key={st.dayNumber}
              onClick={() => navigateAdmin('dashboard', st.dayNumber)}
              className={`p-3 rounded-2xl border cursor-pointer hover:border-blue-400 transition ${
                selectedStatDay === st.dayNumber ? 'border-blue-600 ring-2 ring-blue-500/20' : subCardBg
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                <span className="text-blue-600">
                  {formatDayHeading(st.dayNumber, st.title)}
                </span>
                <span className="font-black">{st.completionRate}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all"
                  style={{ width: `${st.completionRate}%` }}
                />
              </div>
              <div className={`flex items-center justify-between text-[10px] mt-1.5 ${textSecondary}`}>
                <span>{st.participantsCount} người làm</span>
                <span>ĐTB: {st.averageScore}đ</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

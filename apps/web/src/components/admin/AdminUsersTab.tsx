import React, { useState } from 'react';
import { Eye, Search, Send, Smartphone, Trophy, X } from 'lucide-react';
import { appDialog } from '../AppDialogProvider';
import { formatDayHeading } from './adminTypes';

interface AdminUsersTabProps {
  token: string;
  totalDays: number;
  userList: any[];
  userSearch: string;
  setUserSearch: (val: string) => void;
  fetchAdminUsers: () => void;
  onRefreshDashboardStats: () => void;
  onMessageUser: (u: any) => void;
  showMessage: (msg: string, isErr?: boolean) => void;
  darkMode: boolean;
  cardBg: string;
  subCardBg: string;
  inputBg: string;
  textSecondary: string;
}

export const AdminUsersTab: React.FC<AdminUsersTabProps> = ({
  token,
  totalDays,
  userList,
  userSearch,
  setUserSearch,
  fetchAdminUsers,
  onRefreshDashboardStats,
  onMessageUser,
  showMessage,
  darkMode,
  cardBg,
  subCardBg,
  inputBg,
  textSecondary,
}) => {
  const [inspectingUser, setInspectingUser] = useState<any | null>(null);

  const fetchUserDetails = async (userId: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/details`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setInspectingUser(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-4">
      <div className={`rounded-3xl p-5 border shadow-sm backdrop-blur-md space-y-4 ${cardBg}`}>
        {/* Thanh tìm kiếm nhân viên */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <Search className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${textSecondary}`} />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchAdminUsers()}
                placeholder="Tìm GEN, Tên, Email..."
                className={`w-full pl-9 pr-3 py-2.5 rounded-2xl border text-xs sm:text-sm font-semibold outline-none ${inputBg}`}
              />
            </div>
            <button
              onClick={fetchAdminUsers}
              className="px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-sm flex items-center justify-center gap-1.5 shrink-0"
            >
              <Search className="w-3.5 h-3.5" /> Tìm
            </button>
          </div>
        </div>

        {/* Bảng Danh sách Người dùng */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr
                className={`border-b ${
                  darkMode ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-500'
                }`}
              >
                <th className="py-2.5 px-3 font-extrabold">Hạng</th>
                <th className="py-2.5 px-3 font-extrabold">Nhân viên</th>
                <th className="py-2.5 px-3 font-extrabold">Điểm & Tiến độ</th>
                <th className="py-2.5 px-3 font-extrabold">Thiết bị chính</th>
                <th className="py-2.5 px-3 font-extrabold">Hoạt động cuối</th>
                <th className="py-2.5 px-3 font-extrabold text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {userList.map((u) => (
                <tr key={u.id} className="hover:bg-blue-50/50 dark:hover:bg-slate-800/40 transition">
                  <td className="py-3 px-3 font-black text-amber-500">#{u.rank}</td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={u.avatarUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=user'}
                        alt=""
                        className="w-8 h-8 rounded-full border border-blue-200 dark:border-slate-700 shrink-0"
                      />
                      <div>
                        <div className="font-extrabold text-sm">{u.fullName}</div>
                        <div className={`text-[11px] ${textSecondary}`}>
                          GEN: <strong>{u.employeeId}</strong> • {u.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <div className="font-black text-emerald-600">{u.totalScore ?? 0}đ</div>
                    <div className={`text-[10px] ${textSecondary}`}>
                      {u.completedDays ?? 0}/{totalDays || '--'} ngày
                    </div>
                    {(u.practiceScore || 0) > (u.totalScore || 0) && (
                      <div className="text-[10px] font-bold text-amber-600">
                        ({u.practiceScore}đ luyện tập)
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-1.5 font-bold text-[11px]">
                      <Smartphone className="w-3.5 h-3.5 text-blue-500" />
                      <span>{u.primaryDevice}</span>
                    </div>
                    <div className={`text-[10px] ${textSecondary}`}>{u.deviceCount} thiết bị lưu</div>
                  </td>
                  <td className="py-3 px-3 text-[11px] text-slate-500 dark:text-slate-400">
                    {new Date(u.lastActiveAt).toLocaleString('vi-VN', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => onMessageUser(u)}
                        className="px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs flex items-center gap-1 shadow-sm transition"
                        title="Gửi thông báo cá nhân cho nhân viên này"
                      >
                        <Send className="w-3 h-3" /> Nhắn tin
                      </button>
                      <button
                        onClick={() => fetchUserDetails(u.id)}
                        className="px-2.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs flex items-center gap-1 shadow-sm transition"
                        title="Xem chi tiết lịch sử thi & thiết bị"
                      >
                        <Eye className="w-3 h-3" /> Chi tiết
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= MODAL CHI TIẾT NHÂN VIÊN & THIẾT BỊ ĐÃ ĐĂNG NHẬP ================= */}
      {inspectingUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className={`w-full max-w-2xl rounded-3xl p-6 shadow-2xl border space-y-4 max-h-[90vh] overflow-y-auto ${cardBg}`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center font-black">
                  👤
                </div>
                <div>
                  <h3 className="text-base font-black">{inspectingUser.user.fullName}</h3>
                  <p className={`text-xs ${textSecondary}`}>
                    GEN: <strong>{inspectingUser.user.employeeId}</strong> •{' '}
                    {inspectingUser.user.email}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setInspectingUser(null)}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Thông tin thống kê điểm */}
            <div className="grid grid-cols-3 gap-2.5 text-center">
              <div className={`p-3 rounded-2xl border ${subCardBg}`}>
                <div className="text-lg font-black text-blue-600">
                  {inspectingUser.user.totalScore ?? 0}đ
                </div>
                <div className={`text-[11px] ${textSecondary}`}>Tổng điểm</div>
              </div>
              <div className={`p-3 rounded-2xl border ${subCardBg}`}>
                <div className="text-lg font-black text-emerald-600">
                  {inspectingUser.user.completedDays ?? 0}/{totalDays || '--'}
                </div>
                <div className={`text-[11px] ${textSecondary}`}>Số ngày hoàn thành</div>
              </div>
              <div className={`p-3 rounded-2xl border ${subCardBg}`}>
                <div className="text-lg font-black text-purple-600">
                  {inspectingUser.devices?.length || 1}
                </div>
                <div className={`text-[11px] ${textSecondary}`}>Thiết bị đăng nhập</div>
              </div>
            </div>

            {/* Danh sách thiết bị đã đăng nhập của user */}
            <div className={`p-4 rounded-2xl border space-y-2.5 ${subCardBg}`}>
              <h4 className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5 text-blue-600">
                <Smartphone className="w-4 h-4" /> Các Thiết Bị Đã Đăng Nhập Của Nhân Viên Này
              </h4>
              <div className="space-y-2">
                {inspectingUser.devices?.map((dev: any) => (
                  <div
                    key={dev.id}
                    className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${cardBg}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">
                        {dev.deviceType === 'desktop'
                          ? '💻'
                          : dev.deviceType === 'tablet'
                          ? '📟'
                          : '📱'}
                      </span>
                      <div>
                        <div className="font-extrabold">{dev.deviceName}</div>
                        <div className={`text-[10px] ${textSecondary}`}>
                          Trình duyệt: {dev.browser} • OS: {dev.os} • Hoạt động:{' '}
                          {new Date(dev.lastActiveAt).toLocaleString('vi-VN')}
                        </div>
                      </div>
                    </div>
                    {dev.isPwaInstalled && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800">
                        ⚡ PWA
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Lịch sử thi các ngày */}
            <div className={`p-4 rounded-2xl border space-y-2.5 ${subCardBg}`}>
              <h4 className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5 text-emerald-600">
                <Trophy className="w-4 h-4" /> Lịch Sử Bài Thi Đã Làm ({inspectingUser.attempts?.length || 0})
              </h4>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {inspectingUser.attempts?.length === 0 ? (
                  <p className={`text-xs text-center py-3 ${textSecondary}`}>Chưa nộp bài thi nào</p>
                ) : (
                  inspectingUser.attempts.map((att: any) => (
                    <div
                      key={att.id}
                      className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${cardBg}`}
                    >
                      <div className="font-bold">
                        {formatDayHeading(att.dayNumber, att.dayTitle || `Bài thi ngày ${att.dayNumber}`)}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-black text-blue-600">
                          {att.score} / {att.totalPoints ?? 100}đ
                        </span>
                        <span className={`text-[10px] ${textSecondary}`}>
                          {Math.round((att.clientTimeMs || 0) / 1000)}s
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Các hành động quản trị với tài khoản */}
            <div className="pt-3 border-t border-slate-200/60 dark:border-slate-800 flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={async () => {
                  const newPass = await appDialog.prompt({
                    title: 'Đổi mật khẩu nhân viên',
                    message: `Nhập mật khẩu mới cho nhân viên ${inspectingUser.user.fullName} (${inspectingUser.user.employeeId}):`,
                    defaultValue: 'Abc@1234',
                    placeholder: 'Nhập mật khẩu mới...',
                    confirmText: 'Lưu mật khẩu',
                    variant: 'primary',
                  });
                  if (!newPass) return;
                  try {
                    const res = await fetch(`/api/admin/users/${inspectingUser.user.id}/reset-password`, {
                      method: 'POST',
                      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                      body: JSON.stringify({ newPassword: newPass }),
                    });
                    const d = await res.json();
                    showMessage(d.message || 'Đã đổi mật khẩu');
                  } catch (e: any) {
                    showMessage(e.message || 'Lỗi', true);
                  }
                }}
                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-sm"
              >
                🔑 Đổi mật khẩu
              </button>

              <button
                type="button"
                onClick={async () => {
                  const confirmed = await appDialog.confirm({
                    title: 'Reset điểm & lịch sử thi',
                    message: `Bạn có chắc chắn muốn RESET toàn bộ điểm số và lịch sử thi của ${inspectingUser.user.fullName} về 0?`,
                    confirmText: 'Reset về 0',
                    variant: 'warning',
                  });
                  if (!confirmed) return;
                  try {
                    const res = await fetch(`/api/admin/users/${inspectingUser.user.id}/reset-progress`, {
                      method: 'POST',
                      headers: { Authorization: `Bearer ${token}` },
                    });
                    const d = await res.json();
                    showMessage(d.message || 'Đã reset tiến độ');
                    fetchUserDetails(inspectingUser.user.id);
                    fetchAdminUsers();
                    onRefreshDashboardStats();
                  } catch (e: any) {
                    showMessage(e.message || 'Lỗi', true);
                  }
                }}
                className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs shadow-sm"
              >
                🔄 Reset điểm về 0
              </button>

              <button
                type="button"
                onClick={async () => {
                  const confirmed = await appDialog.confirm({
                    title: 'Xóa vĩnh viễn tài khoản',
                    message: `Bạn có chắc chắn muốn XÓA VĨNH VIỄN tài khoản ${inspectingUser.user.fullName} (${inspectingUser.user.employeeId})?\n\nHành động này không thể hoàn tác.`,
                    confirmText: 'Xóa vĩnh viễn',
                    variant: 'danger',
                  });
                  if (!confirmed) return;
                  try {
                    const res = await fetch(`/api/admin/users/${inspectingUser.user.id}`, {
                      method: 'DELETE',
                      headers: { Authorization: `Bearer ${token}` },
                    });
                    const d = await res.json();
                    showMessage(d.message || 'Đã xóa tài khoản');
                    setInspectingUser(null);
                    fetchAdminUsers();
                    onRefreshDashboardStats();
                  } catch (e: any) {
                    showMessage(e.message || 'Lỗi', true);
                  }
                }}
                className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs shadow-sm"
              >
                🗑️ Xóa tài khoản
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

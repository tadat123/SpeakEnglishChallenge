import React from 'react';
import { Eye, EyeOff, FileUp, Save, Sparkles, Trash2, X } from 'lucide-react';
import { resolveMediaUrl } from '../../utils/clientApiFallback';
import { EventPopupItem } from '../SpeakRightEventsPopup';

interface AdminEventModalsProps {
  showEventModal: boolean;
  setShowEventModal: (val: boolean) => void;
  editingEvent: EventPopupItem | null;
  setEditingEvent: React.Dispatch<React.SetStateAction<EventPopupItem | null>>;
  isCreatingEvent: boolean;
  uploadingEventImg: boolean;
  handleUploadEventImg: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSaveEvent: (e: React.FormEvent) => void;
  deletingEventId: string | null;
  setDeletingEventId: (id: string | null) => void;
  handleDeleteEvent: (id: string) => void;
  darkMode: boolean;
  cardBg: string;
  subCardBg: string;
  textPrimary: string;
  textSecondary: string;
}

export const AdminEventModals: React.FC<AdminEventModalsProps> = ({
  showEventModal,
  setShowEventModal,
  editingEvent,
  setEditingEvent,
  isCreatingEvent,
  uploadingEventImg,
  handleUploadEventImg,
  handleSaveEvent,
  deletingEventId,
  setDeletingEventId,
  handleDeleteEvent,
  darkMode,
  cardBg,
  subCardBg,
  textPrimary,
  textSecondary,
}) => {
  return (
    <>
      {/* ================= MODAL THÊM / SỬA SỰ KIỆN ================= */}
      {showEventModal && editingEvent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div
            className={`w-full max-w-3xl my-8 rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${cardBg}`}
          >
            {/* Header */}
            <div
              className={`p-4 sm:p-5 border-b flex items-center justify-between shrink-0 ${
                darkMode ? 'border-slate-800' : 'border-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`text-base font-black truncate ${textPrimary}`}>
                    {isCreatingEvent ? 'Thêm Sự Kiện' : 'Chỉnh Sửa Sự Kiện'}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEventModal(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form Body (Scrollable) */}
            <form onSubmit={handleSaveEvent} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {/* 1. Trạng Thái Ẩn/Hiện Công Khai */}
              <div
                className={`p-3.5 sm:p-4 rounded-2xl border transition flex items-center justify-between gap-3 ${
                  editingEvent.isVisible !== false
                    ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800'
                    : 'bg-slate-100/80 dark:bg-slate-800/60 border-slate-300 dark:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      editingEvent.isVisible !== false
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-600 text-slate-200'
                    }`}
                  >
                    {editingEvent.isVisible !== false ? (
                      <Eye className="w-5 h-5" />
                    ) : (
                      <EyeOff className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100">
                      Trạng thái hiển thị
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setEditingEvent((prev) =>
                      prev ? { ...prev, isVisible: !prev.isVisible } : null
                    )
                  }
                  className={`px-3.5 py-1.5 rounded-xl font-black text-xs transition active:scale-95 ${
                    editingEvent.isVisible !== false
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                      : 'bg-slate-700 hover:bg-slate-600 text-amber-300'
                  }`}
                >
                  {editingEvent.isVisible !== false ? 'Hiển thị' : 'Đang ẩn'}
                </button>
              </div>

              {/* 2. Số hiển thị & Thứ tự sắp xếp */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-bold mb-1.5 ${textSecondary}`}>
                    Mã số
                  </label>
                  <input
                    type="text"
                    value={editingEvent.num || ''}
                    onChange={(e) =>
                      setEditingEvent((prev) =>
                        prev ? { ...prev, num: e.target.value } : null
                      )
                    }
                    placeholder="01"
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold border focus:ring-2 focus:ring-blue-500 focus:outline-hidden ${subCardBg}`}
                    required
                  />
                </div>
                <div>
                  <label className={`block text-xs font-bold mb-1.5 ${textSecondary}`}>
                    Thứ tự
                  </label>
                  <input
                    type="number"
                    value={editingEvent.orderIndex ?? 1}
                    onChange={(e) =>
                      setEditingEvent((prev) =>
                        prev ? { ...prev, orderIndex: parseInt(e.target.value) || 1 } : null
                      )
                    }
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold border focus:ring-2 focus:ring-blue-500 focus:outline-hidden ${subCardBg}`}
                    required
                  />
                </div>
              </div>

              {/* 3. Tiêu đề 3 dòng */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className={`block text-xs font-bold mb-1.5 ${textSecondary}`}>
                    Tiêu đề 1
                  </label>
                  <input
                    type="text"
                    value={editingEvent.titleA || ''}
                    onChange={(e) =>
                      setEditingEvent((prev) =>
                        prev ? { ...prev, titleA: e.target.value } : null
                      )
                    }
                    placeholder="RING THE"
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold border focus:ring-2 focus:ring-blue-500 focus:outline-hidden ${subCardBg}`}
                    required
                  />
                </div>
                <div>
                  <label className={`block text-xs font-bold mb-1.5 ${textSecondary}`}>
                    Tiêu đề 2 (tùy chọn)
                  </label>
                  <input
                    type="text"
                    value={editingEvent.titleB || ''}
                    onChange={(e) =>
                      setEditingEvent((prev) =>
                        prev ? { ...prev, titleB: e.target.value } : null
                      )
                    }
                    placeholder="GOLDEN"
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold border focus:ring-2 focus:ring-blue-500 focus:outline-hidden ${subCardBg}`}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-bold mb-1.5 ${textSecondary}`}>
                    Tiêu đề 3
                  </label>
                  <input
                    type="text"
                    value={editingEvent.titleC || ''}
                    onChange={(e) =>
                      setEditingEvent((prev) =>
                        prev ? { ...prev, titleC: e.target.value } : null
                      )
                    }
                    placeholder="BELL"
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold border focus:ring-2 focus:ring-blue-500 focus:outline-hidden ${subCardBg}`}
                    required
                  />
                </div>
              </div>

              {/* 4. Màu chủ đạo & Biểu tượng */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-bold mb-1.5 ${textSecondary}`}>
                    Màu sắc
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'amber', label: '🟡 Vàng Cam', color: 'bg-amber-500' },
                      { id: 'blue', label: '🔵 Xanh Dương', color: 'bg-blue-600' },
                      { id: 'purple', label: '🟣 Tím Violet', color: 'bg-purple-600' },
                      { id: 'emerald', label: '🟢 Xanh Ngọc', color: 'bg-emerald-600' },
                      { id: 'rose', label: '🔴 Hồng Đỏ', color: 'bg-rose-600' },
                      { id: 'indigo', label: '🔷 Chàm Indigo', color: 'bg-indigo-600' },
                    ].map((col) => (
                      <button
                        key={col.id}
                        type="button"
                        onClick={() =>
                          setEditingEvent((prev) =>
                            prev ? { ...prev, themeColor: col.id as any } : null
                          )
                        }
                        className={`p-2 rounded-xl text-[11px] font-bold border flex items-center justify-center gap-1.5 transition ${
                          editingEvent.themeColor === col.id
                            ? 'ring-2 ring-blue-500 border-blue-500 font-black'
                            : 'opacity-80 hover:opacity-100'
                        } ${subCardBg}`}
                      >
                        <span className={`w-2.5 h-2.5 rounded-full ${col.color}`} />
                        <span>{col.label.split(' ')[1]}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className={`block text-xs font-bold mb-1.5 ${textSecondary}`}>
                    Biểu tượng
                  </label>
                  <select
                    value={editingEvent.iconName || 'Sparkles'}
                    onChange={(e) =>
                      setEditingEvent((prev) =>
                        prev ? { ...prev, iconName: e.target.value } : null
                      )
                    }
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold border focus:ring-2 focus:ring-blue-500 focus:outline-hidden ${subCardBg}`}
                  >
                    <option value="Bell">🔔 Chuông</option>
                    <option value="Clapperboard">🎬 Lồng tiếng</option>
                    <option value="CalendarDays">📅 Lịch</option>
                    <option value="Trophy">🏆 Cúp</option>
                    <option value="Sparkles">✨ Tỏa sáng</option>
                    <option value="Star">⭐ Ngôi sao</option>
                    <option value="Target">🎯 Mục tiêu</option>
                    <option value="Gift">🎁 Phần thưởng</option>
                    <option value="Flame">🔥 Ngọn lửa</option>
                    <option value="Zap">⚡ Tốc độ</option>
                  </select>
                </div>
              </div>

              {/* 5. Mô tả ngắn */}
              <div>
                <label className={`block text-xs font-bold mb-1.5 ${textSecondary}`}>
                  Mô tả
                </label>
                <textarea
                  rows={2}
                  value={editingEvent.desc || ''}
                  onChange={(e) =>
                    setEditingEvent((prev) =>
                      prev ? { ...prev, desc: e.target.value } : null
                    )
                  }
                  placeholder="Mô tả ngắn sự kiện..."
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium border focus:ring-2 focus:ring-blue-500 focus:outline-hidden ${subCardBg}`}
                  required
                />
              </div>

              {/* 6. Hình ảnh */}
              <div>
                <label className={`block text-xs font-bold mb-1.5 ${textSecondary}`}>
                  Hình ảnh
                </label>

                {/* Chọn nhanh ảnh mẫu */}
                <div className="flex flex-wrap items-center gap-1.5 mb-2">
                  <button
                    type="button"
                    onClick={() =>
                      setEditingEvent((prev) =>
                        prev ? { ...prev, img: 'events/golden-bell.jpg' } : null
                      )
                    }
                    className="px-2 py-0.5 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-[11px] font-bold"
                  >
                    🔔 Chuông Vàng
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setEditingEvent((prev) =>
                        prev ? { ...prev, img: 'events/dub-it-right.jpg' } : null
                      )
                    }
                    className="px-2 py-0.5 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 text-[11px] font-bold"
                  >
                    🎬 Lồng Tiếng
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setEditingEvent((prev) =>
                        prev ? { ...prev, img: 'events/daily-challenge.jpg' } : null
                      )
                    }
                    className="px-2 py-0.5 rounded-lg bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 text-[11px] font-bold"
                  >
                    📅 Daily Challenge
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5">
                  <input
                    type="text"
                    value={
                      editingEvent.img?.startsWith('data:')
                        ? ''
                        : editingEvent.img || ''
                    }
                    onChange={(e) =>
                      setEditingEvent((prev) =>
                        prev ? { ...prev, img: e.target.value } : null
                      )
                    }
                    placeholder={
                      editingEvent.img?.startsWith('data:')
                        ? 'Đã tải ảnh từ thiết bị (hoặc dán link ảnh khác vào đây)...'
                        : 'events/golden-bell.jpg hoặc link URL ảnh...'
                    }
                    className={`flex-1 w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium border focus:ring-2 focus:ring-blue-500 focus:outline-hidden ${subCardBg}`}
                    required={!editingEvent.img}
                  />

                  <label className="cursor-pointer px-3.5 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 shrink-0 transition">
                    <FileUp className="w-3.5 h-3.5 text-blue-500" />
                    <span>{uploadingEventImg ? 'Đang tải...' : 'Tải ảnh'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleUploadEventImg}
                      className="hidden"
                      disabled={uploadingEventImg}
                    />
                  </label>
                </div>

                {/* Preview ảnh nhỏ */}
                {editingEvent.img && (
                  <div className="mt-2 flex items-center gap-2.5 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
                    <img
                      src={resolveMediaUrl(editingEvent.img, 'events/golden-bell.jpg')}
                      alt="Preview"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = resolveMediaUrl(
                          'events/golden-bell.jpg'
                        );
                      }}
                      className="w-16 h-12 object-cover rounded-lg border shrink-0"
                    />
                    <div className="text-[11px] text-slate-500 font-mono truncate min-w-0">
                      {editingEvent.img.startsWith('data:')
                        ? '[Ảnh đã tải lên từ thiết bị]'
                        : editingEvent.img}
                    </div>
                  </div>
                )}
              </div>

              {/* 7. Nhãn (Chips) */}
              <div>
                <label className={`block text-xs font-bold mb-1.5 ${textSecondary}`}>
                  Nhãn (Chips)
                </label>
                <input
                  type="text"
                  value={(editingEvent.chips || []).join(', ')}
                  onChange={(e) => {
                    const list = e.target.value
                      .split(',')
                      .map((s) => s.trim())
                      .filter(Boolean);
                    setEditingEvent((prev) => (prev ? { ...prev, chips: list } : null));
                  }}
                  placeholder="Phân cách bằng dấu phẩy..."
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium border focus:ring-2 focus:ring-blue-500 focus:outline-hidden ${subCardBg}`}
                />
              </div>

              {/* 8. Ghi chú (Note) */}
              <div>
                <label className={`block text-xs font-bold mb-1.5 ${textSecondary}`}>
                  Ghi chú
                </label>
                <input
                  type="text"
                  value={editingEvent.note || ''}
                  onChange={(e) =>
                    setEditingEvent((prev) =>
                      prev ? { ...prev, note: e.target.value } : null
                    )
                  }
                  placeholder="Ghi chú ngắn..."
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium border focus:ring-2 focus:ring-blue-500 focus:outline-hidden ${subCardBg}`}
                />
              </div>

              {/* 9. Hành động khi bấm */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-bold mb-1.5 ${textSecondary}`}>
                    Hành động khi bấm
                  </label>
                  <select
                    value={editingEvent.actionType || 'expand'}
                    onChange={(e) =>
                      setEditingEvent((prev) =>
                        prev ? { ...prev, actionType: e.target.value as any } : null
                      )
                    }
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold border focus:ring-2 focus:ring-blue-500 focus:outline-hidden ${subCardBg}`}
                  >
                    <option value="expand">Mở thể lệ chi tiết</option>
                    <option value="daily">Mở bài thi Daily</option>
                    <option value="link">Mở liên kết ngoài (URL)</option>
                  </select>
                </div>

                {editingEvent.actionType === 'link' && (
                  <div>
                    <label className={`block text-xs font-bold mb-1.5 ${textSecondary}`}>
                      Đường dẫn (URL)
                    </label>
                    <input
                      type="url"
                      value={editingEvent.actionUrl || ''}
                      onChange={(e) =>
                        setEditingEvent((prev) =>
                          prev ? { ...prev, actionUrl: e.target.value } : null
                        )
                      }
                      placeholder="https://..."
                      className={`w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium border focus:ring-2 focus:ring-blue-500 focus:outline-hidden ${subCardBg}`}
                      required
                    />
                  </div>
                )}
              </div>

              {/* 10. Thể lệ chi tiết */}
              <div>
                <label className={`block text-xs font-bold mb-1.5 ${textSecondary}`}>
                  Thể lệ chi tiết
                </label>
                <textarea
                  rows={4}
                  value={(editingEvent.more || []).join('\n')}
                  onChange={(e) => {
                    const lines = e.target.value
                      .split('\n')
                      .map((l) => l.trim())
                      .filter((l) => l.length > 0);
                    setEditingEvent((prev) => (prev ? { ...prev, more: lines } : null));
                  }}
                  placeholder="Mỗi dòng một điều khoản..."
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium border focus:ring-2 focus:ring-blue-500 focus:outline-hidden ${subCardBg}`}
                />
              </div>

              {/* Footer Buttons */}
              <div
                className={`pt-3 border-t flex items-center justify-end gap-2.5 ${
                  darkMode ? 'border-slate-800' : 'border-slate-100'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setShowEventModal(false)}
                  className={`px-4 py-2 rounded-xl font-bold text-xs ${subCardBg}`}
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-black text-xs sm:text-sm shadow-md flex items-center gap-1.5 transition"
                >
                  <Save className="w-4 h-4" />
                  <span>{isCreatingEvent ? 'Tạo Sự Kiện' : 'Lưu Thay Đổi'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL XÁC NHẬN XÓA SỰ KIỆN ================= */}
      {deletingEventId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-3xl p-6 border shadow-2xl space-y-4 ${cardBg}`}>
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-black">Xác nhận xóa sự kiện?</h3>
            </div>

            <p className={`text-xs sm:text-sm leading-relaxed ${textSecondary}`}>
              Xác nhận xóa sự kiện này khỏi Pop-up và Trang chủ?
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeletingEventId(null)}
                className={`px-4 py-2 rounded-xl font-bold text-xs ${subCardBg}`}
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                onClick={() => handleDeleteEvent(deletingEventId)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-black text-xs shadow-md transition"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

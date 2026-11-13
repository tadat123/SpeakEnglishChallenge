import React, { useState } from 'react';
import {
  Edit3,
  Eye,
  EyeOff,
  Layers,
  Loader2,
  Plus,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { resolveMediaUrl } from '../../utils/clientApiFallback';
import { EventPopupItem } from '../SpeakRightEventsPopup';
import { appDialog } from '../AppDialogProvider';
import { compressImageIfNeeded } from './adminTypes';
import { AdminEventModals } from './AdminEventModals';

interface AdminEventsTabProps {
  token: string;
  eventList: EventPopupItem[];
  loadingEvents: boolean;
  fetchAdminEvents: () => void;
  setEventList: React.Dispatch<React.SetStateAction<EventPopupItem[]>>;
  onEventsChange?: (events: EventPopupItem[]) => void;
  onRefreshGlobal: () => void;
  showMessage: (msg: string, isErr?: boolean) => void;
  darkMode: boolean;
  cardBg: string;
  subCardBg: string;
  textPrimary: string;
  textSecondary: string;
}

export const AdminEventsTab: React.FC<AdminEventsTabProps> = ({
  token,
  eventList,
  loadingEvents,
  fetchAdminEvents,
  setEventList,
  onEventsChange,
  onRefreshGlobal,
  showMessage,
  darkMode,
  cardBg,
  subCardBg,
  textPrimary,
  textSecondary,
}) => {
  const [editingEvent, setEditingEvent] = useState<EventPopupItem | null>(null);
  const [showEventModal, setShowEventModal] = useState<boolean>(false);
  const [isCreatingEvent, setIsCreatingEvent] = useState<boolean>(false);
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
  const [togglingEventId, setTogglingEventId] = useState<string | null>(null);
  const [uploadingEventImg, setUploadingEventImg] = useState<boolean>(false);

  const handleToggleEvent = async (ev: EventPopupItem) => {
    setTogglingEventId(ev.id);
    try {
      const res = await fetch(`/api/admin/events/${ev.id}/toggle`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.events)) {
          setEventList(data.events);
          onEventsChange?.(data.events);
        } else if (data.event) {
          setEventList((prev) => {
            const next = prev.map((item) => (item.id === ev.id ? data.event : item));
            onEventsChange?.(next);
            return next;
          });
        }
        showMessage(
          ev.isVisible !== false
            ? `Đã ẩn sự kiện "${ev.titleC}" khỏi người dùng.`
            : `Đã mở hiển thị công khai sự kiện "${ev.titleC}"!`
        );
        onRefreshGlobal();
      } else {
        showMessage('Không thể cập nhật trạng thái ẩn/hiện sự kiện!', true);
      }
    } catch {
      showMessage('Lỗi kết nối khi thay đổi trạng thái sự kiện!', true);
    } finally {
      setTogglingEventId(null);
    }
  };

  const handleOpenCreateEvent = () => {
    const nextIdx = (eventList.length || 0) + 1;
    const newTemplate: EventPopupItem = {
      id: `custom-${Date.now()}`,
      orderIndex: nextIdx,
      num: String(nextIdx).padStart(2, '0'),
      titleA: 'SỰ KIỆN',
      titleB: '',
      titleC: 'MỚI',
      desc: 'Mô tả ngắn gọn về sự kiện để người dùng nắm bắt thông tin nhanh chóng.',
      img: 'events/golden-bell.jpg',
      iconName: 'Sparkles',
      chips: ['Sự kiện hot', 'Giải thưởng lớn', 'Đăng ký ngay'],
      note: 'Mỗi bộ phận tự tổng hợp danh sách đăng ký và gửi BTC.',
      more: [
        'Vòng sơ loại do từng bộ phận tự tổ chức để chọn đại diện.',
        'Vòng Chung kết offline dự kiến tổ chức vào tuần sau.',
        'Cơ cấu giải thưởng hấp dẫn dành cho cá nhân và tập thể xuất sắc.',
      ],
      themeColor: 'amber',
      actionType: 'expand',
      actionUrl: '',
      isVisible: true,
    };
    setEditingEvent(newTemplate);
    setIsCreatingEvent(true);
    setShowEventModal(true);
  };

  const handleOpenEditEvent = (ev: EventPopupItem) => {
    setEditingEvent({
      ...ev,
      chips: Array.isArray(ev.chips) ? [...ev.chips] : [],
      more: Array.isArray(ev.more) ? [...ev.more] : [],
    });
    setIsCreatingEvent(false);
    setShowEventModal(true);
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent) return;

    try {
      const url = isCreatingEvent
        ? '/api/admin/events'
        : `/api/admin/events/${editingEvent.id}`;
      const method = isCreatingEvent ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editingEvent),
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.events)) {
          setEventList(data.events);
          onEventsChange?.(data.events);
        } else {
          await fetchAdminEvents();
        }
        setShowEventModal(false);
        setEditingEvent(null);
        showMessage(
          isCreatingEvent
            ? 'Đã tạo sự kiện mới thành công!'
            : 'Đã lưu thay đổi sự kiện thành công!'
        );
        onRefreshGlobal();
      } else {
        const err = await res.json();
        showMessage(err.message || 'Lỗi khi lưu sự kiện!', true);
      }
    } catch {
      showMessage('Lỗi kết nối máy chủ khi lưu sự kiện!', true);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/events/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.events)) {
          setEventList(data.events);
          onEventsChange?.(data.events);
        } else {
          await fetchAdminEvents();
        }
        setDeletingEventId(null);
        showMessage('Đã xóa sự kiện thành công!');
        onRefreshGlobal();
      } else {
        showMessage('Không thể xóa sự kiện này!', true);
      }
    } catch {
      showMessage('Lỗi kết nối khi xóa sự kiện!', true);
    }
  };

  const handleResetEvents = async () => {
    const confirmed = await appDialog.confirm({
      title: 'Khôi phục sự kiện mặc định',
      message:
        'Bạn có chắc chắn muốn khôi phục danh sách về 3 Sự Kiện Mặc Định (Ring The Golden Bell, Dub It Right, Daily Challenge) không?',
      confirmText: 'Khôi phục',
      variant: 'warning',
    });
    if (!confirmed) return;
    try {
      const res = await fetch('/api/admin/events/reset', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.events)) {
          setEventList(data.events);
          onEventsChange?.(data.events);
        } else {
          await fetchAdminEvents();
        }
        showMessage('Đã khôi phục 3 sự kiện gốc thành công!');
        onRefreshGlobal();
      } else {
        showMessage('Không thể khôi phục sự kiện!', true);
      }
    } catch {
      showMessage('Lỗi kết nối máy chủ khi reset sự kiện!', true);
    }
  };

  const handleUploadEventImg = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !editingEvent) return;

    if (file.size > 25 * 1024 * 1024) {
      showMessage('File ảnh không được vượt quá 25MB!', true);
      return;
    }

    setUploadingEventImg(true);
    try {
      const base64Data = await compressImageIfNeeded(file, 1200, 0.85);
      setEditingEvent((prev) => (prev ? { ...prev, img: base64Data } : null));

      try {
        const res = await fetch('/api/admin/upload-media', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            filename: file.name,
            base64Data,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.url) {
            setEditingEvent((prev) => (prev ? { ...prev, img: data.url } : null));
          }
        }
      } catch {
        // Giữ base64Data đã nén trong editingEvent.img nếu upload file rời bị nghẽn mạng
      }
      showMessage('Đã tải ảnh sự kiện lên thành công! Hãy bấm "Lưu thay đổi" để áp dụng.');
    } catch {
      showMessage('Lỗi khi xử lý ảnh tải lên!', true);
    } finally {
      setUploadingEventImg(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Action Bar */}
      <div
        className={`rounded-3xl p-4 sm:p-5 border shadow-sm backdrop-blur-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${cardBg}`}
      >
        <div>
          <h2 className={`text-base sm:text-lg font-black ${textPrimary}`}>
            Pop-up Sự Kiện
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-stretch md:self-auto shrink-0">
          <button
            type="button"
            onClick={fetchAdminEvents}
            disabled={loadingEvents}
            className={`p-2.5 rounded-xl font-bold text-xs border shadow-xs transition active:scale-95 flex items-center gap-1.5 ${subCardBg}`}
            title="Tải lại danh sách"
          >
            <RefreshCw className={`w-4 h-4 ${loadingEvents ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Làm mới</span>
          </button>

          <button
            type="button"
            onClick={handleResetEvents}
            className="px-3.5 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 active:scale-95 text-slate-800 dark:text-slate-200 font-bold text-xs shadow-xs transition flex items-center gap-1.5"
            title="Khôi phục mặc định"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Khôi phục mặc định</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreateEvent}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm sự kiện</span>
          </button>
        </div>
      </div>

      {/* Quick Stats KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className={`rounded-2xl p-4 border shadow-sm ${cardBg} flex items-center gap-3.5`}>
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className={`text-xs font-bold ${textSecondary}`}>Tổng sự kiện</div>
            <div className={`text-xl font-black ${textPrimary}`}>{eventList.length}</div>
          </div>
        </div>

        <div className={`rounded-2xl p-4 border shadow-sm ${cardBg} flex items-center gap-3.5`}>
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Eye className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Đang hiển thị</div>
            <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">
              {eventList.filter((e) => e.isVisible !== false).length}
            </div>
          </div>
        </div>

        <div className={`rounded-2xl p-4 border shadow-sm ${cardBg} flex items-center gap-3.5`}>
          <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center shrink-0">
            <EyeOff className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className={`text-xs font-bold ${textSecondary}`}>Đang ẩn</div>
            <div className={`text-xl font-black ${textPrimary}`}>
              {eventList.filter((e) => e.isVisible === false).length}
            </div>
          </div>
        </div>
      </div>

      {/* Danh Sách Sự Kiện (Cards) */}
      {loadingEvents ? (
        <div className="py-16 text-center space-y-2">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
          <p className={`text-sm font-bold ${textSecondary}`}>Đang tải danh sách sự kiện...</p>
        </div>
      ) : eventList.length === 0 ? (
        <div className={`rounded-3xl p-10 border text-center space-y-3 ${cardBg}`}>
          <Sparkles className="w-12 h-12 mx-auto text-amber-500 opacity-60" />
          <h3 className={`text-base font-black ${textPrimary}`}>Chưa có sự kiện nào</h3>
          <div className="flex justify-center gap-2 pt-2">
            <button
              type="button"
              onClick={handleResetEvents}
              className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs"
            >
              Khôi phục mặc định
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3.5">
          {eventList.map((ev, idx) => {
            const isVis = ev.isVisible !== false;
            const isToggling = togglingEventId === ev.id;
            const imgSrc = resolveMediaUrl(ev.img, 'events/golden-bell.jpg');

            return (
              <div
                key={ev.id || idx}
                className={`rounded-3xl border transition shadow-sm overflow-hidden ${
                  isVis
                    ? darkMode
                      ? 'bg-slate-900/90 border-slate-700/80 hover:border-blue-500/60'
                      : 'bg-white border-slate-200/90 hover:border-blue-400'
                    : darkMode
                    ? 'bg-slate-950/60 border-dashed border-slate-800 opacity-75'
                    : 'bg-slate-50/80 border-dashed border-slate-300 opacity-80'
                }`}
              >
                <div className="p-4 sm:p-5 flex flex-col md:flex-row gap-4">
                  {/* Cột trái: Ảnh minh họa */}
                  <div className="relative w-full md:w-48 h-32 md:h-auto shrink-0 rounded-2xl overflow-hidden bg-slate-200 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <img src={imgSrc} alt={ev.titleC} className="w-full h-full object-cover" />
                    <span className="absolute top-2 left-2 px-2.5 py-0.5 rounded-lg text-white text-xs font-black bg-blue-600 shadow-md">
                      #{ev.num || String(idx + 1).padStart(2, '0')}
                    </span>
                    <span
                      className={`absolute bottom-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                        isVis ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-900/80 text-amber-300'
                      }`}
                    >
                      {isVis ? 'Đang mở' : 'Đang ẩn'}
                    </span>
                  </div>

                  {/* Cột giữa: Chi tiết sự kiện */}
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className={`text-base font-black ${textPrimary}`}>
                        {ev.titleA} {ev.titleB ? `${ev.titleB} ` : ''}
                        {ev.titleC}
                      </h3>
                      <span className="text-xs text-slate-400 font-mono">
                        Thứ tự: {ev.orderIndex ?? idx + 1}
                      </span>
                    </div>

                    <p className={`text-xs leading-relaxed ${textSecondary}`}>{ev.desc}</p>

                    {/* Chips Tags */}
                    {ev.chips && ev.chips.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {ev.chips.map((c, cIdx) => (
                          <span
                            key={cIdx}
                            className={`px-2 py-0.5 rounded-md border text-[11px] font-medium ${subCardBg}`}
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    )}

                    {ev.note && <div className="text-[11px] text-slate-500 truncate">{ev.note}</div>}
                  </div>

                  {/* Cột phải: Thao tác */}
                  <div className="flex md:flex-col justify-end md:justify-center items-stretch gap-2 shrink-0 border-t md:border-t-0 md:border-l pt-3 md:pt-0 md:pl-4 border-slate-200 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => handleToggleEvent(ev)}
                      disabled={isToggling}
                      className={`px-3.5 py-2 rounded-xl font-bold text-xs shadow-sm transition active:scale-95 flex items-center justify-center gap-1.5 ${
                        isVis
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          : 'bg-slate-700 hover:bg-slate-600 text-amber-300'
                      }`}
                      title={isVis ? 'Nhấn để ẩn' : 'Nhấn để mở'}
                    >
                      {isToggling ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : isVis ? (
                        <Eye className="w-3.5 h-3.5" />
                      ) : (
                        <EyeOff className="w-3.5 h-3.5" />
                      )}
                      <span>{isVis ? 'Đang hiện' : 'Đang ẩn'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenEditEvent(ev)}
                      className={`px-3.5 py-2 rounded-xl font-bold text-xs border shadow-xs transition active:scale-95 flex items-center justify-center gap-1.5 ${subCardBg} hover:border-blue-400`}
                    >
                      <Edit3 className="w-3.5 h-3.5 text-blue-500" />
                      <span>Sửa</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeletingEventId(ev.id)}
                      className="px-3.5 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 font-bold text-xs border border-rose-200 dark:border-rose-800/40 transition active:scale-95 flex items-center justify-center gap-1.5"
                      title="Xóa"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Xóa</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AdminEventModals
        showEventModal={showEventModal}
        setShowEventModal={setShowEventModal}
        editingEvent={editingEvent}
        setEditingEvent={setEditingEvent}
        isCreatingEvent={isCreatingEvent}
        uploadingEventImg={uploadingEventImg}
        handleUploadEventImg={handleUploadEventImg}
        handleSaveEvent={handleSaveEvent}
        deletingEventId={deletingEventId}
        setDeletingEventId={setDeletingEventId}
        handleDeleteEvent={handleDeleteEvent}
        darkMode={darkMode}
        cardBg={cardBg}
        subCardBg={subCardBg}
        textPrimary={textPrimary}
        textSecondary={textSecondary}
      />
    </div>
  );
};

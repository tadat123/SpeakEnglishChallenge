import React, { useEffect, useState } from 'react';
import {
  Plus,
  Edit3,
  Trash2,
  Volume2,
  Video,
  Upload,
  CheckCircle2,
  Lock,
  Unlock,
  Users,
  Copy,
  Download,
  RefreshCw,
  Save,
  X,
  ShieldAlert,
} from 'lucide-react';
import { playPronunciation } from '../utils/audio';

interface AdminDashboardProps {
  token: string;
  challenges: any[];
  onRefreshGlobal: () => void;
  onExportCsv: () => void;
}

const QUESTION_TYPES = [
  {
    value: 'CHOOSE_AUDIO',
    label: 'Multiple Choice – Chọn audio phát âm đúng (4 nút Audio A/B/C/D)',
  },
  {
    value: 'TRUE_FALSE',
    label: 'True / False – Nghe và xác định nhận định (2 đáp án Đúng/Sai)',
  },
  {
    value: 'LISTEN_AND_CHOOSE',
    label: 'Nghe audio / Xem video – Chọn từ đúng (4 đáp án A/B/C/D)',
  },
  {
    value: 'VOCAB_MEANING',
    label: 'Nghĩa của từ / Từ viết tắt (Không bắt buộc có audio)',
  },
];

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  token,
  challenges,
  onRefreshGlobal,
  onExportCsv,
}) => {
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [dayDetail, setDayDetail] = useState<any | null>(null);
  const [loadingDay, setLoadingDay] = useState<boolean>(false);
  const [toast, setToast] = useState<string>('');
  const [errorToast, setErrorToast] = useState<string>('');

  // Chỉnh sửa thông tin ngày (Title, DateLabel)
  const [dayTitle, setDayTitle] = useState('');
  const [dayDateLabel, setDayDateLabel] = useState('');
  const [showLockConfirmModal, setShowLockConfirmModal] = useState(false);

  // Modal Thêm / Sửa câu hỏi
  const [editingQuestion, setEditingQuestion] = useState<any | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  const showMessage = (msg: string, isErr = false) => {
    if (isErr) {
      setErrorToast(msg);
      setTimeout(() => setErrorToast(''), 4500);
    } else {
      setToast(msg);
      setTimeout(() => setToast(''), 4500);
    }
  };

  const fetchDayDetail = async (dayNum: number) => {
    setLoadingDay(true);
    try {
      const res = await fetch(`/api/admin/challenges/${dayNum}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setDayDetail(data);
        setDayTitle(data.title || `Day ${dayNum}`);
        setDayDateLabel(data.dateLabel || '');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDay(false);
    }
  };

  useEffect(() => {
    fetchDayDetail(selectedDay);
  }, [selectedDay]);

  const handleSaveDayMeta = async () => {
    const res = await fetch(`/api/admin/challenges/${selectedDay}/unlock`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        title: dayTitle,
        dateLabel: dayDateLabel,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      showMessage(data.message);
      fetchDayDetail(selectedDay);
      onRefreshGlobal();
    }
  };

  const handleLockOrUnlockDay = async (
    unlockNow: boolean,
    lockMode: 'GRACEFUL' | 'FORCE' = 'GRACEFUL'
  ) => {
    const res = await fetch(`/api/admin/challenges/${selectedDay}/unlock`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        unlockNow,
        lockMode,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      showMessage(data.message);
      setShowLockConfirmModal(false);
      fetchDayDetail(selectedDay);
      onRefreshGlobal();
    }
  };

  const handleUploadFile = async (
    file: File,
    onUploadedUrl: (url: string) => void,
    fieldKey: string
  ) => {
    setUploadingField(fieldKey);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result as string;
        const res = await fetch('/api/admin/upload-media', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            filename: file.name,
            base64Data,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Lỗi tải file');
        onUploadedUrl(data.url);
        showMessage(`Đã tải lên file "${file.name}" thành công!`);
        setUploadingField(null);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      showMessage(err.message || 'Lỗi upload file', true);
      setUploadingField(null);
    }
  };

  const openCreateQuestionModal = () => {
    setIsCreatingNew(true);
    setEditingQuestion({
      questionType: 'LISTEN_AND_CHOOSE',
      categoryLabel: 'Nghe audio – Chọn từ đúng',
      promptText: '',
      statementText: '',
      targetWord: '',
      hasPromptAudio: true,
      promptAudioUrl: '',
      promptVideoUrl: '',
      audioNote: '',
      correctOptionId: 'A',
      explanation: '',
      points: 10,
      options: [
        { id: 'A', text: '', spokenText: '', hasOptionAudio: false, audioUrl: '' },
        { id: 'B', text: '', spokenText: '', hasOptionAudio: false, audioUrl: '' },
        { id: 'C', text: '', spokenText: '', hasOptionAudio: false, audioUrl: '' },
        { id: 'D', text: '', spokenText: '', hasOptionAudio: false, audioUrl: '' },
      ],
    });
  };

  const openEditQuestionModal = (q: any) => {
    setIsCreatingNew(false);
    setEditingQuestion(JSON.parse(JSON.stringify(q)));
  };

  const handleQuestionTypeChange = (newType: string) => {
    if (!editingQuestion) return;
    const foundType = QUESTION_TYPES.find((t) => t.value === newType);
    let updatedOptions = [...(editingQuestion.options || [])];

    if (newType === 'TRUE_FALSE') {
      updatedOptions = [
        { id: 'A', text: 'True – Đúng', hasOptionAudio: false },
        { id: 'B', text: 'False – Sai', hasOptionAudio: false },
      ];
    } else if (updatedOptions.length < 4) {
      updatedOptions = [
        {
          id: 'A',
          text: newType === 'CHOOSE_AUDIO' ? 'Audio A' : '',
          spokenText: '',
          hasOptionAudio: newType === 'CHOOSE_AUDIO',
          audioUrl: '',
        },
        {
          id: 'B',
          text: newType === 'CHOOSE_AUDIO' ? 'Audio B' : '',
          spokenText: '',
          hasOptionAudio: newType === 'CHOOSE_AUDIO',
          audioUrl: '',
        },
        {
          id: 'C',
          text: newType === 'CHOOSE_AUDIO' ? 'Audio C' : '',
          spokenText: '',
          hasOptionAudio: newType === 'CHOOSE_AUDIO',
          audioUrl: '',
        },
        {
          id: 'D',
          text: newType === 'CHOOSE_AUDIO' ? 'Audio D' : '',
          spokenText: '',
          hasOptionAudio: newType === 'CHOOSE_AUDIO',
          audioUrl: '',
        },
      ];
    } else if (newType === 'CHOOSE_AUDIO') {
      updatedOptions = updatedOptions.map((o) => ({ ...o, hasOptionAudio: true }));
    }

    setEditingQuestion({
      ...editingQuestion,
      questionType: newType,
      categoryLabel: foundType?.label.split(' (')[0] || editingQuestion.categoryLabel,
      hasPromptAudio: newType === 'TRUE_FALSE' || newType === 'LISTEN_AND_CHOOSE',
      options: updatedOptions,
    });
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuestion?.promptText?.trim()) {
      showMessage('Vui lòng nhập nội dung câu hỏi!', true);
      return;
    }

    const url = isCreatingNew
      ? `/api/admin/challenges/${selectedDay}/questions`
      : `/api/admin/challenges/${selectedDay}/questions/${editingQuestion.id}`;
    const method = isCreatingNew ? 'POST' : 'PUT';

    const res = await fetch(url, {
      method,
      headers,
      body: JSON.stringify(editingQuestion),
    });
    const data = await res.json();
    if (!res.ok) {
      showMessage(data.message || 'Lỗi lưu câu hỏi', true);
      return;
    }

    showMessage(data.message);
    setEditingQuestion(null);
    fetchDayDetail(selectedDay);
    onRefreshGlobal();
  };

  const handleDeleteQuestion = async (questionId: string, orderIndex: number) => {
    if (!window.confirm(`Bạn có chắc muốn xóa Câu ${orderIndex} khỏi Day ${selectedDay}?`)) {
      return;
    }
    const res = await fetch(`/api/admin/challenges/${selectedDay}/questions/${questionId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      showMessage(data.message);
      fetchDayDetail(selectedDay);
      onRefreshGlobal();
    }
  };

  const handleCloneToAllDays = async () => {
    if (
      !window.confirm(
        `Sao chép toàn bộ ${dayDetail?.questions?.length || 10} câu hỏi của Day ${selectedDay} sang tất cả 29 ngày còn lại?`
      )
    ) {
      return;
    }
    const res = await fetch(`/api/admin/challenges/${selectedDay}/clone-to-all`, {
      method: 'POST',
      headers,
      body: JSON.stringify({}),
    });
    if (res.ok) {
      const data = await res.json();
      showMessage(data.message);
      onRefreshGlobal();
    }
  };

  const handleReseed = async () => {
    if (
      !window.confirm(
        'Khôi phục lại toàn bộ 30 ngày về Bộ 10 Câu Hỏi gốc ban đầu?'
      )
    ) {
      return;
    }
    const res = await fetch('/api/admin/reseed', {
      method: 'POST',
      headers,
      body: JSON.stringify({}),
    });
    if (res.ok) {
      const data = await res.json();
      showMessage(data.message);
      fetchDayDetail(selectedDay);
      onRefreshGlobal();
    }
  };

  const activePlayersCount = dayDetail?.activePlayers?.length || 0;

  return (
    <div className="space-y-4">
      {/* Thông báo Toast */}
      {toast && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs sm:text-sm font-extrabold flex items-center justify-between shadow-sm">
          <span>✅ {toast}</span>
          <button onClick={() => setToast('')} className="text-emerald-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {errorToast && (
        <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs sm:text-sm font-extrabold flex items-center justify-between shadow-sm">
          <span>⚠️ {errorToast}</span>
          <button onClick={() => setErrorToast('')} className="text-red-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Quản trị tổng quan */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900">
            Quản trị viên (Admin CMS) — Quản lý 30 Ngày & Câu hỏi (Chữ / Audio / Video)
          </h2>
          <p className="text-xs text-slate-500">
            Chọn bất kỳ ngày nào bên dưới để sửa thông tin ngày, thêm/sửa/xóa câu hỏi hoặc khóa an toàn khi đang có người thi.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            onClick={handleReseed}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Reset Seed Gốc
          </button>
          <button
            onClick={onExportCsv}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-sm"
          >
            <Download className="w-3.5 h-3.5" /> Xuất Excel Trao Giải
          </button>
        </div>
      </div>

      {/* Bộ chọn 30 Ngày (Grid nhỏ gọn) */}
      <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-sm">
        <div className="text-xs font-extrabold text-slate-500 mb-2.5 uppercase tracking-wider">
          1. Chọn Ngày Thử Thách Cần Chỉnh Sửa (Day 1 → Day 30):
        </div>
        <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
          {challenges.map((c) => {
            const isSelected = c.dayNumber === selectedDay;
            const isUnlocked = c.status !== 'LOCKED';
            return (
              <button
                key={c.dayNumber}
                onClick={() => setSelectedDay(c.dayNumber)}
                className={`p-2 rounded-xl border text-center transition relative ${
                  isSelected
                    ? 'bg-blue-600 border-blue-600 text-white shadow-md scale-[1.03]'
                    : isUnlocked
                    ? 'bg-emerald-50/70 border-emerald-300 text-emerald-900 hover:bg-emerald-100'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="text-xs font-black">D{c.dayNumber}</div>
                <div className="text-[9px] opacity-80">
                  {isUnlocked ? '🔓 Mở' : '🔒 Khóa'}
                </div>
                {c.activePlayersCount > 0 && (
                  <span
                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center"
                    title={`${c.activePlayersCount} người đang làm bài`}
                  >
                    {c.activePlayersCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Chi tiết Ngày đang chọn: Cài đặt ngày + Xử lý khóa khi đang có người làm + CRUD Câu hỏi */}
      {dayDetail && !loadingDay && (
        <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200/80 shadow-sm space-y-5">
          {/* Phần A: Thông tin Ngày & Trạng thái Mở/Khóa thông minh */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-100">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 flex-1">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">
                  Tên ngày thi
                </label>
                <input
                  type="text"
                  value={dayTitle}
                  onChange={(e) => setDayTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">
                  Ngày tháng hiển thị
                </label>
                <input
                  type="text"
                  value={dayDateLabel}
                  onChange={(e) => setDayDateLabel(e.target.value)}
                  placeholder="VD: 04/11/2026"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-bold"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleSaveDayMeta}
                  className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 h-[38px]"
                >
                  <Save className="w-3.5 h-3.5" /> Lưu tên & ngày
                </button>
              </div>
            </div>

            {/* Trạng thái người đang thi & Nút Mở/Khóa có bảo vệ */}
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <div
                className={`px-3 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 border ${
                  activePlayersCount > 0
                    ? 'bg-amber-50 border-amber-300 text-amber-900'
                    : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                <Users className="w-4 h-4 text-blue-600" />
                <span>{activePlayersCount} người đang làm bài</span>
              </div>

              {dayDetail.isUnlocked ? (
                <button
                  onClick={() => setShowLockConfirmModal(true)}
                  className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-sm"
                >
                  <Lock className="w-4 h-4" /> Khóa {dayDetail.title}
                </button>
              ) : (
                <button
                  onClick={() => handleLockOrUnlockDay(true)}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-sm"
                >
                  <Unlock className="w-4 h-4" /> Mở khóa {dayDetail.title} ngay
                </button>
              )}
            </div>
          </div>

          {/* Nếu đang có người làm bài trên ngày này -> Hiển thị danh sách trực tiếp cho Admin biết */}
          {activePlayersCount > 0 && (
            <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <strong>🟢 Đang có nhân viên làm bài trực tuyến trên {dayDetail.title}:</strong>{' '}
                {dayDetail.activePlayers
                  .map((p: any) => `${p.fullName} (GEN ${p.employeeId} - ${p.elapsedSeconds}s)`)
                  .join(', ')}
              </div>
              <span className="text-[11px] font-bold text-amber-800 shrink-0">
                Đã bật bảo vệ Snapshot đề thi (Sửa câu hỏi không làm lỗi bài đang thi)
              </span>
            </div>
          )}

          {/* Phần B: Danh sách câu hỏi của Ngày đang chọn */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div>
                <h3 className="text-sm sm:text-base font-black text-slate-900">
                  2. Danh sách câu hỏi của {dayDetail.title} ({dayDetail.questions?.length || 0}{' '}
                  câu)
                </h3>
                <p className="text-xs text-slate-500">
                  Hỗ trợ thêm/sửa câu hỏi Chữ, tải file Âm thanh (.mp3/.wav) và Video (.mp4/.webm)
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleCloneToAllDays}
                  className="px-3 py-2 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 font-extrabold text-xs flex items-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" /> Áp dụng bộ câu này cho cả 30 ngày
                </button>
                <button
                  onClick={openCreateQuestionModal}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-4 h-4" /> Thêm Câu Hỏi Mới
                </button>
              </div>
            </div>

            <div className="space-y-2.5">
              {(dayDetail.questions || []).map((q: any) => (
                <div
                  key={q.id}
                  className="p-3.5 sm:p-4 rounded-2xl border border-slate-200 hover:border-blue-300 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-md bg-blue-600 text-white text-[11px] font-black">
                        Câu {q.orderIndex}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 text-[11px] font-bold">
                        {q.categoryLabel}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[11px] font-extrabold">
                        Đáp án đúng: {q.correctOptionId}
                      </span>
                      {q.promptAudioUrl && (
                        <span className="px-2 py-0.5 rounded-md bg-sky-100 text-sky-800 text-[10px] font-bold">
                          🎵 File MP3 riêng
                        </span>
                      )}
                      {q.promptVideoUrl && (
                        <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 text-[10px] font-bold">
                          🎬 Có Video
                        </span>
                      )}
                    </div>

                    <div className="text-xs sm:text-sm font-extrabold text-slate-900">
                      {q.promptText}
                    </div>
                    {q.statementText && (
                      <div className="text-xs font-bold text-amber-800">📌 {q.statementText}</div>
                    )}

                    <div className="flex flex-wrap gap-2 pt-1">
                      {(q.options || []).map((opt: any) => (
                        <span
                          key={opt.id}
                          className={`text-[11px] px-2.5 py-1 rounded-lg border ${
                            opt.id === q.correctOptionId
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-extrabold'
                              : 'bg-white border-slate-200 text-slate-600'
                          }`}
                        >
                          {opt.id}. {opt.text}
                          {opt.audioUrl ? ' (🎵)' : ''}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {(q.hasPromptAudio || q.promptAudioUrl) && (
                      <button
                        type="button"
                        onClick={() =>
                          playPronunciation(q.targetWord || q.promptText, q.promptAudioUrl)
                        }
                        className="p-2 rounded-xl bg-blue-100 text-blue-700 hover:bg-blue-200"
                        title="Nghe thử Audio câu hỏi"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => openEditQuestionModal(q)}
                      className="px-3 py-2 rounded-xl bg-white border border-slate-200 hover:border-blue-500 text-slate-700 hover:text-blue-600 font-bold text-xs flex items-center gap-1"
                    >
                      <Edit3 className="w-3.5 h-3.5" /> Sửa
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteQuestion(q.id, q.orderIndex)}
                      className="p-2 rounded-xl bg-white border border-slate-200 hover:border-rose-500 text-slate-400 hover:text-rose-600"
                      title="Xóa câu hỏi"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL CƠ CHẾ KHÓA NGÀY THI KHI ĐANG CÓ NGƯỜI LÀM ================= */}
      {showLockConfirmModal && dayDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Tùy chọn Khóa {dayDetail.title}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Hiện có <strong>{activePlayersCount} nhân viên</strong> đang làm bài ngày này
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowLockConfirmModal(false)}
                className="p-1.5 rounded-full bg-slate-100 text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <button
                type="button"
                onClick={() => handleLockOrUnlockDay(false, 'GRACEFUL')}
                className="w-full p-4 rounded-2xl border-2 border-blue-600 bg-blue-50/70 hover:bg-blue-100 text-left transition space-y-1"
              >
                <div className="font-black text-blue-900 text-sm flex items-center justify-between">
                  <span>🛡️ Cách 1: Khóa Mềm / Ân hạn (Khuyên dùng)</span>
                  <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full">
                    An toàn
                  </span>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  Chặn ngay người mới bấm vào thi, <strong>nhưng vẫn cho phép {activePlayersCount} người đang làm dở</strong> được hoàn thành nốt và nộp bài bình thường (trong tối đa 15 phút).
                </p>
              </button>

              <button
                type="button"
                onClick={() => handleLockOrUnlockDay(false, 'FORCE')}
                className="w-full p-4 rounded-2xl border-2 border-rose-200 bg-rose-50/50 hover:bg-rose-100/70 text-left transition space-y-1"
              >
                <div className="font-black text-rose-900 text-sm">
                  🚨 Cách 2: Khóa Cưỡng Chế Ngay Lập Tức (Force Lock)
                </div>
                <p className="text-slate-600 leading-relaxed">
                  Dừng ngay lập tức mọi phiên đang làm dở. Nhân viên đang làm sẽ nhận thông báo tạm dừng và <strong>không bị mất lượt thi chính thức</strong> khi mở lại.
                </p>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL THÊM / SỬA CÂU HỎI (CHỮ, ÂM THANH, VIDEO, ĐÁP ÁN) ================= */}
      {editingQuestion && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <form
            onSubmit={handleSaveQuestion}
            className="bg-white w-full max-w-2xl rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 my-auto max-h-[92vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base sm:text-lg font-black text-slate-900">
                {isCreatingNew
                  ? `➕ Thêm Câu Hỏi Mới vào Day ${selectedDay}`
                  : `✏️ Chỉnh sửa Câu ${editingQuestion.orderIndex} (Day ${selectedDay})`}
              </h3>
              <button
                type="button"
                onClick={() => setEditingQuestion(null)}
                className="p-2 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 1. Loại câu hỏi */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Dạng câu hỏi *
              </label>
              <select
                value={editingQuestion.questionType}
                onChange={(e) => handleQuestionTypeChange(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-bold bg-slate-50"
              >
                {QUESTION_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Nội dung câu hỏi (Chữ) & Nhận định True/False */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nội dung câu hỏi (Chữ hiển thị) *
                </label>
                <input
                  type="text"
                  value={editingQuestion.promptText}
                  onChange={(e) =>
                    setEditingQuestion({ ...editingQuestion, promptText: e.target.value })
                  }
                  placeholder="VD: Bạn nghe thấy từ nào trong đoạn âm thanh?"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Từ/Cụm từ phát âm mẫu
                </label>
                <input
                  type="text"
                  value={editingQuestion.targetWord || ''}
                  onChange={(e) =>
                    setEditingQuestion({ ...editingQuestion, targetWord: e.target.value })
                  }
                  placeholder="VD: Yield rate / M. E. G."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold"
                />
              </div>
            </div>

            {editingQuestion.questionType === 'TRUE_FALSE' && (
              <div>
                <label className="block text-xs font-bold text-amber-800 mb-1">
                  Câu Nhận Định (Dành cho dạng True / False)
                </label>
                <input
                  type="text"
                  value={editingQuestion.statementText || ''}
                  onChange={(e) =>
                    setEditingQuestion({ ...editingQuestion, statementText: e.target.value })
                  }
                  placeholder="VD: Nhận định: “Audio vừa nghe là DOE.”"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-amber-300 bg-amber-50/50 text-sm font-bold"
                />
              </div>
            )}

            {/* 3. Cài đặt ÂM THANH (Audio) & VIDEO cho Câu hỏi */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
              {/* Cột Audio Câu hỏi */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold text-slate-800 flex items-center gap-1">
                    <Volume2 className="w-4 h-4 text-blue-600" /> Âm thanh (Audio) đề bài
                  </label>
                  <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(editingQuestion.hasPromptAudio)}
                      onChange={(e) =>
                        setEditingQuestion({
                          ...editingQuestion,
                          hasPromptAudio: e.target.checked,
                        })
                      }
                    />
                    Hiện nút Loa
                  </label>
                </div>

                <input
                  type="text"
                  value={editingQuestion.promptAudioUrl || ''}
                  onChange={(e) =>
                    setEditingQuestion({
                      ...editingQuestion,
                      promptAudioUrl: e.target.value,
                      hasPromptAudio: true,
                    })
                  }
                  placeholder="Dán link .mp3 hoặc tải file bên dưới..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                />

                <div className="flex items-center gap-2">
                  <label className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer flex items-center gap-1">
                    <Upload className="w-3.5 h-3.5" />
                    {uploadingField === 'promptAudio' ? 'Đang tải...' : 'Tải file .MP3/.WAV'}
                    <input
                      type="file"
                      accept="audio/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleUploadFile(
                            file,
                            (url) =>
                              setEditingQuestion((prev: any) => ({
                                ...prev,
                                promptAudioUrl: url,
                                hasPromptAudio: true,
                              })),
                            'promptAudio'
                          );
                        }
                      }}
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() =>
                      playPronunciation(
                        editingQuestion.targetWord || editingQuestion.promptText,
                        editingQuestion.promptAudioUrl
                      )
                    }
                    className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-700"
                  >
                    🔊 Nghe thử
                  </button>
                </div>
              </div>

              {/* Cột Video Câu hỏi */}
              <div className="space-y-2">
                <label className="text-xs font-extrabold text-slate-800 flex items-center gap-1">
                  <Video className="w-4 h-4 text-purple-600" /> Video tình huống (.MP4 / Link)
                </label>

                <input
                  type="text"
                  value={editingQuestion.promptVideoUrl || ''}
                  onChange={(e) =>
                    setEditingQuestion({
                      ...editingQuestion,
                      promptVideoUrl: e.target.value,
                    })
                  }
                  placeholder="Dán link Video .mp4 hoặc tải file..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                />

                <div className="flex items-center gap-2">
                  <label className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold cursor-pointer flex items-center gap-1">
                    <Upload className="w-3.5 h-3.5" />
                    {uploadingField === 'promptVideo' ? 'Đang tải...' : 'Tải Video .MP4/.WEBM'}
                    <input
                      type="file"
                      accept="video/mp4,video/webm"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleUploadFile(
                            file,
                            (url) =>
                              setEditingQuestion((prev: any) => ({
                                ...prev,
                                promptVideoUrl: url,
                              })),
                            'promptVideo'
                          );
                        }
                      }}
                    />
                  </label>
                  {editingQuestion.promptVideoUrl && (
                    <button
                      type="button"
                      onClick={() =>
                        setEditingQuestion({ ...editingQuestion, promptVideoUrl: '' })
                      }
                      className="text-xs text-rose-600 font-bold"
                    >
                      Xóa Video
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Xem trước Video nếu có */}
            {editingQuestion.promptVideoUrl && (
              <div className="rounded-2xl overflow-hidden bg-slate-900 max-h-48 flex justify-center">
                <video
                  src={editingQuestion.promptVideoUrl}
                  controls
                  className="max-h-44 w-auto"
                />
              </div>
            )}

            {/* 4. Danh sách Đáp án & Chọn đáp án đúng */}
            <div className="space-y-2.5">
              <label className="block text-xs font-extrabold text-slate-800">
                Các phương án trả lời (Tích chọn Đáp án đúng & gắn Audio riêng nếu cần):
              </label>

              {(editingQuestion.options || []).map((opt: any, idx: number) => {
                const isCorrect = editingQuestion.correctOptionId === opt.id;
                return (
                  <div
                    key={opt.id}
                    className={`p-3 rounded-2xl border ${
                      isCorrect
                        ? 'bg-emerald-50/70 border-emerald-400'
                        : 'bg-white border-slate-200'
                    } space-y-2`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setEditingQuestion({
                            ...editingQuestion,
                            correctOptionId: opt.id,
                          })
                        }
                        className={`px-2.5 py-1 rounded-lg text-xs font-black flex items-center gap-1 ${
                          isCorrect
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {opt.id} {isCorrect ? '(Đáp án Đúng)' : ''}
                      </button>

                      <input
                        type="text"
                        value={opt.text}
                        onChange={(e) => {
                          const newOpts = [...editingQuestion.options];
                          newOpts[idx] = { ...newOpts[idx], text: e.target.value };
                          setEditingQuestion({ ...editingQuestion, options: newOpts });
                        }}
                        placeholder={`Nội dung đáp án ${opt.id}...`}
                        className="flex-1 min-w-[160px] px-3 py-1.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-bold bg-white"
                      />

                      <label className="text-[11px] font-bold text-blue-700 flex items-center gap-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={Boolean(opt.hasOptionAudio)}
                          onChange={(e) => {
                            const newOpts = [...editingQuestion.options];
                            newOpts[idx] = {
                              ...newOpts[idx],
                              hasOptionAudio: e.target.checked,
                            };
                            setEditingQuestion({ ...editingQuestion, options: newOpts });
                          }}
                        />
                        Có nút Loa {opt.id}
                      </label>
                    </div>

                    {opt.hasOptionAudio && (
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pl-2 pt-1">
                        <input
                          type="text"
                          value={opt.spokenText || ''}
                          onChange={(e) => {
                            const newOpts = [...editingQuestion.options];
                            newOpts[idx] = { ...newOpts[idx], spokenText: e.target.value };
                            setEditingQuestion({ ...editingQuestion, options: newOpts });
                          }}
                          placeholder="Từ phát âm mẫu (VD: approval)"
                          className="sm:col-span-4 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
                        />
                        <input
                          type="text"
                          value={opt.audioUrl || ''}
                          onChange={(e) => {
                            const newOpts = [...editingQuestion.options];
                            newOpts[idx] = { ...newOpts[idx], audioUrl: e.target.value };
                            setEditingQuestion({ ...editingQuestion, options: newOpts });
                          }}
                          placeholder="Hoặc link file .mp3 của đáp án này"
                          className="sm:col-span-5 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
                        />
                        <div className="sm:col-span-3 flex items-center gap-1">
                          <label className="px-2.5 py-1.5 rounded-lg bg-blue-600 text-white text-[11px] font-bold cursor-pointer">
                            {uploadingField === `opt-${opt.id}` ? '...' : 'Tải MP3'}
                            <input
                              type="file"
                              accept="audio/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  handleUploadFile(
                                    file,
                                    (url) => {
                                      const newOpts = [...editingQuestion.options];
                                      newOpts[idx] = { ...newOpts[idx], audioUrl: url };
                                      setEditingQuestion({
                                        ...editingQuestion,
                                        options: newOpts,
                                      });
                                    },
                                    `opt-${opt.id}`
                                  );
                                }
                              }}
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() =>
                              playPronunciation(
                                opt.spokenText || opt.text || editingQuestion.targetWord,
                                opt.audioUrl
                              )
                            }
                            className="p-1.5 rounded-lg bg-slate-100 text-slate-700"
                          >
                            🔊
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 5. Giải thích đáp án */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Giải thích chi tiết (Hiển thị sau khi nhân viên nộp bài)
              </label>
              <textarea
                rows={2}
                value={editingQuestion.explanation || ''}
                onChange={(e) =>
                  setEditingQuestion({ ...editingQuestion, explanation: e.target.value })
                }
                placeholder="VD: Đáp án A đúng vì trọng âm rơi vào âm tiết thứ 2..."
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingQuestion(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs sm:text-sm shadow-md flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" /> Lưu Câu Hỏi
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

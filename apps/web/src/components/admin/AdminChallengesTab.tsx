import React, { useEffect, useState } from 'react';
import {
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Save,
  Unlock,
  Users,
} from 'lucide-react';
import { AdminSubTab } from '../../utils/adminRoutes';
import { Lang } from '../../utils/i18n';
import {
  WorkplaceWordItem,
  analyzeWordPronunciation,
} from '../PronunciationChallengeQ11';
import { AdminBulkImportModal } from './AdminBulkImportModal';
import { AdminDayQuestionsSection } from './AdminDayQuestionsSection';
import { AdminLockConfirmModal, AdminQ11Modal } from './AdminQ11AndLockModals';
import { AdminQuestionModal } from './AdminQuestionModal';
import { AdminScheduleController } from './AdminScheduleController';
import { appDialog } from '../AppDialogProvider';
import { ADMIN_I18N, confirmAndUnlockChallengeDay } from './adminTypes';

interface AdminChallengesTabProps {
  token: string;
  challenges: any[];
  totalDays: number;
  unlockedDaysCount: number;
  eventStatus: 'NOT_STARTED' | 'COUNTDOWN' | 'ACTIVE';
  dashboardStats: any | null;
  selectedDay: number;
  navigateAdmin: (nextTab: AdminSubTab, dayNumber?: number) => void;
  onRefreshGlobal: () => void;
  onRefreshDashboardStats: (day?: number) => void;
  onRefreshPushStatus: () => void;
  onTotalDaysConfigured?: (cleanTotal: number) => void;
  at: (typeof ADMIN_I18N)[Lang];
  darkMode: boolean;
  cardBg: string;
  subCardBg: string;
  inputBg: string;
  textPrimary: string;
  textSecondary: string;
  showMessage: (msg: string, isErr?: boolean) => void;
}

export const AdminChallengesTab: React.FC<AdminChallengesTabProps> = ({
  token,
  challenges,
  totalDays,
  unlockedDaysCount,
  eventStatus,
  dashboardStats,
  selectedDay,
  navigateAdmin,
  onRefreshGlobal,
  onRefreshDashboardStats,
  onRefreshPushStatus,
  onTotalDaysConfigured,
  at,
  darkMode,
  cardBg,
  subCardBg,
  inputBg,
  textPrimary,
  textSecondary,
  showMessage,
}) => {
  const [dayDetail, setDayDetail] = useState<any | null>(null);
  const [loadingDay, setLoadingDay] = useState<boolean>(false);
  const [dayTitle, setDayTitle] = useState('');
  const [showLockConfirmModal, setShowLockConfirmModal] = useState(false);

  const [editingQuestion, setEditingQuestion] = useState<any | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  const [showQ11Modal, setShowQ11Modal] = useState<boolean>(false);
  const [editingQ11Words, setEditingQ11Words] = useState<WorkplaceWordItem[]>([]);
  const [cloneQ11ToAllDays, setCloneQ11ToAllDays] = useState<boolean>(false);

  const [showBulkModal, setShowBulkModal] = useState<boolean>(false);

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
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
    try {
      if (unlockNow) {
        const result = await confirmAndUnlockChallengeDay({
          dayNumber: selectedDay,
          totalDays: totalDays || challenges.length || 21,
          eventStatus,
          scheduledDateLabel: dashboardStats?.eventState?.startDateLabel || dayDetail?.dateLabel,
          headers,
        });
        if (!result.performed) return;
        if (result.ok) {
          showMessage(result.data?.message || 'Cập nhật trạng thái ngày thi thành công!');
          setShowLockConfirmModal(false);
          setDayDetail((prev: any) =>
            prev
              ? {
                  ...prev,
                  isUnlocked: result.isUnlocked !== undefined ? result.isUnlocked : true,
                }
              : prev
          );
          fetchDayDetail(selectedDay);
          onRefreshDashboardStats(selectedDay);
          onRefreshPushStatus();
          onRefreshGlobal();
        } else {
          showMessage(result.data?.message || 'Lỗi khi mở khóa ngày thi', true);
        }
        return;
      }

      const res = await fetch(`/api/admin/challenges/${selectedDay}/unlock`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          unlockNow: false,
          lockMode,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showMessage(data.message || 'Cập nhật trạng thái ngày thi thành công!');
        setShowLockConfirmModal(false);
        setDayDetail((prev: any) => {
          if (!prev) return prev;
          return {
            ...prev,
            isUnlocked: data.isUnlocked !== undefined ? data.isUnlocked : false,
          };
        });
        fetchDayDetail(selectedDay);
        onRefreshDashboardStats(selectedDay);
        onRefreshPushStatus();
        onRefreshGlobal();
      } else {
        showMessage(data.message || 'Lỗi khi cập nhật trạng thái khóa ngày thi', true);
      }
    } catch (err: any) {
      showMessage(err?.message || 'Lỗi mạng khi cập nhật trạng thái', true);
    }
  };

  const handleToggleRevealResults = async () => {
    try {
      const isCurrentlyRevealed = Boolean(dayDetail?.resultsRevealed || dayDetail?.forceRevealed);
      const res = await fetch(`/api/admin/challenges/${selectedDay}/reveal`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ forceRevealed: !isCurrentlyRevealed }),
      });
      const data = await res.json();
      if (res.ok) {
        showMessage(data.message);
        fetchDayDetail(selectedDay);
        onRefreshGlobal();
      } else {
        showMessage(data.message || 'Lỗi khi cập nhật trạng thái công bố đáp án', true);
      }
    } catch (e: any) {
      showMessage(e?.message || 'Lỗi mạng', true);
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
        if (!res.ok) throw new Error(data.message || 'Upload error');
        onUploadedUrl(data.url);
        showMessage(`Uploaded "${file.name}"!`);
        setUploadingField(null);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      showMessage(err.message || 'Upload error', true);
      setUploadingField(null);
    }
  };

  const openCreateQuestionModal = () => {
    setIsCreatingNew(true);
    setEditingQuestion({
      questionType: 'LISTEN_AND_CHOOSE',
      categoryLabel: at.types[2].label.split(' (')[0],
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
      ],
    });
  };

  const openEditQuestionModal = (q: any) => {
    setIsCreatingNew(false);
    setEditingQuestion(JSON.parse(JSON.stringify(q)));
  };

  const handleQuestionTypeChange = (newType: string) => {
    if (!editingQuestion) return;
    const foundType = at.types.find((t) => t.value === newType);
    let updatedOptions = [...(editingQuestion.options || [])];

    if (newType === 'TRUE_FALSE') {
      updatedOptions = [
        { id: 'A', text: 'True – Đúng', hasOptionAudio: false },
        { id: 'B', text: 'False – Sai', hasOptionAudio: false },
      ];
    } else if (newType === 'FILL_IN_THE_BLANK') {
      updatedOptions = [];
    } else {
      if (updatedOptions.length !== 3) {
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
        ];
      } else if (newType === 'CHOOSE_AUDIO') {
        updatedOptions = updatedOptions.map((o) => ({ ...o, hasOptionAudio: true }));
      }
    }

    setEditingQuestion({
      ...editingQuestion,
      questionType: newType,
      categoryLabel: foundType?.label.split(' (')[0] || editingQuestion.categoryLabel,
      hasPromptAudio:
        newType === 'TRUE_FALSE' ||
        newType === 'LISTEN_AND_CHOOSE' ||
        newType === 'FILL_IN_THE_BLANK',
      options: updatedOptions,
    });
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuestion?.promptText?.trim()) {
      showMessage('Vui lòng nhập nội dung câu hỏi!', true);
      return;
    }

    if (
      editingQuestion.questionType === 'FILL_IN_THE_BLANK' &&
      !editingQuestion.targetWord?.trim()
    ) {
      showMessage('Vui lòng nhập Từ vựng cần điền (Đáp án đúng)!', true);
      return;
    }

    const payload = {
      ...editingQuestion,
      options:
        editingQuestion.questionType === 'FILL_IN_THE_BLANK' ? [] : editingQuestion.options,
      correctOptionId:
        editingQuestion.questionType === 'FILL_IN_THE_BLANK'
          ? editingQuestion.targetWord?.trim().toLowerCase()
          : editingQuestion.correctOptionId,
    };

    const url = isCreatingNew
      ? `/api/admin/challenges/${selectedDay}/questions`
      : `/api/admin/challenges/${selectedDay}/questions/${editingQuestion.id}`;
    const method = isCreatingNew ? 'POST' : 'PUT';

    try {
      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        showMessage(data.message || 'Lỗi khi lưu câu hỏi', true);
        return;
      }

      showMessage(data.message || 'Đã lưu câu hỏi thành công!');
      const savedQuestion = data.question;
      if (savedQuestion) {
        setDayDetail((prev: any) => {
          if (!prev) return prev;
          const currentList = prev.questions || [];
          const exists = currentList.some(
            (q: any) => q.id === savedQuestion.id || q.orderIndex === savedQuestion.orderIndex
          );
          const updatedQuestions = exists
            ? currentList.map((q: any) =>
                q.id === savedQuestion.id || q.orderIndex === savedQuestion.orderIndex
                  ? savedQuestion
                  : q
              )
            : [...currentList, savedQuestion];
          return { ...prev, questions: updatedQuestions };
        });
      } else {
        fetchDayDetail(selectedDay);
      }
      setEditingQuestion(null);
      onRefreshGlobal();
    } catch (err: any) {
      showMessage(err?.message || 'Lỗi mạng khi lưu câu hỏi', true);
    }
  };

  const currentQ11Words: WorkplaceWordItem[] = Array.isArray(dayDetail?.q11Words)
    ? dayDetail.q11Words
    : [];

  const createEmptyQ11Word = (id: number): WorkplaceWordItem => ({
    id,
    word: '',
    spokenText: '',
    ipa: '',
    meaningVi: '',
    meaningEn: '',
    meaningKo: '',
    tip: '',
    tipVi: '',
    tipEn: '',
    tipKo: '',
  });

  const openEditQ11Modal = () => {
    const existing: WorkplaceWordItem[] = JSON.parse(JSON.stringify(currentQ11Words));
    while (existing.length < 5) {
      existing.push(createEmptyQ11Word(existing.length + 1));
    }
    setEditingQ11Words(existing.slice(0, 5));
    setCloneQ11ToAllDays(false);
    setShowQ11Modal(true);
  };

  const handleClearQ11Words = async () => {
    const confirmed = await appDialog.confirm({
      title: 'Xóa bộ từ vựng Câu 11',
      message: `Bạn có chắc chắn muốn xóa bộ từ vựng Câu 11 của Day ${selectedDay} để tự tạo mới sau không?`,
      confirmText: 'Xóa bộ từ',
      cancelText: 'Hủy',
      variant: 'danger',
    });
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/challenges/${selectedDay}/q11-words`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ q11Words: [], cloneToAllDays: false }),
      });
      const data = await res.json();
      if (res.ok) {
        showMessage(`Đã xóa bộ từ vựng Câu 11 của Day ${selectedDay}.`);
        fetchDayDetail(selectedDay);
        onRefreshGlobal();
      } else {
        showMessage(data.message || 'Lỗi khi xóa bộ từ vựng Câu 11', true);
      }
    } catch (err: any) {
      showMessage(err?.message || 'Lỗi mạng khi xóa bộ từ vựng Câu 11', true);
    }
  };

  const handleSaveQ11Words = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const enrichedWords = editingQ11Words.map((w, idx) => {
        const analysis = analyzeWordPronunciation({
          ...w,
          syllables: '',
        });
        const tipVal = (w.tip || w.tipVi || '').trim();
        return {
          ...w,
          id: idx + 1,
          spokenText: w.word.trim(),
          syllables: analysis.readableGuide,
          tip: tipVal,
          tipVi: tipVal,
        };
      });

      const res = await fetch(`/api/challenges/${selectedDay}/q11-words`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          q11Words: enrichedWords,
          cloneToAllDays: cloneQ11ToAllDays,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showMessage(data.message || 'Đã cập nhật 5 từ vựng Câu 11 thành công!');
        setShowQ11Modal(false);
        fetchDayDetail(selectedDay);
        onRefreshGlobal();
      } else {
        showMessage(data.message || 'Lỗi khi lưu bộ từ vựng', true);
      }
    } catch (err: any) {
      showMessage(err?.message || 'Lỗi mạng khi lưu từ vựng', true);
    }
  };

  const handleDeleteQuestion = async (questionId: string, orderIndex: number) => {
    const confirmed = await appDialog.confirm({
      title: 'Xóa câu hỏi',
      message: `Bạn có chắc chắn muốn xóa Câu ${orderIndex} khỏi Day ${selectedDay} không?`,
      confirmText: 'Xóa câu hỏi',
      variant: 'danger',
    });
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/admin/challenges/${selectedDay}/questions/${questionId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        showMessage(data.message || 'Đã xóa câu hỏi thành công!');
        setDayDetail((prev: any) => {
          if (!prev) return prev;
          return {
            ...prev,
            questions: (prev.questions || []).filter(
              (q: any) => q.id !== questionId && q.orderIndex !== orderIndex
            ),
          };
        });
        fetchDayDetail(selectedDay);
        onRefreshGlobal();
      } else {
        showMessage(data.message || 'Lỗi khi xóa câu hỏi', true);
      }
    } catch (err: any) {
      showMessage(err?.message || 'Lỗi mạng khi xóa câu hỏi', true);
    }
  };

  const handleCloneToAllDays = async () => {
    const countLabel = totalDays || challenges.length;
    const confirmed = await appDialog.confirm({
      title: `Nhân bản bộ câu hỏi Day ${selectedDay}`,
      message: `Sao chép toàn bộ câu hỏi hiện tại của Day ${selectedDay} sang cả ${countLabel} ngày thử thách?`,
      confirmText: 'Sao chép ngay',
      variant: 'primary',
    });
    if (!confirmed) return;
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

  const activePlayersCount = dayDetail?.activePlayers?.length || 0;
  const effectiveTotalDays = totalDays || challenges.length || 21;
  const isMetaDirty = dayDetail
    ? dayTitle !== (dayDetail.title || `Day ${selectedDay}`)
    : false;
  const isRevealed = Boolean(dayDetail?.resultsRevealed || dayDetail?.forceRevealed);

  return (
    <div className="space-y-4">
      <AdminScheduleController
        token={token}
        challengesLength={challenges.length}
        totalDays={totalDays}
        unlockedDaysCount={unlockedDaysCount}
        eventStatus={eventStatus}
        dashboardStats={dashboardStats}
        selectedDay={selectedDay}
        onRefreshGlobal={onRefreshGlobal}
        onRefreshDashboardStats={onRefreshDashboardStats}
        onTotalDaysConfigured={onTotalDaysConfigured}
        onDayDetailNeedsRefresh={fetchDayDetail}
        darkMode={darkMode}
        cardBg={cardBg}
        inputBg={inputBg}
        textPrimary={textPrimary}
        textSecondary={textSecondary}
        showMessage={showMessage}
      />

      {/* 2. Bộ chọn Ngày Thi (Compact 7-column Grid) */}
      <div className={`rounded-2xl p-4 border shadow-sm backdrop-blur-md ${cardBg}`}>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <span className={`text-xs font-extrabold uppercase tracking-wider ${textSecondary}`}>
            {at.selectDayTitle.replace('{totalDays}', String(effectiveTotalDays))}
          </span>
          <div className="flex items-center gap-3 text-[11px] font-semibold">
            <span className={`inline-flex items-center gap-1.5 ${textSecondary}`}>
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> Đang mở
            </span>
            <span className={`inline-flex items-center gap-1.5 ${textSecondary}`}>
              <span className="w-2 h-2 rounded-full bg-slate-400" /> Đang khóa
            </span>
            <span className={`inline-flex items-center gap-1.5 ${textSecondary}`}>
              <span className="w-2 h-2 rounded-full bg-blue-600" /> Đang chọn
            </span>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {challenges.map((c) => {
            const isSelected = c.dayNumber === selectedDay;
            const isUnlocked = c.status !== 'LOCKED';
            return (
              <button
                key={c.dayNumber}
                onClick={() => navigateAdmin('challenges', c.dayNumber)}
                title={`${c.title || `Day ${c.dayNumber}`} (${c.dateLabel || ''})`}
                className={`py-2 px-1.5 rounded-xl border text-center transition relative flex flex-col items-center justify-center gap-0.5 ${
                  isSelected
                    ? 'bg-blue-600 border-blue-600 text-white shadow-sm ring-2 ring-blue-500/25'
                    : isUnlocked
                    ? darkMode
                      ? 'bg-emerald-950/45 border-emerald-800/80 text-emerald-300 hover:bg-emerald-900/60'
                      : 'bg-emerald-50/70 border-emerald-200 text-emerald-800 hover:bg-emerald-100/80'
                    : darkMode
                    ? 'bg-slate-800/60 border-slate-700/80 text-slate-400 hover:bg-slate-800'
                    : 'bg-slate-50 border-slate-200/80 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span className="text-xs font-black leading-none">D{c.dayNumber}</span>
                <span className="flex items-center gap-1 text-[10px] opacity-80 leading-none mt-1">
                  {isUnlocked ? (
                    <Unlock className="w-2.5 h-2.5" />
                  ) : (
                    <Lock className="w-2.5 h-2.5" />
                  )}
                </span>
                {c.activePlayersCount > 0 && (
                  <span
                    className="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center shadow-xs"
                    title={`${c.activePlayersCount} ${at.activePlayersLabel}`}
                  >
                    {c.activePlayersCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Không gian làm việc Chi tiết Ngày đang chọn */}
      {dayDetail ? (
        <div className={`rounded-2xl p-4 sm:p-6 border shadow-sm backdrop-blur-md space-y-5 relative ${cardBg}`}>
          {/* Header Ngày & Trạng thái */}
          <div
            className={`flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b ${
              darkMode ? 'border-slate-800' : 'border-slate-100'
            }`}
          >
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className={`text-lg sm:text-xl font-black tracking-tight ${textPrimary}`}>
                  {dayDetail.title || `Day ${selectedDay}`}
                </h2>

                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                    dayDetail.isUnlocked
                      ? darkMode
                        ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : darkMode
                      ? 'bg-slate-800 text-slate-300 border-slate-700'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  {dayDetail.isUnlocked ? (
                    <>
                      <Unlock className="w-3 h-3" /> Đang mở
                    </>
                  ) : (
                    <>
                      <Lock className="w-3 h-3" /> Đang khóa
                    </>
                  )}
                </span>

                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                    isRevealed
                      ? darkMode
                        ? 'bg-violet-950/60 text-violet-300 border-violet-800'
                        : 'bg-violet-50 text-violet-700 border-violet-200'
                      : darkMode
                      ? 'bg-amber-950/50 text-amber-300 border-amber-800/70'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}
                >
                  {isRevealed ? (
                    <>
                      <Eye className="w-3 h-3" /> Đã công bố đáp án
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-3 h-3" /> Ẩn đáp án (tới 00:00)
                    </>
                  )}
                </span>

                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                    activePlayersCount > 0
                      ? 'bg-amber-50 border-amber-300 text-amber-900'
                      : darkMode
                      ? 'bg-slate-800/70 border-slate-700 text-slate-300'
                      : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}
                >
                  <Users className="w-3 h-3 text-blue-500" />
                  {activePlayersCount} {at.activePlayersLabel}
                </span>

                {loadingDay && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-500">
                    <Loader2 className="w-3 h-3 animate-spin" /> Đang tải...
                  </span>
                )}
              </div>
            </div>

            {/* Chỉ 2 nút điều khiển trạng thái riêng của Day đang chọn */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {dayDetail.isUnlocked ? (
                <button
                  type="button"
                  onClick={() => setShowLockConfirmModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>{at.lockDayBtn} ngày</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleLockOrUnlockDay(true)}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span>{at.unlockDayBtn} ngày</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleToggleRevealResults}
                className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 border transition ${
                  isRevealed
                    ? darkMode
                      ? 'border-violet-700 bg-violet-950/60 hover:bg-violet-900/70 text-violet-200'
                      : 'border-violet-200 bg-violet-50 hover:bg-violet-100 text-violet-700'
                    : 'border-transparent bg-amber-500 hover:bg-amber-600 text-white shadow-xs'
                }`}
                title={
                  isRevealed
                    ? 'Đáp án & Bảng điểm đang được CÔNG BỐ. Bấm để ẩn lại (chờ 00:00).'
                    : 'Bấm để CÔNG BỐ đáp án & bảng điểm ngay lập tức cho toàn thể nhân viên.'
                }
              >
                {isRevealed ? (
                  <>
                    <EyeOff className="w-3.5 h-3.5" />
                    <span>Ẩn đáp án</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5" />
                    <span>Công bố đáp án</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Thông tin Tên ngày thi & Ngày phát hành (tự động theo lịch Challenge) */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            <div className="sm:col-span-6">
              <label className={`block text-[11px] font-bold mb-1 ${textSecondary}`}>
                {at.dayTitleLabel}
              </label>
              <input
                type="text"
                value={dayTitle}
                onChange={(e) => setDayTitle(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl border text-xs sm:text-sm font-bold outline-none ${inputBg}`}
              />
            </div>
            <div className="sm:col-span-4">
              <label className={`block text-[11px] font-bold mb-1 ${textSecondary}`}>
                Ngày phát hành (theo lịch Challenge)
              </label>
              <div
                className={`w-full px-3 py-2 rounded-xl border text-xs sm:text-sm font-bold flex items-center justify-between h-[38px] select-none ${
                  darkMode
                    ? 'bg-slate-900/60 border-slate-800 text-slate-300'
                    : 'bg-slate-50 border-slate-200/80 text-slate-600'
                }`}
                title="Ngày phát hành được tự động đồng bộ từ Ngày khai mạc trong Lịch Trình Challenge phía trên"
              >
                <span>{dayDetail.dateLabel || 'Chưa xếp lịch'}</span>
                <span className="text-[10px] font-semibold opacity-70">Tự động</span>
              </div>
            </div>
            <div className="sm:col-span-2">
              <button
                type="button"
                onClick={handleSaveDayMeta}
                className={`w-full py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 h-[38px] transition ${
                  isMetaDirty
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                    : darkMode
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                }`}
              >
                <Save className="w-3.5 h-3.5" />
                <span>{at.saveDayMetaBtn}</span>
              </button>
            </div>
          </div>

          {activePlayersCount > 0 && (
            <div className="p-3.5 rounded-2xl bg-amber-50/90 border border-amber-200 text-xs text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <strong>
                  {at.liveBannerTitle} {dayDetail.title}:
                </strong>{' '}
                {dayDetail.activePlayers
                  .map((p: any) => `${p.fullName} (GEN ${p.employeeId} - ${p.elapsedSeconds}s)`)
                  .join(', ')}
              </div>
              <span className="text-[11px] font-bold text-amber-800 shrink-0">
                {at.liveBannerProtection}
              </span>
            </div>
          )}

          <AdminDayQuestionsSection
            dayDetail={dayDetail}
            effectiveTotalDays={effectiveTotalDays}
            currentQ11Words={currentQ11Words}
            at={at}
            darkMode={darkMode}
            subCardBg={subCardBg}
            inputBg={inputBg}
            textPrimary={textPrimary}
            textSecondary={textSecondary}
            onOpenBulkModal={() => setShowBulkModal(true)}
            onCloneToAllDays={handleCloneToAllDays}
            onOpenCreateQuestion={openCreateQuestionModal}
            onOpenEditQuestion={openEditQuestionModal}
            onDeleteQuestion={handleDeleteQuestion}
            onOpenEditQ11={openEditQ11Modal}
            onClearQ11={handleClearQ11Words}
          />
        </div>
      ) : loadingDay ? (
        <div className={`rounded-3xl p-12 border shadow-sm backdrop-blur-md text-center space-y-3 ${cardBg}`}>
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500" />
          <p className={`text-sm font-bold ${textSecondary}`}>Đang tải chi tiết Day {selectedDay}...</p>
        </div>
      ) : null}

      <AdminLockConfirmModal
        show={showLockConfirmModal}
        dayDetail={dayDetail}
        activePlayersCount={activePlayersCount}
        onClose={() => setShowLockConfirmModal(false)}
        onLock={(mode) => handleLockOrUnlockDay(false, mode)}
        at={at}
        darkMode={darkMode}
        cardBg={cardBg}
        subCardBg={subCardBg}
        textPrimary={textPrimary}
        textSecondary={textSecondary}
      />

      <AdminQuestionModal
        editingQuestion={editingQuestion}
        setEditingQuestion={setEditingQuestion}
        isCreatingNew={isCreatingNew}
        selectedDay={selectedDay}
        uploadingField={uploadingField}
        handleUploadFile={handleUploadFile}
        onQuestionTypeChange={handleQuestionTypeChange}
        onSubmit={handleSaveQuestion}
        at={at}
        darkMode={darkMode}
        cardBg={cardBg}
        subCardBg={subCardBg}
        inputBg={inputBg}
        textPrimary={textPrimary}
        textSecondary={textSecondary}
      />

      <AdminQ11Modal
        show={showQ11Modal}
        selectedDay={selectedDay}
        dayDetail={dayDetail}
        totalDays={totalDays}
        challengesLength={challenges.length}
        editingQ11Words={editingQ11Words}
        setEditingQ11Words={setEditingQ11Words}
        cloneQ11ToAllDays={cloneQ11ToAllDays}
        setCloneQ11ToAllDays={setCloneQ11ToAllDays}
        onClose={() => setShowQ11Modal(false)}
        onSubmit={handleSaveQ11Words}
        darkMode={darkMode}
        cardBg={cardBg}
        subCardBg={subCardBg}
        inputBg={inputBg}
        textPrimary={textPrimary}
        textSecondary={textSecondary}
      />

      <AdminBulkImportModal
        show={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        token={token}
        selectedDay={selectedDay}
        totalDays={totalDays}
        onImported={() => {
          fetchDayDetail(selectedDay);
          onRefreshGlobal();
        }}
        showMessage={showMessage}
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

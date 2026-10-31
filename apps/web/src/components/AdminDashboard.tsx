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
  ShieldCheck,
  BellRing,
  Send,
  Smartphone,
  Trophy,
  Clock,
} from 'lucide-react';
import { playPronunciation } from '../utils/audio';
import { Lang } from '../utils/i18n';

interface AdminDashboardProps {
  token: string;
  challenges: any[];
  onRefreshGlobal: () => void;
  onExportCsv: () => void;
  lang: Lang;
  darkMode: boolean;
}

const ADMIN_I18N = {
  vi: {
    headerTitle: 'Quản trị viên (Admin CMS) — Quản lý 30 Ngày & Câu hỏi (Chữ / Audio / Video)',
    headerSub:
      'Chọn bất kỳ ngày nào bên dưới để sửa thông tin ngày, thêm/sửa/xóa câu hỏi hoặc khóa an toàn khi đang có người thi.',
    reseedBtn: 'Reset Seed Gốc',
    exportBtn: 'Xuất Excel Trao Giải',
    selectDayTitle: '1. Chọn Ngày Thử Thách Cần Chỉnh Sửa (Day 1 → Day 30):',
    openStatus: '🔓 Mở',
    lockedStatus: '🔒 Khóa',
    dayTitleLabel: 'Tên ngày thi',
    dayDateLabel: 'Ngày tháng hiển thị',
    saveDayMetaBtn: 'Lưu tên & ngày',
    activePlayersLabel: 'người đang làm bài',
    lockDayBtn: 'Khóa',
    unlockDayBtn: 'Mở khóa',
    nowSuffix: 'ngay',
    liveBannerTitle: '🟢 Đang có nhân viên làm bài trực tuyến trên',
    liveBannerProtection: 'Đã bật bảo vệ Snapshot đề thi (Sửa câu hỏi không làm lỗi bài đang thi)',
    questionListTitle: '2. Danh sách câu hỏi của',
    questionsCountUnit: 'câu',
    questionListSub: 'Hỗ trợ thêm/sửa câu hỏi Chữ, tải file Âm thanh (.mp3/.wav) và Video (.mp4/.webm)',
    cloneAllBtn: 'Áp dụng bộ câu này cho cả 30 ngày',
    addQuestionBtn: 'Thêm Câu Hỏi Mới',
    questionPrefix: 'Câu',
    correctAnsBadge: 'Đáp án đúng',
    mp3Badge: '🎵 File MP3 riêng',
    videoBadge: '🎬 Có Video',
    editBtn: 'Sửa',
    deleteBtnTitle: 'Xóa câu hỏi',
    lockModalTitle: 'Tùy chọn Khóa',
    lockModalSubPrefix: 'Hiện có',
    lockModalSubSuffix: 'nhân viên đang làm bài ngày này',
    gracefulTitle: '🛡️ Cách 1: Khóa Mềm / Ân hạn (Khuyên dùng)',
    safeBadge: 'An toàn',
    gracefulDesc:
      'Chặn ngay người mới bấm vào thi, nhưng vẫn cho phép những người đang làm dở được hoàn thành nốt và nộp bài bình thường (trong tối đa 15 phút).',
    forceTitle: '🚨 Cách 2: Khóa Cưỡng Chế Ngay Lập Tức (Force Lock)',
    forceDesc:
      'Dừng ngay lập tức mọi phiên đang làm dở. Nhân viên đang làm sẽ nhận thông báo tạm dừng và không bị mất lượt thi chính thức khi mở lại.',
    modalAddTitle: '➕ Thêm Câu Hỏi Mới vào Day',
    modalEditTitle: '✏️ Chỉnh sửa Câu',
    questionTypeLabel: 'Dạng câu hỏi *',
    promptTextLabel: 'Nội dung câu hỏi (Chữ hiển thị) *',
    targetWordLabel: 'Từ/Cụm từ phát âm mẫu',
    statementTextLabel: 'Câu Nhận Định (Dành cho dạng True / False)',
    promptAudioTitle: 'Âm thanh (Audio) đề bài',
    showSpeakerLabel: 'Hiện nút Loa',
    uploadAudioBtn: 'Tải file .MP3/.WAV',
    uploadingText: 'Đang tải...',
    testListenBtn: '🔊 Nghe thử',
    promptVideoTitle: 'Video tình huống (.MP4 / Link)',
    uploadVideoBtn: 'Tải Video .MP4/.WEBM',
    removeVideoBtn: 'Xóa Video',
    optionsSectionLabel: 'Các phương án trả lời (Tích chọn Đáp án đúng & gắn Audio riêng nếu cần):',
    correctSelectedBadge: '(Đáp án Đúng)',
    hasOptionSpeaker: 'Có nút Loa',
    explanationLabel: 'Giải thích chi tiết (Hiển thị sau khi nhân viên nộp bài)',
    cancelBtn: 'Hủy',
    saveQuestionBtn: 'Lưu Câu Hỏi',
    types: [
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
    ],
  },
  en: {
    headerTitle: 'Admin CMS — Manage 30 Days & Questions (Text / Audio / Video)',
    headerSub:
      'Select any day below to edit schedule details, add/edit/delete questions, or safely lock a day while users are taking the quiz.',
    reseedBtn: 'Reset Default Seed',
    exportBtn: 'Export Award CSV',
    selectDayTitle: '1. Select Challenge Day to Edit (Day 1 → Day 30):',
    openStatus: '🔓 Open',
    lockedStatus: '🔒 Locked',
    dayTitleLabel: 'Day Title',
    dayDateLabel: 'Display Date',
    saveDayMetaBtn: 'Save Title & Date',
    activePlayersLabel: 'active players',
    lockDayBtn: 'Lock',
    unlockDayBtn: 'Unlock',
    nowSuffix: 'now',
    liveBannerTitle: '🟢 Employees currently taking quiz on',
    liveBannerProtection: 'Snapshot Protection Active (Editing questions will not break active quizzes)',
    questionListTitle: '2. Question List for',
    questionsCountUnit: 'questions',
    questionListSub: 'Add/edit Text questions, upload Audio (.mp3/.wav) and Video (.mp4/.webm)',
    cloneAllBtn: 'Clone this set to all 30 days',
    addQuestionBtn: 'Add New Question',
    questionPrefix: 'Q',
    correctAnsBadge: 'Correct',
    mp3Badge: '🎵 Custom MP3',
    videoBadge: '🎬 Video',
    editBtn: 'Edit',
    deleteBtnTitle: 'Delete question',
    lockModalTitle: 'Lock Options for',
    lockModalSubPrefix: 'Currently',
    lockModalSubSuffix: 'employees are taking this quiz',
    gracefulTitle: '🛡️ Option 1: Graceful Soft Lock (Recommended)',
    safeBadge: 'Safe',
    gracefulDesc:
      'Blocks new entries immediately, while allowing active players up to 15 minutes to finish and submit normally.',
    forceTitle: '🚨 Option 2: Immediate Force Lock',
    forceDesc:
      'Terminates active sessions immediately. Active players receive a pause notice and keep their official attempt when reopened.',
    modalAddTitle: '➕ Add New Question to Day',
    modalEditTitle: '✏️ Edit Question',
    questionTypeLabel: 'Question Type *',
    promptTextLabel: 'Question Prompt (Displayed Text) *',
    targetWordLabel: 'Target Word / Phrase (TTS)',
    statementTextLabel: 'Statement Text (For True / False)',
    promptAudioTitle: 'Prompt Audio',
    showSpeakerLabel: 'Show Speaker Button',
    uploadAudioBtn: 'Upload .MP3/.WAV',
    uploadingText: 'Uploading...',
    testListenBtn: '🔊 Test Audio',
    promptVideoTitle: 'Situation Video (.MP4 / Link)',
    uploadVideoBtn: 'Upload .MP4/.WEBM',
    removeVideoBtn: 'Remove Video',
    optionsSectionLabel: 'Answer Options (Select correct option & attach audio if needed):',
    correctSelectedBadge: '(Correct)',
    hasOptionSpeaker: 'Speaker',
    explanationLabel: 'Detailed Explanation (Shown after submission)',
    cancelBtn: 'Cancel',
    saveQuestionBtn: 'Save Question',
    types: [
      {
        value: 'CHOOSE_AUDIO',
        label: 'Multiple Choice – Choose correct pronunciation audio (4 Audio buttons A/B/C/D)',
      },
      {
        value: 'TRUE_FALSE',
        label: 'True / False – Listen and verify statement (2 options True/False)',
      },
      {
        value: 'LISTEN_AND_CHOOSE',
        label: 'Listen Audio / Watch Video – Choose correct word (4 options A/B/C/D)',
      },
      {
        value: 'VOCAB_MEANING',
        label: 'Vocabulary Meaning / Acronym (Audio optional)',
      },
    ],
  },
  ko: {
    headerTitle: '관리자 CMS — 30일 챌린지 및 문제 관리 (텍스트 / 오디오 / 비디오)',
    headerSub:
      '아래에서 날짜를 선택하여 일정을 수정하거나, 문제를 추가/수정/삭제하고, 응시 중인 사용자가 있을 때 안전하게 잠글 수 있습니다.',
    reseedBtn: '기본 데이터 초기화',
    exportBtn: '시상용 엑셀(CSV) 내보내기',
    selectDayTitle: '1. 수정할 챌린지 날짜 선택 (Day 1 → Day 30):',
    openStatus: '🔓 열림',
    lockedStatus: '🔒 잠김',
    dayTitleLabel: '일차 제목',
    dayDateLabel: '표시 날짜',
    saveDayMetaBtn: '제목 및 날짜 저장',
    activePlayersLabel: '명 응시 중',
    lockDayBtn: '잠금',
    unlockDayBtn: '잠금 해제',
    nowSuffix: '즉시',
    liveBannerTitle: '🟢 현재 실시간 응시 중인 임직원:',
    liveBannerProtection: '시험지 스냅샷 보호 활성화됨 (문제 수정 시 응시 중인 시험에 영향 없음)',
    questionListTitle: '2. 문제 목록:',
    questionsCountUnit: '문항',
    questionListSub: '텍스트 문제 추가/수정, 오디오(.mp3/.wav) 및 비디오(.mp4/.webm) 업로드 지원',
    cloneAllBtn: '이 문제 세트를 30일 전체에 복사',
    addQuestionBtn: '새 문제 추가',
    questionPrefix: '문항',
    correctAnsBadge: '정답',
    mp3Badge: '🎵 MP3 파일',
    videoBadge: '🎬 비디오 포함',
    editBtn: '수정',
    deleteBtnTitle: '문제 삭제',
    lockModalTitle: '잠금 옵션 선택:',
    lockModalSubPrefix: '현재',
    lockModalSubSuffix: '명의 임직원이 응시 중입니다',
    gracefulTitle: '🛡️ 방법 1: 소프트 잠금 / 유예 시간 부여 (권장)',
    safeBadge: '안전',
    gracefulDesc:
      '신규 진입을 즉시 차단하지만, 현재 풀고 있는 응시자는 최대 15분 동안 정상적으로 제출할 수 있도록 허용합니다.',
    forceTitle: '🚨 방법 2: 즉시 강제 잠금 (Force Lock)',
    forceDesc:
      '진행 중인 모든 세션을 즉시 중단합니다. 응시 중인 임직원은 일시 중지 알림을 받으며 재오픈 시 공식 응시 기회가 유지됩니다.',
    modalAddTitle: '➕ 새 문제 추가 - Day',
    modalEditTitle: '✏️ 문제 수정 - 문항',
    questionTypeLabel: '문제 유형 *',
    promptTextLabel: '문제 내용 (표시 텍스트) *',
    targetWordLabel: '발음 단어 / 구문 (TTS)',
    statementTextLabel: '진술문 (True / False 전용)',
    promptAudioTitle: '문제 오디오 (Audio)',
    showSpeakerLabel: '스피커 버튼 표시',
    uploadAudioBtn: '.MP3/.WAV 업로드',
    uploadingText: '업로드 중...',
    testListenBtn: '🔊 미리 듣기',
    promptVideoTitle: '상황 비디오 (.MP4 / 링크)',
    uploadVideoBtn: '.MP4/.WEBM 업로드',
    removeVideoBtn: '비디오 삭제',
    optionsSectionLabel: '답안 보기 (정답 선택 및 개별 오디오 설정):',
    correctSelectedBadge: '(정답)',
    hasOptionSpeaker: '스피커 버튼',
    explanationLabel: '상세 해설 (제출 후 표시됨)',
    cancelBtn: '취소',
    saveQuestionBtn: '문제 저장',
    types: [
      {
        value: 'CHOOSE_AUDIO',
        label: '객관식 – 올바른 발음 오디오 선택 (4개 오디오 버튼 A/B/C/D)',
      },
      {
        value: 'TRUE_FALSE',
        label: 'True / False – 오디오를 듣고 진술 확인 (2개 보기 참/거짓)',
      },
      {
        value: 'LISTEN_AND_CHOOSE',
        label: '오디오 듣기 / 비디오 보기 – 올바른 단어 선택 (4개 보기 A/B/C/D)',
      },
      {
        value: 'VOCAB_MEANING',
        label: '단어 의미 / 약어 풀이 (오디오 선택 사항)',
      },
    ],
  },
};

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  token,
  challenges,
  onRefreshGlobal,
  onExportCsv,
  lang,
  darkMode,
}) => {
  const at = ADMIN_I18N[lang];
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

  // Quản lý PWA Push Notifications & Staggered Request Queue (Chia đều Request)
  const [pushStatus, setPushStatus] = useState<any | null>(null);
  const [spreadWindowSeconds, setSpreadWindowSeconds] = useState<number>(18);
  const [minIntervalMs, setMinIntervalMs] = useState<number>(1200);
  const [autoRemindUnstudied, setAutoRemindUnstudied] = useState<boolean>(true);
  const [morningHour, setMorningHour] = useState<number>(8);
  const [eveningTop1Hour, setEveningTop1Hour] = useState<number>(19);
  const [nightUnstudiedHour, setNightUnstudiedHour] = useState<number>(23);

  // Giám sát An ninh Bảo mật (SQL Injection, Chống F12, Chống DDoS)
  const [securityStats, setSecurityStats] = useState<any | null>(null);

  const cardBg = darkMode
    ? 'bg-slate-900/90 border-slate-800 text-slate-100'
    : 'bg-white/95 border-blue-100/90 text-slate-800';
  const subCardBg = darkMode
    ? 'bg-slate-800/80 border-slate-700 text-slate-100'
    : 'bg-slate-50/90 border-slate-200 text-slate-800';
  const inputBg = darkMode
    ? 'bg-slate-800 border-slate-700 text-white'
    : 'bg-white border-slate-200 text-slate-900';
  const textPrimary = darkMode ? 'text-white' : 'text-slate-900';
  const textSecondary = darkMode ? 'text-slate-400' : 'text-slate-500';

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

  const fetchPushStatus = async (syncInputs = false) => {
    try {
      const res = await fetch('/api/admin/push/status', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPushStatus(data);
        if (syncInputs && data.queueStatus?.config) {
          setSpreadWindowSeconds(data.queueStatus.config.spreadWindowSeconds ?? 18);
          setMinIntervalMs(data.queueStatus.config.minIntervalMs ?? 1200);
          setAutoRemindUnstudied(Boolean(data.queueStatus.config.autoRemindUnstudied));
          setMorningHour(data.queueStatus.config.morningHour ?? 8);
          setEveningTop1Hour(data.queueStatus.config.eveningTop1Hour ?? 19);
          setNightUnstudiedHour(data.queueStatus.config.nightUnstudiedHour ?? 23);
        }
      }
    } catch {
      // ignore
    }
  };

  const fetchSecurityStats = async () => {
    try {
      const res = await fetch('/api/admin/security/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSecurityStats(data);
      }
    } catch {
      // ignore
    }
  };

  const handleUnbanIp = async (ip: string) => {
    try {
      const res = await fetch('/api/admin/security/unban', {
        method: 'POST',
        headers,
        body: JSON.stringify({ ip }),
      });
      if (res.ok) {
        const data = await res.json();
        showMessage(data.message);
        fetchSecurityStats();
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchPushStatus(true);
    fetchSecurityStats();
    const interval = setInterval(() => {
      fetchPushStatus(false);
      fetchSecurityStats();
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleSavePushConfig = async (resetTodayQuota = false) => {
    const res = await fetch('/api/admin/push/config', {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        spreadWindowSeconds: Number(spreadWindowSeconds),
        minIntervalMs: Number(minIntervalMs),
        autoRemindUnstudied,
        morningHour: Number(morningHour),
        eveningTop1Hour: Number(eveningTop1Hour),
        nightUnstudiedHour: Number(nightUnstudiedHour),
        resetTodayQuota,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      showMessage(
        resetTodayQuota
          ? 'Đã đặt lại hạn mức 3 khung thông báo hôm nay (Sáng / 19h / 23h)!'
          : data.message
      );
      fetchPushStatus(true);
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
        const confirmForce = window.confirm(
          `${data.message}\n\nBạn có muốn GỬI LẠI CƯỠNG BỨC (Force Push) cho khung giờ này ngay bây giờ không?`
        );
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
      fetchPushStatus(false);
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
    const foundType = at.types.find((t) => t.value === newType);
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
      showMessage('Please enter question prompt!', true);
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
      showMessage(data.message || 'Error saving question', true);
      return;
    }

    showMessage(data.message);
    setEditingQuestion(null);
    fetchDayDetail(selectedDay);
    onRefreshGlobal();
  };

  const handleDeleteQuestion = async (questionId: string, orderIndex: number) => {
    if (!window.confirm(`Delete #${orderIndex} from Day ${selectedDay}?`)) {
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
    if (!window.confirm(`Clone all questions of Day ${selectedDay} to all 30 days?`)) {
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
    if (!window.confirm('Reset all 30 days to the default 10 official questions?')) {
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
      <div
        className={`rounded-3xl p-4 sm:p-5 border shadow-sm backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${cardBg}`}
      >
        <div>
          <h2 className={`text-base sm:text-lg font-black ${textPrimary}`}>{at.headerTitle}</h2>
          <p className={`text-xs ${textSecondary}`}>{at.headerSub}</p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            onClick={handleReseed}
            className={`px-3 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition ${
              darkMode
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" /> {at.reseedBtn}
          </button>
          <button
            onClick={onExportCsv}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-sm"
          >
            <Download className="w-3.5 h-3.5" /> {at.exportBtn}
          </button>
        </div>
      </div>

      {/* Bộ chọn 30 Ngày (Grid nhỏ gọn) */}
      <div className={`rounded-3xl p-4 border shadow-sm backdrop-blur-md ${cardBg}`}>
        <div className={`text-xs font-extrabold mb-2.5 uppercase tracking-wider ${textSecondary}`}>
          {at.selectDayTitle}
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
                    ? darkMode
                      ? 'bg-emerald-950/60 border-emerald-700 text-emerald-300 hover:bg-emerald-900/70'
                      : 'bg-emerald-50/80 border-emerald-300 text-emerald-900 hover:bg-emerald-100'
                    : darkMode
                    ? 'bg-slate-800/80 border-slate-700 text-slate-400 hover:bg-slate-800'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="text-xs font-black">D{c.dayNumber}</div>
                <div className="text-[9px] opacity-85">
                  {isUnlocked ? at.openStatus : at.lockedStatus}
                </div>
                {c.activePlayersCount > 0 && (
                  <span
                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center"
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

      {/* Chi tiết Ngày đang chọn */}
      {dayDetail && !loadingDay && (
        <div className={`rounded-3xl p-4 sm:p-6 border shadow-sm backdrop-blur-md space-y-5 ${cardBg}`}>
          {/* Phần A: Thông tin Ngày & Trạng thái Mở/Khóa thông minh */}
          <div
            className={`flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b ${
              darkMode ? 'border-slate-800' : 'border-slate-100'
            }`}
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 flex-1">
              <div>
                <label className={`block text-[11px] font-bold mb-1 ${textSecondary}`}>
                  {at.dayTitleLabel}
                </label>
                <input
                  type="text"
                  value={dayTitle}
                  onChange={(e) => setDayTitle(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border text-sm font-bold outline-none ${inputBg}`}
                />
              </div>
              <div>
                <label className={`block text-[11px] font-bold mb-1 ${textSecondary}`}>
                  {at.dayDateLabel}
                </label>
                <input
                  type="text"
                  value={dayDateLabel}
                  onChange={(e) => setDayDateLabel(e.target.value)}
                  placeholder="04/11/2026"
                  className={`w-full px-3 py-2 rounded-xl border text-sm font-bold outline-none ${inputBg}`}
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleSaveDayMeta}
                  className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 h-[38px]"
                >
                  <Save className="w-3.5 h-3.5" /> {at.saveDayMetaBtn}
                </button>
              </div>
            </div>

            {/* Trạng thái người đang thi & Nút Mở/Khóa có bảo vệ */}
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <div
                className={`px-3 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 border ${
                  activePlayersCount > 0
                    ? 'bg-amber-50 border-amber-300 text-amber-900'
                    : subCardBg
                }`}
              >
                <Users className="w-4 h-4 text-blue-500" />
                <span>
                  {activePlayersCount} {at.activePlayersLabel}
                </span>
              </div>

              {dayDetail.isUnlocked ? (
                <button
                  onClick={() => setShowLockConfirmModal(true)}
                  className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-sm"
                >
                  <Lock className="w-4 h-4" /> {at.lockDayBtn} {dayDetail.title}
                </button>
              ) : (
                <button
                  onClick={() => handleLockOrUnlockDay(true)}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-sm"
                >
                  <Unlock className="w-4 h-4" /> {at.unlockDayBtn} {dayDetail.title} {at.nowSuffix}
                </button>
              )}
            </div>
          </div>

          {/* Nếu đang có người làm bài trên ngày này */}
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

          {/* Phần B: Danh sách câu hỏi của Ngày đang chọn */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div>
                <h3 className={`text-sm sm:text-base font-black ${textPrimary}`}>
                  {at.questionListTitle} {dayDetail.title} ({dayDetail.questions?.length || 0}{' '}
                  {at.questionsCountUnit})
                </h3>
                <p className={`text-xs ${textSecondary}`}>{at.questionListSub}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleCloneToAllDays}
                  className={`px-3 py-2 rounded-xl border font-extrabold text-xs flex items-center gap-1.5 ${
                    darkMode
                      ? 'border-blue-800 bg-blue-950/60 hover:bg-blue-900/70 text-blue-300'
                      : 'border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700'
                  }`}
                >
                  <Copy className="w-3.5 h-3.5" /> {at.cloneAllBtn}
                </button>
                <button
                  onClick={openCreateQuestionModal}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-4 h-4" /> {at.addQuestionBtn}
                </button>
              </div>
            </div>

            <div className="space-y-2.5">
              {(dayDetail.questions || []).map((q: any) => (
                <div
                  key={q.id}
                  className={`p-3.5 sm:p-4 rounded-2xl border hover:border-blue-400 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition ${subCardBg}`}
                >
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-md bg-blue-600 text-white text-[11px] font-black">
                        {at.questionPrefix} {q.orderIndex}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                          darkMode ? 'bg-slate-700 text-slate-200' : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {q.categoryLabel}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[11px] font-extrabold">
                        {at.correctAnsBadge}: {q.correctOptionId}
                      </span>
                      {q.promptAudioUrl && (
                        <span className="px-2 py-0.5 rounded-md bg-sky-100 text-sky-800 text-[10px] font-bold">
                          {at.mp3Badge}
                        </span>
                      )}
                      {q.promptVideoUrl && (
                        <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 text-[10px] font-bold">
                          {at.videoBadge}
                        </span>
                      )}
                    </div>

                    <div className={`text-xs sm:text-sm font-extrabold ${textPrimary}`}>
                      {q.promptText}
                    </div>
                    {q.statementText && (
                      <div className="text-xs font-bold text-amber-500">📌 {q.statementText}</div>
                    )}

                    <div className="flex flex-wrap gap-2 pt-1">
                      {(q.options || []).map((opt: any) => (
                        <span
                          key={opt.id}
                          className={`text-[11px] px-2.5 py-1 rounded-lg border ${
                            opt.id === q.correctOptionId
                              ? 'bg-emerald-50 border-emerald-400 text-emerald-900 font-extrabold'
                              : darkMode
                              ? 'bg-slate-900 border-slate-700 text-slate-300'
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
                        title={at.testListenBtn}
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => openEditQuestionModal(q)}
                      className={`px-3 py-2 rounded-xl border hover:border-blue-500 font-bold text-xs flex items-center gap-1 ${inputBg}`}
                    >
                      <Edit3 className="w-3.5 h-3.5" /> {at.editBtn}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteQuestion(q.id, q.orderIndex)}
                      className={`p-2 rounded-xl border hover:border-rose-500 text-slate-400 hover:text-rose-500 ${inputBg}`}
                      title={at.deleteBtnTitle}
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

      {/* ================= HỆ THỐNG PUSH NOTIFICATION PWA (CHIA ĐỀU REQUEST - KHÔNG GỬI DỒN CÙNG LÚC) ================= */}
      {pushStatus && (
        <div className={`rounded-3xl p-4 sm:p-6 border shadow-sm backdrop-blur-md space-y-5 ${cardBg}`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-200/60 dark:border-slate-800">
            <div>
              <h3 className={`text-sm sm:text-base font-black flex items-center gap-2 ${textPrimary}`}>
                <BellRing className="w-5 h-5 text-amber-500" />
                3. Lịch Push PWA Chống Tràn Lan (3 Khung Giờ Cố Định / Ngày & Chia Đều Request)
              </h3>
              <p className={`text-xs mt-0.5 ${textSecondary}`}>
                Chống làm phiền user khi thứ hạng hoặc bài học thay đổi liên tục: Mỗi ngày chỉ gửi đúng{' '}
                <strong>1 lần buổi sáng ({morningHour}:00 - Có bài mới)</strong>,{' '}
                <strong>1 lần 19h tối ({eveningTop1Hour}:00 - Top 1 hiện tại)</strong> và{' '}
                <strong>1 lần 23h đêm ({nightUnstudiedHour}:00 - Nhắc USER chưa làm bài)</strong>, chia đều từng request.
              </p>
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
                  ? `Đang chia đều: còn ${pushStatus.queueStatus.pendingRequestsCount} request...`
                  : `${pushStatus.stats?.totalPwaDevices || 0} Thiết bị cài PWA sẵn sàng`}
              </span>
            </div>
          </div>

          {/* 3 Khung giờ Push cố định trong ngày (Chống spam thông báo tràn lan) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {/* Khung 1: Buổi sáng — Có bài mới */}
            <div className={`p-4 rounded-2xl border flex flex-col justify-between space-y-3 ${subCardBg}`}>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-600 text-white">
                    🌅 Buổi sáng ({String(morningHour).padStart(2, '0')}:00) • 1 lần/ngày
                  </span>
                  <span
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                      pushStatus.queueStatus?.sentToday?.morningNewDay
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {pushStatus.queueStatus?.sentToday?.morningNewDay ? '✓ Đã gửi hôm nay' : 'Chưa gửi hôm nay'}
                  </span>
                </div>
                <h4 className={`text-sm font-black ${textPrimary}`}>
                  🔓 Có bài mới (Mở khóa ngày học)
                </h4>
                <p className={`text-xs leading-relaxed ${textSecondary}`}>
                  Chỉ thông báo <strong>1 lần vào buổi sáng</strong> (hoặc lần mở khóa đầu tiên trong ngày). Rải đều request tới{' '}
                  <strong>{pushStatus.stats?.totalPwaDevices || 0} thiết bị PWA</strong>.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleTriggerPush('NEW_DAY_UNLOCKED')}
                className="w-full py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-sm transition"
              >
                <Send className="w-3.5 h-3.5" />
                {pushStatus.queueStatus?.sentToday?.morningNewDay
                  ? `Đã gửi sáng nay (Bấm để gửi lại Day ${selectedDay})`
                  : `Push "Có bài mới" (Day ${selectedDay})`}
              </button>
            </div>

            {/* Khung 2: 19h tối — Thông báo Top 1 hiện tại */}
            <div className={`p-4 rounded-2xl border flex flex-col justify-between space-y-3 ${subCardBg}`}>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950">
                    🌆 {String(eveningTop1Hour).padStart(2, '0')}h Tối • 1 lần/ngày
                  </span>
                  <span
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                      pushStatus.queueStatus?.sentToday?.evening19hTop1
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {pushStatus.queueStatus?.sentToday?.evening19hTop1 ? '✓ Đã gửi hôm nay' : 'Chờ 19h tối'}
                  </span>
                </div>
                <h4 className={`text-sm font-black ${textPrimary}`}>
                  👑 Thông báo Top 1 hiện tại ({eveningTop1Hour}h tối)
                </h4>
                <p className={`text-xs leading-relaxed ${textSecondary}`}>
                  Không bắn thông báo liên tục mỗi khi đổi ngôi trong ngày. Đúng <strong>{eveningTop1Hour}:00 tối</strong> mới tổng hợp vinh danh Top 1 hiện tại:{' '}
                  <strong>
                    {pushStatus.stats?.currentTop1?.fullName || 'Chưa có'} (
                    {pushStatus.stats?.currentTop1?.totalScore?.toLocaleString() || 0}đ)
                  </strong>
                  .
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleTriggerPush('NEW_TOP_1')}
                className="w-full py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-sm transition"
              >
                <Trophy className="w-3.5 h-3.5" />
                {pushStatus.queueStatus?.sentToday?.evening19hTop1
                  ? 'Đã gửi bản tin 19h (Bấm để gửi lại)'
                  : 'Push Bản tin Top 1 hiện tại (19h)'}
              </button>
            </div>

            {/* Khung 3: 23h đêm — Thông báo cho những ai là USER mà chưa làm bài */}
            <div className={`p-4 rounded-2xl border flex flex-col justify-between space-y-3 ${subCardBg}`}>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-rose-600 text-white">
                    🌙 {String(nightUnstudiedHour).padStart(2, '0')}h Đêm • Chỉ USER chưa làm
                  </span>
                  <span
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                      pushStatus.queueStatus?.sentToday?.night23hUnstudied
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {pushStatus.queueStatus?.sentToday?.night23hUnstudied ? '✓ Đã gửi hôm nay' : 'Chờ 23h đêm'}
                  </span>
                </div>
                <h4 className={`text-sm font-black ${textPrimary}`}>
                  ⏰ Nhắc USER chưa làm bài ({nightUnstudiedHour}h đêm)
                </h4>
                <p className={`text-xs leading-relaxed ${textSecondary}`}>
                  Đúng <strong>{nightUnstudiedHour}:00 đêm</strong> chỉ lọc các tài khoản có <code>role = USER</code> cài PWA mà chưa hoàn thành bài ({' '}
                  <strong className="text-rose-500">
                    {pushStatus.stats?.unstudiedAccountsCount || 0} USER
                  </strong>{' '}
                  chưa làm {pushStatus.stats?.latestUnlockedDay?.title || 'bài hôm nay'}).
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleTriggerPush('UNSTUDIED_REMINDER')}
                className="w-full py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-sm transition"
              >
                <BellRing className="w-3.5 h-3.5" />
                {pushStatus.queueStatus?.sentToday?.night23hUnstudied
                  ? `Đã nhắc lúc 23h (Bấm để gửi lại ${pushStatus.stats?.unstudiedAccountsCount || 0} USER)`
                  : `Push Nhắc ${pushStatus.stats?.unstudiedAccountsCount || 0} USER chưa làm (23h)`}
              </button>
            </div>
          </div>

          {/* Bộ điều khiển Khung Giờ & Tốc độ chia đều Request (Staggered Rate-Limit Config) */}
          <div className={`p-4 rounded-2xl border space-y-3 ${subCardBg}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className={`text-xs sm:text-sm font-black ${textPrimary}`}>
                  ⚙️ Cấu hình 3 Khung Giờ Trong Ngày & Chia Đều Request (Không gửi dồn cùng lúc)
                </h4>
                <p className={`text-[11px] ${textSecondary}`}>
                  Mỗi khung giờ chỉ tự động kích hoạt tối đa 1 lần/ngày và chia đều khoảng cách giữa từng request để chống quá tải & chống spam thông báo.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <label className="text-xs font-extrabold flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoRemindUnstudied}
                    onChange={(e) => setAutoRemindUnstudied(e.target.checked)}
                  />
                  <span>Bật lịch tự động (Sáng / 19h / 23h)</span>
                </label>
                <button
                  type="button"
                  onClick={() => handleSavePushConfig(true)}
                  className="px-2.5 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-[11px] font-extrabold transition"
                >
                  Đặt lại hạn mức hôm nay
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5">
              <div>
                <label className={`block text-[11px] font-bold mb-1 ${textSecondary}`}>
                  Giờ báo Bài mới (Sáng)
                </label>
                <input
                  type="number"
                  min={0}
                  max={23}
                  value={morningHour}
                  onChange={(e) => setMorningHour(Number(e.target.value))}
                  className={`w-full px-3 py-2 rounded-xl border text-xs sm:text-sm font-bold ${inputBg}`}
                />
              </div>
              <div>
                <label className={`block text-[11px] font-bold mb-1 ${textSecondary}`}>
                  Giờ báo Top 1 (19h tối)
                </label>
                <input
                  type="number"
                  min={0}
                  max={23}
                  value={eveningTop1Hour}
                  onChange={(e) => setEveningTop1Hour(Number(e.target.value))}
                  className={`w-full px-3 py-2 rounded-xl border text-xs sm:text-sm font-bold ${inputBg}`}
                />
              </div>
              <div>
                <label className={`block text-[11px] font-bold mb-1 ${textSecondary}`}>
                  Giờ nhắc USER (23h đêm)
                </label>
                <input
                  type="number"
                  min={0}
                  max={23}
                  value={nightUnstudiedHour}
                  onChange={(e) => setNightUnstudiedHour(Number(e.target.value))}
                  className={`w-full px-3 py-2 rounded-xl border text-xs sm:text-sm font-bold ${inputBg}`}
                />
              </div>
              <div>
                <label className={`block text-[11px] font-bold mb-1 ${textSecondary}`}>
                  Tổng khung rải đều (giây)
                </label>
                <input
                  type="number"
                  min={3}
                  max={3600}
                  value={spreadWindowSeconds}
                  onChange={(e) => setSpreadWindowSeconds(Number(e.target.value))}
                  className={`w-full px-3 py-2 rounded-xl border text-xs sm:text-sm font-bold ${inputBg}`}
                />
              </div>
              <div>
                <label className={`block text-[11px] font-bold mb-1 ${textSecondary}`}>
                  Cách nhau tối thiểu (ms)
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
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => handleSavePushConfig(false)}
                  className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 h-[38px]"
                >
                  <Save className="w-3.5 h-3.5" />
                  Lưu cấu hình
                </button>
              </div>
            </div>
          </div>

          {/* Danh sách tài khoản cài PWA chưa học & Tiến độ chiến dịch Push đang rải đều */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Cột trái: Danh sách những ai có tài khoản PWA mà chưa học */}
            <div className={`lg:col-span-5 p-4 rounded-2xl border space-y-2.5 ${subCardBg}`}>
              <div className="flex items-center justify-between">
                <h4 className={`text-xs font-black uppercase tracking-wider ${textPrimary}`}>
                  📋 Danh sách USER cài PWA chưa làm bài ({pushStatus.stats?.unstudiedAccountsCount || 0})
                </h4>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                  Nhắc lúc {nightUnstudiedHour}h đêm
                </span>
              </div>

              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {(pushStatus.stats?.unstudiedAccounts || []).length === 0 ? (
                  <p className="text-xs text-emerald-600 font-bold py-4 text-center">
                    🎉 Tất cả tài khoản cài PWA đều đã hoàn thành bài học hôm nay!
                  </p>
                ) : (
                  (pushStatus.stats?.unstudiedAccounts || []).map((u: any) => (
                    <div
                      key={u.id}
                      className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs ${
                        darkMode
                          ? 'bg-slate-900/70 border-slate-700'
                          : 'bg-white border-slate-200'
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
                            ? '⚠️ Có tài khoản nhưng chưa học ngày nào (0/30)'
                            : `Đã học ${u.completedDays}/30 ngày • Chưa làm ${u.targetDayTitle}`}
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

            {/* Cột phải: Tiến độ rải đều Request thời gian thực (Staggered Queue Monitor) */}
            <div className={`lg:col-span-7 p-4 rounded-2xl border space-y-2.5 ${subCardBg}`}>
              <div className="flex items-center justify-between">
                <h4 className={`text-xs font-black uppercase tracking-wider ${textPrimary}`}>
                  📡 Tiến độ rải đều Request Push (Trực tiếp từng nhịp)
                </h4>
                <span className={`text-[10px] font-bold ${textSecondary}`}>
                  Tuần tự 1 request / nhịp
                </span>
              </div>

              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                {(pushStatus.campaigns || []).length === 0 ? (
                  <p className={`text-xs py-6 text-center ${textSecondary}`}>
                    Chưa có chiến dịch Push nào. Hãy bấm 1 trong 3 nút Push bên trên hoặc mở khóa ngày mới để xem các request được chia đều!
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
                          darkMode
                            ? 'bg-slate-900/70 border-slate-700'
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className={`font-extrabold truncate ${textPrimary}`}>
                            {camp.title}
                          </span>
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

                        {/* Thanh tiến trình nhảy từng request một */}
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
      )}

      {/* ================= 4. LÁ CHẮN AN NINH & PHÒNG THỦ TẤN CÔNG (SQL INJECTION, CHỐNG F12, CHỐNG DDOS) ================= */}
      <div className={`rounded-3xl p-4 sm:p-6 border shadow-sm backdrop-blur-md space-y-5 ${cardBg}`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-200/60 dark:border-slate-800">
          <div>
            <h3 className={`text-sm sm:text-base font-black flex items-center gap-2 ${textPrimary}`}>
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
              4. Lá Chắn An Ninh & Phòng Thủ Tấn Công Cao Cấp (SQL Injection, Chống F12, Chống DDoS)
            </h3>
            <p className={`text-xs mt-0.5 ${textSecondary}`}>
              Bảo vệ đa lớp: WAF đệ quy chống SQLi, chặn phím F12 & DevTools chống lộ đề thi / gian lận, và cơ chế IP Jail tự động triệt tiêu DDoS.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="px-3 py-1.5 rounded-xl text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              Hệ thống bảo vệ đang BẬT
            </span>
          </div>
        </div>

        {/* 3 Cột chức năng an ninh trọng điểm */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* Cột 1: Chống SQL Injection */}
          <div className={`p-4 rounded-2xl border flex flex-col justify-between space-y-3 ${subCardBg}`}>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-600 text-white">
                  Lớp WAF • Mức Tối Đa
                </span>
                <span className="text-xs font-black text-indigo-500">24/7 Active</span>
              </div>
              <h4 className={`text-sm font-black flex items-center gap-1.5 ${textPrimary}`}>
                🛡️ Chống SQL Injection
              </h4>
              <p className={`text-xs leading-relaxed ${textSecondary}`}>
                Bộ lọc WAF quét sâu đệ quy mọi URL, Query, Route Params, Headers và Body JSON.
              </p>
              <ul className="text-[11px] space-y-1 font-bold text-slate-600 dark:text-slate-300">
                <li className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  ✓ Chặn <code>UNION SELECT</code> & DDL (<code>DROP</code>, <code>ALTER</code>)
                </li>
                <li className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  ✓ Chặn Tautology (<code>' OR '1'='1</code>, <code>admin'--</code>)
                </li>
                <li className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  ✓ Chặn Time-based Blind (<code>pg_sleep</code>, <code>benchmark</code>)
                </li>
                <li className="flex items-center gap-1 text-rose-500">
                  ⚡ Phát hiện SQLi phạt 3 strikes = Khóa IP lập tức
                </li>
              </ul>
            </div>
            <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-[10px] text-slate-500">
              Trạng thái: <strong>Tự động phân tích & từ chối HTTP 403</strong>
            </div>
          </div>

          {/* Cột 2: Không cho F12 & Chống Gian Lận */}
          <div className={`p-4 rounded-2xl border flex flex-col justify-between space-y-3 ${subCardBg}`}>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-rose-600 text-white">
                  Phía Client • Toàn Cục
                </span>
                <span className="text-xs font-black text-rose-500">Anti-Cheat</span>
              </div>
              <h4 className={`text-sm font-black flex items-center gap-1.5 ${textPrimary}`}>
                🚫 Chống F12 & DevTools
              </h4>
              <p className={`text-xs leading-relaxed ${textSecondary}`}>
                Chống người thi xem đáp án ẩn, soi mã nguồn hoặc gian lận điểm số.
              </p>
              <ul className="text-[11px] space-y-1 font-bold text-slate-600 dark:text-slate-300">
                <li className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  ✓ Chặn phím <code>F12</code>, <code>Ctrl+Shift+I/J/C</code>, <code>Ctrl+U</code>
                </li>
                <li className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  ✓ Vô hiệu hóa chuột phải (Context Menu)
                </li>
                <li className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  ✓ Bẫy phát hiện mở DevTools (Window Metrics & Console Trap)
                </li>
                <li className="flex items-center gap-1 text-amber-500">
                  ⚠️ Hiển thị màn hình chắn cảnh báo khi phát hiện mở DevTools
                </li>
              </ul>
            </div>
            <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-[10px] text-slate-500">
              Trạng thái: <strong>Vô hiệu hóa Console & Tắt Source Maps</strong>
            </div>
          </div>

          {/* Cột 3: Chống DDoS & Bot Scanners */}
          <div className={`p-4 rounded-2xl border flex flex-col justify-between space-y-3 ${subCardBg}`}>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950">
                  Tầng Mạng • IP Jail
                </span>
                <span className="text-xs font-black text-amber-500">DDoS Defense</span>
              </div>
              <h4 className={`text-sm font-black flex items-center gap-1.5 ${textPrimary}`}>
                ⚡ Chống DDoS & Bot Scanners
              </h4>
              <p className={`text-xs leading-relaxed ${textSecondary}`}>
                Tự động ngăn chặn lũ lụt request, tấn công Slowloris và cạn kiệt tài nguyên.
              </p>
              <ul className="text-[11px] space-y-1 font-bold text-slate-600 dark:text-slate-300">
                <li className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  ✓ Rate-limit phân tầng (Auth: 8-10 req/10p, API: 120 req/p)
                </li>
                <li className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  ✓ Chặn đứng Bot dò quét <code>.env</code>, <code>.git</code>, <code>wp-admin</code>
                </li>
                <li className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  ✓ Chặn Burst Flood (&gt;35 req/giây từ 1 IP)
                </li>
                <li className="flex items-center gap-1 text-indigo-500">
                  🛡️ Timeouts chống Slowloris (10s) & Body Limit nghiêm ngặt
                </li>
              </ul>
            </div>
            <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-[10px] text-slate-500">
              Trạng thái: <strong>Tự động giam IP vi phạm (30 phút)</strong>
            </div>
          </div>
        </div>

        {/* Danh sách IP đang bị khóa (IP Threat Jail) */}
        <div className={`p-4 rounded-2xl border space-y-3 ${subCardBg}`}>
          <div className="flex items-center justify-between">
            <div>
              <h4 className={`text-xs sm:text-sm font-black flex items-center gap-1.5 ${textPrimary}`}>
                🔒 Danh sách IP Đang Bị Khóa Tạm Thời (IP Jail)
              </h4>
              <p className={`text-[11px] ${textSecondary}`}>
                Các IP cố tình tấn công SQL Injection, quét file hệ thống hoặc vi phạm tần suất sẽ bị ngắt kết nối ngay từ tầng tiếp nhận để tiết kiệm 100% tài nguyên server.
              </p>
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
                🎉 Không có địa chỉ IP nào đang bị cấm. Hệ thống đang vận hành an toàn và ổn định!
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
                    onClick={() => handleUnbanIp(item.ip)}
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

      {/* ================= MODAL CƠ CHẾ KHÓA NGÀY THI KHI ĐANG CÓ NGƯỜI LÀM ================= */}
      {showLockConfirmModal && dayDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-3xl p-6 shadow-2xl border space-y-4 ${cardBg}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h3 className={`text-base font-black ${textPrimary}`}>
                    {at.lockModalTitle} {dayDetail.title}
                  </h3>
                  <p className={`text-xs ${textSecondary}`}>
                    {at.lockModalSubPrefix} <strong>{activePlayersCount}</strong>{' '}
                    {at.lockModalSubSuffix}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowLockConfirmModal(false)}
                className={`p-1.5 rounded-full ${subCardBg}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <button
                type="button"
                onClick={() => handleLockOrUnlockDay(false, 'GRACEFUL')}
                className={`w-full p-4 rounded-2xl border-2 border-blue-600 text-left transition space-y-1 ${
                  darkMode ? 'bg-blue-950/60 hover:bg-blue-900/70' : 'bg-blue-50/70 hover:bg-blue-100'
                }`}
              >
                <div className="font-black text-blue-600 text-sm flex items-center justify-between">
                  <span>{at.gracefulTitle}</span>
                  <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full">
                    {at.safeBadge}
                  </span>
                </div>
                <p className={`leading-relaxed ${textSecondary}`}>{at.gracefulDesc}</p>
              </button>

              <button
                type="button"
                onClick={() => handleLockOrUnlockDay(false, 'FORCE')}
                className={`w-full p-4 rounded-2xl border-2 border-rose-400 text-left transition space-y-1 ${
                  darkMode ? 'bg-rose-950/50 hover:bg-rose-900/60' : 'bg-rose-50/60 hover:bg-rose-100/70'
                }`}
              >
                <div className="font-black text-rose-600 text-sm">{at.forceTitle}</div>
                <p className={`leading-relaxed ${textSecondary}`}>{at.forceDesc}</p>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL THÊM / SỬA CÂU HỎI ================= */}
      {editingQuestion && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <form
            onSubmit={handleSaveQuestion}
            className={`w-full max-w-2xl rounded-3xl p-5 sm:p-6 shadow-2xl border space-y-4 my-auto max-h-[92vh] overflow-y-auto ${cardBg}`}
          >
            <div
              className={`flex items-center justify-between pb-3 border-b ${
                darkMode ? 'border-slate-800' : 'border-slate-100'
              }`}
            >
              <h3 className={`text-base sm:text-lg font-black ${textPrimary}`}>
                {isCreatingNew
                  ? `${at.modalAddTitle} ${selectedDay}`
                  : `${at.modalEditTitle} ${editingQuestion.orderIndex} (Day ${selectedDay})`}
              </h3>
              <button
                type="button"
                onClick={() => setEditingQuestion(null)}
                className={`p-2 rounded-full ${subCardBg}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 1. Loại câu hỏi */}
            <div>
              <label className={`block text-xs font-bold mb-1 ${textSecondary}`}>
                {at.questionTypeLabel}
              </label>
              <select
                value={editingQuestion.questionType}
                onChange={(e) => handleQuestionTypeChange(e.target.value)}
                className={`w-full px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm font-bold ${inputBg}`}
              >
                {at.types.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Nội dung câu hỏi (Chữ) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className={`block text-xs font-bold mb-1 ${textSecondary}`}>
                  {at.promptTextLabel}
                </label>
                <input
                  type="text"
                  value={editingQuestion.promptText}
                  onChange={(e) =>
                    setEditingQuestion({ ...editingQuestion, promptText: e.target.value })
                  }
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm ${inputBg}`}
                />
              </div>
              <div>
                <label className={`block text-xs font-bold mb-1 ${textSecondary}`}>
                  {at.targetWordLabel}
                </label>
                <input
                  type="text"
                  value={editingQuestion.targetWord || ''}
                  onChange={(e) =>
                    setEditingQuestion({ ...editingQuestion, targetWord: e.target.value })
                  }
                  placeholder="Yield rate / M. E. G."
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-bold ${inputBg}`}
                />
              </div>
            </div>

            {editingQuestion.questionType === 'TRUE_FALSE' && (
              <div>
                <label className="block text-xs font-bold text-amber-500 mb-1">
                  {at.statementTextLabel}
                </label>
                <input
                  type="text"
                  value={editingQuestion.statementText || ''}
                  onChange={(e) =>
                    setEditingQuestion({ ...editingQuestion, statementText: e.target.value })
                  }
                  className={`w-full px-3.5 py-2.5 rounded-xl border border-amber-400 text-sm font-bold ${inputBg}`}
                />
              </div>
            )}

            {/* 3. Cài đặt ÂM THANH (Audio) & VIDEO cho Câu hỏi */}
            <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl border ${subCardBg}`}>
              {/* Cột Audio Câu hỏi */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className={`text-xs font-extrabold flex items-center gap-1 ${textPrimary}`}>
                    <Volume2 className="w-4 h-4 text-blue-500" /> {at.promptAudioTitle}
                  </label>
                  <label className={`text-[11px] font-bold flex items-center gap-1 cursor-pointer ${textSecondary}`}>
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
                    {at.showSpeakerLabel}
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
                  placeholder=".mp3 URL..."
                  className={`w-full px-3 py-2 rounded-xl border text-xs ${inputBg}`}
                />

                <div className="flex items-center gap-2">
                  <label className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer flex items-center gap-1">
                    <Upload className="w-3.5 h-3.5" />
                    {uploadingField === 'promptAudio' ? at.uploadingText : at.uploadAudioBtn}
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
                    className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold ${inputBg}`}
                  >
                    {at.testListenBtn}
                  </button>
                </div>
              </div>

              {/* Cột Video Câu hỏi */}
              <div className="space-y-2">
                <label className={`text-xs font-extrabold flex items-center gap-1 ${textPrimary}`}>
                  <Video className="w-4 h-4 text-purple-500" /> {at.promptVideoTitle}
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
                  placeholder=".mp4 URL..."
                  className={`w-full px-3 py-2 rounded-xl border text-xs ${inputBg}`}
                />

                <div className="flex items-center gap-2">
                  <label className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold cursor-pointer flex items-center gap-1">
                    <Upload className="w-3.5 h-3.5" />
                    {uploadingField === 'promptVideo' ? at.uploadingText : at.uploadVideoBtn}
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
                      className="text-xs text-rose-500 font-bold"
                    >
                      {at.removeVideoBtn}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Xem trước Video nếu có */}
            {editingQuestion.promptVideoUrl && (
              <div className="rounded-2xl overflow-hidden bg-slate-950 max-h-48 flex justify-center">
                <video
                  src={editingQuestion.promptVideoUrl}
                  controls
                  className="max-h-44 w-auto"
                />
              </div>
            )}

            {/* 4. Danh sách Đáp án & Chọn đáp án đúng */}
            <div className="space-y-2.5">
              <label className={`block text-xs font-extrabold ${textPrimary}`}>
                {at.optionsSectionLabel}
              </label>

              {(editingQuestion.options || []).map((opt: any, idx: number) => {
                const isCorrect = editingQuestion.correctOptionId === opt.id;
                return (
                  <div
                    key={opt.id}
                    className={`p-3 rounded-2xl border space-y-2 ${
                      isCorrect
                        ? darkMode
                          ? 'bg-emerald-950/50 border-emerald-500'
                          : 'bg-emerald-50/70 border-emerald-400'
                        : subCardBg
                    }`}
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
                            : darkMode
                            ? 'bg-slate-700 text-slate-300'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {opt.id} {isCorrect ? at.correctSelectedBadge : ''}
                      </button>

                      <input
                        type="text"
                        value={opt.text}
                        onChange={(e) => {
                          const newOpts = [...editingQuestion.options];
                          newOpts[idx] = { ...newOpts[idx], text: e.target.value };
                          setEditingQuestion({ ...editingQuestion, options: newOpts });
                        }}
                        placeholder={`${opt.id}...`}
                        className={`flex-1 min-w-[160px] px-3 py-1.5 rounded-xl border text-xs sm:text-sm font-bold ${inputBg}`}
                      />

                      <label className="text-[11px] font-bold text-blue-500 flex items-center gap-1 cursor-pointer">
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
                        {at.hasOptionSpeaker} {opt.id}
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
                          placeholder="TTS (e.g. approval)"
                          className={`sm:col-span-4 px-2.5 py-1.5 rounded-lg border text-xs ${inputBg}`}
                        />
                        <input
                          type="text"
                          value={opt.audioUrl || ''}
                          onChange={(e) => {
                            const newOpts = [...editingQuestion.options];
                            newOpts[idx] = { ...newOpts[idx], audioUrl: e.target.value };
                            setEditingQuestion({ ...editingQuestion, options: newOpts });
                          }}
                          placeholder=".mp3 URL"
                          className={`sm:col-span-5 px-2.5 py-1.5 rounded-lg border text-xs ${inputBg}`}
                        />
                        <div className="sm:col-span-3 flex items-center gap-1">
                          <label className="px-2.5 py-1.5 rounded-lg bg-blue-600 text-white text-[11px] font-bold cursor-pointer">
                            {uploadingField === `opt-${opt.id}` ? '...' : 'MP3'}
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
                            className={`p-1.5 rounded-lg border ${inputBg}`}
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
              <label className={`block text-xs font-bold mb-1 ${textSecondary}`}>
                {at.explanationLabel}
              </label>
              <textarea
                rows={2}
                value={editingQuestion.explanation || ''}
                onChange={(e) =>
                  setEditingQuestion({ ...editingQuestion, explanation: e.target.value })
                }
                className={`w-full px-3.5 py-2 rounded-xl border text-xs sm:text-sm ${inputBg}`}
              />
            </div>

            <div
              className={`flex items-center justify-end gap-2 pt-3 border-t ${
                darkMode ? 'border-slate-800' : 'border-slate-100'
              }`}
            >
              <button
                type="button"
                onClick={() => setEditingQuestion(null)}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs ${subCardBg}`}
              >
                {at.cancelBtn}
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs sm:text-sm shadow-md flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" /> {at.saveQuestionBtn}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

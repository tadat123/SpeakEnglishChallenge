import React, { useEffect, useState, useMemo } from 'react';
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
  BarChart3,
  Search,
  Filter,
  Sparkles,
  Laptop,
  Tablet,
  Eye,
  EyeOff,
  RotateCcw,
  Layers,
  Calendar,
  Award,
  ArrowLeft,
  Menu,
  LogOut,
  Sun,
  Moon,
  Loader2,
  FileSpreadsheet,
  FileUp,
  AlertCircle,
  Check,
  ExternalLink,
  Image as ImageIcon,
  Clapperboard,
  CalendarDays,
  Bell,
  Flame,
  Target,
  Gift,
  Play,
} from 'lucide-react';
import { playPronunciation } from '../utils/audio';
import { resolveMediaUrl } from '../utils/clientApiFallback';
import { Lang } from '../utils/i18n';
import { WORKPLACE_5_WORDS, WorkplaceWordItem } from './PronunciationChallengeQ11';
import { EventPopupItem } from './SpeakRightEventsPopup';

interface AdminDashboardProps {
  token: string;
  challenges: any[];
  onRefreshGlobal: () => void;
  onEventsChange?: (events: EventPopupItem[]) => void;
  onExportCsv: () => void;
  lang: Lang;
  darkMode: boolean;
  user?: any;
  onBackToUserMode?: () => void;
  onToggleDarkMode?: () => void;
  onChangeLang?: (l: Lang) => void;
  onLogout?: () => void;
}

const ADMIN_I18N = {
  vi: {
    headerTitle: '21 Ngày Thi & Đề Thi',
    headerSub: '',
    reseedBtn: 'Reset Seed',
    exportBtn: 'Xuất Excel',
    selectDayTitle: 'Chọn Ngày Thi (Day 1 → Day 21):',
    openStatus: '🔓 Mở',
    lockedStatus: '🔒 Khóa',
    dayTitleLabel: 'Tên ngày thi',
    dayDateLabel: 'Ngày tháng',
    saveDayMetaBtn: 'Lưu',
    activePlayersLabel: 'đang làm bài',
    lockDayBtn: 'Khóa',
    unlockDayBtn: 'Mở khóa',
    nowSuffix: 'ngay',
    liveBannerTitle: '🟢 Đang có người làm bài trên',
    liveBannerProtection: 'Bảo vệ Snapshot đề thi',
    questionListTitle: 'Danh Sách Câu Hỏi',
    questionsCountUnit: 'câu',
    questionListSub: '',
    cloneAllBtn: 'Sao chép sang 21 ngày',
    bulkImportBtn: 'Nhập Excel / CSV',
    addQuestionBtn: 'Thêm Câu Hỏi',
    questionPrefix: 'Câu',
    correctAnsBadge: 'Đáp án đúng',
    mp3Badge: '🎵 MP3',
    videoBadge: '🎬 Video',
    editBtn: 'Sửa',
    deleteBtnTitle: 'Xóa câu hỏi',
    lockModalTitle: 'Tùy chọn Khóa',
    lockModalSubPrefix: 'Hiện có',
    lockModalSubSuffix: 'nhân viên đang làm bài',
    gracefulTitle: 'Khóa Mềm / Ân hạn',
    safeBadge: 'An toàn',
    gracefulDesc:
      'Chặn bắt đầu lượt mới, cho phép người đang làm dở hoàn thành nốt.',
    forceTitle: 'Khóa Cưỡng Chế',
    forceDesc:
      'Dừng ngay lập tức các phiên đang thi dở. Không mất lượt thi.',
    modalAddTitle: '➕ Thêm Câu Hỏi Mới vào Day',
    modalEditTitle: '✏️ Chỉnh sửa Câu',
    questionTypeLabel: 'Dạng câu hỏi *',
    promptTextLabel: 'Nội dung câu hỏi *',
    targetWordLabel: 'Từ phát âm mẫu',
    statementTextLabel: 'Nhận định (True / False)',
    promptAudioTitle: 'Âm thanh đề bài',
    showSpeakerLabel: 'Hiện nút Loa',
    uploadAudioBtn: 'Tải file Audio',
    uploadingText: 'Đang tải...',
    testListenBtn: '🔊 Nghe thử',
    promptVideoTitle: 'Video đề bài',
    uploadVideoBtn: 'Tải Video',
    removeVideoBtn: 'Xóa Video',
    optionsSectionLabel: 'Phương án trả lời:',
    correctSelectedBadge: '(Đáp án Đúng)',
    hasOptionSpeaker: 'Có nút Loa',
    explanationLabel: 'Giải thích chi tiết',
    cancelBtn: 'Hủy',
    saveQuestionBtn: 'Lưu Câu Hỏi',
    types: [
      {
        value: 'CHOOSE_AUDIO',
        label: 'Multiple Choice (3 đáp án)',
      },
      {
        value: 'TRUE_FALSE',
        label: 'True / False (Đúng / Sai)',
      },
      {
        value: 'LISTEN_AND_CHOOSE',
        label: 'Nghe audio / Video (3 đáp án)',
      },
      {
        value: 'VOCAB_MEANING',
        label: 'Nghĩa của từ / Viết tắt (3 đáp án)',
      },
      {
        value: 'FILL_IN_THE_BLANK',
        label: 'Điền từ (Fill in the blank)',
      },
    ],
    sidebarDashboard: 'Dashboard',
    sidebarDashboardSub: '',
    sidebarUsers: 'Nhân Viên',
    sidebarUsersSub: '',
    sidebarChallenges: 'Đề Thi 21 Ngày',
    sidebarChallengesSub: '',
    sidebarEvents: 'Pop-up Sự Kiện',
    sidebarEventsSub: '',
    sidebarNotifications: 'Thông Báo',
    sidebarNotificationsSub: '',
    sidebarSecurity: 'Bảo Mật',
    sidebarSecuritySub: '',
    backToQuiz: 'Về Chỗ Làm Bài',
    backToQuizShort: 'Làm bài',
  },
  en: {
    headerTitle: '21-Day Challenge & Quiz',
    headerSub: '',
    reseedBtn: 'Reset Defaults',
    exportBtn: 'Export Excel',
    selectDayTitle: 'Select Day (Day 1 → Day 21):',
    openStatus: '🔓 Open',
    lockedStatus: '🔒 Locked',
    dayTitleLabel: 'Day Title',
    dayDateLabel: 'Display Date',
    saveDayMetaBtn: 'Save',
    activePlayersLabel: 'active players',
    lockDayBtn: 'Lock',
    unlockDayBtn: 'Unlock',
    nowSuffix: 'now',
    liveBannerTitle: '🟢 Active users on',
    liveBannerProtection: 'Snapshot Protection Active',
    questionListTitle: 'Question List',
    questionsCountUnit: 'questions',
    questionListSub: '',
    cloneAllBtn: 'Copy to 21 days',
    bulkImportBtn: 'Import Excel / CSV',
    addQuestionBtn: 'Add Question',
    questionPrefix: 'Q',
    correctAnsBadge: 'Correct',
    mp3Badge: '🎵 MP3',
    videoBadge: '🎬 Video',
    editBtn: 'Edit',
    deleteBtnTitle: 'Delete question',
    lockModalTitle: 'Lock Options',
    lockModalSubPrefix: 'Currently',
    lockModalSubSuffix: 'users taking quiz',
    gracefulTitle: '🛡️ Graceful Lock (Recommended)',
    safeBadge: 'Safe',
    gracefulDesc:
      'Block new starts, allow in-progress users to finish (up to 15 mins).',
    forceTitle: '🚨 Force Lock Immediately',
    forceDesc:
      'Stop all active sessions immediately without consuming attempts.',
    modalAddTitle: '➕ Add Question to Day',
    modalEditTitle: '✏️ Edit Question',
    questionTypeLabel: 'Question Type *',
    promptTextLabel: 'Question Prompt *',
    targetWordLabel: 'Target Word/Phrase',
    statementTextLabel: 'Statement (True / False)',
    promptAudioTitle: 'Audio',
    showSpeakerLabel: 'Show speaker button',
    uploadAudioBtn: 'Upload Audio',
    uploadingText: 'Uploading...',
    testListenBtn: '🔊 Preview',
    promptVideoTitle: 'Video (.MP4 / Link)',
    uploadVideoBtn: 'Upload Video',
    removeVideoBtn: 'Remove Video',
    optionsSectionLabel: 'Answer Options:',
    correctSelectedBadge: '(Correct)',
    hasOptionSpeaker: 'Has speaker',
    explanationLabel: 'Explanation',
    cancelBtn: 'Cancel',
    saveQuestionBtn: 'Save Question',
    types: [
      {
        value: 'CHOOSE_AUDIO',
        label: 'Multiple Choice (3 options)',
      },
      {
        value: 'TRUE_FALSE',
        label: 'True / False',
      },
      {
        value: 'LISTEN_AND_CHOOSE',
        label: 'Audio / Video (3 options)',
      },
      {
        value: 'VOCAB_MEANING',
        label: 'Vocabulary / Acronym',
      },
      {
        value: 'FILL_IN_THE_BLANK',
        label: 'Fill in the blank',
      },
    ],
    sidebarDashboard: 'Dashboard',
    sidebarDashboardSub: '',
    sidebarUsers: 'Users',
    sidebarUsersSub: '',
    sidebarChallenges: '21-Day Quiz',
    sidebarChallengesSub: '',
    sidebarEvents: 'Event Pop-ups',
    sidebarEventsSub: '',
    sidebarNotifications: 'Notifications',
    sidebarNotificationsSub: '',
    sidebarSecurity: 'Security',
    sidebarSecuritySub: '',
    backToQuiz: 'Back to Quiz',
    backToQuizShort: 'Quiz',
  },
  ko: {
    headerTitle: '21일 챌린지 및 문제 관리',
    headerSub: '',
    reseedBtn: '초기화',
    exportBtn: '엑셀 내보내기',
    selectDayTitle: '챌린지 날짜 선택 (Day 1 → Day 21):',
    openStatus: '🔓 열림',
    lockedStatus: '🔒 잠김',
    dayTitleLabel: '일차 제목',
    dayDateLabel: '표시 날짜',
    saveDayMetaBtn: '저장',
    activePlayersLabel: '명 응시 중',
    lockDayBtn: '잠금',
    unlockDayBtn: '잠금 해제',
    nowSuffix: '즉시',
    liveBannerTitle: '🟢 응시 중인 임직원:',
    liveBannerProtection: '스냅샷 보호 활성화',
    questionListTitle: '문제 목록',
    questionsCountUnit: '문항',
    questionListSub: '',
    cloneAllBtn: '21일 전체 복사',
    bulkImportBtn: 'Excel / CSV 등록',
    addQuestionBtn: '새 문제 추가',
    questionPrefix: '문항',
    correctAnsBadge: '정답',
    mp3Badge: '🎵 MP3',
    videoBadge: '🎬 비디오',
    editBtn: '수정',
    deleteBtnTitle: '문제 삭제',
    lockModalTitle: '잠금 옵션',
    lockModalSubPrefix: '현재',
    lockModalSubSuffix: '명 응시 중',
    gracefulTitle: '소프트 잠금 (권장)',
    safeBadge: '안전',
    gracefulDesc:
      '신규 진입 차단, 현재 응시자는 제출 허용.',
    forceTitle: '즉시 강제 잠금',
    forceDesc:
      '진행 중인 모든 세션 즉시 중단.',
    modalAddTitle: '➕ 새 문제 추가 - Day',
    modalEditTitle: '✏️ 문제 수정 - 문항',
    questionTypeLabel: '문제 유형 *',
    promptTextLabel: '문제 내용 *',
    targetWordLabel: '발음 단어 / 구문',
    statementTextLabel: '진술문 (True / False)',
    promptAudioTitle: '오디오',
    showSpeakerLabel: '스피커 표시',
    uploadAudioBtn: '오디오 업로드',
    uploadingText: '업로드 중...',
    testListenBtn: '🔊 듣기',
    promptVideoTitle: '비디오',
    uploadVideoBtn: '비디오 업로드',
    removeVideoBtn: '비디오 삭제',
    optionsSectionLabel: '답안 보기:',
    correctSelectedBadge: '(정답)',
    hasOptionSpeaker: '스피커',
    explanationLabel: '상세 해설',
    cancelBtn: '취소',
    saveQuestionBtn: '문제 저장',
    types: [
      {
        value: 'CHOOSE_AUDIO',
        label: '객관식 (3개 보기)',
      },
      {
        value: 'TRUE_FALSE',
        label: 'True / False (참/거짓)',
      },
      {
        value: 'LISTEN_AND_CHOOSE',
        label: '듣기 / 비디오 (3개 보기)',
      },
      {
        value: 'VOCAB_MEANING',
        label: '단어 의미 / 약어 (3개 보기)',
      },
      {
        value: 'FILL_IN_THE_BLANK',
        label: '빈칸 채우기',
      },
    ],
    sidebarDashboard: '대시보드',
    sidebarDashboardSub: '',
    sidebarUsers: '임직원',
    sidebarUsersSub: '',
    sidebarChallenges: '21일 챌린지',
    sidebarChallengesSub: '',
    sidebarEvents: '이벤트 팝업',
    sidebarEventsSub: '',
    sidebarNotifications: '알림',
    sidebarNotificationsSub: '',
    sidebarSecurity: '보안',
    sidebarSecuritySub: '',
    backToQuiz: '시험 화면으로',
    backToQuizShort: '시험',
  },
};

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  token,
  challenges,
  onRefreshGlobal,
  onEventsChange,
  onExportCsv,
  lang,
  darkMode,
  user,
  onBackToUserMode,
  onToggleDarkMode,
  onChangeLang,
  onLogout,
}) => {
  const at = ADMIN_I18N[lang];
  const baseUrl = import.meta.env.BASE_URL || '/';
  // Quản lý các Sub-Tab của Admin CMS
  type AdminSubTab = 'dashboard' | 'users' | 'challenges' | 'events' | 'notifications' | 'security';
  const [adminSubTab, setAdminSubTab] = useState<AdminSubTab>('dashboard');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);

  // Thống kê Dashboard & Tỉ lệ hoàn thành
  const [dashboardStats, setDashboardStats] = useState<any | null>(null);
  const [selectedStatDay, setSelectedStatDay] = useState<number>(1);
  const [loadingStats, setLoadingStats] = useState<boolean>(false);

  // Quản lý Danh sách Người dùng & Tìm kiếm
  const [userList, setUserList] = useState<any[]>([]);
  const [allUsersList, setAllUsersList] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState<string>('');
  const [userDeptFilter, setUserDeptFilter] = useState<string>('ALL');
  const [loadingUsers, setLoadingUsers] = useState<boolean>(false);
  const [inspectingUser, setInspectingUser] = useState<any | null>(null);

  // Danh sách phòng ban khả dụng (chuẩn hóa theo dữ liệu thực tế)
  const availableDepartments = useMemo(() => {
    const defaultDepts = [
      'HR & Training',
      'Quality Assurance (QA)',
      'Production',
      'R&D Center',
      'IT & System',
      'Logistics & Supply',
    ];
    const sourceUsers = allUsersList.length > 0 ? allUsersList : userList;
    const fromUsers = sourceUsers.map((u) => u.department).filter(Boolean);
    return Array.from(new Set([...defaultDepts, ...fromUsers])).sort();
  }, [allUsersList, userList]);

  // Soạn & Gửi thông báo cá nhân hóa (Personalized Notifications)
  const [notifTargetType, setNotifTargetType] = useState<'all' | 'department' | 'user'>('all');
  const [notifTargetValue, setNotifTargetValue] = useState<string>('');
  const [notifTitle, setNotifTitle] = useState<string>('🎉 Chúc mừng {name} đã hoàn thành xuất sắc!');
  const [notifBody, setNotifBody] = useState<string>(
    'Chào {name} (GEN {gen}), bạn hiện có {score} điểm! Hãy tiếp tục duy trì phong độ hôm nay nhé! 🚀'
  );
  const [notifTargetUrl, setNotifTargetUrl] = useState<string>('#challenges');
  const [sendingNotif, setSendingNotif] = useState<boolean>(false);

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
  const [morningMinute, setMorningMinute] = useState<number>(0);
  const [eveningTop1Hour, setEveningTop1Hour] = useState<number>(19);
  const [eveningTop1Minute, setEveningTop1Minute] = useState<number>(0);
  const [nightUnstudiedHour, setNightUnstudiedHour] = useState<number>(23);
  const [nightUnstudiedMinute, setNightUnstudiedMinute] = useState<number>(0);

  // Quản lý Bộ từ vựng Luyện Đọc Câu 11 (5 từ)
  const [showQ11Modal, setShowQ11Modal] = useState<boolean>(false);
  const [editingQ11Words, setEditingQ11Words] = useState<WorkplaceWordItem[]>([]);
  const [cloneQ11ToAllDays, setCloneQ11ToAllDays] = useState<boolean>(false);

  // Quản lý Nhập đề thi hàng loạt từ Excel / CSV
  const [showBulkModal, setShowBulkModal] = useState<boolean>(false);
  const [bulkRawText, setBulkRawText] = useState<string>('');
  const [bulkTargetMode, setBulkTargetMode] = useState<'auto' | 'current'>('auto');
  const [bulkWriteMode, setBulkWriteMode] = useState<'overwrite' | 'append'>('overwrite');
  const [bulkLoading, setBulkLoading] = useState<boolean>(false);

  // Quản lý Pop-up Sự Kiện (CRUD + Toggle Ẩn/Hiện)
  const [eventList, setEventList] = useState<EventPopupItem[]>([]);
  const [loadingEvents, setLoadingEvents] = useState<boolean>(false);
  const [editingEvent, setEditingEvent] = useState<EventPopupItem | null>(null);
  const [showEventModal, setShowEventModal] = useState<boolean>(false);
  const [isCreatingEvent, setIsCreatingEvent] = useState<boolean>(false);
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
  const [togglingEventId, setTogglingEventId] = useState<string | null>(null);
  const [uploadingEventImg, setUploadingEventImg] = useState<boolean>(false);

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
          setMorningMinute(data.queueStatus.config.morningMinute ?? 0);
          setEveningTop1Hour(data.queueStatus.config.eveningTop1Hour ?? 19);
          setEveningTop1Minute(data.queueStatus.config.eveningTop1Minute ?? 0);
          setNightUnstudiedHour(data.queueStatus.config.nightUnstudiedHour ?? 23);
          setNightUnstudiedMinute(data.queueStatus.config.nightUnstudiedMinute ?? 0);
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

  const fetchDashboardStats = async (day = selectedStatDay) => {
    setLoadingStats(true);
    try {
      const res = await fetch(`/api/admin/dashboard/stats?day=${day}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setDashboardStats(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchAdminUsers = async () => {
    setLoadingUsers(true);
    try {
      const q = encodeURIComponent(userSearch);
      const dept = encodeURIComponent(userDeptFilter);
      const res = await fetch(`/api/admin/users?search=${q}&department=${dept}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const users = data.users || [];
        setUserList(users);
        if (!userSearch.trim() && userDeptFilter === 'ALL') {
          setAllUsersList(users);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingUsers(false);
    }
  };

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

  const handleSendPersonalizedNotif = async () => {
    if (!notifTitle.trim() || !notifBody.trim()) {
      showMessage('Vui lòng nhập đầy đủ tiêu đề và nội dung thông báo', true);
      return;
    }
    if (notifTargetType === 'department' && !notifTargetValue) {
      showMessage('Vui lòng chọn Phòng Ban nhận thông báo', true);
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

  useEffect(() => {
    fetchDashboardStats(selectedStatDay);
    fetchAdminUsers();
    fetchAdminEvents();
    // Tải toàn bộ danh sách nhân viên không bị lọc phục vụ dropdown thông báo
    fetch('/api/admin/users?search=&department=ALL', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d?.users)) {
          setAllUsersList(d.users);
        }
      })
      .catch(() => null);
  }, []);

  useEffect(() => {
    fetchDashboardStats(selectedStatDay);
  }, [selectedStatDay]);

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
    try {
      const res = await fetch(`/api/admin/challenges/${selectedDay}/unlock`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          unlockNow,
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
            isUnlocked: data.isUnlocked !== undefined ? data.isUnlocked : unlockNow,
          };
        });
        fetchDayDetail(selectedDay);
        fetchPushStatus(false);
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

  const handleStartChallengeSchedule = async (options: {
    startFromDayNumber?: number;
    lockPreviousDays?: boolean;
    lockAllUntilStart?: boolean;
  }) => {
    const targetDay = options.startFromDayNumber || 1;
    const confirmText = options.lockAllUntilStart
      ? 'Bạn có chắc muốn KHÓA TOÀN BỘ 21 ngày thử thách (chờ đến khi bấm Start Challenge) không?'
      : targetDay === 1
      ? '🚀 Bắt đầu hành trình 21 ngày tính từ HÔM NAY (Day 1 mở ngay hôm nay, các ngày Day 2 → Day 21 sẽ khóa lại và tự động mở lần lượt lúc 00:00 mỗi ngày tiếp theo)?'
      : `🚀 Bắt đầu mở thử thách tính từ Day ${targetDay} = HÔM NAY (Day ${targetDay} mở ngay, các ngày sau Day ${targetDay} sẽ khóa lại và tự động mở lần lượt lúc 00:00 mỗi ngày tiếp theo)?`;

    if (!window.confirm(confirmText)) return;

    try {
      const res = await fetch('/api/admin/challenges/start-schedule', {
        method: 'POST',
        headers,
        body: JSON.stringify(options),
      });
      const data = await res.json();
      if (res.ok) {
        showMessage(data.message || 'Đã cập nhật lịch trình 21 ngày thành công!');
        fetchDayDetail(selectedDay);
        fetchDashboardStats(selectedStatDay);
        onRefreshGlobal();
      } else {
        showMessage(data.message || 'Không thể cập nhật lịch trình 21 ngày!', true);
      }
    } catch (e: any) {
      showMessage(e?.message || 'Lỗi kết nối máy chủ!', true);
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

  const currentQ11Words: WorkplaceWordItem[] =
    dayDetail?.q11Words && dayDetail.q11Words.length > 0
      ? dayDetail.q11Words
      : WORKPLACE_5_WORDS;

  const openEditQ11Modal = () => {
    setEditingQ11Words(JSON.parse(JSON.stringify(currentQ11Words)));
    setCloneQ11ToAllDays(false);
    setShowQ11Modal(true);
  };

  const handleSaveQ11Words = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/challenges/${selectedDay}/q11-words`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          q11Words: editingQ11Words,
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
    if (!window.confirm(`Delete #${orderIndex} from Day ${selectedDay}?`)) {
      return;
    }
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
    if (!window.confirm(`Clone all questions of Day ${selectedDay} to all 21 days?`)) {
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
    if (!window.confirm('Reset all 21 days to the default 10 official questions?')) {
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

  // Tải file mẫu CSV / Excel để nhập câu hỏi hàng loạt
  const handleDownloadTemplate = () => {
    const csvHeader =
      'DayNumber,OrderIndex,QuestionType,CategoryLabel,PromptText,StatementText,TargetWord,OptionA,OptionB,OptionC,OptionD,CorrectOption,Explanation,Points,PromptAudioUrl,PromptVideoUrl';

    const sampleRows = [
      '1,1,CHOOSE_AUDIO,Phát âm chuẩn,"Từ ""Approval"" được phát âm như thế nào? Nghe các phương án và chọn cách phát âm chuẩn nhất.",,/əˈpruːvəl/,Approval,Approval (sai trọng âm),Approval (sai âm cuối),,A,"Từ \'Approval\' có trọng âm rơi vào âm tiết thứ 2 (/əˈpruːvəl/).",10,,',
      '1,2,TRUE_FALSE,True / False,"Nghe câu sau và xác định nhận định là Đúng hay Sai:","\'Schedule\' chỉ có 1 cách phát âm duy nhất trong tiếng Anh quốc tế.",schedule,True – Đúng,False – Sai,,,B,"Sai vì từ \'schedule\' có 2 cách đọc chuẩn: /ˈskedʒuːl/ (Mỹ) và /ˈʃedʒuːl/ (Anh).",10,,',
      '1,3,LISTEN_AND_CHOOSE,Nghe & Chọn đáp án,"Nghe đoạn âm thanh sau và chọn từ được nhắc tới trong ngữ cảnh công việc.",,collaboration,collaboration,corporation,celebration,,A,"Từ được phát âm trong đoạn audio là \'collaboration\' (sự hợp tác).",10,,',
      '1,4,VOCAB_MEANING,Từ vựng công sở,"Trong môi trường doanh nghiệp, từ viết tắt \'KPI\' có nghĩa là gì?",,KPI,Key Performance Indicator,Knowledge Process Integration,Key Project Initiative,Key Product Index,A,"KPI là viết tắt của Key Performance Indicator (Chỉ số đo lường hiệu quả công việc cốt lõi).",10,,',
      '1,5,FILL_IN_THE_BLANK,Điền từ vựng,"Điền từ tiếng Anh tương ứng với định nghĩa và phiên âm sau:","/ˌrekəˈmend/ (Đưa ra gợi ý, giới thiệu giải pháp)",recommend,,,,recommend,"Từ đúng chính tả là \'recommend\' (2 chữ \'m\' và 1 chữ \'c\').",10,,',
      '2,1,LISTEN_AND_CHOOSE,Phát âm công sở,"Chọn cách phát âm đúng của từ ""Deadline"".",,deadline,Deadline (/ˈdedlaɪn/),Dead line (/ded ˈlaɪn/),Deline (/ˈdiːlaɪn/),,A,"Trọng âm rơi vào âm tiết đầu tiên /ˈdedlaɪn/.",10,,',
    ];

    const blob = new Blob(['\uFEFF' + [csvHeader, ...sampleRows].join('\r\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'SpeakRight_Questions_Template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Đọc file CSV / TSV từ máy tính
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setBulkRawText(content);
      }
    };
    reader.readAsText(file, 'utf-8');
    e.target.value = '';
  };

  // Nạp dữ liệu mẫu vào ô nhập
  const handleLoadSampleData = () => {
    const csvHeader =
      'DayNumber,OrderIndex,QuestionType,CategoryLabel,PromptText,StatementText,TargetWord,OptionA,OptionB,OptionC,OptionD,CorrectOption,Explanation,Points,PromptAudioUrl,PromptVideoUrl';

    const sampleRows = [
      '1,1,CHOOSE_AUDIO,Phát âm chuẩn,"Từ ""Approval"" được phát âm như thế nào? Nghe các phương án và chọn cách phát âm chuẩn nhất.",,/əˈpruːvəl/,Approval,Approval (sai trọng âm),Approval (sai âm cuối),,A,"Từ \'Approval\' có trọng âm rơi vào âm tiết thứ 2 (/əˈpruːvəl/).",10,,',
      '1,2,TRUE_FALSE,True / False,"Nghe câu sau và xác định nhận định là Đúng hay Sai:","\'Schedule\' chỉ có 1 cách phát âm duy nhất trong tiếng Anh quốc tế.",schedule,True – Đúng,False – Sai,,,B,"Sai vì từ \'schedule\' có 2 cách đọc chuẩn: /ˈskedʒuːl/ (Mỹ) và /ˈʃedʒuːl/ (Anh).",10,,',
      '1,3,LISTEN_AND_CHOOSE,Nghe & Chọn đáp án,"Nghe đoạn âm thanh sau và chọn từ được nhắc tới trong ngữ cảnh công việc.",,collaboration,collaboration,corporation,celebration,,A,"Từ được phát âm trong đoạn audio là \'collaboration\' (sự hợp tác).",10,,',
      '1,4,VOCAB_MEANING,Từ vựng công sở,"Trong môi trường doanh nghiệp, từ viết tắt \'KPI\' có nghĩa là gì?",,KPI,Key Performance Indicator,Knowledge Process Integration,Key Project Initiative,Key Product Index,A,"KPI là viết tắt của Key Performance Indicator (Chỉ số đo lường hiệu quả công việc cốt lõi).",10,,',
      '1,5,FILL_IN_THE_BLANK,Điền từ vựng,"Điền từ tiếng Anh tương ứng với định nghĩa và phiên âm sau:","/ˌrekəˈmend/ (Đưa ra gợi ý, giới thiệu giải pháp)",recommend,,,,recommend,"Từ đúng chính tả là \'recommend\' (2 chữ \'m\' và 1 chữ \'c\').",10,,',
      '2,1,LISTEN_AND_CHOOSE,Phát âm công sở,"Chọn cách phát âm đúng của từ ""Deadline"".",,deadline,Deadline (/ˈdedlaɪn/),Dead line (/ded ˈlaɪn/),Deline (/ˈdiːlaɪn/),,A,"Trọng âm rơi vào âm tiết đầu tiên /ˈdedlaɪn/.",10,,',
    ];
    setBulkRawText([csvHeader, ...sampleRows].join('\n'));
  };

  // Parser: tách CSV hoặc TSV (copy paste từ Excel)
  const parseBulkText = (text: string) => {
    const clean = text.trim();
    if (!clean) return { parsedList: [], errors: [], dayCounts: {} as Record<number, number> };

    const firstLine = clean.split(/\r?\n/)[0];
    let delimiter = ',';
    if (firstLine.includes('\t')) delimiter = '\t';
    else if (!firstLine.includes(',') && firstLine.includes(';')) delimiter = ';';

    const lines: string[][] = [];
    let currentRow: string[] = [];
    let currentField = '';
    let insideQuotes = false;

    for (let i = 0; i < clean.length; i++) {
      const char = clean[i];
      const nextChar = clean[i + 1];

      if (char === '"') {
        if (insideQuotes && nextChar === '"') {
          currentField += '"';
          i++;
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === delimiter && !insideQuotes) {
        currentRow.push(currentField.trim());
        currentField = '';
      } else if ((char === '\r' || char === '\n') && !insideQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
        currentRow.push(currentField.trim());
        if (currentRow.some((f) => f.length > 0)) {
          lines.push(currentRow);
        }
        currentRow = [];
        currentField = '';
      } else {
        currentField += char;
      }
    }
    if (currentField.length > 0 || currentRow.length > 0) {
      currentRow.push(currentField.trim());
      if (currentRow.some((f) => f.length > 0)) {
        lines.push(currentRow);
      }
    }

    if (lines.length === 0)
      return {
        parsedList: [],
        errors: ['Dữ liệu rỗng.'],
        dayCounts: {} as Record<number, number>,
      };

    const header = lines[0].map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
    const hasHeader = header.some(
      (h) =>
        h.includes('day') ||
        h.includes('prompt') ||
        h.includes('question') ||
        h.includes('option') ||
        h.includes('type')
    );

    const dataRows = hasHeader ? lines.slice(1) : lines;

    const headerMap: Record<string, number> = {};
    if (hasHeader) {
      lines[0].forEach((col, idx) => {
        const key = col.toLowerCase().replace(/[^a-z0-9]/g, '');
        headerMap[key] = idx;
      });
    }

    const getCol = (row: string[], colName: string, defaultIdx: number): string => {
      if (hasHeader) {
        for (const key of Object.keys(headerMap)) {
          if (key.includes(colName)) {
            return row[headerMap[key]] ?? '';
          }
        }
      }
      return row[defaultIdx] ?? '';
    };

    const parsedList: any[] = [];
    const errors: string[] = [];
    const dayCounts: Record<number, number> = {};

    dataRows.forEach((cols, idx) => {
      const lineNum = hasHeader ? idx + 2 : idx + 1;
      const rawDay = parseInt(getCol(cols, 'day', 0), 10);
      const dayNumber =
        !isNaN(rawDay) && rawDay >= 1 && rawDay <= 30
          ? rawDay
          : bulkTargetMode === 'current'
          ? selectedDay
          : 1;
      const orderIndex = parseInt(getCol(cols, 'order', 1), 10) || idx + 1;
      const questionType = getCol(cols, 'type', 2) || 'LISTEN_AND_CHOOSE';
      const categoryLabel = getCol(cols, 'cat', 3);
      const promptText = getCol(cols, 'prompt', 4);
      const statementText = getCol(cols, 'statement', 5);
      const targetWord = getCol(cols, 'target', 6);
      const optionA = getCol(cols, 'optiona', 7);
      const optionB = getCol(cols, 'optionb', 8);
      const optionC = getCol(cols, 'optionc', 9);
      const optionD = getCol(cols, 'optiond', 10);
      const correctOptionId = getCol(cols, 'correct', 11) || 'A';
      const explanation = getCol(cols, 'explanation', 12);
      const points = parseInt(getCol(cols, 'points', 13), 10) || 10;
      const promptAudioUrl = getCol(cols, 'audiourl', 14);
      const promptVideoUrl = getCol(cols, 'videourl', 15);

      if (!promptText.trim()) {
        errors.push(`Dòng ${lineNum}: Thiếu nội dung câu hỏi (PromptText).`);
        return;
      }

      const rowTargetDay = bulkTargetMode === 'current' ? selectedDay : dayNumber;
      dayCounts[rowTargetDay] = (dayCounts[rowTargetDay] || 0) + 1;

      parsedList.push({
        lineNum,
        dayNumber: rowTargetDay,
        orderIndex,
        questionType,
        categoryLabel,
        promptText,
        statementText,
        targetWord,
        optionA,
        optionB,
        optionC,
        optionD,
        correctOptionId,
        explanation,
        points,
        promptAudioUrl,
        promptVideoUrl,
      });
    });

    return { parsedList, errors, dayCounts };
  };

  const {
    parsedList: bulkParsedQuestions,
    errors: bulkParseErrors,
    dayCounts: bulkDayCounts,
  } = parseBulkText(bulkRawText);

  // Gửi request bulk import lên server
  const handleExecuteBulkImport = async () => {
    if (bulkParsedQuestions.length === 0) {
      showMessage('Chưa có câu hỏi hợp lệ nào để nhập!', true);
      return;
    }

    const affectedDaysList = Object.keys(bulkDayCounts)
      .map(Number)
      .sort((a, b) => a - b);
    const confirmMsg =
      bulkWriteMode === 'overwrite'
        ? `⚠️ CẢNH BÁO: Chế độ GHI ĐÈ sẽ XÓA TOÀN BỘ câu hỏi cũ của các ngày (${affectedDaysList
            .map((d) => `Day ${d}`)
            .join(', ')}) và thay bằng ${
            bulkParsedQuestions.length
          } câu hỏi mới.\n\nBạn có chắc chắn muốn tiến hành?`
        : `Bạn có muốn nhập ${bulkParsedQuestions.length} câu hỏi vào các ngày (${affectedDaysList
            .map((d) => `Day ${d}`)
            .join(', ')})?`;

    if (!window.confirm(confirmMsg)) {
      return;
    }

    setBulkLoading(true);
    try {
      const res = await fetch('/api/admin/challenges/bulk-import', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          questions: bulkParsedQuestions,
          mode: bulkWriteMode,
          targetDayNumber: bulkTargetMode === 'current' ? selectedDay : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Lỗi khi nhập câu hỏi hàng loạt.');
      }

      showMessage(data.message || `Đã nhập thành công ${data.totalImported} câu hỏi!`);
      setShowBulkModal(false);
      setBulkRawText('');
      fetchDayDetail(selectedDay);
      onRefreshGlobal();
    } catch (err: any) {
      showMessage(err.message || 'Lỗi kết nối máy chủ khi nhập đề bulk!', true);
    } finally {
      setBulkLoading(false);
    }
  };

  // ==================== QUẢN LÝ POP-UP SỰ KIỆN (CRUD & TOGGLE ẨN/HIỆN) ====================
  const fetchAdminEvents = async () => {
    setLoadingEvents(true);
    try {
      const res = await fetch('/api/admin/events', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: 'no-store',
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.events)) {
          setEventList(data.events);
          onEventsChange?.(data.events);
        }
      }
    } catch (err) {
      console.error('Lỗi khi tải danh sách sự kiện:', err);
    } finally {
      setLoadingEvents(false);
    }
  };

  const handleToggleEvent = async (ev: EventPopupItem) => {
    setTogglingEventId(ev.id);
    try {
      const res = await fetch(`/api/admin/events/${ev.id}/toggle`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
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
    } catch (err) {
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
    } catch (err) {
      showMessage('Lỗi kết nối máy chủ khi lưu sự kiện!', true);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/events/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
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
    } catch (err) {
      showMessage('Lỗi kết nối khi xóa sự kiện!', true);
    }
  };

  const handleResetEvents = async () => {
    if (
      !window.confirm(
        'Bạn có chắc chắn muốn khôi phục danh sách về 3 Sự Kiện Mặc Định (Ring The Golden Bell, Dub It Right, Daily Challenge) không?'
      )
    ) {
      return;
    }
    try {
      const res = await fetch('/api/admin/events/reset', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
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
    } catch (err) {
      showMessage('Lỗi kết nối máy chủ khi reset sự kiện!', true);
    }
  };

  const compressImageIfNeeded = (file: File, maxWidth = 1200, quality = 0.85): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Không thể đọc file ảnh'));
      reader.onload = () => {
        const rawDataUrl = reader.result as string;
        // Giữ nguyên ảnh GIF động hoặc SVG để không mất hiệu ứng động
        if (file.type === 'image/gif' || file.type === 'image/svg+xml') {
          resolve(rawDataUrl);
          return;
        }
        const img = new Image();
        img.onerror = () => resolve(rawDataUrl);
        img.onload = () => {
          try {
            let width = img.width;
            let height = img.height;
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              resolve(rawDataUrl);
              return;
            }
            ctx.drawImage(img, 0, 0, width, height);
            const outMime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
            const compressed = canvas.toDataURL(outMime, quality);
            resolve(compressed.length < rawDataUrl.length ? compressed : rawDataUrl);
          } catch {
            resolve(rawDataUrl);
          }
        };
        img.src = rawDataUrl;
      };
      reader.readAsDataURL(file);
    });
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
      // Cập nhật hiển thị ngay lập tức bằng base64 đã tối ưu để Admin thấy ảnh đổi tức thì
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
        // Nếu upload file rời bị nghẽn mạng, vẫn giữ base64Data đã nén trong editingEvent.img để lưu thẳng vào DB
      }
      showMessage('Đã tải ảnh sự kiện lên thành công! Hãy bấm "Lưu thay đổi" để áp dụng.');
    } catch {
      showMessage('Lỗi khi xử lý ảnh tải lên!', true);
    } finally {
      setUploadingEventImg(false);
    }
  };

  const handleUploadQ11WordImage = async (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      showMessage('Ảnh / GIF minh họa không được vượt quá 20MB!', true);
      return;
    }

    try {
      const base64Data = await compressImageIfNeeded(file, 800, 0.85);
      setEditingQ11Words((prev) => {
        const next = [...prev];
        if (next[idx]) {
          next[idx] = { ...next[idx], imageUrl: base64Data };
        }
        return next;
      });

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
            setEditingQ11Words((prev) => {
              const next = [...prev];
              if (next[idx]) {
                next[idx] = { ...next[idx], imageUrl: data.url };
              }
              return next;
            });
          }
        }
      } catch {
        // Giữ nguyên base64Data nếu không gọi được API upload-media
      }
      showMessage(`Đã tải ảnh/GIF minh họa cho từ #${idx + 1}!`);
    } catch {
      showMessage('Không thể đọc file ảnh/GIF!', true);
    }
  };

  const activePlayersCount = dayDetail?.activePlayers?.length || 0;

  const ADMIN_SIDEBAR_ITEMS: {
    id: AdminSubTab;
    label: string;
    sub: string;
    icon: any;
    badge?: string | number | null;
  }[] = [
    {
      id: 'dashboard',
      label: at.sidebarDashboard,
      sub: at.sidebarDashboardSub,
      icon: BarChart3,
      badge: null,
    },
    {
      id: 'users',
      label: at.sidebarUsers,
      sub: at.sidebarUsersSub,
      icon: Users,
      badge: userList.length || null,
    },
    {
      id: 'challenges',
      label: at.sidebarChallenges,
      sub: at.sidebarChallengesSub,
      icon: Edit3,
      badge: '21D',
    },
    {
      id: 'events',
      label: at.sidebarEvents,
      sub: at.sidebarEventsSub,
      icon: Sparkles,
      badge:
        eventList.length > 0
          ? `${eventList.filter((e) => e.isVisible !== false).length}/${eventList.length}`
          : null,
    },
    {
      id: 'notifications',
      label: at.sidebarNotifications,
      sub: at.sidebarNotificationsSub,
      icon: BellRing,
      badge: 'Push',
    },
    {
      id: 'security',
      label: at.sidebarSecurity,
      sub: at.sidebarSecuritySub,
      icon: ShieldCheck,
      badge:
        (securityStats?.threatStats?.totalBannedCount || 0) > 0
          ? `${securityStats.threatStats.totalBannedCount} ban`
          : 'Safe',
    },
  ];

  return (
    <div
      className={`min-h-screen flex flex-col md:flex-row relative transition-colors ${
        darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-100/70 text-slate-800'
      }`}
    >
      {/* Thông báo Toast Nổi */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 p-3.5 rounded-2xl bg-emerald-500 text-white text-xs sm:text-sm font-extrabold flex items-center gap-2 shadow-2xl">
          <span>✅ {toast}</span>
          <button onClick={() => setToast('')} className="text-white/80 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {errorToast && (
        <div className="fixed top-4 right-4 z-50 p-3.5 rounded-2xl bg-red-500 text-white text-xs sm:text-sm font-extrabold flex items-center gap-2 shadow-2xl">
          <span>⚠️ {errorToast}</span>
          <button onClick={() => setErrorToast('')} className="text-white/80 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Backdrop trên Mobile khi mở Sidebar */}
      {mobileSidebarOpen && (
        <div
          onClick={() => setMobileSidebarOpen(false)}
          className="md:hidden fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm"
        />
      )}

      {/* ================= SIDEBAR (DESKTOP CỐ ĐỊNH & MOBILE DRAWER) ================= */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-50 md:z-20 h-screen w-72 shrink-0 border-r backdrop-blur-xl flex flex-col justify-between transition-transform duration-300 ${
          darkMode
            ? 'bg-slate-900/95 border-slate-800 text-white'
            : 'bg-white/95 border-slate-200 text-slate-900 shadow-sm'
        } ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
      >
        {/* Phần đầu Sidebar */}
        <div className="p-4 sm:p-5 space-y-4 border-b border-slate-200/60 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <img
                src={`${import.meta.env.BASE_URL || '/'}logo.png`}
                alt="Speak Right"
                className="w-10 h-10 object-contain drop-shadow"
              />
              <div>
                <div className="text-xs font-black text-blue-600 dark:text-blue-400">
                  SPEAK RIGHT 2026
                </div>
                <div className="text-sm font-black tracking-tight flex items-center gap-1.5">
                  <span>Admin CMS</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-amber-400/90 text-slate-950 font-black">
                    PORTAL
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setMobileSidebarOpen(false)}
              className="md:hidden p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* NÚT CHUYỂN GIAO DIỆN: VỀ CHỖ LÀM KIỂM TRA */}
          <button
            type="button"
            onClick={() => {
              setMobileSidebarOpen(false);
              onBackToUserMode?.();
            }}
            className="w-full py-2.5 px-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 active:scale-95 transition group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span>Về Chỗ Làm Kiểm Tra</span>
          </button>
        </div>

        {/* Menu Điều Hướng (Navigation Items) */}
        <div className="p-3 flex-1 overflow-y-auto space-y-1">
          <div className={`text-[10px] font-black uppercase tracking-wider px-3 py-1.5 ${textSecondary}`}>
            Danh Mục Quản Trị
          </div>
          {ADMIN_SIDEBAR_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = adminSubTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setAdminSubTab(item.id);
                  setMobileSidebarOpen(false);
                  if (item.id === 'dashboard') fetchDashboardStats(selectedStatDay);
                  if (item.id === 'users') fetchAdminUsers();
                  if (item.id === 'events') fetchAdminEvents();
                }}
                className={`w-full p-2.5 rounded-2xl text-left flex items-center justify-between transition group ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 font-black'
                    : darkMode
                    ? 'hover:bg-slate-800/80 text-slate-300 font-bold'
                    : 'hover:bg-blue-50/80 text-slate-700 font-bold'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : darkMode
                        ? 'bg-slate-800 text-blue-400 group-hover:bg-blue-900/40'
                        : 'bg-blue-50 text-blue-600 group-hover:bg-blue-100'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold truncate">{item.label}</span>
                </div>

                {item.badge && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                      isActive
                        ? 'bg-white/25 text-white'
                        : 'bg-blue-100 text-blue-700 dark:bg-slate-800 dark:text-blue-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          <div className="pt-3 mt-3 border-t border-slate-200/60 dark:border-slate-800 space-y-1">
            <div className={`text-[10px] font-black uppercase tracking-wider px-3 py-1 ${textSecondary}`}>
              Tác Vụ Nhanh
            </div>
            <button
              onClick={handleReseed}
              className={`w-full px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
                darkMode ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-700'
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5 text-amber-500" />
              <span>Reset Seed Mặc Định</span>
            </button>
            <button
              onClick={onExportCsv}
              className={`w-full px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
                darkMode ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-700'
              }`}
            >
              <Download className="w-3.5 h-3.5 text-emerald-500" />
              <span>Xuất Excel Trao Giải</span>
            </button>
          </div>
        </div>

        {/* Phần đáy Sidebar: Profile Admin & Setting */}
        <div className="p-3.5 border-t border-slate-200/60 dark:border-slate-800 space-y-2.5">
          <div
            className={`p-2.5 rounded-2xl border flex items-center justify-between gap-2 ${
              darkMode ? 'bg-slate-800/60 border-slate-700/60' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <img
                src={user?.avatarUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=admin'}
                alt=""
                className="w-8 h-8 rounded-full border border-blue-300 shrink-0"
              />
              <div className="min-w-0">
                <div className="text-xs font-black truncate">{user?.fullName || 'Quản trị viên'}</div>
                <div className={`text-[10px] truncate ${textSecondary}`}>
                  GEN: {user?.employeeId || 'ADMIN'} • <strong>SUPER ADMIN</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-0.5">
              {(['vi', 'en', 'ko'] as Lang[]).map((l) => (
                <button
                  key={l}
                  onClick={() => onChangeLang?.(l)}
                  className={`px-1.5 py-1 rounded-lg text-[10px] font-black uppercase transition ${
                    lang === l
                      ? 'bg-blue-600 text-white'
                      : darkMode
                      ? 'text-slate-400 hover:text-white'
                      : 'text-slate-600 hover:text-blue-600'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1">
              {onToggleDarkMode && (
                <button
                  onClick={onToggleDarkMode}
                  className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-blue-600"
                  title="Đổi giao diện Sáng/Tối"
                >
                  {darkMode ? (
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                  ) : (
                    <Moon className="w-3.5 h-3.5 text-slate-600" />
                  )}
                </button>
              )}
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="p-1.5 rounded-xl border border-rose-200 dark:border-rose-900/50 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                  title="Đăng xuất"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* ================= MAIN CONTENT AREA (PHẢI) ================= */}
      <main className="flex-1 min-w-0 flex flex-col min-h-screen">
        <header
          className={`sticky top-0 z-30 px-4 sm:px-6 py-3 border-b backdrop-blur-md flex items-center justify-between gap-3 ${
            darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white/80 border-slate-200'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="md:hidden p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className={`text-base sm:text-lg font-black truncate ${textPrimary}`}>
                {adminSubTab === 'dashboard'
                  ? 'Thống Kê'
                  : adminSubTab === 'users'
                  ? 'Nhân Viên'
                  : adminSubTab === 'challenges'
                  ? 'Đề Thi 21 Ngày'
                  : adminSubTab === 'events'
                  ? 'Pop-up Sự Kiện'
                  : adminSubTab === 'notifications'
                  ? 'Thông Báo'
                  : 'Bảo Mật'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onBackToUserMode}
              className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-950 font-black text-xs shadow-sm flex items-center gap-1.5 transition"
              title={at.backToQuiz}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{at.backToQuiz}</span>
              <span className="sm:hidden">{at.backToQuizShort}</span>
            </button>
          </div>
        </header>

        <div className="p-3 sm:p-6 space-y-4 flex-1">
      {/* ================= 1. TAB DASHBOARD THỐNG KÊ ================= */}
      {adminSubTab === 'dashboard' && (
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
                Toàn bộ 21 ngày
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
                Thang 100đ
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
                  onChange={(e) => setSelectedStatDay(Number(e.target.value))}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-extrabold outline-none ${inputBg}`}
                >
                  {Array.from({ length: 21 }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>
                      Day {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Dải nút chọn ngày nhanh */}
            <div className="grid grid-cols-7 sm:grid-cols-7 gap-1.5">
              {Array.from({ length: 21 }, (_, i) => i + 1).map((d) => {
                const dayStat = dashboardStats?.allDaysStats?.find((s: any) => s.dayNumber === d);
                const isSelected = selectedStatDay === d;
                return (
                  <button
                    key={d}
                    onClick={() => setSelectedStatDay(d)}
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
                      Day {dashboardStats.selectedDayStat.dayNumber}: {dashboardStats.selectedDayStat.title}
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
                    <div className={`text-[11px] ${textSecondary}`}>Đạt chuẩn (≥50đ)</div>
                  </div>
                  <div className={`p-3 rounded-xl border ${cardBg}`}>
                    <div className="text-lg sm:text-xl font-black text-rose-500">
                      {dashboardStats.selectedDayStat.perfectCount}
                    </div>
                    <div className={`text-[11px] ${textSecondary}`}>Điểm 100 tuyệt đối</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bảng Tiến độ Hoàn thành toàn bộ 21 Ngày */}
          <div className={`rounded-3xl p-5 border shadow-sm backdrop-blur-md space-y-3 ${cardBg}`}>
            <h3 className={`text-sm sm:text-base font-black flex items-center gap-2 ${textPrimary}`}>
              <BarChart3 className="w-4 h-4 text-emerald-600" />
              Tiến độ 21 Ngày
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {dashboardStats?.allDaysStats?.map((st: any) => (
                <div
                  key={st.dayNumber}
                  onClick={() => setSelectedStatDay(st.dayNumber)}
                  className={`p-3 rounded-2xl border cursor-pointer hover:border-blue-400 transition ${
                    selectedStatDay === st.dayNumber ? 'border-blue-600 ring-2 ring-blue-500/20' : subCardBg
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                    <span className="text-blue-600">
                      Day {st.dayNumber}: {st.title}
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
      )}

      {/* ================= 2. TAB QUẢN LÝ NHÂN VIÊN (USERS) ================= */}
      {adminSubTab === 'users' && (
        <div className="space-y-4">
          <div className={`rounded-3xl p-5 border shadow-sm backdrop-blur-md space-y-4 ${cardBg}`}>
            {/* Thanh tìm kiếm & lọc bộ phận */}
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
                <select
                  value={userDeptFilter}
                  onChange={(e) => setUserDeptFilter(e.target.value)}
                  className={`px-3 py-2.5 rounded-2xl border text-xs font-bold outline-none ${inputBg}`}
                >
                  <option value="ALL">Tất cả phòng ban</option>
                  <option value="Engineering">Engineering</option>
                  <option value="Quality Assurance">Quality Assurance</option>
                  <option value="Production">Production</option>
                  <option value="Human Resources">Human Resources</option>
                  <option value="Sales & Marketing">Sales & Marketing</option>
                  <option value="General">General</option>
                </select>
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
                    <th className="py-2.5 px-3 font-extrabold">Bộ phận</th>
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
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 dark:bg-slate-800 dark:text-blue-300">
                          {u.department}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-black text-emerald-600">{u.totalScore}đ</div>
                        <div className={`text-[10px] ${textSecondary}`}>{u.completedDays}/21 ngày</div>
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
                            onClick={() => {
                              setAdminSubTab('notifications');
                              setNotifTargetType('user');
                              setNotifTargetValue(u.id);
                              setNotifTitle(`🎉 Chào ${u.fullName}!`);
                              setNotifBody(
                                `Chào ${u.fullName} (GEN ${u.employeeId}), bạn hiện có ${u.totalScore} điểm! Ban tổ chức chúc bạn hoàn thành trọn vẹn thử thách hôm nay nhé! 🚀`
                              );
                            }}
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
        </div>
      )}

      {/* ================= 3. TAB 21 NGÀY & ĐỀ THI (CHALLENGES) ================= */}
      {adminSubTab === 'challenges' && (
        <div className="space-y-4">
      {/* Thanh Điều Khiển Bắt Đầu Giải Đấu (Start Challenge) */}
      <div
        className={`rounded-3xl p-4 sm:p-5 border shadow-sm backdrop-blur-md flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 ${cardBg}`}
      >
        <div className="space-y-1">
          <h3 className={`text-sm sm:text-base font-black flex items-center gap-2 ${textPrimary}`}>
            <Flame className="w-5 h-5 text-amber-500" />
            <span>Điều Khiển Lịch Trình 21 Ngày (Start Challenge)</span>
          </h3>
          <p className={`text-xs leading-relaxed ${textSecondary}`}>
            Bấm <strong>Start Challenge</strong> để đặt ngày bắt đầu tính từ hôm nay: ngày được chọn sẽ <strong>mở ngay</strong>, và toàn bộ các ngày phía sau sẽ <strong>tự động khóa lại & hẹn giờ mở lần lượt vào 00:00 mỗi ngày tiếp theo</strong>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() =>
              handleStartChallengeSchedule({
                startFromDayNumber: 1,
                lockPreviousDays: false,
              })
            }
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-95 text-white font-black text-xs shadow-md flex items-center gap-1.5 transition"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>🚀 Start Challenge (Mở từ Day 1 = Hôm nay)</span>
          </button>

          {selectedDay > 1 && (
            <button
              type="button"
              onClick={() =>
                handleStartChallengeSchedule({
                  startFromDayNumber: selectedDay,
                  lockPreviousDays: true,
                })
              }
              className="px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-xs shadow-sm flex items-center gap-1.5 transition"
              title={`Mở bắt đầu từ Day ${selectedDay} hôm nay, khóa các ngày trước và hẹn lịch tự động cho các ngày sau`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>▶️ Mở bắt đầu từ Day {selectedDay}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() =>
              handleStartChallengeSchedule({
                lockAllUntilStart: true,
              })
            }
            className="px-3 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 transition"
            title="Khóa toàn bộ 21 ngày chờ tới khi bấm Start Challenge"
          >
            <Lock className="w-3.5 h-3.5 text-rose-500" />
            <span>Khóa cả 21 ngày</span>
          </button>
        </div>
      </div>

      {/* Bộ chọn 21 Ngày (Grid nhỏ gọn) */}
      <div className={`rounded-3xl p-4 border shadow-sm backdrop-blur-md ${cardBg}`}>
        <div className={`text-xs font-extrabold mb-2.5 uppercase tracking-wider ${textSecondary}`}>
          {at.selectDayTitle}
        </div>
        <div className="grid grid-cols-7 sm:grid-cols-7 gap-1.5">
          {challenges.slice(0, 21).map((c) => {
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
      {dayDetail ? (
        <div className={`rounded-3xl p-4 sm:p-6 border shadow-sm backdrop-blur-md space-y-5 relative ${cardBg}`}>
          {loadingDay && (
            <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 text-xs font-bold animate-pulse">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Đang đồng bộ...
            </div>
          )}
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

              <button
                type="button"
                onClick={() =>
                  handleStartChallengeSchedule({
                    startFromDayNumber: selectedDay,
                    lockPreviousDays: selectedDay > 1,
                  })
                }
                className="px-3.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-sm transition"
                title={`Đặt ${dayDetail.title} làm ngày hôm nay và mở bắt đầu từ ${dayDetail.title} (các ngày sau tự động khóa chờ tới 00:00 mỗi ngày)`}
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>🚀 Start từ {dayDetail.title}</span>
              </button>

              <button
                type="button"
                onClick={handleToggleRevealResults}
                className={`px-4 py-2.5 rounded-xl text-white font-extrabold text-xs flex items-center gap-1.5 shadow-sm transition ${
                  dayDetail.resultsRevealed || dayDetail.forceRevealed
                    ? 'bg-purple-600 hover:bg-purple-700'
                    : 'bg-amber-600 hover:bg-amber-700'
                }`}
                title={
                  dayDetail.resultsRevealed || dayDetail.forceRevealed
                    ? 'Đáp án & Bảng điểm đang được CÔNG BỐ. Bấm để ẩn lại (chờ 00:00).'
                    : 'Bấm để CÔNG BỐ đáp án & bảng điểm ngay lập tức cho toàn thể nhân viên.'
                }
              >
                <CheckCircle2 className="w-4 h-4" />
                {dayDetail.resultsRevealed || dayDetail.forceRevealed
                  ? '📢 Đã công bố đáp án (Bấm để ẩn)'
                  : '📢 Công bố đáp án ngay'}
              </button>
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
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setShowBulkModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-sm transition"
                  title="Nhập hàng loạt câu hỏi từ file Excel hoặc CSV"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" /> {at.bulkImportBtn || 'Tạo Đề Bulk (Excel / CSV)'}
                </button>
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

                    {q.questionType === 'FILL_IN_THE_BLANK' ? (
                      <div className="pt-1">
                        <span className="text-[11px] px-2.5 py-1 rounded-lg border bg-purple-50 dark:bg-purple-950/60 border-purple-300 dark:border-purple-700 text-purple-900 dark:text-purple-300 font-black">
                          ✍️ Từ cần điền: {q.targetWord || q.correctOptionId}
                        </span>
                      </div>
                    ) : (
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
                    )}
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

          {/* Phần C: Quản lý Bộ từ vựng Luyện Đọc Câu 11 (5 từ) */}
          <div className={`mt-6 p-4 sm:p-5 rounded-2xl border space-y-4 ${subCardBg}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-purple-600 text-white text-xs font-black">
                    Câu 11
                  </span>
                  <h3 className={`text-sm sm:text-base font-black ${textPrimary}`}>
                    Bộ Từ Vựng Luyện Đọc — {dayDetail.title}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={openEditQ11Modal}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-sm transition self-start sm:self-auto"
              >
                <Edit3 className="w-3.5 h-3.5" /> Sửa từ vựng
              </button>
            </div>

            {/* Grid 5 từ vựng Câu 11 */}
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
              {currentQ11Words.map((item, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border flex flex-col justify-between ${
                    darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300">
                        Từ #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => playPronunciation(item.spokenText || item.word)}
                        className="p-1 rounded text-blue-500 hover:bg-blue-50 dark:hover:bg-slate-800"
                        title="Nghe phát âm"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className={`text-sm font-black ${textPrimary}`}>{item.word}</div>
                    <div className="text-[11px] font-mono text-purple-600 dark:text-purple-400 font-bold">
                      {item.ipa}
                    </div>
                    {item.syllables && (
                      <div className="text-[11px] font-extrabold text-indigo-600 dark:text-indigo-300 mt-0.5">
                        🗣️ {item.syllables}
                      </div>
                    )}
                    <div className={`text-xs font-semibold mt-1 ${textSecondary}`}>{item.meaningVi}</div>
                    {item.imageUrl && (
                      <div className="mt-2 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 h-20 bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
                        <img
                          src={resolveMediaUrl(item.imageUrl)}
                          alt={item.word}
                          className="w-full h-full object-contain"
                        />
                      </div>
                    )}
                  </div>
                  {item.tip && (
                    <div className="mt-2 text-[10px] text-amber-600 dark:text-amber-400 italic">
                      💡 {item.tip}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : loadingDay ? (
        <div className={`rounded-3xl p-12 border shadow-sm backdrop-blur-md text-center space-y-3 ${cardBg}`}>
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500" />
          <p className={`text-sm font-bold ${textSecondary}`}>Đang tải chi tiết Day {selectedDay}...</p>
        </div>
      ) : null}
      </div>
      )}

      {/* ================= TAB POP-UP SỰ KIỆN (EVENTS CRUD & VISIBILITY) ================= */}
      {adminSubTab === 'events' && (
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
                        <img
                          src={imgSrc}
                          alt={ev.titleC}
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute top-2 left-2 px-2.5 py-0.5 rounded-lg text-white text-xs font-black bg-blue-600 shadow-md">
                          #{ev.num || String(idx + 1).padStart(2, '0')}
                        </span>
                        <span
                          className={`absolute bottom-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                            isVis
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : 'bg-slate-900/80 text-amber-300'
                          }`}
                        >
                          {isVis ? 'Đang mở' : 'Đang ẩn'}
                        </span>
                      </div>

                      {/* Cột giữa: Chi tiết sự kiện */}
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h3 className={`text-base font-black ${textPrimary}`}>
                            {ev.titleA} {ev.titleB ? `${ev.titleB} ` : ''}{ev.titleC}
                          </h3>
                          <span className="text-xs text-slate-400 font-mono">
                            Thứ tự: {ev.orderIndex ?? idx + 1}
                          </span>
                        </div>

                        <p className={`text-xs leading-relaxed ${textSecondary}`}>
                          {ev.desc}
                        </p>

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

                        {ev.note && (
                          <div className="text-[11px] text-slate-500 truncate">
                            {ev.note}
                          </div>
                        )}
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
        </div>
      )}

      {/* ================= 4. TAB THÔNG BÁO CÁ NHÂN HÓA (NOTIFICATIONS) ================= */}
      {adminSubTab === 'notifications' && (
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
                <label className={`block text-xs font-bold ${textSecondary}`}>
                  Đối tượng
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'all', label: 'Toàn Công Ty' },
                    { id: 'department', label: 'Phòng Ban' },
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

              {/* Lựa chọn Phòng ban hoặc Cá nhân */}
              {notifTargetType === 'department' && (
                <div className="space-y-1">
                  <label className={`block text-xs font-bold ${textSecondary}`}>Phòng Ban:</label>
                  <select
                    value={notifTargetValue}
                    onChange={(e) => setNotifTargetValue(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl border text-xs font-bold outline-none ${inputBg}`}
                  >
                    <option value="">-- Chọn phòng ban nhận tin --</option>
                    {availableDepartments.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>
              )}

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
                        {u.fullName} (GEN: {u.employeeId} — {u.department || 'N/A'} — {u.totalScore || 0}đ)
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
                      setNotifTitle('🔔 Thử thách Speak Right hôm nay đã mở!');
                      setNotifBody(
                        'Chào {name}! Đừng bỏ lỡ bài học hôm nay, hãy dành 5 phút để tích thêm điểm nhé! 🚀'
                      );
                    }}
                    className="px-2.5 py-1.5 rounded-lg border text-[11px] font-bold bg-amber-50 dark:bg-amber-950/40 border-amber-200 text-amber-900 dark:text-amber-300 hover:scale-[1.02] transition"
                  >
                    🔔 Nhắc học
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNotifTitle('🏆 Chúc mừng bạn đã hoàn thành xuất sắc!');
                      setNotifBody(
                        'Chúc mừng {name} (GEN {gen})! Bạn đang có {score} điểm trên bảng xếp hạng. Hãy tiếp tục giữ vững phong độ! ⭐'
                      );
                    }}
                    className="px-2.5 py-1.5 rounded-lg border text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 text-emerald-900 dark:text-emerald-300 hover:scale-[1.02] transition"
                  >
                    🏆 Khen ngợi
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNotifTitle('⏰ Bài thi sắp đóng lúc 00:00!');
                      setNotifBody(
                        'Chào {name}, chỉ còn ít giờ nữa là kết thúc ngày thi. Vào làm bài ngay để không bị ngắt chuỗi 21 ngày nhé! 🔥'
                      );
                    }}
                    className="px-2.5 py-1.5 rounded-lg border text-[11px] font-bold bg-purple-50 dark:bg-purple-950/40 border-purple-200 text-purple-900 dark:text-purple-300 hover:scale-[1.02] transition"
                  >
                    ⏰ Cảnh báo
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
                  {/* Quick Tag Chips */}
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
                <label className={`block text-xs font-bold ${textSecondary}`}>
                  Đường dẫn (URL)
                </label>
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

              {/* Mobile Device Mockup Frame */}
              <div className="w-full max-w-[280px] rounded-[36px] border-4 border-slate-700 bg-slate-950 p-3 shadow-2xl relative">
                {/* Loa thoại / notch */}
                <div className="w-20 h-3.5 bg-slate-800 rounded-full mx-auto mb-3" />

                {/* Màn hình điện thoại */}
                <div className="rounded-[24px] bg-gradient-to-b from-blue-600 via-indigo-700 to-slate-900 p-3 text-white min-h-[360px] flex flex-col justify-between">
                  <div className="flex items-center justify-between text-[10px] text-white/80 font-bold px-1">
                    <span>9:41</span>
                    <span>5G • 100%</span>
                  </div>

                  {/* Notification Card Bubble */}
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

      {/* ================= HỆ THỐNG PUSH NOTIFICATION PWA ================= */}
      {pushStatus && (
        <div className={`rounded-3xl p-4 sm:p-6 border shadow-sm backdrop-blur-md space-y-5 ${cardBg}`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-200/60 dark:border-slate-800">
            <div>
              <h3 className={`text-sm sm:text-base font-black flex items-center gap-2 ${textPrimary}`}>
                <BellRing className="w-5 h-5 text-amber-500" />
                Lịch Thông Báo Tự Động
              </h3>
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
                  ? `Đang gửi: còn ${pushStatus.queueStatus.pendingRequestsCount}...`
                  : `${pushStatus.stats?.totalPwaDevices || 0} Thiết bị PWA`}
              </span>
            </div>
          </div>

          {/* 3 Khung giờ Push trong ngày */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {/* Khung 1: Buổi sáng */}
            <div className={`p-4 rounded-2xl border flex flex-col justify-between space-y-3 ${subCardBg}`}>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-600 text-white">
                    Sáng ({String(morningHour).padStart(2, '0')}:
                    {String(morningMinute).padStart(2, '0')})
                  </span>
                  <span
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                      pushStatus.queueStatus?.sentToday?.morningNewDay
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {pushStatus.queueStatus?.sentToday?.morningNewDay ? 'Đã gửi hôm nay' : 'Chưa gửi'}
                  </span>
                </div>
                <h4 className={`text-sm font-black ${textPrimary}`}>
                  Bài học mới
                </h4>
              </div>
              <button
                type="button"
                onClick={() => handleTriggerPush('NEW_DAY_UNLOCKED')}
                className="w-full py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-sm transition"
              >
                <Send className="w-3.5 h-3.5" />
                {pushStatus.queueStatus?.sentToday?.morningNewDay
                  ? `Gửi lại (Ngày ${selectedDay})`
                  : `Gửi thông báo (Ngày ${selectedDay})`}
              </button>
            </div>

            {/* Khung 2: Thông báo Top 1 */}
            <div className={`p-4 rounded-2xl border flex flex-col justify-between space-y-3 ${subCardBg}`}>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950">
                    Tối ({String(eveningTop1Hour).padStart(2, '0')}:
                    {String(eveningTop1Minute).padStart(2, '0')})
                  </span>
                  <span
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                      pushStatus.queueStatus?.sentToday?.evening19hTop1
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {pushStatus.queueStatus?.sentToday?.evening19hTop1 ? 'Đã gửi hôm nay' : 'Chưa gửi'}
                  </span>
                </div>
                <h4 className={`text-sm font-black ${textPrimary}`}>
                  Vinh danh Top 1
                </h4>
              </div>
              <button
                type="button"
                onClick={() => handleTriggerPush('NEW_TOP_1')}
                className="w-full py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-sm transition"
              >
                <Trophy className="w-3.5 h-3.5" />
                {pushStatus.queueStatus?.sentToday?.evening19hTop1
                  ? 'Gửi lại Top 1'
                  : 'Gửi thông báo Top 1'}
              </button>
            </div>

            {/* Khung 3: Đêm — Nhắc người chưa làm bài */}
            <div className={`p-4 rounded-2xl border flex flex-col justify-between space-y-3 ${subCardBg}`}>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-rose-600 text-white">
                    Đêm ({String(nightUnstudiedHour).padStart(2, '0')}:
                    {String(nightUnstudiedMinute).padStart(2, '0')})
                  </span>
                  <span
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                      pushStatus.queueStatus?.sentToday?.night23hUnstudied
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {pushStatus.queueStatus?.sentToday?.night23hUnstudied ? 'Đã gửi hôm nay' : 'Chưa gửi'}
                  </span>
                </div>
                <h4 className={`text-sm font-black ${textPrimary}`}>
                  Nhắc chưa làm bài ({pushStatus.stats?.unstudiedAccountsCount || 0})
                </h4>
              </div>
              <button
                type="button"
                onClick={() => handleTriggerPush('UNSTUDIED_REMINDER')}
                className="w-full py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-sm transition"
              >
                <BellRing className="w-3.5 h-3.5" />
                {pushStatus.queueStatus?.sentToday?.night23hUnstudied
                  ? 'Gửi lại nhắc nhở'
                  : 'Gửi nhắc nhở'}
              </button>
            </div>
          </div>

          {/* Bộ điều khiển Khung Giờ & Tốc độ */}
          <div className={`p-4 rounded-2xl border space-y-3 ${subCardBg}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className={`text-xs sm:text-sm font-black ${textPrimary}`}>
                  ⚙️ Cài đặt khung giờ & Tốc độ gửi
                </h4>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <label className="text-xs font-extrabold flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoRemindUnstudied}
                    onChange={(e) => setAutoRemindUnstudied(e.target.checked)}
                  />
                  <span>Tự động theo lịch</span>
                </label>
                <button
                  type="button"
                  onClick={() => handleSavePushConfig(true)}
                  className="px-2.5 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-[11px] font-extrabold transition"
                >
                  Đặt lại lượt hôm nay
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
              <div>
                <label className={`block text-[11px] font-bold mb-1 ${textSecondary}`}>
                  Giờ sáng (Bài mới)
                </label>
                <input
                  type="time"
                  value={`${String(morningHour).padStart(2, '0')}:${String(morningMinute).padStart(2, '0')}`}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val && val.includes(':')) {
                      const [h, m] = val.split(':').map(Number);
                      if (!isNaN(h) && !isNaN(m)) {
                        setMorningHour(Math.max(0, Math.min(23, h)));
                        setMorningMinute(Math.max(0, Math.min(59, m)));
                      }
                    }
                  }}
                  style={{ colorScheme: darkMode ? 'dark' : 'light' }}
                  className={`w-full px-2.5 py-2 rounded-xl border text-center text-xs sm:text-sm font-black outline-none tracking-wide cursor-pointer ${inputBg}`}
                />
                <div className="flex items-center justify-between gap-1 mt-1.5">
                  {[0, 15, 30, 45].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMorningMinute(m)}
                      className={`flex-1 py-0.5 rounded text-[10px] font-extrabold transition ${
                        morningMinute === m
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      :{String(m).padStart(2, '0')}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={`block text-[11px] font-bold mb-1 ${textSecondary}`}>
                  Giờ tối (Top 1)
                </label>
                <input
                  type="time"
                  value={`${String(eveningTop1Hour).padStart(2, '0')}:${String(eveningTop1Minute).padStart(2, '0')}`}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val && val.includes(':')) {
                      const [h, m] = val.split(':').map(Number);
                      if (!isNaN(h) && !isNaN(m)) {
                        setEveningTop1Hour(Math.max(0, Math.min(23, h)));
                        setEveningTop1Minute(Math.max(0, Math.min(59, m)));
                      }
                    }
                  }}
                  style={{ colorScheme: darkMode ? 'dark' : 'light' }}
                  className={`w-full px-2.5 py-2 rounded-xl border text-center text-xs sm:text-sm font-black outline-none tracking-wide cursor-pointer ${inputBg}`}
                />
                <div className="flex items-center justify-between gap-1 mt-1.5">
                  {[0, 15, 30, 45].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setEveningTop1Minute(m)}
                      className={`flex-1 py-0.5 rounded text-[10px] font-extrabold transition ${
                        eveningTop1Minute === m
                          ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      :{String(m).padStart(2, '0')}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={`block text-[11px] font-bold mb-1 ${textSecondary}`}>
                  Giờ đêm (Nhắc nhở)
                </label>
                <input
                  type="time"
                  value={`${String(nightUnstudiedHour).padStart(2, '0')}:${String(nightUnstudiedMinute).padStart(2, '0')}`}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val && val.includes(':')) {
                      const [h, m] = val.split(':').map(Number);
                      if (!isNaN(h) && !isNaN(m)) {
                        setNightUnstudiedHour(Math.max(0, Math.min(23, h)));
                        setNightUnstudiedMinute(Math.max(0, Math.min(59, m)));
                      }
                    }
                  }}
                  style={{ colorScheme: darkMode ? 'dark' : 'light' }}
                  className={`w-full px-2.5 py-2 rounded-xl border text-center text-xs sm:text-sm font-black outline-none tracking-wide cursor-pointer ${inputBg}`}
                />
                <div className="flex items-center justify-between gap-1 mt-1.5">
                  {[0, 15, 30, 45].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setNightUnstudiedMinute(m)}
                      className={`flex-1 py-0.5 rounded text-[10px] font-extrabold transition ${
                        nightUnstudiedMinute === m
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      :{String(m).padStart(2, '0')}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={`block text-[11px] font-bold mb-1 ${textSecondary}`}>
                  Thời gian rải đều (giây)
                </label>
                <input
                  type="number"
                  min={3}
                  max={3600}
                  value={spreadWindowSeconds}
                  onChange={(e) => setSpreadWindowSeconds(Number(e.target.value))}
                  className={`w-full px-3 py-2 rounded-xl border text-xs sm:text-sm font-bold ${inputBg}`}
                />
                <div className="flex items-center justify-between gap-1 mt-1.5">
                  {[10, 18, 30, 60].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSpreadWindowSeconds(s)}
                      className={`flex-1 py-0.5 rounded text-[10px] font-bold transition ${
                        spreadWindowSeconds === s
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {s}s
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={`block text-[11px] font-bold mb-1 ${textSecondary}`}>
                  Khoảng cách tối thiểu (ms)
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
                <div className="flex items-center justify-between gap-1 mt-1.5">
                  {[500, 1000, 1200, 2000].map((ms) => (
                    <button
                      key={ms}
                      type="button"
                      onClick={() => setMinIntervalMs(ms)}
                      className={`flex-1 py-0.5 rounded text-[10px] font-bold transition ${
                        minIntervalMs === ms
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {ms >= 1000 ? `${ms / 1000}s` : `${ms}ms`}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col justify-end">
                <button
                  type="button"
                  onClick={() => handleSavePushConfig(false)}
                  className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 h-[38px] shadow-sm transition hover:scale-[1.02]"
                >
                  <Save className="w-3.5 h-3.5" />
                  Lưu cấu hình
                </button>
              </div>
            </div>
          </div>

          {/* Danh sách tài khoản chưa học & Tiến độ gửi */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Cột trái: Chưa học */}
            <div className={`lg:col-span-5 p-4 rounded-2xl border space-y-2.5 ${subCardBg}`}>
              <div className="flex items-center justify-between">
                <h4 className={`text-xs font-black uppercase tracking-wider ${textPrimary}`}>
                  Chưa làm bài ({pushStatus.stats?.unstudiedAccountsCount || 0})
                </h4>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                  {String(nightUnstudiedHour).padStart(2, '0')}:{String(nightUnstudiedMinute).padStart(2, '0')}
                </span>
              </div>

              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {(pushStatus.stats?.unstudiedAccounts || []).length === 0 ? (
                  <p className="text-xs text-emerald-600 font-bold py-4 text-center">
                    Tất cả tài khoản đều đã hoàn thành bài học hôm nay!
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
                            ? 'Chưa học ngày nào (0/21)'
                            : `Đã học ${u.completedDays}/21 ngày`}
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

            {/* Cột phải: Tiến độ */}
            <div className={`lg:col-span-7 p-4 rounded-2xl border space-y-2.5 ${subCardBg}`}>
              <div className="flex items-center justify-between">
                <h4 className={`text-xs font-black uppercase tracking-wider ${textPrimary}`}>
                  Tiến độ gửi thông báo
                </h4>
              </div>

              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                {(pushStatus.campaigns || []).length === 0 ? (
                  <p className={`text-xs py-6 text-center ${textSecondary}`}>
                    Chưa có thông báo nào.
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
      </div>
      )}

      {/* ================= 5. TAB AN NINH & BẢO MẬT (SECURITY) ================= */}
      {adminSubTab === 'security' && (
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
      </div>
      )}
        </div>
      </main>

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
                    GEN: <strong>{inspectingUser.user.employeeId}</strong> • Phòng ban:{' '}
                    <strong>{inspectingUser.user.department}</strong>
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
                  {inspectingUser.user.totalScore}đ
                </div>
                <div className={`text-[11px] ${textSecondary}`}>Tổng điểm</div>
              </div>
              <div className={`p-3 rounded-2xl border ${subCardBg}`}>
                <div className="text-lg font-black text-emerald-600">
                  {inspectingUser.user.completedDays}/21
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
                        Day {att.dayNumber}: {att.dayTitle || `Bài thi ngày ${att.dayNumber}`}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-black text-blue-600">{att.score} / 100đ</span>
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
                  const newPass = prompt(`Nhập mật khẩu mới cho nhân viên ${inspectingUser.user.fullName}:`, 'Abc@1234');
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
                  if (!confirm(`Bạn có chắc chắn muốn RESET điểm và lịch sử thi của ${inspectingUser.user.fullName} về 0?`)) return;
                  try {
                    const res = await fetch(`/api/admin/users/${inspectingUser.user.id}/reset-progress`, {
                      method: 'POST',
                      headers: { Authorization: `Bearer ${token}` },
                    });
                    const d = await res.json();
                    showMessage(d.message || 'Đã reset tiến độ');
                    fetchUserDetails(inspectingUser.user.id);
                    fetchAdminUsers();
                    fetchDashboardStats();
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
                  if (!confirm(`CẢNH BÁO: Bạn có chắc chắn muốn XÓA VĨNH VIỄN tài khoản ${inspectingUser.user.fullName} (${inspectingUser.user.employeeId})?`)) return;
                  try {
                    const res = await fetch(`/api/admin/users/${inspectingUser.user.id}`, {
                      method: 'DELETE',
                      headers: { Authorization: `Bearer ${token}` },
                    });
                    const d = await res.json();
                    showMessage(d.message || 'Đã xóa tài khoản');
                    setInspectingUser(null);
                    fetchAdminUsers();
                    fetchDashboardStats();
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

            {editingQuestion.questionType === 'FILL_IN_THE_BLANK' && (
              <div>
                <label className="block text-xs font-bold text-indigo-500 mb-1">
                  Phiên âm & Nghĩa (statementText)
                </label>
                <input
                  type="text"
                  value={editingQuestion.statementText || ''}
                  onChange={(e) =>
                    setEditingQuestion({ ...editingQuestion, statementText: e.target.value })
                  }
                  placeholder="/ˌredʒɪˈstreɪʃn/ - Đăng ký"
                  className={`w-full px-3.5 py-2.5 rounded-xl border border-indigo-400 text-sm font-bold ${inputBg}`}
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

            {/* 4. Danh sách Đáp án hoặc Điền từ */}
            {editingQuestion.questionType === 'FILL_IN_THE_BLANK' ? (
              <div className={`p-4 rounded-2xl border space-y-3 ${subCardBg}`}>
                <div className="flex items-center gap-2 text-indigo-500 font-black text-sm">
                  <Sparkles className="w-4 h-4" />
                  <span>Câu hỏi điền từ</span>
                </div>
                <div>
                  <label className={`block text-xs font-bold mb-1 ${textSecondary}`}>
                    Từ cần điền (Đáp án đúng) *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingQuestion.targetWord || ''}
                    onChange={(e) =>
                      setEditingQuestion({
                        ...editingQuestion,
                        targetWord: e.target.value,
                        correctOptionId: e.target.value.trim().toLowerCase(),
                      })
                    }
                    placeholder="registration"
                    className={`w-full px-3.5 py-2.5 rounded-xl border border-indigo-400 text-sm font-black ${inputBg}`}
                  />
                </div>
              </div>
            ) : (
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
            )}

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

      {/* ================= MODAL SỬA BỘ TỪ VỰNG CÂU 11 (5 TỪ) ================= */}
      {showQ11Modal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div
            className={`w-full max-w-2xl rounded-3xl p-5 sm:p-6 shadow-2xl border space-y-4 my-auto max-h-[92vh] overflow-y-auto ${cardBg}`}
          >
            <div
              className={`flex items-center justify-between pb-3 border-b ${
                darkMode ? 'border-slate-800' : 'border-slate-100'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 flex items-center justify-center font-black">
                  🎙️
                </span>
                <div>
                  <h3 className={`text-base sm:text-lg font-black ${textPrimary}`}>
                    Từ Vựng Câu 11 ({dayDetail?.title || `Day ${selectedDay}`})
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowQ11Modal(false)}
                className={`p-2 rounded-full ${subCardBg}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveQ11Words} className="space-y-3.5">
              <div className="space-y-3 max-h-[58vh] overflow-y-auto pr-1">
                {editingQ11Words.map((item, idx) => (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-2xl border space-y-2.5 ${subCardBg}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-md bg-purple-600 text-white text-xs font-black">
                        Từ #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => playPronunciation(item.spokenText || item.word)}
                        className="px-2 py-1 rounded-lg bg-blue-100 text-blue-700 dark:bg-slate-700 dark:text-blue-300 text-xs font-bold flex items-center gap-1"
                        title="Nghe phát âm thử"
                      >
                        <Volume2 className="w-3.5 h-3.5" /> Nghe thử
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className={`block text-[11px] font-bold mb-1 ${textSecondary}`}>
                          Từ vựng *
                        </label>
                        <input
                          type="text"
                          required
                          value={item.word}
                          onChange={(e) => {
                            const next = [...editingQ11Words];
                            next[idx] = {
                              ...next[idx],
                              word: e.target.value,
                              spokenText: e.target.value.toLowerCase(),
                            };
                            setEditingQ11Words(next);
                          }}
                          placeholder="Approval"
                          className={`w-full px-3 py-2 rounded-xl border text-xs sm:text-sm font-black ${inputBg}`}
                        />
                      </div>
                      <div>
                        <label className={`block text-[11px] font-bold mb-1 ${textSecondary}`}>
                          Phiên âm (IPA) *
                        </label>
                        <input
                          type="text"
                          required
                          value={item.ipa}
                          onChange={(e) => {
                            const next = [...editingQ11Words];
                            next[idx] = { ...next[idx], ipa: e.target.value };
                            setEditingQ11Words(next);
                          }}
                          placeholder="/əˈpruː.vəl/"
                          className={`w-full px-3 py-2 rounded-xl border font-mono text-xs sm:text-sm font-bold text-purple-600 dark:text-purple-400 ${inputBg}`}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className={`block text-[11px] font-bold mb-1 ${textSecondary}`}>
                          Nghĩa tiếng Việt *
                        </label>
                        <input
                          type="text"
                          required
                          value={item.meaningVi}
                          onChange={(e) => {
                            const next = [...editingQ11Words];
                            next[idx] = { ...next[idx], meaningVi: e.target.value };
                            setEditingQ11Words(next);
                          }}
                          placeholder="Sự phê duyệt"
                          className={`w-full px-3 py-2 rounded-xl border text-xs sm:text-sm font-semibold ${inputBg}`}
                        />
                      </div>
                      <div>
                        <label className={`block text-[11px] font-bold mb-1 ${textSecondary}`}>
                          Mẹo khẩu hình & nhấn âm
                        </label>
                        <input
                          type="text"
                          value={item.tip || ''}
                          onChange={(e) => {
                            const next = [...editingQ11Words];
                            next[idx] = { ...next[idx], tip: e.target.value };
                            setEditingQ11Words(next);
                          }}
                          placeholder="Nhấn âm 2, tròn môi..."
                          className={`w-full px-3 py-2 rounded-xl border text-xs ${inputBg}`}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className={`block text-[11px] font-bold mb-1 ${textSecondary}`}>
                          Cách đọc tách âm (VD: ơ · PRUː · vồ)
                        </label>
                        <input
                          type="text"
                          value={item.syllables || ''}
                          onChange={(e) => {
                            const next = [...editingQ11Words];
                            next[idx] = { ...next[idx], syllables: e.target.value };
                            setEditingQ11Words(next);
                          }}
                          placeholder="ơ · PRUː · vồ"
                          className={`w-full px-3 py-2 rounded-xl border text-xs font-bold ${inputBg}`}
                        />
                      </div>
                      <div>
                        <label className={`block text-[11px] font-bold mb-1 ${textSecondary}`}>
                          Ảnh hoặc Ảnh GIF minh họa cách đọc
                        </label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={item.imageUrl || ''}
                            onChange={(e) => {
                              const next = [...editingQ11Words];
                              next[idx] = { ...next[idx], imageUrl: e.target.value };
                              setEditingQ11Words(next);
                            }}
                            placeholder="Link ảnh / GIF hoặc bấm Tải lên..."
                            className={`flex-1 min-w-0 px-3 py-2 rounded-xl border text-xs ${inputBg}`}
                          />
                          <label className="cursor-pointer px-2.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1 shrink-0 transition">
                            <FileUp className="w-3.5 h-3.5" />
                            <span>Ảnh/GIF</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleUploadQ11WordImage(idx, e)}
                              className="hidden"
                            />
                          </label>
                        </div>
                        {item.imageUrl && (
                          <div className="mt-1.5 flex items-center gap-2 p-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                            <img
                              src={resolveMediaUrl(item.imageUrl)}
                              alt={item.word}
                              className="w-12 h-10 object-contain rounded bg-slate-100 dark:bg-slate-800 shrink-0"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const next = [...editingQ11Words];
                                next[idx] = { ...next[idx], imageUrl: '' };
                                setEditingQ11Words(next);
                              }}
                              className="text-[11px] text-rose-500 font-bold hover:underline"
                            >
                              Xóa ảnh
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Checkbox áp dụng cho cả 21 ngày */}
              <div className={`p-3 rounded-xl border flex items-center justify-between ${subCardBg}`}>
                <label className="text-xs font-extrabold flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={cloneQ11ToAllDays}
                    onChange={(e) => setCloneQ11ToAllDays(e.target.checked)}
                    className="w-4 h-4 text-purple-600 rounded"
                  />
                  <span>Áp dụng bộ 5 từ vựng này cho toàn bộ 21 ngày thi</span>
                </label>
                <span className="text-[11px] text-purple-600 dark:text-purple-400 font-bold">
                  {cloneQ11ToAllDays ? 'Đồng bộ cả 21 ngày' : `Chỉ lưu Day ${selectedDay}`}
                </span>
              </div>

              <div
                className={`flex items-center justify-end gap-2 pt-3 border-t ${
                  darkMode ? 'border-slate-800' : 'border-slate-100'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setShowQ11Modal(false)}
                  className={`px-4 py-2.5 rounded-xl font-bold text-xs ${subCardBg}`}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs sm:text-sm shadow-md flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" /> Lưu 5 từ vựng Câu 11
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NHẬP ĐỀ THI HÀNG LOẠT (EXCEL / CSV) */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div
            className={`w-full max-w-4xl rounded-3xl p-4 sm:p-6 shadow-2xl border space-y-4 my-auto max-h-[94vh] flex flex-col ${cardBg}`}
          >
            {/* Header */}
            <div
              className={`flex items-center justify-between pb-3 border-b shrink-0 ${
                darkMode ? 'border-slate-800' : 'border-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5" />
                </span>
                <div>
                  <h3 className={`text-base sm:text-lg font-black ${textPrimary}`}>
                    Nhập Đề Thi (Excel / CSV)
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBulkModal(false)}
                className={`p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition ${subCardBg}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="space-y-4 overflow-y-auto pr-1 flex-1">
              {/* Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="px-3 py-1.5 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/70 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-1.5 transition shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" /> File Mẫu (.CSV)
                  </button>

                  <label className="px-3 py-1.5 rounded-xl border border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/70 text-blue-800 dark:text-blue-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition shadow-xs">
                    <FileUp className="w-3.5 h-3.5" /> Tải Lên File
                    <input
                      type="file"
                      accept=".csv,.tsv,.txt"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={handleLoadSampleData}
                    className="px-3 py-1.5 rounded-xl border border-purple-300 dark:border-purple-700 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/70 text-purple-800 dark:text-purple-300 text-xs font-bold flex items-center gap-1.5 transition shadow-xs"
                  >
                    <Sparkles className="w-3.5 h-3.5" /> Dữ Liệu Mẫu
                  </button>
                </div>

                {bulkRawText.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setBulkRawText('')}
                    className="text-xs text-rose-500 hover:text-rose-700 font-bold flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Xóa trắng
                  </button>
                )}
              </div>

              {/* Tùy chọn Phạm vi và Chế độ ghi */}
              <div className={`p-3.5 rounded-2xl border grid grid-cols-1 md:grid-cols-2 gap-3.5 ${subCardBg}`}>
                {/* Phạm vi ngày */}
                <div>
                  <span className={`block text-[11px] font-black uppercase tracking-wider mb-2 ${textSecondary}`}>
                    Phạm Vi Ngày
                  </span>
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                      <input
                        type="radio"
                        name="bulkTargetMode"
                        value="auto"
                        checked={bulkTargetMode === 'auto'}
                        onChange={() => setBulkTargetMode('auto')}
                        className="text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>
                        Theo cột <b>DayNumber</b> trong file
                      </span>
                    </label>
                    <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                      <input
                        type="radio"
                        name="bulkTargetMode"
                        value="current"
                        checked={bulkTargetMode === 'current'}
                        onChange={() => setBulkTargetMode('current')}
                        className="text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>
                        Chỉ nhập vào <b>Day {selectedDay}</b>
                      </span>
                    </label>
                  </div>
                </div>

                {/* Chế độ ghi */}
                <div>
                  <span className={`block text-[11px] font-black uppercase tracking-wider mb-2 ${textSecondary}`}>
                    Chế Độ Ghi
                  </span>
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                      <input
                        type="radio"
                        name="bulkWriteMode"
                        value="overwrite"
                        checked={bulkWriteMode === 'overwrite'}
                        onChange={() => setBulkWriteMode('overwrite')}
                        className="text-amber-600 focus:ring-amber-500"
                      />
                      <span className="text-amber-700 dark:text-amber-400 font-bold">
                        Ghi đè (xóa câu hỏi cũ)
                      </span>
                    </label>
                    <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                      <input
                        type="radio"
                        name="bulkWriteMode"
                        value="append"
                        checked={bulkWriteMode === 'append'}
                        onChange={() => setBulkWriteMode('append')}
                        className="text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>Thêm tiếp vào sau</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Textarea dán dữ liệu */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className={`text-xs font-bold ${textSecondary}`}>
                    Dán dữ liệu từ Excel / CSV:
                  </label>
                  <span className="text-[11px] font-mono text-slate-400">
                    {bulkRawText.split(/\r?\n/).filter((l) => l.trim()).length} dòng dữ liệu
                  </span>
                </div>
                <textarea
                  value={bulkRawText}
                  onChange={(e) => setBulkRawText(e.target.value)}
                  rows={6}
                  placeholder="Dán nội dung từ bảng Excel hoặc file CSV vào đây..."
                  className={`w-full px-3.5 py-2.5 rounded-2xl border font-mono text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-emerald-500 ${inputBg}`}
                />
              </div>

              {/* Báo cáo trạng thái Parsing & Validation */}
              {bulkRawText.trim().length > 0 && (
                <div className="space-y-2.5">
                  {bulkParseErrors.length > 0 && (
                    <div className="p-3 rounded-2xl border border-rose-300 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 text-xs space-y-1">
                      <div className="font-black flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 text-rose-500" />
                        Có {bulkParseErrors.length} dòng dữ liệu bị lỗi cần chỉnh sửa:
                      </div>
                      <ul className="list-disc list-inside space-y-0.5 text-[11px] max-h-24 overflow-y-auto">
                        {bulkParseErrors.map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800">
                    <span className="text-xs font-black text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                      <Check className="w-4 h-4 text-emerald-600" />
                      Nhận diện hợp lệ: {bulkParsedQuestions.length} câu hỏi
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {Object.entries(bulkDayCounts).map(([d, count]) => (
                        <span
                          key={d}
                          className="px-2 py-0.5 rounded-lg bg-emerald-600 text-white font-mono text-[11px] font-bold"
                        >
                          Day {d}: {count} câu
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Bảng xem trước (Preview Table) */}
                  {bulkParsedQuestions.length > 0 && (
                    <div className="border rounded-2xl overflow-hidden max-h-52 overflow-y-auto shadow-inner">
                      <table className="w-full text-left text-xs">
                        <thead
                          className={`sticky top-0 z-10 text-[10px] uppercase font-black tracking-wider border-b ${
                            darkMode
                              ? 'bg-slate-800 text-slate-300 border-slate-700'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          <tr>
                            <th className="p-2 text-center">Day</th>
                            <th className="p-2 text-center">#</th>
                            <th className="p-2">Dạng câu</th>
                            <th className="p-2">Nội dung câu hỏi (Prompt)</th>
                            <th className="p-2">Đáp án A / B / C / D</th>
                            <th className="p-2 text-center">Đ/Án Đúng</th>
                            <th className="p-2 text-center">Điểm</th>
                          </tr>
                        </thead>
                        <tbody
                          className={`divide-y ${
                            darkMode ? 'divide-slate-800 text-slate-200' : 'divide-slate-100 text-slate-700'
                          }`}
                        >
                          {bulkParsedQuestions.map((q, idx) => (
                            <tr
                              key={idx}
                              className={`hover:bg-blue-50/50 dark:hover:bg-slate-800/50 transition`}
                            >
                              <td className="p-2 text-center font-bold text-blue-600 dark:text-blue-400">
                                Day {q.dayNumber}
                              </td>
                              <td className="p-2 text-center font-bold text-slate-400">
                                {q.orderIndex}
                              </td>
                              <td className="p-2">
                                <span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-[10px] font-black">
                                  {q.questionType}
                                </span>
                              </td>
                              <td className="p-2 max-w-xs truncate" title={q.promptText}>
                                {q.promptText}
                              </td>
                              <td className="p-2 max-w-xs truncate text-[11px] text-slate-500">
                                {q.questionType === 'FILL_IN_THE_BLANK'
                                  ? `Từ điền: ${q.targetWord || q.correctOptionId}`
                                  : [q.optionA, q.optionB, q.optionC, q.optionD]
                                      .filter(Boolean)
                                      .join(' | ')}
                              </td>
                              <td className="p-2 text-center">
                                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-black text-[11px]">
                                  {q.correctOptionId}
                                </span>
                              </td>
                              <td className="p-2 text-center font-mono font-bold">{q.points}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div
              className={`flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t shrink-0 ${
                darkMode ? 'border-slate-800' : 'border-slate-100'
              }`}
            >
              <div className="text-xs text-slate-500 font-medium text-center sm:text-left">
                {bulkParsedQuestions.length > 0 ? (
                  <span>
                    Chuẩn bị nhập <b>{bulkParsedQuestions.length} câu hỏi</b> vào{' '}
                    <b>{Object.keys(bulkDayCounts).length} ngày thử thách</b>
                  </span>
                ) : (
                  <span>Hãy tải file mẫu hoặc dán các ô từ Excel để bắt đầu</span>
                )}
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => setShowBulkModal(false)}
                  className={`px-4 py-2 rounded-xl font-bold text-xs ${subCardBg}`}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={bulkParsedQuestions.length === 0 || bulkLoading}
                  onClick={handleExecuteBulkImport}
                  className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-xs sm:text-sm shadow-md flex items-center gap-2 transition"
                >
                  {bulkLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Đang xử lý & lưu...
                    </>
                  ) : (
                    <>
                      <FileSpreadsheet className="w-4 h-4" />
                      Tiến Hành Nhập {bulkParsedQuestions.length} Câu Hỏi
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
                    {isCreatingEvent
                      ? 'Thêm Sự Kiện'
                      : 'Chỉnh Sửa Sự Kiện'}
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
    </div>
  );
};

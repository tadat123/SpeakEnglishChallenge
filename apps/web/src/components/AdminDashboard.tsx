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
  BarChart3,
  Search,
  Filter,
  Sparkles,
  Laptop,
  Tablet,
  Eye,
  Calendar,
  Award,
  ArrowLeft,
  Menu,
  LogOut,
  Sun,
  Moon,
  Loader2,
} from 'lucide-react';
import { playPronunciation } from '../utils/audio';
import { Lang } from '../utils/i18n';
import { WORKPLACE_5_WORDS, WorkplaceWordItem } from './PronunciationChallengeQ11';

interface AdminDashboardProps {
  token: string;
  challenges: any[];
  onRefreshGlobal: () => void;
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
    headerTitle: 'Quản trị viên (Admin CMS) — Quản lý 21 Ngày & Câu hỏi (Chữ / Audio / Video)',
    headerSub:
      'Chọn bất kỳ ngày nào bên dưới để sửa thông tin ngày, thêm/sửa/xóa câu hỏi hoặc khóa an toàn khi đang có người thi.',
    reseedBtn: 'Reset Seed Gốc',
    exportBtn: 'Xuất Excel Trao Giải',
    selectDayTitle: '1. Chọn Ngày Thử Thách Cần Chỉnh Sửa (Day 1 → Day 21):',
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
    cloneAllBtn: 'Áp dụng bộ câu này cho cả 21 ngày',
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
        label: 'Multiple Choice – Chọn audio phát âm đúng (3 nút Audio A/B/C)',
      },
      {
        value: 'TRUE_FALSE',
        label: 'True / False – Nghe và xác định nhận định (2 đáp án Đúng/Sai)',
      },
      {
        value: 'LISTEN_AND_CHOOSE',
        label: 'Nghe audio / Xem video – Chọn từ đúng (3 đáp án A/B/C)',
      },
      {
        value: 'VOCAB_MEANING',
        label: 'Nghĩa của từ / Từ viết tắt (3 đáp án A/B/C)',
      },
      {
        value: 'FILL_IN_THE_BLANK',
        label: 'Điền từ – Nhập từ vựng theo phiên âm & nghĩa',
      },
    ],
    sidebarDashboard: 'Dashboard Thống Kê',
    sidebarDashboardSub: 'Tỉ lệ hoàn thành & KPI',
    sidebarUsers: 'Quản Lý Nhân Viên',
    sidebarUsersSub: 'Danh sách, GEN & thiết bị',
    sidebarChallenges: '21 Ngày & Đề Thi',
    sidebarChallengesSub: 'Câu hỏi, Audio & Video',
    sidebarNotifications: 'Thông Báo Cá Nhân',
    sidebarNotificationsSub: 'Push PWA & Cá nhân hóa',
    sidebarSecurity: 'An Ninh & Anti-Cheat',
    sidebarSecuritySub: 'DDoS, WAF & IP Jail',
    backToQuiz: 'Về Chỗ Làm Kiểm Tra',
    backToQuizShort: 'Làm bài',
  },
  en: {
    headerTitle: 'Admin CMS — Manage 21 Days & Questions (Text / Audio / Video)',
    headerSub:
      'Select any day below to edit schedule details, add/edit/delete questions, or safely lock a day while users are taking the quiz.',
    reseedBtn: 'Reset Default Seed',
    exportBtn: 'Export Award CSV',
    selectDayTitle: '1. Select Challenge Day to Edit (Day 1 → Day 21):',
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
    cloneAllBtn: 'Clone this set to all 21 days',
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
        label: 'Multiple Choice – Choose correct pronunciation audio (3 Audio buttons A/B/C)',
      },
      {
        value: 'TRUE_FALSE',
        label: 'True / False – Listen and verify statement (2 options True/False)',
      },
      {
        value: 'LISTEN_AND_CHOOSE',
        label: 'Listen Audio / Watch Video – Choose correct word (3 options A/B/C)',
      },
      {
        value: 'VOCAB_MEANING',
        label: 'Vocabulary Meaning / Acronym (3 options A/B/C)',
      },
      {
        value: 'FILL_IN_THE_BLANK',
        label: 'Fill in the blank – Type vocabulary from IPA & meaning',
      },
    ],
    sidebarDashboard: 'Analytics Dashboard',
    sidebarDashboardSub: 'Completion rate & KPIs',
    sidebarUsers: 'User Management',
    sidebarUsersSub: 'Employees, GEN & devices',
    sidebarChallenges: '21 Days & Questions',
    sidebarChallengesSub: 'Questions, audio & video',
    sidebarNotifications: 'Push Notifications',
    sidebarNotificationsSub: 'PWA push & targeted alerts',
    sidebarSecurity: 'Security & Anti-Cheat',
    sidebarSecuritySub: 'DDoS, WAF & IP jail',
    backToQuiz: 'Back to Quiz View',
    backToQuizShort: 'Quiz',
  },
  ko: {
    headerTitle: '관리자 CMS — 21일 챌린지 및 문제 관리 (텍스트 / 오디오 / 비디오)',
    headerSub:
      '아래에서 날짜를 선택하여 일정을 수정하거나, 문제를 추가/수정/삭제하고, 응시 중인 사용자가 있을 때 안전하게 잠글 수 있습니다.',
    reseedBtn: '기본 데이터 초기화',
    exportBtn: '시상용 엑셀(CSV) 내보내기',
    selectDayTitle: '1. 수정할 챌린지 날짜 선택 (Day 1 → Day 21):',
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
    cloneAllBtn: '이 문제 세트를 21일 전체에 복사',
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
        label: '객관식 – 올바른 발음 오디오 선택 (3개 오디오 버튼 A/B/C)',
      },
      {
        value: 'TRUE_FALSE',
        label: 'True / False – 오디오를 듣고 진술 확인 (2개 보기 참/거짓)',
      },
      {
        value: 'LISTEN_AND_CHOOSE',
        label: '오디오 듣기 / 비디오 보기 – 올바른 단어 선택 (3개 보기 A/B/C)',
      },
      {
        value: 'VOCAB_MEANING',
        label: '단어 의미 / 약어 풀이 (3개 보기 A/B/C)',
      },
      {
        value: 'FILL_IN_THE_BLANK',
        label: '빈칸 채우기 – 발음기호 및 의미를 보고 단어 입력',
      },
    ],
    sidebarDashboard: '통계 대시보드',
    sidebarDashboardSub: '완주율 및 핵심 KPI',
    sidebarUsers: '임직원 관리',
    sidebarUsersSub: '사번, 계정 및 기기 목록',
    sidebarChallenges: '21일 챌린지 & 문제',
    sidebarChallengesSub: '문제, 음원 및 영상',
    sidebarNotifications: '맞춤형 알림',
    sidebarNotificationsSub: 'PWA 푸시 & 개인화 알림',
    sidebarSecurity: '보안 및 치팅 방지',
    sidebarSecuritySub: 'DDoS, WAF & IP 차단',
    backToQuiz: '시험 화면으로 돌아가기',
    backToQuizShort: '시험',
  },
};

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  token,
  challenges,
  onRefreshGlobal,
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
  // Quản lý các Sub-Tab của Admin CMS
  type AdminSubTab = 'dashboard' | 'users' | 'challenges' | 'notifications' | 'security';
  const [adminSubTab, setAdminSubTab] = useState<AdminSubTab>('dashboard');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);

  // Thống kê Dashboard & Tỉ lệ hoàn thành
  const [dashboardStats, setDashboardStats] = useState<any | null>(null);
  const [selectedStatDay, setSelectedStatDay] = useState<number>(1);
  const [loadingStats, setLoadingStats] = useState<boolean>(false);

  // Quản lý Danh sách Người dùng & Tìm kiếm
  const [userList, setUserList] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState<string>('');
  const [userDeptFilter, setUserDeptFilter] = useState<string>('ALL');
  const [loadingUsers, setLoadingUsers] = useState<boolean>(false);
  const [inspectingUser, setInspectingUser] = useState<any | null>(null);

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
  const [eveningTop1Hour, setEveningTop1Hour] = useState<number>(7);
  const [eveningTop1Minute, setEveningTop1Minute] = useState<number>(0);
  const [nightUnstudiedHour, setNightUnstudiedHour] = useState<number>(23);
  const [nightUnstudiedMinute, setNightUnstudiedMinute] = useState<number>(0);

  // Quản lý Bộ từ vựng Luyện Đọc Câu 11 (5 từ)
  const [showQ11Modal, setShowQ11Modal] = useState<boolean>(false);
  const [editingQ11Words, setEditingQ11Words] = useState<WorkplaceWordItem[]>([]);
  const [cloneQ11ToAllDays, setCloneQ11ToAllDays] = useState<boolean>(false);

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
          setEveningTop1Hour(data.queueStatus.config.eveningTop1Hour ?? 7);
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
        setUserList(data.users || []);
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
    if (res.ok) {
      const data = await res.json();
      showMessage(
        resetTodayQuota
          ? 'Đã đặt lại hạn mức 3 khung thông báo hôm nay (7h Top 1 / 8h Bài mới / 23h Nhắc học)!'
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
                  <div className="min-w-0">
                    <div className="text-xs truncate">{item.label}</div>
                    <div
                      className={`text-[10px] truncate ${
                        isActive
                          ? 'text-blue-100'
                          : darkMode
                          ? 'text-slate-500'
                          : 'text-slate-400'
                      }`}
                    >
                      {item.sub}
                    </div>
                  </div>
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
              <div className="text-[11px] font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                <span>Admin CMS Portal</span>
                <span>/</span>
                <span>
                  {adminSubTab === 'dashboard'
                    ? 'Dashboard Thống Kê'
                    : adminSubTab === 'users'
                    ? 'Quản Lý Nhân Viên'
                    : adminSubTab === 'challenges'
                    ? '21 Ngày & Đề Thi'
                    : adminSubTab === 'notifications'
                    ? 'Thông Báo Cá Nhân Hóa'
                    : 'An Ninh & Bảo Mật'}
                </span>
              </div>
              <h1 className={`text-base sm:text-lg font-black truncate ${textPrimary}`}>
                {adminSubTab === 'dashboard'
                  ? '📊 Dashboard Thống Kê & Tỉ Lệ Hoàn Thành'
                  : adminSubTab === 'users'
                  ? '👥 Quản Lý Tài Khoản Nhân Viên & Thiết Bị'
                  : adminSubTab === 'challenges'
                  ? '📝 Quản Lý 21 Ngày Thi & Câu Hỏi'
                  : adminSubTab === 'notifications'
                  ? '📢 Soạn & Gửi Thông Báo Cá Nhân Hóa'
                  : '🛡️ Lá Chắn An Ninh & Phòng Thủ Tấn Công'}
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
                <span className={`text-xs font-bold ${textSecondary}`}>Tổng số Nhân viên</span>
                <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-blue-600 mt-2">
                {dashboardStats?.totalUsers ?? '...'}
              </div>
              <div className={`text-[11px] mt-1 ${textSecondary}`}>
                {dashboardStats?.completedUsersCount ?? 0} người đã làm bài
              </div>
            </div>

            <div className={`p-4 rounded-3xl border shadow-sm backdrop-blur-md ${cardBg}`}>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold ${textSecondary}`}>Tỉ lệ Hoàn thành Chung</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center">
                  <Trophy className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-600 mt-2">
                {dashboardStats?.overallCompletionRate ?? 0}%
              </div>
              <div className={`text-[11px] mt-1 ${textSecondary}`}>
                Tính trên toàn bộ 21 ngày thi
              </div>
            </div>

            <div className={`p-4 rounded-3xl border shadow-sm backdrop-blur-md ${cardBg}`}>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold ${textSecondary}`}>Điểm TB Toàn Công ty</span>
                <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 flex items-center justify-center">
                  <Award className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-amber-500 mt-2">
                {dashboardStats?.avgScore ?? 0}đ
              </div>
              <div className={`text-[11px] mt-1 ${textSecondary}`}>
                Thang điểm 100/ngày
              </div>
            </div>

            <div className={`p-4 rounded-3xl border shadow-sm backdrop-blur-md ${cardBg}`}>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold ${textSecondary}`}>Tổng Lượt Nộp Bài</span>
                <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-purple-600 mt-2">
                {dashboardStats?.totalAttempts ?? 0}
              </div>
              <div className={`text-[11px] mt-1 ${textSecondary}`}>
                Bài thi đã hoàn thành & lưu điểm
              </div>
            </div>
          </div>

          {/* Bộ lọc & Thống kê Tỉ lệ người hoàn thành THEO NGÀY CỤ THỂ */}
          <div className={`rounded-3xl p-5 border shadow-sm backdrop-blur-md space-y-4 ${cardBg}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200/60 dark:border-slate-800">
              <div>
                <h3 className={`text-sm sm:text-base font-black flex items-center gap-2 ${textPrimary}`}>
                  <Calendar className="w-4 h-4 text-blue-600" />
                  Tỉ lệ Người Hoàn thành & Điểm số Theo Ngày (Bộ lọc Ngày 1 → 21)
                </h3>
                <p className={`text-xs ${textSecondary}`}>
                  Chọn bất kỳ ngày nào bên dưới để xem tỉ lệ người hoàn thành, điểm trung bình, số người đạt chuẩn và số người điểm tối đa.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold ${textSecondary}`}>Chọn nhanh:</span>
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

          {/* Bảng Tiến độ Hoàn thành toàn bộ 21 Ngày (Progress Visual) */}
          <div className={`rounded-3xl p-5 border shadow-sm backdrop-blur-md space-y-3 ${cardBg}`}>
            <h3 className={`text-sm sm:text-base font-black flex items-center gap-2 ${textPrimary}`}>
              <BarChart3 className="w-4 h-4 text-emerald-600" />
              Tiến độ Tỉ lệ Hoàn thành 21 Ngày Toàn Công ty
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
                    placeholder="Tìm theo Số GEN 8 số, Tên, hoặc Gmail..."
                    className={`w-full pl-9 pr-3 py-2.5 rounded-2xl border text-xs sm:text-sm font-semibold outline-none ${inputBg}`}
                  />
                </div>
                <select
                  value={userDeptFilter}
                  onChange={(e) => setUserDeptFilter(e.target.value)}
                  className={`px-3 py-2.5 rounded-2xl border text-xs font-bold outline-none ${inputBg}`}
                >
                  <option value="ALL">Tất cả Phòng ban</option>
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
                  <Search className="w-3.5 h-3.5" /> Tìm kiếm
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
                  <span className="px-2.5 py-0.5 rounded-md bg-purple-600 text-white text-xs font-black">
                    CÂU 11 (TỰ LUYỆN ĐỌC)
                  </span>
                  <h3 className={`text-sm sm:text-base font-black ${textPrimary}`}>
                    🎙️ Bộ 5 Từ Vựng Luyện Đọc Phát Âm — {dayDetail.title}
                  </h3>
                </div>
                <p className={`text-xs mt-1 ${textSecondary}`}>
                  Học viên sẽ ghi âm luyện đọc 5 từ vựng chuyên môn này với AI đánh giá độ chính xác (≥75% đạt chuẩn). Phần này là tự luyện bổ trợ, KHÔNG tính giờ và KHÔNG tính điểm thi xếp hạng.
                </p>
              </div>
              <button
                type="button"
                onClick={openEditQ11Modal}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-sm transition self-start sm:self-auto"
              >
                <Edit3 className="w-3.5 h-3.5" /> Chỉnh sửa 5 từ vựng Câu 11
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
                    <div className={`text-xs font-semibold mt-1 ${textSecondary}`}>{item.meaningVi}</div>
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
                  Soạn & Gửi Thông Báo Mang Tính Cá Nhân Hóa (Push & In-App)
                </h3>
                <p className={`text-xs ${textSecondary}`}>
                  Hỗ trợ các thẻ thay thế tự động <strong>{'{name}'}</strong> (Họ tên),{' '}
                  <strong>{'{gen}'}</strong> (Số GEN 8 số), <strong>{'{score}'}</strong> (Điểm số cá nhân).
                </p>
              </div>

              {/* Đối tượng nhận */}
              <div className="space-y-1.5">
                <label className={`block text-xs font-bold ${textSecondary}`}>
                  Đối tượng nhận thông báo:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'all', label: '🏢 Toàn Công Ty' },
                    { id: 'department', label: '👥 Theo Phòng Ban' },
                    { id: 'user', label: '👤 1 Cá Nhân' },
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
                  <label className={`block text-xs font-bold ${textSecondary}`}>Chọn Phòng Ban:</label>
                  <select
                    value={notifTargetValue}
                    onChange={(e) => setNotifTargetValue(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl border text-xs font-bold outline-none ${inputBg}`}
                  >
                    <option value="">-- Chọn Phòng ban nhận thông báo --</option>
                    <option value="Engineering">Engineering</option>
                    <option value="Quality Assurance">Quality Assurance</option>
                    <option value="Production">Production</option>
                    <option value="Human Resources">Human Resources</option>
                    <option value="Sales & Marketing">Sales & Marketing</option>
                    <option value="General">General</option>
                  </select>
                </div>
              )}

              {notifTargetType === 'user' && (
                <div className="space-y-1">
                  <label className={`block text-xs font-bold ${textSecondary}`}>Chọn Nhân Viên:</label>
                  <select
                    value={notifTargetValue}
                    onChange={(e) => setNotifTargetValue(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl border text-xs font-bold outline-none ${inputBg}`}
                  >
                    <option value="">-- Chọn 1 Nhân viên cụ thể --</option>
                    {userList.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.fullName} (GEN: {u.employeeId} - {u.department} - {u.totalScore}đ)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Các mẫu gợi ý sẵn (Preset Templates) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className={textSecondary}>Mẫu thông báo gợi ý sẵn:</span>
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
                    🔔 Nhắc học hôm nay
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
                    🏆 Khen ngợi thành tích
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNotifTitle('⏰ Bài thi sắp đóng lúc 00:00!');
                      setNotifBody(
                        'Chào {name}, chỉ còn ít giờ nữa là kết thúc ngày thi. Vào làm bài ngay để không bị ngắt chuỗi 30 ngày nhé! 🔥'
                      );
                    }}
                    className="px-2.5 py-1.5 rounded-lg border text-[11px] font-bold bg-purple-50 dark:bg-purple-950/40 border-purple-200 text-purple-900 dark:text-purple-300 hover:scale-[1.02] transition"
                  >
                    ⏰ Cảnh báo trước 00:00
                  </button>
                </div>
              </div>

              {/* Tiêu đề & Nội dung */}
              <div className="space-y-1">
                <label className={`block text-xs font-bold ${textSecondary}`}>Tiêu đề thông báo:</label>
                <input
                  type="text"
                  value={notifTitle}
                  onChange={(e) => setNotifTitle(e.target.value)}
                  placeholder="Tiêu đề thông báo..."
                  className={`w-full px-3 py-2 rounded-xl border text-xs sm:text-sm font-bold outline-none ${inputBg}`}
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className={`block text-xs font-bold ${textSecondary}`}>Nội dung thông báo:</label>
                  {/* Quick Tag Chips */}
                  <div className="flex items-center gap-1">
                    <span className={`text-[10px] ${textSecondary}`}>Chèn nhanh:</span>
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
                  placeholder="Nội dung thông báo gửi tới nhân viên..."
                  className={`w-full px-3 py-2 rounded-xl border text-xs sm:text-sm font-medium outline-none ${inputBg}`}
                />
              </div>

              <div className="space-y-1">
                <label className={`block text-xs font-bold ${textSecondary}`}>
                  Liên kết mở ra khi bấm vào (Target URL):
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
                📱 Xem trước trên Màn hình Điện thoại Nhân viên
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
                <strong>
                  1 lần buổi sáng ({String(morningHour).padStart(2, '0')}:
                  {String(morningMinute).padStart(2, '0')} - Có bài mới)
                </strong>
                ,{' '}
                <strong>
                  1 lần tối ({String(eveningTop1Hour).padStart(2, '0')}:
                  {String(eveningTop1Minute).padStart(2, '0')} - Top 1 hiện tại)
                </strong>{' '}
                và{' '}
                <strong>
                  1 lần đêm ({String(nightUnstudiedHour).padStart(2, '0')}:
                  {String(nightUnstudiedMinute).padStart(2, '0')} - Nhắc USER chưa làm bài)
                </strong>
                , chia đều từng request.
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
                    🌅 Buổi sáng ({String(morningHour).padStart(2, '0')}:
                    {String(morningMinute).padStart(2, '0')}) • 1 lần/ngày
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

            {/* Khung 1: 7h sáng — Thông báo Top 1 ngày hôm qua sau khi chốt điểm 00:00 */}
            <div className={`p-4 rounded-2xl border flex flex-col justify-between space-y-3 ${subCardBg}`}>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950">
                    👑 {String(eveningTop1Hour).padStart(2, '0')}:
                    {String(eveningTop1Minute).padStart(2, '0')} Sáng • 1 lần/ngày
                  </span>
                  <span
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                      pushStatus.queueStatus?.sentToday?.evening19hTop1
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {pushStatus.queueStatus?.sentToday?.evening19hTop1 ? '✓ Đã gửi hôm nay' : 'Chờ gửi'}
                  </span>
                </div>
                <h4 className={`text-sm font-black ${textPrimary}`}>
                  👑 Vinh danh Top 1 ngày hôm qua ({String(eveningTop1Hour).padStart(2, '0')}:
                  {String(eveningTop1Minute).padStart(2, '0')} Sáng)
                </h4>
                <p className={`text-xs leading-relaxed ${textSecondary}`}>
                  Sau khi chốt điểm bài thi cũ lúc 00:00 đêm, đúng{' '}
                  <strong>
                    {String(eveningTop1Hour).padStart(2, '0')}:{String(eveningTop1Minute).padStart(2, '0')} sáng
                  </strong>{' '}
                  hệ thống gửi thông báo vinh danh Top 1 Bảng xếp hạng:{' '}
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
                  ? 'Đã gửi bản tin Top 1 (Bấm để gửi lại)'
                  : 'Push Bản tin Top 1 7h sáng'}
              </button>
            </div>

            {/* Khung 3: 23h đêm — Thông báo cho những ai là USER mà chưa làm bài */}
            <div className={`p-4 rounded-2xl border flex flex-col justify-between space-y-3 ${subCardBg}`}>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-rose-600 text-white">
                    🌙 {String(nightUnstudiedHour).padStart(2, '0')}:
                    {String(nightUnstudiedMinute).padStart(2, '0')} Đêm • Chỉ USER chưa làm
                  </span>
                  <span
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                      pushStatus.queueStatus?.sentToday?.night23hUnstudied
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {pushStatus.queueStatus?.sentToday?.night23hUnstudied ? '✓ Đã gửi hôm nay' : 'Chờ gửi'}
                  </span>
                </div>
                <h4 className={`text-sm font-black ${textPrimary}`}>
                  ⏰ Nhắc USER chưa làm bài ({String(nightUnstudiedHour).padStart(2, '0')}:
                  {String(nightUnstudiedMinute).padStart(2, '0')})
                </h4>
                <p className={`text-xs leading-relaxed ${textSecondary}`}>
                  Đúng{' '}
                  <strong>
                    {String(nightUnstudiedHour).padStart(2, '0')}:{String(nightUnstudiedMinute).padStart(2, '0')} đêm
                  </strong>{' '}
                  chỉ lọc các tài khoản có <code>role = USER</code> cài PWA mà chưa hoàn thành bài ({' '}
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
                  ? `Đã nhắc (Bấm để gửi lại ${pushStatus.stats?.unstudiedAccountsCount || 0} USER)`
                  : `Push Nhắc ${pushStatus.stats?.unstudiedAccountsCount || 0} USER chưa làm`}
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
                  <span>Bật lịch tự động</span>
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

            <div className="grid grid-cols-1 sm:grid-cols-6 gap-2.5">
              <div>
                <label className={`block text-[11px] font-bold mb-1 ${textSecondary}`}>
                  Giờ báo Bài mới (Sáng)
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={0}
                    max={23}
                    value={morningHour}
                    onChange={(e) => setMorningHour(Math.max(0, Math.min(23, Number(e.target.value))))}
                    className={`w-1/2 px-2 py-2 rounded-xl border text-center text-xs sm:text-sm font-bold ${inputBg}`}
                    title="Giờ (0-23)"
                  />
                  <span className="font-bold text-slate-400">:</span>
                  <input
                    type="number"
                    min={0}
                    max={59}
                    value={morningMinute}
                    onChange={(e) => setMorningMinute(Math.max(0, Math.min(59, Number(e.target.value))))}
                    className={`w-1/2 px-2 py-2 rounded-xl border text-center text-xs sm:text-sm font-bold ${inputBg}`}
                    title="Phút (0-59)"
                  />
                </div>
              </div>
              <div>
                <label className={`block text-[11px] font-bold mb-1 ${textSecondary}`}>
                  Giờ báo Top 1 (Mặc định 7h sáng)
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={0}
                    max={23}
                    value={eveningTop1Hour}
                    onChange={(e) => setEveningTop1Hour(Math.max(0, Math.min(23, Number(e.target.value))))}
                    className={`w-1/2 px-2 py-2 rounded-xl border text-center text-xs sm:text-sm font-bold ${inputBg}`}
                    title="Giờ (0-23)"
                  />
                  <span className="font-bold text-slate-400">:</span>
                  <input
                    type="number"
                    min={0}
                    max={59}
                    value={eveningTop1Minute}
                    onChange={(e) => setEveningTop1Minute(Math.max(0, Math.min(59, Number(e.target.value))))}
                    className={`w-1/2 px-2 py-2 rounded-xl border text-center text-xs sm:text-sm font-bold ${inputBg}`}
                    title="Phút (0-59)"
                  />
                </div>
              </div>
              <div>
                <label className={`block text-[11px] font-bold mb-1 ${textSecondary}`}>
                  Giờ nhắc USER (Đêm)
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={0}
                    max={23}
                    value={nightUnstudiedHour}
                    onChange={(e) => setNightUnstudiedHour(Math.max(0, Math.min(23, Number(e.target.value))))}
                    className={`w-1/2 px-2 py-2 rounded-xl border text-center text-xs sm:text-sm font-bold ${inputBg}`}
                    title="Giờ (0-23)"
                  />
                  <span className="font-bold text-slate-400">:</span>
                  <input
                    type="number"
                    min={0}
                    max={59}
                    value={nightUnstudiedMinute}
                    onChange={(e) => setNightUnstudiedMinute(Math.max(0, Math.min(59, Number(e.target.value))))}
                    className={`w-1/2 px-2 py-2 rounded-xl border text-center text-xs sm:text-sm font-bold ${inputBg}`}
                    title="Phút (0-59)"
                  />
                </div>
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
                            ? '⚠️ Có tài khoản nhưng chưa học ngày nào (0/21)'
                            : `Đã học ${u.completedDays}/21 ngày • Chưa làm ${u.targetDayTitle}`}
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
      </div>
      )}

      {/* ================= 5. TAB AN NINH & BẢO MẬT (SECURITY) ================= */}
      {adminSubTab === 'security' && (
        <div className="space-y-4">
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
                  Phiên âm & Nghĩa hiển thị mẫu (statementText)
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

            {/* 4. Danh sách Đáp án & Chọn đáp án đúng (Hoặc Ô nhập cho câu hỏi điền từ) */}
            {editingQuestion.questionType === 'FILL_IN_THE_BLANK' ? (
              <div className={`p-4 rounded-2xl border space-y-3 ${subCardBg}`}>
                <div className="flex items-center gap-2 text-indigo-500 font-black text-sm">
                  <Sparkles className="w-4 h-4" />
                  <span>Dạng câu hỏi điền từ (Fill in the blank)</span>
                </div>
                <div>
                  <label className={`block text-xs font-bold mb-1 ${textSecondary}`}>
                    Từ vựng cần điền chính xác (Đáp án đúng) *
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
                    placeholder="ví dụ: registration"
                    className={`w-full px-3.5 py-2.5 rounded-xl border border-indigo-400 text-sm font-black ${inputBg}`}
                  />
                  <p className={`text-[11px] mt-1 ${textSecondary}`}>
                    Học viên sẽ gõ từ này vào ô trả lời. Hệ thống chấm điểm tự động bỏ khoảng trắng thừa và không phân biệt chữ hoa/thường.
                  </p>
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
                    Sửa 5 Từ Vựng Luyện Đọc Câu 11 — {dayDetail?.title || `Day ${selectedDay}`}
                  </h3>
                  <p className={`text-xs ${textSecondary}`}>
                    Thay đổi từ, phiên âm IPA, nghĩa tiếng Việt và mẹo phát âm cho 5 từ luyện đọc.
                  </p>
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
                        Từ vựng #{idx + 1}
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
                          Từ tiếng Anh (Word) *
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
                          placeholder="ví dụ: Approval"
                          className={`w-full px-3 py-2 rounded-xl border text-xs sm:text-sm font-black ${inputBg}`}
                        />
                      </div>
                      <div>
                        <label className={`block text-[11px] font-bold mb-1 ${textSecondary}`}>
                          Phiên âm quốc tế (IPA) *
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
                          placeholder="ví dụ: /əˈpruː.vəl/"
                          className={`w-full px-3 py-2 rounded-xl border font-mono text-xs sm:text-sm font-bold text-purple-600 dark:text-purple-400 ${inputBg}`}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className={`block text-[11px] font-bold mb-1 ${textSecondary}`}>
                          Nghĩa tiếng Việt (Meaning) *
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
                          placeholder="ví dụ: Sự phê duyệt"
                          className={`w-full px-3 py-2 rounded-xl border text-xs sm:text-sm font-semibold ${inputBg}`}
                        />
                      </div>
                      <div>
                        <label className={`block text-[11px] font-bold mb-1 ${textSecondary}`}>
                          Mẹo phát âm (Tip)
                        </label>
                        <input
                          type="text"
                          value={item.tip || ''}
                          onChange={(e) => {
                            const next = [...editingQ11Words];
                            next[idx] = { ...next[idx], tip: e.target.value };
                            setEditingQ11Words(next);
                          }}
                          placeholder="ví dụ: Nhấn âm 2, âm /uː/ kéo dài"
                          className={`w-full px-3 py-2 rounded-xl border text-xs ${inputBg}`}
                        />
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
    </div>
  );
};

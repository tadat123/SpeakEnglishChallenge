import React, { useEffect, useState, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  Home,
  Calendar,
  Trophy,
  User,
  Volume2,
  Lock,
  CheckCircle2,
  XCircle,
  Star,
  Clock,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Award,
  ShieldCheck,
  Unlock,
  BarChart3,
  Play,
  Zap,
  Sun,
  Moon,
  Bell,
  BellRing,
  X,
  Smartphone,
  Laptop,
  Tablet,
  Trash2,
  Users,
  FileText,
  Clapperboard,
  CalendarDays,
  Infinity as InfinityIcon,
  Target,
  Gift,
  Loader2,
  Send,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { AuthScreen } from './components/AuthScreen';
import { extractResetPasswordParams } from './utils/validation';
import { AdminDashboard } from './components/AdminDashboard';
import { buildAdminHash, isAdminUrl, parseAdminRoute } from './utils/adminRoutes';
import { ResponsiveBackground, PerfmonsterFooter } from './components/LayoutDecor';
import {
  PronunciationChallengeQ11,
  Q11SubmissionData,
} from './components/PronunciationChallengeQ11';
import { SpeakRightEventsPopup, EventPopupItem } from './components/SpeakRightEventsPopup';
import { playPronunciation } from './utils/audio';
import { resolveMediaUrl } from './utils/clientApiFallback';
import { Lang, TRANSLATIONS } from './utils/i18n';
import {
  registerPwaServiceWorker,
  syncAndSubscribePwaPush,
  unsubscribePwaPush,
  getOrCreatePwaDeviceId,
  triggerLocalServiceWorkerNotification,
  sendTestNativeNotification,
  getNotificationPermissionState,
  onPwaUpdate,
  checkForAppUpdate,
  applyAppUpdate,
} from './utils/pwaPush';

type TabType = 'home' | 'challenges' | 'leaderboard' | 'profile' | 'admin';

const VALID_TABS: TabType[] = ['home', 'challenges', 'leaderboard', 'profile', 'admin'];
/** Các tab khách (chưa đăng nhập) được phép xem */
const GUEST_TABS: TabType[] = ['home', 'leaderboard'];
const GUEST_MODE_KEY = 'sr_guest_mode';
const GUEST_PENDING_KEY = 'sr_guest_pending_submission';

interface GuestPendingSubmission {
  dayNumber: number;
  title: string;
  dateLabel: string;
  answers: Record<string, 'A' | 'B' | 'C' | 'D'>;
  clientTimeMs: number;
  q11Pronunciation: any;
  /** Hạn cuối để lưu (00:00 ngày hôm sau) */
  expiresAt: number;
}

function getNextMidnightMs(): number {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0).getTime();
}

function readGuestPending(): GuestPendingSubmission | null {
  try {
    const raw = localStorage.getItem(GUEST_PENDING_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GuestPendingSubmission;
    if (!parsed || Date.now() >= parsed.expiresAt) {
      localStorage.removeItem(GUEST_PENDING_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function getTabFromHash(): TabType {
  if (isAdminUrl()) {
    return 'admin';
  }
  const hash = window.location.hash.replace(/^#\/?/, '').split('/')[0] as TabType;
  return VALID_TABS.includes(hash) ? hash : 'home';
}

const HOME_EVENT_THEMES: Record<
  string,
  {
    borderBg: string;
    badgeBg: string;
    titleColor: string;
    chipBg: string;
    noteBg: string;
    arrowBg: string;
  }
> = {
  amber: {
    borderBg:
      'border-amber-300 dark:border-amber-800/60 bg-gradient-to-r from-amber-50/90 via-orange-50/60 to-amber-100/50 dark:from-amber-950/40 dark:via-slate-900 dark:to-amber-950/30',
    badgeBg: 'bg-amber-500',
    titleColor: 'text-amber-900 dark:text-amber-300',
    chipBg: 'border-amber-200 dark:border-amber-800/40 text-amber-900 dark:text-amber-200',
    noteBg: 'bg-amber-100/60 dark:bg-amber-950/60 text-amber-900/80 dark:text-amber-200/80',
    arrowBg: 'bg-amber-500 hover:bg-amber-400 shadow-amber-500/30',
  },
  blue: {
    borderBg:
      'border-sky-300 dark:border-sky-800/60 bg-gradient-to-r from-sky-50/90 via-blue-50/60 to-sky-100/50 dark:from-sky-950/40 dark:via-slate-900 dark:to-blue-950/30',
    badgeBg: 'bg-blue-600',
    titleColor: 'text-blue-900 dark:text-sky-300',
    chipBg: 'border-sky-200 dark:border-sky-800/40 text-blue-900 dark:text-sky-200',
    noteBg: 'bg-sky-100/60 dark:bg-sky-950/60 text-blue-900/80 dark:text-sky-200/80',
    arrowBg: 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/30',
  },
  purple: {
    borderBg:
      'border-purple-300 dark:border-purple-800/60 bg-gradient-to-r from-purple-50/90 via-violet-50/60 to-purple-100/50 dark:from-purple-950/40 dark:via-slate-900 dark:to-violet-950/30',
    badgeBg: 'bg-purple-600',
    titleColor: 'text-purple-900 dark:text-purple-300',
    chipBg: 'border-purple-200 dark:border-purple-800/40 text-purple-900 dark:text-purple-200',
    noteBg: 'bg-purple-100/60 dark:bg-purple-950/60 text-purple-900/80 dark:text-purple-200/80',
    arrowBg: 'bg-purple-600 hover:bg-purple-500 shadow-purple-600/30',
  },
  emerald: {
    borderBg:
      'border-emerald-300 dark:border-emerald-800/60 bg-gradient-to-r from-emerald-50/90 via-teal-50/60 to-emerald-100/50 dark:from-emerald-950/40 dark:via-slate-900 dark:to-emerald-950/30',
    badgeBg: 'bg-emerald-600',
    titleColor: 'text-emerald-900 dark:text-emerald-300',
    chipBg: 'border-emerald-200 dark:border-emerald-800/40 text-emerald-900 dark:text-emerald-200',
    noteBg: 'bg-emerald-100/60 dark:bg-emerald-950/60 text-emerald-900/80 dark:text-emerald-200/80',
    arrowBg: 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30',
  },
  rose: {
    borderBg:
      'border-rose-300 dark:border-rose-800/60 bg-gradient-to-r from-rose-50/90 via-pink-50/60 to-rose-100/50 dark:from-rose-950/40 dark:via-slate-900 dark:to-rose-950/30',
    badgeBg: 'bg-rose-600',
    titleColor: 'text-rose-900 dark:text-rose-300',
    chipBg: 'border-rose-200 dark:border-rose-800/40 text-rose-900 dark:text-rose-200',
    noteBg: 'bg-rose-100/60 dark:bg-rose-950/60 text-rose-900/80 dark:text-rose-200/80',
    arrowBg: 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30',
  },
  indigo: {
    borderBg:
      'border-indigo-300 dark:border-indigo-800/60 bg-gradient-to-r from-indigo-50/90 via-blue-50/60 to-indigo-100/50 dark:from-indigo-950/40 dark:via-slate-900 dark:to-indigo-950/30',
    badgeBg: 'bg-indigo-600',
    titleColor: 'text-indigo-900 dark:text-indigo-300',
    chipBg: 'border-indigo-200 dark:border-indigo-800/40 text-indigo-900 dark:text-indigo-200',
    noteBg: 'bg-indigo-100/60 dark:bg-indigo-950/60 text-indigo-900/80 dark:text-indigo-200/80',
    arrowBg: 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30',
  },
};

export const App: React.FC = () => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('sr_token'));
  const [user, setUser] = useState<any>(() => {
    const raw = localStorage.getItem('sr_user');
    return raw ? JSON.parse(raw) : null;
  });

  const [lang, setLang] = useState<Lang>(() => {
    const saved = localStorage.getItem('sr_lang') as Lang;
    return saved === 'en' || saved === 'ko' || saved === 'vi' ? saved : 'vi';
  });
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('sr_theme_v3') === 'dark';
  });

  const t = TRANSLATIONS[lang];
  /** Chọn nhanh chuỗi theo ngôn ngữ đang dùng (VI / EN / KO) */
  const L = (vi: string, en: string, ko: string) => (lang === 'en' ? en : lang === 'ko' ? ko : vi);
  const baseUrl = import.meta.env.BASE_URL || '/';

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
      localStorage.setItem('sr_theme_v3', 'dark');
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
      localStorage.setItem('sr_theme_v3', 'light');
    }
  }, [darkMode]);

  const handleChangeLang = (newLang: Lang) => {
    setLang(newLang);
    localStorage.setItem('sr_lang', newLang);
  };

  const [activeTab, setActiveTab] = useState<TabType>(() => getTabFromHash());
  const [challenges, setChallenges] = useState<any[]>([]);
  const [leaderboardData, setLeaderboardData] = useState<any>({
    scope: 'company',
    topList: [],
    myRank: null,
  });
  const [profileData, setProfileData] = useState<any>(null);

  const [lockedModalDay, setLockedModalDay] = useState<any | null>(null);
  const [activeQuiz, setActiveQuiz] = useState<{
    dayNumber: number;
    title: string;
    dateLabel: string;
    questions: any[];
    currentIndex: number;
    answers: Record<string, string>;
    elapsedSeconds: number;
    q10ElapsedSeconds?: number;
    q11Words?: any[];
    isExpired?: boolean;
  } | null>(null);
  const [quizResult, setQuizResult] = useState<any | null>(null);
  const [showDetailedReview, setShowDetailedReview] = useState(false);
  const [adminPreviewResult, setAdminPreviewResult] = useState(false);
  const [showEventsPopup, setShowEventsPopup] = useState(false);
  const [popupEvents, setPopupEvents] = useState<EventPopupItem[]>([]);
  const [eventsLoaded, setEventsLoaded] = useState<boolean>(false);
  const [pwaUpdateReady, setPwaUpdateReady] = useState<boolean>(false);
  const lastServerBootTimeRef = useRef<string | null>(null);
  const lastDbMtimeRef = useRef<number | null>(null);
  // ===== CHẾ ĐỘ KHÁCH (KHÔNG ĐĂNG NHẬP): chỉ làm bài hôm nay + xem bảng xếp hạng, KHÔNG lưu điểm =====
  const [guestMode, setGuestMode] = useState<boolean>(
    () => sessionStorage.getItem(GUEST_MODE_KEY) === 'true'
  );
  const [authView, setAuthView] = useState<{
    mode: 'login' | 'register' | 'forgot' | 'enter_otp' | 'reset';
    notice?: string | null;
    initialEmail?: string;
    initialToken?: string;
  } | null>(() => {
    const { resetToken, email } = extractResetPasswordParams();
    if (resetToken && email) {
      return {
        mode: 'reset',
        initialEmail: email,
        initialToken: resetToken,
      };
    }
    return null;
  });
  const [loginPromptMsg, setLoginPromptMsg] = useState<string | null>(null);
  const [isGlobalLoading, setIsGlobalLoading] = useState<boolean>(true);
  const [startingDay, setStartingDay] = useState<number | null>(null);
  const [submittingQuiz, setSubmittingQuiz] = useState<boolean>(false);
  const [guestSubmittedDay, setGuestSubmittedDay] = useState<any | null>(null);
  const [pendingSaveNotice, setPendingSaveNotice] = useState<string | null>(null);
  const isGuest = !token || !user;
  const [q11Data, setQ11Data] = useState<Q11SubmissionData | null>(null);
  const [midnightCountdown, setMidnightCountdown] = useState<string>('00:00:00');
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [challengeFilter, setChallengeFilter] = useState<'ALL' | 'COMPLETED' | 'EXPIRED' | 'IN_PROGRESS' | 'UNSTARTED'>('ALL');
  const [autoNextOnSelect, setAutoNextOnSelect] = useState<boolean>(true);
  const [gracePeriodNotice, setGracePeriodNotice] = useState<string | null>(null);
  const [forceLockModalMsg, setForceLockModalMsg] = useState<string | null>(null);
  const [livePushAlert, setLivePushAlert] = useState<{
    id: string;
    title: string;
    body: string;
    targetUrl: string;
    type?: string;
  } | null>(null);

  // ===== QUẢN LÝ THÔNG BÁO TỪ BAN TỔ CHỨC / ADMIN =====
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifModal, setShowNotifModal] = useState<boolean>(false);
  const getLastReadNotifKey = (uid?: string | null) =>
    `sr_last_read_notif_${uid || 'guest'}`;
  const [lastReadNotifTime, setLastReadNotifTime] = useState<number>(() => {
    const saved = localStorage.getItem(getLastReadNotifKey(user?.id));
    return saved ? Number(saved) : 0;
  });

  useEffect(() => {
    const saved = localStorage.getItem(getLastReadNotifKey(user?.id));
    setLastReadNotifTime(saved ? Number(saved) : 0);
  }, [user?.id]);

  const markAllNotifsAsRead = () => {
    const now = Date.now();
    setLastReadNotifTime(now);
    localStorage.setItem(getLastReadNotifKey(user?.id), String(now));
  };

  const unreadNotifCount =
    (user?.id
      ? notifications.filter((n) => new Date(n.deliveredAt).getTime() > lastReadNotifTime).length
      : 0) + (pwaUpdateReady ? 1 : 0);

  const getQuizProgressKey = (dayNum: number) =>
    `sr_quiz_progress_${user?.id || 'guest'}_day_${dayNum}`;

  const readSavedQuizProgress = (dayNum: number): {
    currentIndex?: number;
    answers?: Record<string, string>;
    elapsedSeconds?: number;
    q10ElapsedSeconds?: number;
    q11Data?: Q11SubmissionData | null;
    questions?: any[];
  } | null => {
    try {
      const raw = localStorage.getItem(getQuizProgressKey(dayNum));
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  };

  const clearSavedQuizProgress = (dayNum: number) => {
    try {
      localStorage.removeItem(getQuizProgressKey(dayNum));
    } catch {}
  };

  // Toast thông báo người dùng
  const [toast, setToast] = useState<string>('');
  const [errorToast, setErrorToast] = useState<string>('');

  const showMessage = (msg: string, isErr = false) => {
    if (isErr) {
      setErrorToast(msg);
      setTimeout(() => setErrorToast(''), 4500);
    } else {
      setToast(msg);
      setTimeout(() => setToast(''), 4500);
    }
  };

  // Quản lý các thiết bị đã đăng nhập của người dùng
  const [userDevices, setUserDevices] = useState<any[]>([]);
  const [loadingDevices, setLoadingDevices] = useState<boolean>(false);

  const fetchUserDevices = async () => {
    if (!token) return;
    setLoadingDevices(true);
    try {
      const res = await fetch('/api/profile/devices', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUserDevices(data.devices || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDevices(false);
    }
  };

  const handleRemoveDevice = async (deviceId: string) => {
    if (!token) return;
    if (!window.confirm(t.removeDeviceConfirm)) return;
    try {
      const res = await fetch(`/api/profile/devices/${deviceId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        fetchUserDevices();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Tự động đếm ngược đến 00:00 mỗi ngày & tự động mở Challenge mới đúng 00:00:00
  useEffect(() => {
    let lastDateNum = new Date().getDate();
    const updateClock = () => {
      const now = new Date();
      const nextMidnight = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,
        0,
        0,
        0,
        0
      );
      const diffSec = Math.max(0, Math.floor((nextMidnight.getTime() - now.getTime()) / 1000));
      const hh = String(Math.floor(diffSec / 3600)).padStart(2, '0');
      const mm = String(Math.floor((diffSec % 3600) / 60)).padStart(2, '0');
      const ss = String(diffSec % 60).padStart(2, '0');
      setMidnightCountdown(`${hh}:${mm}:${ss}`);

      // Khi bước qua 00:00 sang ngày mới -> Tự động mở khóa Challenge tiếp theo và công bố kết quả ngày vừa kết thúc
      if (now.getDate() !== lastDateNum) {
        lastDateNum = now.getDate();
        fetchAllData();
      }
    };
    updateClock();
    const timerId = setInterval(updateClock, 1000);
    return () => clearInterval(timerId);
  }, [token]);

  // Hệ thống biến giao diện Sáng / Tối tường minh (Mờ nhẹ 58%-65% trên Mobile/Tablet để nhìn xuyên thấy cảnh nền Shin-chan)
  const cardBg = darkMode
    ? 'bg-slate-900/60 lg:bg-slate-900/80 border-slate-700/60 text-slate-100 backdrop-blur-[2px] lg:backdrop-blur-sm'
    : 'bg-white/60 lg:bg-white/80 border-white/70 text-slate-800 backdrop-blur-[2px] lg:backdrop-blur-sm';
  const subCardBg = darkMode
    ? 'bg-slate-800/55 lg:bg-slate-800/75 border-slate-700/60 text-slate-100'
    : 'bg-white/55 lg:bg-slate-50/80 border-white/70 text-slate-800';
  const textPrimary = darkMode ? 'text-white' : 'text-slate-900';
  const textSecondary = darkMode ? 'text-slate-300' : 'text-slate-600';

  const getHeaders = (withJson = false): Record<string, string> => {
    const h: Record<string, string> = {
      Authorization: `Bearer ${token}`,
    };
    if (withJson) h['Content-Type'] = 'application/json';
    return h;
  };

  const navigateToTab = (tab: TabType) => {
    // Khách chỉ được vào Trang chủ (bài hôm nay) & Bảng xếp hạng
    if (isGuest && !GUEST_TABS.includes(tab)) {
      setLoginPromptMsg(
        L(
          'Tính năng này chỉ dành cho tài khoản đã đăng nhập. Đăng nhập hoặc tạo tài khoản để xem lộ trình 21 ngày, làm bù bài các ngày trước và theo dõi điểm của bạn.',
          'This feature requires an account. Log in or sign up to see the 21-day journey, catch up on previous days and track your score.',
          '로그인한 계정만 이용할 수 있습니다. 로그인 또는 회원가입 후 21일 여정, 지난 챌린지, 내 점수를 확인하세요.'
        )
      );
      return;
    }
    setActiveQuiz(null);
    setQuizResult(null);
    setShowDetailedReview(false);
    setLockedModalDay(null);
    setActiveTab(tab);
    if (tab === 'admin') {
      const targetAdminRoute = parseAdminRoute();
      const targetHash = buildAdminHash(targetAdminRoute.subTab, targetAdminRoute.dayNumber);
      const cleanPath = window.location.pathname.replace(/\/admin(?:\/.*)?$/i, '/') || '/';
      if (window.location.pathname !== cleanPath || window.location.hash !== targetHash) {
        window.history.pushState(null, '', `${cleanPath}${window.location.search}${targetHash}`);
      }
    } else {
      window.location.hash = `#${tab}`;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const onHashChange = () => {
      // 1. Kiểm tra nếu URL chứa resetToken (Magic link đổi mật khẩu qua email)
      const { resetToken, email } = extractResetPasswordParams();
      if (resetToken && email) {
        setAuthView({
          mode: 'reset',
          initialEmail: email,
          initialToken: resetToken,
        });
        return;
      }

      const h = window.location.hash.replace(/^#\/?/, '');
      if (h.startsWith('quiz') || h.startsWith('result') || h.startsWith('review')) {
        return;
      }
      setActiveQuiz(null);
      setQuizResult(null);
      setShowDetailedReview(false);
      setActiveTab(getTabFromHash());
    };
    window.addEventListener('hashchange', onHashChange);
    window.addEventListener('popstate', onHashChange);
    return () => {
      window.removeEventListener('hashchange', onHashChange);
      window.removeEventListener('popstate', onHashChange);
    };
  }, []);

  const fetchAllData = async () => {
    try {
      if (!token) {
        // Chế độ khách mặc định (vào web lần đầu chưa đăng nhập): tải bài hôm nay + bảng xếp hạng công khai + sự kiện (KHÔNG tải thông báo người dùng)
        setNotifications([]);
        const [todayRes, lbRes, evRes] = await Promise.all([
          fetch('/api/public/today'),
          fetch('/api/public/leaderboard'),
          fetch('/api/events', { cache: 'no-store' }).catch(() => null),
        ]);
        if (todayRes.ok) {
          const data = await todayRes.json();
          setChallenges(data.challenge ? [data.challenge] : []);
        }
        if (lbRes.ok) setLeaderboardData(await lbRes.json());
        try {
          if (evRes && evRes.ok) {
            const evData = await evRes.json();
            if (Array.isArray(evData.events)) {
              setPopupEvents(evData.events);
              setEventsLoaded(true);
            }
          }
        } catch {}
        return;
      }

      const [chalRes, lbRes, profRes, notifRes, evRes] = await Promise.all([
        fetch('/api/challenges', { headers: getHeaders() }),
        fetch('/api/leaderboard?scope=company', {
          headers: getHeaders(),
        }),
        fetch('/api/profile/me', { headers: getHeaders() }),
        fetch('/api/notifications', { headers: getHeaders(false) }).catch(() => null),
        fetch('/api/events', { headers: getHeaders(false), cache: 'no-store' }).catch(() => null),
      ]);

      if (chalRes.status === 401) {
        handleLogout();
        return;
      }

      if (chalRes.ok) setChallenges(await chalRes.json());
      if (lbRes.ok) setLeaderboardData(await lbRes.json());
      if (notifRes && notifRes.ok) {
        const nData = await notifRes.json();
        if (Array.isArray(nData.notifications)) setNotifications(nData.notifications);
      }
      if (evRes && evRes.ok) {
        const evData = await evRes.json();
        if (Array.isArray(evData.events)) {
          setPopupEvents(evData.events);
          setEventsLoaded(true);
        }
      }
      if (profRes.ok) {
        const prof = await profRes.json();
        setProfileData(prof);
        setUser(prof.user);
        localStorage.setItem('sr_user', JSON.stringify(prof.user));
      }

      if (quizResult && !quizResult.resultsRevealed) {
        try {
          const rRes = await fetch(`/api/challenges/${quizResult.dayNumber}/result`, {
            headers: getHeaders(true),
          });
          if (rRes.ok) {
            const rData = await rRes.json();
            if (rData.resultsRevealed) {
              setQuizResult(rData);
            }
          }
        } catch {}
      }
    } catch (e) {
      console.error('Lỗi tải dữ liệu:', e);
    } finally {
      setIsGlobalLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [token]);

  useEffect(() => {
    if (!token) return;
    const h = window.location.hash.replace('#', '');
    if ((h.startsWith('result/') || h.startsWith('review/')) && !quizResult) {
      const dayNum = parseInt(h.split('/')[1], 10);
      if (dayNum) {
        fetch(`/api/challenges/${dayNum}/result`, { headers: getHeaders(true) })
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (data) {
              setQuizResult(data);
              setShowDetailedReview(h.startsWith('review/'));
            }
          })
          .catch(() => {});
      }
    }
  }, [token]);

  useEffect(() => {
    if (activeTab === 'profile') {
      fetchUserDevices();
    }
  }, [activeTab, token]);

  // Khách mở thẳng link #challenges / #profile / #admin -> đưa về Trang chủ (trừ khi đang mở màn hình Đăng nhập để vào Admin)
  useEffect(() => {
    if (isGuest && !GUEST_TABS.includes(activeTab)) {
      if (activeTab === 'admin' && authView !== null) {
        return;
      }
      setActiveTab('home');
      window.location.hash = '#home';
      return;
    }
    // Tài khoản thường (không phải ADMIN) truy cập #admin -> đưa về Trang chủ
    if (!isGuest && activeTab === 'admin' && user?.role !== 'ADMIN') {
      setActiveTab('home');
      window.location.hash = '#home';
    }
  }, [isGuest, activeTab, authView, user?.role]);

  // Đăng ký Service Worker PWA, đồng bộ cập nhật phiên bản & Nhận thông báo đẩy
  useEffect(() => {
    registerPwaServiceWorker();

    // 1. Lắng nghe tín hiệu phiên bản PWA mới
    const unsubscribePwaUpdate = onPwaUpdate((hasUpdate) => {
      if (hasUpdate) {
        setPwaUpdateReady(true);
      }
    });

    // 2. Chủ động kiểm tra cập nhật ngay khi mở app
    checkForAppUpdate();

    // Đọc danh sách ID thông báo đã hiển thị của riêng tài khoản này từ localStorage để không bị lặp lại
    const isAuthenticated = Boolean(token && user?.id);
    const SEEN_NOTIF_KEY = `sr_seen_notif_${user?.id || 'guest'}`;
    const LAST_POLL_KEY = `sr_last_poll_${user?.id || 'guest'}`;

    const storedSeenIds = (() => {
      try {
        return new Set<string>(JSON.parse(localStorage.getItem(SEEN_NOTIF_KEY) || '[]'));
      } catch {
        return new Set<string>();
      }
    })();
    const seenIds = storedSeenIds;

    const saveSeenId = (id: string) => {
      if (!id) return;
      seenIds.add(id);
      try {
        const arr = Array.from(seenIds).slice(-200);
        localStorage.setItem(SEEN_NOTIF_KEY, JSON.stringify(arr));
      } catch {
        // ignore
      }
    };

    const onSwMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data) return;

      if (data.type === 'PWA_PUSH_RECEIVED' && data.payload) {
        // Khách vãng lai không nhận thông báo người dùng
        if (!isAuthenticated) return;

        const realId =
          data.payload.notificationId || data.payload.tag || `sw-${Date.now()}`;
        saveSeenId(realId);

        const incomingNotif = {
          id: realId,
          title: data.payload.title || 'SPEAK RIGHT 2026',
          body: data.payload.body || '',
          targetUrl: data.payload.url || '/#challenges',
          type: data.payload.type || 'PERSONALIZED',
          deliveredAt: new Date().toISOString(),
        };
        setNotifications((prev) =>
          prev.some((item) => item.id === incomingNotif.id) ? prev : [incomingNotif, ...prev]
        );
        fetchAllData();
      } else if (data.type === 'PWA_NOTIFICATION_CLICK' && data.targetUrl) {
        const cleanTab = data.targetUrl.replace(/^.*#/, '').split('/')[0] as TabType;
        if (VALID_TABS.includes(cleanTab)) {
          navigateToTab(cleanTab);
        }
      }
    };

    navigator.serviceWorker?.addEventListener('message', onSwMessage);

    // Chỉ tự động đồng bộ Web Push khi người dùng ĐÃ đăng nhập tài khoản (chặn khách vãng lai)
    registerPwaServiceWorker().then(() => {
      if (isAuthenticated && getNotificationPermissionState() === 'granted') {
        syncAndSubscribePwaPush({ user, token, askPermission: false });
      }
    });

    // TẦNG CACHE 3: SMART ADAPTIVE POLLING (LƯU MỐC LAST POLL THEO TỪNG USER, CHỈ GỬI 1 LẦN DUY NHẤT)
    let lastPollTime = (() => {
      if (!isAuthenticated) return 0;
      const saved = Number(localStorage.getItem(LAST_POLL_KEY) || 0);
      return Number.isFinite(saved) && saved > 0 ? saved : 0;
    })();
    let pollTimer: any = null;
    let consecutiveEmpties = 0;
    const deviceId = getOrCreatePwaDeviceId();

    const executePoll = async () => {
      // Tuyệt đối không poll hoặc bật thông báo cho khách vãng lai chưa đăng nhập
      if (!isAuthenticated || !token || !user?.id) return;

      try {
        const res = await fetch(
          `/api/push/poll?since=${lastPollTime}&deviceId=${encodeURIComponent(deviceId)}`,
          {
            headers: { Authorization: `Bearer ${token}` },
            cache: 'no-store',
          }
        );
        if (!res.ok) return;
        const data = await res.json();

        // Tự động đồng bộ lại khi Backend khởi động lại hoặc DB cập nhật
        if (data.serverBootTime) {
          if (lastServerBootTimeRef.current && lastServerBootTimeRef.current !== data.serverBootTime) {
            console.log('[PWA Sync] Backend vừa khởi động lại / cập nhật mới. Đang đồng bộ lại dữ liệu...');
            fetchAllData();
          }
          lastServerBootTimeRef.current = data.serverBootTime;
        }
        if (data.dbMtime) {
          if (lastDbMtimeRef.current && lastDbMtimeRef.current !== data.dbMtime) {
            console.log('[PWA Sync] Dữ liệu Backend vừa được cập nhật. Đang đồng bộ lại dữ liệu...');
            fetchAllData();
          }
          lastDbMtimeRef.current = data.dbMtime;
        }

        const notifs = Array.isArray(data.notifications) ? data.notifications : [];
        if (data.serverTime) {
          lastPollTime = data.serverTime;
          try {
            localStorage.setItem(LAST_POLL_KEY, String(data.serverTime));
          } catch {
            // ignore
          }
        }

        if (notifs.length > 0) {
          consecutiveEmpties = 0;
          for (const n of notifs) {
            if (seenIds.has(n.id)) continue;
            saveSeenId(n.id);

            // Đẩy toàn bộ thông báo vào Chuông Thông Báo (không bật banner ngoài màn hình)
            setNotifications((prev) =>
              prev.some((item) => item.id === n.id)
                ? prev
                : [
                    {
                      ...n,
                      deliveredAt: n.deliveredAt || new Date().toISOString(),
                    },
                    ...prev,
                  ]
            );

            triggerLocalServiceWorkerNotification({
              title: n.title,
              body: n.body,
              targetUrl: n.targetUrl || './#challenges',
              type: n.type,
              tag: n.id,
            });

            fetchAllData();
          }
        } else {
          consecutiveEmpties += 1;
        }
      } catch {
        // ignore transient poll error
      }
    };

    const scheduleNextPoll = () => {
      if (pollTimer) clearTimeout(pollTimer);

      let delay = 5000;
      if (typeof document !== 'undefined' && document.hidden) {
        delay = 25000;
      } else if (consecutiveEmpties > 5) {
        delay = 10000;
      }

      pollTimer = setTimeout(async () => {
        await executePoll();
        scheduleNextPoll();
      }, delay);
    };

    // Khi người dùng quay lại tab (visibilitychange), poll ngay lập tức và kiểm tra cập nhật PWA
    const onVisibilityChange = () => {
      if (typeof document !== 'undefined' && !document.hidden) {
        consecutiveEmpties = 0;
        executePoll();
        scheduleNextPoll();
        checkForAppUpdate();
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    scheduleNextPoll();

    // Định kỳ 3 phút tự động kiểm tra phiên bản PWA mới
    const pwaCheckInterval = setInterval(() => {
      checkForAppUpdate();
    }, 3 * 60 * 1000);

    return () => {
      unsubscribePwaUpdate();
      navigator.serviceWorker?.removeEventListener('message', onSwMessage);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (pollTimer) clearTimeout(pollTimer);
      clearInterval(pwaCheckInterval);
    };
  }, [token, user?.id]);

  useEffect(() => {
    if (!activeQuiz) {
      setGracePeriodNotice(null);
      return;
    }
    const timer = setInterval(() => {
      setActiveQuiz((prev) => {
        if (!prev) return null;
        // Nếu đã hoàn thành hoặc đang ở Câu 11 (tự luyện đọc phát âm) -> DỪNG ĐỒNG HỒ TÍNH GIỜ!
        if (prev.currentIndex >= prev.questions.length) {
          return prev;
        }
        return { ...prev, elapsedSeconds: prev.elapsedSeconds + 1 };
      });
    }, 1000);

    const lockCheckTimer = setInterval(async () => {
      // Khách không có phiên thi trên máy chủ -> bỏ qua kiểm tra khóa phiên
      if (!token) return;
      try {
        const res = await fetch(`/api/challenges/${activeQuiz.dayNumber}/session-status`, {
          headers: getHeaders(),
        });
        if (!res.ok) return;
        const statusData = await res.json();
        if (statusData.status === 'GRACE_PERIOD') {
          setGracePeriodNotice(statusData.message);
        } else if (statusData.status === 'FORCE_LOCKED') {
          clearSavedQuizProgress(activeQuiz.dayNumber);
          setActiveQuiz(null);
          setGracePeriodNotice(null);
          setForceLockModalMsg(statusData.message);
          fetchAllData();
        }
      } catch (e) {
        // Ignore transient network errors
      }
    }, 4000);

    return () => {
      clearInterval(timer);
      clearInterval(lockCheckTimer);
    };
  }, [activeQuiz?.dayNumber]);

  // Tự động lưu tiến độ làm bài (thời gian đang chạy, câu hỏi hiện tại, các đáp án đã chọn) vào LocalStorage & đồng bộ lên Server
  useEffect(() => {
    if (!activeQuiz) return;
    try {
      localStorage.setItem(
        getQuizProgressKey(activeQuiz.dayNumber),
        JSON.stringify({
          dayNumber: activeQuiz.dayNumber,
          currentIndex: activeQuiz.currentIndex,
          answers: activeQuiz.answers,
          elapsedSeconds: activeQuiz.elapsedSeconds,
          q10ElapsedSeconds: activeQuiz.q10ElapsedSeconds,
          q11Data,
          questions: activeQuiz.questions,
          updatedAt: Date.now(),
        })
      );
    } catch {}

    // Đồng bộ định kỳ lên server (mỗi 3 giây hoặc khi đổi câu hỏi / chọn đáp án)
    if (token && (activeQuiz.elapsedSeconds % 3 === 0 || activeQuiz.currentIndex >= 0)) {
      const syncTimeout = setTimeout(() => {
        fetch(`/api/challenges/${activeQuiz.dayNumber}/sync-progress`, {
          method: 'POST',
          headers: getHeaders(true),
          body: JSON.stringify({
            currentIndex: activeQuiz.currentIndex,
            answers: activeQuiz.answers,
            elapsedSeconds: activeQuiz.elapsedSeconds,
            q10ElapsedSeconds: activeQuiz.q10ElapsedSeconds,
          }),
        }).catch(() => {});
      }, 350);
      return () => clearTimeout(syncTimeout);
    }
  }, [
    activeQuiz?.dayNumber,
    activeQuiz?.currentIndex,
    activeQuiz?.answers,
    activeQuiz?.elapsedSeconds,
    activeQuiz?.q10ElapsedSeconds,
    q11Data,
    token,
  ]);

  // Tự động khôi phục bài đang làm nếu người dùng F5 (tải lại trang) khi đang ở đường dẫn #quiz/:dayNumber
  useEffect(() => {
    if (activeQuiz || startingDay || challenges.length === 0) return;
    const h = window.location.hash.replace('#', '');
    if (h.startsWith('quiz/')) {
      const dayNum = parseInt(h.split('/')[1], 10);
      const targetChallenge = challenges.find((c: any) => c.dayNumber === dayNum);
      if (targetChallenge && targetChallenge.status !== 'COMPLETED') {
        handleStartDay(targetChallenge);
      }
    }
  }, [challenges.length]);

  const handleAuthSuccess = async (newToken: string, newUser: any) => {
    localStorage.setItem('sr_token', newToken);
    localStorage.setItem('sr_user', JSON.stringify(newUser));
    sessionStorage.removeItem(GUEST_MODE_KEY);
    setGuestMode(false);
    setToken(newToken);
    setUser(newUser);
    setAuthView(null);

    // Tự động nộp bài và lưu điểm nếu khách đã làm bài hôm nay trước khi đăng nhập
    const pending = readGuestPending();
    if (pending) {
      try {
        const res = await fetch(`/api/challenges/${pending.dayNumber}/submit`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${newToken}`,
          },
          body: JSON.stringify({
            answers: pending.answers,
            clientTimeMs: pending.clientTimeMs,
            q11Pronunciation: pending.q11Pronunciation,
          }),
        });
        if (res.ok) {
          localStorage.removeItem(GUEST_PENDING_KEY);
          setPendingSaveNotice(
            L(
              `🎉 Đã lưu kết quả bài làm ${pending.title} vào tài khoản của bạn thành công!`,
              `🎉 Successfully saved your ${pending.title} score to your account!`,
              `🎉 ${pending.title} 결과가 계정에 성공적으로 저장되었습니다!`
            )
          );
        }
      } catch (e) {
        console.error('Lỗi tự động lưu điểm khách:', e);
      }
    }

    if (newUser?.role === 'ADMIN' && isAdminUrl()) {
      navigateToTab('admin');
      return;
    }

    navigateToTab('home');
  };

  const handleLogout = () => {
    void unsubscribePwaPush(token);
    localStorage.removeItem('sr_token');
    localStorage.removeItem('sr_user');
    sessionStorage.removeItem(GUEST_MODE_KEY);
    setToken(null);
    setUser(null);
    setNotifications([]);
    setLivePushAlert(null);
    setGuestMode(false);
    setAuthView(null);
    setActiveQuiz(null);
    setQuizResult(null);
    window.location.hash = '';
  };

  const handleSpeak = (id: string, textToSpeak: string, audioUrl?: string) => {
    setPlayingAudioId(id);
    playPronunciation(textToSpeak, audioUrl);
    setTimeout(() => {
      setPlayingAudioId((prev) => (prev === id ? null : prev));
    }, 1000);
  };

  const handleStartDay = async (dayItem: any) => {
    if (!dayItem) return;

    if (dayItem.status === 'LOCKED') {
      setLockedModalDay(dayItem);
      return;
    }

    // Nếu ngày này đã hoàn thành bài thi -> Mở ngay Bảng điểm & Giải thích đáp án chi tiết
    if (dayItem.status === 'COMPLETED' && token) {
      setStartingDay(dayItem.dayNumber);
      try {
        const res = await fetch(`/api/challenges/${dayItem.dayNumber}/result`, {
          headers: getHeaders(true),
        });
        if (res.ok) {
          const resultData = await res.json();
          setActiveQuiz(null);
          setQuizResult(resultData);
          setShowDetailedReview(false);
          window.location.hash = `#result/${dayItem.dayNumber}`;
          window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }
      } catch (e) {
        console.error('Failed to load completed challenge result:', e);
      } finally {
        setStartingDay(null);
      }
    }

    setStartingDay(dayItem.dayNumber);
    try {
      // Chế độ Khách: chỉ được làm bài của NGÀY HÔM NAY (không làm được các ngày trước chưa hoàn thành)
      if (isGuest) {
        if (todayChallenge && dayItem.dayNumber !== todayChallenge.dayNumber) {
          setLoginPromptMsg(
            L(
              'Khách chỉ được làm thử bài thi của ngày hôm nay. Vui lòng đăng nhập hoặc tạo tài khoản để làm các ngày khác!',
              "Guests can only take today's challenge. Please log in or register to take challenges from other days!",
              '게스트는 오늘의 챌린지만 참여할 수 있습니다. 다른 날짜의 챌린지는 로그인 후 이용해 주세요!'
            )
          );
          return;
        }

        const guestId = localStorage.getItem('sr_guest_id') || `g-${Date.now()}`;
        localStorage.setItem('sr_guest_id', guestId);
        const res = await fetch(`/api/public/challenges/${dayItem.dayNumber}/start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ guestId }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);

        const localSaved = readSavedQuizProgress(data.dayNumber);
        const questionsToUse =
          Array.isArray(localSaved?.questions) && localSaved.questions.length > 0
            ? localSaved.questions
            : data.questions;
        const maxIdx = Array.isArray(questionsToUse) ? questionsToUse.length : 10;
        const restoredIdx =
          typeof localSaved?.currentIndex === 'number'
            ? Math.min(Math.max(0, localSaved.currentIndex), maxIdx)
            : 0;
        const restoredAnswers = localSaved?.answers || {};
        const restoredElapsed = Math.max(0, localSaved?.elapsedSeconds || 0);

        setQuizResult(null);
        setShowDetailedReview(false);
        setAdminPreviewResult(false);
        setQ11Data(localSaved?.q11Data || null);
        setActiveQuiz({
          dayNumber: data.dayNumber,
          title: data.title,
          dateLabel: data.dateLabel,
          questions: questionsToUse,
          currentIndex: restoredIdx,
          answers: restoredAnswers,
          elapsedSeconds: restoredElapsed,
          q10ElapsedSeconds: localSaved?.q10ElapsedSeconds,
          q11Words: data.q11Words,
          isExpired: Boolean(data.isExpired || dayItem.status === 'EXPIRED'),
        });
        window.location.hash = `#quiz/${data.dayNumber}`;
        window.scrollTo({ top: 0, behavior: 'smooth' });

        const currentQ = questionsToUse?.[restoredIdx];
        if (currentQ?.hasPromptAudio && currentQ?.targetWord) {
          setTimeout(() => handleSpeak(`prompt-${currentQ.id}`, currentQ.targetWord), 350);
        }
        return;
      }

      const res = await fetch(`/api/challenges/${dayItem.dayNumber}/start`, {
        method: 'POST',
        headers: getHeaders(true),
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      const localSaved = readSavedQuizProgress(data.dayNumber);
      const maxIdx = Array.isArray(data.questions) ? data.questions.length : 10;
      const mergedAnswers: Record<string, string> = {
        ...(data.answers || {}),
        ...(localSaved?.answers || {}),
      };
      const rawIdx =
        typeof localSaved?.currentIndex === 'number'
          ? localSaved.currentIndex
          : typeof data.currentIndex === 'number'
          ? data.currentIndex
          : 0;
      const restoredIdx = Math.min(Math.max(0, rawIdx), maxIdx);
      const restoredElapsed = Math.max(
        0,
        localSaved?.elapsedSeconds || 0,
        data.elapsedSeconds || 0
      );
      const restoredQ10Elapsed =
        localSaved?.q10ElapsedSeconds ?? data.q10ElapsedSeconds;

      setQuizResult(null);
      setShowDetailedReview(false);
      setAdminPreviewResult(false);
      setQ11Data(localSaved?.q11Data || null);
      setActiveQuiz({
        dayNumber: data.dayNumber,
        title: data.title,
        dateLabel: data.dateLabel,
        questions: data.questions,
        currentIndex: restoredIdx,
        answers: mergedAnswers,
        elapsedSeconds: restoredElapsed,
        q10ElapsedSeconds: restoredQ10Elapsed,
        q11Words: data.q11Words,
        isExpired: Boolean(data.isExpired || dayItem.status === 'EXPIRED'),
      });
      window.location.hash = `#quiz/${data.dayNumber}`;
      window.scrollTo({ top: 0, behavior: 'smooth' });

      const currentQ = data.questions?.[restoredIdx];
      if (currentQ?.hasPromptAudio && currentQ?.targetWord) {
        setTimeout(() => handleSpeak(`prompt-${currentQ.id}`, currentQ.targetWord), 350);
      }
    } catch (err: any) {
      alert(err.message || 'Không thể bắt đầu thử thách');
    } finally {
      setStartingDay(null);
    }
  };

  const handleSelectOption = (question: any, optionId: string) => {
    if (!activeQuiz) return;

    setActiveQuiz((prev) => {
      if (!prev) return null;
      const updatedAnswers = { ...prev.answers, [question.id]: optionId };
      return {
        ...prev,
        answers: updatedAnswers,
      };
    });

    if (autoNextOnSelect) {
      setTimeout(() => {
        setActiveQuiz((prev) => {
          // Cho phép tự động chuyển sang tới Câu 11 (index === questions.length)
          if (!prev || prev.currentIndex >= prev.questions.length) return prev;
          const nextIdx = prev.currentIndex + 1;
          const isEnteringQ11 = nextIdx >= prev.questions.length;
          if (isEnteringQ11 && token) {
            fetch(`/api/challenges/${prev.dayNumber}/finish-q10`, {
              method: 'POST',
              headers: getHeaders(true),
              body: JSON.stringify({
                elapsedSeconds: prev.q10ElapsedSeconds ?? prev.elapsedSeconds,
              }),
            }).catch(() => {});
          }
          const nextQ = prev.questions[nextIdx];
          if (nextQ?.hasPromptAudio && nextQ?.targetWord) {
            setTimeout(() => handleSpeak(`prompt-${nextQ.id}`, nextQ.targetWord), 250);
          }
          return {
            ...prev,
            currentIndex: nextIdx,
            ...(isEnteringQ11
              ? { q10ElapsedSeconds: prev.q10ElapsedSeconds ?? prev.elapsedSeconds }
              : {}),
          };
        });
      }, 280);
    }
  };

  const handleSubmitQuiz = async () => {
    if (!activeQuiz) return;
    setSubmittingQuiz(true);
    try {
      // Thời gian làm bài CHỈ TÍNH ĐẾN HẾT CÂU 10 (Câu 11 luyện đọc phát âm không tính giờ và không tính điểm)
      const completionSeconds =
        activeQuiz.currentIndex >= activeQuiz.questions.length
          ? (activeQuiz.q10ElapsedSeconds ?? activeQuiz.elapsedSeconds)
          : activeQuiz.elapsedSeconds;
      const clientTimeMs = Math.max(1, completionSeconds) * 1000;

      // Chế độ Khách: không lưu vào DB, tính điểm tạm thời và lưu Pending để bảo khách đăng nhập tạo tài khoản
      if (isGuest) {
        const questionsToGrade = activeQuiz.questions;
        let score = 0;
        let correctCount = 0;
        let wrongCount = 0;

        const detailedReview = questionsToGrade.map((q: any) => {
          const selectedOptionId = activeQuiz.answers?.[q.id] || null;
          let isCorrect = false;

          if (q.questionType === 'FILL_IN_THE_BLANK') {
            const userText = String(activeQuiz.answers?.[q.id] || '')
              .trim()
              .toLowerCase()
              .replace(/['’]/g, "'");
            const expected = String(q.targetWord || '')
              .trim()
              .toLowerCase()
              .replace(/['’]/g, "'");
            isCorrect = userText.length > 0 && userText === expected;
          } else {
            isCorrect = selectedOptionId === q.correctOptionId;
          }

          if (isCorrect) {
            score += q.points;
            correctCount += 1;
          } else {
            wrongCount += 1;
          }
          const correctOption = q.options?.find((o: any) => o.id === q.correctOptionId);
          const selectedOption = q.options?.find((o: any) => o.id === selectedOptionId);
          return {
            questionId: q.id,
            orderIndex: q.orderIndex,
            questionType: q.questionType,
            promptText: q.promptText,
            statementText: q.statementText,
            targetWord: q.targetWord,
            promptAudioUrl: q.promptAudioUrl,
            promptVideoUrl: q.promptVideoUrl,
            options: q.options || [],
            selectedOptionId,
            selectedOptionText:
              q.questionType === 'FILL_IN_THE_BLANK'
                ? (activeQuiz.answers?.[q.id] || 'Chưa điền')
                : (selectedOption?.text || 'Chưa chọn'),
            correctOptionId: q.correctOptionId,
            correctOptionText:
              q.questionType === 'FILL_IN_THE_BLANK'
                ? q.targetWord
                : (correctOption?.text || ''),
            isCorrect,
            explanation: q.explanation,
          };
        });

        const pending: GuestPendingSubmission = {
          dayNumber: activeQuiz.dayNumber,
          title: activeQuiz.title,
          dateLabel: activeQuiz.dateLabel,
          answers: activeQuiz.answers as Record<string, 'A' | 'B' | 'C' | 'D'>,
          clientTimeMs,
          q11Pronunciation: q11Data,
          expiresAt: getNextMidnightMs(),
        };
        localStorage.setItem(GUEST_PENDING_KEY, JSON.stringify(pending));
        clearSavedQuizProgress(activeQuiz.dayNumber);

        setActiveQuiz(null);
        setGracePeriodNotice(null);
        setGuestSubmittedDay({
          dayNumber: activeQuiz.dayNumber,
          score,
          totalPoints: questionsToGrade.length * 10,
          correctCount,
          wrongCount,
        });

        setQuizResult({
          dayNumber: activeQuiz.dayNumber,
          score,
          totalPoints: questionsToGrade.length * 10,
          correctCount,
          wrongCount,
          timeSpentMs: clientTimeMs,
          isGuest: true,
          resultsRevealed: false,
          endsAt: new Date(getNextMidnightMs()).toISOString(),
          detailedReview,
          q11Pronunciation: q11Data,
        });

        window.location.hash = `#result/${activeQuiz.dayNumber}`;
        window.scrollTo({ top: 0, behavior: 'smooth' });
        confetti({
          particleCount: 80,
          spread: 65,
          origin: { y: 0.6 },
        });
        return;
      }

      const res = await fetch(`/api/challenges/${activeQuiz.dayNumber}/submit`, {
        method: 'POST',
        headers: getHeaders(true),
        body: JSON.stringify({
          answers: activeQuiz.answers as Record<string, 'A' | 'B' | 'C' | 'D'>,
          clientTimeMs,
          q11Pronunciation: q11Data,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 423 || data.code === 'FORCE_LOCKED') {
          clearSavedQuizProgress(activeQuiz.dayNumber);
          setActiveQuiz(null);
          setForceLockModalMsg(data.message);
          fetchAllData();
          return;
        }
        throw new Error(data.message);
      }

      clearSavedQuizProgress(activeQuiz.dayNumber);
      setActiveQuiz(null);
      setGracePeriodNotice(null);
      setQuizResult({
        ...data,
        q11Pronunciation: q11Data,
      });
      window.location.hash = `#result/${data.dayNumber}`;
      window.scrollTo({ top: 0, behavior: 'smooth' });
      confetti({
        particleCount: 80,
        spread: 65,
        origin: { y: 0.6 },
      });
      fetchAllData();
    } catch (err: any) {
      alert(err.message || 'Lỗi nộp bài');
    } finally {
      setSubmittingQuiz(false);
    }
  };

  const handleAdminToggleUnlock = async (dayNumber: number, unlockNow: boolean) => {
    await fetch(`/api/admin/challenges/${dayNumber}/unlock`, {
      method: 'PUT',
      headers: getHeaders(true),
      body: JSON.stringify({ unlockNow }),
    });
    setLockedModalDay(null);
    fetchAllData();
  };

  const handleExportLeaderboardCsv = () => {
    const rows = [
      ['Hạng', 'Số GEN (8 số)', 'Họ và Tên', 'Phòng Ban', 'Tổng Điểm', 'Số Ngày Hoàn Thành', 'Tổng Thời Gian Hoàn Thành'],
      ...(leaderboardData.topList || []).map((u: any) => [
        u.rank,
        `="${u.employeeId}"`,
        `"${u.fullName}"`,
        `"${u.department || ''}"`,
        u.totalScore,
        u.completedDays,
        `"${formatTimeMmSs(Math.round((u.totalTimeMs || 0) / 1000))}"`,
      ]),
    ];
    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'SpeakRight2026_DanhSachTraoGiai.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatTimeMmSs = (totalSec: number) => {
    const m = String(Math.floor(totalSec / 60)).padStart(2, '0');
    const s = String(totalSec % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  const formatRelativeTime = (isoString?: string) => {
    if (!isoString) return '';
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return L('Vừa xong', 'Just now', '방금 전');
    if (diffMins < 60) return `${diffMins} ${L('phút trước', 'mins ago', '분 전')}`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} ${L('giờ trước', 'hours ago', '시간 전')}`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return L('Hôm qua', 'Yesterday', '어제');
    if (diffDays < 7) return `${diffDays} ${L('ngày trước', 'days ago', '일 전')}`;
    const d = new Date(isoString);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  const pwaUpdateBanner = pwaUpdateReady ? (
    <div className="fixed top-2 inset-x-0 z-[10000] px-3 pointer-events-none flex justify-center">
      <div className="pointer-events-auto w-full max-w-lg p-3 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 text-white shadow-2xl border border-white/30 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <Sparkles className="w-5 h-5 text-amber-300 shrink-0 animate-pulse" />
          <div className="min-w-0">
            <div className="text-xs sm:text-sm font-black truncate">
              {L('Đã có phiên bản mới!', 'New version available!', '새 버전이 출시되었습니다!')}
            </div>
            <div className="text-[11px] text-blue-100 truncate">
              {L('Bấm Cập nhật để tải tính năng & dữ liệu mới nhất.', 'Tap Update to load the latest version.', '최신 버전을 불러오려면 업데이트를 누르세요.')}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => applyAppUpdate()}
          className="px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shrink-0 shadow-md transition"
        >
          {L('Cập nhật ngay', 'Update now', '지금 업데이트')}
        </button>
      </div>
    </div>
  ) : null;

  if (authView && (authView.mode === 'reset' || authView.mode === 'enter_otp' || !token || !user)) {
    return (
      <>
        {pwaUpdateBanner}
        <AuthScreen
          onAuthSuccess={handleAuthSuccess}
          lang={lang}
          onChangeLang={handleChangeLang}
          darkMode={darkMode}
          onToggleDarkMode={() => setDarkMode(!darkMode)}
          initialMode={authView.mode}
          initialEmail={authView.initialEmail}
          initialToken={authView.initialToken}
          guestNotice={authView.notice}
          onClose={() => {
            setAuthView(null);
            if (
              typeof window !== 'undefined' &&
              (window.location.hash.includes('resetToken') || window.location.search.includes('resetToken'))
            ) {
              window.history.replaceState({}, document.title, window.location.pathname + '#home');
            }
          }}
          onGuestMode={(target) => {
            setAuthView(null);
            navigateToTab(target);
          }}
        />
      </>
    );
  }

  const todayChallenge =
    challenges.find((c) => c.isToday) ||
    challenges.find((c) => !c.resultsRevealed && c.status === 'OPEN') ||
    challenges.find((c) => c.status === 'OPEN') ||
    challenges.find((c) => c.status === 'COMPLETED') ||
    challenges[0];
  const isTodayLocked = !todayChallenge || todayChallenge.status === 'LOCKED';
  const completedCount = profileData?.user?.completedDays ?? user?.completedDays ?? 0;
  const myTotalScore = profileData?.user?.totalScore ?? user?.totalScore ?? 0;
  const myRankNumber = leaderboardData?.myRank?.rank ?? profileData?.user?.rank ?? '-';

  // Khi tài khoản ADMIN mở trang Admin (#admin) -> Chuyển hoàn toàn sang Layout Admin CMS Portal (Có Sidebar + Main)
  if (activeTab === 'admin' && user?.role === 'ADMIN') {
    return (
      <div
        className={`min-h-screen relative transition-colors ${
          darkMode ? 'text-slate-100' : 'text-slate-800'
        }`}
      >
        {pwaUpdateBanner}
        <AdminDashboard
          token={token!}
          challenges={challenges}
          onRefreshGlobal={fetchAllData}
          onEventsChange={(updatedEvents) => {
            setPopupEvents(updatedEvents);
            setEventsLoaded(true);
          }}
          onExportCsv={handleExportLeaderboardCsv}
          lang={lang}
          darkMode={darkMode}
          user={user}
          onBackToUserMode={() => {
            fetchAllData();
            navigateToTab('home');
          }}
          onToggleDarkMode={() => setDarkMode(!darkMode)}
          onChangeLang={handleChangeLang}
          onLogout={handleLogout}
        />
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen flex flex-col relative transition-colors ${
        darkMode ? 'text-slate-100' : 'text-slate-800'
      }`}
    >
      {pwaUpdateBanner}
      <ResponsiveBackground darkMode={darkMode} />

      {/* Toast thông báo chung cho người dùng */}
      {toast && (
        <div className="fixed top-4 right-4 z-[9999] p-3.5 rounded-2xl bg-emerald-600 text-white text-xs sm:text-sm font-extrabold flex items-center gap-2 shadow-2xl animate-in fade-in slide-in-from-top-3">
          <span>✅ {toast}</span>
          <button onClick={() => setToast('')} className="text-white/80 hover:text-white p-0.5">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {errorToast && (
        <div className="fixed top-4 right-4 z-[9999] p-3.5 rounded-2xl bg-rose-600 text-white text-xs sm:text-sm font-extrabold flex items-center gap-2 shadow-2xl animate-in fade-in slide-in-from-top-3">
          <span>⚠️ {errorToast}</span>
          <button onClick={() => setErrorToast('')} className="text-white/80 hover:text-white p-0.5">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ================= TOP HEADER TRONG SUỐT NHẸ (GLASSMORPHISM) KHÔNG BỊ ĐẶC 2 BÊN DESKTOP ================= */}
      <header className="sticky top-0 z-30 px-2 sm:px-6 pt-2 pb-1">
        <div
          className={`max-w-5xl mx-auto flex items-center justify-between gap-2 rounded-2xl px-3 sm:px-5 py-2 backdrop-blur-md border transition-colors ${
            darkMode
              ? 'bg-slate-900/60 border-slate-700/60 text-white shadow-lg shadow-black/20'
              : 'bg-white/60 border-white/70 text-slate-900 shadow-sm'
          }`}
        >
          {/* Cột Trái: 3 Hàng (SPEAK RIGHT 2026 / Nguyễn Thị Thảo / GEN 20261234) */}
          <div
            onClick={() => navigateToTab('home')}
            className="flex items-center gap-2.5 cursor-pointer min-w-0"
          >
            <img
              src={`${import.meta.env.BASE_URL || '/'}logo.png`}
              alt="Speak Right 2026"
              className="w-11 h-11 sm:w-12 sm:h-12 object-contain drop-shadow-sm shrink-0"
            />
            <div className="leading-tight min-w-0">
              <div
                className={`text-xs sm:text-sm font-black truncate ${
                  darkMode ? 'text-blue-400' : 'text-blue-700'
                }`}
              >
                SPEAK RIGHT 2026
              </div>
              <div className={`text-xs sm:text-sm font-extrabold truncate ${textPrimary}`}>
                {isGuest ? L('Khách (Chưa đăng nhập)', 'Guest (Not logged in)', '게스트 (로그인 안 됨)') : user?.fullName}
              </div>
              <div className={`text-[11px] font-bold truncate ${textSecondary}`}>
                {isGuest
                  ? L('Chỉ làm bài hôm nay • Chưa lưu điểm', "Today's challenge only • Score not saved", '오늘 챌린지만 가능 • 미저장')
                  : `GEN ${user?.employeeId}`}
              </div>
            </div>
          </div>

          {/* Menu ngang cho Tablet & Desktop */}
          <nav
            className={`hidden md:flex items-center gap-1 p-1 rounded-2xl ${
              darkMode ? 'bg-slate-800/70' : 'bg-white/60'
            }`}
          >
            {[
              { id: 'home', label: t.home, icon: Home, locked: false },
              { id: 'challenges', label: t.challenges, icon: Calendar, locked: isGuest },
              { id: 'leaderboard', label: t.leaderboard, icon: Trophy, locked: false },
              { id: 'profile', label: t.profile, icon: User, locked: isGuest },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id && !activeQuiz && !quizResult;
              return (
                <button
                  key={item.id}
                  onClick={() => navigateToTab(item.id as TabType)}
                  className={`px-3 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : darkMode
                      ? 'text-slate-200 hover:text-white'
                      : 'text-slate-700 hover:text-blue-600'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                  {item.locked && <Lock className="w-3 h-3 text-amber-400" />}
                </button>
              );
            })}
          </nav>

          {/* Cột Phải: Thông báo + Đổi ngôn ngữ (VI / EN / KO) + Sáng/Tối (Icon only) + Đăng xuất */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Nút Chuông Thông Báo Ban tổ chức */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  const nextState = !showNotifModal;
                  setShowNotifModal(nextState);
                  if (nextState) {
                    markAllNotifsAsRead();
                  }
                }}
                className={`relative p-2 rounded-xl transition flex items-center justify-center ${
                  showNotifModal
                    ? 'bg-blue-600 text-white shadow-sm'
                    : darkMode
                    ? 'bg-slate-800/80 text-slate-200 hover:text-white hover:bg-slate-700/80'
                    : 'bg-white/80 text-slate-700 hover:text-blue-600 hover:bg-slate-100/80 border border-slate-200/50 shadow-xs'
                }`}
                title={L('Thông báo từ Ban tổ chức', 'Announcements from Admin', '운영진 공지사항')}
              >
                {unreadNotifCount > 0 ? (
                  <BellRing className="w-4 h-4 text-amber-400 animate-bounce" />
                ) : (
                  <Bell className="w-4 h-4" />
                )}
                {unreadNotifCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-rose-600 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-md animate-pulse">
                    {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                  </span>
                )}
              </button>
            </div>

            <div
              className={`p-0.5 rounded-xl flex items-center ${
                darkMode ? 'bg-slate-800/70' : 'bg-white/60'
              }`}
            >
              {(['vi', 'en', 'ko'] as Lang[]).map((l) => (
                <button
                  key={l}
                  onClick={() => handleChangeLang(l)}
                  className={`px-1.5 py-1 rounded-lg text-[10px] font-extrabold uppercase transition ${
                    lang === l
                      ? 'bg-blue-600 text-white shadow-sm'
                      : darkMode
                      ? 'text-slate-300 hover:text-white'
                      : 'text-slate-700 hover:text-blue-600'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>

            {/* Nút chuyển chế độ Sáng / Tối (Icon-only, hoàn toàn không có chữ Sáng / Tối) */}
            <button
              type="button"
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-xl transition flex items-center justify-center ${
                darkMode
                  ? 'bg-slate-800/80 text-amber-400 hover:bg-slate-700/80 hover:text-amber-300'
                  : 'bg-white/80 text-slate-700 hover:text-indigo-600 hover:bg-slate-100/80 border border-slate-200/50 shadow-xs'
              }`}
              title={darkMode ? t.lightMode : t.darkMode}
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {isGuest ? (
              <button
                type="button"
                onClick={() => setAuthView({ mode: 'login' })}
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-sm flex items-center gap-1 transition"
              >
                <span>{L('Đăng nhập', 'Log in', '로그인')}</span>
              </button>
            ) : (
              <button
                onClick={handleLogout}
                title={t.logout}
                className={`p-2 rounded-xl transition ${
                  darkMode
                    ? 'bg-slate-800/70 text-slate-300 hover:text-red-400'
                    : 'bg-white/60 text-slate-700 hover:bg-red-50 hover:text-red-600'
                }`}
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ================= NỘI DUNG CHÍNH ================= */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-3 sm:px-6 pt-3 pb-6">
        <SpeakRightEventsPopup
          lang={lang}
          darkMode={darkMode}
          externalOpen={showEventsPopup}
          onExternalClose={() => setShowEventsPopup(false)}
          onStartDailyChallenge={() => handleStartDay(todayChallenge)}
          events={popupEvents}
          eventsLoaded={eventsLoaded}
        />

        {/* Thông báo tự động lưu điểm bài làm của khách sau khi đăng nhập */}
        {pendingSaveNotice && (
          <div className="mb-4 p-3.5 sm:p-4 rounded-2xl bg-emerald-600 text-white shadow-xl flex items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-2.5 text-xs sm:text-sm font-extrabold">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>{pendingSaveNotice}</span>
            </div>
            <button
              type="button"
              onClick={() => setPendingSaveNotice(null)}
              className="p-1 rounded-lg bg-white/20 hover:bg-white/30 text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Banner chế độ Khách nhắc nhở */}
        {isGuest && !activeQuiz && (
          <div className="mb-4 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-amber-500/90 via-orange-500/90 to-amber-600/90 text-slate-950 font-bold shadow-lg border border-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-2.5 min-w-0">
              <span className="text-xl shrink-0">⚠️</span>
              <div className="text-xs sm:text-sm leading-snug">
                <span className="font-black">{t.guestModeLabel}:</span>{' '}
                {t.guestNotice}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => setAuthView({ mode: 'login' })}
                className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-white text-xs font-black shadow-sm transition"
              >
                {L('Đăng nhập', 'Log in', '로그인')}
              </button>
              <button
                type="button"
                onClick={() => setAuthView({ mode: 'register' })}
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-amber-100 text-slate-950 text-xs font-black shadow-sm transition"
              >
                {L('Tạo tài khoản', 'Sign up', '가입')}
              </button>
            </div>
          </div>
        )}

        {/* ---------- A. LOADING SPINNER HOẶC MÀN HÌNH LÀM BÀI ---------- */}
        {isGlobalLoading && challenges.length === 0 ? (
          <div className={`max-w-md mx-auto my-16 p-8 rounded-3xl shadow-xl border text-center backdrop-blur-md ${cardBg}`}>
            <div className="w-16 h-16 mx-auto rounded-3xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4 shadow-inner">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
            <h3 className={`text-base sm:text-lg font-black ${textPrimary}`}>
              {L('Đang tải dữ liệu SpeakRight...', 'Loading SpeakRight data...', 'SpeakRight 데이터를 불러오는 중...')}
            </h3>
            <p className={`text-xs sm:text-sm mt-1.5 ${textSecondary}`}>
              {L('Vui lòng đợi giây lát trong khi kết nối tới máy chủ...', 'Please wait while connecting to the server...', '서버에 연결하는 동안 잠시 기다려 주세요...')}
            </p>
          </div>
        ) : activeQuiz ? (
          <div className={`max-w-2xl mx-auto rounded-3xl shadow-xl border p-4 sm:p-6 backdrop-blur-md ${cardBg}`}>
            {gracePeriodNotice && (
              <div className="mb-3 p-3 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 text-xs font-extrabold flex items-center gap-2">
                <span>{gracePeriodNotice}</span>
              </div>
            )}

            {activeQuiz.isExpired && (
              <div className="mb-3 p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs font-bold flex items-center gap-2">
                <span>🎯 {L('Chế độ luyện tập: Bạn đang làm bài thi của ngày trước. Bài làm này dùng để luyện tập và xem đáp án giải thích chi tiết, không tính điểm vào Bảng Xếp Hạng.', 'Practice Mode: You are taking a previous day challenge. Practice only and score will not be counted towards official Leaderboard.', '연습 모드: 이전 일차 챌린지입니다. 연습 전용이며 공식 리더보드 점수에는 반영되지 않습니다.')}</span>
              </div>
            )}

            {/* Thanh tiêu đề & Nút quay lại (Tự động bảo lưu thời gian và câu đang làm) */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-slate-700/60">
              <button
                onClick={() => navigateToTab('home')}
                className="p-1.5 -ml-1.5 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1 text-xs font-bold"
              >
                <ChevronLeft className="w-5 h-5" /> {t.backBtn}
              </button>
              <div className="text-center">
                <h2 className={`text-sm sm:text-base font-black ${textPrimary}`}>
                  {activeQuiz.title} ({activeQuiz.dateLabel})
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setAutoNextOnSelect(!autoNextOnSelect)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 shrink-0 border transition ${
                  autoNextOnSelect
                    ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
                    : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
                }`}
              >
                <Zap className="w-3 h-3" />
                {t.autoNext}: {autoNextOnSelect ? t.on : t.off}
              </button>
            </div>

            {/* BẢNG CÂU HỎI & THỜI GIAN ĐANG CHẠY (Question Board & Live Running Timer) */}
            <div
              className={`mt-3 p-3.5 rounded-2xl border ${
                darkMode
                  ? 'bg-slate-800/80 border-slate-700/80'
                  : 'bg-slate-50/95 border-slate-200/90'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-200/70 dark:border-slate-700/70">
                <div>
                  <div className={`text-xs font-black flex items-center gap-1.5 ${textPrimary}`}>
                    <span>📋 {L('Bảng Danh Sách Câu Hỏi & Thời Gian Làm Bài', 'Question Board & Live Timer', '문제 목록 및 실시간 타이머')}</span>
                  </div>
                  <div className={`text-[11px] font-semibold mt-0.5 ${textSecondary}`}>
                    {L(
                      `Đã trả lời: ${Object.keys(activeQuiz.answers).filter((k) => Boolean(activeQuiz.answers[k])).length}/${activeQuiz.questions.length} câu tính điểm • Tự động lưu tiến độ khi thoát ra`,
                      `Answered: ${Object.keys(activeQuiz.answers).filter((k) => Boolean(activeQuiz.answers[k])).length}/${activeQuiz.questions.length} graded questions • Auto-saved`,
                      `답변 완료: ${Object.keys(activeQuiz.answers).filter((k) => Boolean(activeQuiz.answers[k])).length}/${activeQuiz.questions.length} 문항 • 자동 저장됨`
                    )}
                  </div>
                </div>

                {/* Hộp hiển thị Đồng hồ thời gian chạy trực tiếp */}
                {activeQuiz.currentIndex >= activeQuiz.questions.length ? (
                  <div
                    className="flex items-center gap-2 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-400/50 px-3.5 py-2 rounded-xl text-xs font-black shadow-xs shrink-0"
                    title={L('Đồng hồ tính giờ thi đã dừng sau Câu 10', 'Exam timer stopped after Question 10', '10번 문제 이후 타이머 정지')}
                  >
                    <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <div>
                      <div className="text-[10px] uppercase tracking-wider opacity-80">
                        {L('Đã chốt giờ thi (Câu 1–10)', 'Time Locked (Q1–Q10)', '시간 고정 (1~10번)')}
                      </div>
                      <div className="text-sm sm:text-base font-mono font-black leading-none mt-0.5">
                        {formatTimeMmSs(activeQuiz.q10ElapsedSeconds ?? activeQuiz.elapsedSeconds)}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5 bg-rose-500/10 dark:bg-rose-950/60 text-rose-600 dark:text-rose-300 border border-rose-300 dark:border-rose-700/80 px-3.5 py-2 rounded-xl shrink-0 shadow-xs">
                    <div className="relative flex items-center justify-center">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping absolute" />
                      <Clock className="w-4 h-4 relative" />
                    </div>
                    <div>
                      <div className="text-[10px] font-extrabold uppercase tracking-wider opacity-85">
                        {L('Thời gian đang chạy', 'Running Time', '진행 시간')}
                      </div>
                      <div className="text-base sm:text-lg font-mono font-black leading-none mt-0.5">
                        {formatTimeMmSs(activeQuiz.elapsedSeconds)}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Lưới các nút số thứ tự câu hỏi 1 -> 10 + Câu 11 */}
              <div className="mt-3 grid grid-cols-6 sm:grid-cols-11 gap-1.5">
                {activeQuiz.questions.map((qItem, idx) => {
                  const answered = Boolean(
                    activeQuiz.answers[qItem.id] &&
                      String(activeQuiz.answers[qItem.id]).trim().length > 0
                  );
                  const isCurrent = activeQuiz.currentIndex === idx;
                  return (
                    <button
                      key={qItem.id}
                      type="button"
                      onClick={() => {
                        const wasAtQ11 = activeQuiz.currentIndex >= activeQuiz.questions.length;
                        if (wasAtQ11 && token) {
                          fetch(`/api/challenges/${activeQuiz.dayNumber}/resume-quiz`, {
                            method: 'POST',
                            headers: getHeaders(true),
                          }).catch(() => {});
                        }
                        setActiveQuiz((prev) => (prev ? { ...prev, currentIndex: idx } : null));
                      }}
                      className={`h-9 rounded-xl text-xs font-black transition flex items-center justify-center gap-0.5 relative ${
                        isCurrent
                          ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-400 scale-[1.03]'
                          : answered
                          ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-400/60'
                          : darkMode
                          ? 'bg-slate-900 text-slate-300 border border-slate-700 hover:border-blue-400'
                          : 'bg-white text-slate-700 border border-slate-200 hover:border-blue-400'
                      }`}
                      title={`Câu ${idx + 1}${answered ? ' (Đã trả lời)' : ' (Chưa làm)'}`}
                    >
                      <span>{idx + 1}</span>
                      {answered && !isCurrent && (
                        <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-black">
                          ✓
                        </span>
                      )}
                    </button>
                  );
                })}

                {/* Nút chuyển nhanh sang Câu 11 – Luyện phát âm 🎙️ (Không tính giờ, không tính điểm) */}
                <button
                  type="button"
                  onClick={() => {
                    const currentElapsed =
                      activeQuiz.q10ElapsedSeconds ?? activeQuiz.elapsedSeconds;
                    setActiveQuiz((prev) =>
                      prev
                        ? {
                            ...prev,
                            currentIndex: prev.questions.length,
                            q10ElapsedSeconds: prev.q10ElapsedSeconds ?? prev.elapsedSeconds,
                          }
                        : null
                    );
                    if (token) {
                      fetch(`/api/challenges/${activeQuiz.dayNumber}/finish-q10`, {
                        method: 'POST',
                        headers: getHeaders(true),
                        body: JSON.stringify({ elapsedSeconds: currentElapsed }),
                      }).catch(() => {});
                    }
                  }}
                  className={`h-9 rounded-xl text-xs font-black transition flex items-center justify-center gap-1 col-span-2 sm:col-span-1 ${
                    activeQuiz.currentIndex === activeQuiz.questions.length
                      ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-400 scale-[1.03]'
                      : q11Data?.submitted
                      ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-400/60'
                      : darkMode
                      ? 'bg-slate-900 text-indigo-300 border border-indigo-700/60 hover:border-indigo-400'
                      : 'bg-indigo-50 text-indigo-700 border border-indigo-200 hover:border-indigo-400'
                  }`}
                  title="Câu 11: Tự luyện phát âm (Không tính giờ & Không tính điểm)"
                >
                  <span>🎙️11</span>
                </button>
              </div>

              {/* Chú thích màu trạng thái câu hỏi */}
              <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-xs bg-blue-600 inline-block" />
                    {L('Câu đang mở', 'Current', '현재 문항')}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500 inline-block" />
                    {L('Đã chọn đáp án', 'Answered', '답변 완료')}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-xs border border-slate-400 inline-block" />
                    {L('Chưa làm', 'Unanswered', '미답변')}
                  </span>
                </div>
                <span>
                  {L('💡 Bấm vào số bất kỳ để chuyển nhanh tới câu đó', '💡 Tap any number to jump to that question', '💡 번호를 눌러 해당 문제로 이동하세요')}
                </span>
              </div>
            </div>

            {(() => {
              const answeredCount = Object.keys(activeQuiz.answers).length;
              const isQuestion11 = activeQuiz.currentIndex >= activeQuiz.questions.length;

              if (isQuestion11) {
                return (
                  <div className="mt-3">
                    <PronunciationChallengeQ11
                      lang={lang}
                      darkMode={darkMode}
                      value={q11Data}
                      onChange={setQ11Data}
                      words={activeQuiz.q11Words}
                    />

                    <div className="flex items-center justify-between gap-2.5 mt-5 pt-3.5 border-t border-slate-200/60">
                      <button
                        type="button"
                        onClick={() => {
                          if (token) {
                            fetch(`/api/challenges/${activeQuiz.dayNumber}/resume-quiz`, {
                              method: 'POST',
                              headers: getHeaders(true),
                            }).catch(() => {});
                          }
                          setActiveQuiz((prev) =>
                            prev ? { ...prev, currentIndex: prev.questions.length - 1 } : null
                          );
                        }}
                        className={`px-4 py-3 rounded-2xl border font-bold text-xs sm:text-sm ${
                          darkMode
                            ? 'border-slate-700 text-slate-300'
                            : 'border-slate-200 text-slate-600'
                        }`}
                      >
                        {t.prevQuestion}
                      </button>

                      <button
                        type="button"
                        onClick={handleSubmitQuiz}
                        disabled={submittingQuiz}
                        className="flex-1 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm shadow-lg shadow-emerald-600/25 transition flex items-center justify-center gap-2 disabled:opacity-60"
                      >
                        {submittingQuiz ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>{L('Đang nộp bài...', 'Submitting...', '제출 중...')}</span>
                          </>
                        ) : (
                          <span className="flex items-center gap-2">
                            <span>{t.submitQuiz} ({answeredCount}/{activeQuiz.questions.length})</span>
                            <span className="text-xs font-semibold opacity-90">
                              • ⏱️ {formatTimeMmSs(activeQuiz.q10ElapsedSeconds ?? activeQuiz.elapsedSeconds)}
                            </span>
                          </span>
                        )}
                      </button>
                    </div>
                  </div>
                );
              }

              const q = activeQuiz.questions[activeQuiz.currentIndex];
              const selectedOpt = activeQuiz.answers[q.id];

              return (
                <div className="mt-3">
                  <div
                    className={`border rounded-2xl p-4 sm:p-5 ${
                      darkMode
                        ? 'bg-slate-800/80 border-slate-700'
                        : 'bg-gradient-to-br from-blue-50/85 to-indigo-50/75 border-blue-100'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1">
                        <span className="inline-block text-[11px] font-extrabold bg-blue-600 text-white px-2.5 py-0.5 rounded-md mb-1.5">
                          {t.questionLabel} {activeQuiz.currentIndex + 1}/
                          {activeQuiz.questions.length} • {q.categoryLabel}
                        </span>
                        <h3 className={`text-base sm:text-lg font-extrabold leading-snug ${textPrimary}`}>
                          {q.promptText}
                        </h3>
                      </div>

                      {q.hasPromptAudio && (
                        <button
                          type="button"
                          onClick={() =>
                            handleSpeak(`prompt-${q.id}`, q.targetWord, q.promptAudioUrl)
                          }
                          className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white flex flex-col items-center justify-center shadow-lg shadow-blue-600/30 shrink-0 active:scale-95 transition ${
                            playingAudioId === `prompt-${q.id}`
                              ? 'ring-4 ring-blue-300 animate-pulse'
                              : ''
                          }`}
                        >
                          <Volume2 className="w-6 h-6" />
                          <span className="text-[9px] font-bold mt-0.5">{t.listenBtn}</span>
                        </button>
                      )}
                    </div>

                    {q.statementText && (
                      <div className="mt-4 p-4 sm:p-5 rounded-2xl bg-amber-50/95 dark:bg-amber-950/60 border-2 border-amber-300 dark:border-amber-600 text-amber-950 dark:text-amber-100 text-base sm:text-lg md:text-xl font-black leading-relaxed shadow-sm">
                        📌 {q.statementText}
                      </div>
                    )}

                    {q.promptVideoUrl && (
                      <div className="mt-3 rounded-2xl overflow-hidden bg-slate-950 border border-blue-200 flex justify-center">
                        <video
                          src={resolveMediaUrl(q.promptVideoUrl)}
                          controls
                          playsInline
                          className="max-h-56 w-full object-contain"
                        />
                      </div>
                    )}
                  </div>

                  {/* Dạng câu hỏi điền từ (FILL_IN_THE_BLANK) */}
                  {q.questionType === 'FILL_IN_THE_BLANK' ? (
                    <div
                      className={`mt-4 p-5 rounded-3xl border-2 space-y-3.5 shadow-sm ${
                        darkMode
                          ? 'bg-slate-800/80 border-blue-500/50'
                          : 'bg-white border-blue-200'
                      }`}
                    >
                      <label className={`block text-xs sm:text-sm font-black ${textPrimary}`}>
                        ✍️ {L(
                          'Nhập từ vựng tiếng Anh chính xác vào ô bên dưới:',
                          'Type the correct English word below:',
                          '아래 입력란에 정확한 영어 단어를 입력하세요:'
                        )}
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          autoFocus
                          autoComplete="off"
                          spellCheck="false"
                          placeholder={L(
                            'Gõ từ tiếng Anh tại đây (VD: registration)...',
                            'Type English word here (e.g. registration)...',
                            '영단어를 입력하세요 (예: registration)...'
                          )}
                          value={activeQuiz.answers[q.id] || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setActiveQuiz((prev) =>
                              prev ? { ...prev, answers: { ...prev.answers, [q.id]: val } } : null
                            );
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              if (activeQuiz.currentIndex < activeQuiz.questions.length - 1) {
                                setActiveQuiz((prev) =>
                                  prev ? { ...prev, currentIndex: prev.currentIndex + 1 } : null
                                );
                              } else {
                                setActiveQuiz((prev) =>
                                  prev
                                    ? {
                                        ...prev,
                                        currentIndex: prev.questions.length,
                                        q10ElapsedSeconds: prev.q10ElapsedSeconds ?? prev.elapsedSeconds,
                                      }
                                    : null
                                );
                                if (token) {
                                  fetch(`/api/challenges/${activeQuiz.dayNumber}/finish-q10`, {
                                    method: 'POST',
                                    headers: getHeaders(true),
                                    body: JSON.stringify({
                                      elapsedSeconds:
                                        activeQuiz.q10ElapsedSeconds ?? activeQuiz.elapsedSeconds,
                                    }),
                                  }).catch(() => {});
                                }
                              }
                            }
                          }}
                          className={`w-full px-4 py-3.5 text-base sm:text-lg font-black rounded-2xl border-2 outline-none transition ${
                            activeQuiz.answers[q.id]
                              ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100'
                              : darkMode
                              ? 'border-slate-700 bg-slate-900/60 text-white'
                              : 'border-slate-300 bg-slate-50 text-slate-900'
                          } focus:ring-4 focus:ring-blue-400/30`}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className={`font-semibold ${textSecondary}`}>
                          💡 {L(
                            'Gợi ý: Xem phiên âm & nghĩa ở khung trên, gõ từ rồi bấm "Tiếp theo"',
                            'Hint: Check phonetic & meaning above, type the word and tap "Next"',
                            '힌트: 위 발음기호와 뜻을 보고 단어를 입력한 뒤 "다음"을 누르세요'
                          )}
                        </span>
                        {activeQuiz.answers[q.id] && (
                          <span className="text-emerald-600 dark:text-emerald-400 font-extrabold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 inline" />
                            {L('Đã nhập', 'Entered', '입력됨')}
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Danh sách đáp án đã được xáo trộn ngẫu nhiên theo từng người chơi & KHÔNG hiển thị A, B, C, D */
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-3.5">
                      {q.options.map((opt: any, optIdx: number) => {
                        const isSelected = selectedOpt === opt.id;
                        const optAudioKey = `opt-${q.id}-${opt.id}`;
                        const displayLabel =
                          q.questionType === 'CHOOSE_AUDIO' && /^Audio [A-D]$/i.test(opt.text)
                            ? `${t.audioSamplePrefix} ${optIdx + 1}`
                            : opt.text;

                        return (
                          <div
                            key={opt.id}
                            onClick={() => handleSelectOption(q, opt.id)}
                            className={`flex items-center gap-3 p-3.5 sm:p-4 rounded-2xl border-2 cursor-pointer transition select-none active:scale-[0.99] ${
                              isSelected
                                ? darkMode
                                  ? 'border-blue-500 bg-blue-950/60 shadow-sm'
                                  : 'border-blue-600 bg-blue-50/90 shadow-sm'
                                : darkMode
                                ? 'border-slate-700 bg-slate-800/75 hover:border-blue-400'
                                : 'border-white/80 bg-white/80 hover:border-blue-300'
                            }`}
                          >
                            {opt.hasOptionAudio && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSpeak(
                                    optAudioKey,
                                    opt.spokenText || q.targetWord,
                                    opt.audioUrl
                                  );
                                }}
                                className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition ${
                                  playingAudioId === optAudioKey
                                    ? 'bg-blue-700 text-white ring-4 ring-blue-200 scale-105'
                                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                                }`}
                              >
                                <Volume2 className="w-5 h-5" />
                              </button>
                            )}

                            <div className="flex-1 min-w-0">
                              <span className={`text-sm sm:text-base font-bold block ${textPrimary}`}>
                                {displayLabel}
                              </span>
                              {opt.hasOptionAudio && (
                                <span className="text-[11px] text-blue-600 font-semibold">
                                  {t.tapSpeakerHint}
                                </span>
                              )}
                            </div>

                            <div
                              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                isSelected ? 'border-blue-600 bg-blue-600' : 'border-slate-300'
                              }`}
                            >
                              {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2.5 mt-5 pt-3.5 border-t border-slate-200/60">
                    <button
                      type="button"
                      disabled={activeQuiz.currentIndex === 0}
                      onClick={() =>
                        setActiveQuiz((prev) =>
                          prev ? { ...prev, currentIndex: prev.currentIndex - 1 } : null
                        )
                      }
                      className={`px-4 py-3 rounded-2xl border font-bold text-xs sm:text-sm disabled:opacity-40 ${
                        darkMode
                          ? 'border-slate-700 text-slate-300'
                          : 'border-slate-200 text-slate-600'
                      }`}
                    >
                      {t.prevQuestion}
                    </button>

                    {activeQuiz.currentIndex < activeQuiz.questions.length - 1 ? (
                      <button
                        type="button"
                        onClick={() =>
                          setActiveQuiz((prev) =>
                            prev ? { ...prev, currentIndex: prev.currentIndex + 1 } : null
                          )
                        }
                        className="flex-1 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs sm:text-sm shadow-md transition"
                      >
                        {t.nextQuestion} ({activeQuiz.currentIndex + 2}/
                        {activeQuiz.questions.length}) →
                      </button>
                    ) : (
                      <div className="flex-1 flex flex-col sm:flex-row gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveQuiz((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    currentIndex: prev.questions.length,
                                    q10ElapsedSeconds: prev.q10ElapsedSeconds ?? prev.elapsedSeconds,
                                  }
                                : null
                            );
                            if (token) {
                              fetch(`/api/challenges/${activeQuiz.dayNumber}/finish-q10`, {
                                method: 'POST',
                                headers: getHeaders(true),
                                body: JSON.stringify({
                                  elapsedSeconds:
                                    activeQuiz.q10ElapsedSeconds ?? activeQuiz.elapsedSeconds,
                                }),
                              }).catch(() => {});
                            }
                          }}
                          className="flex-1 py-3 px-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs sm:text-sm shadow-md transition flex items-center justify-center gap-1.5"
                        >
                          <span>{t.goToQ11}</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleSubmitQuiz}
                          disabled={submittingQuiz}
                          className="py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm shadow-md transition flex items-center justify-center gap-1.5"
                        >
                          <span>✅ {L('Nộp bài ngay (10/10)', 'Submit Now (10/10)', '지금 제출 (10/10)')}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        ) : quizResult ? (
          /* ---------- B. MÀN HÌNH KẾT QUẢ (CHỈ CÔNG BỐ SAU KHI CHALLENGE KẾT THÚC LÚC 00:00) ---------- */
          <div className="max-w-2xl mx-auto">
            {!quizResult.resultsRevealed && !adminPreviewResult ? (
              <div className={`rounded-3xl shadow-xl border p-6 text-center ${cardBg}`}>
                <div className="w-16 h-16 mx-auto rounded-3xl bg-blue-100 text-blue-600 flex items-center justify-center mb-3">
                  <Clock className="w-9 h-9" />
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-blue-600">
                  {L(`🎉 Đã ghi nhận bài nộp Day ${quizResult.dayNumber}!`, `🎉 Day ${quizResult.dayNumber} submission recorded!`, `🎉 Day ${quizResult.dayNumber} 제출 완료!`)}
                </h2>
                <p className={`text-xs sm:text-sm font-bold mt-1 ${textPrimary}`}>
                  {L('Thời gian hoàn thành (Tính đến Câu 10):', 'Completion time (Questions 1–10):', '소요 시간 (1~10번):')} {formatTimeMmSs(Math.round(quizResult.timeSpentMs / 1000))}
                </p>

                <div
                  className={`my-5 p-4 sm:p-5 rounded-3xl border text-left space-y-2.5 ${
                    darkMode
                      ? 'bg-amber-950/40 border-amber-700/70 text-amber-200'
                      : 'bg-amber-50/90 border-amber-300 text-amber-950'
                  }`}
                >
                  <div className="text-xs sm:text-sm font-black flex items-center gap-2">
                    <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>{L('Chế độ Bảo mật Đáp án & Kết quả khi Challenge đang diễn ra', 'Active Challenge Security Mode', '진행 중 챌린지 보안 모드')}</span>
                  </div>
                  <p className="text-xs leading-relaxed">
                    {L(
                      'Theo thể lệ chương trình, người chơi chưa biết ngay đáp án đúng/sai lúc vừa nộp bài để đảm bảo tính công bằng. Điểm số và giải thích đáp án chi tiết sẽ tự động được công bố ngay khi Challenge của ngày hôm nay kết thúc (lúc 00:00 đêm nay)!',
                      'To ensure competition fairness, correct/wrong answers remain hidden right after submission. Full scores and detailed explanations will be automatically published at midnight (00:00 tonight)!',
                      '공정한 경쟁을 위해 제출 직후에는 정답 여부가 공개되지 않습니다. 최종 점수와 상세 해설은 오늘 자정(00:00) 챌린지 마감 후 자동 공개됩니다!'
                    )}
                  </p>
                  <div className="pt-1 flex items-center justify-between text-xs font-extrabold">
                    <span>{L('⏳ Thời gian mở công bố kết quả & Challenge mới:', '⏳ Results & New Challenge Release:', '⏳ 결과 및 새 챌린지 공개:')}</span>
                    <span className="px-2.5 py-1 rounded-xl bg-amber-500 text-slate-950 font-mono font-black">
                      00:00 {L(`(còn ${midnightCountdown})`, `(${midnightCountdown} left)`, `(${midnightCountdown} 남음)`)}
                    </span>
                  </div>
                </div>

                {quizResult.q11Pronunciation?.submitted && (
                  <div
                    className={`mb-5 p-4 rounded-2xl border text-left text-xs space-y-1.5 ${subCardBg}`}
                  >
                    <div className="font-black text-indigo-600">
                      {L('🎙️ Đã hoàn thành tự luyện phát âm Câu 11 (Không tính điểm):', '🎙️ Completed Q11 Pronunciation Practice (Untimed):', '🎙️ 11번 문항 발음 연습 완료 (점수 미반영):')}
                    </div>
                    <p className={textSecondary}>{quizResult.q11Pronunciation.aiSummaryFeedback}</p>
                  </div>
                )}

                {isGuest && (
                  <div className="my-5 p-4 sm:p-5 rounded-3xl border text-center space-y-3 bg-gradient-to-br from-amber-500/20 via-orange-500/15 to-blue-500/15 border-amber-400">
                    <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black text-xl shadow">
                      ⭐
                    </div>
                    <div>
                      <h3 className="text-base font-black text-amber-700 dark:text-amber-300">
                        {L('Bạn đang ở Chế độ Khách (Chưa lưu điểm)', 'You are in Guest Mode (Score not saved)', '게스트 모드 (미저장)')}
                      </h3>
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">
                        {L(
                          'Bài làm của bạn đã được ghi nhận tạm thời. Để lưu điểm vào hệ thống, tính vào tiến độ 21 ngày và tham gia Bảng xếp hạng Samsung, vui lòng đăng nhập hoặc tạo tài khoản ngay!',
                          'Your submission was temporarily recorded. To save your score, count towards 21 days and join the Samsung leaderboard, please log in or create an account!',
                          '제출이 임시 기록되었습니다. 21일 진행도 및 랭킹에 반영하려면 지금 로그인하거나 가입하세요!'
                        )}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setAuthView({
                            mode: 'register',
                            notice: L(
                              '✨ Đăng ký tài khoản nhanh (Số GEN + Gmail) để lưu kết quả bài thi hôm nay!',
                              "✨ Register now (GEN ID + Gmail) to save today's score!",
                              '✨ 오늘 점수를 저장하려면 사번과 이메일로 가입하세요!'
                            ),
                          });
                        }}
                        className="py-3 px-4 rounded-2xl bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-950 font-black text-xs sm:text-sm shadow-md transition"
                      >
                        🚀 {L('Tạo tài khoản để lưu điểm', 'Register to save score', '가입하고 점수 저장')}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAuthView({
                            mode: 'login',
                            notice: L(
                              'Đăng nhập bằng Số GEN (8 số) để lưu kết quả bài làm vào tài khoản của bạn.',
                              'Log in with GEN ID to save your score to your account.',
                              '계정에 점수를 저장하려면 사번으로 로그인하세요.'
                            ),
                          });
                        }}
                        className="py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-extrabold text-xs sm:text-sm shadow-md transition"
                      >
                        🔑 {L('Đã có tài khoản? Đăng nhập', 'Already have account? Log in', '로그인')}
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-2.5">
                  <button
                    onClick={() => navigateToTab('home')}
                    className="flex-1 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm shadow-md"
                  >
                    {t.backToHome}
                  </button>
                  {user?.role === 'ADMIN' && (
                    <button
                      onClick={() => setAdminPreviewResult(true)}
                      className={`px-4 py-3.5 rounded-2xl font-bold text-xs border ${subCardBg}`}
                    >
                      👁️ {L('Xem trước kết quả (Quyền Admin)', 'Preview Result (Admin)', '결과 미리보기 (관리자)')}
                    </button>
                  )}
                </div>
              </div>
            ) : !showDetailedReview ? (
              <div className={`rounded-3xl shadow-xl border p-6 text-center ${cardBg}`}>
                <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-100 flex items-center justify-center mb-2">
                  <Star className="w-10 h-10 text-amber-400 fill-amber-400" />
                </div>
                <h2 className="text-2xl font-black text-rose-500">Great Job!</h2>
                <p className={`text-sm font-bold ${textPrimary}`}>
                  {t.completedDayMsg} Day {quizResult.dayNumber}
                </p>

                <div className={`my-5 p-4 rounded-3xl border ${subCardBg}`}>
                  {quizResult.isExpired ? (
                    <div>
                      <div className="inline-block px-3 py-1 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 font-extrabold text-xs mb-2">
                        {L('🎯 Bài thi luyện tập — Không tính điểm Bảng Xếp Hạng', '🎯 Practice Mode — Score not counted on Leaderboard', '🎯 연습 모드 — 리더보드 점수 미반영')}
                      </div>
                      <div className="text-3xl font-black text-slate-700 dark:text-slate-200">
                        {quizResult.practiceScore ?? quizResult.score}/{quizResult.totalPoints} {t.pointsSuffix}
                      </div>
                      <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium mt-1">
                        {L(
                          'Bạn đã hoàn thành bài để luyện tập. Do nộp sau ngày thi chính thức nên điểm bài này không được cộng vào BXH.',
                          'Practice completed. Since it was submitted after the deadline, this score is not added to the Leaderboard.',
                          '연습을 완료했습니다. 공식 기한 이후 제출되어 리더보드 점수에는 반영되지 않습니다.'
                        )}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <div className="text-4xl font-black text-blue-600">
                        {quizResult.score}/{quizResult.totalPoints} {t.pointsSuffix}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold mt-1">
                        {L('(Điểm từ 10 câu trắc nghiệm & điền từ • Câu 11 không tính giờ, không tính điểm)', '(Score from 10 questions • Q11 untimed practice)', '(10개 문항 공식 점수 • 11번 문제는 시간 및 점수 미반영)')}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-200/60 text-xs">
                    <div>
                      <span className="text-base font-black text-emerald-600 block">
                        {quizResult.correctCount}
                      </span>
                      {t.correctCountLabel}
                    </div>
                    <div>
                      <span className="text-base font-black text-rose-600 block">
                        {quizResult.wrongCount}
                      </span>
                      {t.wrongCountLabel}
                    </div>
                    <div>
                      <span className="text-base font-black text-blue-600 block">
                        {formatTimeMmSs(Math.round(quizResult.timeSpentMs / 1000))}
                      </span>
                      {t.timeSpentLabel}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    onClick={() => {
                      setShowDetailedReview(true);
                      window.location.hash = `#review/${quizResult.dayNumber}`;
                    }}
                    className="py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm shadow-md"
                  >
                    {t.viewDetailedAnswers}
                  </button>
                  <button
                    onClick={() => navigateToTab('home')}
                    className={`py-3.5 rounded-2xl font-bold text-sm ${
                      darkMode ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {t.backToHome}
                  </button>
                </div>
              </div>
            ) : (
              <div className={`rounded-3xl shadow-xl border p-4 sm:p-6 ${cardBg}`}>
                <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 mb-3">
                  <button
                    onClick={() => setShowDetailedReview(false)}
                    className="inline-flex items-center gap-1 text-xs font-extrabold text-blue-600"
                  >
                    <ChevronLeft className="w-5 h-5" /> {t.resultBtn}
                  </button>
                  <h3 className={`text-sm sm:text-base font-black ${textPrimary}`}>
                    Day {quizResult.dayNumber}
                  </h3>
                  <button
                    onClick={() => navigateToTab('home')}
                    className="text-xs font-bold text-slate-500"
                  >
                    {t.closeBtn}
                  </button>
                </div>

                <div className="space-y-2.5">
                  {(quizResult.detailedReview || []).map((item: any) => (
                    <div
                      key={item.questionId}
                      className={`p-3 rounded-2xl border ${
                        item.isCorrect
                          ? 'bg-emerald-50/80 border-emerald-200 text-slate-900'
                          : 'bg-rose-50/80 border-rose-200 text-slate-900'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {item.isCorrect ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          ) : (
                            <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                          )}
                          <span className="text-xs font-extrabold">
                            {t.questionLabel} {item.orderIndex}: {item.correctOptionText}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleSpeak(`rev-${item.questionId}`, item.targetWord)}
                          className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-xs text-slate-700 mt-1 pl-6">{item.explanation}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ---------- C. CÁC TAB CHÍNH ---------- */
          <>
            {/* ================= 1. TRANG CHỦ ================= */}
            {activeTab === 'home' && (
              <div className="space-y-4">
                <div className="bg-gradient-to-br from-blue-600/75 via-blue-600/70 to-indigo-700/75 backdrop-blur-[2px] border border-white/30 rounded-3xl p-5 sm:p-6 text-white shadow-xl">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="inline-flex items-center gap-1.5 bg-white/20 px-3 py-0.5 rounded-full text-xs font-extrabold">
                          {isTodayLocked ? (
                            <>🔒 {L('Bài học đang khóa', 'Lesson is locked', '강의 잠김')} • {todayChallenge?.title || 'Day 1'} ({todayChallenge?.dateLabel || new Date().toLocaleDateString('vi-VN')})</>
                          ) : (
                            <>🔥 {t.todayChallengeBadge} • {todayChallenge?.title || 'Day 1'} ({todayChallenge?.dateLabel || new Date().toLocaleDateString('vi-VN')})</>
                          )}
                        </div>
                        <div className="inline-flex items-center gap-1 bg-amber-400/90 text-slate-950 px-2.5 py-0.5 rounded-full text-[11px] font-black">
                          🕛 {t.newChallengeAtMidnight} {L(`(còn ${midnightCountdown})`, `(${midnightCountdown} left)`, `(${midnightCountdown} 남음)`)}
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowEventsPopup(true)}
                          className="inline-flex items-center gap-1 bg-white/20 hover:bg-white/30 text-white px-2.5 py-0.5 rounded-full text-[11px] font-extrabold transition"
                        >
                          🎉 {t.speakRightEventsBtn}
                        </button>
                      </div>
                      <h1 className="text-xl sm:text-2xl font-black">
                        {t.todayTitle.replace('10', String(todayChallenge?.questionCount || 10))}
                      </h1>
                    </div>

                    <div className="shrink-0">
                      <button
                        onClick={() => handleStartDay(todayChallenge)}
                        disabled={startingDay !== null}
                        className={`w-full md:w-auto px-6 py-4 rounded-2xl active:scale-95 font-black text-sm sm:text-base shadow-xl flex items-center justify-center gap-2 transition disabled:opacity-75 ${
                          isTodayLocked
                            ? 'bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 border-2 border-slate-600/80'
                            : 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                        }`}
                      >
                        {startingDay === todayChallenge?.dayNumber ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : isTodayLocked ? (
                          <Lock className="w-5 h-5 text-amber-300" />
                        ) : (
                          <Play className="w-5 h-5 fill-slate-950" />
                        )}
                        {isTodayLocked
                          ? `${todayChallenge?.title || 'Bài học'}: ${L('Bài học chưa được mở (Đang khóa)', 'Lesson not open (Locked)', '강의가 아직 열리지 않았습니다 (잠김)')}`
                          : todayChallenge?.status === 'COMPLETED'
                          ? todayChallenge.resultsRevealed
                            ? `${t.retryTodayBtn} ${todayChallenge.title} (${todayChallenge.score}/100${t.pointsSuffix})`
                            : `${t.retryTodayBtn} ${todayChallenge.title} (⏳ ${t.waitingMidnightShort})`
                          : isGuest && guestSubmittedDay?.dayNumber === todayChallenge?.dayNumber
                          ? L(
                              `Đã làm thử ${todayChallenge?.title || 'Day 1'} • Đăng nhập để lưu điểm`,
                              `Practiced ${todayChallenge?.title || 'Day 1'} • Sign in to save`,
                              `${todayChallenge?.title || 'Day 1'} 연습 완료 • 점수 저장하려면 로그인`
                            )
                          : `${t.startTodayBtn} (${todayChallenge?.title || 'Day 1'})`}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5 mt-5 pt-4 border-t border-white/20 text-center">
                    <div
                      onClick={() => navigateToTab('challenges')}
                      className="bg-white/15 hover:bg-white/25 rounded-2xl p-2.5 cursor-pointer transition"
                    >
                      <div className="text-lg sm:text-2xl font-black text-amber-300">
                        {isGuest ? '0/21' : `${completedCount}/21`} {t.daysUnit}
                      </div>
                      <div className="text-[11px] text-blue-100 font-semibold">
                        {t.completedDaysLabel}
                      </div>
                    </div>

                    <div
                      onClick={() => navigateToTab('profile')}
                      className="bg-white/15 hover:bg-white/25 rounded-2xl p-2.5 cursor-pointer transition"
                    >
                      <div className="text-lg sm:text-2xl font-black text-white">
                        {isGuest ? '0' : myTotalScore.toLocaleString()} {t.pointsSuffix}
                      </div>
                      <div className="text-[11px] text-blue-100 font-semibold">
                        {t.totalScoreLabel}
                      </div>
                    </div>

                    <div
                      onClick={() => navigateToTab('leaderboard')}
                      className="bg-white/15 hover:bg-white/25 rounded-2xl p-2.5 cursor-pointer transition"
                    >
                      <div className="text-lg sm:text-2xl font-black text-emerald-300">
                        {isGuest ? '--' : `#${myRankNumber}`}
                      </div>
                      <div className="text-[11px] text-blue-100 font-semibold">{t.rankLabel}</div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                  {/* Lộ trình nhanh 6 ngày */}
                  <div className={`lg:col-span-6 rounded-3xl p-4 sm:p-5 border shadow-md ${cardBg}`}>
                    <div className="flex items-center justify-between mb-3">
                      <h2 className={`text-sm sm:text-base font-black flex items-center gap-1.5 ${textPrimary}`}>
                        <Calendar className="w-4 h-4 text-blue-600" /> {t.progressTitle} (
                        {completedCount}/21)
                      </h2>
                      <button
                        onClick={() => navigateToTab('challenges')}
                        className="text-xs font-extrabold text-blue-600 hover:underline flex items-center"
                      >
                        {t.viewAll30Days} <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {challenges.slice(0, 6).map((c) => {
                        const isCompleted = c.status === 'COMPLETED';
                        const isExpired = c.status === 'EXPIRED';
                        const isInProgress = c.status === 'IN_PROGRESS';
                        const isOpen = c.status === 'OPEN';

                        return (
                          <div
                            key={c.dayNumber}
                            onClick={() => handleStartDay(c)}
                            className={`p-3 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between ${
                              isCompleted
                                ? darkMode
                                  ? 'bg-emerald-950/40 border-emerald-500'
                                  : 'bg-emerald-50/60 border-emerald-400'
                                : isExpired
                                ? darkMode
                                  ? 'bg-amber-950/40 border-amber-500/80 shadow-sm'
                                  : 'bg-amber-50/70 border-amber-400 shadow-sm'
                                : isInProgress
                                ? darkMode
                                  ? 'bg-blue-950/50 border-blue-500 ring-2 ring-blue-400/50 shadow-sm'
                                  : 'bg-blue-50/80 border-blue-600 ring-2 ring-blue-300 shadow-sm'
                                : isOpen
                                ? darkMode
                                  ? 'bg-sky-950/45 border-sky-500 shadow-sm'
                                  : 'bg-sky-50/65 border-sky-600 shadow-sm'
                                : darkMode
                                ? 'bg-slate-800/50 border-slate-700/70 text-slate-300'
                                : 'bg-white/55 border-white/70 text-slate-600'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className={`text-sm font-black ${textPrimary}`}>
                                {c.title}
                              </span>
                              {startingDay === c.dayNumber ? (
                                <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                              ) : isCompleted ? (
                                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-600 text-white flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" /> {L('Đã làm', 'Done', '완료')}
                                </span>
                              ) : isExpired ? (
                                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-600 text-white flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> {L('Luyện tập', 'Practice', '연습')}
                                </span>
                              ) : isInProgress ? (
                                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-600 text-white flex items-center gap-1 animate-pulse">
                                  <Play className="w-3 h-3 fill-current" /> {L('Đang làm', 'Doing', '진행중')}
                                </span>
                              ) : isOpen ? (
                                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-sky-600 text-white flex items-center gap-1">
                                  <Sparkles className="w-3 h-3" /> {L('Chưa làm', 'Not started', '미완료')}
                                </span>
                              ) : (
                                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-500/80 text-white flex items-center gap-1">
                                  <Lock className="w-3 h-3" /> {L('Chưa làm', 'Locked', '잠김')}
                                </span>
                              )}
                            </div>
                            <div className={`text-[11px] mt-1 ${textSecondary}`}>{c.dateLabel}</div>
                            <div className="mt-2 text-xs font-extrabold">
                              {isCompleted ? (
                                c.isExpired ? (
                                  <span className="text-amber-600 dark:text-amber-400">
                                    0{t.pointsSuffix} ({L('Luyện tập', 'Practice', '연습')})
                                  </span>
                                ) : c.resultsRevealed ? (
                                  <span className="text-emerald-600">
                                    {c.score}/100{t.pointsSuffix}
                                  </span>
                                ) : (
                                  <span className="text-amber-600 dark:text-amber-400">
                                    ⏳ {t.submittedWaitingMidnight}
                                  </span>
                                )
                              ) : isExpired ? (
                                <span className="text-amber-600 dark:text-amber-400">
                                  {L('Luyện tập (0đ BXH)', 'Practice (0 pts)', '연습하기 (0점)')}
                                </span>
                              ) : isInProgress ? (
                                <span className="text-blue-600 dark:text-blue-400 animate-pulse">
                                  {L('Tiếp tục làm bài', 'Continue quiz', '이어서 풀기')}
                                </span>
                              ) : isOpen ? (
                                <span className="text-sky-600 dark:text-sky-400">{t.tapToStart}</span>
                              ) : (
                                <span className="text-slate-400">{t.lockedBadge}</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Bảng Xếp Hạng Top 5 ngay tại Trang chủ */}
                  <div className={`lg:col-span-6 rounded-3xl p-4 sm:p-5 border shadow-md flex flex-col justify-between ${cardBg}`}>
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h2 className={`text-sm sm:text-base font-black flex items-center gap-1.5 ${textPrimary}`}>
                          <Trophy className="w-4 h-4 text-amber-500" /> {t.topLeaderboardTitle}
                        </h2>
                        <button
                          onClick={() => navigateToTab('leaderboard')}
                          className="text-xs font-extrabold text-blue-600 hover:underline flex items-center"
                        >
                          {t.viewTop50} <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>

                      <div className={`divide-y ${darkMode ? 'divide-slate-700/60' : 'divide-slate-200/60'}`}>
                        {(leaderboardData.topList || []).length === 0 ? (
                          <div className="py-6 text-center text-xs font-semibold text-slate-400">
                            {t.noLeaderboardData}
                          </div>
                        ) : (
                          (leaderboardData.topList || []).slice(0, 5).map((item: any) => (
                          <div
                            key={item.id}
                            className="py-2.5 flex items-center justify-between gap-2"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="w-6 text-center text-sm font-black">
                                {item.rank === 1
                                  ? '🥇'
                                  : item.rank === 2
                                  ? '🥈'
                                  : item.rank === 3
                                  ? '🥉'
                                  : `#${item.rank}`}
                              </span>
                              <img
                                src={item.avatarUrl}
                                alt={item.fullName}
                                className="w-8 h-8 rounded-full bg-slate-100 shrink-0"
                              />
                              <div className="min-w-0">
                                <div className={`text-xs sm:text-sm font-extrabold truncate ${textPrimary}`}>
                                  {item.fullName}
                                </div>
                                <div className={`text-[10px] truncate ${textSecondary}`}>
                                  GEN {item.employeeId} • {item.completedDays}/21 {t.daysUnit}
                                </div>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-xs sm:text-sm font-black text-blue-600 block">
                                {item.totalScore.toLocaleString()} {t.pointsSuffix}
                              </span>
                              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center justify-end gap-0.5">
                                <Clock className="w-2.5 h-2.5 inline" />
                                {formatTimeMmSs(Math.round((item.totalTimeMs || 0) / 1000))}
                              </span>
                            </div>
                          </div>
                        )))}
                      </div>
                    </div>

                    <div
                      className={`mt-3 pt-3 border-t flex items-center justify-between px-3.5 py-2.5 rounded-2xl ${
                        darkMode
                          ? 'border-slate-700/60 bg-blue-950/50 text-blue-200'
                          : 'border-white/70 bg-blue-50/75 text-blue-950'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black bg-blue-600 text-white px-2 py-0.5 rounded-md">
                          #{myRankNumber}
                        </span>
                        <span className="text-xs font-extrabold">
                          {user?.fullName} ({t.youBadge})
                        </span>
                      </div>
                      <span className="text-xs font-black text-blue-600">
                        {myTotalScore.toLocaleString()}
                        {t.pointsSuffix} • {completedCount}/21 {t.daysUnit}
                      </span>
                    </div>
                  </div>
                </div>

                {/* EXCITING ACTIVITIES — DYNAMIC FROM ADMIN / OFFICIAL POSTER DESIGN */}
                {(() => {
                  const visibleActivities = Array.isArray(popupEvents)
                    ? popupEvents.filter((e) => e.isVisible !== false)
                    : [];
                  const displayCount = visibleActivities.length;
                  const cleanActTitle = t.activitiesTitle.replace(/^\d+\s*/, '');
                  const displayTitle =
                    displayCount > 0 ? `${displayCount} ${cleanActTitle}` : cleanActTitle;
                  const chipIcons = [Users, FileText, Trophy, Target, Gift, InfinityIcon];

                  return (
                    <div className={`rounded-3xl p-4 sm:p-6 border shadow-md space-y-4 ${cardBg}`}>
                      <div className="text-center space-y-1">
                        <div className="inline-flex items-center gap-2 text-xs sm:text-sm font-black text-amber-500 uppercase tracking-widest">
                          <span>✦</span> {displayTitle} <span>✦</span>
                        </div>
                        <h2 className={`text-base sm:text-xl font-black ${textPrimary}`}>
                          {t.activitiesHeading}
                        </h2>
                        <p className={`text-xs sm:text-sm ${textSecondary}`}>
                          {t.activitiesSub}
                        </p>
                      </div>

                      {visibleActivities.length === 0 ? (
                        <div className="py-8 px-4 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
                          <Sparkles className="w-8 h-8 mx-auto text-amber-500 mb-2 opacity-80" />
                          <p className={`text-xs sm:text-sm font-bold ${textPrimary}`}>
                            Chuỗi hoạt động sự kiện đang được cập nhật!
                          </p>
                          <p className={`text-[11px] sm:text-xs mt-1 ${textSecondary}`}>
                            Ban tổ chức sẽ sớm mở các hoạt động hấp dẫn tiếp theo. Hãy đón chờ nhé!
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3 sm:space-y-3.5">
                          {visibleActivities.map((act, actIdx) => {
                            const theme = HOME_EVENT_THEMES[act.themeColor] || HOME_EVENT_THEMES.amber;
                            const imgSrc = resolveMediaUrl(act.img, 'events/golden-bell.jpg');

                            return (
                              <div
                                key={act.id || actIdx}
                                onClick={() => {
                                  if (act.actionType === 'daily') {
                                    navigateToTab('challenges');
                                  } else if (act.actionType === 'link' && act.actionUrl) {
                                    window.open(act.actionUrl, '_blank');
                                  } else {
                                    setShowEventsPopup(true);
                                  }
                                }}
                                className={`group cursor-pointer rounded-2xl sm:rounded-3xl border shadow-sm hover:shadow-md transition overflow-hidden ${theme.borderBg}`}
                              >
                                <div className="flex flex-col sm:flex-row">
                                  {/* Illustration */}
                                  <div className="relative w-full sm:w-44 md:w-56 h-36 sm:h-auto shrink-0 overflow-hidden bg-slate-100 dark:bg-slate-900">
                                    <img
                                      src={imgSrc}
                                      alt={act.titleC}
                                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                                    />
                                  </div>

                                  {/* Content */}
                                  <div className="flex-1 min-w-0 p-3.5 sm:p-4 flex flex-col justify-between gap-2.5">
                                    <div>
                                      <div className="flex items-center justify-between gap-2">
                                        <h3
                                          className={`text-base sm:text-lg font-black flex items-center gap-1.5 ${theme.titleColor}`}
                                        >
                                          {act.titleA} {act.titleB ? `${act.titleB} ` : ''}{act.titleC}
                                        </h3>
                                        <span
                                          className={`hidden sm:inline-flex items-center gap-1 text-xs font-black group-hover:translate-x-1 transition ${theme.titleColor}`}
                                        >
                                          {act.actionType === 'daily'
                                            ? t.joinDaily
                                            : act.actionType === 'link'
                                            ? 'Tham gia'
                                            : t.viewDetails}
                                        </span>
                                      </div>
                                      <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 mt-1 leading-snug">
                                        {act.desc}
                                      </p>
                                    </div>

                                    {act.chips && act.chips.length > 0 && (
                                      <div className="flex flex-wrap gap-1.5 text-[11px] font-bold">
                                        {act.chips.map((chip, cIdx) => {
                                          const IconComp = chipIcons[cIdx % chipIcons.length];
                                          return (
                                            <span
                                              key={cIdx}
                                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/90 dark:bg-slate-800/80 border shadow-xs ${theme.chipBg}`}
                                            >
                                              <IconComp className="w-3.5 h-3.5 shrink-0" />
                                              <span>{chip}</span>
                                            </span>
                                          );
                                        })}
                                      </div>
                                    )}

                                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/50 dark:border-slate-700/40">
                                      <div
                                        className={`flex items-center gap-1.5 text-[10px] sm:text-[11px] font-medium px-2.5 py-1 rounded-lg truncate ${theme.noteBg}`}
                                      >
                                        <Users className="w-3 h-3 shrink-0" />
                                        <span className="truncate">{act.note || t.deptNote}</span>
                                      </div>
                                      <button
                                        type="button"
                                        className={`w-8 h-8 rounded-full text-white flex items-center justify-center shadow-md shrink-0 group-hover:scale-110 transition active:scale-95 ${theme.arrowBg}`}
                                        title={act.actionType === 'daily' ? t.joinDaily : t.viewDetails}
                                      >
                                        <ChevronRight className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Campaign Tagline Footer Banner */}
                      <div className="relative rounded-2xl px-4 py-3 bg-gradient-to-r from-blue-700 via-blue-600 to-sky-500 text-white flex flex-col sm:flex-row items-center justify-between gap-2 shadow-sm">
                        <div className="leading-tight text-center sm:text-left">
                          <div className="text-xs sm:text-sm font-bold italic opacity-90">{t.bePartOf}</div>
                          <div className="text-sm sm:text-base font-black text-amber-300 italic">
                            SPEAK RIGHT 2026 ✦
                          </div>
                        </div>
                        <div className="px-3 py-1.5 rounded-xl bg-white text-blue-700 text-xs font-black italic text-center shadow -rotate-1 max-w-full sm:max-w-[55%]">
                          “{t.tagline}” 🙂
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* ================= 2. TAB 21 NGÀY ================= */}
            {activeTab === 'challenges' && (
              <div className="space-y-4">
                <div className={`rounded-2xl p-4 border shadow-sm flex items-center justify-between ${cardBg}`}>
                  <div>
                    <h2 className={`text-base font-black ${textPrimary}`}>{t.journey30Days}</h2>
                    <p className={`text-xs ${textSecondary}`}>
                      {t.completedDaysLabel}: <strong>{completedCount}/21 {t.daysUnit}</strong>
                    </p>
                  </div>
                  <button
                    onClick={() => handleStartDay(todayChallenge)}
                    disabled={startingDay !== null}
                    className={`px-4 py-2.5 rounded-xl font-extrabold text-xs shadow-sm flex items-center gap-1.5 transition disabled:opacity-75 ${
                      isTodayLocked
                        ? 'bg-slate-700/90 hover:bg-slate-700 text-slate-200 border border-slate-600'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {startingDay === todayChallenge?.dayNumber ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : isTodayLocked ? (
                      <Lock className="w-3.5 h-3.5 text-amber-300" />
                    ) : null}
                    {isTodayLocked
                      ? L('Bài chưa mở / Đang khóa', 'Not open / Locked', '미오픈 / 잠김')
                      : t.doTodayBtn}
                  </button>
                </div>

                {/* Thanh bộ lọc 4 trạng thái: Đã làm / Luyện tập / Đang làm / Chưa làm */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs font-bold">
                  <button
                    onClick={() => setChallengeFilter('ALL')}
                    className={`px-3 py-1.5 rounded-xl transition ${
                      challengeFilter === 'ALL'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : darkMode
                        ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        : 'bg-white text-slate-700 hover:bg-slate-100 border'
                    }`}
                  >
                    {L('Tất cả', 'All', '전체')} ({challenges.length})
                  </button>
                  <button
                    onClick={() => setChallengeFilter('COMPLETED')}
                    className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1 ${
                      challengeFilter === 'COMPLETED'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : darkMode
                        ? 'bg-emerald-950/40 text-emerald-300 hover:bg-emerald-950/60 border border-emerald-800'
                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {L('Đã làm', 'Done', '완료')} ({challenges.filter((c) => c.status === 'COMPLETED').length})
                  </button>
                  <button
                    onClick={() => setChallengeFilter('EXPIRED')}
                    className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1 ${
                      challengeFilter === 'EXPIRED'
                        ? 'bg-amber-600 text-white shadow-sm'
                        : darkMode
                        ? 'bg-amber-950/40 text-amber-300 hover:bg-amber-950/60 border border-amber-800'
                        : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    {L('Luyện tập', 'Practice', '연습')} ({challenges.filter((c) => c.status === 'EXPIRED').length})
                  </button>
                  <button
                    onClick={() => setChallengeFilter('IN_PROGRESS')}
                    className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1 ${
                      challengeFilter === 'IN_PROGRESS'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : darkMode
                        ? 'bg-blue-950/40 text-blue-300 hover:bg-blue-950/60 border border-blue-800'
                        : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                    }`}
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    {L('Đang làm', 'Doing', '진행중')} ({challenges.filter((c) => c.status === 'IN_PROGRESS').length})
                  </button>
                  <button
                    onClick={() => setChallengeFilter('UNSTARTED')}
                    className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1 ${
                      challengeFilter === 'UNSTARTED'
                        ? 'bg-slate-700 text-white shadow-sm'
                        : darkMode
                        ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        : 'bg-white text-slate-700 hover:bg-slate-100 border'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {L('Chưa làm', 'Not started', '미완료')} ({challenges.filter((c) => c.status === 'OPEN' || c.status === 'LOCKED').length})
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
                  {challenges
                    .filter((c) => {
                      if (challengeFilter === 'COMPLETED') return c.status === 'COMPLETED';
                      if (challengeFilter === 'EXPIRED') return c.status === 'EXPIRED';
                      if (challengeFilter === 'IN_PROGRESS') return c.status === 'IN_PROGRESS';
                      if (challengeFilter === 'UNSTARTED') return c.status === 'OPEN' || c.status === 'LOCKED';
                      return true;
                    })
                    .map((c) => {
                      const isCompleted = c.status === 'COMPLETED';
                      const isExpired = c.status === 'EXPIRED';
                      const isInProgress = c.status === 'IN_PROGRESS';
                      const isOpen = c.status === 'OPEN';
                      return (
                        <div
                          key={c.dayNumber}
                          onClick={() => handleStartDay(c)}
                          className={`p-3.5 rounded-2xl border-2 transition cursor-pointer select-none flex flex-col justify-between min-h-[105px] backdrop-blur-[2px] ${
                            isCompleted
                              ? darkMode
                                ? 'bg-slate-900/60 border-emerald-500 shadow-sm'
                                : 'bg-white/65 border-emerald-500 shadow-sm'
                              : isExpired
                              ? darkMode
                                ? 'bg-amber-950/40 border-amber-500/80 shadow-sm'
                                : 'bg-amber-50/70 border-amber-400 shadow-sm'
                              : isInProgress
                              ? darkMode
                                ? 'bg-blue-950/50 border-blue-500 ring-2 ring-blue-400/50 shadow-sm'
                                : 'bg-blue-50/80 border-blue-600 ring-2 ring-blue-300 shadow-sm'
                              : isOpen
                              ? darkMode
                                ? 'bg-sky-950/45 border-sky-500 shadow-sm'
                                : 'bg-sky-50/70 border-sky-600 ring-2 ring-sky-100 shadow-sm'
                              : darkMode
                              ? 'bg-slate-900/55 border-slate-700/70 text-slate-300'
                              : 'bg-white/60 border-white/75 text-slate-600'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-1">
                            <div>
                              <div className={`text-sm sm:text-base font-black ${textPrimary}`}>
                                {c.title}
                              </div>
                              <div className={`text-[11px] ${textSecondary}`}>{c.dateLabel}</div>
                            </div>

                            {startingDay === c.dayNumber ? (
                              <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                            ) : isCompleted ? (
                              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-600 text-white flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> {L('Đã làm', 'Done', '완료')}
                              </span>
                            ) : isExpired ? (
                              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-600 text-white flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {L('Luyện tập', 'Practice', '연습')}
                              </span>
                            ) : isInProgress ? (
                              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-600 text-white flex items-center gap-1 animate-pulse">
                                <Play className="w-3 h-3 fill-current" /> {L('Đang làm', 'Doing', '진행중')}
                              </span>
                            ) : isOpen ? (
                              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-sky-600 text-white flex items-center gap-1">
                                <Sparkles className="w-3 h-3" /> {L('Chưa làm', 'Not started', '미완료')}
                              </span>
                            ) : (
                              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-500/80 text-white flex items-center gap-1">
                                <Lock className="w-3 h-3" /> {L('Chưa làm', 'Locked', '잠김')}
                              </span>
                            )}
                          </div>

                          <div className="mt-2 flex items-center justify-between">
                            {isCompleted ? (
                              c.isExpired ? (
                                <span className="text-xs font-extrabold text-amber-600 dark:text-amber-400">
                                  0{t.pointsSuffix} ({L('Luyện tập', 'Practice', '연습')})
                                </span>
                              ) : c.resultsRevealed ? (
                                <div className="flex items-center gap-0.5">
                                  {[1, 2, 3].map((s) => (
                                    <Star
                                      key={s}
                                      className={`w-3.5 h-3.5 ${
                                        s <= (c.stars || 3)
                                          ? 'text-amber-400 fill-amber-400'
                                          : 'text-slate-200'
                                      }`}
                                    />
                                  ))}
                                  <span className="text-xs font-extrabold text-emerald-600 ml-1">
                                    {c.score}
                                    {t.pointsSuffix}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-[11px] font-extrabold text-amber-600 dark:text-amber-400">
                                  ⏳ {t.waitingMidnightShort}
                                </span>
                              )
                            ) : isExpired ? (
                              <span className="text-xs font-extrabold text-amber-600 dark:text-amber-400">
                                {L('Luyện tập (0đ BXH)', 'Practice (0 pts)', '연습하기 (0점)')}
                              </span>
                            ) : isInProgress ? (
                              <span className="text-xs font-extrabold text-blue-600 dark:text-blue-400 animate-pulse">
                                {L('Tiếp tục làm bài', 'Continue quiz', '이어서 풀기')}
                              </span>
                            ) : isOpen ? (
                              <span className="text-xs font-extrabold text-sky-600 dark:text-sky-400">
                                {t.tapToStart}
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-400">{t.lockedShort}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* ================= 3. TAB BẢNG XẾP HẠNG ================= */}
            {activeTab === 'leaderboard' && (
              <div className="max-w-3xl mx-auto space-y-3.5">
                <div className={`flex items-center justify-between p-4 rounded-2xl border backdrop-blur-md ${cardBg}`}>
                  <h2 className={`text-base font-black flex items-center gap-2 ${textPrimary}`}>
                    <Trophy className="w-5 h-5 text-amber-500" /> {t.leaderboard} Top 50
                  </h2>
                  <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-xl">
                    {t.realtimeUpdate}
                  </span>
                </div>

                <div
                  className={`rounded-3xl border shadow-sm divide-y overflow-hidden backdrop-blur-md ${cardBg} ${
                    darkMode ? 'divide-slate-800' : 'divide-slate-100'
                  }`}
                >
                  {(leaderboardData.topList || []).length === 0 ? (
                    <div className="p-8 text-center text-sm font-semibold text-slate-400">
                      {t.noLeaderboardPlayers}
                    </div>
                  ) : (
                    (leaderboardData.topList || []).map((item: any) => {
                    const isMe = item.id === user?.id;
                    return (
                      <div
                        key={item.id}
                        className={`flex items-center justify-between p-3.5 sm:px-5 ${
                          isMe
                            ? darkMode
                              ? 'bg-blue-950/50 font-bold'
                              : 'bg-blue-50/90 font-bold'
                            : ''
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-7 text-center shrink-0">
                            {item.rank === 1 ? (
                              <span className="text-xl">🥇</span>
                            ) : item.rank === 2 ? (
                              <span className="text-xl">🥈</span>
                            ) : item.rank === 3 ? (
                              <span className="text-xl">🥉</span>
                            ) : (
                              <span className={`text-xs font-black ${textSecondary}`}>
                                #{item.rank}
                              </span>
                            )}
                          </div>
                          <img
                            src={item.avatarUrl}
                            alt={item.fullName}
                            className="w-9 h-9 rounded-full bg-slate-100 shrink-0"
                          />
                          <div className="min-w-0">
                            <div className={`text-xs sm:text-sm font-extrabold truncate ${textPrimary}`}>
                              {item.fullName}{' '}
                              {isMe && (
                                <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full ml-1">
                                  {t.youBadge}
                                </span>
                              )}
                            </div>
                            <div className={`text-[11px] truncate ${textSecondary}`}>
                              GEN {item.employeeId}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-sm sm:text-base font-black text-blue-600">
                            {item.totalScore.toLocaleString()}
                            {t.pointsSuffix}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {item.completedDays}/21 {t.daysUnit}
                          </div>
                          <div className="text-[11px] font-bold text-amber-600 dark:text-amber-400 flex items-center justify-end gap-1 mt-0.5">
                            <Clock className="w-3 h-3 inline" />
                            <span>{formatTimeMmSs(Math.round((item.totalTimeMs || 0) / 1000))}</span>
                          </div>
                        </div>
                      </div>
                    );
                  }))}
                </div>

                {leaderboardData.myRank && (
                  <div className="bg-blue-700 text-white p-3.5 rounded-2xl shadow-xl flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="px-2.5 py-1 rounded-lg bg-white/20 font-black text-xs">
                        #{leaderboardData.myRank.rank}
                      </span>
                      <span className="text-xs sm:text-sm font-extrabold">
                        {user?.fullName} ({t.youBadge})
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm sm:text-base font-black text-amber-300 block">
                        {leaderboardData.myRank.totalScore.toLocaleString()} {t.pointsSuffix}
                      </span>
                      <span className="text-[10px] text-blue-200 font-bold flex items-center justify-end gap-0.5">
                        <Clock className="w-2.5 h-2.5 inline" />
                        {formatTimeMmSs(Math.round((leaderboardData.myRank.totalTimeMs || 0) / 1000))}
                      </span>
                    </div>
                  </div>
                )}

                {isGuest && (
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="text-xs sm:text-sm font-bold leading-relaxed">
                      💡 <strong>{L('Bạn đang xem Bảng xếp hạng ở Chế độ Khách.', 'You are viewing Leaderboard in Guest Mode.', '게스트 모드로 랭킹을 보고 있습니다.')}</strong>
                      <br className="hidden sm:inline" />{' '}
                      {L(
                        'Đăng nhập bằng Số GEN hoặc Tạo tài khoản để lưu điểm và vinh danh thứ hạng của bạn!',
                        'Log in with GEN ID or create an account to save score and rank on the leaderboard!',
                        '사번으로 로그인하거나 가입하여 점수를 저장하고 순위를 올려보세요!'
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setAuthView({ mode: 'login' })}
                        className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-sm transition"
                      >
                        {L('Đăng nhập ngay', 'Log in now', '지금 로그인')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setAuthView({ mode: 'register' })}
                        className="px-3 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white font-extrabold text-xs transition"
                      >
                        {L('Tạo tài khoản', 'Sign up', '가입')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ================= 4. TAB CÁ NHÂN (PROFILE) ================= */}
            {activeTab === 'profile' && (
              <div className="max-w-3xl mx-auto space-y-4">
                {/* NÚT VÀO TRANG QUẢN TRỊ DÀNH CHO ADMIN */}
                {user?.role === 'ADMIN' && (
                  <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-xl shadow-blue-600/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-blue-400/30">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/30">
                        <ShieldCheck className="w-6 h-6 text-amber-300" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-wider">
                            Quyền Quản Trị Hệ Thống
                          </span>
                        </div>
                        <h3 className="text-base sm:text-lg font-black mt-1">
                          {t.adminPortal || 'Cổng Quản Trị Admin CMS'}
                        </h3>
                        <p className="text-xs text-blue-100 mt-0.5">
                          {L(
                            'Quản lý 21 ngày thi, tạo đề bulk Excel, duyệt danh sách nhân viên và gửi thông báo Push.',
                            'Manage 21 days, bulk import questions via Excel, inspect users, and dispatch push alerts.',
                            '21일 챌린지 관리, Excel 대량 문제 등록 및 공지 발송'
                          )}
                        </p>
                      </div>
                    </div>
                    <a
                      href="#admin/dashboard"
                      onClick={(e) => {
                        if (!e.metaKey && !e.ctrlKey && !e.shiftKey && e.button === 0) {
                          e.preventDefault();
                          navigateToTab('admin');
                        }
                      }}
                      className="px-5 py-2.5 rounded-2xl bg-white hover:bg-blue-50 text-blue-900 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shrink-0 transition active:scale-95 cursor-pointer"
                    >
                      <ShieldCheck className="w-4 h-4 text-blue-700" />
                      <span>{L('Vào Trang Quản Trị', 'Open Admin Portal', '관리자 포털')}</span>
                      <ArrowRight className="w-4 h-4" />
                    </a>
                  </div>
                )}

                <div className={`rounded-3xl p-5 border shadow-sm backdrop-blur-md ${cardBg}`}>
                  <div className="flex items-center gap-4">
                    <img
                      src={user?.avatarUrl}
                      alt={user?.fullName}
                      className="w-16 h-16 rounded-full bg-blue-50 border-2 border-blue-100"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className={`text-lg font-black ${textPrimary}`}>{user?.fullName}</h2>
                        {user?.role === 'ADMIN' && (
                          <span className="px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 font-black text-[10px] tracking-wider uppercase shadow-xs">
                            Admin
                          </span>
                        )}
                      </div>
                      <p className={`text-xs ${textSecondary}`}>
                        GEN <strong>{user?.employeeId}</strong>
                      </p>
                      <p className="text-xs text-blue-600 font-semibold">{user?.email}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5 mt-4 pt-4 border-t border-slate-200/60 text-center">
                    <div className={`p-3 rounded-2xl border ${subCardBg}`}>
                      <div className="text-lg sm:text-xl font-black text-blue-600">
                        {myTotalScore.toLocaleString()}
                      </div>
                      <div className={`text-[11px] ${textSecondary}`}>{t.totalScoreLabel}</div>
                    </div>
                    <div className={`p-3 rounded-2xl border ${subCardBg}`}>
                      <div className={`text-lg sm:text-xl font-black ${textPrimary}`}>
                        {completedCount}/21
                      </div>
                      <div className={`text-[11px] ${textSecondary}`}>{t.completedDaysLabel}</div>
                    </div>
                    <div className={`p-3 rounded-2xl border ${subCardBg}`}>
                      <div className="text-lg sm:text-xl font-black text-emerald-600">
                        #{myRankNumber}
                      </div>
                      <div className={`text-[11px] ${textSecondary}`}>{t.rankLabel}</div>
                    </div>
                  </div>
                </div>

                <div className={`rounded-3xl p-5 border shadow-sm backdrop-blur-md ${cardBg}`}>
                  <h3 className={`text-sm font-black flex items-center gap-1.5 mb-3 ${textPrimary}`}>
                    <Award className="w-4 h-4 text-amber-500" /> {t.milestonesTitle}
                  </h3>
                  <div className="grid grid-cols-5 gap-2 text-center">
                    {[1, 5, 10, 15, 21].map((m) => {
                      const unlocked = completedCount >= m;
                      return (
                        <div
                          key={m}
                          className={`p-2.5 rounded-2xl border ${
                            unlocked
                              ? 'bg-amber-50/90 border-amber-300 text-amber-900'
                              : `${subCardBg} opacity-70`
                          }`}
                        >
                          <div className="text-base">{unlocked ? '🏅' : '🔒'}</div>
                          <div className="text-[11px] font-extrabold mt-1">Day {m}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className={`rounded-3xl p-5 border shadow-sm backdrop-blur-md ${cardBg}`}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className={`text-sm font-black flex items-center gap-1.5 ${textPrimary}`}>
                      <BarChart3 className="w-4 h-4 text-blue-600" /> {t.statsCorrectWrong}
                    </h3>
                    <div className="flex gap-3 text-[11px] font-bold">
                      <span className="text-emerald-600">{t.correctShort}</span>
                      <span className="text-rose-500">{t.wrongShort}</span>
                    </div>
                  </div>

                  {(() => {
                    const realAttempts = (profileData?.attempts || []).slice(-7);
                    if (realAttempts.length === 0) {
                      return (
                        <div className={`p-6 rounded-2xl border text-center ${subCardBg}`}>
                          <p className={`text-xs font-semibold ${textSecondary}`}>
                            {L('Chưa có dữ liệu bài thi. Hãy hoàn thành thử thách để xem thống kê đúng / sai!', 'No quiz data yet. Complete daily challenges to see accuracy statistics!', '아직 데이터가 없습니다. 매일 챌린지를 풀고 정답/오답 통계를 확인하세요!')}
                          </p>
                        </div>
                      );
                    }
                    return (
                      <div className={`grid grid-cols-7 gap-2 items-end h-28 pt-4 px-2 rounded-2xl border ${subCardBg}`}>
                        {realAttempts.map((att: any) => (
                          <div key={att.id || att.dayNumber} className="flex flex-col items-center gap-1 h-full justify-end">
                            <div className="flex items-end gap-1 w-full justify-center h-20">
                              <div
                                className="w-2.5 bg-emerald-500 rounded-t"
                                title={`${L('Đúng', 'Correct', '정답')}: ${att.correctCount}`}
                                style={{ height: `${Math.min(100, (att.correctCount || 0) * 10)}%` }}
                              />
                              <div
                                className="w-2.5 bg-rose-400 rounded-t"
                                title={`${L('Sai', 'Wrong', '오답')}: ${att.wrongCount}`}
                                style={{ height: `${Math.min(100, Math.max(8, (att.wrongCount || 0) * 10))}%` }}
                              />
                            </div>
                            <span className={`text-[10px] font-bold ${textSecondary}`}>D{att.dayNumber}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>

                {/* Danh sách Thiết bị đã đăng nhập của người dùng */}
                <div className={`rounded-3xl p-5 border shadow-sm backdrop-blur-md space-y-3 ${cardBg}`}>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-800">
                    <div>
                      <h3 className={`text-sm font-black flex items-center gap-1.5 ${textPrimary}`}>
                        <Smartphone className="w-4 h-4 text-blue-600" /> {t.userDevicesTitle}
                      </h3>
                      <p className={`text-[11px] ${textSecondary}`}>
                        {t.userDevicesDesc}
                      </p>
                    </div>
                    <span className="text-[11px] font-black px-2.5 py-1 rounded-xl bg-blue-50 text-blue-700 dark:bg-slate-800 dark:text-blue-300">
                      {userDevices.length} {t.devicesUnit}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {userDevices.map((dev) => (
                      <div
                        key={dev.id}
                        className={`p-3 rounded-2xl border flex items-center justify-between gap-3 ${subCardBg} ${
                          dev.isCurrent ? 'ring-2 ring-emerald-500/30' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                            {dev.deviceType === 'desktop' ? (
                              <Laptop className="w-4 h-4" />
                            ) : dev.deviceType === 'tablet' ? (
                              <Tablet className="w-4 h-4" />
                            ) : (
                              <Smartphone className="w-4 h-4" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-extrabold text-xs sm:text-sm truncate">
                                {dev.deviceName}
                              </span>
                              {dev.isCurrent && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  {t.thisDevice}
                                </span>
                              )}
                              {dev.isPwaInstalled && (
                                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300">
                                  ⚡ PWA
                                </span>
                              )}
                            </div>
                            <div className={`text-[10px] sm:text-[11px] truncate mt-0.5 ${textSecondary}`}>
                              {dev.browser} • {dev.os} • {t.activeAt} {new Date(dev.lastActiveAt).toLocaleString(lang === 'ko' ? 'ko-KR' : lang === 'en' ? 'en-US' : 'vi-VN')}
                            </div>
                          </div>
                        </div>

                        {!dev.isCurrent && (
                          <button
                            onClick={() => handleRemoveDevice(dev.id)}
                            className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition shrink-0"
                            title={t.removeDevice}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quản lý Thông Báo Ngoài Màn Hình (Native Lock Screen / System Push Notification) */}
                <div className={`rounded-3xl p-5 border shadow-sm backdrop-blur-md space-y-3 ${cardBg}`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-800 gap-2">
                    <div>
                      <h3 className={`text-sm font-black flex items-center gap-1.5 ${textPrimary}`}>
                        <BellRing className="w-4 h-4 text-amber-500" />
                        {L('Thông báo Ngoài Màn hình (Màn hình khóa & Banner hệ điều hành)', 'System Push Notifications (Lock Screen & OS Banner)', '잠금화면 및 시스템 푸시 알림')}
                      </h3>
                      <p className={`text-[11px] ${textSecondary}`}>
                        {L(
                          'Cho phép ứng dụng gửi thông báo khi có thử thách mới, cập nhật Top 1 Bảng xếp hạng và nhắc nhở học tập ra ngoài màn hình khóa ngay cả khi đã tắt app.',
                          'Receive alerts for new daily challenges, Top 1 leaderboard updates, and study reminders on your lock screen even when the app is closed.',
                          '앱을 종료해도 새 일일 챌린지, 랭킹 1위 소식 및 학습 알림을 잠금화면에서 바로 수신합니다.'
                        )}
                      </p>
                    </div>
                    <span
                      className={`text-[11px] font-black px-2.5 py-1 rounded-xl self-start sm:self-auto shrink-0 ${
                        getNotificationPermissionState() === 'granted'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                      }`}
                    >
                      {getNotificationPermissionState() === 'granted'
                        ? L('✓ Đang bật ngoài màn hình', '✓ System Push Active', '✓ 시스템 알림 켜짐')
                        : L('⚠️ Chưa cấp quyền ngoài app', '⚠️ Not enabled', '⚠️ 알림 권한 없음')}
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                    <div className="text-xs space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold">{L('Trạng thái:', 'Status:', '상태:')}</span>
                        {getNotificationPermissionState() === 'granted' ? (
                          <span className="text-emerald-600 font-bold">
                            {L('Đã cấp quyền hiển thị ngoài màn hình (Native Notification)', 'Granted (Native OS notifications enabled)', '허용됨 (시스템 알림 수신 가능)')}
                          </span>
                        ) : (
                          <span className="text-amber-600 font-bold">
                            {L('Chỉ hiển thị pop-up khi đang mở app (Chưa cấp quyền ra ngoài)', 'In-app only (System notification permission needed)', '앱 내부 팝업만 표시됨')}
                          </span>
                        )}
                      </div>
                      <p className={`text-[11px] ${textSecondary}`}>
                        {L(
                          'Sau khi bấm Cho phép, hệ thống sẽ gửi 1 thông báo thử nghiệm ra ngoài khay thông báo của bạn.',
                          'After granting permission, a test notification will be delivered to your device.',
                          '권한 허용 시 기기 알림창으로 테스트 알림이 즉시 전송됩니다.'
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {getNotificationPermissionState() !== 'granted' ? (
                        <button
                          type="button"
                          onClick={async () => {
                            const res = await syncAndSubscribePwaPush({ user, token, askPermission: true, forcePwaFlag: true });
                            if (res.permission === 'granted') {
                              showMessage('🎉 Đã cấp quyền thông báo thành công! Đang gửi thông báo kiểm tra...');
                              await sendTestNativeNotification();
                            } else {
                              showMessage('⚠️ Chưa cấp quyền thông báo. Hãy bấm Cho phép trên hộp thoại trình duyệt.', true);
                            }
                          }}
                          className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md transition flex items-center gap-1.5"
                        >
                          <BellRing className="w-4 h-4" />
                          {L('Bật thông báo ngoài màn hình', 'Enable System Notifications', '시스템 알림 켜기')}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={async () => {
                            const res = await sendTestNativeNotification();
                            showMessage(res.message, !res.ok);
                          }}
                          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-md transition flex items-center gap-1.5"
                        >
                          <Send className="w-4 h-4" />
                          {L('Gửi thử thông báo ra ngoài màn hình', 'Send Test Notification', '테스트 알림 전송')}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* ================= FOOTER PERFMONSTER STYLE ================= */}
      <PerfmonsterFooter
        lang={lang}
        darkMode={darkMode}
        onNavigate={(tab) => navigateToTab(tab)}
      />

      {/* ================= MODAL KHI ADMIN FORCE LOCK ================= */}
      {forceLockModalMsg && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-sm rounded-3xl p-6 text-center shadow-2xl space-y-4 border ${cardBg}`}>
            <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <Lock className="w-7 h-7" />
            </div>
            <p className="text-xs sm:text-sm leading-relaxed font-semibold">
              {forceLockModalMsg}
            </p>
            <button
              onClick={() => {
                setForceLockModalMsg(null);
                navigateToTab('home');
              }}
              className="w-full py-3 rounded-2xl bg-blue-600 text-white font-extrabold text-sm"
            >
              {t.backToHome}
            </button>
          </div>
        </div>
      )}

      {/* ================= MODAL TRUNG TÂM THÔNG BÁO BAN TỔ CHỨC ================= */}
      {showNotifModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div
            className={`w-full max-w-lg rounded-3xl p-4 sm:p-6 shadow-2xl relative border flex flex-col max-h-[85vh] ${cardBg}`}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-slate-700/60">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`text-base font-black flex items-center gap-2 ${textPrimary}`}>
                    {L('Thông báo Ban tổ chức', 'Admin Announcements', '운영진 공지사항')}
                    {notifications.length > 0 && (
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-600 text-white">
                        {notifications.length}
                      </span>
                    )}
                  </h3>
                  <p className={`text-[11px] font-medium ${textSecondary}`}>
                    {L('Bản tin Bảng Xếp Hạng, bài thi mới & thông báo chính thức', 'Leaderboard bulletin, challenges & announcements', '리더보드 소식, 새 챌린지 및 공식 공지')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowNotifModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                title={L('Đóng', 'Close', '닫기')}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Danh sách thông báo (Gom toàn bộ thông báo cập nhật & thông báo đẩy vào trong Chuông) */}
            <div className="overflow-y-auto my-3 space-y-2.5 pr-1 divide-y divide-slate-100 dark:divide-slate-800/60">
              {pwaUpdateReady && (
                <div className="p-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 text-white flex items-center justify-between gap-3 shadow-sm">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Sparkles className="w-5 h-5 text-amber-300 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-black">
                        {L('Đã có bản cập nhật ứng dụng mới!', 'New app update available!', '새로운 앱 업데이트가 있습니다!')}
                      </div>
                      <div className="text-[11px] text-blue-100">
                        {L('Bấm để tải lại phiên bản mới nhất.', 'Tap to reload the latest version.', '최신 버전으로 새로고침하세요.')}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => applyAppUpdate()}
                    className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shrink-0"
                  >
                    {L('Cập nhật', 'Update', '업데이트')}
                  </button>
                </div>
              )}

              {getNotificationPermissionState() !== 'granted' &&
                getNotificationPermissionState() !== 'unsupported' && (
                  <div
                    className={`p-3 rounded-2xl border flex items-center justify-between gap-3 ${subCardBg}`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <BellRing className="w-4 h-4 text-blue-500 shrink-0" />
                      <div className="text-xs font-bold leading-snug">
                        {L(
                          'Nhận thông báo khi có Bài mới & Bảng xếp hạng trên thiết bị',
                          'Get device notifications for new challenges & rankings',
                          '새 챌린지 및 랭킹 기기 알림 받기'
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        const res = await syncAndSubscribePwaPush({
                          user,
                          token,
                          askPermission: true,
                        });
                        if (res.ok) {
                          await sendTestNativeNotification();
                          showMessage(
                            L(
                              'Đã bật thông báo trên thiết bị!',
                              'Device notifications enabled!',
                              '기기 알림이 활성화되었습니다!'
                            )
                          );
                        }
                      }}
                      className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shrink-0"
                    >
                      {L('Bật chuông', 'Enable', '알림 켜기')}
                    </button>
                  </div>
                )}

              {notifications.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                    <Bell className="w-6 h-6" />
                  </div>
                  <p className={`text-sm font-bold ${textPrimary}`}>
                    {L('Chưa có thông báo nào', 'No notifications yet', '새로운 알림이 없습니다')}
                  </p>
                  <p className={`text-xs ${textSecondary}`}>
                    {L('Các thông báo từ Ban tổ chức sẽ hiển thị ở đây.', 'Announcements from admin will appear here.', '운영진 공지사항이 여기에 표시됩니다.')}
                  </p>
                </div>
              ) : (
                notifications.map((notif, idx) => {
                  const isTop1 = notif.type === 'NEW_TOP_1';
                  const isNewDay = notif.type === 'NEW_DAY_UNLOCKED';
                  const isReminder = notif.type === 'UNSTUDIED_REMINDER';

                  return (
                    <div
                      key={notif.id || idx}
                      onClick={() => {
                        setShowNotifModal(false);
                        if (notif.targetUrl) {
                          if (notif.targetUrl.includes('challenges')) {
                            navigateToTab('challenges');
                          } else if (notif.targetUrl.includes('leaderboard')) {
                            navigateToTab('leaderboard');
                          } else if (notif.targetUrl.includes('profile')) {
                            navigateToTab('profile');
                          } else {
                            navigateToTab('home');
                          }
                        }
                      }}
                      className={`pt-3 pb-2 px-3 rounded-2xl transition cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-start gap-3 ${
                        isTop1
                          ? 'border-l-4 border-amber-500 bg-amber-50/40 dark:bg-amber-950/20'
                          : isNewDay
                          ? 'border-l-4 border-blue-500 bg-blue-50/40 dark:bg-blue-950/20'
                          : isReminder
                          ? 'border-l-4 border-rose-500 bg-rose-50/40 dark:bg-rose-950/20'
                          : 'border-l-4 border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/20'
                      }`}
                    >
                      <div className="text-2xl mt-0.5 shrink-0">
                        {isTop1 ? '👑' : isNewDay ? '🌅' : isReminder ? '⏰' : '📢'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className={`text-xs sm:text-sm font-black truncate ${textPrimary}`}>
                            {notif.title}
                          </h4>
                          <span className="text-[10px] font-semibold text-slate-400 shrink-0">
                            {formatRelativeTime(notif.deliveredAt)}
                          </span>
                        </div>
                        <p className={`text-xs mt-1 leading-relaxed ${textSecondary}`}>
                          {notif.body}
                        </p>
                        {notif.targetUrl && (
                          <div className="mt-1.5 text-[11px] font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                            <span>{L('Bấm để xem chi tiết', 'Tap to view', '자세히 보기')} →</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-xs">
              <span className={`text-[11px] ${textSecondary}`}>
                {L('Tự động cập nhật mỗi khi có tin mới', 'Auto-updates on new messages', '새 메시지 시 자동 업데이트')}
              </span>
              <button
                type="button"
                onClick={() => {
                  markAllNotifsAsRead();
                  setShowNotifModal(false);
                }}
                className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-sm transition"
              >
                {L('Đóng', 'Close', '닫기')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL NGÀY CHƯA MỞ KHÓA ================= */}
      {lockedModalDay && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-sm rounded-3xl p-6 text-center shadow-2xl relative border ${cardBg}`}>
            <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center">
              <Lock className="w-7 h-7" />
            </div>
            <h3 className={`text-xl font-black mt-3 ${textPrimary}`}>{lockedModalDay.title}</h3>
            <p className={`text-xs font-semibold ${textSecondary}`}>{lockedModalDay.dateLabel}</p>

            <div className="bg-amber-50 dark:bg-amber-950/60 rounded-2xl p-4 my-4 border border-amber-300 dark:border-amber-800 text-xs sm:text-sm font-extrabold text-amber-950 dark:text-amber-200 text-left space-y-1.5">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-black text-sm">
                <Lock className="w-4 h-4 shrink-0" />
                <span>{L('Bài học chưa có sẵn hoặc đang bị khóa', 'Lesson not available or currently locked', '강의가 아직 준비되지 않았거나 잠겨 있습니다')}</span>
              </div>
              <p className="text-xs text-amber-900/90 dark:text-amber-300 font-medium leading-relaxed">
                {L(
                  'Ban tổ chức hiện đang khóa ngày thử thách này để chuẩn bị đề thi hoặc đã tạm đóng. Vui lòng quay lại sau khi Ban tổ chức mở khóa!',
                  'The organizers have locked this challenge day for preparation or maintenance. Please check back when it is unlocked!',
                  '운영진이 시험 준비 hoặc 점검을 위해 이 챌린지 날짜를 잠갔습니다. 잠금 해제 알림 후 다시 이용해 주세요!'
                )}
              </p>
            </div>

            <p className="text-xs font-bold italic text-blue-700">
              “Keep practicing, better pronunciation is coming!”
            </p>

            <div className="mt-5 space-y-2">
              <button
                onClick={() => setLockedModalDay(null)}
                className="w-full py-3 rounded-2xl bg-blue-600 text-white font-extrabold text-sm"
              >
                {t.understoodBtn}
              </button>
              {user?.role === 'ADMIN' && (
                <button
                  onClick={() => handleAdminToggleUnlock(lockedModalDay.dayNumber, true)}
                  className="w-full py-2.5 rounded-2xl bg-amber-100 text-amber-900 font-bold text-xs flex items-center justify-center gap-1"
                >
                  <Unlock className="w-3.5 h-3.5" /> {L(`Mở khóa ngay ${lockedModalDay.title} (Admin)`, `Unlock ${lockedModalDay.title} now (Admin)`, `지금 ${lockedModalDay.title} 잠금 해제 (관리자)`)}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL THÔNG BÁO YÊU CẦU ĐĂNG NHẬP (CHO KHÁCH) ================= */}
      {loginPromptMsg && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-sm rounded-3xl p-6 text-center shadow-2xl space-y-4 border ${cardBg}`}>
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center">
              <Lock className="w-7 h-7" />
            </div>
            <h3 className={`text-base font-black ${textPrimary}`}>
              {t.loginRequiredTitle}
            </h3>
            <p className="text-xs sm:text-sm leading-relaxed font-semibold">
              {loginPromptMsg}
            </p>
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setLoginPromptMsg(null);
                  setAuthView({ mode: 'login' });
                }}
                className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm shadow-md"
              >
                {t.loginNowBtn}
              </button>
              <button
                type="button"
                onClick={() => {
                  setLoginPromptMsg(null);
                  setAuthView({ mode: 'register' });
                }}
                className="w-full py-2.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-sm"
              >
                {t.registerSaveScoreBtn}
              </button>
              <button
                type="button"
                onClick={() => setLoginPromptMsg(null)}
                className={`w-full py-2 rounded-xl text-xs font-bold ${
                  darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {t.laterGuestBtn}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= BOTTOM NAVIGATION BAR (Icon-only trên điện thoại) ================= */}
      <nav
        className={`md:hidden fixed bottom-0 inset-x-0 z-40 backdrop-blur-md border-t px-3 py-1.5 pb-safe transition-colors ${
          darkMode
            ? 'bg-slate-900/85 border-slate-700/70 text-white shadow-2xl'
            : 'bg-white/85 border-slate-200/80 text-slate-800 shadow-xl'
        }`}
      >
        <div className="grid grid-cols-4 gap-2 max-w-sm mx-auto">
          {[
            { id: 'home', label: t.home, icon: Home, locked: false },
            { id: 'challenges', label: t.challenges, icon: Calendar, locked: isGuest },
            { id: 'leaderboard', label: t.leaderboard, icon: Trophy, locked: false },
            {
              id: 'profile',
              label: isGuest ? L('Đăng nhập', 'Log in', '로그인') : t.profile,
              icon: User,
              locked: false,
              onClick: isGuest ? () => setAuthView({ mode: 'login' }) : undefined,
            },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id && !activeQuiz && !quizResult;
            return (
              <button
                key={item.id}
                onClick={item.onClick || (() => navigateToTab(item.id as TabType))}
                title={item.label}
                aria-label={item.label}
                className={`flex items-center justify-center py-2.5 rounded-2xl transition relative ${
                  isActive
                    ? 'text-blue-600 bg-blue-50/90 dark:bg-blue-950/70 shadow-xs'
                    : darkMode
                    ? 'text-slate-400 hover:text-white'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <div className="relative flex items-center justify-center">
                  <Icon className="w-6 h-6 stroke-[2.2]" />
                  {item.locked && (
                    <Lock className="w-2.5 h-2.5 text-amber-500 absolute -top-1 -right-1.5" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Loader2, X } from 'lucide-react';
import { AuthScreen } from './components/AuthScreen';
import { extractResetPasswordParams } from './utils/validation';
import { AdminDashboard } from './components/AdminDashboard';
import { confirmAndUnlockChallengeDay } from './components/admin/adminTypes';
import { buildAdminHash, isAdminUrl, parseAdminRoute } from './utils/adminRoutes';
import { ResponsiveBackground, PerfmonsterFooter } from './components/LayoutDecor';
import { appDialog } from './components/AppDialogProvider';
import { SpeakRightEventsPopup, EventPopupItem } from './components/SpeakRightEventsPopup';
import { InstallPwaModal } from './components/InstallPwaModal';
import { playPronunciation } from './utils/audio';
import { Lang, TRANSLATIONS } from './utils/i18n';
import { unsubscribePwaPush } from './utils/pwaPush';
import {
  EventState,
  GUEST_MODE_KEY,
  GUEST_PENDING_KEY,
  GUEST_TABS,
  SharedThemeProps,
  TabType,
  formatTimeMmSs,
  getTabFromHash,
  readGuestPending,
} from './components/app/appTypes';
import { AppMobileNav, AppTopHeader, PwaUpdateBanner } from './components/app/AppChrome';
import { QuizPlayView } from './components/quiz/QuizPlayView';
import { QuizResultView } from './components/quiz/QuizResultView';
import { HomeTab } from './components/tabs/HomeTab';
import { ChallengesTab } from './components/tabs/ChallengesTab';
import { LeaderboardTab } from './components/tabs/LeaderboardTab';
import { ProfileTab } from './components/tabs/ProfileTab';
import { AppModals } from './components/modals/AppModals';
import { usePwaAndCountdowns } from './hooks/usePwaAndCountdowns';
import { useQuizSession } from './hooks/useQuizSession';

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
  const [darkMode, setDarkMode] = useState<boolean>(
    () => localStorage.getItem('sr_theme_v3') === 'dark'
  );

  const t = TRANSLATIONS[lang];
  /** Chọn nhanh chuỗi theo ngôn ngữ đang dùng (VI / EN / KO) */
  const L = (vi: string, en: string, ko?: string) =>
    lang === 'en' ? en : lang === 'ko' && ko ? ko : vi;

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
    topList: [],
    myRank: null,
  });
  const [profileData, setProfileData] = useState<any>(null);

  const [lockedModalDay, setLockedModalDay] = useState<any | null>(null);
  const [showEventsPopup, setShowEventsPopup] = useState(false);
  const [popupEvents, setPopupEvents] = useState<EventPopupItem[]>([]);
  const [eventsLoaded, setEventsLoaded] = useState<boolean>(false);
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
  const [pendingSaveNotice, setPendingSaveNotice] = useState<string | null>(null);
  const isGuest = !token || !user;
  const [eventState, setEventState] = useState<EventState>({
    eventStatus: 'ACTIVE',
    eventStartAt: null,
    startDateLabel: null,
    startFromDayNumber: null,
    totalDays: undefined,
    unlockedDaysCount: undefined,
  });
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [challengeFilter, setChallengeFilter] = useState<
    'ALL' | 'COMPLETED' | 'EXPIRED' | 'IN_PROGRESS' | 'UNSTARTED'
  >('ALL');

  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifModal, setShowNotifModal] = useState<boolean>(false);
  const [showPwaInstallGuideModal, setShowPwaInstallGuideModal] = useState<boolean>(false);

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

  const [userDevices, setUserDevices] = useState<any[]>([]);
  const fetchUserDevices = async () => {
    if (!token) return;
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
    }
  };

  const handleRemoveDevice = async (deviceId: string) => {
    if (!token) return;
    const confirmed = await appDialog.confirm({
      title: L('Xóa thiết bị tin cậy', 'Remove trusted device', '신뢰 기기 삭제'),
      message: t.removeDeviceConfirm,
      confirmText: L('Xóa thiết bị', 'Remove', '삭제'),
      cancelText: L('Hủy', 'Cancel', '취소'),
      variant: 'danger',
    });
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/profile/devices/${deviceId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) fetchUserDevices();
    } catch (e) {
      console.error(e);
    }
  };

  // Hệ thống biến giao diện Sáng / Tối tường minh
  const cardBg = darkMode
    ? 'bg-slate-900/60 lg:bg-slate-900/80 border-slate-700/60 text-slate-100 backdrop-blur-[2px] lg:backdrop-blur-sm'
    : 'bg-white/60 lg:bg-white/80 border-white/70 text-slate-800 backdrop-blur-[2px] lg:backdrop-blur-sm';
  const subCardBg = darkMode
    ? 'bg-slate-800/55 lg:bg-slate-800/75 border-slate-700/60 text-slate-100'
    : 'bg-white/55 lg:bg-slate-50/80 border-white/70 text-slate-800';
  const textPrimary = darkMode ? 'text-white' : 'text-slate-900';
  const textSecondary = darkMode ? 'text-slate-300' : 'text-slate-600';

  const themeProps: SharedThemeProps = {
    lang,
    darkMode,
    cardBg,
    subCardBg,
    textPrimary,
    textSecondary,
    t,
    L,
  };

  const getHeaders = (withJson = false): Record<string, string> => {
    const h: Record<string, string> = { Authorization: `Bearer ${token}` };
    if (withJson) h['Content-Type'] = 'application/json';
    return h;
  };

  const handleSpeak = (id: string, textToSpeak: string, audioUrl?: string) => {
    setPlayingAudioId(id);
    playPronunciation(textToSpeak, audioUrl);
    setTimeout(() => {
      setPlayingAudioId((prev) => (prev === id ? null : prev));
    }, 1000);
  };

  const todayChallenge =
    challenges.find((c) => c.isToday) ||
    challenges.find((c) => !c.resultsRevealed && c.status === 'OPEN') ||
    challenges.find((c) => c.status === 'OPEN') ||
    challenges.find((c) => c.status === 'COMPLETED') ||
    challenges[0];
  const isTodayLocked = !todayChallenge || todayChallenge.status === 'LOCKED';
  const isEventCountdown = eventState.eventStatus === 'COUNTDOWN';
  const isEventWaiting =
    eventState.eventStatus === 'NOT_STARTED' || eventState.eventStatus === 'COUNTDOWN';
  const totalDays =
    typeof eventState.totalDays === 'number' && eventState.totalDays > 0
      ? eventState.totalDays
      : challenges.length > 1
      ? challenges.length
      : challenges.length || 0;
  const totalDaysLabel = totalDays > 0 ? String(totalDays) : '--';
  const completedCount = profileData?.user?.completedDays ?? user?.completedDays ?? 0;
  const myTotalScore = profileData?.user?.totalScore ?? user?.totalScore ?? 0;
  const myRankNumber = leaderboardData?.myRank?.rank ?? profileData?.user?.rank ?? '-';

  const fetchAllDataRef = useRef<() => Promise<void>>(async () => {});

  const {
    midnightCountdown,
    eventCountdown,
    pwaUpdateReady,
    unreadNotifCount,
    markAllNotifsAsRead,
  } = usePwaAndCountdowns({
    token,
    user,
    lang,
    eventState,
    notifications,
    setNotifications,
    onRefreshData: () => fetchAllDataRef.current(),
    onNavigateTab: (tab) => navigateToTab(tab),
  });

  const quiz = useQuizSession({
    token,
    user,
    isGuest,
    challenges,
    todayChallenge,
    eventState,
    eventCountdown,
    getHeaders,
    handleSpeak,
    onRefreshData: () => fetchAllDataRef.current(),
    setLockedModalDay,
    setLoginPromptMsg,
    showMessage,
    L,
  });

  const navigateToTab = (tab: TabType) => {
    if (isGuest && !GUEST_TABS.includes(tab)) {
      setLoginPromptMsg(
        L(
          `Tính năng này chỉ dành cho tài khoản đã đăng nhập. Đăng nhập hoặc tạo tài khoản để xem lộ trình ${totalDays > 0 ? `${totalDays} ngày` : 'thử thách'}, làm bù bài các ngày trước và theo dõi điểm của bạn.`,
          `This feature requires an account. Log in or sign up to see the ${totalDays > 0 ? `${totalDays}-day` : 'challenge'} journey, catch up on previous days and track your score.`,
          `로그인한 계정만 이용할 수 있습니다. 로그인 또는 회원가입 후 ${totalDays > 0 ? `${totalDays}일 ` : ''}챌린지 여정과 내 점수를 확인하세요.`
        )
      );
      return;
    }
    quiz.setActiveQuiz(null);
    quiz.setQuizResult(null);
    quiz.setShowDetailedReview(false);
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
      const { resetToken, email } = extractResetPasswordParams();
      if (resetToken && email) {
        setAuthView({ mode: 'reset', initialEmail: email, initialToken: resetToken });
        return;
      }
      const h = window.location.hash.replace(/^#\/?/, '');
      if (h.startsWith('quiz') || h.startsWith('result') || h.startsWith('review')) {
        return;
      }
      quiz.setActiveQuiz(null);
      quiz.setQuizResult(null);
      quiz.setShowDetailedReview(false);
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
        setNotifications([]);
        const [todayRes, lbRes, evRes] = await Promise.all([
          fetch('/api/public/today'),
          fetch('/api/public/leaderboard'),
          fetch('/api/events', { cache: 'no-store' }).catch(() => null),
        ]);
        if (todayRes.ok) {
          const data = await todayRes.json();
          setChallenges(data.challenge ? [data.challenge] : []);
          if (data.eventStatus) {
            setEventState({
              eventStatus: data.eventStatus,
              eventStartAt: data.eventStartAt || null,
              startDateLabel: data.startDateLabel || null,
              startFromDayNumber: data.startFromDayNumber || null,
              totalDays: typeof data.totalDays === 'number' ? data.totalDays : undefined,
              unlockedDaysCount:
                typeof data.unlockedDaysCount === 'number' ? data.unlockedDaysCount : undefined,
            });
          }
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

      const [chalRes, lbRes, profRes, notifRes, evRes, eventStatusRes] = await Promise.all([
        fetch('/api/challenges', { headers: getHeaders() }),
        fetch('/api/leaderboard', { headers: getHeaders() }),
        fetch('/api/profile/me', { headers: getHeaders() }),
        fetch('/api/notifications', { headers: getHeaders(false) }).catch(() => null),
        fetch('/api/events', { headers: getHeaders(false), cache: 'no-store' }).catch(() => null),
        fetch('/api/event-status', { cache: 'no-store' }).catch(() => null),
      ]);

      if (chalRes.status === 401) {
        handleLogout();
        return;
      }

      if (chalRes.ok) setChallenges(await chalRes.json());
      if (eventStatusRes && eventStatusRes.ok) {
        const evStateData = await eventStatusRes.json();
        if (evStateData?.eventStatus) {
          setEventState({
            eventStatus: evStateData.eventStatus,
            eventStartAt: evStateData.eventStartAt || null,
            startDateLabel: evStateData.startDateLabel || null,
            startFromDayNumber: evStateData.startFromDayNumber || null,
            totalDays:
              typeof evStateData.totalDays === 'number' ? evStateData.totalDays : undefined,
            unlockedDaysCount:
              typeof evStateData.unlockedDaysCount === 'number'
                ? evStateData.unlockedDaysCount
                : undefined,
          });
        }
      }
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

      if (quiz.quizResult && !quiz.quizResult.resultsRevealed) {
        try {
          const rRes = await fetch(`/api/challenges/${quiz.quizResult.dayNumber}/result`, {
            headers: getHeaders(true),
          });
          if (rRes.ok) {
            const rData = await rRes.json();
            if (rData.resultsRevealed) quiz.setQuizResult(rData);
          }
        } catch {}
      }
    } catch (e) {
      console.error('Lỗi tải dữ liệu:', e);
    } finally {
      setIsGlobalLoading(false);
    }
  };
  fetchAllDataRef.current = fetchAllData;

  useEffect(() => {
    fetchAllData();
  }, [token]);

  useEffect(() => {
    if (activeTab === 'profile') fetchUserDevices();
  }, [activeTab, token]);

  useEffect(() => {
    if (isGuest && !GUEST_TABS.includes(activeTab)) {
      if (activeTab === 'admin' && authView !== null) return;
      setActiveTab('home');
      window.location.hash = '#home';
      return;
    }
    if (!isGuest && activeTab === 'admin' && user?.role !== 'ADMIN') {
      setActiveTab('home');
      window.location.hash = '#home';
    }
  }, [isGuest, activeTab, authView, user?.role]);

  const handleAuthSuccess = async (newToken: string, newUser: any) => {
    localStorage.setItem('sr_token', newToken);
    localStorage.setItem('sr_user', JSON.stringify(newUser));
    sessionStorage.removeItem(GUEST_MODE_KEY);
    setToken(newToken);
    setUser(newUser);
    setAuthView(null);

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
    setAuthView(null);
    quiz.setActiveQuiz(null);
    quiz.setQuizResult(null);
    window.location.hash = '';
  };

  const handleAdminToggleUnlock = async (dayNumber: number, unlockNow: boolean) => {
    if (unlockNow) {
      const result = await confirmAndUnlockChallengeDay({
        dayNumber,
        totalDays: totalDays || 21,
        eventStatus: eventState.eventStatus,
        scheduledDateLabel: eventState.startDateLabel,
        headers: getHeaders(true),
      });
      if (!result.performed) return;
      if (!result.ok) {
        showMessage(result.data?.message || 'Không thể mở khóa ngày thử thách', true);
        return;
      }
      setLockedModalDay(null);
      showMessage(result.data?.message || 'Đã cập nhật trạng thái ngày thử thách!');
      await fetchAllData();
      return;
    }

    await fetch(`/api/admin/challenges/${dayNumber}/unlock`, {
      method: 'PUT',
      headers: getHeaders(true),
      body: JSON.stringify({ unlockNow: false }),
    });
    setLockedModalDay(null);
    fetchAllData();
  };

  const handleExportLeaderboardCsv = () => {
    const rows = [
      ['Hạng', 'Số GEN (8 số)', 'Họ và Tên', 'Tổng Điểm', 'Số Ngày Hoàn Thành', 'Tổng Thời Gian Hoàn Thành'],
      ...(leaderboardData.topList || []).map((u: any) => [
        u.rank,
        `="${u.employeeId}"`,
        `"${u.fullName}"`,
        u.totalScore,
        u.completedDays,
        `"${formatTimeMmSs(Math.round((u.totalTimeMs || 0) / 1000))}"`,
      ]),
    ];
    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' + rows.map((e) => e.join(',')).join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', 'SpeakRight2026_DanhSachTraoGiai.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (authView && (authView.mode === 'reset' || authView.mode === 'enter_otp' || !token || !user)) {
    return (
      <>
        <PwaUpdateBanner visible={pwaUpdateReady} L={L} />
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
          totalDays={
            typeof eventState.totalDays === 'number'
              ? eventState.totalDays
              : challenges.length > 1
              ? challenges.length
              : 0
          }
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

  if (activeTab === 'admin' && user?.role === 'ADMIN') {
    return (
      <div className={`min-h-screen relative transition-colors ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>
        <PwaUpdateBanner visible={pwaUpdateReady} L={L} />
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
    <div className={`min-h-screen flex flex-col relative transition-colors ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>
      <PwaUpdateBanner visible={pwaUpdateReady} L={L} />
      <ResponsiveBackground darkMode={darkMode} />

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

      <AppTopHeader
        user={user}
        isGuest={isGuest}
        lang={lang}
        t={t}
        L={L}
        darkMode={darkMode}
        textPrimary={textPrimary}
        textSecondary={textSecondary}
        activeTab={activeTab}
        inQuizOrResult={Boolean(quiz.activeQuiz || quiz.quizResult)}
        showNotifModal={showNotifModal}
        unreadNotifCount={unreadNotifCount}
        onNavigateTab={navigateToTab}
        onToggleNotifModal={() => {
          const nextState = !showNotifModal;
          setShowNotifModal(nextState);
          if (nextState) markAllNotifsAsRead();
        }}
        onChangeLang={handleChangeLang}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
        onOpenLogin={() => setAuthView({ mode: 'login' })}
        onLogout={handleLogout}
      />

      {/* MAIN CONTENT */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-3 sm:px-6 pt-3 pb-6">
        <SpeakRightEventsPopup
          lang={lang}
          darkMode={darkMode}
          externalOpen={showEventsPopup}
          onExternalClose={() => setShowEventsPopup(false)}
          onStartDailyChallenge={() => quiz.handleStartDay(todayChallenge)}
          events={popupEvents}
          eventsLoaded={eventsLoaded}
        />

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

        {!isGuest && !quiz.activeQuiz && (
          <InstallPwaModal
            lang={lang}
            darkMode={darkMode}
            user={user}
            token={token}
            onToast={showMessage}
            forceOpenGuide={showPwaInstallGuideModal}
            onCloseGuide={() => setShowPwaInstallGuideModal(false)}
          />
        )}

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
        ) : quiz.activeQuiz ? (
          <QuizPlayView
            activeQuiz={quiz.activeQuiz}
            setActiveQuiz={quiz.setActiveQuiz}
            token={token}
            getHeaders={getHeaders}
            autoNextOnSelect={quiz.autoNextOnSelect}
            setAutoNextOnSelect={quiz.setAutoNextOnSelect}
            gracePeriodNotice={quiz.gracePeriodNotice}
            playingAudioId={playingAudioId}
            q11Data={quiz.q11Data}
            setQ11Data={quiz.setQ11Data}
            submittingQuiz={quiz.submittingQuiz}
            onNavigateTab={navigateToTab}
            onSpeak={handleSpeak}
            onSelectOption={quiz.handleSelectOption}
            onSubmitQuiz={quiz.handleSubmitQuiz}
            {...themeProps}
          />
        ) : quiz.quizResult ? (
          <QuizResultView
            quizResult={quiz.quizResult}
            isGuest={isGuest}
            user={user}
            totalDays={totalDays}
            midnightCountdown={midnightCountdown}
            adminPreviewResult={quiz.adminPreviewResult}
            setAdminPreviewResult={quiz.setAdminPreviewResult}
            showDetailedReview={quiz.showDetailedReview}
            setShowDetailedReview={quiz.setShowDetailedReview}
            onOpenAuth={(mode, notice) => setAuthView({ mode, notice })}
            onNavigateTab={navigateToTab}
            onSpeak={handleSpeak}
            {...themeProps}
          />
        ) : (
          <>
            {activeTab === 'home' && (
              <HomeTab
                isGuest={isGuest}
                user={user}
                challenges={challenges}
                todayChallenge={todayChallenge}
                isTodayLocked={isTodayLocked}
                eventState={eventState}
                isEventWaiting={isEventWaiting}
                isEventCountdown={isEventCountdown}
                eventCountdown={eventCountdown}
                midnightCountdown={midnightCountdown}
                totalDays={totalDays}
                totalDaysLabel={totalDaysLabel}
                completedCount={completedCount}
                myTotalScore={myTotalScore}
                myRankNumber={myRankNumber}
                startingDay={quiz.startingDay}
                guestSubmittedDay={quiz.guestSubmittedDay}
                leaderboardData={leaderboardData}
                popupEvents={popupEvents}
                onShowEventsPopup={() => setShowEventsPopup(true)}
                onStartDay={quiz.handleStartDay}
                onNavigateTab={navigateToTab}
                {...themeProps}
              />
            )}

            {activeTab === 'challenges' && (
              <ChallengesTab
                challenges={challenges}
                todayChallenge={todayChallenge}
                isTodayLocked={isTodayLocked}
                eventState={eventState}
                isEventWaiting={isEventWaiting}
                isEventCountdown={isEventCountdown}
                eventCountdown={eventCountdown}
                totalDays={totalDays}
                totalDaysLabel={totalDaysLabel}
                completedCount={completedCount}
                startingDay={quiz.startingDay}
                challengeFilter={challengeFilter}
                setChallengeFilter={setChallengeFilter}
                onStartDay={quiz.handleStartDay}
                onNavigateTab={navigateToTab}
                {...themeProps}
              />
            )}

            {activeTab === 'leaderboard' && (
              <LeaderboardTab
                leaderboardData={leaderboardData}
                user={user}
                isGuest={isGuest}
                totalDaysLabel={totalDaysLabel}
                onOpenAuth={(mode) => setAuthView({ mode })}
                {...themeProps}
              />
            )}

            {activeTab === 'profile' && user && (
              <ProfileTab
                user={user}
                token={token}
                profileData={profileData}
                userDevices={userDevices}
                totalDays={totalDays}
                totalDaysLabel={totalDaysLabel}
                completedCount={completedCount}
                myTotalScore={myTotalScore}
                myRankNumber={myRankNumber}
                onNavigateTab={navigateToTab}
                onRemoveDevice={handleRemoveDevice}
                onOpenPwaInstallGuide={() => setShowPwaInstallGuideModal(true)}
                onToast={showMessage}
                {...themeProps}
              />
            )}
          </>
        )}
      </main>

      <PerfmonsterFooter
        lang={lang}
        darkMode={darkMode}
        totalDays={totalDays}
        onNavigate={(tab) => navigateToTab(tab)}
      />

      <AppModals
        user={user}
        token={token}
        forceLockModalMsg={quiz.forceLockModalMsg}
        setForceLockModalMsg={quiz.setForceLockModalMsg}
        showNotifModal={showNotifModal}
        setShowNotifModal={setShowNotifModal}
        notifications={notifications}
        pwaUpdateReady={pwaUpdateReady}
        markAllNotifsAsRead={markAllNotifsAsRead}
        lockedModalDay={lockedModalDay}
        setLockedModalDay={setLockedModalDay}
        loginPromptMsg={loginPromptMsg}
        setLoginPromptMsg={setLoginPromptMsg}
        onAdminToggleUnlock={handleAdminToggleUnlock}
        onOpenAuth={(mode) => setAuthView({ mode })}
        onNavigateTab={navigateToTab}
        onToast={showMessage}
        {...themeProps}
      />

      <AppMobileNav
        isGuest={isGuest}
        t={t}
        L={L}
        darkMode={darkMode}
        activeTab={activeTab}
        inQuizOrResult={Boolean(quiz.activeQuiz || quiz.quizResult)}
        onNavigateTab={navigateToTab}
        onOpenLogin={() => setAuthView({ mode: 'login' })}
      />
    </div>
  );
};

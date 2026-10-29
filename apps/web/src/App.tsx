import React, { useEffect, useState } from 'react';
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
} from 'lucide-react';
import { AuthScreen } from './components/AuthScreen';
import { InstallPwaModal } from './components/InstallPwaModal';
import { AdminDashboard } from './components/AdminDashboard';
import { ResponsiveBackground, PerfmonsterFooter } from './components/LayoutDecor';
import { playPronunciation } from './utils/audio';
import { Lang, TRANSLATIONS } from './utils/i18n';

type TabType = 'home' | 'challenges' | 'leaderboard' | 'profile' | 'admin';

const VALID_TABS: TabType[] = ['home', 'challenges', 'leaderboard', 'profile', 'admin'];

function getTabFromHash(): TabType {
  const hash = window.location.hash.replace('#', '').split('/')[0] as TabType;
  return VALID_TABS.includes(hash) ? hash : 'home';
}

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
    answers: Record<string, 'A' | 'B' | 'C' | 'D'>;
    elapsedSeconds: number;
  } | null>(null);
  const [quizResult, setQuizResult] = useState<any | null>(null);
  const [showDetailedReview, setShowDetailedReview] = useState(false);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [autoNextOnSelect, setAutoNextOnSelect] = useState<boolean>(true);
  const [gracePeriodNotice, setGracePeriodNotice] = useState<string | null>(null);
  const [forceLockModalMsg, setForceLockModalMsg] = useState<string | null>(null);

  // Hệ thống biến giao diện Sáng / Tối tường minh (Không phụ thuộc vào Dark Mode của Hệ điều hành Windows/Mac)
  const cardBg = darkMode
    ? 'bg-slate-900/90 border-slate-800 text-slate-100'
    : 'bg-white/95 border-blue-100/90 text-slate-800';
  const subCardBg = darkMode
    ? 'bg-slate-800/90 border-slate-700 text-slate-100'
    : 'bg-slate-50/90 border-slate-200/80 text-slate-800';
  const textPrimary = darkMode ? 'text-white' : 'text-slate-900';
  const textSecondary = darkMode ? 'text-slate-400' : 'text-slate-500';

  const getHeaders = (withJson = false): Record<string, string> => {
    const h: Record<string, string> = {
      Authorization: `Bearer ${token}`,
    };
    if (withJson) h['Content-Type'] = 'application/json';
    return h;
  };

  const navigateToTab = (tab: TabType) => {
    setActiveQuiz(null);
    setQuizResult(null);
    setShowDetailedReview(false);
    setLockedModalDay(null);
    setActiveTab(tab);
    window.location.hash = `#${tab}`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const onHashChange = () => {
      const h = window.location.hash.replace('#', '');
      if (h.startsWith('quiz') || h.startsWith('result') || h.startsWith('review')) {
        return;
      }
      setActiveQuiz(null);
      setQuizResult(null);
      setShowDetailedReview(false);
      setActiveTab(getTabFromHash());
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const fetchAllData = async () => {
    if (!token) return;
    try {
      const [chalRes, lbRes, profRes] = await Promise.all([
        fetch('/api/challenges', { headers: getHeaders() }),
        fetch('/api/leaderboard?scope=company', {
          headers: getHeaders(),
        }),
        fetch('/api/profile/me', { headers: getHeaders() }),
      ]);

      if (chalRes.status === 401) {
        handleLogout();
        return;
      }

      if (chalRes.ok) setChallenges(await chalRes.json());
      if (lbRes.ok) setLeaderboardData(await lbRes.json());
      if (profRes.ok) {
        const prof = await profRes.json();
        setProfileData(prof);
        setUser(prof.user);
        localStorage.setItem('sr_user', JSON.stringify(prof.user));
      }
    } catch (e) {
      console.error('Lỗi tải dữ liệu:', e);
    }
  };

  useEffect(() => {
    if (token) {
      fetchAllData();
    }
  }, [token]);

  useEffect(() => {
    if (!activeQuiz) {
      setGracePeriodNotice(null);
      return;
    }
    const timer = setInterval(() => {
      setActiveQuiz((prev) =>
        prev ? { ...prev, elapsedSeconds: prev.elapsedSeconds + 1 } : null
      );
    }, 1000);

    const lockCheckTimer = setInterval(async () => {
      try {
        const res = await fetch(`/api/challenges/${activeQuiz.dayNumber}/session-status`, {
          headers: getHeaders(),
        });
        if (!res.ok) return;
        const statusData = await res.json();
        if (statusData.status === 'GRACE_PERIOD') {
          setGracePeriodNotice(statusData.message);
        } else if (statusData.status === 'FORCE_LOCKED') {
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

  const handleAuthSuccess = (newToken: string, newUser: any) => {
    localStorage.setItem('sr_token', newToken);
    localStorage.setItem('sr_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    navigateToTab('home');
  };

  const handleLogout = () => {
    localStorage.removeItem('sr_token');
    localStorage.removeItem('sr_user');
    setToken(null);
    setUser(null);
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

    try {
      const res = await fetch(`/api/challenges/${dayItem.dayNumber}/start`, {
        method: 'POST',
        headers: getHeaders(true),
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setQuizResult(null);
      setShowDetailedReview(false);
      setActiveQuiz({
        dayNumber: data.dayNumber,
        title: data.title,
        dateLabel: data.dateLabel,
        questions: data.questions,
        currentIndex: 0,
        answers: {},
        elapsedSeconds: 0,
      });
      window.location.hash = `#quiz/${data.dayNumber}`;
      window.scrollTo({ top: 0, behavior: 'smooth' });

      const firstQ = data.questions?.[0];
      if (firstQ?.hasPromptAudio && firstQ?.targetWord) {
        setTimeout(() => handleSpeak(`prompt-${firstQ.id}`, firstQ.targetWord), 350);
      }
    } catch (err: any) {
      alert(err.message || 'Không thể bắt đầu thử thách');
    }
  };

  const handleSelectOption = (question: any, optionId: 'A' | 'B' | 'C' | 'D') => {
    if (!activeQuiz) return;
    const isLastQuestion = activeQuiz.currentIndex === activeQuiz.questions.length - 1;

    setActiveQuiz((prev) => {
      if (!prev) return null;
      const updatedAnswers = { ...prev.answers, [question.id]: optionId };
      return {
        ...prev,
        answers: updatedAnswers,
      };
    });

    if (autoNextOnSelect && !isLastQuestion) {
      setTimeout(() => {
        setActiveQuiz((prev) => {
          if (!prev || prev.currentIndex >= prev.questions.length - 1) return prev;
          const nextIdx = prev.currentIndex + 1;
          const nextQ = prev.questions[nextIdx];
          if (nextQ?.hasPromptAudio && nextQ?.targetWord) {
            setTimeout(() => handleSpeak(`prompt-${nextQ.id}`, nextQ.targetWord), 250);
          }
          return { ...prev, currentIndex: nextIdx };
        });
      }, 280);
    }
  };

  const handleSubmitQuiz = async () => {
    if (!activeQuiz) return;
    try {
      const res = await fetch(`/api/challenges/${activeQuiz.dayNumber}/submit`, {
        method: 'POST',
        headers: getHeaders(true),
        body: JSON.stringify({
          answers: activeQuiz.answers,
          clientTimeMs: activeQuiz.elapsedSeconds * 1000,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 423 || data.code === 'FORCE_LOCKED') {
          setActiveQuiz(null);
          setForceLockModalMsg(data.message);
          fetchAllData();
          return;
        }
        throw new Error(data.message);
      }

      setActiveQuiz(null);
      setGracePeriodNotice(null);
      setQuizResult(data);
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
      ['Hạng', 'Số GEN (8 số)', 'Họ và Tên', 'Tổng Điểm', 'Số Ngày Hoàn Thành'],
      ...(leaderboardData.topList || []).map((u: any) => [
        u.rank,
        `="${u.employeeId}"`,
        `"${u.fullName}"`,
        u.totalScore,
        u.completedDays,
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

  if (!token || !user) {
    return (
      <AuthScreen
        onAuthSuccess={handleAuthSuccess}
        lang={lang}
        onChangeLang={handleChangeLang}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
      />
    );
  }

  const todayChallenge =
    challenges.find((c) => c.status === 'OPEN') ||
    challenges.find((c) => c.status === 'COMPLETED') ||
    challenges[0];
  const completedCount = profileData?.user?.completedDays ?? user.completedDays ?? 0;
  const myTotalScore = profileData?.user?.totalScore ?? user.totalScore ?? 0;
  const myRankNumber = leaderboardData?.myRank?.rank ?? profileData?.user?.rank ?? 12;

  return (
    <div
      className={`min-h-screen flex flex-col relative transition-colors ${
        darkMode ? 'text-slate-100' : 'text-slate-800'
      }`}
    >
      <ResponsiveBackground darkMode={darkMode} />

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
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black shadow-sm shrink-0">
              🎙️
            </div>
            <div className="leading-tight min-w-0">
              <div
                className={`text-xs sm:text-sm font-black truncate ${
                  darkMode ? 'text-blue-400' : 'text-blue-700'
                }`}
              >
                SPEAK RIGHT 2026
              </div>
              <div className={`text-xs sm:text-sm font-extrabold truncate ${textPrimary}`}>
                {user.fullName}
              </div>
              <div className={`text-[11px] font-bold truncate ${textSecondary}`}>
                GEN {user.employeeId}
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
              { id: 'home', label: t.home, icon: Home },
              { id: 'challenges', label: t.challenges, icon: Calendar },
              { id: 'leaderboard', label: t.leaderboard, icon: Trophy },
              { id: 'profile', label: t.profile, icon: User },
              ...(user.role === 'ADMIN'
                ? [{ id: 'admin', label: t.admin, icon: ShieldCheck }]
                : []),
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
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Cột Phải: Đổi ngôn ngữ (VI / EN / KO) + Sáng/Tối + Đăng xuất */}
          <div className="flex items-center gap-1.5 shrink-0">
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

            {/* Thanh chọn chế độ Sáng / Tối trực quan 2 nút */}
            <div
              className={`p-0.5 rounded-xl flex items-center ${
                darkMode ? 'bg-slate-800/70' : 'bg-white/60'
              }`}
            >
              <button
                type="button"
                onClick={() => setDarkMode(false)}
                className={`px-2 py-1 rounded-lg text-[10px] font-extrabold flex items-center gap-1 transition ${
                  !darkMode
                    ? 'bg-amber-400 text-slate-950 shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="Chế độ Sáng"
              >
                <Sun className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sáng</span>
              </button>
              <button
                type="button"
                onClick={() => setDarkMode(true)}
                className={`px-2 py-1 rounded-lg text-[10px] font-extrabold flex items-center gap-1 transition ${
                  darkMode
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
                title="Chế độ Tối"
              >
                <Moon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tối</span>
              </button>
            </div>

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
          </div>
        </div>
      </header>

      {/* ================= NỘI DUNG CHÍNH ================= */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-3 sm:px-6 pt-3 pb-6">
        <InstallPwaModal />

        {/* ---------- A. MÀN HÌNH LÀM BÀI ---------- */}
        {activeQuiz ? (
          <div className={`max-w-2xl mx-auto rounded-3xl shadow-xl border p-4 sm:p-6 backdrop-blur-md ${cardBg}`}>
            {gracePeriodNotice && (
              <div className="mb-3 p-3 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 text-xs font-extrabold flex items-center gap-2">
                <span>{gracePeriodNotice}</span>
              </div>
            )}

            <div className="flex items-center justify-between pb-3 border-b border-slate-200/60">
              <button
                onClick={() => navigateToTab('home')}
                className="p-1.5 -ml-1.5 rounded-xl text-slate-500 hover:bg-slate-100 flex items-center gap-1 text-xs font-bold"
              >
                <ChevronLeft className="w-5 h-5" /> {t.backBtn}
              </button>
              <div className="text-center">
                <h2 className={`text-sm sm:text-base font-black ${textPrimary}`}>
                  {activeQuiz.title} ({activeQuiz.dateLabel})
                </h2>
              </div>
              <div className="flex items-center gap-1 bg-rose-50 text-rose-600 px-2.5 py-1 rounded-full text-xs font-extrabold">
                <Clock className="w-3.5 h-3.5" />
                {formatTimeMmSs(activeQuiz.elapsedSeconds)}
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1 overflow-x-auto py-1 no-scrollbar">
                {activeQuiz.questions.map((qItem, idx) => {
                  const answered = Boolean(activeQuiz.answers[qItem.id]);
                  const isCurrent = activeQuiz.currentIndex === idx;
                  return (
                    <button
                      key={qItem.id}
                      type="button"
                      onClick={() =>
                        setActiveQuiz((prev) => (prev ? { ...prev, currentIndex: idx } : null))
                      }
                      className={`w-7 h-7 rounded-lg text-xs font-extrabold shrink-0 transition ${
                        isCurrent
                          ? 'bg-blue-600 text-white shadow-sm scale-105'
                          : answered
                          ? 'bg-emerald-100 text-emerald-700'
                          : darkMode
                          ? 'bg-slate-800 text-slate-400'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setAutoNextOnSelect(!autoNextOnSelect)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 shrink-0 border transition ${
                  autoNextOnSelect
                    ? 'bg-blue-50 border-blue-200 text-blue-700'
                    : 'bg-slate-100 border-slate-200 text-slate-500'
                }`}
              >
                <Zap className="w-3 h-3" />
                {t.autoNext}: {autoNextOnSelect ? t.on : t.off}
              </button>
            </div>

            {(() => {
              const q = activeQuiz.questions[activeQuiz.currentIndex];
              const selectedOpt = activeQuiz.answers[q.id];
              const answeredCount = Object.keys(activeQuiz.answers).length;

              return (
                <div className="mt-3">
                  <div
                    className={`border rounded-2xl p-4 sm:p-5 ${
                      darkMode
                        ? 'bg-slate-800 border-slate-700'
                        : 'bg-gradient-to-br from-blue-50 to-indigo-50/60 border-blue-100'
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
                      <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 text-xs sm:text-sm font-extrabold">
                        📌 {q.statementText}
                      </div>
                    )}

                    {q.promptVideoUrl && (
                      <div className="mt-3 rounded-2xl overflow-hidden bg-slate-950 border border-blue-200 flex justify-center">
                        <video
                          src={q.promptVideoUrl}
                          controls
                          playsInline
                          className="max-h-56 w-full object-contain"
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-3.5">
                    {q.options.map((opt: any) => {
                      const isSelected = selectedOpt === opt.id;
                      const optAudioKey = `opt-${q.id}-${opt.id}`;
                      return (
                        <div
                          key={opt.id}
                          onClick={() => handleSelectOption(q, opt.id)}
                          className={`flex items-center gap-3 p-3.5 sm:p-4 rounded-2xl border-2 cursor-pointer transition select-none active:scale-[0.99] ${
                            isSelected
                              ? darkMode
                                ? 'border-blue-500 bg-blue-950/60 shadow-sm'
                                : 'border-blue-600 bg-blue-50 shadow-sm'
                              : darkMode
                              ? 'border-slate-700 bg-slate-800/80 hover:border-blue-400'
                              : 'border-slate-200 bg-white hover:border-blue-300'
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
                              {opt.id}. {opt.text}
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
                      <button
                        type="button"
                        onClick={handleSubmitQuiz}
                        className="flex-1 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm shadow-lg shadow-emerald-600/25 transition"
                      >
                        {t.submitQuiz} ({answeredCount}/{activeQuiz.questions.length})
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        ) : quizResult ? (
          /* ---------- B. MÀN HÌNH KẾT QUẢ ---------- */
          <div className="max-w-2xl mx-auto">
            {!showDetailedReview ? (
              <div className={`rounded-3xl shadow-xl border p-6 text-center backdrop-blur-md ${cardBg}`}>
                <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-100 flex items-center justify-center mb-2">
                  <Star className="w-10 h-10 text-amber-400 fill-amber-400" />
                </div>
                <h2 className="text-2xl font-black text-rose-500">Great Job!</h2>
                <p className={`text-sm font-bold ${textPrimary}`}>
                  {t.completedDayMsg} Day {quizResult.dayNumber}
                </p>

                <div className={`my-5 p-4 rounded-3xl border ${subCardBg}`}>
                  <div className="text-4xl font-black text-blue-600">
                    {quizResult.score}/{quizResult.totalPoints} {t.pointsSuffix}
                  </div>

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
              <div className={`rounded-3xl shadow-xl border p-4 sm:p-6 backdrop-blur-md ${cardBg}`}>
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
                  {quizResult.detailedReview.map((item: any) => (
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
                            {t.questionLabel} {item.orderIndex}: {item.correctOptionId}.{' '}
                            {item.correctOptionText}
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
                <div className="bg-gradient-to-br from-blue-600 via-blue-600 to-indigo-700 rounded-3xl p-5 sm:p-6 text-white shadow-xl">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="inline-flex items-center gap-1.5 bg-white/20 px-3 py-0.5 rounded-full text-xs font-extrabold">
                        🔥 {t.todayChallengeBadge} • {todayChallenge?.title || 'Day 1'} (
                        {todayChallenge?.dateLabel || '04/11/2026'})
                      </div>
                      <h1 className="text-xl sm:text-2xl font-black">{t.todayTitle}</h1>
                      <p className="text-xs sm:text-sm text-blue-100">{t.todayVocab}</p>
                    </div>

                    <div className="shrink-0">
                      <button
                        onClick={() => handleStartDay(todayChallenge)}
                        className="w-full md:w-auto px-6 py-4 rounded-2xl bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-950 font-black text-sm sm:text-base shadow-xl flex items-center justify-center gap-2 transition"
                      >
                        <Play className="w-5 h-5 fill-slate-950" />
                        {todayChallenge?.status === 'COMPLETED'
                          ? `${t.retryTodayBtn} ${todayChallenge.title} (${todayChallenge.score}/100${t.pointsSuffix})`
                          : `${t.startTodayBtn} (${todayChallenge?.title || 'Day 1'})`}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5 mt-5 pt-4 border-t border-white/15 text-center">
                    <div
                      onClick={() => navigateToTab('challenges')}
                      className="bg-white/15 hover:bg-white/25 rounded-2xl p-2.5 cursor-pointer transition"
                    >
                      <div className="text-lg sm:text-2xl font-black text-amber-300">
                        {completedCount}/30 {t.daysUnit}
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
                        {myTotalScore.toLocaleString()} {t.pointsSuffix}
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
                        #{myRankNumber}
                      </div>
                      <div className="text-[11px] text-blue-100 font-semibold">{t.rankLabel}</div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                  {/* Lộ trình nhanh 6 ngày */}
                  <div className={`lg:col-span-6 rounded-3xl p-4 sm:p-5 border shadow-md backdrop-blur-md ${cardBg}`}>
                    <div className="flex items-center justify-between mb-3">
                      <h2 className={`text-sm sm:text-base font-black flex items-center gap-1.5 ${textPrimary}`}>
                        <Calendar className="w-4 h-4 text-blue-600" /> {t.progressTitle} (
                        {completedCount}/30)
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
                        const isOpen = c.status === 'OPEN';
                        return (
                          <div
                            key={c.dayNumber}
                            onClick={() => handleStartDay(c)}
                            className={`p-3 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between ${
                              isCompleted
                                ? darkMode
                                  ? 'bg-emerald-950/40 border-emerald-500'
                                  : 'bg-emerald-50/90 border-emerald-400'
                                : isOpen
                                ? darkMode
                                  ? 'bg-blue-950/50 border-blue-500 shadow-sm'
                                  : 'bg-blue-50/90 border-blue-600 shadow-sm'
                                : darkMode
                                ? 'bg-slate-800/70 border-slate-700 text-slate-400'
                                : 'bg-slate-50/90 border-slate-200 text-slate-500'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className={`text-sm font-black ${textPrimary}`}>
                                {c.title}
                              </span>
                              {isCompleted ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              ) : isOpen ? (
                                <span className="text-[10px] font-extrabold bg-blue-600 text-white px-2 py-0.5 rounded-full">
                                  {t.todayBadge}
                                </span>
                              ) : (
                                <Lock className="w-3.5 h-3.5 text-slate-400" />
                              )}
                            </div>
                            <div className={`text-[11px] mt-1 ${textSecondary}`}>{c.dateLabel}</div>
                            <div className="mt-2 text-xs font-extrabold">
                              {isCompleted ? (
                                <span className="text-emerald-600">
                                  {c.score}/100{t.pointsSuffix}
                                </span>
                              ) : isOpen ? (
                                <span className="text-blue-600">{t.tapToStart}</span>
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
                  <div className={`lg:col-span-6 rounded-3xl p-4 sm:p-5 border shadow-md backdrop-blur-md flex flex-col justify-between ${cardBg}`}>
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

                      <div className={`divide-y ${darkMode ? 'divide-slate-800' : 'divide-slate-100'}`}>
                        {(leaderboardData.topList || []).slice(0, 5).map((item: any) => (
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
                                  GEN {item.employeeId} • {item.completedDays}/30 {t.daysUnit}
                                </div>
                              </div>
                            </div>
                            <span className="text-xs sm:text-sm font-black text-blue-600 shrink-0">
                              {item.totalScore.toLocaleString()}
                              {t.pointsSuffix}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div
                      className={`mt-3 pt-3 border-t flex items-center justify-between px-3.5 py-2.5 rounded-2xl ${
                        darkMode
                          ? 'border-slate-800 bg-blue-950/50 text-blue-200'
                          : 'border-slate-100 bg-blue-50 text-blue-950'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black bg-blue-600 text-white px-2 py-0.5 rounded-md">
                          #{myRankNumber}
                        </span>
                        <span className="text-xs font-extrabold">
                          {user.fullName} ({t.youBadge})
                        </span>
                      </div>
                      <span className="text-xs font-black text-blue-600">
                        {myTotalScore.toLocaleString()}
                        {t.pointsSuffix} • {completedCount}/30 {t.daysUnit}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ================= 2. TAB 30 NGÀY ================= */}
            {activeTab === 'challenges' && (
              <div className="space-y-4">
                <div className={`rounded-2xl p-4 border shadow-sm backdrop-blur-md flex items-center justify-between ${cardBg}`}>
                  <div>
                    <h2 className={`text-base font-black ${textPrimary}`}>{t.journey30Days}</h2>
                    <p className={`text-xs ${textSecondary}`}>
                      {t.completedDaysLabel}: <strong>{completedCount}/30 {t.daysUnit}</strong>
                    </p>
                  </div>
                  <button
                    onClick={() => handleStartDay(todayChallenge)}
                    className="px-4 py-2.5 rounded-xl bg-blue-600 text-white font-extrabold text-xs shadow-sm"
                  >
                    {t.doTodayBtn}
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
                  {challenges.map((c) => {
                    const isCompleted = c.status === 'COMPLETED';
                    const isOpen = c.status === 'OPEN';
                    return (
                      <div
                        key={c.dayNumber}
                        onClick={() => handleStartDay(c)}
                        className={`p-3.5 rounded-2xl border-2 transition cursor-pointer select-none flex flex-col justify-between min-h-[100px] backdrop-blur-md ${
                          isCompleted
                            ? darkMode
                              ? 'bg-slate-900/90 border-emerald-500 shadow-sm'
                              : 'bg-white/95 border-emerald-500 shadow-sm'
                            : isOpen
                            ? darkMode
                              ? 'bg-blue-950/60 border-blue-500 shadow-sm'
                              : 'bg-blue-50/95 border-blue-600 ring-2 ring-blue-100 shadow-sm'
                            : darkMode
                            ? 'bg-slate-900/75 border-slate-800 text-slate-400'
                            : 'bg-white/85 border-slate-200 text-slate-500'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className={`text-sm sm:text-base font-black ${textPrimary}`}>
                              {c.title}
                            </div>
                            <div className={`text-[11px] ${textSecondary}`}>{c.dateLabel}</div>
                          </div>

                          {isCompleted ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                          ) : isOpen ? (
                            <span className="text-[10px] font-extrabold bg-blue-600 text-white px-2 py-0.5 rounded-full">
                              {t.openBadge}
                            </span>
                          ) : (
                            <Lock className="w-4 h-4 text-slate-400" />
                          )}
                        </div>

                        <div className="mt-2 flex items-center justify-between">
                          {isCompleted ? (
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
                          ) : isOpen ? (
                            <span className="text-xs font-extrabold text-blue-600">
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
                  {(leaderboardData.topList || []).map((item: any) => {
                    const isMe = item.id === user.id;
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
                            {item.completedDays}/30 {t.daysUnit}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {leaderboardData.myRank && (
                  <div className="bg-blue-700 text-white p-3.5 rounded-2xl shadow-xl flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="px-2.5 py-1 rounded-lg bg-white/20 font-black text-xs">
                        #{leaderboardData.myRank.rank}
                      </span>
                      <span className="text-xs sm:text-sm font-extrabold">
                        {user.fullName} ({t.youBadge})
                      </span>
                    </div>
                    <span className="text-sm sm:text-base font-black text-amber-300">
                      {leaderboardData.myRank.totalScore.toLocaleString()} {t.pointsSuffix}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* ================= 4. TAB CÁ NHÂN (PROFILE) ================= */}
            {activeTab === 'profile' && (
              <div className="max-w-3xl mx-auto space-y-4">
                <div className={`rounded-3xl p-5 border shadow-sm backdrop-blur-md ${cardBg}`}>
                  <div className="flex items-center gap-4">
                    <img
                      src={user.avatarUrl}
                      alt={user.fullName}
                      className="w-16 h-16 rounded-full bg-blue-50 border-2 border-blue-100"
                    />
                    <div>
                      <h2 className={`text-lg font-black ${textPrimary}`}>{user.fullName}</h2>
                      <p className={`text-xs ${textSecondary}`}>
                        GEN <strong>{user.employeeId}</strong>
                      </p>
                      <p className="text-xs text-blue-600 font-semibold">{user.email}</p>
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
                        {completedCount}/30
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
                    {[1, 5, 10, 20, 30].map((m) => {
                      const unlocked = completedCount >= m || m === 1;
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

                  <div className={`grid grid-cols-7 gap-2 items-end h-28 pt-4 px-2 rounded-2xl border ${subCardBg}`}>
                    {[
                      { day: 'D1', ok: 8, err: 2 },
                      { day: 'D2', ok: 9, err: 1 },
                      { day: 'D3', ok: 7, err: 3 },
                      { day: 'D4', ok: 10, err: 0 },
                      { day: 'D5', ok: 8, err: 2 },
                      { day: 'D6', ok: 9, err: 1 },
                      { day: 'D7', ok: 10, err: 0 },
                    ].map((bar) => (
                      <div key={bar.day} className="flex flex-col items-center gap-1 h-full justify-end">
                        <div className="flex items-end gap-1 w-full justify-center h-20">
                          <div
                            className="w-2.5 bg-emerald-500 rounded-t"
                            style={{ height: `${bar.ok * 10}%` }}
                          />
                          <div
                            className="w-2.5 bg-rose-400 rounded-t"
                            style={{ height: `${Math.max(8, bar.err * 10)}%` }}
                          />
                        </div>
                        <span className={`text-[10px] font-bold ${textSecondary}`}>{bar.day}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ================= 5. TAB QUẢN TRỊ (ADMIN CMS) ================= */}
            {activeTab === 'admin' && (
              <AdminDashboard
                token={token}
                challenges={challenges}
                onRefreshGlobal={fetchAllData}
                onExportCsv={handleExportLeaderboardCsv}
                lang={lang}
                darkMode={darkMode}
              />
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

      {/* ================= MODAL NGÀY CHƯA MỞ KHÓA ================= */}
      {lockedModalDay && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-sm rounded-3xl p-6 text-center shadow-2xl relative border ${cardBg}`}>
            <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center">
              <Lock className="w-7 h-7" />
            </div>
            <h3 className={`text-xl font-black mt-3 ${textPrimary}`}>{lockedModalDay.title}</h3>
            <p className={`text-xs font-semibold ${textSecondary}`}>{lockedModalDay.dateLabel}</p>

            <div className="bg-amber-50 rounded-2xl p-3.5 my-4 border border-amber-200 text-xs sm:text-sm font-extrabold text-amber-900">
              📅 {t.lockedTomorrowMsg}
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
              {user.role === 'ADMIN' && (
                <button
                  onClick={() => handleAdminToggleUnlock(lockedModalDay.dayNumber, true)}
                  className="w-full py-2.5 rounded-2xl bg-amber-100 text-amber-900 font-bold text-xs flex items-center justify-center gap-1"
                >
                  <Unlock className="w-3.5 h-3.5" /> Mở khóa ngay {lockedModalDay.title} (Admin)
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= BOTTOM NAVIGATION BAR ================= */}
      <nav
        className={`md:hidden fixed bottom-0 inset-x-0 z-40 backdrop-blur-md border-t px-2 py-1 pb-safe transition-colors ${
          darkMode
            ? 'bg-slate-900/75 border-slate-700/70 text-white'
            : 'bg-white/75 border-white/80 text-slate-800 shadow-lg'
        }`}
      >
        <div
          className={`grid ${
            user.role === 'ADMIN' ? 'grid-cols-5' : 'grid-cols-4'
          } gap-1 max-w-md mx-auto`}
        >
          {[
            { id: 'home', label: t.home, icon: Home },
            { id: 'challenges', label: t.challenges, icon: Calendar },
            { id: 'leaderboard', label: t.leaderboard, icon: Trophy },
            { id: 'profile', label: t.profile, icon: User },
            ...(user.role === 'ADMIN'
              ? [{ id: 'admin', label: t.admin, icon: ShieldCheck }]
              : []),
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id && !activeQuiz && !quizResult;
            return (
              <button
                key={item.id}
                onClick={() => navigateToTab(item.id as TabType)}
                className={`flex flex-col items-center justify-center py-1.5 rounded-2xl transition ${
                  isActive
                    ? 'text-blue-600 font-extrabold'
                    : darkMode
                    ? 'text-slate-400 font-medium'
                    : 'text-slate-500 font-medium'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] mt-0.5 truncate">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

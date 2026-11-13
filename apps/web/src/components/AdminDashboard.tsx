import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  BarChart3,
  BellRing,
  Download,
  Edit3,
  LogOut,
  Menu,
  Moon,
  ShieldCheck,
  Sparkles,
  Sun,
  Users,
  X,
} from 'lucide-react';
import {
  AdminSubTab,
  buildAdminHash,
  getAdminDocumentTitle,
  isAdminUrl,
  parseAdminRoute,
} from '../utils/adminRoutes';
import { Lang } from '../utils/i18n';
import { EventPopupItem } from './SpeakRightEventsPopup';
import { AdminChallengesTab } from './admin/AdminChallengesTab';
import { AdminDashboardStatsTab } from './admin/AdminDashboardStatsTab';
import { AdminEventsTab } from './admin/AdminEventsTab';
import { AdminNotificationsTab } from './admin/AdminNotificationsTab';
import { AdminSecurityTab } from './admin/AdminSecurityTab';
import { AdminUsersTab } from './admin/AdminUsersTab';
import { ADMIN_I18N, AdminDashboardProps } from './admin/adminTypes';

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
  const initialRoute = useMemo(() => parseAdminRoute(), []);
  const [adminSubTab, setAdminSubTab] = useState<AdminSubTab>(initialRoute.subTab);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);

  // Dashboard stats
  const [dashboardStats, setDashboardStats] = useState<any | null>(null);
  const [selectedStatDay, setSelectedStatDay] = useState<number>(
    initialRoute.subTab === 'dashboard' && initialRoute.dayNumber ? initialRoute.dayNumber : 1
  );

  // Users
  const [userList, setUserList] = useState<any[]>([]);
  const [allUsersList, setAllUsersList] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState<string>('');

  // Notifications & Push
  const [notifTargetType, setNotifTargetType] = useState<'all' | 'user'>('all');
  const [notifTargetValue, setNotifTargetValue] = useState<string>('');
  const [notifTitle, setNotifTitle] = useState<string>(
    '🌟 Khen ngợi {name} đã hoàn thành xuất sắc!'
  );
  const [notifBody, setNotifBody] = useState<string>(
    '👏 Chúc mừng {name} (GEN {gen})! Bạn đang có {score} điểm trên bảng xếp hạng. Hãy tiếp tục giữ vững phong độ tuyệt vời này nhé! 🏆🔥'
  );
  const [notifTargetUrl, setNotifTargetUrl] = useState<string>('#challenges');
  const [pushStatus, setPushStatus] = useState<any | null>(null);
  const [spreadWindowSeconds, setSpreadWindowSeconds] = useState<number>(18);
  const [minIntervalMs, setMinIntervalMs] = useState<number>(1200);
  const [autoRemindUnstudied, setAutoRemindUnstudied] = useState<boolean>(true);
  const [morningHour, setMorningHour] = useState<number>(7);
  const [morningMinute, setMorningMinute] = useState<number>(0);
  const [eveningTop1Hour, setEveningTop1Hour] = useState<number>(19);
  const [eveningTop1Minute, setEveningTop1Minute] = useState<number>(0);
  const [nightUnstudiedHour, setNightUnstudiedHour] = useState<number>(21);
  const [nightUnstudiedMinute, setNightUnstudiedMinute] = useState<number>(0);

  // Challenges schedule route state
  const [selectedDay, setSelectedDay] = useState<number>(
    initialRoute.subTab === 'challenges' && initialRoute.dayNumber ? initialRoute.dayNumber : 1
  );

  // Events & Security
  const [eventList, setEventList] = useState<EventPopupItem[]>([]);
  const [loadingEvents, setLoadingEvents] = useState<boolean>(false);
  const [securityStats, setSecurityStats] = useState<any | null>(null);

  // Toasts
  const [toast, setToast] = useState<string>('');
  const [errorToast, setErrorToast] = useState<string>('');

  const totalDays =
    challenges.length ||
    dashboardStats?.eventState?.totalDays ||
    dashboardStats?.allDaysStats?.length ||
    0;
  const unlockedDaysCount = challenges.filter((c) => c.status !== 'LOCKED').length;
  const eventStatus: 'NOT_STARTED' | 'COUNTDOWN' | 'ACTIVE' =
    dashboardStats?.eventState?.eventStatus || (unlockedDaysCount > 0 ? 'ACTIVE' : 'NOT_STARTED');

  useEffect(() => {
    if (challenges.length > 0) {
      if (selectedDay > challenges.length) setSelectedDay(challenges.length);
      if (selectedStatDay > challenges.length) setSelectedStatDay(challenges.length);
    }
  }, [challenges.length]);

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
          setMorningHour(data.queueStatus.config.morningHour ?? 7);
          setMorningMinute(data.queueStatus.config.morningMinute ?? 0);
          setEveningTop1Hour(data.queueStatus.config.eveningTop1Hour ?? 19);
          setEveningTop1Minute(data.queueStatus.config.eveningTop1Minute ?? 0);
          setNightUnstudiedHour(data.queueStatus.config.nightUnstudiedHour ?? 21);
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
    }
  };

  const fetchAdminUsers = async () => {
    try {
      const q = encodeURIComponent(userSearch);
      const res = await fetch(`/api/admin/users?search=${q}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const users = data.users || [];
        setUserList(users);
        if (!userSearch.trim()) {
          setAllUsersList(users);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAdminEvents = async () => {
    setLoadingEvents(true);
    try {
      const res = await fetch('/api/admin/events', {
        headers: { Authorization: `Bearer ${token}` },
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

  useEffect(() => {
    fetchDashboardStats(selectedStatDay);
    fetchAdminUsers();
    fetchAdminEvents();
    fetch('/api/admin/users?search=', {
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
    if (adminSubTab === 'users') {
      fetchAdminUsers();
    }
  }, [adminSubTab]);

  useEffect(() => {
    fetchPushStatus(true);
    fetchSecurityStats();
    const interval = setInterval(() => {
      fetchPushStatus(false);
      fetchSecurityStats();
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const originalTitleRef = useRef<string>(typeof document !== 'undefined' ? document.title : '');

  useEffect(() => {
    return () => {
      if (originalTitleRef.current) {
        document.title = originalTitleRef.current;
      }
    };
  }, []);

  useEffect(() => {
    document.title = getAdminDocumentTitle(
      {
        subTab: adminSubTab,
        dayNumber:
          adminSubTab === 'challenges'
            ? selectedDay
            : adminSubTab === 'dashboard' && selectedStatDay > 1
            ? selectedStatDay
            : undefined,
      },
      lang
    );
  }, [adminSubTab, selectedDay, selectedStatDay, lang]);

  useEffect(() => {
    const syncRouteFromUrl = () => {
      if (!isAdminUrl()) return;
      const route = parseAdminRoute();
      setAdminSubTab(route.subTab);
      if (route.subTab === 'challenges' && route.dayNumber) {
        setSelectedDay(route.dayNumber);
      }
      if (route.subTab === 'dashboard' && route.dayNumber) {
        setSelectedStatDay(route.dayNumber);
      }
    };

    const route = parseAdminRoute();
    const initialDay =
      route.subTab === 'challenges'
        ? route.dayNumber ?? 1
        : route.subTab === 'dashboard' && route.dayNumber && route.dayNumber > 1
        ? route.dayNumber
        : undefined;
    const canonicalHash = buildAdminHash(route.subTab, initialDay);
    const cleanPath = window.location.pathname.replace(/\/admin(?:\/.*)?$/i, '/') || '/';
    if (window.location.pathname !== cleanPath || window.location.hash !== canonicalHash) {
      window.history.replaceState(null, '', `${cleanPath}${window.location.search}${canonicalHash}`);
    }

    window.addEventListener('hashchange', syncRouteFromUrl);
    window.addEventListener('popstate', syncRouteFromUrl);
    return () => {
      window.removeEventListener('hashchange', syncRouteFromUrl);
      window.removeEventListener('popstate', syncRouteFromUrl);
    };
  }, []);

  const navigateAdmin = (nextTab: AdminSubTab, dayNumber?: number, replace = false) => {
    const resolvedChallengeDay =
      nextTab === 'challenges' && typeof dayNumber === 'number' ? dayNumber : selectedDay;
    const resolvedStatDay =
      nextTab === 'dashboard' && typeof dayNumber === 'number' ? dayNumber : selectedStatDay;

    setAdminSubTab(nextTab);
    setMobileSidebarOpen(false);
    if (nextTab === 'challenges' && typeof dayNumber === 'number') {
      setSelectedDay(dayNumber);
    }
    if (nextTab === 'dashboard' && typeof dayNumber === 'number') {
      setSelectedStatDay(dayNumber);
    }

    const targetHash = buildAdminHash(
      nextTab,
      nextTab === 'challenges'
        ? resolvedChallengeDay
        : nextTab === 'dashboard' && resolvedStatDay > 1
        ? resolvedStatDay
        : undefined
    );
    const cleanPath = window.location.pathname.replace(/\/admin(?:\/.*)?$/i, '/') || '/';
    const nextUrl = `${cleanPath}${window.location.search}${targetHash}`;

    if (replace) {
      window.history.replaceState(null, '', nextUrl);
    } else if (window.location.pathname !== cleanPath || window.location.hash !== targetHash) {
      window.history.pushState(null, '', nextUrl);
    }

    if (nextTab === 'dashboard') fetchDashboardStats(resolvedStatDay);
    if (nextTab === 'users') fetchAdminUsers();
    if (nextTab === 'events') fetchAdminEvents();
    if (nextTab === 'notifications') fetchPushStatus(false);
    if (nextTab === 'security') fetchSecurityStats();
  };

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
      badge: totalDays > 0 ? `${totalDays}D` : '--',
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

      {mobileSidebarOpen && (
        <div
          onClick={() => setMobileSidebarOpen(false)}
          className="md:hidden fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm"
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-50 md:z-20 h-screen w-72 shrink-0 border-r backdrop-blur-xl flex flex-col justify-between transition-transform duration-300 ${
          darkMode
            ? 'bg-slate-900/95 border-slate-800 text-white'
            : 'bg-white/95 border-slate-200 text-slate-900 shadow-sm'
        } ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
      >
        <div className="p-4 sm:p-5 border-b border-slate-200/60 dark:border-slate-800">
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
        </div>

        <div className="p-3 flex-1 overflow-y-auto space-y-1">
          <div className={`text-[10px] font-black uppercase tracking-wider px-3 py-1.5 ${textSecondary}`}>
            Danh Mục Quản Trị
          </div>
          {ADMIN_SIDEBAR_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = adminSubTab === item.id;
            const itemHref = buildAdminHash(
              item.id,
              item.id === 'challenges'
                ? selectedDay
                : item.id === 'dashboard' && selectedStatDay > 1
                ? selectedStatDay
                : undefined
            );
            return (
              <a
                key={item.id}
                href={itemHref}
                onClick={(e) => {
                  if (!e.metaKey && !e.ctrlKey && !e.shiftKey && e.button === 0) {
                    e.preventDefault();
                    navigateAdmin(item.id);
                  }
                }}
                aria-current={isActive ? 'page' : undefined}
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
              </a>
            );
          })}

          <div className="pt-3 mt-3 border-t border-slate-200/60 dark:border-slate-800 space-y-1">
            <div className={`text-[10px] font-black uppercase tracking-wider px-3 py-1 ${textSecondary}`}>
              Tác Vụ Nhanh
            </div>
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

      {/* MAIN CONTENT */}
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
                  ? totalDays > 0
                    ? `Đề Thi ${totalDays} Ngày`
                    : 'Lịch Trình & Đề Thi'
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
          {adminSubTab === 'dashboard' && (
            <AdminDashboardStatsTab
              dashboardStats={dashboardStats}
              totalDays={totalDays}
              unlockedDaysCount={unlockedDaysCount}
              selectedStatDay={selectedStatDay}
              navigateAdmin={navigateAdmin}
              darkMode={darkMode}
              cardBg={cardBg}
              subCardBg={subCardBg}
              inputBg={inputBg}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
            />
          )}

          {adminSubTab === 'users' && (
            <AdminUsersTab
              token={token}
              totalDays={totalDays}
              userList={userList}
              userSearch={userSearch}
              setUserSearch={setUserSearch}
              fetchAdminUsers={fetchAdminUsers}
              onRefreshDashboardStats={() => fetchDashboardStats()}
              onMessageUser={(u) => {
                navigateAdmin('notifications');
                setNotifTargetType('user');
                setNotifTargetValue(u.id);
                setNotifTitle(`🎉 Chào ${u.fullName}!`);
                setNotifBody(
                  `Chào ${u.fullName} (GEN ${u.employeeId}), bạn hiện có ${u.totalScore} điểm! Ban tổ chức chúc bạn hoàn thành trọn vẹn thử thách hôm nay nhé! 🚀`
                );
              }}
              showMessage={showMessage}
              darkMode={darkMode}
              cardBg={cardBg}
              subCardBg={subCardBg}
              inputBg={inputBg}
              textSecondary={textSecondary}
            />
          )}

          {adminSubTab === 'challenges' && (
            <AdminChallengesTab
              token={token}
              challenges={challenges}
              totalDays={totalDays}
              unlockedDaysCount={unlockedDaysCount}
              eventStatus={eventStatus}
              dashboardStats={dashboardStats}
              selectedDay={selectedDay}
              navigateAdmin={navigateAdmin}
              onRefreshGlobal={onRefreshGlobal}
              onRefreshDashboardStats={(d) => fetchDashboardStats(d)}
              onRefreshPushStatus={() => fetchPushStatus(false)}
              onTotalDaysConfigured={(cleanTotal) => {
                if (selectedDay > cleanTotal) setSelectedDay(cleanTotal);
                if (selectedStatDay > cleanTotal) setSelectedStatDay(cleanTotal);
              }}
              at={at}
              darkMode={darkMode}
              cardBg={cardBg}
              subCardBg={subCardBg}
              inputBg={inputBg}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
              showMessage={showMessage}
            />
          )}

          {adminSubTab === 'events' && (
            <AdminEventsTab
              token={token}
              eventList={eventList}
              loadingEvents={loadingEvents}
              fetchAdminEvents={fetchAdminEvents}
              setEventList={setEventList}
              onEventsChange={onEventsChange}
              onRefreshGlobal={onRefreshGlobal}
              showMessage={showMessage}
              darkMode={darkMode}
              cardBg={cardBg}
              subCardBg={subCardBg}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
            />
          )}

          {adminSubTab === 'notifications' && (
            <AdminNotificationsTab
              token={token}
              totalDays={totalDays}
              selectedDay={selectedDay}
              allUsersList={allUsersList}
              userList={userList}
              notifTargetType={notifTargetType}
              setNotifTargetType={setNotifTargetType}
              notifTargetValue={notifTargetValue}
              setNotifTargetValue={setNotifTargetValue}
              notifTitle={notifTitle}
              setNotifTitle={setNotifTitle}
              notifBody={notifBody}
              setNotifBody={setNotifBody}
              notifTargetUrl={notifTargetUrl}
              setNotifTargetUrl={setNotifTargetUrl}
              pushStatus={pushStatus}
              setPushStatus={setPushStatus}
              spreadWindowSeconds={spreadWindowSeconds}
              setSpreadWindowSeconds={setSpreadWindowSeconds}
              minIntervalMs={minIntervalMs}
              setMinIntervalMs={setMinIntervalMs}
              autoRemindUnstudied={autoRemindUnstudied}
              setAutoRemindUnstudied={setAutoRemindUnstudied}
              morningHour={morningHour}
              setMorningHour={setMorningHour}
              morningMinute={morningMinute}
              setMorningMinute={setMorningMinute}
              eveningTop1Hour={eveningTop1Hour}
              setEveningTop1Hour={setEveningTop1Hour}
              eveningTop1Minute={eveningTop1Minute}
              setEveningTop1Minute={setEveningTop1Minute}
              nightUnstudiedHour={nightUnstudiedHour}
              setNightUnstudiedHour={setNightUnstudiedHour}
              nightUnstudiedMinute={nightUnstudiedMinute}
              setNightUnstudiedMinute={setNightUnstudiedMinute}
              fetchPushStatus={fetchPushStatus}
              onRefreshGlobal={onRefreshGlobal}
              showMessage={showMessage}
              darkMode={darkMode}
              cardBg={cardBg}
              subCardBg={subCardBg}
              inputBg={inputBg}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
            />
          )}

          {adminSubTab === 'security' && (
            <AdminSecurityTab
              securityStats={securityStats}
              onUnbanIp={handleUnbanIp}
              darkMode={darkMode}
              cardBg={cardBg}
              subCardBg={subCardBg}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
            />
          )}
        </div>
      </main>
    </div>
  );
};

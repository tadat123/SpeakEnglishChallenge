import React from 'react';
import {
  Bell,
  BellRing,
  Calendar,
  Home,
  Lock,
  LogOut,
  Moon,
  Sparkles,
  Sun,
  Trophy,
  User,
} from 'lucide-react';
import { Lang, TRANSLATIONS } from '../../utils/i18n';
import { applyAppUpdate } from '../../utils/pwaPush';
import { TabType } from './appTypes';

interface PwaUpdateBannerProps {
  visible: boolean;
  L: (vi: string, en: string, ko?: string) => string;
}

/** Banner nổi thông báo có bản cập nhật PWA mới */
export const PwaUpdateBanner: React.FC<PwaUpdateBannerProps> = ({ visible, L }) => {
  if (!visible) return null;
  return (
    <div className="fixed top-2 inset-x-0 z-[10000] px-3 pointer-events-none flex justify-center">
      <div className="pointer-events-auto w-full max-w-lg p-3 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 text-white shadow-2xl border border-white/30 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <Sparkles className="w-5 h-5 text-amber-300 shrink-0 animate-pulse" />
          <div className="min-w-0">
            <div className="text-xs sm:text-sm font-black truncate">
              {L('Đã có phiên bản mới!', 'New version available!', '새 버전이 출시되었습니다!')}
            </div>
            <div className="text-[11px] text-blue-100 truncate">
              {L(
                'Bấm Cập nhật để tải tính năng & dữ liệu mới nhất.',
                'Tap Update to load the latest version.',
                '최신 버전을 불러오려면 업데이트를 누르세요.'
              )}
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
  );
};

interface AppTopHeaderProps {
  user: any;
  isGuest: boolean;
  lang: Lang;
  t: (typeof TRANSLATIONS)[Lang];
  L: (vi: string, en: string, ko?: string) => string;
  darkMode: boolean;
  textPrimary: string;
  textSecondary: string;
  activeTab: TabType;
  inQuizOrResult: boolean;
  showNotifModal: boolean;
  unreadNotifCount: number;
  onNavigateTab: (tab: TabType) => void;
  onToggleNotifModal: () => void;
  onChangeLang: (lang: Lang) => void;
  onToggleDarkMode: () => void;
  onOpenLogin: () => void;
  onLogout: () => void;
}

/** Header cố định phía trên cho bản Web & Mobile */
export const AppTopHeader: React.FC<AppTopHeaderProps> = ({
  user,
  isGuest,
  lang,
  t,
  L,
  darkMode,
  textPrimary,
  textSecondary,
  activeTab,
  inQuizOrResult,
  showNotifModal,
  unreadNotifCount,
  onNavigateTab,
  onToggleNotifModal,
  onChangeLang,
  onToggleDarkMode,
  onOpenLogin,
  onLogout,
}) => {
  return (
    <header className="sticky top-0 z-30 px-2 sm:px-6 pt-2 pb-1">
      <div
        className={`max-w-5xl mx-auto flex items-center justify-between gap-2 rounded-2xl px-3 sm:px-5 py-2 backdrop-blur-md border transition-colors ${
          darkMode
            ? 'bg-slate-900/60 border-slate-700/60 text-white shadow-lg shadow-black/20'
            : 'bg-white/60 border-white/70 text-slate-900 shadow-sm'
        }`}
      >
        <div
          onClick={() => onNavigateTab('home')}
          className="flex items-center gap-2.5 cursor-pointer min-w-0"
        >
          <img
            src={`${import.meta.env.BASE_URL || '/'}logo.png`}
            alt="Speak Right 2026"
            className="w-11 h-11 sm:w-12 sm:h-12 object-contain drop-shadow-sm shrink-0"
          />
          <div className="leading-tight min-w-0">
            <div className={`text-xs sm:text-sm font-black truncate ${darkMode ? 'text-blue-400' : 'text-blue-700'}`}>
              SPEAK RIGHT 2026
            </div>
            <div className={`text-xs sm:text-sm font-extrabold truncate ${textPrimary}`}>
              {isGuest ? L('Khách', 'Guest', '게스트') : user?.fullName}
            </div>
            {!isGuest && (
              <div className={`text-[11px] font-bold truncate ${textSecondary}`}>
                {`GEN ${user?.employeeId}`}
              </div>
            )}
          </div>
        </div>

        <nav className={`hidden md:flex items-center gap-1 p-1 rounded-2xl ${darkMode ? 'bg-slate-800/70' : 'bg-white/60'}`}>
          {[
            { id: 'home', label: t.home, icon: Home, locked: false },
            { id: 'challenges', label: t.challenges, icon: Calendar, locked: isGuest },
            { id: 'leaderboard', label: t.leaderboard, icon: Trophy, locked: false },
            { id: 'profile', label: t.profile, icon: User, locked: isGuest },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id && !inQuizOrResult;
            return (
              <button
                key={item.id}
                onClick={() => onNavigateTab(item.id as TabType)}
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

        <div className="flex items-center gap-1.5 shrink-0">
          <div className="relative">
            <button
              type="button"
              onClick={onToggleNotifModal}
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

          <div className={`p-0.5 rounded-xl flex items-center ${darkMode ? 'bg-slate-800/70' : 'bg-white/60'}`}>
            {(['vi', 'en', 'ko'] as Lang[]).map((l) => (
              <button
                key={l}
                onClick={() => onChangeLang(l)}
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

          <button
            type="button"
            onClick={onToggleDarkMode}
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
              onClick={onOpenLogin}
              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-sm flex items-center gap-1 transition"
            >
              <span>{L('Đăng nhập', 'Log in', '로그인')}</span>
            </button>
          ) : (
            <button
              onClick={onLogout}
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
  );
};

interface AppMobileNavProps {
  isGuest: boolean;
  t: (typeof TRANSLATIONS)[Lang];
  L: (vi: string, en: string, ko?: string) => string;
  darkMode: boolean;
  activeTab: TabType;
  inQuizOrResult: boolean;
  onNavigateTab: (tab: TabType) => void;
  onOpenLogin: () => void;
}

/** Thanh điều hướng đáy cố định cho Mobile */
export const AppMobileNav: React.FC<AppMobileNavProps> = ({
  isGuest,
  t,
  L,
  darkMode,
  activeTab,
  inQuizOrResult,
  onNavigateTab,
  onOpenLogin,
}) => {
  return (
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
            onClick: isGuest ? onOpenLogin : undefined,
          },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id && !inQuizOrResult;
          return (
            <button
              key={item.id}
              onClick={item.onClick || (() => onNavigateTab(item.id as TabType))}
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
                {item.locked && <Lock className="w-2.5 h-2.5 text-amber-500 absolute -top-1 -right-1.5" />}
              </div>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

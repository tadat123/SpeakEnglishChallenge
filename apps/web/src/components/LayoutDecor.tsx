import React from 'react';
import { Lang } from '../utils/i18n';

interface ResponsiveBackgroundProps {
  darkMode: boolean;
}

export const ResponsiveBackground: React.FC<ResponsiveBackgroundProps> = ({ darkMode }) => {
  return (
    <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden select-none">
      {!darkMode ? (
        <>
          {/* 3 ảnh nền Sáng chuẩn kích thước: Desktop (>=1024px), Tablet (768px-1023px), Mobile (<768px) */}
          <picture className="w-full h-full block">
            <source media="(min-width: 1024px)" srcSet="/backgrounds/bg-desktop-light.jpg" />
            <source media="(min-width: 768px)" srcSet="/backgrounds/bg-tablet-light.jpg" />
            <img
              src="/backgrounds/bg-mobile-light.jpg"
              alt="Speak Right 2026 Background"
              className="w-full h-full object-cover object-bottom"
            />
          </picture>
          {/* Lớp phủ sáng dịu nhẹ để làm nổi bật nội dung trên nền tranh Shin-chan */}
          <div className="absolute inset-0 bg-white/20" />
        </>
      ) : (
        /* Nền Tối (Dark Mode) — Sẵn sàng gắn 3 ảnh tối khi bạn làm xong */
        <div className="w-full h-full bg-gradient-to-b from-[#0b1120] via-[#0f172a] to-[#1e1b4b]">
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                'radial-gradient(circle at 20% 20%, #3b82f6 0%, transparent 40%), radial-gradient(circle at 80% 70%, #6366f1 0%, transparent 45%)',
            }}
          />
        </div>
      )}
    </div>
  );
};

interface PerfmonsterFooterProps {
  lang: Lang;
  darkMode?: boolean;
  onNavigate?: (tab: 'home' | 'challenges' | 'leaderboard' | 'profile') => void;
}

const FOOTER_TEXT = {
  vi: {
    desc: 'Nền tảng luyện phát âm và giao tiếp tiếng Anh hằng ngày. Theo dõi tiến độ trực quan và tự tin tỏa sáng mỗi ngày.',
    col1Title: 'Thử thách',
    col1Links: ['Bài thi hôm nay', 'Bản đồ 30 ngày', 'Luyện phát âm IPA', 'Bảng xếp hạng'],
    col2Title: 'Tài nguyên',
    col2Links: ['Hướng dẫn làm bài', 'Thống kê kết quả', 'Huy hiệu cột mốc'],
    col3Title: 'Chương trình',
    col3Links: ['Về SpeakRight', 'Vinh danh Top 50', 'Trợ giúp kỹ thuật', 'Liên hệ BTC'],
    col4Title: 'Bảo mật',
    col4Links: ['Quy định Số GEN', 'Điều khoản', 'Bảo mật dữ liệu', 'Chống gian lận'],
  },
  en: {
    desc: 'Real-time workplace English pronunciation challenge. See what to improve and speak with confidence every day.',
    col1Title: 'Product',
    col1Links: ["Today's Challenge", '30-Day Map', 'IPA Pronunciation', 'Leaderboard'],
    col2Title: 'Resources',
    col2Links: ['Documentation', 'Accuracy Stats', 'Milestone Badges'],
    col3Title: 'Company',
    col3Links: ['About', 'Top 50 Players', 'Get Expert Help', 'Contact'],
    col4Title: 'Legal',
    col4Links: ['Privacy', 'Terms', 'Security', 'Data Processing'],
  },
  ko: {
    desc: '임직원을 위한 30일 비즈니스 영어 발음 챌린지 플랫폼. 매일 발음을 연습하고 실시간 랭킹을 확인하세요.',
    col1Title: '챌린지',
    col1Links: ['오늘의 문제', '30일 전체 맵', 'IPA 발음 연습', '실시간 랭킹'],
    col2Title: '리소스',
    col2Links: ['이용 가이드', '학습 통계', '달성 배지'],
    col3Title: '프로그램',
    col3Links: ['소개', 'TOP 50 명예의 전당', '기술 지원', '문의하기'],
    col4Title: '보안 정책',
    col4Links: ['개인정보 보호', '이용약관', '데이터 보안', '부정행위 방지'],
  },
};

export const PerfmonsterFooter: React.FC<PerfmonsterFooterProps> = ({
  lang,
  darkMode = false,
  onNavigate,
}) => {
  const ft = FOOTER_TEXT[lang];

  return (
    <footer
      className={`relative overflow-hidden pt-10 sm:pt-12 pb-24 md:pb-8 px-4 sm:px-8 mt-auto border-t transition-colors ${
        darkMode
          ? 'bg-gradient-to-b from-[#1a1c6b] to-[#12144d] text-white border-indigo-900/60'
          : 'bg-gradient-to-b from-white/95 via-sky-50/95 to-blue-100/95 backdrop-blur-md text-slate-800 border-blue-200/80'
      }`}
    >
      <div className="max-w-5xl mx-auto relative z-10">
        {/* Khối 5 cột chuẩn thiết kế mẫu */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-10 pb-12 sm:pb-16">
          {/* Cột Thương hiệu bên trái */}
          <div className="lg:col-span-4 space-y-2.5">
            <h2
              className={`text-xl sm:text-2xl font-black tracking-tight ${
                darkMode ? 'text-white' : 'text-blue-900'
              }`}
            >
              SpeakRight 2026
            </h2>
            <p
              className={`text-xs sm:text-sm leading-relaxed max-w-xs font-medium ${
                darkMode ? 'text-indigo-200/80' : 'text-slate-600'
              }`}
            >
              {ft.desc}
            </p>
          </div>

          {/* 4 Cột Liên kết bên phải */}
          <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8 text-xs sm:text-sm">
            {/* Cột 1: Product */}
            <div className="space-y-2.5">
              <div className={`font-extrabold ${darkMode ? 'text-white' : 'text-blue-950'}`}>
                {ft.col1Title}
              </div>
              <ul
                className={`space-y-2 font-semibold ${
                  darkMode ? 'text-indigo-200/75' : 'text-slate-600'
                }`}
              >
                <li>
                  <button
                    type="button"
                    onClick={() => onNavigate?.('home')}
                    className="hover:text-blue-600 dark:hover:text-white transition text-left"
                  >
                    {ft.col1Links[0]}
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onNavigate?.('challenges')}
                    className="hover:text-blue-600 dark:hover:text-white transition text-left"
                  >
                    {ft.col1Links[1]}
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onNavigate?.('challenges')}
                    className="hover:text-blue-600 dark:hover:text-white transition text-left"
                  >
                    {ft.col1Links[2]}
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onNavigate?.('leaderboard')}
                    className="hover:text-blue-600 dark:hover:text-white transition text-left"
                  >
                    {ft.col1Links[3]}
                  </button>
                </li>
              </ul>
            </div>

            {/* Cột 2: Resources */}
            <div className="space-y-2.5">
              <div className={`font-extrabold ${darkMode ? 'text-white' : 'text-blue-950'}`}>
                {ft.col2Title}
              </div>
              <ul
                className={`space-y-2 font-semibold ${
                  darkMode ? 'text-indigo-200/75' : 'text-slate-600'
                }`}
              >
                <li>
                  <button
                    type="button"
                    onClick={() => onNavigate?.('home')}
                    className="hover:text-blue-600 dark:hover:text-white transition text-left"
                  >
                    {ft.col2Links[0]}
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onNavigate?.('profile')}
                    className="hover:text-blue-600 dark:hover:text-white transition text-left"
                  >
                    {ft.col2Links[1]}
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onNavigate?.('profile')}
                    className="hover:text-blue-600 dark:hover:text-white transition text-left"
                  >
                    {ft.col2Links[2]}
                  </button>
                </li>
              </ul>
            </div>

            {/* Cột 3: Company */}
            <div className="space-y-2.5">
              <div className={`font-extrabold ${darkMode ? 'text-white' : 'text-blue-950'}`}>
                {ft.col3Title}
              </div>
              <ul
                className={`space-y-2 font-semibold ${
                  darkMode ? 'text-indigo-200/75' : 'text-slate-600'
                }`}
              >
                <li>
                  <button
                    type="button"
                    onClick={() => onNavigate?.('home')}
                    className="hover:text-blue-600 dark:hover:text-white transition text-left"
                  >
                    {ft.col3Links[0]}
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onNavigate?.('leaderboard')}
                    className="hover:text-blue-600 dark:hover:text-white transition text-left"
                  >
                    {ft.col3Links[1]}
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onNavigate?.('profile')}
                    className="hover:text-blue-600 dark:hover:text-white transition text-left"
                  >
                    {ft.col3Links[2]}
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onNavigate?.('home')}
                    className="hover:text-blue-600 dark:hover:text-white transition text-left"
                  >
                    {ft.col3Links[3]}
                  </button>
                </li>
              </ul>
            </div>

            {/* Cột 4: Legal */}
            <div className="space-y-2.5">
              <div className={`font-extrabold ${darkMode ? 'text-white' : 'text-blue-950'}`}>
                {ft.col4Title}
              </div>
              <ul
                className={`space-y-2 font-semibold ${
                  darkMode ? 'text-indigo-200/75' : 'text-slate-600'
                }`}
              >
                {ft.col4Links.map((label, idx) => (
                  <li key={idx}>
                    <span className="hover:text-blue-600 dark:hover:text-white transition cursor-default">
                      {label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Dòng Copyright góc trái dưới đáy */}
        <div
          className={`text-xs font-bold ${
            darkMode ? 'text-indigo-200/70' : 'text-slate-500'
          }`}
        >
          © 2026 All copyright SpeakEnglishRight
        </div>
      </div>

      {/* Nhân vật Pixel Cyan ló lên ở góc phải dưới đáy chuẩn theo ảnh mẫu */}
      <div
        className="absolute right-6 sm:right-16 bottom-14 md:bottom-0 pointer-events-none select-none opacity-95"
        aria-hidden="true"
      >
        <svg
          width="180"
          height="110"
          viewBox="0 0 18 11"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-32 sm:w-44 h-auto"
          shapeRendering="crispEdges"
        >
          {/* Khối gạch nhỏ bên trái */}
          <rect x="1" y="8" width="2" height="2" fill="#2dd4bf" />
          <rect x="0" y="10" width="2" height="1" fill="#14b8a6" />
          <rect x="2" y="10" width="2" height="1" fill="#0d9488" />

          {/* Tai trái & Tai phải */}
          <rect x="6" y="0" width="2" height="3" fill="#2dd4bf" />
          <rect x="8" y="0" width="1" height="3" fill="#14b8a6" />
          <rect x="13" y="0" width="2" height="3" fill="#2dd4bf" />
          <rect x="15" y="0" width="1" height="3" fill="#14b8a6" />

          {/* Đầu & Thân Pixel Monster */}
          <rect x="5" y="3" width="11" height="8" fill="#5eead4" />
          <rect x="4" y="5" width="1" height="6" fill="#5eead4" />
          <rect x="16" y="3" width="1" height="8" fill="#2dd4bf" />
          <rect x="17" y="5" width="1" height="6" fill="#14b8a6" />

          {/* Đôi mắt Pixel trắng + con ngươi xanh đậm */}
          <rect x="6" y="5" width="3" height="3" fill="#ffffff" />
          <rect x="7" y="6" width="2" height="2" fill="#1e3a8a" />

          <rect x="12" y="5" width="3" height="3" fill="#ffffff" />
          <rect x="12" y="6" width="2" height="2" fill="#1e3a8a" />
        </svg>
      </div>
    </footer>
  );
};

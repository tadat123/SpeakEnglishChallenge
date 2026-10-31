import React, { useEffect, useState } from 'react';
import {
  X,
  ChevronRight,
  ChevronDown,
  Users,
  FileText,
  Trophy,
  PlayCircle,
  Infinity as InfinityIcon,
  Target,
  Gift,
  Clapperboard,
  CalendarDays,
  Bell,
} from 'lucide-react';
import { Lang } from '../utils/i18n';

interface SpeakRightEventsPopupProps {
  lang?: Lang;
  darkMode?: boolean;
  externalOpen?: boolean;
  onExternalClose?: () => void;
  onStartDailyChallenge?: () => void;
}

const DISMISS_TODAY_KEY = 'sr2026_events_popup_dismissed_date';

function getTodayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;
}

type ActivityId = 'bell' | 'dub' | 'daily';

const COPY = {
  vi: {
    slogan: ['Speak clearer', 'Work smarter', 'Go further'],
    sectionTitle: 'Hoạt Động Hấp Dẫn',
    sectionSub: 'Tham gia thử thách, nâng trình tiếng Anh và để giọng nói của bạn được lắng nghe!',
    bellDesc: 'Kiểm tra kiến thức tiếng Anh và trở thành người trụ lại cuối cùng!',
    bellChips: ['~100 thí sinh', 'Trắc nghiệm', '1 Chung kết'],
    dubDesc: 'Lập đội, lồng tiếng cho nhân vật và thổi hồn vào video!',
    dubChips: ['~3 bạn / đội', 'Lồng tiếng video', '1 Chung kết'],
    deptNote: 'Mỗi bộ phận tự tổng hợp danh sách đăng ký và tổ chức vòng sơ loại.',
    dailyDesc: 'Mỗi ngày một bước nhỏ, tiến bộ lớn phía trước!',
    dailyChips: ['Không giới hạn', 'Làm mỗi ngày', 'Tích điểm & thưởng'],
    bellMore: [
      'Vòng sơ loại do từng bộ phận tự tổ chức để chọn đại diện.',
      'Vòng Chung kết offline: trả lời trắc nghiệm, sai là bị loại.',
      'Người cuối cùng trụ lại sẽ rung Chuông Vàng 🔔.',
    ],
    dubMore: [
      'Mỗi đội khoảng 3 người, nhận 1 đoạn video được chỉ định.',
      'Lồng tiếng tiếng Anh: chú trọng phát âm, ngữ điệu và cảm xúc.',
      'Các đội xuất sắc nhất vào thẳng vòng Chung kết.',
    ],
    details: 'Xem chi tiết',
    joinDaily: 'Vào làm Daily Challenge',
    bePartOf: 'Hãy là một phần của',
    tagline: 'Biến tiếng Anh thành một phần trong thành công mỗi ngày!',
    hideToday: 'Không hiển thị lại hôm nay',
    close: 'Đóng',
  },
  en: {
    slogan: ['Speak clearer', 'Work smarter', 'Go further'],
    sectionTitle: 'Exciting Activities',
    sectionSub: 'Join the challenges, improve your English and make your voice heard!',
    bellDesc: 'Test your English knowledge and be the last one standing!',
    bellChips: ['~100 participants', 'Multiple choice', '1 Final round'],
    dubDesc: 'Team up, give characters a voice, and bring the video to life!',
    dubChips: ['~3 members/team', 'Dub a video', '1 Final round'],
    deptNote: 'Each department will compile the registration list and organize the preliminary round.',
    dailyDesc: 'Small steps every day, big progress ahead!',
    dailyChips: ['No limit', 'Complete daily', 'Earn points'],
    bellMore: [
      'Each department runs its own preliminary round to pick representatives.',
      'Offline Final: answer multiple-choice questions — one wrong and you are out.',
      'The last one standing rings the Golden Bell 🔔.',
    ],
    dubMore: [
      'Teams of about 3 receive an assigned video clip.',
      'Dub it in English with focus on pronunciation, intonation and emotion.',
      'The best teams go straight to the Final round.',
    ],
    details: 'View details',
    joinDaily: 'Start Daily Challenge',
    bePartOf: 'Be part of',
    tagline: "Let's make English a part of our everyday success!",
    hideToday: "Don't show again today",
    close: 'Close',
  },
  ko: {
    slogan: ['Speak clearer', 'Work smarter', 'Go further'],
    sectionTitle: '가지 신나는 액티비티',
    sectionSub: '챌린지에 참여하고, 영어 실력을 높이고, 당신의 목소리를 들려주세요!',
    bellDesc: '영어 실력을 겨루고 마지막까지 살아남으세요!',
    bellChips: ['~100명 참가', '객관식 퀴즈', '결승 1라운드'],
    dubDesc: '팀을 이뤄 캐릭터에 목소리를 입히고 영상을 살려보세요!',
    dubChips: ['팀당 ~3명', '지정 영상 더빙', '결승 1라운드'],
    deptNote: '각 부서에서 참가자 명단을 취합하고 예선을 진행합니다.',
    dailyDesc: '매일 작은 한 걸음, 큰 성장으로!',
    dailyChips: ['참가 제한 없음', '매일 완료', '포인트 획득'],
    bellMore: [
      '각 부서별 예선을 통해 대표를 선발합니다.',
      '오프라인 결승: 객관식 문제, 틀리면 탈락.',
      '마지막까지 남은 사람이 골든벨을 울립니다 🔔.',
    ],
    dubMore: [
      '약 3명이 한 팀이 되어 지정 영상을 받습니다.',
      '발음, 억양, 감정을 살려 영어로 더빙합니다.',
      '우수 팀은 결승에 바로 진출합니다.',
    ],
    details: '자세히 보기',
    joinDaily: '데일리 챌린지 시작',
    bePartOf: '함께해요',
    tagline: '영어를 매일의 성공의 일부로 만들어요!',
    hideToday: '오늘 하루 보지 않기',
    close: '닫기',
  },
} as const;

export const SpeakRightEventsPopup: React.FC<SpeakRightEventsPopupProps> = ({
  lang = 'vi',
  darkMode = false,
  externalOpen = false,
  onExternalClose,
  onStartDailyChallenge,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hideForToday, setHideForToday] = useState(false);
  const [expanded, setExpanded] = useState<ActivityId | null>(null);

  useEffect(() => {
    try {
      if (localStorage.getItem(DISMISS_TODAY_KEY) !== getTodayKey()) setIsOpen(true);
    } catch {
      setIsOpen(true);
    }
  }, []);

  useEffect(() => {
    if (externalOpen) setIsOpen(true);
  }, [externalOpen]);

  const handleClose = () => {
    if (hideForToday) {
      try {
        localStorage.setItem(DISMISS_TODAY_KEY, getTodayKey());
      } catch {
        // ignore storage errors
      }
    }
    setIsOpen(false);
    setExpanded(null);
    onExternalClose?.();
  };

  if (!isOpen) return null;

  const c = COPY[lang] || COPY.vi;
  const baseUrl = import.meta.env.BASE_URL || '/';

  const activities: Array<{
    id: ActivityId;
    num: string;
    img: string;
    titleA: string;
    titleB: string;
    titleC: string;
    TitleIcon: React.ElementType;
    desc: string;
    chips: { Icon: React.ElementType; text: string }[];
    note?: string;
    more?: readonly string[];
    theme: {
      card: string;
      badge: string;
      titleA: string;
      titleB: string;
      chip: string;
      chipIcon: string;
      note: string;
      arrow: string;
    };
  }> = [
    {
      id: 'bell',
      num: '01',
      img: 'events/golden-bell.jpg',
      titleA: 'RING',
      titleB: 'the',
      titleC: 'GOLDEN BELL',
      TitleIcon: Bell,
      desc: c.bellDesc,
      chips: [
        { Icon: Users, text: c.bellChips[0] },
        { Icon: FileText, text: c.bellChips[1] },
        { Icon: Trophy, text: c.bellChips[2] },
      ],
      note: c.deptNote,
      more: c.bellMore,
      theme: {
        card: darkMode
          ? 'from-amber-950/70 to-slate-900 border-amber-600/60'
          : 'from-amber-50 to-orange-50 border-amber-300',
        badge: 'bg-orange-500',
        titleA: darkMode ? 'text-amber-300' : 'text-amber-800',
        titleB: darkMode ? 'text-amber-200' : 'text-amber-700',
        chip: darkMode ? 'bg-slate-800/80 border-amber-700/40' : 'bg-white/90 border-amber-100',
        chipIcon: 'text-amber-600',
        note: darkMode ? 'bg-amber-900/30 text-amber-100' : 'bg-amber-100/70 text-amber-950',
        arrow: 'bg-amber-500 hover:bg-amber-400 shadow-amber-500/40',
      },
    },
    {
      id: 'dub',
      num: '02',
      img: 'events/dub-it-right.jpg',
      titleA: 'DUB',
      titleB: 'IT',
      titleC: 'RIGHT',
      TitleIcon: Clapperboard,
      desc: c.dubDesc,
      chips: [
        { Icon: Users, text: c.dubChips[0] },
        { Icon: PlayCircle, text: c.dubChips[1] },
        { Icon: Trophy, text: c.dubChips[2] },
      ],
      note: c.deptNote,
      more: c.dubMore,
      theme: {
        card: darkMode
          ? 'from-sky-950/70 to-slate-900 border-sky-600/60'
          : 'from-sky-50 to-blue-50 border-sky-300',
        badge: 'bg-blue-600',
        titleA: darkMode ? 'text-sky-300' : 'text-blue-800',
        titleB: darkMode ? 'text-amber-300' : 'text-amber-500',
        chip: darkMode ? 'bg-slate-800/80 border-sky-700/40' : 'bg-white/90 border-sky-100',
        chipIcon: 'text-blue-600',
        note: darkMode ? 'bg-sky-900/30 text-sky-100' : 'bg-sky-100/80 text-blue-950',
        arrow: 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/40',
      },
    },
    {
      id: 'daily',
      num: '03',
      img: 'events/daily-challenge.jpg',
      titleA: 'DAILY',
      titleB: '',
      titleC: 'CHALLENGE',
      TitleIcon: CalendarDays,
      desc: c.dailyDesc,
      chips: [
        { Icon: InfinityIcon, text: c.dailyChips[0] },
        { Icon: Target, text: c.dailyChips[1] },
        { Icon: Gift, text: c.dailyChips[2] },
      ],
      theme: {
        card: darkMode
          ? 'from-violet-950/70 to-slate-900 border-violet-600/60'
          : 'from-violet-50 to-purple-50 border-violet-300',
        badge: 'bg-violet-600',
        titleA: darkMode ? 'text-violet-300' : 'text-indigo-900',
        titleB: darkMode ? 'text-amber-300' : 'text-amber-500',
        chip: darkMode ? 'bg-slate-800/80 border-violet-700/40' : 'bg-white/90 border-violet-100',
        chipIcon: 'text-violet-600',
        note: darkMode ? 'bg-violet-900/30 text-violet-100' : 'bg-violet-100/80 text-violet-950',
        arrow: 'bg-violet-600 hover:bg-violet-500 shadow-violet-600/40',
      },
    },
  ];

  const handleArrow = (id: ActivityId) => {
    if (id === 'daily') {
      handleClose();
      onStartDailyChallenge?.();
      return;
    }
    setExpanded((prev) => (prev === id ? null : id));
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-3 md:p-4"
      onClick={handleClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-sm sm:max-w-md md:max-w-lg max-h-[88vh] sm:max-h-[90vh] flex flex-col rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border transition ${
          darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-sky-200'
        }`}
      >
        <button
          type="button"
          onClick={handleClose}
          aria-label={c.close}
          className="absolute top-2 right-2 z-20 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-950/50 hover:bg-slate-950/70 text-white flex items-center justify-center backdrop-blur shadow transition"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="overflow-y-auto flex-1 no-scrollbar">
          {/* ===== HERO COMPACT CHO MOBILE & TABLET ===== */}
          <div
            className={`relative overflow-hidden px-3 pt-3 pb-3 sm:px-4 sm:pt-4 sm:pb-4 ${
              darkMode
                ? 'bg-gradient-to-br from-indigo-950 via-blue-950 to-slate-900'
                : 'bg-gradient-to-br from-sky-300 via-sky-200 to-blue-100'
            }`}
          >
            <img
              src={`${baseUrl}events/hero-shin.jpg`}
              alt=""
              aria-hidden
              className="absolute right-0 bottom-0 h-full w-[40%] sm:w-[44%] object-cover object-left-bottom"
              style={{
                maskImage: 'linear-gradient(to right, transparent 0%, black 25%)',
                WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 25%)',
              }}
            />
            <div className="relative z-10 max-w-[62%] sm:max-w-[60%]">
              <img
                src={`${baseUrl}logo.png`}
                alt="Speak Right"
                className="w-8 h-8 sm:w-10 sm:h-10 object-contain drop-shadow mb-0.5"
              />
              <h2 className="leading-[0.9] font-black tracking-tight drop-shadow-[0_2px_0_rgba(30,64,175,0.35)]">
                <span className="block text-2xl sm:text-3xl md:text-4xl text-blue-700 [-webkit-text-stroke:1px_white]">
                  SPEAK
                </span>
                <span className="block text-2xl sm:text-3xl md:text-4xl bg-gradient-to-b from-amber-300 to-orange-500 bg-clip-text text-transparent [-webkit-text-stroke:1px_white]">
                  RIGHT
                </span>
              </h2>
              <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full bg-blue-700 text-white text-[11px] sm:text-xs font-black border border-white shadow">
                2026
              </span>
              <div className="mt-1.5 inline-flex flex-wrap gap-x-1.5 gap-y-0.5 px-2 py-0.5 rounded-md bg-amber-300 text-blue-950 text-[8px] sm:text-[9px] font-black uppercase shadow -rotate-1">
                {c.slogan.map((s) => (
                  <span key={s}>{s}</span>
                ))}
              </div>
            </div>
          </div>

          {/* ===== SECTION TITLE ===== */}
          <div className={`px-3 pt-2.5 pb-1 sm:pt-3 sm:pb-1.5 text-center ${darkMode ? 'bg-slate-900' : 'bg-white'}`}>
            <h3
              className={`text-sm sm:text-base md:text-lg font-black uppercase tracking-wide ${
                darkMode ? 'text-sky-300' : 'text-blue-700'
              }`}
            >
              <span className="text-amber-400 mr-1">›</span>
              <span className="text-amber-500 text-lg sm:text-xl mr-1">3</span>
              {c.sectionTitle}
              <span className="text-amber-400 ml-1">‹</span>
            </h3>
            <p className={`text-[10px] sm:text-xs mt-0.5 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              {c.sectionSub}
            </p>
          </div>

          {/* ===== 3 ACTIVITY CARDS COMPACT & RESPONSIVE ===== */}
          <div className={`px-2.5 sm:px-3.5 pb-3 space-y-2 sm:space-y-2.5 ${darkMode ? 'bg-slate-900' : 'bg-white'}`}>
            {activities.map((a) => {
              const isExpanded = expanded === a.id;
              return (
                <div
                  key={a.id}
                  className={`rounded-xl sm:rounded-2xl border bg-gradient-to-r overflow-hidden shadow-sm ${a.theme.card}`}
                >
                  <div className="flex">
                    {/* Illustration */}
                    <div className="relative w-24 sm:w-28 md:w-36 shrink-0">
                      <img
                        src={`${baseUrl}${a.img}`}
                        alt={`${a.titleA} ${a.titleB} ${a.titleC}`}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                      <span
                        className={`absolute top-1 left-1 px-1.5 py-0.5 rounded text-white text-[10px] sm:text-xs font-black shadow ${a.theme.badge}`}
                      >
                        {a.num}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 p-2 sm:p-2.5">
                      <h4 className="flex items-center gap-1 font-black leading-none">
                        <span className={`text-sm sm:text-base md:text-lg ${a.theme.titleA}`}>{a.titleA}</span>
                        {a.titleB && (
                          <span className={`text-xs sm:text-sm ${a.theme.titleB}`}>{a.titleB}</span>
                        )}
                        <span
                          className={`text-sm sm:text-base md:text-lg ${
                            a.id === 'bell' ? a.theme.titleA : 'text-amber-500'
                          }`}
                        >
                          {a.titleC}
                        </span>
                        <a.TitleIcon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${a.theme.chipIcon}`} />
                      </h4>
                      <p
                        className={`text-[10px] sm:text-[11px] mt-0.5 leading-snug line-clamp-2 ${
                          darkMode ? 'text-slate-300' : 'text-slate-700'
                        }`}
                      >
                        {a.desc}
                      </p>

                      <div className="grid grid-cols-3 gap-1 mt-1.5">
                        {a.chips.map(({ Icon, text }) => (
                          <div
                            key={text}
                            className={`flex items-center gap-0.5 sm:gap-1 p-0.5 sm:p-1 rounded-md border ${a.theme.chip}`}
                          >
                            <Icon className={`w-3 h-3 shrink-0 ${a.theme.chipIcon}`} />
                            <span
                              className={`text-[8px] sm:text-[9px] leading-tight font-semibold truncate ${
                                darkMode ? 'text-slate-200' : 'text-slate-700'
                              }`}
                            >
                              {text}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center gap-1.5 mt-1.5">
                        {a.note ? (
                          <div
                            className={`flex-1 flex items-center gap-1 px-1.5 py-1 rounded-md text-[8px] sm:text-[9px] leading-tight font-medium truncate ${a.theme.note}`}
                          >
                            <Users className={`w-3 h-3 shrink-0 ${a.theme.chipIcon}`} />
                            <span className="truncate">{a.note}</span>
                          </div>
                        ) : (
                          <div className="flex-1" />
                        )}
                        <button
                          type="button"
                          onClick={() => handleArrow(a.id)}
                          title={a.id === 'daily' ? c.joinDaily : c.details}
                          className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full text-white flex items-center justify-center shadow shrink-0 transition active:scale-90 ${a.theme.arrow}`}
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {isExpanded && a.more && (
                    <ul
                      className={`px-3 py-2 border-t space-y-0.5 text-[10px] sm:text-[11px] ${
                        darkMode ? 'border-slate-700 text-slate-200' : 'border-white/80 text-slate-700'
                      }`}
                    >
                      {a.more.map((line) => (
                        <li key={line} className="flex gap-1.5">
                          <span className={a.theme.chipIcon}>•</span>
                          <span>{line}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>

          {/* ===== BOTTOM BANNER COMPACT ===== */}
          <div className="relative px-3 py-2 sm:px-4 sm:py-2.5 bg-gradient-to-r from-blue-700 via-blue-600 to-sky-500 text-white flex items-center justify-between gap-2">
            <div className="leading-tight">
              <div className="text-xs sm:text-sm font-bold italic">{c.bePartOf}</div>
              <div className="text-sm sm:text-base md:text-lg font-black text-amber-300 italic">
                SPEAK RIGHT 2026 ✦
              </div>
            </div>
            <div className="max-w-[48%] px-2.5 py-1.5 rounded-xl bg-white text-blue-700 text-[9px] sm:text-[10px] font-bold italic text-center shadow -rotate-1">
              {c.tagline} 🙂
            </div>
          </div>
        </div>

        {/* ===== FOOTER ACTIONS ===== */}
        <div
          className={`px-3 py-2 sm:px-4 sm:py-2 border-t flex items-center justify-between gap-2 shrink-0 ${
            darkMode ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-600'
          }`}
        >
          <label className="inline-flex items-center gap-1.5 cursor-pointer select-none text-[10px] sm:text-xs font-bold">
            <input
              type="checkbox"
              checked={hideForToday}
              onChange={(e) => setHideForToday(e.target.checked)}
              className="w-3.5 h-3.5 rounded accent-blue-600"
            />
            {c.hideToday}
          </label>
          <button
            type="button"
            onClick={handleClose}
            className={`px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl font-extrabold text-xs transition ${
              darkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-100' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            {c.close}
          </button>
        </div>
      </div>
    </div>
  );
};

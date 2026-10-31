import React, { useEffect, useState } from 'react';
import { X, Sparkles, Trophy, Film, Calendar, CheckCircle2 } from 'lucide-react';
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

export const SpeakRightEventsPopup: React.FC<SpeakRightEventsPopupProps> = ({
  lang = 'vi',
  darkMode = false,
  externalOpen = false,
  onExternalClose,
  onStartDailyChallenge,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hideForToday, setHideForToday] = useState(false);

  useEffect(() => {
    try {
      const dismissedDate = localStorage.getItem(DISMISS_TODAY_KEY);
      if (dismissedDate !== getTodayKey()) {
        setIsOpen(true);
      }
    } catch {
      setIsOpen(true);
    }
  }, []);

  useEffect(() => {
    if (externalOpen) {
      setIsOpen(true);
    }
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
    onExternalClose?.();
  };

  if (!isOpen) return null;

  const baseUrl = import.meta.env.BASE_URL || '/';

  const copy = {
    vi: {
      badge: 'Chuỗi Sự Kiện SPEAK RIGHT 2026',
      title: '3 Hoạt Động Hấp Dẫn Đang Chờ Bạn!',
      hideToday: 'Không hiển thị lại trong hôm nay',
      joinNow: 'Tham gia Daily Challenge ngay',
      close: 'Đóng',
      act1Sub: '~100 thí sinh (Offline) • Trắc nghiệm • 1 vòng Chung kết',
      act2Sub: '~3 thành viên/đội • Lồng tiếng video • 1 vòng Chung kết',
      act3Sub: 'Không giới hạn người tham gia • Tích điểm & vinh danh mỗi ngày',
    },
    en: {
      badge: 'SPEAK RIGHT 2026 Event Series',
      title: '3 Exciting Activities Await You!',
      hideToday: "Don't show again today",
      joinNow: 'Join Daily Challenge Now',
      close: 'Close',
      act1Sub: '~100 participants (Offline) • Multiple choice • 1 Final round',
      act2Sub: '~3 members/team • Dub a given video • 1 Final round',
      act3Sub: 'No limit on participants • Complete daily challenges & earn points',
    },
    ko: {
      badge: 'SPEAK RIGHT 2026 이벤트 시리즈',
      title: '3가지 특별 액티비티에 참여하세요!',
      hideToday: '오늘 하루 보지 않기',
      joinNow: '데일리 챌린지 바로 참여',
      close: '닫기',
      act1Sub: '~100명 참가 (오프라인) • 객관식 퀴즈 • 결승 1라운드',
      act2Sub: '~3인 1팀 • 영어 더빙 챌린지 • 결승 1라운드',
      act3Sub: '참가 제한 없음 • 매일 챌린지 완료 및 포인트 획득',
    },
  }[lang];

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
      onClick={handleClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-lg max-h-[92vh] flex flex-col rounded-3xl overflow-hidden shadow-2xl border transition ${
          darkMode
            ? 'bg-slate-900 border-slate-700 text-slate-100'
            : 'bg-white border-blue-200 text-slate-900'
        }`}
      >
        {/* Thanh tiêu đề trên cùng */}
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 text-white shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-7 h-7 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center shadow-sm shrink-0">
              <Sparkles className="w-4 h-4 fill-slate-950" />
            </span>
            <div className="truncate">
              <div className="text-[10px] font-black uppercase tracking-wider text-amber-200">
                {copy.badge}
              </div>
              <h3 className="text-xs sm:text-sm font-black truncate">{copy.title}</h3>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            aria-label={copy.close}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nội dung Poster + Tóm tắt nhanh có thể cuộn mượt */}
        <div className="overflow-y-auto flex-1 bg-slate-950/5">
          <div className="relative">
            <img
              src={`${baseUrl}speak-right-events-2026.jpg`}
              alt="Speak Right 2026 - 3 Exciting Activities: Ring The Golden Bell, Dub It Right, Daily Challenge"
              className="w-full h-auto block select-none"
            />
          </div>

          {/* 3 thẻ tóm tắt nhanh tương tác bên dưới poster */}
          <div
            className={`p-3.5 sm:p-4 space-y-2 border-t ${
              darkMode ? 'bg-slate-900 border-slate-800' : 'bg-blue-50/60 border-blue-100'
            }`}
          >
            <div
              className={`p-2.5 rounded-2xl border flex items-center gap-3 ${
                darkMode
                  ? 'bg-amber-950/35 border-amber-700/50 text-amber-100'
                  : 'bg-amber-50/90 border-amber-200 text-slate-900'
              }`}
            >
              <div className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center shrink-0">
                <Trophy className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-black">01 • RING THE GOLDEN BELL</div>
                <div className="text-[11px] opacity-85 truncate">{copy.act1Sub}</div>
              </div>
            </div>

            <div
              className={`p-2.5 rounded-2xl border flex items-center gap-3 ${
                darkMode
                  ? 'bg-sky-950/35 border-sky-700/50 text-sky-100'
                  : 'bg-sky-50/90 border-sky-200 text-slate-900'
              }`}
            >
              <div className="w-8 h-8 rounded-xl bg-sky-500 text-white font-black text-xs flex items-center justify-center shrink-0">
                <Film className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-black">02 • DUB IT RIGHT 🎬</div>
                <div className="text-[11px] opacity-85 truncate">{copy.act2Sub}</div>
              </div>
            </div>

            <div
              onClick={() => {
                handleClose();
                onStartDailyChallenge?.();
              }}
              className={`p-2.5 rounded-2xl border flex items-center gap-3 cursor-pointer transition ${
                darkMode
                  ? 'bg-indigo-950/45 border-indigo-500/60 hover:bg-indigo-900/50 text-indigo-100'
                  : 'bg-indigo-50/90 border-indigo-300 hover:bg-indigo-100/80 text-slate-900'
              }`}
            >
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-black">03 • DAILY CHALLENGE 📅</div>
                <div className="text-[11px] opacity-85 truncate">{copy.act3Sub}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Chân Pop-up: Tuỳ chọn ẩn hôm nay + Nút bắt đầu */}
        <div
          className={`px-4 py-3 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shrink-0 ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <label className="inline-flex items-center gap-2 cursor-pointer select-none text-xs font-bold opacity-85 hover:opacity-100">
            <input
              type="checkbox"
              checked={hideForToday}
              onChange={(e) => setHideForToday(e.target.checked)}
              className="w-4 h-4 rounded accent-blue-600"
            />
            <span>{copy.hideToday}</span>
          </label>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                handleClose();
                onStartDailyChallenge?.();
              }}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md flex items-center justify-center gap-1.5 transition"
            >
              <CheckCircle2 className="w-4 h-4" />
              {copy.joinNow}
            </button>
            <button
              type="button"
              onClick={handleClose}
              className={`px-3.5 py-2.5 rounded-xl font-bold text-xs transition ${
                darkMode
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {copy.close}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

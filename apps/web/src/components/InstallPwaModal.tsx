import React, { useEffect, useState } from 'react';
import { Download, Share, PlusSquare, X, CheckCircle2, MoreVertical } from 'lucide-react';
import { Lang } from '../utils/i18n';

interface InstallPwaModalProps {
  lang: Lang;
  darkMode: boolean;
}

const PWA_I18N = {
  vi: {
    bannerTitle: 'Thêm Speak Right 2026 ra Màn hình chính',
    bannerSub: 'Mở nhanh 1 chạm trên Điện thoại & Tablet (Không cần cài APK)',
    btnLabel: 'Hướng dẫn',
    modalTitle: 'Thêm ra Màn hình chính',
    modalSub: 'Tạo lối tắt mở nhanh kèm biểu tượng Shin-chan an toàn 100%',
    androidTitle: '🤖 Điện thoại / Tablet Android (Samsung, Xiaomi, Oppo...)',
    androidStep1:
      'Bấm vào biểu tượng Menu 3 gạch (≡ ở góc dưới phải trên Samsung Internet) hoặc 3 chấm (⋮ ở góc trên phải trên Chrome).',
    androidStep2:
      'Chọn "Thêm trang vào" (Add page to) → "Màn hình chính" (Home screen). Biểu tượng Speak Right sẽ hiện ngay ngoài màn hình!',
    iosTitle: '🍎 iPhone / iPad (Trình duyệt Safari)',
    iosStep1:
      'Bấm vào nút Chia sẻ (Share) ở thanh công cụ dưới đáy màn hình Safari.',
    iosStep2:
      'Cuộn xuống chọn "Thêm vào MH chính" (Add to Home Screen) rồi bấm "Thêm" (Add) ở góc trên phải.',
    doneBtn: 'Đã hiểu',
  },
  en: {
    bannerTitle: 'Add Speak Right 2026 to Home Screen',
    bannerSub: '1-tap quick launch on Mobile & Tablet (No APK needed)',
    btnLabel: 'How to add',
    modalTitle: 'Add to Home Screen',
    modalSub: 'Create a 100% safe quick-launch shortcut on your device',
    androidTitle: '🤖 Android Phone / Tablet (Chrome & Samsung Internet)',
    androidStep1:
      'Tap the Menu icon (≡ at bottom-right in Samsung Internet, or ⋮ at top-right in Chrome).',
    androidStep2:
      'Select "Add page to" → "Home screen" (or "Add to Home screen"). The Speak Right icon will appear on your home screen!',
    iosTitle: '🍎 iPhone / iPad (Safari Browser)',
    iosStep1: 'Tap the Share button on the bottom toolbar in Safari.',
    iosStep2: 'Scroll down and tap "Add to Home Screen", then tap "Add".',
    doneBtn: 'Got it',
  },
  ko: {
    bannerTitle: 'Speak Right 2026 홈 화면에 추가',
    bannerSub: '모바일 및 태블릿에서 원터치로 빠르게 실행하세요',
    btnLabel: '추가 방법',
    modalTitle: '홈 화면에 바로가기 추가',
    modalSub: 'APK 설치 없이 안전하게 홈 화면 아이콘을 생성합니다',
    androidTitle: '🤖 안드로이드 스마트폰 / 태블릿 (삼성 인터넷 & 크롬)',
    androidStep1:
      '브라우저 메뉴 버튼(삼성 인터넷 하단 ≡ 또는 크롬 상단 ⋮)을 누릅니다.',
    androidStep2:
      '"현재 페이지 추가" → "홈 화면"을 선택하면 바탕화면에 아이콘이 생성됩니다!',
    iosTitle: '🍎 iPhone / iPad (Safari 브라우저)',
    iosStep1: '하단 바에서 공유(Share) 버튼을 누릅니다.',
    iosStep2: '"홈 화면에 추가(Add to Home Screen)"를 선택한 후 "추가"를 누릅니다.',
    doneBtn: '확인',
  },
};

export const InstallPwaModal: React.FC<InstallPwaModalProps> = ({ lang, darkMode }) => {
  const [showGuide, setShowGuide] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const pt = PWA_I18N[lang];
  const baseUrl = import.meta.env.BASE_URL || '/';

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(standalone);
  }, []);

  if (isStandalone || dismissed) return null;

  return (
    <>
      {/* Nút/Banner hiển thị trên Điện thoại & Tablet (lg:hidden), trong suốt nhẹ để thấy nền */}
      <div
        className={`lg:hidden backdrop-blur-sm px-3.5 py-2.5 rounded-2xl shadow-md border flex items-center justify-between gap-2 mb-3.5 transition-colors ${
          darkMode
            ? 'bg-indigo-950/65 border-indigo-700/60 text-white'
            : 'bg-blue-600/75 border-white/50 text-white'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <img
            src={`${baseUrl}logo.png`}
            alt="Speak Right"
            className="w-9 h-9 object-contain shrink-0 drop-shadow-sm"
          />
          <div className="min-w-0">
            <p className="text-xs sm:text-sm font-extrabold truncate">{pt.bannerTitle}</p>
            <p className="text-[11px] text-blue-100 truncate">{pt.bannerSub}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setShowGuide(true)}
            className="bg-white/90 text-blue-700 hover:bg-white active:scale-95 transition font-extrabold text-xs px-3 py-1.5 rounded-xl shadow-sm flex items-center gap-1"
          >
            <Download className="w-3.5 h-3.5" />
            {pt.btnLabel}
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="p-1.5 text-blue-100 hover:text-white rounded-lg"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Modal hướng dẫn trực quan cho Android & iOS/iPadOS (Không sinh APK -> Không bao giờ bị Play Protect chặn) */}
      {showGuide && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 sm:p-4">
          <div
            className={`w-full max-w-md rounded-3xl p-5 sm:p-6 shadow-2xl border backdrop-blur-md ${
              darkMode
                ? 'bg-slate-900/90 border-slate-700 text-white'
                : 'bg-white/90 border-white text-slate-900'
            }`}
          >
            <div
              className={`flex items-center justify-between pb-3 border-b ${
                darkMode ? 'border-slate-800' : 'border-slate-200/70'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <img
                  src={`${baseUrl}logo.png`}
                  alt="Speak Right"
                  className="w-11 h-11 object-contain"
                />
                <div>
                  <h3 className="font-black text-base">{pt.modalTitle}</h3>
                  <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {pt.modalSub}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowGuide(false)}
                className={`p-2 rounded-full ${
                  darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-500'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 my-4 text-xs sm:text-sm">
              {/* Hướng dẫn Android */}
              <div
                className={`p-3.5 rounded-2xl border space-y-2 ${
                  darkMode
                    ? 'bg-slate-800/75 border-slate-700 text-slate-200'
                    : 'bg-blue-50/80 border-blue-200/80 text-slate-700'
                }`}
              >
                <div className="font-extrabold text-blue-500 flex items-center gap-1.5">
                  <MoreVertical className="w-4 h-4 shrink-0" />
                  <span>{pt.androidTitle}</span>
                </div>
                <p className="leading-relaxed">1. {pt.androidStep1}</p>
                <p className="leading-relaxed font-semibold">2. {pt.androidStep2}</p>

                {/* Hướng dẫn vượt qua cảnh báo Google Play Protect trên Samsung / Android 14+ */}
                <div className="mt-2.5 pt-2 border-t border-blue-200/70 dark:border-slate-700/80 text-[11px] space-y-1">
                  <div className="font-black text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <span>🛡️ Nếu Play Protect hiện "Đã chặn ứng dụng không an toàn":</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 leading-snug">
                    Chỉ cần bấm vào chữ <strong>"Tiếp tục cài đặt"</strong> (ngay trên nút "Tôi hiểu") là xong ngay an toàn 100%! Hoặc mở link bằng <strong>Google Chrome</strong> để thêm lối tắt mượt mà.
                  </p>
                </div>
              </div>

              {/* Hướng dẫn iOS / iPadOS */}
              <div
                className={`p-3.5 rounded-2xl border space-y-2 ${
                  darkMode
                    ? 'bg-slate-800/75 border-slate-700 text-slate-200'
                    : 'bg-slate-50/90 border-slate-200/80 text-slate-700'
                }`}
              >
                <div className="font-extrabold text-indigo-500 flex items-center gap-1.5">
                  <Share className="w-4 h-4 shrink-0" />
                  <span>{pt.iosTitle}</span>
                </div>
                <p className="leading-relaxed">1. {pt.iosStep1}</p>
                <p className="leading-relaxed font-semibold">
                  2. {pt.iosStep2} <PlusSquare className="w-3.5 h-3.5 inline text-blue-500 ml-0.5" />
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowGuide(false)}
              className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm shadow-lg flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              {pt.doneBtn}
            </button>
          </div>
        </div>
      )}
    </>
  );
};

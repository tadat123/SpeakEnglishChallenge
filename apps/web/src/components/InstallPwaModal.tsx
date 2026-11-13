import React, { useEffect, useState } from 'react';
import {
  Download,
  Share,
  PlusSquare,
  X,
  CheckCircle2,
  MoreVertical,
  BellRing,
  Smartphone,
} from 'lucide-react';
import { Lang } from '../utils/i18n';
import {
  getNotificationPermissionState,
  syncAndSubscribePwaPush,
  sendTestNativeNotification,
  isRunningStandalonePwa,
} from '../utils/pwaPush';

interface InstallPwaModalProps {
  lang: Lang;
  darkMode: boolean;
  user?: any;
  token?: string | null;
  onToast?: (msg: string, isError?: boolean) => void;
  forceOpenGuide?: boolean;
  onCloseGuide?: () => void;
}

const PWA_I18N = {
  vi: {
    // 1 Dòng thông báo cô đọng khi chưa thêm vào MH chính
    oneLineAddTitle: 'Thêm vào Màn hình chính để nhận thông báo bài mới & Top 1 ngoài màn hình khóa!',
    oneLineAddSub: 'Nhận thông báo bài thi mới & Bảng xếp hạng ngay cả khi tắt app (Không cần cài APK)',
    btnAddScreen: 'Thêm vào MH chính',
    btnEnablePush: 'Bật thông báo',

    // 1 Dòng thông báo khi đã thêm vào màn hình chính nhưng chưa cấp quyền thông báo
    standaloneTitle: 'Bật thông báo để nhận thông báo bài học mới & Bảng xếp hạng ngoài màn hình khóa!',
    standaloneSub: 'Thông báo sẽ hiện trực tiếp trên thanh trạng thái / màn hình khóa điện thoại của bạn',
    btnEnablePushNow: 'Bật thông báo ngay',

    // Modal hướng dẫn thêm vào màn hình chính
    modalTitle: 'Thêm vào Màn hình chính để nhận thông báo',
    modalSub: 'Chỉ mất 5 giây — Không cần tải file APK, nhận thông báo đẩy như ứng dụng gốc',
    androidTitle: '🤖 Điện thoại / Tablet Android (Samsung, Xiaomi, Oppo...)',
    androidStep1:
      'Bấm vào biểu tượng Menu 3 gạch (≡ ở góc dưới phải trên Samsung Internet) hoặc 3 chấm (⋮ ở góc trên phải trên Chrome).',
    androidStep2:
      'Chọn "Thêm trang vào" (Add page to) → "Màn hình chính" (Home screen). Biểu tượng Speak Right sẽ xuất hiện ngoài màn hình!',
    androidStep3:
      'Mở app từ Màn hình chính và bấm "Cho phép" khi được hỏi để nhận thông báo ngoài màn hình khóa!',
    iosTitle: '🍎 iPhone / iPad (Trình duyệt Safari)',
    iosStep1:
      'Bấm vào nút Chia sẻ (Share) ở thanh công cụ dưới đáy màn hình Safari.',
    iosStep2:
      'Cuộn xuống chọn "Thêm vào MH chính" (Add to Home Screen) rồi bấm "Thêm" (Add) ở góc trên phải.',
    iosStep3:
      'Mở icon Speak Right ngoài Màn hình chính và bấm "Bật thông báo" để nhận chuông báo bài mới.',
    doneBtn: 'Đã hiểu & Bật ngay',
  },
  en: {
    oneLineAddTitle: 'Add to Home Screen to get lesson alerts & Top 1 on lock screen!',
    oneLineAddSub: 'Get alerts for new lessons & rankings even when app is closed (No APK needed)',
    btnAddScreen: 'Add to Home',
    btnEnablePush: 'Enable Alerts',

    standaloneTitle: 'Enable notifications for new lessons & Top 1 rankings on lock screen!',
    standaloneSub: 'Alerts will appear directly in your device notification center',
    btnEnablePushNow: 'Enable Now',

    modalTitle: 'Add to Home Screen for Notifications',
    modalSub: 'Takes only 5 seconds — No APK download needed, works like a native app',
    androidTitle: '🤖 Android Phone / Tablet (Chrome & Samsung Internet)',
    androidStep1:
      'Tap Menu (≡ at bottom-right on Samsung Internet, or ⋮ at top-right on Chrome).',
    androidStep2:
      'Select "Add page to" → "Home screen". The Speak Right icon will appear on your home screen!',
    androidStep3:
      'Open app from Home screen and tap "Allow" to receive lock-screen notifications.',
    iosTitle: '🍎 iPhone / iPad (Safari Browser)',
    iosStep1: 'Tap the Share button on the bottom toolbar in Safari.',
    iosStep2: 'Scroll down and tap "Add to Home Screen", then tap "Add".',
    iosStep3: 'Open the icon from Home screen and tap "Enable Alerts" for lock-screen push.',
    doneBtn: 'Got it',
  },
  ko: {
    oneLineAddTitle: '홈 화면에 추가하고 잠금화면에서 새 강의 및 1위 알림을 받으세요!',
    oneLineAddSub: '앱을 닫아도 새 강의 및 랭킹 알림 수신 (APK 설치 불필요)',
    btnAddScreen: '홈 화면에 추가',
    btnEnablePush: '알림 켜기',

    standaloneTitle: '새 강의 및 1위 랭킹 알림을 잠금화면에서 받으세요!',
    standaloneSub: '기기 상태 표시줄 및 잠금화면에 바로 알림이 표시됩니다',
    btnEnablePushNow: '알림 켜기',

    modalTitle: '알림 수신을 위해 홈 화면에 추가',
    modalSub: '5초면 완료 — APK 설치 없이 안전하게 바로가기 생성',
    androidTitle: '🤖 안드로이드 스마트폰 / 태블릿 (삼성 인터넷 & 크롬)',
    androidStep1: '브라우저 메뉴 버튼(삼성 인터넷 하단 ≡ 또는 크롬 상단 ⋮)을 누릅니다.',
    androidStep2: '"현재 페이지 추가" → "홈 화면"을 선택합니다.',
    androidStep3: '홈 화면 아이콘으로 앱을 열고 "알림 허용"을 누르면 잠금화면 알림이 활성화됩니다.',
    iosTitle: '🍎 iPhone / iPad (Safari 브라우저)',
    iosStep1: '하단 바에서 공유(Share) 버튼을 누릅니다.',
    iosStep2: '"홈 화면에 추가(Add to Home Screen)"를 선택한 후 "추가"를 누릅니다.',
    iosStep3: '홈 화면 아이콘으로 앱을 열고 알림을 켜세요.',
    doneBtn: '확인',
  },
};

export const InstallPwaModal: React.FC<InstallPwaModalProps> = ({
  lang,
  darkMode,
  user,
  token,
  onToast,
  forceOpenGuide,
  onCloseGuide,
}) => {
  const [showGuide, setShowGuide] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [permission, setPermission] = useState<string>('default');
  const [isEnabling, setIsEnabling] = useState(false);

  const pt = PWA_I18N[lang];
  const baseUrl = import.meta.env.BASE_URL || '/';

  const userKey = user?.id || user?.employeeId || 'guest';
  const DISMISS_KEY = `sr_dismiss_add_screen_banner_${userKey}`;
  const FIRST_LOGIN_GUIDE_KEY = `sr_pwa_guide_seen_${userKey}`;

  useEffect(() => {
    const standalone = isRunningStandalonePwa();
    setIsStandalone(standalone);
    setPermission(getNotificationPermissionState());

    if (!token || !user?.id) return;

    if (localStorage.getItem(DISMISS_KEY) === 'true') {
      setDismissed(true);
    }

    // Tự động bật modal hướng dẫn 3 bước ngay lần đầu người dùng đăng nhập (nếu chưa cài PWA standalone)
    if (!standalone && !localStorage.getItem(FIRST_LOGIN_GUIDE_KEY)) {
      setShowGuide(true);
    }
  }, [user?.id, token]);

  useEffect(() => {
    if (forceOpenGuide) {
      setShowGuide(true);
    }
  }, [forceOpenGuide]);

  const handleCloseGuide = () => {
    setShowGuide(false);
    if (user?.id) {
      localStorage.setItem(FIRST_LOGIN_GUIDE_KEY, 'true');
    }
    onCloseGuide?.();
  };

  const handleDismiss = () => {
    setDismissed(true);
    if (user?.id) {
      localStorage.setItem(DISMISS_KEY, 'true');
    }
  };

  const handleEnablePush = async () => {
    if (!token || !user?.id) {
      onToast?.('Vui lòng đăng nhập tài khoản trước khi bật thông báo đẩy.', true);
      return;
    }
    setIsEnabling(true);
    try {
      const res = await syncAndSubscribePwaPush({
        user,
        token,
        askPermission: true,
        forcePwaFlag: true,
      });
      setPermission(res.permission);
      if (res.permission === 'granted') {
        onToast?.('🎉 Đã cấp quyền thông báo thành công! Đang gửi thông báo kiểm tra...');
        await sendTestNativeNotification();
      } else if (res.permission === 'denied') {
        onToast?.('⚠️ Bạn đã chặn quyền thông báo. Hãy vào Cài đặt trình duyệt để Cho phép lại.', true);
      }
    } catch {
      onToast?.('Lỗi kích hoạt thông báo hệ thống.', true);
    } finally {
      setIsEnabling(false);
    }
  };

  // Chỉ hiển thị cho người dùng đã đăng nhập
  if (!token || !user?.id) {
    return null;
  }

  // Ẩn banner nếu đã bấm tắt hoặc đã cài đặt PWA và cấp quyền thông báo
  const hideBanner = dismissed || (isStandalone && permission === 'granted');

  // Nếu không hiện banner và cũng không mở modal hướng dẫn thì không render gì
  if (hideBanner && !showGuide) {
    return null;
  }

  return (
    <>
      {/* ================= 1 DÒNG THÔNG BÁO THÊM VÀO MÀN HÌNH ĐỂ NHẬN THÔNG BÁO ================= */}
      {!hideBanner && (
        <div
          className={`backdrop-blur-md px-3.5 py-2.5 sm:py-3 rounded-2xl shadow-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3.5 transition-all animate-in fade-in slide-in-from-top-2 ${
            darkMode
              ? 'bg-gradient-to-r from-blue-950/85 via-indigo-950/80 to-blue-900/85 border-blue-500/40 text-white shadow-blue-950/40'
              : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white border-blue-400/50 shadow-blue-500/20'
          }`}
        >
          {/* Cụm biểu tượng & 1 Dòng thông điệp duy nhất */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0 shadow-sm border border-white/20">
              {isStandalone ? (
                <BellRing className="w-4 h-4 text-amber-300 animate-bounce" />
              ) : (
                <Smartphone className="w-4 h-4 text-amber-300" />
              )}
            </div>
            <div className="min-w-0">
              <span className="text-xs sm:text-sm font-black leading-snug">
                {isStandalone ? pt.standaloneTitle : pt.oneLineAddTitle}
              </span>
            </div>
          </div>

          {/* Các nút hành động ngay trên dòng */}
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            {!isStandalone && (
              <button
                type="button"
                onClick={() => setShowGuide(true)}
                className="px-3 py-1.5 rounded-xl bg-white text-blue-700 hover:bg-blue-50 active:scale-95 transition font-black text-xs shadow-sm flex items-center gap-1.5 shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                {pt.btnAddScreen}
              </button>
            )}

            {permission !== 'granted' && (
              <button
                type="button"
                onClick={handleEnablePush}
                disabled={isEnabling}
                className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 active:scale-95 transition font-black text-xs shadow-sm flex items-center gap-1.5 shrink-0 disabled:opacity-60"
              >
                <BellRing className="w-3.5 h-3.5" />
                {isEnabling ? 'Đang bật...' : isStandalone ? pt.btnEnablePushNow : pt.btnEnablePush}
              </button>
            )}

            <button
              type="button"
              onClick={handleDismiss}
              className="p-1.5 text-blue-100 hover:text-white hover:bg-white/10 rounded-lg transition"
              title="Đóng thông báo"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ================= MODAL HƯỚNG DẪN 3 BƯỚC THÊM RA MÀN HÌNH CHÍNH ================= */}
      {showGuide && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 sm:p-4">
          <div
            className={`w-full max-w-md rounded-3xl p-5 sm:p-6 shadow-2xl border backdrop-blur-md ${
              darkMode
                ? 'bg-slate-900/95 border-slate-700 text-white'
                : 'bg-white/95 border-white text-slate-900'
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
                  <h3 className="font-black text-base leading-tight">{pt.modalTitle}</h3>
                  <p className={`text-xs mt-0.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {pt.modalSub}
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseGuide}
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
                <p className="leading-relaxed text-emerald-600 dark:text-emerald-400 font-bold">
                  3. {pt.androidStep3}
                </p>
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
                <p className="leading-relaxed text-emerald-600 dark:text-emerald-400 font-bold">
                  3. {pt.iosStep3}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={async () => {
                  handleCloseGuide();
                  await handleEnablePush();
                }}
                className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs sm:text-sm shadow-lg flex items-center justify-center gap-2 transition"
              >
                <CheckCircle2 className="w-4 h-4" />
                {pt.doneBtn}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

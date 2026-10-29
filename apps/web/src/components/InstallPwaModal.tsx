import React, { useEffect, useState } from 'react';
import { Download, Share, PlusSquare, Smartphone, X, CheckCircle2 } from 'lucide-react';

export const InstallPwaModal: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(standalone);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (isStandalone || dismissed) return null;

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
    } else {
      setShowIosGuide(true);
    }
  };

  return (
    <>
      {/* Nút/Banner cài đặt nổi gọn gàng trên Điện thoại & Tablet */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 text-white px-3.5 py-2.5 rounded-2xl shadow-md flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <Smartphone className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-xs sm:text-sm font-bold truncate">Cài đặt App Speak Right 2026</p>
            <p className="text-[11px] text-blue-100 truncate">
              Mở nhanh từ màn hình chính ĐT & Tablet
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleInstallClick}
            className="bg-white text-blue-700 hover:bg-blue-50 active:scale-95 transition font-bold text-xs px-3 py-2 rounded-xl shadow-sm flex items-center gap-1"
          >
            <Download className="w-3.5 h-3.5" />
            Cài đặt
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="p-1.5 text-blue-100 hover:text-white rounded-lg"
            aria-label="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Modal hướng dẫn 4 bước cho iPhone / iPad (Safari) & Android */}
      {showIosGuide && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 sm:p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-5 sm:p-6 shadow-2xl animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  📲
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    Cài đặt App ra Màn hình chính
                  </h3>
                  <p className="text-xs text-slate-500">Dành cho iPhone, iPad & Điện thoại Android</p>
                </div>
              </div>
              <button
                onClick={() => setShowIosGuide(false)}
                className="p-2 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 my-4 text-sm text-slate-700">
              <div className="flex items-start gap-3 bg-slate-50 p-3 rounded-2xl">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  1
                </span>
                <p>
                  Mở đường dẫn này bằng trình duyệt <strong>Safari</strong> (trên iPhone/iPad) hoặc{' '}
                  <strong>Chrome</strong> (trên Android).
                </p>
              </div>

              <div className="flex items-start gap-3 bg-slate-50 p-3 rounded-2xl">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  2
                </span>
                <p className="flex-1">
                  Bấm vào biểu tượng <strong>Chia sẻ (Share)</strong>{' '}
                  <Share className="w-4 h-4 inline text-blue-600 mx-0.5" /> ở thanh công cụ dưới đáy
                  màn hình (hoặc menu 3 chấm trên Chrome).
                </p>
              </div>

              <div className="flex items-start gap-3 bg-slate-50 p-3 rounded-2xl">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  3
                </span>
                <p className="flex-1">
                  Cuộn xuống chọn{' '}
                  <strong className="text-blue-700">
                    "Thêm vào MH chính" (Add to Home Screen)
                  </strong>{' '}
                  <PlusSquare className="w-4 h-4 inline text-blue-600 mx-0.5" /> rồi bấm{' '}
                  <strong>Thêm</strong>.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowIosGuide(false)}
              className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              Đã hiểu
            </button>
          </div>
        </div>
      )}
    </>
  );
};

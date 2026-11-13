import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  KeyRound,
  Trash2,
  X,
} from 'lucide-react';

export type DialogVariant = 'danger' | 'warning' | 'primary' | 'info';

export interface ConfirmDialogOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: DialogVariant;
}

export interface PromptDialogOptions extends ConfirmDialogOptions {
  defaultValue?: string;
  placeholder?: string;
  inputType?: 'text' | 'password';
}

export interface AlertDialogOptions {
  title: string;
  message: string;
  confirmText?: string;
  variant?: DialogVariant;
}

type ActiveDialogRequest =
  | {
      kind: 'confirm';
      options: ConfirmDialogOptions;
      resolve: (value: boolean) => void;
    }
  | {
      kind: 'prompt';
      options: PromptDialogOptions;
      resolve: (value: string | null) => void;
    }
  | {
      kind: 'alert';
      options: AlertDialogOptions;
      resolve: () => void;
    };

type DialogEnqueuer = (req: ActiveDialogRequest) => void;
let registeredEnqueuer: DialogEnqueuer | null = null;

/**
 * Cầu nối gọi dialog xác nhận / nhập liệu / thông báo thay thế toàn bộ window.confirm, prompt, alert mặc định.
 */
export const appDialog = {
  confirm(options: ConfirmDialogOptions): Promise<boolean> {
    if (!registeredEnqueuer) {
      return Promise.resolve(window.confirm(options.message));
    }
    return new Promise<boolean>((resolve) => {
      registeredEnqueuer?.({ kind: 'confirm', options, resolve });
    });
  },
  prompt(options: PromptDialogOptions): Promise<string | null> {
    if (!registeredEnqueuer) {
      return Promise.resolve(window.prompt(options.message, options.defaultValue));
    }
    return new Promise<string | null>((resolve) => {
      registeredEnqueuer?.({ kind: 'prompt', options, resolve });
    });
  },
  alert(options: AlertDialogOptions): Promise<void> {
    if (!registeredEnqueuer) {
      window.alert(options.message);
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      registeredEnqueuer?.({ kind: 'alert', options, resolve });
    });
  },
};

const getVariantTheme = (variant: DialogVariant = 'primary', kind: ActiveDialogRequest['kind']) => {
  switch (variant) {
    case 'danger':
      return {
        iconBg: 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400',
        confirmBtn: 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm shadow-rose-500/20',
        Icon: Trash2,
      };
    case 'warning':
      return {
        iconBg: 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400',
        confirmBtn: 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm shadow-amber-500/20',
        Icon: AlertTriangle,
      };
    case 'info':
      return {
        iconBg: 'bg-sky-500/10 border-sky-500/20 text-sky-600 dark:text-sky-400',
        confirmBtn: 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/20',
        Icon: Info,
      };
    case 'primary':
    default:
      return {
        iconBg: 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400',
        confirmBtn: 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/20',
        Icon: kind === 'prompt' ? KeyRound : CheckCircle2,
      };
  }
};

export const AppDialogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [queue, setQueue] = useState<ActiveDialogRequest[]>([]);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const confirmBtnRef = useRef<HTMLButtonElement | null>(null);

  const current = queue[0] || null;

  const enqueue = useCallback((req: ActiveDialogRequest) => {
    setQueue((prev) => [...prev, req]);
  }, []);

  useEffect(() => {
    registeredEnqueuer = enqueue;
    return () => {
      if (registeredEnqueuer === enqueue) {
        registeredEnqueuer = null;
      }
    };
  }, [enqueue]);

  useEffect(() => {
    if (!current) return;
    if (current.kind === 'prompt') {
      setInputValue(current.options.defaultValue ?? '');
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 20);
    } else {
      setTimeout(() => {
        confirmBtnRef.current?.focus();
      }, 20);
    }
  }, [current]);

  const closeCurrent = useCallback(
    (confirmed: boolean) => {
      if (!current) return;
      if (current.kind === 'confirm') {
        current.resolve(confirmed);
      } else if (current.kind === 'prompt') {
        current.resolve(confirmed ? inputValue.trim() || null : null);
      } else {
        current.resolve();
      }
      setQueue((prev) => prev.slice(1));
    },
    [current, inputValue]
  );

  useEffect(() => {
    if (!current) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeCurrent(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [current, closeCurrent]);

  const theme = current ? getVariantTheme(current.options.variant, current.kind) : null;
  const IconComp = theme?.Icon || AlertCircle;

  return (
    <>
      {children}
      {current && theme && (
        <div
          className="fixed inset-0 z-[9999] bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => closeCurrent(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="app-dialog-title"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xl overflow-hidden"
          >
            <div className="p-5 sm:p-6 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3.5">
                  <div
                    className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${theme.iconBg}`}
                  >
                    <IconComp className="w-5 h-5" />
                  </div>
                  <div className="space-y-1 pt-0.5">
                    <h3
                      id="app-dialog-title"
                      className="text-base font-black tracking-tight text-slate-900 dark:text-white leading-snug"
                    >
                      {current.options.title}
                    </h3>
                    <p className="text-xs sm:text-[13px] text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                      {current.options.message}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => closeCurrent(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition shrink-0"
                  aria-label="Đóng"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {current.kind === 'prompt' && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    closeCurrent(true);
                  }}
                >
                  <input
                    ref={inputRef}
                    type={current.options.inputType || 'text'}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={current.options.placeholder || ''}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/90 text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition"
                  />
                </form>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                {current.kind !== 'alert' && (
                  <button
                    type="button"
                    onClick={() => closeCurrent(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition"
                  >
                    {current.options.cancelText || 'Hủy'}
                  </button>
                )}
                <button
                  ref={confirmBtnRef}
                  type="button"
                  onClick={() => closeCurrent(true)}
                  disabled={current.kind === 'prompt' && !inputValue.trim()}
                  className={`px-4 py-2 rounded-xl font-extrabold text-xs transition active:scale-[0.98] disabled:opacity-50 ${theme.confirmBtn}`}
                >
                  {current.options.confirmText ||
                    (current.kind === 'alert' ? 'Đã hiểu' : 'Xác nhận')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

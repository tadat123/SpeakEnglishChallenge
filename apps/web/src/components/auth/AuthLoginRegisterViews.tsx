import React from 'react';
import { Eye, EyeOff, Hash, Loader2, Lock, Mail, ShieldAlert, User } from 'lucide-react';
import { PasswordCriteria } from '../../utils/validation';
import { Lang, TRANSLATIONS } from '../../utils/i18n';
import { PasswordStrengthMeter } from './PasswordStrengthMeter';

interface AuthLoginRegisterViewsProps {
  mode: 'login' | 'register';
  setMode: (mode: 'login' | 'register' | 'forgot' | 'enter_otp' | 'reset') => void;
  lang: Lang;
  darkMode: boolean;
  t: (typeof TRANSLATIONS)[Lang];
  labelClass: string;
  inputClass: string;
  employeeId: string;
  handleGenInput: (val: string) => void;
  fullName: string;
  setFullName: (val: string) => void;
  email: string;
  setEmail: (val: string) => void;
  password: string;
  setPassword: (val: string) => void;
  showPassword: boolean;
  setShowPassword: (val: boolean) => void;
  hasSamsungWarning: boolean;
  pwdCriteria: PasswordCriteria;
  loading: boolean;
  setErrorMsg: (msg: string) => void;
  setSuccessMsg: (msg: string) => void;
  handleLogin: (e: React.FormEvent) => void;
  handleRegister: (e: React.FormEvent) => void;
}

export const AuthLoginRegisterViews: React.FC<AuthLoginRegisterViewsProps> = ({
  mode,
  setMode,
  lang,
  darkMode,
  t,
  labelClass,
  inputClass,
  employeeId,
  handleGenInput,
  fullName,
  setFullName,
  email,
  setEmail,
  password,
  setPassword,
  showPassword,
  setShowPassword,
  hasSamsungWarning,
  pwdCriteria,
  loading,
  setErrorMsg,
  setSuccessMsg,
  handleLogin,
  handleRegister,
}) => {
  if (mode === 'login') {
    return (
      <form onSubmit={handleLogin} className="space-y-3.5">
        <div>
          <label className={labelClass}>{t.genLabel}</label>
          <div className="relative">
            <Hash className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              inputMode="numeric"
              value={employeeId}
              onChange={(e) => handleGenInput(e.target.value)}
              placeholder="20261234"
              className={`${inputClass} pl-10 pr-16 font-bold tracking-wider`}
            />
            <span
              className={`absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold px-2 py-0.5 rounded-lg ${
                employeeId.length === 8
                  ? 'bg-emerald-100 text-emerald-700'
                  : darkMode
                  ? 'bg-slate-700 text-slate-300'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              {employeeId.length}/8
            </span>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className={`text-xs font-extrabold ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
              {t.passwordLabel}
            </label>
            <button
              type="button"
              onClick={() => {
                setMode('forgot');
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className="text-xs font-bold text-blue-600 hover:underline"
            >
              {t.forgotPassword}
            </button>
          </div>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={`${inputClass} pl-10 pr-10`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-extrabold text-sm shadow-lg shadow-blue-600/25 transition flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{t.loggingIn}</span>
            </>
          ) : (
            t.loginBtn
          )}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleRegister} className="space-y-3.5">
      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <label className={labelClass}>{t.genLabel} *</label>
          <div className="relative">
            <Hash className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              inputMode="numeric"
              value={employeeId}
              onChange={(e) => handleGenInput(e.target.value)}
              placeholder="20268888"
              className={`${inputClass} pl-8 pr-11 font-bold`}
            />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
              {employeeId.length}/8
            </span>
          </div>
        </div>

        <div>
          <label className={labelClass}>{t.fullNameLabel} *</label>
          <div className="relative">
            <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nguyễn Văn A"
              className={`${inputClass} pl-8 pr-2.5`}
            />
          </div>
        </div>
      </div>

      <div>
        <label className={labelClass}>{t.emailLabel} *</label>
        <div className="relative">
          <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tenban@gmail.com"
            className={
              hasSamsungWarning
                ? 'w-full pl-10 pr-3 py-2.5 rounded-2xl border border-red-500 bg-red-50 text-red-900 outline-none text-sm'
                : `${inputClass} pl-10 pr-3`
            }
          />
        </div>
        {hasSamsungWarning && (
          <div className="mt-2 p-2.5 rounded-xl bg-red-50 border border-red-200 text-xs font-bold text-red-600 flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{t.samsungWarning}</span>
          </div>
        )}
      </div>

      <div>
        <label className={labelClass}>{t.passwordLabel} *</label>
        <div className="relative">
          <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Speak@2026"
            className={`${inputClass} pl-10 pr-10`}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        <PasswordStrengthMeter criteria={pwdCriteria} lang={lang} darkMode={darkMode} />
      </div>

      {!hasSamsungWarning && (
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{t.registerBtn}...</span>
            </>
          ) : (
            t.registerBtn
          )}
        </button>
      )}
    </form>
  );
};

import React, { useEffect, useState } from 'react';
import {
  ShieldAlert,
  Lock,
  Mail,
  Hash,
  User,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  KeyRound,
  ArrowLeft,
  Sparkles,
  ExternalLink,
  Copy,
  Zap,
  Sun,
  Moon,
} from 'lucide-react';
import {
  checkPasswordStrength,
  isSamsungDomain,
  validateGenId,
  validatePersonalGmail,
} from '../utils/validation';
import { Lang, TRANSLATIONS } from '../utils/i18n';
import { ResponsiveBackground } from './LayoutDecor';

interface AuthScreenProps {
  onAuthSuccess: (token: string, user: any) => void;
  lang: Lang;
  onChangeLang: (l: Lang) => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  onAuthSuccess,
  lang,
  onChangeLang,
  darkMode,
  onToggleDarkMode,
}) => {
  const t = TRANSLATIONS[lang];
  const [mode, setMode] = useState<'login' | 'register' | 'forgot' | 'reset'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [employeeId, setEmployeeId] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [otpOrToken, setOtpOrToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [demoEmailBox, setDemoEmailBox] = useState<{
    otpCode: string;
    resetToken: string;
    resetLink: string;
  } | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get('resetToken');
    const emailFromUrl = params.get('email');
    if (tokenFromUrl && emailFromUrl) {
      setEmail(emailFromUrl);
      setOtpOrToken(tokenFromUrl);
      setMode('reset');
      setSuccessMsg('Đã xác thực liên kết từ Email! Hãy nhập mật khẩu mới.');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleGenInput = (value: string) => {
    setEmployeeId(value.replace(/\D/g, '').slice(0, 8));
  };

  const pwdCriteria = checkPasswordStrength(mode === 'reset' ? newPassword : password);
  const hasSamsungWarning = isSamsungDomain(email);

  const performLogin = async (idToUse: string, passToUse: string) => {
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: idToUse, password: passToUse }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Đăng nhập thất bại');
      onAuthSuccess(data.accessToken, data.user);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const identifier = employeeId || email;
    if (!identifier) {
      setErrorMsg('Vui lòng nhập Số GEN (8 chữ số)');
      return;
    }
    await performLogin(identifier, password);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const genCheck = validateGenId(employeeId);
    if (!genCheck.valid) return setErrorMsg(genCheck.message);

    const mailCheck = validatePersonalGmail(email);
    if (!mailCheck.valid) return setErrorMsg(mailCheck.message);

    if (!pwdCriteria.isValid) {
      return setErrorMsg('Mật khẩu cần đủ 8 ký tự: Chữ HOA, thường, số và ký tự đặc biệt!');
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId, fullName, email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Đăng ký thất bại');
      onAuthSuccess(data.accessToken, data.user);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setDemoEmailBox(null);

    const mailCheck = validatePersonalGmail(email);
    if (!mailCheck.valid) return setErrorMsg(mailCheck.message);

    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          employeeId: employeeId.length === 8 ? employeeId : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Không thể gửi yêu cầu');

      setSuccessMsg(data.message);
      if (data.demoEmailPreview) {
        setDemoEmailBox({
          otpCode: data.demoEmailPreview.otpCode,
          resetToken: data.demoEmailPreview.resetToken,
          resetLink: data.demoEmailPreview.resetLink,
        });
      }
      setMode('reset');
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!otpOrToken.trim()) {
      return setErrorMsg('Vui lòng nhập Mã OTP 6 số hoặc bấm nút từ trong Email');
    }
    if (!pwdCriteria.isValid) {
      return setErrorMsg('Mật khẩu mới cần đủ chữ HOA, thường, số và ký tự đặc biệt');
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otpOrToken, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Đặt lại mật khẩu thất bại');

      setSuccessMsg(data.message);
      setPassword(newPassword);
      setDemoEmailBox(null);
      setMode('login');
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const labelClass = `block text-xs font-extrabold mb-1 ${darkMode ? 'text-slate-200' : 'text-slate-700'}`;
  const inputClass = `w-full py-2.5 rounded-2xl border outline-none text-sm transition ${
    darkMode
      ? 'border-slate-700 bg-slate-800 text-white focus:border-blue-500'
      : 'border-slate-200 bg-white text-slate-900 focus:border-blue-600'
  }`;

  return (
    <div className="min-h-screen flex flex-col justify-between relative">
      <ResponsiveBackground darkMode={darkMode} />

      {/* Thanh chọn Ngôn ngữ (VI / EN / KO) & Sáng/Tối ở góc trên */}
      <div className="w-full max-w-5xl mx-auto flex items-center justify-end gap-2 p-3 sm:px-6">
        <div
          className={`backdrop-blur-md p-1 rounded-xl flex items-center gap-1 border shadow-sm ${
            darkMode ? 'bg-slate-900/90 border-slate-700' : 'bg-white/95 border-sky-200'
          }`}
        >
          {(['vi', 'en', 'ko'] as Lang[]).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => onChangeLang(l)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold uppercase transition ${
                lang === l
                  ? 'bg-blue-600 text-white shadow-sm'
                  : darkMode
                  ? 'text-slate-300 hover:text-white'
                  : 'text-slate-700 hover:text-blue-600'
              }`}
            >
              {l === 'vi' ? '🇻🇳 VI' : l === 'en' ? '🇬🇧 EN' : '🇰🇷 KO'}
            </button>
          ))}
        </div>

        <div
          className={`backdrop-blur-md p-1 rounded-xl flex items-center gap-1 border shadow-sm ${
            darkMode ? 'bg-slate-900/90 border-slate-700' : 'bg-white/95 border-sky-200'
          }`}
        >
          <button
            type="button"
            onClick={() => darkMode && onToggleDarkMode()}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold flex items-center gap-1 transition ${
              !darkMode
                ? 'bg-amber-400 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sun className="w-3.5 h-3.5" /> Sáng
          </button>
          <button
            type="button"
            onClick={() => !darkMode && onToggleDarkMode()}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold flex items-center gap-1 transition ${
              darkMode
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Moon className="w-3.5 h-3.5" /> Tối
          </button>
        </div>
      </div>

      {/* Khung Card Đăng nhập */}
      <div className="w-full max-w-md mx-auto px-3 py-6 my-auto">
        <div
          className={`backdrop-blur-md rounded-3xl shadow-2xl overflow-hidden border ${
            darkMode ? 'bg-slate-900/95 border-slate-800' : 'bg-white/95 border-sky-100'
          }`}
        >
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white p-4 sm:p-5 text-center">
            <img
              src={`${import.meta.env.BASE_URL || '/'}logo.png`}
              alt="Speak Right 2026 Logo"
              className="w-24 h-24 sm:w-28 sm:h-28 mx-auto object-contain drop-shadow-lg -mt-1 mb-1"
            />
            <div className="inline-flex items-center gap-1.5 bg-white/20 px-3 py-1 rounded-full text-xs font-extrabold mb-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              30 DAYS PRONUNCIATION
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">SPEAK RIGHT 2026</h1>
          </div>

          <div className="p-5 sm:p-6">
            {(mode === 'login' || mode === 'register') && (
              <div
                className={`grid grid-cols-2 p-1 rounded-2xl mb-4 ${
                  darkMode ? 'bg-slate-800' : 'bg-slate-100'
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMsg('');
                  }}
                  className={`py-2.5 text-xs sm:text-sm font-extrabold rounded-xl transition ${
                    mode === 'login'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : darkMode
                      ? 'text-slate-300'
                      : 'text-slate-600'
                  }`}
                >
                  {t.loginTab}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setErrorMsg('');
                  }}
                  className={`py-2.5 text-xs sm:text-sm font-extrabold rounded-xl transition ${
                    mode === 'register'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : darkMode
                      ? 'text-slate-300'
                      : 'text-slate-600'
                  }`}
                >
                  {t.registerTab}
                </button>
              </div>
            )}

            {errorMsg && (
              <div className="mb-3 p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="mb-3 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* ================= 1. ĐĂNG NHẬP ================= */}
            {mode === 'login' && (
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
                  className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-extrabold text-sm shadow-lg shadow-blue-600/25 transition"
                >
                  {loading ? t.loggingIn : t.loginBtn}
                </button>

                <div className={`pt-3 border-t ${darkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                  <p className="text-[11px] font-bold text-slate-400 mb-2 flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-amber-500" /> {t.quickDemo}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => performLogin('20261234', 'Speak@2026')}
                      className={`p-2.5 rounded-2xl border text-left transition active:scale-95 ${
                        darkMode
                          ? 'border-blue-800 bg-blue-950/50 hover:bg-blue-900/60'
                          : 'border-blue-200 bg-blue-50/90 hover:bg-blue-100'
                      }`}
                    >
                      <div className={`text-xs font-extrabold ${darkMode ? 'text-blue-300' : 'text-blue-800'}`}>
                        👩‍💼 Nguyễn Thị Thảo
                      </div>
                      <div className={`text-[10px] ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                        GEN 20261234
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => performLogin('88888888', 'Admin@2026')}
                      className={`p-2.5 rounded-2xl border text-left transition active:scale-95 ${
                        darkMode
                          ? 'border-indigo-800 bg-indigo-950/50 hover:bg-indigo-900/60'
                          : 'border-indigo-200 bg-indigo-50/90 hover:bg-indigo-100'
                      }`}
                    >
                      <div className={`text-xs font-extrabold ${darkMode ? 'text-indigo-300' : 'text-indigo-800'}`}>
                        🛡️ Admin CMS
                      </div>
                      <div className={`text-[10px] ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
                        GEN 88888888
                      </div>
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* ================= 2. ĐĂNG KÝ ================= */}
            {mode === 'register' && (
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

                  <div
                    className={`grid grid-cols-2 gap-1 mt-2 p-2.5 rounded-2xl text-[11px] ${
                      darkMode ? 'bg-slate-800/80' : 'bg-slate-50'
                    }`}
                  >
                    <span className={pwdCriteria.minLength ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                      ✓ 8+ chars
                    </span>
                    <span
                      className={
                        pwdCriteria.hasUpper && pwdCriteria.hasLower
                          ? 'text-emerald-600 font-bold'
                          : 'text-slate-400'
                      }
                    >
                      ✓ A-Z & a-z
                    </span>
                    <span className={pwdCriteria.hasNumber ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                      ✓ 0-9
                    </span>
                    <span className={pwdCriteria.hasSpecial ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                      ✓ !@#$...
                    </span>
                  </div>
                </div>

                {!hasSamsungWarning && (
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm shadow-lg transition disabled:opacity-50"
                  >
                    {loading ? '...' : t.registerBtn}
                  </button>
                )}
              </form>
            )}

            {/* ================= 3. QUÊN MẬT KHẨU ================= */}
            {mode === 'forgot' && (
              <form onSubmit={handleForgotPassword} className="space-y-3.5">
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-blue-600"
                >
                  <ArrowLeft className="w-4 h-4" /> {t.backBtn}
                </button>

                <div>
                  <h2 className={`text-base font-extrabold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    {t.recoverTitle}
                  </h2>
                  <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{t.recoverDesc}</p>
                </div>

                <div>
                  <label className={labelClass}>{t.emailLabel} *</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="thaonguyen.work@gmail.com"
                      className={
                        hasSamsungWarning
                          ? 'w-full pl-10 pr-3 py-2.5 rounded-2xl border border-red-500 bg-red-50 text-red-900 outline-none text-sm'
                          : `${inputClass} pl-10 pr-3`
                      }
                    />
                  </div>
                  {hasSamsungWarning && (
                    <p className="mt-1.5 text-xs font-bold text-red-600">{t.samsungWarning}</p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setEmail('thaonguyen.work@gmail.com')}
                  className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-xl"
                >
                  + thaonguyen.work@gmail.com
                </button>

                {!hasSamsungWarning && (
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm shadow-lg transition"
                  >
                    {loading ? '...' : t.sendOtpBtn}
                  </button>
                )}
              </form>
            )}

            {/* ================= 4. ĐẶT LẠI MẬT KHẨU (EMAIL LUÔN BẰNG TIẾNG VIỆT) ================= */}
            {mode === 'reset' && (
              <form onSubmit={handleResetPassword} className="space-y-3.5">
                <button
                  type="button"
                  onClick={() => setMode('forgot')}
                  className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-blue-600"
                >
                  <ArrowLeft className="w-4 h-4" /> {t.backBtn}
                </button>

                {demoEmailBox && (
                  <div
                    className={`border rounded-2xl p-3 space-y-2 ${
                      darkMode ? 'bg-slate-800 border-slate-700' : 'bg-blue-50 border-blue-200'
                    }`}
                  >
                    <div className={`text-xs font-extrabold ${darkMode ? 'text-blue-300' : 'text-blue-900'}`}>
                      📩 Email tiếng Việt vừa gửi tới {email}:
                    </div>
                    <div
                      className={`rounded-xl p-2.5 border flex items-center justify-between gap-2 ${
                        darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-blue-100'
                      }`}
                    >
                      <div>
                        <div className="text-[10px] text-slate-400">Mã xác thực OTP:</div>
                        <div className="text-lg font-black tracking-widest text-blue-600">
                          {demoEmailBox.otpCode}
                        </div>
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => setOtpOrToken(demoEmailBox.otpCode)}
                          className={`text-xs font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1 ${
                            darkMode ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          <Copy className="w-3.5 h-3.5" /> Điền OTP
                        </button>
                        <button
                          type="button"
                          onClick={() => setOtpOrToken(demoEmailBox.resetToken)}
                          className="text-xs font-bold bg-blue-600 text-white px-2.5 py-1.5 rounded-lg flex items-center gap-1"
                        >
                          <ExternalLink className="w-3.5 h-3.5" /> Nút trong Mail
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className={labelClass}>Mã OTP (6 số) / Token *</label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={otpOrToken}
                      onChange={(e) => setOtpOrToken(e.target.value)}
                      placeholder="Nhập 6 số OTP..."
                      className={`${inputClass} pl-10 pr-3 font-bold`}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>{t.passwordLabel} *</label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Speak@2026"
                    className={`${inputClass} px-3.5`}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm shadow-lg transition"
                >
                  {t.saveNewPassBtn}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

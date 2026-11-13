import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Sparkles,
  Sun,
  Moon,
} from 'lucide-react';
import {
  checkPasswordStrength,
  isSamsungDomain,
  validateGenId,
  validatePersonalGmail,
  extractResetPasswordParams,
} from '../utils/validation';
import { Lang, TRANSLATIONS } from '../utils/i18n';
import { ResponsiveBackground } from './LayoutDecor';
import { AuthLoginRegisterViews } from './auth/AuthLoginRegisterViews';
import { AuthRecoveryViews } from './auth/AuthRecoveryViews';

interface AuthScreenProps {
  onAuthSuccess: (token: string, user: any) => void;
  lang: Lang;
  onChangeLang: (l: Lang) => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  /** Cho phép quay lại Trang chủ khi mở từ trong app */
  onClose?: () => void;
  /** Cho phép vào làm bài hôm nay / xem bảng xếp hạng mà không cần đăng nhập */
  onGuestMode?: (target: 'home' | 'leaderboard') => void;
  /** Chế độ mở mặc định (Đăng nhập hoặc Tạo tài khoản hoặc Đặt lại mật khẩu) */
  initialMode?: 'login' | 'register' | 'forgot' | 'enter_otp' | 'reset';
  initialEmail?: string;
  initialToken?: string;
  /** Thông báo hiển thị phía trên form (VD: bài làm của khách đang chờ được lưu) */
  guestNotice?: string | null;
  /** Tổng số ngày thử thách do Admin cấu hình */
  totalDays?: number;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  onAuthSuccess,
  lang,
  onChangeLang,
  darkMode,
  onToggleDarkMode,
  onClose,
  onGuestMode,
  initialMode = 'login',
  initialEmail = '',
  initialToken = '',
  guestNotice,
  totalDays = 0,
}) => {
  const t = TRANSLATIONS[lang];
  const L = (vi: string, en: string, ko: string) => (lang === 'en' ? en : lang === 'ko' ? ko : vi);
  const [mode, setMode] = useState<'login' | 'register' | 'forgot' | 'enter_otp' | 'reset'>(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [employeeId, setEmployeeId] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');

  const [otpOrToken, setOtpOrToken] = useState(initialToken);
  const [isMagicLinkVerified, setIsMagicLinkVerified] = useState<boolean>(
    () => Boolean(initialToken && initialToken.length > 6)
  );
  const [otpCountdown, setOtpCountdown] = useState<number>(0);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [demoEmailBox, setDemoEmailBox] = useState<{
    otpCode: string;
    resetToken: string;
    resetLink: string;
  } | null>(null);

  useEffect(() => {
    if (otpCountdown <= 0) return;
    const timer = setInterval(() => {
      setOtpCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [otpCountdown]);

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    const { resetToken, email: emailFromUrl } = extractResetPasswordParams();
    const tokenToUse = resetToken || initialToken;
    const emailToUse = emailFromUrl || initialEmail;

    if (tokenToUse && emailToUse) {
      setEmail(emailToUse);
      setOtpOrToken(tokenToUse);
      setIsMagicLinkVerified(tokenToUse.length > 6);
      setMode('reset'); // Bấm "Xác thực từ link" -> Cửa sổ thay đổi mật khẩu luôn!
      setOtpCountdown(15 * 60); // 15 phút
      setSuccessMsg(
        L(
          'Đã xác thực thành công từ Liên kết Email! Hãy nhập mật khẩu mới và xác nhận mật khẩu.',
          'Email link verified successfully! Please enter and confirm your new password.',
          '이메일 링크로 성공적으로 인증되었습니다! 새 비밀번호와 확인 비밀번호를 입력해주세요.'
        )
      );
      // Dọn dẹp params khỏi thanh địa chỉ để an toàn bảo mật và chống reload / back
      const cleanPath =
        window.location.pathname +
        (window.location.hash.startsWith('#') ? window.location.hash.split('?')[0] : '');
      window.history.replaceState({}, document.title, cleanPath);
    }
  }, [initialToken, initialEmail]);

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
      if (!res.ok) throw new Error(data.message || L('Đăng nhập thất bại', 'Login failed', '로그인 실패'));
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
      setErrorMsg(L('Vui lòng nhập Số GEN (8 chữ số)', 'Please enter GEN ID (8 digits)', '사번 GEN (8자리)을 입력해주세요'));
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
      return setErrorMsg(L('Mật khẩu cần đủ 8 ký tự: Chữ HOA, thường, số và ký tự đặc biệt!', 'Password must be 8+ chars with uppercase, lowercase, number and special char!', '비밀번호는 대소문자, 숫자, 특수문자를 포함한 8자 이상이어야 합니다!'));
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

  const handleForgotPassword = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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
          theme: darkMode ? 'dark' : 'light',
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
      setOtpOrToken('');
      setIsMagicLinkVerified(false);
      setOtpCountdown(15 * 60); // 15 phút
      setMode('enter_otp'); // Khi có mail -> Chuyển sang ô nhập mã trước
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanOtp = otpOrToken.trim();
    if (!cleanOtp) {
      return setErrorMsg(
        L(
          'Vui lòng nhập mã xác thực OTP 6 số từ Email của bạn!',
          'Please enter the 6-digit OTP code from your email!',
          '이메일로 전송된 6자리 OTP 인증 코드를 입력해주세요!'
        )
      );
    }
    if (cleanOtp.length !== 6 || !/^\d{6}$/.test(cleanOtp)) {
      return setErrorMsg(
        L(
          'Mã OTP không hợp lệ. Vui lòng nhập đúng 6 chữ số!',
          'Invalid OTP code. Please enter exactly 6 digits!',
          '유효하지 않은 OTP입니다. 정확히 6자리 숫자를 입력해주세요!'
        )
      );
    }

    if (otpCountdown <= 0) {
      return setErrorMsg(
        L(
          'Mã xác thực OTP đã hết hạn (quá 15 phút). Vui lòng bấm "Gửi lại mã OTP" để lấy mã mới!',
          'OTP code has expired (over 15 minutes). Please click "Resend OTP" to get a new code!',
          'OTP 인증 코드가 만료되었습니다 (15분 초과). 새 코드를 받으려면 "OTP 재전송"을 클릭하세요!'
        )
      );
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otpOrToken: cleanOtp }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || L('Mã xác thực OTP không chính xác', 'Invalid OTP code', 'OTP 코드가 일치하지 않습니다'));
      }

      setSuccessMsg(
        data.message ||
          L(
            'Mã xác thực OTP chính xác! Hãy nhập mật khẩu mới bên dưới.',
            'OTP verified! Please set your new password below.',
            'OTP 인증 완료! 아래에 새 비밀번호를 설정해주세요.'
          )
      );
      setMode('reset'); // Xác thực thành công -> Mở Cửa sổ thay đổi mật khẩu luôn
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
      return setErrorMsg(
        L(
          'Vui lòng xác thực mã OTP trước khi thay đổi mật khẩu!',
          'Please verify OTP code before resetting password!',
          '비밀번호를 재설정하기 전에 OTP를 인증해주세요!'
        )
      );
    }
    if (!pwdCriteria.isValid) {
      return setErrorMsg(
        L(
          'Mật khẩu mới cần tối thiểu 8 ký tự, gồm chữ HOA, chữ thường, chữ số và ký tự đặc biệt',
          'New password must be at least 8 chars with uppercase, lowercase, number and special char',
          '새 비밀번호는 최소 8자 이상, 대소문자, 숫자, 특수문자를 포함해야 합니다'
        )
      );
    }
    if (!confirmPassword) {
      return setErrorMsg(
        L(
          'Vui lòng xác nhận lại mật khẩu mới',
          'Please confirm your new password',
          '새 비밀번호 확인을 입력해주세요'
        )
      );
    }
    if (newPassword !== confirmPassword) {
      return setErrorMsg(
        L(
          'Mật khẩu xác nhận không trùng khớp với mật khẩu mới. Vui lòng kiểm tra lại!',
          'Confirmation password does not match new password. Please check again!',
          '확인 비밀번호가 새 비밀번호와 일치하지 않습니다. 다시 확인해주세요!'
        )
      );
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otpOrToken: otpOrToken.trim(), newPassword, confirmPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        // Lưu ý: Các trường hợp mật khẩu không trùng, trùng mật khẩu cũ... server KHÔNG hủy OTP
        throw new Error(data.message || L('Đặt lại mật khẩu thất bại', 'Password reset failed', '비밀번호 재설정 실패'));
      }

      // THÀNH CÔNG: Token đã hết hạn trên server! Thực hiện cơ chế chống quay lại:
      setSuccessMsg(
        data.message ||
          L(
            'Đổi mật khẩu thành công! Token xác thực đã hết hạn. Vui lòng đăng nhập.',
            'Password reset successful! Token expired. Please log in.',
            '비밀번호 변경 완료! 로그인해주세요.'
          )
      );
      setOtpOrToken('');
      setIsMagicLinkVerified(false);
      setPassword(newPassword);
      setNewPassword('');
      setConfirmPassword('');
      setDemoEmailBox(null);
      setOtpCountdown(0);

      // Chống quay lại bằng browser history
      if (typeof window !== 'undefined') {
        window.history.replaceState(null, document.title, window.location.pathname + '#login');
      }

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

      {/* Thanh chọn Ngôn ngữ (VI / EN / KO) & Sáng/Tối ở góc trên + Nút quay lại nếu mở từ trang chủ */}
      <div className="w-full max-w-5xl mx-auto flex items-center justify-between gap-2 p-3 sm:px-6">
        <div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className={`backdrop-blur-md px-3 py-1.5 rounded-xl border text-xs font-black flex items-center gap-1.5 shadow-sm transition ${
                darkMode
                  ? 'bg-slate-900/90 border-slate-700 text-slate-200 hover:text-white'
                  : 'bg-white/95 border-sky-200 text-slate-800 hover:text-blue-600'
              }`}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{lang === 'en' ? 'Back to Home' : lang === 'ko' ? '홈으로 돌아가기' : 'Quay lại Trang chủ'}</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
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
            <Sun className="w-3.5 h-3.5" /> {t.lightMode}
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
            <Moon className="w-3.5 h-3.5" /> {t.darkMode}
          </button>
        </div>
      </div>
    </div>

      {/* Khung Card Đăng nhập */}
      <div className="w-full max-w-md mx-auto px-3 py-6 my-auto">
        <div
          className={`backdrop-blur-[3px] rounded-3xl shadow-2xl overflow-hidden border ${
            darkMode ? 'bg-slate-900/65 border-slate-700/70' : 'bg-white/65 border-white/80'
          }`}
        >
          <div className="bg-gradient-to-r from-blue-600/80 via-indigo-600/75 to-blue-700/80 text-white p-4 sm:p-5 text-center">
            <img
              src={`${import.meta.env.BASE_URL || '/'}logo.png`}
              alt="Speak Right 2026 Logo"
              className="w-24 h-24 sm:w-28 sm:h-28 mx-auto object-contain drop-shadow-lg -mt-1 mb-1"
            />
            <div className="inline-flex items-center gap-1.5 bg-white/20 px-3 py-1 rounded-full text-xs font-extrabold mb-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              {totalDays > 0 ? `${totalDays} DAYS PRONUNCIATION` : 'DAILY PRONUNCIATION'}
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">SPEAK RIGHT 2026</h1>
          </div>

          <div className="p-5 sm:p-6">
            {guestNotice && (
              <div
                className={`mb-4 p-3 rounded-2xl border text-xs font-bold leading-relaxed ${
                  darkMode
                    ? 'bg-amber-950/50 border-amber-700/60 text-amber-100'
                    : 'bg-amber-50 border-amber-300 text-amber-950'
                }`}
              >
                {guestNotice}
              </div>
            )}
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

            {(mode === 'login' || mode === 'register') && (
              <AuthLoginRegisterViews
                mode={mode}
                setMode={setMode}
                lang={lang}
                darkMode={darkMode}
                t={t}
                labelClass={labelClass}
                inputClass={inputClass}
                employeeId={employeeId}
                handleGenInput={handleGenInput}
                fullName={fullName}
                setFullName={setFullName}
                email={email}
                setEmail={setEmail}
                password={password}
                setPassword={setPassword}
                showPassword={showPassword}
                setShowPassword={setShowPassword}
                hasSamsungWarning={hasSamsungWarning}
                pwdCriteria={pwdCriteria}
                loading={loading}
                setErrorMsg={setErrorMsg}
                setSuccessMsg={setSuccessMsg}
                handleLogin={handleLogin}
                handleRegister={handleRegister}
              />
            )}

            {(mode === 'forgot' || mode === 'enter_otp' || mode === 'reset') && (
              <AuthRecoveryViews
                mode={mode}
                setMode={setMode}
                lang={lang}
                darkMode={darkMode}
                t={t}
                L={L}
                labelClass={labelClass}
                inputClass={inputClass}
                email={email}
                setEmail={setEmail}
                hasSamsungWarning={hasSamsungWarning}
                otpOrToken={otpOrToken}
                setOtpOrToken={setOtpOrToken}
                otpCountdown={otpCountdown}
                formatCountdown={formatCountdown}
                demoEmailBox={demoEmailBox}
                isMagicLinkVerified={isMagicLinkVerified}
                setIsMagicLinkVerified={setIsMagicLinkVerified}
                newPassword={newPassword}
                setNewPassword={setNewPassword}
                confirmPassword={confirmPassword}
                setConfirmPassword={setConfirmPassword}
                showPassword={showPassword}
                setShowPassword={setShowPassword}
                showConfirmPassword={showConfirmPassword}
                setShowConfirmPassword={setShowConfirmPassword}
                pwdCriteria={pwdCriteria}
                loading={loading}
                setErrorMsg={setErrorMsg}
                setSuccessMsg={setSuccessMsg}
                handleForgotPassword={handleForgotPassword}
                handleVerifyOtp={handleVerifyOtp}
                handleResetPassword={handleResetPassword}
              />
            )}

            {/* Chế độ Khách: làm bài hôm nay & xem bảng xếp hạng không cần đăng nhập */}
            {onGuestMode && (mode === 'login' || mode === 'register') && (
              <div
                className={`mt-5 pt-4 border-t ${
                  darkMode ? 'border-slate-700/70' : 'border-slate-200/80'
                }`}
              >
                <div
                  className={`text-center text-[11px] font-bold mb-2.5 ${
                    darkMode ? 'text-slate-300' : 'text-slate-600'
                  }`}
                >
                  {lang === 'en'
                    ? 'Or try without an account (score will NOT be saved)'
                    : lang === 'ko'
                    ? '또는 로그인 없이 체험하기 (점수는 저장되지 않음)'
                    : 'Hoặc dùng thử không cần tài khoản (điểm sẽ KHÔNG được lưu)'}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => onGuestMode('home')}
                    className="py-2.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs shadow-sm transition"
                  >
                    🎯{' '}
                    {lang === 'en'
                      ? "Try today's challenge"
                      : lang === 'ko'
                      ? '오늘의 챌린지 체험'
                      : 'Làm thử bài hôm nay'}
                  </button>
                  <button
                    type="button"
                    onClick={() => onGuestMode('leaderboard')}
                    className={`py-2.5 rounded-2xl font-extrabold text-xs border transition ${
                      darkMode
                        ? 'border-slate-600 text-slate-100 hover:bg-slate-800'
                        : 'border-slate-300 text-slate-700 hover:bg-white'
                    }`}
                  >
                    🏆{' '}
                    {lang === 'en' ? 'View leaderboard' : lang === 'ko' ? '랭킹 보기' : 'Xem bảng xếp hạng'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

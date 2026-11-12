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
  Check,
  XCircle,
  KeyRound,
  ArrowLeft,
  Sparkles,
  ExternalLink,
  Copy,
  Zap,
  Sun,
  Moon,
  Loader2,
  Clock,
  RotateCw,
} from 'lucide-react';
import {
  checkPasswordStrength,
  isSamsungDomain,
  validateGenId,
  validatePersonalGmail,
  extractResetPasswordParams,
  PasswordCriteria,
} from '../utils/validation';
import { Lang, TRANSLATIONS } from '../utils/i18n';
import { ResponsiveBackground } from './LayoutDecor';

const PasswordStrengthMeter: React.FC<{
  criteria: PasswordCriteria;
  lang: Lang;
  darkMode: boolean;
}> = ({ criteria, lang, darkMode }) => {
  const L = (vi: string, en: string, ko: string) => (lang === 'en' ? en : lang === 'ko' ? ko : vi);

  return (
    <div className="space-y-2 mt-2">
      {/* 1. Thanh đo độ mạnh (4 segments) + Nhãn */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className={`font-bold flex items-center gap-1.5 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
            <Sparkles className="w-3.5 h-3.5 text-blue-500" />
            <span>{L('Độ mạnh mật khẩu:', 'Password strength:', '비밀번호 강도:')}</span>
          </span>
          {criteria.level !== 'EMPTY' ? (
            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black shadow-xs ${criteria.badgeBg}`}>
              {criteria.levelText[lang] || criteria.levelText.vi}
            </span>
          ) : (
            <span className="text-[11px] font-medium text-slate-400">
              {L('Chưa nhập', 'Empty', '미입력')}
            </span>
          )}
        </div>

        {/* Thanh 4 vạch (Segments) */}
        <div className="grid grid-cols-4 gap-1.5 h-1.5 w-full">
          {[1, 2, 3, 4].map((seg) => (
            <div
              key={seg}
              className={`h-full rounded-full transition-all duration-300 ${
                seg <= criteria.activeBars
                  ? criteria.barColor
                  : darkMode
                  ? 'bg-slate-700'
                  : 'bg-slate-200'
              }`}
            />
          ))}
        </div>
      </div>

      {/* 2. Bảng 5 tiêu chuẩn bảo mật chi tiết */}
      <div
        className={`grid grid-cols-2 gap-x-2 gap-y-1.5 p-2.5 rounded-2xl text-[11px] border transition ${
          darkMode
            ? 'bg-slate-800/80 border-slate-700/60'
            : 'bg-slate-50 border-slate-200/80'
        }`}
      >
        <div
          className={`flex items-center gap-1.5 ${
            criteria.minLength
              ? 'text-emerald-600 dark:text-emerald-400 font-bold'
              : 'text-slate-400 dark:text-slate-500'
          }`}
        >
          {criteria.minLength ? (
            <Check className="w-3.5 h-3.5 shrink-0 stroke-[2.5]" />
          ) : (
            <span className="w-3.5 h-3.5 flex items-center justify-center text-[10px]">•</span>
          )}
          <span>{L('Tối thiểu 8 ký tự', '8+ characters', '8자 이상')}</span>
        </div>

        <div
          className={`flex items-center gap-1.5 ${
            criteria.hasUpper
              ? 'text-emerald-600 dark:text-emerald-400 font-bold'
              : 'text-slate-400 dark:text-slate-500'
          }`}
        >
          {criteria.hasUpper ? (
            <Check className="w-3.5 h-3.5 shrink-0 stroke-[2.5]" />
          ) : (
            <span className="w-3.5 h-3.5 flex items-center justify-center text-[10px]">•</span>
          )}
          <span>{L('Chữ HOA (A-Z)', 'Uppercase (A-Z)', '대문자 (A-Z)')}</span>
        </div>

        <div
          className={`flex items-center gap-1.5 ${
            criteria.hasLower
              ? 'text-emerald-600 dark:text-emerald-400 font-bold'
              : 'text-slate-400 dark:text-slate-500'
          }`}
        >
          {criteria.hasLower ? (
            <Check className="w-3.5 h-3.5 shrink-0 stroke-[2.5]" />
          ) : (
            <span className="w-3.5 h-3.5 flex items-center justify-center text-[10px]">•</span>
          )}
          <span>{L('Chữ thường (a-z)', 'Lowercase (a-z)', '소문자 (a-z)')}</span>
        </div>

        <div
          className={`flex items-center gap-1.5 ${
            criteria.hasNumber
              ? 'text-emerald-600 dark:text-emerald-400 font-bold'
              : 'text-slate-400 dark:text-slate-500'
          }`}
        >
          {criteria.hasNumber ? (
            <Check className="w-3.5 h-3.5 shrink-0 stroke-[2.5]" />
          ) : (
            <span className="w-3.5 h-3.5 flex items-center justify-center text-[10px]">•</span>
          )}
          <span>{L('Chữ số (0-9)', 'Number (0-9)', '숫자 (0-9)')}</span>
        </div>

        <div
          className={`col-span-2 flex items-center gap-1.5 ${
            criteria.hasSpecial
              ? 'text-emerald-600 dark:text-emerald-400 font-bold'
              : 'text-slate-400 dark:text-slate-500'
          }`}
        >
          {criteria.hasSpecial ? (
            <Check className="w-3.5 h-3.5 shrink-0 stroke-[2.5]" />
          ) : (
            <span className="w-3.5 h-3.5 flex items-center justify-center text-[10px]">•</span>
          )}
          <span>{L('Ký tự đặc biệt (!@#$...)', 'Special char (!@#$...)', '특수문자 (!@#$...)')}</span>
        </div>
      </div>
    </div>
  );
};

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
              21 DAYS PRONUNCIATION
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
                    className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm shadow-lg transition flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>{t.sendOtpBtn}...</span>
                      </>
                    ) : (
                      t.sendOtpBtn
                    )}
                  </button>
                )}
              </form>
            )}

            {/* ================= 3b. NHẬP MÃ XÁC THỰC OTP (BƯỚC 2 TRƯỚC KHI ĐỔI MẬT KHẨU) ================= */}
            {mode === 'enter_otp' && (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <button
                  type="button"
                  onClick={() => {
                    setMode('forgot');
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                  className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-blue-600 transition"
                >
                  <ArrowLeft className="w-4 h-4" /> {t.backBtn}
                </button>

                <div>
                  <h2 className={`text-base font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    {L('Nhập mã xác thực OTP', 'Enter OTP Code', 'OTP 인증 코드 입력')}
                  </h2>
                  <p className={`text-xs mt-0.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {L('Mã 6 chữ số đã gửi đến email:', '6-digit code has been sent to:', '6자리 코드가 이메일로 전송되었습니다:')}{' '}
                    <span className="font-bold text-blue-600 dark:text-blue-400">{email}</span>
                  </p>
                </div>

                {/* Bộ đếm ngược thời gian hết hạn OTP (15 phút) */}
                <div
                  className={`p-3 rounded-2xl border flex items-center justify-between text-xs font-bold ${
                    otpCountdown === 0
                      ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400'
                      : darkMode
                      ? 'bg-slate-800/80 border-slate-700 text-slate-300'
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>
                      {otpCountdown > 0
                        ? L('Mã OTP có hiệu lực trong:', 'OTP valid for:', 'OTP 유효 시간:')
                        : L('Mã OTP đã hết hạn (quá 15p):', 'OTP expired (15m):', 'OTP 만료됨 (15분):')}
                    </span>
                  </span>
                  <span
                    className={`font-mono text-sm font-black px-2 py-0.5 rounded-lg ${
                      otpCountdown === 0
                        ? 'bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300'
                        : otpCountdown < 120
                        ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 animate-pulse'
                        : 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                    }`}
                  >
                    {formatCountdown(otpCountdown)}
                  </span>
                </div>

                {/* Hộp xem trước demo email (khi test hoặc chưa bật SMTP thực) */}
                {demoEmailBox && (
                  <div
                    className={`border rounded-2xl p-3 space-y-2.5 ${
                      darkMode ? 'bg-slate-800/90 border-slate-700' : 'bg-blue-50/90 border-blue-200'
                    }`}
                  >
                    <div className={`text-xs font-extrabold flex items-center justify-between ${darkMode ? 'text-blue-300' : 'text-blue-900'}`}>
                      <span>📩 {L('Xem trước mã gửi qua email:', 'Email preview:', '이메일 미리보기:')}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-200/50 text-blue-800 dark:text-blue-200">Demo</span>
                    </div>
                    <div
                      className={`rounded-xl p-3 border flex flex-col sm:flex-row items-center justify-between gap-2 ${
                        darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-blue-100'
                      }`}
                    >
                      <div className="text-center sm:text-left">
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{L('Mã OTP 6 số', '6-digit OTP', '6자리 OTP')}</div>
                        <div className="text-2xl font-black tracking-widest text-blue-600 dark:text-blue-400 font-mono">
                          {demoEmailBox.otpCode}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5 w-full sm:w-auto justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setOtpOrToken(demoEmailBox.otpCode);
                          }}
                          className={`text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-xs transition ${
                            darkMode ? 'bg-slate-800 text-slate-200 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          <Copy className="w-3.5 h-3.5" /> {L('Điền mã OTP', 'Fill OTP', 'OTP 입력')}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setOtpOrToken(demoEmailBox.resetToken);
                            setIsMagicLinkVerified(true);
                            setMode('reset');
                            setSuccessMsg(
                              L(
                                'Đã xác thực từ Liên kết Email! Hãy nhập mật khẩu mới.',
                                'Email link verified! Please enter your new password.',
                                '이메일 링크로 인증 완료! 새 비밀번호를 입력해주세요.'
                              )
                            );
                          }}
                          className="text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-sm transition"
                        >
                          <ExternalLink className="w-3.5 h-3.5" /> {L('Xác thực từ Link', 'Verify via Link', '링크로 인증')}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Ô nhập mã OTP 6 số */}
                <div>
                  <label className={labelClass}>
                    {L('Nhập 6 số OTP từ Email *', 'Enter 6-digit OTP from Email *', '이메일의 6자리 OTP 입력 *')}
                  </label>
                  <div className="relative">
                    <KeyRound className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      autoFocus
                      value={otpOrToken}
                      onChange={(e) => setOtpOrToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="••••••"
                      className={`w-full pl-12 pr-4 py-3 rounded-2xl border outline-none text-xl font-mono font-black tracking-[0.4em] text-center transition ${
                        darkMode
                          ? 'border-slate-700 bg-slate-800 text-white focus:border-blue-500'
                          : 'border-slate-200 bg-white text-slate-900 focus:border-blue-600'
                      }`}
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium mt-1 text-center">
                    {L('Kiểm tra Hộp thư đến (hoặc Thư rác/Spam) của bạn', 'Check your Inbox or Spam folder', '받은편지함 또는 스팸함을 확인하세요')}
                  </p>
                </div>

                {/* Nút Xác nhận OTP */}
                <button
                  type="submit"
                  disabled={loading || otpOrToken.trim().length !== 6 || otpCountdown === 0}
                  className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-extrabold text-sm shadow-lg shadow-blue-600/25 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{L('Đang kiểm tra mã OTP...', 'Verifying OTP...', 'OTP 확인 중...')}</span>
                    </>
                  ) : (
                    <span>{L('Xác nhận mã OTP & Đổi mật khẩu', 'Verify OTP & Change Password', 'OTP 확인 및 비밀번호 변경')}</span>
                  )}
                </button>

                {/* Gửi lại mã OTP */}
                <div className="text-center pt-1">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => handleForgotPassword()}
                    className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1.5 transition"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>{L('Chưa nhận được mã? Gửi lại mã OTP', "Didn't receive code? Resend OTP", '코드를 받지 못하셨나요? OTP 재전송')}</span>
                  </button>
                </div>
              </form>
            )}

            {/* ================= 4. CỬA SỔ THAY ĐỔI MẬT KHẨU (BƯỚC 3) ================= */}
            {mode === 'reset' && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <button
                  type="button"
                  onClick={() => {
                    if (isMagicLinkVerified) {
                      setMode('forgot');
                    } else {
                      setMode('enter_otp');
                    }
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                  className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-blue-600 transition"
                >
                  <ArrowLeft className="w-4 h-4" /> {t.backBtn}
                </button>

                <div>
                  <h2 className={`text-base font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    {L('Cửa sổ thay đổi mật khẩu', 'Change Password Window', '비밀번호 변경 창')}
                  </h2>
                  <p className={`text-xs mt-0.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {L('Thiết lập mật khẩu mới cho tài khoản:', 'Set new password for account:', '계정 새 비밀번호 설정:')}{' '}
                    <span className="font-bold text-blue-600 dark:text-blue-400">{email}</span>
                  </p>
                </div>

                {/* Huy hiệu xác thực an toàn: Đã xác thực qua Link Magic Link hoặc đã xác thực OTP */}
                <div className="p-3 rounded-2xl bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 shadow-xs flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-black text-emerald-900 dark:text-emerald-200 truncate">
                        {isMagicLinkVerified
                          ? L('Đã xác thực từ Liên kết Email (Magic Link)', 'Verified via Email Link (Magic Link)', '이메일 링크로 인증 완료 (Magic Link)')
                          : L('Đã xác thực mã OTP 6 số thành công', 'OTP code verified successfully', 'OTP 인증 성공')}
                      </div>
                      <div className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80 font-medium truncate">
                        {isMagicLinkVerified
                          ? L('Xác thực bảo mật qua Email', 'Authenticated via email', '이메일을 통한 보안 인증')
                          : `${L('Mã OTP', 'OTP Code', 'OTP 코드')}: ${otpOrToken}`}
                      </div>
                    </div>
                  </div>
                  {otpCountdown > 0 && (
                    <span className="text-[11px] font-mono font-black text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded-lg shrink-0">
                      ⏱️ {formatCountdown(otpCountdown)}
                    </span>
                  )}
                </div>

                {/* Mật khẩu mới */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className={labelClass}>
                      {L('Mật khẩu mới *', 'New password *', '새 비밀번호 *')}
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-[11px] font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1 hover:underline"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      <span>{showPassword ? L('Ẩn', 'Hide', '숨기기') : L('Hiện', 'Show', '보기')}</span>
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Speak@2026"
                      className={`${inputClass} pl-10 pr-3.5 font-medium`}
                      required
                    />
                  </div>

                  <PasswordStrengthMeter criteria={pwdCriteria} lang={lang} darkMode={darkMode} />
                </div>

                {/* Xác nhận mật khẩu mới */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className={labelClass}>
                      {L('Xác nhận mật khẩu mới *', 'Confirm new password *', '새 비밀번호 확인 *')}
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="text-[11px] font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1 hover:underline"
                    >
                      {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      <span>{showConfirmPassword ? L('Ẩn', 'Hide', '숨기기') : L('Hiện', 'Show', '보기')}</span>
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Nhập lại mật khẩu mới..."
                      className={`${inputClass} pl-10 pr-3.5 font-medium ${
                        confirmPassword && confirmPassword !== newPassword
                          ? 'border-rose-500 focus:border-rose-500'
                          : confirmPassword && confirmPassword === newPassword
                          ? 'border-emerald-500 focus:border-emerald-500'
                          : ''
                      }`}
                      required
                    />
                  </div>
                  {confirmPassword && confirmPassword !== newPassword && (
                    <p className="text-[11px] text-rose-500 font-bold mt-1">
                      {L('Mật khẩu xác nhận chưa khớp với mật khẩu mới', 'Passwords do not match', '비밀번호가 일치하지 않습니다')}
                    </p>
                  )}
                  {confirmPassword && confirmPassword === newPassword && (
                    <p className="text-[11px] text-emerald-500 font-bold mt-1 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      {L('Mật khẩu xác nhận trùng khớp', 'Passwords match', '비밀번호가 일치합니다')}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || !newPassword || !confirmPassword}
                  className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-extrabold text-sm shadow-lg shadow-emerald-600/25 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{t.saveNewPassBtn}...</span>
                    </>
                  ) : (
                    <span>{t.saveNewPassBtn} & {t.loginTab}</span>
                  )}
                </button>
              </form>
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

import React from 'react';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  RotateCw,
} from 'lucide-react';
import { PasswordCriteria } from '../../utils/validation';
import { Lang, TRANSLATIONS } from '../../utils/i18n';
import { PasswordStrengthMeter } from './PasswordStrengthMeter';

interface AuthRecoveryViewsProps {
  mode: 'forgot' | 'enter_otp' | 'reset';
  setMode: (mode: 'login' | 'register' | 'forgot' | 'enter_otp' | 'reset') => void;
  lang: Lang;
  darkMode: boolean;
  t: (typeof TRANSLATIONS)[Lang];
  L: (vi: string, en: string, ko: string) => string;
  labelClass: string;
  inputClass: string;
  email: string;
  setEmail: (val: string) => void;
  hasSamsungWarning: boolean;
  otpOrToken: string;
  setOtpOrToken: (val: string) => void;
  otpCountdown: number;
  formatCountdown: (sec: number) => string;
  demoEmailBox: {
    otpCode: string;
    resetToken: string;
    resetLink: string;
  } | null;
  isMagicLinkVerified: boolean;
  setIsMagicLinkVerified: (val: boolean) => void;
  newPassword: string;
  setNewPassword: (val: string) => void;
  confirmPassword: string;
  setConfirmPassword: (val: string) => void;
  showPassword: boolean;
  setShowPassword: (val: boolean) => void;
  showConfirmPassword: boolean;
  setShowConfirmPassword: (val: boolean) => void;
  pwdCriteria: PasswordCriteria;
  loading: boolean;
  setErrorMsg: (msg: string) => void;
  setSuccessMsg: (msg: string) => void;
  handleForgotPassword: (e?: React.FormEvent) => void;
  handleVerifyOtp: (e: React.FormEvent) => void;
  handleResetPassword: (e: React.FormEvent) => void;
}

export const AuthRecoveryViews: React.FC<AuthRecoveryViewsProps> = ({
  mode,
  setMode,
  lang,
  darkMode,
  t,
  L,
  labelClass,
  inputClass,
  email,
  setEmail,
  hasSamsungWarning,
  otpOrToken,
  setOtpOrToken,
  otpCountdown,
  formatCountdown,
  demoEmailBox,
  isMagicLinkVerified,
  setIsMagicLinkVerified,
  newPassword,
  setNewPassword,
  confirmPassword,
  setConfirmPassword,
  showPassword,
  setShowPassword,
  showConfirmPassword,
  setShowConfirmPassword,
  pwdCriteria,
  loading,
  setErrorMsg,
  setSuccessMsg,
  handleForgotPassword,
  handleVerifyOtp,
  handleResetPassword,
}) => {
  if (mode === 'forgot') {
    return (
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
    );
  }

  if (mode === 'enter_otp') {
    return (
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
    );
  }

  return (
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
  );
};

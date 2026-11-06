export type PasswordStrengthLevel = 'EMPTY' | 'WEAK' | 'MEDIUM' | 'STRONG' | 'VERY_STRONG';

export interface PasswordCriteria {
  minLength: boolean;
  hasUpper: boolean;
  hasLower: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
  isValid: boolean;
  // Các trường đo độ mạnh yếu chi tiết
  score: number; // 0: rỗng, 1: yếu, 2: trung bình, 3: mạnh, 4: rất mạnh
  level: PasswordStrengthLevel;
  levelText: { vi: string; en: string; ko: string };
  barColor: string;
  textColor: string;
  badgeBg: string;
  activeBars: number; // 0 đến 4
  suggestions: { vi: string; en: string; ko: string }[];
}

export function checkPasswordStrength(password: string): PasswordCriteria {
  const p = password || '';
  const minLength = p.length >= 8;
  const hasUpper = /[A-Z]/.test(p);
  const hasLower = /[a-z]/.test(p);
  const hasNumber = /\d/.test(p);
  const hasSpecial = /[^A-Za-z0-9]/.test(p);
  const isValid = minLength && hasUpper && hasLower && hasNumber && hasSpecial;

  const suggestions: { vi: string; en: string; ko: string }[] = [];
  if (!minLength) {
    suggestions.push({
      vi: 'Tối thiểu 8 ký tự',
      en: 'At least 8 characters',
      ko: '최소 8자 이상',
    });
  }
  if (!hasUpper) {
    suggestions.push({
      vi: 'Ít nhất 1 chữ IN HOA (A-Z)',
      en: 'At least 1 uppercase letter (A-Z)',
      ko: '대문자 1개 이상 (A-Z)',
    });
  }
  if (!hasLower) {
    suggestions.push({
      vi: 'Ít nhất 1 chữ thường (a-z)',
      en: 'At least 1 lowercase letter (a-z)',
      ko: '소문자 1개 이상 (a-z)',
    });
  }
  if (!hasNumber) {
    suggestions.push({
      vi: 'Ít nhất 1 chữ số (0-9)',
      en: 'At least 1 number (0-9)',
      ko: '숫자 1개 이상 (0-9)',
    });
  }
  if (!hasSpecial) {
    suggestions.push({
      vi: 'Ít nhất 1 ký tự đặc biệt (!@#$...)',
      en: 'At least 1 special character (!@#$...)',
      ko: '특수문자 1개 이상 (!@#$...)',
    });
  }

  if (!p) {
    return {
      minLength: false,
      hasUpper: false,
      hasLower: false,
      hasNumber: false,
      hasSpecial: false,
      isValid: false,
      score: 0,
      level: 'EMPTY',
      levelText: { vi: 'Chưa nhập', en: 'Empty', ko: '미입력' },
      barColor: 'bg-slate-300 dark:bg-slate-700',
      textColor: 'text-slate-400',
      badgeBg: 'bg-slate-100 dark:bg-slate-800 text-slate-500',
      activeBars: 0,
      suggestions,
    };
  }

  const passedCount =
    (minLength ? 1 : 0) +
    (hasUpper ? 1 : 0) +
    (hasLower ? 1 : 0) +
    (hasNumber ? 1 : 0) +
    (hasSpecial ? 1 : 0);

  if (!isValid || passedCount <= 3) {
    if (passedCount <= 2) {
      return {
        minLength,
        hasUpper,
        hasLower,
        hasNumber,
        hasSpecial,
        isValid: false,
        score: 1,
        level: 'WEAK',
        levelText: { vi: 'Yếu', en: 'Weak', ko: '취약' },
        barColor: 'bg-rose-500',
        textColor: 'text-rose-500',
        badgeBg: 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900',
        activeBars: 1,
        suggestions,
      };
    }
    return {
      minLength,
      hasUpper,
      hasLower,
      hasNumber,
      hasSpecial,
      isValid: false,
      score: 2,
      level: 'MEDIUM',
      levelText: { vi: 'Trung bình', en: 'Medium', ko: '보통' },
      barColor: 'bg-amber-500',
      textColor: 'text-amber-500',
      badgeBg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900',
      activeBars: 2,
      suggestions,
    };
  }

  // Đã thỏa mãn cả 5 điều kiện
  if (p.length >= 12) {
    return {
      minLength,
      hasUpper,
      hasLower,
      hasNumber,
      hasSpecial,
      isValid: true,
      score: 4,
      level: 'VERY_STRONG',
      levelText: { vi: 'Rất mạnh', en: 'Very Strong', ko: '매우 강력' },
      barColor: 'bg-emerald-600',
      textColor: 'text-emerald-600 dark:text-emerald-400',
      badgeBg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800',
      activeBars: 4,
      suggestions: [],
    };
  }

  return {
    minLength,
    hasUpper,
    hasLower,
    hasNumber,
    hasSpecial,
    isValid: true,
    score: 3,
    level: 'STRONG',
    levelText: { vi: 'Mạnh', en: 'Strong', ko: '안전' },
    barColor: 'bg-emerald-500',
    textColor: 'text-emerald-500 dark:text-emerald-400',
    badgeBg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900',
    activeBars: 3,
    suggestions: [],
  };
}

export function isSamsungDomain(email: string): boolean {
  const lower = email.trim().toLowerCase();
  if (!lower.includes('@')) return false;
  const domain = lower.split('@')[1] || '';
  return domain === 'samsung.com' || domain.endsWith('.samsung.com') || domain.includes('samsung.');
}

export function validateGenId(genId: string): { valid: boolean; message: string } {
  const cleaned = genId.trim();
  if (!cleaned) {
    return { valid: false, message: 'Vui lòng nhập Số GEN (8 chữ số)' };
  }
  if (!/^\d{8}$/.test(cleaned)) {
    return {
      valid: false,
      message: `Số GEN phải bao gồm đúng 8 chữ số (Hiện tại: ${cleaned.length}/8 số)`,
    };
  }
  return { valid: true, message: 'Số GEN hợp lệ' };
}

export function validatePersonalGmail(email: string): { valid: boolean; message: string } {
  const cleaned = email.trim().toLowerCase();
  if (!cleaned) {
    return { valid: false, message: 'Vui lòng nhập địa chỉ Gmail cá nhân' };
  }
  if (isSamsungDomain(cleaned)) {
    return {
      valid: false,
      message:
        '🚫 Bảo mật công ty: Tuyệt đối KHÔNG nhập email @samsung.com! Vui lòng dùng Gmail cá nhân.',
    };
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleaned)) {
    return { valid: false, message: 'Định dạng email chưa hợp lệ (Ví dụ: tenban@gmail.com)' };
  }
  return { valid: true, message: 'Email hợp lệ' };
}

/**
 * Trích xuất resetToken và email từ thanh địa chỉ (hỗ trợ cả query ?resetToken=... và hash #home/?resetToken=...)
 */
export function extractResetPasswordParams(): { resetToken: string | null; email: string | null } {
  if (typeof window === 'undefined') return { resetToken: null, email: null };

  // 1. Kiểm tra query param chuẩn ở window.location.search
  const searchParams = new URLSearchParams(window.location.search);
  let resetToken = searchParams.get('resetToken');
  let email = searchParams.get('email');

  // 2. Kiểm tra nếu param nằm sau hash (#home/?resetToken=... hoặc #reset-password?resetToken=...)
  if (!resetToken && window.location.hash) {
    const hash = window.location.hash;
    const queryIdx = hash.indexOf('?');
    if (queryIdx !== -1) {
      const hashParams = new URLSearchParams(hash.substring(queryIdx + 1));
      resetToken = hashParams.get('resetToken');
      if (!email) email = hashParams.get('email');
    }
  }

  // 3. Giải mã an toàn email nếu bị URL-encode
  if (email) {
    try {
      email = decodeURIComponent(email);
    } catch {}
  }

  return { resetToken, email };
}

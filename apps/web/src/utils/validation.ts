export interface PasswordCriteria {
  minLength: boolean;
  hasUpper: boolean;
  hasLower: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
  isValid: boolean;
}

export function checkPasswordStrength(password: string): PasswordCriteria {
  const minLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  return {
    minLength,
    hasUpper,
    hasLower,
    hasNumber,
    hasSpecial,
    isValid: minLength && hasUpper && hasLower && hasNumber && hasSpecial,
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

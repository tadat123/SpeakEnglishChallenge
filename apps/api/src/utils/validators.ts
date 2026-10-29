import { z } from 'zod';

// 1. Số GEN: Bắt buộc đúng 8 chữ số
export const genIdSchema = z
  .string()
  .trim()
  .regex(/^\d{8}$/, 'Số GEN phải bao gồm đúng 8 chữ số (Ví dụ: 20268888)');

// 2. Mật khẩu: Tối thiểu 8 ký tự, gồm chữ HOA, chữ thường, chữ số và ký tự đặc biệt
export const strongPasswordSchema = z
  .string()
  .min(8, 'Mật khẩu phải có ít nhất 8 ký tự')
  .regex(/[A-Z]/, 'Mật khẩu phải chứa ít nhất 1 chữ cái viết HOA (A-Z)')
  .regex(/[a-z]/, 'Mật khẩu phải chứa ít nhất 1 chữ cái viết thường (a-z)')
  .regex(/\d/, 'Mật khẩu phải chứa ít nhất 1 chữ số (0-9)')
  .regex(/[^A-Za-z0-9]/, 'Mật khẩu phải chứa ít nhất 1 ký tự đặc biệt (!@#$%^&*...)');

// 3. Email cá nhân (Gmail): Chặn tuyệt đối *@samsung.com
export const personalEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('Địa chỉ email không hợp lệ')
  .refine(
    (email) => {
      const domain = email.split('@')[1] || '';
      return domain !== 'samsung.com' && !domain.endsWith('.samsung.com');
    },
    {
      message:
        'Vì lý do bảo mật dữ liệu công ty, tuyệt đối KHÔNG sử dụng email @samsung.com. Vui lòng dùng Gmail cá nhân!',
    }
  );

export const registerSchema = z.object({
  employeeId: genIdSchema,
  fullName: z.string().trim().min(2, 'Vui lòng nhập họ và tên đầy đủ'),
  email: personalEmailSchema,
  phone: z.string().trim().optional().default(''),
  department: z.string().trim().min(1, 'Vui lòng chọn phòng ban / bộ phận'),
  password: strongPasswordSchema,
});

export const loginSchema = z.object({
  identifier: z.string().trim().min(1, 'Vui lòng nhập Số GEN (8 số) hoặc Gmail'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
});

export const forgotPasswordSchema = z.object({
  email: personalEmailSchema,
  employeeId: genIdSchema.optional(),
});

export const resetPasswordSchema = z.object({
  email: personalEmailSchema,
  otpOrToken: z.string().trim().min(6, 'Mã xác thực OTP hoặc Token không hợp lệ'),
  newPassword: strongPasswordSchema,
});

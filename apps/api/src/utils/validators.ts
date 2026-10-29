import { z } from 'zod';

export const genIdSchema = z
  .string()
  .trim()
  .regex(/^\d{8}$/, 'Số GEN phải gồm đúng 8 chữ số');

export const strongPasswordSchema = z
  .string()
  .min(8, 'Mật khẩu phải từ 8 ký tự trở lên')
  .regex(/[A-Z]/, 'Mật khẩu cần có chữ HOA (A-Z)')
  .regex(/[a-z]/, 'Mật khẩu cần có chữ thường (a-z)')
  .regex(/\d/, 'Mật khẩu cần có chữ số (0-9)')
  .regex(/[^A-Za-z0-9]/, 'Mật khẩu cần có ký tự đặc biệt');

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
      message: 'Không được sử dụng email @samsung.com. Vui lòng nhập Gmail cá nhân!',
    }
  );

export const registerSchema = z.object({
  employeeId: genIdSchema,
  fullName: z.string().trim().min(2, 'Vui lòng nhập họ và tên'),
  email: personalEmailSchema,
  phone: z.string().trim().optional().default(''),
  department: z.string().trim().optional().default(''),
  password: strongPasswordSchema,
});

export const loginSchema = z.object({
  identifier: z.string().trim().min(1, 'Vui lòng nhập Số GEN hoặc Gmail'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
});

export const forgotPasswordSchema = z.object({
  email: personalEmailSchema,
  employeeId: genIdSchema.optional(),
});

export const resetPasswordSchema = z.object({
  email: personalEmailSchema,
  otpOrToken: z.string().trim().min(6, 'Mã xác thực không hợp lệ'),
  newPassword: strongPasswordSchema,
});

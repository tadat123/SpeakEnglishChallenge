import { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { store } from '../services/store.js';
import { sendPasswordResetEmail } from '../services/mailer.js';
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from '../utils/validators.js';

export function registerAuthRoutes(app: FastifyInstance) {
  app.post(
    '/api/auth/register',
    {
      config: { rateLimit: { max: 8, timeWindow: '10 minutes' } },
    },
    async (request, reply) => {
      const parsed = registerSchema.safeParse(request.body);
      if (!parsed.success) {
        const firstError = parsed.error.issues[0]?.message || 'Dữ liệu đăng ký không hợp lệ';
        return reply.status(400).send({ message: firstError, issues: parsed.error.issues });
      }

      const { employeeId, fullName, email, phone, password } = parsed.data;

      await store.syncFromPostgres();
      if (store.findUserByIdentifier(employeeId)) {
        return reply.status(409).send({ message: `Số GEN ${employeeId} đã được đăng ký trên hệ thống!` });
      }
      if (store.findUserByIdentifier(email)) {
        return reply.status(409).send({ message: `Địa chỉ Gmail ${email} đã được sử dụng!` });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const newUser = await store.createUser({
        id: crypto.randomUUID(),
        employeeId,
        fullName,
        email,
        phone: phone || '',
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(employeeId)}`,
        passwordHash,
        role: 'USER',
        totalScore: 0,
        totalTimeMs: 0,
        completedDays: 0,
        createdAt: new Date().toISOString(),
      });

      const accessToken = app.jwt.sign(
        { sub: newUser.id, employeeId: newUser.employeeId, role: newUser.role },
        { expiresIn: '7d' }
      );

      return {
        accessToken,
        user: {
          id: newUser.id,
          employeeId: newUser.employeeId,
          fullName: newUser.fullName,
          email: newUser.email,
          phone: newUser.phone,
          avatarUrl: newUser.avatarUrl,
          role: newUser.role,
          totalScore: newUser.totalScore,
          completedDays: newUser.completedDays,
        },
      };
    }
  );

  app.post(
    '/api/auth/login',
    {
      config: { rateLimit: { max: 10, timeWindow: '5 minutes' } },
    },
    async (request, reply) => {
      const parsed = loginSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ message: parsed.error.issues[0]?.message });
      }

      const { identifier, password } = parsed.data;
      if (identifier.toLowerCase().includes('@samsung.com')) {
        return reply.status(400).send({
          message:
            'Vì lý do bảo mật dữ liệu công ty, hệ thống không cho phép sử dụng email @samsung.com. Vui lòng đăng nhập bằng Số GEN (8 chữ số) hoặc Gmail cá nhân!',
        });
      }

      let user = store.findUserByIdentifier(identifier);
      if (!user) {
        await store.syncFromPostgres();
        user = store.findUserByIdentifier(identifier);
      }
      if (!user) {
        return reply.status(401).send({ message: 'Không tìm thấy tài khoản với Số GEN hoặc Gmail này.' });
      }

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        return reply.status(401).send({ message: 'Mật khẩu không chính xác. Vui lòng thử lại!' });
      }

      const accessToken = app.jwt.sign(
        { sub: user.id, employeeId: user.employeeId, role: user.role },
        { expiresIn: '7d' }
      );

      const userAgent = (request.headers['user-agent'] as string) || '';
      const ip = request.ip || '';
      store.recordUserDevice(user.id, userAgent, ip);

      return {
        accessToken,
        user: {
          id: user.id,
          employeeId: user.employeeId,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          avatarUrl: user.avatarUrl,
          role: user.role,
          totalScore: user.totalScore,
          completedDays: user.completedDays,
        },
      };
    }
  );

  app.post(
    '/api/auth/forgot-password',
    {
      config: { rateLimit: { max: 5, timeWindow: '15 minutes' } },
    },
    async (request, reply) => {
      const parsed = forgotPasswordSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ message: parsed.error.issues[0]?.message });
      }

      const { email, employeeId, theme } = parsed.data;
      let user = store.findUserByIdentifier(email);
      if (!user) {
        await store.syncFromPostgres();
        user = store.findUserByIdentifier(email);
      }

      if (!user) {
        return reply.status(404).send({
          message: 'Không tìm thấy tài khoản nào đăng ký với địa chỉ Gmail này.',
        });
      }

      if (employeeId && user.employeeId !== employeeId) {
        return reply.status(400).send({
          message: 'Số GEN (8 chữ số) không khớp với địa chỉ Gmail đã đăng ký.',
        });
      }

      const otpCode = String(Math.floor(100000 + Math.random() * 900000));
      const resetToken = crypto.randomBytes(24).toString('hex');
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

      user.resetOtpCode = otpCode;
      user.resetToken = resetToken;
      user.resetExpiresAt = expiresAt;
      store.save();

      if (store.getPrisma()) {
        try {
          await store.getPrisma()!.user.update({
            where: { id: user.id },
            data: { resetOtpCode: otpCode, resetToken, resetExpiresAt: new Date(expiresAt) },
          });
        } catch {}
      }

      const rawFrontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const cleanFrontendUrl = rawFrontendUrl.replace(/\/+$/, '').replace(/#.*$/, '').replace(/\/+$/, '');
      const resetLink = `${cleanFrontendUrl}/?resetToken=${resetToken}&email=${encodeURIComponent(user.email)}`;

      const mailResult = await sendPasswordResetEmail({
        to: user.email,
        fullName: user.fullName,
        employeeId: user.employeeId,
        otpCode,
        resetLink,
        theme,
      });

      return {
        message: mailResult.sentViaSmtp
          ? `Đã gửi mã xác thực OTP và link khôi phục mật khẩu tới ${user.email}`
          : `Đã tạo mã xác thực OTP & Link khôi phục cho ${user.email} (Chế độ xem trước Email trực tiếp)`,
        sentViaSmtp: mailResult.sentViaSmtp,
        expiresAt,
        demoEmailPreview: !mailResult.sentViaSmtp
          ? { otpCode, resetToken, resetLink, htmlPreview: mailResult.htmlPreview }
          : undefined,
      };
    }
  );

  app.post(
    '/api/auth/verify-otp',
    {
      config: { rateLimit: { max: 15, timeWindow: '15 minutes' } },
    },
    async (request, reply) => {
      const { email, otpOrToken } = (request.body || {}) as { email?: string; otpOrToken?: string };
      if (!email?.trim() || !otpOrToken?.trim()) {
        return reply.status(400).send({ message: 'Vui lòng nhập đầy đủ Gmail và mã xác thực OTP 6 số!' });
      }

      let user = store.findUserByIdentifier(email.trim());
      if (!user) {
        await store.syncFromPostgres();
        user = store.findUserByIdentifier(email.trim());
      }

      if (!user || !user.resetExpiresAt || (!user.resetOtpCode && !user.resetToken)) {
        return reply.status(400).send({ message: 'Yêu cầu đặt lại mật khẩu không tồn tại hoặc đã hết hạn.' });
      }

      if (new Date(user.resetExpiresAt).getTime() < Date.now()) {
        return reply.status(400).send({ message: 'Mã xác thực OTP đã hết hạn (quá 15 phút). Vui lòng yêu cầu mã mới!' });
      }

      const isMatched = user.resetOtpCode === otpOrToken.trim() || user.resetToken === otpOrToken.trim();
      if (!isMatched) {
        return reply.status(400).send({ message: 'Mã xác thực OTP không chính xác. Vui lòng kiểm tra lại email!' });
      }

      return {
        success: true,
        message: 'Mã xác thực OTP chính xác! Hãy nhập mật khẩu mới.',
      };
    }
  );

  app.post(
    '/api/auth/reset-password',
    {
      config: { rateLimit: { max: 8, timeWindow: '15 minutes' } },
    },
    async (request, reply) => {
      const parsed = resetPasswordSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ message: parsed.error.issues[0]?.message });
      }

      const { email, otpOrToken, newPassword, confirmPassword } = parsed.data as any;
      if (confirmPassword && confirmPassword !== newPassword) {
        return reply.status(400).send({
          message: 'Mật khẩu xác nhận không trùng khớp với mật khẩu mới. Vui lòng kiểm tra lại!',
        });
      }

      let user = store.findUserByIdentifier(email);
      if (!user) {
        await store.syncFromPostgres();
        user = store.findUserByIdentifier(email);
      }

      if (!user || !user.resetExpiresAt) {
        return reply.status(400).send({ message: 'Yêu cầu đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.' });
      }

      if (new Date(user.resetExpiresAt).getTime() < Date.now()) {
        return reply.status(400).send({ message: 'Mã xác thực OTP / Link đã hết hạn (quá 15 phút). Vui lòng lấy mã mới!' });
      }

      const isMatched = user.resetOtpCode === otpOrToken.trim() || user.resetToken === otpOrToken.trim();
      if (!isMatched) {
        return reply.status(400).send({ message: 'Mã xác thực OTP hoặc đường dẫn khôi phục không chính xác!' });
      }

      if (user.passwordHash) {
        const isSameAsOld = await bcrypt.compare(newPassword, user.passwordHash);
        if (isSameAsOld) {
          return reply.status(400).send({
            message: 'Mật khẩu mới không được trùng với mật khẩu hiện tại. Vui lòng chọn mật khẩu mới khác!',
          });
        }
      }

      const newHash = await bcrypt.hash(newPassword, 10);
      user.passwordHash = newHash;
      user.resetOtpCode = null;
      user.resetToken = null;
      user.resetExpiresAt = null;
      store.save();

      if (store.getPrisma()) {
        try {
          await store.getPrisma()!.user.update({
            where: { id: user.id },
            data: { passwordHash: newHash, resetOtpCode: null, resetToken: null, resetExpiresAt: null },
          });
        } catch {}
      }

      return {
        message: 'Đặt lại mật khẩu thành công! Bạn có thể đăng nhập ngay bằng mật khẩu mới.',
      };
    }
  );
}

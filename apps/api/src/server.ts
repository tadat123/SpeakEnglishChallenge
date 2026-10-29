import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { store } from './services/store.js';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from './utils/validators.js';
import { sendPasswordResetEmail } from './services/mailer.js';

const app = Fastify({
  logger: true,
});

// Cho phép request có header Content-Type: application/json nhưng body rỗng không bị lỗi FST_ERR_CTP_EMPTY_JSON_BODY
app.addContentTypeParser('application/json', { parseAs: 'string' }, (req, body, done) => {
  try {
    const str = (body as string)?.trim();
    const json = str ? JSON.parse(str) : {};
    done(null, json);
  } catch (err: any) {
    err.statusCode = 400;
    done(err, undefined);
  }
});

await app.register(cors, {
  origin: true,
  credentials: true,
});

await app.register(jwt, {
  secret: process.env.JWT_SECRET || 'speak-right-2026-super-secret-jwt-key',
});

await app.register(rateLimit, {
  max: 150,
  timeWindow: '1 minute',
});

// Decorator xác thực JWT
app.decorate('authenticate', async (request: any, reply: any) => {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.status(401).send({ message: 'Phiên đăng nhập hết hạn hoặc không hợp lệ.' });
  }
});

// Health Check
app.get('/api/health', async () => {
  return {
    status: 'ok',
    service: 'Speak Right Daily Challenge 2026 API',
    instance: process.env.INSTANCE_ID || 'local-node-1',
    timestamp: new Date().toISOString(),
  };
});

// ==================== 1. AUTHENTICATION & PASSWORD RECOVERY ====================

// Đăng ký tài khoản (Kiểm tra Số GEN 8 số, Mật khẩu mạnh, Chặn @samsung.com)
app.post('/api/auth/register', async (request, reply) => {
  const parsed = registerSchema.safeParse(request.body);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message || 'Dữ liệu đăng ký không hợp lệ';
    return reply.status(400).send({ message: firstError, issues: parsed.error.issues });
  }

  const { employeeId, fullName, email, phone, department, password } = parsed.data;

  const existingByGen = store.findUserByIdentifier(employeeId);
  if (existingByGen) {
    return reply.status(409).send({ message: `Số GEN ${employeeId} đã được đăng ký trên hệ thống!` });
  }

  const existingByEmail = store.findUserByIdentifier(email);
  if (existingByEmail) {
    return reply.status(409).send({ message: `Địa chỉ Gmail ${email} đã được sử dụng!` });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const newUser = store.createUser({
    id: crypto.randomUUID(),
    employeeId,
    fullName,
    email,
    phone: phone || '',
    department,
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
      department: newUser.department,
      avatarUrl: newUser.avatarUrl,
      role: newUser.role,
      totalScore: newUser.totalScore,
      completedDays: newUser.completedDays,
    },
  };
});

// Đăng nhập bằng Số GEN (8 số) hoặc Gmail cá nhân
app.post('/api/auth/login', async (request, reply) => {
  const parsed = loginSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({ message: parsed.error.issues[0]?.message });
  }

  const { identifier, password } = parsed.data;

  // Chặn nếu người dùng cố tình nhập @samsung.com
  if (identifier.toLowerCase().includes('@samsung.com')) {
    return reply.status(400).send({
      message:
        'Vì lý do bảo mật dữ liệu công ty, hệ thống không cho phép sử dụng email @samsung.com. Vui lòng đăng nhập bằng Số GEN (8 chữ số) hoặc Gmail cá nhân!',
    });
  }

  const user = store.findUserByIdentifier(identifier);
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

  return {
    accessToken,
    user: {
      id: user.id,
      employeeId: user.employeeId,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      department: user.department,
      avatarUrl: user.avatarUrl,
      role: user.role,
      totalScore: user.totalScore,
      completedDays: user.completedDays,
    },
  };
});

// Yêu cầu lấy lại mật khẩu (Gửi cả mã OTP 6 số + Nút bấm Magic Link trong Email)
app.post('/api/auth/forgot-password', async (request, reply) => {
  const parsed = forgotPasswordSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({ message: parsed.error.issues[0]?.message });
  }

  const { email, employeeId } = parsed.data;
  const user = store.findUserByIdentifier(email);

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

  // Tạo mã OTP 6 chữ số và Magic Token
  const otpCode = String(Math.floor(100000 + Math.random() * 900000));
  const resetToken = crypto.randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 phút

  user.resetOtpCode = otpCode;
  user.resetToken = resetToken;
  user.resetExpiresAt = expiresAt;
  store.save();

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const resetLink = `${frontendUrl}/?resetToken=${resetToken}&email=${encodeURIComponent(user.email)}`;

  const mailResult = await sendPasswordResetEmail({
    to: user.email,
    fullName: user.fullName,
    employeeId: user.employeeId,
    otpCode,
    resetLink,
  });

  return {
    message: mailResult.sentViaSmtp
      ? `Đã gửi mã xác thực OTP và link khôi phục mật khẩu tới ${user.email}`
      : `Đã tạo mã xác thực OTP & Link khôi phục cho ${user.email} (Chế độ xem trước Email trực tiếp)`,
    sentViaSmtp: mailResult.sentViaSmtp,
    // Trả về bản xem trước email khi chạy Demo/Local chưa cấu hình SMTP để test ngay lập tức
    demoEmailPreview: !mailResult.sentViaSmtp
      ? {
          otpCode,
          resetToken,
          resetLink,
          htmlPreview: mailResult.htmlPreview,
        }
      : undefined,
  };
});

// Đặt lại mật khẩu mới bằng Mã OTP 6 số HOẶC Magic Link Token từ Email
app.post('/api/auth/reset-password', async (request, reply) => {
  const parsed = resetPasswordSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({ message: parsed.error.issues[0]?.message });
  }

  const { email, otpOrToken, newPassword } = parsed.data;
  const user = store.findUserByIdentifier(email);

  if (!user || !user.resetExpiresAt) {
    return reply.status(400).send({ message: 'Yêu cầu đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.' });
  }

  if (new Date(user.resetExpiresAt).getTime() < Date.now()) {
    return reply.status(400).send({ message: 'Mã xác thực OTP / Link đã hết hạn (quá 15 phút). Vui lòng lấy mã mới!' });
  }

  const isMatched =
    user.resetOtpCode === otpOrToken.trim() || user.resetToken === otpOrToken.trim();

  if (!isMatched) {
    return reply.status(400).send({ message: 'Mã xác thực OTP hoặc đường dẫn khôi phục không chính xác!' });
  }

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  user.resetOtpCode = null;
  user.resetToken = null;
  user.resetExpiresAt = null;
  store.save();

  return {
    message: 'Đặt lại mật khẩu thành công! Bạn có thể đăng nhập ngay bằng mật khẩu mới.',
  };
});

// ==================== 2. DAILY CHALLENGES (30 DAYS) ====================

// Lấy danh sách 30 ngày thử thách kèm trạng thái của user
app.get('/api/challenges', { preHandler: [(app as any).authenticate] }, async (request: any) => {
  const userId = request.user.sub;
  const challenges = store.getChallenges();
  const attempts = store.getUserAttempts(userId);
  const now = Date.now();

  return challenges.map((c) => {
    const attempt = attempts.find((a) => a.dayNumber === c.dayNumber);
    const isUnlocked = c.dayNumber === 1 || new Date(c.unlockDate).getTime() <= now;

    let stars = 0;
    if (attempt) {
      if (attempt.score >= 90) stars = 3;
      else if (attempt.score >= 60) stars = 2;
      else stars = 1;
    }

    return {
      id: c.id,
      dayNumber: c.dayNumber,
      title: c.title,
      dateLabel: c.dateLabel,
      unlockDate: c.unlockDate,
      isPublished: c.isPublished,
      status: attempt ? 'COMPLETED' : isUnlocked ? 'OPEN' : 'LOCKED',
      stars,
      score: attempt?.score ?? null,
      timeSpentMs: attempt?.timeSpentMs ?? null,
    };
  });
});

// Bắt đầu làm bài Day X -> Lưu startedAt trên Server & Trả đề thi (ẨN correctOptionId chống gian lận)
app.post(
  '/api/challenges/:dayNumber/start',
  { preHandler: [(app as any).authenticate] },
  async (request: any, reply) => {
    const dayNumber = Number(request.params.dayNumber);
    const userId = request.user.sub;
    const challenge = store.getChallengeByDay(dayNumber);

    if (!challenge) {
      return reply.status(404).send({ message: 'Không tìm thấy ngày thử thách này.' });
    }

    const startedAt = store.startQuizSession(userId, dayNumber);

    // Strip correctOptionId & explanation before sending to Frontend
    const sanitizedQuestions = challenge.questions.map((q) => ({
      id: q.id,
      orderIndex: q.orderIndex,
      questionType: q.questionType,
      categoryLabel: q.categoryLabel,
      promptText: q.promptText,
      statementText: q.statementText,
      targetWord: q.targetWord,
      hasPromptAudio: q.hasPromptAudio,
      audioNote: q.audioNote,
      promptAudioUrl: q.promptAudioUrl,
      options: q.options,
      points: q.points,
    }));

    return {
      dayNumber: challenge.dayNumber,
      title: challenge.title,
      dateLabel: challenge.dateLabel,
      startedAt,
      questions: sanitizedQuestions,
    };
  }
);

// Nộp bài & Chấm điểm Server-side (Chống gian lận thời gian + Đáp án)
app.post(
  '/api/challenges/:dayNumber/submit',
  { preHandler: [(app as any).authenticate] },
  async (request: any, reply) => {
    const dayNumber = Number(request.params.dayNumber);
    const userId = request.user.sub;
    const body = request.body as {
      answers: Record<string, 'A' | 'B' | 'C' | 'D'>;
      clientTimeMs?: number;
    };

    const challenge = store.getChallengeByDay(dayNumber);
    if (!challenge) {
      return reply.status(404).send({ message: 'Không tìm thấy thử thách.' });
    }

    const sessionStart = store.getQuizSessionStart(userId, dayNumber);
    const serverElapsedMs = sessionStart ? Math.max(3000, Date.now() - sessionStart) : body.clientTimeMs || 60000;

    let score = 0;
    let correctCount = 0;
    let wrongCount = 0;

    const detailedReview = challenge.questions.map((q) => {
      const selectedOptionId = body.answers?.[q.id] || null;
      const isCorrect = selectedOptionId === q.correctOptionId;
      if (isCorrect) {
        score += q.points;
        correctCount += 1;
      } else {
        wrongCount += 1;
      }

      const correctOption = q.options.find((o) => o.id === q.correctOptionId);
      const selectedOption = q.options.find((o) => o.id === selectedOptionId);

      return {
        questionId: q.id,
        orderIndex: q.orderIndex,
        promptText: q.promptText,
        targetWord: q.targetWord,
        options: q.options,
        selectedOptionId,
        selectedOptionText: selectedOption?.text || 'Chưa chọn',
        correctOptionId: q.correctOptionId,
        correctOptionText: correctOption?.text || '',
        isCorrect,
        explanation: q.explanation,
      };
    });

    const { isFirstOfficialAttempt } = store.recordAttempt({
      id: crypto.randomUUID(),
      userId,
      challengeId: challenge.id,
      dayNumber,
      score,
      correctCount,
      wrongCount,
      timeSpentMs: serverElapsedMs,
      answersDetail: body.answers || {},
      startedAt: new Date(sessionStart || Date.now() - serverElapsedMs).toISOString(),
      completedAt: new Date().toISOString(),
    });

    return {
      dayNumber,
      score,
      totalPoints: challenge.questions.length * 10,
      correctCount,
      wrongCount,
      timeSpentMs: serverElapsedMs,
      isFirstOfficialAttempt,
      detailedReview,
    };
  }
);

// ==================== 3. LEADERBOARD & PROFILE ====================

app.get('/api/leaderboard', { preHandler: [(app as any).authenticate] }, async (request: any) => {
  const userId = request.user.sub;
  const currentUser = store.findUserById(userId);
  const scope = (request.query?.scope as string) || 'company'; // 'company' | 'department'

  const list =
    scope === 'department' && currentUser?.department
      ? store.getLeaderboard(currentUser.department)
      : store.getLeaderboard();

  const myRankItem = list.find((item) => item.id === userId) || null;

  return {
    scope,
    department: currentUser?.department || '',
    topList: list.slice(0, 50),
    myRank: myRankItem,
  };
});

app.get('/api/profile/me', { preHandler: [(app as any).authenticate] }, async (request: any, reply) => {
  const userId = request.user.sub;
  const user = store.findUserById(userId);
  if (!user) {
    return reply.status(404).send({ message: 'Không tìm thấy thông tin nhân viên.' });
  }

  const allRankings = store.getLeaderboard();
  const myRank = allRankings.find((r) => r.id === userId)?.rank || allRankings.length;
  const attempts = store.getUserAttempts(userId);

  return {
    user: {
      id: user.id,
      employeeId: user.employeeId,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      department: user.department,
      avatarUrl: user.avatarUrl,
      role: user.role,
      totalScore: user.totalScore,
      totalTimeMs: user.totalTimeMs,
      completedDays: user.completedDays,
      rank: myRank,
    },
    attempts,
  };
});

// ==================== 4. ADMIN CMS ====================

app.put(
  '/api/admin/challenges/:dayNumber/unlock',
  { preHandler: [(app as any).authenticate] },
  async (request: any, reply) => {
    const dayNumber = Number(request.params.dayNumber);
    const { unlockNow } = request.body as { unlockNow: boolean };
    const challenge = store.getChallengeByDay(dayNumber);
    if (!challenge) {
      return reply.status(404).send({ message: 'Không tìm thấy ngày thử thách.' });
    }

    challenge.unlockDate = unlockNow
      ? new Date(Date.now() - 60000).toISOString()
      : new Date(Date.now() + 86400000 * dayNumber).toISOString();
    store.save();

    return { message: `Đã cập nhật trạng thái mở khóa cho Day ${dayNumber}`, challenge };
  }
);

app.post(
  '/api/admin/reseed',
  { preHandler: [(app as any).authenticate] },
  async () => {
    store.resetAndReseed();
    return {
      message: 'Đã nạp lại (Re-seed) toàn bộ 30 ngày thử thách và Bộ 10 Câu Hỏi chuẩn thành công!',
    };
  }
);

const port = Number(process.env.PORT || 4000);
app.listen({ port, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  console.log(`🚀 Speak Right 2026 Backend API đang chạy tại: ${address}`);
});

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import helmet from '@fastify/helmet';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { store } from './services/store.js';
import { pushService } from './services/pushNotification.js';
import {
  ddosAndBotProtection,
  ipThreatManager,
  sanitizePrototypePollution,
} from './middlewares/ddosProtection.js';
import { sqlInjectionGuard } from './middlewares/sqlInjectionGuard.js';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from './utils/validators.js';
import { sendPasswordResetEmail } from './services/mailer.js';

const UPLOADS_DIR = path.resolve(process.cwd(), 'data', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const app = Fastify({
  logger: true,
  bodyLimit: 1024 * 1024, // 1MB default body limit cho toàn bộ các API thông thường (Chống DDoS cạn kiệt RAM)
  connectionTimeout: 10000, // 10s timeout chống Slowloris
  keepAliveTimeout: 5000,
});
app.server.headersTimeout = 6000;

app.addContentTypeParser('application/json', { parseAs: 'string' }, (req, body, done) => {
  try {
    const str = (body as string)?.trim();
    const json = str ? JSON.parse(str) : {};
    // Chống Prototype Pollution
    const sanitized = sanitizePrototypePollution(json);
    done(null, sanitized);
  } catch (err: any) {
    err.statusCode = 400;
    done(err, undefined);
  }
});

// Helmet: Bảo mật toàn diện HTTP Security Headers
await app.register(helmet, {
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  frameguard: { action: 'deny' }, // Chống Clickjacking
  noSniff: true, // Chống MIME Sniffing
  xssFilter: true, // Bật X-XSS-Protection
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
});

await app.register(cors, {
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: 86400,
});

await app.register(jwt, {
  secret: process.env.JWT_SECRET || 'speak-right-2026-super-secret-jwt-key',
});

// Rate Limit toàn cục: Chống Flood / Brute-force
await app.register(rateLimit, {
  global: true,
  max: 120, // Tối đa 120 reqs / phút / IP
  timeWindow: '1 minute',
  errorResponseBuilder: (request, context) => {
    const ip = request.ip || request.headers['x-forwarded-for']?.toString() || 'unknown';
    ipThreatManager.recordStrike(ip, 1, 'RATE_LIMIT_EXCEEDED');
    return {
      statusCode: 429,
      error: 'TOO_MANY_REQUESTS',
      message: `Quá giới hạn tần suất yêu cầu (${context.max} lượt / ${context.after}). Vui lòng chậm lại!`,
      retryAfter: context.ttl,
    };
  },
});

// Tầng 1: DDoS & Bot Scanner Defense & IP Jail (Chạy ngay tại onRequest)
app.addHook('onRequest', ddosAndBotProtection);

// Tầng 2: WAF SQL Injection Guard (Chạy tại preHandler trước mọi endpoint)
app.addHook('preHandler', sqlInjectionGuard);

app.decorate('authenticate', async (request: any, reply: any) => {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.status(401).send({ message: 'Phiên đăng nhập hết hạn hoặc không hợp lệ.' });
  }
});

app.decorate('requireAdmin', async (request: any, reply: any) => {
  try {
    await request.jwtVerify();
    if (request.user?.role !== 'ADMIN') {
      return reply.status(403).send({ message: 'Chỉ Quản trị viên (Admin) mới có quyền thực hiện thao tác này.' });
    }
  } catch (err) {
    return reply.status(401).send({ message: 'Vui lòng đăng nhập quyền Admin.' });
  }
});

// Phục vụ file Audio (.mp3, .wav) & Video (.mp4, .webm) do Admin tải lên
app.get('/api/uploads/:filename', async (request: any, reply) => {
  const filename = path.basename(request.params.filename);
  const filePath = path.join(UPLOADS_DIR, filename);
  if (!fs.existsSync(filePath)) {
    return reply.status(404).send({ message: 'Không tìm thấy file media.' });
  }
  const ext = path.extname(filename).toLowerCase();
  const mimeMap: Record<string, string> = {
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.m4a': 'audio/mp4',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
  };
  reply.header('Content-Type', mimeMap[ext] || 'application/octet-stream');
  reply.header('Cache-Control', 'public, max-age=86400');
  return reply.send(fs.createReadStream(filePath));
});

app.get('/api/health', async () => {
  return {
    status: 'ok',
    service: 'Speak Right Daily Challenge 2026 API',
    instance: process.env.INSTANCE_ID || 'local-node-1',
    timestamp: new Date().toISOString(),
  };
});

// ==================== 1. AUTHENTICATION & PASSWORD RECOVERY ====================

app.post(
  '/api/auth/register',
  {
    config: {
      rateLimit: {
        max: 8,
        timeWindow: '10 minutes',
      },
    },
  },
  async (request, reply) => {
  const parsed = registerSchema.safeParse(request.body);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message || 'Dữ liệu đăng ký không hợp lệ';
    return reply.status(400).send({ message: firstError, issues: parsed.error.issues });
  }

  const { employeeId, fullName, email, phone, department, password } = parsed.data;

  if (store.findUserByIdentifier(employeeId)) {
    return reply.status(409).send({ message: `Số GEN ${employeeId} đã được đăng ký trên hệ thống!` });
  }
  if (store.findUserByIdentifier(email)) {
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

app.post(
  '/api/auth/login',
  {
    config: {
      rateLimit: {
        max: 10,
        timeWindow: '5 minutes',
      },
    },
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

app.post(
  '/api/auth/forgot-password',
  {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: '15 minutes',
      },
    },
  },
  async (request, reply) => {
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

  const otpCode = String(Math.floor(100000 + Math.random() * 900000));
  const resetToken = crypto.randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

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

app.post(
  '/api/auth/reset-password',
  {
    config: {
      rateLimit: {
        max: 8,
        timeWindow: '15 minutes',
      },
    },
  },
  async (request, reply) => {
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

// ==================== 2. DAILY CHALLENGES & CONCURRENCY LOCK PROTECTION ====================

// ---------- CHẾ ĐỘ KHÁCH (KHÔNG ĐĂNG NHẬP) ----------
// Khách chỉ được: (1) xem & làm bài của NGÀY HÔM NAY (không lưu điểm), (2) xem bảng xếp hạng.
// Các bài ngày trước, lộ trình 30 ngày, hồ sơ... bắt buộc đăng nhập.

app.get('/api/public/today', async () => {
  const c = store.getTodayChallenge();
  if (!c) return { challenge: null };
  return {
    challenge: {
      id: c.id,
      dayNumber: c.dayNumber,
      title: c.title,
      dateLabel: c.dateLabel,
      unlockDate: c.unlockDate,
      endsAt: store.getDayEndDate(c),
      resultsRevealed: false,
      questionCount: c.questions.length,
      status: 'OPEN',
      isCompletedByMe: false,
      stars: 0,
      score: null,
      timeSpentMs: null,
    },
  };
});

app.post('/api/public/challenges/:dayNumber/start', async (request: any, reply) => {
  const dayNumber = Number(request.params.dayNumber);
  const today = store.getTodayChallenge();
  if (!today || today.dayNumber !== dayNumber) {
    return reply.status(403).send({
      code: 'LOGIN_REQUIRED',
      message: 'Khách chỉ được làm bài của ngày hôm nay. Vui lòng đăng nhập để làm các bài khác.',
    });
  }

  const guestSeed = String(request.body?.guestId || crypto.randomUUID());
  const questions = store.buildGuestQuestions(dayNumber, guestSeed).map((q) => ({
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
    promptVideoUrl: q.promptVideoUrl,
    options: q.options,
    points: q.points,
  }));

  return {
    dayNumber: today.dayNumber,
    title: today.title,
    dateLabel: today.dateLabel,
    startedAt: Date.now(),
    isGuest: true,
    questions,
  };
});

app.get('/api/public/leaderboard', async () => {
  const list = store.getLeaderboard();
  return {
    scope: 'company',
    department: '',
    topList: list.slice(0, 50),
    myRank: null,
  };
});

app.get('/api/challenges', { preHandler: [(app as any).authenticate] }, async (request: any) => {
  const userId = request.user.sub;
  const challenges = store.getChallenges();
  const attempts = store.getUserAttempts(userId);
  const activeCounts = store.getAllActiveSessionCounts();

  return challenges.map((c) => {
    const attempt = attempts.find((a) => a.dayNumber === c.dayNumber);
    const isUnlocked = store.isDayUnlocked(c);
    const isEnded = store.isDayEnded(c);
    const endsAt = store.getDayEndDate(c);

    let stars = 0;
    if (attempt && isEnded) {
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
      endsAt,
      resultsRevealed: isEnded,
      isPublished: c.isPublished,
      questionCount: c.questions.length,
      activePlayersCount: activeCounts[c.dayNumber] || 0,
      // Lưu ý: Nếu Admin khóa ngày (isUnlocked = false), trạng thái chuyển về LOCKED kể cả trước đó mở
      status: !isUnlocked ? 'LOCKED' : attempt ? 'COMPLETED' : 'OPEN',
      isCompletedByMe: Boolean(attempt),
      stars,
      score: attempt ? (isEnded ? attempt.score : null) : null,
      timeSpentMs: attempt?.timeSpentMs ?? null,
    };
  });
});

// Bắt đầu làm bài Day X -> Chặn nếu ngày đã khóa, tạo Snapshot đề thi cho phiên làm bài
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

    if (!store.isDayUnlocked(challenge)) {
      return reply.status(403).send({
        message: `${challenge.title} hiện đang khóa! Vui lòng quay lại khi thử thách được mở.`,
      });
    }

    const session = store.startQuizSession(userId, dayNumber);
    if (!session) {
      return reply.status(400).send({ message: 'Không thể khởi tạo phiên làm bài.' });
    }

    const sanitizedQuestions = session.questionsSnapshot.map((q) => ({
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
      promptVideoUrl: q.promptVideoUrl,
      options: q.options,
      points: q.points,
    }));

    return {
      dayNumber: challenge.dayNumber,
      title: challenge.title,
      dateLabel: challenge.dateLabel,
      startedAt: session.startedAt,
      questions: sanitizedQuestions,
    };
  }
);

// API kiểm tra trạng thái phiên làm bài theo thời gian thực (Phát hiện nếu Admin khóa ngày khi đang có người làm)
app.get(
  '/api/challenges/:dayNumber/session-status',
  { preHandler: [(app as any).authenticate] },
  async (request: any, reply) => {
    const dayNumber = Number(request.params.dayNumber);
    const userId = request.user.sub;
    const challenge = store.getChallengeByDay(dayNumber);
    if (!challenge) {
      return reply.status(404).send({ status: 'NOT_FOUND' });
    }

    const session = store.getActiveSession(userId, dayNumber);
    const isUnlocked = store.isDayUnlocked(challenge);

    // Trường hợp 1: Admin thực hiện Khóa Cưỡng Chế (Force Lock) thu hồi ngay lập tức
    if (store.isSessionForceLocked(dayNumber, session?.startedAt)) {
      return {
        status: 'FORCE_LOCKED',
        message:
          '🔒 Ban tổ chức vừa khóa khẩn cấp thử thách này để cập nhật nội dung. Lượt làm hiện tại chưa bị tính, bạn có thể làm lại sau khi mở khóa!',
      };
    }

    // Trường hợp 2: Admin Khóa Mềm (Graceful Lock) trong khi nhân viên này ĐANG làm bài dở
    if (!isUnlocked && session) {
      return {
        status: 'GRACE_PERIOD',
        message:
          '⚠️ Ban tổ chức vừa đóng cổng nhận người mới cho ngày này. Vì bạn đã vào thi trước khi khóa, bạn vẫn được phép hoàn thành và nộp bài bình thường!',
      };
    }

    // Trường hợp 3: Ngày bị khóa và người dùng không có phiên hợp lệ
    if (!isUnlocked && !session) {
      return {
        status: 'FORCE_LOCKED',
        message: '🔒 Ngày thử thách này hiện đã bị khóa.',
      };
    }

    return {
      status: 'ACTIVE',
      message: null,
    };
  }
);

// Nộp bài & Chấm điểm dựa trên Snapshot đề thi lúc bắt đầu (Chống lỗi khi Admin sửa câu hỏi hoặc khóa ngày giữa chừng)
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

    const session = store.getActiveSession(userId, dayNumber);
    const isUnlocked = store.isDayUnlocked(challenge);

    // Nếu Admin đã Force Lock ngày này -> từ chối nộp bài và không tính lượt
    if (store.isSessionForceLocked(dayNumber, session?.startedAt)) {
      return reply.status(423).send({
        code: 'FORCE_LOCKED',
        message:
          '🔒 Ban tổ chức vừa khóa khẩn cấp ngày thi này để cập nhật đề. Lượt làm của bạn chưa bị tính, vui lòng quay lại sau!',
      });
    }

    // Nếu ngày đã bị khóa VÀ người dùng không có phiên làm bài bắt đầu từ trước khi khóa -> chặn
    if (!isUnlocked && !session) {
      return reply.status(403).send({
        code: 'DAY_LOCKED',
        message: 'Thử thách này đã đóng trước khi bạn bắt đầu làm bài.',
      });
    }

    // Chấm điểm dựa trên Snapshot bộ câu hỏi lúc user bắt đầu làm bài (đảm bảo công bằng nếu Admin vừa sửa câu hỏi)
    const questionsToGrade = session?.questionsSnapshot || challenge.questions;
    const serverElapsedMs = session
      ? Math.max(2000, Date.now() - session.startedAt)
      : body.clientTimeMs || 60000;

    let score = 0;
    let correctCount = 0;
    let wrongCount = 0;

    const detailedReview = questionsToGrade.map((q) => {
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
        promptAudioUrl: q.promptAudioUrl,
        promptVideoUrl: q.promptVideoUrl,
        options: q.options,
        selectedOptionId,
        selectedOptionText: selectedOption?.text || 'Chưa chọn',
        correctOptionId: q.correctOptionId,
        correctOptionText: correctOption?.text || '',
        isCorrect,
        explanation: q.explanation,
      };
    });

    const {
      isFirstOfficialAttempt,
      climbedToTop1,
    } = store.recordAttempt({
      id: crypto.randomUUID(),
      userId,
      challengeId: challenge.id,
      dayNumber,
      score,
      correctCount,
      wrongCount,
      timeSpentMs: serverElapsedMs,
      answersDetail: body.answers || {},
      startedAt: new Date(session?.startedAt || Date.now() - serverElapsedMs).toISOString(),
      completedAt: new Date().toISOString(),
    });

    store.completeActiveSession(userId, dayNumber);

    // Chống spam thông báo khi Top 1 đổi ngôi liên tục trong ngày:
    // Hệ thống KHÔNG bắn Push tức thì mỗi lần đổi Top 1 mà tổng hợp thông báo Top 1 hiện tại đúng 1 lần/ngày vào 19h tối.

    const endsAt = store.getDayEndDate(challenge);
    const resultsRevealed = store.isDayEnded(challenge);

    return {
      dayNumber,
      score,
      totalPoints: questionsToGrade.length * 10,
      correctCount,
      wrongCount,
      timeSpentMs: serverElapsedMs,
      isFirstOfficialAttempt,
      climbedToTop1,
      top1PushCampaign: null,
      submittedDuringGracePeriod: !isUnlocked && Boolean(session),
      endsAt,
      resultsRevealed,
      detailedReview,
    };
  }
);

// ==================== 3. LEADERBOARD & PROFILE ====================

app.get('/api/leaderboard', { preHandler: [(app as any).authenticate] }, async (request: any) => {
  const userId = request.user.sub;
  const currentUser = store.findUserById(userId);
  const scope = (request.query?.scope as string) || 'company';

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

// ==================== 4. FULL ADMIN CMS CRUD API (NGÀY THI, CÂU HỎI CHỮ/ÂM THANH/VIDEO, UPLOAD & CONCURRENCY LOCK) ====================

// Lấy chi tiết 1 ngày thi (bao gồm toàn bộ câu hỏi kèm đáp án đúng + danh sách người đang làm bài trực tuyến)
app.get(
  '/api/admin/challenges/:dayNumber',
  { preHandler: [(app as any).requireAdmin] },
  async (request: any, reply) => {
    const dayNumber = Number(request.params.dayNumber);
    const challenge = store.getChallengeByDay(dayNumber);
    if (!challenge) {
      return reply.status(404).send({ message: 'Không tìm thấy ngày thử thách.' });
    }

    const activePlayers = store.getActiveSessionsForDay(dayNumber).map((s) => ({
      userId: s.userId,
      employeeId: s.employeeId,
      fullName: s.fullName,
      startedAt: new Date(s.startedAt).toISOString(),
      elapsedSeconds: Math.floor((Date.now() - s.startedAt) / 1000),
    }));

    return {
      ...challenge,
      isUnlocked: store.isDayUnlocked(challenge),
      activePlayers,
    };
  }
);

// Cập nhật thông tin ngày thi (Tên ngày, Ngày tháng, Mở/Khóa với 2 chế độ: GRACEFUL hoặc FORCE)
app.put(
  '/api/admin/challenges/:dayNumber/unlock',
  { preHandler: [(app as any).requireAdmin] },
  async (request: any, reply) => {
    const dayNumber = Number(request.params.dayNumber);
    const body = request.body as {
      title?: string;
      dateLabel?: string;
      unlockNow?: boolean;
      lockMode?: 'GRACEFUL' | 'FORCE';
    };

    const result = store.updateChallengeDay(dayNumber, body);
    if (!result.challenge) {
      return reply.status(404).send({ message: 'Không tìm thấy ngày thử thách.' });
    }

    let pushCampaign = null;
    let msg = `Đã cập nhật ${result.challenge.title} (${result.challenge.dateLabel})`;
    if (body.unlockNow === false) {
      if (result.lockModeUsed === 'FORCE') {
        msg = `🔒 Đã KHÓA CƯỠNG CHẾ ${result.challenge.title} (Đã dừng ${result.activePlayersAffected} phiên đang làm dở).`;
      } else {
        msg = `🛡️ Đã KHÓA MỀM ${result.challenge.title}: Chặn người mới vào, nhưng vẫn cho phép ${result.activePlayersAffected} người đang làm dở được nộp bài nốt!`;
      }
    } else if (body.unlockNow === true) {
      // Chống tràn lan thông báo khi Admin khóa/mở liên tục:
      // Chỉ tự động gửi nếu trong ngày hôm nay chưa gửi thông báo buổi sáng nào!
      const qStatus = pushService.getQueueStatus();
      if (!qStatus.sentToday.morningNewDay) {
        pushCampaign = pushService.enqueueNewDayUnlocked(result.challenge);
        msg = `🔓 Đã MỞ KHÓA ${result.challenge.title} & gửi thông báo bài mới (1 lần/ngày) chia đều tới ${pushCampaign.totalTargets} thiết bị PWA!`;
      } else {
        msg = `🔓 Đã MỞ KHÓA ${result.challenge.title} (Đã chặn gửi lặp thông báo vì hôm nay đã thông báo bài mới buổi sáng rồi!).`;
      }
    }

    return {
      message: msg,
      challenge: result.challenge,
      activePlayersAffected: result.activePlayersAffected,
      pushCampaign,
    };
  }
);

// Thêm câu hỏi mới vào Day X (Hỗ trợ Chữ, Audio, Video, 2 hoặc 4 đáp án)
app.post(
  '/api/admin/challenges/:dayNumber/questions',
  { preHandler: [(app as any).requireAdmin] },
  async (request: any, reply) => {
    const dayNumber = Number(request.params.dayNumber);
    const body = request.body as any;

    if (!body.promptText?.trim()) {
      return reply.status(400).send({ message: 'Vui lòng nhập nội dung câu hỏi (promptText).' });
    }

    const created = store.addQuestionToDay(dayNumber, {
      questionType: body.questionType || 'LISTEN_AND_CHOOSE',
      categoryLabel: body.categoryLabel || 'Câu hỏi tùy chỉnh',
      promptText: body.promptText.trim(),
      statementText: body.statementText?.trim() || undefined,
      targetWord: body.targetWord?.trim() || '',
      hasPromptAudio: Boolean(body.hasPromptAudio),
      audioNote: body.audioNote || '',
      promptAudioUrl: body.promptAudioUrl?.trim() || undefined,
      promptVideoUrl: body.promptVideoUrl?.trim() || undefined,
      options: Array.isArray(body.options) ? body.options : [],
      correctOptionId: body.correctOptionId || 'A',
      explanation: body.explanation?.trim() || '',
      points: Number(body.points) || 10,
    });

    if (!created) {
      return reply.status(404).send({ message: 'Không tìm thấy ngày thử thách.' });
    }

    return {
      message: `Đã thêm Câu ${created.orderIndex} vào Day ${dayNumber} thành công!`,
      question: created,
    };
  }
);

// Sửa câu hỏi trong Day X (Sửa chữ, âm thanh, video, đáp án, giải thích)
app.put(
  '/api/admin/challenges/:dayNumber/questions/:questionId',
  { preHandler: [(app as any).requireAdmin] },
  async (request: any, reply) => {
    const dayNumber = Number(request.params.dayNumber);
    const questionId = request.params.questionId;
    const body = request.body as any;

    const updated = store.updateQuestionInDay(dayNumber, questionId, {
      questionType: body.questionType,
      categoryLabel: body.categoryLabel,
      promptText: body.promptText,
      statementText: body.statementText,
      targetWord: body.targetWord,
      hasPromptAudio: body.hasPromptAudio,
      audioNote: body.audioNote,
      promptAudioUrl: body.promptAudioUrl,
      promptVideoUrl: body.promptVideoUrl,
      options: body.options,
      correctOptionId: body.correctOptionId,
      explanation: body.explanation,
      points: Number(body.points) || 10,
    });

    if (!updated) {
      return reply.status(404).send({ message: 'Không tìm thấy câu hỏi cần sửa.' });
    }

    return {
      message: `Đã lưu thay đổi cho Câu ${updated.orderIndex} (Day ${dayNumber})!`,
      question: updated,
    };
  }
);

// Xóa câu hỏi khỏi Day X
app.delete(
  '/api/admin/challenges/:dayNumber/questions/:questionId',
  { preHandler: [(app as any).requireAdmin] },
  async (request: any, reply) => {
    const dayNumber = Number(request.params.dayNumber);
    const questionId = request.params.questionId;

    const ok = store.deleteQuestionFromDay(dayNumber, questionId);
    if (!ok) {
      return reply.status(404).send({ message: 'Không tìm thấy câu hỏi cần xóa.' });
    }

    return {
      message: `Đã xóa câu hỏi và cập nhật lại thứ tự câu trong Day ${dayNumber}.`,
    };
  }
);

// Sao chép bộ câu hỏi của Day X sang toàn bộ 30 ngày
app.post(
  '/api/admin/challenges/:dayNumber/clone-to-all',
  { preHandler: [(app as any).requireAdmin] },
  async (request: any) => {
    const dayNumber = Number(request.params.dayNumber);
    const count = store.copyQuestionsToAllDays(dayNumber);
    return {
      message: `Đã đồng bộ bộ câu hỏi của Day ${dayNumber} sang ${count} ngày còn lại!`,
    };
  }
);

// Upload file Audio (.mp3, .wav) hoặc Video (.mp4, .webm) trực tiếp từ máy tính Admin
app.post(
  '/api/admin/upload-media',
  {
    bodyLimit: 35 * 1024 * 1024, // 35MB riêng cho upload media
    preHandler: [(app as any).requireAdmin],
  },
  async (request: any, reply) => {
    const { filename, base64Data } = request.body as {
      filename: string;
      base64Data: string;
    };

    if (!filename || !base64Data) {
      return reply.status(400).send({ message: 'Thiếu dữ liệu file tải lên.' });
    }

    const ext = path.extname(filename).toLowerCase() || '.mp3';
    const safeName = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`;
    const cleanBase64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
    const buffer = Buffer.from(cleanBase64, 'base64');

    fs.writeFileSync(path.join(UPLOADS_DIR, safeName), buffer);

    return {
      message: 'Tải file media lên thành công!',
      url: `/api/uploads/${safeName}`,
    };
  }
);

app.post(
  '/api/admin/reseed',
  { preHandler: [(app as any).requireAdmin] },
  async () => {
    store.resetAndReseed();
    return {
      message: 'Đã nạp lại (Re-seed) toàn bộ 30 ngày thử thách và Bộ 10 Câu Hỏi chuẩn thành công!',
    };
  }
);

// ==================== 5. PWA WEB PUSH NOTIFICATIONS & STAGGERED DISPATCHER (CHIA ĐỀU REQUEST) ====================

// Lấy VAPID Public Key để trình duyệt / PWA đăng ký Web Push
app.get('/api/push/vapid-public-key', async () => {
  return {
    publicKey: pushService.getVapidPublicKey(),
  };
});

// Đăng ký hoặc đồng bộ thiết bị cài đặt PWA với tài khoản người dùng
app.post('/api/push/subscribe', async (request: any, reply) => {
  const body = (request.body || {}) as {
    subscription?: {
      endpoint?: string;
      keys?: { p256dh?: string; auth?: string };
    };
    userId?: string | null;
    employeeId?: string | null;
    fullName?: string | null;
    isPwaInstalled?: boolean;
    userAgent?: string;
  };

  let authUserId: string | null = body.userId || null;
  try {
    await request.jwtVerify();
    if (request.user?.sub) {
      authUserId = request.user.sub;
    }
  } catch {
    // Cho phép cả thiết bị PWA đăng ký trước khi đăng nhập hoặc dùng body.userId
  }

  const endpoint =
    body.subscription?.endpoint ||
    `https://pwa-client.speakright.local/device/${authUserId || crypto.randomUUID().slice(0, 8)}`;

  const record = store.upsertPwaSubscription({
    endpoint,
    keys: body.subscription?.keys,
    userId: authUserId,
    employeeId: body.employeeId || null,
    fullName: body.fullName || null,
    isPwaInstalled: body.isPwaInstalled ?? true,
    userAgent: body.userAgent || (request.headers['user-agent'] as string) || 'PWA Standalone',
  });

  return reply.send({
    message: 'Đã kích hoạt nhận thông báo PWA thành công!',
    subscription: record,
  });
});

// Hủy đăng ký nhận thông báo PWA
app.post('/api/push/unsubscribe', async (request: any) => {
  const { endpoint } = (request.body || {}) as { endpoint?: string };
  if (endpoint) {
    store.removePwaSubscription(endpoint);
  }
  return { message: 'Đã tắt nhận thông báo PWA trên thiết bị này.' };
});

// Đồng bộ thông báo thời gian thực cho các máy đã cài PWA (nhận đúng nhịp chia đều của Queue)
app.get('/api/push/poll', async (request: any) => {
  const since = Number(request.query?.since || 0);
  let userId: string | null = (request.query?.userId as string) || null;
  try {
    await request.jwtVerify();
    if (request.user?.sub) userId = request.user.sub;
  } catch {
    // ignore
  }

  const notifications = store.getRecentInAppNotifications(userId, since);
  return {
    notifications,
    serverTime: Date.now(),
  };
});

// Admin: Xem thống kê thiết bị cài PWA, danh sách tài khoản chưa học & tiến độ rải đều Request Push
app.get(
  '/api/admin/push/status',
  { preHandler: [(app as any).requireAdmin] },
  async () => {
    const pwaSubs = store.getPwaSubscriptions(true);
    const unstudiedList = store.getUnstudiedAccountsWithPwa();
    const leaderboard = store.getLeaderboard();
    const latestDay = store.getLatestUnlockedChallenge();

    return {
      vapidPublicKey: pushService.getVapidPublicKey(),
      queueStatus: pushService.getQueueStatus(),
      stats: {
        totalPwaDevices: pwaSubs.length,
        unstudiedAccountsCount: unstudiedList.length,
        unstudiedAccounts: unstudiedList.map((item) => ({
          id: item.user.id,
          employeeId: item.user.employeeId,
          fullName: item.user.fullName,
          department: item.user.department,
          completedDays: item.user.completedDays,
          totalScore: item.user.totalScore,
          targetDayNumber: item.targetDay.dayNumber,
          targetDayTitle: item.targetDay.title,
          neverStudiedAnyDay: item.neverStudiedAnyDay,
          pwaDevicesCount: item.subscriptions.length,
        })),
        currentTop1: leaderboard[0] || null,
        latestUnlockedDay: {
          dayNumber: latestDay.dayNumber,
          title: latestDay.title,
          dateLabel: latestDay.dateLabel,
        },
      },
      subscriptions: pwaSubs,
      campaigns: store.getPushCampaigns(),
    };
  }
);

// Admin: Cấu hình tốc độ chia đều request & 3 khung giờ thông báo cố định trong ngày (Sáng / 19h / 23h)
app.put(
  '/api/admin/push/config',
  { preHandler: [(app as any).requireAdmin] },
  async (request: any) => {
    const body = (request.body || {}) as {
      spreadWindowSeconds?: number;
      minIntervalMs?: number;
      maxIntervalMs?: number;
      autoRemindUnstudied?: boolean;
      morningHour?: number;
      eveningTop1Hour?: number;
      nightUnstudiedHour?: number;
      resetTodayQuota?: boolean;
    };

    const updated = store.updatePushConfig({
      ...(body.spreadWindowSeconds !== undefined
        ? { spreadWindowSeconds: Math.max(3, Math.min(3600, Number(body.spreadWindowSeconds))) }
        : {}),
      ...(body.minIntervalMs !== undefined
        ? { minIntervalMs: Math.max(200, Math.min(30000, Number(body.minIntervalMs))) }
        : {}),
      ...(body.maxIntervalMs !== undefined
        ? { maxIntervalMs: Math.max(500, Math.min(60000, Number(body.maxIntervalMs))) }
        : {}),
      ...(body.autoRemindUnstudied !== undefined
        ? { autoRemindUnstudied: Boolean(body.autoRemindUnstudied) }
        : {}),
      ...(body.morningHour !== undefined
        ? { morningHour: Math.max(0, Math.min(23, Number(body.morningHour))) }
        : {}),
      ...(body.eveningTop1Hour !== undefined
        ? { eveningTop1Hour: Math.max(0, Math.min(23, Number(body.eveningTop1Hour))) }
        : {}),
      ...(body.nightUnstudiedHour !== undefined
        ? { nightUnstudiedHour: Math.max(0, Math.min(23, Number(body.nightUnstudiedHour))) }
        : {}),
      ...(body.resetTodayQuota
        ? {
            lastMorningNotifiedDate: null,
            lastEveningTop1NotifiedDate: null,
            lastNightUnstudiedNotifiedDate: null,
          }
        : {}),
    });

    return {
      message: `Đã lưu cấu hình lịch thông báo ngày (${updated.morningHour}h sáng bài mới • ${updated.eveningTop1Hour}h tối Top 1 • ${updated.nightUnstudiedHour}h tối nhắc USER chưa làm) & chia đều ${updated.spreadWindowSeconds}s!`,
      config: updated,
    };
  }
);

// Admin: Phát lệnh Push thông báo chia đều request cho 3 kịch bản cố định trong ngày
app.post(
  '/api/admin/push/trigger',
  { preHandler: [(app as any).requireAdmin] },
  async (request: any, reply) => {
    const { type, dayNumber, force } = (request.body || {}) as {
      type: 'NEW_DAY_UNLOCKED' | 'NEW_TOP_1' | 'UNSTUDIED_REMINDER';
      dayNumber?: number;
      force?: boolean;
    };

    const qStatus = pushService.getQueueStatus();

    if (type === 'NEW_DAY_UNLOCKED') {
      if (qStatus.sentToday.morningNewDay && !force) {
        return reply.status(429).send({
          alreadySentToday: true,
          message:
            '🛡️ Chống spam: Hôm nay đã gửi thông báo "Có bài mới buổi sáng" (1 lần/ngày) rồi! Bấm "Gửi lại (Force)" nếu bạn vẫn muốn phát thêm.',
        });
      }
      const targetDay =
        (dayNumber ? store.getChallengeByDay(Number(dayNumber)) : undefined) ||
        store.getLatestUnlockedChallenge();
      const campaign = pushService.enqueueNewDayUnlocked(targetDay);
      return {
        message: `🌅 Đang chia đều ${campaign.totalTargets} request thông báo buổi sáng: Có bài mới (${targetDay.title}) — Cách nhau ${campaign.staggerIntervalMs}ms/request!`,
        campaign,
      };
    }

    if (type === 'NEW_TOP_1') {
      if (qStatus.sentToday.evening19hTop1 && !force) {
        return reply.status(429).send({
          alreadySentToday: true,
          message:
            '🛡️ Chống spam: Hôm nay đã gửi thông báo "Top 1 hiện tại lúc 19h tối" (1 lần/ngày) rồi! Bấm "Gửi lại (Force)" nếu bạn vẫn muốn phát thêm.',
        });
      }
      const lb = store.getLeaderboard();
      const top1 = lb[0];
      const top2 = lb[1] || null;
      if (!top1) {
        return reply.status(400).send({ message: 'Chưa có dữ liệu Bảng xếp hạng.' });
      }
      const campaign = pushService.enqueueNewTop1(top1, top2);
      return {
        message: `👑 Đang chia đều ${campaign.totalTargets} request bản tin 19h tối: Top 1 hiện tại (${top1.fullName}) tới toàn bộ PWA (Cách nhau ${campaign.staggerIntervalMs}ms/request)!`,
        campaign,
      };
    }

    if (type === 'UNSTUDIED_REMINDER') {
      if (qStatus.sentToday.night23hUnstudied && !force) {
        return reply.status(429).send({
          alreadySentToday: true,
          message:
            '🛡️ Chống spam: Hôm nay đã gửi thông báo "23h tối nhắc USER chưa làm bài" (1 lần/ngày) rồi! Bấm "Gửi lại (Force)" nếu bạn vẫn muốn phát thêm.',
        });
      }
      const campaign = pushService.enqueueUnstudiedAccountsReminder();
      return {
        message:
          campaign.totalTargets > 0
            ? `⏰ Đang chia đều ${campaign.totalTargets} request lúc 23h tối nhắc các tài khoản USER cài PWA mà chưa làm bài (Cách nhau ${campaign.staggerIntervalMs}ms/request)!`
            : '🎉 Tuyệt vời! Tất cả tài khoản USER cài PWA đều đã hoàn thành bài học hôm nay.',
        campaign,
      };
    }

    return reply.status(400).send({ message: 'Loại thông báo Push không hợp lệ.' });
  }
);

// ==================== 5. BẢO MẬT HỆ THỐNG: THỐNG KÊ MỐI ĐE DỌA & QUẢN TRỊ IP BANNED ====================

app.get(
  '/api/admin/security/stats',
  { preHandler: [(app as any).requireAdmin] },
  async () => {
    return {
      timestamp: new Date().toISOString(),
      threatStats: ipThreatManager.getStats(),
      serverSecurity: {
        sqlInjectionProtection: 'ACTIVE (Deep Recursive WAF + Auto-ban on SQLi)',
        antiF12AndDevTools: 'ACTIVE (Keyboard, ContextMenu, Metrics & Debugger Traps)',
        ddosDefense: 'ACTIVE (IP Jail, Burst Limiter, Tiered Rate-Limit, Slowloris Timeouts)',
        securityHeaders: 'ACTIVE (Helmet HSTS, NoSniff, X-Frame DENY)',
      },
    };
  }
);

app.post(
  '/api/admin/security/unban',
  { preHandler: [(app as any).requireAdmin] },
  async (request: any, reply) => {
    const { ip } = (request.body || {}) as { ip?: string };
    if (!ip) {
      return reply.status(400).send({ message: 'Vui lòng cung cấp địa chỉ IP cần gỡ cấm.' });
    }
    ipThreatManager.unbanIp(ip);
    return { message: `Đã mở khóa IP ${ip} thành công!` };
  }
);

// Khởi động bộ lập lịch tự động kiểm tra Mở khóa ngày mới & Nhắc người chưa học
pushService.startAutoScheduler();

const port = Number(process.env.PORT || 4000);
app.listen({ port, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  console.log(`🚀 Speak Right 2026 Backend API đang chạy tại: ${address}`);
});

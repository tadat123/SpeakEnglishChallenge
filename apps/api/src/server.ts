import 'dotenv/config';
import fs from 'fs';
import path from 'path';
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

const UPLOADS_DIR = path.resolve(process.cwd(), 'data', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const app = Fastify({
  logger: true,
  bodyLimit: 30 * 1024 * 1024, // Cho phép tải lên file Audio/Video tối đa 30MB
});

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
  max: 250,
  timeWindow: '1 minute',
});

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

app.post('/api/auth/register', async (request, reply) => {
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

app.post('/api/auth/login', async (request, reply) => {
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

// ==================== 2. DAILY CHALLENGES & CONCURRENCY LOCK PROTECTION ====================

app.get('/api/challenges', { preHandler: [(app as any).authenticate] }, async (request: any) => {
  const userId = request.user.sub;
  const challenges = store.getChallenges();
  const attempts = store.getUserAttempts(userId);
  const activeCounts = store.getAllActiveSessionCounts();

  return challenges.map((c) => {
    const attempt = attempts.find((a) => a.dayNumber === c.dayNumber);
    const isUnlocked = store.isDayUnlocked(c);

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
      questionCount: c.questions.length,
      activePlayersCount: activeCounts[c.dayNumber] || 0,
      // Lưu ý: Nếu Admin khóa ngày (isUnlocked = false), trạng thái chuyển về LOCKED kể cả trước đó mở
      status: !isUnlocked ? 'LOCKED' : attempt ? 'COMPLETED' : 'OPEN',
      isCompletedByMe: Boolean(attempt),
      stars,
      score: attempt?.score ?? null,
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
      startedAt: new Date(session?.startedAt || Date.now() - serverElapsedMs).toISOString(),
      completedAt: new Date().toISOString(),
    });

    store.completeActiveSession(userId, dayNumber);

    return {
      dayNumber,
      score,
      totalPoints: questionsToGrade.length * 10,
      correctCount,
      wrongCount,
      timeSpentMs: serverElapsedMs,
      isFirstOfficialAttempt,
      submittedDuringGracePeriod: !isUnlocked && Boolean(session),
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

    let msg = `Đã cập nhật ${result.challenge.title} (${result.challenge.dateLabel})`;
    if (body.unlockNow === false) {
      if (result.lockModeUsed === 'FORCE') {
        msg = `🔒 Đã KHÓA CƯỠNG CHẾ ${result.challenge.title} (Đã dừng ${result.activePlayersAffected} phiên đang làm dở).`;
      } else {
        msg = `🛡️ Đã KHÓA MỀM ${result.challenge.title}: Chặn người mới vào, nhưng vẫn cho phép ${result.activePlayersAffected} người đang làm dở được nộp bài nốt!`;
      }
    } else if (body.unlockNow === true) {
      msg = `🔓 Đã MỞ KHÓA ${result.challenge.title} cho nhân viên vào làm bài!`;
    }

    return {
      message: msg,
      challenge: result.challenge,
      activePlayersAffected: result.activePlayersAffected,
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
  { preHandler: [(app as any).requireAdmin] },
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

const port = Number(process.env.PORT || 4000);
app.listen({ port, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  console.log(`🚀 Speak Right 2026 Backend API đang chạy tại: ${address}`);
});

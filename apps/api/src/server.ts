import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import helmet from '@fastify/helmet';
import { store } from './services/store.js';
import { pushService } from './services/pushNotification.js';
import {
  ddosAndBotProtection,
  resolveClientIp,
  sanitizePrototypePollution,
} from './middlewares/ddosProtection.js';
import { sqlInjectionGuard } from './middlewares/sqlInjectionGuard.js';
import { registerAuthRoutes } from './routes/authRoutes.js';
import { registerChallengeRoutes } from './routes/challengeRoutes.js';
import { registerAdminUsersSecurityRoutes } from './routes/adminUsersSecurityRoutes.js';
import { registerAdminChallengeRoutes } from './routes/adminChallengeRoutes.js';
import { registerPushAndEventRoutes } from './routes/pushAndEventRoutes.js';

const resolveUploadsDir = () => {
  const fromRepoRoot = path.resolve(process.cwd(), 'apps', 'api', 'data', 'uploads');
  if (fs.existsSync(path.resolve(process.cwd(), 'apps', 'api'))) {
    return fromRepoRoot;
  }
  return path.resolve(process.cwd(), 'data', 'uploads');
};

const UPLOADS_DIR = resolveUploadsDir();
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const app = Fastify({
  logger: true,
  trustProxy: true,
  bodyLimit: 1024 * 1024,
  connectionTimeout: 10000,
  keepAliveTimeout: 5000,
});
app.server.headersTimeout = 6000;

app.addContentTypeParser('application/json', { parseAs: 'string' }, (_req, body, done) => {
  try {
    const str = (body as string)?.trim();
    const json = str ? JSON.parse(str) : {};
    done(null, sanitizePrototypePollution(json));
  } catch (err: any) {
    err.statusCode = 400;
    done(err, undefined);
  }
});

await app.register(helmet, {
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  frameguard: { action: 'deny' },
  noSniff: true,
  xssFilter: true,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
});

await app.register(cors, {
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'X-LoadTest-IP',
    'X-LoadTest-Secret',
  ],
  maxAge: 86400,
});

await app.register(jwt, {
  secret: process.env.JWT_SECRET || 'speak-right-2026-super-secret-jwt-key',
});

await app.register(rateLimit, {
  global: true,
  max: 1500,
  timeWindow: '1 minute',
  keyGenerator: (request) => resolveClientIp(request),
  errorResponseBuilder: (_request, context) => {
    return {
      statusCode: 429,
      error: 'TOO_MANY_REQUESTS',
      message: `Quá giới hạn tần suất yêu cầu (${context.max} lượt / ${context.after}). Vui lòng chậm lại!`,
      retryAfter: context.ttl,
    };
  },
});

app.addHook('onRequest', ddosAndBotProtection);
app.addHook('preHandler', sqlInjectionGuard);

// Đồng bộ trạng thái tức thì từ PostgreSQL giữa các container api-1, api-2, api-3 (100% Database Mode)
app.addHook('preHandler', async (request) => {
  if (
    request.url.startsWith('/api/admin') ||
    request.url.startsWith('/api/event-status') ||
    request.url.startsWith('/api/public/today') ||
    request.method !== 'GET'
  ) {
    await store.checkPostgresVersion();
  }
});

// Đảm bảo mọi lệnh ghi (POST/PUT/PATCH/DELETE) đã commit xong vào PostgreSQL trước khi trả HTTP response
app.addHook('onSend', async (request, _reply, payload) => {
  if (request.method === 'POST' || request.method === 'PUT' || request.method === 'PATCH' || request.method === 'DELETE') {
    await store.waitForPendingWrites();
  }
  return payload;
});

app.decorate('authenticate', async (request: any, reply: any) => {
  try {
    await request.jwtVerify();
  } catch {
    reply.status(401).send({ message: 'Phiên đăng nhập hết hạn hoặc không hợp lệ.' });
  }
});

app.decorate('requireAdmin', async (request: any, reply: any) => {
  try {
    await request.jwtVerify();
    if (request.user?.role !== 'ADMIN') {
      return reply
        .status(403)
        .send({ message: 'Chỉ Quản trị viên (Admin) mới có quyền thực hiện thao tác này.' });
    }
  } catch {
    return reply.status(401).send({ message: 'Vui lòng đăng nhập quyền Admin.' });
  }
});

app.get('/api/uploads/:filename', async (request: any, reply) => {
  const filename = path.basename(request.params.filename);
  const filePath = path.join(UPLOADS_DIR, filename);
  if (!fs.existsSync(filePath)) {
    return reply.status(404).send({ message: 'Không tìm thấy file media.' });
  }
  const ext = path.extname(filename).toLowerCase();
  const mimeMap: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.avif': 'image/avif',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.m4a': 'audio/mp4',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
  };
  reply.header('Content-Type', mimeMap[ext] || 'application/octet-stream');
  reply.header('Access-Control-Allow-Origin', '*');
  reply.header('Cross-Origin-Resource-Policy', 'cross-origin');
  reply.header('Cache-Control', 'public, max-age=86400');
  return reply.send(fs.createReadStream(filePath));
});

const SERVER_BOOT_TIME = new Date().toISOString();
const API_VERSION = '1.0.1';

app.get('/api/health', async () => ({
  status: 'ok',
  version: API_VERSION,
  service: 'Speak Right Daily Challenge 2026 API',
  instance: process.env.INSTANCE_ID || 'local-node-1',
  serverBootTime: SERVER_BOOT_TIME,
  dbMtime: store.getLastMtime(),
  timestamp: new Date().toISOString(),
}));

app.get('/api/public/version', async (_request, reply: any) => {
  reply.header('Cache-Control', 'no-store, no-cache, must-revalidate');
  const latestDay = store.getLatestUnlockedChallenge();
  return {
    version: API_VERSION,
    instance: process.env.INSTANCE_ID || 'local-node-1',
    serverBootTime: SERVER_BOOT_TIME,
    dbMtime: store.getLastMtime(),
    latestUnlockedDay: latestDay ? latestDay.dayNumber : 1,
    timestamp: new Date().toISOString(),
  };
});

registerAuthRoutes(app);
registerChallengeRoutes(app);
registerAdminUsersSecurityRoutes(app);
registerAdminChallengeRoutes(app, UPLOADS_DIR);
registerPushAndEventRoutes(app, SERVER_BOOT_TIME);

const isCronLeader =
  process.env.IS_CRON_LEADER !== 'false' &&
  (process.env.IS_CRON_LEADER === 'true' ||
    process.env.INSTANCE_ID === 'api-1' ||
    !process.env.INSTANCE_ID);

if (isCronLeader) {
  console.log(
    `[Push Scheduler] 👑 Instance [${process.env.INSTANCE_ID || 'standalone'}] là CRON LEADER -> Khởi động bộ lập lịch thông báo tự động (07:00 TOP 1 & Bài mới, 19:00 Khen ngợi, 21:00 Cảnh báo chưa làm bài).`
  );
  pushService.startAutoScheduler();
} else {
  console.log(
    `[Push Scheduler] 🛡️ Instance [${process.env.INSTANCE_ID}] là WORKER REPLICA -> Bỏ qua lập lịch tự động để tránh gửi lặp thông báo qua các server.`
  );
}

const port = Number(process.env.PORT || 4000);
app.listen({ port, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  console.log(`🚀 Speak Right 2026 Backend API đang chạy tại: ${address}`);
});

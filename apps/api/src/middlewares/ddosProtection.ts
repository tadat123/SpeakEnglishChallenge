/**
 * DDoS & Threat Protection Middleware for Fastify
 * Phòng vệ từ chối dịch vụ (DDoS), giới hạn tần suất (Rate Limiting), phát hiện Bot Scanner và Tự động Banned IP (Jail).
 */

import type { FastifyRequest, FastifyReply } from 'fastify';

// Danh sách đường dẫn dò quét lỗ hổng bot hay quét
const SCANNER_PROBE_PATHS = [
  '/.env',
  '/.git',
  '/wp-admin',
  '/wp-login.php',
  '/phpmyadmin',
  '/actuator',
  '/.aws',
  '/config.json',
  '/id_rsa',
  '/eval-stdin.php',
  '/solr',
  '/debug/default/view',
];

const LOADTEST_SECRET = process.env.LOADTEST_SECRET || 'speakright-k6-2026';

/**
 * Kiểm tra IP nội bộ Docker / Localhost (Tuyệt đối KHÔNG BAO GIỜ khóa IP của Nginx hay Cloudflared nội bộ)
 */
export function isInternalOrPrivateIp(ip: string): boolean {
  if (!ip) return true;
  const clean = ip.trim().toLowerCase();
  return (
    clean === '127.0.0.1' ||
    clean === '::1' ||
    clean === 'localhost' ||
    clean === 'unknown' ||
    clean.startsWith('10.') ||
    clean.startsWith('192.168.') ||
    clean.startsWith('172.') ||
    clean.startsWith('::ffff:127.') ||
    clean.startsWith('::ffff:10.') ||
    clean.startsWith('::ffff:172.') ||
    clean.startsWith('::ffff:192.168.')
  );
}

/**
 * Trích xuất IP thật của người dùng qua Cloudflare Tunnel -> Nginx -> Fastify
 * Hỗ trợ header X-LoadTest-IP (kèm X-LoadTest-Secret) để k6 có thể giả lập 2.000 nhân viên từ 2.000 IP khác nhau
 */
export function resolveClientIp(request: FastifyRequest): string {
  const ltSecret = request.headers['x-loadtest-secret'];
  const ltIp = request.headers['x-loadtest-ip'];
  if (ltSecret === LOADTEST_SECRET && typeof ltIp === 'string' && ltIp.trim()) {
    return ltIp.trim();
  }

  const cfIp = request.headers['cf-connecting-ip'];
  if (typeof cfIp === 'string' && cfIp.trim()) {
    return cfIp.trim();
  }

  const xff = request.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.trim()) {
    const firstIp = xff.split(',')[0]?.trim();
    if (firstIp) return firstIp;
  }

  const xRealIp = request.headers['x-real-ip'];
  if (typeof xRealIp === 'string' && xRealIp.trim()) {
    return xRealIp.trim();
  }

  return request.ip || 'unknown';
}

class IpThreatManager {
  // IP bị cấm tạm thời: ip -> { bannedUntil, reason, strikes }
  private bannedIps = new Map<string, { bannedUntil: number; reason: string; strikes: number }>();
  // Điểm vi phạm tích lũy: ip -> { count, lastStrike }
  private strikes = new Map<string, { count: number; lastStrike: number }>();
  // Bộ đếm lưu lượng Burst tức thời: ip -> { timestamps: number[] }
  private burstTracker = new Map<string, { timestamps: number[] }>();

  // Cấu hình đã tối ưu cho mạng NAT doanh nghiệp (nhiều nhân viên chung 1 IP Wi-Fi công ty)
  private readonly BAN_DURATION_MS = 15 * 60 * 1000; // Khóa 15 phút với bot quét lỗ hổng
  private readonly STRIKE_THRESHOLD = 12; // 12 vi phạm liên tiếp mới khóa IP
  private readonly STRIKE_RESET_WINDOW_MS = 10 * 60 * 1000; // Reset điểm vi phạm sau 10 phút
  private readonly BURST_WINDOW_MS = 1000; // Cửa sổ kiểm tra lưu lượng burst: 1 giây
  private readonly BURST_MAX_REQUESTS = 350; // Tối đa 350 requests/giây từ 1 IP (đủ cho cả phòng ban mở app cùng lúc)

  constructor() {
    // Dọn dẹp định kỳ mỗi 5 phút để tránh rò rỉ bộ nhớ
    setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * Kiểm tra xem IP có đang bị cấm hay không
   */
  public isBanned(ip: string): { banned: boolean; remainingSeconds?: number; reason?: string } {
    if (isInternalOrPrivateIp(ip)) {
      return { banned: false };
    }

    const record = this.bannedIps.get(ip);
    if (!record) return { banned: false };

    const now = Date.now();
    if (now > record.bannedUntil) {
      this.bannedIps.delete(ip);
      this.strikes.delete(ip);
      return { banned: false };
    }

    const remainingSeconds = Math.ceil((record.bannedUntil - now) / 1000);
    return { banned: true, remainingSeconds, reason: record.reason };
  }

  /**
   * Khóa IP thủ công hoặc tự động
   */
  public banIp(ip: string, durationMs = this.BAN_DURATION_MS, reason = 'EXCESSIVE_VIOLATIONS') {
    if (isInternalOrPrivateIp(ip)) return;

    this.bannedIps.set(ip, {
      bannedUntil: Date.now() + durationMs,
      reason,
      strikes: this.STRIKE_THRESHOLD,
    });
  }

  /**
   * Mở khóa IP
   */
  public unbanIp(ip: string) {
    this.bannedIps.delete(ip);
    this.strikes.delete(ip);
  }

  /**
   * Ghi nhận một hành vi vi phạm (Strike)
   */
  public recordStrike(ip: string, points = 1, reason = 'SUSPICIOUS_BEHAVIOR') {
    if (isInternalOrPrivateIp(ip)) return;

    const now = Date.now();
    const current = this.strikes.get(ip) || { count: 0, lastStrike: now };

    if (now - current.lastStrike > this.STRIKE_RESET_WINDOW_MS) {
      current.count = 0;
    }

    current.count += points;
    current.lastStrike = now;
    this.strikes.set(ip, current);

    if (current.count >= this.STRIKE_THRESHOLD) {
      this.banIp(ip, this.BAN_DURATION_MS, `Tích lũy ${current.count} điểm vi phạm bảo mật (${reason})`);
    }
  }

  /**
   * Kiểm tra và phòng chống tấn công lũ lụt xung kích (Burst Flood Protection)
   */
  public checkBurstExceeded(ip: string): boolean {
    if (isInternalOrPrivateIp(ip)) return false;

    const now = Date.now();
    let tracker = this.burstTracker.get(ip);
    if (!tracker) {
      tracker = { timestamps: [] };
      this.burstTracker.set(ip, tracker);
    }

    tracker.timestamps = tracker.timestamps.filter((t) => now - t < this.BURST_WINDOW_MS);
    tracker.timestamps.push(now);

    if (tracker.timestamps.length > this.BURST_MAX_REQUESTS) {
      this.recordStrike(ip, 1, 'BURST_FLOOD_ATTACK');
      return true;
    }

    return false;
  }

  /**
   * Lấy số liệu thống kê danh sách IP bị khóa
   */
  public getStats() {
    const now = Date.now();
    const activeBans: Array<{ ip: string; remainingSeconds: number; reason: string }> = [];

    for (const [ip, item] of this.bannedIps.entries()) {
      if (item.bannedUntil > now) {
        activeBans.push({
          ip,
          remainingSeconds: Math.ceil((item.bannedUntil - now) / 1000),
          reason: item.reason,
        });
      }
    }

    return {
      totalBannedCount: activeBans.length,
      bannedIps: activeBans,
    };
  }

  private cleanup() {
    const now = Date.now();
    for (const [ip, item] of this.bannedIps.entries()) {
      if (item.bannedUntil <= now) {
        this.bannedIps.delete(ip);
      }
    }
    for (const [ip, item] of this.strikes.entries()) {
      if (now - item.lastStrike > this.STRIKE_RESET_WINDOW_MS) {
        this.strikes.delete(ip);
      }
    }
    this.burstTracker.clear();
  }
}

export const ipThreatManager = new IpThreatManager();

/**
 * Fastify Hook: ddosAndBotProtection
 * Chạy ngay tại tầng `onRequest` (trước khi parse body hay xử lý routing) để tiết kiệm 100% CPU/RAM
 */
export async function ddosAndBotProtection(request: FastifyRequest, reply: FastifyReply) {
  const ip = resolveClientIp(request);

  // 1. Kiểm tra IP trong danh sách Banned Jail
  const banStatus = ipThreatManager.isBanned(ip);
  if (banStatus.banned) {
    reply.header('Retry-After', banStatus.remainingSeconds || 900);
    return reply.status(429).send({
      statusCode: 429,
      error: 'IP_BANNED',
      code: 'DDOS_DEFENSE_JAIL',
      message: `Địa chỉ IP của bạn tạm thời bị khóa do phát hiện hành vi tấn công hoặc lưu lượng bất thường. Vui lòng thử lại sau ${banStatus.remainingSeconds} giây.`,
      reason: banStatus.reason,
    });
  }

  // 2. Chặn đứng các Bot quét lỗ hổng mã nguồn (Scanner Probe Detection)
  const lowerUrl = request.url.toLowerCase();
  for (const probe of SCANNER_PROBE_PATHS) {
    if (lowerUrl.includes(probe)) {
      ipThreatManager.recordStrike(ip, 4, `SCANNER_PROBE_${probe}`);
      request.log.warn({ ip, url: request.url }, `[DDoS Guard] Đã phát hiện và chặn bot quét lỗ hổng ${probe}`);
      return reply.status(403).send({
        statusCode: 403,
        error: 'FORBIDDEN',
        message: 'Yêu cầu bị từ chối do vi phạm quy tắc an toàn bảo mật.',
      });
    }
  }

  // 3. Kiểm tra Burst Flood (>350 req/giây từ 1 IP)
  if (ipThreatManager.checkBurstExceeded(ip)) {
    request.log.warn({ ip }, `[DDoS Guard] Phát hiện Burst Flood từ IP ${ip}`);
    return reply.status(429).send({
      statusCode: 429,
      error: 'TOO_MANY_REQUESTS',
      code: 'BURST_LIMIT_EXCEEDED',
      message: 'Tốc độ gửi yêu cầu quá nhanh! Vui lòng giảm tần suất thao tác để tránh nghẽn hệ thống.',
    });
  }
}

/**
 * Loại bỏ các thuộc tính nguy hiểm có thể gây Prototype Pollution trong JSON
 */
export function sanitizePrototypePollution(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(sanitizePrototypePollution);
  }

  const clean: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      continue;
    }
    clean[key] = sanitizePrototypePollution(obj[key]);
  }
  return clean;
}

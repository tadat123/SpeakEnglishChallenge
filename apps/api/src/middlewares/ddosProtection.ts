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

class IpThreatManager {
  // IP bị cấm tạm thời: ip -> { bannedUntil, reason, strikes }
  private bannedIps = new Map<string, { bannedUntil: number; reason: string; strikes: number }>();
  // Điểm vi phạm tích lũy: ip -> { count, lastStrike }
  private strikes = new Map<string, { count: number; lastStrike: number }>();
  // Bộ đếm lưu lượng Burst tức thời: ip -> { timestamps: number[] }
  private burstTracker = new Map<string, { timestamps: number[] }>();

  // Cấu hình
  private readonly BAN_DURATION_MS = 30 * 60 * 1000; // Khóa 30 phút
  private readonly STRIKE_THRESHOLD = 3; // 3 vi phạm là khóa IP
  private readonly STRIKE_RESET_WINDOW_MS = 15 * 60 * 1000; // Reset điểm vi phạm sau 15 phút không tái phạm
  private readonly BURST_WINDOW_MS = 1000; // Cửa sổ kiểm tra lưu lượng burst: 1 giây
  private readonly BURST_MAX_REQUESTS = 35; // Tối đa 35 requests/giây từ 1 IP

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
    if (!ip || ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') {
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
    if (!ip || ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') return;

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
    if (!ip || ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') return;

    const now = Date.now();
    const current = this.strikes.get(ip) || { count: 0, lastStrike: now };

    // Nếu lần vi phạm trước đã quá 15 phút thì reset điểm
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
    if (!ip || ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') return false;

    const now = Date.now();
    let tracker = this.burstTracker.get(ip);
    if (!tracker) {
      tracker = { timestamps: [] };
      this.burstTracker.set(ip, tracker);
    }

    // Giữ lại các request trong cửa sổ 1 giây
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
  const ip = request.ip || request.headers['x-forwarded-for']?.toString() || 'unknown';

  // 1. Kiểm tra IP trong danh sách Banned Jail
  const banStatus = ipThreatManager.isBanned(ip);
  if (banStatus.banned) {
    reply.header('Retry-After', banStatus.remainingSeconds || 1800);
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
      ipThreatManager.recordStrike(ip, 2, `SCANNER_PROBE_${probe}`);
      request.log.warn({ ip, url: request.url }, `[DDoS Guard] Đã phát hiện và chặn bot quét lỗ hổng ${probe}`);
      return reply.status(403).send({
        statusCode: 403,
        error: 'FORBIDDEN',
        message: 'Yêu cầu bị từ chối do vi phạm quy tắc an toàn bảo mật.',
      });
    }
  }

  // 3. Kiểm tra Burst Flood (>35 req/giây)
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

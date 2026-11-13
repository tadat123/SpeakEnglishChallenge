import { FastifyInstance } from 'fastify';
import { store } from '../services/store.js';
import { pushService } from '../services/pushNotification.js';
import { ipThreatManager } from '../middlewares/ddosProtection.js';

export function registerAdminUsersSecurityRoutes(app: FastifyInstance) {
  app.get(
    '/api/admin/dashboard/stats',
    { preHandler: [(app as any).requireAdmin] },
    async (request: any) => {
      const day = request.query?.day ? parseInt(request.query.day, 10) : undefined;
      return await store.getDashboardStats(day);
    }
  );

  app.get(
    '/api/admin/users',
    { preHandler: [(app as any).requireAdmin] },
    async (request: any) => {
      const search = (request.query?.search as string) || '';
      return { users: await store.getAdminUsers(search) };
    }
  );

  app.get(
    '/api/admin/users/:userId/details',
    { preHandler: [(app as any).requireAdmin] },
    async (request: any, reply) => {
      const details = await store.getAdminUserDetails(request.params.userId);
      if (!details) {
        return reply.status(404).send({ message: 'Không tìm thấy người dùng' });
      }
      return details;
    }
  );

  app.delete(
    '/api/admin/users/:userId',
    { preHandler: [(app as any).requireAdmin] },
    async (request: any, reply) => {
      const ok = await store.deleteUser(request.params.userId);
      if (!ok) {
        return reply.status(404).send({ message: 'Không tìm thấy người dùng cần xóa.' });
      }
      return { message: 'Đã xóa tài khoản người dùng thành công!' };
    }
  );

  app.post(
    '/api/admin/users/:userId/reset-password',
    { preHandler: [(app as any).requireAdmin] },
    async (request: any, reply) => {
      const { newPassword } = request.body || {};
      if (!newPassword || newPassword.length < 6) {
        return reply.status(400).send({ message: 'Mật khẩu mới phải có ít nhất 6 ký tự.' });
      }
      const ok = await store.adminResetUserPassword(request.params.userId, newPassword);
      if (!ok) {
        return reply.status(404).send({ message: 'Không tìm thấy người dùng cần đổi mật khẩu.' });
      }
      return { message: 'Đã đặt lại mật khẩu thành công cho người dùng!' };
    }
  );

  app.post(
    '/api/admin/users/:userId/reset-progress',
    { preHandler: [(app as any).requireAdmin] },
    async (request: any, reply) => {
      const ok = await store.adminResetUserProgress(request.params.userId);
      if (!ok) {
        return reply.status(404).send({ message: 'Không tìm thấy người dùng cần reset tiến độ.' });
      }
      return { message: 'Đã xóa lịch sử bài thi và reset điểm của người dùng về 0!' };
    }
  );

  app.post(
    '/api/admin/notifications/send',
    { preHandler: [(app as any).requireAdmin] },
    async (request: any, reply) => {
      const { targetType, targetValue, notifType, title, body, targetUrl } = request.body || {};
      if (!title?.trim() || !body?.trim()) {
        return reply.status(400).send({ success: false, message: 'Tiêu đề và nội dung thông báo là bắt buộc' });
      }
      if (targetType === 'user' && !targetValue) {
        return reply.status(400).send({ success: false, message: 'Vui lòng chọn nhân viên nhận thông báo' });
      }

      const result = pushService.enqueuePersonalizedNotification({
        targetType: targetType === 'user' ? 'user' : 'all',
        targetValue,
        notifType,
        title: title.trim(),
        body: body.trim(),
        targetUrl: targetUrl?.trim() || '#challenges',
      });

      if (!result.success) {
        return reply.status(400).send(result);
      }
      return result;
    }
  );

  app.post(
    '/api/admin/reset-system-fresh',
    { preHandler: [(app as any).requireAdmin] },
    async () => await store.resetToFreshAdminOnly()
  );

  app.get(
    '/api/admin/security/stats',
    { preHandler: [(app as any).requireAdmin] },
    async () => ({
      timestamp: new Date().toISOString(),
      threatStats: ipThreatManager.getStats(),
      serverSecurity: {
        sqlInjectionProtection: 'ACTIVE (Deep Recursive WAF + Auto-ban on SQLi)',
        antiF12AndDevTools: 'ACTIVE (Keyboard, ContextMenu, Metrics & Debugger Traps)',
        ddosDefense: 'ACTIVE (IP Jail, Burst Limiter, Tiered Rate-Limit, Slowloris Timeouts)',
        securityHeaders: 'ACTIVE (Helmet HSTS, NoSniff, X-Frame DENY)',
      },
    })
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
}

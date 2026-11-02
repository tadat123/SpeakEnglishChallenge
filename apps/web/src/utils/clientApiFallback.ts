/**
 * API Router & Network Interceptor for SpeakRight Frontend
 * Đảm bảo 100% request /api/ đều gọi trực tiếp tới Backend thật (VITE_API_URL).
 * Tuyệt đối không mock hay giả lập dữ liệu ảo trong trình duyệt.
 */

export function installClientApiFallback() {
  // 1. Dọn dẹp sạch sẽ toàn bộ database ảo cũ trong LocalStorage của trình duyệt
  try {
    localStorage.removeItem('sr_client_db_v3');
    localStorage.removeItem('sr_client_db_v2');
    localStorage.removeItem('sr_client_db');
    localStorage.removeItem('sr_guest_store');
  } catch {}

  const originalFetch = window.fetch.bind(window);
  const configuredApiBase = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const urlStr =
      typeof input === 'string'
        ? input
        : input instanceof URL
        ? input.toString()
        : input.url;

    const isApiCall = urlStr.startsWith('/api/') || urlStr.includes('/api/');
    if (!isApiCall) {
      return originalFetch(input, init);
    }

    // 2. Kiểm tra cấu hình VITE_API_URL khi chạy trên Vercel / Cloud
    if (!configuredApiBase && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      console.error('[API Error] Chưa cấu hình VITE_API_URL trên Vercel!');
      return new Response(
        JSON.stringify({
          message: 'Lỗi cấu hình: Frontend chưa được gán biến môi trường VITE_API_URL trên Vercel! Vui lòng vào Vercel Settings -> Environment Variables -> thêm VITE_API_URL trỏ về link Cloudflare Tunnel và bấm Redeploy.',
          error: 'MISSING_API_URL',
        }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // 3. Định tuyến chính xác tới máy chủ Backend thật
    const targetUrl = configuredApiBase && urlStr.startsWith('/api/')
      ? `${configuredApiBase}${urlStr}`
      : input;

    try {
      const response = await originalFetch(targetUrl, init);
      const contentType = response.headers.get('content-type') || '';

      // Nếu Backend trả về trang HTML thay vì JSON (502 Bad Gateway từ Nginx, 503, 404 rewrite của Vercel)
      if (!contentType.includes('application/json')) {
        return new Response(
          JSON.stringify({
            message: `Lỗi kết nối Backend (HTTP ${response.status} ${response.statusText}): Máy chủ API không phản hồi dữ liệu JSON hợp lệ. Vui lòng kiểm tra Docker containers trên VPS hoặc link Cloudflare Tunnel!`,
            error: 'INVALID_SERVER_RESPONSE',
            status: response.status,
          }),
          {
            status: response.status >= 400 ? response.status : 502,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      return response;
    } catch (err: any) {
      // Khi Backend bị tắt hoặc mất mạng -> Báo lỗi thực tế
      return new Response(
        JSON.stringify({
          message: `Lỗi kết nối máy chủ Backend: Không thể kết nối tới Backend API (${err?.message || 'Network Error'}). Vui lòng kiểm tra Docker containers trên VPS hoặc link Cloudflare Tunnel!`,
          error: 'NETWORK_ERROR',
        }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  };
}

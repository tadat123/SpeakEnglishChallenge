/**
 * API Router & Network Interceptor for SpeakRight Frontend
 * Đảm bảo 100% request /api/ đều gọi trực tiếp tới Backend thật (VITE_API_URL).
 * Tuyệt đối không mock hay giả lập dữ liệu ảo trong trình duyệt.
 */

export function resolveMediaUrl(rawUrl?: string | null, fallbackRelative = ''): string {
  const baseUrl = import.meta.env.BASE_URL || '/';
  const configuredApiBase = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
  const clean = (rawUrl || '').trim();

  if (!clean) {
    return fallbackRelative ? `${baseUrl}${fallbackRelative.replace(/^\/+/, '')}` : '';
  }

  // Giữ nguyên nếu là Data URL (base64), Blob URL hoặc HTTP(S) tuyệt đối
  if (
    clean.startsWith('data:') ||
    clean.startsWith('blob:') ||
    clean.startsWith('http://') ||
    clean.startsWith('https://')
  ) {
    return clean;
  }

  // Nếu là đường dẫn media trên Backend (/api/uploads/...) -> gắn VITE_API_URL khi chạy trên Vercel
  if (clean.startsWith('/api/')) {
    return configuredApiBase ? `${configuredApiBase}${clean}` : clean;
  }

  if (clean.startsWith('/')) {
    return clean;
  }

  return `${baseUrl}${clean.replace(/^\/+/, '')}`;
}

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

    // 2. Định tuyến tới máy chủ Backend thật (ưu tiên VITE_API_URL nếu có, nếu không thử gọi trực tiếp same-origin /api/ cho Nginx/Docker)
    const targetUrl =
      configuredApiBase && urlStr.startsWith('/api/')
        ? `${configuredApiBase}${urlStr}`
        : input;

    try {
      const response = await originalFetch(targetUrl, init);
      const contentType = response.headers.get('content-type') || '';

      // Nếu trả về JSON hợp lệ (từ VITE_API_URL hoặc từ Nginx reverse proxy cùng domain) -> dùng luôn
      if (contentType.includes('application/json')) {
        return response;
      }

      // Nếu chưa có VITE_API_URL và same-origin trả về HTML (404 từ Vercel / GitHub Pages hoặc kẹt bản JS cũ trong cache PWA iPad/Tablet)
      if (
        !configuredApiBase &&
        window.location.hostname !== 'localhost' &&
        window.location.hostname !== '127.0.0.1'
      ) {
        // Tự động xóa cache Service Worker cũ 1 lần nếu thiết bị (như iPad/Tablet) đang kẹt bản build cũ trước khi gắn VITE_API_URL
        try {
          if (!sessionStorage.getItem('sr_api_cache_healed')) {
            sessionStorage.setItem('sr_api_cache_healed', '1');
            if ('serviceWorker' in navigator) {
              const regs = await navigator.serviceWorker.getRegistrations();
              await Promise.all(regs.map((r) => r.unregister()));
            }
            if ('caches' in window) {
              const keys = await caches.keys();
              await Promise.all(keys.map((k) => caches.delete(k)));
            }
            window.location.reload();
          }
        } catch {}

        return new Response(
          JSON.stringify({
            message:
              'Lỗi cấu hình: Thiết bị đang lưu bản nhớ đệm cũ hoặc đường dẫn này chưa gắn VITE_API_URL. Vui lòng xóa ứng dụng ngoài màn hình chính (hoặc xóa lịch sử web Safari) rồi mở lại đúng đường link chính thức!',
            error: 'MISSING_API_URL',
          }),
          {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      // Nếu đã có VITE_API_URL nhưng Backend trả về trang HTML thay vì JSON (502 Bad Gateway từ Nginx, 503, Cloudflare Tunnel tắt)
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

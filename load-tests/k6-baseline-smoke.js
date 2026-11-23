import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

// Custom metrics cho từng luồng
const healthLatency = new Trend('latency_health_ms');
const todayLatency = new Trend('latency_public_today_ms');
const leaderboardLatency = new Trend('latency_leaderboard_ms');
const eventsLatency = new Trend('latency_events_ms');
const rateLimitRemainingMin = new Trend('ratelimit_remaining_header');
const errorRate = new Rate('error_rate');
const instanceHits = new Counter('instance_hits');

const BASE_URL = __ENV.BASE_URL || 'https://removable-qld-complement-castle.trycloudflare.com';

// Bước 1: Smoke & Baseline Test AN TOÀN (5 VUs trong 20s, tổng ~80 requests chia đều cho 3 instance api-1/2/3 để KHÔNG chạm ngưỡng 120 req/min khóa IP của server hiện tại)
export const options = {
  scenarios: {
    safe_baseline: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '5s', target: 3 },
        { duration: '10s', target: 5 },
        { duration: '5s', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<1500'],
    error_rate: ['rate<0.05'],
  },
};

export default function () {
  const fakeIp = `14.161.${Math.floor(Math.random() * 250) + 1}.${Math.floor(Math.random() * 250) + 1}`;
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'X-LoadTest-Secret': 'speakright-k6-2026',
      'X-LoadTest-IP': fakeIp,
    },
  };

  group('1. Health & Load Balancer Routing', () => {
    const res = http.get(`${BASE_URL}/api/health`, params);
    healthLatency.add(res.timings.duration);
    const rem = Number(res.headers['X-Ratelimit-Remaining'] || res.headers['x-ratelimit-remaining'] || -1);
    if (rem >= 0) rateLimitRemainingMin.add(rem);

    const ok = check(res, {
      'health status 200': (r) => r.status === 200,
      'valid json': (r) => {
        try {
          const b = JSON.parse(r.body);
          return b.status === 'ok';
        } catch {
          return false;
        }
      },
    });
    errorRate.add(!ok);
  });

  group('2. Luồng Trang Chủ & Đề Hôm Nay (Public Today)', () => {
    const res = http.get(`${BASE_URL}/api/public/today`, params);
    todayLatency.add(res.timings.duration);
    const rem = Number(res.headers['X-Ratelimit-Remaining'] || res.headers['x-ratelimit-remaining'] || -1);
    if (rem >= 0) rateLimitRemainingMin.add(rem);

    const ok = check(res, {
      'public/today status 200': (r) => r.status === 200,
    });
    errorRate.add(!ok);
  });

  group('3. Luồng Trạng Thái Sự Kiện (Event Status)', () => {
    const res = http.get(`${BASE_URL}/api/event-status`, params);
    leaderboardLatency.add(res.timings.duration);
    const rem = Number(res.headers['X-Ratelimit-Remaining'] || res.headers['x-ratelimit-remaining'] || -1);
    if (rem >= 0) rateLimitRemainingMin.add(rem);

    const ok = check(res, {
      'event-status 200': (r) => r.status === 200,
    });
    errorRate.add(!ok);
  });

  group('4. Luồng Sự Kiện & Thông Báo (Events & Notifications)', () => {
    const res = http.get(`${BASE_URL}/api/events`, params);
    eventsLatency.add(res.timings.duration);
    const rem = Number(res.headers['X-Ratelimit-Remaining'] || res.headers['x-ratelimit-remaining'] || -1);
    if (rem >= 0) rateLimitRemainingMin.add(rem);

    const ok = check(res, {
      'events status 200': (r) => r.status === 200,
    });
    errorRate.add(!ok);
  });

  sleep(1.5);
}

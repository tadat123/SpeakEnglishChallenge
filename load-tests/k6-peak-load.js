import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

const registerLatency = new Trend('latency_register_ms');
const loginLatency = new Trend('latency_login_ms');
const challengesLatency = new Trend('latency_get_challenges_ms');
const startQuizLatency = new Trend('latency_start_quiz_ms');
const submitQuizLatency = new Trend('latency_submit_quiz_ms');
const leaderboardLatency = new Trend('latency_leaderboard_ms');
const errorRate = new Rate('error_rate');
const http429Count = new Counter('http_429_count');
const http5xxCount = new Counter('http_5xx_count');

const BASE_URL = __ENV.BASE_URL || 'https://removable-qld-complement-castle.trycloudflare.com';
const MAX_VUS = Number(__ENV.MAX_VUS || 100);

export const options = {
  scenarios: {
    peak_exam_load: {
      executor: 'ramping-vus',
      startVUs: 5,
      stages: [
        { duration: '10s', target: Math.round(MAX_VUS * 0.3) },
        { duration: '15s', target: Math.round(MAX_VUS * 0.6) },
        { duration: '20s', target: MAX_VUS },
        { duration: '10s', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<3000'],
    error_rate: ['rate<0.05'],
  },
};

// Lưu JWT token riêng cho từng VU để mô phỏng đúng 100 nhân viên thật đang mở app
const vuTokens = {};

export default function () {
  const vuId = __VU;
  const empId = String(99910000 + vuId).slice(0, 8);
  const email = `loadtest.${empId}@gmail.com`;
  const password = 'TestPassword@2026';
  const fakeIp = `14.165.${Math.floor(vuId / 250) + 1}.${(vuId % 250) + 1}`;

  const baseHeaders = {
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0.0.0 Safari/537.36',
    'X-LoadTest-Secret': 'speakright-k6-2026',
    'X-LoadTest-IP': fakeIp,
  };

  if (!vuTokens[vuId]) {
    group('1. Đăng ký / Đăng nhập nhân viên mới', () => {
      let res = http.post(
        `${BASE_URL}/api/auth/register`,
        JSON.stringify({
          employeeId: empId,
          fullName: `LoadTest NV ${empId}`,
          email,
          phone: '0988888888',
          department: 'R&D LoadTest',
          password,
        }),
        { headers: baseHeaders }
      );
      registerLatency.add(res.timings.duration);

      if (res.status === 409) {
        res = http.post(
          `${BASE_URL}/api/auth/login`,
          JSON.stringify({ identifier: empId, password }),
          { headers: baseHeaders }
        );
        loginLatency.add(res.timings.duration);
      }

      if (res.status === 429) http429Count.add(1);
      if (res.status >= 500) http5xxCount.add(1);

      const ok = check(res, { 'auth 200': (r) => r.status === 200 });
      errorRate.add(!ok);
      if (ok) {
        try {
          const b = JSON.parse(res.body);
          vuTokens[vuId] = b.accessToken || b.token || '';
        } catch {}
      }
    });
  }

  const token = vuTokens[vuId];
  if (!token) {
    sleep(1);
    return;
  }

  const authHeaders = {
    ...baseHeaders,
    Authorization: `Bearer ${token}`,
  };

  let questions = [];

  group('2. Lấy danh sách 21 ngày', () => {
    const res = http.get(`${BASE_URL}/api/challenges`, { headers: authHeaders });
    challengesLatency.add(res.timings.duration);
    if (res.status === 429) http429Count.add(1);
    if (res.status >= 500) http5xxCount.add(1);
    const ok = check(res, { 'challenges 200': (r) => r.status === 200 });
    errorRate.add(!ok);
  });

  sleep(0.3);

  group('3. Mở đề thi Day 1', () => {
    const res = http.post(
      `${BASE_URL}/api/challenges/1/start`,
      JSON.stringify({}),
      { headers: authHeaders }
    );
    startQuizLatency.add(res.timings.duration);
    if (res.status === 429) http429Count.add(1);
    if (res.status >= 500) http5xxCount.add(1);
    const ok = check(res, { 'start Day 1 200': (r) => r.status === 200 });
    errorRate.add(!ok);
    if (ok) {
      try {
        questions = JSON.parse(res.body).questions || [];
      } catch {}
    }
  });

  sleep(0.5);

  if (questions.length > 0) {
    group('4. Nộp bài Day 1', () => {
      const answers = {};
      for (const q of questions) {
        answers[q.id] = q.questionType === 'FILL_IN_THE_BLANK' ? (q.targetWord || 'approval') : 'A';
      }
      const res = http.post(
        `${BASE_URL}/api/challenges/1/submit`,
        JSON.stringify({ timeSpentMs: 42000, answers }),
        { headers: authHeaders }
      );
      submitQuizLatency.add(res.timings.duration);
      if (res.status === 429) http429Count.add(1);
      if (res.status >= 500) http5xxCount.add(1);
      const ok = check(res, { 'submit Day 1 200': (r) => r.status === 200 });
      errorRate.add(!ok);
    });
  }

  group('5. Xem Bảng xếp hạng công ty', () => {
    const res = http.get(`${BASE_URL}/api/leaderboard?scope=company`, { headers: authHeaders });
    leaderboardLatency.add(res.timings.duration);
    if (res.status === 429) http429Count.add(1);
    if (res.status >= 500) http5xxCount.add(1);
    const ok = check(res, { 'leaderboard 200': (r) => r.status === 200 });
    errorRate.add(!ok);
  });

  sleep(1.0);
}

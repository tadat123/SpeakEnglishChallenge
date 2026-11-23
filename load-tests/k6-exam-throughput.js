import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

const challengesLatency = new Trend('latency_get_challenges_ms');
const startQuizLatency = new Trend('latency_start_quiz_ms');
const submitQuizLatency = new Trend('latency_submit_quiz_ms');
const leaderboardLatency = new Trend('latency_leaderboard_ms');
const errorRate = new Rate('error_rate');
const http5xxCount = new Counter('http_5xx_count');
const http429Count = new Counter('http_429_count');

const BASE_URL = __ENV.BASE_URL || 'https://removable-qld-complement-castle.trycloudflare.com';
const MAX_VUS = Number(__ENV.MAX_VUS || 100);

export const options = {
  scenarios: {
    exam_peak_hour: {
      executor: 'ramping-vus',
      startVUs: 10,
      stages: [
        { duration: '10s', target: Math.round(MAX_VUS * 0.5) },
        { duration: '20s', target: MAX_VUS },
        { duration: '10s', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<3000'],
  },
};

export function setup() {
  const tokens = [];
  const poolSize = 25;
  for (let i = 1; i <= poolSize; i++) {
    const empId = String(99920000 + i).slice(0, 8);
    const email = `loadtest.${empId}@gmail.com`;
    const password = 'TestPassword@2026';
    const headers = {
      'Content-Type': 'application/json',
      'X-LoadTest-Secret': 'speakright-k6-2026',
      'X-LoadTest-IP': `14.166.1.${i}`,
    };

    let res = http.post(
      `${BASE_URL}/api/auth/register`,
      JSON.stringify({
        employeeId: empId,
        fullName: `LoadTest User ${empId}`,
        email,
        phone: '0988888888',
        department: 'R&D LoadTest',
        password,
      }),
      { headers }
    );
    if (res.status === 409) {
      res = http.post(
        `${BASE_URL}/api/auth/login`,
        JSON.stringify({ identifier: empId, password }),
        { headers }
      );
    }
    if (res.status === 200) {
      try {
        const b = JSON.parse(res.body);
        if (b.accessToken) tokens.push(b.accessToken);
      } catch {}
    }
    sleep(0.05);
  }
  return { tokens };
}

export default function (data) {
  const tokens = data.tokens || [];
  if (tokens.length === 0) {
    sleep(1);
    return;
  }

  const token = tokens[(__VU - 1) % tokens.length];
  const fakeIp = `14.167.${Math.floor(__VU / 250) + 1}.${(__VU % 250) + 1}`;
  const authHeaders = {
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0.0.0 Safari/537.36',
    'X-LoadTest-Secret': 'speakright-k6-2026',
    'X-LoadTest-IP': fakeIp,
    Authorization: `Bearer ${token}`,
  };

  let questions = [];

  group('1. Lấy danh sách 21 ngày', () => {
    const res = http.get(`${BASE_URL}/api/challenges`, { headers: authHeaders });
    challengesLatency.add(res.timings.duration);
    if (res.status === 429) http429Count.add(1);
    if (res.status >= 500) http5xxCount.add(1);
    const ok = check(res, { 'challenges 200': (r) => r.status === 200 });
    errorRate.add(!ok);
  });

  sleep(0.4);

  group('2. Mở đề thi Day 1', () => {
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

  sleep(0.8);

  if (questions.length > 0) {
    group('3. Nộp bài Day 1', () => {
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

  group('4. Xem Bảng xếp hạng', () => {
    const res = http.get(`${BASE_URL}/api/leaderboard?scope=company`, { headers: authHeaders });
    leaderboardLatency.add(res.timings.duration);
    if (res.status === 429) http429Count.add(1);
    if (res.status >= 500) http5xxCount.add(1);
    const ok = check(res, { 'leaderboard 200': (r) => r.status === 200 });
    errorRate.add(!ok);
  });

  sleep(1.5);
}

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

const challengesLatency = new Trend('latency_get_challenges_ms');
const leaderboardLatency = new Trend('latency_leaderboard_ms');
const publicTodayLatency = new Trend('latency_public_today_ms');
const eventsLatency = new Trend('latency_events_ms');
const errorRate = new Rate('error_rate');
const http429Count = new Counter('http_429_count');
const http5xxCount = new Counter('http_5xx_count');

const BASE_URL = __ENV.BASE_URL || 'https://split-fog-ali-gardening.trycloudflare.com';
const MAX_VUS = Number(__ENV.MAX_VUS || 400);

export const options = {
  scenarios: {
    spike_400_vus: {
      executor: 'ramping-vus',
      startVUs: 20,
      stages: [
        { duration: '10s', target: Math.round(MAX_VUS * 0.5) },
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

export function setup() {
  const empId = '99920001';
  const password = 'TestPassword@2026';
  const headers = {
    'Content-Type': 'application/json',
    'X-LoadTest-Secret': 'speakright-k6-2026',
    'X-LoadTest-IP': '14.168.1.1',
  };
  let res = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ identifier: empId, password }),
    { headers }
  );
  if (res.status !== 200) {
    res = http.post(
      `${BASE_URL}/api/auth/register`,
      JSON.stringify({
        employeeId: empId,
        fullName: `LoadTest User ${empId}`,
        email: `loadtest.${empId}@gmail.com`,
        phone: '0988888888',
        department: 'R&D LoadTest',
        password,
      }),
      { headers }
    );
  }
  let token = '';
  try {
    token = JSON.parse(res.body).accessToken || '';
  } catch {}
  return { token };
}

export default function (data) {
  const token = data.token;
  const fakeIp = `14.169.${Math.floor(__VU / 250) + 1}.${(__VU % 250) + 1}`;
  const authHeaders = {
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0.0.0 Safari/537.36',
    'X-LoadTest-Secret': 'speakright-k6-2026',
    'X-LoadTest-IP': fakeIp,
    Authorization: `Bearer ${token}`,
  };

  group('1. Public Today', () => {
    const res = http.get(`${BASE_URL}/api/public/today`, { headers: authHeaders });
    publicTodayLatency.add(res.timings.duration);
    if (res.status === 429) http429Count.add(1);
    if (res.status >= 500) http5xxCount.add(1);
    errorRate.add(!check(res, { 'public/today 200': (r) => r.status === 200 }));
  });

  group('2. Challenges List', () => {
    const res = http.get(`${BASE_URL}/api/challenges`, { headers: authHeaders });
    challengesLatency.add(res.timings.duration);
    if (res.status === 429) http429Count.add(1);
    if (res.status >= 500) http5xxCount.add(1);
    errorRate.add(!check(res, { 'challenges 200': (r) => r.status === 200 }));
  });

  sleep(0.5);

  group('3. Leaderboard', () => {
    const res = http.get(`${BASE_URL}/api/leaderboard?scope=company`, { headers: authHeaders });
    leaderboardLatency.add(res.timings.duration);
    if (res.status === 429) http429Count.add(1);
    if (res.status >= 500) http5xxCount.add(1);
    errorRate.add(!check(res, { 'leaderboard 200': (r) => r.status === 200 }));
  });

  group('4. Events', () => {
    const res = http.get(`${BASE_URL}/api/events`, { headers: authHeaders });
    eventsLatency.add(res.timings.duration);
    if (res.status === 429) http429Count.add(1);
    if (res.status >= 500) http5xxCount.add(1);
    errorRate.add(!check(res, { 'events 200': (r) => r.status === 200 }));
  });

  sleep(1.0);
}

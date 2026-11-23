import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

// Metrics chuyên sâu cho hành trình thi & nộp bài của nhân viên
const getChallengesLatency = new Trend('latency_get_challenges_ms');
const startQuizLatency = new Trend('latency_start_quiz_ms');
const submitQuizLatency = new Trend('latency_submit_quiz_ms');
const leaderboardLatency = new Trend('latency_leaderboard_ms');
const rateLimitRemainingMin = new Trend('ratelimit_remaining_header');
const journeySuccessRate = new Rate('journey_success_rate');
const http429Count = new Counter('http_429_rate_limited');
const http5xxCount = new Counter('http_5xx_server_errors');

const BASE_URL = __ENV.BASE_URL || 'https://removable-qld-complement-castle.trycloudflare.com';

export const options = {
  scenarios: {
    // Mô phỏng nhân viên đã có phiên đăng nhập -> Mở danh sách 21 ngày -> Vào thi -> Nộp bài -> Xem BXH
    authenticated_exam_flow: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '5s', target: 4 },
        { duration: '10s', target: 6 },
        { duration: '5s', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<2500'],
  },
};

// Hàm setup() chạy 1 lần duy nhất để lấy JWT accessToken hợp lệ cho các VU
export function setup() {
  const headers = {
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0.0.0 Safari/537.36',
  };

  // Thử đăng nhập bằng tài khoản test 99901000 đã tạo ở bước trước (hoặc đăng ký nếu chưa có)
  const empId = '99901000';
  const password = 'TestPassword@2026';

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
    const body = JSON.parse(res.body);
    token = body.accessToken || body.token || '';
  } catch {}

  return { token };
}

export default function (data) {
  const token = data.token;
  if (!token) {
    sleep(1);
    return;
  }

  const fakeIp = `14.162.${(__VU % 250) + 1}.${(__ITER % 250) + 1}`;
  const authHeaders = {
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0.0.0 Safari/537.36',
    'X-LoadTest-Secret': 'speakright-k6-2026',
    'X-LoadTest-IP': fakeIp,
    Authorization: `Bearer ${token}`,
  };

  let targetDay = 1;
  let questions = [];

  // 1. LẤY DANH SÁCH 21 NGÀY THỬ THÁCH
  group('1. Lấy danh sách 21 ngày (GET /api/challenges)', () => {
    const res = http.get(`${BASE_URL}/api/challenges`, { headers: authHeaders });
    getChallengesLatency.add(res.timings.duration);
    if (res.status === 429) http429Count.add(1);
    if (res.status >= 500) http5xxCount.add(1);

    const rem = Number(res.headers['X-Ratelimit-Remaining'] || res.headers['x-ratelimit-remaining'] || -1);
    if (rem >= 0) rateLimitRemainingMin.add(rem);

    const ok = check(res, {
      'get challenges 200': (r) => r.status === 200,
    });

    if (ok) {
      try {
        const list = JSON.parse(res.body);
        if (Array.isArray(list) && list.length > 0) {
          const openDay = list.find((d) => d.status !== 'LOCKED') || list[0];
          targetDay = openDay.dayNumber || 1;
        }
      } catch {}
    }
  });

  sleep(0.5);

  // 2. BẮT ĐẦU LÀM BÀI THI (START QUIZ)
  group('2. Mở đề thi (POST /api/challenges/:day/start)', () => {
    const res = http.post(
      `${BASE_URL}/api/challenges/${targetDay}/start`,
      JSON.stringify({}),
      { headers: authHeaders }
    );
    startQuizLatency.add(res.timings.duration);
    if (res.status === 429) http429Count.add(1);
    if (res.status >= 500) http5xxCount.add(1);

    const ok = check(res, {
      'start quiz 200': (r) => r.status === 200,
    });

    if (ok) {
      try {
        const body = JSON.parse(res.body);
        questions = body.questions || [];
      } catch {}
    }
  });

  sleep(0.8);

  // 3. NỘP BÀI THI & CHẤM ĐIỂM (SUBMIT QUIZ)
  if (questions.length > 0) {
    group('3. Nộp bài & Chấm điểm (POST /api/challenges/:day/submit)', () => {
      const answers = {};
      for (const q of questions) {
        answers[q.id] = q.questionType === 'FILL_IN_THE_BLANK' ? (q.targetWord || 'approval') : 'A';
      }

      const submitPayload = JSON.stringify({
        timeSpentMs: 45000 + Math.floor(Math.random() * 30000),
        answers,
      });

      const res = http.post(
        `${BASE_URL}/api/challenges/${targetDay}/submit`,
        submitPayload,
        { headers: authHeaders }
      );
      submitQuizLatency.add(res.timings.duration);
      if (res.status === 429) http429Count.add(1);
      if (res.status >= 500) http5xxCount.add(1);

      const rem = Number(res.headers['X-Ratelimit-Remaining'] || res.headers['x-ratelimit-remaining'] || -1);
      if (rem >= 0) rateLimitRemainingMin.add(rem);

      const ok = check(res, {
        'submit quiz 200': (r) => r.status === 200,
      });
      journeySuccessRate.add(ok);
    });
  }

  // 4. XEM BẢNG XẾP HẠNG CÔNG TY SAU KHI NỘP
  group('4. Xem Bảng xếp hạng (GET /api/leaderboard)', () => {
    const res = http.get(`${BASE_URL}/api/leaderboard?scope=company`, { headers: authHeaders });
    leaderboardLatency.add(res.timings.duration);
    if (res.status === 429) http429Count.add(1);
    if (res.status >= 500) http5xxCount.add(1);

    check(res, {
      'leaderboard after submit 200': (r) => r.status === 200,
    });
  });

  sleep(1.2);
}

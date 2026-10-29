// Bộ xử lý API dự phòng ngay trên trình duyệt (Client-Side Serverless Store)
// Giúp bản Deploy trên GitHub Pages (Static Hosting) hoạt động 100% tính năng
// (Đăng nhập, Đăng ký, Quên MK, Thi 30 Ngày, Bảng Xếp Hạng, Admin CMS) mà không cần máy chủ Backend riêng.

export type QuestionType =
  | 'CHOOSE_AUDIO'
  | 'TRUE_FALSE'
  | 'LISTEN_AND_CHOOSE'
  | 'VOCAB_MEANING';

export interface QuestionOption {
  id: 'A' | 'B' | 'C' | 'D';
  text: string;
  spokenText?: string;
  hasOptionAudio?: boolean;
  audioUrl?: string;
}

export interface QuestionItem {
  id: string;
  challengeId: number;
  orderIndex: number;
  questionType: QuestionType;
  categoryLabel: string;
  promptText: string;
  statementText?: string;
  targetWord: string;
  hasPromptAudio: boolean;
  audioNote: string;
  promptAudioUrl?: string;
  promptVideoUrl?: string;
  options: QuestionOption[];
  correctOptionId: 'A' | 'B' | 'C' | 'D';
  explanation: string;
  points: number;
}

export interface DailyChallengeItem {
  id: number;
  dayNumber: number;
  title: string;
  dateLabel: string;
  unlockDate: string;
  isPublished: boolean;
  questions: QuestionItem[];
}

interface UserRecord {
  id: string;
  employeeId: string;
  fullName: string;
  email: string;
  phone: string;
  department: string;
  avatarUrl: string;
  passwordPlain: string;
  role: 'USER' | 'ADMIN';
  totalScore: number;
  totalTimeMs: number;
  completedDays: number;
  resetOtpCode?: string | null;
  resetToken?: string | null;
  resetExpiresAt?: string | null;
  createdAt: string;
}

interface AttemptRecord {
  id: string;
  userId: string;
  challengeId: number;
  dayNumber: number;
  score: number;
  correctCount: number;
  wrongCount: number;
  timeSpentMs: number;
  answersDetail: Record<string, 'A' | 'B' | 'C' | 'D'>;
  startedAt: string;
  completedAt: string;
}

interface ActiveSession {
  userId: string;
  employeeId: string;
  fullName: string;
  dayNumber: number;
  startedAt: number;
  questionsSnapshot: QuestionItem[];
}

interface ClientDbShape {
  users: UserRecord[];
  challenges: DailyChallengeItem[];
  attempts: AttemptRecord[];
}

const STORAGE_KEY = 'sr_github_pages_db_v1';

const OFFICIAL_10_QUESTIONS: Omit<QuestionItem, 'id' | 'challengeId' | 'orderIndex'>[] = [
  {
    questionType: 'CHOOSE_AUDIO',
    categoryLabel: 'Multiple Choice – Chọn audio phát âm đúng',
    promptText: 'Từ “Approval” được phát âm như thế nào? Nghe 4 phương án audio và chọn cách phát âm đúng.',
    targetWord: 'Approval',
    hasPromptAudio: false,
    audioNote: '1 bản phát âm chuẩn của “Approval” (/əˈpruːvəl/) và 3 bản có lỗi phát âm.',
    options: [
      { id: 'A', text: 'Audio A', spokenText: 'approval', hasOptionAudio: true },
      { id: 'B', text: 'Audio B', spokenText: 'ap prooval', hasOptionAudio: true },
      { id: 'C', text: 'Audio C', spokenText: 'uh proval', hasOptionAudio: true },
      { id: 'D', text: 'Audio D', spokenText: 'ah proovul', hasOptionAudio: true },
    ],
    correctOptionId: 'A',
    explanation:
      'Đáp án: A (Audio A). Từ “Approval” được phát âm chuẩn là /əˈpruːvəl/ (trọng âm rơi vào âm tiết thứ 2, âm đầu là schwa /ə/).',
    points: 10,
  },
  {
    questionType: 'TRUE_FALSE',
    categoryLabel: 'True / False – Nghe và xác định nhận định',
    promptText: 'Nghe đoạn âm thanh và xác định nhận định bên dưới là Đúng (True) hay Sai (False):',
    statementText: 'Nhận định: “Audio vừa nghe là DOE.”',
    targetWord: 'M. E. G.',
    hasPromptAudio: true,
    audioNote: 'Audio cần chèn: đọc tên các chữ cái M – E – G rõ ràng.',
    options: [
      { id: 'A', text: 'True – Đúng', hasOptionAudio: false },
      { id: 'B', text: 'False – Sai', hasOptionAudio: false },
    ],
    correctOptionId: 'B',
    explanation:
      'Đáp án: B. False – Sai. Audio phát lần lượt tên các chữ cái “M – E – G”, trong khi nhận định đưa ra là “DOE”.',
    points: 10,
  },
  {
    questionType: 'LISTEN_AND_CHOOSE',
    categoryLabel: 'Nghe audio – Chọn từ đúng',
    promptText: 'Bạn nghe thấy từ nào trong đoạn âm thanh?',
    targetWord: 'Yield rate',
    hasPromptAudio: true,
    audioNote: 'Audio cần chèn: đọc từ “Yield rate”.',
    options: [
      { id: 'A', text: 'Yield rate', spokenText: 'Yield rate', hasOptionAudio: false },
      { id: 'B', text: 'Development', spokenText: 'Development', hasOptionAudio: false },
      { id: 'C', text: 'Measurement', spokenText: 'Measurement', hasOptionAudio: false },
      { id: 'D', text: 'Metal', spokenText: 'Metal', hasOptionAudio: false },
    ],
    correctOptionId: 'A',
    explanation: 'Đáp án: A. Yield rate (Audio đọc từ “Yield rate” /jiːld reɪt/ - Tỷ lệ đạt yêu cầu).',
    points: 10,
  },
  {
    questionType: 'VOCAB_MEANING',
    categoryLabel: 'Nghĩa của từ viết tắt',
    promptText: 'Trong môi trường công việc, “DOE” thường có thể là viết tắt của cụm từ nào?',
    targetWord: 'D. O. E.',
    hasPromptAudio: false,
    audioNote: 'Không bắt buộc có audio.',
    options: [
      { id: 'A', text: 'Design of Equipment', hasOptionAudio: false },
      { id: 'B', text: 'Design of Experiments', hasOptionAudio: false },
      { id: 'C', text: 'Department of Engineering', hasOptionAudio: false },
      { id: 'D', text: 'Development of Electronics', hasOptionAudio: false },
    ],
    correctOptionId: 'B',
    explanation: 'Đáp án: B. Design of Experiments (Thiết kế thực nghiệm).',
    points: 10,
  },
  {
    questionType: 'CHOOSE_AUDIO',
    categoryLabel: 'Multiple Choice – Chọn audio phát âm đúng',
    promptText: 'Từ “Equipment” được phát âm như thế nào? Nghe 4 phương án audio và chọn cách phát âm đúng.',
    targetWord: 'Equipment',
    hasPromptAudio: false,
    audioNote: '1 bản phát âm chuẩn của “Equipment” (/ɪˈkwɪpmənt/) và 3 bản có lỗi phát âm.',
    options: [
      { id: 'A', text: 'Audio A', spokenText: 'equipment', hasOptionAudio: true },
      { id: 'B', text: 'Audio B', spokenText: 'eck wipment', hasOptionAudio: true },
      { id: 'C', text: 'Audio C', spokenText: 'equibment', hasOptionAudio: true },
      { id: 'D', text: 'Audio D', spokenText: 'equip man', hasOptionAudio: true },
    ],
    correctOptionId: 'A',
    explanation:
      'Đáp án: A (Audio A). Từ “Equipment” được phát âm chuẩn là /ɪˈkwɪpmənt/ (trọng âm rơi vào âm tiết thứ 2).',
    points: 10,
  },
  {
    questionType: 'TRUE_FALSE',
    categoryLabel: 'True / False – Nghe và xác định nhận định',
    promptText: 'Nghe đoạn âm thanh và xác định nhận định bên dưới là Đúng (True) hay Sai (False):',
    statementText: 'Nhận định: “Audio vừa nghe là từ Tall.”',
    targetWord: 'Tool',
    hasPromptAudio: true,
    audioNote: 'Audio cần chèn: đọc từ “Tool” theo cách phát âm chuẩn.',
    options: [
      { id: 'A', text: 'True – Đúng', hasOptionAudio: false },
      { id: 'B', text: 'False – Sai', hasOptionAudio: false },
    ],
    correctOptionId: 'B',
    explanation:
      'Đáp án: B. False – Sai. Audio đọc từ “Tool” (/tuːl/), trong khi nhận định ghi là từ “Tall” (/tɔːl/).',
    points: 10,
  },
  {
    questionType: 'LISTEN_AND_CHOOSE',
    categoryLabel: 'Nghe audio – Chọn từ đúng',
    promptText: 'Bạn nghe thấy từ nào trong đoạn âm thanh?',
    targetWord: 'Measurement',
    hasPromptAudio: true,
    audioNote: 'Audio cần chèn: đọc từ “Measurement”.',
    options: [
      { id: 'A', text: 'Metal', spokenText: 'Metal', hasOptionAudio: false },
      { id: 'B', text: 'Measurement', spokenText: 'Measurement', hasOptionAudio: false },
      { id: 'C', text: 'Model', spokenText: 'Model', hasOptionAudio: false },
      { id: 'D', text: 'MEG', spokenText: 'M. E. G.', hasOptionAudio: false },
    ],
    correctOptionId: 'B',
    explanation: 'Đáp án: B. Measurement (Audio đọc từ “Measurement” /ˈmeʒərmənt/ - Đo lường).',
    points: 10,
  },
  {
    questionType: 'VOCAB_MEANING',
    categoryLabel: 'Nghĩa của từ',
    promptText: '“Metal” có nghĩa là gì?',
    targetWord: 'Metal',
    hasPromptAudio: false,
    audioNote: 'Không bắt buộc có audio.',
    options: [
      { id: 'A', text: 'Mẫu sản phẩm', hasOptionAudio: false },
      { id: 'B', text: 'Kim loại', hasOptionAudio: false },
      { id: 'C', text: 'Dụng cụ', hasOptionAudio: false },
      { id: 'D', text: 'Tỷ lệ đạt yêu cầu', hasOptionAudio: false },
    ],
    correctOptionId: 'B',
    explanation: 'Đáp án: B. Kim loại (“Metal” /ˈmetl/ có nghĩa là kim loại).',
    points: 10,
  },
  {
    questionType: 'LISTEN_AND_CHOOSE',
    categoryLabel: 'Nghe audio – Chọn từ đúng',
    promptText: 'Bạn nghe thấy từ nào trong đoạn âm thanh?',
    targetWord: 'Development',
    hasPromptAudio: true,
    audioNote: 'Audio cần chèn: đọc từ “Development”.',
    options: [
      { id: 'A', text: 'Approval', spokenText: 'Approval', hasOptionAudio: false },
      { id: 'B', text: 'Equipment', spokenText: 'Equipment', hasOptionAudio: false },
      { id: 'C', text: 'Development', spokenText: 'Development', hasOptionAudio: false },
      { id: 'D', text: 'Yield rate', spokenText: 'Yield rate', hasOptionAudio: false },
    ],
    correctOptionId: 'C',
    explanation: 'Đáp án: C. Development (Audio đọc từ “Development” /dɪˈveləpmənt/ - Sự phát triển).',
    points: 10,
  },
  {
    questionType: 'VOCAB_MEANING',
    categoryLabel: 'Nghĩa của từ',
    promptText: 'Trong môi trường công việc, “Model” thường có nghĩa là gì?',
    targetWord: 'Model',
    hasPromptAudio: false,
    audioNote: 'Không bắt buộc có audio.',
    options: [
      { id: 'A', text: 'Sự phê duyệt', hasOptionAudio: false },
      { id: 'B', text: 'Thiết bị', hasOptionAudio: false },
      { id: 'C', text: 'Mẫu mã hoặc dòng sản phẩm', hasOptionAudio: false },
      { id: 'D', text: 'Đo lường', hasOptionAudio: false },
    ],
    correctOptionId: 'C',
    explanation: 'Đáp án: C. Mẫu mã hoặc dòng sản phẩm (“Model” /ˈmɑːdl/).',
    points: 10,
  },
];

function generate30Days(): DailyChallengeItem[] {
  const days: DailyChallengeItem[] = [];
  const baseDate = new Date('2026-11-04T00:00:00.000Z');
  const now = new Date();

  for (let day = 1; day <= 30; day++) {
    const d = new Date(baseDate);
    d.setUTCDate(baseDate.getUTCDate() + (day - 1));
    const dd = String(d.getUTCDate()).padStart(2, '0');
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const yyyy = d.getUTCFullYear();

    const unlockDate =
      day === 1
        ? new Date(now.getTime() - 3600 * 1000).toISOString()
        : new Date(now.getTime() + (day - 1) * 86400 * 1000).toISOString();

    const questions: QuestionItem[] = OFFICIAL_10_QUESTIONS.map((q, idx) => ({
      ...JSON.parse(JSON.stringify(q)),
      id: `day-${day}-q-${idx + 1}`,
      challengeId: day,
      orderIndex: idx + 1,
    }));

    days.push({
      id: day,
      dayNumber: day,
      title: `Day ${day}`,
      dateLabel: `${dd}/${mm}/${yyyy}`,
      unlockDate,
      isPublished: true,
      questions,
    });
  }
  return days;
}

function createInitialDb(): ClientDbShape {
  const users: UserRecord[] = [
    {
      id: 'u-admin',
      employeeId: '88888888',
      fullName: 'Ban Tổ Chức (Admin)',
      email: 'admin.speakright@gmail.com',
      phone: '0901234567',
      department: 'HR & Training',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=AdminSpeak',
      passwordPlain: 'Admin@2026',
      role: 'ADMIN',
      totalScore: 2500,
      totalTimeMs: 650000,
      completedDays: 12,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'u-thao',
      employeeId: '20261234',
      fullName: 'Nguyễn Thị Thảo',
      email: 'thaonguyen.work@gmail.com',
      phone: '0987654321',
      department: 'Quality Assurance (QA)',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ThaoNguyen',
      passwordPlain: 'Speak@2026',
      role: 'USER',
      totalScore: 2150,
      totalTimeMs: 740000,
      completedDays: 12,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'u-1',
      employeeId: '20260001',
      fullName: 'Nguyễn Minh Anh',
      email: 'minhanh.dev@gmail.com',
      phone: '0912345001',
      department: 'R&D Center',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=MinhAnh',
      passwordPlain: 'Speak@2026',
      role: 'USER',
      totalScore: 2980,
      totalTimeMs: 510000,
      completedDays: 15,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'u-2',
      employeeId: '20260002',
      fullName: 'Trần Quốc Huy',
      email: 'quochuy.eng@gmail.com',
      phone: '0912345002',
      department: 'Production',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=QuocHuy',
      passwordPlain: 'Speak@2026',
      role: 'USER',
      totalScore: 2850,
      totalTimeMs: 540000,
      completedDays: 14,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'u-3',
      employeeId: '20260003',
      fullName: 'Lê Thu Hương',
      email: 'thuhuong.qa@gmail.com',
      phone: '0912345003',
      department: 'Quality Assurance (QA)',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ThuHuong',
      passwordPlain: 'Speak@2026',
      role: 'USER',
      totalScore: 2720,
      totalTimeMs: 590000,
      completedDays: 14,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'u-4',
      employeeId: '20260004',
      fullName: 'Phạm Hoàng Nam',
      email: 'hoangnam.it@gmail.com',
      phone: '0912345004',
      department: 'IT & System',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=HoangNam',
      passwordPlain: 'Speak@2026',
      role: 'USER',
      totalScore: 2650,
      totalTimeMs: 610000,
      completedDays: 13,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'u-5',
      employeeId: '20260005',
      fullName: 'Đỗ Mai Linh',
      email: 'mailinh.hr@gmail.com',
      phone: '0912345005',
      department: 'HR & Training',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=MaiLinh',
      passwordPlain: 'Speak@2026',
      role: 'USER',
      totalScore: 2600,
      totalTimeMs: 630000,
      completedDays: 13,
      createdAt: new Date().toISOString(),
    },
  ];

  return {
    users,
    challenges: generate30Days(),
    attempts: [],
  };
}

const activeSessions = new Map<string, ActiveSession>();
const forceLockedDays = new Map<number, number>();

function loadDb(): ClientDbShape {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ClientDbShape;
      if (parsed?.users?.length && parsed?.challenges?.length) {
        return parsed;
      }
    }
  } catch {
    // ignore
  }
  const initial = createInitialDb();
  saveDb(initial);
  return initial;
}

function saveDb(db: ClientDbShape) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    // ignore quota errors
  }
}

function isDayUnlocked(c: DailyChallengeItem): boolean {
  return new Date(c.unlockDate).getTime() <= Date.now() && c.isPublished;
}

function computeCompositeScore(totalScore: number, totalTimeMs: number): number {
  const T_MAX = 9999999;
  const totalSeconds = Math.min(T_MAX, Math.floor(totalTimeMs / 1000));
  return totalScore * 10_000_000 + (T_MAX - totalSeconds);
}

function getLeaderboard(db: ClientDbShape, department?: string) {
  const filtered = department
    ? db.users.filter((u) => u.department === department)
    : db.users;

  const sorted = [...filtered].sort(
    (a, b) =>
      computeCompositeScore(b.totalScore, b.totalTimeMs) -
      computeCompositeScore(a.totalScore, a.totalTimeMs)
  );

  return sorted.map((u, idx) => ({
    rank: idx + 1,
    id: u.id,
    employeeId: u.employeeId,
    fullName: u.fullName,
    department: u.department,
    avatarUrl: u.avatarUrl,
    totalScore: u.totalScore,
    totalTimeMs: u.totalTimeMs,
    completedDays: u.completedDays,
  }));
}

function encodeToken(user: UserRecord): string {
  const payload = {
    sub: user.id,
    employeeId: user.employeeId,
    role: user.role,
  };
  return `demo_jwt_${btoa(encodeURIComponent(JSON.stringify(payload)))}`;
}

function decodeUserFromHeaders(headers?: HeadersInit, db?: ClientDbShape): UserRecord | null {
  const database = db || loadDb();
  let auth = '';
  if (headers instanceof Headers) {
    auth = headers.get('Authorization') || headers.get('authorization') || '';
  } else if (Array.isArray(headers)) {
    const found = headers.find(([k]) => k.toLowerCase() === 'authorization');
    auth = found ? found[1] : '';
  } else if (headers && typeof headers === 'object') {
    auth = (headers as any).Authorization || (headers as any).authorization || '';
  }

  const token = auth.replace(/^Bearer\s+/i, '').trim() || localStorage.getItem('sr_token') || '';
  if (token.startsWith('demo_jwt_')) {
    try {
      const raw = decodeURIComponent(atob(token.slice('demo_jwt_'.length)));
      const parsed = JSON.parse(raw);
      const found = database.users.find((u) => u.id === parsed.sub);
      if (found) return found;
    } catch {
      // fallback below
    }
  }

  // Fallback to current user stored in localStorage
  try {
    const rawUser = localStorage.getItem('sr_user');
    if (rawUser) {
      const parsedUser = JSON.parse(rawUser);
      const found = database.users.find(
        (u) => u.id === parsedUser.id || u.employeeId === parsedUser.employeeId
      );
      if (found) return found;
    }
  } catch {
    // ignore
  }
  return null;
}

function jsonResponse(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function handleClientApi(urlStr: string, init?: RequestInit): Promise<Response> {
  const url = new URL(urlStr, window.location.origin);
  const path = url.pathname;
  const method = (init?.method || 'GET').toUpperCase();
  const bodyText = typeof init?.body === 'string' ? init.body : '';
  const body = bodyText ? JSON.parse(bodyText) : {};

  const db = loadDb();

  // 1. POST /api/auth/login
  if (path === '/api/auth/login' && method === 'POST') {
    const identifier = String(body.identifier || '').trim();
    const password = String(body.password || '');

    if (identifier.toLowerCase().includes('@samsung.com')) {
      return jsonResponse(
        {
          message:
            'Vì lý do bảo mật dữ liệu công ty, hệ thống không cho phép sử dụng email @samsung.com. Vui lòng đăng nhập bằng Số GEN (8 chữ số) hoặc Gmail cá nhân!',
        },
        400
      );
    }

    const clean = identifier.toLowerCase();
    const user = db.users.find(
      (u) => u.employeeId === clean || u.email.toLowerCase() === clean
    );
    if (!user) {
      return jsonResponse(
        { message: 'Không tìm thấy tài khoản với Số GEN hoặc Gmail này.' },
        401
      );
    }
    if (user.passwordPlain !== password) {
      return jsonResponse(
        { message: 'Mật khẩu không chính xác. Vui lòng thử lại!' },
        401
      );
    }

    return jsonResponse({
      accessToken: encodeToken(user),
      user: {
        id: user.id,
        employeeId: user.employeeId,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        department: user.department,
        avatarUrl: user.avatarUrl,
        role: user.role,
        totalScore: user.totalScore,
        completedDays: user.completedDays,
      },
    });
  }

  // 2. POST /api/auth/register
  if (path === '/api/auth/register' && method === 'POST') {
    const employeeId = String(body.employeeId || '').trim();
    const fullName = String(body.fullName || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');

    if (db.users.some((u) => u.employeeId === employeeId)) {
      return jsonResponse(
        { message: `Số GEN ${employeeId} đã được đăng ký trên hệ thống!` },
        409
      );
    }
    if (db.users.some((u) => u.email.toLowerCase() === email)) {
      return jsonResponse({ message: `Địa chỉ Gmail ${email} đã được sử dụng!` }, 409);
    }

    const newUser: UserRecord = {
      id: `u-${Date.now()}`,
      employeeId,
      fullName: fullName || `Nhân viên ${employeeId}`,
      email,
      phone: '',
      department: 'General',
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(employeeId)}`,
      passwordPlain: password,
      role: 'USER',
      totalScore: 0,
      totalTimeMs: 0,
      completedDays: 0,
      createdAt: new Date().toISOString(),
    };

    db.users.push(newUser);
    saveDb(db);

    return jsonResponse({
      accessToken: encodeToken(newUser),
      user: {
        id: newUser.id,
        employeeId: newUser.employeeId,
        fullName: newUser.fullName,
        email: newUser.email,
        phone: newUser.phone,
        department: newUser.department,
        avatarUrl: newUser.avatarUrl,
        role: newUser.role,
        totalScore: newUser.totalScore,
        completedDays: newUser.completedDays,
      },
    });
  }

  // 3. POST /api/auth/forgot-password
  if (path === '/api/auth/forgot-password' && method === 'POST') {
    const email = String(body.email || '').trim().toLowerCase();
    const employeeId = body.employeeId ? String(body.employeeId).trim() : undefined;

    const user = db.users.find((u) => u.email.toLowerCase() === email);
    if (!user) {
      return jsonResponse(
        { message: 'Không tìm thấy tài khoản nào đăng ký với địa chỉ Gmail này.' },
        404
      );
    }
    if (employeeId && user.employeeId !== employeeId) {
      return jsonResponse(
        { message: 'Số GEN (8 chữ số) không khớp với địa chỉ Gmail đã đăng ký.' },
        400
      );
    }

    const otpCode = String(Math.floor(100000 + Math.random() * 900000));
    const resetToken = Math.random().toString(36).slice(2) + Date.now().toString(36);
    user.resetOtpCode = otpCode;
    user.resetToken = resetToken;
    user.resetExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    saveDb(db);

    const resetLink = `${window.location.origin}${window.location.pathname}?resetToken=${resetToken}&email=${encodeURIComponent(user.email)}`;

    return jsonResponse({
      message: `Đã tạo mã xác thực OTP & Link khôi phục cho ${user.email}`,
      sentViaSmtp: false,
      demoEmailPreview: {
        otpCode,
        resetToken,
        resetLink,
      },
    });
  }

  // 4. POST /api/auth/reset-password
  if (path === '/api/auth/reset-password' && method === 'POST') {
    const email = String(body.email || '').trim().toLowerCase();
    const otpOrToken = String(body.otpOrToken || '').trim();
    const newPassword = String(body.newPassword || '');

    const user = db.users.find((u) => u.email.toLowerCase() === email);
    if (!user || !user.resetExpiresAt) {
      return jsonResponse(
        { message: 'Yêu cầu đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.' },
        400
      );
    }
    if (
      user.resetOtpCode !== otpOrToken &&
      user.resetToken !== otpOrToken
    ) {
      return jsonResponse(
        { message: 'Mã xác thực OTP hoặc đường dẫn khôi phục không chính xác!' },
        400
      );
    }

    user.passwordPlain = newPassword;
    user.resetOtpCode = null;
    user.resetToken = null;
    user.resetExpiresAt = null;
    saveDb(db);

    return jsonResponse({
      message: 'Đặt lại mật khẩu thành công! Bạn có thể đăng nhập ngay bằng mật khẩu mới.',
    });
  }

  // Xác thực người dùng cho các API bên dưới
  const currentUser = decodeUserFromHeaders(init?.headers, db);
  if (!currentUser) {
    return jsonResponse({ message: 'Phiên đăng nhập hết hạn hoặc không hợp lệ.' }, 401);
  }

  // 5. GET /api/challenges
  if (path === '/api/challenges' && method === 'GET') {
    const userAttempts = db.attempts.filter((a) => a.userId === currentUser.id);
    const list = db.challenges.map((c) => {
      const attempt = userAttempts.find((a) => a.dayNumber === c.dayNumber);
      const unlocked = isDayUnlocked(c);
      let stars = 0;
      if (attempt) {
        if (attempt.score >= 90) stars = 3;
        else if (attempt.score >= 60) stars = 2;
        else stars = 1;
      }
      return {
        id: c.id,
        dayNumber: c.dayNumber,
        title: c.title,
        dateLabel: c.dateLabel,
        unlockDate: c.unlockDate,
        isPublished: c.isPublished,
        questionCount: c.questions.length,
        activePlayersCount: 0,
        status: !unlocked ? 'LOCKED' : attempt ? 'COMPLETED' : 'OPEN',
        isCompletedByMe: Boolean(attempt),
        stars,
        score: attempt?.score ?? null,
        timeSpentMs: attempt?.timeSpentMs ?? null,
      };
    });
    return jsonResponse(list);
  }

  // 6. POST /api/challenges/:dayNumber/start
  const startMatch = path.match(/^\/api\/challenges\/(\d+)\/start$/);
  if (startMatch && method === 'POST') {
    const dayNumber = Number(startMatch[1]);
    const challenge = db.challenges.find((c) => c.dayNumber === dayNumber);
    if (!challenge) {
      return jsonResponse({ message: 'Không tìm thấy ngày thử thách này.' }, 404);
    }
    if (!isDayUnlocked(challenge)) {
      return jsonResponse(
        { message: `${challenge.title} hiện đang khóa! Vui lòng quay lại khi thử thách được mở.` },
        403
      );
    }

    const startedAt = Date.now();
    const snapshot: QuestionItem[] = JSON.parse(JSON.stringify(challenge.questions));
    activeSessions.set(`${currentUser.id}:${dayNumber}`, {
      userId: currentUser.id,
      employeeId: currentUser.employeeId,
      fullName: currentUser.fullName,
      dayNumber,
      startedAt,
      questionsSnapshot: snapshot,
    });

    return jsonResponse({
      dayNumber: challenge.dayNumber,
      title: challenge.title,
      dateLabel: challenge.dateLabel,
      startedAt,
      questions: snapshot.map((q) => ({
        id: q.id,
        orderIndex: q.orderIndex,
        questionType: q.questionType,
        categoryLabel: q.categoryLabel,
        promptText: q.promptText,
        statementText: q.statementText,
        targetWord: q.targetWord,
        hasPromptAudio: q.hasPromptAudio,
        audioNote: q.audioNote,
        promptAudioUrl: q.promptAudioUrl,
        promptVideoUrl: q.promptVideoUrl,
        options: q.options,
        points: q.points,
      })),
    });
  }

  // 7. GET /api/challenges/:dayNumber/session-status
  const statusMatch = path.match(/^\/api\/challenges\/(\d+)\/session-status$/);
  if (statusMatch && method === 'GET') {
    const dayNumber = Number(statusMatch[1]);
    const challenge = db.challenges.find((c) => c.dayNumber === dayNumber);
    if (!challenge) return jsonResponse({ status: 'NOT_FOUND' }, 404);

    const session = activeSessions.get(`${currentUser.id}:${dayNumber}`);
    const unlocked = isDayUnlocked(challenge);
    const forceTime = forceLockedDays.get(dayNumber);

    if (forceTime && (!session || forceTime >= session.startedAt)) {
      return jsonResponse({
        status: 'FORCE_LOCKED',
        message:
          '🔒 Ban tổ chức vừa khóa khẩn cấp thử thách này để cập nhật nội dung. Lượt làm hiện tại chưa bị tính, bạn có thể làm lại sau khi mở khóa!',
      });
    }
    if (!unlocked && session) {
      return jsonResponse({
        status: 'GRACE_PERIOD',
        message:
          '⚠️ Ban tổ chức vừa đóng cổng nhận người mới cho ngày này. Vì bạn đã vào thi trước khi khóa, bạn vẫn được phép hoàn thành và nộp bài bình thường!',
      });
    }
    if (!unlocked && !session) {
      return jsonResponse({
        status: 'FORCE_LOCKED',
        message: '🔒 Ngày thử thách này hiện đã bị khóa.',
      });
    }
    return jsonResponse({ status: 'ACTIVE', message: null });
  }

  // 8. POST /api/challenges/:dayNumber/submit
  const submitMatch = path.match(/^\/api\/challenges\/(\d+)\/submit$/);
  if (submitMatch && method === 'POST') {
    const dayNumber = Number(submitMatch[1]);
    const challenge = db.challenges.find((c) => c.dayNumber === dayNumber);
    if (!challenge) return jsonResponse({ message: 'Không tìm thấy thử thách.' }, 404);

    const session = activeSessions.get(`${currentUser.id}:${dayNumber}`);
    const questionsToGrade = session?.questionsSnapshot || challenge.questions;
    const elapsedMs = session
      ? Math.max(2000, Date.now() - session.startedAt)
      : Number(body.clientTimeMs) || 30000;

    let score = 0;
    let correctCount = 0;
    let wrongCount = 0;

    const detailedReview = questionsToGrade.map((q) => {
      const selectedOptionId = body.answers?.[q.id] || null;
      const isCorrect = selectedOptionId === q.correctOptionId;
      if (isCorrect) {
        score += q.points;
        correctCount += 1;
      } else {
        wrongCount += 1;
      }
      const correctOption = q.options.find((o) => o.id === q.correctOptionId);
      const selectedOption = q.options.find((o) => o.id === selectedOptionId);

      return {
        questionId: q.id,
        orderIndex: q.orderIndex,
        promptText: q.promptText,
        targetWord: q.targetWord,
        promptAudioUrl: q.promptAudioUrl,
        promptVideoUrl: q.promptVideoUrl,
        options: q.options,
        selectedOptionId,
        selectedOptionText: selectedOption?.text || 'Chưa chọn',
        correctOptionId: q.correctOptionId,
        correctOptionText: correctOption?.text || '',
        isCorrect,
        explanation: q.explanation,
      };
    });

    const existingAttempt = db.attempts.find(
      (a) => a.userId === currentUser.id && a.dayNumber === dayNumber
    );
    const isFirstOfficialAttempt = !existingAttempt;

    if (isFirstOfficialAttempt) {
      db.attempts.push({
        id: `att-${Date.now()}`,
        userId: currentUser.id,
        challengeId: challenge.id,
        dayNumber,
        score,
        correctCount,
        wrongCount,
        timeSpentMs: elapsedMs,
        answersDetail: body.answers || {},
        startedAt: new Date(Date.now() - elapsedMs).toISOString(),
        completedAt: new Date().toISOString(),
      });
      currentUser.totalScore += score;
      currentUser.totalTimeMs += elapsedMs;
      currentUser.completedDays += 1;
      saveDb(db);
    }

    activeSessions.delete(`${currentUser.id}:${dayNumber}`);

    return jsonResponse({
      dayNumber,
      score,
      totalPoints: questionsToGrade.length * 10,
      correctCount,
      wrongCount,
      timeSpentMs: elapsedMs,
      isFirstOfficialAttempt,
      submittedDuringGracePeriod: false,
      detailedReview,
    });
  }

  // 9. GET /api/leaderboard
  if (path === '/api/leaderboard' && method === 'GET') {
    const scope = url.searchParams.get('scope') || 'company';
    const list =
      scope === 'department' && currentUser.department
        ? getLeaderboard(db, currentUser.department)
        : getLeaderboard(db);
    const myRank = list.find((item) => item.id === currentUser.id) || null;
    return jsonResponse({
      scope,
      department: currentUser.department,
      topList: list.slice(0, 50),
      myRank,
    });
  }

  // 10. GET /api/profile/me
  if (path === '/api/profile/me' && method === 'GET') {
    const rankings = getLeaderboard(db);
    const myRank = rankings.find((r) => r.id === currentUser.id)?.rank || rankings.length;
    const attempts = db.attempts.filter((a) => a.userId === currentUser.id);
    return jsonResponse({
      user: {
        id: currentUser.id,
        employeeId: currentUser.employeeId,
        fullName: currentUser.fullName,
        email: currentUser.email,
        phone: currentUser.phone,
        department: currentUser.department,
        avatarUrl: currentUser.avatarUrl,
        role: currentUser.role,
        totalScore: currentUser.totalScore,
        totalTimeMs: currentUser.totalTimeMs,
        completedDays: currentUser.completedDays,
        rank: myRank,
      },
      attempts,
    });
  }

  // ==================== ADMIN ENDPOINTS ====================

  // 11. GET /api/admin/challenges/:dayNumber
  const adminDayMatch = path.match(/^\/api\/admin\/challenges\/(\d+)$/);
  if (adminDayMatch && method === 'GET') {
    const dayNumber = Number(adminDayMatch[1]);
    const challenge = db.challenges.find((c) => c.dayNumber === dayNumber);
    if (!challenge) return jsonResponse({ message: 'Không tìm thấy ngày thử thách.' }, 404);
    return jsonResponse({
      ...challenge,
      isUnlocked: isDayUnlocked(challenge),
      activePlayers: [],
    });
  }

  // 12. PUT /api/admin/challenges/:dayNumber/unlock
  const adminUnlockMatch = path.match(/^\/api\/admin\/challenges\/(\d+)\/unlock$/);
  if (adminUnlockMatch && method === 'PUT') {
    const dayNumber = Number(adminUnlockMatch[1]);
    const challenge = db.challenges.find((c) => c.dayNumber === dayNumber);
    if (!challenge) return jsonResponse({ message: 'Không tìm thấy ngày thử thách.' }, 404);

    if (body.title !== undefined) challenge.title = String(body.title).trim();
    if (body.dateLabel !== undefined) challenge.dateLabel = String(body.dateLabel).trim();

    let msg = `Đã cập nhật ${challenge.title} (${challenge.dateLabel})`;
    if (body.unlockNow === true) {
      challenge.unlockDate = new Date(Date.now() - 60000).toISOString();
      challenge.isPublished = true;
      forceLockedDays.delete(dayNumber);
      msg = `🔓 Đã MỞ KHÓA ${challenge.title} cho nhân viên vào làm bài!`;
    } else if (body.unlockNow === false) {
      challenge.unlockDate = new Date(Date.now() + 86400000 * 30).toISOString();
      if (body.lockMode === 'FORCE') {
        forceLockedDays.set(dayNumber, Date.now());
        msg = `🔒 Đã KHÓA CƯỠNG CHẾ ${challenge.title}.`;
      } else {
        msg = `🛡️ Đã KHÓA MỀM ${challenge.title}: Chặn người mới vào, vẫn cho phép người đang làm dở nộp bài!`;
      }
    }

    saveDb(db);
    return jsonResponse({
      message: msg,
      challenge,
      activePlayersAffected: 0,
    });
  }

  // 13. POST /api/admin/challenges/:dayNumber/questions
  const adminAddQMatch = path.match(/^\/api\/admin\/challenges\/(\d+)\/questions$/);
  if (adminAddQMatch && method === 'POST') {
    const dayNumber = Number(adminAddQMatch[1]);
    const challenge = db.challenges.find((c) => c.dayNumber === dayNumber);
    if (!challenge) return jsonResponse({ message: 'Không tìm thấy ngày thử thách.' }, 404);

    const newQ: QuestionItem = {
      id: `day-${dayNumber}-q-${Date.now()}`,
      challengeId: challenge.id,
      orderIndex: challenge.questions.length + 1,
      questionType: body.questionType || 'LISTEN_AND_CHOOSE',
      categoryLabel: body.categoryLabel || 'Câu hỏi tùy chỉnh',
      promptText: String(body.promptText || '').trim(),
      statementText: body.statementText?.trim() || undefined,
      targetWord: String(body.targetWord || '').trim(),
      hasPromptAudio: Boolean(body.hasPromptAudio),
      audioNote: body.audioNote || '',
      promptAudioUrl: body.promptAudioUrl?.trim() || undefined,
      promptVideoUrl: body.promptVideoUrl?.trim() || undefined,
      options: Array.isArray(body.options) ? body.options : [],
      correctOptionId: body.correctOptionId || 'A',
      explanation: String(body.explanation || '').trim(),
      points: Number(body.points) || 10,
    };

    challenge.questions.push(newQ);
    saveDb(db);
    return jsonResponse({
      message: `Đã thêm Câu ${newQ.orderIndex} vào Day ${dayNumber} thành công!`,
      question: newQ,
    });
  }

  // 14. PUT / DELETE /api/admin/challenges/:dayNumber/questions/:questionId
  const adminEditQMatch = path.match(/^\/api\/admin\/challenges\/(\d+)\/questions\/([^/]+)$/);
  if (adminEditQMatch && (method === 'PUT' || method === 'DELETE')) {
    const dayNumber = Number(adminEditQMatch[1]);
    const questionId = adminEditQMatch[2];
    const challenge = db.challenges.find((c) => c.dayNumber === dayNumber);
    if (!challenge) return jsonResponse({ message: 'Không tìm thấy ngày thử thách.' }, 404);

    if (method === 'PUT') {
      const idx = challenge.questions.findIndex((q) => q.id === questionId);
      if (idx === -1) return jsonResponse({ message: 'Không tìm thấy câu hỏi.' }, 404);
      challenge.questions[idx] = {
        ...challenge.questions[idx],
        ...body,
        id: challenge.questions[idx].id,
        challengeId: challenge.id,
        orderIndex: challenge.questions[idx].orderIndex,
      };
      saveDb(db);
      return jsonResponse({
        message: `Đã lưu thay đổi cho Câu ${challenge.questions[idx].orderIndex} (Day ${dayNumber})!`,
        question: challenge.questions[idx],
      });
    } else {
      challenge.questions = challenge.questions
        .filter((q) => q.id !== questionId)
        .map((q, i) => ({ ...q, orderIndex: i + 1 }));
      saveDb(db);
      return jsonResponse({
        message: `Đã xóa câu hỏi và cập nhật lại thứ tự câu trong Day ${dayNumber}.`,
      });
    }
  }

  // 15. POST /api/admin/challenges/:dayNumber/clone-to-all
  const adminCloneMatch = path.match(/^\/api\/admin\/challenges\/(\d+)\/clone-to-all$/);
  if (adminCloneMatch && method === 'POST') {
    const sourceDay = Number(adminCloneMatch[1]);
    const source = db.challenges.find((c) => c.dayNumber === sourceDay);
    if (!source) return jsonResponse({ message: 'Không tìm thấy ngày nguồn.' }, 404);

    let count = 0;
    for (const c of db.challenges) {
      if (c.dayNumber === sourceDay) continue;
      c.questions = source.questions.map((q, idx) => ({
        ...JSON.parse(JSON.stringify(q)),
        id: `day-${c.dayNumber}-q-${idx + 1}`,
        challengeId: c.id,
        orderIndex: idx + 1,
      }));
      count++;
    }
    saveDb(db);
    return jsonResponse({
      message: `Đã đồng bộ bộ câu hỏi của Day ${sourceDay} sang ${count} ngày còn lại!`,
    });
  }

  // 16. POST /api/admin/upload-media
  if (path === '/api/admin/upload-media' && method === 'POST') {
    return jsonResponse({
      message: 'Tải file media lên thành công!',
      url: body.base64Data,
    });
  }

  // 17. POST /api/admin/reseed
  if (path === '/api/admin/reseed' && method === 'POST') {
    const fresh = createInitialDb();
    saveDb(fresh);
    return jsonResponse({
      message: 'Đã nạp lại (Re-seed) toàn bộ 30 ngày thử thách và Bộ 10 Câu Hỏi chuẩn thành công!',
    });
  }

  return jsonResponse({ message: 'API route not found' }, 404);
}

export function installClientApiFallback() {
  const originalFetch = window.fetch.bind(window);

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

    // Nếu đang chạy trên GitHub Pages (*.github.io) thì xử lý trực tiếp bằng Client Store để siêu mượt, không báo lỗi 404 console
    if (window.location.hostname.endsWith('github.io')) {
      return handleClientApi(urlStr, init);
    }

    // Ở môi trường khác (Localhost / VPS), thử gọi Backend thật trước, nếu Backend tắt hoặc trả về HTML/404 thì tự động chuyển sang Client Store
    try {
      const response = await originalFetch(input, init);
      const contentType = response.headers.get('content-type') || '';
      if (response.status === 404 && !contentType.includes('application/json')) {
        return handleClientApi(urlStr, init);
      }
      if (response.status >= 502 && response.status <= 504) {
        return handleClientApi(urlStr, init);
      }
      return response;
    } catch {
      return handleClientApi(urlStr, init);
    }
  };
}

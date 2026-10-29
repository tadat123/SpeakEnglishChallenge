import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { DailyChallengeItem, generate30DaysChallenges } from './seedData.js';

export interface UserRecord {
  id: string;
  employeeId: string; // 8-digit GEN ID
  fullName: string;
  email: string; // Personal email (No @samsung.com)
  phone: string;
  department: string;
  avatarUrl: string;
  passwordHash: string;
  role: 'USER' | 'ADMIN';
  totalScore: number;
  totalTimeMs: number;
  completedDays: number;
  resetOtpCode?: string | null;
  resetToken?: string | null;
  resetExpiresAt?: string | null;
  createdAt: string;
}

export interface AttemptRecord {
  id: string;
  userId: string;
  challengeId: number;
  dayNumber: number;
  score: number;
  correctCount: number;
  wrongCount: number;
  timeSpentMs: number;
  answersDetail: Record<string, 'A' | 'B' | 'C' | 'D'>; // Tối ưu dung lượng DB cho 27.000 nhân viên
  startedAt: string;
  completedAt: string;
}

interface DatabaseShape {
  users: UserRecord[];
  challenges: DailyChallengeItem[];
  attempts: AttemptRecord[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Hằng số tính điểm ZSET chuẩn theo tài liệu: RedisScore = (TotalPoints * 10^7) + (T_max - T_total_seconds)
const T_MAX = 9999999;

export function computeCompositeLeaderboardScore(totalScore: number, totalTimeMs: number): number {
  const totalSeconds = Math.min(T_MAX, Math.floor(totalTimeMs / 1000));
  return totalScore * 10_000_000 + (T_MAX - totalSeconds);
}

class DataStore {
  private data: DatabaseShape;
  // Lưu session chống gian lận: key = `${userId}:${dayNumber}` -> startedAt timestamp (ms)
  private activeSessions = new Map<string, number>();

  constructor() {
    this.data = this.loadOrSeed();
  }

  private loadOrSeed(): DatabaseShape {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw) as DatabaseShape;
        // Tự động cập nhật Bộ 10 Câu Hỏi mới nếu dữ liệu cũ chưa có questionType
        const firstQ = parsed.challenges?.[0]?.questions?.[0] as any;
        if (!firstQ || !firstQ.questionType) {
          parsed.challenges = generate30DaysChallenges();
          fs.writeFileSync(DB_FILE, JSON.stringify(parsed, null, 2), 'utf-8');
        }
        return parsed;
      } catch (e) {
        console.warn('Khởi tạo lại dữ liệu mẫu do file db.json lỗi:', e);
      }
    }

    const defaultPassHash = bcrypt.hashSync('Speak@2026', 10);
    const adminPassHash = bcrypt.hashSync('Admin@2026', 10);

    const sampleUsers: UserRecord[] = [
      {
        id: 'u-admin',
        employeeId: '88888888',
        fullName: 'Ban Tổ Chức (Admin)',
        email: 'admin.speakright@gmail.com',
        phone: '0901234567',
        department: 'HR & Training',
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=AdminSpeak',
        passwordHash: adminPassHash,
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
        passwordHash: defaultPassHash,
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
        passwordHash: defaultPassHash,
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
        passwordHash: defaultPassHash,
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
        passwordHash: defaultPassHash,
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
        passwordHash: defaultPassHash,
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
        passwordHash: defaultPassHash,
        role: 'USER',
        totalScore: 2600,
        totalTimeMs: 630000,
        completedDays: 13,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'u-6',
        employeeId: '20260006',
        fullName: 'Vũ Đức Thắng',
        email: 'ducthang.eng@gmail.com',
        phone: '0912345006',
        department: 'Quality Assurance (QA)',
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=DucThang',
        passwordHash: defaultPassHash,
        role: 'USER',
        totalScore: 2490,
        totalTimeMs: 660000,
        completedDays: 12,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'u-7',
        employeeId: '20260007',
        fullName: 'Hoàng Bích Ngọc',
        email: 'bichngoc.fin@gmail.com',
        phone: '0912345007',
        department: 'Logistics & Supply',
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=BichNgoc',
        passwordHash: defaultPassHash,
        role: 'USER',
        totalScore: 2410,
        totalTimeMs: 690000,
        completedDays: 12,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'u-8',
        employeeId: '20260008',
        fullName: 'Bùi Tiến Dũng',
        email: 'tiendung.pe@gmail.com',
        phone: '0912345008',
        department: 'Production',
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=TienDung',
        passwordHash: defaultPassHash,
        role: 'USER',
        totalScore: 2350,
        totalTimeMs: 700000,
        completedDays: 12,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'u-9',
        employeeId: '20260009',
        fullName: 'Đặng Khánh Vy',
        email: 'khanhvy.mkt@gmail.com',
        phone: '0912345009',
        department: 'R&D Center',
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=KhanhVy',
        passwordHash: defaultPassHash,
        role: 'USER',
        totalScore: 2290,
        totalTimeMs: 710000,
        completedDays: 12,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'u-10',
        employeeId: '20260010',
        fullName: 'Ngô Quang Hải',
        email: 'quanghai.qa@gmail.com',
        phone: '0912345010',
        department: 'Quality Assurance (QA)',
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=QuangHai',
        passwordHash: defaultPassHash,
        role: 'USER',
        totalScore: 2210,
        totalTimeMs: 725000,
        completedDays: 12,
        createdAt: new Date().toISOString(),
      },
    ];

    const challenges = generate30DaysChallenges();

    const initialData: DatabaseShape = {
      users: sampleUsers,
      challenges,
      attempts: [],
    };

    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
    return initialData;
  }

  public save() {
    fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
  }

  public resetAndReseed(): DatabaseShape {
    if (fs.existsSync(DB_FILE)) {
      fs.unlinkSync(DB_FILE);
    }
    this.data = this.loadOrSeed();
    return this.data;
  }

  public getUsers() {
    return this.data.users;
  }

  public findUserByIdentifier(identifier: string): UserRecord | undefined {
    const clean = identifier.trim().toLowerCase();
    return this.data.users.find(
      (u) => u.employeeId === clean || u.email.toLowerCase() === clean
    );
  }

  public findUserById(id: string): UserRecord | undefined {
    return this.data.users.find((u) => u.id === id);
  }

  public createUser(user: UserRecord): UserRecord {
    this.data.users.push(user);
    this.save();
    return user;
  }

  public getChallenges(): DailyChallengeItem[] {
    return this.data.challenges;
  }

  public getChallengeByDay(dayNumber: number): DailyChallengeItem | undefined {
    return this.data.challenges.find((c) => c.dayNumber === dayNumber);
  }

  public getUserAttempts(userId: string): AttemptRecord[] {
    return this.data.attempts.filter((a) => a.userId === userId);
  }

  public getAttempt(userId: string, dayNumber: number): AttemptRecord | undefined {
    return this.data.attempts.find(
      (a) => a.userId === userId && a.dayNumber === dayNumber
    );
  }

  public startQuizSession(userId: string, dayNumber: number): number {
    const now = Date.now();
    this.activeSessions.set(`${userId}:${dayNumber}`, now);
    return now;
  }

  public getQuizSessionStart(userId: string, dayNumber: number): number | undefined {
    return this.activeSessions.get(`${userId}:${dayNumber}`);
  }

  public recordAttempt(attempt: AttemptRecord): { isFirstOfficialAttempt: boolean } {
    const existing = this.getAttempt(attempt.userId, attempt.dayNumber);
    if (existing) {
      // Đã có điểm chính thức lần đầu -> các lần làm lại chỉ để luyện tập, không cộng dồn điểm
      return { isFirstOfficialAttempt: false };
    }

    this.data.attempts.push(attempt);
    const user = this.findUserById(attempt.userId);
    if (user) {
      user.totalScore += attempt.score;
      user.totalTimeMs += attempt.timeSpentMs;
      user.completedDays += 1;
    }
    this.save();
    return { isFirstOfficialAttempt: true };
  }

  public getLeaderboard(department?: string) {
    const filtered = department
      ? this.data.users.filter((u) => u.department === department)
      : this.data.users;

    const sorted = [...filtered].sort((a, b) => {
      const scoreA = computeCompositeLeaderboardScore(a.totalScore, a.totalTimeMs);
      const scoreB = computeCompositeLeaderboardScore(b.totalScore, b.totalTimeMs);
      return scoreB - scoreA;
    });

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
}

export const store = new DataStore();

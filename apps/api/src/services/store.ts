import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { DailyChallengeItem, QuestionItem, generate30DaysChallenges } from './seedData.js';

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
  answersDetail: Record<string, 'A' | 'B' | 'C' | 'D'>;
  startedAt: string;
  completedAt: string;
}

export interface ActiveQuizSession {
  userId: string;
  employeeId: string;
  fullName: string;
  dayNumber: number;
  startedAt: number;
  // Snapshot bộ câu hỏi lúc nhân viên bắt đầu làm bài để nếu Admin sửa câu hỏi giữa chừng không làm lỗi bài đang thi
  questionsSnapshot: QuestionItem[];
}

interface DatabaseShape {
  users: UserRecord[];
  challenges: DailyChallengeItem[];
  attempts: AttemptRecord[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

const T_MAX = 9999999;
// Thời gian ân hạn tối đa cho người đang làm bài khi Admin khóa mềm (15 phút)
const SESSION_TTL_MS = 15 * 60 * 1000;

export function computeCompositeLeaderboardScore(totalScore: number, totalTimeMs: number): number {
  const totalSeconds = Math.min(T_MAX, Math.floor(totalTimeMs / 1000));
  return totalScore * 10_000_000 + (T_MAX - totalSeconds);
}

class DataStore {
  private data: DatabaseShape;
  // key = `${userId}:${dayNumber}` -> ActiveQuizSession
  private activeSessions = new Map<string, ActiveQuizSession>();
  // Lưu thời điểm Admin thực hiện Force Lock cho từng ngày
  private forceLockedDays = new Map<number, number>();

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
    this.activeSessions.clear();
    this.forceLockedDays.clear();
    this.data = this.loadOrSeed();
    return this.data;
  }

  private pruneExpiredSessions() {
    const now = Date.now();
    for (const [key, session] of this.activeSessions.entries()) {
      if (now - session.startedAt > SESSION_TTL_MS) {
        this.activeSessions.delete(key);
      }
    }
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

  public isDayUnlocked(challenge: DailyChallengeItem): boolean {
    return new Date(challenge.unlockDate).getTime() <= Date.now() && challenge.isPublished;
  }

  public getUserAttempts(userId: string): AttemptRecord[] {
    return this.data.attempts.filter((a) => a.userId === userId);
  }

  public getAttempt(userId: string, dayNumber: number): AttemptRecord | undefined {
    return this.data.attempts.find(
      (a) => a.userId === userId && a.dayNumber === dayNumber
    );
  }

  // ==================== QUẢN LÝ PHIÊN THI ĐANG DIỄN RA & CHỐNG XUNG ĐỘT KHI KHÓA ====================

  public startQuizSession(userId: string, dayNumber: number): ActiveQuizSession | null {
    this.pruneExpiredSessions();
    const user = this.findUserById(userId);
    const challenge = this.getChallengeByDay(dayNumber);
    if (!user || !challenge) return null;

    const now = Date.now();
    // Chụp lại bản sao bộ câu hỏi ngay thời điểm nhân viên bắt đầu làm bài
    const questionsSnapshot: QuestionItem[] = JSON.parse(
      JSON.stringify(challenge.questions)
    );

    const session: ActiveQuizSession = {
      userId: user.id,
      employeeId: user.employeeId,
      fullName: user.fullName,
      dayNumber,
      startedAt: now,
      questionsSnapshot,
    };

    this.activeSessions.set(`${userId}:${dayNumber}`, session);
    return session;
  }

  public getActiveSession(userId: string, dayNumber: number): ActiveQuizSession | undefined {
    this.pruneExpiredSessions();
    return this.activeSessions.get(`${userId}:${dayNumber}`);
  }

  public completeActiveSession(userId: string, dayNumber: number) {
    this.activeSessions.delete(`${userId}:${dayNumber}`);
  }

  public getActiveSessionsForDay(dayNumber: number): ActiveQuizSession[] {
    this.pruneExpiredSessions();
    const list: ActiveQuizSession[] = [];
    for (const s of this.activeSessions.values()) {
      if (s.dayNumber === dayNumber) {
        list.push(s);
      }
    }
    return list;
  }

  public getAllActiveSessionCounts(): Record<number, number> {
    this.pruneExpiredSessions();
    const counts: Record<number, number> = {};
    for (const s of this.activeSessions.values()) {
      counts[s.dayNumber] = (counts[s.dayNumber] || 0) + 1;
    }
    return counts;
  }

  // Kiểm tra xem ngày thi có bị Admin khóa cưỡng chế (Force Lock) sau khi user bắt đầu làm bài hay không
  public isSessionForceLocked(dayNumber: number, sessionStartedAt?: number): boolean {
    const forceLockTime = this.forceLockedDays.get(dayNumber);
    if (!forceLockTime) return false;
    if (!sessionStartedAt) return true;
    return forceLockTime >= sessionStartedAt;
  }

  // Cập nhật thông tin ngày thi + Cơ chế Khóa Mềm (Graceful) hoặc Khóa Cưỡng Chế (Force)
  public updateChallengeDay(
    dayNumber: number,
    payload: {
      title?: string;
      dateLabel?: string;
      unlockNow?: boolean;
      lockMode?: 'GRACEFUL' | 'FORCE';
    }
  ): {
    challenge: DailyChallengeItem | undefined;
    activePlayersAffected: number;
    lockModeUsed?: 'GRACEFUL' | 'FORCE';
  } {
    const challenge = this.getChallengeByDay(dayNumber);
    if (!challenge) return { challenge: undefined, activePlayersAffected: 0 };

    if (payload.title !== undefined) challenge.title = payload.title.trim();
    if (payload.dateLabel !== undefined) challenge.dateLabel = payload.dateLabel.trim();

    const activePlayers = this.getActiveSessionsForDay(dayNumber);

    if (payload.unlockNow !== undefined) {
      if (payload.unlockNow) {
        // Mở khóa ngày thi
        challenge.unlockDate = new Date(Date.now() - 60000).toISOString();
        challenge.isPublished = true;
        this.forceLockedDays.delete(dayNumber);
      } else {
        // Khóa ngày thi
        challenge.unlockDate = new Date(Date.now() + 86400000 * 30).toISOString();
        const mode = payload.lockMode || 'GRACEFUL';
        if (mode === 'FORCE') {
          // Khóa cưỡng chế: Hủy toàn bộ phiên đang làm dở của ngày này ngay lập tức
          this.forceLockedDays.set(dayNumber, Date.now());
          for (const s of activePlayers) {
            this.activeSessions.delete(`${s.userId}:${dayNumber}`);
          }
        }
        // Nếu mode === 'GRACEFUL' (Khóa mềm): Người mới không vào được, nhưng activeSessions cũ vẫn giữ nguyên để họ nộp bài nốt!
      }
    }

    this.save();
    return {
      challenge,
      activePlayersAffected: activePlayers.length,
      lockModeUsed: payload.lockMode || 'GRACEFUL',
    };
  }

  // ==================== CRUD CÂU HỎI (TEXT, AUDIO, VIDEO) CHO ADMIN ====================

  public addQuestionToDay(
    dayNumber: number,
    qData: Omit<QuestionItem, 'id' | 'challengeId' | 'orderIndex'>
  ): QuestionItem | null {
    const challenge = this.getChallengeByDay(dayNumber);
    if (!challenge) return null;

    const newOrderIndex = challenge.questions.length + 1;
    const newQuestion: QuestionItem = {
      ...qData,
      id: `day-${dayNumber}-q-${crypto.randomUUID().slice(0, 8)}`,
      challengeId: challenge.id,
      orderIndex: newOrderIndex,
    };

    challenge.questions.push(newQuestion);
    this.save();
    return newQuestion;
  }

  public updateQuestionInDay(
    dayNumber: number,
    questionId: string,
    qData: Partial<QuestionItem>
  ): QuestionItem | null {
    const challenge = this.getChallengeByDay(dayNumber);
    if (!challenge) return null;

    const idx = challenge.questions.findIndex((q) => q.id === questionId);
    if (idx === -1) return null;

    challenge.questions[idx] = {
      ...challenge.questions[idx],
      ...qData,
      id: challenge.questions[idx].id,
      challengeId: challenge.id,
      orderIndex: challenge.questions[idx].orderIndex,
    };

    this.save();
    return challenge.questions[idx];
  }

  public deleteQuestionFromDay(dayNumber: number, questionId: string): boolean {
    const challenge = this.getChallengeByDay(dayNumber);
    if (!challenge) return false;

    const beforeLen = challenge.questions.length;
    challenge.questions = challenge.questions
      .filter((q) => q.id !== questionId)
      .map((q, index) => ({
        ...q,
        orderIndex: index + 1,
      }));

    if (challenge.questions.length === beforeLen) return false;
    this.save();
    return true;
  }

  public copyQuestionsToAllDays(sourceDayNumber: number): number {
    const source = this.getChallengeByDay(sourceDayNumber);
    if (!source) return 0;

    let updatedCount = 0;
    for (const c of this.data.challenges) {
      if (c.dayNumber === sourceDayNumber) continue;
      c.questions = source.questions.map((q, idx) => ({
        ...JSON.parse(JSON.stringify(q)),
        id: `day-${c.dayNumber}-q-${idx + 1}`,
        challengeId: c.id,
        orderIndex: idx + 1,
      }));
      updatedCount++;
    }
    this.save();
    return updatedCount;
  }

  public recordAttempt(attempt: AttemptRecord): { isFirstOfficialAttempt: boolean } {
    const existing = this.getAttempt(attempt.userId, attempt.dayNumber);
    if (existing) {
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

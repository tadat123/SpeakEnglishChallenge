import { PrismaClient } from '@prisma/client';
import { DailyChallengeItem, QuestionItem } from '../seedData.js';

export interface UserRecord {
  id: string;
  employeeId: string; // 8-digit GEN ID
  fullName: string;
  email: string; // Personal email (No @samsung.com)
  phone: string;
  department?: string;
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

export interface UserDeviceRecord {
  id: string;
  userId: string;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  deviceName: string;
  browser: string;
  os: string;
  ip?: string;
  userAgent: string;
  isCurrent?: boolean;
  isPwaInstalled?: boolean;
  createdAt: string;
  lastActiveAt: string;
}

export interface BulkImportQuestionRow {
  dayNumber?: number | string;
  orderIndex?: number | string;
  questionType?: string;
  categoryLabel?: string;
  promptText: string;
  statementText?: string;
  targetWord?: string;
  optionA?: string;
  optionB?: string;
  optionC?: string;
  optionD?: string;
  correctOptionId?: string;
  explanation?: string;
  points?: number | string;
  promptAudioUrl?: string;
  promptVideoUrl?: string;
}

export function parseDeviceFromUserAgent(ua = ''): {
  deviceType: 'mobile' | 'tablet' | 'desktop';
  browser: string;
  os: string;
} {
  let deviceType: 'mobile' | 'tablet' | 'desktop' = 'desktop';
  if (/ipad|tablet/i.test(ua) || (/android/i.test(ua) && !/mobile/i.test(ua))) {
    deviceType = 'tablet';
  } else if (/iphone|mobile|android/i.test(ua)) {
    deviceType = 'mobile';
  }

  let browser = 'Trình duyệt Web';
  if (/samsungbrowser/i.test(ua)) browser = 'Samsung Internet';
  else if (/edg/i.test(ua)) browser = 'Microsoft Edge';
  else if (/chrome|crios/i.test(ua)) browser = 'Google Chrome';
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Apple Safari';
  else if (/firefox|fxios/i.test(ua)) browser = 'Mozilla Firefox';

  let os = 'Thiết bị';
  if (/windows/i.test(ua)) os = 'Windows PC';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/iphone|ipad|ios/i.test(ua)) os = 'Apple iOS';
  else if (/mac os/i.test(ua)) os = 'Apple macOS';
  else if (/linux/i.test(ua)) os = 'Linux';

  return { deviceType, browser, os };
}

export interface AttemptRecord {
  id: string;
  userId: string;
  challengeId: number;
  dayNumber: number;
  score: number;
  practiceScore?: number;
  isExpired?: boolean;
  correctCount: number;
  wrongCount: number;
  timeSpentMs: number;
  answersDetail: Record<string, any>;
  startedAt: string;
  completedAt: string;
}

export interface ActiveQuizSession {
  userId: string;
  employeeId: string;
  fullName: string;
  dayNumber: number;
  startedAt: number;
  q10FinishedAt?: number;
  elapsedSeconds?: number;
  q10ElapsedSeconds?: number;
  currentIndex?: number;
  answers?: Record<string, string>;
  lastSyncedAt?: number;
  questionsSnapshot: QuestionItem[];
}

export type PushNotificationType =
  | 'NEW_DAY_UNLOCKED'
  | 'NEW_TOP_1'
  | 'UNSTUDIED_REMINDER';

export const ALLOWED_NOTIFICATION_TYPES = new Set<string>([
  'NEW_DAY_UNLOCKED',
  'NEW_TOP_1',
  'UNSTUDIED_REMINDER',
]);

export interface PwaPushSubscriptionRecord {
  id: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userId: string | null;
  deviceId?: string | null;
  employeeId: string | null;
  fullName: string | null;
  isPwaInstalled: boolean;
  isSimulated?: boolean;
  userAgent: string;
  createdAt: string;
  updatedAt: string;
  lastNotifiedAt?: string | null;
}

export interface PushCampaignRecord {
  id: string;
  type: PushNotificationType;
  title: string;
  body: string;
  targetUrl: string;
  totalTargets: number;
  sentCount: number;
  successCount: number;
  failedCount: number;
  staggerIntervalMs: number;
  totalSpreadMs: number;
  status: 'QUEUED' | 'SENDING' | 'COMPLETED';
  createdAt: string;
  completedAt?: string | null;
  recentLogs: {
    recipientName: string;
    employeeId: string;
    sentAt: string;
    orderIndex: number;
    total: number;
    status: 'SENT' | 'DELIVERED_LOCAL' | 'FAILED';
  }[];
}

export interface InAppNotificationRecord {
  id: string;
  campaignId: string;
  type: PushNotificationType;
  userId: string | null;
  excludedUserIds?: string[];
  deliveredToUserIds?: string[];
  deliveredToDeviceIds?: string[];
  endpoint?: string;
  title: string;
  body: string;
  targetUrl: string;
  deliveredAt: string;
}

export type ChallengeEventStatus = 'NOT_STARTED' | 'COUNTDOWN' | 'ACTIVE';

export interface ChallengeEventState {
  eventStatus: ChallengeEventStatus;
  eventStartAt: string | null;
  startDateLabel: string | null;
  startFromDayNumber: number | null;
  totalDays: number;
  unlockedDaysCount: number;
}

export interface PushStaggerConfig {
  spreadWindowSeconds: number;
  minIntervalMs: number;
  maxIntervalMs: number;
  autoRemindUnstudied: boolean;
  morningHour: number;
  morningMinute?: number;
  eveningTop1Hour: number;
  eveningTop1Minute?: number;
  nightUnstudiedHour: number;
  nightUnstudiedMinute?: number;
  lastMorningNotifiedDate: string | null;
  lastEveningTop1NotifiedDate: string | null;
  lastNightUnstudiedNotifiedDate: string | null;
  lastTop1UserId: string | null;
  notifiedUnlockedDays: number[];
  notifiedUnstudiedKeys: string[];
}

export interface EventPopupItem {
  id: string;
  orderIndex: number;
  num: string;
  titleA: string;
  titleB?: string;
  titleC: string;
  desc: string;
  img: string;
  iconName?: string;
  chips: string[];
  note?: string;
  more?: string[];
  themeColor: 'amber' | 'blue' | 'purple' | 'emerald' | 'rose' | 'indigo';
  actionType: 'expand' | 'daily' | 'link';
  actionUrl?: string;
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_POPUP_EVENTS: EventPopupItem[] = [
  {
    id: 'bell',
    orderIndex: 1,
    num: '01',
    titleA: 'RING',
    titleB: 'the',
    titleC: 'GOLDEN BELL',
    desc: 'Kiểm tra kiến thức tiếng Anh và trở thành người trụ lại cuối cùng!',
    img: 'events/golden-bell.jpg',
    iconName: 'Bell',
    chips: ['~100 thí sinh', 'Trắc nghiệm', '1 Chung kết'],
    note: 'Mỗi bộ phận tự tổng hợp danh sách đăng ký và tổ chức vòng sơ loại.',
    more: [
      'Vòng sơ loại do từng bộ phận tự tổ chức để chọn đại diện.',
      'Vòng Chung kết offline: trả lời trắc nghiệm, sai là bị loại.',
      'Người cuối cùng trụ lại sẽ rung Chuông Vàng 🔔.',
    ],
    themeColor: 'amber',
    actionType: 'expand',
    isVisible: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'dub',
    orderIndex: 2,
    num: '02',
    titleA: 'DUB',
    titleB: 'IT',
    titleC: 'RIGHT',
    desc: 'Lập đội, lồng tiếng cho nhân vật và thổi hồn vào video!',
    img: 'events/dub-it-right.jpg',
    iconName: 'Clapperboard',
    chips: ['~3 bạn / đội', 'Lồng tiếng video', '1 Chung kết'],
    note: 'Mỗi bộ phận tự tổng hợp danh sách đăng ký và tổ chức vòng sơ loại.',
    more: [
      'Mỗi đội khoảng 3 người, nhận 1 đoạn video được chỉ định.',
      'Lồng tiếng tiếng Anh: chú trọng phát âm, ngữ điệu và cảm xúc.',
      'Các đội xuất sắc nhất vào thẳng vòng Chung kết.',
    ],
    themeColor: 'blue',
    actionType: 'expand',
    isVisible: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'daily',
    orderIndex: 3,
    num: '03',
    titleA: 'DAILY',
    titleB: '',
    titleC: 'CHALLENGE',
    desc: 'Mỗi ngày một bước nhỏ, tiến bộ lớn phía trước!',
    img: 'events/daily-challenge.jpg',
    iconName: 'CalendarDays',
    chips: ['Không giới hạn', 'Thử thách mỗi ngày', 'Tích điểm & thưởng'],
    note: '',
    more: [
      'Tham gia trả lời 10 câu trắc nghiệm & điền từ mỗi ngày.',
      'Tự luyện phát âm 5 từ vựng công sở ở câu 11 với hướng dẫn khẩu hình & hình ảnh minh họa.',
      'Tích lũy điểm số và thời gian làm bài để tranh top trên Bảng xếp hạng.',
    ],
    themeColor: 'purple',
    actionType: 'daily',
    isVisible: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export interface DatabaseShape {
  users: UserRecord[];
  challenges: DailyChallengeItem[];
  challengeTotalDays?: number;
  attempts: AttemptRecord[];
  devices?: UserDeviceRecord[];
  pwaSubscriptions?: PwaPushSubscriptionRecord[];
  pushCampaigns?: PushCampaignRecord[];
  inAppNotifications?: InAppNotificationRecord[];
  pushConfig?: PushStaggerConfig;
  events?: EventPopupItem[];
  activeSessions?: Record<string, ActiveQuizSession>;
}

const T_MAX = 9999999;

export function computeCompositeLeaderboardScore(totalScore: number, totalTimeMs: number): number {
  const totalSeconds = Math.min(T_MAX, Math.floor(totalTimeMs / 1000));
  return totalScore * 10_000_000 + (T_MAX - totalSeconds);
}

/** Tính tổng điểm tối đa thực tế của danh sách câu hỏi trong một ngày */
export function calcChallengeMaxPoints(questions?: Array<{ points?: number | null }>): number {
  if (!Array.isArray(questions) || questions.length === 0) return 0;
  return questions.reduce((sum, q) => sum + (Number(q?.points) > 0 ? Number(q.points) : 10), 0);
}

/** Interface ngữ cảnh dùng chung cho các module con của DataStore */
export interface StoreContext {
  getData: () => DatabaseShape;
  getPrisma: () => PrismaClient | null;
  reloadIfChanged: () => void;
  save: () => void;
  ensurePushState: (parsed: DatabaseShape) => DatabaseShape;
  activeSessions: Map<string, ActiveQuizSession>;
  forceLockedDays: Map<number, number>;
  getLastNotificationTimestamp: () => number;
  setLastNotificationTimestamp: (ts: number) => void;
}

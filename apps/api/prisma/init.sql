-- Schema PostgreSQL khởi tạo cho Speak Right Daily Challenge 2026
-- Chạy tự động hoặc nhập thủ công vào PostgreSQL: psql -U postgres -d speakright < init.sql

-- 1. Enum Role
DO $$ BEGIN
    CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Bảng User
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "department" TEXT,
    "avatarUrl" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "totalScore" INTEGER NOT NULL DEFAULT 0,
    "totalTimeMs" INTEGER NOT NULL DEFAULT 0,
    "completedDays" INTEGER NOT NULL DEFAULT 0,
    "resetOtpCode" TEXT,
    "resetToken" TEXT,
    "resetExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- 3. Bảng PwaPushSubscription
CREATE TABLE IF NOT EXISTS "PwaPushSubscription" (
    "id" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userId" TEXT,
    "employeeId" TEXT,
    "fullName" TEXT,
    "isPwaInstalled" BOOLEAN NOT NULL DEFAULT true,
    "userAgent" TEXT,
    "lastNotifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PwaPushSubscription_pkey" PRIMARY KEY ("id")
);

-- 4. Bảng PushCampaign
CREATE TABLE IF NOT EXISTS "PushCampaign" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "targetUrl" TEXT NOT NULL,
    "totalTargets" INTEGER NOT NULL DEFAULT 0,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "staggerIntervalMs" INTEGER NOT NULL DEFAULT 1500,
    "totalSpreadMs" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "PushCampaign_pkey" PRIMARY KEY ("id")
);

-- 5. Bảng DailyChallenge
CREATE TABLE IF NOT EXISTS "DailyChallenge" (
    "id" SERIAL NOT NULL,
    "dayNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "unlockDate" TIMESTAMP(3) NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "DailyChallenge_pkey" PRIMARY KEY ("id")
);

-- 6. Bảng Question
CREATE TABLE IF NOT EXISTS "Question" (
    "id" TEXT NOT NULL,
    "challengeId" INTEGER NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "promptText" TEXT NOT NULL,
    "targetWord" TEXT,
    "promptAudioUrl" TEXT,
    "options" JSONB NOT NULL,
    "correctOptionId" TEXT NOT NULL,
    "explanation" TEXT,
    "points" INTEGER NOT NULL DEFAULT 10,
    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- 7. Bảng ChallengeAttempt
CREATE TABLE IF NOT EXISTS "ChallengeAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "challengeId" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,
    "correctCount" INTEGER NOT NULL,
    "wrongCount" INTEGER NOT NULL,
    "timeSpentMs" INTEGER NOT NULL,
    "answersDetail" JSONB NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChallengeAttempt_pkey" PRIMARY KEY ("id")
);

-- Chỉ mục (Indexes)
CREATE UNIQUE INDEX IF NOT EXISTS "User_employeeId_key" ON "User"("employeeId");
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");
CREATE INDEX IF NOT EXISTS "User_totalScore_totalTimeMs_idx" ON "User"("totalScore" DESC, "totalTimeMs" ASC);
CREATE INDEX IF NOT EXISTS "User_department_idx" ON "User"("department");

CREATE UNIQUE INDEX IF NOT EXISTS "PwaPushSubscription_endpoint_key" ON "PwaPushSubscription"("endpoint");
CREATE INDEX IF NOT EXISTS "PwaPushSubscription_userId_idx" ON "PwaPushSubscription"("userId");
CREATE INDEX IF NOT EXISTS "PwaPushSubscription_isPwaInstalled_idx" ON "PwaPushSubscription"("isPwaInstalled");

CREATE UNIQUE INDEX IF NOT EXISTS "DailyChallenge_dayNumber_key" ON "DailyChallenge"("dayNumber");
CREATE INDEX IF NOT EXISTS "DailyChallenge_unlockDate_idx" ON "DailyChallenge"("unlockDate");

CREATE INDEX IF NOT EXISTS "Question_challengeId_orderIndex_idx" ON "Question"("challengeId", "orderIndex");

CREATE INDEX IF NOT EXISTS "ChallengeAttempt_challengeId_score_timeSpentMs_idx" ON "ChallengeAttempt"("challengeId", "score" DESC, "timeSpentMs" ASC);
CREATE UNIQUE INDEX IF NOT EXISTS "ChallengeAttempt_userId_challengeId_key" ON "ChallengeAttempt"("userId", "challengeId");

-- Khóa ngoại (Foreign Keys)
DO $$ BEGIN
    ALTER TABLE "PwaPushSubscription" ADD CONSTRAINT "PwaPushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "Question" ADD CONSTRAINT "Question_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "DailyChallenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "ChallengeAttempt" ADD CONSTRAINT "ChallengeAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "ChallengeAttempt" ADD CONSTRAINT "ChallengeAttempt_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "DailyChallenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 8. Tài khoản Admin khởi tạo (GEN: 88888888, Mật khẩu: Admin@2026, Điểm: 0)
INSERT INTO "User" ("id", "employeeId", "fullName", "email", "phone", "department", "avatarUrl", "passwordHash", "role", "totalScore", "totalTimeMs", "completedDays")
VALUES (
    'u-admin',
    '88888888',
    'Ban Tổ Chức (Admin)',
    'admin.speakright@gmail.com',
    '0901234567',
    'HR & Training',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=AdminSpeak',
    '$2a$10$Rgw8PgLNty/3RSvK1vb9n.xrhhcmGXGdGiP8NzzTRgDBbfy2sn3Be',
    'ADMIN',
    0,
    0,
    0
)
ON CONFLICT ("employeeId") DO UPDATE SET "role" = 'ADMIN';

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { OFFICIAL_10_QUESTIONS } from '../src/services/seedData.js';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Đang seed dữ liệu BỘ 10 CÂU HỎI – DAILY PRONUNCIATION CHALLENGE 2026...');

  const adminPassHash = await bcrypt.hash('Admin@2026', 10);
  const userPassHash = await bcrypt.hash('Speak@2026', 10);

  await prisma.user.upsert({
    where: { employeeId: '88888888' },
    update: {},
    create: {
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
    },
  });

  await prisma.user.upsert({
    where: { employeeId: '20261234' },
    update: {},
    create: {
      employeeId: '20261234',
      fullName: 'Nguyễn Thị Thảo',
      email: 'thaonguyen.work@gmail.com',
      phone: '0987654321',
      department: 'Quality Assurance (QA)',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ThaoNguyen',
      passwordHash: userPassHash,
      role: 'USER',
      totalScore: 2150,
      totalTimeMs: 740000,
      completedDays: 12,
    },
  });

  const baseDate = new Date('2026-11-04T00:00:00.000Z');
  for (let day = 1; day <= 30; day++) {
    const unlockDate = new Date(baseDate);
    unlockDate.setUTCDate(baseDate.getUTCDate() + (day - 1));

    const challenge = await prisma.dailyChallenge.upsert({
      where: { dayNumber: day },
      update: { title: `Day ${day}`, unlockDate, isPublished: true },
      create: {
        dayNumber: day,
        title: `Day ${day}`,
        unlockDate,
        isPublished: true,
      },
    });

    await prisma.question.deleteMany({ where: { challengeId: challenge.id } });

    for (let idx = 0; idx < OFFICIAL_10_QUESTIONS.length; idx++) {
      const q = OFFICIAL_10_QUESTIONS[idx];
      await prisma.question.create({
        data: {
          challengeId: challenge.id,
          orderIndex: idx + 1,
          promptText: q.statementText ? `${q.promptText}\n${q.statementText}` : q.promptText,
          targetWord: q.targetWord,
          options: q.options as any,
          correctOptionId: q.correctOptionId,
          explanation: q.explanation,
          points: q.points,
        },
      });
    }
  }

  console.log('✅ Đã seed thành công 30 ngày thử thách với đúng Bộ 10 Câu Hỏi chuẩn!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

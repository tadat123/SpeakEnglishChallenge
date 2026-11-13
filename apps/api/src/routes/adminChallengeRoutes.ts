import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { FastifyInstance } from 'fastify';
import { store } from '../services/store.js';
import { pushService } from '../services/pushNotification.js';

export function registerAdminChallengeRoutes(app: FastifyInstance, uploadsDir: string) {
  app.get(
    '/api/admin/challenges/:dayNumber',
    { preHandler: [(app as any).requireAdmin] },
    async (request: any, reply) => {
      const dayNumber = Number(request.params.dayNumber);
      const challenge = store.getChallengeByDay(dayNumber);
      if (!challenge) {
        return reply.status(404).send({ message: 'Không tìm thấy ngày thử thách.' });
      }

      const activePlayers = store.getActiveSessionsForDay(dayNumber).map((s) => ({
        userId: s.userId,
        employeeId: s.employeeId,
        fullName: s.fullName,
        startedAt: new Date(s.startedAt).toISOString(),
        elapsedSeconds: Math.floor(((s.q10FinishedAt || Date.now()) - s.startedAt) / 1000),
        isAtQ11: Boolean(s.q10FinishedAt),
      }));

      return {
        ...challenge,
        isUnlocked: store.isDayUnlocked(challenge),
        isEnded: store.isDayPassedDeadline(challenge),
        resultsRevealed: store.isResultsRevealed(challenge),
        activePlayers,
      };
    }
  );

  app.put(
    '/api/admin/challenges/:dayNumber/unlock',
    { preHandler: [(app as any).requireAdmin] },
    async (request: any, reply) => {
      const dayNumber = Number(request.params.dayNumber);
      const body = request.body as {
        title?: string;
        dateLabel?: string;
        unlockNow?: boolean;
        lockMode?: 'GRACEFUL' | 'FORCE';
        forceRevealed?: boolean;
      };

      const result = store.updateChallengeDay(dayNumber, body);
      if (!result.challenge) {
        return reply.status(404).send({ message: 'Không tìm thấy ngày thử thách.' });
      }

      let pushCampaign = null;
      let msg = `Đã cập nhật ${result.challenge.title} (${result.challenge.dateLabel})`;
      if (body.unlockNow === false) {
        msg =
          result.lockModeUsed === 'FORCE'
            ? `🔒 Đã KHÓA CƯỠNG CHẾ ${result.challenge.title} (Đã dừng ${result.activePlayersAffected} phiên đang làm dở).`
            : `🛡️ Đã KHÓA MỀM ${result.challenge.title}: Chặn người mới vào, nhưng vẫn cho phép ${result.activePlayersAffected} người đang làm dở được nộp bài nốt!`;
      } else if (body.unlockNow === true) {
        const qStatus = pushService.getQueueStatus();
        if (!qStatus.sentToday.morningNewDay) {
          pushCampaign = pushService.enqueueNewDayUnlocked(result.challenge);
          msg = `🔓 Đã MỞ KHÓA ${result.challenge.title} & gửi thông báo bài mới (1 lần/ngày) chia đều tới ${pushCampaign.totalTargets} thiết bị PWA!`;
        } else {
          msg = `🔓 Đã MỞ KHÓA ${result.challenge.title} (Đã chặn gửi lặp thông báo vì hôm nay đã thông báo bài mới buổi sáng rồi!).`;
        }
      }

      return {
        message: msg,
        challenge: result.challenge,
        isUnlocked: result.isUnlocked,
        resultsRevealed: result.resultsRevealed,
        activePlayersAffected: result.activePlayersAffected,
        pushCampaign,
      };
    }
  );

  app.put(
    '/api/admin/challenges/:dayNumber/reveal',
    { preHandler: [(app as any).requireAdmin] },
    async (request: any, reply) => {
      const dayNumber = Number(request.params.dayNumber);
      const body = (request.body || {}) as { forceRevealed?: boolean };
      const updated = store.toggleRevealResults(dayNumber, body.forceRevealed);
      if (!updated) {
        return reply.status(404).send({ message: 'Không tìm thấy ngày thử thách.' });
      }
      const isRevealed = store.isResultsRevealed(updated);
      return {
        message: isRevealed
          ? `📢 Đã CÔNG BỐ toàn bộ đáp án và điểm số Day ${dayNumber} cho toàn thể nhân viên!`
          : `🔒 Đã ẨN đáp án Day ${dayNumber} (Trở về chế độ chờ 00:00).`,
        challenge: updated,
        resultsRevealed: isRevealed,
      };
    }
  );

  const handleConfigureTotalDays = async (request: any, reply: any) => {
    const totalDaysRaw = Number(request.body?.totalDays);
    if (!Number.isFinite(totalDaysRaw) || totalDaysRaw < 1 || totalDaysRaw > 90) {
      return reply.status(400).send({
        message: 'Tổng số ngày thử thách phải nằm trong khoảng từ 1 đến 90 ngày.',
      });
    }
    const res = store.configureChallengeDays(totalDaysRaw);
    const eventState = store.getChallengeEventState();
    return {
      ok: true,
      totalDays: res.totalDays,
      previousTotalDays: res.previousTotalDays,
      eventState,
      message: `✅ Đã cập nhật tổng lịch trình thành ${res.totalDays} ngày thử thách!`,
    };
  };

  app.put('/api/admin/challenges/total-days', { preHandler: [(app as any).requireAdmin] }, handleConfigureTotalDays);
  app.post('/api/admin/challenges/total-days', { preHandler: [(app as any).requireAdmin] }, handleConfigureTotalDays);

  app.post(
    '/api/admin/challenges/start-schedule',
    { preHandler: [(app as any).requireAdmin] },
    async (request: any) => {
      const body = (request.body || {}) as {
        totalDays?: number;
        startFromDayNumber?: number;
        startDateStr?: string;
        lockPreviousDays?: boolean;
        lockAllUntilStart?: boolean;
      };
      const res = store.startChallengeSchedule(body);
      const eventState = store.getChallengeEventState();
      const totalDays = res.totalDays || store.getChallenges().length;
      if (body.lockAllUntilStart) {
        return {
          ok: true,
          message: `🔒 Đã khóa toàn bộ ${totalDays} ngày thử thách! Khi nào sẵn sàng, hãy chọn ngày bắt đầu và bấm "🚀 Start Challenge".`,
          eventState,
          ...res,
        };
      }
      if (res.unlockedDays.length === 0) {
        return {
          ok: true,
          message: `⏳ Đã hẹn lịch sự kiện (${totalDays} ngày) bắt đầu từ Day ${res.startFromDayNumber} (00:00 ngày ${res.startDateLabel})! Giao diện người dùng đang hiển thị đếm ngược chờ tới ngày khai mạc.`,
          eventState,
          ...res,
        };
      }
      return {
        ok: true,
        message: `🚀 Đã bắt đầu hành trình ${totalDays} ngày tính từ Day ${res.startFromDayNumber} (${res.startDateLabel})! Các ngày sau Day ${res.startFromDayNumber} đã được khóa và sẽ tự động mở lần lượt vào 00:00 mỗi ngày tiếp theo.`,
        eventState,
        ...res,
      };
    }
  );

  app.post(
    '/api/admin/challenges/:dayNumber/questions',
    { preHandler: [(app as any).requireAdmin] },
    async (request: any, reply) => {
      const dayNumber = Number(request.params.dayNumber);
      const body = request.body as any;

      if (!body.promptText?.trim()) {
        return reply.status(400).send({ message: 'Vui lòng nhập nội dung câu hỏi (promptText).' });
      }

      const created = store.addQuestionToDay(dayNumber, {
        questionType: body.questionType || 'LISTEN_AND_CHOOSE',
        categoryLabel: body.categoryLabel || 'Câu hỏi tùy chỉnh',
        promptText: body.promptText.trim(),
        statementText: body.statementText?.trim() || undefined,
        targetWord: body.targetWord?.trim() || '',
        hasPromptAudio: Boolean(body.hasPromptAudio),
        audioNote: body.audioNote || '',
        promptAudioUrl: body.promptAudioUrl?.trim() || undefined,
        promptVideoUrl: body.promptVideoUrl?.trim() || undefined,
        options: Array.isArray(body.options) ? body.options : [],
        correctOptionId: body.correctOptionId || 'A',
        explanation: body.explanation?.trim() || '',
        points: Number(body.points) || 10,
      });

      if (!created) {
        return reply.status(404).send({ message: 'Không tìm thấy ngày thử thách.' });
      }

      return {
        message: `Đã thêm Câu ${created.orderIndex} vào Day ${dayNumber} thành công!`,
        question: created,
      };
    }
  );

  app.put(
    '/api/admin/challenges/:dayNumber/questions/:questionId',
    { preHandler: [(app as any).requireAdmin] },
    async (request: any, reply) => {
      const dayNumber = Number(request.params.dayNumber);
      const questionId = request.params.questionId;
      const body = request.body as any;

      const updated = store.updateQuestionInDay(dayNumber, questionId, {
        questionType: body.questionType,
        categoryLabel: body.categoryLabel,
        promptText: body.promptText,
        statementText: body.statementText,
        targetWord: body.targetWord,
        hasPromptAudio: body.hasPromptAudio,
        audioNote: body.audioNote,
        promptAudioUrl: body.promptAudioUrl,
        promptVideoUrl: body.promptVideoUrl,
        options: body.options,
        correctOptionId: body.correctOptionId,
        explanation: body.explanation,
        points: Number(body.points) || 10,
      });

      if (!updated) {
        return reply.status(404).send({ message: 'Không tìm thấy câu hỏi cần sửa.' });
      }

      return {
        message: `Đã lưu thay đổi cho Câu ${updated.orderIndex} (Day ${dayNumber})!`,
        question: updated,
      };
    }
  );

  app.delete(
    '/api/admin/challenges/:dayNumber/questions/:questionId',
    { preHandler: [(app as any).requireAdmin] },
    async (request: any, reply) => {
      const dayNumber = Number(request.params.dayNumber);
      const ok = store.deleteQuestionFromDay(dayNumber, request.params.questionId);
      if (!ok) {
        return reply.status(404).send({ message: 'Không tìm thấy câu hỏi cần xóa.' });
      }
      return {
        message: `Đã xóa câu hỏi và cập nhật lại thứ tự câu trong Day ${dayNumber}.`,
      };
    }
  );

  app.post(
    '/api/admin/challenges/:dayNumber/clone-to-all',
    { preHandler: [(app as any).requireAdmin] },
    async (request: any) => {
      const dayNumber = Number(request.params.dayNumber);
      const count = store.copyQuestionsToAllDays(dayNumber);
      return {
        message: `Đã đồng bộ bộ câu hỏi của Day ${dayNumber} sang ${count} ngày còn lại!`,
      };
    }
  );

  app.put(
    '/api/challenges/:dayNumber/q11-words',
    { preHandler: [(app as any).requireAdmin], bodyLimit: 15 * 1024 * 1024 },
    async (request: any, reply) => {
      const dayNumber = Number(request.params.dayNumber);
      const { q11Words, cloneToAllDays } = request.body || {};
      if (!Array.isArray(q11Words)) {
        return reply.status(400).send({ message: 'Danh sách từ vựng Câu 11 không hợp lệ.' });
      }
      const updated = store.updateDayQ11Words(dayNumber, q11Words, Boolean(cloneToAllDays));
      if (!updated) {
        return reply.status(404).send({ message: 'Không tìm thấy ngày thử thách.' });
      }
      const totalDays = store.getChallenges().length;
      return {
        message: cloneToAllDays
          ? `Đã cập nhật bộ 5 từ vựng Câu 11 cho toàn bộ ${totalDays} ngày thử thách!`
          : `Đã cập nhật bộ 5 từ vựng Câu 11 cho Day ${dayNumber}!`,
        challenge: updated,
      };
    }
  );

  app.get(
    '/api/admin/challenges/export-template-csv',
    { preHandler: [(app as any).requireAdmin] },
    async (_request: any, reply) => {
      const csvHeader =
        'DayNumber,OrderIndex,QuestionType,CategoryLabel,PromptText,StatementText,TargetWord,OptionA,OptionB,OptionC,OptionD,CorrectOption,Explanation,Points,PromptAudioUrl,PromptVideoUrl';

      const sampleRows = [
        '1,1,CHOOSE_AUDIO,Phát âm chuẩn,"Từ ""Approval"" được phát âm như thế nào? Nghe các phương án và chọn cách phát âm chuẩn nhất.",,/əˈpruːvəl/,Approval,Approval (sai trọng âm),Approval (sai âm cuối),,A,"Từ \'Approval\' có trọng âm rơi vào âm tiết thứ 2 (/əˈpruːvəl/).",10,,',
        '1,2,TRUE_FALSE,True / False,"Nghe câu sau và xác định nhận định là Đúng hay Sai:","\'Schedule\' chỉ có 1 cách phát âm duy nhất trong tiếng Anh quốc tế.",schedule,True – Đúng,False – Sai,,,B,"Sai vì từ \'schedule\' có 2 cách đọc chuẩn: /ˈskedʒuːl/ (Mỹ) và /ˈʃedʒuːl/ (Anh).",10,,',
        '1,3,LISTEN_AND_CHOOSE,Nghe & Chọn đáp án,"Nghe đoạn âm thanh sau và chọn từ được nhắc tới trong ngữ cảnh công việc.",,collaboration,collaboration,corporation,celebration,,A,"Từ được phát âm trong đoạn audio là \'collaboration\' (sự hợp tác).",10,,',
        '1,4,VOCAB_MEANING,Từ vựng công sở,"Trong môi trường doanh nghiệp, từ viết tắt \'KPI\' có nghĩa là gì?",,KPI,Key Performance Indicator,Knowledge Process Integration,Key Project Initiative,Key Product Index,A,"KPI là viết tắt của Key Performance Indicator (Chỉ số đo lường hiệu quả công việc cốt lõi).",10,,',
        '1,5,FILL_IN_THE_BLANK,Điền từ vựng,"Điền từ tiếng Anh tương ứng với định nghĩa và phiên âm sau:","/ˌrekəˈmend/ (Đưa ra gợi ý, giới thiệu giải pháp)",recommend,,,,recommend,"Từ đúng chính tả là \'recommend\' (2 chữ \'m\' và 1 chữ \'c\').",10,,',
        '2,1,LISTEN_AND_CHOOSE,Phát âm công sở,"Chọn cách phát âm đúng của từ ""Deadline"".",,deadline,Deadline (/ˈdedlaɪn/),Dead line (/ded ˈlaɪn/),Deline (/ˈdiːlaɪn/),,A,"Trọng âm rơi vào âm tiết đầu tiên /ˈdedlaɪn/.",10,,',
      ];

      const csvContent = '\uFEFF' + [csvHeader, ...sampleRows].join('\r\n');
      reply.header('Content-Type', 'text/csv; charset=utf-8');
      reply.header('Content-Disposition', 'attachment; filename="SpeakRight_Questions_Template.csv"');
      return reply.send(csvContent);
    }
  );

  app.post(
    '/api/admin/challenges/bulk-import',
    { preHandler: [(app as any).requireAdmin] },
    async (request: any, reply) => {
      const { questions, mode, targetDayNumber } = request.body || {};
      if (!Array.isArray(questions) || questions.length === 0) {
        return reply
          .status(400)
          .send({ message: 'Danh sách câu hỏi cần nhập không hợp lệ hoặc đang rỗng.' });
      }

      const result = store.bulkImportQuestions(questions, {
        mode: mode === 'append' ? 'append' : 'overwrite',
        targetDayNumber: targetDayNumber ? Number(targetDayNumber) : undefined,
      });

      return {
        message: `Đã nhập thành công ${result.totalImported} câu hỏi cho ${result.daysAffected.length} ngày (${result.daysAffected.map((d) => `Day ${d}`).join(', ')})!`,
        ...result,
      };
    }
  );

  app.post(
    '/api/admin/upload-media',
    { bodyLimit: 35 * 1024 * 1024, preHandler: [(app as any).requireAdmin] },
    async (request: any, reply) => {
      const { filename, base64Data } = request.body as { filename: string; base64Data: string };
      if (!filename || !base64Data) {
        return reply.status(400).send({ message: 'Thiếu dữ liệu file tải lên.' });
      }

      const ext = path.extname(filename).toLowerCase() || '.mp3';
      const safeName = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`;
      const cleanBase64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
      fs.writeFileSync(path.join(uploadsDir, safeName), Buffer.from(cleanBase64, 'base64'));

      return {
        message: 'Tải file media lên thành công!',
        url: `/api/uploads/${safeName}`,
      };
    }
  );
}

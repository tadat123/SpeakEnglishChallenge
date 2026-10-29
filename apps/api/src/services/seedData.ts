export type QuestionType =
  | 'CHOOSE_AUDIO'      // Câu 1, 5: Nghe 4 phương án audio A/B/C/D và chọn cách phát âm đúng
  | 'TRUE_FALSE'        // Câu 2, 6: Nghe audio câu hỏi và xác định nhận định True / False
  | 'LISTEN_AND_CHOOSE' // Câu 3, 7, 9: Nghe audio câu hỏi và chọn từ đúng
  | 'VOCAB_MEANING';    // Câu 4, 8, 10: Nghĩa của từ / từ viết tắt (Không bắt buộc có audio)

export interface QuestionOption {
  id: 'A' | 'B' | 'C' | 'D';
  text: string;
  spokenText?: string;     // Phát âm mẫu (Web Speech fallback khi chưa upload file MP3)
  hasOptionAudio?: boolean; // Có hiển thị nút Loa ở đáp án hay không
  audioUrl?: string;       // Link file MP3 khi Admin tải lên
}

export interface QuestionItem {
  id: string;
  challengeId: number;
  orderIndex: number;
  questionType: QuestionType;
  categoryLabel: string;
  promptText: string;
  statementText?: string;  // Dành cho câu True/False (VD: Nhận định: “Audio vừa nghe là DOE.”)
  targetWord: string;      // Từ/cụm từ phát âm của câu hỏi
  hasPromptAudio: boolean; // Câu hỏi có nút Loa lớn ở đề bài hay không
  audioNote: string;       // Ghi chú chuẩn bị file audio cho Admin
  promptAudioUrl?: string; // Link CDN / Upload file MP3 của câu hỏi
  promptVideoUrl?: string; // Link Video MP4 / YouTube tình huống hội thoại của câu hỏi
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

export const OFFICIAL_10_QUESTIONS: Omit<QuestionItem, 'id' | 'challengeId' | 'orderIndex'>[] = [
  // CÂU 1
  {
    questionType: 'CHOOSE_AUDIO',
    categoryLabel: 'Multiple Choice – Chọn audio phát âm đúng',
    promptText: 'Từ “Approval” được phát âm như thế nào? Nghe 4 phương án audio và chọn cách phát âm đúng.',
    targetWord: 'Approval',
    hasPromptAudio: false,
    audioNote: '1 bản phát âm chuẩn của “Approval” (/əˈpruːvəl/) và 3 bản có lỗi phát âm.',
    options: [
      {
        id: 'A',
        text: 'Audio A',
        spokenText: 'approval', // Chuẩn /əˈpruːvəl/
        hasOptionAudio: true,
      },
      {
        id: 'B',
        text: 'Audio B',
        spokenText: 'ap prooval', // Lỗi phát âm /ˈæpruːvəl/
        hasOptionAudio: true,
      },
      {
        id: 'C',
        text: 'Audio C',
        spokenText: 'uh proval', // Lỗi phát âm /əˈprɒvəl/
        hasOptionAudio: true,
      },
      {
        id: 'D',
        text: 'Audio D',
        spokenText: 'ah proovul', // Lỗi phát âm
        hasOptionAudio: true,
      },
    ],
    correctOptionId: 'A',
    explanation:
      'Đáp án: A (Audio A). Từ “Approval” được phát âm chuẩn là /əˈpruːvəl/ (trọng âm rơi vào âm tiết thứ 2, âm đầu là schwa /ə/).',
    points: 10,
  },

  // CÂU 2
  {
    questionType: 'TRUE_FALSE',
    categoryLabel: 'True / False – Nghe và xác định nhận định',
    promptText: 'Nghe đoạn âm thanh và xác định nhận định bên dưới là Đúng (True) hay Sai (False):',
    statementText: 'Nhận định: “Audio vừa nghe là DOE.”',
    targetWord: 'M. E. G.', // Đọc lần lượt tên các chữ cái M – E – G rõ ràng
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

  // CÂU 3
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

  // CÂU 4
  {
    questionType: 'VOCAB_MEANING',
    categoryLabel: 'Nghĩa của từ viết tắt',
    promptText: 'Trong môi trường công việc, “DOE” thường có thể là viết tắt của cụm từ nào?',
    targetWord: 'D. O. E.',
    hasPromptAudio: false,
    audioNote: 'Không bắt buộc có audio. Lưu ý: xác nhận ý nghĩa DOE theo quy ước tại công ty/bộ phận.',
    options: [
      { id: 'A', text: 'Design of Equipment', hasOptionAudio: false },
      { id: 'B', text: 'Design of Experiments', hasOptionAudio: false },
      { id: 'C', text: 'Department of Engineering', hasOptionAudio: false },
      { id: 'D', text: 'Development of Electronics', hasOptionAudio: false },
    ],
    correctOptionId: 'B',
    explanation:
      'Đáp án dự kiến: B. Design of Experiments (Thiết kế thực nghiệm). Lưu ý: xác nhận ý nghĩa DOE theo quy ước tại công ty/bộ phận trước khi phát hành.',
    points: 10,
  },

  // CÂU 5
  {
    questionType: 'CHOOSE_AUDIO',
    categoryLabel: 'Multiple Choice – Chọn audio phát âm đúng',
    promptText: 'Từ “Equipment” được phát âm như thế nào? Nghe 4 phương án audio và chọn cách phát âm đúng.',
    targetWord: 'Equipment',
    hasPromptAudio: false,
    audioNote: '1 bản phát âm chuẩn của “Equipment” (/ɪˈkwɪpmənt/) và 3 bản có lỗi phát âm.',
    options: [
      {
        id: 'A',
        text: 'Audio A',
        spokenText: 'equipment', // Chuẩn /ɪˈkwɪpmənt/
        hasOptionAudio: true,
      },
      {
        id: 'B',
        text: 'Audio B',
        spokenText: 'eck wipment', // Lỗi phát âm /ˈekwɪpmənt/
        hasOptionAudio: true,
      },
      {
        id: 'C',
        text: 'Audio C',
        spokenText: 'equibment', // Lỗi phát âm /ɪˈkwɪbmənt/
        hasOptionAudio: true,
      },
      {
        id: 'D',
        text: 'Audio D',
        spokenText: 'equip man', // Lỗi phát âm /ɪˈkwɪpmæn/
        hasOptionAudio: true,
      },
    ],
    correctOptionId: 'A',
    explanation:
      'Đáp án: A (Audio A). Từ “Equipment” được phát âm chuẩn là /ɪˈkwɪpmənt/ (trọng âm rơi vào âm tiết thứ 2).',
    points: 10,
  },

  // CÂU 6
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

  // CÂU 7
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

  // CÂU 8
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

  // CÂU 9
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

  // CÂU 10
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

export function generate30DaysChallenges(): DailyChallengeItem[] {
  const days: DailyChallengeItem[] = [];
  const baseDate = new Date('2026-11-04T00:00:00.000Z');

  for (let day = 1; day <= 30; day++) {
    const d = new Date(baseDate);
    d.setUTCDate(baseDate.getUTCDate() + (day - 1));
    const dd = String(d.getUTCDate()).padStart(2, '0');
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const yyyy = d.getUTCFullYear();

    const now = new Date();
    const unlockDate =
      day === 1
        ? new Date(now.getTime() - 3600 * 1000).toISOString()
        : new Date(now.getTime() + (day - 1) * 86400 * 1000).toISOString();

    const questions: QuestionItem[] = OFFICIAL_10_QUESTIONS.map((q, idx) => ({
      ...q,
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

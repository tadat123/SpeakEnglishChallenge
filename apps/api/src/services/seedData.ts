export type QuestionType =
  | 'CHOOSE_AUDIO'      // Chọn audio phát âm đúng (3 phương án A/B/C)
  | 'TRUE_FALSE'        // Nghe audio câu hỏi và xác định nhận định True / False (2 phương án)
  | 'LISTEN_AND_CHOOSE' // Nghe audio câu hỏi và chọn từ đúng (3 phương án A/B/C)
  | 'VOCAB_MEANING'     // Nghĩa của từ / từ viết tắt (3 phương án A/B/C)
  | 'FILL_IN_THE_BLANK'; // Điền từ vựng theo phiên âm & nghĩa

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
  statementText?: string;  // Dành cho câu True/False hoặc Phiên âm & nghĩa của câu Điền từ
  targetWord: string;      // Từ/cụm từ phát âm của câu hỏi hoặc Từ cần điền
  hasPromptAudio: boolean; // Câu hỏi có nút Loa lớn ở đề bài hay không
  audioNote: string;       // Ghi chú chuẩn bị file audio cho Admin
  promptAudioUrl?: string; // Link CDN / Upload file MP3 của câu hỏi
  promptVideoUrl?: string; // Link Video MP4 / YouTube tình huống hội thoại của câu hỏi
  options: QuestionOption[];
  correctOptionId: 'A' | 'B' | 'C' | 'D' | string;
  explanation: string;
  points: number;
}

export interface WorkplaceWordItem {
  id: number;
  word: string;
  spokenText: string;
  ipa: string;
  syllables?: string;
  meaningVi: string;
  meaningEn: string;
  meaningKo: string;
  tipVi: string;
  tipEn: string;
  tipKo: string;
  tip?: string;
  imageUrl?: string;
}

export const DEFAULT_Q11_5_WORDS: WorkplaceWordItem[] = [
  {
    id: 1,
    word: 'Approval',
    spokenText: 'Approval',
    ipa: '/əˈpruːvəl/',
    syllables: 'ơ · PRUː · vồ',
    meaningVi: 'Sự phê duyệt',
    meaningEn: 'Official permission',
    meaningKo: '승인 / 결재',
    tipVi: 'Cách đọc: ơ - PRUː - vồ. Nhấn trọng âm ở âm tiết thứ 2 (-proo-), âm đầu đọc nhẹ là /ə/, cong lưỡi nhẹ ở âm cuối /l/.',
    tipEn: 'Read as: uh - PROO - vuhl. Stress the 2nd syllable (-proo-), start with a soft schwa /ə/, and finish with a clear dark /l/.',
    tipKo: '두 번째 음절(-proo-)에 강세를 두고 첫 음은 약한 /ə/로 발음하세요.',
  },
  {
    id: 2,
    word: 'Equipment',
    spokenText: 'Equipment',
    ipa: '/ɪˈkwɪpmənt/',
    syllables: 'ì · QUÍP · mừn(t)',
    meaningVi: 'Trang thiết bị',
    meaningEn: 'Tools & machinery',
    meaningKo: '장비 / 설비',
    tipVi: 'Cách đọc: ì - QUÍP - mừn(t). Trọng âm rơi vào -quip- (/ˈkwɪp/), khép môi nhẹ ở âm /p/ trước khi đọc -ment và bật nhẹ âm cuối /t/.',
    tipEn: 'Read as: ih - KWIP - muhnt. Stress the 2nd syllable (-quip-), keep /p/ crisp, and pronounce final /t/.',
    tipKo: '두 번째 음절(-quip-)에 강세를 두고 끝소리 /t/를 가볍게 발음하세요.',
  },
  {
    id: 3,
    word: 'Measurement',
    spokenText: 'Measurement',
    ipa: '/ˈmeʒərmənt/',
    syllables: 'ME · giơ · mừn(t)',
    meaningVi: 'Sự đo lường',
    meaningEn: 'Act of measuring',
    meaningKo: '측정 / 계측',
    tipVi: 'Cách đọc: ME - giơ - mừn(t). Nhấn âm đầu /ˈmeʒ/, chú ý phụ âm giữa là /ʒ/ (giống chữ "s" trong "vision"), không đọc thành /s/.',
    tipEn: 'Read as: MEZH - uhr - muhnt. Stress the 1st syllable /ˈmeʒ/, using the voiced /ʒ/ sound (like in "vision").',
    tipKo: '첫 음절 /ˈmeʒ/에 강세를 두고 중간의 /ʒ/ 발음에 유의하세요.',
  },
  {
    id: 4,
    word: 'Development',
    spokenText: 'Development',
    ipa: '/dɪˈveləpmənt/',
    syllables: 'đì · VE · lợp · mừn(t)',
    meaningVi: 'Sự phát triển (R&D)',
    meaningEn: 'Growth & advancement',
    meaningKo: '개발 / 발전',
    tipVi: 'Cách đọc: đì - VE - lợp - mừn(t). Nhấn trọng âm vào âm tiết thứ 2 (-vel-), không nhấn vào âm đầu de- hoặc âm thứ 3 -op-.',
    tipEn: 'Read as: dih - VEL - uhp - muhnt. Put primary stress on the 2nd syllable (-vel-), reducing -op- to /əp/.',
    tipKo: '두 번째 음절(-vel-)에 강세를 두어 발음하세요.',
  },
  {
    id: 5,
    word: 'Yield rate',
    spokenText: 'Yield rate',
    ipa: '/jiːld reɪt/',
    syllables: 'DIU(đ) · RÂY(t)',
    meaningVi: 'Tỷ lệ đạt chuẩn',
    meaningEn: 'Good product ratio',
    meaningKo: '수율 / 양품률',
    tipVi: 'Cách đọc: DIU(đ) - RÂY(t). Từ "Yield" bắt đầu bằng âm /j/ (như "yes") kéo dài /iː/, kết thúc có /ld/; "rate" nguyên âm đôi /eɪ/.',
    tipEn: 'Read as: YEELD - rayt. Start "Yield" with a smooth /j/ (not /dʒ/), hold /iː/, and finish "rate" with /eɪt/.',
    tipKo: '"Yield"는 /j/로 시작하여 /iːld/로 발음하고 "rate"는 /reɪt/로 발음하세요.',
  },
];

export interface DailyChallengeItem {
  id: number;
  dayNumber: number;
  title: string;
  dateLabel: string;
  unlockDate: string;
  isPublished: boolean;
  questions: QuestionItem[];
  q11Words?: WorkplaceWordItem[];
  forceLockedAt?: number | null;
  forceRevealed?: boolean;
}

export const OFFICIAL_10_QUESTIONS: Omit<QuestionItem, 'id' | 'challengeId' | 'orderIndex'>[] = [
  // CÂU 1 (Multiple Choice 3 options)
  {
    questionType: 'CHOOSE_AUDIO',
    categoryLabel: 'Multiple Choice – Chọn audio phát âm đúng',
    promptText: 'Từ “Approval” được phát âm như thế nào? Nghe các phương án audio và chọn cách phát âm đúng.',
    targetWord: 'Approval',
    hasPromptAudio: false,
    audioNote: '1 bản phát âm chuẩn của “Approval” (/əˈpruːvəl/) và 2 bản có lỗi phát âm.',
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
    ],
    correctOptionId: 'A',
    explanation:
      'Đáp án: A (Audio A). Từ “Approval” được phát âm chuẩn là /əˈpruːvəl/ (trọng âm rơi vào âm tiết thứ 2, âm đầu là schwa /ə/).',
    points: 10,
  },

  // CÂU 2 (True / False 2 options)
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

  // CÂU 3 (Listen and Choose 3 options)
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
    ],
    correctOptionId: 'A',
    explanation: 'Đáp án: A. Yield rate (Audio đọc từ “Yield rate” /jiːld reɪt/ - Tỷ lệ đạt yêu cầu).',
    points: 10,
  },

  // CÂU 4 (Vocab Meaning 3 options)
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
    ],
    correctOptionId: 'B',
    explanation:
      'Đáp án dự kiến: B. Design of Experiments (Thiết kế thực nghiệm).',
    points: 10,
  },

  // CÂU 5 (Choose Audio 3 options)
  {
    questionType: 'CHOOSE_AUDIO',
    categoryLabel: 'Multiple Choice – Chọn audio phát âm đúng',
    promptText: 'Từ “Equipment” được phát âm như thế nào? Nghe các phương án audio và chọn cách phát âm đúng.',
    targetWord: 'Equipment',
    hasPromptAudio: false,
    audioNote: '1 bản phát âm chuẩn của “Equipment” (/ɪˈkwɪpmənt/) và 2 bản có lỗi phát âm.',
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
    ],
    correctOptionId: 'A',
    explanation:
      'Đáp án: A (Audio A). Từ “Equipment” được phát âm chuẩn là /ɪˈkwɪpmənt/ (trọng âm rơi vào âm tiết thứ 2).',
    points: 10,
  },

  // CÂU 6 (True / False 2 options)
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

  // CÂU 7 (Listen and Choose 3 options)
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
    ],
    correctOptionId: 'B',
    explanation: 'Đáp án: B. Measurement (Audio đọc từ “Measurement” /ˈmeʒərmənt/ - Đo lường).',
    points: 10,
  },

  // CÂU 8 (Vocab Meaning 3 options)
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
    ],
    correctOptionId: 'B',
    explanation: 'Đáp án: B. Kim loại (“Metal” /ˈmetl/ có nghĩa là kim loại).',
    points: 10,
  },

  // CÂU 9 (Listen and Choose 3 options)
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
    ],
    correctOptionId: 'C',
    explanation: 'Đáp án: C. Development (Audio đọc từ “Development” /dɪˈveləpmənt/ - Sự phát triển).',
    points: 10,
  },

  // CÂU 10 (Dạng điền từ theo phiên âm & nghĩa - Yêu cầu mới của người dùng)
  {
    questionType: 'FILL_IN_THE_BLANK',
    categoryLabel: 'Điền từ vựng – Nhập từ theo phiên âm & nghĩa',
    promptText: 'Hãy điền Từ vựng có phiên âm và nghĩa như sau:',
    statementText: '/ˌredʒɪˈstreɪʃn/ - Đăng ký',
    targetWord: 'registration',
    hasPromptAudio: true,
    audioNote: 'Phát âm chuẩn của registration (/ˌredʒɪˈstreɪʃn/)',
    options: [],
    correctOptionId: 'registration',
    explanation: 'Đáp án: registration (Phiên âm: /ˌredʒɪˈstreɪʃn/ - Nghĩa: Đăng ký).',
    points: 10,
  },
];

export function generate21DaysChallenges(baseDateMs?: number): DailyChallengeItem[] {
  const days: DailyChallengeItem[] = [];
  const refMs = typeof baseDateMs === 'number' ? baseDateMs : Date.now();
  // Tính ngày hiện tại theo múi giờ Việt Nam (UTC+7) để không bị lệch giờ trên Docker container (mặc định UTC)
  const vnNow = new Date(refMs + 7 * 3600 * 1000);
  const vnYear = vnNow.getUTCFullYear();
  const vnMonth = vnNow.getUTCMonth();
  const vnDate = vnNow.getUTCDate();
  // Mốc 00:00:00 giờ Việt Nam (tương ứng 17:00:00 UTC của ngày hôm trước)
  const todayVnMidnightUtcMs = Date.UTC(vnYear, vnMonth, vnDate, 0, 0, 0, 0) - 7 * 3600 * 1000;

  for (let day = 1; day <= 21; day++) {
    const unlockUtcMs = todayVnMidnightUtcMs + (day - 1) * 86400 * 1000;
    const vnDayObj = new Date(unlockUtcMs + 7 * 3600 * 1000);
    const dd = String(vnDayObj.getUTCDate()).padStart(2, '0');
    const mm = String(vnDayObj.getUTCMonth() + 1).padStart(2, '0');
    const yyyy = vnDayObj.getUTCFullYear();

    const unlockDate = new Date(unlockUtcMs).toISOString();

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
      unlockDate: new Date(Date.now() + 86400000 * 365).toISOString(),
      // Mặc định khi khởi tạo mới: KHÓA toàn bộ 21 ngày, chỉ mở khi Admin bấm "Start Challenge" hoặc mở khóa ngày
      isPublished: false,
      forceLockedAt: null,
      forceRevealed: false,
      questions,
      q11Words: JSON.parse(JSON.stringify(DEFAULT_Q11_5_WORDS)),
    });
  }

  return days;
}

export const generate30DaysChallenges = generate21DaysChallenges;

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

export const WORKPLACE_10_WORDS: WorkplaceWordItem[] = [
  {
    id: 1,
    word: 'Approval',
    spokenText: 'Approval',
    ipa: '/əˈpruːvəl/',
    syllables: 'ơ · PRUː · vồ',
    meaningVi: 'Sự phê duyệt',
    meaningEn: 'Official permission',
    meaningKo: '승인 / 결재',
    tipVi: 'Nhấn trọng âm ở âm tiết thứ 2 (-proo-), âm đầu đọc nhẹ là /ə/, cong lưỡi nhẹ ở âm cuối /l/.',
    tipEn: 'Stress the 2nd syllable (-proo-), start with a soft schwa /ə/, and finish with a clear dark /l/.',
    tipKo: '두 번째 음절(-proo-)에 강세를 두고 첫 음은 약한 /ə/로 발음하세요.',
  },
  {
    id: 2,
    word: 'Equipment',
    spokenText: 'Equipment',
    ipa: '/ɪˈkwɪpmənt/',
    syllables: 'i · QUÝP · mần(t)',
    meaningVi: 'Trang thiết bị',
    meaningEn: 'Tools & machinery',
    meaningKo: '장비 / 설비',
    tipVi: 'Trọng âm rơi vào -quip- (/ˈkwɪp/), khép môi nhẹ ở âm /p/ trước khi đọc -ment và bật nhẹ âm cuối /t/.',
    tipEn: 'Stress the 2nd syllable (-quip-), keep /p/ crisp, and pronounce final /t/.',
    tipKo: '두 번째 음절(-quip-)에 강세를 두고 끝소리 /t/를 가볍게 발음하세요.',
  },
  {
    id: 3,
    word: 'Measurement',
    spokenText: 'Measurement',
    ipa: '/ˈmeʒərmənt/',
    syllables: 'ME · dơ · mần(t)',
    meaningVi: 'Sự đo lường',
    meaningEn: 'Act of measuring',
    meaningKo: '측정 / 계측',
    tipVi: 'Nhấn âm đầu /ˈmeʒ/, chú ý phụ âm giữa là /ʒ/ (giống chữ "s" trong "vision"), không đọc thành /s/.',
    tipEn: 'Stress the 1st syllable /ˈmeʒ/, using the voiced /ʒ/ sound (like in "vision").',
    tipKo: '첫 음절 /ˈmeʒ/에 강세를 두고 중간의 /ʒ/ 발음에 유의하세요.',
  },
  {
    id: 4,
    word: 'Development',
    spokenText: 'Development',
    ipa: '/dɪˈveləpmənt/',
    syllables: 'đì · VE · lợp · mần(t)',
    meaningVi: 'Sự phát triển (R&D)',
    meaningEn: 'Growth & advancement',
    meaningKo: '개발 / 발전',
    tipVi: 'Nhấn trọng âm vào âm tiết thứ 2 (-vel-), không nhấn vào âm đầu de- hoặc âm thứ 3 -op-.',
    tipEn: 'Put primary stress on the 2nd syllable (-vel-), reducing -op- to /əp/.',
    tipKo: '두 번째 음절(-vel-)에 강세를 두어 발음하세요.',
  },
  {
    id: 5,
    word: 'Yield rate',
    spokenText: 'Yield rate',
    ipa: '/jiːld reɪt/',
    syllables: 'GIUː(đ) · RÂY(t)',
    meaningVi: 'Tỷ lệ đạt chuẩn',
    meaningEn: 'Good product ratio',
    meaningKo: '수율 / 양품률',
    tipVi: 'Từ "Yield" bắt đầu bằng âm /j/ (như "yes") kéo dài /iː/, kết thúc có /ld/; "rate" nguyên âm đôi /eɪ/.',
    tipEn: 'Start "Yield" with a smooth /j/ (not /dʒ/), hold /iː/, and finish "rate" with /eɪt/.',
    tipKo: '"Yield"는 /j/로 시작하여 /iːld/로 발음하고 "rate"는 /reɪt/로 발음하세요.',
  },
  {
    id: 6,
    word: 'DOE',
    spokenText: 'D. O. E.',
    ipa: '/ˌdiː oʊ ˈiː/',
    syllables: 'ĐIː · âu · Iː',
    meaningVi: 'Thiết kế thực nghiệm',
    meaningEn: 'Design of Experiments',
    meaningKo: '실험계획법 (DOE)',
    tipVi: 'Đọc rõ ràng tên từng chữ cái D (/diː/) – O (/oʊ/) – E (/iː/), nhấn mạnh vào chữ cái cuối E.',
    tipEn: 'Spell out each letter clearly: D (/diː/) – O (/oʊ/) – E (/iː/).',
    tipKo: '각 알파벳 D(/diː/) – O(/oʊ/) – E(/iː/)를 명확하게 끊어 읽으세요.',
  },
  {
    id: 7,
    word: 'MEG',
    spokenText: 'M. E. G.',
    ipa: '/ˌem iː ˈdʒiː/',
    syllables: 'EM · iː · GIː',
    meaningVi: 'Chữ viết tắt M-E-G',
    meaningEn: 'M-E-G Acronym',
    meaningKo: 'M-E-G 약어',
    tipVi: 'Khép môi ở cuối chữ M (/em/), kéo dài E (/iː/) và bật âm /dʒiː/ cho chữ G.',
    tipEn: 'Close lips on M (/em/), pronounce E (/iː/), and finish with G (/dʒiː/).',
    tipKo: 'M(/em/) 발음 후 입술을 다물고 E(/iː/), G(/dʒiː/)를 명확히 발음하세요.',
  },
  {
    id: 8,
    word: 'Tool',
    spokenText: 'Tool',
    ipa: '/tuːl/',
    syllables: 'TUː(l)',
    meaningVi: 'Dụng cụ / Công cụ',
    meaningEn: 'Working instrument',
    meaningKo: '공구 / 툴',
    tipVi: 'Tròn môi kéo dài nguyên âm /uː/ và nâng đầu lưỡi chạm hàm trên ở âm /l/ để không nhầm với "Tall" (/tɔːl/).',
    tipEn: 'Round your lips for the long /uː/ vowel and lift your tongue tip for final /l/ (distinguish from "Tall").',
    tipKo: '긴 /uː/ 모음으로 발음하여 "Tall"(/tɔːl/)과 구별하세요.',
  },
  {
    id: 9,
    word: 'Metal',
    spokenText: 'Metal',
    ipa: '/ˈmetl/',
    syllables: 'ME · tồ',
    meaningVi: 'Kim loại',
    meaningEn: 'Solid material',
    meaningKo: '금속 / 메탈',
    tipVi: 'Nhấn âm đầu /ˈme-/, âm tiết thứ 2 đọc lướt nhẹ thành /tl/ (hoặc Flap T /ˈmedl/ trong tiếng Anh Mỹ).',
    tipEn: 'Stress the 1st syllable /ˈme-/ and use a light syllabic /tl/ or American flap /d/ at the end.',
    tipKo: '첫 음절 /ˈme-/에 강세를 두고 끝은 가볍게 /tl/로 마무리하세요.',
  },
  {
    id: 10,
    word: 'Model',
    spokenText: 'Model',
    ipa: '/ˈmɑːdl/',
    syllables: 'MO · đồ',
    meaningVi: 'Mẫu mã / Dòng sản phẩm',
    meaningEn: 'Product version/design',
    meaningKo: '모델 / 제품형',
    tipVi: 'Mở rộng miệng ở âm đầu /ˈmɑː-/ (hoặc /ˈmɒ-/), hạ nhẹ giọng ở âm cuối /-dl/.',
    tipEn: 'Open your mouth for the stressed /ˈmɑː-/ vowel and finish with a soft syllabic /-dl/.',
    tipKo: '첫 음절 /ˈmɑː-/를 또렷하게 발음하고 /-dl/로 부드럽게 끝맺으세요.',
  },
];

export const WORKPLACE_5_WORDS: WorkplaceWordItem[] = WORKPLACE_10_WORDS.slice(0, 5);

export interface Q11SubmissionData {
  submitted: boolean;
  recordedDurationSec: number;
  recognizedTranscript: string;
  overallAccuracy: number;
  wordResults: {
    word: string;
    ipa: string;
    syllables?: string;
    imageUrl?: string;
    matched: boolean;
    score: number;
    tip: string;
  }[];
  aiSummaryFeedback: string;
  submittedAt: string;
}

export const Q11_TEXT = {
  vi: {
    badge: 'Câu 11 • Tự Luyện Phát Âm 🎙️ (Không tính giờ & Không tính điểm thi)',
    title: 'Hướng Dẫn Cách Đọc & Luyện Phát Âm 5 Từ Thông Dụng Trong Công Ty',
    subtitle:
      'Nghe mẫu 5 từ bên dưới, xem hướng dẫn cách đọc tách âm kèm hình ảnh / GIF khẩu hình miệng và thu âm để tự nghe lại đối chiếu!',
    untimedBanner:
      '⏱️ Đã chốt giờ thi cho phần câu hỏi chính thức. Phần luyện đọc 5 từ này là tự luyện bổ trợ – hoàn toàn KHÔNG tính giờ và KHÔNG tính điểm vào Bảng xếp hạng!',
    listenAllHint: 'Bấm vào từng từ để nghe phát âm chuẩn & xem cách đọc kèm hình minh họa',
    howToReadLabel: 'Cách đọc dễ nhớ',
    mouthTipLabel: 'Khẩu hình & Nhấn trọng âm',
    recordBtn: '🎙️ Thu âm giọng đọc để tự đối chiếu',
    stopBtn: '⏹️ Dừng Ghi âm',
    recordingStatus: 'Đang thu âm giọng đọc của bạn... Hãy đọc lần lượt 5 từ trên theo hướng dẫn!',
    playMyVoiceBtn: '▶️ Nghe lại giọng của bạn',
    reRecordBtn: '🎙️ Thu âm lại',
    submitBtn: '✅ Đánh dấu đã luyện đọc xong Câu 11',
    submittedBadge: '✅ Đã hoàn thành tự luyện phát âm Câu 11',
    guideTitle: '📖 Tổng hợp cách đọc & mẹo phát âm 5 từ hôm nay',
    storageNote:
      '🔒 Bản thu âm chỉ lưu tạm trên trình duyệt của bạn để bạn tự nghe lại và so sánh với phát âm mẫu.',
  },
  en: {
    badge: 'Question 11 • Pronunciation Practice 🎙️ (Untimed & Not Graded for Exam)',
    title: 'Pronunciation Guide & Voice Practice for 5 Workplace Words',
    subtitle:
      'Listen to the 5 words below, follow the syllable breakdown & visual guide (image/GIF), and record your voice to compare!',
    untimedBanner:
      '⏱️ Exam timer stopped after the official questions. This 5-word pronunciation exercise is untimed practice and does NOT affect your ranking!',
    listenAllHint: 'Tap any word card to hear standard pronunciation & view reading guide',
    howToReadLabel: 'Syllable Guide',
    mouthTipLabel: 'Mouth & Stress Tip',
    recordBtn: '🎙️ Record Your Voice to Compare',
    stopBtn: '⏹️ Stop Recording',
    recordingStatus: 'Recording your voice... Please read the 5 workplace words aloud!',
    playMyVoiceBtn: '▶️ Listen to Your Recording',
    reRecordBtn: '🎙️ Record Again',
    submitBtn: '✅ Mark Question 11 Practice as Done',
    submittedBadge: '✅ Question 11 Pronunciation Practice Completed',
    guideTitle: '📖 Pronunciation Guide Summary',
    storageNote:
      '🔒 Your voice recording stays in your browser for self-listening and comparison.',
  },
  ko: {
    badge: '문항 11 • 발음 연습 🎙️ (시간 미측정 & 시험 점수 미반영)',
    title: '사내 필수 영단어 5개 읽는 법 가이드 및 녹음 연습',
    subtitle:
      '아래 5개 단어의 원어민 발음과 읽는 법(이미지/GIF 가이드)을 확인하고, 직접 녹음하여 비교해 보세요!',
    untimedBanner:
      '⏱️ 공식 문항 완료 후 시험 타이머가 정지되었습니다. 본 5단어 발음 연습은 시간 및 랭킹 점수에 전혀 반영되지 않습니다!',
    listenAllHint: '단어 카드를 누르면 원어민 발음과 발음 가이드를 확인할 수 있습니다',
    howToReadLabel: '발음 읽기 가이드',
    mouthTipLabel: '입모양 & 강세 팁',
    recordBtn: '🎙️ 내 발음 녹음하여 비교하기',
    stopBtn: '⏹️ 녹음 중지',
    recordingStatus: '음성을 녹음 중입니다... 위 5개 단어를 차례대로 읽어주세요!',
    playMyVoiceBtn: '▶️ 내 녹음 다시 듣기',
    reRecordBtn: '🎙️ 다시 녹음',
    submitBtn: '✅ 문항 11 발음 연습 완료 표시',
    submittedBadge: '✅ 문항 11 자율 발음 연습 완료',
    guideTitle: '📖 오늘의 5단어 발음 가이드 요약',
    storageNote: '🔒 녹음 파일은 브라우저에서만 재생되며 서버에 업로드되지 않습니다.',
  },
};

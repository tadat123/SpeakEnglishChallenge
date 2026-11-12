import React, { useEffect, useRef, useState } from 'react';
import {
  Mic,
  Square,
  Volume2,
  Play,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  BookOpen,
} from 'lucide-react';
import { playPronunciation } from '../utils/audio';
import { resolveMediaUrl } from '../utils/clientApiFallback';
import { Lang } from '../utils/i18n';

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

interface PronunciationChallengeQ11Props {
  lang: Lang;
  darkMode: boolean;
  value?: Q11SubmissionData | null;
  onChange: (data: Q11SubmissionData) => void;
  words?: WorkplaceWordItem[];
}

const Q11_TEXT = {
  vi: {
    badge: 'Câu 11 • Tự Luyện Phát Âm 🎙️ (Không tính giờ & Không tính điểm thi)',
    title: 'Hướng Dẫn Cách Đọc & Luyện Phát Âm 5 Từ Thông Dụng Trong Công Ty',
    subtitle:
      'Nghe mẫu 5 từ bên dưới, xem hướng dẫn cách đọc tách âm kèm hình ảnh / GIF khẩu hình miệng và thu âm để tự nghe lại đối chiếu!',
    untimedBanner:
      '⏱️ Đã chốt giờ thi sau Câu 10. Điểm thi chính thức chỉ tính từ Câu 1 đến Câu 10 (tối đa 100 điểm). Phần luyện đọc 5 từ này là tự luyện bổ trợ – hoàn toàn KHÔNG tính giờ và KHÔNG tính điểm vào Bảng xếp hạng!',
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
      '⏱️ Exam timer stopped after Question 10. The official exam score is strictly from Questions 1–10 (100 points max). This 5-word pronunciation exercise is untimed practice and does NOT affect your ranking!',
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
      '⏱️ 10번 문제 완료 후 시험 타이머가 정지되었습니다. 공식 시험 점수는 1~10번 문항(최대 100점)으로만 산정되며, 본 5단어 발음 연습은 시간 및 랭킹 점수에 전혀 반영되지 않습니다!',
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

const KNOWN_SYLLABLE_MAP: Record<string, string> = {
  approval: 'ơ · PRUː · vồ',
  equipment: 'i · QUÝP · mần(t)',
  measurement: 'ME · dơ · mần(t)',
  development: 'đì · VE · lợp · mần(t)',
  'yield rate': 'GIUː(đ) · RÂY(t)',
  doe: 'ĐIː · âu · Iː',
  meg: 'EM · iː · GIː',
  tool: 'TUː(l)',
  metal: 'ME · tồ',
  model: 'MO · đồ',
};

export interface AnalyzedSyllable {
  label: string;
  ipaPart: string;
  stressed: boolean;
  secondary?: boolean;
}

export type MouthPostureType = 'rounded' | 'spread' | 'open' | 'tongue';

export interface WordPronunciationAnalysis {
  syllables: AnalyzedSyllable[];
  readableGuide: string;
  stressedIndex: number;
  mouthPosture: MouthPostureType;
  mouthLabelVi: string;
  mouthLabelEn: string;
  endingCueVi: string;
}

/**
 * Tự động phân tích 4 trường (Từ tiếng Anh, IPA, Nghĩa tiếng Việt, Hướng dẫn phát âm)
 * để sinh ra:
 * 1. Tách âm tiết & vị trí trọng âm (Syllables + Primary/Secondary Stress)
 * 2. Khẩu hình miệng (Tròn môi / Căng khóe miệng / Hạ hàm mở rộng / Đầu lưỡi chạm răng-lợi)
 * 3. Điểm nhấn âm cuối hoặc phụ âm đặc trưng
 */
export const analyzeWordPronunciation = (
  item: Partial<WorkplaceWordItem>
): WordPronunciationAnalysis => {
  const rawWord = (item.word || '').trim();
  const rawIpa = (item.ipa || '').trim();
  const rawTip = (item.tip || item.tipVi || '').trim();
  const tipLower = rawTip.toLowerCase();

  // 1. Kiểm tra nếu người dùng hoặc từ điển có sẵn chuỗi tách âm '·'
  const presetSyllables =
    item.syllables && item.syllables.trim()
      ? item.syllables.trim()
      : KNOWN_SYLLABLE_MAP[rawWord.toLowerCase()] || '';

  // Phát hiện gợi ý trọng âm từ trường "Hướng dẫn phát âm" nếu IPA không có dấu ˈ
  let hintedStressIdx: number | null = null;
  if (/nhấn\s*(trọng\s*)?âm\s*(tiết\s*)?(thứ\s*)?1|nhấn\s*âm\s*đầu|trọng\s*âm\s*1/i.test(rawTip)) {
    hintedStressIdx = 0;
  } else if (/nhấn\s*(trọng\s*)?âm\s*(tiết\s*)?(thứ\s*)?2|trọng\s*âm\s*(rơi\s*vào\s*)?âm\s*2|âm\s*tiết\s*thứ\s*2/i.test(rawTip)) {
    hintedStressIdx = 1;
  } else if (/nhấn\s*(trọng\s*)?âm\s*(tiết\s*)?(thứ\s*)?3|âm\s*tiết\s*thứ\s*3/i.test(rawTip)) {
    hintedStressIdx = 2;
  } else if (/nhấn\s*(mạnh\s*)?(vào\s*)?(âm|chữ\s*cái)\s*cuối/i.test(rawTip)) {
    hintedStressIdx = -1; // âm cuối
  }

  // Tách IPA thành các âm tiết
  const cleanIpa = rawIpa
    .replace(/^[/[\s]+|[/\]\s]+$/g, '')
    .replace(/['’]/g, 'ˈ');

  const splitIpaIntoSyllables = (ipaStr: string): string[] => {
    if (!ipaStr) return [];
    // Bước 1: Tách theo dấu chấm '.', '·', khoảng trắng, hoặc ngay trước dấu trọng âm ˈ / ˌ
    const step1 = ipaStr
      .replace(/([.·\s]+)/g, '|')
      .replace(/(?=[ˈˌ])/g, '|')
      .split('|')
      .map((s) => s.trim())
      .filter(Boolean);

    // Bước 2: Với mỗi cụm chưa có dấu chấm nhưng có nhiều nguyên âm (VD: ˈpruːvəl, ˈmeʒərmənt),
    // tự động tách giữa các nhân nguyên âm IPA
    const vowelRegex =
      /eɪ|aɪ|ɔɪ|aʊ|oʊ|əʊ|ɪə|eə|ʊə|ɑː|ɔː|uː|iː|ɜː|ɝː|[iɪeɛæɑɒɔoʊuʌəɜɝɚa]+ː?/g;
    const validOnsets = [
      'tʃ',
      'dʒ',
      'tr',
      'dr',
      'pr',
      'br',
      'kr',
      'gr',
      'fr',
      'θr',
      'ʃr',
      'pl',
      'bl',
      'kl',
      'gl',
      'fl',
      'sl',
      'kw',
      'tw',
      'dw',
      'sw',
      'sp',
      'st',
      'sk',
      'sm',
      'sn',
    ];

    const finalChunks: string[] = [];
    for (const chunk of step1) {
      const matches = Array.from(chunk.matchAll(vowelRegex));
      if (matches.length <= 1) {
        finalChunks.push(chunk);
        continue;
      }

      let startIdx = 0;
      for (let i = 0; i < matches.length - 1; i++) {
        const curVowelEnd = (matches[i].index ?? 0) + matches[i][0].length;
        const nextVowelStart = matches[i + 1].index ?? curVowelEnd;
        const interConsonants = chunk.slice(curVowelEnd, nextVowelStart);

        let splitPoint = nextVowelStart;
        if (interConsonants.length === 1) {
          splitPoint = curVowelEnd;
        } else if (interConsonants.length >= 2) {
          const lastTwo = interConsonants.slice(-2);
          if (validOnsets.includes(lastTwo)) {
            splitPoint = nextVowelStart - 2;
          } else {
            splitPoint = nextVowelStart - 1;
          }
        }

        finalChunks.push(chunk.slice(startIdx, splitPoint));
        startIdx = splitPoint;
      }
      finalChunks.push(chunk.slice(startIdx));
    }

    return finalChunks.filter(Boolean);
  };

  // Tách từ tiếng Anh thành các âm tiết tương ứng nếu chưa có preset
  const splitEnglishWord = (wordStr: string, targetCount: number): string[] => {
    const clean = wordStr.trim();
    if (!clean) return [];
    if (targetCount <= 1) return [clean];
    if (clean.includes(' ') || clean.includes('-')) {
      const parts = clean.split(/[\s-]+/).filter(Boolean);
      if (parts.length === targetCount) return parts;
    }
    if (/^[A-Z]{2,5}$/.test(clean) && clean.length === targetCount) {
      return clean.split('');
    }
    const wordChunks =
      clean.match(/[^aeiouy]*[aeiouy]+(?:[^aeiouy]*$|[^aeiouy](?=[^aeiouy]))?/gi) || [clean];
    if (wordChunks.length === targetCount) return wordChunks;
    return [];
  };

  const ipaParts = splitIpaIntoSyllables(cleanIpa);
  let syllables: AnalyzedSyllable[] = [];

  if (presetSyllables && presetSyllables.includes('·')) {
    const parts = presetSyllables
      .split('·')
      .map((s) => s.trim())
      .filter(Boolean);
    syllables = parts.map((part, idx) => {
      const isUpper = part === part.toUpperCase() && /[A-ZÀ-Ỹ]/.test(part);
      const ipaPart = ipaParts[idx] || part;
      return {
        label: part,
        ipaPart,
        stressed: isUpper,
        secondary: ipaPart.startsWith('ˌ'),
      };
    });
  } else if (ipaParts.length > 0) {
    const hasExplicitPrimary = ipaParts.some((p) => p.includes('ˈ'));
    const wordParts = splitEnglishWord(rawWord, ipaParts.length);

    syllables = ipaParts.map((ipaPart, idx) => {
      const cleanSyllableIpa = ipaPart.replace(/^[ˈˌ]+/, '');
      let isPrimary = ipaPart.includes('ˈ');
      const isSecondary = ipaPart.includes('ˌ');

      if (!hasExplicitPrimary) {
        if (hintedStressIdx === -1) {
          isPrimary = idx === ipaParts.length - 1;
        } else if (hintedStressIdx !== null && hintedStressIdx < ipaParts.length) {
          isPrimary = idx === hintedStressIdx;
        } else {
          isPrimary = idx === 0;
        }
      }

      const baseDisplay = wordParts[idx] || cleanSyllableIpa || rawWord;
      const label = isPrimary
        ? cleanSyllableIpa.toUpperCase()
        : cleanSyllableIpa.toLowerCase();

      return {
        label: wordParts[idx]
          ? isPrimary
            ? `${wordParts[idx].toUpperCase()} (${cleanSyllableIpa})`
            : `${wordParts[idx].toLowerCase()} (${cleanSyllableIpa})`
          : label || baseDisplay,
        ipaPart: cleanSyllableIpa,
        stressed: isPrimary,
        secondary: isSecondary,
      };
    });
  } else if (rawWord) {
    const fallbackChunks =
      rawWord.match(/[^aeiouy]*[aeiouy]+(?:[^aeiouy]*$|[^aeiouy](?=[^aeiouy]))?/gi) || [rawWord];
    const stressIdx =
      hintedStressIdx === -1
        ? fallbackChunks.length - 1
        : hintedStressIdx !== null && hintedStressIdx < fallbackChunks.length
        ? hintedStressIdx
        : 0;
    syllables = fallbackChunks.map((chunk, idx) => ({
      label: idx === stressIdx ? chunk.toUpperCase() : chunk.toLowerCase(),
      ipaPart: chunk,
      stressed: idx === stressIdx,
    }));
  }

  if (syllables.length === 0) {
    syllables = [{ label: 'WORD', ipaPart: '...', stressed: true }];
  }
  if (!syllables.some((s) => s.stressed)) {
    syllables[0].stressed = true;
    syllables[0].label = syllables[0].label.toUpperCase();
  }

  const stressedIndex = Math.max(
    0,
    syllables.findIndex((s) => s.stressed)
  );
  const stressedIpa = syllables[stressedIndex]?.ipaPart || cleanIpa;

  // 2. Tự động nhận diện Khẩu hình miệng (Mouth Posture) từ IPA & Hướng dẫn phát âm
  let mouthPosture: MouthPostureType = 'open';
  let mouthLabelVi = 'Mở tự nhiên & nhấn rõ trọng âm';
  let mouthLabelEn = 'Natural open jaw on stressed syllable';

  if (
    /tròn\s*môi|chu\s*môi|môi\s*tròn/.test(tipLower) ||
    /[uʊɔɒ]|uː|ɔː|oʊ|əʊ|ʃ|ʒ|w/.test(stressedIpa)
  ) {
    mouthPosture = 'rounded';
    mouthLabelVi = 'Chu tròn môi ở âm nhấn';
    mouthLabelEn = 'Round your lips clearly';
  } else if (
    /căng\s*(ngang\s*)?môi|khóe\s*miệng|mỉm\s*cười|kéo\s*dài\s*\/?i/.test(tipLower) ||
    /iː|eɪ|ɪ/.test(stressedIpa)
  ) {
    mouthPosture = 'spread';
    mouthLabelVi = 'Căng nhẹ khóe miệng sang ngang';
    mouthLabelEn = 'Spread corners of lips slightly';
  } else if (
    /cong\s*lưỡi|đầu\s*lưỡi|chạm\s*hàm|răng|khép\s*môi/.test(tipLower)
  ) {
    mouthPosture = 'tongue';
    mouthLabelVi = 'Đặt đúng vị trí lưỡi & bật âm';
    mouthLabelEn = 'Position tongue tip & release cleanly';
  } else if (
    /hạ\s*hàm|mở\s*rộng|há\s*miệng/.test(tipLower) ||
    /ɑː|æ|aɪ|aʊ|ʌ|e/.test(stressedIpa)
  ) {
    mouthPosture = 'open';
    mouthLabelVi = 'Hạ hàm mở miệng rõ ở âm nhấn';
    mouthLabelEn = 'Drop jaw slightly on stressed vowel';
  }

  // 3. Tự động nhận diện điểm lưu ý âm cuối / phụ âm từ IPA & Tip
  let endingCueVi = '';
  const cleanEnding = cleanIpa.replace(/[ˈˌ.·\s]/g, '');
  if (cleanEnding.endsWith('nt')) {
    endingCueVi = 'Âm cuối /nt/: ngân nhẹ /n/ rồi bật /t/';
  } else if (cleanEnding.endsWith('ld')) {
    endingCueVi = 'Âm cuối /ld/: cong lưỡi /l/ rồi bật nhẹ /d/';
  } else if (cleanEnding.endsWith('l')) {
    endingCueVi = 'Âm cuối /l/: cong đầu lưỡi chạm hàm trên';
  } else if (cleanEnding.endsWith('t') || cleanEnding.endsWith('d')) {
    endingCueVi = `Âm cuối /${cleanEnding.slice(-1)}/: bật nhẹ đầu lưỡi`;
  } else if (cleanEnding.endsWith('p') || cleanEnding.endsWith('b') || cleanEnding.endsWith('m')) {
    endingCueVi = `Âm cuối /${cleanEnding.slice(-1)}/: khép hai môi ở cuối từ`;
  } else if (cleanEnding.includes('ʒ') || cleanEnding.includes('ʃ')) {
    endingCueVi = 'Phụ âm /ʒ/-/ʃ/: chu nhẹ môi đẩy luồng hơi';
  } else if (rawTip) {
    endingCueVi = rawTip.length > 52 ? `${rawTip.slice(0, 50)}...` : rawTip;
  } else {
    endingCueVi = `Nhấn mạnh âm tiết thứ ${stressedIndex + 1}`;
  }

  const readableGuide = syllables.map((s) => s.label).join(' · ');

  return {
    syllables,
    readableGuide,
    stressedIndex,
    mouthPosture,
    mouthLabelVi,
    mouthLabelEn,
    endingCueVi,
  };
};

const getWordSyllableGuide = (item: WorkplaceWordItem): string => {
  return analyzeWordPronunciation(item).readableGuide;
};

export interface AutoPronunciationGraphicProps {
  item: Partial<WorkplaceWordItem>;
  isPlaying?: boolean;
  darkMode?: boolean;
  compact?: boolean;
  onListen?: () => void;
}

/**
 * Hình vẽ SVG tự động sinh 100% từ 4 trường:
 * (Từ tiếng Anh, IPA, Nghĩa tiếng Việt, Hướng dẫn phát âm)
 * - Vẽ biểu đồ đường cong ngữ điệu (Pitch Contour) & cột nhịp trọng âm (▲ / •)
 * - Vẽ sơ đồ khẩu hình miệng & lưỡi (Tròn môi / Căng môi / Mở hàm / Đầu lưỡi)
 */
export const AutoPronunciationGraphic: React.FC<AutoPronunciationGraphicProps> = ({
  item,
  isPlaying = false,
  darkMode = false,
  compact = false,
  onListen,
}) => {
  const analysis = analyzeWordPronunciation(item);
  const { syllables, stressedIndex, mouthPosture, mouthLabelVi, endingCueVi } = analysis;

  // Tọa độ các nút âm tiết trên SVG đường cong ngữ điệu (ViewBox 220 x 72)
  const count = syllables.length;
  const svgWidth = 220;
  const points = syllables.map((syl, idx) => {
    const x =
      count === 1
        ? svgWidth / 2
        : 28 + (idx * (svgWidth - 56)) / Math.max(1, count - 1);
    const y = syl.stressed ? 16 : syl.secondary ? 32 : 46;
    return { x, y, ...syl };
  });

  // Tạo đường cong mượt nối các âm tiết
  const buildCurvePath = () => {
    if (points.length === 1) {
      const p = points[0];
      return `M 30 46 Q ${p.x} ${p.y - 10} ${svgWidth - 30} 46`;
    }
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const midX = (p0.x + p1.x) / 2;
      d += ` C ${midX} ${p0.y}, ${midX} ${p1.y}, ${p1.x} ${p1.y}`;
    }
    return d;
  };

  return (
    <div
      onClick={onListen}
      role={onListen ? 'button' : undefined}
      tabIndex={onListen ? 0 : undefined}
      className={`rounded-xl border transition select-none overflow-hidden ${
        onListen ? 'cursor-pointer' : ''
      } ${compact ? 'p-2' : 'p-2.5 sm:p-3'} ${
        isPlaying
          ? 'bg-blue-600/15 border-blue-500 ring-2 ring-blue-500/20'
          : darkMode
          ? 'bg-slate-900/95 border-slate-700 hover:border-blue-500/60'
          : 'bg-gradient-to-br from-slate-50 via-white to-indigo-50/60 border-slate-200/90 hover:border-blue-300 shadow-inner'
      }`}
    >
      {/* Hàng trên: Badge Trọng âm + Badge Khẩu hình */}
      <div className="flex items-center justify-between gap-1 mb-1.5">
        <span
          className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
            darkMode
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              : 'bg-amber-100 text-amber-800 border border-amber-200'
          }`}
        >
          ▲ Nhấn âm {stressedIndex + 1}/{count}
        </span>
        <span
          className={`px-1.5 py-0.5 rounded text-[9px] font-bold truncate ${
            darkMode
              ? 'bg-indigo-950 text-indigo-300 border border-indigo-800'
              : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
          }`}
        >
          👄 {mouthPosture === 'rounded'
            ? 'Tròn môi'
            : mouthPosture === 'spread'
            ? 'Căng khóe môi'
            : mouthPosture === 'tongue'
            ? 'Cong/Bật lưỡi'
            : 'Mở rộng hàm'}
        </span>
      </div>

      {/* Khu vực Hình vẽ chính: Biểu đồ sóng trọng âm + Sơ đồ khẩu hình SVG */}
      <div className="grid grid-cols-12 gap-1.5 items-center">
        {/* Cột trái (8/12): Đường cong ngữ điệu & cột âm tiết */}
        <div className="col-span-8 flex flex-col items-center">
          <svg
            viewBox={`0 0 ${svgWidth} 64`}
            className={`w-full ${compact ? 'h-12' : 'h-14'} overflow-visible`}
          >
            <defs>
              <linearGradient id="stressCurveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="50%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#ec4899" />
              </linearGradient>
            </defs>

            {/* Đường chuẩn ngang mờ */}
            <line
              x1="14"
              y1="48"
              x2={svgWidth - 14}
              y2="48"
              stroke={darkMode ? '#334155' : '#cbd5e1'}
              strokeDasharray="3 3"
              strokeWidth="1"
            />

            {/* Đường cong nối cao độ giữa các âm tiết */}
            <path
              d={buildCurvePath()}
              fill="none"
              stroke="url(#stressCurveGrad)"
              strokeWidth="2.75"
              strokeLinecap="round"
            />

            {/* Các cột & điểm nút âm tiết */}
            {points.map((pt, idx) => (
              <g key={idx}>
                {/* Cột thẳng đứng từ đáy lên điểm nhấn */}
                <line
                  x1={pt.x}
                  y1="52"
                  x2={pt.x}
                  y2={pt.y}
                  stroke={pt.stressed ? '#f59e0b' : '#3b82f6'}
                  strokeWidth={pt.stressed ? '5' : '3'}
                  strokeLinecap="round"
                  opacity={pt.stressed ? 0.9 : 0.45}
                />

                {/* Nút tròn tại đỉnh âm tiết */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={pt.stressed ? (isPlaying ? 8 : 6.5) : 4.5}
                  fill={pt.stressed ? '#f59e0b' : '#3b82f6'}
                  stroke="#ffffff"
                  strokeWidth="1.5"
                />

                {/* Ký hiệu ▲ cho trọng âm chính */}
                {pt.stressed && (
                  <text
                    x={pt.x}
                    y={pt.y - 9}
                    textAnchor="middle"
                    fill={darkMode ? '#fcd34d' : '#d97706'}
                    fontSize="9"
                    fontWeight="900"
                  >
                    ▲
                  </text>
                )}

                {/* Nhãn IPA / Âm tiết bên dưới */}
                <text
                  x={pt.x}
                  y="62"
                  textAnchor="middle"
                  fill={
                    pt.stressed
                      ? darkMode
                        ? '#fbbf24'
                        : '#b45309'
                      : darkMode
                      ? '#94a3b8'
                      : '#475569'
                  }
                  fontSize={count > 3 ? '8.5' : '9.5'}
                  fontWeight={pt.stressed ? '900' : '700'}
                >
                  {pt.ipaPart.length > 7 ? `${pt.ipaPart.slice(0, 6)}…` : pt.ipaPart}
                </text>
              </g>
            ))}
          </svg>
        </div>

        {/* Cột phải (4/12): Sơ đồ Khẩu hình miệng SVG tự động */}
        <div
          className={`col-span-4 flex flex-col items-center justify-center rounded-lg p-1 border ${
            darkMode
              ? 'bg-slate-800/90 border-slate-700'
              : 'bg-white/90 border-slate-200/80'
          }`}
        >
          <svg
            viewBox="0 0 80 54"
            className={`${compact ? 'w-12 h-9' : 'w-14 h-10'} overflow-visible`}
          >
            {mouthPosture === 'rounded' && (
              <g>
                {/* Khẩu hình Tròn môi (→ ○ ←) */}
                <ellipse
                  cx="40"
                  cy="27"
                  rx="14"
                  ry="14"
                  fill="#fb7185"
                  fillOpacity="0.2"
                  stroke="#e11d48"
                  strokeWidth="3"
                />
                <ellipse
                  cx="40"
                  cy="27"
                  rx="7.5"
                  ry="7.5"
                  fill={darkMode ? '#0f172a' : '#1e293b'}
                />
                {/* Mũi tên chụm vào */}
                <path
                  d="M 10 27 L 21 27 M 17 23 L 21 27 L 17 31"
                  stroke="#f59e0b"
                  strokeWidth="2"
                  fill="none"
                  strokeLinecap="round"
                />
                <path
                  d="M 70 27 L 59 27 M 63 23 L 59 27 L 63 31"
                  stroke="#f59e0b"
                  strokeWidth="2"
                  fill="none"
                  strokeLinecap="round"
                />
              </g>
            )}

            {mouthPosture === 'spread' && (
              <g>
                {/* Khẩu hình Căng ngang khóe miệng (← ▬▬ →) */}
                <path
                  d="M 16 26 Q 40 16 64 26 Q 40 38 16 26 Z"
                  fill="#fb7185"
                  fillOpacity="0.22"
                  stroke="#e11d48"
                  strokeWidth="2.75"
                />
                <path
                  d="M 22 26 Q 40 23 58 26 Q 40 32 22 26 Z"
                  fill="#ffffff"
                  stroke="#cbd5e1"
                  strokeWidth="1"
                />
                {/* Mũi tên kéo sang 2 bên */}
                <path
                  d="M 15 26 L 6 26 M 10 22 L 6 26 L 10 30"
                  stroke="#10b981"
                  strokeWidth="2"
                  fill="none"
                  strokeLinecap="round"
                />
                <path
                  d="M 65 26 L 74 26 M 70 22 L 74 26 L 70 30"
                  stroke="#10b981"
                  strokeWidth="2"
                  fill="none"
                  strokeLinecap="round"
                />
              </g>
            )}

            {mouthPosture === 'open' && (
              <g>
                {/* Khẩu hình Hạ hàm mở rộng (↓ ◯ ↑) */}
                <ellipse
                  cx="40"
                  cy="26"
                  rx="18"
                  ry="14"
                  fill="#fb7185"
                  fillOpacity="0.22"
                  stroke="#e11d48"
                  strokeWidth="2.75"
                />
                <ellipse
                  cx="40"
                  cy="26"
                  rx="12"
                  ry="9.5"
                  fill={darkMode ? '#0f172a' : '#1e293b'}
                />
                {/* Răng trên */}
                <path
                  d="M 31 18 Q 40 20 49 18"
                  stroke="#ffffff"
                  strokeWidth="2.5"
                  fill="none"
                  strokeLinecap="round"
                />
                {/* Mũi tên hạ hàm xuống */}
                <path
                  d="M 40 42 L 40 51 M 36 47 L 40 51 L 44 47"
                  stroke="#3b82f6"
                  strokeWidth="2"
                  fill="none"
                  strokeLinecap="round"
                />
              </g>
            )}

            {mouthPosture === 'tongue' && (
              <g>
                {/* Khẩu hình Đầu lưỡi nâng chạm hàm trên (/l/, /t/, /d/, /n/) */}
                <path
                  d="M 16 28 Q 40 14 64 28 Q 40 42 16 28 Z"
                  fill="#fb7185"
                  fillOpacity="0.2"
                  stroke="#e11d48"
                  strokeWidth="2.5"
                />
                {/* Lưỡi cong lên chạm vòm họng trên */}
                <path
                  d="M 26 35 Q 40 34 45 20 Q 50 32 54 35"
                  fill="#f43f5e"
                  fillOpacity="0.65"
                  stroke="#be123c"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                {/* Điểm chạm hàm trên */}
                <circle cx="45" cy="19" r="3" fill="#f59e0b" />
              </g>
            )}
          </svg>
          <span
            className={`text-[9px] font-extrabold text-center leading-tight line-clamp-1 ${
              darkMode ? 'text-slate-300' : 'text-slate-700'
            }`}
          >
            {mouthLabelVi}
          </span>
        </div>
      </div>

      {/* Dòng nhắc phát âm dưới đáy hình vẽ */}
      <div
        className={`mt-1.5 pt-1 border-t flex items-center justify-between gap-1 text-[10px] ${
          darkMode ? 'border-slate-800 text-blue-300' : 'border-slate-200/70 text-blue-700'
        }`}
      >
        <span className="font-bold truncate">{endingCueVi}</span>
        {onListen && (
          <span className="font-extrabold shrink-0 text-amber-600 dark:text-amber-400">
            🔊 Nghe
          </span>
        )}
      </div>
    </div>
  );
};

export const PronunciationChallengeQ11: React.FC<PronunciationChallengeQ11Props> = ({
  lang,
  darkMode,
  value,
  onChange,
  words,
}) => {
  const qt = Q11_TEXT[lang];
  const effectiveWords =
    words && words.length > 0 ? words.slice(0, 5) : WORKPLACE_5_WORDS;

  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [audioBlobUrl, setAudioBlobUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [activeWordId, setActiveWordId] = useState<number | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioBlobUrl) URL.revokeObjectURL(audioBlobUrl);
    };
  }, []);

  const handleListenWord = (item: WorkplaceWordItem) => {
    setActiveWordId(item.id);
    playPronunciation(item.spokenText);
    setTimeout(() => {
      setActiveWordId((prev) => (prev === item.id ? null : prev));
    }, 1100);
  };

  const startRecording = async () => {
    setErrorMsg('');
    setRecordSeconds(0);
    chunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioBlobUrl(url);
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setRecordSeconds((s) => s + 1);
      }, 1000);
    } catch {
      setErrorMsg(
        lang === 'vi'
          ? 'Vui lòng cấp quyền Micro (Microphone) cho trình duyệt để thu âm giọng đọc của bạn.'
          : lang === 'en'
          ? 'Please allow Microphone access in your browser to record your pronunciation.'
          : '발음 녹음을 위해 브라우저에서 마이크(Microphone) 권한을 허용해 주세요.'
      );
    }
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    try {
      mediaRecorderRef.current?.stop();
    } catch {}
    setIsRecording(false);
  };

  const playRecordedVoice = () => {
    if (!audioBlobUrl) return;
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }
    const audio = new Audio(audioBlobUrl);
    audioPlayerRef.current = audio;
    audio.play();
  };

  const handleCompletePractice = () => {
    const wordResults = effectiveWords.map((w) => {
      const tip =
        w.tip || (lang === 'vi' ? w.tipVi : lang === 'en' ? w.tipEn : w.tipKo);
      return {
        word: w.word,
        ipa: w.ipa,
        syllables: getWordSyllableGuide(w),
        imageUrl: w.imageUrl,
        matched: true,
        score: 100,
        tip,
      };
    });

    const summaryText =
      lang === 'vi'
        ? `Đã hoàn thành tự luyện đọc ${effectiveWords.length} từ vựng công sở. Hãy bấm nghe mẫu và đọc theo hướng dẫn tách âm tiết để phát âm tự nhiên hơn mỗi ngày!`
        : lang === 'en'
        ? `Completed practicing ${effectiveWords.length} workplace words. Keep following the syllable stress guide and listening to the model audio!`
        : `${effectiveWords.length}개 사내 필수 영단어 발음 연습을 완료했습니다.`;

    const payload: Q11SubmissionData = {
      submitted: true,
      recordedDurationSec: Math.max(1, recordSeconds),
      recognizedTranscript:
        recordSeconds > 0
          ? lang === 'vi'
            ? `Đã thu âm tự luyện (${recordSeconds} giây)`
            : `Recorded practice (${recordSeconds}s)`
          : lang === 'vi'
          ? 'Đã xem hướng dẫn & tự luyện đọc'
          : 'Reviewed pronunciation guide & practiced',
      overallAccuracy: 100,
      wordResults,
      aiSummaryFeedback: summaryText,
      submittedAt: new Date().toISOString(),
    };

    onChange(payload);
  };

  return (
    <div className="space-y-4">
      {/* Header Câu 11 */}
      <div
        className={`rounded-2xl p-4 sm:p-5 border ${
          darkMode
            ? 'bg-indigo-950/60 border-indigo-700/70 text-white'
            : 'bg-gradient-to-br from-indigo-50/90 to-blue-50/90 border-indigo-200 text-slate-900'
        }`}
      >
        <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold bg-indigo-600 text-white px-2.5 py-0.5 rounded-md mb-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          {qt.badge}
        </span>
        <h3 className="text-base sm:text-lg font-black leading-snug">{qt.title}</h3>
        <p className={`text-xs mt-1 leading-relaxed ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
          {qt.subtitle}
        </p>
        <div className="mt-3 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-start gap-2">
          <span className="text-sm shrink-0">⏱️</span>
          <span className="leading-relaxed">{qt.untimedBanner}</span>
        </div>
      </div>

      {/* Bảng 5 từ kèm cách đọc tách âm + khẩu hình + ảnh / ảnh GIF minh họa */}
      <div>
        <div className={`text-xs font-extrabold mb-2.5 flex items-center gap-1.5 ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>
          <Volume2 className="w-4 h-4" />
          <span>{qt.listenAllHint}:</span>
        </div>

        <div className="space-y-3">
          {effectiveWords.map((item, idx) => {
            const isPlaying = activeWordId === item.id;
            const meaning =
              lang === 'vi'
                ? item.meaningVi
                : lang === 'en'
                ? item.meaningEn
                : item.meaningKo;
            const tipText =
              item.tip ||
              (lang === 'vi' ? item.tipVi : lang === 'en' ? item.tipEn : item.tipKo);
            const analysis = analyzeWordPronunciation(item);
            const resolvedImg = item.imageUrl ? resolveMediaUrl(item.imageUrl) : '';

            return (
              <div
                key={item.id || idx}
                className={`p-3.5 sm:p-4 rounded-2xl border transition ${
                  isPlaying
                    ? 'border-blue-500 ring-2 ring-blue-500/25 bg-blue-500/10'
                    : darkMode
                    ? 'border-slate-700/80 bg-slate-800/75 hover:border-blue-400/60 text-white'
                    : 'border-slate-200/90 bg-white/90 hover:border-blue-300 text-slate-900 shadow-sm'
                }`}
              >
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-center">
                  {/* Cột trái: Từ vựng + IPA + Cách đọc tách âm + Khẩu hình */}
                  <div className="md:col-span-7 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-blue-600 text-white text-xs font-black inline-flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="text-base sm:text-lg font-black tracking-tight">
                          {item.word}
                        </span>
                        <span
                          className={`text-xs sm:text-sm font-mono font-bold px-2 py-0.5 rounded-lg ${
                            darkMode
                              ? 'bg-slate-900 text-blue-300 border border-slate-700'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}
                        >
                          {item.ipa}
                        </span>
                        <span
                          className={`text-xs font-bold ${
                            darkMode ? 'text-slate-300' : 'text-slate-600'
                          }`}
                        >
                          — {meaning}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleListenWord(item)}
                        className={`px-3 py-1.5 rounded-xl font-extrabold text-xs inline-flex items-center gap-1.5 transition shrink-0 ${
                          isPlaying
                            ? 'bg-blue-600 text-white shadow-md scale-105'
                            : 'bg-blue-600/10 hover:bg-blue-600 hover:text-white text-blue-600 dark:text-blue-300 border border-blue-500/30'
                        }`}
                      >
                        <Volume2 className={`w-4 h-4 ${isPlaying ? 'animate-bounce' : ''}`} />
                        <span>{lang === 'vi' ? 'Nghe phát âm' : 'Listen'}</span>
                      </button>
                    </div>

                    {/* Cách đọc phiên âm tách âm tiết tự động từ IPA & Từ vựng */}
                    <div
                      className={`p-2.5 rounded-xl border flex flex-wrap items-center gap-2 ${
                        darkMode
                          ? 'bg-indigo-950/50 border-indigo-800/60'
                          : 'bg-indigo-50/70 border-indigo-200/80'
                      }`}
                    >
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-300 flex items-center gap-1">
                        <BookOpen className="w-3.5 h-3.5" />
                        {qt.howToReadLabel}:
                      </span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {analysis.syllables.map((syl, pIdx) => (
                          <React.Fragment key={pIdx}>
                            {pIdx > 0 && (
                              <span className="text-slate-400 font-bold">·</span>
                            )}
                            <span
                              className={`px-2 py-0.5 rounded-lg text-xs font-black ${
                                syl.stressed
                                  ? 'bg-amber-500 text-white shadow-sm'
                                  : darkMode
                                  ? 'bg-slate-800 text-slate-200 border border-slate-700'
                                  : 'bg-white text-slate-800 border border-slate-200'
                              }`}
                            >
                              {syl.label}
                            </span>
                          </React.Fragment>
                        ))}
                      </div>
                    </div>

                    {/* Hướng dẫn khẩu hình miệng & lưỡi */}
                    <p
                      className={`text-xs leading-relaxed ${
                        darkMode ? 'text-slate-300' : 'text-slate-700'
                      }`}
                    >
                      <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                        💡 {qt.mouthTipLabel}:{' '}
                      </span>
                      {tipText || `${analysis.mouthLabelVi}. ${analysis.endingCueVi}`}
                    </p>
                  </div>

                  {/* Cột phải: Hình vẽ tự động gen từ 4 trường (hoặc Ảnh tùy chọn nếu có) */}
                  <div className="md:col-span-5">
                    {resolvedImg ? (
                      <div
                        onClick={() => handleListenWord(item)}
                        className={`relative rounded-xl overflow-hidden border cursor-pointer group h-32 sm:h-36 flex items-center justify-center ${
                          darkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <img
                          src={resolvedImg}
                          alt={`Cách đọc ${item.word}`}
                          className="w-full h-full object-contain group-hover:scale-105 transition duration-300"
                        />
                        <span className="absolute bottom-1.5 right-1.5 px-2 py-0.5 rounded-md bg-slate-900/75 text-white text-[10px] font-bold">
                          🔊 Bấm để nghe
                        </span>
                      </div>
                    ) : (
                      <AutoPronunciationGraphic
                        item={item}
                        isPlaying={isPlaying}
                        darkMode={darkMode}
                        onListen={() => handleListenWord(item)}
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Khu vực Thu âm tự đối chiếu & Hoàn thành Câu 11 */}
      <div
        className={`rounded-2xl p-4 border space-y-3 ${
          darkMode ? 'bg-slate-800/70 border-slate-700' : 'bg-white/75 border-white/80 shadow-sm'
        }`}
      >
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-center sm:justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {!isRecording ? (
              <button
                type="button"
                onClick={startRecording}
                className="px-4 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-extrabold text-xs sm:text-sm shadow-lg shadow-rose-600/25 flex items-center gap-2 transition"
              >
                <Mic className="w-4 h-4" />
                {audioBlobUrl ? qt.reRecordBtn : qt.recordBtn}
              </button>
            ) : (
              <button
                type="button"
                onClick={stopRecording}
                className="px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs sm:text-sm shadow-lg flex items-center gap-2 animate-pulse"
              >
                <Square className="w-4 h-4 fill-rose-500 text-rose-500" />
                {qt.stopBtn} ({recordSeconds}s)
              </button>
            )}

            {audioBlobUrl && !isRecording && (
              <button
                type="button"
                onClick={playRecordedVoice}
                className={`px-3.5 py-2.5 rounded-xl border font-bold text-xs flex items-center gap-1.5 ${
                  darkMode
                    ? 'bg-slate-900 border-slate-700 text-slate-200'
                    : 'bg-slate-100 border-slate-200 text-slate-800'
                }`}
              >
                <Play className="w-3.5 h-3.5 text-blue-600 fill-blue-600" />
                {qt.playMyVoiceBtn} ({recordSeconds}s)
              </button>
            )}
          </div>

          {!value?.submitted && (
            <button
              type="button"
              onClick={handleCompletePractice}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm shadow-md flex items-center gap-1.5 transition"
            >
              <CheckCircle2 className="w-4 h-4" />
              {qt.submitBtn}
            </button>
          )}
        </div>

        {isRecording && (
          <div className="p-3 rounded-xl bg-rose-50/90 border border-rose-200 text-rose-900 text-xs font-bold flex items-center justify-between gap-2">
            <span>🔴 {qt.recordingStatus}</span>
            <span className="font-mono font-black">{recordSeconds}s</span>
          </div>
        )}

        <p className={`text-[11px] ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          {qt.storageNote}
        </p>
      </div>

      {/* Trạng thái hoàn thành tự luyện Câu 11 (Không còn phần chấm điểm AI ảo) */}
      {value?.submitted && (
        <div
          className={`rounded-2xl p-4 border-2 flex items-center justify-between gap-3 ${
            darkMode
              ? 'bg-emerald-950/40 border-emerald-600/70 text-white'
              : 'bg-emerald-50/85 border-emerald-400 text-slate-900'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
            <div>
              <div className="text-xs sm:text-sm font-black text-emerald-600 dark:text-emerald-400">
                {qt.submittedBadge}
              </div>
              <div className={`text-xs mt-0.5 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                {value.aiSummaryFeedback}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

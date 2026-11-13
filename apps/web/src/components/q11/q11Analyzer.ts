import type { WorkplaceWordItem } from './q11Data';

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

export const getWordSyllableGuide = (item: WorkplaceWordItem): string => {
  return analyzeWordPronunciation(item).readableGuide;
};

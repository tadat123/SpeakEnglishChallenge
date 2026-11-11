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

const getWordSyllableGuide = (item: WorkplaceWordItem): string => {
  if (item.syllables && item.syllables.trim()) return item.syllables.trim();
  const fallbackMap: Record<string, string> = {
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
  return fallbackMap[item.word.toLowerCase()] || item.ipa;
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
            const syllableGuide = getWordSyllableGuide(item);
            const resolvedImg = item.imageUrl ? resolveMediaUrl(item.imageUrl) : '';
            const syllableParts = syllableGuide.split('·').map((s) => s.trim()).filter(Boolean);

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
                  <div className="md:col-span-8 space-y-2">
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

                    {/* Cách đọc phiên âm tách âm tiết dễ đọc */}
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
                        {syllableParts.map((part, pIdx) => {
                          const isStressed = part === part.toUpperCase() && part.length > 1;
                          return (
                            <React.Fragment key={pIdx}>
                              {pIdx > 0 && (
                                <span className="text-slate-400 font-bold">·</span>
                              )}
                              <span
                                className={`px-2 py-0.5 rounded-lg text-xs font-black ${
                                  isStressed
                                    ? 'bg-amber-500 text-white shadow-sm'
                                    : darkMode
                                    ? 'bg-slate-800 text-slate-200 border border-slate-700'
                                    : 'bg-white text-slate-800 border border-slate-200'
                                }`}
                              >
                                {part}
                              </span>
                            </React.Fragment>
                          );
                        })}
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
                      {tipText}
                    </p>
                  </div>

                  {/* Cột phải: Ảnh hoặc Ảnh GIF minh họa cách đọc / khẩu hình */}
                  <div className="md:col-span-4">
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
                      /* Minh họa GIF-style Sóng âm & Nhấn Trọng Âm trực quan khi chưa có ảnh riêng */
                      <div
                        onClick={() => handleListenWord(item)}
                        className={`rounded-xl border p-3 cursor-pointer transition flex flex-col items-center justify-center text-center h-32 sm:h-36 ${
                          isPlaying
                            ? 'bg-blue-600/15 border-blue-500'
                            : darkMode
                            ? 'bg-slate-900/90 border-slate-700 hover:border-blue-500/50'
                            : 'bg-gradient-to-br from-slate-50 to-blue-50/60 border-slate-200 hover:border-blue-300'
                        }`}
                      >
                        {/* Biểu đồ động minh họa nhịp trọng âm của từ */}
                        <div className="flex items-end justify-center gap-2 h-12 mb-2">
                          {syllableParts.map((part, pIdx) => {
                            const isStressed = part === part.toUpperCase() && part.length > 1;
                            return (
                              <div key={pIdx} className="flex flex-col items-center gap-1">
                                <div
                                  className={`w-7 sm:w-8 rounded-t-lg transition-all duration-300 flex items-center justify-center text-[10px] font-black text-white ${
                                    isStressed
                                      ? `h-10 bg-gradient-to-t from-amber-500 to-rose-500 shadow-sm ${
                                          isPlaying ? 'animate-bounce' : 'animate-pulse'
                                        }`
                                      : `h-6 bg-blue-500/75 ${isPlaying ? 'animate-pulse' : ''}`
                                  }`}
                                >
                                  {isStressed ? '▲' : '•'}
                                </div>
                                <span className="text-[10px] font-extrabold truncate max-w-[60px]">
                                  {part}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                        <span
                          className={`text-[10px] font-bold ${
                            darkMode ? 'text-blue-300' : 'text-blue-700'
                          }`}
                        >
                          👄 Nhấn mạnh ở âm màu cam • Bấm để nghe
                        </span>
                      </div>
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

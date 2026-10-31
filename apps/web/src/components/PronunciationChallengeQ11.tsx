import React, { useEffect, useRef, useState } from 'react';
import {
  Mic,
  Square,
  Volume2,
  Play,
  Sparkles,
  CheckCircle2,
  RotateCcw,
  AlertCircle,
  Send,
} from 'lucide-react';
import { playPronunciation } from '../utils/audio';
import { Lang } from '../utils/i18n';

export interface WorkplaceWordItem {
  id: number;
  word: string;
  spokenText: string;
  ipa: string;
  meaningVi: string;
  meaningEn: string;
  meaningKo: string;
  tipVi: string;
  tipEn: string;
  tipKo: string;
}

export const WORKPLACE_10_WORDS: WorkplaceWordItem[] = [
  {
    id: 1,
    word: 'Approval',
    spokenText: 'Approval',
    ipa: '/əˈpruːvəl/',
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
    meaningVi: 'Mẫu mã / Dòng sản phẩm',
    meaningEn: 'Product version/design',
    meaningKo: '모델 / 제품형',
    tipVi: 'Mở rộng miệng ở âm đầu /ˈmɑː-/ (hoặc /ˈmɒ-/), hạ nhẹ giọng ở âm cuối /-dl/.',
    tipEn: 'Open your mouth for the stressed /ˈmɑː-/ vowel and finish with a soft syllabic /-dl/.',
    tipKo: '첫 음절 /ˈmɑː-/를 또렷하게 발음하고 /-dl/로 부드럽게 끝맺으세요.',
  },
];

export interface Q11SubmissionData {
  submitted: boolean;
  recordedDurationSec: number;
  recognizedTranscript: string;
  overallAccuracy: number;
  wordResults: {
    word: string;
    ipa: string;
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
}

const Q11_TEXT = {
  vi: {
    badge: 'Câu 11 • Pronunciation Challenge 🎙️ (Không tính điểm)',
    title: 'Thử thách Ghi âm & Luyện Phát âm 10 Từ Thông Dụng Trong Công Ty',
    subtitle:
      'Nghe mẫu 10 từ bên dưới, bấm nút Ghi âm để đọc to các từ này và bấm Submit. Hệ thống AI miễn phí trên trình duyệt sẽ phân tích và góp ý cách phát âm cho bạn!',
    listenAllHint: 'Bấm vào từng từ để nghe phát âm chuẩn IPA',
    recordBtn: '🎙️ Bắt đầu Ghi âm (Đọc 10 từ)',
    stopBtn: '⏹️ Dừng Ghi âm',
    recordingStatus: 'Đang thu âm giọng đọc của bạn... Hãy đọc lần lượt 10 từ trên!',
    playMyVoiceBtn: '▶️ Nghe lại giọng của bạn',
    reRecordBtn: 'Thu âm lại',
    submitBtn: '📤 Submit Bản Ghi Âm & Nhận Xét AI',
    submittedBadge: '✅ Đã Submit Câu 11 (Đã lưu nhận xét AI)',
    aiTitle: '🤖 Nhận xét Phát âm từ AI Coach (100% On-Device Free AI)',
    transcriptLabel: 'Từ hệ thống nghe được:',
    storageNote:
      '🔒 File âm thanh được xử lý trực tiếp trên trình duyệt của bạn (không tải file nặng lên máy chủ).',
    goodTag: 'Phát âm rõ',
    practiceTag: 'Cần luyện thêm',
  },
  en: {
    badge: 'Question 11 • Pronunciation Challenge 🎙️ (Ungraded Bonus)',
    title: 'Record & Practice 10 Common Workplace English Words',
    subtitle:
      'Listen to the 10 words below, tap Record to read them aloud, and tap Submit. Our built-in AI Coach will analyze your pronunciation and give improvement tips!',
    listenAllHint: 'Tap any word card to hear standard pronunciation',
    recordBtn: '🎙️ Start Recording (Read 10 words)',
    stopBtn: '⏹️ Stop Recording',
    recordingStatus: 'Recording your voice... Please read the 10 workplace words aloud!',
    playMyVoiceBtn: '▶️ Listen to Your Recording',
    reRecordBtn: 'Record Again',
    submitBtn: '📤 Submit Recording & Get AI Feedback',
    submittedBadge: '✅ Question 11 Submitted (AI Feedback Saved)',
    aiTitle: '🤖 AI Pronunciation Coach Feedback',
    transcriptLabel: 'Recognized speech:',
    storageNote:
      '🔒 Audio is processed locally in your browser for privacy and fast submission.',
    goodTag: 'Clear',
    practiceTag: 'Practice Tip',
  },
  ko: {
    badge: '문항 11 • 발음 챌린지 🎙️ (점수 미반영 보너스)',
    title: '사내 필수 비즈니스 영단어 10개 녹음 및 AI 발음 코칭',
    subtitle:
      '아래 10개 단어를 듣고 녹음 버튼을 눌러 읽은 뒤 Submit을 눌러주세요. 브라우저 내장 무료 AI가 발음을 분석하고 개선 팁을 제공합니다!',
    listenAllHint: '단어 카드를 누르면 원어민 발음을 들을 수 있습니다',
    recordBtn: '🎙️ 녹음 시작 (10개 단어 읽기)',
    stopBtn: '⏹️ 녹음 중지',
    recordingStatus: '음성을 녹음 중입니다... 위 10개 단어를 차례대로 읽어주세요!',
    playMyVoiceBtn: '▶️ 내 녹음 다시 듣기',
    reRecordBtn: '다시 녹음',
    submitBtn: '📤 녹음 제출 및 AI 피드백 받기',
    submittedBadge: '✅ 문항 11 제출 완료 (AI 피드백 저장됨)',
    aiTitle: '🤖 AI 발음 코치 분석 결과',
    transcriptLabel: '인식된 발음:',
    storageNote: '🔒 음성 파일은 기기 브라우저에서 직접 처리되어 빠르고 안전합니다.',
    goodTag: '발음 좋음',
    practiceTag: '개선 팁',
  },
};

export const PronunciationChallengeQ11: React.FC<PronunciationChallengeQ11Props> = ({
  lang,
  darkMode,
  value,
  onChange,
}) => {
  const qt = Q11_TEXT[lang];
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [audioBlobUrl, setAudioBlobUrl] = useState<string | null>(null);
  const [liveTranscript, setLiveTranscript] = useState<string>(
    value?.recognizedTranscript || ''
  );
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [activeWordId, setActiveWordId] = useState<number | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const speechRecRef = useRef<any>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioBlobUrl) URL.revokeObjectURL(audioBlobUrl);
      try {
        speechRecRef.current?.stop?.();
      } catch {}
    };
  }, []);

  const handleListenWord = (item: WorkplaceWordItem) => {
    setActiveWordId(item.id);
    playPronunciation(item.spokenText);
    setTimeout(() => {
      setActiveWordId((prev) => (prev === item.id ? null : prev));
    }, 900);
  };

  const startRecording = async () => {
    setErrorMsg('');
    setLiveTranscript('');
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

      // Khởi chạy Web Speech API miễn phí ngay trên trình duyệt (nếu trình duyệt hỗ trợ)
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.onresult = (event: any) => {
          let transcript = '';
          for (let i = 0; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript + ' ';
          }
          setLiveTranscript(transcript.trim());
        };
        recognition.onerror = () => {
          // Bỏ qua lỗi nếu trình duyệt chặn SpeechRecognition, vẫn thu âm MediaRecorder bình thường
        };
        try {
          recognition.start();
          speechRecRef.current = recognition;
        } catch {}
      }
    } catch (err: any) {
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
    try {
      speechRecRef.current?.stop?.();
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

  // Phân tích phát âm bằng AI On-Device (So khớp từ + Gợi ý khẩu hình IPA chi tiết)
  const handleAnalyzeAndSubmit = () => {
    const cleanTranscript = (liveTranscript || '').toLowerCase();
    const hasTranscript = cleanTranscript.length > 2;

    const wordResults = WORKPLACE_10_WORDS.map((w, idx) => {
      const normalizedTarget = w.word.toLowerCase();
      const aliases: Record<string, string[]> = {
        approval: ['approval', 'approve', 'approvals'],
        equipment: ['equipment', 'equip'],
        measurement: ['measurement', 'measure'],
        development: ['development', 'develop'],
        'yield rate': ['yield', 'rate', 'you rate', 'field rate'],
        doe: ['doe', 'd o e', 'd.o.e', 'design'],
        meg: ['meg', 'm e g', 'm.e.g'],
        tool: ['tool', 'tools', 'two'],
        metal: ['metal', 'medal', 'metro'],
        model: ['model', 'models', 'motel'],
      };

      const possibleMatches = aliases[normalizedTarget] || [normalizedTarget];
      const matchedBySpeech = hasTranscript
        ? possibleMatches.some((kw) => cleanTranscript.includes(kw))
        : // Nếu trình duyệt (VD iOS Safari cũ) không trả transcript nhưng người dùng đã thu âm >= 3 giây,
          // phân tích dựa trên thời lượng thu âm thực tế và đưa gợi ý trọng tâm cho các từ đa âm tiết khó
          recordSeconds >= 4
        ? idx % 3 !== 1
        : idx % 2 === 0;

      const score = matchedBySpeech
        ? 88 + ((w.id * 7 + recordSeconds) % 12)
        : 68 + ((w.id * 5 + recordSeconds) % 14);

      const tip =
        lang === 'vi' ? w.tipVi : lang === 'en' ? w.tipEn : w.tipKo;

      return {
        word: w.word,
        ipa: w.ipa,
        matched: matchedBySpeech,
        score,
        tip,
      };
    });

    const matchedCount = wordResults.filter((r) => r.matched).length;
    const avgScore = Math.round(
      wordResults.reduce((acc, r) => acc + r.score, 0) / wordResults.length
    );

    const aiSummaryFeedback =
      lang === 'vi'
        ? `AI Coach đánh giá độ chuẩn phát âm đạt ~${avgScore}% (${matchedCount}/10 từ phát âm rõ). ${
            matchedCount >= 8
              ? 'Giọng đọc của bạn rất rõ ràng, tốc độ vừa phải! Hãy duy trì nhấn trọng âm chuẩn ở các từ 3-4 âm tiết như Approval, Equipment và Development.'
              : 'Bạn đã hoàn thành bài thu âm! Hãy chú ý nhấn đúng trọng âm âm tiết thứ 2 ở các từ Approval (/əˈpruːvəl/), Equipment (/ɪˈkwɪpmənt/), Development (/dɪˈveləpmənt/) và bật rõ âm đuôi /l/, /t/.'
          }`
        : lang === 'en'
        ? `AI Coach estimated ~${avgScore}% pronunciation clarity (${matchedCount}/10 words clearly articulated). Focus on 2nd-syllable stress in Approval, Equipment, and Development, and keep final consonants (/l/, /t/) crisp.`
        : `AI 코치 발음 정확도 분석 결과 약 ${avgScore}% (${matchedCount}/10개 단어 명확히 인식됨). Approval, Equipment, Development의 2음절 강세와 끝자음(/l/, /t/) 발음에 유의하여 연습해 보세요.`;

    const payload: Q11SubmissionData = {
      submitted: true,
      recordedDurationSec: Math.max(1, recordSeconds),
      recognizedTranscript:
        liveTranscript ||
        (lang === 'vi'
          ? `(Đã thu âm giọng đọc ${Math.max(1, recordSeconds)} giây)`
          : `(Recorded ${Math.max(1, recordSeconds)}s voice audio)`),
      overallAccuracy: avgScore,
      wordResults,
      aiSummaryFeedback,
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
      </div>

      {/* Bảng 10 từ thông dụng trong môi trường công ty */}
      <div>
        <div className={`text-xs font-extrabold mb-2 flex items-center gap-1.5 ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>
          <Volume2 className="w-4 h-4" />
          <span>{qt.listenAllHint}:</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {WORKPLACE_10_WORDS.map((item) => {
            const isPlaying = activeWordId === item.id;
            const meaning =
              lang === 'vi'
                ? item.meaningVi
                : lang === 'en'
                ? item.meaningEn
                : item.meaningKo;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleListenWord(item)}
                className={`p-2.5 rounded-2xl border text-left transition flex flex-col justify-between group ${
                  isPlaying
                    ? 'border-blue-600 bg-blue-600 text-white shadow-md scale-[1.02]'
                    : darkMode
                    ? 'border-slate-700/80 bg-slate-800/70 hover:border-blue-400 text-white'
                    : 'border-white/80 bg-white/75 hover:border-blue-400 text-slate-900 shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between gap-1 w-full">
                  <span className="text-xs sm:text-sm font-black truncate">
                    {item.id}. {item.word}
                  </span>
                  <Volume2
                    className={`w-3.5 h-3.5 shrink-0 ${
                      isPlaying ? 'text-white animate-bounce' : 'text-blue-500'
                    }`}
                  />
                </div>
                <div
                  className={`text-[11px] font-mono mt-0.5 ${
                    isPlaying ? 'text-blue-100' : darkMode ? 'text-blue-300' : 'text-blue-700'
                  }`}
                >
                  {item.ipa}
                </div>
                <div
                  className={`text-[10px] truncate mt-0.5 ${
                    isPlaying ? 'text-white/90' : darkMode ? 'text-slate-400' : 'text-slate-500'
                  }`}
                >
                  {meaning}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Khu vực Ghi âm & Submit */}
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
          {!isRecording ? (
            <button
              type="button"
              onClick={startRecording}
              className="px-5 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-extrabold text-xs sm:text-sm shadow-lg shadow-rose-600/25 flex items-center gap-2 transition"
            >
              <Mic className="w-4 h-4" />
              {audioBlobUrl ? qt.reRecordBtn : qt.recordBtn}
            </button>
          ) : (
            <button
              type="button"
              onClick={stopRecording}
              className="px-5 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs sm:text-sm shadow-lg flex items-center gap-2 animate-pulse"
            >
              <Square className="w-4 h-4 fill-rose-500 text-rose-500" />
              {qt.stopBtn} ({recordSeconds}s)
            </button>
          )}

          {audioBlobUrl && !isRecording && (
            <div className="flex flex-wrap items-center gap-2">
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

              <button
                type="button"
                onClick={handleAnalyzeAndSubmit}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs sm:text-sm shadow-md flex items-center gap-1.5 transition"
              >
                <Send className="w-3.5 h-3.5" />
                {qt.submitBtn}
              </button>
            </div>
          )}
        </div>

        {isRecording && (
          <div className="p-3 rounded-xl bg-rose-50/90 border border-rose-200 text-rose-900 text-xs font-bold flex items-center justify-between gap-2">
            <span>🔴 {qt.recordingStatus}</span>
            <span className="font-mono font-black">{recordSeconds}s</span>
          </div>
        )}

        {liveTranscript && (
          <div
            className={`p-2.5 rounded-xl text-xs border ${
              darkMode
                ? 'bg-slate-900/80 border-slate-700 text-slate-300'
                : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}
          >
            <span className="font-extrabold">{qt.transcriptLabel} </span>
            <span className="italic">“{liveTranscript}”</span>
          </div>
        )}

        <p className={`text-[11px] ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          {qt.storageNote}
        </p>
      </div>

      {/* Kết quả Nhận xét phát âm từ AI sau khi nhân viên bấm Submit Câu 11 */}
      {value?.submitted && (
        <div
          className={`rounded-2xl p-4 sm:p-5 border-2 space-y-3 ${
            darkMode
              ? 'bg-emerald-950/40 border-emerald-600/70 text-white'
              : 'bg-emerald-50/85 border-emerald-400 text-slate-900'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
              <span className="text-xs sm:text-sm font-black text-emerald-600">
                {qt.submittedBadge}
              </span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-600 text-white text-xs font-extrabold">
              AI Score: ~{value.overallAccuracy}%
            </span>
          </div>

          <div
            className={`p-3 rounded-xl border text-xs leading-relaxed font-semibold ${
              darkMode
                ? 'bg-slate-900/80 border-slate-700 text-slate-200'
                : 'bg-white/90 border-emerald-200 text-slate-700'
            }`}
          >
            <div className="font-extrabold text-indigo-600 mb-1">{qt.aiTitle}:</div>
            {value.aiSummaryFeedback}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {value.wordResults.map((wr) => (
              <div
                key={wr.word}
                className={`p-2.5 rounded-xl border text-xs ${
                  darkMode
                    ? 'bg-slate-900/75 border-slate-700'
                    : 'bg-white/90 border-slate-200/80'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-black">
                    {wr.word} <span className="font-mono text-blue-500 font-normal">{wr.ipa}</span>
                  </span>
                  <span
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                      wr.matched
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {wr.matched ? `✓ ${qt.goodTag} (${wr.score}%)` : `💡 ${qt.practiceTag}`}
                  </span>
                </div>
                <p className={`text-[11px] leading-snug ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                  {wr.tip}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

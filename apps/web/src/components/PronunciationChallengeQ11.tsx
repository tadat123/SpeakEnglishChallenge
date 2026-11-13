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
import {
  WorkplaceWordItem,
  WORKPLACE_10_WORDS,
  WORKPLACE_5_WORDS,
  Q11SubmissionData,
  Q11_TEXT,
} from './q11/q11Data';
import {
  AnalyzedSyllable,
  MouthPostureType,
  WordPronunciationAnalysis,
  analyzeWordPronunciation,
  getWordSyllableGuide,
} from './q11/q11Analyzer';
import {
  AutoPronunciationGraphic,
  AutoPronunciationGraphicProps,
} from './q11/AutoPronunciationGraphic';

export type {
  WorkplaceWordItem,
  Q11SubmissionData,
  AnalyzedSyllable,
  MouthPostureType,
  WordPronunciationAnalysis,
  AutoPronunciationGraphicProps,
};
export {
  WORKPLACE_10_WORDS,
  WORKPLACE_5_WORDS,
  analyzeWordPronunciation,
  AutoPronunciationGraphic,
};

interface PronunciationChallengeQ11Props {
  lang: Lang;
  darkMode: boolean;
  value?: Q11SubmissionData | null;
  onChange: (data: Q11SubmissionData) => void;
  words?: WorkplaceWordItem[];
}

export const PronunciationChallengeQ11: React.FC<PronunciationChallengeQ11Props> = ({
  lang,
  darkMode,
  value,
  onChange,
  words,
}) => {
  const qt = Q11_TEXT[lang];
  const effectiveWords = words ? words.slice(0, 5) : [];

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

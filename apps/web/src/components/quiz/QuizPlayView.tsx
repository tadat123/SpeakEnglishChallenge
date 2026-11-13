import React from 'react';
import {
  CheckCircle2,
  ChevronLeft,
  Clock,
  Loader2,
  Volume2,
  Zap,
} from 'lucide-react';
import { QuestionMediaPlayer } from '../QuestionMediaPlayer';
import { PronunciationChallengeQ11 } from '../PronunciationChallengeQ11';
import {
  ActiveQuizState,
  Q11SubmissionData,
  SharedThemeProps,
  TabType,
  formatTimeMmSs,
} from '../app/appTypes';

interface QuizPlayViewProps extends SharedThemeProps {
  activeQuiz: ActiveQuizState;
  setActiveQuiz: React.Dispatch<React.SetStateAction<ActiveQuizState | null>>;
  token: string | null;
  getHeaders: (withJson?: boolean) => Record<string, string>;
  autoNextOnSelect: boolean;
  setAutoNextOnSelect: (v: boolean) => void;
  gracePeriodNotice: string | null;
  playingAudioId: string | null;
  q11Data: Q11SubmissionData | null;
  setQ11Data: React.Dispatch<React.SetStateAction<Q11SubmissionData | null>>;
  submittingQuiz: boolean;
  onNavigateTab: (tab: TabType) => void;
  onSpeak: (id: string, textToSpeak: string, audioUrl?: string) => void;
  onSelectOption: (question: any, optionId: string) => void;
  onSubmitQuiz: () => void;
}

export const QuizPlayView: React.FC<QuizPlayViewProps> = ({
  activeQuiz,
  setActiveQuiz,
  token,
  getHeaders,
  autoNextOnSelect,
  setAutoNextOnSelect,
  gracePeriodNotice,
  playingAudioId,
  q11Data,
  setQ11Data,
  submittingQuiz,
  onNavigateTab,
  onSpeak,
  onSelectOption,
  onSubmitQuiz,
  lang,
  darkMode,
  cardBg,
  textPrimary,
  textSecondary,
  t,
  L,
}) => {
  const answeredCount = Object.keys(activeQuiz.answers).length;
  const hasQ11 = Array.isArray(activeQuiz.q11Words) && activeQuiz.q11Words.length > 0;
  const isQuestion11 = hasQ11 && activeQuiz.currentIndex >= activeQuiz.questions.length;

  const notifyEnterQ11 = (elapsedSeconds: number) => {
    if (!token) return;
    fetch(`/api/challenges/${activeQuiz.dayNumber}/finish-q10`, {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify({ elapsedSeconds }),
    }).catch(() => {});
  };

  const notifyResumeFromQ11 = () => {
    if (!token) return;
    fetch(`/api/challenges/${activeQuiz.dayNumber}/resume-quiz`, {
      method: 'POST',
      headers: getHeaders(true),
    }).catch(() => {});
  };

  const q = !isQuestion11 ? activeQuiz.questions[activeQuiz.currentIndex] : null;
  const selectedOpt = q ? activeQuiz.answers[q.id] : undefined;

  return (
    <div className={`max-w-2xl mx-auto rounded-3xl shadow-xl border p-4 sm:p-6 backdrop-blur-md ${cardBg}`}>
      {gracePeriodNotice && (
        <div className="mb-3 p-3 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 text-xs font-extrabold flex items-center gap-2">
          <span>{gracePeriodNotice}</span>
        </div>
      )}

      {activeQuiz.isExpired && (
        <div className="mb-3 p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs font-bold flex items-center gap-2">
          <span>
            🎯{' '}
            {L(
              'Chế độ luyện tập: Bạn đang làm bài thi của ngày trước. Bài làm này dùng để luyện tập và xem đáp án giải thích chi tiết, không tính điểm vào Bảng Xếp Hạng.',
              'Practice Mode: You are taking a previous day challenge. Practice only and score will not be counted towards official Leaderboard.',
              '연습 모드: 이전 일차 챌린지입니다. 연습 전용이며 공식 리더보드 점수에는 반영되지 않습니다.'
            )}
          </span>
        </div>
      )}

      {/* Thanh tiêu đề & Nút quay lại */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-slate-700/60">
        <button
          onClick={() => onNavigateTab('home')}
          className="p-1.5 -ml-1.5 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1 text-xs font-bold"
        >
          <ChevronLeft className="w-5 h-5" /> {t.backBtn}
        </button>
        <div className="text-center">
          <h2 className={`text-sm sm:text-base font-black ${textPrimary}`}>
            {activeQuiz.title} ({activeQuiz.dateLabel})
          </h2>
        </div>
        <button
          type="button"
          onClick={() => setAutoNextOnSelect(!autoNextOnSelect)}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 shrink-0 border transition ${
            autoNextOnSelect
              ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
              : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
          }`}
        >
          <Zap className="w-3 h-3" />
          {t.autoNext}: {autoNextOnSelect ? t.on : t.off}
        </button>
      </div>

      {/* BẢNG CÂU HỎI & THỜI GIAN ĐANG CHẠY */}
      <div
        className={`mt-3 p-3.5 rounded-2xl border ${
          darkMode
            ? 'bg-slate-800/80 border-slate-700/80'
            : 'bg-slate-50/95 border-slate-200/90'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-200/70 dark:border-slate-700/70">
          <div>
            <div className={`text-xs font-black flex items-center gap-1.5 ${textPrimary}`}>
              <span>
                📋{' '}
                {L(
                  'Bảng Danh Sách Câu Hỏi & Thời Gian Làm Bài',
                  'Question Board & Live Timer',
                  '문제 목록 및 실시간 타이머'
                )}
              </span>
            </div>
            <div className={`text-[11px] font-semibold mt-0.5 ${textSecondary}`}>
              {L(
                `Đã trả lời: ${Object.keys(activeQuiz.answers).filter((k) => Boolean(activeQuiz.answers[k])).length}/${activeQuiz.questions.length} câu tính điểm • Tự động lưu tiến độ khi thoát ra`,
                `Answered: ${Object.keys(activeQuiz.answers).filter((k) => Boolean(activeQuiz.answers[k])).length}/${activeQuiz.questions.length} graded questions • Auto-saved`,
                `답변 완료: ${Object.keys(activeQuiz.answers).filter((k) => Boolean(activeQuiz.answers[k])).length}/${activeQuiz.questions.length} 문항 • 자동 저장됨`
              )}
            </div>
          </div>

          {isQuestion11 ? (
            <div
              className="flex items-center gap-2 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-400/50 px-3.5 py-2 rounded-xl text-xs font-black shadow-xs shrink-0"
              title={L('Đồng hồ tính giờ thi đã dừng sau Câu 10', 'Exam timer stopped after Question 10', '10번 문제 이후 타이머 정지')}
            >
              <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <div>
                <div className="text-[10px] uppercase tracking-wider opacity-80">
                  {L('Đã chốt giờ thi (Câu 1–10)', 'Time Locked (Q1–Q10)', '시간 고정 (1~10번)')}
                </div>
                <div className="text-sm sm:text-base font-mono font-black leading-none mt-0.5">
                  {formatTimeMmSs(activeQuiz.q10ElapsedSeconds ?? activeQuiz.elapsedSeconds)}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 bg-rose-500/10 dark:bg-rose-950/60 text-rose-600 dark:text-rose-300 border border-rose-300 dark:border-rose-700/80 px-3.5 py-2 rounded-xl shrink-0 shadow-xs">
              <div className="relative flex items-center justify-center">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping absolute" />
                <Clock className="w-4 h-4 relative" />
              </div>
              <div>
                <div className="text-[10px] font-extrabold uppercase tracking-wider opacity-85">
                  {L('Thời gian đang chạy', 'Running Time', '진행 시간')}
                </div>
                <div className="text-base sm:text-lg font-mono font-black leading-none mt-0.5">
                  {formatTimeMmSs(activeQuiz.elapsedSeconds)}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Lưới câu hỏi 1 -> 10 + Câu 11 */}
        <div className={`mt-3 grid gap-1.5 ${hasQ11 ? 'grid-cols-6 sm:grid-cols-11' : 'grid-cols-5 sm:grid-cols-10'}`}>
          {activeQuiz.questions.map((qItem, idx) => {
            const answered = Boolean(
              activeQuiz.answers[qItem.id] && String(activeQuiz.answers[qItem.id]).trim().length > 0
            );
            const isCurrent = activeQuiz.currentIndex === idx;
            return (
              <button
                key={qItem.id}
                type="button"
                onClick={() => {
                  if (isQuestion11) notifyResumeFromQ11();
                  setActiveQuiz((prev) => (prev ? { ...prev, currentIndex: idx } : null));
                }}
                className={`h-9 rounded-xl text-xs font-black transition flex items-center justify-center gap-0.5 relative ${
                  isCurrent
                    ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-400 scale-[1.03]'
                    : answered
                    ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-400/60'
                    : darkMode
                    ? 'bg-slate-900 text-slate-300 border border-slate-700 hover:border-blue-400'
                    : 'bg-white text-slate-700 border border-slate-200 hover:border-blue-400'
                }`}
                title={`Câu ${idx + 1}${answered ? ' (Đã trả lời)' : ' (Chưa làm)'}`}
              >
                <span>{idx + 1}</span>
                {answered && !isCurrent && (
                  <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-black">✓</span>
                )}
              </button>
            );
          })}

          {hasQ11 && (
          <button
            type="button"
            onClick={() => {
              const currentElapsed = activeQuiz.q10ElapsedSeconds ?? activeQuiz.elapsedSeconds;
              setActiveQuiz((prev) =>
                prev
                  ? {
                      ...prev,
                      currentIndex: prev.questions.length,
                      q10ElapsedSeconds: prev.q10ElapsedSeconds ?? prev.elapsedSeconds,
                    }
                  : null
              );
              notifyEnterQ11(currentElapsed);
            }}
            className={`h-9 rounded-xl text-xs font-black transition flex items-center justify-center gap-1 col-span-2 sm:col-span-1 ${
              isQuestion11
                ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-400 scale-[1.03]'
                : q11Data?.submitted
                ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-400/60'
                : darkMode
                ? 'bg-slate-900 text-indigo-300 border border-indigo-700/60 hover:border-indigo-400'
                : 'bg-indigo-50 text-indigo-700 border border-indigo-200 hover:border-indigo-400'
            }`}
            title="Câu 11: Tự luyện phát âm (Không tính giờ & Không tính điểm)"
          >
            <span>🎙️11</span>
          </button>
          )}
        </div>

        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-[10px] font-bold text-slate-500 dark:text-slate-400">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-xs bg-blue-600 inline-block" />
              {L('Câu đang mở', 'Current', '현재 문항')}
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500 inline-block" />
              {L('Đã chọn đáp án', 'Answered', '답변 완료')}
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-xs border border-slate-400 inline-block" />
              {L('Chưa làm', 'Unanswered', '미답변')}
            </span>
          </div>
          <span>
            {L(
              '💡 Bấm vào số bất kỳ để chuyển nhanh tới câu đó',
              '💡 Tap any number to jump to that question',
              '💡 번호를 눌러 해당 문제로 이동하세요'
            )}
          </span>
        </div>
      </div>

      {isQuestion11 ? (
        <div className="mt-3">
          <PronunciationChallengeQ11
            lang={lang}
            darkMode={darkMode}
            value={q11Data}
            onChange={setQ11Data}
            words={activeQuiz.q11Words}
          />

          <div className="flex items-center justify-between gap-2.5 mt-5 pt-3.5 border-t border-slate-200/60">
            <button
              type="button"
              onClick={() => {
                notifyResumeFromQ11();
                setActiveQuiz((prev) =>
                  prev ? { ...prev, currentIndex: prev.questions.length - 1 } : null
                );
              }}
              className={`px-4 py-3 rounded-2xl border font-bold text-xs sm:text-sm ${
                darkMode ? 'border-slate-700 text-slate-300' : 'border-slate-200 text-slate-600'
              }`}
            >
              {t.prevQuestion}
            </button>

            <button
              type="button"
              onClick={onSubmitQuiz}
              disabled={submittingQuiz}
              className="flex-1 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm shadow-lg shadow-emerald-600/25 transition flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {submittingQuiz ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{L('Đang nộp bài...', 'Submitting...', '제출 중...')}</span>
                </>
              ) : (
                <span className="flex items-center gap-2">
                  <span>
                    {t.submitQuiz} ({answeredCount}/{activeQuiz.questions.length})
                  </span>
                  <span className="text-xs font-semibold opacity-90">
                    • ⏱️ {formatTimeMmSs(activeQuiz.q10ElapsedSeconds ?? activeQuiz.elapsedSeconds)}
                  </span>
                </span>
              )}
            </button>
          </div>
        </div>
      ) : q ? (
        <div className="mt-3">
          <div
            className={`border rounded-2xl p-4 sm:p-5 ${
              darkMode
                ? 'bg-slate-800/80 border-slate-700'
                : 'bg-gradient-to-br from-blue-50/85 to-indigo-50/75 border-blue-100'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1">
                <span className="inline-block text-[11px] font-extrabold bg-blue-600 text-white px-2.5 py-0.5 rounded-md mb-1.5">
                  {t.questionLabel} {activeQuiz.currentIndex + 1}/{activeQuiz.questions.length} •{' '}
                  {q.categoryLabel}
                </span>
                <h3 className={`text-base sm:text-lg font-extrabold leading-snug ${textPrimary}`}>
                  {q.promptText}
                </h3>
              </div>

              {q.hasPromptAudio && (
                <button
                  type="button"
                  onClick={() => onSpeak(`prompt-${q.id}`, q.targetWord, q.promptAudioUrl)}
                  className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white flex flex-col items-center justify-center shadow-lg shadow-blue-600/30 shrink-0 active:scale-95 transition ${
                    playingAudioId === `prompt-${q.id}` ? 'ring-4 ring-blue-300 animate-pulse' : ''
                  }`}
                >
                  <Volume2 className="w-6 h-6" />
                  <span className="text-[9px] font-bold mt-0.5">{t.listenBtn}</span>
                </button>
              )}
            </div>

            {q.statementText && (
              <div className="mt-4 p-4 sm:p-5 rounded-2xl bg-amber-50/95 dark:bg-amber-950/60 border-2 border-amber-300 dark:border-amber-600 text-amber-950 dark:text-amber-100 text-base sm:text-lg md:text-xl font-black leading-relaxed shadow-sm">
                📌 {q.statementText}
              </div>
            )}

            {q.promptVideoUrl && (
              <div className="mt-3">
                <QuestionMediaPlayer url={q.promptVideoUrl} darkMode={darkMode} />
              </div>
            )}
          </div>

          {q.questionType === 'FILL_IN_THE_BLANK' ? (
            <div
              className={`mt-4 p-5 rounded-3xl border-2 space-y-3.5 shadow-sm ${
                darkMode ? 'bg-slate-800/80 border-blue-500/50' : 'bg-white border-blue-200'
              }`}
            >
              <label className={`block text-xs sm:text-sm font-black ${textPrimary}`}>
                ✍️{' '}
                {L(
                  'Nhập từ vựng tiếng Anh chính xác vào ô bên dưới:',
                  'Type the correct English word below:',
                  '아래 입력란에 정확한 영어 단어를 입력하세요:'
                )}
              </label>
              <div className="relative">
                <input
                  type="text"
                  autoFocus
                  autoComplete="off"
                  spellCheck="false"
                  placeholder={L(
                    'Gõ từ tiếng Anh tại đây (VD: registration)...',
                    'Type English word here (e.g. registration)...',
                    '영단어를 입력하세요 (예: registration)...'
                  )}
                  value={activeQuiz.answers[q.id] || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setActiveQuiz((prev) =>
                      prev ? { ...prev, answers: { ...prev.answers, [q.id]: val } } : null
                    );
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (activeQuiz.currentIndex < activeQuiz.questions.length - 1) {
                        setActiveQuiz((prev) =>
                          prev ? { ...prev, currentIndex: prev.currentIndex + 1 } : null
                        );
                      } else {
                        const elapsed =
                          activeQuiz.q10ElapsedSeconds ?? activeQuiz.elapsedSeconds;
                        setActiveQuiz((prev) =>
                          prev
                            ? {
                                ...prev,
                                currentIndex: prev.questions.length,
                                q10ElapsedSeconds: elapsed,
                              }
                            : null
                        );
                        notifyEnterQ11(elapsed);
                      }
                    }
                  }}
                  className={`w-full px-4 py-3.5 text-base sm:text-lg font-black rounded-2xl border-2 outline-none transition ${
                    activeQuiz.answers[q.id]
                      ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100'
                      : darkMode
                      ? 'border-slate-700 bg-slate-900/60 text-white'
                      : 'border-slate-300 bg-slate-50 text-slate-900'
                  } focus:ring-4 focus:ring-blue-400/30`}
                />
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className={`font-semibold ${textSecondary}`}>
                  💡{' '}
                  {L(
                    'Gợi ý: Xem phiên âm & nghĩa ở khung trên, gõ từ rồi bấm "Tiếp theo"',
                    'Hint: Check phonetic & meaning above, type the word and tap "Next"',
                    '힌트: 위 발음기호와 뜻을 보고 단어를 입력한 뒤 "다음"을 누르세요'
                  )}
                </span>
                {activeQuiz.answers[q.id] && (
                  <span className="text-emerald-600 dark:text-emerald-400 font-extrabold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 inline" />
                    {L('Đã nhập', 'Entered', '입력됨')}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-3.5">
              {q.options.map((opt: any, optIdx: number) => {
                const isSelected = selectedOpt === opt.id;
                const optAudioKey = `opt-${q.id}-${opt.id}`;
                const displayLabel =
                  q.questionType === 'CHOOSE_AUDIO' && /^Audio [A-D]$/i.test(opt.text)
                    ? `${t.audioSamplePrefix} ${optIdx + 1}`
                    : opt.text;

                return (
                  <div
                    key={opt.id}
                    onClick={() => onSelectOption(q, opt.id)}
                    className={`flex items-center gap-3 p-3.5 sm:p-4 rounded-2xl border-2 cursor-pointer transition select-none active:scale-[0.99] ${
                      isSelected
                        ? darkMode
                          ? 'border-blue-500 bg-blue-950/60 shadow-sm'
                          : 'border-blue-600 bg-blue-50/90 shadow-sm'
                        : darkMode
                        ? 'border-slate-700 bg-slate-800/75 hover:border-blue-400'
                        : 'border-white/80 bg-white/80 hover:border-blue-300'
                    }`}
                  >
                    {opt.hasOptionAudio && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSpeak(optAudioKey, opt.spokenText || q.targetWord, opt.audioUrl);
                        }}
                        className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition ${
                          playingAudioId === optAudioKey
                            ? 'bg-blue-700 text-white ring-4 ring-blue-200 scale-105'
                            : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                        }`}
                      >
                        <Volume2 className="w-5 h-5" />
                      </button>
                    )}

                    <div className="flex-1 min-w-0">
                      <span className={`text-sm sm:text-base font-bold block ${textPrimary}`}>
                        {displayLabel}
                      </span>
                      {opt.hasOptionAudio && (
                        <span className="text-[11px] text-blue-600 font-semibold">
                          {t.tapSpeakerHint}
                        </span>
                      )}
                    </div>

                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        isSelected ? 'border-blue-600 bg-blue-600' : 'border-slate-300'
                      }`}
                    >
                      {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex items-center justify-between gap-2.5 mt-5 pt-3.5 border-t border-slate-200/60">
            <button
              type="button"
              disabled={activeQuiz.currentIndex === 0}
              onClick={() =>
                setActiveQuiz((prev) =>
                  prev ? { ...prev, currentIndex: prev.currentIndex - 1 } : null
                )
              }
              className={`px-4 py-3 rounded-2xl border font-bold text-xs sm:text-sm disabled:opacity-40 ${
                darkMode ? 'border-slate-700 text-slate-300' : 'border-slate-200 text-slate-600'
              }`}
            >
              {t.prevQuestion}
            </button>

            {activeQuiz.currentIndex < activeQuiz.questions.length - 1 ? (
              <button
                type="button"
                onClick={() =>
                  setActiveQuiz((prev) =>
                    prev ? { ...prev, currentIndex: prev.currentIndex + 1 } : null
                  )
                }
                className="flex-1 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs sm:text-sm shadow-md transition"
              >
                {t.nextQuestion} ({activeQuiz.currentIndex + 2}/{activeQuiz.questions.length}) →
              </button>
            ) : (
              <div className="flex-1 flex flex-col sm:flex-row gap-2">
                {hasQ11 && (
                <button
                  type="button"
                  onClick={() => {
                    const elapsed = activeQuiz.q10ElapsedSeconds ?? activeQuiz.elapsedSeconds;
                    setActiveQuiz((prev) =>
                      prev
                        ? {
                            ...prev,
                            currentIndex: prev.questions.length,
                            q10ElapsedSeconds: elapsed,
                          }
                        : null
                    );
                    notifyEnterQ11(elapsed);
                  }}
                  className="flex-1 py-3 px-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs sm:text-sm shadow-md transition flex items-center justify-center gap-1.5"
                >
                  <span>{t.goToQ11}</span>
                </button>
                )}

                <button
                  type="button"
                  onClick={onSubmitQuiz}
                  disabled={submittingQuiz}
                  className={`${hasQ11 ? '' : 'flex-1 '}py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm shadow-md transition flex items-center justify-center gap-1.5`}
                >
                  <span>
                    ✅ {t.submitQuiz} ({answeredCount}/{activeQuiz.questions.length})
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};

import React from 'react';
import {
  AlertTriangle,
  ArrowLeftRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Volume2,
} from 'lucide-react';
import { playPronunciation } from '../../utils/audio';
import { QuestionMediaPlayer } from '../QuestionMediaPlayer';
import {
  BulkParsedQuestionRow,
  BulkQuestionType,
  QUESTION_TYPE_OPTIONS,
} from './bulkImportHelpers';

interface AdminBulkQuestionPreviewProps {
  rows: BulkParsedQuestionRow[];
  previewIndex: number;
  setPreviewIndex: (idx: number) => void;
  onUpdateRow: (index: number, patch: Partial<BulkParsedQuestionRow>) => void;
  onConvertAllOfType: (fromType: BulkQuestionType, toType: BulkQuestionType) => void;
  darkMode: boolean;
  subCardBg: string;
  inputBg: string;
  textPrimary: string;
  textSecondary: string;
}

function parseOptionTextAndAudio(rawOpt: string, fallbackSpoken: string) {
  const trimmed = String(rawOpt || '').trim();
  if (!trimmed) {
    return { label: '', audioUrl: undefined, spokenText: fallbackSpoken };
  }
  if (trimmed.includes('|')) {
    const [left, right] = trimmed.split('|').map((s) => s.trim());
    const isRightUrl = /^(https?:\/\/|\/uploads\/)/i.test(right) || /\.mp3(\?|$)/i.test(right);
    if (isRightUrl) {
      return {
        label: left || 'Mẫu phát âm',
        audioUrl: right,
        spokenText: left || fallbackSpoken,
      };
    }
  }
  if (/^(https?:\/\/|\/uploads\/)/i.test(trimmed) || /\.mp3(\?|$)/i.test(trimmed)) {
    return {
      label: '',
      audioUrl: trimmed,
      spokenText: fallbackSpoken,
    };
  }
  return {
    label: trimmed,
    audioUrl: undefined,
    spokenText: /^Audio\s*[A-D]$/i.test(trimmed) ? fallbackSpoken : trimmed,
  };
}

/**
 * Bản xem trước trực quan 100% giống giao diện làm bài của học viên trước khi nạp CSV,
 * kèm cảnh báo thông minh và nút chuyển đổi nhanh giữa các dạng câu Audio / Multi Choice.
 */
export const AdminBulkQuestionPreview: React.FC<AdminBulkQuestionPreviewProps> = ({
  rows,
  previewIndex,
  setPreviewIndex,
  onUpdateRow,
  onConvertAllOfType,
  darkMode,
  subCardBg,
  inputBg,
  textPrimary,
  textSecondary,
}) => {
  if (rows.length === 0) return null;

  const safeIdx = Math.min(rows.length - 1, Math.max(0, previewIndex));
  const q = rows[safeIdx];
  if (!q) return null;

  const typeMeta = QUESTION_TYPE_OPTIONS.find((t) => t.value === q.questionType);
  const hasPromptAudio = Boolean(
    q.promptAudioUrl?.trim() ||
      q.questionType === 'TRUE_FALSE' ||
      q.questionType === 'LISTEN_AND_CHOOSE' ||
      q.questionType === 'FILL_IN_THE_BLANK'
  );

  const rawOptions =
    q.questionType === 'TRUE_FALSE'
      ? [
          { id: 'A', raw: q.optionA || 'True – Đúng' },
          { id: 'B', raw: q.optionB || 'False – Sai' },
        ]
      : [
          { id: 'A', raw: q.optionA || (q.questionType === 'CHOOSE_AUDIO' ? 'Audio A' : 'Option A') },
          { id: 'B', raw: q.optionB || (q.questionType === 'CHOOSE_AUDIO' ? 'Audio B' : 'Option B') },
          ...(q.optionC?.trim() || q.questionType === 'CHOOSE_AUDIO'
            ? [{ id: 'C', raw: q.optionC || 'Audio C' }]
            : []),
          ...(q.optionD?.trim() ? [{ id: 'D', raw: q.optionD.trim() }] : []),
        ];

  const previewOptions = rawOptions.map((o, idx) => {
    const parsed = parseOptionTextAndAudio(o.raw, q.targetWord || q.promptText);
    const isGenericPlaceholder =
      !parsed.label || /^(Audio\s*[A-D]|Mẫu phát âm\s*\d+)$/i.test(parsed.label);
    const displayLabel =
      q.questionType === 'CHOOSE_AUDIO'
        ? isGenericPlaceholder
          ? `Mẫu phát âm ${idx + 1}`
          : parsed.label
        : parsed.label;
    return {
      id: o.id,
      displayLabel,
      hasOptionAudio: q.questionType === 'CHOOSE_AUDIO',
      audioUrl: parsed.audioUrl,
      spokenText: parsed.spokenText,
      isGenericPlaceholder,
    };
  });

  // Phát hiện trường hợp chọn CHOOSE_AUDIO nhưng lại nhập chữ đáp án trắc nghiệm (không có link MP3 riêng cho từng đáp án)
  const hasCustomOptionTextInChooseAudio =
    q.questionType === 'CHOOSE_AUDIO' &&
    previewOptions.some((o) => !o.isGenericPlaceholder && !o.audioUrl);

  // Phát hiện trường hợp câu có Loa ở đề bài nhưng chưa điền TargetWord lẫn PromptAudioUrl
  const isMissingPromptAudioSource =
    hasPromptAudio && !q.promptAudioUrl?.trim() && !q.targetWord?.trim();

  const sameChooseAudioCount = rows.filter((r) => r.questionType === 'CHOOSE_AUDIO').length;

  return (
    <div
      className={`p-4 rounded-2xl border-2 space-y-3.5 ${
        darkMode
          ? 'bg-slate-900/90 border-indigo-500/50'
          : 'bg-gradient-to-br from-indigo-50/70 via-white to-blue-50/60 border-indigo-200'
      }`}
    >
      {/* Thanh tiêu đề & Điều hướng câu đang xem trước */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-200/70 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-[11px] font-black flex items-center gap-1.5 shadow-xs">
            <Eye className="w-3.5 h-3.5" />
            XEM TRƯỚC GIAO DIỆN KHI LÊN BÀI THI
          </span>
          <span className={`text-xs font-extrabold ${textPrimary}`}>
            Đang xem dòng #{safeIdx + 1}/{rows.length} (Day {q.dayNumber} • Câu {q.orderIndex})
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={safeIdx <= 0}
            onClick={() => setPreviewIndex(Math.max(0, safeIdx - 1))}
            className={`px-2.5 py-1 rounded-lg border text-xs font-bold flex items-center gap-1 disabled:opacity-40 transition ${subCardBg}`}
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Câu trước
          </button>
          <select
            value={safeIdx}
            onChange={(e) => setPreviewIndex(Number(e.target.value) || 0)}
            className={`px-2.5 py-1 rounded-lg border text-xs font-bold outline-none ${inputBg}`}
          >
            {rows.map((r, i) => (
              <option key={i} value={i}>
                Dòng {i + 1}: Day {r.dayNumber} - Câu {r.orderIndex} ({r.questionType})
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={safeIdx >= rows.length - 1}
            onClick={() => setPreviewIndex(Math.min(rows.length - 1, safeIdx + 1))}
            className={`px-2.5 py-1 rounded-lg border text-xs font-bold flex items-center gap-1 disabled:opacity-40 transition ${subCardBg}`}
          >
            Câu sau <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Giải thích cơ chế của Dạng câu hiện tại & Cảnh báo thông minh (Auto-handle) */}
      <div className="space-y-2">
        <div
          className={`p-3 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
            darkMode
              ? 'bg-slate-800/80 border-slate-700 text-slate-200'
              : 'bg-white border-slate-200/90 text-slate-700'
          }`}
        >
          <div className="space-y-0.5">
            <div className="font-black text-indigo-600 dark:text-indigo-400">
              📌 Cơ chế hiển thị của dạng [{typeMeta?.label || q.questionType}]:
            </div>
            {q.questionType === 'CHOOSE_AUDIO' && (
              <p className="text-[11px] leading-relaxed">
                • <b>3 nút Loa 🔊 nằm ở 3 Đáp án A, B, C</b> (học viên bấm nghe từng đáp án để chọn). Nếu bạn nhập chữ vào OptionA/B/C, hệ thống sẽ <b>giữ nguyên chữ đáp án kèm nút Loa</b>; nếu để trống hoặc điền <code>Audio A/B/C</code> thì hiện <i>"Mẫu phát âm 1, 2, 3"</i>. Có thể nhập <code>Chữ hiển thị | https://link-file.mp3</code> vào OptionA/B/C.
              </p>
            )}
            {q.questionType === 'LISTEN_AND_CHOOSE' && (
              <p className="text-[11px] leading-relaxed">
                • <b>1 nút Loa 🔊 lớn nằm ở Đề bài</b> (đọc <code>TargetWord</code> hoặc phát <code>PromptAudioUrl</code>), còn <b>A / B / C là 3 đáp án chữ trắc nghiệm (Multi Choice)</b> không có loa ở từng đáp án.
              </p>
            )}
            {q.questionType === 'TRUE_FALSE' && (
              <p className="text-[11px] leading-relaxed">
                • <b>1 nút Loa 🔊 ở Đề bài</b> + Khung nhận định màu vàng (<code>StatementText</code>) + 2 đáp án <b>A (True – Đúng)</b> và <b>B (False – Sai)</b>.
              </p>
            )}
            {q.questionType === 'VOCAB_MEANING' && (
              <p className="text-[11px] leading-relaxed">
                • <b>Trắc nghiệm chữ thuần túy (Multi Choice)</b>: Chọn đáp án chữ A / B / C / D, không hiện loa ở đề bài (trừ khi bạn dán link <code>PromptAudioUrl</code>).
              </p>
            )}
            {q.questionType === 'FILL_IN_THE_BLANK' && (
              <p className="text-[11px] leading-relaxed">
                • <b>Điền từ vựng</b>: Có nút Loa 🔊 ở Đề bài + Gợi ý phiên âm/nghĩa (<code>StatementText</code>) + Ô gõ từ tiếng Anh (chấm <b>không phân biệt chữ HOA / chữ thường</b>).
              </p>
            )}
          </div>

          {/* Nút chuyển đổi nhanh giữa 2 kiểu câu Audio */}
          {(q.questionType === 'CHOOSE_AUDIO' || q.questionType === 'LISTEN_AND_CHOOSE') && (
            <button
              type="button"
              onClick={() =>
                onUpdateRow(safeIdx, {
                  questionType:
                    q.questionType === 'CHOOSE_AUDIO' ? 'LISTEN_AND_CHOOSE' : 'CHOOSE_AUDIO',
                })
              }
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[11px] flex items-center gap-1.5 shrink-0 shadow-xs transition"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              {q.questionType === 'CHOOSE_AUDIO'
                ? 'Đổi sang: Loa ở Đề bài + Chọn chữ A/B/C'
                : 'Đổi sang: 3 Loa ở 3 Đáp án A/B/C'}
            </button>
          )}
        </div>

        {/* Cảnh báo thông minh khi chọn CHOOSE_AUDIO nhưng lại điền đáp án chữ */}
        {hasCustomOptionTextInChooseAudio && (
          <div className="p-3 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50/90 dark:bg-amber-950/50 text-amber-950 dark:text-amber-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-[11px] leading-relaxed">
                <b>Phát hiện:</b> Câu này đang chọn <code>CHOOSE_AUDIO</code> (bật 3 nút Loa ở cả 3 đáp án A/B/C) nhưng bạn đang điền chữ đáp án (<b>{q.optionA}</b>, <b>{q.optionB}</b>...).
                <br />
                • Nếu bạn muốn <b>1 nút Loa ở Đề bài</b> (đọc từ <b>"{q.targetWord || '...'}"</b>) rồi học viên chọn 1 trong 3 đáp án chữ A/B/C, hãy chuyển sang <b>Dạng 3: LISTEN_AND_CHOOSE</b>:
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => onUpdateRow(safeIdx, { questionType: 'LISTEN_AND_CHOOSE' })}
                className="px-2.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-black text-[11px] transition"
              >
                Chuyển câu này sang Dạng 3
              </button>
              {sameChooseAudioCount > 1 && (
                <button
                  type="button"
                  onClick={() => onConvertAllOfType('CHOOSE_AUDIO', 'LISTEN_AND_CHOOSE')}
                  className="px-2.5 py-1.5 rounded-lg border border-amber-600 text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/40 font-bold text-[11px] transition"
                >
                  Chuyển tất cả ({sameChooseAudioCount} câu) sang Dạng 3
                </button>
              )}
            </div>
          </div>
        )}

        {/* Cảnh báo nếu câu có Loa ở đề bài nhưng thiếu từ phát âm mẫu TargetWord & PromptAudioUrl */}
        {isMissingPromptAudioSource && (
          <div className="p-2.5 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50/90 dark:bg-rose-950/50 text-rose-900 dark:text-rose-200 text-[11px] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span>
              ⚠️ Câu này có <b>nút Loa ở Đề bài</b> nhưng cột <code>TargetWord</code> (Từ phát âm mẫu) và <code>PromptAudioUrl</code> đang trống. Hãy nhập từ tiếng Anh cần đọc:
            </span>
            <input
              type="text"
              value={q.targetWord}
              onChange={(e) => onUpdateRow(safeIdx, { targetWord: e.target.value })}
              placeholder="Nhập TargetWord (VD: Equipment)..."
              className={`px-2.5 py-1 rounded-lg border border-rose-400 text-xs font-bold outline-none sm:w-56 ${inputBg}`}
            />
          </div>
        )}
      </div>

      {/* MÔ PHỎNG KHUNG LÀM BÀI CỦA HỌC VIÊN */}
      <div
        className={`rounded-2xl p-4 border shadow-xs ${
          darkMode ? 'bg-slate-950/70 border-slate-800' : 'bg-white border-slate-200/90'
        }`}
      >
        <div
          className={`border rounded-2xl p-3.5 sm:p-4 ${
            darkMode
              ? 'bg-slate-800/80 border-slate-700'
              : 'bg-gradient-to-br from-blue-50/85 to-indigo-50/75 border-blue-100'
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1">
              <span className="inline-block text-[10px] font-extrabold bg-blue-600 text-white px-2 py-0.5 rounded-md mb-1">
                Câu {q.orderIndex} • {q.categoryLabel || typeMeta?.defaultCategory} • {q.points}đ
              </span>
              <h4 className={`text-sm sm:text-base font-extrabold leading-snug ${textPrimary}`}>
                {q.promptText || '(Chưa nhập nội dung câu hỏi PromptText)'}
              </h4>
              {q.targetWord && (
                <div className="mt-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                  🎯 TargetWord (Từ phát âm / từ khóa): <code>{q.targetWord}</code>
                </div>
              )}
            </div>

            {hasPromptAudio && (
              <button
                type="button"
                onClick={() =>
                  playPronunciation(q.targetWord || q.promptText, q.promptAudioUrl || undefined)
                }
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white flex flex-col items-center justify-center shadow-md shrink-0 active:scale-95 transition"
                title="Bấm để nghe thử Loa ở Đề bài"
              >
                <Volume2 className="w-5 h-5" />
                <span className="text-[9px] font-bold mt-0.5">Loa đề</span>
              </button>
            )}
          </div>

          {q.statementText && (
            <div className="mt-3 p-3 rounded-xl bg-amber-50/95 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-600 text-amber-950 dark:text-amber-100 text-xs sm:text-sm font-black">
              📌 {q.statementText}
            </div>
          )}

          {q.promptVideoUrl && (
            <div className="mt-3">
              <QuestionMediaPlayer url={q.promptVideoUrl} darkMode={darkMode} compact />
            </div>
          )}
        </div>

        {/* Khu vực Đáp án mô phỏng */}
        {q.questionType === 'FILL_IN_THE_BLANK' ? (
          <div
            className={`mt-3 p-3.5 rounded-2xl border-2 space-y-2 ${
              darkMode ? 'bg-slate-900 border-blue-500/40' : 'bg-slate-50 border-blue-200'
            }`}
          >
            <div className={`text-xs font-black ${textPrimary}`}>
              ✍️ Ô học viên gõ từ tiếng Anh (chấm không phân biệt chữ HOA / chữ thường):
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-black">
                Đáp án đúng: {q.targetWord || q.correctOptionId || '(Chưa nhập)'}
              </span>
              <span className={`text-[11px] font-semibold ${textSecondary}`}>
                → Học viên gõ{' '}
                <code>{(q.targetWord || q.correctOptionId || 'word').toLowerCase()}</code>,{' '}
                <code>{(q.targetWord || q.correctOptionId || 'Word')}</code> hay{' '}
                <code>{(q.targetWord || q.correctOptionId || 'WORD').toUpperCase()}</code> đều ĐÚNG.
              </span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
            {previewOptions.map((opt) => {
              const isCorrect = q.correctOptionId === opt.id;
              return (
                <div
                  key={opt.id}
                  className={`flex items-center gap-2.5 p-3 rounded-xl border-2 transition ${
                    isCorrect
                      ? darkMode
                        ? 'border-emerald-500 bg-emerald-950/40'
                        : 'border-emerald-500 bg-emerald-50/80'
                      : darkMode
                      ? 'border-slate-700 bg-slate-800/75'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  {opt.hasOptionAudio && (
                    <button
                      type="button"
                      onClick={() => playPronunciation(opt.spokenText, opt.audioUrl)}
                      className="w-9 h-9 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shrink-0 shadow-xs"
                      title={`Nghe thử Loa đáp án ${opt.id} (${
                        opt.audioUrl ? 'File MP3' : `TTS: ${opt.spokenText}`
                      })`}
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-[10px] font-black">
                        {opt.id}
                      </span>
                      <span className={`text-xs sm:text-sm font-bold truncate ${textPrimary}`}>
                        {opt.displayLabel}
                      </span>
                    </div>
                    {opt.hasOptionAudio && (
                      <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold block">
                        🔊 {opt.audioUrl ? `MP3: ${opt.audioUrl}` : `Đọc TTS: "${opt.spokenText}"`}
                      </span>
                    )}
                  </div>

                  {isCorrect && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-black flex items-center gap-1 shrink-0">
                      <CheckCircle2 className="w-3 h-3" /> Đúng
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

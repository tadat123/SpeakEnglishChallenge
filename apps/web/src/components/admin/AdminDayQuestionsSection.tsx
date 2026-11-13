import React from 'react';
import {
  Check,
  Copy,
  Edit3,
  FileSpreadsheet,
  Plus,
  Trash2,
  Volume2,
} from 'lucide-react';
import { Lang } from '../../utils/i18n';
import { playPronunciation } from '../../utils/audio';
import {
  AutoPronunciationGraphic,
  WorkplaceWordItem,
} from '../PronunciationChallengeQ11';
import { ADMIN_I18N } from './adminTypes';

interface AdminDayQuestionsSectionProps {
  dayDetail: any;
  effectiveTotalDays: number;
  currentQ11Words: WorkplaceWordItem[];
  at: (typeof ADMIN_I18N)[Lang];
  darkMode: boolean;
  subCardBg: string;
  inputBg: string;
  textPrimary: string;
  textSecondary: string;
  onOpenBulkModal: () => void;
  onCloneToAllDays: () => void;
  onOpenCreateQuestion: () => void;
  onOpenEditQuestion: (q: any) => void;
  onDeleteQuestion: (questionId: string, orderIndex: number) => void;
  onOpenEditQ11: () => void;
  onClearQ11?: () => void;
}

/**
 * Hiển thị Phần B (Danh sách câu hỏi của ngày đang chọn) & Phần C (Bộ 5 từ vựng Luyện đọc Câu 11).
 */
export const AdminDayQuestionsSection: React.FC<AdminDayQuestionsSectionProps> = ({
  dayDetail,
  effectiveTotalDays,
  currentQ11Words,
  at,
  darkMode,
  subCardBg,
  inputBg,
  textPrimary,
  textSecondary,
  onOpenBulkModal,
  onCloneToAllDays,
  onOpenCreateQuestion,
  onOpenEditQuestion,
  onDeleteQuestion,
  onOpenEditQ11,
  onClearQ11,
}) => {
  return (
    <>
      {/* Phần B: Danh sách câu hỏi của Ngày đang chọn */}
      <div className="pt-1 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <h3 className={`text-sm sm:text-base font-black ${textPrimary}`}>
              {at.questionListTitle}
            </h3>
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                darkMode
                  ? 'bg-slate-800 text-slate-300 border-slate-700'
                  : 'bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              {dayDetail.questions?.length || 0} {at.questionsCountUnit}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onOpenBulkModal}
              className={`px-3 py-1.5 rounded-xl border font-bold text-xs flex items-center gap-1.5 transition ${
                darkMode
                  ? 'border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-slate-200'
                  : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
              }`}
              title="Nhập hàng loạt câu hỏi từ file Excel hoặc CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
              <span>Nhập Excel / CSV</span>
            </button>
            <button
              type="button"
              onClick={onCloneToAllDays}
              disabled={!dayDetail.questions || dayDetail.questions.length === 0}
              className={`px-3 py-1.5 rounded-xl border font-bold text-xs flex items-center gap-1.5 transition disabled:opacity-45 disabled:cursor-not-allowed ${
                darkMode
                  ? 'border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-slate-200'
                  : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
              }`}
            >
              <Copy className="w-3.5 h-3.5 text-blue-500" />
              <span>Nhân bản sang {effectiveTotalDays} ngày</span>
            </button>
            <button
              type="button"
              onClick={onOpenCreateQuestion}
              className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-xs transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{at.addQuestionBtn}</span>
            </button>
          </div>
        </div>

        <div className="space-y-2.5">
          {(!dayDetail.questions || dayDetail.questions.length === 0) && (
            <div className={`p-8 rounded-2xl border border-dashed text-center ${darkMode ? 'border-slate-700 bg-slate-900/30' : 'border-slate-200 bg-slate-50/70'}`}>
              <p className={`text-sm font-bold mb-1 ${textPrimary}`}>
                Chưa có câu hỏi nào cho ngày này
              </p>
              <p className={`text-xs mb-4 ${textSecondary}`}>
                Bạn có thể thêm từng câu hỏi thủ công hoặc nhập hàng loạt từ file Excel / CSV.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={onOpenCreateQuestion}
                  className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs inline-flex items-center gap-1.5 shadow-xs transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{at.addQuestionBtn}</span>
                </button>
                <button
                  type="button"
                  onClick={onOpenBulkModal}
                  className={`px-3.5 py-2 rounded-xl border font-bold text-xs inline-flex items-center gap-1.5 transition ${
                    darkMode
                      ? 'border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-slate-200'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Nhập Excel / CSV</span>
                </button>
              </div>
            </div>
          )}
          {(dayDetail.questions || []).map((q: any) => (
            <div
              key={q.id}
              className={`p-3.5 sm:p-4 rounded-2xl border hover:border-blue-400/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition ${subCardBg}`}
            >
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-md bg-blue-600 text-white text-[11px] font-black">
                    {at.questionPrefix} {q.orderIndex}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                      darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-200/80 text-slate-700'
                    }`}
                  >
                    {q.categoryLabel}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-extrabold ${
                      darkMode
                        ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-800/70'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}
                  >
                    <Check className="w-3 h-3" /> {q.correctOptionId}
                  </span>
                  {q.promptAudioUrl && (
                    <span className="px-2 py-0.5 rounded-md bg-sky-100 text-sky-800 text-[10px] font-bold">
                      {at.mp3Badge}
                    </span>
                  )}
                  {q.promptVideoUrl && (
                    <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 text-[10px] font-bold">
                      {at.videoBadge}
                    </span>
                  )}
                </div>

                <div className={`text-xs sm:text-sm font-extrabold leading-snug ${textPrimary}`}>
                  {q.promptText}
                </div>
                {q.statementText && (
                  <div className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                    {q.statementText}
                  </div>
                )}

                {q.questionType === 'FILL_IN_THE_BLANK' ? (
                  <div className="pt-0.5">
                    <span className="text-[11px] px-2.5 py-1 rounded-lg border bg-purple-50 dark:bg-purple-950/60 border-purple-300 dark:border-purple-700 text-purple-900 dark:text-purple-300 font-black">
                      Từ cần điền: {q.targetWord || q.correctOptionId}
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {(q.options || []).map((opt: any) => (
                      <span
                        key={opt.id}
                        className={`text-[11px] px-2.5 py-1 rounded-lg border ${
                          opt.id === q.correctOptionId
                            ? darkMode
                              ? 'bg-emerald-950/50 border-emerald-700 text-emerald-300 font-bold'
                              : 'bg-emerald-50 border-emerald-300 text-emerald-800 font-bold'
                            : darkMode
                            ? 'bg-slate-900/80 border-slate-700 text-slate-300'
                            : 'bg-white border-slate-200 text-slate-600'
                        }`}
                      >
                        {opt.id}. {opt.text}
                        {opt.audioUrl ? ' (Audio)' : ''}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {(q.hasPromptAudio || q.promptAudioUrl) && (
                  <button
                    type="button"
                    onClick={() => playPronunciation(q.targetWord || q.promptText, q.promptAudioUrl)}
                    className={`p-2 rounded-xl border transition ${
                      darkMode
                        ? 'border-slate-700 bg-slate-800 hover:border-blue-500 text-blue-400'
                        : 'border-slate-200 bg-white hover:border-blue-400 text-blue-600'
                    }`}
                    title={at.testListenBtn}
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onOpenEditQuestion(q)}
                  className={`p-2 rounded-xl border hover:border-blue-500 transition ${inputBg}`}
                  title={at.editBtn}
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteQuestion(q.id, q.orderIndex)}
                  className={`p-2 rounded-xl border hover:border-rose-500 text-slate-400 hover:text-rose-500 transition ${inputBg}`}
                  title={at.deleteBtnTitle}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Phần C: Quản lý Bộ từ vựng Luyện Đọc Câu 11 (5 từ) */}
      <div className={`mt-4 p-4 sm:p-5 rounded-2xl border space-y-4 ${subCardBg}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-purple-600 text-white text-[11px] font-black">
                Câu 11
              </span>
              <h3 className={`text-sm sm:text-base font-black ${textPrimary}`}>
                Bộ Từ Vựng Luyện Đọc
              </h3>
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                  darkMode
                    ? 'bg-slate-800 text-slate-300 border-slate-700'
                    : 'bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                {currentQ11Words.length}/5 từ
              </span>
            </div>
            <p className={`text-xs mt-1 ${textSecondary}`}>
              Nhập 4 trường (Từ tiếng Anh, IPA, Nghĩa tiếng Việt, Hướng dẫn) — Tự động tạo sơ đồ trọng âm & khẩu hình.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            {currentQ11Words.length > 0 && onClearQ11 && (
              <button
                type="button"
                onClick={onClearQ11}
                className={`px-3 py-2 rounded-xl border font-bold text-xs flex items-center gap-1.5 transition ${
                  darkMode
                    ? 'border-rose-800/70 bg-rose-950/30 hover:bg-rose-950/60 text-rose-300'
                    : 'border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600'
                }`}
                title="Xóa bộ từ vựng Câu 11 của ngày này"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa bộ từ</span>
              </button>
            )}
            <button
              type="button"
              onClick={onOpenEditQ11}
              className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition"
            >
              {currentQ11Words.length > 0 ? (
                <>
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Sửa 5 từ Câu 11</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tạo 5 từ Câu 11</span>
                </>
              )}
            </button>
          </div>
        </div>

        {currentQ11Words.length === 0 ? (
          <div
            className={`p-6 rounded-2xl border border-dashed text-center ${
              darkMode ? 'border-slate-700 bg-slate-900/30' : 'border-slate-200 bg-slate-50/70'
            }`}
          >
            <p className={`text-sm font-bold mb-1 ${textPrimary}`}>
              Chưa có từ vựng Câu 11 cho ngày này
            </p>
            <p className={`text-xs mb-3.5 ${textSecondary}`}>
              Bạn có thể tạo mới hoặc dán nhanh 5 từ vựng luyện đọc từ Excel / Word. Nếu để trống, bài thi ngày này sẽ không hiển thị Câu 11.
            </p>
            <button
              type="button"
              onClick={onOpenEditQ11}
              className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs inline-flex items-center gap-1.5 shadow-xs transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tạo 5 từ Câu 11</span>
            </button>
          </div>
        ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {currentQ11Words.map((item, idx) => {
            const tipDisplay = item.tip || item.tipVi || '';
            return (
              <div
                key={idx}
                className={`p-3 rounded-xl border flex flex-col justify-between gap-2 ${
                  darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300">
                      Từ #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => playPronunciation(item.spokenText || item.word)}
                      className="p-1 rounded text-blue-500 hover:bg-blue-50 dark:hover:bg-slate-800"
                      title="Nghe phát âm"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className={`text-sm font-black ${textPrimary}`}>{item.word}</div>
                  <div className="text-[11px] font-mono text-purple-600 dark:text-purple-400 font-bold">
                    {item.ipa}
                  </div>
                  <div className={`text-xs font-semibold ${textSecondary}`}>
                    {item.meaningVi}
                  </div>

                  <div className="pt-1">
                    <AutoPronunciationGraphic
                      item={item}
                      darkMode={darkMode}
                      compact
                      onListen={() => playPronunciation(item.spokenText || item.word)}
                    />
                  </div>
                </div>

                {tipDisplay && (
                  <div className="text-[10px] text-amber-600 dark:text-amber-400 leading-snug">
                    <span className="font-semibold">{tipDisplay}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        )}
      </div>
    </>
  );
};

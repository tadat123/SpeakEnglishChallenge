import React, { useState } from 'react';
import {
  CheckCircle2,
  Save,
  Search,
  Sparkles,
  Upload,
  Video,
  Volume2,
  X,
} from 'lucide-react';
import { playPronunciation } from '../../utils/audio';
import { Lang } from '../../utils/i18n';
import { lookupDictionaryAudio } from '../../utils/mediaEmbed';
import { QuestionMediaPlayer } from '../QuestionMediaPlayer';
import { ADMIN_I18N } from './adminTypes';

interface AdminQuestionModalProps {
  editingQuestion: any | null;
  setEditingQuestion: React.Dispatch<React.SetStateAction<any | null>>;
  isCreatingNew: boolean;
  selectedDay: number;
  uploadingField: string | null;
  handleUploadFile: (
    file: File,
    onUploadedUrl: (url: string) => void,
    fieldKey: string
  ) => void;
  onQuestionTypeChange: (newType: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  at: (typeof ADMIN_I18N)[Lang];
  darkMode: boolean;
  cardBg: string;
  subCardBg: string;
  inputBg: string;
  textPrimary: string;
  textSecondary: string;
}

export const AdminQuestionModal: React.FC<AdminQuestionModalProps> = ({
  editingQuestion,
  setEditingQuestion,
  isCreatingNew,
  selectedDay,
  uploadingField,
  handleUploadFile,
  onQuestionTypeChange,
  onSubmit,
  at,
  darkMode,
  cardBg,
  subCardBg,
  inputBg,
  textPrimary,
  textSecondary,
}) => {
  const [lookingUpAudio, setLookingUpAudio] = useState(false);
  const [audioLookupNote, setAudioLookupNote] = useState<string | null>(null);

  if (!editingQuestion) return null;

  const handleLookupAudio = async () => {
    const query = String(editingQuestion.targetWord || editingQuestion.promptText || '').trim();
    if (!query) {
      setAudioLookupNote('Hãy nhập "Từ khóa phát âm" trước khi tìm MP3 từ điển.');
      return;
    }
    setLookingUpAudio(true);
    setAudioLookupNote(null);
    try {
      const result = await lookupDictionaryAudio(query);
      if (result) {
        setEditingQuestion((prev: any) => ({
          ...prev,
          promptAudioUrl: result.audioUrl,
          hasPromptAudio: true,
        }));
        setAudioLookupNote(`Đã gắn MP3 chuẩn cho "${result.word}" ${result.ipa ? `(${result.ipa})` : ''}.`);
        playPronunciation(result.word, result.audioUrl);
      } else {
        setAudioLookupNote('Không tìm thấy MP3 từ đơn này (hoặc đây là câu dài) — hãy tải file MP3/TTS hoặc để trống để trình duyệt tự đọc.');
      }
    } catch {
      setAudioLookupNote('Lỗi kết nối Free Dictionary API khi tìm MP3.');
    } finally {
      setLookingUpAudio(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <form
        onSubmit={onSubmit}
        className={`w-full max-w-2xl rounded-3xl p-5 sm:p-6 shadow-2xl border space-y-4 my-auto max-h-[92vh] overflow-y-auto ${cardBg}`}
      >
        <div
          className={`flex items-center justify-between pb-3 border-b ${
            darkMode ? 'border-slate-800' : 'border-slate-100'
          }`}
        >
          <h3 className={`text-base sm:text-lg font-black ${textPrimary}`}>
            {isCreatingNew
              ? `${at.modalAddTitle} ${selectedDay}`
              : `${at.modalEditTitle} ${editingQuestion.orderIndex} (Day ${selectedDay})`}
          </h3>
          <button
            type="button"
            onClick={() => setEditingQuestion(null)}
            className={`p-2 rounded-full ${subCardBg}`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 1. Loại câu hỏi */}
        <div>
          <label className={`block text-xs font-bold mb-1 ${textSecondary}`}>
            {at.questionTypeLabel}
          </label>
          <select
            value={editingQuestion.questionType}
            onChange={(e) => onQuestionTypeChange(e.target.value)}
            className={`w-full px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm font-bold ${inputBg}`}
          >
            {at.types.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {/* 2. Nội dung câu hỏi (Chữ) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <label className={`block text-xs font-bold mb-1 ${textSecondary}`}>
              {at.promptTextLabel}
            </label>
            <input
              type="text"
              value={editingQuestion.promptText}
              onChange={(e) =>
                setEditingQuestion({ ...editingQuestion, promptText: e.target.value })
              }
              className={`w-full px-3.5 py-2.5 rounded-xl border text-sm ${inputBg}`}
            />
          </div>
          <div>
            <label className={`block text-xs font-bold mb-1 ${textSecondary}`}>
              {at.targetWordLabel}
            </label>
            <input
              type="text"
              value={editingQuestion.targetWord || ''}
              onChange={(e) =>
                setEditingQuestion({ ...editingQuestion, targetWord: e.target.value })
              }
              placeholder="Yield rate / M. E. G."
              className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-bold ${inputBg}`}
            />
          </div>
        </div>

        {editingQuestion.questionType === 'TRUE_FALSE' && (
          <div>
            <label className="block text-xs font-bold text-amber-500 mb-1">
              {at.statementTextLabel}
            </label>
            <input
              type="text"
              value={editingQuestion.statementText || ''}
              onChange={(e) =>
                setEditingQuestion({ ...editingQuestion, statementText: e.target.value })
              }
              className={`w-full px-3.5 py-2.5 rounded-xl border border-amber-400 text-sm font-bold ${inputBg}`}
            />
          </div>
        )}

        {editingQuestion.questionType === 'FILL_IN_THE_BLANK' && (
          <div>
            <label className="block text-xs font-bold text-indigo-500 mb-1">
              Phiên âm & Nghĩa (statementText)
            </label>
            <input
              type="text"
              value={editingQuestion.statementText || ''}
              onChange={(e) =>
                setEditingQuestion({ ...editingQuestion, statementText: e.target.value })
              }
              placeholder="/ˌredʒɪˈstreɪʃn/ - Đăng ký"
              className={`w-full px-3.5 py-2.5 rounded-xl border border-indigo-400 text-sm font-bold ${inputBg}`}
            />
          </div>
        )}

        {/* 3. Cài đặt ÂM THANH (Audio) & VIDEO cho Câu hỏi */}
        <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl border ${subCardBg}`}>
          {/* Cột Audio Câu hỏi */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className={`text-xs font-extrabold flex items-center gap-1 ${textPrimary}`}>
                <Volume2 className="w-4 h-4 text-blue-500" /> {at.promptAudioTitle}
              </label>
              <label className={`text-[11px] font-bold flex items-center gap-1 cursor-pointer ${textSecondary}`}>
                <input
                  type="checkbox"
                  checked={Boolean(editingQuestion.hasPromptAudio)}
                  onChange={(e) =>
                    setEditingQuestion({
                      ...editingQuestion,
                      hasPromptAudio: e.target.checked,
                    })
                  }
                />
                {at.showSpeakerLabel}
              </label>
            </div>

            <input
              type="text"
              value={editingQuestion.promptAudioUrl || ''}
              onChange={(e) =>
                setEditingQuestion({
                  ...editingQuestion,
                  promptAudioUrl: e.target.value,
                  hasPromptAudio: true,
                })
              }
              placeholder="Link .mp3 / /api/uploads/... hoặc bấm Tìm MP3"
              className={`w-full px-3 py-2 rounded-xl border text-xs ${inputBg}`}
            />

            <div className="flex flex-wrap items-center gap-1.5">
              <label className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer flex items-center gap-1">
                <Upload className="w-3.5 h-3.5" />
                {uploadingField === 'promptAudio' ? at.uploadingText : at.uploadAudioBtn}
                <input
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleUploadFile(
                        file,
                        (url) =>
                          setEditingQuestion((prev: any) => ({
                            ...prev,
                            promptAudioUrl: url,
                            hasPromptAudio: true,
                          })),
                        'promptAudio'
                      );
                    }
                  }}
                />
              </label>

              <button
                type="button"
                disabled={lookingUpAudio}
                onClick={handleLookupAudio}
                className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold inline-flex items-center gap-1 disabled:opacity-50 ${inputBg}`}
                title="Tự tìm file MP3 phát âm chuẩn US/UK từ Free Dictionary API theo Từ khóa phát âm"
              >
                <Search className="w-3.5 h-3.5 text-emerald-500" />
                <span>{lookingUpAudio ? 'Đang tìm...' : 'Tìm MP3 từ điển'}</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  playPronunciation(
                    editingQuestion.targetWord || editingQuestion.promptText,
                    editingQuestion.promptAudioUrl
                  )
                }
                className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold ${inputBg}`}
              >
                {at.testListenBtn}
              </button>
            </div>
            {audioLookupNote && (
              <p className={`text-[11px] font-semibold leading-snug ${textSecondary}`}>
                {audioLookupNote}
              </p>
            )}
          </div>

          {/* Cột Video Câu hỏi */}
          <div className="space-y-2">
            <label className={`text-xs font-extrabold flex items-center gap-1 ${textPrimary}`}>
              <Video className="w-4 h-4 text-purple-500" /> {at.promptVideoTitle}
            </label>

            <input
              type="text"
              value={editingQuestion.promptVideoUrl || ''}
              onChange={(e) =>
                setEditingQuestion({
                  ...editingQuestion,
                  promptVideoUrl: e.target.value,
                })
              }
              placeholder="YouTube (kèm ?t=...), Vimeo, Google Drive, .mp4..."
              className={`w-full px-3 py-2 rounded-xl border text-xs ${inputBg}`}
            />

            <div className="flex flex-wrap items-center gap-2">
              <label className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold cursor-pointer flex items-center gap-1">
                <Upload className="w-3.5 h-3.5" />
                {uploadingField === 'promptVideo' ? at.uploadingText : at.uploadVideoBtn}
                <input
                  type="file"
                  accept="video/mp4,video/webm"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleUploadFile(
                        file,
                        (url) =>
                          setEditingQuestion((prev: any) => ({
                            ...prev,
                            promptVideoUrl: url,
                          })),
                        'promptVideo'
                      );
                    }
                  }}
                />
              </label>
              {editingQuestion.promptVideoUrl && (
                <button
                  type="button"
                  onClick={() =>
                    setEditingQuestion({ ...editingQuestion, promptVideoUrl: '' })
                  }
                  className="text-xs text-rose-500 font-bold"
                >
                  {at.removeVideoBtn}
                </button>
              )}
            </div>
            <p className={`text-[11px] leading-snug ${textSecondary}`}>
              Hỗ trợ link YouTube (<code>watch</code>, <code>youtu.be</code>, <code>shorts</code>, <code>?t=30</code>), Google Drive, Vimeo, file <code>.mp4</code> hoặc link tham khảo (YouGlish, Cambridge...).
            </p>
          </div>
        </div>

        {/* Xem trước Video / Link phát âm nếu có */}
        {editingQuestion.promptVideoUrl && (
          <QuestionMediaPlayer
            url={editingQuestion.promptVideoUrl}
            darkMode={darkMode}
            compact
          />
        )}

        {/* 4. Danh sách Đáp án hoặc Điền từ */}
        {editingQuestion.questionType === 'FILL_IN_THE_BLANK' ? (
          <div className={`p-4 rounded-2xl border space-y-3 ${subCardBg}`}>
            <div className="flex items-center gap-2 text-indigo-500 font-black text-sm">
              <Sparkles className="w-4 h-4" />
              <span>Câu hỏi điền từ</span>
            </div>
            <div>
              <label className={`block text-xs font-bold mb-1 ${textSecondary}`}>
                Từ cần điền (Đáp án đúng) *
              </label>
              <input
                type="text"
                required
                value={editingQuestion.targetWord || ''}
                onChange={(e) =>
                  setEditingQuestion({
                    ...editingQuestion,
                    targetWord: e.target.value,
                    correctOptionId: e.target.value.trim().toLowerCase(),
                  })
                }
                placeholder="registration"
                className={`w-full px-3.5 py-2.5 rounded-xl border border-indigo-400 text-sm font-black ${inputBg}`}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            <label className={`block text-xs font-extrabold ${textPrimary}`}>
              {at.optionsSectionLabel}
            </label>

            {(editingQuestion.options || []).map((opt: any, idx: number) => {
              const isCorrect = editingQuestion.correctOptionId === opt.id;
              return (
                <div
                  key={opt.id}
                  className={`p-3 rounded-2xl border space-y-2 ${
                    isCorrect
                      ? darkMode
                        ? 'bg-emerald-950/50 border-emerald-500'
                        : 'bg-emerald-50/70 border-emerald-400'
                      : subCardBg
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setEditingQuestion({
                          ...editingQuestion,
                          correctOptionId: opt.id,
                        })
                      }
                      className={`px-2.5 py-1 rounded-lg text-xs font-black flex items-center gap-1 ${
                        isCorrect
                          ? 'bg-emerald-600 text-white'
                          : darkMode
                          ? 'bg-slate-700 text-slate-300'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {opt.id} {isCorrect ? at.correctSelectedBadge : ''}
                    </button>

                    <input
                      type="text"
                      value={opt.text}
                      onChange={(e) => {
                        const newOpts = [...editingQuestion.options];
                        newOpts[idx] = { ...newOpts[idx], text: e.target.value };
                        setEditingQuestion({ ...editingQuestion, options: newOpts });
                      }}
                      placeholder={`${opt.id}...`}
                      className={`flex-1 min-w-[160px] px-3 py-1.5 rounded-xl border text-xs sm:text-sm font-bold ${inputBg}`}
                    />

                    <label className="text-[11px] font-bold text-blue-500 flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(opt.hasOptionAudio)}
                        onChange={(e) => {
                          const newOpts = [...editingQuestion.options];
                          newOpts[idx] = { ...newOpts[idx], hasOptionAudio: e.target.checked };
                          setEditingQuestion({ ...editingQuestion, options: newOpts });
                        }}
                      />
                      {at.hasOptionSpeaker}
                    </label>
                  </div>

                  {opt.hasOptionAudio && (
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pl-2 pt-1">
                      <input
                        type="text"
                        value={opt.spokenText || ''}
                        onChange={(e) => {
                          const newOpts = [...editingQuestion.options];
                          newOpts[idx] = { ...newOpts[idx], spokenText: e.target.value };
                          setEditingQuestion({ ...editingQuestion, options: newOpts });
                        }}
                        placeholder="TTS (e.g. approval)"
                        className={`sm:col-span-4 px-2.5 py-1.5 rounded-lg border text-xs ${inputBg}`}
                      />
                      <input
                        type="text"
                        value={opt.audioUrl || ''}
                        onChange={(e) => {
                          const newOpts = [...editingQuestion.options];
                          newOpts[idx] = { ...newOpts[idx], audioUrl: e.target.value };
                          setEditingQuestion({ ...editingQuestion, options: newOpts });
                        }}
                        placeholder=".mp3 URL"
                        className={`sm:col-span-5 px-2.5 py-1.5 rounded-lg border text-xs ${inputBg}`}
                      />
                      <div className="sm:col-span-3 flex items-center gap-1">
                        <label className="px-2.5 py-1.5 rounded-lg bg-blue-600 text-white text-[11px] font-bold cursor-pointer">
                          {uploadingField === `opt-${opt.id}` ? '...' : 'MP3'}
                          <input
                            type="file"
                            accept="audio/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                handleUploadFile(
                                  file,
                                  (url) => {
                                    const newOpts = [...editingQuestion.options];
                                    newOpts[idx] = { ...newOpts[idx], audioUrl: url };
                                    setEditingQuestion({
                                      ...editingQuestion,
                                      options: newOpts,
                                    });
                                  },
                                  `opt-${opt.id}`
                                );
                              }
                            }}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() =>
                            playPronunciation(
                              opt.spokenText || opt.text || editingQuestion.targetWord,
                              opt.audioUrl
                            )
                          }
                          className={`p-1.5 rounded-lg border ${inputBg}`}
                        >
                          🔊
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* 5. Giải thích đáp án */}
        <div>
          <label className={`block text-xs font-bold mb-1 ${textSecondary}`}>
            {at.explanationLabel}
          </label>
          <textarea
            rows={2}
            value={editingQuestion.explanation || ''}
            onChange={(e) =>
              setEditingQuestion({ ...editingQuestion, explanation: e.target.value })
            }
            className={`w-full px-3.5 py-2 rounded-xl border text-xs sm:text-sm ${inputBg}`}
          />
        </div>

        <div
          className={`flex items-center justify-end gap-2 pt-3 border-t ${
            darkMode ? 'border-slate-800' : 'border-slate-100'
          }`}
        >
          <button
            type="button"
            onClick={() => setEditingQuestion(null)}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs ${subCardBg}`}
          >
            {at.cancelBtn}
          </button>
          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs sm:text-sm shadow-md flex items-center gap-1.5"
          >
            <Save className="w-4 h-4" /> {at.saveQuestionBtn}
          </button>
        </div>
      </form>
    </div>
  );
};

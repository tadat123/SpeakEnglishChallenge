import React from 'react';
import { Save, ShieldAlert, Volume2, X } from 'lucide-react';
import { playPronunciation } from '../../utils/audio';
import { Lang } from '../../utils/i18n';
import {
  AutoPronunciationGraphic,
  WorkplaceWordItem,
  analyzeWordPronunciation,
} from '../PronunciationChallengeQ11';
import { ADMIN_I18N } from './adminTypes';

interface AdminLockConfirmModalProps {
  show: boolean;
  dayDetail: any | null;
  activePlayersCount: number;
  onClose: () => void;
  onLock: (mode: 'GRACEFUL' | 'FORCE') => void;
  at: (typeof ADMIN_I18N)[Lang];
  darkMode: boolean;
  cardBg: string;
  subCardBg: string;
  textPrimary: string;
  textSecondary: string;
}

export const AdminLockConfirmModal: React.FC<AdminLockConfirmModalProps> = ({
  show,
  dayDetail,
  activePlayersCount,
  onClose,
  onLock,
  at,
  darkMode,
  cardBg,
  subCardBg,
  textPrimary,
  textSecondary,
}) => {
  if (!show || !dayDetail) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className={`w-full max-w-md rounded-3xl p-6 shadow-2xl border space-y-4 ${cardBg}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className={`text-base font-black ${textPrimary}`}>
                {at.lockModalTitle} {dayDetail.title}
              </h3>
              <p className={`text-xs ${textSecondary}`}>
                {at.lockModalSubPrefix} <strong>{activePlayersCount}</strong>{' '}
                {at.lockModalSubSuffix}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-full ${subCardBg}`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2.5 text-xs">
          <button
            type="button"
            onClick={() => onLock('GRACEFUL')}
            className={`w-full p-4 rounded-2xl border-2 border-blue-600 text-left transition space-y-1 ${
              darkMode ? 'bg-blue-950/60 hover:bg-blue-900/70' : 'bg-blue-50/70 hover:bg-blue-100'
            }`}
          >
            <div className="font-black text-blue-600 text-sm flex items-center justify-between">
              <span>{at.gracefulTitle}</span>
              <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full">
                {at.safeBadge}
              </span>
            </div>
            <p className={`leading-relaxed ${textSecondary}`}>{at.gracefulDesc}</p>
          </button>

          <button
            type="button"
            onClick={() => onLock('FORCE')}
            className={`w-full p-4 rounded-2xl border-2 border-rose-400 text-left transition space-y-1 ${
              darkMode ? 'bg-rose-950/50 hover:bg-rose-900/60' : 'bg-rose-50/60 hover:bg-rose-100/70'
            }`}
          >
            <div className="font-black text-rose-600 text-sm">{at.forceTitle}</div>
            <p className={`leading-relaxed ${textSecondary}`}>{at.forceDesc}</p>
          </button>
        </div>
      </div>
    </div>
  );
};

interface AdminQ11ModalProps {
  show: boolean;
  selectedDay: number;
  dayDetail: any | null;
  totalDays: number;
  challengesLength: number;
  editingQ11Words: WorkplaceWordItem[];
  setEditingQ11Words: React.Dispatch<React.SetStateAction<WorkplaceWordItem[]>>;
  cloneQ11ToAllDays: boolean;
  setCloneQ11ToAllDays: (v: boolean) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  darkMode: boolean;
  cardBg: string;
  subCardBg: string;
  inputBg: string;
  textPrimary: string;
  textSecondary: string;
}

export const AdminQ11Modal: React.FC<AdminQ11ModalProps> = ({
  show,
  selectedDay,
  dayDetail,
  totalDays,
  challengesLength,
  editingQ11Words,
  setEditingQ11Words,
  cloneQ11ToAllDays,
  setCloneQ11ToAllDays,
  onClose,
  onSubmit,
  darkMode,
  cardBg,
  subCardBg,
  inputBg,
  textPrimary,
  textSecondary,
}) => {
  if (!show) return null;

  const daysCount = totalDays || challengesLength;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div
        className={`w-full max-w-3xl rounded-3xl p-5 sm:p-6 shadow-2xl border space-y-4 my-auto max-h-[92vh] overflow-y-auto ${cardBg}`}
      >
        <div
          className={`flex items-center justify-between pb-3 border-b ${
            darkMode ? 'border-slate-800' : 'border-slate-100'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 flex items-center justify-center font-black">
              🎙️
            </span>
            <div>
              <h3 className={`text-base sm:text-lg font-black ${textPrimary}`}>
                Phần Câu hỏi số 11 — {dayDetail?.title || `Day ${selectedDay}`}
              </h3>
              <p className={`text-xs ${textSecondary}`}>
                Chỉ cần điền 4 thông tin: <b>Từ tiếng Anh</b> • <b>IPA</b> • <b>Nghĩa tiếng Việt</b> • <b>Hướng dẫn phát âm</b> (Hình vẽ bên phải tự động sinh).
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-2 rounded-full ${subCardBg}`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Khung dán nhanh 4 cột từ Excel / Word */}
        <details
          className={`rounded-2xl border p-3 text-xs ${
            darkMode
              ? 'bg-slate-900/70 border-slate-700 text-slate-300'
              : 'bg-purple-50/60 border-purple-200/80 text-slate-700'
          }`}
        >
          <summary className="font-extrabold cursor-pointer select-none text-purple-700 dark:text-purple-300">
            📋 Dán nhanh 5 từ từ Excel / Bảng (4 cột: Từ tiếng Anh | IPA | Nghĩa tiếng Việt | Hướng dẫn phát âm)
          </summary>
          <div className="mt-2 space-y-2">
            <p className="text-[11px] opacity-80">
              Mỗi dòng 1 từ, ngăn cách bởi phím <b>Tab</b> (copy trực tiếp từ Excel) hoặc dấu <b>|</b>:
            </p>
            <textarea
              rows={4}
              placeholder={`Approval\t/əˈpruːvəl/\tSự phê duyệt\tNhấn âm 2, tròn môi, cong lưỡi âm cuối /l/\nEquipment\t/ɪˈkwɪpmənt/\tTrang thiết bị\tNhấn âm 2 (-quip-), bật nhẹ âm cuối /t/`}
              onChange={(e) => {
                const rawLines = e.target.value
                  .split(/\r?\n/)
                  .map((l) => l.trim())
                  .filter(Boolean);
                if (rawLines.length === 0) return;
                const next = [...editingQ11Words];
                rawLines.slice(0, 5).forEach((line, idx) => {
                  const cols = (line.includes('\t') ? line.split('\t') : line.split('|')).map(
                    (c) => c.trim()
                  );
                  if (cols[0]) {
                    next[idx] = {
                      ...next[idx],
                      id: idx + 1,
                      word: cols[0] || next[idx].word,
                      spokenText: (cols[0] || next[idx].word).trim(),
                      ipa: cols[1] || next[idx].ipa,
                      meaningVi: cols[2] || next[idx].meaningVi,
                      tip: cols[3] ?? next[idx].tip ?? '',
                      tipVi: cols[3] ?? next[idx].tipVi ?? '',
                      syllables: '',
                      imageUrl: '',
                    };
                  }
                });
                setEditingQ11Words(next);
              }}
              className={`w-full px-3 py-2 rounded-xl border font-mono text-xs ${inputBg}`}
            />
          </div>
        </details>

        <form onSubmit={onSubmit} className="space-y-3.5">
          <div className="space-y-3 max-h-[56vh] overflow-y-auto pr-1">
            {editingQ11Words.map((item, idx) => {
              const previewItem: WorkplaceWordItem = {
                ...item,
                syllables: '',
              };
              const autoAnalysis = analyzeWordPronunciation(previewItem);

              return (
                <div
                  key={idx}
                  className={`p-3.5 rounded-2xl border space-y-2.5 ${subCardBg}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-md bg-purple-600 text-white text-xs font-black">
                        Từ #{idx + 1}
                      </span>
                      <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-300">
                        Tách âm tự động: {autoAnalysis.readableGuide}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => playPronunciation(item.spokenText || item.word)}
                      className="px-2.5 py-1 rounded-lg bg-blue-100 text-blue-700 dark:bg-slate-700 dark:text-blue-300 text-xs font-bold flex items-center gap-1"
                      title="Nghe phát âm thử"
                    >
                      <Volume2 className="w-3.5 h-3.5" /> Nghe thử
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                    {/* Cột trái (7/12): Đúng 4 trường thông tin */}
                    <div className="md:col-span-7 space-y-2.5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className={`block text-[11px] font-bold mb-1 ${textSecondary}`}>
                            1. Từ tiếng Anh *
                          </label>
                          <input
                            type="text"
                            required
                            value={item.word}
                            onChange={(e) => {
                              const next = [...editingQ11Words];
                              next[idx] = {
                                ...next[idx],
                                word: e.target.value,
                                spokenText: e.target.value,
                                syllables: '',
                              };
                              setEditingQ11Words(next);
                            }}
                            placeholder="Approval"
                            className={`w-full px-3 py-2 rounded-xl border text-xs sm:text-sm font-black ${inputBg}`}
                          />
                        </div>
                        <div>
                          <label className={`block text-[11px] font-bold mb-1 ${textSecondary}`}>
                            2. IPA *
                          </label>
                          <input
                            type="text"
                            required
                            value={item.ipa}
                            onChange={(e) => {
                              const next = [...editingQ11Words];
                              next[idx] = {
                                ...next[idx],
                                ipa: e.target.value,
                                syllables: '',
                              };
                              setEditingQ11Words(next);
                            }}
                            placeholder="/əˈpruːvəl/"
                            className={`w-full px-3 py-2 rounded-xl border font-mono text-xs sm:text-sm font-bold text-purple-600 dark:text-purple-400 ${inputBg}`}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className={`block text-[11px] font-bold mb-1 ${textSecondary}`}>
                            3. Nghĩa tiếng Việt *
                          </label>
                          <input
                            type="text"
                            required
                            value={item.meaningVi}
                            onChange={(e) => {
                              const next = [...editingQ11Words];
                              next[idx] = {
                                ...next[idx],
                                meaningVi: e.target.value,
                              };
                              setEditingQ11Words(next);
                            }}
                            placeholder="Sự phê duyệt"
                            className={`w-full px-3 py-2 rounded-xl border text-xs sm:text-sm font-semibold ${inputBg}`}
                          />
                        </div>
                        <div>
                          <label className={`block text-[11px] font-bold mb-1 ${textSecondary}`}>
                            4. Hướng dẫn phát âm
                          </label>
                          <input
                            type="text"
                            value={item.tip ?? item.tipVi ?? ''}
                            onChange={(e) => {
                              const next = [...editingQ11Words];
                              next[idx] = {
                                ...next[idx],
                                tip: e.target.value,
                                tipVi: e.target.value,
                                syllables: '',
                              };
                              setEditingQ11Words(next);
                            }}
                            placeholder="Nhấn âm 2, tròn môi, cong lưỡi âm /l/..."
                            className={`w-full px-3 py-2 rounded-xl border text-xs ${inputBg}`}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Cột phải (5/12): Hình vẽ tự động gen trực tiếp từ 4 trường trên */}
                    <div className="md:col-span-5">
                      <div className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-1 flex items-center justify-between">
                        <span>✨ Hình vẽ tự động gen:</span>
                        <span>Bấm để nghe</span>
                      </div>
                      <AutoPronunciationGraphic
                        item={previewItem}
                        darkMode={darkMode}
                        onListen={() => playPronunciation(item.spokenText || item.word)}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Checkbox áp dụng cho tất cả ngày */}
          <div className={`p-3 rounded-xl border flex items-center justify-between ${subCardBg}`}>
            <label className="text-xs font-extrabold flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={cloneQ11ToAllDays}
                onChange={(e) => setCloneQ11ToAllDays(e.target.checked)}
                className="w-4 h-4 text-purple-600 rounded"
              />
              <span>Áp dụng bộ 5 từ vựng này cho toàn bộ {daysCount} ngày thi</span>
            </label>
            <span className="text-[11px] text-purple-600 dark:text-purple-400 font-bold">
              {cloneQ11ToAllDays ? `Đồng bộ cả ${daysCount} ngày` : `Chỉ lưu Day ${selectedDay}`}
            </span>
          </div>

          <div
            className={`flex items-center justify-end gap-2 pt-3 border-t ${
              darkMode ? 'border-slate-800' : 'border-slate-100'
            }`}
          >
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs ${subCardBg}`}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs sm:text-sm shadow-md flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" /> Lưu 5 từ vựng Câu 11
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

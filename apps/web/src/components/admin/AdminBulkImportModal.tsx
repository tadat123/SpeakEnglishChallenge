import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Check,
  Download,
  Eye,
  EyeOff,
  FileSpreadsheet,
  FileUp,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { appDialog } from '../AppDialogProvider';
import { AdminBulkQuestionPreview } from './AdminBulkQuestionPreview';
import {
  BULK_CSV_HEADER,
  BULK_SAMPLE_ROWS,
  BulkParsedQuestionRow,
  BulkQuestionType,
  QUESTION_TYPE_OPTIONS,
  buildExcelXmlWithDropdowns,
  normalizeBulkCorrectOption,
  parseBulkText,
} from './bulkImportHelpers';

interface AdminBulkImportModalProps {
  show: boolean;
  onClose: () => void;
  token: string;
  selectedDay: number;
  totalDays: number;
  onImported: () => void;
  showMessage: (msg: string, isErr?: boolean) => void;
  darkMode: boolean;
  cardBg: string;
  subCardBg: string;
  inputBg: string;
  textPrimary: string;
  textSecondary: string;
}

export const AdminBulkImportModal: React.FC<AdminBulkImportModalProps> = ({
  show,
  onClose,
  token,
  selectedDay,
  totalDays,
  onImported,
  showMessage,
  darkMode,
  cardBg,
  subCardBg,
  inputBg,
  textPrimary,
  textSecondary,
}) => {
  const [bulkRawText, setBulkRawText] = useState<string>('');
  const [bulkTargetMode, setBulkTargetMode] = useState<'auto' | 'current'>('auto');
  const [bulkWriteMode, setBulkWriteMode] = useState<'overwrite' | 'append'>('overwrite');
  const [bulkLoading, setBulkLoading] = useState<boolean>(false);
  const [editableRows, setEditableRows] = useState<BulkParsedQuestionRow[]>([]);
  const [bulkParseErrors, setBulkParseErrors] = useState<string[]>([]);
  const [previewIndex, setPreviewIndex] = useState<number>(0);
  const [showLivePreview, setShowLivePreview] = useState<boolean>(true);

  const effectiveMaxDays = Math.max(1, Math.min(90, totalDays || 21));

  useEffect(() => {
    if (!bulkRawText.trim()) {
      setEditableRows([]);
      setBulkParseErrors([]);
      setPreviewIndex(0);
      return;
    }
    const { parsedList, errors } = parseBulkText(
      bulkRawText,
      bulkTargetMode,
      selectedDay,
      Math.max(90, totalDays || 30)
    );
    setEditableRows(parsedList);
    setBulkParseErrors(errors);
    setPreviewIndex(0);
  }, [bulkRawText, bulkTargetMode, selectedDay, totalDays]);

  const bulkDayCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    for (const r of editableRows) {
      const d = bulkTargetMode === 'current' ? selectedDay : r.dayNumber;
      counts[d] = (counts[d] || 0) + 1;
    }
    return counts;
  }, [editableRows, bulkTargetMode, selectedDay]);

  if (!show) return null;

  const updateRow = (index: number, patch: Partial<BulkParsedQuestionRow>) => {
    setEditableRows((prev) =>
      prev.map((row, idx) => {
        if (idx !== index) return row;
        const next: BulkParsedQuestionRow = { ...row, ...patch };

        if (patch.questionType && patch.questionType !== row.questionType) {
          const meta = QUESTION_TYPE_OPTIONS.find((t) => t.value === patch.questionType);
          if (meta) {
            next.categoryLabel = meta.defaultCategory;
          }
          if (patch.questionType === 'TRUE_FALSE') {
            next.optionA = next.optionA?.trim() || 'True – Đúng';
            next.optionB = next.optionB?.trim() || 'False – Sai';
            next.optionC = '';
            next.optionD = '';
          }
          const norm = normalizeBulkCorrectOption(
            patch.questionType,
            next.correctOptionId,
            next.targetWord,
            {
              optionA: next.optionA,
              optionB: next.optionB,
              optionC: next.optionC,
              optionD: next.optionD,
            }
          );
          next.correctOptionId = norm.correctOptionId;
          next.targetWord = norm.targetWord;
        }

        if (next.questionType === 'FILL_IN_THE_BLANK' && patch.targetWord !== undefined) {
          next.correctOptionId = patch.targetWord.trim().toLowerCase();
        }
        if (next.questionType === 'FILL_IN_THE_BLANK' && patch.correctOptionId !== undefined) {
          next.targetWord = patch.correctOptionId;
          next.correctOptionId = patch.correctOptionId.trim().toLowerCase();
        }

        return next;
      })
    );
  };

  const handleApplyQuestionTypeToAll = (newType: BulkQuestionType) => {
    setEditableRows((prev) =>
      prev.map((row) => {
        const meta = QUESTION_TYPE_OPTIONS.find((t) => t.value === newType);
        const optionA =
          newType === 'TRUE_FALSE' ? row.optionA?.trim() || 'True – Đúng' : row.optionA;
        const optionB =
          newType === 'TRUE_FALSE' ? row.optionB?.trim() || 'False – Sai' : row.optionB;
        const norm = normalizeBulkCorrectOption(newType, row.correctOptionId, row.targetWord, {
          optionA,
          optionB,
          optionC: row.optionC,
          optionD: row.optionD,
        });
        return {
          ...row,
          questionType: newType,
          categoryLabel: meta?.defaultCategory || row.categoryLabel,
          optionA,
          optionB,
          correctOptionId: norm.correctOptionId,
          targetWord: norm.targetWord,
        };
      })
    );
  };

  const handleConvertAllOfType = (fromType: BulkQuestionType, toType: BulkQuestionType) => {
    const meta = QUESTION_TYPE_OPTIONS.find((t) => t.value === toType);
    setEditableRows((prev) =>
      prev.map((row) => {
        if (row.questionType !== fromType) return row;
        return {
          ...row,
          questionType: toType,
          categoryLabel: meta?.defaultCategory || row.categoryLabel,
        };
      })
    );
  };

  const handleAddEmptyRow = () => {
    setEditableRows((prev) => {
      const nextOrder = prev.length + 1;
      setPreviewIndex(prev.length);
      setShowLivePreview(true);
      return [
        ...prev,
        {
          lineNum: nextOrder,
          dayNumber: selectedDay,
          orderIndex: nextOrder,
          questionType: 'LISTEN_AND_CHOOSE',
          categoryLabel: 'Nghe & Chọn đáp án',
          promptText: '',
          statementText: '',
          targetWord: '',
          optionA: '',
          optionB: '',
          optionC: '',
          optionD: '',
          correctOptionId: 'A',
          explanation: '',
          points: 10,
          promptAudioUrl: '',
          promptVideoUrl: '',
        },
      ];
    });
  };

  const handleRemoveRow = (index: number) => {
    setEditableRows((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleDownloadTemplate = () => {
    const blob = new Blob(['\uFEFF' + [BULK_CSV_HEADER, ...BULK_SAMPLE_ROWS].join('\r\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'SpeakRight_Questions_Template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadExcelWithDropdowns = () => {
    const xml = buildExcelXmlWithDropdowns();
    const blob = new Blob([xml], {
      type: 'application/vnd.ms-excel;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'SpeakRight_Questions_Dropdown_Template.xls');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) setBulkRawText(content);
    };
    reader.readAsText(file, 'utf-8');
    e.target.value = '';
  };

  const handleLoadSampleData = () => {
    setBulkRawText([BULK_CSV_HEADER, ...BULK_SAMPLE_ROWS].join('\n'));
  };

  const handleExecuteBulkImport = async () => {
    const validRows = editableRows.filter((r) => r.promptText.trim().length > 0);
    if (validRows.length === 0) {
      showMessage('Chưa có câu hỏi hợp lệ nào (cần có Nội dung câu hỏi)!', true);
      return;
    }

    const missingFillWord = validRows.find(
      (r) => r.questionType === 'FILL_IN_THE_BLANK' && !(r.targetWord || r.correctOptionId).trim()
    );
    if (missingFillWord) {
      showMessage(
        `Câu #${missingFillWord.orderIndex} (Day ${missingFillWord.dayNumber}) là câu Điền từ nhưng chưa nhập Từ cần điền!`,
        true
      );
      return;
    }

    const finalQuestions = validRows.map((r) => ({
      ...r,
      dayNumber: bulkTargetMode === 'current' ? selectedDay : r.dayNumber,
    }));

    const affectedDaysList = Array.from(new Set(finalQuestions.map((r) => r.dayNumber))).sort(
      (a, b) => a - b
    );
    const confirmMsg =
      bulkWriteMode === 'overwrite'
        ? `⚠️ CẢNH BÁO: Chế độ GHI ĐÈ sẽ XÓA TOÀN BỘ câu hỏi cũ của các ngày (${affectedDaysList
            .map((d) => `Day ${d}`)
            .join(', ')}) và thay bằng ${
            finalQuestions.length
          } câu hỏi mới.\n\nBạn có chắc chắn muốn tiến hành?`
        : `Bạn có muốn nhập ${finalQuestions.length} câu hỏi vào các ngày (${affectedDaysList
            .map((d) => `Day ${d}`)
            .join(', ')})?`;

    const confirmed = await appDialog.confirm({
      title:
        bulkWriteMode === 'overwrite'
          ? 'Xác nhận ghi đè câu hỏi'
          : 'Xác nhận nhập câu hỏi hàng loạt',
      message: confirmMsg,
      confirmText: bulkWriteMode === 'overwrite' ? 'Ghi đè dữ liệu' : 'Nhập câu hỏi',
      variant: bulkWriteMode === 'overwrite' ? 'danger' : 'primary',
    });
    if (!confirmed) return;

    setBulkLoading(true);
    try {
      const res = await fetch('/api/admin/challenges/bulk-import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          questions: finalQuestions,
          mode: bulkWriteMode,
          targetDayNumber: bulkTargetMode === 'current' ? selectedDay : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Lỗi khi nhập câu hỏi hàng loạt.');
      }

      showMessage(data.message || `Đã nhập thành công ${data.totalImported} câu hỏi!`);
      setBulkRawText('');
      setEditableRows([]);
      onClose();
      onImported();
    } catch (err: any) {
      showMessage(err.message || 'Lỗi kết nối máy chủ khi nhập đề bulk!', true);
    } finally {
      setBulkLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div
        className={`w-full max-w-5xl rounded-3xl p-4 sm:p-6 shadow-2xl border space-y-4 my-auto max-h-[94vh] flex flex-col ${cardBg}`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between pb-3 border-b shrink-0 ${
            darkMode ? 'border-slate-800' : 'border-slate-100'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </span>
            <div>
              <h3 className={`text-base sm:text-lg font-black ${textPrimary}`}>
                Nhập Đề Thi (Excel / CSV) — Có Dropdown Chọn Nhanh
              </h3>
              <p className={`text-[11px] ${textSecondary}`}>
                Tải file Excel có sẵn Dropdown hoặc chọn trực tiếp Dạng câu & Đáp án đúng ở bảng bên dưới để không bị gõ nhầm
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition ${subCardBg}`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="space-y-4 overflow-y-auto pr-1 flex-1">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadExcelWithDropdowns}
                className="px-3 py-1.5 rounded-xl border border-emerald-400 dark:border-emerald-600 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold flex items-center gap-1.5 transition shadow-xs"
                title="Tải file Excel (.xls) có sẵn danh sách thả xuống (Dropdown) ở cột QuestionType và CorrectOption"
              >
                <Download className="w-3.5 h-3.5" /> File Excel Mẫu (Có Dropdown .XLS)
              </button>

              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="px-3 py-1.5 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/70 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-1.5 transition shadow-xs"
              >
                <Download className="w-3.5 h-3.5" /> File Mẫu (.CSV)
              </button>

              <label className="px-3 py-1.5 rounded-xl border border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/70 text-blue-800 dark:text-blue-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition shadow-xs">
                <FileUp className="w-3.5 h-3.5" /> Tải Lên File (.CSV / .XLS)
                <input
                  type="file"
                  accept=".csv,.tsv,.txt,.xls,.xml"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              <button
                type="button"
                onClick={handleLoadSampleData}
                className="px-3 py-1.5 rounded-xl border border-purple-300 dark:border-purple-700 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/70 text-purple-800 dark:text-purple-300 text-xs font-bold flex items-center gap-1.5 transition shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5" /> Dữ Liệu Mẫu
              </button>

              <button
                type="button"
                onClick={handleAddEmptyRow}
                className="px-3 py-1.5 rounded-xl border border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/70 text-indigo-800 dark:text-indigo-300 text-xs font-bold flex items-center gap-1.5 transition shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" /> Thêm dòng trực tiếp
              </button>
            </div>

            {(bulkRawText.length > 0 || editableRows.length > 0) && (
              <button
                type="button"
                onClick={() => {
                  setBulkRawText('');
                  setEditableRows([]);
                }}
                className="text-xs text-rose-500 hover:text-rose-700 font-bold flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" /> Xóa trắng
              </button>
            )}
          </div>

          {/* Tùy chọn Phạm vi và Chế độ ghi */}
          <div className={`p-3.5 rounded-2xl border grid grid-cols-1 md:grid-cols-2 gap-3.5 ${subCardBg}`}>
            <div>
              <span className={`block text-[11px] font-black uppercase tracking-wider mb-2 ${textSecondary}`}>
                Phạm Vi Ngày
              </span>
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                  <input
                    type="radio"
                    name="bulkTargetMode"
                    value="auto"
                    checked={bulkTargetMode === 'auto'}
                    onChange={() => setBulkTargetMode('auto')}
                    className="text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>
                    Theo cột <b>DayNumber</b> của từng dòng
                  </span>
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                  <input
                    type="radio"
                    name="bulkTargetMode"
                    value="current"
                    checked={bulkTargetMode === 'current'}
                    onChange={() => setBulkTargetMode('current')}
                    className="text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>
                    Chỉ nhập tất cả vào <b>Day {selectedDay}</b>
                  </span>
                </label>
              </div>
            </div>

            <div>
              <span className={`block text-[11px] font-black uppercase tracking-wider mb-2 ${textSecondary}`}>
                Chế Độ Ghi
              </span>
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                  <input
                    type="radio"
                    name="bulkWriteMode"
                    value="overwrite"
                    checked={bulkWriteMode === 'overwrite'}
                    onChange={() => setBulkWriteMode('overwrite')}
                    className="text-amber-600 focus:ring-amber-500"
                  />
                  <span className="text-amber-700 dark:text-amber-400 font-bold">
                    Ghi đè (xóa câu hỏi cũ)
                  </span>
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                  <input
                    type="radio"
                    name="bulkWriteMode"
                    value="append"
                    checked={bulkWriteMode === 'append'}
                    onChange={() => setBulkWriteMode('append')}
                    className="text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Thêm tiếp vào sau</span>
                </label>
              </div>
            </div>
          </div>

          {/* Textarea dán dữ liệu */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className={`text-[11px] font-bold ${textSecondary}`}>
                Dán nội dung từ Excel / CSV (hoặc bấm "Tải Lên File" / "Thêm dòng trực tiếp"):
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                {bulkRawText.split(/\r?\n/).filter((l) => l.trim()).length} dòng văn bản
              </span>
            </div>
            <textarea
              value={bulkRawText}
              onChange={(e) => setBulkRawText(e.target.value)}
              rows={4}
              placeholder="Dán nội dung từ bảng Excel hoặc file CSV vào đây..."
              className={`w-full px-3.5 py-2.5 rounded-2xl border font-mono text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-emerald-500 ${inputBg}`}
            />
          </div>

          {/* Báo cáo trạng thái Parsing & Bảng chỉnh sửa trực tiếp bằng Dropdown */}
          {(bulkRawText.trim().length > 0 || editableRows.length > 0) && (
            <div className="space-y-2.5">
              {bulkParseErrors.length > 0 && (
                <div className="p-3 rounded-2xl border border-rose-300 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 text-xs space-y-1">
                  <div className="font-black flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-rose-500" />
                    Lưu ý khi đọc file ({bulkParseErrors.length} dòng):
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px] max-h-24 overflow-y-auto">
                    {bulkParseErrors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-black text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-600" />
                    Danh sách câu hỏi ({editableRows.length} câu) — Chỉnh trực tiếp bằng Dropdown bên dưới:
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowLivePreview((v) => !v)}
                    className={`px-2.5 py-1 rounded-lg border text-[11px] font-black flex items-center gap-1.5 transition ${
                      showLivePreview
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                        : inputBg
                    }`}
                  >
                    {showLivePreview ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5" /> Ẩn xem trước
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5" /> Xem trước giao diện thi
                      </>
                    )}
                  </button>

                  <select
                    defaultValue=""
                    onChange={(e) => {
                      const val = e.target.value as BulkQuestionType;
                      if (val) {
                        handleApplyQuestionTypeToAll(val);
                        e.target.value = '';
                      }
                    }}
                    className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold outline-none ${inputBg}`}
                    title="Đổi nhanh Dạng câu cho toàn bộ các dòng trong bảng"
                  >
                    <option value="">⚡ Đổi nhanh Dạng câu cho cả bảng...</option>
                    {QUESTION_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        Áp dụng tất cả: {opt.label}
                      </option>
                    ))}
                  </select>

                  {Object.entries(bulkDayCounts).map(([d, count]) => (
                    <span
                      key={d}
                      className="px-2 py-0.5 rounded-lg bg-emerald-600 text-white font-mono text-[11px] font-bold"
                    >
                      Day {d}: {count} câu
                    </span>
                  ))}
                </div>
              </div>

              {showLivePreview && editableRows.length > 0 && (
                <AdminBulkQuestionPreview
                  rows={editableRows}
                  previewIndex={previewIndex}
                  setPreviewIndex={setPreviewIndex}
                  onUpdateRow={updateRow}
                  onConvertAllOfType={handleConvertAllOfType}
                  darkMode={darkMode}
                  subCardBg={subCardBg}
                  inputBg={inputBg}
                  textPrimary={textPrimary}
                  textSecondary={textSecondary}
                />
              )}

              {editableRows.length > 0 && (
                <div className="border rounded-2xl overflow-hidden max-h-80 overflow-y-auto shadow-inner">
                  <table className="w-full text-left text-xs">
                    <thead
                      className={`sticky top-0 z-10 text-[10px] uppercase font-black tracking-wider border-b ${
                        darkMode
                          ? 'bg-slate-800 text-slate-300 border-slate-700'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      <tr>
                        <th className="p-2 text-center w-24">Day (Chọn)</th>
                        <th className="p-2 text-center w-12">#</th>
                        <th className="p-2 w-48">Dạng câu (Dropdown)</th>
                        <th className="p-2">Nội dung câu hỏi (Prompt)</th>
                        <th className="p-2">Phương án A / B / C / D hoặc Từ điền</th>
                        <th className="p-2 text-center w-36">Đ/Án Đúng (Chọn)</th>
                        <th className="p-2 text-center w-16">Điểm</th>
                        <th className="p-2 text-center w-20">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody
                      className={`divide-y ${
                        darkMode ? 'divide-slate-800 text-slate-200' : 'divide-slate-100 text-slate-700'
                      }`}
                    >
                      {editableRows.map((q, idx) => (
                        <tr
                          key={idx}
                          className={`transition ${
                            previewIndex === idx && showLivePreview
                              ? darkMode
                                ? 'bg-indigo-950/45 ring-1 ring-inset ring-indigo-500/60'
                                : 'bg-indigo-50/80 ring-1 ring-inset ring-indigo-300'
                              : 'hover:bg-blue-50/50 dark:hover:bg-slate-800/50'
                          }`}
                        >
                          {/* Dropdown chọn Day */}
                          <td className="p-1.5 text-center">
                            {bulkTargetMode === 'current' ? (
                              <span className="font-bold text-blue-600 dark:text-blue-400">
                                Day {selectedDay}
                              </span>
                            ) : (
                              <select
                                value={q.dayNumber}
                                onChange={(e) =>
                                  updateRow(idx, { dayNumber: Number(e.target.value) || 1 })
                                }
                                className={`px-2 py-1 rounded-lg border text-[11px] font-bold outline-none ${inputBg}`}
                              >
                                {Array.from({ length: effectiveMaxDays }, (_, i) => i + 1).map(
                                  (d) => (
                                    <option key={d} value={d}>
                                      Day {d}
                                    </option>
                                  )
                                )}
                              </select>
                            )}
                          </td>

                          {/* Thứ tự câu */}
                          <td className="p-1.5 text-center font-bold text-slate-400">
                            {q.orderIndex}
                          </td>

                          {/* Dropdown chọn Dạng câu (QuestionType) */}
                          <td className="p-1.5">
                            <select
                              value={q.questionType}
                              onChange={(e) =>
                                updateRow(idx, {
                                  questionType: e.target.value as BulkQuestionType,
                                })
                              }
                              className={`w-full px-2 py-1.5 rounded-lg border text-[11px] font-extrabold outline-none ${
                                darkMode
                                  ? 'bg-slate-900 border-blue-500/60 text-blue-300'
                                  : 'bg-blue-50/70 border-blue-300 text-blue-900'
                              }`}
                            >
                              {QUESTION_TYPE_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </td>

                          {/* Nội dung câu hỏi (có thể sửa trực tiếp) */}
                          <td className="p-1.5 min-w-[180px]">
                            <input
                              type="text"
                              value={q.promptText}
                              onChange={(e) => updateRow(idx, { promptText: e.target.value })}
                              placeholder="Nhập nội dung câu hỏi..."
                              className={`w-full px-2 py-1 rounded-lg border text-xs font-semibold outline-none ${inputBg}`}
                            />
                          </td>

                          {/* Phương án hoặc Từ điền */}
                          <td className="p-1.5 max-w-xs text-[11px]">
                            {q.questionType === 'FILL_IN_THE_BLANK' ? (
                              <input
                                type="text"
                                value={q.targetWord}
                                onChange={(e) => updateRow(idx, { targetWord: e.target.value })}
                                placeholder="Nhập từ tiếng Anh cần điền (VD: Feedback)..."
                                className={`w-full px-2 py-1 rounded-lg border text-xs font-black border-purple-400 outline-none ${inputBg}`}
                              />
                            ) : q.questionType === 'TRUE_FALSE' ? (
                              <span className="text-slate-500 font-semibold">
                                A: {q.optionA || 'True – Đúng'} | B: {q.optionB || 'False – Sai'}
                              </span>
                            ) : (
                              <div className="grid grid-cols-2 gap-1">
                                <input
                                  type="text"
                                  value={q.optionA}
                                  onChange={(e) => updateRow(idx, { optionA: e.target.value })}
                                  placeholder="Đáp án A"
                                  className={`px-1.5 py-0.5 rounded border text-[11px] outline-none ${inputBg}`}
                                />
                                <input
                                  type="text"
                                  value={q.optionB}
                                  onChange={(e) => updateRow(idx, { optionB: e.target.value })}
                                  placeholder="Đáp án B"
                                  className={`px-1.5 py-0.5 rounded border text-[11px] outline-none ${inputBg}`}
                                />
                                <input
                                  type="text"
                                  value={q.optionC}
                                  onChange={(e) => updateRow(idx, { optionC: e.target.value })}
                                  placeholder="Đáp án C"
                                  className={`px-1.5 py-0.5 rounded border text-[11px] outline-none ${inputBg}`}
                                />
                                <input
                                  type="text"
                                  value={q.optionD}
                                  onChange={(e) => updateRow(idx, { optionD: e.target.value })}
                                  placeholder="Đáp án D (tùy chọn)"
                                  className={`px-1.5 py-0.5 rounded border text-[11px] outline-none ${inputBg}`}
                                />
                              </div>
                            )}
                          </td>

                          {/* Dropdown chọn Đáp Án Đúng */}
                          <td className="p-1.5 text-center">
                            {q.questionType === 'FILL_IN_THE_BLANK' ? (
                              <span
                                className="px-2 py-1 rounded-lg bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 font-black text-[11px] inline-block truncate max-w-[130px]"
                                title="Không phân biệt chữ HOA / chữ thường"
                              >
                                {q.targetWord || q.correctOptionId || 'Chưa nhập'}
                              </span>
                            ) : q.questionType === 'TRUE_FALSE' ? (
                              <select
                                value={q.correctOptionId === 'B' ? 'B' : 'A'}
                                onChange={(e) =>
                                  updateRow(idx, { correctOptionId: e.target.value })
                                }
                                className={`w-full px-2 py-1.5 rounded-lg border text-[11px] font-black outline-none ${
                                  darkMode
                                    ? 'bg-emerald-950/70 border-emerald-700 text-emerald-300'
                                    : 'bg-emerald-50 border-emerald-400 text-emerald-900'
                                }`}
                              >
                                <option value="A">A — True (Đúng)</option>
                                <option value="B">B — False (Sai)</option>
                              </select>
                            ) : (
                              <select
                                value={
                                  ['A', 'B', 'C', 'D'].includes(q.correctOptionId)
                                    ? q.correctOptionId
                                    : 'A'
                                }
                                onChange={(e) =>
                                  updateRow(idx, { correctOptionId: e.target.value })
                                }
                                className={`w-full px-2 py-1.5 rounded-lg border text-[11px] font-black outline-none ${
                                  darkMode
                                    ? 'bg-emerald-950/70 border-emerald-700 text-emerald-300'
                                    : 'bg-emerald-50 border-emerald-400 text-emerald-900'
                                }`}
                              >
                                <option value="A">Đáp án A</option>
                                <option value="B">Đáp án B</option>
                                <option value="C">Đáp án C</option>
                                {(q.optionD?.trim() || q.correctOptionId === 'D') && (
                                  <option value="D">Đáp án D</option>
                                )}
                              </select>
                            )}
                          </td>

                          {/* Điểm */}
                          <td className="p-1.5 text-center">
                            <input
                              type="number"
                              min={1}
                              max={100}
                              value={q.points}
                              onChange={(e) =>
                                updateRow(idx, {
                                  points: Math.max(1, parseInt(e.target.value, 10) || 10),
                                })
                              }
                              className={`w-14 px-1.5 py-1 rounded-lg border text-center font-mono font-bold text-xs outline-none ${inputBg}`}
                            />
                          </td>

                          {/* Xem trước & Xóa dòng */}
                          <td className="p-1.5 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setPreviewIndex(idx);
                                  setShowLivePreview(true);
                                }}
                                className={`p-1 rounded-lg transition ${
                                  previewIndex === idx && showLivePreview
                                    ? 'bg-indigo-600 text-white'
                                    : 'text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/50'
                                }`}
                                title="Xem trước giao diện câu hỏi này khi lên bài thi"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveRow(idx)}
                                className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                                title="Xóa dòng câu hỏi này"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className={`flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t shrink-0 ${
            darkMode ? 'border-slate-800' : 'border-slate-100'
          }`}
        >
          <div className="text-xs text-slate-500 font-medium text-center sm:text-left">
            {editableRows.length > 0 ? (
              <span>
                Chuẩn bị nhập <b>{editableRows.length} câu hỏi</b> vào{' '}
                <b>{Object.keys(bulkDayCounts).length} ngày thử thách</b>
              </span>
            ) : (
              <span>
                Hãy tải <b>File Excel Mẫu (Có Dropdown .XLS)</b>, tải file lên hoặc bấm{' '}
                <b>Thêm dòng trực tiếp</b> để bắt đầu
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-xl font-bold text-xs ${subCardBg}`}
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={editableRows.length === 0 || bulkLoading}
              onClick={handleExecuteBulkImport}
              className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-xs sm:text-sm shadow-md flex items-center gap-2 transition"
            >
              {bulkLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Đang xử lý & lưu...
                </>
              ) : (
                <>
                  <FileSpreadsheet className="w-4 h-4" />
                  Tiến Hành Nhập {editableRows.length} Câu Hỏi
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

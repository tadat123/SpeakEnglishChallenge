import React, { useState } from 'react';
import {
  AlertCircle,
  Check,
  Download,
  FileSpreadsheet,
  FileUp,
  Loader2,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { appDialog } from '../AppDialogProvider';

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

const BULK_CSV_HEADER =
  'DayNumber,OrderIndex,QuestionType,CategoryLabel,PromptText,StatementText,TargetWord,OptionA,OptionB,OptionC,OptionD,CorrectOption,Explanation,Points,PromptAudioUrl,PromptVideoUrl';

const BULK_SAMPLE_ROWS = [
  '1,1,CHOOSE_AUDIO,Phát âm chuẩn,"Từ ""Approval"" được phát âm như thế nào? Nghe các phương án và chọn cách phát âm chuẩn nhất.",,/əˈpruːvəl/,Approval,Approval (sai trọng âm),Approval (sai âm cuối),,A,"Từ \'Approval\' có trọng âm rơi vào âm tiết thứ 2 (/əˈpruːvəl/).",10,,',
  '1,2,TRUE_FALSE,True / False,"Nghe câu sau và xác định nhận định là Đúng hay Sai:","\'Schedule\' chỉ có 1 cách phát âm duy nhất trong tiếng Anh quốc tế.",schedule,True – Đúng,False – Sai,,,B,"Sai vì từ \'schedule\' có 2 cách đọc chuẩn: /ˈskedʒuːl/ (Mỹ) và /ˈʃedʒuːl/ (Anh).",10,,',
  '1,3,LISTEN_AND_CHOOSE,Nghe & Chọn đáp án,"Nghe đoạn âm thanh sau và chọn từ được nhắc tới trong ngữ cảnh công việc.",,collaboration,collaboration,corporation,celebration,,A,"Từ được phát âm trong đoạn audio là \'collaboration\' (sự hợp tác).",10,,',
  '1,4,VOCAB_MEANING,Từ vựng công sở,"Trong môi trường doanh nghiệp, từ viết tắt \'KPI\' có nghĩa là gì?",,KPI,Key Performance Indicator,Knowledge Process Integration,Key Project Initiative,Key Product Index,A,"KPI là viết tắt của Key Performance Indicator (Chỉ số đo lường hiệu quả công việc cốt lõi).",10,,',
  '1,5,FILL_IN_THE_BLANK,Điền từ vựng,"Điền từ tiếng Anh tương ứng với định nghĩa và phiên âm sau:","/ˌrekəˈmend/ (Đưa ra gợi ý, giới thiệu giải pháp)",recommend,,,,recommend,"Từ đúng chính tả là \'recommend\' (2 chữ \'m\' và 1 chữ \'c\').",10,,',
  '2,1,LISTEN_AND_CHOOSE,Phát âm công sở,"Chọn cách phát âm đúng của từ ""Deadline"".",,deadline,Deadline (/ˈdedlaɪn/),Dead line (/ded ˈlaɪn/),Deline (/ˈdiːlaɪn/),,A,"Trọng âm rơi vào âm tiết đầu tiên /ˈdedlaɪn/.",10,,',
];

function parseBulkText(
  text: string,
  bulkTargetMode: 'auto' | 'current',
  selectedDay: number,
  maxDayCap: number
) {
  const clean = text.trim();
  if (!clean) return { parsedList: [], errors: [], dayCounts: {} as Record<number, number> };

  const firstLine = clean.split(/\r?\n/)[0];
  let delimiter = ',';
  if (firstLine.includes('\t')) delimiter = '\t';
  else if (!firstLine.includes(',') && firstLine.includes(';')) delimiter = ';';

  const lines: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let insideQuotes = false;

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    const nextChar = clean[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentField += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === delimiter && !insideQuotes) {
      currentRow.push(currentField.trim());
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(currentField.trim());
      if (currentRow.some((f) => f.length > 0)) {
        lines.push(currentRow);
      }
      currentRow = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((f) => f.length > 0)) {
      lines.push(currentRow);
    }
  }

  if (lines.length === 0) {
    return {
      parsedList: [],
      errors: ['Dữ liệu rỗng.'],
      dayCounts: {} as Record<number, number>,
    };
  }

  const header = lines[0].map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
  const hasHeader = header.some(
    (h) =>
      h.includes('day') ||
      h.includes('prompt') ||
      h.includes('question') ||
      h.includes('option') ||
      h.includes('type')
  );

  const dataRows = hasHeader ? lines.slice(1) : lines;

  const headerMap: Record<string, number> = {};
  if (hasHeader) {
    lines[0].forEach((col, idx) => {
      const key = col.toLowerCase().replace(/[^a-z0-9]/g, '');
      headerMap[key] = idx;
    });
  }

  const getCol = (row: string[], colName: string, defaultIdx: number): string => {
    if (hasHeader) {
      for (const key of Object.keys(headerMap)) {
        if (key.includes(colName)) {
          return row[headerMap[key]] ?? '';
        }
      }
    }
    return row[defaultIdx] ?? '';
  };

  const parsedList: any[] = [];
  const errors: string[] = [];
  const dayCounts: Record<number, number> = {};

  dataRows.forEach((cols, idx) => {
    const lineNum = hasHeader ? idx + 2 : idx + 1;
    const rawDay = parseInt(getCol(cols, 'day', 0), 10);
    const dayNumber =
      !isNaN(rawDay) && rawDay >= 1 && rawDay <= maxDayCap
        ? rawDay
        : bulkTargetMode === 'current'
        ? selectedDay
        : 1;
    const orderIndex = parseInt(getCol(cols, 'order', 1), 10) || idx + 1;
    const questionType = getCol(cols, 'type', 2) || 'LISTEN_AND_CHOOSE';
    const categoryLabel = getCol(cols, 'cat', 3);
    const promptText = getCol(cols, 'prompt', 4);
    const statementText = getCol(cols, 'statement', 5);
    const targetWord = getCol(cols, 'target', 6);
    const optionA = getCol(cols, 'optiona', 7);
    const optionB = getCol(cols, 'optionb', 8);
    const optionC = getCol(cols, 'optionc', 9);
    const optionD = getCol(cols, 'optiond', 10);
    const correctOptionId = getCol(cols, 'correct', 11) || 'A';
    const explanation = getCol(cols, 'explanation', 12);
    const points = parseInt(getCol(cols, 'points', 13), 10) || 10;
    const promptAudioUrl = getCol(cols, 'audiourl', 14);
    const promptVideoUrl = getCol(cols, 'videourl', 15);

    if (!promptText.trim()) {
      errors.push(`Dòng ${lineNum}: Thiếu nội dung câu hỏi (PromptText).`);
      return;
    }

    const rowTargetDay = bulkTargetMode === 'current' ? selectedDay : dayNumber;
    dayCounts[rowTargetDay] = (dayCounts[rowTargetDay] || 0) + 1;

    parsedList.push({
      lineNum,
      dayNumber: rowTargetDay,
      orderIndex,
      questionType,
      categoryLabel,
      promptText,
      statementText,
      targetWord,
      optionA,
      optionB,
      optionC,
      optionD,
      correctOptionId,
      explanation,
      points,
      promptAudioUrl,
      promptVideoUrl,
    });
  });

  return { parsedList, errors, dayCounts };
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

  if (!show) return null;

  const {
    parsedList: bulkParsedQuestions,
    errors: bulkParseErrors,
    dayCounts: bulkDayCounts,
  } = parseBulkText(bulkRawText, bulkTargetMode, selectedDay, Math.max(90, totalDays || 30));

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
    if (bulkParsedQuestions.length === 0) {
      showMessage('Chưa có câu hỏi hợp lệ nào để nhập!', true);
      return;
    }

    const affectedDaysList = Object.keys(bulkDayCounts)
      .map(Number)
      .sort((a, b) => a - b);
    const confirmMsg =
      bulkWriteMode === 'overwrite'
        ? `⚠️ CẢNH BÁO: Chế độ GHI ĐÈ sẽ XÓA TOÀN BỘ câu hỏi cũ của các ngày (${affectedDaysList
            .map((d) => `Day ${d}`)
            .join(', ')}) và thay bằng ${
            bulkParsedQuestions.length
          } câu hỏi mới.\n\nBạn có chắc chắn muốn tiến hành?`
        : `Bạn có muốn nhập ${bulkParsedQuestions.length} câu hỏi vào các ngày (${affectedDaysList
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
          questions: bulkParsedQuestions,
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
        className={`w-full max-w-4xl rounded-3xl p-4 sm:p-6 shadow-2xl border space-y-4 my-auto max-h-[94vh] flex flex-col ${cardBg}`}
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
                Nhập Đề Thi (Excel / CSV)
              </h3>
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
                onClick={handleDownloadTemplate}
                className="px-3 py-1.5 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/70 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-1.5 transition shadow-xs"
              >
                <Download className="w-3.5 h-3.5" /> File Mẫu (.CSV)
              </button>

              <label className="px-3 py-1.5 rounded-xl border border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/70 text-blue-800 dark:text-blue-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition shadow-xs">
                <FileUp className="w-3.5 h-3.5" /> Tải Lên File
                <input
                  type="file"
                  accept=".csv,.tsv,.txt"
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
            </div>

            {bulkRawText.length > 0 && (
              <button
                type="button"
                onClick={() => setBulkRawText('')}
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
                    Theo cột <b>DayNumber</b> trong file
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
                    Chỉ nhập vào <b>Day {selectedDay}</b>
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
            <div className="flex items-center justify-end">
              <span className="text-[11px] font-mono text-slate-400">
                {bulkRawText.split(/\r?\n/).filter((l) => l.trim()).length} dòng dữ liệu
              </span>
            </div>
            <textarea
              value={bulkRawText}
              onChange={(e) => setBulkRawText(e.target.value)}
              rows={6}
              placeholder="Dán nội dung từ bảng Excel hoặc file CSV vào đây..."
              className={`w-full px-3.5 py-2.5 rounded-2xl border font-mono text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-emerald-500 ${inputBg}`}
            />
          </div>

          {/* Báo cáo trạng thái Parsing & Validation */}
          {bulkRawText.trim().length > 0 && (
            <div className="space-y-2.5">
              {bulkParseErrors.length > 0 && (
                <div className="p-3 rounded-2xl border border-rose-300 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 text-xs space-y-1">
                  <div className="font-black flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-rose-500" />
                    Có {bulkParseErrors.length} dòng dữ liệu bị lỗi cần chỉnh sửa:
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px] max-h-24 overflow-y-auto">
                    {bulkParseErrors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800">
                <span className="text-xs font-black text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-600" />
                  Nhận diện hợp lệ: {bulkParsedQuestions.length} câu hỏi
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
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

              {bulkParsedQuestions.length > 0 && (
                <div className="border rounded-2xl overflow-hidden max-h-52 overflow-y-auto shadow-inner">
                  <table className="w-full text-left text-xs">
                    <thead
                      className={`sticky top-0 z-10 text-[10px] uppercase font-black tracking-wider border-b ${
                        darkMode
                          ? 'bg-slate-800 text-slate-300 border-slate-700'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      <tr>
                        <th className="p-2 text-center">Day</th>
                        <th className="p-2 text-center">#</th>
                        <th className="p-2">Dạng câu</th>
                        <th className="p-2">Nội dung câu hỏi (Prompt)</th>
                        <th className="p-2">Đáp án A / B / C / D</th>
                        <th className="p-2 text-center">Đ/Án Đúng</th>
                        <th className="p-2 text-center">Điểm</th>
                      </tr>
                    </thead>
                    <tbody
                      className={`divide-y ${
                        darkMode ? 'divide-slate-800 text-slate-200' : 'divide-slate-100 text-slate-700'
                      }`}
                    >
                      {bulkParsedQuestions.map((q, idx) => (
                        <tr key={idx} className="hover:bg-blue-50/50 dark:hover:bg-slate-800/50 transition">
                          <td className="p-2 text-center font-bold text-blue-600 dark:text-blue-400">
                            Day {q.dayNumber}
                          </td>
                          <td className="p-2 text-center font-bold text-slate-400">{q.orderIndex}</td>
                          <td className="p-2">
                            <span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-[10px] font-black">
                              {q.questionType}
                            </span>
                          </td>
                          <td className="p-2 max-w-xs truncate" title={q.promptText}>
                            {q.promptText}
                          </td>
                          <td className="p-2 max-w-xs truncate text-[11px] text-slate-500">
                            {q.questionType === 'FILL_IN_THE_BLANK'
                              ? `Từ điền: ${q.targetWord || q.correctOptionId}`
                              : [q.optionA, q.optionB, q.optionC, q.optionD]
                                  .filter(Boolean)
                                  .join(' | ')}
                          </td>
                          <td className="p-2 text-center">
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-black text-[11px]">
                              {q.correctOptionId}
                            </span>
                          </td>
                          <td className="p-2 text-center font-mono font-bold">{q.points}</td>
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
            {bulkParsedQuestions.length > 0 ? (
              <span>
                Chuẩn bị nhập <b>{bulkParsedQuestions.length} câu hỏi</b> vào{' '}
                <b>{Object.keys(bulkDayCounts).length} ngày thử thách</b>
              </span>
            ) : (
              <span>Hãy tải file mẫu hoặc dán các ô từ Excel để bắt đầu</span>
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
              disabled={bulkParsedQuestions.length === 0 || bulkLoading}
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
                  Tiến Hành Nhập {bulkParsedQuestions.length} Câu Hỏi
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

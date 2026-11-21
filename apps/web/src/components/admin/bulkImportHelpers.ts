export type BulkQuestionType =
  | 'CHOOSE_AUDIO'
  | 'TRUE_FALSE'
  | 'LISTEN_AND_CHOOSE'
  | 'VOCAB_MEANING'
  | 'FILL_IN_THE_BLANK';

export interface BulkParsedQuestionRow {
  lineNum: number;
  dayNumber: number;
  orderIndex: number;
  questionType: BulkQuestionType;
  categoryLabel: string;
  promptText: string;
  statementText: string;
  targetWord: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOptionId: string;
  explanation: string;
  points: number;
  promptAudioUrl: string;
  promptVideoUrl: string;
}

export const QUESTION_TYPE_OPTIONS: Array<{
  value: BulkQuestionType;
  label: string;
  shortLabel: string;
  defaultCategory: string;
}> = [
  {
    value: 'CHOOSE_AUDIO',
    label: '1. Nghe 3 Loa ở Đáp án A/B/C (CHOOSE_AUDIO)',
    shortLabel: '3 Loa ở Đáp án',
    defaultCategory: 'Chọn Audio phát âm chuẩn',
  },
  {
    value: 'TRUE_FALSE',
    label: '2. Đúng / Sai — Loa ở Đề bài (TRUE_FALSE)',
    shortLabel: 'True / False',
    defaultCategory: 'True / False (Đúng/Sai)',
  },
  {
    value: 'LISTEN_AND_CHOOSE',
    label: '3. Loa ở Đề bài & Chọn chữ A/B/C (LISTEN_AND_CHOOSE)',
    shortLabel: 'Loa Đề + Chọn A/B/C',
    defaultCategory: 'Nghe & Chọn đáp án',
  },
  {
    value: 'VOCAB_MEANING',
    label: '4. Trắc nghiệm Nghĩa từ — Không Loa (VOCAB_MEANING)',
    shortLabel: 'Nghĩa từ vựng',
    defaultCategory: 'Nghĩa từ vựng & Viết tắt',
  },
  {
    value: 'FILL_IN_THE_BLANK',
    label: '5. Điền từ vựng — Gõ chữ (FILL_IN_THE_BLANK)',
    shortLabel: 'Điền từ vựng',
    defaultCategory: 'Điền từ chính xác',
  },
];

export const BULK_CSV_HEADER =
  'DayNumber,OrderIndex,QuestionType,CategoryLabel,PromptText,StatementText,TargetWord,OptionA,OptionB,OptionC,OptionD,CorrectOption,Explanation,Points,PromptAudioUrl,PromptVideoUrl';

export const BULK_SAMPLE_ROWS = [
  '1,1,CHOOSE_AUDIO,Phát âm chuẩn,"Từ ""Approval"" được phát âm như thế nào? Nghe các phương án và chọn cách phát âm chuẩn nhất.",,Approval,Approval,Approval (sai trọng âm),Approval (sai âm cuối),,A,"Từ \'Approval\' có trọng âm rơi vào âm tiết thứ 2 (/əˈpruːvəl/).",10,,',
  '1,2,TRUE_FALSE,True / False,"Nghe câu sau và xác định nhận định là Đúng hay Sai:","\'Schedule\' chỉ có 1 cách phát âm duy nhất trong tiếng Anh quốc tế.",schedule,True – Đúng,False – Sai,,,B,"Sai vì từ \'schedule\' có 2 cách đọc chuẩn: /ˈskedʒuːl/ (Mỹ) và /ˈʃedʒuːl/ (Anh).",10,,',
  '1,3,LISTEN_AND_CHOOSE,Nghe & Chọn đáp án,"Nghe đoạn âm thanh sau và chọn từ được nhắc tới trong ngữ cảnh công việc.",,collaboration,collaboration,corporation,celebration,,A,"Từ được phát âm trong đoạn audio là \'collaboration\' (sự hợp tác).",10,,',
  '1,4,VOCAB_MEANING,Từ vựng công sở,"Trong môi trường doanh nghiệp, từ viết tắt \'KPI\' có nghĩa là gì?",,KPI,Key Performance Indicator,Knowledge Process Integration,Key Project Initiative,Key Product Index,A,"KPI là viết tắt của Key Performance Indicator (Chỉ số đo lường hiệu quả công việc cốt lõi).",10,,',
  '1,5,FILL_IN_THE_BLANK,Điền từ vựng,"Điền từ tiếng Anh tương ứng với định nghĩa và phiên âm sau:","/ˈfiːdbæk/ (Ý kiến phản hồi, nhận xét)",Feedback,,,,,Feedback,"Từ cần điền là Feedback (không phân biệt chữ HOA / chữ thường).",10,,',
  '2,1,LISTEN_AND_CHOOSE,Phát âm công sở,"Chọn cách phát âm đúng của từ ""Deadline"".",,deadline,Deadline (/ˈdedlaɪn/),Dead line (/ded ˈlaɪn/),Deline (/ˈdiːlaɪn/),,A,"Trọng âm rơi vào âm tiết đầu tiên /ˈdedlaɪn/.",10,,',
];

/** Chuẩn hóa mã loại câu hỏi từ dữ liệu người dùng gõ hoặc chọn trong Excel/CSV */
export function normalizeBulkQuestionType(raw: string): BulkQuestionType {
  const s = String(raw || '')
    .trim()
    .toUpperCase();
  if (!s) return 'LISTEN_AND_CHOOSE';

  if (
    s === '1' ||
    s.includes('CHOOSE_AUDIO') ||
    s.includes('CHON_AUDIO') ||
    s.includes('CHỌN AUDIO') ||
    s === 'AUDIO'
  ) {
    return 'CHOOSE_AUDIO';
  }
  if (
    s === '2' ||
    s.includes('TRUE_FALSE') ||
    s.includes('TRUE/FALSE') ||
    s === 'TF' ||
    s.includes('ĐÚNG/SAI') ||
    s.includes('DUNG/SAI') ||
    s.includes('ĐÚNG SAI')
  ) {
    return 'TRUE_FALSE';
  }
  if (
    s === '4' ||
    s.includes('VOCAB') ||
    s.includes('MEANING') ||
    s.includes('NGHĨA') ||
    s.includes('NGHIA') ||
    s.includes('VIẾT TẮT')
  ) {
    return 'VOCAB_MEANING';
  }
  if (
    s === '5' ||
    s.includes('FILL') ||
    s.includes('BLANK') ||
    s.includes('ĐIỀN TỪ') ||
    s.includes('DIEN TU') ||
    s.includes('ĐIỀN')
  ) {
    return 'FILL_IN_THE_BLANK';
  }
  return 'LISTEN_AND_CHOOSE';
}

/** Chuẩn hóa đáp án đúng (A/B/C/D, True/False, hoặc từ điền) để tránh lỗi gõ nhầm trong CSV */
export function normalizeBulkCorrectOption(
  questionType: BulkQuestionType,
  rawCorrect: string,
  targetWord: string,
  options: { optionA: string; optionB: string; optionC: string; optionD: string }
): { correctOptionId: string; targetWord: string } {
  const cleanCorr = String(rawCorrect || '').trim();
  const cleanTarget = String(targetWord || '').trim();

  if (questionType === 'FILL_IN_THE_BLANK') {
    const fillWord =
      cleanTarget ||
      (!['A', 'B', 'C', 'D'].includes(cleanCorr.toUpperCase()) ? cleanCorr : '') ||
      cleanCorr;
    return {
      targetWord: fillWord,
      correctOptionId: fillWord.toLowerCase(),
    };
  }

  if (questionType === 'TRUE_FALSE') {
    const upper = cleanCorr.toUpperCase();
    const isFalse =
      upper === 'B' ||
      upper === '2' ||
      upper === '0' ||
      upper.includes('FALSE') ||
      upper.includes('SAI') ||
      upper === 'F' ||
      upper === 'NO';
    return {
      targetWord: cleanTarget,
      correctOptionId: isFalse ? 'B' : 'A',
    };
  }

  // Các dạng câu trắc nghiệm A / B / C / D
  const upper = cleanCorr
    .toUpperCase()
    .replace(/^(OPTION|ĐÁP ÁN|DAP AN|CÂU|CAU)\s+/i, '')
    .trim();

  if (['A', 'B', 'C', 'D'].includes(upper)) {
    return { targetWord: cleanTarget, correctOptionId: upper };
  }
  if (upper === '1') return { targetWord: cleanTarget, correctOptionId: 'A' };
  if (upper === '2') return { targetWord: cleanTarget, correctOptionId: 'B' };
  if (upper === '3') return { targetWord: cleanTarget, correctOptionId: 'C' };
  if (upper === '4') return { targetWord: cleanTarget, correctOptionId: 'D' };

  // Trường hợp người dùng gõ nhầm nội dung đáp án vào cột CorrectOption thay vì gõ A/B/C/D
  const lowerCorr = cleanCorr.toLowerCase();
  if (lowerCorr) {
    if (options.optionA && options.optionA.trim().toLowerCase() === lowerCorr) {
      return { targetWord: cleanTarget, correctOptionId: 'A' };
    }
    if (options.optionB && options.optionB.trim().toLowerCase() === lowerCorr) {
      return { targetWord: cleanTarget, correctOptionId: 'B' };
    }
    if (options.optionC && options.optionC.trim().toLowerCase() === lowerCorr) {
      return { targetWord: cleanTarget, correctOptionId: 'C' };
    }
    if (options.optionD && options.optionD.trim().toLowerCase() === lowerCorr) {
      return { targetWord: cleanTarget, correctOptionId: 'D' };
    }
  }

  return { targetWord: cleanTarget, correctOptionId: 'A' };
}

function detectCsvDelimiter(firstLine: string): string {
  let tabCount = 0;
  let commaCount = 0;
  let semiCount = 0;
  let inQuotes = false;

  for (let i = 0; i < firstLine.length; i++) {
    const ch = firstLine[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (!inQuotes) {
      if (ch === '\t') tabCount++;
      else if (ch === ',') commaCount++;
      else if (ch === ';') semiCount++;
    }
  }

  if (tabCount >= 2 && tabCount >= commaCount && tabCount >= semiCount) return '\t';
  if (semiCount > commaCount) return ';';
  return ',';
}

function extractLinesFromExcelXml(xmlText: string): string[][] | null {
  if (!xmlText.includes('<Workbook') && !xmlText.includes('<Worksheet') && !xmlText.includes('<Table')) {
    return null;
  }
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'text/xml');
    const rowNodes = Array.from(doc.getElementsByTagName('Row'));
    if (rowNodes.length === 0) return null;

    const rows: string[][] = [];
    for (const rowNode of rowNodes) {
      const cellNodes = Array.from(rowNode.getElementsByTagName('Cell'));
      const rowValues: string[] = [];
      for (const cell of cellNodes) {
        const indexAttr = cell.getAttribute('ss:Index') || cell.getAttribute('Index');
        if (indexAttr) {
          const targetIdx = Math.max(0, parseInt(indexAttr, 10) - 1);
          while (rowValues.length < targetIdx) {
            rowValues.push('');
          }
        }
        const dataNode = cell.getElementsByTagName('Data')[0];
        rowValues.push((dataNode?.textContent ?? cell.textContent ?? '').trim());
      }
      if (rowValues.some((v) => v.length > 0)) {
        rows.push(rowValues);
      }
    }
    return rows.length > 0 ? rows : null;
  } catch {
    return null;
  }
}

export function parseBulkText(
  text: string,
  bulkTargetMode: 'auto' | 'current',
  selectedDay: number,
  maxDayCap: number
): {
  parsedList: BulkParsedQuestionRow[];
  errors: string[];
  dayCounts: Record<number, number>;
} {
  const clean = text.replace(/^\uFEFF/, '').trim();
  if (!clean) return { parsedList: [], errors: [], dayCounts: {} };

  const xmlLines = extractLinesFromExcelXml(clean);
  const lines: string[][] = [];

  if (xmlLines) {
    lines.push(...xmlLines);
  } else {
    const firstLine = clean.split(/\r?\n/)[0] || '';
    const delimiter = detectCsvDelimiter(firstLine);

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
  }

  if (lines.length === 0) {
    return {
      parsedList: [],
      errors: ['Dữ liệu rỗng.'],
      dayCounts: {},
    };
  }

  const header = lines[0].map((h) => h.replace(/^\uFEFF/, '').toLowerCase().replace(/[^a-z0-9]/g, ''));
  const hasHeader = header.some(
    (h) =>
      h === 'daynumber' ||
      h === 'day' ||
      h.includes('prompt') ||
      h.includes('questiontype') ||
      h === 'optiona'
  );

  const dataRows = hasHeader ? lines.slice(1) : lines;

  const headerMap: Record<string, number> = {};
  if (hasHeader) {
    header.forEach((key, idx) => {
      if (key && headerMap[key] === undefined) {
        headerMap[key] = idx;
      }
    });
  }

  const getCol = (row: string[], aliases: string[], defaultIdx: number): string => {
    if (hasHeader) {
      for (const alias of aliases) {
        if (headerMap[alias] !== undefined) {
          return row[headerMap[alias]] ?? '';
        }
      }
      for (const alias of aliases) {
        for (const key of Object.keys(headerMap)) {
          if (key.includes(alias)) {
            return row[headerMap[key]] ?? '';
          }
        }
      }
    }
    return row[defaultIdx] ?? '';
  };

  const parsedList: BulkParsedQuestionRow[] = [];
  const errors: string[] = [];
  const dayCounts: Record<number, number> = {};

  dataRows.forEach((cols, idx) => {
    const lineNum = hasHeader ? idx + 2 : idx + 1;
    const rawDay = parseInt(getCol(cols, ['daynumber', 'day', 'ngay'], 0), 10);
    const dayNumber =
      !isNaN(rawDay) && rawDay >= 1 && rawDay <= maxDayCap
        ? rawDay
        : bulkTargetMode === 'current'
        ? selectedDay
        : 1;
    const orderIndex = parseInt(getCol(cols, ['orderindex', 'order', 'stt'], 1), 10) || idx + 1;
    const rawType = getCol(cols, ['questiontype', 'type', 'loaicau', 'dangcau'], 2);
    const questionType = normalizeBulkQuestionType(rawType);

    const typeMeta = QUESTION_TYPE_OPTIONS.find((t) => t.value === questionType);
    const categoryLabel =
      getCol(cols, ['categorylabel', 'category', 'cat', 'chude'], 3) ||
      typeMeta?.defaultCategory ||
      'Câu hỏi tùy chỉnh';
    const promptText = getCol(cols, ['prompttext', 'prompt', 'noidung', 'question'], 4);
    const statementText = getCol(cols, ['statementtext', 'statement', 'nhandinh', 'phienam'], 5);
    const rawTargetWord = getCol(cols, ['targetword', 'target', 'tucandien', 'tuvung'], 6);
    let optionA = getCol(cols, ['optiona', 'dapana'], 7);
    let optionB = getCol(cols, ['optionb', 'dapanb'], 8);
    const optionC = getCol(cols, ['optionc', 'dapanc'], 9);
    const optionD = getCol(cols, ['optiond', 'dapand'], 10);
    const rawCorrect = getCol(cols, ['correctoption', 'correctoptionid', 'correct', 'dapandung'], 11);

    if (questionType === 'TRUE_FALSE') {
      if (!optionA.trim()) optionA = 'True – Đúng';
      if (!optionB.trim()) optionB = 'False – Sai';
    }

    const normalized = normalizeBulkCorrectOption(questionType, rawCorrect, rawTargetWord, {
      optionA,
      optionB,
      optionC,
      optionD,
    });

    const explanation = getCol(cols, ['explanation', 'giaithich'], 12);
    const points = parseInt(getCol(cols, ['points', 'point', 'diem'], 13), 10) || 10;
    const promptAudioUrl = getCol(cols, ['promptaudiourl', 'audiourl', 'audio'], 14);
    const promptVideoUrl = getCol(cols, ['promptvideourl', 'videourl', 'video'], 15);

    if (!promptText.trim()) {
      errors.push(`Dòng ${lineNum}: Thiếu nội dung câu hỏi (PromptText).`);
      return;
    }

    if (questionType === 'FILL_IN_THE_BLANK' && !normalized.targetWord.trim()) {
      errors.push(`Dòng ${lineNum}: Câu điền từ (FILL_IN_THE_BLANK) chưa có từ đáp án (TargetWord / CorrectOption).`);
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
      targetWord: normalized.targetWord,
      optionA,
      optionB,
      optionC,
      optionD,
      correctOptionId: normalized.correctOptionId,
      explanation,
      points,
      promptAudioUrl,
      promptVideoUrl,
    });
  });

  return { parsedList, errors, dayCounts };
}

/**
 * Tạo nội dung file Excel XML (.xls) có sẵn Dropdown (Data Validation) ở cột QuestionType và CorrectOption
 * để người dùng mở bằng Microsoft Excel có thể bấm chọn từ danh sách thả xuống mà không sợ gõ nhầm.
 */
export function buildExcelXmlWithDropdowns(): string {
  const esc = (s: string) =>
    String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const parsedSample = parseBulkText(
    [BULK_CSV_HEADER, ...BULK_SAMPLE_ROWS].join('\n'),
    'auto',
    1,
    90
  ).parsedList;

  const headers = BULK_CSV_HEADER.split(',');

  const headerCells = headers
    .map((h) => `<Cell ss:StyleID="sHeader"><Data ss:Type="String">${esc(h)}</Data></Cell>`)
    .join('');

  const dataRowsXml = parsedSample
    .map((r) => {
      const cols = [
        { v: String(r.dayNumber), t: 'Number' },
        { v: String(r.orderIndex), t: 'Number' },
        { v: r.questionType, t: 'String' },
        { v: r.categoryLabel, t: 'String' },
        { v: r.promptText, t: 'String' },
        { v: r.statementText, t: 'String' },
        { v: r.targetWord, t: 'String' },
        { v: r.optionA, t: 'String' },
        { v: r.optionB, t: 'String' },
        { v: r.optionC, t: 'String' },
        { v: r.optionD, t: 'String' },
        { v: r.correctOptionId, t: 'String' },
        { v: r.explanation, t: 'String' },
        { v: String(r.points || 10), t: 'Number' },
        { v: r.promptAudioUrl, t: 'String' },
        { v: r.promptVideoUrl, t: 'String' },
      ];
      return `<Row>${cols
        .map((c) => `<Cell><Data ss:Type="${c.t}">${esc(c.v)}</Data></Cell>`)
        .join('')}</Row>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Font ss:FontName="Calibri" ss:Size="11"/>
  </Style>
  <Style ss:ID="sHeader">
   <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#059669" ss:Pattern="Solid"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="Questions">
  <Table>
   <Row>${headerCells}</Row>
   ${dataRowsXml}
  </Table>
  <DataValidation xmlns="urn:schemas-microsoft-com:office:excel">
   <Range>R2C3:R500C3</Range>
   <Type>List</Type>
   <CellRangeList/>
   <Value>&quot;CHOOSE_AUDIO,TRUE_FALSE,LISTEN_AND_CHOOSE,VOCAB_MEANING,FILL_IN_THE_BLANK&quot;</Value>
  </DataValidation>
  <DataValidation xmlns="urn:schemas-microsoft-com:office:excel">
   <Range>R2C12:R500C12</Range>
   <Type>List</Type>
   <CellRangeList/>
   <Value>&quot;A,B,C,D&quot;</Value>
  </DataValidation>
 </Worksheet>
</Workbook>`;
}

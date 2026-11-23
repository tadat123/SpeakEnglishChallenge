/**
 * Bộ tạo và đọc file Excel chuẩn OpenXML (.xlsx - Binary ZIP) không cần thư viện ngoài.
 * - Tạo file .xlsx thật 100% có sẵn Data Validation Dropdown ở cột QuestionType (C2:C500) & CorrectOption (L2:L500).
 * - Đọc trực tiếp file .xlsx do Microsoft Excel / Google Sheets lưu (hỗ trợ cả SharedStrings, InlineStr & Deflate-Raw).
 */

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC32_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function escapeXml(str: string): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function colIndexToLetter(colIdx: number): string {
  let n = colIdx + 1;
  let s = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function colRefToIndex(cellRef: string): number {
  const match = /^([A-Z]+)/i.exec(cellRef.trim());
  if (!match) return -1;
  const letters = match[1].toUpperCase();
  let idx = 0;
  for (let i = 0; i < letters.length; i++) {
    idx = idx * 26 + (letters.charCodeAt(i) - 64);
  }
  return idx - 1;
}

/** Đóng gói danh sách file XML thành file ZIP (.xlsx) chuẩn Open Packaging Conventions */
function createZipArchive(files: Array<{ name: string; content: string }>): Uint8Array {
  const encoder = new TextEncoder();
  const entries = files.map((f) => {
    const nameBytes = encoder.encode(f.name);
    const dataBytes = encoder.encode(f.content);
    const crc = crc32(dataBytes);
    return { nameBytes, dataBytes, crc };
  });

  let localTotalSize = 0;
  let centralTotalSize = 0;
  for (const e of entries) {
    localTotalSize += 30 + e.nameBytes.length + e.dataBytes.length;
    centralTotalSize += 46 + e.nameBytes.length;
  }

  const totalSize = localTotalSize + centralTotalSize + 22;
  const out = new Uint8Array(totalSize);
  const view = new DataView(out.buffer);

  let localOffset = 0;
  const localOffsets: number[] = [];

  for (const e of entries) {
    localOffsets.push(localOffset);
    view.setUint32(localOffset, 0x04034b50, true); // Local file header signature
    view.setUint16(localOffset + 4, 20, true); // Version needed to extract (2.0)
    view.setUint16(localOffset + 6, 0, true); // General purpose bit flag
    view.setUint16(localOffset + 8, 0, true); // Compression method (0 = STORE)
    view.setUint16(localOffset + 10, 0x0000, true); // File last modification time
    view.setUint16(localOffset + 12, 0x5961, true); // File last modification date
    view.setUint32(localOffset + 14, e.crc, true); // CRC-32
    view.setUint32(localOffset + 18, e.dataBytes.length, true); // Compressed size
    view.setUint32(localOffset + 22, e.dataBytes.length, true); // Uncompressed size
    view.setUint16(localOffset + 26, e.nameBytes.length, true); // File name length
    view.setUint16(localOffset + 28, 0, true); // Extra field length

    out.set(e.nameBytes, localOffset + 30);
    out.set(e.dataBytes, localOffset + 30 + e.nameBytes.length);
    localOffset += 30 + e.nameBytes.length + e.dataBytes.length;
  }

  let centralOffset = localOffset;
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    view.setUint32(centralOffset, 0x02014b50, true); // Central directory file header signature
    view.setUint16(centralOffset + 4, 20, true); // Version made by
    view.setUint16(centralOffset + 6, 20, true); // Version needed to extract
    view.setUint16(centralOffset + 8, 0, true); // General purpose bit flag
    view.setUint16(centralOffset + 10, 0, true); // Compression method (0 = STORE)
    view.setUint16(centralOffset + 12, 0x0000, true); // Last mod file time
    view.setUint16(centralOffset + 14, 0x5961, true); // Last mod file date
    view.setUint32(centralOffset + 16, e.crc, true); // CRC-32
    view.setUint32(centralOffset + 20, e.dataBytes.length, true); // Compressed size
    view.setUint32(centralOffset + 24, e.dataBytes.length, true); // Uncompressed size
    view.setUint16(centralOffset + 28, e.nameBytes.length, true); // File name length
    view.setUint16(centralOffset + 30, 0, true); // Extra field length
    view.setUint16(centralOffset + 32, 0, true); // File comment length
    view.setUint16(centralOffset + 34, 0, true); // Disk number start
    view.setUint16(centralOffset + 36, 0, true); // Internal file attributes
    view.setUint32(centralOffset + 38, 0, true); // External file attributes
    view.setUint32(centralOffset + 42, localOffsets[i], true); // Relative offset of local header

    out.set(e.nameBytes, centralOffset + 46);
    centralOffset += 46 + e.nameBytes.length;
  }

  // End of central directory record (EOCD)
  view.setUint32(centralOffset, 0x06054b50, true);
  view.setUint16(centralOffset + 4, 0, true); // Number of this disk
  view.setUint16(centralOffset + 6, 0, true); // Disk where central directory starts
  view.setUint16(centralOffset + 8, entries.length, true); // Number of central directory records on this disk
  view.setUint16(centralOffset + 10, entries.length, true); // Total number of central directory records
  view.setUint32(centralOffset + 12, centralTotalSize, true); // Size of central directory
  view.setUint32(centralOffset + 16, localOffset, true); // Offset of start of central directory
  view.setUint16(centralOffset + 20, 0, true); // Comment length

  return out;
}

export interface XlsxTemplateRow {
  dayNumber: number;
  orderIndex: number;
  questionType: string;
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

/**
 * Tạo file .xlsx thật 100% (OpenXML) có sẵn Data Validation Dropdown ở cột C (QuestionType) và cột L (CorrectOption)
 */
export function buildRealXlsxWithDropdowns(
  headers: string[],
  sampleRows: XlsxTemplateRow[]
): Uint8Array {
  const colWidths = [11, 11, 24, 22, 46, 36, 18, 24, 24, 24, 20, 15, 42, 10, 25, 25];
  const colsXml = `<cols>${colWidths
    .map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`)
    .join('')}</cols>`;

  const headerCellsXml = headers
    .map((h, colIdx) => {
      const ref = `${colIndexToLetter(colIdx)}1`;
      return `<c r="${ref}" s="1" t="inlineStr"><is><t>${escapeXml(h)}</t></is></c>`;
    })
    .join('');

  const dataRowsXml = sampleRows
    .map((r, idx) => {
      const rowNum = idx + 2;
      const values: Array<{ v: string | number; isNum?: boolean }> = [
        { v: r.dayNumber, isNum: true },
        { v: r.orderIndex, isNum: true },
        { v: r.questionType },
        { v: r.categoryLabel },
        { v: r.promptText },
        { v: r.statementText },
        { v: r.targetWord },
        { v: r.optionA },
        { v: r.optionB },
        { v: r.optionC },
        { v: r.optionD },
        { v: r.correctOptionId },
        { v: r.explanation },
        { v: r.points || 10, isNum: true },
        { v: r.promptAudioUrl },
        { v: r.promptVideoUrl },
      ];

      const cellsXml = values
        .map((cell, colIdx) => {
          const ref = `${colIndexToLetter(colIdx)}${rowNum}`;
          if (cell.isNum) {
            return `<c r="${ref}" t="n"><v>${Number(cell.v) || 0}</v></c>`;
          }
          return `<c r="${ref}" t="inlineStr"><is><t>${escapeXml(String(cell.v ?? ''))}</t></is></c>`;
        })
        .join('');

      return `<row r="${rowNum}">${cellsXml}</row>`;
    })
    .join('');

  const sheet1Xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  ${colsXml}
  <sheetData>
    <row r="1" ht="24" customHeight="1">${headerCellsXml}</row>
    ${dataRowsXml}
  </sheetData>
  <dataValidations count="2">
    <dataValidation type="list" allowBlank="1" showInputMessage="1" showErrorMessage="0" sqref="C2:C500" promptTitle="Chọn Dạng Câu Hỏi (QuestionType)" prompt="Bấm mũi tên để chọn 1 trong 5 dạng câu hỏi chuẩn">
      <formula1>&quot;CHOOSE_AUDIO,TRUE_FALSE,LISTEN_AND_CHOOSE,VOCAB_MEANING,FILL_IN_THE_BLANK&quot;</formula1>
    </dataValidation>
    <dataValidation type="list" allowBlank="1" showInputMessage="1" showErrorMessage="0" sqref="L2:L500" promptTitle="Chọn Đáp Án Đúng (CorrectOption)" prompt="Chọn A, B, C, D (hoặc gõ từ tiếng Anh nếu là câu FILL_IN_THE_BLANK)">
      <formula1>&quot;A,B,C,D&quot;</formula1>
    </dataValidation>
  </dataValidations>
</worksheet>`;

  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="2">
    <font><sz val="11"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
  </fonts>
  <fills count="3">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF059669"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="1">
    <border><left/><right/><top/><bottom/><diagonal/></border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="2">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1">
      <alignment vertical="center"/>
    </xf>
  </cellXfs>
</styleSheet>`;

  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Questions" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`;

  const workbookRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

  const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`;

  return createZipArchive([
    { name: '[Content_Types].xml', content: contentTypesXml },
    { name: '_rels/.rels', content: rootRelsXml },
    { name: 'xl/workbook.xml', content: workbookXml },
    { name: 'xl/_rels/workbook.xml.rels', content: workbookRelsXml },
    { name: 'xl/styles.xml', content: stylesXml },
    { name: 'xl/worksheets/sheet1.xml', content: sheet1Xml },
  ]);
}

async function inflateRawBytes(compressed: Uint8Array): Promise<Uint8Array> {
  const ds = new DecompressionStream('deflate-raw');
  const writer = ds.writable.getWriter();
  writer.write(compressed as unknown as BufferSource);
  writer.close();
  const reader = ds.readable.getReader();
  const chunks: Uint8Array[] = [];
  let totalLen = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      totalLen += value.length;
    }
  }
  const out = new Uint8Array(totalLen);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}

/** Giải nén các file XML bên trong file .xlsx do người dùng tải lên */
async function unzipXlsxEntries(buffer: ArrayBuffer): Promise<Record<string, string>> {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  const decoder = new TextDecoder('utf-8');
  const entries: Record<string, string> = {};

  // Tìm End of Central Directory (EOCD - 0x06054b50) từ cuối file ngược lên
  let eocdOffset = -1;
  const minEocd = Math.max(0, bytes.length - 65557);
  for (let i = bytes.length - 22; i >= minEocd; i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset === -1) {
    throw new Error('File không phải định dạng ZIP / .XLSX hợp lệ.');
  }

  const totalRecords = view.getUint16(eocdOffset + 10, true);
  let cdOffset = view.getUint32(eocdOffset + 16, true);

  for (let i = 0; i < totalRecords; i++) {
    if (cdOffset + 46 > bytes.length || view.getUint32(cdOffset, true) !== 0x02014b50) {
      break;
    }
    const method = view.getUint16(cdOffset + 10, true);
    const compressedSize = view.getUint32(cdOffset + 20, true);
    const nameLen = view.getUint16(cdOffset + 28, true);
    const extraLen = view.getUint16(cdOffset + 30, true);
    const commentLen = view.getUint16(cdOffset + 32, true);
    const localHeaderOffset = view.getUint32(cdOffset + 42, true);

    const fileName = decoder.decode(bytes.subarray(cdOffset + 46, cdOffset + 46 + nameLen));
    cdOffset += 46 + nameLen + extraLen + commentLen;

    if (!fileName.endsWith('.xml') && !fileName.endsWith('.rels')) continue;

    if (localHeaderOffset + 30 > bytes.length || view.getUint32(localHeaderOffset, true) !== 0x04034b50) {
      continue;
    }
    const localNameLen = view.getUint16(localHeaderOffset + 26, true);
    const localExtraLen = view.getUint16(localHeaderOffset + 28, true);
    const dataStart = localHeaderOffset + 30 + localNameLen + localExtraLen;
    const rawSlice = bytes.subarray(dataStart, dataStart + compressedSize);

    if (method === 0) {
      entries[fileName] = decoder.decode(rawSlice);
    } else if (method === 8) {
      const inflated = await inflateRawBytes(rawSlice);
      entries[fileName] = decoder.decode(inflated);
    }
  }

  return entries;
}

/**
 * Đọc file .xlsx thực tế (Binary ArrayBuffer) thành mảng 2 chiều các dòng & cột
 */
export async function parseXlsxFileToRows(buffer: ArrayBuffer): Promise<string[][]> {
  const entries = await unzipXlsxEntries(buffer);
  const parser = new DOMParser();

  // 1. Đọc bảng SharedStrings (xl/sharedStrings.xml) nếu Excel lưu chuỗi dùng chung
  const sharedStrings: string[] = [];
  const ssKey = Object.keys(entries).find((k) => k.toLowerCase().endsWith('sharedstrings.xml'));
  if (ssKey) {
    const ssDoc = parser.parseFromString(entries[ssKey], 'text/xml');
    const siNodes = Array.from(ssDoc.getElementsByTagName('si'));
    for (const si of siNodes) {
      const tNodes = Array.from(si.getElementsByTagName('t'));
      sharedStrings.push(tNodes.map((t) => t.textContent ?? '').join(''));
    }
  }

  // 2. Tìm sheet1.xml (hoặc worksheet đầu tiên trong xl/worksheets/)
  const sheetKey =
    Object.keys(entries).find((k) => k.toLowerCase() === 'xl/worksheets/sheet1.xml') ||
    Object.keys(entries)
      .filter((k) => k.toLowerCase().includes('xl/worksheets/sheet'))
      .sort()[0];

  if (!sheetKey) {
    throw new Error('Không tìm thấy dữ liệu trang tính (worksheet) trong file .xlsx');
  }

  const sheetDoc = parser.parseFromString(entries[sheetKey], 'text/xml');
  const rowNodes = Array.from(sheetDoc.getElementsByTagName('row'));
  const rows: string[][] = [];

  for (const rowNode of rowNodes) {
    const cellNodes = Array.from(rowNode.getElementsByTagName('c'));
    const rowValues: string[] = [];

    for (let cIdx = 0; cIdx < cellNodes.length; cIdx++) {
      const cell = cellNodes[cIdx];
      const refAttr = cell.getAttribute('r') || '';
      const targetCol = refAttr ? colRefToIndex(refAttr) : cIdx;
      const colPos = targetCol >= 0 ? targetCol : rowValues.length;

      while (rowValues.length < colPos) {
        rowValues.push('');
      }

      const cellType = cell.getAttribute('t') || '';
      let val = '';

      if (cellType === 's') {
        const vText = cell.getElementsByTagName('v')[0]?.textContent ?? '';
        const ssIdx = parseInt(vText, 10);
        val = !isNaN(ssIdx) && sharedStrings[ssIdx] !== undefined ? sharedStrings[ssIdx] : '';
      } else if (cellType === 'inlineStr') {
        const tNodes = Array.from(cell.getElementsByTagName('t'));
        val = tNodes.map((t) => t.textContent ?? '').join('');
      } else if (cellType === 'b') {
        const vText = cell.getElementsByTagName('v')[0]?.textContent ?? '';
        val = vText === '1' ? 'TRUE' : 'FALSE';
      } else {
        val = cell.getElementsByTagName('v')[0]?.textContent ?? cell.textContent ?? '';
      }

      rowValues[colPos] = val.trim();
    }

    if (rowValues.some((v) => v.length > 0)) {
      rows.push(rowValues);
    }
  }

  return rows;
}

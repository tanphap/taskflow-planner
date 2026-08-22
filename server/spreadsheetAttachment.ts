import * as XLSX from "xlsx";

const TABULAR_CONTENT_TYPES = new Set([
  "text/csv",
  "application/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);
const TABULAR_EXTENSIONS = new Set(["csv", "xls", "xlsx"]);
const MAX_SHEETS = 4;
const MAX_ROWS_PER_SHEET = 120;
const MAX_COLUMNS_PER_ROW = 20;
const MAX_TABLE_CHARS = 12_000;

function cleanCell(value: unknown) {
  return String(value ?? "").replace(/\u0000/g, "").replace(/\s+/g, " ").trim();
}

function decodeBasicHtml(value: string) {
  return value.replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&#39;/gi, "'").replace(/&quot;/gi, '"');
}

function htmlCellToText(value: string) {
  return cleanCell(decodeBasicHtml(value.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]*>/g, " ")));
}

/** Returns a bounded, plain-text representation of HTML tables without executing email markup. */
export function extractHtmlTablesForGemini(html: string | null | undefined) {
  if (!html) return null;
  const tables: string[] = [];
  const tableMatches = Array.from(html.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi));
  for (const tableMatch of tableMatches) {
    const rows: string[] = [];
    const rowMatches = Array.from(tableMatch[1].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi));
    for (const rowMatch of rowMatches) {
      const cells = Array.from(rowMatch[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)).map(cellMatch => htmlCellToText(cellMatch[1] ?? "")).filter(Boolean).slice(0, MAX_COLUMNS_PER_ROW);
      if (cells.length) rows.push(cells.join(" | "));
      if (rows.length >= MAX_ROWS_PER_SHEET) break;
    }
    if (rows.length) tables.push(rows.join("\n"));
    if (tables.join("\n\n").length >= MAX_TABLE_CHARS) break;
  }
  const result = tables.map((table, index) => `Bảng trong email ${index + 1}:\n${table}`).join("\n\n").slice(0, MAX_TABLE_CHARS).trim();
  return result || null;
}

export function isTabularAttachment(filename: string | null | undefined, contentType: string | null | undefined) {
  const normalizedType = contentType?.toLowerCase().split(";")[0].trim() || "";
  const extension = filename?.trim().toLowerCase().split(".").pop() || "";
  return TABULAR_CONTENT_TYPES.has(normalizedType) || TABULAR_EXTENSIONS.has(extension);
}

/** Parses a bounded CSV/XLS/XLSX attachment into plain text for Gemini; file bytes are never stored. */
export function extractTabularAttachmentForGemini(input: { filename: string; contentType: string; content: Buffer | null | undefined }) {
  if (!input.content?.length || !isTabularAttachment(input.filename, input.contentType)) return null;
  try {
    const workbook = XLSX.read(input.content, { type: "buffer", raw: false, dense: true, sheetRows: MAX_ROWS_PER_SHEET + 1 });
    const sheets = workbook.SheetNames.slice(0, MAX_SHEETS).flatMap((sheetName, sheetIndex) => {
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) return [];
      const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false, defval: "", raw: false }).slice(0, MAX_ROWS_PER_SHEET).map(row => (Array.isArray(row) ? row : []).slice(0, MAX_COLUMNS_PER_ROW).map(cleanCell).join(" | ")).filter(row => row.replace(/\|/g, "").trim());
      return rows.length ? [`Bảng đính kèm ${sheetIndex + 1} — ${cleanCell(sheetName).slice(0, 120) || "Sheet"}:\n${rows.join("\n")}`] : [];
    });
    const text = sheets.join("\n\n").slice(0, MAX_TABLE_CHARS).trim();
    return text || null;
  } catch {
    return null;
  }
}

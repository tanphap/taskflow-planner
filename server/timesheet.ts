import { ENV } from "./_core/env";

const DEFAULT_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTAfaIBOkxXKQu_F6vbUX3l0zmoIl2AJkXPIHQHnbSXT5kTf367ZN3wkE1r4cNE9L8Qfa67gAp_-pXp/pub?gid=0&single=true&output=csv";
const MAX_CSV_BYTES = 5 * 1024 * 1024;
const REQUIRED_COLUMNS = 17;
const CSV_CACHE_TTL_MS = 5 * 60_000;
let csvCache: { url: string; text: string; fetchedAt: number } | null = null;

type TimesheetRow = {
  library: string;
  workGroup: string;
  content: string;
  workType: string;
  date: string;
  day: number;
  month: number;
  year: number;
  hours: number;
};
export type TimesheetPerson = { name: string };

export type TimesheetStats = {
  period: { month: number; year: number; label: string };
  summary: { workDays: number; totalHours: number; workUnits: number; taskCount: number };
  byDay: Array<{ date: string; day: number; hours: number; taskCount: number }>;
  byLibrary: Array<{ name: string; hours: number; taskCount: number }>;
  yearTrend: Array<{ month: number; hours: number; taskCount: number; workDays: number }>;
  report: { sent: boolean; sentAt: string | null };
  source: { fetchedAt: string; rowCount: number; skippedRowCount: number };
};

function round(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Small RFC 4180 parser for the published Google Sheets CSV. */
export function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') { field += '"'; index += 1; }
      else if (character === '"') quoted = false;
      else field += character;
    } else if (character === '"') quoted = true;
    else if (character === ",") { row.push(field); field = ""; }
    else if (character === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (character !== "\r") field += character;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

function parseDate(value: string) {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value.trim());
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
    ? { day, month, year, date }
    : null;
}

function parseTime(value: string) {
  const match = /^(\d{1,2})[:.](\d{1,2})$/.exec(value.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  return hour <= 23 && minute <= 59 ? hour * 60 + minute : null;
}

function calculateHours(startDateText: string, startText: string, endDateText: string, endText: string) {
  const start = parseTime(startText);
  const end = parseTime(endText);
  if (start === null || end === null) return 0;
  const startDate = parseDate(startDateText);
  const endDate = parseDate(endDateText);
  let minutes = end - start;
  if (startDate && endDate) minutes += (endDate.date.getTime() - startDate.date.getTime()) / 60_000;
  else if (minutes < 0) minutes += 1440;
  return minutes >= 0 && minutes <= 72 * 60 ? round(minutes / 60) : 0;
}

function getPersonNames(source: string[]) {
  return Array.from(new Set([source[11], source[12]].map(value => (value ?? "").replace(/\s+/g, " ").trim()).filter(Boolean)));
}
function toTimesheetRows(csv: string, employeeMatch: string) {
  const [headers, ...sourceRows] = parseCsv(csv.replace(/^\uFEFF/, ""));
  if (!headers || headers.length < REQUIRED_COLUMNS || headers[13]?.trim() !== "Ngày bắt đầu") throw new Error("Google Sheets không đúng cấu trúc chấm công mong đợi.");
  const rows: TimesheetRow[] = [];
  let skippedRowCount = 0;
  for (const source of sourceRows) {
    if (!getPersonNames(source).includes(employeeMatch)) continue;
    const date = parseDate(source[13] ?? "");
    if (!date || source.length < REQUIRED_COLUMNS) { skippedRowCount += 1; continue; }
    rows.push({
      library: source[2]?.trim() || "(Không có)",
      workGroup: source[1]?.trim() || "",
      content: source[3]?.trim() || "",
      workType: source[4]?.trim() || "",
      date: `${String(date.day).padStart(2, "0")}/${String(date.month).padStart(2, "0")}/${date.year}`,
      day: date.day,
      month: date.month,
      year: date.year,
      hours: calculateHours(source[13] ?? "", source[14] ?? "", source[15] ?? "", source[16] ?? ""),
    });
  }
  return { rows, skippedRowCount };
}
export function listTimesheetPeople(csv: string): TimesheetPerson[] {
  const [headers, ...sourceRows] = parseCsv(csv.replace(/^\uFEFF/, ""));
  if (!headers || headers.length < REQUIRED_COLUMNS || headers[13]?.trim() !== "Ngày bắt đầu") throw new Error("Google Sheets không đúng cấu trúc chấm công mong đợi.");
  return Array.from(new Set(sourceRows.flatMap(getPersonNames)))
    .sort((left, right) => left.localeCompare(right, "vi"))
    .map(name => ({ name }));
}

async function fetchCsv(url: string) {
  const response = await fetch(url, { headers: { accept: "text/csv" }, signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`Không thể tải Google Sheets (HTTP ${response.status}).`);
  if (!response.body) throw new Error("Google Sheets trả về nội dung rỗng.");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_CSV_BYTES) { await reader.cancel(); throw new Error("Dữ liệu chấm công vượt quá giới hạn 5 MB."); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder().decode(bytes);
}
async function fetchTimesheetCsv() {
  const csvUrl = ENV.timesheetCsvUrl || DEFAULT_CSV_URL;
  if (csvCache?.url === csvUrl && Date.now() - csvCache.fetchedAt < CSV_CACHE_TTL_MS) return csvCache.text;
  const text = await fetchCsv(csvUrl);
  csvCache = { url: csvUrl, text, fetchedAt: Date.now() };
  return text;
}

export function aggregateTimesheet(csv: string, input: { month: number; year: number; employeeMatch: string }): TimesheetStats {
  const { rows, skippedRowCount } = toTimesheetRows(csv, input.employeeMatch);
  const selected = rows.filter(row => row.year === input.year && row.month === input.month);
  const byDay = new Map<number, { date: string; day: number; hours: number; taskCount: number }>();
  const byLibrary = new Map<string, { name: string; hours: number; taskCount: number }>();
  for (const row of selected) {
    const day = byDay.get(row.day) ?? { date: row.date, day: row.day, hours: 0, taskCount: 0 };
    day.hours = round(day.hours + row.hours); day.taskCount += 1; byDay.set(row.day, day);
    const library = byLibrary.get(row.library) ?? { name: row.library, hours: 0, taskCount: 0 };
    library.hours = round(library.hours + row.hours); library.taskCount += 1; byLibrary.set(row.library, library);
  }
  const yearTrend = Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    const monthRows = rows.filter(row => row.year === input.year && row.month === month);
    return { month, hours: round(monthRows.reduce((sum, row) => sum + row.hours, 0)), taskCount: monthRows.length, workDays: new Set(monthRows.map(row => row.date)).size };
  });
  const totalHours = round(selected.reduce((sum, row) => sum + row.hours, 0));
  return {
    period: { month: input.month, year: input.year, label: `Tháng ${input.month} ${input.year}` },
    summary: { workDays: byDay.size, totalHours, workUnits: round(totalHours / 8), taskCount: selected.length },
    byDay: Array.from(byDay.values()).sort((left, right) => left.day - right.day),
    byLibrary: Array.from(byLibrary.values()).sort((left, right) => right.hours - left.hours || right.taskCount - left.taskCount),
    yearTrend,
    report: { sent: false, sentAt: null },
    source: { fetchedAt: new Date().toISOString(), rowCount: rows.length, skippedRowCount },
  };
}

export async function getTimesheetPeople() {
  return listTimesheetPeople(await fetchTimesheetCsv());
}
export async function getTimesheetStats(input: { month: number; year: number; employeeName: string }) {
  return aggregateTimesheet(await fetchTimesheetCsv(), { month: input.month, year: input.year, employeeMatch: input.employeeName });
}

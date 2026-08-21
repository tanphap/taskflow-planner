export const DAILY_QUOTE_SCHEDULE_KEY = "daily-ai-quote";
export const DAILY_QUOTE_TIMEZONE = "Asia/Ho_Chi_Minh";

export const DEFAULT_DAILY_QUOTE = {
  vi: "Làm việc có chủ đích, không chỉ bận rộn.",
  en: "Work with intention, not just activity.",
} as const;

export function getVietnamDateKey(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: DAILY_QUOTE_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (type: "year" | "month" | "day") => parts.find(part => part.type === type)?.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export function cleanDailyQuote(value: string, maxLength = 280): string {
  return value.replace(/\s+/g, " ").trim().replace(/^['“”"`]+|['“”"`]+$/g, "").slice(0, maxLength);
}

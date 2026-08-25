import * as db from "./db";
import { cleanDailyQuote, getVietnamDateKey } from "../shared/dailyQuote";
import { DEFAULT_GEMINI_MODEL } from "../shared/geminiModels";
import { invokeGeminiJson } from "./geminiJson";

const DAILY_QUOTE_MODEL = DEFAULT_GEMINI_MODEL;

type GeneratedQuote = { vi: string; en: string };

function parseGeneratedQuote(value: unknown): GeneratedQuote {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Daily quote AI returned no data");
  const parsed = value as Partial<GeneratedQuote>;
  const vi = cleanDailyQuote(parsed.vi ?? "");
  const en = cleanDailyQuote(parsed.en ?? "");
  if (!vi || !en) throw new Error("Daily quote AI returned an incomplete quote");
  return { vi, en };
}

export async function generateDailyAiQuote(now = new Date()) {
  const dayKey = getVietnamDateKey(now);
  const existing = await db.getDailyAiQuote(dayKey);
  if (existing) return { created: false, dayKey, quote: existing };

  const response = await invokeGeminiJson<GeneratedQuote>({
    model: DAILY_QUOTE_MODEL,
    maxOutputTokens: 160,
    systemInstruction: "Create one original, concise daily productivity quote. It should be calm, practical, and focused on purposeful work. Never mention brands, users, personal data, or dates. Return a JSON object with exactly the string properties vi and en.",
    prompt: "Write a fresh quote for today. Provide Vietnamese and English versions with the same meaning. Avoid clichés, exclamation marks, and more than one sentence per language.",
  });
  const quote = parseGeneratedQuote(response.value);
  const saved = await db.createDailyAiQuote({
    dayKey,
    quoteVi: quote.vi,
    quoteEn: quote.en,
    model: response.model,
  });
  return { created: true, dayKey, quote: saved };
}

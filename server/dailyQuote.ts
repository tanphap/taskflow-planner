import { invokeLLM } from "./_core/llm";
import * as db from "./db";
import { cleanDailyQuote, getVietnamDateKey } from "../shared/dailyQuote";

const DAILY_QUOTE_MODEL = "gpt-5-nano";

type GeneratedQuote = { vi: string; en: string };

function parseGeneratedQuote(content: string | Array<unknown> | null | undefined): GeneratedQuote {
  if (typeof content !== "string") throw new Error("Daily quote AI returned no text");
  const parsed = JSON.parse(content) as Partial<GeneratedQuote>;
  const vi = cleanDailyQuote(parsed.vi ?? "");
  const en = cleanDailyQuote(parsed.en ?? "");
  if (!vi || !en) throw new Error("Daily quote AI returned an incomplete quote");
  return { vi, en };
}

export async function generateDailyAiQuote(now = new Date()) {
  const dayKey = getVietnamDateKey(now);
  const existing = await db.getDailyAiQuote(dayKey);
  if (existing) return { created: false, dayKey, quote: existing };

  const response = await invokeLLM({
    model: DAILY_QUOTE_MODEL,
    max_tokens: 160,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "daily_productivity_quote",
        strict: true,
        schema: {
          type: "object",
          properties: {
            vi: { type: "string", description: "Một câu ngắn bằng tiếng Việt, tối đa 180 ký tự." },
            en: { type: "string", description: "Bản tiếng Anh tự nhiên của đúng ý đó, tối đa 180 ký tự." },
          },
          required: ["vi", "en"],
          additionalProperties: false,
        },
      },
    },
    messages: [
      {
        role: "system",
        content: "Create one original, concise daily productivity quote. It should be calm, practical, and focused on purposeful work. Never mention brands, users, personal data, or dates. Return only the requested JSON.",
      },
      {
        role: "user",
        content: "Write a fresh quote for today. Provide Vietnamese and English versions with the same meaning. Avoid clichés, exclamation marks, and more than one sentence per language.",
      },
    ],
  });
  const quote = parseGeneratedQuote(response.choices[0]?.message.content);
  const saved = await db.createDailyAiQuote({
    dayKey,
    quoteVi: quote.vi,
    quoteEn: quote.en,
    model: response.model || DAILY_QUOTE_MODEL,
  });
  return { created: true, dayKey, quote: saved };
}

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({ getDailyAiQuote: vi.fn(), createDailyAiQuote: vi.fn() }));
vi.mock("./geminiJson", () => ({ invokeGeminiJson: vi.fn() }));

import * as db from "./db";
import { generateDailyAiQuote } from "./dailyQuote";
import { invokeGeminiJson } from "./geminiJson";

describe("daily AI quote generator", () => {
  beforeEach(() => vi.clearAllMocks());

  it("reuses an existing quote so a retried schedule does not call AI again", async () => {
    const saved = { dayKey: "2026-08-21", quoteVi: "Vi", quoteEn: "En", model: "gemini-3.5-flash-lite" };
    vi.mocked(db.getDailyAiQuote).mockResolvedValue(saved as never);

    await expect(generateDailyAiQuote(new Date("2026-08-20T17:05:00.000Z"))).resolves.toMatchObject({ created: false, quote: saved });
    expect(invokeGeminiJson).not.toHaveBeenCalled();
  });

  it("creates a bilingual quote when the daily record does not exist", async () => {
    vi.mocked(db.getDailyAiQuote).mockResolvedValue(undefined);
    vi.mocked(invokeGeminiJson).mockResolvedValue({ model: "gemini-3.5-flash-lite", value: { vi: "Chọn một việc quan trọng.", en: "Choose one important thing." } } as never);
    vi.mocked(db.createDailyAiQuote).mockResolvedValue({ dayKey: "2026-08-21", quoteVi: "Chọn một việc quan trọng.", quoteEn: "Choose one important thing.", model: "gemini-3.5-flash-lite" } as never);

    await expect(generateDailyAiQuote(new Date("2026-08-20T17:05:00.000Z"))).resolves.toMatchObject({ created: true, dayKey: "2026-08-21" });
    expect(db.createDailyAiQuote).toHaveBeenCalledWith(expect.objectContaining({ dayKey: "2026-08-21", model: "gemini-3.5-flash-lite" }));
  });
});

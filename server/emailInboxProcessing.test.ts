import { describe, expect, it } from "vitest";
import { isEmailGeminiSummarizing } from "../shared/emailInboxProcessing";

describe("isEmailGeminiSummarizing", () => {
  it("chỉ đánh dấu email có request Gemini đang chờ", () => {
    expect(isEmailGeminiSummarizing(42, 42)).toBe(true);
    expect(isEmailGeminiSummarizing(43, 42)).toBe(false);
  });

  it("không đánh dấu email nào khi Gemini không xử lý", () => {
    expect(isEmailGeminiSummarizing(42, null)).toBe(false);
    expect(isEmailGeminiSummarizing(42, undefined)).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { DEFAULT_GEMINI_MODEL, isGeminiModel, resolveGeminiModel } from "./geminiModels";

describe("Gemini model whitelist", () => {
  it("accepts only the curated generateContent models", () => {
    expect(isGeminiModel("gemini-3.5-flash")).toBe(true);
    expect(isGeminiModel("models/gemini-3.5-flash")).toBe(false);
    expect(isGeminiModel("https://unsafe.example/model")).toBe(false);
  });

  it("uses the safe default for stale or invalid persisted values", () => {
    expect(resolveGeminiModel("unknown-model")).toBe(DEFAULT_GEMINI_MODEL);
    expect(resolveGeminiModel(null)).toBe(DEFAULT_GEMINI_MODEL);
  });
});

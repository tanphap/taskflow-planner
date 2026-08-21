import { describe, expect, it } from "vitest";

describe("Gemini API key", () => {
  it("xác thực được bằng endpoint danh sách mô hình", async () => {
    const apiKey = process.env.GEMINI_API_KEY;
    expect(apiKey).toBeTruthy();

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models",
      {
        headers: { "x-goog-api-key": apiKey! },
      },
    );

    expect(response.ok).toBe(true);
    const payload = (await response.json()) as { models?: unknown[] };
    expect(Array.isArray(payload.models)).toBe(true);
  }, 20_000);
});

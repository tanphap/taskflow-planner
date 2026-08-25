import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./_core/env", () => ({ ENV: { geminiApiKey: "test-gemini-key" } }));

import { invokeGeminiJson } from "./geminiJson";

describe("Gemini JSON helper", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("sends server-side JSON requests to the selected Gemini model and parses an object response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text: '{"answer":"ok"}' }] } }],
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(invokeGeminiJson<{ answer: string }>({
      model: "gemini-3.5-flash",
      systemInstruction: "Return JSON only.",
      prompt: "Check.",
      maxOutputTokens: 32,
    })).resolves.toEqual({ value: { answer: "ok" }, model: "gemini-3.5-flash" });

    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("models/gemini-3.5-flash:generateContent");
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: "POST",
      headers: expect.objectContaining({ "x-goog-api-key": "test-gemini-key" }),
    });
  });

  it("rejects responses that are not JSON objects", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text: "[]" }] } }],
    }), { status: 200 })));

    await expect(invokeGeminiJson({
      systemInstruction: "Return JSON only.",
      prompt: "Check.",
      maxOutputTokens: 32,
    })).rejects.toThrow("Gemini trả về dữ liệu không đúng định dạng JSON.");
  });
});

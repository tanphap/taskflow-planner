import { ENV } from "./_core/env";
import { GeminiTemporaryError } from "./geminiEmailSummary";
import { resolveGeminiModel, type GeminiModel } from "../shared/geminiModels";

type GeminiJsonInput = {
  systemInstruction: string;
  prompt: string;
  model?: GeminiModel;
  temperature?: number;
  maxOutputTokens: number;
};

function readGeminiText(payload: unknown) {
  if (!payload || typeof payload !== "object") return "";
  const candidates = (payload as { candidates?: unknown }).candidates;
  if (!Array.isArray(candidates) || !candidates[0] || typeof candidates[0] !== "object") return "";
  const parts = (candidates[0] as { content?: { parts?: Array<{ text?: unknown }> } }).content?.parts ?? [];
  return parts.map(part => typeof part.text === "string" ? part.text : "").join("\n").trim();
}

function throwGeminiJsonError(response: Response) {
  if (response.status === 429) throw new GeminiTemporaryError("Gemini miễn phí đang đạt giới hạn hiện tại. Bạn có thể thử lại sau.", response.status);
  if (response.status === 408 || response.status === 425 || response.status >= 500) throw new GeminiTemporaryError("Gemini đang tạm thời không sẵn sàng. Bạn có thể thử lại sau ít phút.", response.status);
  if (response.status === 401 || response.status === 403) throw new Error("Không thể xác thực với Gemini API. Hãy kiểm tra khóa API.");
  throw new Error(`Gemini không thể xử lý yêu cầu lúc này (HTTP ${response.status}).`);
}

/** Calls Gemini from the server and accepts only a JSON-object response. */
export async function invokeGeminiJson<T extends object>(input: GeminiJsonInput): Promise<{ value: T; model: GeminiModel }> {
  if (!ENV.geminiApiKey) throw new Error("Gemini API key chưa được cấu hình.");
  const model = resolveGeminiModel(input.model);
  let response: Response;
  try {
    response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": ENV.geminiApiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: input.systemInstruction }] },
        contents: [{ role: "user", parts: [{ text: input.prompt }] }],
        generationConfig: {
          temperature: input.temperature ?? 0,
          maxOutputTokens: input.maxOutputTokens,
          responseMimeType: "application/json",
        },
      }),
    });
  } catch {
    throw new GeminiTemporaryError("Không thể kết nối Gemini lúc này. Bạn có thể thử lại sau ít phút.");
  }
  if (!response.ok) throwGeminiJsonError(response);

  const text = readGeminiText(await response.json());
  if (!text) throw new Error("Gemini không trả về dữ liệu JSON.");
  try {
    const value = JSON.parse(text) as unknown;
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("not an object");
    return { value: value as T, model };
  } catch {
    throw new Error("Gemini trả về dữ liệu không đúng định dạng JSON.");
  }
}

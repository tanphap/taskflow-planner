export const GEMINI_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.5-flash",
  "gemini-3.1-pro-preview",
] as const;

export type GeminiModel = typeof GEMINI_MODELS[number];

export const DEFAULT_GEMINI_MODEL: GeminiModel = "gemini-3.5-flash-lite";

export const GEMINI_MODEL_OPTIONS: ReadonlyArray<{ value: GeminiModel; label: string; descriptionVi: string; descriptionEn: string }> = [
  { value: "gemini-3.5-flash-lite", label: "Gemini 3.5 Flash Lite", descriptionVi: "Nhanh, tiết kiệm — phù hợp cho đa số tóm tắt và hướng dẫn.", descriptionEn: "Fast and economical — suitable for most summaries and guidance." },
  { value: "gemini-3.5-flash", label: "Gemini 3.5 Flash", descriptionVi: "Cân bằng tốc độ và chất lượng cho email phức tạp hơn.", descriptionEn: "Balanced speed and quality for more complex email." },
  { value: "gemini-3.1-pro-preview", label: "Gemini 3.1 Pro (Preview)", descriptionVi: "Lập luận chuyên sâu hơn; khả dụng và hạn mức tùy thuộc API Gemini của bạn.", descriptionEn: "Deeper reasoning; availability and quota depend on your Gemini API." },
];

export function isGeminiModel(value: unknown): value is GeminiModel {
  return typeof value === "string" && (GEMINI_MODELS as readonly string[]).includes(value);
}

export function resolveGeminiModel(value: unknown): GeminiModel {
  return isGeminiModel(value) ? value : DEFAULT_GEMINI_MODEL;
}

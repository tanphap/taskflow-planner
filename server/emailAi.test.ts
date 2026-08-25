import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({
  listEmailMessagesForAiAnalysis: vi.fn(),
  getEmailSuggestionForMessage: vi.fn(),
  getUserGeminiModel: vi.fn(),
  createEmailEventSuggestion: vi.fn(),
  markEmailMessageAiAnalyzed: vi.fn(),
}));
vi.mock("./geminiJson", () => ({ invokeGeminiJson: vi.fn() }));

import * as db from "./db";
import { analyzeMailboxForEmailEvents, normalizeEmailEventExtraction } from "./emailAi";
import { invokeGeminiJson } from "./geminiJson";

const source = {
  id: 81,
  subject: "Họp kế hoạch — https://meet.example.com/launch",
  senderName: "Mai",
  senderEmail: "mai@example.com",
  snippet: "Chúng ta họp lúc 09:00 thứ Hai. Tài liệu: https://docs.example.com/launch-plan",
  receivedAt: new Date("2026-08-21T01:00:00.000Z"),
};

describe("email AI event proposal normalization", () => {
  it("rejects uncertain or incomplete AI event detections", () => {
    expect(normalizeEmailEventExtraction({ isEvent: true, title: "Họp", description: "", startAt: "2026-08-24T09:00:00+07:00", endAt: "2026-08-24T10:00:00+07:00", reminderMinutes: 15, planLink: "", confidence: 69 }, source)).toBeNull();
    expect(normalizeEmailEventExtraction({ isEvent: false, title: "Họp", description: "", startAt: "2026-08-24T09:00:00+07:00", endAt: "2026-08-24T10:00:00+07:00", reminderMinutes: 15, planLink: "", confidence: 95 }, source)).toBeNull();
    expect(normalizeEmailEventExtraction({ isEvent: true, title: "Họp", description: "", startAt: "2026-08-24T10:00:00+07:00", endAt: "2026-08-24T09:00:00+07:00", reminderMinutes: 15, planLink: "", confidence: 95 }, source)).toBeNull();
  });

  it("keeps only a source email link and normalizes safe reminder settings", () => {
    const candidate = normalizeEmailEventExtraction({ isEvent: true, title: "  Họp   ra mắt  ", description: "Xem lại kế hoạch.", startAt: "2026-08-24T09:00:00+07:00", endAt: "2026-08-24T10:00:00+07:00", reminderMinutes: 17, planLink: "https://docs.example.com/launch-plan", confidence: 101 }, source);

    expect(candidate).toMatchObject({ title: "Họp ra mắt", reminderMinutes: 15, planLink: "https://docs.example.com/launch-plan", confidence: 100 });
  });

  it("removes a link hallucinated by the model rather than present in the source email", () => {
    const candidate = normalizeEmailEventExtraction({ isEvent: true, title: "Họp ra mắt", description: "", startAt: "2026-08-24T09:00:00+07:00", endAt: "2026-08-24T10:00:00+07:00", reminderMinutes: 30, planLink: "https://untrusted.example/fake", confidence: 84 }, source);

    expect(candidate?.planLink).toBeNull();
  });
});

describe("email AI event proposal deduplication", () => {
  beforeEach(() => vi.clearAllMocks());

  it("does not create a second suggestion when a repeated scan encounters the same email", async () => {
    vi.mocked(db.listEmailMessagesForAiAnalysis).mockResolvedValue([source] as never);
    vi.mocked(db.getEmailSuggestionForMessage).mockResolvedValueOnce(null).mockResolvedValue({ id: 501 } as never);
    vi.mocked(db.getUserGeminiModel).mockResolvedValue("gemini-3.5-flash-lite");
    vi.mocked(db.createEmailEventSuggestion).mockResolvedValue({ id: 501 } as never);
    vi.mocked(db.markEmailMessageAiAnalyzed).mockResolvedValue(undefined);
    vi.mocked(invokeGeminiJson).mockResolvedValue({
      model: "gemini-3.5-flash-lite",
      value: { isEvent: true, title: "Họp kế hoạch", description: "", startAt: "2026-08-24T09:00:00+07:00", endAt: "2026-08-24T10:00:00+07:00", reminderMinutes: 15, planLink: "", confidence: 88 },
    } as never);

    await expect(analyzeMailboxForEmailEvents(73, 18)).resolves.toEqual({ analyzed: 1, suggested: 1, failed: 0 });
    await expect(analyzeMailboxForEmailEvents(73, 18)).resolves.toEqual({ analyzed: 0, suggested: 0, failed: 0 });

    expect(db.createEmailEventSuggestion).toHaveBeenCalledTimes(1);
    expect(invokeGeminiJson).toHaveBeenCalledTimes(1);
    expect(db.markEmailMessageAiAnalyzed).toHaveBeenCalledTimes(2);
  });
});

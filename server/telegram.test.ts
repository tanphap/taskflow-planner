import { afterEach, describe, expect, it, vi } from "vitest";
import { sendTelegramReminder } from "./telegram";

describe("sendTelegramReminder", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("sends a concise appointment reminder to the linked private chat", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    await sendTelegramReminder("123456", "Họp dự án", new Date("2026-08-19T09:00:00.000Z"));

    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/sendMessage"), expect.objectContaining({
      method: "POST",
      body: expect.stringContaining('"chat_id":"123456"'),
    }));
    expect(JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string).text).toContain("Họp dự án");
  });
});


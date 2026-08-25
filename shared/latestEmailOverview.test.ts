import { describe, expect, it } from "vitest";
import { getLatestEmailOverviewItems } from "./latestEmailOverview";

describe("getLatestEmailOverviewItems", () => {
  it("sorts synced messages by received time and attaches an existing Gemini summary", () => {
    const items = getLatestEmailOverviewItems(
      [
        { id: 2, subject: "Thư cũ", senderName: "Bình", receivedAt: "2026-08-20T02:00:00.000Z" },
        { id: 1, subject: "Thư mới", senderName: "An", receivedAt: "2026-08-25T03:00:00.000Z" },
        { id: 3, subject: "Thư giữa", senderName: null, receivedAt: "2026-08-23T03:00:00.000Z" },
      ],
      [
        { emailMessageId: 1, summary: "Bản tóm tắt cũ", generatedAt: "2026-08-25T03:10:00.000Z" },
        { emailMessageId: 1, summary: "Bản tóm tắt mới", generatedAt: "2026-08-25T03:20:00.000Z" },
      ],
    );

    expect(items.map(item => item.id)).toEqual([1, 3, 2]);
    expect(items[0]?.savedSummary?.summary).toBe("Bản tóm tắt mới");
    expect(items[1]?.savedSummary).toBeNull();
  });
});

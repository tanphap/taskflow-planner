import { describe, expect, it } from "vitest";
import { eventPrefillFromEmailSummary } from "./taskEvent";

describe("eventPrefillFromEmailSummary", () => {
  it("tạo bản nháp lịch hẹn có thể chỉnh sửa mà không lưu tự động", () => {
    const prefill = eventPrefillFromEmailSummary({
      subject: "Họp dự án tuần này",
      summary: "Nhóm đề nghị sắp lịch họp để thống nhất kế hoạch.",
      sender: "Lan Nguyen",
      receivedAt: "2026-08-21T09:30:00.000Z",
      webLink: "https://mail.example.com/message/42",
    }, new Date("2026-08-21T08:15:00.000Z"));

    expect(prefill.title).toBe("Họp dự án tuần này");
    expect(prefill.startAt.toISOString()).toBe("2026-08-21T09:00:00.000Z");
    expect(prefill.endAt.toISOString()).toBe("2026-08-21T10:00:00.000Z");
    expect(prefill.reminderAt).toBeNull();
    expect(prefill.description).toContain("Tóm tắt AI từ email");
    expect(prefill.description).toContain("Lan Nguyen");
    expect(prefill.description).toContain("https://mail.example.com/message/42");
  });
});

import { describe, expect, it } from "vitest";
import { cronFor } from "./routers";

describe("Telegram reminder cron scheduling", () => {
  const reminderAt = new Date("2026-08-31T09:45:00.000Z");

  it("runs a monthly series daily at its reminder time so dates such as 31st clamp to short months", () => {
    expect(cronFor(reminderAt, JSON.stringify({ freq: "monthly", interval: 1 }))).toBe("0 45 9 * * *");
  });

  it("keeps a selected-weekday cron for weekly series and a one-time cron for ordinary events", () => {
    expect(cronFor(reminderAt, JSON.stringify({ freq: "weekly", interval: 2, daysOfWeek: [1, 3, 7] }))).toBe("0 45 9 * * 1,3,0");
    expect(cronFor(reminderAt, null)).toBe("0 45 9 31 8 *");
  });
});

import { describe, expect, it } from "vitest";
import { expandEventOccurrences, parseRecurrenceRule, quickReminderAt } from "../shared/recurrence";

const windowStart = new Date("2026-08-01T00:00:00.000Z");
const windowEnd = new Date("2026-10-31T23:59:59.999Z");

describe("recurrence rules", () => {
  it("calculates quick reminders at 5, 15, and 30 minutes before an event", () => {
    const startAt = new Date("2026-08-17T10:00:00.000Z");
    expect(quickReminderAt(startAt, 5).toISOString()).toBe("2026-08-17T09:55:00.000Z");
    expect(quickReminderAt(startAt, 15).toISOString()).toBe("2026-08-17T09:45:00.000Z");
    expect(quickReminderAt(startAt, 30).toISOString()).toBe("2026-08-17T09:30:00.000Z");
  });

  it("expands a custom daily interval and retains the reminder offset", () => {
    const occurrences = expandEventOccurrences({
      id: 11,
      startAt: new Date("2026-08-17T10:00:00.000Z"),
      endAt: new Date("2026-08-17T11:00:00.000Z"),
      reminderAt: new Date("2026-08-17T09:45:00.000Z"),
      recurrenceRule: JSON.stringify({ freq: "daily", interval: 2, count: 3 }),
    }, windowStart, windowEnd);

    expect(occurrences.map(item => item.startAt.toISOString())).toEqual([
      "2026-08-17T10:00:00.000Z",
      "2026-08-19T10:00:00.000Z",
      "2026-08-21T10:00:00.000Z",
    ]);
    expect(occurrences.map(item => item.reminderAt?.toISOString())).toEqual([
      "2026-08-17T09:45:00.000Z",
      "2026-08-19T09:45:00.000Z",
      "2026-08-21T09:45:00.000Z",
    ]);
  });

  it("expands only selected weekdays in alternating weeks", () => {
    const occurrences = expandEventOccurrences({
      id: 12,
      startAt: new Date("2026-08-17T10:00:00.000Z"),
      endAt: new Date("2026-08-17T11:00:00.000Z"),
      recurrenceRule: JSON.stringify({ freq: "weekly", interval: 2, daysOfWeek: [1, 3], count: 4 }),
    }, windowStart, windowEnd);

    expect(occurrences.map(item => item.startAt.toISOString())).toEqual([
      "2026-08-17T10:00:00.000Z",
      "2026-08-19T10:00:00.000Z",
      "2026-08-31T10:00:00.000Z",
      "2026-09-02T10:00:00.000Z",
    ]);
  });

  it("clamps a monthly series to the final valid day of short months and honors an end date", () => {
    const occurrences = expandEventOccurrences({
      id: 13,
      startAt: new Date("2026-08-31T10:00:00.000Z"),
      endAt: new Date("2026-08-31T11:00:00.000Z"),
      recurrenceRule: JSON.stringify({ freq: "monthly", interval: 1, endDate: "2026-10-31" }),
    }, windowStart, windowEnd);

    expect(occurrences.map(item => item.startAt.toISOString())).toEqual([
      "2026-08-31T10:00:00.000Z",
      "2026-09-30T10:00:00.000Z",
      "2026-10-31T10:00:00.000Z",
    ]);
  });

  it("rejects malformed rules and weekly rules without days", () => {
    expect(parseRecurrenceRule("{")).toBeNull();
    expect(parseRecurrenceRule(JSON.stringify({ freq: "weekly", interval: 1 }))).toBeNull();
    expect(parseRecurrenceRule(JSON.stringify({ freq: "daily", interval: 0 }))).toBeNull();
  });
});

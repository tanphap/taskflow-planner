import { describe, expect, it } from "vitest";
import { dateKeyInTimeZone } from "./dutyScheduleDate";

describe("dateKeyInTimeZone", () => {
  it("uses the calendar date in Vietnam time around a UTC day boundary", () => {
    expect(dateKeyInTimeZone(new Date("2026-08-24T18:30:00.000Z"))).toBe("2026-08-25");
  });
});

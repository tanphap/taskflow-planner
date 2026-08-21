import { describe, expect, it } from "vitest";
import { cleanDailyQuote, getVietnamDateKey } from "./dailyQuote";

describe("daily AI quote helpers", () => {
  it("uses the Vietnam calendar day across the UTC date boundary", () => {
    expect(getVietnamDateKey(new Date("2026-08-20T17:05:00.000Z"))).toBe("2026-08-21");
  });

  it("normalizes AI quote text before storing it", () => {
    expect(cleanDailyQuote('  “Focus   on  the next useful step.”  ')).toBe("Focus on the next useful step.");
  });
});

import { describe, expect, it } from "vitest";
import { getVietnameseCalendarDay } from "../shared/vietnameseCalendar";

describe("Vietnamese lunar calendar helpers", () => {
  it("converts the first day of Tết 2024 and labels it as a holiday", () => {
    const result = getVietnameseCalendarDay(new Date(2024, 1, 10), "vi");
    expect(result).toMatchObject({ lunarDay: 1, lunarMonth: 1, lunarYear: 2024 });
    expect(result.holiday).toEqual({ id: "lunar-new-year", label: "Tết Nguyên Đán" });
  });

  it("labels fixed public holidays in the chosen language", () => {
    const result = getVietnameseCalendarDay(new Date(2026, 8, 2), "en");
    expect(result.holiday).toEqual({ id: "national-day", label: "National Day" });
    expect(result.lunarLabel).toMatch(/^L \d+\/\d+/);
  });

  it("does not present ordinary days as public holidays", () => {
    const result = getVietnameseCalendarDay(new Date(2026, 7, 21), "vi");
    expect(result.holiday).toBeNull();
    expect(result.lunarLabel).toMatch(/^\d+\/\d+ ÂL$/);
  });
});

import { describe, expect, it } from "vitest";
import { listDutySchedulePeople, matchesDutyScheduleFilters } from "./dutyScheduleFilters";

describe("duty schedule filters", () => {
  const entries = [
    { assignment: "Linh-Thiện", shift: "S" as const },
    { assignment: "Trung-Minh", shift: "D" as const },
    { assignment: "Linh-Thiện", shift: "D" as const },
  ];

  it("filters assigned people without requiring Vietnamese accents or matching case", () => {
    expect(matchesDutyScheduleFilters(entries[0], "linh thien", "all")).toBe(true);
    expect(matchesDutyScheduleFilters(entries[1], "LINH", "all")).toBe(false);
  });

  it("combines a person filter with a shift filter", () => {
    expect(matchesDutyScheduleFilters(entries[0], "linh", "S")).toBe(true);
    expect(matchesDutyScheduleFilters(entries[2], "linh", "S")).toBe(false);
    expect(matchesDutyScheduleFilters(entries[2], "", "D")).toBe(true);
  });

  it("lists unique assigned people for input suggestions", () => {
    expect(listDutySchedulePeople(entries)).toEqual(["Linh-Thiện", "Trung-Minh"]);
  });
});

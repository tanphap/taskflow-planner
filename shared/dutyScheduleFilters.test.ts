import { describe, expect, it } from "vitest";
import { listDutySchedulePeople, matchesDutyScheduleFilters, splitDutyAssignmentPeople } from "./dutyScheduleFilters";

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

  it("finds a shift when either person is searched and lists individual people", () => {
    const twoPeopleShift = { assignment: "Ca sáng Linh-Thiện - Pháp-Vương", shift: "S" as const };

    expect(splitDutyAssignmentPeople(twoPeopleShift.assignment)).toEqual(["Linh-Thiện", "Pháp-Vương"]);
    expect(matchesDutyScheduleFilters(twoPeopleShift, "linh thien", "all")).toBe(true);
    expect(matchesDutyScheduleFilters(twoPeopleShift, "phap vuong", "S")).toBe(true);
    expect(matchesDutyScheduleFilters(twoPeopleShift, "phap vuong", "D")).toBe(false);
    expect(listDutySchedulePeople([twoPeopleShift])).toEqual(["Linh-Thiện", "Pháp-Vương"]);
  });

  it("does not mistake a person's name starting with D for a shift prefix", () => {
    expect(splitDutyAssignmentPeople("Dương Anh - Minh")).toEqual(["Dương Anh", "Minh"]);
  });
});

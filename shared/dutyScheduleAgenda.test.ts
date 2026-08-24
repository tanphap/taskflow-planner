import { describe, expect, it } from "vitest";
import { buildDutyScheduleAgenda } from "./dutyScheduleAgenda";

describe("buildDutyScheduleAgenda", () => {
  it("groups filtered shifts by date and orders dates and shifts predictably", () => {
    const result = buildDutyScheduleAgenda([
      { id: 4, dutyDate: "2026-08-19", shift: "D", assignment: "Bình", changeNote: null, isChanged: false },
      { id: 2, dutyDate: "2026-08-18", shift: "D", assignment: "An", changeNote: null, isChanged: false },
      { id: 3, dutyDate: "2026-08-19", shift: "S", assignment: "Chi", changeNote: "Đổi ca", isChanged: true },
      { id: 1, dutyDate: "2026-08-18", shift: "S", assignment: "Dũng", changeNote: null, isChanged: false },
    ]);

    expect(result.map(day => day.dutyDate)).toEqual(["2026-08-18", "2026-08-19"]);
    expect(result[0].entries.map(entry => entry.shift)).toEqual(["D", "S"]);
    expect(result[1].entries.map(entry => entry.assignment)).toEqual(["Bình", "Chi"]);
  });
});

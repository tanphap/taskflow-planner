import { normalizeTimesheetAccountSearch } from "./timesheetAccountSearch";

export type DutyScheduleFilterEntry = {
  assignment: string;
  shift: "S" | "D";
};

function normalizeDutyAssignment(value: string) {
  return normalizeTimesheetAccountSearch(value)
    .replace(/[-_./]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function matchesDutyScheduleFilters(entry: DutyScheduleFilterEntry, personQuery: string, shiftFilter: "all" | "S" | "D") {
  const normalizedQuery = normalizeDutyAssignment(personQuery);
  const matchesPerson = !normalizedQuery || normalizeDutyAssignment(entry.assignment).includes(normalizedQuery);
  const matchesShift = shiftFilter === "all" || entry.shift === shiftFilter;
  return matchesPerson && matchesShift;
}

export function listDutySchedulePeople(entries: DutyScheduleFilterEntry[]) {
  return Array.from(new Set(entries.map(entry => entry.assignment.trim()).filter(Boolean)))
    .sort((left, right) => left.localeCompare(right, "vi"));
}

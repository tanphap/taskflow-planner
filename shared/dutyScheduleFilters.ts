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

export function splitDutyAssignmentPeople(assignment: string) {
  const withoutShiftPrefix = assignment
    .trim()
    .replace(/^(?:ca\s*(?:sang|sáng|dem|đêm)|(?:ca\s*)?(?:s|d|đ)(?=\s|[:\-–—]|$))\s*[:\-–—]?\s*/i, "");

  return withoutShiftPrefix
    .split(/\s+(?:[-–—]|,|\/|\||&|va|và)\s+/i)
    .map(person => person.trim())
    .filter(Boolean);
}

export function matchesDutyScheduleFilters(entry: DutyScheduleFilterEntry, personQuery: string, shiftFilter: "all" | "S" | "D") {
  const normalizedQuery = normalizeDutyAssignment(personQuery);
  const assignedPeople = splitDutyAssignmentPeople(entry.assignment);
  const matchesPerson = !normalizedQuery
    || normalizeDutyAssignment(entry.assignment).includes(normalizedQuery)
    || assignedPeople.some(person => normalizeDutyAssignment(person).includes(normalizedQuery));
  const matchesShift = shiftFilter === "all" || entry.shift === shiftFilter;
  return matchesPerson && matchesShift;
}

export function listDutySchedulePeople(entries: DutyScheduleFilterEntry[]) {
  return Array.from(new Set(entries.flatMap(entry => splitDutyAssignmentPeople(entry.assignment))))
    .sort((left, right) => left.localeCompare(right, "vi"));
}

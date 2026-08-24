export type DutyScheduleAgendaEntry = {
  id: number;
  dutyDate: string;
  shift: "S" | "D";
  assignment: string;
  changeNote: string | null;
  isChanged: boolean;
};

export type DutyScheduleAgendaDay = {
  dutyDate: string;
  entries: DutyScheduleAgendaEntry[];
};

/** Groups the currently visible shifts into chronological, phone-friendly daily rows. */
export function buildDutyScheduleAgenda(entries: readonly DutyScheduleAgendaEntry[]): DutyScheduleAgendaDay[] {
  const byDate = new Map<string, DutyScheduleAgendaEntry[]>();

  for (const entry of entries) {
    byDate.set(entry.dutyDate, [...(byDate.get(entry.dutyDate) ?? []), entry]);
  }

  return Array.from(byDate.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([dutyDate, dayEntries]) => ({
      dutyDate,
      entries: [...dayEntries].sort((left, right) => {
        const shiftOrder = left.shift.localeCompare(right.shift);
        return shiftOrder || left.id - right.id;
      }),
    }));
}

export type RecurrenceFrequency = "daily" | "weekly" | "monthly";

export type RecurrenceRule = {
  freq: RecurrenceFrequency;
  interval: number;
  daysOfWeek?: number[];
  endDate?: string;
  count?: number;
};

/** Calculates a reminder instant by subtracting a whole-minute offset from an event start. */
export function quickReminderAt(startAt: Date | string, minutesBefore: number) {
  return new Date(new Date(startAt).getTime() - minutesBefore * 60_000);
}

type RecurringEvent = {
  id: number;
  startAt: Date | string;
  endAt: Date | string;
  reminderAt?: Date | string | null;
  recurrenceRule?: string | null;
};

export type CalendarOccurrence<T extends RecurringEvent> = T & {
  startAt: Date;
  endAt: Date;
  reminderAt: Date | null;
  sourceEventId: number;
  occurrenceIndex: number;
  isRecurringOccurrence: boolean;
  seriesStartAt: Date;
  seriesEndAt: Date;
};

const MAX_GENERATED_OCCURRENCES = 50_000;

function asDate(value: Date | string) {
  return value instanceof Date ? new Date(value) : new Date(value);
}

function validDateOnly(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function parseRecurrenceRule(value: string | null | undefined): RecurrenceRule | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<RecurrenceRule>;
    if (!parsed || !["daily", "weekly", "monthly"].includes(String(parsed.freq))) return null;
    const interval = Number(parsed.interval);
    if (!Number.isInteger(interval) || interval < 1 || interval > 365) return null;
    const rule: RecurrenceRule = { freq: parsed.freq as RecurrenceFrequency, interval };
    if (Array.isArray(parsed.daysOfWeek)) {
      const days = Array.from(new Set(parsed.daysOfWeek.map(Number).filter(day => Number.isInteger(day) && day >= 1 && day <= 7))).sort((a, b) => a - b);
      if (days.length) rule.daysOfWeek = days;
    }
    if (validDateOnly(parsed.endDate)) rule.endDate = parsed.endDate;
    if (Number.isInteger(parsed.count) && Number(parsed.count) >= 1 && Number(parsed.count) <= 500) rule.count = Number(parsed.count);
    if (rule.freq === "weekly" && !rule.daysOfWeek?.length) return null;
    if (rule.endDate && rule.count) return null;
    return rule;
  } catch {
    return null;
  }
}

function endOfRuleDate(value: string | undefined) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
}

function mondayStart(value: Date) {
  const day = value.getUTCDay() || 7;
  const result = new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  result.setUTCDate(result.getUTCDate() - day + 1);
  return result;
}

function sameDateWithBaseTime(date: Date, base: Date) {
  return new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    base.getUTCHours(),
    base.getUTCMinutes(),
    base.getUTCSeconds(),
    base.getUTCMilliseconds(),
  ));
}

function occurrenceForMonth(base: Date, monthOffset: number) {
  const monthStart = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + monthOffset, 1));
  const lastDay = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 0)).getUTCDate();
  return new Date(Date.UTC(
    monthStart.getUTCFullYear(),
    monthStart.getUTCMonth(),
    Math.min(base.getUTCDate(), lastDay),
    base.getUTCHours(),
    base.getUTCMinutes(),
    base.getUTCSeconds(),
    base.getUTCMilliseconds(),
  ));
}

function overlapsRange(startAt: Date, endAt: Date, rangeStart: Date, rangeEnd: Date) {
  return startAt <= rangeEnd && endAt >= rangeStart;
}

function buildOccurrence<T extends RecurringEvent>(event: T, startAt: Date, occurrenceIndex: number, isRecurringOccurrence: boolean): CalendarOccurrence<T> {
  const seriesStartAt = asDate(event.startAt);
  const seriesEndAt = asDate(event.endAt);
  const duration = seriesEndAt.getTime() - seriesStartAt.getTime();
  const originalReminder = event.reminderAt ? asDate(event.reminderAt) : null;
  const reminderOffset = originalReminder ? originalReminder.getTime() - seriesStartAt.getTime() : null;
  return {
    ...event,
    startAt,
    endAt: new Date(startAt.getTime() + duration),
    reminderAt: reminderOffset === null ? null : new Date(startAt.getTime() + reminderOffset),
    sourceEventId: event.id,
    occurrenceIndex,
    isRecurringOccurrence,
    seriesStartAt,
    seriesEndAt,
  };
}

/** Expands a stored series into dated occurrences that overlap the requested UTC window. */
export function expandEventOccurrences<T extends RecurringEvent>(event: T, rangeStart: Date, rangeEnd: Date): CalendarOccurrence<T>[] {
  const baseStart = asDate(event.startAt);
  const baseEnd = asDate(event.endAt);
  const rule = parseRecurrenceRule(event.recurrenceRule);
  if (!rule) return overlapsRange(baseStart, baseEnd, rangeStart, rangeEnd) ? [buildOccurrence(event, baseStart, 1, false)] : [];

  const dateLimit = endOfRuleDate(rule.endDate);
  const occurrences: CalendarOccurrence<T>[] = [];
  const add = (startAt: Date, occurrenceIndex: number) => {
    const occurrence = buildOccurrence(event, startAt, occurrenceIndex, true);
    if (overlapsRange(occurrence.startAt, occurrence.endAt, rangeStart, rangeEnd)) occurrences.push(occurrence);
  };

  if (rule.freq === "monthly") {
    for (let monthOffset = 0, occurrenceIndex = 0; monthOffset < MAX_GENERATED_OCCURRENCES; monthOffset += rule.interval) {
      const startAt = occurrenceForMonth(baseStart, monthOffset);
      if (dateLimit && startAt > dateLimit) break;
      if (startAt > rangeEnd && (!rule.count || occurrenceIndex >= rule.count)) break;
      occurrenceIndex += 1;
      if (rule.count && occurrenceIndex > rule.count) break;
      add(startAt, occurrenceIndex);
      if (startAt > rangeEnd && !rule.count) break;
    }
    return occurrences;
  }

  const firstDay = new Date(Date.UTC(baseStart.getUTCFullYear(), baseStart.getUTCMonth(), baseStart.getUTCDate()));
  const rangeEndDay = new Date(Date.UTC(rangeEnd.getUTCFullYear(), rangeEnd.getUTCMonth(), rangeEnd.getUTCDate()));
  const baseWeek = mondayStart(baseStart);
  let occurrenceIndex = 0;
  for (let cursor = new Date(firstDay), iterations = 0; cursor <= rangeEndDay && iterations < MAX_GENERATED_OCCURRENCES; cursor.setUTCDate(cursor.getUTCDate() + 1), iterations += 1) {
    const startAt = sameDateWithBaseTime(cursor, baseStart);
    if (dateLimit && startAt > dateLimit) break;
    if (startAt < baseStart) continue;
    const diffDays = Math.floor((cursor.getTime() - firstDay.getTime()) / 86_400_000);
    const isDaily = rule.freq === "daily" && diffDays % rule.interval === 0;
    const weekIndex = Math.floor((mondayStart(cursor).getTime() - baseWeek.getTime()) / (7 * 86_400_000));
    const dayOfWeek = cursor.getUTCDay() || 7;
    const isWeekly = rule.freq === "weekly" && weekIndex >= 0 && weekIndex % rule.interval === 0 && (rule.daysOfWeek ?? []).includes(dayOfWeek);
    if (!isDaily && !isWeekly) continue;
    occurrenceIndex += 1;
    if (rule.count && occurrenceIndex > rule.count) break;
    add(startAt, occurrenceIndex);
  }
  return occurrences;
}

export function expandCalendarEvents<T extends RecurringEvent>(events: T[], rangeStart: Date, rangeEnd: Date) {
  return events.flatMap(event => expandEventOccurrences(event, rangeStart, rangeEnd)).sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
}

/** Returns the recurring occurrence whose reminder should run around the supplied time. */
export function getTelegramOccurrenceDueAt<T extends RecurringEvent>(event: T, now: Date, toleranceMs = 20 * 60_000) {
  if (!event.reminderAt) return null;
  const baseStart = asDate(event.startAt);
  const baseReminder = asDate(event.reminderAt);
  const reminderOffset = baseReminder.getTime() - baseStart.getTime();
  const estimatedStart = new Date(now.getTime() - reminderOffset);
  const occurrences = expandEventOccurrences(
    event,
    new Date(estimatedStart.getTime() - toleranceMs),
    new Date(estimatedStart.getTime() + toleranceMs),
  );
  return occurrences.find(occurrence => occurrence.reminderAt && Math.abs(occurrence.reminderAt.getTime() - now.getTime()) <= toleranceMs) ?? null;
}

export type TaskEventSource = {
  title: string;
  description?: string | null;
  dueAt?: Date | string | null;
  reminderAt?: Date | string | null;
};

export type EventPrefill = {
  title: string;
  description: string | null;
  startAt: Date;
  endAt: Date;
  reminderAt: Date | null;
};

/** Creates an editable event draft from a task without altering the source task. */
export function eventPrefillFromTask(task: TaskEventSource, now = new Date()): EventPrefill {
  const startAt = task.dueAt ? new Date(task.dueAt) : new Date(now);
  startAt.setSeconds(0, 0);
  if (!task.dueAt) {
    startAt.setMinutes(0);
    startAt.setHours(startAt.getHours() + 1);
  }
  return {
    title: task.title,
    description: task.description?.trim() || null,
    startAt,
    endAt: new Date(startAt.getTime() + 60 * 60_000),
    reminderAt: task.reminderAt ? new Date(task.reminderAt) : null,
  };
}

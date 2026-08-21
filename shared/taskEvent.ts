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

export type EmailSummaryEventSource = {
  subject: string;
  summary: string;
  sender?: string | null;
  receivedAt?: Date | string | null;
  webLink?: string | null;
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

/** Creates an editable appointment draft from an AI email summary without saving any event. */
export function eventPrefillFromEmailSummary(source: EmailSummaryEventSource, now = new Date()): EventPrefill {
  const startAt = new Date(now);
  startAt.setSeconds(0, 0);
  startAt.setMinutes(0);
  startAt.setHours(startAt.getHours() + 1);
  const sourceDetails = [
    source.sender ? `Người gửi: ${source.sender}` : null,
    source.receivedAt ? `Email nhận lúc: ${new Date(source.receivedAt).toLocaleString("vi-VN")}` : null,
    source.webLink ? `Email gốc: ${source.webLink}` : null,
  ].filter(Boolean).join("\n");

  return {
    title: source.subject.trim() || "Lịch hẹn từ email",
    description: [`Tóm tắt AI từ email:\n${source.summary.trim()}`, sourceDetails].filter(Boolean).join("\n\n") || null,
    startAt,
    endAt: new Date(startAt.getTime() + 60 * 60_000),
    reminderAt: null,
  };
}

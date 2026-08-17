import { describe, expect, it } from "vitest";
import { eventPrefillFromTask } from "../shared/taskEvent";

describe("event prefill from task", () => {
  it("keeps a task's title, description, due time, and reminder when preparing an event", () => {
    const draft = eventPrefillFromTask({
      title: "Họp đội dự án",
      description: "Rà soát kế hoạch tuần",
      dueAt: new Date("2026-08-18T09:30:00.000Z"),
      reminderAt: new Date("2026-08-18T09:15:00.000Z"),
    });

    expect(draft.title).toBe("Họp đội dự án");
    expect(draft.description).toBe("Rà soát kế hoạch tuần");
    expect(draft.startAt.toISOString()).toBe("2026-08-18T09:30:00.000Z");
    expect(draft.endAt.toISOString()).toBe("2026-08-18T10:30:00.000Z");
    expect(draft.reminderAt?.toISOString()).toBe("2026-08-18T09:15:00.000Z");
  });

  it("uses the next whole hour for a task without a due time", () => {
    const draft = eventPrefillFromTask({ title: "Việc không có hạn" }, new Date("2026-08-18T09:42:15.000Z"));
    expect(draft.startAt.toISOString()).toBe("2026-08-18T10:00:00.000Z");
    expect(draft.endAt.toISOString()).toBe("2026-08-18T11:00:00.000Z");
    expect(draft.reminderAt).toBeNull();
  });
});

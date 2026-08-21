import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

vi.mock("./db", () => ({
  getDashboardData: vi.fn(),
  listTasks: vi.fn(),
  createTask: vi.fn(),
  updateTask: vi.fn(),
  deleteTask: vi.fn(),
  listEvents: vi.fn(),
  createEvent: vi.fn(),
  updateEvent: vi.fn(),
  deleteEvent: vi.fn(),
  syncDueNotifications: vi.fn(),
  markNotificationRead: vi.fn(),
  markAllNotificationsRead: vi.fn(),
  updateUserProfile: vi.fn(),
  getTelegramConnection: vi.fn(),
  createTelegramLink: vi.fn(),
  completeTelegramLink: vi.fn(),
  getEvent: vi.fn(),
  setEventTelegramJob: vi.fn(),
  clearEventTelegramJob: vi.fn(),
  getTelegramDeliveryHistory: vi.fn(),
  listEmailAccounts: vi.fn(),
  listEmailMessages: vi.fn(),
  getEmailAiOverview: vi.fn(),
  listEmailNotes: vi.fn(),
  createEmailNote: vi.fn(),
  updateEmailNote: vi.fn(),
  deleteEmailNote: vi.fn(),
  updateEmailMessageStatus: vi.fn(),
  getEmailAccountWithTokens: vi.fn(),
  removeEmailAccount: vi.fn(),
}));

import { appRouter } from "./routers";
import * as db from "./db";

function createUserContext(userId = 42): TrpcContext {
  return {
    user: {
      id: userId,
      openId: `user-${userId}`,
      name: "Người dùng thử nghiệm",
      email: "user@example.com",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { headers: {}, protocol: "https" } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("productivity router data isolation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("loads tasks only in the authenticated user's workspace", async () => {
    vi.mocked(db.listTasks).mockResolvedValue([]);
    const caller = appRouter.createCaller(createUserContext(42));

    await caller.tasks.list();

    expect(db.listTasks).toHaveBeenCalledWith(42);
  });

  it("passes the current account ID to task update and delete operations", async () => {
    vi.mocked(db.updateTask).mockResolvedValue(undefined);
    vi.mocked(db.deleteTask).mockResolvedValue(undefined);
    const caller = appRouter.createCaller(createUserContext(42));
    const data = {
      title: "Xác nhận báo cáo",
      description: null,
      status: "in_progress" as const,
      priority: "high" as const,
      dueAt: new Date("2026-08-19T08:00:00.000Z"),
      reminderAt: null,
    };

    await caller.tasks.update({ id: 9, data });
    await caller.tasks.delete({ id: 9 });

    expect(db.updateTask).toHaveBeenCalledWith(42, 9, data);
    expect(db.deleteTask).toHaveBeenCalledWith(42, 9);
  });

  it("uses the current account for event, notification, and profile operations", async () => {
    vi.mocked(db.createEvent).mockResolvedValue(31);
    vi.mocked(db.syncDueNotifications).mockResolvedValue([]);
    vi.mocked(db.markNotificationRead).mockResolvedValue(undefined);
    vi.mocked(db.updateUserProfile).mockResolvedValue(undefined);
    const caller = appRouter.createCaller(createUserContext(73));
    const event = {
      title: "Họp triển khai",
      description: "Phòng họp A",
      startAt: new Date("2026-08-19T09:00:00.000Z"),
      endAt: new Date("2026-08-19T10:00:00.000Z"),
      reminderAt: new Date("2026-08-19T08:45:00.000Z"),
      telegramReminder: false,
    };

    await caller.calendar.create(event);
    await caller.notifications.due();
    await caller.notifications.markRead({ id: 3 });
    await caller.profile.update({ name: "Minh", email: "minh@example.com" });

    expect(db.createEvent).toHaveBeenCalledWith(73, { ...event, recurrenceRule: null });
    expect(db.syncDueNotifications).toHaveBeenCalledWith(73);
    expect(db.markNotificationRead).toHaveBeenCalledWith(73, 3);
    expect(db.updateUserProfile).toHaveBeenCalledWith(73, { name: "Minh", email: "minh@example.com" });
  });

  it("rejects an event that ends before it begins without creating data", async () => {
    const caller = appRouter.createCaller(createUserContext(42));

    await expect(caller.calendar.create({
      title: "Sự kiện không hợp lệ",
      description: null,
      startAt: new Date("2026-08-19T10:00:00.000Z"),
      endAt: new Date("2026-08-19T09:00:00.000Z"),
      reminderAt: null,
      telegramReminder: false,
    })).rejects.toThrow("Thời gian kết thúc phải sau thời gian bắt đầu");

    expect(db.createEvent).not.toHaveBeenCalled();
  });

  it("rejects a task with an empty title before reaching the data layer", async () => {
    const caller = appRouter.createCaller(createUserContext(42));

    await expect(caller.tasks.create({
      title: "",
      description: null,
      status: "todo",
      priority: "medium",
      dueAt: null,
      reminderAt: null,
    })).rejects.toThrow("Vui lòng nhập tên công việc");

    expect(db.createTask).not.toHaveBeenCalled();
  });

  it("validates advanced recurrence and serializes the rule before saving an event", async () => {
    vi.mocked(db.createEvent).mockResolvedValue(21);
    const caller = appRouter.createCaller(createUserContext(42));
    const event = {
      title: "Lập kế hoạch tuần",
      description: null,
      startAt: new Date("2026-08-17T09:00:00.000Z"),
      endAt: new Date("2026-08-17T10:00:00.000Z"),
      reminderAt: null,
      telegramReminder: false,
      recurrenceRule: { freq: "weekly" as const, interval: 2, daysOfWeek: [1, 3], count: 8 },
    };

    await caller.calendar.create(event);

    expect(db.createEvent).toHaveBeenCalledWith(42, expect.objectContaining({
      recurrenceRule: JSON.stringify(event.recurrenceRule),
    }));
    await expect(caller.calendar.create({ ...event, recurrenceRule: { freq: "weekly", interval: 1 } })).rejects.toThrow("Lịch hằng tuần cần chọn ít nhất một ngày");
  });

  it("uses the current account when creating and reading a Telegram link", async () => {
    vi.mocked(db.createTelegramLink).mockResolvedValue(undefined);
    vi.mocked(db.getTelegramConnection).mockResolvedValue({
      id: 1,
      userId: 73,
      chatId: "123456",
      linkToken: null,
      linkTokenExpiresAt: null,
      connectedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const caller = appRouter.createCaller(createUserContext(73));

    const link = await caller.telegram.beginLink();
    const status = await caller.telegram.status();

    expect(link.code).toMatch(/^TF-/);
    expect(db.createTelegramLink).toHaveBeenCalledWith(73, expect.stringMatching(/^TF-/), expect.any(Date));
    expect(db.getTelegramConnection).toHaveBeenCalledWith(73);
    expect(status).toMatchObject({ connected: true, pending: false });
  });

  it("returns Telegram delivery history only for the authenticated account", async () => {
    vi.mocked(db.getTelegramDeliveryHistory).mockResolvedValue([]);
    const caller = appRouter.createCaller(createUserContext(73));

    await caller.telegram.deliveryHistory({ limit: 12 });

    expect(db.getTelegramDeliveryHistory).toHaveBeenCalledWith(73, 12);
  });

  it("scopes inbox account, message and status operations to the authenticated account", async () => {
    vi.mocked(db.listEmailAccounts).mockResolvedValue([]);
    vi.mocked(db.listEmailMessages).mockResolvedValue([]);
    vi.mocked(db.updateEmailMessageStatus).mockResolvedValue(undefined);
    vi.mocked(db.getEmailAccountWithTokens).mockResolvedValue(null);
    vi.mocked(db.removeEmailAccount).mockResolvedValue(undefined);
    const caller = appRouter.createCaller(createUserContext(73));

    await caller.email.accounts();
    await caller.email.messages({ accountId: 9, status: "new", limit: 25 });
    await caller.email.updateMessageStatus({ id: 17, status: "done" });
    await caller.email.disconnect({ id: 9 });

    expect(db.listEmailAccounts).toHaveBeenCalledWith(73);
    expect(db.listEmailMessages).toHaveBeenCalledWith(73, { accountId: 9, status: "new", limit: 25 });
    expect(db.updateEmailMessageStatus).toHaveBeenCalledWith(73, 17, "done");
    expect(db.getEmailAccountWithTokens).toHaveBeenCalledWith(73, 9);
    expect(db.removeEmailAccount).toHaveBeenCalledWith(73, 9);
  });

  it("scopes AI overview and email note operations to the authenticated account", async () => {
    const note = { id: 41, title: "Theo dõi hợp đồng", body: "Phản hồi trước thứ Sáu", isPinned: true, emailAccountId: 9, emailMessageId: 17 };
    vi.mocked(db.getEmailAiOverview).mockResolvedValue({ inboxCount: 18, summarizedCount: 4, summarizedToday: 1, noteCount: 1, recentSummaries: [] } as never);
    vi.mocked(db.listEmailNotes).mockResolvedValue([note] as never);
    vi.mocked(db.createEmailNote).mockResolvedValue(note as never);
    vi.mocked(db.updateEmailNote).mockResolvedValue(note as never);
    vi.mocked(db.deleteEmailNote).mockResolvedValue(undefined);
    const caller = appRouter.createCaller(createUserContext(73));

    await caller.email.aiOverview();
    await caller.email.notes({ limit: 25 });
    await caller.email.createNote(note);
    await caller.email.updateNote({ id: 41, data: { ...note, title: "Theo dõi hợp đồng đã cập nhật" } });
    await caller.email.deleteNote({ id: 41 });

    expect(db.getEmailAiOverview).toHaveBeenCalledWith(73);
    expect(db.listEmailNotes).toHaveBeenCalledWith(73, 25);
    expect(db.createEmailNote).toHaveBeenCalledWith(73, expect.objectContaining({ title: note.title, body: note.body, isPinned: note.isPinned, emailAccountId: note.emailAccountId, emailMessageId: note.emailMessageId }));
    expect(db.updateEmailNote).toHaveBeenCalledWith(73, 41, expect.objectContaining({ title: "Theo dõi hợp đồng đã cập nhật" }));
    expect(db.deleteEmailNote).toHaveBeenCalledWith(73, 41);
  });

  it("rejects an empty email note title before reaching the data layer", async () => {
    const caller = appRouter.createCaller(createUserContext(73));

    await expect(caller.email.createNote({ title: "", body: null, isPinned: false, emailAccountId: null, emailMessageId: null })).rejects.toThrow("Hãy nhập tiêu đề ghi chú");

    expect(db.createEmailNote).not.toHaveBeenCalled();
  });
});

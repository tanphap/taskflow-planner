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
  markEmailMessageRead: vi.fn(),
  getEmailGeminiSummary: vi.fn(),
  getEmailMessageForGeminiSummary: vi.fn(),
  createEmailGeminiSummary: vi.fn(),
  countEmailGeminiSummariesSince: vi.fn(),
  getEmailAccountWithTokens: vi.fn(),
  removeEmailAccount: vi.fn(),
}));
vi.mock("./emailSync", () => ({
  syncMailbox: vi.fn(),
  fetchOlderMailboxMessages: vi.fn(),
  fetchMailboxMessageForGeminiSummary: vi.fn(),
  inspectMailboxSpreadsheetsForGemini: vi.fn(),
  verifyImapConnection: vi.fn(),
  verifyWebmailImapConnection: vi.fn(),
}));
vi.mock("./geminiEmailSummary", () => ({
  GEMINI_EMAIL_SUMMARY_MODEL: "gemini-3.5-flash-lite",
  GeminiTemporaryError: class GeminiTemporaryError extends Error { readonly retryable = true; },
  summarizeGmailEmailWithGemini: vi.fn(),
  isGeminiTemporaryError: (error: unknown) => Boolean(error && typeof error === "object" && "retryable" in error && (error as { retryable?: unknown }).retryable),
}));

import { appRouter } from "./routers";
import * as db from "./db";
import { summarizeGmailEmailWithGemini } from "./geminiEmailSummary";
import { fetchOlderMailboxMessages, fetchMailboxMessageForGeminiSummary, inspectMailboxSpreadsheetsForGemini } from "./emailSync";

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

  it("loads older IMAP messages only for the authenticated user and selected mailbox", async () => {
    vi.mocked(fetchOlderMailboxMessages).mockResolvedValue({ count: 100, messages: [], hasMore: true, nextBeforeUid: 401, total: 200 });
    const caller = appRouter.createCaller(createUserContext(73));

    const result = await caller.email.fetchOlderMessages({ id: 9, beforeUid: 801 });

    expect(fetchOlderMailboxMessages).toHaveBeenCalledWith(73, 9, 801);
    expect(result).toMatchObject({ success: true, count: 100, hasMore: true, total: 200 });
  });

  it("scopes AI overview and email note operations to the authenticated account", async () => {
    const note = { id: 41, title: "Theo dõi hợp đồng", body: "Phản hồi trước thứ Sáu", isPinned: true, emailAccountId: 9, emailMessageId: 17 };
    const recentSummary = { id: 61, emailSubject: "Kế hoạch triển khai", senderName: "Lan", summary: "Cuộc họp được dời sang thứ Năm.", generatedAt: new Date("2026-08-21T03:00:00.000Z") };
    vi.mocked(db.getEmailAiOverview).mockResolvedValue({ inboxCount: 18, summarizedCount: 4, summarizedToday: 1, noteCount: 1, recentSummaries: [recentSummary] } as never);
    vi.mocked(db.listEmailNotes).mockResolvedValue([note] as never);
    vi.mocked(db.createEmailNote).mockResolvedValue(note as never);
    vi.mocked(db.updateEmailNote).mockResolvedValue(note as never);
    vi.mocked(db.deleteEmailNote).mockResolvedValue(undefined);
    const caller = appRouter.createCaller(createUserContext(73));

    const overview = await caller.email.aiOverview();
    await caller.email.notes({ limit: 25 });
    await caller.email.createNote(note);
    await caller.email.updateNote({ id: 41, data: { ...note, title: "Theo dõi hợp đồng đã cập nhật" } });
    await caller.email.deleteNote({ id: 41 });

    expect(db.getEmailAiOverview).toHaveBeenCalledWith(73);
    expect(overview.recentSummaries).toEqual([recentSummary]);
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

  it("summarizes a selected Gmail email without applying a daily in-app limit", async () => {
    vi.mocked(db.getEmailGeminiSummary).mockResolvedValue(null);
    vi.mocked(db.getEmailMessageForGeminiSummary).mockResolvedValue({
      id: 17,
      emailAccountId: 9,
      subject: "Kế hoạch triển khai",
      senderName: "Lan",
      senderEmail: "lan@example.com",
      snippet: "Họp cập nhật vào thứ Năm.",
      receivedAt: new Date("2026-08-21T08:00:00.000Z"),
    } as never);
    vi.mocked(fetchMailboxMessageForGeminiSummary).mockResolvedValue({ text: "Nội dung email đầy đủ.", truncated: false, attachments: [] });
    vi.mocked(db.listEmailMessages).mockResolvedValue([]);
    vi.mocked(db.listEvents).mockResolvedValue([]);
    vi.mocked(summarizeGmailEmailWithGemini).mockResolvedValue({ summary: "- Họp cập nhật vào thứ Năm.", model: "gemini-3.5-flash-lite", eventStartAt: null, eventEndAt: null });
    vi.mocked(db.createEmailGeminiSummary).mockResolvedValue({ id: 61, summary: "- Họp cập nhật vào thứ Năm." } as never);
    const caller = appRouter.createCaller(createUserContext(73));

    const result = await caller.email.summarizeWithGemini({ messageId: 17, locale: "vi", acknowledgeUnpaidDataUse: true });

    expect(db.countEmailGeminiSummariesSince).not.toHaveBeenCalled();
    expect(fetchMailboxMessageForGeminiSummary).toHaveBeenCalledWith(73, 17, { spreadsheetSelections: undefined });
    expect(summarizeGmailEmailWithGemini).toHaveBeenCalledWith(expect.objectContaining({ body: "Nội dung email đầy đủ.", attachments: [], busySlots: [] }), "vi");
    expect(db.createEmailGeminiSummary).toHaveBeenCalledWith(73, expect.objectContaining({ emailAccountId: 9, emailMessageId: 17 }));
    expect(db.markEmailMessageRead).toHaveBeenCalledWith(73, 17);
    expect(result).not.toHaveProperty("remainingToday");
  });

  it("returns bounded Excel sheet metadata before the user authorizes data extraction", async () => {
    vi.mocked(inspectMailboxSpreadsheetsForGemini).mockResolvedValue([{ attachmentIndex: 2, filename: "bao-cao.xlsx", kind: "excel", sheetNames: ["Tổng quan", "Ngân sách"] }]);
    const caller = appRouter.createCaller(createUserContext(73));

    await expect(caller.email.inspectGeminiSpreadsheets({ messageId: 17 })).resolves.toEqual({ spreadsheets: [{ attachmentIndex: 2, filename: "bao-cao.xlsx", kind: "excel", sheetNames: ["Tổng quan", "Ngân sách"] }] });
    expect(inspectMailboxSpreadsheetsForGemini).toHaveBeenCalledWith(73, 17);
  });

  it("passes only user-selected Excel sheets to the Gemini content loader", async () => {
    vi.mocked(db.getEmailGeminiSummary).mockResolvedValue(null);
    vi.mocked(db.getEmailMessageForGeminiSummary).mockResolvedValue({ id: 17, emailAccountId: 9, subject: "Báo cáo", senderName: "Lan", senderEmail: "lan@example.com", snippet: "Xem bảng", receivedAt: new Date() } as never);
    vi.mocked(fetchMailboxMessageForGeminiSummary).mockResolvedValue({ text: "Nội dung", truncated: false, attachments: [] });
    vi.mocked(db.listEmailMessages).mockResolvedValue([]);
    vi.mocked(db.listEvents).mockResolvedValue([]);
    vi.mocked(summarizeGmailEmailWithGemini).mockResolvedValue({ summary: "Tóm tắt", model: "gemini-3.5-flash-lite", eventStartAt: null, eventEndAt: null });
    vi.mocked(db.createEmailGeminiSummary).mockResolvedValue({ id: 63, summary: "Tóm tắt" } as never);
    const caller = appRouter.createCaller(createUserContext(73));

    await caller.email.summarizeWithGemini({ messageId: 17, locale: "vi", acknowledgeUnpaidDataUse: true, spreadsheetSelections: [{ attachmentIndex: 2, sheetNames: ["Ngân sách"] }] });

    expect(fetchMailboxMessageForGeminiSummary).toHaveBeenCalledWith(73, 17, { spreadsheetSelections: [{ attachmentIndex: 2, sheetNames: ["Ngân sách"] }] });
  });

  it("removes a Gemini appointment proposal when it overlaps an existing calendar event", async () => {
    vi.mocked(db.getEmailGeminiSummary).mockResolvedValue(null);
    vi.mocked(db.getEmailMessageForGeminiSummary).mockResolvedValue({
      id: 17, emailAccountId: 9, subject: "Họp khách hàng", senderName: "Lan", senderEmail: "lan@example.com", snippet: "Họp lúc 10:30.", receivedAt: new Date("2026-08-21T08:00:00.000Z"),
    } as never);
    vi.mocked(fetchMailboxMessageForGeminiSummary).mockResolvedValue({ text: "Xác nhận cuộc họp khách hàng lúc 10:30.", truncated: false, attachments: [] });
    vi.mocked(db.listEmailMessages).mockResolvedValue([]);
    vi.mocked(db.listEvents).mockResolvedValue([{ startAt: new Date("2026-08-24T03:00:00.000Z"), endAt: new Date("2026-08-24T04:00:00.000Z") }] as never);
    vi.mocked(summarizeGmailEmailWithGemini).mockResolvedValue({ summary: "- Họp khách hàng lúc 10:30.", model: "gemini-3.5-flash-lite", eventStartAt: new Date("2026-08-24T03:30:00.000Z"), eventEndAt: new Date("2026-08-24T04:00:00.000Z") });
    vi.mocked(db.createEmailGeminiSummary).mockResolvedValue({ id: 62, summary: "Tóm tắt đã lưu." } as never);
    const caller = appRouter.createCaller(createUserContext(73));

    await caller.email.summarizeWithGemini({ messageId: 17, locale: "vi", acknowledgeUnpaidDataUse: true });

    expect(db.createEmailGeminiSummary).toHaveBeenCalledWith(73, expect.objectContaining({ eventStartAt: null, eventEndAt: null, summary: expect.stringContaining("Kiểm tra lịch") }));
  });

  it("returns a retryable tRPC status when Gemini is temporarily unavailable", async () => {
    vi.mocked(db.getEmailGeminiSummary).mockResolvedValue(null);
    vi.mocked(db.getEmailMessageForGeminiSummary).mockResolvedValue({ id: 17, emailAccountId: 9, subject: "Kế hoạch", senderName: "Lan", senderEmail: "lan@example.com", snippet: "Nội dung", receivedAt: new Date() } as never);
    vi.mocked(fetchMailboxMessageForGeminiSummary).mockResolvedValue({ text: "Nội dung email đầy đủ.", truncated: false, attachments: [] });
    vi.mocked(db.listEmailMessages).mockResolvedValue([]);
    vi.mocked(db.listEvents).mockResolvedValue([]);
    vi.mocked(summarizeGmailEmailWithGemini).mockRejectedValue(Object.assign(new Error("Gemini đang tạm thời không sẵn sàng."), { name: "GeminiTemporaryError", retryable: true, status: 503 }));
    const caller = appRouter.createCaller(createUserContext(73));

    await expect(caller.email.summarizeWithGemini({ messageId: 17, locale: "vi", acknowledgeUnpaidDataUse: true })).rejects.toMatchObject({ code: "SERVICE_UNAVAILABLE" });
    expect(db.createEmailGeminiSummary).not.toHaveBeenCalled();
  });

  it("marks a message as read when returning a previously generated summary", async () => {
    vi.mocked(db.getEmailGeminiSummary).mockResolvedValue({ id: 61, summary: "Tóm tắt có sẵn." } as never);
    const caller = appRouter.createCaller(createUserContext(73));

    const result = await caller.email.summarizeWithGemini({ messageId: 17, locale: "vi", acknowledgeUnpaidDataUse: true });

    expect(result).toMatchObject({ cached: true, summary: "Tóm tắt có sẵn." });
    expect(db.markEmailMessageRead).toHaveBeenCalledWith(73, 17);
    expect(db.getEmailMessageForGeminiSummary).not.toHaveBeenCalled();
    expect(summarizeGmailEmailWithGemini).not.toHaveBeenCalled();
  });
});

import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { ENV } from "./_core/env";
import { createHeartbeatJob, deleteHeartbeatJob, updateHeartbeatJob } from "./_core/heartbeat";
import { getRequestSessionToken } from "./_core/sessionToken";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { findPrivateChatForLinkCode } from "./telegram";
import { parseRecurrenceRule } from "../shared/recurrence";
import { encryptEmailToken, getEmailProviderConfiguration } from "./emailOAuth";
import { fetchOlderMailboxMessages, fetchMailboxMessageForGeminiSummary, fetchOriginalMailboxMessage, syncMailbox, verifyImapConnection, verifyWebmailImapConnection } from "./emailSync";
import { analyzeMailboxForEmailEvents } from "./emailAi";
import { configureEmailAiSync, EMAIL_AI_SYNC_INTERVALS } from "./emailAiScheduler";
import { isGeminiTemporaryError, summarizeGmailEmailWithGemini } from "./geminiEmailSummary";

const taskInput = z.object({
  title: z.string().trim().min(1, "Vui lòng nhập tên công việc").max(240), description: z.string().max(2000).nullable().optional(),
  status: z.enum(["todo", "in_progress", "done"]), priority: z.enum(["low", "medium", "high"]), dueAt: z.coerce.date().nullable().optional(), reminderAt: z.coerce.date().nullable().optional(),
});
const recurrenceRuleInput = z.object({
  freq: z.enum(["daily", "weekly", "monthly"]),
  interval: z.number().int().min(1).max(365),
  daysOfWeek: z.array(z.number().int().min(1).max(7)).max(7).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  count: z.number().int().min(1).max(500).optional(),
}).superRefine((rule, context) => {
  if (rule.freq === "weekly" && !rule.daysOfWeek?.length) context.addIssue({ code: "custom", message: "Lịch hằng tuần cần chọn ít nhất một ngày", path: ["daysOfWeek"] });
  if (rule.endDate && rule.count) context.addIssue({ code: "custom", message: "Chỉ chọn ngày kết thúc hoặc số lần lặp", path: ["count"] });
});
const eventInput = z.object({
  title: z.string().trim().min(1, "Vui lòng nhập tên sự kiện").max(240), description: z.string().max(2000).nullable().optional(),
  startAt: z.coerce.date(), endAt: z.coerce.date(), reminderAt: z.coerce.date().nullable().optional(), recurrenceRule: recurrenceRuleInput.nullable().optional(), telegramReminder: z.boolean().default(false),
}).refine(value => value.endAt > value.startAt, { message: "Thời gian kết thúc phải sau thời gian bắt đầu", path: ["endAt"] });
const emailNoteInput = z.object({
  title: z.string().trim().min(1, "Hãy nhập tiêu đề ghi chú").max(240),
  body: z.string().trim().max(4000).nullable().optional(),
  isPinned: z.boolean().default(false),
  emailAccountId: z.number().int().positive().nullable().optional(),
  emailMessageId: z.number().int().positive().nullable().optional(),
});

function serializeEventInput(input: z.infer<typeof eventInput>): db.EventInput {
  const { recurrenceRule, ...event } = input;
  return { ...event, recurrenceRule: recurrenceRule ? JSON.stringify(recurrenceRule) : null };
}

function normalizeConversationSubject(subject: string) {
  return subject.replace(/^\s*(?:(?:re|fw|fwd)\s*:\s*)+/i, "").replace(/\s+/g, " ").trim().toLocaleLowerCase();
}

function guardGeminiProposalAgainstCalendar<T extends { summary: string; eventStartAt: Date | null; eventEndAt: Date | null }>(result: T, busySlots: Array<{ startAt: Date; endAt: Date }>, locale: "vi" | "en") {
  if (!result.eventStartAt) return result;
  const proposedEndAt = result.eventEndAt ?? new Date(result.eventStartAt.getTime() + 60 * 60_000);
  const overlaps = busySlots.some(slot => slot.startAt < proposedEndAt && slot.endAt > result.eventStartAt!);
  if (!overlaps) return result;
  const note = locale === "en"
    ? "Calendar check: the requested time overlaps an existing appointment. No time was prefilled; please choose a free slot before confirming."
    : "Kiểm tra lịch: thời điểm được nêu đang trùng một lịch hẹn hiện có. Hệ thống không tiền điền giờ; hãy chọn khung giờ trống trước khi xác nhận.";
  return { ...result, summary: `${result.summary}\n\n- ${note}`.slice(0, 8000), eventStartAt: null, eventEndAt: null };
}
export function cronFor(date: Date, recurrenceRule?: string | null) {
  const rule = parseRecurrenceRule(recurrenceRule);
  const minute = date.getUTCMinutes();
  const hour = date.getUTCHours();
  if (!rule) return `0 ${minute} ${hour} ${date.getUTCDate()} ${date.getUTCMonth() + 1} *`;
  if (rule.freq === "daily" || rule.freq === "monthly") return `0 ${minute} ${hour} * * *`;
  if (rule.freq === "weekly") return `0 ${minute} ${hour} * * ${(rule.daysOfWeek ?? []).map(day => day === 7 ? 0 : day).join(",")}`;
  return `0 ${minute} ${hour} ${date.getUTCDate()} * *`;
}
async function validateTelegramReminder(userId: number, input: db.EventInput) {
  if (!input.telegramReminder) return;
  if (!ENV.isProduction) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Hãy xuất bản ứng dụng trước khi đặt nhắc Telegram." });
  if (!input.reminderAt || input.reminderAt.getTime() < Date.now() + 60_000) throw new TRPCError({ code: "BAD_REQUEST", message: "Nhắc Telegram phải cách thời điểm hiện tại ít nhất một phút." });
  if (!(await db.getTelegramConnection(userId))?.chatId) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Hãy liên kết Telegram trong Hồ sơ trước khi bật nhắc." });
}
async function createEventJob(userId: number, eventId: number, reminderAt: Date, headers: { cookie?: string; authorization?: string }) {
  const event = await db.getEvent(userId, eventId);
  const job = await createHeartbeatJob({ name: `telegram-event-${eventId}`, cron: cronFor(reminderAt, event?.recurrenceRule), path: "/api/scheduled/telegram-event-reminder", description: `Nhắc Telegram cho lịch hẹn #${eventId}` }, getRequestSessionToken(headers));
  await db.setEventTelegramJob(userId, eventId, job.taskUid);
}

export const appRouter = router({
  system: systemRouter,
  auth: router({ me: publicProcedure.query(opts => opts.ctx.user), logout: publicProcedure.mutation(({ ctx }) => { const options = getSessionCookieOptions(ctx.req); ctx.res.clearCookie(COOKIE_NAME, { ...options, maxAge: -1 }); return { success: true } as const; }) }),
  dashboard: router({ overview: protectedProcedure.query(({ ctx }) => db.getDashboardData(ctx.user.id)) }),
  tasks: router({
    list: protectedProcedure.query(({ ctx }) => db.listTasks(ctx.user.id)),
    create: protectedProcedure.input(taskInput).mutation(async ({ ctx, input }) => { await db.createTask(ctx.user.id, input); return { success: true } as const; }),
    update: protectedProcedure.input(z.object({ id: z.number().int().positive(), data: taskInput })).mutation(async ({ ctx, input }) => { await db.updateTask(ctx.user.id, input.id, input.data); return { success: true } as const; }),
    delete: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => { await db.deleteTask(ctx.user.id, input.id); return { success: true } as const; }),
  }),
  calendar: router({
    list: protectedProcedure.query(({ ctx }) => db.listEvents(ctx.user.id)),
    create: protectedProcedure.input(eventInput).mutation(async ({ ctx, input }) => { const normalizedInput = serializeEventInput(input); await validateTelegramReminder(ctx.user.id, normalizedInput); const eventId = await db.createEvent(ctx.user.id, normalizedInput); if (normalizedInput.telegramReminder && normalizedInput.reminderAt) await createEventJob(ctx.user.id, eventId, normalizedInput.reminderAt, ctx.req.headers); return { success: true as const, id: eventId }; }),
    update: protectedProcedure.input(z.object({ id: z.number().int().positive(), data: eventInput })).mutation(async ({ ctx, input }) => { const previous = await db.getEvent(ctx.user.id, input.id); if (!previous) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy lịch hẹn" }); const normalizedInput = serializeEventInput(input.data); await validateTelegramReminder(ctx.user.id, normalizedInput); await db.updateEvent(ctx.user.id, input.id, normalizedInput); const token = getRequestSessionToken(ctx.req.headers); if (!normalizedInput.telegramReminder && previous.telegramJobUid) { await deleteHeartbeatJob(previous.telegramJobUid, token); await db.clearEventTelegramJob(ctx.user.id, input.id); } else if (normalizedInput.telegramReminder && normalizedInput.reminderAt) { if (previous.telegramJobUid) await updateHeartbeatJob(previous.telegramJobUid, { cron: cronFor(normalizedInput.reminderAt, normalizedInput.recurrenceRule), enable: true }, token); else await createEventJob(ctx.user.id, input.id, normalizedInput.reminderAt, ctx.req.headers); } return { success: true } as const; }),
    delete: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => { const event = await db.getEvent(ctx.user.id, input.id); if (event?.telegramJobUid) await deleteHeartbeatJob(event.telegramJobUid, getRequestSessionToken(ctx.req.headers)); await db.deleteEvent(ctx.user.id, input.id); return { success: true } as const; }),
  }),
  notifications: router({ due: protectedProcedure.query(({ ctx }) => db.syncDueNotifications(ctx.user.id)), markRead: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => { await db.markNotificationRead(ctx.user.id, input.id); return { success: true } as const; }), markAllRead: protectedProcedure.mutation(async ({ ctx }) => { await db.markAllNotificationsRead(ctx.user.id); return { success: true } as const; }) }),
  profile: router({ update: protectedProcedure.input(z.object({ name: z.string().trim().max(120), email: z.string().trim().email("Địa chỉ email không hợp lệ").max(320) })).mutation(async ({ ctx, input }) => { await db.updateUserProfile(ctx.user.id, input); return { success: true } as const; }) }),
  telegram: router({
    status: protectedProcedure.query(async ({ ctx }) => { const connection = await db.getTelegramConnection(ctx.user.id); return { connected: Boolean(connection?.chatId), pending: Boolean(connection?.linkToken), expiresAt: connection?.linkTokenExpiresAt ?? null }; }),
    beginLink: protectedProcedure.mutation(async ({ ctx }) => { const code = `TF-${nanoid(24)}`; const expiresAt = new Date(Date.now() + 15 * 60_000); await db.createTelegramLink(ctx.user.id, code, expiresAt); return { code, expiresAt }; }),
    confirmLink: protectedProcedure.mutation(async ({ ctx }) => { const connection = await db.getTelegramConnection(ctx.user.id); if (!connection?.linkToken || !connection.linkTokenExpiresAt || connection.linkTokenExpiresAt < new Date()) throw new TRPCError({ code: "BAD_REQUEST", message: "Mã liên kết đã hết hạn. Hãy tạo mã mới." }); const chatId = await findPrivateChatForLinkCode(connection.linkToken); if (!chatId) return { connected: false } as const; await db.completeTelegramLink(ctx.user.id, connection.linkToken, chatId); return { connected: true } as const; }),
    deliveryHistory: protectedProcedure.input(z.object({ limit: z.number().int().min(1).max(100).optional() }).optional()).query(({ ctx, input }) => db.getTelegramDeliveryHistory(ctx.user.id, input?.limit)),
  }),
  email: router({
    configuration: protectedProcedure.query(() => getEmailProviderConfiguration()),
    accounts: protectedProcedure.query(({ ctx }) => db.listEmailAccounts(ctx.user.id)),
    messages: protectedProcedure.input(z.object({ accountId: z.number().int().positive().optional(), status: z.enum(["new", "in_progress", "done", "archived"]).optional(), limit: z.number().int().min(1).max(100).optional() }).optional()).query(({ ctx, input }) => db.listEmailMessages(ctx.user.id, input)),
    geminiSummaries: protectedProcedure.input(z.object({ limit: z.number().int().min(1).max(100).optional() }).optional()).query(({ ctx, input }) => db.listEmailGeminiSummaries(ctx.user.id, input?.limit)),
    aiOverview: protectedProcedure.query(({ ctx }) => db.getEmailAiOverview(ctx.user.id)),
    notes: protectedProcedure.input(z.object({ limit: z.number().int().min(1).max(100).optional() }).optional()).query(({ ctx, input }) => db.listEmailNotes(ctx.user.id, input?.limit)),
    createNote: protectedProcedure.input(emailNoteInput).mutation(async ({ ctx, input }) => {
      try {
        const note = await db.createEmailNote(ctx.user.id, input);
        if (!note) throw new Error("Không thể lưu ghi chú email.");
        return note;
      } catch (error) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: error instanceof Error ? error.message : "Không thể lưu ghi chú email." });
      }
    }),
    updateNote: protectedProcedure.input(z.object({ id: z.number().int().positive(), data: emailNoteInput })).mutation(async ({ ctx, input }) => {
      try {
        const note = await db.updateEmailNote(ctx.user.id, input.id, input.data);
        if (!note) throw new Error("Không tìm thấy ghi chú email.");
        return note;
      } catch (error) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: error instanceof Error ? error.message : "Không thể cập nhật ghi chú email." });
      }
    }),
    deleteNote: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      await db.deleteEmailNote(ctx.user.id, input.id);
      return { success: true } as const;
    }),
    summarizeWithGemini: protectedProcedure.input(z.object({
      messageId: z.number().int().positive(),
      locale: z.enum(["vi", "en"]).default("vi"),
      acknowledgeUnpaidDataUse: z.literal(true, { message: "Cần xác nhận về xử lý dữ liệu Gemini miễn phí trước khi tóm tắt." }),
    })).mutation(async ({ ctx, input }) => {
      const cached = await db.getEmailGeminiSummary(ctx.user.id, input.messageId);
      if (cached) {
        await db.markEmailMessageRead(ctx.user.id, input.messageId);
        return { ...cached, cached: true as const };
      }
      const source = await db.getEmailMessageForGeminiSummary(ctx.user.id, input.messageId);
      if (!source) throw new TRPCError({ code: "NOT_FOUND", message: "Chỉ có thể tóm tắt email đã kết nối của bạn." });
      try {
        const [rawMessage, accountMessages, calendarEvents] = await Promise.all([
          fetchMailboxMessageForGeminiSummary(ctx.user.id, input.messageId),
          db.listEmailMessages(ctx.user.id, { accountId: source.emailAccountId, limit: 100 }),
          db.listEvents(ctx.user.id),
        ]);
        const conversationSubject = normalizeConversationSubject(source.subject);
        const conversation = (accountMessages ?? []).filter(message => message.id !== source.id && normalizeConversationSubject(message.subject) === conversationSubject).slice(-6);
        const now = Date.now();
        const busySlots = (calendarEvents ?? []).filter(event => event.endAt.getTime() > now).slice(0, 80).map(event => ({ startAt: event.startAt, endAt: event.endAt }));
        const proposedResult = await summarizeGmailEmailWithGemini({
          ...source,
          body: rawMessage.text,
          bodyTruncated: rawMessage.truncated,
          conversation,
          attachments: rawMessage.attachments,
          busySlots,
        }, input.locale);
        const result = guardGeminiProposalAgainstCalendar(proposedResult, busySlots, input.locale);
        const summary = await db.createEmailGeminiSummary(ctx.user.id, { emailAccountId: source.emailAccountId, emailMessageId: source.id, summary: result.summary, eventStartAt: result.eventStartAt, eventEndAt: result.eventEndAt, locale: input.locale, model: result.model });
        if (!summary) throw new Error("Không thể lưu tóm tắt Gemini.");
        await db.markEmailMessageRead(ctx.user.id, input.messageId);
        return { ...summary, cached: false as const };
      } catch (error) {
        if (isGeminiTemporaryError(error)) {
          throw new TRPCError({ code: error.status === 429 ? "TOO_MANY_REQUESTS" : "SERVICE_UNAVAILABLE", message: error.message });
        }
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: error instanceof Error ? error.message : "Không thể tóm tắt email bằng Gemini." });
      }
    }),
    updateMessageStatus: protectedProcedure.input(z.object({ id: z.number().int().positive(), status: z.enum(["new", "in_progress", "done", "archived"]) })).mutation(async ({ ctx, input }) => { await db.updateEmailMessageStatus(ctx.user.id, input.id, input.status); return { success: true } as const; }),
    connectGmailImap: protectedProcedure.input(z.object({ email: z.string().trim().email("Địa chỉ Gmail không hợp lệ").max(320), username: z.string().trim().min(1).max(320).optional(), appPassword: z.string().min(1, "Hãy nhập mật khẩu ứng dụng").max(512), mailbox: z.string().trim().min(1).max(255).optional() })).mutation(async ({ ctx, input }) => {
      const email = input.email.toLowerCase();
      const username = (input.username || email).toLowerCase();
      const mailbox = input.mailbox || "INBOX";
      try {
        await verifyImapConnection({ host: "imap.gmail.com", port: 993, secure: true, user: username, pass: input.appPassword, mailbox });
        await db.upsertImapEmailAccount(ctx.user.id, { provider: "google", email, imapHost: "imap.gmail.com", imapPort: 993, imapSecure: true, imapUsername: username, imapPasswordCiphertext: encryptEmailToken(input.appPassword), imapMailbox: mailbox });
        const account = await db.getEmailAccountByProviderEmail(ctx.user.id, "google", email);
        if (!account) throw new Error("Không thể lưu hộp thư Gmail");
        return { success: true as const, id: account.id };
      } catch (error) { throw new TRPCError({ code: "PRECONDITION_FAILED", message: error instanceof Error ? error.message : "Không thể kết nối Gmail qua IMAP" }); }
    }),
    connectWebmailImap: protectedProcedure.input(z.object({
      email: z.string().trim().email("Địa chỉ email không hợp lệ").max(320),
      username: z.string().trim().min(1).max(320).optional(),
      password: z.string().min(1, "Hãy nhập mật khẩu Webmail / IMAP").max(512),
      host: z.string().trim().min(3).max(253),
      port: z.number().int().min(1).max(65535).default(993),
      mailbox: z.string().trim().min(1).max(255).optional(),
    })).mutation(async ({ ctx, input }) => {
      const email = input.email.toLowerCase();
      const username = (input.username || email).toLowerCase();
      const host = input.host.toLowerCase();
      const mailbox = input.mailbox || "INBOX";
      try {
        await verifyWebmailImapConnection({ host, port: input.port, user: username, pass: input.password, mailbox });
        await db.upsertImapEmailAccount(ctx.user.id, { provider: "webmail", email, imapHost: host, imapPort: input.port, imapSecure: true, imapUsername: username, imapPasswordCiphertext: encryptEmailToken(input.password), imapMailbox: mailbox });
        const account = await db.getEmailAccountByProviderEmail(ctx.user.id, "webmail", email);
        if (!account) throw new Error("Không thể lưu hộp thư Webmail");
        return { success: true as const, id: account.id };
      } catch (error) { throw new TRPCError({ code: "PRECONDITION_FAILED", message: error instanceof Error ? error.message : "Không thể kết nối Webmail qua IMAP SSL" }); }
    }),
    sync: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      try { return { success: true as const, ...(await syncMailbox(ctx.user.id, input.id)) }; }
      catch (error) { throw new TRPCError({ code: "PRECONDITION_FAILED", message: error instanceof Error ? error.message : "Không thể đồng bộ hộp thư" }); }
    }),
    fetchOlderMessages: protectedProcedure.input(z.object({ id: z.number().int().positive(), beforeUid: z.number().int().min(2).max(2_147_483_647) })).mutation(async ({ ctx, input }) => {
      try { return { success: true as const, ...(await fetchOlderMailboxMessages(ctx.user.id, input.id, input.beforeUid)) }; }
      catch (error) { throw new TRPCError({ code: "PRECONDITION_FAILED", message: error instanceof Error ? error.message : "Không thể tải thêm thư cũ" }); }
    }),
    originalContent: protectedProcedure.input(z.object({ messageId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      try { return await fetchOriginalMailboxMessage(ctx.user.id, input.messageId); }
      catch (error) { throw new TRPCError({ code: "PRECONDITION_FAILED", message: error instanceof Error ? error.message : "Không thể tải nội dung email gốc" }); }
    }),
    configureAiSync: protectedProcedure.input(z.object({ id: z.number().int().positive(), enabled: z.boolean(), intervalMinutes: z.enum(EMAIL_AI_SYNC_INTERVALS.map(String) as [string, ...string[]]).transform(value => Number(value) as typeof EMAIL_AI_SYNC_INTERVALS[number]) })).mutation(async ({ ctx, input }) => {
      try { return await configureEmailAiSync(ctx.user.id, input.id, { enabled: input.enabled, intervalMinutes: input.intervalMinutes }, ctx.req.headers); }
      catch (error) { throw new TRPCError({ code: "PRECONDITION_FAILED", message: error instanceof Error ? error.message : "Không thể cấu hình đồng bộ AI" }); }
    }),
    analyze: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      try { return { success: true as const, ...(await analyzeMailboxForEmailEvents(ctx.user.id, input.id)) }; }
      catch (error) { throw new TRPCError({ code: "PRECONDITION_FAILED", message: error instanceof Error ? error.message : "Không thể phân tích email bằng AI" }); }
    }),
    suggestions: protectedProcedure.input(z.object({ accountId: z.number().int().positive().optional(), status: z.enum(["pending", "accepted", "dismissed", "error"]).optional(), limit: z.number().int().min(1).max(100).optional() }).optional()).query(({ ctx, input }) => db.listEmailEventSuggestions(ctx.user.id, input)),
    acceptSuggestion: protectedProcedure.input(z.object({ id: z.number().int().positive(), calendarEventId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const [suggestion, event] = await Promise.all([db.getPendingEmailEventSuggestion(ctx.user.id, input.id), db.getEvent(ctx.user.id, input.calendarEventId)]);
      if (!suggestion) throw new TRPCError({ code: "NOT_FOUND", message: "Đề xuất không còn chờ xác nhận" });
      if (!event) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy lịch hẹn vừa tạo" });
      await db.acceptEmailEventSuggestion(ctx.user.id, input.id, event.id);
      return { success: true } as const;
    }),
    dismissSuggestion: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => { await db.dismissEmailEventSuggestion(ctx.user.id, input.id); return { success: true } as const; }),
    disconnect: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const account = await db.getEmailAccountWithTokens(ctx.user.id, input.id);
      if (account?.aiSyncJobUid) await deleteHeartbeatJob(account.aiSyncJobUid, getRequestSessionToken(ctx.req.headers));
      await db.removeEmailAccount(ctx.user.id, input.id);
      return { success: true } as const;
    }),
  }),
});
export type AppRouter = typeof appRouter;

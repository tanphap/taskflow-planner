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

function serializeEventInput(input: z.infer<typeof eventInput>): db.EventInput {
  const { recurrenceRule, ...event } = input;
  return { ...event, recurrenceRule: recurrenceRule ? JSON.stringify(recurrenceRule) : null };
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
    create: protectedProcedure.input(eventInput).mutation(async ({ ctx, input }) => { const normalizedInput = serializeEventInput(input); await validateTelegramReminder(ctx.user.id, normalizedInput); const eventId = await db.createEvent(ctx.user.id, normalizedInput); if (normalizedInput.telegramReminder && normalizedInput.reminderAt) await createEventJob(ctx.user.id, eventId, normalizedInput.reminderAt, ctx.req.headers); return { success: true } as const; }),
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
});
export type AppRouter = typeof appRouter;

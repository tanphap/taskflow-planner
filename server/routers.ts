import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import * as db from "./db";

const taskInput = z.object({
  title: z.string().trim().min(1, "Vui lòng nhập tên công việc").max(240),
  description: z.string().max(2000).nullable().optional(),
  status: z.enum(["todo", "in_progress", "done"]),
  priority: z.enum(["low", "medium", "high"]),
  dueAt: z.coerce.date().nullable().optional(),
  reminderAt: z.coerce.date().nullable().optional(),
});

const eventInput = z.object({
  title: z.string().trim().min(1, "Vui lòng nhập tên sự kiện").max(240),
  description: z.string().max(2000).nullable().optional(),
  startAt: z.coerce.date(),
  endAt: z.coerce.date(),
  reminderAt: z.coerce.date().nullable().optional(),
}).refine(value => value.endAt > value.startAt, {
  message: "Thời gian kết thúc phải sau thời gian bắt đầu",
  path: ["endAt"],
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  dashboard: router({
    overview: protectedProcedure.query(({ ctx }) => db.getDashboardData(ctx.user.id)),
  }),
  tasks: router({
    list: protectedProcedure.query(({ ctx }) => db.listTasks(ctx.user.id)),
    create: protectedProcedure.input(taskInput).mutation(async ({ ctx, input }) => {
      await db.createTask(ctx.user.id, input);
      return { success: true } as const;
    }),
    update: protectedProcedure.input(z.object({ id: z.number().int().positive(), data: taskInput })).mutation(async ({ ctx, input }) => {
      await db.updateTask(ctx.user.id, input.id, input.data);
      return { success: true } as const;
    }),
    delete: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      await db.deleteTask(ctx.user.id, input.id);
      return { success: true } as const;
    }),
  }),
  calendar: router({
    list: protectedProcedure.query(({ ctx }) => db.listEvents(ctx.user.id)),
    create: protectedProcedure.input(eventInput).mutation(async ({ ctx, input }) => {
      await db.createEvent(ctx.user.id, input);
      return { success: true } as const;
    }),
    update: protectedProcedure.input(z.object({ id: z.number().int().positive(), data: eventInput })).mutation(async ({ ctx, input }) => {
      await db.updateEvent(ctx.user.id, input.id, input.data);
      return { success: true } as const;
    }),
    delete: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      await db.deleteEvent(ctx.user.id, input.id);
      return { success: true } as const;
    }),
  }),
  notifications: router({
    due: protectedProcedure.query(({ ctx }) => db.syncDueNotifications(ctx.user.id)),
    markRead: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      await db.markNotificationRead(ctx.user.id, input.id);
      return { success: true } as const;
    }),
    markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
      await db.markAllNotificationsRead(ctx.user.id);
      return { success: true } as const;
    }),
  }),
  profile: router({
    update: protectedProcedure.input(z.object({
      name: z.string().trim().max(120),
      email: z.string().trim().email("Địa chỉ email không hợp lệ").max(320),
    })).mutation(async ({ ctx, input }) => {
      await db.updateUserProfile(ctx.user.id, input);
      return { success: true } as const;
    }),
  }),
});

export type AppRouter = typeof appRouter;


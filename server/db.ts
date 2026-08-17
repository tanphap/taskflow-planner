import { and, asc, desc, eq, gte, isNull, lte, ne } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  calendarEvents,
  InsertUser,
  notifications,
  tasks,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId, lastSignedIn: new Date() };
  const updateSet: Record<string, unknown> = { lastSignedIn: new Date() };
  const textFields = ["name", "email", "loginMethod"] as const;
  textFields.forEach(field => {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  });
  values.role = user.role ?? (user.openId === ENV.ownerOpenId ? "admin" : "user");
  updateSet.role = values.role;

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(users).where(eq(users.openId, openId)).limit(1))[0];
}

export type TaskInput = {
  title: string;
  description?: string | null;
  status: "todo" | "in_progress" | "done";
  priority: "low" | "medium" | "high";
  dueAt?: Date | null;
  reminderAt?: Date | null;
};

export type EventInput = {
  title: string;
  description?: string | null;
  startAt: Date;
  endAt: Date;
  reminderAt?: Date | null;
};

export async function listTasks(userId: number) {
  const db = await requireDb();
  return db.select().from(tasks).where(eq(tasks.userId, userId)).orderBy(asc(tasks.status), asc(tasks.dueAt), desc(tasks.createdAt));
}

export async function createTask(userId: number, input: TaskInput) {
  const db = await requireDb();
  await db.insert(tasks).values({
    userId,
    title: input.title.trim(),
    description: input.description?.trim() || null,
    status: input.status,
    priority: input.priority,
    dueAt: input.dueAt ?? null,
    reminderAt: input.reminderAt ?? null,
    completedAt: input.status === "done" ? new Date() : null,
  });
}

export async function updateTask(userId: number, taskId: number, input: TaskInput) {
  const db = await requireDb();
  await db.update(tasks).set({
    title: input.title.trim(),
    description: input.description?.trim() || null,
    status: input.status,
    priority: input.priority,
    dueAt: input.dueAt ?? null,
    reminderAt: input.reminderAt ?? null,
    completedAt: input.status === "done" ? new Date() : null,
  }).where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)));
}

export async function deleteTask(userId: number, taskId: number) {
  const db = await requireDb();
  await db.delete(tasks).where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)));
}

export async function listEvents(userId: number) {
  const db = await requireDb();
  return db.select().from(calendarEvents).where(eq(calendarEvents.userId, userId)).orderBy(asc(calendarEvents.startAt));
}

export async function createEvent(userId: number, input: EventInput) {
  const db = await requireDb();
  await db.insert(calendarEvents).values({
    userId,
    title: input.title.trim(),
    description: input.description?.trim() || null,
    startAt: input.startAt,
    endAt: input.endAt,
    reminderAt: input.reminderAt ?? null,
  });
}

export async function updateEvent(userId: number, eventId: number, input: EventInput) {
  const db = await requireDb();
  await db.update(calendarEvents).set({
    title: input.title.trim(),
    description: input.description?.trim() || null,
    startAt: input.startAt,
    endAt: input.endAt,
    reminderAt: input.reminderAt ?? null,
  }).where(and(eq(calendarEvents.id, eventId), eq(calendarEvents.userId, userId)));
}

export async function deleteEvent(userId: number, eventId: number) {
  const db = await requireDb();
  await db.delete(calendarEvents).where(and(eq(calendarEvents.id, eventId), eq(calendarEvents.userId, userId)));
}

export async function syncDueNotifications(userId: number) {
  const db = await requireDb();
  const now = new Date();
  const [dueTasks, dueEvents] = await Promise.all([
    db.select().from(tasks).where(and(eq(tasks.userId, userId), lte(tasks.reminderAt, now), ne(tasks.status, "done"))),
    db.select().from(calendarEvents).where(and(eq(calendarEvents.userId, userId), lte(calendarEvents.reminderAt, now))),
  ]);

  for (const task of dueTasks) {
    await db.insert(notifications).values({
      userId,
      sourceKey: `task:${task.id}`,
      kind: "task",
      title: "Nhắc việc đến hạn",
      body: task.title,
      scheduledFor: task.reminderAt ?? now,
    }).onDuplicateKeyUpdate({ set: { scheduledFor: task.reminderAt ?? now } });
  }
  for (const event of dueEvents) {
    await db.insert(notifications).values({
      userId,
      sourceKey: `event:${event.id}`,
      kind: "event",
      title: "Sự kiện sắp bắt đầu",
      body: event.title,
      scheduledFor: event.reminderAt ?? now,
    }).onDuplicateKeyUpdate({ set: { scheduledFor: event.reminderAt ?? now } });
  }

  return db.select().from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)))
    .orderBy(desc(notifications.scheduledFor));
}

export async function markNotificationRead(userId: number, notificationId: number) {
  const db = await requireDb();
  await db.update(notifications).set({ readAt: new Date() })
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));
}

export async function markAllNotificationsRead(userId: number) {
  const db = await requireDb();
  await db.update(notifications).set({ readAt: new Date() })
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
}

export async function updateUserProfile(userId: number, input: { name: string; email: string }) {
  const db = await requireDb();
  await db.update(users).set({ name: input.name.trim() || null, email: input.email.trim() || null }).where(eq(users.id, userId));
}

export async function getDashboardData(userId: number) {
  const [userTasks, userEvents] = await Promise.all([listTasks(userId), listEvents(userId)]);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  const todayTasks = userTasks.filter(task => task.dueAt && task.dueAt >= todayStart && task.dueAt < tomorrowStart && task.status !== "done");
  const upcomingTasks = userTasks.filter(task => task.dueAt && task.dueAt >= tomorrowStart && task.status !== "done").slice(0, 5);
  const upcomingEvents = userEvents.filter(event => event.endAt >= now).slice(0, 5);
  const completed = userTasks.filter(task => task.status === "done").length;

  return {
    todayTasks,
    upcomingTasks,
    upcomingEvents,
    stats: {
      total: userTasks.length,
      completed,
      inProgress: userTasks.filter(task => task.status === "in_progress").length,
      completionRate: userTasks.length ? Math.round((completed / userTasks.length) * 100) : 0,
    },
  };
}

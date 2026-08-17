import {
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

/** Core identity table populated by Manus OAuth. */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const tasks = mysqlTable(
  "tasks",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    title: varchar("title", { length: 240 }).notNull(),
    description: text("description"),
    status: mysqlEnum("status", ["todo", "in_progress", "done"]).default("todo").notNull(),
    priority: mysqlEnum("priority", ["low", "medium", "high"]).default("medium").notNull(),
    dueAt: timestamp("dueAt"),
    reminderAt: timestamp("reminderAt"),
    completedAt: timestamp("completedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("tasks_user_status_idx").on(table.userId, table.status),
    index("tasks_user_due_idx").on(table.userId, table.dueAt),
    index("tasks_user_reminder_idx").on(table.userId, table.reminderAt),
  ],
);

export const calendarEvents = mysqlTable(
  "calendar_events",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    title: varchar("title", { length: 240 }).notNull(),
    description: text("description"),
    startAt: timestamp("startAt").notNull(),
    endAt: timestamp("endAt").notNull(),
    reminderAt: timestamp("reminderAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("events_user_start_idx").on(table.userId, table.startAt),
    index("events_user_reminder_idx").on(table.userId, table.reminderAt),
  ],
);

export const notifications = mysqlTable(
  "notifications",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    sourceKey: varchar("sourceKey", { length: 96 }).notNull(),
    kind: mysqlEnum("kind", ["task", "event"]).notNull(),
    title: varchar("title", { length: 240 }).notNull(),
    body: text("body"),
    scheduledFor: timestamp("scheduledFor").notNull(),
    readAt: timestamp("readAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    uniqueIndex("notifications_source_uq").on(table.sourceKey),
    index("notifications_user_read_idx").on(table.userId, table.readAt),
  ],
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type CalendarEvent = typeof calendarEvents.$inferSelect;
export type AppNotification = typeof notifications.$inferSelect;

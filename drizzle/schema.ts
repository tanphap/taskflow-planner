import {
  boolean,
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
    recurrenceRule: varchar("recurrenceRule", { length: 500 }),
    telegramReminder: boolean("telegramReminder").default(false).notNull(),
    telegramJobUid: varchar("telegramJobUid", { length: 65 }),
    telegramSentAt: timestamp("telegramSentAt"),
    telegramDeliveryError: text("telegramDeliveryError"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("events_user_start_idx").on(table.userId, table.startAt),
    index("events_user_reminder_idx").on(table.userId, table.reminderAt),
    index("events_telegram_job_idx").on(table.telegramJobUid),
  ],
);

export const telegramDeliveryLogs = mysqlTable(
  "telegram_delivery_logs",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    eventId: int("eventId").notNull(),
    eventTitle: varchar("eventTitle", { length: 240 }).notNull(),
    sentAt: timestamp("sentAt").defaultNow().notNull(),
    status: mysqlEnum("status", ["success", "error"]).notNull(),
    errorMessage: varchar("errorMessage", { length: 500 }),
  },
  table => [
    index("telegram_delivery_logs_user_sent_idx").on(table.userId, table.sentAt),
    index("telegram_delivery_logs_event_idx").on(table.eventId),
  ],
);

export const telegramConnections = mysqlTable(
  "telegram_connections",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    chatId: varchar("chatId", { length: 64 }),
    linkToken: varchar("linkToken", { length: 96 }),
    linkTokenExpiresAt: timestamp("linkTokenExpiresAt"),
    connectedAt: timestamp("connectedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("telegram_connections_user_uq").on(table.userId),
    uniqueIndex("telegram_connections_link_token_uq").on(table.linkToken),
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
export type TelegramConnection = typeof telegramConnections.$inferSelect;
export type TelegramDeliveryLog = typeof telegramDeliveryLogs.$inferSelect;

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
  geminiModel: varchar("geminiModel", { length: 80 }).default("gemini-3.5-flash-lite").notNull(),
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

/** IMAP credentials and Outlook OAuth2 tokens remain encrypted server-side and are never exposed to the client. */
export const emailAccounts = mysqlTable(
  "email_accounts",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    provider: mysqlEnum("provider", ["google", "microsoft", "webmail"]).notNull(),
    email: varchar("email", { length: 320 }).notNull(),
    displayName: varchar("displayName", { length: 240 }),
    authMethod: mysqlEnum("authMethod", ["app_password", "oauth2"]).default("app_password").notNull(),
    imapHost: varchar("imapHost", { length: 255 }),
    imapPort: int("imapPort").default(993),
    imapSecure: boolean("imapSecure").default(true).notNull(),
    imapUsername: varchar("imapUsername", { length: 320 }),
    imapPasswordCiphertext: text("imapPasswordCiphertext"),
    imapMailbox: varchar("imapMailbox", { length: 255 }).default("INBOX").notNull(),
    accessTokenCiphertext: text("accessTokenCiphertext"),
    refreshTokenCiphertext: text("refreshTokenCiphertext"),
    tokenExpiresAt: timestamp("tokenExpiresAt"),
    scopes: varchar("scopes", { length: 1000 }),
    connectionStatus: mysqlEnum("connectionStatus", ["connected", "needs_reconnect", "error"]).default("connected").notNull(),
    lastSyncedAt: timestamp("lastSyncedAt"),
    lastSyncError: text("lastSyncError"),
    lastSyncFetchedCount: int("lastSyncFetchedCount").default(0).notNull(),
    lastSyncNewCount: int("lastSyncNewCount").default(0).notNull(),
    mailboxMessageCount: int("mailboxMessageCount").default(0).notNull(),
    aiSyncEnabled: boolean("aiSyncEnabled").default(false).notNull(),
    aiSyncIntervalMinutes: int("aiSyncIntervalMinutes").default(60).notNull(),
    aiSyncJobUid: varchar("aiSyncJobUid", { length: 65 }),
    aiSyncLastRunAt: timestamp("aiSyncLastRunAt"),
    aiSyncLastError: text("aiSyncLastError"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("email_accounts_user_provider_email_uq").on(table.userId, table.provider, table.email),
    index("email_accounts_user_status_idx").on(table.userId, table.connectionStatus),
    index("email_accounts_ai_sync_job_idx").on(table.aiSyncJobUid),
  ],
);

/** One-time OAuth state records bind callbacks to a TaskFlow user and PKCE verifier. */
export const emailOAuthSessions = mysqlTable(
  "email_oauth_sessions",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    provider: mysqlEnum("provider", ["google", "microsoft"]).notNull(),
    stateHash: varchar("stateHash", { length: 64 }).notNull(),
    codeVerifier: varchar("codeVerifier", { length: 128 }).notNull(),
    expiresAt: timestamp("expiresAt").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    uniqueIndex("email_oauth_sessions_state_uq").on(table.stateHash),
    index("email_oauth_sessions_user_expiry_idx").on(table.userId, table.expiresAt),
  ],
);

/** Metadata-only inbox cache. Raw credentials remain encrypted on emailAccounts. */
export const emailMessages = mysqlTable(
  "email_messages",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    emailAccountId: int("emailAccountId").notNull(),
    providerMessageId: varchar("providerMessageId", { length: 255 }).notNull(),
    threadId: varchar("threadId", { length: 255 }),
    subject: varchar("subject", { length: 500 }).notNull(),
    senderName: varchar("senderName", { length: 240 }),
    senderEmail: varchar("senderEmail", { length: 320 }),
    snippet: text("snippet"),
    receivedAt: timestamp("receivedAt").notNull(),
    isRead: boolean("isRead").default(false).notNull(),
    status: mysqlEnum("status", ["new", "in_progress", "done", "archived"]).default("new").notNull(),
    labels: varchar("labels", { length: 1000 }),
    webLink: varchar("webLink", { length: 1000 }),
    aiAnalyzedAt: timestamp("aiAnalyzedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("email_messages_account_provider_message_uq").on(table.emailAccountId, table.providerMessageId),
    index("email_messages_user_received_idx").on(table.userId, table.receivedAt),
    index("email_messages_user_status_idx").on(table.userId, table.status),
  ],
);

/** Opt-in Gemini summaries. Only user-selected message metadata is sent to the unpaid Gemini API. */
export const emailGeminiSummaries = mysqlTable(
  "email_gemini_summaries",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    emailAccountId: int("emailAccountId").notNull(),
    emailMessageId: int("emailMessageId").notNull(),
    summary: text("summary").notNull(),
    eventStartAt: timestamp("eventStartAt"),
    eventEndAt: timestamp("eventEndAt"),
    locale: varchar("locale", { length: 12 }).default("vi").notNull(),
    model: varchar("model", { length: 120 }).notNull(),
    status: mysqlEnum("status", ["ready", "error"]).default("ready").notNull(),
    errorMessage: varchar("errorMessage", { length: 1000 }),
    consentedAt: timestamp("consentedAt").defaultNow().notNull(),
    generatedAt: timestamp("generatedAt").defaultNow().notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("email_gemini_summaries_message_uq").on(table.emailMessageId),
    index("email_gemini_summaries_user_generated_idx").on(table.userId, table.generatedAt),
    index("email_gemini_summaries_account_idx").on(table.emailAccountId),
  ],
);

/** User-owned notes can optionally point back to a synced message or mailbox. */
export const emailNotes = mysqlTable(
  "email_notes",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    emailAccountId: int("emailAccountId"),
    emailMessageId: int("emailMessageId"),
    title: varchar("title", { length: 240 }).notNull(),
    body: text("body"),
    isPinned: boolean("isPinned").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("email_notes_user_updated_idx").on(table.userId, table.updatedAt),
    index("email_notes_user_pinned_idx").on(table.userId, table.isPinned),
    index("email_notes_message_idx").on(table.emailMessageId),
    index("email_notes_account_idx").on(table.emailAccountId),
  ],
);

/** AI-extracted, user-reviewable event proposals. One proposal may exist for one synced message. */
export const emailEventSuggestions = mysqlTable(
  "email_event_suggestions",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    emailAccountId: int("emailAccountId").notNull(),
    emailMessageId: int("emailMessageId").notNull(),
    title: varchar("title", { length: 240 }).notNull(),
    description: text("description"),
    startAt: timestamp("startAt").notNull(),
    endAt: timestamp("endAt").notNull(),
    reminderMinutes: int("reminderMinutes").default(15).notNull(),
    planLink: varchar("planLink", { length: 1000 }),
    sourceExcerpt: varchar("sourceExcerpt", { length: 1000 }),
    confidence: int("confidence").notNull(),
    model: varchar("model", { length: 80 }).notNull(),
    status: mysqlEnum("status", ["pending", "accepted", "dismissed", "error"]).default("pending").notNull(),
    calendarEventId: int("calendarEventId"),
    errorMessage: varchar("errorMessage", { length: 1000 }),
    analyzedAt: timestamp("analyzedAt").defaultNow().notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("email_event_suggestions_message_uq").on(table.emailMessageId),
    index("email_event_suggestions_user_status_idx").on(table.userId, table.status),
    index("email_event_suggestions_account_status_idx").on(table.emailAccountId, table.status),
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

/** A shared, bilingual AI quote generated once per Vietnam calendar day. */
export const dailyAiQuotes = mysqlTable("daily_ai_quotes", {
  dayKey: varchar("dayKey", { length: 10 }).primaryKey(),
  quoteVi: varchar("quoteVi", { length: 280 }).notNull(),
  quoteEn: varchar("quoteEn", { length: 280 }).notNull(),
  model: varchar("model", { length: 120 }).notNull(),
  generatedAt: timestamp("generatedAt").defaultNow().notNull(),
});

/** Durable project-level schedule ownership for non-user-facing Heartbeat jobs. */
export const scheduledJobs = mysqlTable(
  "scheduled_jobs",
  {
    key: varchar("jobKey", { length: 80 }).primaryKey(),
    taskUid: varchar("taskUid", { length: 65 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("scheduled_jobs_task_uid_idx").on(table.taskUid)],
);

/** Owner-managed allowlist for the shared Timesheet source. The owner is never represented by a grant row. */
export const timesheetAccess = mysqlTable(
  "timesheet_access",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    grantedByUserId: int("grantedByUserId").notNull(),
    grantedAt: timestamp("grantedAt").defaultNow().notNull(),
  },
  table => [
    uniqueIndex("timesheet_access_user_uq").on(table.userId),
    index("timesheet_access_granted_by_idx").on(table.grantedByUserId),
  ],
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type CalendarEvent = typeof calendarEvents.$inferSelect;
export type AppNotification = typeof notifications.$inferSelect;
export type DailyAiQuote = typeof dailyAiQuotes.$inferSelect;
export type TelegramConnection = typeof telegramConnections.$inferSelect;
export type TelegramDeliveryLog = typeof telegramDeliveryLogs.$inferSelect;
export type EmailAccount = typeof emailAccounts.$inferSelect;
export type EmailMessage = typeof emailMessages.$inferSelect;
export type EmailGeminiSummary = typeof emailGeminiSummaries.$inferSelect;
export type EmailNote = typeof emailNotes.$inferSelect;
export type EmailEventSuggestion = typeof emailEventSuggestions.$inferSelect;
export type TimesheetAccess = typeof timesheetAccess.$inferSelect;

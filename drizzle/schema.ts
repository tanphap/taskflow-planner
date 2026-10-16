import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);
export const taskStatusEnum = pgEnum("task_status", ["todo", "in_progress", "done"]);
export const taskPriorityEnum = pgEnum("task_priority", ["low", "medium", "high"]);
export const telegramDeliveryStatusEnum = pgEnum("telegram_delivery_status", ["success", "error"]);
export const emailProviderEnum = pgEnum("email_provider", ["google", "microsoft", "webmail"]);
export const emailAuthMethodEnum = pgEnum("email_auth_method", ["app_password", "oauth2"]);
export const emailConnectionStatusEnum = pgEnum("email_connection_status", ["connected", "needs_reconnect", "error"]);
export const emailOAuthProviderEnum = pgEnum("email_oauth_provider", ["google", "microsoft"]);
export const emailMessageStatusEnum = pgEnum("email_message_status", ["new", "in_progress", "done", "archived"]);
export const emailGeminiSummaryStatusEnum = pgEnum("email_gemini_summary_status", ["ready", "error"]);
export const emailEventSuggestionStatusEnum = pgEnum("email_event_suggestion_status", ["pending", "accepted", "dismissed", "error"]);
export const notificationKindEnum = pgEnum("notification_kind", ["task", "event"]);
export const timesheetAccessRoleEnum = pgEnum("timesheet_access_role", ["viewer", "admin"]);
export const timesheetShiftEnum = pgEnum("timesheet_shift", ["S", "D"]);

/** Core identity table. `openId` holds the canonical external auth id (Supabase Auth user UUID). */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  geminiModel: varchar("geminiModel", { length: 80 }).default("gemini-3.5-flash-lite").notNull(),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: userRoleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const tasks = pgTable(
  "tasks",
  {
    id: serial("id").primaryKey(),
    userId: integer("userId").notNull(),
    title: varchar("title", { length: 240 }).notNull(),
    description: text("description"),
    status: taskStatusEnum("status").default("todo").notNull(),
    priority: taskPriorityEnum("priority").default("medium").notNull(),
    dueAt: timestamp("dueAt"),
    reminderAt: timestamp("reminderAt"),
    completedAt: timestamp("completedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
  },
  table => [
    index("tasks_user_status_idx").on(table.userId, table.status),
    index("tasks_user_due_idx").on(table.userId, table.dueAt),
    index("tasks_user_reminder_idx").on(table.userId, table.reminderAt),
  ],
);

export const calendarEvents = pgTable(
  "calendar_events",
  {
    id: serial("id").primaryKey(),
    userId: integer("userId").notNull(),
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
    updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
  },
  table => [
    index("events_user_start_idx").on(table.userId, table.startAt),
    index("events_user_reminder_idx").on(table.userId, table.reminderAt),
    index("events_telegram_job_idx").on(table.telegramJobUid),
  ],
);

export const telegramDeliveryLogs = pgTable(
  "telegram_delivery_logs",
  {
    id: serial("id").primaryKey(),
    userId: integer("userId").notNull(),
    eventId: integer("eventId").notNull(),
    eventTitle: varchar("eventTitle", { length: 240 }).notNull(),
    sentAt: timestamp("sentAt").defaultNow().notNull(),
    status: telegramDeliveryStatusEnum("status").notNull(),
    errorMessage: varchar("errorMessage", { length: 500 }),
  },
  table => [
    index("telegram_delivery_logs_user_sent_idx").on(table.userId, table.sentAt),
    index("telegram_delivery_logs_event_idx").on(table.eventId),
  ],
);

export const telegramConnections = pgTable(
  "telegram_connections",
  {
    id: serial("id").primaryKey(),
    userId: integer("userId").notNull(),
    chatId: varchar("chatId", { length: 64 }),
    linkToken: varchar("linkToken", { length: 96 }),
    linkTokenExpiresAt: timestamp("linkTokenExpiresAt"),
    connectedAt: timestamp("connectedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
  },
  table => [
    uniqueIndex("telegram_connections_user_uq").on(table.userId),
    uniqueIndex("telegram_connections_link_token_uq").on(table.linkToken),
  ],
);

/** IMAP credentials and Outlook OAuth2 tokens remain encrypted server-side and are never exposed to the client. */
export const emailAccounts = pgTable(
  "email_accounts",
  {
    id: serial("id").primaryKey(),
    userId: integer("userId").notNull(),
    provider: emailProviderEnum("provider").notNull(),
    email: varchar("email", { length: 320 }).notNull(),
    displayName: varchar("displayName", { length: 240 }),
    authMethod: emailAuthMethodEnum("authMethod").default("app_password").notNull(),
    imapHost: varchar("imapHost", { length: 255 }),
    imapPort: integer("imapPort").default(993),
    imapSecure: boolean("imapSecure").default(true).notNull(),
    imapUsername: varchar("imapUsername", { length: 320 }),
    imapPasswordCiphertext: text("imapPasswordCiphertext"),
    imapMailbox: varchar("imapMailbox", { length: 255 }).default("INBOX").notNull(),
    accessTokenCiphertext: text("accessTokenCiphertext"),
    refreshTokenCiphertext: text("refreshTokenCiphertext"),
    tokenExpiresAt: timestamp("tokenExpiresAt"),
    scopes: varchar("scopes", { length: 1000 }),
    connectionStatus: emailConnectionStatusEnum("connectionStatus").default("connected").notNull(),
    lastSyncedAt: timestamp("lastSyncedAt"),
    lastSyncError: text("lastSyncError"),
    lastSyncFetchedCount: integer("lastSyncFetchedCount").default(0).notNull(),
    lastSyncNewCount: integer("lastSyncNewCount").default(0).notNull(),
    mailboxMessageCount: integer("mailboxMessageCount").default(0).notNull(),
    aiSyncEnabled: boolean("aiSyncEnabled").default(false).notNull(),
    aiSyncIntervalMinutes: integer("aiSyncIntervalMinutes").default(60).notNull(),
    aiSyncJobUid: varchar("aiSyncJobUid", { length: 65 }),
    aiSyncLastRunAt: timestamp("aiSyncLastRunAt"),
    aiSyncLastError: text("aiSyncLastError"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
  },
  table => [
    uniqueIndex("email_accounts_user_provider_email_uq").on(table.userId, table.provider, table.email),
    index("email_accounts_user_status_idx").on(table.userId, table.connectionStatus),
    index("email_accounts_ai_sync_job_idx").on(table.aiSyncJobUid),
  ],
);

/** One-time OAuth state records bind callbacks to a TaskFlow user and PKCE verifier. */
export const emailOAuthSessions = pgTable(
  "email_oauth_sessions",
  {
    id: serial("id").primaryKey(),
    userId: integer("userId").notNull(),
    provider: emailOAuthProviderEnum("provider").notNull(),
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
export const emailMessages = pgTable(
  "email_messages",
  {
    id: serial("id").primaryKey(),
    userId: integer("userId").notNull(),
    emailAccountId: integer("emailAccountId").notNull(),
    providerMessageId: varchar("providerMessageId", { length: 255 }).notNull(),
    threadId: varchar("threadId", { length: 255 }),
    subject: varchar("subject", { length: 500 }).notNull(),
    senderName: varchar("senderName", { length: 240 }),
    senderEmail: varchar("senderEmail", { length: 320 }),
    snippet: text("snippet"),
    receivedAt: timestamp("receivedAt").notNull(),
    isRead: boolean("isRead").default(false).notNull(),
    status: emailMessageStatusEnum("status").default("new").notNull(),
    labels: varchar("labels", { length: 1000 }),
    webLink: varchar("webLink", { length: 1000 }),
    aiAnalyzedAt: timestamp("aiAnalyzedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
  },
  table => [
    uniqueIndex("email_messages_account_provider_message_uq").on(table.emailAccountId, table.providerMessageId),
    index("email_messages_user_received_idx").on(table.userId, table.receivedAt),
    index("email_messages_user_status_idx").on(table.userId, table.status),
  ],
);

/** Opt-in Gemini summaries. Only user-selected message metadata is sent to the unpaid Gemini API. */
export const emailGeminiSummaries = pgTable(
  "email_gemini_summaries",
  {
    id: serial("id").primaryKey(),
    userId: integer("userId").notNull(),
    emailAccountId: integer("emailAccountId").notNull(),
    emailMessageId: integer("emailMessageId").notNull(),
    summary: text("summary").notNull(),
    eventStartAt: timestamp("eventStartAt"),
    eventEndAt: timestamp("eventEndAt"),
    locale: varchar("locale", { length: 12 }).default("vi").notNull(),
    model: varchar("model", { length: 120 }).notNull(),
    status: emailGeminiSummaryStatusEnum("status").default("ready").notNull(),
    errorMessage: varchar("errorMessage", { length: 1000 }),
    consentedAt: timestamp("consentedAt").defaultNow().notNull(),
    generatedAt: timestamp("generatedAt").defaultNow().notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
  },
  table => [
    uniqueIndex("email_gemini_summaries_message_uq").on(table.emailMessageId),
    index("email_gemini_summaries_user_generated_idx").on(table.userId, table.generatedAt),
    index("email_gemini_summaries_account_idx").on(table.emailAccountId),
  ],
);

/** User-owned notes can optionally point back to a synced message or mailbox. */
export const emailNotes = pgTable(
  "email_notes",
  {
    id: serial("id").primaryKey(),
    userId: integer("userId").notNull(),
    emailAccountId: integer("emailAccountId"),
    emailMessageId: integer("emailMessageId"),
    title: varchar("title", { length: 240 }).notNull(),
    body: text("body"),
    isPinned: boolean("isPinned").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
  },
  table => [
    index("email_notes_user_updated_idx").on(table.userId, table.updatedAt),
    index("email_notes_user_pinned_idx").on(table.userId, table.isPinned),
    index("email_notes_message_idx").on(table.emailMessageId),
    index("email_notes_account_idx").on(table.emailAccountId),
  ],
);

/** AI-extracted, user-reviewable event proposals. One proposal may exist for one synced message. */
export const emailEventSuggestions = pgTable(
  "email_event_suggestions",
  {
    id: serial("id").primaryKey(),
    userId: integer("userId").notNull(),
    emailAccountId: integer("emailAccountId").notNull(),
    emailMessageId: integer("emailMessageId").notNull(),
    title: varchar("title", { length: 240 }).notNull(),
    description: text("description"),
    startAt: timestamp("startAt").notNull(),
    endAt: timestamp("endAt").notNull(),
    reminderMinutes: integer("reminderMinutes").default(15).notNull(),
    planLink: varchar("planLink", { length: 1000 }),
    sourceExcerpt: varchar("sourceExcerpt", { length: 1000 }),
    confidence: integer("confidence").notNull(),
    model: varchar("model", { length: 80 }).notNull(),
    status: emailEventSuggestionStatusEnum("status").default("pending").notNull(),
    calendarEventId: integer("calendarEventId"),
    errorMessage: varchar("errorMessage", { length: 1000 }),
    analyzedAt: timestamp("analyzedAt").defaultNow().notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
  },
  table => [
    uniqueIndex("email_event_suggestions_message_uq").on(table.emailMessageId),
    index("email_event_suggestions_user_status_idx").on(table.userId, table.status),
    index("email_event_suggestions_account_status_idx").on(table.emailAccountId, table.status),
  ],
);

export const notifications = pgTable(
  "notifications",
  {
    id: serial("id").primaryKey(),
    userId: integer("userId").notNull(),
    sourceKey: varchar("sourceKey", { length: 96 }).notNull(),
    kind: notificationKindEnum("kind").notNull(),
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
export const dailyAiQuotes = pgTable("daily_ai_quotes", {
  dayKey: varchar("dayKey", { length: 10 }).primaryKey(),
  quoteVi: varchar("quoteVi", { length: 280 }).notNull(),
  quoteEn: varchar("quoteEn", { length: 280 }).notNull(),
  model: varchar("model", { length: 120 }).notNull(),
  generatedAt: timestamp("generatedAt").defaultNow().notNull(),
});

/** Durable project-level schedule ownership for non-user-facing Heartbeat jobs. */
export const scheduledJobs = pgTable(
  "scheduled_jobs",
  {
    key: varchar("jobKey", { length: 80 }).primaryKey(),
    taskUid: varchar("taskUid", { length: 65 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
  },
  table => [index("scheduled_jobs_task_uid_idx").on(table.taskUid)],
);

/** Owner-managed allowlist for the shared Timesheet source. The owner is never represented by a grant row. */
export const timesheetAccess = pgTable(
  "timesheet_access",
  {
    id: serial("id").primaryKey(),
    userId: integer("userId").notNull(),
    grantedByUserId: integer("grantedByUserId").notNull(),
    accessRole: timesheetAccessRoleEnum("accessRole").default("viewer").notNull(),
    grantedAt: timestamp("grantedAt").defaultNow().notNull(),
  },
  table => [
    uniqueIndex("timesheet_access_user_uq").on(table.userId),
    index("timesheet_access_granted_by_idx").on(table.grantedByUserId),
  ],
);

/** Shared duty roster. It is intentionally separate from each account's personal calendar. */
export const timesheetDutySchedules = pgTable(
  "timesheet_duty_schedules",
  {
    id: serial("id").primaryKey(),
    dutyDate: varchar("dutyDate", { length: 10 }).notNull(),
    shift: timesheetShiftEnum("shift").notNull(),
    assignment: varchar("assignment", { length: 240 }).notNull(),
    sourceTitle: varchar("sourceTitle", { length: 240 }).notNull(),
    changeNote: varchar("changeNote", { length: 400 }),
    isChanged: boolean("isChanged").default(false).notNull(),
    createdByUserId: integer("createdByUserId").notNull(),
    updatedByUserId: integer("updatedByUserId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
  },
  table => [
    uniqueIndex("timesheet_duty_schedules_date_shift_uq").on(table.dutyDate, table.shift),
    index("timesheet_duty_schedules_date_idx").on(table.dutyDate),
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
export type TimesheetDutySchedule = typeof timesheetDutySchedules.$inferSelect;

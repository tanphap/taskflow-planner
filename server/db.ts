import { and, asc, count, desc, eq, gt, inArray, isNull, lte, ne, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  calendarEvents,
  dailyAiQuotes,
  emailAccounts,
  emailEventSuggestions,
  emailGeminiSummaries,
  emailMessages,
  emailNotes,
  emailOAuthSessions,
  InsertUser,
  notifications,
  scheduledJobs,
  tasks,
  telegramConnections,
  telegramDeliveryLogs,
  timesheetAccess,
  users,
} from "../drizzle/schema";
import { expandCalendarEvents, getTelegramOccurrenceDueAt, parseRecurrenceRule } from "../shared/recurrence";
import { getVietnamDateKey } from "../shared/dailyQuote";
import { ENV } from "./_core/env";
import { resolveGeminiModel, type GeminiModel } from "../shared/geminiModels";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try { _db = drizzle(process.env.DATABASE_URL); } catch (error) { console.warn("[Database] Failed to connect:", error); _db = null; }
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
  (["name", "email", "loginMethod"] as const).forEach(field => {
    if (user[field] !== undefined) { values[field] = user[field] ?? null; updateSet[field] = user[field] ?? null; }
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
export async function getUserGeminiModel(userId: number): Promise<GeminiModel> {
  const db = await requireDb();
  const user = (await db.select({ geminiModel: users.geminiModel }).from(users).where(eq(users.id, userId)).limit(1))[0];
  return resolveGeminiModel(user?.geminiModel);
}
export async function updateUserGeminiModel(userId: number, geminiModel: GeminiModel) {
  const db = await requireDb();
  await db.update(users).set({ geminiModel }).where(eq(users.id, userId));
}
export type TimesheetAccessRole = "viewer" | "admin";
export async function getTimesheetAccessRole(userId: number): Promise<TimesheetAccessRole | null> {
  const db = await requireDb();
  return (await db.select({ accessRole: timesheetAccess.accessRole }).from(timesheetAccess).where(eq(timesheetAccess.userId, userId)).limit(1))[0]?.accessRole ?? null;
}
export async function hasTimesheetAccess(userId: number) {
  return Boolean(await getTimesheetAccessRole(userId));
}
export async function listTimesheetAccessAccounts(ownerOpenId: string) {
  const db = await requireDb();
  const rows = await db.select({
    id: users.id,
    openId: users.openId,
    role: users.role,
    name: users.name,
    email: users.email,
    accessId: timesheetAccess.id,
    accessRole: timesheetAccess.accessRole,
    grantedAt: timesheetAccess.grantedAt,
  }).from(users).leftJoin(timesheetAccess, eq(users.id, timesheetAccess.userId)).orderBy(asc(users.name), asc(users.email));
  return rows.map(row => ({
    id: row.id,
    name: row.name,
    email: row.email,
    isRoot: ownerOpenId ? row.openId === ownerOpenId : row.role === "admin",
    granted: Boolean(row.accessId),
    accessRole: row.accessRole,
    grantedAt: row.grantedAt,
  }));
}
export async function getTimesheetAccessAccount(userId: number, ownerOpenId: string) {
  const db = await requireDb();
  const row = (await db.select({
    id: users.id,
    openId: users.openId,
    role: users.role,
    accessRole: timesheetAccess.accessRole,
  }).from(users).leftJoin(timesheetAccess, eq(users.id, timesheetAccess.userId)).where(eq(users.id, userId)).limit(1))[0];
  if (!row) return undefined;
  return {
    id: row.id,
    isRoot: ownerOpenId ? row.openId === ownerOpenId : row.role === "admin",
    accessRole: row.accessRole,
  };
}
export async function setTimesheetAccess(grantedByUserId: number, userId: number, accessRole: TimesheetAccessRole | null) {
  const db = await requireDb();
  const exists = (await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1))[0];
  if (!exists) return false;
  if (accessRole) {
    await db.insert(timesheetAccess).values({ userId, grantedByUserId, accessRole }).onDuplicateKeyUpdate({ set: { grantedByUserId, accessRole, grantedAt: new Date() } });
  } else {
    await db.delete(timesheetAccess).where(eq(timesheetAccess.userId, userId));
  }
  return true;
}

export type TaskInput = { title: string; description?: string | null; status: "todo" | "in_progress" | "done"; priority: "low" | "medium" | "high"; dueAt?: Date | null; reminderAt?: Date | null };
export type EventInput = { title: string; description?: string | null; startAt: Date; endAt: Date; reminderAt?: Date | null; recurrenceRule?: string | null; telegramReminder: boolean };

export async function listTasks(userId: number) {
  const db = await requireDb();
  return db.select().from(tasks).where(eq(tasks.userId, userId)).orderBy(asc(tasks.status), asc(tasks.dueAt), desc(tasks.createdAt));
}
export async function createTask(userId: number, input: TaskInput) {
  const db = await requireDb();
  await db.insert(tasks).values({ userId, title: input.title.trim(), description: input.description?.trim() || null, status: input.status, priority: input.priority, dueAt: input.dueAt ?? null, reminderAt: input.reminderAt ?? null, completedAt: input.status === "done" ? new Date() : null });
}
export async function updateTask(userId: number, taskId: number, input: TaskInput) {
  const db = await requireDb();
  await db.update(tasks).set({ title: input.title.trim(), description: input.description?.trim() || null, status: input.status, priority: input.priority, dueAt: input.dueAt ?? null, reminderAt: input.reminderAt ?? null, completedAt: input.status === "done" ? new Date() : null }).where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)));
}
export async function deleteTask(userId: number, taskId: number) {
  const db = await requireDb();
  await db.delete(tasks).where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)));
}

export async function listEvents(userId: number) {
  const db = await requireDb();
  const events = await db.select().from(calendarEvents).where(eq(calendarEvents.userId, userId)).orderBy(asc(calendarEvents.startAt));
  const now = new Date();
  const rangeStart = new Date(now.getTime() - 90 * 86_400_000);
  const rangeEnd = new Date(now.getTime() + 730 * 86_400_000);
  return expandCalendarEvents(events, rangeStart, rangeEnd);
}
export async function createEvent(userId: number, input: EventInput) {
  const db = await requireDb();
  const result = await db.insert(calendarEvents).values({ userId, title: input.title.trim(), description: input.description?.trim() || null, startAt: input.startAt, endAt: input.endAt, reminderAt: input.reminderAt ?? null, recurrenceRule: input.recurrenceRule ?? null, telegramReminder: input.telegramReminder });
  return Number((result as unknown as [{ insertId?: number }])[0]?.insertId);
}
export type TimesheetShiftEventInput = {
  date: string;
  shift: "S" | "D";
  assignment: string;
};

function timesheetShiftRange(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  const startAt = new Date(Date.UTC(year, month - 1, day, -7, 0, 0));
  const endAt = new Date(Date.UTC(year, month - 1, day, 16, 59, 0));
  return { startAt, endAt };
}

function timesheetShiftMarker(shift: "S" | "D", assignment: string) {
  return `[timesheet-image:${shift}:${assignment.replace(/\s+/g, " ").trim().toLocaleLowerCase("vi")}]`;
}

export async function createTimesheetShiftEvents(userId: number, scheduleTitle: string, entries: TimesheetShiftEventInput[], locale: "vi" | "en") {
  const db = await requireDb();
  const candidates = entries.map(entry => {
    const { startAt, endAt } = timesheetShiftRange(entry.date);
    const marker = timesheetShiftMarker(entry.shift, entry.assignment);
    const shiftTitle = locale === "en" ? `Duty shift ${entry.shift} · ${entry.assignment}` : `Trực ca ${entry.shift} · ${entry.assignment}`;
    const description = locale === "en"
      ? `${marker}\nRoster: ${scheduleTitle}\nShift: ${entry.shift}\nDate: ${entry.date}\n\nExtracted from a roster image and reviewed by a Timesheet administrator. No reminder was enabled.`
      : `${marker}\nLịch trực: ${scheduleTitle}\nCa: ${entry.shift}\nNgày: ${entry.date}\n\nDữ liệu được trích xuất từ ảnh lịch trực và đã được Admin Timesheet rà soát. Hệ thống không bật nhắc việc.`;
    return { ...entry, startAt, endAt, marker, title: shiftTitle.slice(0, 240), description };
  });
  const existing = candidates.length
    ? await db.select({ startAt: calendarEvents.startAt, description: calendarEvents.description }).from(calendarEvents).where(and(eq(calendarEvents.userId, userId), inArray(calendarEvents.startAt, candidates.map(candidate => candidate.startAt))))
    : [];
  const existingMarkers = new Set(existing.flatMap(event => candidates.filter(candidate => event.startAt.getTime() === candidate.startAt.getTime() && event.description?.includes(candidate.marker)).map(candidate => candidate.marker)));
  const newEvents = candidates.filter(candidate => !existingMarkers.has(candidate.marker));
  if (newEvents.length) {
    await db.insert(calendarEvents).values(newEvents.map(event => ({
      userId,
      title: event.title,
      description: event.description,
      startAt: event.startAt,
      endAt: event.endAt,
      reminderAt: null,
      recurrenceRule: null,
      telegramReminder: false,
    })));
  }
  return { created: newEvents.length, skipped: candidates.length - newEvents.length };
}
export async function getEvent(userId: number, eventId: number) {
  const db = await requireDb();
  return (await db.select().from(calendarEvents).where(and(eq(calendarEvents.id, eventId), eq(calendarEvents.userId, userId))).limit(1))[0];
}
export async function updateEvent(userId: number, eventId: number, input: EventInput) {
  const db = await requireDb();
  await db.update(calendarEvents).set({ title: input.title.trim(), description: input.description?.trim() || null, startAt: input.startAt, endAt: input.endAt, reminderAt: input.reminderAt ?? null, recurrenceRule: input.recurrenceRule ?? null, telegramReminder: input.telegramReminder, telegramSentAt: null, telegramDeliveryError: null }).where(and(eq(calendarEvents.id, eventId), eq(calendarEvents.userId, userId)));
}
export async function setEventTelegramJob(userId: number, eventId: number, taskUid: string) {
  const db = await requireDb();
  await db.update(calendarEvents).set({ telegramJobUid: taskUid, telegramDeliveryError: null }).where(and(eq(calendarEvents.id, eventId), eq(calendarEvents.userId, userId)));
}
export async function clearEventTelegramJob(userId: number, eventId: number) {
  const db = await requireDb();
  await db.update(calendarEvents).set({ telegramJobUid: null, telegramSentAt: null, telegramDeliveryError: null, telegramReminder: false }).where(and(eq(calendarEvents.id, eventId), eq(calendarEvents.userId, userId)));
}
export async function deleteEvent(userId: number, eventId: number) {
  const db = await requireDb();
  await db.delete(calendarEvents).where(and(eq(calendarEvents.id, eventId), eq(calendarEvents.userId, userId)));
}

export async function getTelegramConnection(userId: number) {
  const db = await requireDb();
  return (await db.select().from(telegramConnections).where(eq(telegramConnections.userId, userId)).limit(1))[0];
}
export async function createTelegramLink(userId: number, linkToken: string, expiresAt: Date) {
  const db = await requireDb();
  await db.insert(telegramConnections).values({ userId, linkToken, linkTokenExpiresAt: expiresAt }).onDuplicateKeyUpdate({ set: { linkToken, linkTokenExpiresAt: expiresAt, chatId: null, connectedAt: null } });
}
export async function completeTelegramLink(userId: number, linkToken: string, chatId: string) {
  const db = await requireDb();
  await db.update(telegramConnections).set({ chatId, connectedAt: new Date(), linkToken: null, linkTokenExpiresAt: null }).where(and(eq(telegramConnections.userId, userId), eq(telegramConnections.linkToken, linkToken)));
}
export async function claimTelegramEventByTaskUid(taskUid: string) {
  const db = await requireDb();
  const event = (await db.select().from(calendarEvents).where(eq(calendarEvents.telegramJobUid, taskUid)).limit(1))[0];
  if (!event) return undefined;
  const isRecurring = Boolean(parseRecurrenceRule(event.recurrenceRule));
  const dueOccurrence = isRecurring ? getTelegramOccurrenceDueAt(event, new Date()) : null;
  if (isRecurring && !dueOccurrence?.reminderAt) return undefined;
  const sentMarker = dueOccurrence?.reminderAt ?? new Date();
  const result = await db.update(calendarEvents).set({ telegramSentAt: sentMarker, telegramDeliveryError: null }).where(and(
    eq(calendarEvents.id, event.id),
    isRecurring ? or(isNull(calendarEvents.telegramSentAt), ne(calendarEvents.telegramSentAt, sentMarker)) : isNull(calendarEvents.telegramSentAt),
  ));
  if ((result as unknown as [{ affectedRows?: number }])[0]?.affectedRows !== 1) return undefined;
  return dueOccurrence ? { ...event, startAt: dueOccurrence.startAt, endAt: dueOccurrence.endAt, reminderAt: dueOccurrence.reminderAt } : event;
}
export async function setTelegramEventDeliveryError(eventId: number, message: string) {
  const db = await requireDb();
  await db.update(calendarEvents).set({ telegramDeliveryError: message.slice(0, 500) }).where(eq(calendarEvents.id, eventId));
}
export async function logTelegramDelivery(userId: number, eventId: number, eventTitle: string, status: "success" | "error", errorMessage?: string | null) {
  const db = await requireDb();
  await db.insert(telegramDeliveryLogs).values({ userId, eventId, eventTitle: eventTitle.slice(0, 240), status, errorMessage: errorMessage?.slice(0, 500) || null });
}
export async function getTelegramDeliveryHistory(userId: number, limit = 30) {
  const db = await requireDb();
  return db.select().from(telegramDeliveryLogs).where(eq(telegramDeliveryLogs.userId, userId)).orderBy(desc(telegramDeliveryLogs.sentAt)).limit(limit);
}

export type EmailProvider = "google" | "microsoft" | "webmail";
export type EmailOAuthProvider = Exclude<EmailProvider, "webmail">;
export type EmailAuthMethod = "app_password" | "oauth2";
export type EmailMessageStatus = "new" | "in_progress" | "done" | "archived";
export type EmailSuggestionStatus = "pending" | "accepted" | "dismissed" | "error";

export async function createEmailOAuthSession(userId: number, provider: EmailOAuthProvider, stateHash: string, codeVerifier: string, expiresAt: Date) {
  const db = await requireDb();
  await db.insert(emailOAuthSessions).values({ userId, provider, stateHash, codeVerifier, expiresAt });
}

export async function consumeEmailOAuthSession(stateHash: string) {
  const db = await requireDb();
  const session = (await db.select().from(emailOAuthSessions).where(and(eq(emailOAuthSessions.stateHash, stateHash), gt(emailOAuthSessions.expiresAt, new Date()))).limit(1))[0];
  if (session) await db.delete(emailOAuthSessions).where(eq(emailOAuthSessions.id, session.id));
  return session;
}

export async function listEmailAccounts(userId: number) {
  const db = await requireDb();
  return db.select({ id: emailAccounts.id, provider: emailAccounts.provider, email: emailAccounts.email, displayName: emailAccounts.displayName, authMethod: emailAccounts.authMethod, imapHost: emailAccounts.imapHost, imapPort: emailAccounts.imapPort, imapSecure: emailAccounts.imapSecure, imapUsername: emailAccounts.imapUsername, imapMailbox: emailAccounts.imapMailbox, connectionStatus: emailAccounts.connectionStatus, lastSyncedAt: emailAccounts.lastSyncedAt, lastSyncError: emailAccounts.lastSyncError, lastSyncFetchedCount: emailAccounts.lastSyncFetchedCount, lastSyncNewCount: emailAccounts.lastSyncNewCount, mailboxMessageCount: emailAccounts.mailboxMessageCount, aiSyncEnabled: emailAccounts.aiSyncEnabled, aiSyncIntervalMinutes: emailAccounts.aiSyncIntervalMinutes, aiSyncLastRunAt: emailAccounts.aiSyncLastRunAt, aiSyncLastError: emailAccounts.aiSyncLastError, createdAt: emailAccounts.createdAt }).from(emailAccounts).where(eq(emailAccounts.userId, userId)).orderBy(asc(emailAccounts.provider), asc(emailAccounts.email));
}

export async function getEmailAccountWithCredentials(userId: number, accountId: number) {
  const db = await requireDb();
  return (await db.select().from(emailAccounts).where(and(eq(emailAccounts.id, accountId), eq(emailAccounts.userId, userId))).limit(1))[0];
}

export async function getEmailAccountByProviderEmail(userId: number, provider: EmailProvider, email: string) {
  const db = await requireDb();
  return (await db.select().from(emailAccounts).where(and(eq(emailAccounts.userId, userId), eq(emailAccounts.provider, provider), eq(emailAccounts.email, email.toLowerCase()))).limit(1))[0];
}

/** @deprecated Use getEmailAccountWithCredentials for IMAP and OAuth2 mailboxes. */
export const getEmailAccountWithTokens = getEmailAccountWithCredentials;

export type ImapAccountInput = {
  provider: EmailProvider;
  email: string;
  displayName?: string | null;
  imapHost: string;
  imapPort: number;
  imapSecure: boolean;
  imapUsername: string;
  imapPasswordCiphertext: string;
  imapMailbox?: string;
};

export async function upsertImapEmailAccount(userId: number, input: ImapAccountInput) {
  const db = await requireDb();
  const values = {
    userId,
    provider: input.provider,
    email: input.email.toLowerCase(),
    displayName: input.displayName ?? null,
    authMethod: "app_password" as const,
    imapHost: input.imapHost,
    imapPort: input.imapPort,
    imapSecure: input.imapSecure,
    imapUsername: input.imapUsername,
    imapPasswordCiphertext: input.imapPasswordCiphertext,
    imapMailbox: input.imapMailbox ?? "INBOX",
    accessTokenCiphertext: null,
    refreshTokenCiphertext: null,
    tokenExpiresAt: null,
    scopes: null,
    connectionStatus: "connected" as const,
    lastSyncError: null,
  };
  await db.insert(emailAccounts).values(values).onDuplicateKeyUpdate({ set: { ...values, userId: undefined } });
}

export async function upsertEmailAccount(userId: number, input: { provider: EmailOAuthProvider; email: string; displayName?: string | null; accessTokenCiphertext: string; refreshTokenCiphertext?: string | null; tokenExpiresAt?: Date | null; scopes?: string | null }) {
  const db = await requireDb();
  await db.insert(emailAccounts).values({ userId, provider: input.provider, email: input.email.toLowerCase(), displayName: input.displayName ?? null, authMethod: "oauth2", imapHost: "outlook.office365.com", imapPort: 993, imapSecure: true, imapUsername: input.email.toLowerCase(), imapMailbox: "INBOX", accessTokenCiphertext: input.accessTokenCiphertext, refreshTokenCiphertext: input.refreshTokenCiphertext ?? null, tokenExpiresAt: input.tokenExpiresAt ?? null, scopes: input.scopes ?? null, connectionStatus: "connected", lastSyncError: null }).onDuplicateKeyUpdate({ set: { displayName: input.displayName ?? null, authMethod: "oauth2", imapHost: "outlook.office365.com", imapPort: 993, imapSecure: true, imapUsername: input.email.toLowerCase(), imapMailbox: "INBOX", imapPasswordCiphertext: null, accessTokenCiphertext: input.accessTokenCiphertext, refreshTokenCiphertext: input.refreshTokenCiphertext ?? null, tokenExpiresAt: input.tokenExpiresAt ?? null, scopes: input.scopes ?? null, connectionStatus: "connected", lastSyncError: null } });
}

export async function updateEmailAccountTokens(userId: number, accountId: number, input: { accessTokenCiphertext: string; refreshTokenCiphertext?: string | null; tokenExpiresAt?: Date | null }) {
  const db = await requireDb();
  await db.update(emailAccounts).set({ ...input, connectionStatus: "connected", lastSyncError: null }).where(and(eq(emailAccounts.id, accountId), eq(emailAccounts.userId, userId)));
}

export async function setEmailAccountSyncState(userId: number, accountId: number, status: "connected" | "needs_reconnect" | "error", error?: string | null, stats?: { fetchedCount: number; newCount: number; mailboxCount: number }) {
  const db = await requireDb();
  await db.update(emailAccounts).set({ connectionStatus: status, lastSyncError: error?.slice(0, 1000) || null, lastSyncedAt: status === "connected" ? new Date() : undefined, ...(stats ? { lastSyncFetchedCount: Math.max(0, stats.fetchedCount), lastSyncNewCount: Math.max(0, stats.newCount), mailboxMessageCount: Math.max(0, stats.mailboxCount) } : {}) }).where(and(eq(emailAccounts.id, accountId), eq(emailAccounts.userId, userId)));
}

export async function removeEmailAccount(userId: number, accountId: number) {
  const db = await requireDb();
  await db.delete(emailEventSuggestions).where(and(eq(emailEventSuggestions.emailAccountId, accountId), eq(emailEventSuggestions.userId, userId)));
  await db.delete(emailGeminiSummaries).where(and(eq(emailGeminiSummaries.emailAccountId, accountId), eq(emailGeminiSummaries.userId, userId)));
  await db.delete(emailNotes).where(and(eq(emailNotes.emailAccountId, accountId), eq(emailNotes.userId, userId)));
  await db.delete(emailMessages).where(and(eq(emailMessages.emailAccountId, accountId), eq(emailMessages.userId, userId)));
  await db.delete(emailAccounts).where(and(eq(emailAccounts.id, accountId), eq(emailAccounts.userId, userId)));
}

export async function upsertEmailMessages(userId: number, accountId: number, messages: Array<{ providerMessageId: string; threadId?: string | null; subject: string; senderName?: string | null; senderEmail?: string | null; snippet?: string | null; receivedAt: Date; isRead: boolean; labels?: string | null; webLink?: string | null }>) {
  const db = await requireDb();
  for (const message of messages) await db.insert(emailMessages).values({ userId, emailAccountId: accountId, providerMessageId: message.providerMessageId, threadId: message.threadId ?? null, subject: message.subject.slice(0, 500) || "(Không có tiêu đề)", senderName: message.senderName?.slice(0, 240) || null, senderEmail: message.senderEmail?.slice(0, 320) || null, snippet: message.snippet ?? null, receivedAt: message.receivedAt, isRead: message.isRead, labels: message.labels?.slice(0, 1000) || null, webLink: message.webLink?.slice(0, 1000) || null }).onDuplicateKeyUpdate({ set: { threadId: message.threadId ?? null, subject: message.subject.slice(0, 500) || "(Không có tiêu đề)", senderName: message.senderName?.slice(0, 240) || null, senderEmail: message.senderEmail?.slice(0, 320) || null, snippet: message.snippet ?? null, receivedAt: message.receivedAt, isRead: message.isRead, labels: message.labels?.slice(0, 1000) || null, webLink: message.webLink?.slice(0, 1000) || null } });
}

export async function listEmailMessages(userId: number, input?: { accountId?: number; status?: EmailMessageStatus; limit?: number }) {
  const db = await requireDb();
  const conditions = [eq(emailMessages.userId, userId)];
  if (input?.accountId) conditions.push(eq(emailMessages.emailAccountId, input.accountId));
  if (input?.status) conditions.push(eq(emailMessages.status, input.status));
  return db.select().from(emailMessages).where(and(...conditions)).orderBy(desc(emailMessages.receivedAt)).limit(input?.limit ?? 50);
}

/** Returns the number of locally synchronized messages, always scoped to the current user. */
export async function countEmailMessages(userId: number, accountId?: number) {
  const db = await requireDb();
  const conditions = [eq(emailMessages.userId, userId)];
  if (accountId) conditions.push(eq(emailMessages.emailAccountId, accountId));
  const rows = await db.select({ value: count() }).from(emailMessages).where(and(...conditions));
  return Number(rows[0]?.value ?? 0);
}

/** Lists local messages older than a known Inbox timestamp for account-scoped pagination views. */
export async function listEmailMessagesOlderThan(userId: number, accountId: number, beforeDate: Date, limit = 50) {
  const db = await requireDb();
  return db.select().from(emailMessages).where(and(
    eq(emailMessages.userId, userId),
    eq(emailMessages.emailAccountId, accountId),
    lte(emailMessages.receivedAt, beforeDate),
  )).orderBy(desc(emailMessages.receivedAt)).limit(Math.min(Math.max(limit, 1), 50));
}

/** Returns only the records from an IMAP page, scoped by both user and mailbox. */
export async function listEmailMessagesByProviderIds(userId: number, accountId: number, providerMessageIds: string[]) {
  if (!providerMessageIds.length) return [];
  const db = await requireDb();
  return db.select().from(emailMessages).where(and(
    eq(emailMessages.userId, userId),
    eq(emailMessages.emailAccountId, accountId),
    inArray(emailMessages.providerMessageId, providerMessageIds),
  )).orderBy(desc(emailMessages.receivedAt));
}

/** Finds one user-owned metadata record before requesting its original MIME body from IMAP. */
export async function getEmailMessageForOriginalContent(userId: number, messageId: number) {
  const db = await requireDb();
  return (await db.select({ id: emailMessages.id, emailAccountId: emailMessages.emailAccountId, providerMessageId: emailMessages.providerMessageId, subject: emailMessages.subject, senderName: emailMessages.senderName, senderEmail: emailMessages.senderEmail, receivedAt: emailMessages.receivedAt }).from(emailMessages).where(and(eq(emailMessages.id, messageId), eq(emailMessages.userId, userId))).limit(1))[0];
}

export async function updateEmailMessageStatus(userId: number, messageId: number, status: EmailMessageStatus) {
  const db = await requireDb();
  await db.update(emailMessages).set({ status }).where(and(eq(emailMessages.id, messageId), eq(emailMessages.userId, userId)));
}

/** Marks a user-owned inbox message as read in TaskFlow after a user-requested AI summary. */
export async function markEmailMessageRead(userId: number, messageId: number) {
  const db = await requireDb();
  await db.update(emailMessages).set({ isRead: true, status: "done" }).where(and(eq(emailMessages.id, messageId), eq(emailMessages.userId, userId)));
}

export async function getEmailMessageForGeminiSummary(userId: number, messageId: number) {
  const db = await requireDb();
  return (await db.select({
    id: emailMessages.id,
    emailAccountId: emailMessages.emailAccountId,
    subject: emailMessages.subject,
    senderName: emailMessages.senderName,
    senderEmail: emailMessages.senderEmail,
    snippet: emailMessages.snippet,
    receivedAt: emailMessages.receivedAt,
    provider: emailAccounts.provider,
  }).from(emailMessages).innerJoin(emailAccounts, and(
    eq(emailMessages.emailAccountId, emailAccounts.id),
    eq(emailAccounts.userId, userId),
  )).where(and(
    eq(emailMessages.id, messageId),
    eq(emailMessages.userId, userId),
  )).limit(1))[0];
}

export async function getEmailGeminiSummary(userId: number, messageId: number) {
  const db = await requireDb();
  return (await db.select().from(emailGeminiSummaries).where(and(
    eq(emailGeminiSummaries.userId, userId),
    eq(emailGeminiSummaries.emailMessageId, messageId),
  )).limit(1))[0];
}

export async function listEmailGeminiSummaries(userId: number, limit = 100) {
  const db = await requireDb();
  return db.select({
    id: emailGeminiSummaries.id,
    emailMessageId: emailGeminiSummaries.emailMessageId,
    emailAccountId: emailGeminiSummaries.emailAccountId,
    summary: emailGeminiSummaries.summary,
    eventStartAt: emailGeminiSummaries.eventStartAt,
    eventEndAt: emailGeminiSummaries.eventEndAt,
    locale: emailGeminiSummaries.locale,
    model: emailGeminiSummaries.model,
    generatedAt: emailGeminiSummaries.generatedAt,
  }).from(emailGeminiSummaries).where(eq(emailGeminiSummaries.userId, userId)).orderBy(desc(emailGeminiSummaries.generatedAt)).limit(limit);
}

export async function countEmailGeminiSummariesSince(userId: number, since: Date) {
  const db = await requireDb();
  const row = (await db.select({ value: count() }).from(emailGeminiSummaries).where(and(
    eq(emailGeminiSummaries.userId, userId),
    gt(emailGeminiSummaries.generatedAt, since),
  )))[0];
  return Number(row?.value ?? 0);
}

export async function createEmailGeminiSummary(userId: number, input: { emailAccountId: number; emailMessageId: number; summary: string; eventStartAt?: Date | null; eventEndAt?: Date | null; locale: string; model: string }) {
  const db = await requireDb();
  await db.insert(emailGeminiSummaries).values({
    userId,
    emailAccountId: input.emailAccountId,
    emailMessageId: input.emailMessageId,
    summary: input.summary.slice(0, 8000),
    eventStartAt: input.eventStartAt ?? null,
    eventEndAt: input.eventEndAt ?? null,
    locale: input.locale.slice(0, 12),
    model: input.model.slice(0, 120),
    status: "ready",
  });
  return getEmailGeminiSummary(userId, input.emailMessageId);
}

export type EmailNoteInput = {
  title: string;
  body?: string | null;
  isPinned?: boolean;
  emailAccountId?: number | null;
  emailMessageId?: number | null;
};

async function getOwnedEmailNoteSource(userId: number, input: Pick<EmailNoteInput, "emailAccountId" | "emailMessageId">) {
  const db = await requireDb();
  if (input.emailMessageId) {
    const message = (await db.select({ id: emailMessages.id, emailAccountId: emailMessages.emailAccountId }).from(emailMessages).where(and(
      eq(emailMessages.id, input.emailMessageId),
      eq(emailMessages.userId, userId),
    )).limit(1))[0];
    if (!message) throw new Error("Không tìm thấy email nguồn của ghi chú.");
    return { emailAccountId: message.emailAccountId, emailMessageId: message.id };
  }
  if (input.emailAccountId) {
    const account = (await db.select({ id: emailAccounts.id }).from(emailAccounts).where(and(
      eq(emailAccounts.id, input.emailAccountId),
      eq(emailAccounts.userId, userId),
    )).limit(1))[0];
    if (!account) throw new Error("Không tìm thấy hộp thư của ghi chú.");
    return { emailAccountId: account.id, emailMessageId: null };
  }
  return { emailAccountId: null, emailMessageId: null };
}

export async function listEmailNotes(userId: number, limit = 50) {
  const db = await requireDb();
  return db.select({
    id: emailNotes.id,
    title: emailNotes.title,
    body: emailNotes.body,
    isPinned: emailNotes.isPinned,
    emailAccountId: emailNotes.emailAccountId,
    emailMessageId: emailNotes.emailMessageId,
    createdAt: emailNotes.createdAt,
    updatedAt: emailNotes.updatedAt,
    emailSubject: emailMessages.subject,
    senderName: emailMessages.senderName,
  }).from(emailNotes).leftJoin(emailMessages, and(
    eq(emailNotes.emailMessageId, emailMessages.id),
    eq(emailMessages.userId, userId),
  )).where(eq(emailNotes.userId, userId)).orderBy(desc(emailNotes.isPinned), desc(emailNotes.updatedAt)).limit(limit);
}

export async function createEmailNote(userId: number, input: EmailNoteInput) {
  const db = await requireDb();
  const source = await getOwnedEmailNoteSource(userId, input);
  const result = await db.insert(emailNotes).values({
    userId,
    emailAccountId: source.emailAccountId,
    emailMessageId: source.emailMessageId,
    title: input.title.trim().slice(0, 240),
    body: input.body?.trim().slice(0, 4000) || null,
    isPinned: input.isPinned ?? false,
  });
  const id = Number((result as unknown as [{ insertId?: number }])[0]?.insertId);
  return (await listEmailNotes(userId, 100)).find(note => note.id === id);
}

export async function updateEmailNote(userId: number, noteId: number, input: EmailNoteInput) {
  const db = await requireDb();
  const source = await getOwnedEmailNoteSource(userId, input);
  await db.update(emailNotes).set({
    emailAccountId: source.emailAccountId,
    emailMessageId: source.emailMessageId,
    title: input.title.trim().slice(0, 240),
    body: input.body?.trim().slice(0, 4000) || null,
    isPinned: input.isPinned ?? false,
  }).where(and(eq(emailNotes.id, noteId), eq(emailNotes.userId, userId)));
  return (await listEmailNotes(userId, 100)).find(note => note.id === noteId);
}

export async function deleteEmailNote(userId: number, noteId: number) {
  const db = await requireDb();
  await db.delete(emailNotes).where(and(eq(emailNotes.id, noteId), eq(emailNotes.userId, userId)));
}

export async function getEmailAiOverview(userId: number) {
  const db = await requireDb();
  const now = new Date();
  const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const [messagesRow, summariesRow, todayRow, notesRow, recentSummaries] = await Promise.all([
    db.select({ value: count() }).from(emailMessages).where(eq(emailMessages.userId, userId)),
    db.select({ value: count() }).from(emailGeminiSummaries).where(eq(emailGeminiSummaries.userId, userId)),
    db.select({ value: count() }).from(emailGeminiSummaries).where(and(eq(emailGeminiSummaries.userId, userId), gt(emailGeminiSummaries.generatedAt, todayUtc))),
    db.select({ value: count() }).from(emailNotes).where(eq(emailNotes.userId, userId)),
    db.select({
      id: emailGeminiSummaries.id,
      emailMessageId: emailGeminiSummaries.emailMessageId,
      summary: emailGeminiSummaries.summary,
      generatedAt: emailGeminiSummaries.generatedAt,
      emailSubject: emailMessages.subject,
      senderName: emailMessages.senderName,
    }).from(emailGeminiSummaries).innerJoin(emailMessages, and(
      eq(emailGeminiSummaries.emailMessageId, emailMessages.id),
      eq(emailMessages.userId, userId),
    )).where(eq(emailGeminiSummaries.userId, userId)).orderBy(desc(emailGeminiSummaries.generatedAt)).limit(4),
  ]);
  return {
    inboxCount: Number(messagesRow[0]?.value ?? 0),
    summarizedCount: Number(summariesRow[0]?.value ?? 0),
    summarizedToday: Number(todayRow[0]?.value ?? 0),
    noteCount: Number(notesRow[0]?.value ?? 0),
    recentSummaries,
  };
}

export async function updateEmailAiSyncSettings(userId: number, accountId: number, input: { enabled: boolean; intervalMinutes: number; taskUid?: string | null }) {
  const db = await requireDb();
  await db.update(emailAccounts).set({ aiSyncEnabled: input.enabled, aiSyncIntervalMinutes: input.intervalMinutes, aiSyncJobUid: input.taskUid, aiSyncLastError: null }).where(and(eq(emailAccounts.id, accountId), eq(emailAccounts.userId, userId)));
}

export async function getEmailAccountByAiSyncJob(taskUid: string) {
  const db = await requireDb();
  return (await db.select().from(emailAccounts).where(eq(emailAccounts.aiSyncJobUid, taskUid)).limit(1))[0];
}

export async function setEmailAiSyncRunState(userId: number, accountId: number, error?: string | null) {
  const db = await requireDb();
  await db.update(emailAccounts).set({ aiSyncLastRunAt: new Date(), aiSyncLastError: error?.slice(0, 1000) || null }).where(and(eq(emailAccounts.id, accountId), eq(emailAccounts.userId, userId)));
}

export async function listEmailMessagesForAiAnalysis(userId: number, accountId: number, limit = 6) {
  const db = await requireDb();
  return db.select().from(emailMessages).where(and(eq(emailMessages.userId, userId), eq(emailMessages.emailAccountId, accountId), isNull(emailMessages.aiAnalyzedAt))).orderBy(desc(emailMessages.receivedAt)).limit(limit);
}

export async function markEmailMessageAiAnalyzed(userId: number, accountId: number, messageId: number) {
  const db = await requireDb();
  await db.update(emailMessages).set({ aiAnalyzedAt: new Date() }).where(and(eq(emailMessages.id, messageId), eq(emailMessages.emailAccountId, accountId), eq(emailMessages.userId, userId)));
}

export async function getEmailSuggestionForMessage(userId: number, messageId: number) {
  const db = await requireDb();
  return (await db.select().from(emailEventSuggestions).where(and(eq(emailEventSuggestions.userId, userId), eq(emailEventSuggestions.emailMessageId, messageId))).limit(1))[0];
}

export async function createEmailEventSuggestion(userId: number, input: { emailAccountId: number; emailMessageId: number; title: string; description?: string | null; startAt: Date; endAt: Date; reminderMinutes: number; planLink?: string | null; sourceExcerpt?: string | null; confidence: number; model: string }) {
  const db = await requireDb();
  await db.insert(emailEventSuggestions).values({ userId, emailAccountId: input.emailAccountId, emailMessageId: input.emailMessageId, title: input.title.slice(0, 240), description: input.description?.slice(0, 4000) || null, startAt: input.startAt, endAt: input.endAt, reminderMinutes: input.reminderMinutes, planLink: input.planLink?.slice(0, 1000) || null, sourceExcerpt: input.sourceExcerpt?.slice(0, 1000) || null, confidence: input.confidence, model: input.model });
}

export async function listEmailEventSuggestions(userId: number, input?: { accountId?: number; status?: EmailSuggestionStatus; limit?: number }) {
  const db = await requireDb();
  const conditions = [eq(emailEventSuggestions.userId, userId)];
  if (input?.accountId) conditions.push(eq(emailEventSuggestions.emailAccountId, input.accountId));
  if (input?.status) conditions.push(eq(emailEventSuggestions.status, input.status));
  return db.select({ id: emailEventSuggestions.id, emailAccountId: emailEventSuggestions.emailAccountId, emailMessageId: emailEventSuggestions.emailMessageId, title: emailEventSuggestions.title, description: emailEventSuggestions.description, startAt: emailEventSuggestions.startAt, endAt: emailEventSuggestions.endAt, reminderMinutes: emailEventSuggestions.reminderMinutes, planLink: emailEventSuggestions.planLink, sourceExcerpt: emailEventSuggestions.sourceExcerpt, confidence: emailEventSuggestions.confidence, status: emailEventSuggestions.status, calendarEventId: emailEventSuggestions.calendarEventId, analyzedAt: emailEventSuggestions.analyzedAt, emailSubject: emailMessages.subject, senderName: emailMessages.senderName, senderEmail: emailMessages.senderEmail, webLink: emailMessages.webLink }).from(emailEventSuggestions).innerJoin(emailMessages, and(eq(emailEventSuggestions.emailMessageId, emailMessages.id), eq(emailMessages.userId, userId))).where(and(...conditions)).orderBy(desc(emailEventSuggestions.analyzedAt)).limit(input?.limit ?? 50);
}

export async function getPendingEmailEventSuggestion(userId: number, suggestionId: number) {
  const db = await requireDb();
  return (await db.select().from(emailEventSuggestions).where(and(eq(emailEventSuggestions.id, suggestionId), eq(emailEventSuggestions.userId, userId), eq(emailEventSuggestions.status, "pending"))).limit(1))[0];
}

export async function acceptEmailEventSuggestion(userId: number, suggestionId: number, calendarEventId: number) {
  const db = await requireDb();
  await db.update(emailEventSuggestions).set({ status: "accepted", calendarEventId, errorMessage: null }).where(and(eq(emailEventSuggestions.id, suggestionId), eq(emailEventSuggestions.userId, userId), eq(emailEventSuggestions.status, "pending")));
}

export async function dismissEmailEventSuggestion(userId: number, suggestionId: number) {
  const db = await requireDb();
  await db.update(emailEventSuggestions).set({ status: "dismissed" }).where(and(eq(emailEventSuggestions.id, suggestionId), eq(emailEventSuggestions.userId, userId), eq(emailEventSuggestions.status, "pending")));
}

export async function syncDueNotifications(userId: number) {
  const db = await requireDb(); const now = new Date();
  const [dueTasks, userEvents] = await Promise.all([
    db.select().from(tasks).where(and(eq(tasks.userId, userId), lte(tasks.reminderAt, now), ne(tasks.status, "done"))),
    listEvents(userId),
  ]);
  const recurrenceCutoff = new Date(now.getTime() - 24 * 60 * 60_000);
  const dueEvents = userEvents.filter(event => event.reminderAt && event.reminderAt <= now && event.reminderAt >= recurrenceCutoff);
  for (const task of dueTasks) await db.insert(notifications).values({ userId, sourceKey: `task:${task.id}`, kind: "task", title: "Nhắc việc đến hạn", body: task.title, scheduledFor: task.reminderAt ?? now }).onDuplicateKeyUpdate({ set: { scheduledFor: task.reminderAt ?? now } });
  for (const event of dueEvents) {
    const sourceKey = event.isRecurringOccurrence ? `event:${event.id}:${event.startAt.getTime()}` : `event:${event.id}`;
    await db.insert(notifications).values({ userId, sourceKey, kind: "event", title: "Sự kiện sắp bắt đầu", body: event.title, scheduledFor: event.reminderAt ?? now }).onDuplicateKeyUpdate({ set: { scheduledFor: event.reminderAt ?? now } });
  }
  return db.select().from(notifications).where(and(eq(notifications.userId, userId), isNull(notifications.readAt))).orderBy(desc(notifications.scheduledFor));
}
export async function markNotificationRead(userId: number, notificationId: number) { const db = await requireDb(); await db.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId))); }
export async function markAllNotificationsRead(userId: number) { const db = await requireDb(); await db.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.userId, userId), isNull(notifications.readAt))); }
export async function updateUserProfile(userId: number, input: { name: string; email: string }) { const db = await requireDb(); await db.update(users).set({ name: input.name.trim() || null, email: input.email.trim() || null }).where(eq(users.id, userId)); }
export async function getDailyAiQuote(dayKey: string) { const db = await requireDb(); return (await db.select().from(dailyAiQuotes).where(eq(dailyAiQuotes.dayKey, dayKey)).limit(1))[0]; }
export async function createDailyAiQuote(input: { dayKey: string; quoteVi: string; quoteEn: string; model: string }) { const db = await requireDb(); await db.insert(dailyAiQuotes).values({ dayKey: input.dayKey, quoteVi: input.quoteVi.slice(0, 280), quoteEn: input.quoteEn.slice(0, 280), model: input.model.slice(0, 120) }).onDuplicateKeyUpdate({ set: { dayKey: input.dayKey } }); return getDailyAiQuote(input.dayKey); }
export async function isScheduledJobTask(key: string, taskUid: string) { const db = await requireDb(); return Boolean((await db.select({ key: scheduledJobs.key }).from(scheduledJobs).where(and(eq(scheduledJobs.key, key), eq(scheduledJobs.taskUid, taskUid))).limit(1))[0]); }
export async function getDashboardData(userId: number) {
  const [userTasks, userEvents, dailyQuote] = await Promise.all([listTasks(userId), listEvents(userId), getDailyAiQuote(getVietnamDateKey())]); const now = new Date(); const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()); const tomorrowStart = new Date(todayStart); tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  return { todayTasks: userTasks.filter(task => task.dueAt && task.dueAt >= todayStart && task.dueAt < tomorrowStart && task.status !== "done"), upcomingTasks: userTasks.filter(task => task.dueAt && task.dueAt >= tomorrowStart && task.status !== "done").slice(0, 5), upcomingEvents: userEvents.filter(event => event.endAt >= now).slice(0, 5), dailyQuote, stats: { total: userTasks.length, completed: userTasks.filter(task => task.status === "done").length, inProgress: userTasks.filter(task => task.status === "in_progress").length, completionRate: userTasks.length ? Math.round((userTasks.filter(task => task.status === "done").length / userTasks.length) * 100) : 0 } };
}

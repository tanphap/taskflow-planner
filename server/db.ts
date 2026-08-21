import { and, asc, desc, eq, gt, isNull, lte, ne, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  calendarEvents,
  emailAccounts,
  emailEventSuggestions,
  emailMessages,
  emailOAuthSessions,
  InsertUser,
  notifications,
  tasks,
  telegramConnections,
  telegramDeliveryLogs,
  users,
} from "../drizzle/schema";
import { expandCalendarEvents, getTelegramOccurrenceDueAt, parseRecurrenceRule } from "../shared/recurrence";
import { ENV } from "./_core/env";

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

export type EmailProvider = "google" | "microsoft";
export type EmailMessageStatus = "new" | "in_progress" | "done" | "archived";
export type EmailSuggestionStatus = "pending" | "accepted" | "dismissed" | "error";

export async function createEmailOAuthSession(userId: number, provider: EmailProvider, stateHash: string, codeVerifier: string, expiresAt: Date) {
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
  return db.select({ id: emailAccounts.id, provider: emailAccounts.provider, email: emailAccounts.email, displayName: emailAccounts.displayName, connectionStatus: emailAccounts.connectionStatus, lastSyncedAt: emailAccounts.lastSyncedAt, lastSyncError: emailAccounts.lastSyncError, aiSyncEnabled: emailAccounts.aiSyncEnabled, aiSyncIntervalMinutes: emailAccounts.aiSyncIntervalMinutes, aiSyncLastRunAt: emailAccounts.aiSyncLastRunAt, aiSyncLastError: emailAccounts.aiSyncLastError, createdAt: emailAccounts.createdAt }).from(emailAccounts).where(eq(emailAccounts.userId, userId)).orderBy(asc(emailAccounts.provider), asc(emailAccounts.email));
}

export async function getEmailAccountWithTokens(userId: number, accountId: number) {
  const db = await requireDb();
  return (await db.select().from(emailAccounts).where(and(eq(emailAccounts.id, accountId), eq(emailAccounts.userId, userId))).limit(1))[0];
}

export async function upsertEmailAccount(userId: number, input: { provider: EmailProvider; email: string; displayName?: string | null; accessTokenCiphertext: string; refreshTokenCiphertext?: string | null; tokenExpiresAt?: Date | null; scopes?: string | null }) {
  const db = await requireDb();
  await db.insert(emailAccounts).values({ userId, provider: input.provider, email: input.email.toLowerCase(), displayName: input.displayName ?? null, accessTokenCiphertext: input.accessTokenCiphertext, refreshTokenCiphertext: input.refreshTokenCiphertext ?? null, tokenExpiresAt: input.tokenExpiresAt ?? null, scopes: input.scopes ?? null, connectionStatus: "connected", lastSyncError: null }).onDuplicateKeyUpdate({ set: { displayName: input.displayName ?? null, accessTokenCiphertext: input.accessTokenCiphertext, refreshTokenCiphertext: input.refreshTokenCiphertext ?? null, tokenExpiresAt: input.tokenExpiresAt ?? null, scopes: input.scopes ?? null, connectionStatus: "connected", lastSyncError: null } });
}

export async function updateEmailAccountTokens(userId: number, accountId: number, input: { accessTokenCiphertext: string; refreshTokenCiphertext?: string | null; tokenExpiresAt?: Date | null }) {
  const db = await requireDb();
  await db.update(emailAccounts).set({ ...input, connectionStatus: "connected", lastSyncError: null }).where(and(eq(emailAccounts.id, accountId), eq(emailAccounts.userId, userId)));
}

export async function setEmailAccountSyncState(userId: number, accountId: number, status: "connected" | "needs_reconnect" | "error", error?: string | null) {
  const db = await requireDb();
  await db.update(emailAccounts).set({ connectionStatus: status, lastSyncError: error?.slice(0, 1000) || null, lastSyncedAt: status === "connected" ? new Date() : undefined }).where(and(eq(emailAccounts.id, accountId), eq(emailAccounts.userId, userId)));
}

export async function removeEmailAccount(userId: number, accountId: number) {
  const db = await requireDb();
  await db.delete(emailEventSuggestions).where(and(eq(emailEventSuggestions.emailAccountId, accountId), eq(emailEventSuggestions.userId, userId)));
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

export async function updateEmailMessageStatus(userId: number, messageId: number, status: EmailMessageStatus) {
  const db = await requireDb();
  await db.update(emailMessages).set({ status }).where(and(eq(emailMessages.id, messageId), eq(emailMessages.userId, userId)));
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
export async function getDashboardData(userId: number) {
  const [userTasks, userEvents] = await Promise.all([listTasks(userId), listEvents(userId)]); const now = new Date(); const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()); const tomorrowStart = new Date(todayStart); tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  return { todayTasks: userTasks.filter(task => task.dueAt && task.dueAt >= todayStart && task.dueAt < tomorrowStart && task.status !== "done"), upcomingTasks: userTasks.filter(task => task.dueAt && task.dueAt >= tomorrowStart && task.status !== "done").slice(0, 5), upcomingEvents: userEvents.filter(event => event.endAt >= now).slice(0, 5), stats: { total: userTasks.length, completed: userTasks.filter(task => task.status === "done").length, inProgress: userTasks.filter(task => task.status === "in_progress").length, completionRate: userTasks.length ? Math.round((userTasks.filter(task => task.status === "done").length / userTasks.length) * 100) : 0 } };
}

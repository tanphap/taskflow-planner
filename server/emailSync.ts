import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { ENV } from "./_core/env";
import { decryptEmailToken, encryptEmailToken } from "./emailOAuth";
import * as db from "./db";
import { resolvePublicWebmailImapHost } from "./webmailImap";
import { extractHtmlTablesForGemini, extractTabularAttachmentForGemini, inspectTabularAttachmentForGemini, isTabularAttachment, type SpreadsheetSheetSelection } from "./spreadsheetAttachment";

type TokenPayload = { access_token: string; refresh_token?: string; expires_in?: number };
type MailboxMessage = { providerMessageId: string; threadId?: string | null; subject: string; senderName?: string | null; senderEmail?: string | null; snippet?: string | null; receivedAt: Date; isRead: boolean; labels?: string | null; webLink?: string | null };
type MailboxPage = { messages: MailboxMessage[]; hasMore: boolean; nextBeforeUid: number | null; mailboxTotal: number };

export const EMAIL_SYNC_BATCH_SIZE = 50;
export const IMAP_CONNECTION_TIMEOUT_MS = 15_000;
export const IMAP_SOCKET_TIMEOUT_MS = 30_000;
export const ORIGINAL_EMAIL_MAX_BYTES = 2_000_000;
export type GeminiSpreadsheetAttachmentPreview = { attachmentIndex: number; filename: string; kind: "excel" | "csv"; sheetNames: string[] };
const GEMINI_SUPPORTED_ATTACHMENT_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/plain",
  "text/markdown",
]);

/** Extracts the IMAP UID from TaskFlow's `<uidValidity>:<uid>` provider identifier. */
export function getImapUidFromProviderMessageId(providerMessageId: string) {
  const match = /^(?:\d+):(\d+)$/.exec(providerMessageId);
  const uid = match ? Number(match[1]) : Number.NaN;
  return Number.isSafeInteger(uid) && uid > 0 ? uid : null;
}

/** Builds a bounded UID fetch range that tolerates expunged messages between pages. */
export function getImapFetchWindow(uidNext: number, beforeUid?: number, limit = EMAIL_SYNC_BATCH_SIZE) {
  const normalizedLimit = Math.min(Math.max(Math.trunc(limit), 1), EMAIL_SYNC_BATCH_SIZE);
  const upperUid = Math.max(0, Math.trunc((beforeUid ?? uidNext) - 1));
  if (!upperUid) return { range: null, mayHaveOlderMessages: false };
  const lowerUid = Math.max(1, upperUid - normalizedLimit + 1);
  return { range: `${lowerUid}:${upperUid}`, mayHaveOlderMessages: lowerUid > 1 };
}

/** Converts opaque IMAP command failures into a clear, actionable message for the mailbox owner. */
export function getMailboxSyncErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown mailbox synchronization error";
  if (/^command failed$/i.test(message.trim())) {
    return "Máy chủ IMAP không thể xử lý lô đồng bộ này. Vui lòng thử lại; nếu lỗi lặp lại, hãy kiểm tra kết nối IMAP SSL và Mật khẩu ứng dụng.";
  }
  return message;
}

function cleanSnippet(raw: Buffer | string | undefined) {
  if (!raw) return null;
  const content = Buffer.isBuffer(raw) ? raw.toString("utf8") : raw;
  const body = content.split(/\r?\n\r?\n/).slice(1).join("\n\n");
  return body.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 4_000) || null;
}

async function refreshMicrosoftAccessToken(refreshToken: string) {
  if (!ENV.microsoftOAuthClientId || !ENV.microsoftOAuthClientSecret) throw new Error("Outlook OAuth configuration is incomplete");
  const body = new URLSearchParams({
    client_id: ENV.microsoftOAuthClientId,
    client_secret: ENV.microsoftOAuthClientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
    scope: "offline_access https://outlook.office.com/IMAP.AccessAsUser.All https://graph.microsoft.com/User.Read",
  });
  const response = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
  if (!response.ok) throw new Error(`Outlook token refresh failed (${response.status})`);
  return response.json() as Promise<TokenPayload>;
}

async function getImapAuth(userId: number, accountId: number) {
  const account = await db.getEmailAccountWithCredentials(userId, accountId);
  if (!account?.imapHost || !account.imapPort || !account.imapUsername) throw new Error("Mailbox IMAP configuration is incomplete");

  if (account.authMethod === "app_password") {
    if (!account.imapPasswordCiphertext) throw new Error("Mailbox app password is missing");
    return { account, auth: { user: account.imapUsername, pass: decryptEmailToken(account.imapPasswordCiphertext) } };
  }

  if (account.provider !== "microsoft" || !account.accessTokenCiphertext) throw new Error("Mailbox OAuth2 configuration is incomplete");
  let accessToken = decryptEmailToken(account.accessTokenCiphertext);
  if (account.tokenExpiresAt && account.tokenExpiresAt.getTime() < Date.now() + 60_000) {
    if (!account.refreshTokenCiphertext) throw new Error("Mailbox needs to be reconnected");
    const refreshed = await refreshMicrosoftAccessToken(decryptEmailToken(account.refreshTokenCiphertext));
    accessToken = refreshed.access_token;
    await db.updateEmailAccountTokens(userId, accountId, {
      accessTokenCiphertext: encryptEmailToken(accessToken),
      refreshTokenCiphertext: refreshed.refresh_token ? encryptEmailToken(refreshed.refresh_token) : account.refreshTokenCiphertext,
      tokenExpiresAt: refreshed.expires_in ? new Date(Date.now() + refreshed.expires_in * 1000) : null,
    });
  }
  return { account, auth: { user: account.imapUsername, accessToken } };
}

async function fetchImapInbox(account: Awaited<ReturnType<typeof db.getEmailAccountWithCredentials>>, auth: { user: string; pass?: string; accessToken?: string }, options?: { beforeUid?: number; limit?: number }): Promise<MailboxPage> {
  if (!account?.imapHost || !account.imapPort) throw new Error("Mailbox IMAP configuration is incomplete");
  const webmailTarget = account.provider === "webmail" ? await resolvePublicWebmailImapHost(account.imapHost) : null;
  const client = new ImapFlow({
    host: webmailTarget?.address ?? account.imapHost,
    port: account.imapPort,
    secure: account.imapSecure,
    auth,
    tls: { servername: webmailTarget?.hostname ?? account.imapHost },
    connectionTimeout: IMAP_CONNECTION_TIMEOUT_MS,
    greetingTimeout: IMAP_CONNECTION_TIMEOUT_MS,
    socketTimeout: IMAP_SOCKET_TIMEOUT_MS,
    logger: false,
  });
  await client.connect();
  let lock: Awaited<ReturnType<ImapFlow["getMailboxLock"]>> | undefined;
  try {
    lock = await client.getMailboxLock(account.imapMailbox || "INBOX");
    const mailbox = client.mailbox && typeof client.mailbox === "object" ? client.mailbox : null;
    if (!mailbox?.exists) return { messages: [], hasMore: false, nextBeforeUid: null, mailboxTotal: 0 };
    const page = getImapFetchWindow(mailbox.uidNext, options?.beforeUid, options?.limit);
    if (!page.range) return { messages: [], hasMore: false, nextBeforeUid: null, mailboxTotal: mailbox.exists };
    const uidValidity = mailbox?.uidValidity || 0;
    const messages: MailboxMessage[] = [];
    for await (const message of client.fetch(page.range, { envelope: true, flags: true, internalDate: true }, { uid: true })) {
      const from = message.envelope?.from?.[0];
      messages.push({
        providerMessageId: `${uidValidity || 0}:${message.uid}`,
        threadId: message.envelope?.messageId ?? null,
        subject: message.envelope?.subject || "(Không có tiêu đề)",
        senderName: from?.name || null,
        senderEmail: from?.address || null,
        snippet: cleanSnippet(message.source),
        receivedAt: message.internalDate instanceof Date ? message.internalDate : new Date(message.internalDate || Date.now()),
        isRead: Boolean(message.flags?.has("\\Seen")),
        labels: Array.from(message.flags || []).join(",") || null,
        webLink: null,
      });
    }
    messages.sort((left, right) => (getImapUidFromProviderMessageId(right.providerMessageId) ?? 0) - (getImapUidFromProviderMessageId(left.providerMessageId) ?? 0));
    const pageMessages = messages.slice(0, options?.limit ?? EMAIL_SYNC_BATCH_SIZE);
    const oldestPageUid = pageMessages.at(-1) ? getImapUidFromProviderMessageId(pageMessages.at(-1)!.providerMessageId) : null;
    const hasMore = messages.length > pageMessages.length || page.mayHaveOlderMessages;
    return { messages: pageMessages, hasMore, nextBeforeUid: hasMore ? oldestPageUid : null, mailboxTotal: mailbox.exists };
  } finally {
    lock?.release();
    await client.logout().catch(() => client.close());
  }
}

export async function verifyImapConnection(input: { host: string; port: number; secure: boolean; user: string; pass: string; mailbox?: string; tlsServername?: string }) {
  const client = new ImapFlow({
    host: input.host,
    port: input.port,
    secure: input.secure,
    auth: { user: input.user, pass: input.pass },
    tls: { servername: input.tlsServername ?? input.host },
    connectionTimeout: IMAP_CONNECTION_TIMEOUT_MS,
    greetingTimeout: IMAP_CONNECTION_TIMEOUT_MS,
    socketTimeout: IMAP_SOCKET_TIMEOUT_MS,
    logger: false,
  });
  await client.connect();
  try {
    const lock = await client.getMailboxLock(input.mailbox || "INBOX");
    lock.release();
  } finally {
    await client.logout().catch(() => client.close());
  }
}

export async function verifyWebmailImapConnection(input: { host: string; port: number; user: string; pass: string; mailbox?: string }) {
  const target = await resolvePublicWebmailImapHost(input.host);
  return verifyImapConnection({ host: target.address, tlsServername: target.hostname, port: input.port, secure: true, user: input.user, pass: input.pass, mailbox: input.mailbox });
}

export async function syncMailbox(userId: number, accountId: number) {
  try {
    const { account, auth } = await getImapAuth(userId, accountId);
    const page = await fetchImapInbox(account, auth, { limit: EMAIL_SYNC_BATCH_SIZE });
    const existing = await db.listEmailMessagesByProviderIds(userId, account.id, page.messages.map(message => message.providerMessageId));
    const existingIds = new Set(existing.map(message => message.providerMessageId));
    const newCount = page.messages.filter(message => !existingIds.has(message.providerMessageId)).length;
    await db.upsertEmailMessages(userId, account.id, page.messages);
    const syncedTotal = await db.countEmailMessages(userId, account.id);
    await db.setEmailAccountSyncState(userId, account.id, "connected", null, { fetchedCount: page.messages.length, newCount, mailboxCount: page.mailboxTotal });
    return { count: page.messages.length, newCount, mailboxTotal: page.mailboxTotal, syncedTotal };
  } catch (error) {
    console.error("[Email sync] IMAP synchronization failed", {
      accountId,
      message: error instanceof Error ? error.message : String(error),
    });
    const message = getMailboxSyncErrorMessage(error);
    const needsReconnect = /auth|login|token|reconnect|authentication/i.test(message);
    await db.setEmailAccountSyncState(userId, accountId, needsReconnect ? "needs_reconnect" : "error", message);
    throw new Error(message);
  }
}

/** Fetches one older, account-scoped IMAP UID page without changing the newest-message sync policy. */
export async function fetchOlderMailboxMessages(userId: number, accountId: number, beforeUid: number) {
  try {
    const { account, auth } = await getImapAuth(userId, accountId);
    const page = await fetchImapInbox(account, auth, { beforeUid, limit: EMAIL_SYNC_BATCH_SIZE });
    const existing = await db.listEmailMessagesByProviderIds(userId, account.id, page.messages.map(message => message.providerMessageId));
    const existingIds = new Set(existing.map(message => message.providerMessageId));
    const newCount = page.messages.filter(message => !existingIds.has(message.providerMessageId)).length;
    await db.upsertEmailMessages(userId, account.id, page.messages);
    await db.setEmailAccountSyncState(userId, account.id, "connected", null, { fetchedCount: page.messages.length, newCount, mailboxCount: page.mailboxTotal });
    const messages = await db.listEmailMessagesByProviderIds(userId, account.id, page.messages.map(message => message.providerMessageId));
    return { count: page.messages.length, newCount, mailboxTotal: page.mailboxTotal, messages, hasMore: page.hasMore, nextBeforeUid: page.nextBeforeUid, total: await db.countEmailMessages(userId, account.id) };
  } catch (error) {
    console.error("[Email sync] IMAP older-message fetch failed", {
      accountId,
      message: error instanceof Error ? error.message : String(error),
    });
    const message = getMailboxSyncErrorMessage(error);
    const needsReconnect = /auth|login|token|reconnect|authentication/i.test(message);
    await db.setEmailAccountSyncState(userId, accountId, needsReconnect ? "needs_reconnect" : "error", message);
    throw new Error(message);
  }
}

/** Loads a single message on demand, parses its MIME body, and never persists the content locally. */
export async function fetchOriginalMailboxMessage(userId: number, messageId: number) {
  const source = await db.getEmailMessageForOriginalContent(userId, messageId);
  if (!source) throw new Error("Chỉ có thể xem email đã kết nối của bạn.");
  const uid = getImapUidFromProviderMessageId(source.providerMessageId);
  if (!uid) throw new Error("Không thể xác định thư gốc trên máy chủ IMAP.");

  try {
    const { account, auth } = await getImapAuth(userId, source.emailAccountId);
    if (!account?.imapHost || !account.imapPort) throw new Error("Mailbox IMAP configuration is incomplete");
    const webmailTarget = account.provider === "webmail" ? await resolvePublicWebmailImapHost(account.imapHost) : null;
    const client = new ImapFlow({ host: webmailTarget?.address ?? account.imapHost, port: account.imapPort, secure: account.imapSecure, auth, tls: { servername: webmailTarget?.hostname ?? account.imapHost }, connectionTimeout: IMAP_CONNECTION_TIMEOUT_MS, greetingTimeout: IMAP_CONNECTION_TIMEOUT_MS, socketTimeout: IMAP_SOCKET_TIMEOUT_MS, logger: false });
    await client.connect();
    let lock: Awaited<ReturnType<ImapFlow["getMailboxLock"]>> | undefined;
    try {
      lock = await client.getMailboxLock(account.imapMailbox || "INBOX");
      const download = await client.download(String(uid), undefined, { uid: true, maxBytes: ORIGINAL_EMAIL_MAX_BYTES });
      const chunks: Buffer[] = [];
      for await (const chunk of download.content) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      const raw = Buffer.concat(chunks);
      const parsed = await simpleParser(raw);
      const html = typeof parsed.html === "string" ? parsed.html : parsed.html?.toString() || null;
      const text = parsed.text?.trim() || null;
      return { subject: parsed.subject || source.subject, sender: parsed.from?.text || source.senderName || source.senderEmail || null, receivedAt: source.receivedAt, html, text, truncated: download.meta.expectedSize > raw.length, maxBytes: ORIGINAL_EMAIL_MAX_BYTES };
    } finally {
      lock?.release();
      await client.logout().catch(() => client.close());
    }
  } catch (error) {
    console.error("[Email original] IMAP original-message fetch failed", { messageId, message: error instanceof Error ? error.message : String(error) });
    throw new Error(getMailboxSyncErrorMessage(error));
  }
}

/** Loads a selected email body and Gemini-readable attachments on demand without persisting MIME content. */
export async function fetchMailboxMessageForGeminiSummary(userId: number, messageId: number, options?: { spreadsheetSelections?: SpreadsheetSheetSelection[]; includeTabularText?: boolean }) {
  const source = await db.getEmailMessageForOriginalContent(userId, messageId);
  if (!source) throw new Error("Chỉ có thể tóm tắt email đã kết nối của bạn.");
  const uid = getImapUidFromProviderMessageId(source.providerMessageId);
  if (!uid) throw new Error("Không thể xác định thư gốc trên máy chủ IMAP.");

  try {
    const { account, auth } = await getImapAuth(userId, source.emailAccountId);
    if (!account?.imapHost || !account.imapPort) throw new Error("Mailbox IMAP configuration is incomplete");
    const webmailTarget = account.provider === "webmail" ? await resolvePublicWebmailImapHost(account.imapHost) : null;
    const client = new ImapFlow({ host: webmailTarget?.address ?? account.imapHost, port: account.imapPort, secure: account.imapSecure, auth, tls: { servername: webmailTarget?.hostname ?? account.imapHost }, connectionTimeout: IMAP_CONNECTION_TIMEOUT_MS, greetingTimeout: IMAP_CONNECTION_TIMEOUT_MS, socketTimeout: IMAP_SOCKET_TIMEOUT_MS, logger: false });
    await client.connect();
    let lock: Awaited<ReturnType<ImapFlow["getMailboxLock"]>> | undefined;
    try {
      lock = await client.getMailboxLock(account.imapMailbox || "INBOX");
      const download = await client.download(String(uid), undefined, { uid: true, maxBytes: ORIGINAL_EMAIL_MAX_BYTES });
      const chunks: Buffer[] = [];
      for await (const chunk of download.content) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      const raw = Buffer.concat(chunks);
      const parsed = await simpleParser(raw);
      const tableTextFromEmail = extractHtmlTablesForGemini(typeof parsed.html === "string" ? parsed.html : null);
      const emailText = parsed.text?.replace(/\u0000/g, "").trim() || null;
      const attachments = parsed.attachments.map((attachment, index) => {
        const contentType = attachment.contentType?.toLowerCase() || "application/octet-stream";
        const filename = attachment.filename || `attachment-${index + 1}`;
        const spreadsheet = isTabularAttachment(filename, contentType) ? inspectTabularAttachmentForGemini({ filename, contentType, content: attachment.content }) : null;
        const selectedSheetNames = options?.spreadsheetSelections?.find(selection => selection.attachmentIndex === index)?.sheetNames;
        const tableText = spreadsheet && options?.includeTabularText !== false ? extractTabularAttachmentForGemini({ filename, contentType, content: attachment.content, selectedSheetNames }) : null;
        return {
          filename,
          contentType,
          size: attachment.size,
          content: tableText ? null : GEMINI_SUPPORTED_ATTACHMENT_TYPES.has(contentType) ? attachment.content : null,
          tableText,
          spreadsheet: spreadsheet ? { attachmentIndex: index, filename, ...spreadsheet } satisfies GeminiSpreadsheetAttachmentPreview : null,
        };
      });
      return {
        text: [emailText, tableTextFromEmail].filter(Boolean).join("\n\n") || null,
        truncated: download.meta.expectedSize > raw.length,
        attachments,
        spreadsheets: attachments.flatMap(attachment => attachment.spreadsheet ? [attachment.spreadsheet] : []),
      };
    } finally {
      lock?.release();
      await client.logout().catch(() => client.close());
    }
  } catch (error) {
    console.error("[Email Gemini] IMAP source fetch failed", { messageId, message: error instanceof Error ? error.message : String(error) });
    throw new Error(getMailboxSyncErrorMessage(error));
  }
}

/** Loads only bounded sheet metadata so the user can choose Excel sheets before Gemini receives table data. */
export async function inspectMailboxSpreadsheetsForGemini(userId: number, messageId: number) {
  const message = await fetchMailboxMessageForGeminiSummary(userId, messageId, { includeTabularText: false });
  return message.spreadsheets;
}

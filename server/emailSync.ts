import { ImapFlow } from "imapflow";
import { ENV } from "./_core/env";
import { decryptEmailToken, encryptEmailToken } from "./emailOAuth";
import * as db from "./db";
import { resolvePublicWebmailImapHost } from "./webmailImap";

type TokenPayload = { access_token: string; refresh_token?: string; expires_in?: number };
type MailboxMessage = { providerMessageId: string; threadId?: string | null; subject: string; senderName?: string | null; senderEmail?: string | null; snippet?: string | null; receivedAt: Date; isRead: boolean; labels?: string | null; webLink?: string | null };
type MailboxPage = { messages: MailboxMessage[]; hasMore: boolean; nextBeforeUid: number | null };

export const EMAIL_SYNC_BATCH_SIZE = 100;
const IMAP_FETCH_WINDOW_MULTIPLIER = 4;

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
  const windowSize = normalizedLimit * IMAP_FETCH_WINDOW_MULTIPLIER;
  const lowerUid = Math.max(1, upperUid - windowSize + 1);
  return { range: `${lowerUid}:${upperUid}`, mayHaveOlderMessages: lowerUid > 1 };
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
  const client = new ImapFlow({ host: webmailTarget?.address ?? account.imapHost, port: account.imapPort, secure: account.imapSecure, auth, tls: { servername: webmailTarget?.hostname ?? account.imapHost }, logger: false });
  await client.connect();
  let lock: Awaited<ReturnType<ImapFlow["getMailboxLock"]>> | undefined;
  try {
    lock = await client.getMailboxLock(account.imapMailbox || "INBOX");
    const mailbox = client.mailbox && typeof client.mailbox === "object" ? client.mailbox : null;
    if (!mailbox?.exists) return { messages: [], hasMore: false, nextBeforeUid: null };
    const page = getImapFetchWindow(mailbox.uidNext, options?.beforeUid, options?.limit);
    if (!page.range) return { messages: [], hasMore: false, nextBeforeUid: null };
    const uidValidity = mailbox?.uidValidity || 0;
    const messages: MailboxMessage[] = [];
    for await (const message of client.fetch(page.range, { uid: true, envelope: true, flags: true, internalDate: true, source: true })) {
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
    return { messages: pageMessages, hasMore, nextBeforeUid: hasMore ? oldestPageUid : null };
  } finally {
    lock?.release();
    await client.logout().catch(() => client.close());
  }
}

export async function verifyImapConnection(input: { host: string; port: number; secure: boolean; user: string; pass: string; mailbox?: string; tlsServername?: string }) {
  const client = new ImapFlow({ host: input.host, port: input.port, secure: input.secure, auth: { user: input.user, pass: input.pass }, tls: { servername: input.tlsServername ?? input.host }, logger: false });
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
    await db.upsertEmailMessages(userId, account.id, page.messages);
    await db.setEmailAccountSyncState(userId, account.id, "connected");
    return { count: page.messages.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown mailbox synchronization error";
    const needsReconnect = /auth|login|token|reconnect|authentication/i.test(message);
    await db.setEmailAccountSyncState(userId, accountId, needsReconnect ? "needs_reconnect" : "error", message);
    throw error;
  }
}

/** Fetches one older, account-scoped IMAP UID page without changing the newest-message sync policy. */
export async function fetchOlderMailboxMessages(userId: number, accountId: number, beforeUid: number) {
  try {
    const { account, auth } = await getImapAuth(userId, accountId);
    const page = await fetchImapInbox(account, auth, { beforeUid, limit: EMAIL_SYNC_BATCH_SIZE });
    await db.upsertEmailMessages(userId, account.id, page.messages);
    await db.setEmailAccountSyncState(userId, account.id, "connected");
    const messages = await db.listEmailMessagesByProviderIds(userId, account.id, page.messages.map(message => message.providerMessageId));
    return { count: page.messages.length, messages, hasMore: page.hasMore, nextBeforeUid: page.nextBeforeUid, total: await db.countEmailMessages(userId, account.id) };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown older mailbox synchronization error";
    const needsReconnect = /auth|login|token|reconnect|authentication/i.test(message);
    await db.setEmailAccountSyncState(userId, accountId, needsReconnect ? "needs_reconnect" : "error", message);
    throw error;
  }
}

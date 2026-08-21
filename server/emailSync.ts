import { ImapFlow } from "imapflow";
import { ENV } from "./_core/env";
import { decryptEmailToken, encryptEmailToken } from "./emailOAuth";
import * as db from "./db";

type TokenPayload = { access_token: string; refresh_token?: string; expires_in?: number };
type MailboxMessage = { providerMessageId: string; threadId?: string | null; subject: string; senderName?: string | null; senderEmail?: string | null; snippet?: string | null; receivedAt: Date; isRead: boolean; labels?: string | null; webLink?: string | null };

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

async function fetchImapInbox(account: Awaited<ReturnType<typeof db.getEmailAccountWithCredentials>>, auth: { user: string; pass?: string; accessToken?: string }): Promise<MailboxMessage[]> {
  if (!account?.imapHost || !account.imapPort) throw new Error("Mailbox IMAP configuration is incomplete");
  const client = new ImapFlow({ host: account.imapHost, port: account.imapPort, secure: account.imapSecure, auth, tls: { servername: account.imapHost }, logger: false });
  await client.connect();
  let lock: Awaited<ReturnType<ImapFlow["getMailboxLock"]>> | undefined;
  try {
    lock = await client.getMailboxLock(account.imapMailbox || "INBOX");
    const mailbox = client.mailbox && typeof client.mailbox === "object" ? client.mailbox : null;
    const total = mailbox?.exists || 0;
    if (!total) return [];
    const range = `${Math.max(1, total - 49)}:*`;
    const uidValidity = mailbox?.uidValidity || 0;
    const messages: MailboxMessage[] = [];
    for await (const message of client.fetch(range, { uid: true, envelope: true, flags: true, internalDate: true, source: true })) {
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
    return messages;
  } finally {
    lock?.release();
    await client.logout().catch(() => client.close());
  }
}

export async function verifyImapConnection(input: { host: string; port: number; secure: boolean; user: string; pass: string; mailbox?: string }) {
  const client = new ImapFlow({ host: input.host, port: input.port, secure: input.secure, auth: { user: input.user, pass: input.pass }, tls: { servername: input.host }, logger: false });
  await client.connect();
  try {
    const lock = await client.getMailboxLock(input.mailbox || "INBOX");
    lock.release();
  } finally {
    await client.logout().catch(() => client.close());
  }
}

export async function syncMailbox(userId: number, accountId: number) {
  try {
    const { account, auth } = await getImapAuth(userId, accountId);
    const messages = await fetchImapInbox(account, auth);
    await db.upsertEmailMessages(userId, account.id, messages);
    await db.setEmailAccountSyncState(userId, account.id, "connected");
    return { count: messages.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown mailbox synchronization error";
    const needsReconnect = /auth|login|token|reconnect|authentication/i.test(message);
    await db.setEmailAccountSyncState(userId, accountId, needsReconnect ? "needs_reconnect" : "error", message);
    throw error;
  }
}

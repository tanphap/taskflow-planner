import { ENV } from "./_core/env";
import { decryptEmailToken, encryptEmailToken } from "./emailOAuth";
import * as db from "./db";

type TokenPayload = { access_token: string; refresh_token?: string; expires_in?: number };
type MailboxMessage = { providerMessageId: string; threadId?: string | null; subject: string; senderName?: string | null; senderEmail?: string | null; snippet?: string | null; receivedAt: Date; isRead: boolean; labels?: string | null; webLink?: string | null };

function providerCredentials(provider: db.EmailProvider) {
  return provider === "google"
    ? { endpoint: "https://oauth2.googleapis.com/token", clientId: ENV.googleOAuthClientId, clientSecret: ENV.googleOAuthClientSecret }
    : { endpoint: "https://login.microsoftonline.com/common/oauth2/v2.0/token", clientId: ENV.microsoftOAuthClientId, clientSecret: ENV.microsoftOAuthClientSecret };
}

async function refreshAccessToken(provider: db.EmailProvider, refreshToken: string) {
  const credentials = providerCredentials(provider);
  if (!credentials.clientId || !credentials.clientSecret) throw new Error("OAuth provider configuration is incomplete");
  const body = new URLSearchParams({ client_id: credentials.clientId, client_secret: credentials.clientSecret, refresh_token: refreshToken, grant_type: "refresh_token" });
  if (provider === "microsoft") body.set("scope", "offline_access https://graph.microsoft.com/User.Read https://graph.microsoft.com/Mail.Read");
  const response = await fetch(credentials.endpoint, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
  if (!response.ok) throw new Error(`Token refresh failed (${response.status})`);
  return response.json() as Promise<TokenPayload>;
}

async function getValidToken(userId: number, accountId: number) {
  const account = await db.getEmailAccountWithTokens(userId, accountId);
  if (!account) throw new Error("Mailbox not found");
  let accessToken = decryptEmailToken(account.accessTokenCiphertext);
  const mustRefresh = Boolean(account.tokenExpiresAt && account.tokenExpiresAt.getTime() < Date.now() + 60_000);
  if (mustRefresh) {
    if (!account.refreshTokenCiphertext) throw new Error("Mailbox needs to be reconnected");
    const refreshed = await refreshAccessToken(account.provider, decryptEmailToken(account.refreshTokenCiphertext));
    accessToken = refreshed.access_token;
    await db.updateEmailAccountTokens(userId, accountId, { accessTokenCiphertext: encryptEmailToken(accessToken), refreshTokenCiphertext: refreshed.refresh_token ? encryptEmailToken(refreshed.refresh_token) : account.refreshTokenCiphertext, tokenExpiresAt: refreshed.expires_in ? new Date(Date.now() + refreshed.expires_in * 1000) : null });
  }
  return { account, accessToken };
}

function header(headers: Array<{ name?: string; value?: string }> | undefined, name: string) {
  return headers?.find(item => item.name?.toLowerCase() === name.toLowerCase())?.value ?? null;
}

async function fetchGoogleInbox(accessToken: string): Promise<MailboxMessage[]> {
  const listResponse = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=50&labelIds=INBOX", { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!listResponse.ok) throw new Error(`Gmail inbox request failed (${listResponse.status})`);
  const list = await listResponse.json() as { messages?: Array<{ id: string; threadId?: string }> };
  const messages = await Promise.all((list.messages ?? []).map(async item => {
    const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(item.id)}?format=metadata&metadataHeaders=From&metadataHeaders=Subject`, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!response.ok) throw new Error(`Gmail message request failed (${response.status})`);
    const data = await response.json() as { id: string; threadId?: string; snippet?: string; internalDate?: string; labelIds?: string[]; payload?: { headers?: Array<{ name?: string; value?: string }> } };
    const from = header(data.payload?.headers, "From") ?? ""; const match = from.match(/^(.*?)(?:\s*<([^>]+)>)?$/); const senderName = match?.[2] ? match[1].trim().replace(/^"|"$/g, "") : null; const senderEmail = match?.[2] ?? (from.includes("@") ? from.trim() : null);
    return { providerMessageId: data.id, threadId: data.threadId ?? item.threadId ?? null, subject: header(data.payload?.headers, "Subject") ?? "(Không có tiêu đề)", senderName, senderEmail, snippet: data.snippet ?? null, receivedAt: new Date(Number(data.internalDate ?? Date.now())), isRead: !(data.labelIds ?? []).includes("UNREAD"), labels: (data.labelIds ?? []).join(","), webLink: `https://mail.google.com/mail/u/0/#all/${data.id}` };
  }));
  return messages;
}

async function fetchMicrosoftInbox(accessToken: string): Promise<MailboxMessage[]> {
  const endpoint = new URL("https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages");
  endpoint.searchParams.set("$top", "50"); endpoint.searchParams.set("$select", "id,conversationId,subject,from,receivedDateTime,isRead,bodyPreview,webLink,categories"); endpoint.searchParams.set("$orderby", "receivedDateTime DESC");
  const response = await fetch(endpoint, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!response.ok) throw new Error(`Microsoft inbox request failed (${response.status})`);
  const payload = await response.json() as { value?: Array<{ id: string; conversationId?: string; subject?: string; from?: { emailAddress?: { name?: string; address?: string } }; receivedDateTime?: string; isRead?: boolean; bodyPreview?: string; webLink?: string; categories?: string[] }> };
  return (payload.value ?? []).map(item => ({ providerMessageId: item.id, threadId: item.conversationId ?? null, subject: item.subject ?? "(Không có tiêu đề)", senderName: item.from?.emailAddress?.name ?? null, senderEmail: item.from?.emailAddress?.address ?? null, snippet: item.bodyPreview ?? null, receivedAt: new Date(item.receivedDateTime ?? Date.now()), isRead: Boolean(item.isRead), labels: (item.categories ?? []).join(","), webLink: item.webLink ?? null }));
}

export async function syncMailbox(userId: number, accountId: number) {
  try {
    const { account, accessToken } = await getValidToken(userId, accountId);
    const messages = account.provider === "google" ? await fetchGoogleInbox(accessToken) : await fetchMicrosoftInbox(accessToken);
    await db.upsertEmailMessages(userId, account.id, messages);
    await db.setEmailAccountSyncState(userId, account.id, "connected");
    return { count: messages.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown mailbox synchronization error";
    const needsReconnect = /refresh|reconnect|401|403/i.test(message);
    await db.setEmailAccountSyncState(userId, accountId, needsReconnect ? "needs_reconnect" : "error", message);
    throw error;
  }
}

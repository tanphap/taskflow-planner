import { getRequestSessionToken } from "./_core/sessionToken";
import { createHeartbeatJob, deleteHeartbeatJob, updateHeartbeatJob } from "./_core/heartbeat";
import * as db from "./db";
import { analyzeMailboxForEmailEvents } from "./emailAi";
import { syncMailbox } from "./emailSync";

export const EMAIL_AI_SYNC_INTERVALS = [15, 30, 60, 120, 240, 720, 1440] as const;
export type EmailAiSyncInterval = typeof EMAIL_AI_SYNC_INTERVALS[number];

export function cronForEmailAiSync(intervalMinutes: EmailAiSyncInterval) {
  const cron: Record<EmailAiSyncInterval, string> = {
    15: "0 */15 * * * *",
    30: "0 */30 * * * *",
    60: "0 0 * * * *",
    120: "0 0 */2 * * *",
    240: "0 0 */4 * * *",
    720: "0 0 */12 * * *",
    1440: "0 0 0 * * *",
  };
  return cron[intervalMinutes];
}

export async function configureEmailAiSync(userId: number, accountId: number, input: { enabled: boolean; intervalMinutes: EmailAiSyncInterval }, headers: { cookie?: string; authorization?: string }) {
  const account = await db.getEmailAccountWithTokens(userId, accountId);
  if (!account) throw new Error("Mailbox not found");
  const sessionToken = getRequestSessionToken(headers);
  if (!input.enabled) {
    if (account.aiSyncJobUid) await deleteHeartbeatJob(account.aiSyncJobUid, sessionToken);
    await db.updateEmailAiSyncSettings(userId, accountId, { enabled: false, intervalMinutes: input.intervalMinutes, taskUid: null });
    return { enabled: false as const };
  }
  if (account.connectionStatus !== "connected") throw new Error("Reconnect the mailbox before enabling AI synchronization");
  const cron = cronForEmailAiSync(input.intervalMinutes);
  let taskUid = account.aiSyncJobUid;
  if (taskUid) await updateHeartbeatJob(taskUid, { cron, enable: true }, sessionToken);
  else {
    const job = await createHeartbeatJob({ name: `email-ai-sync-${accountId}`, cron, path: "/api/scheduled/email-ai-sync", description: `AI email sync for mailbox #${accountId}` }, sessionToken);
    taskUid = job.taskUid;
  }
  await db.updateEmailAiSyncSettings(userId, accountId, { enabled: true, intervalMinutes: input.intervalMinutes, taskUid });
  return { enabled: true as const, taskUid };
}

export async function runScheduledEmailAiSync(taskUid: string) {
  const account = await db.getEmailAccountByAiSyncJob(taskUid);
  if (!account || !account.aiSyncEnabled) return { skipped: "orphan-or-disabled" as const };
  try {
    const sync = await syncMailbox(account.userId, account.id);
    const analysis = await analyzeMailboxForEmailEvents(account.userId, account.id);
    await db.setEmailAiSyncRunState(account.userId, account.id);
    return { accountId: account.id, ...sync, ...analysis };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await db.setEmailAiSyncRunState(account.userId, account.id, message);
    throw error;
  }
}

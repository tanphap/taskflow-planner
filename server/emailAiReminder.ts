import type { Request, Response } from "express";
import * as db from "./db";
import { isCronSecretRequest } from "./cronAuth";
import { sdk } from "./_core/sdk";
import { runScheduledEmailAiSync } from "./emailAiScheduler";
import { analyzeMailboxForEmailEvents } from "./emailAi";
import { syncMailbox } from "./emailSync";

export async function runEmailAiSyncReminder(req: Request, res: Response) {
  try {
    // Poll mode (self-hosted): sync every mailbox with AI sync enabled.
    if (isCronSecretRequest(req)) {
      const accounts = await db.listEmailAiSyncEnabledAccounts();
      const results = [];
      for (const account of accounts) {
        try {
          const sync = await syncMailbox(account.userId, account.id);
          const analysis = await analyzeMailboxForEmailEvents(account.userId, account.id);
          await db.setEmailAiSyncRunState(account.userId, account.id);
          results.push({ accountId: account.id, ok: true, ...sync, ...analysis });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          await db.setEmailAiSyncRunState(account.userId, account.id, message);
          results.push({ accountId: account.id, ok: false, error: message });
        }
      }
      return res.json({ ok: true, mode: "poll", processed: results.length, results });
    }

    // Manus Heartbeat mode: one job per mailbox.
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) return res.status(403).json({ error: "cron-only" });
    const result = await runScheduledEmailAiSync(user.taskUid);
    return res.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ error: message, timestamp: new Date().toISOString() });
  }
}

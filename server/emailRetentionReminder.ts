import type { Request, Response } from "express";
import { isCronSecretRequest } from "./cronAuth";
import { sdk } from "./_core/sdk";
import { runEmailRetentionCleanup } from "./emailRetention";

/** Project-level daily cleanup. It never touches messages on the upstream mailbox. */
export async function runEmailRetentionReminder(req: Request, res: Response) {
  try {
    // Poll mode (self-hosted): CRON_SECRET instead of Manus Heartbeat.
    if (isCronSecretRequest(req)) {
      const result = await runEmailRetentionCleanup();
      return res.json({ ok: true, mode: "poll", ...result });
    }

    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) return res.status(403).json({ error: "cron-only" });
    const result = await runEmailRetentionCleanup();
    return res.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ error: message, timestamp: new Date().toISOString() });
  }
}

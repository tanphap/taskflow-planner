import type { Request, Response } from "express";
import { sdk } from "./_core/sdk";
import { runScheduledEmailAiSync } from "./emailAiScheduler";

export async function runEmailAiSyncReminder(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) return res.status(403).json({ error: "cron-only" });
    const result = await runScheduledEmailAiSync(user.taskUid);
    return res.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ error: message, timestamp: new Date().toISOString() });
  }
}

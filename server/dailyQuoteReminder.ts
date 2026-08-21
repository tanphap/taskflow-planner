import type { Request, Response } from "express";
import { DAILY_QUOTE_SCHEDULE_KEY } from "../shared/dailyQuote";
import { sdk } from "./_core/sdk";
import * as db from "./db";
import { generateDailyAiQuote } from "./dailyQuote";

export async function runDailyQuoteReminder(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) return res.status(403).json({ error: "cron-only" });
    if (!(await db.isScheduledJobTask(DAILY_QUOTE_SCHEDULE_KEY, user.taskUid))) {
      return res.json({ ok: true, skipped: "unrecognized-job" });
    }
    const result = await generateDailyAiQuote();
    return res.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ error: message, timestamp: new Date().toISOString() });
  }
}

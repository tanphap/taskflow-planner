import type { Request, Response } from "express";
import * as db from "./db";
import { isCronSecretRequest } from "./cronAuth";
import { sdk } from "./_core/sdk";
import { sendTelegramReminder } from "./telegram";

async function deliverEvent(event: {
  id: number;
  userId: number;
  title: string;
  startAt: Date;
}): Promise<{ eventId: number; ok: boolean; skipped?: string; error?: string }> {
  const connection = await db.getTelegramConnection(event.userId);
  if (!connection?.chatId) {
    const message = "Chưa liên kết Telegram";
    await db.setTelegramEventDeliveryError(event.id, message);
    await db.logTelegramDelivery(event.userId, event.id, event.title, "error", message);
    return { eventId: event.id, ok: false, skipped: "telegram-not-linked" };
  }
  try {
    await sendTelegramReminder(connection.chatId, event.title, event.startAt);
    await db.logTelegramDelivery(event.userId, event.id, event.title, "success");
    return { eventId: event.id, ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await db.setTelegramEventDeliveryError(event.id, message);
    await db.logTelegramDelivery(event.userId, event.id, event.title, "error", message);
    return { eventId: event.id, ok: false, error: message };
  }
}

export async function sendTelegramEventReminder(req: Request, res: Response) {
  try {
    // Poll mode (self-hosted, no Manus Heartbeat): GitHub Actions calls this
    // endpoint every few minutes with CRON_SECRET; we claim and deliver ALL
    // due events in one run.
    if (isCronSecretRequest(req)) {
      const events = await db.claimDueTelegramEvents(new Date());
      const results = [];
      for (const event of events) results.push(await deliverEvent(event));
      return res.json({ ok: true, mode: "poll", processed: results.length, results });
    }

    // Manus Heartbeat mode: one job per event, callback carries the taskUid.
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) return res.status(403).json({ error: "cron-only" });

    const event = await db.claimTelegramEventByTaskUid(user.taskUid);
    if (!event) return res.json({ ok: true, skipped: "already-sent-or-orphan" });
    const result = await deliverEvent(event);
    if (!result.ok && !result.skipped) return res.status(500).json({ error: result.error, eventId: event.id, timestamp: new Date().toISOString() });
    return res.json({ ok: result.ok, eventId: event.id, skipped: result.skipped });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ error: message, timestamp: new Date().toISOString() });
  }
}

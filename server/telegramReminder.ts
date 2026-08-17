import type { Request, Response } from "express";
import * as db from "./db";
import { sdk } from "./_core/sdk";
import { sendTelegramReminder } from "./telegram";

export async function sendTelegramEventReminder(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) return res.status(403).json({ error: "cron-only" });

    const event = await db.claimTelegramEventByTaskUid(user.taskUid);
    if (!event) return res.json({ ok: true, skipped: "already-sent-or-orphan" });
    const connection = await db.getTelegramConnection(event.userId);
    if (!connection?.chatId) {
      const message = "Chưa liên kết Telegram";
      await db.setTelegramEventDeliveryError(event.id, message);
      await db.logTelegramDelivery(event.userId, event.id, event.title, "error", message);
      return res.json({ ok: false, skipped: "telegram-not-linked" });
    }

    try {
      await sendTelegramReminder(connection.chatId, event.title, event.startAt);
      await db.logTelegramDelivery(event.userId, event.id, event.title, "success");
      return res.json({ ok: true, eventId: event.id });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await db.setTelegramEventDeliveryError(event.id, message);
      await db.logTelegramDelivery(event.userId, event.id, event.title, "error", message);
      return res.status(500).json({ error: message, eventId: event.id, timestamp: new Date().toISOString() });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ error: message, timestamp: new Date().toISOString() });
  }
}

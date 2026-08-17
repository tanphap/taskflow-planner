import { ENV } from "./_core/env";

type TelegramUpdate = {
  message?: {
    text?: string;
    chat?: { id?: number; type?: string };
  };
};

type TelegramResponse<T> = { ok: boolean; result?: T };

function botEndpoint(method: string) {
  if (!ENV.telegramBotToken) throw new Error("Telegram Bot chưa được cấu hình");
  return `https://api.telegram.org/bot${ENV.telegramBotToken}/${method}`;
}

export async function findPrivateChatForLinkCode(code: string): Promise<string | null> {
  const response = await fetch(botEndpoint("getUpdates"));
  if (!response.ok) throw new Error("Không thể đọc cập nhật từ Telegram Bot");
  const payload = (await response.json()) as TelegramResponse<TelegramUpdate[]>;
  const matchingUpdate = payload.result?.find(update =>
    update.message?.chat?.type === "private" && update.message.text?.trim() === code
  );
  const chatId = matchingUpdate?.message?.chat?.id;
  return chatId === undefined ? null : String(chatId);
}

export async function sendTelegramReminder(chatId: string, title: string, startAt: Date) {
  const time = new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(startAt);
  const response = await fetch(botEndpoint("sendMessage"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: `TASKFLOW — NHẮC LỊCH HẸN\n${title}\nBắt đầu: ${time}`,
    }),
  });
  if (!response.ok) throw new Error("Telegram không thể gửi lời nhắc");
}

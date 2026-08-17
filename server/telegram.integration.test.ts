import { describe, expect, it } from "vitest";

describe("Telegram Bot credentials", () => {
  it("xác thực mã Bot bằng API getMe", async () => {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    expect(token, "TELEGRAM_BOT_TOKEN phải được cấu hình").toBeTruthy();

    const response = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    expect(response.ok, "Telegram không chấp nhận mã Bot").toBe(true);

    const payload = (await response.json()) as { ok?: boolean; result?: { is_bot?: boolean } };
    expect(payload.ok).toBe(true);
    expect(payload.result?.is_bot).toBe(true);
  }, 15_000);
});

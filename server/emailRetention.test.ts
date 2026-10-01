import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({ deleteEmailDataOlderThan: vi.fn() }));

import * as db from "./db";
import { emailRetentionCutoff, runEmailRetentionCleanup } from "./emailRetention";

describe("email retention", () => {
  beforeEach(() => vi.clearAllMocks());

  it("uses a 30-day cutoff", () => {
    const now = new Date("2026-10-01T00:00:00.000Z");
    expect(emailRetentionCutoff(now).toISOString()).toBe("2026-09-01T00:00:00.000Z");
  });

  it("deletes only local email data and returns cleanup counts", async () => {
    vi.mocked(db.deleteEmailDataOlderThan).mockResolvedValue({ messages: 4, summaries: 2, suggestions: 1 });
    const now = new Date("2026-10-01T00:00:00.000Z");
    await expect(runEmailRetentionCleanup(now)).resolves.toMatchObject({ messages: 4, summaries: 2, suggestions: 1 });
    expect(db.deleteEmailDataOlderThan).toHaveBeenCalledWith(new Date("2026-09-01T00:00:00.000Z"));
  });
});

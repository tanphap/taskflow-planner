import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({ getEmailAccountByAiSyncJob: vi.fn(), setEmailAiSyncRunState: vi.fn() }));
vi.mock("./emailSync", () => ({ syncMailbox: vi.fn() }));
vi.mock("./emailAi", () => ({ analyzeMailboxForEmailEvents: vi.fn() }));
vi.mock("./_core/heartbeat", () => ({ createHeartbeatJob: vi.fn(), deleteHeartbeatJob: vi.fn(), updateHeartbeatJob: vi.fn() }));

import * as db from "./db";
import { analyzeMailboxForEmailEvents } from "./emailAi";
import { runScheduledEmailAiSync } from "./emailAiScheduler";
import { syncMailbox } from "./emailSync";

describe("scheduled AI email synchronization", () => {
  beforeEach(() => vi.clearAllMocks());

  it("skips a disabled or deleted schedule without reading any mailbox", async () => {
    vi.mocked(db.getEmailAccountByAiSyncJob).mockResolvedValue(null);

    await expect(runScheduledEmailAiSync("task-missing")).resolves.toEqual({ skipped: "orphan-or-disabled" });
    expect(syncMailbox).not.toHaveBeenCalled();
    expect(analyzeMailboxForEmailEvents).not.toHaveBeenCalled();
  });

  it("syncs and analyzes only the mailbox associated with the Heartbeat task", async () => {
    vi.mocked(db.getEmailAccountByAiSyncJob).mockResolvedValue({ id: 18, userId: 73, aiSyncEnabled: true } as never);
    vi.mocked(syncMailbox).mockResolvedValue({ synced: 6, received: 2 } as never);
    vi.mocked(analyzeMailboxForEmailEvents).mockResolvedValue({ analyzed: 2, suggested: 1, failed: 0 });
    vi.mocked(db.setEmailAiSyncRunState).mockResolvedValue(undefined);

    await expect(runScheduledEmailAiSync("task-18")).resolves.toMatchObject({ accountId: 18, synced: 6, analyzed: 2, suggested: 1 });
    expect(syncMailbox).toHaveBeenCalledWith(73, 18);
    expect(analyzeMailboxForEmailEvents).toHaveBeenCalledWith(73, 18);
    expect(db.setEmailAiSyncRunState).toHaveBeenCalledWith(73, 18);
  });

  it("records a safe run error when mailbox synchronization fails", async () => {
    vi.mocked(db.getEmailAccountByAiSyncJob).mockResolvedValue({ id: 18, userId: 73, aiSyncEnabled: true } as never);
    vi.mocked(syncMailbox).mockRejectedValue(new Error("token refresh failed"));
    vi.mocked(db.setEmailAiSyncRunState).mockResolvedValue(undefined);

    await expect(runScheduledEmailAiSync("task-18")).rejects.toThrow("token refresh failed");
    expect(analyzeMailboxForEmailEvents).not.toHaveBeenCalled();
    expect(db.setEmailAiSyncRunState).toHaveBeenCalledWith(73, 18, "token refresh failed");
  });
});

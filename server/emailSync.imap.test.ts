import { beforeEach, describe, expect, it, vi } from "vitest";

const imapMocks = vi.hoisted(() => ({
  ImapFlow: vi.fn(),
  connect: vi.fn(),
  getMailboxLock: vi.fn(),
  logout: vi.fn(),
  close: vi.fn(),
  release: vi.fn(),
}));

vi.mock("imapflow", () => ({ ImapFlow: imapMocks.ImapFlow }));
vi.mock("./db", () => ({}));
vi.mock("./emailOAuth", () => ({ decryptEmailToken: vi.fn(), encryptEmailToken: vi.fn() }));
vi.mock("./webmailImap", () => ({ resolvePublicWebmailImapHost: vi.fn().mockResolvedValue({ hostname: "email.vnpt.vn", address: "203.0.113.44" }) }));

import { EMAIL_SYNC_BATCH_SIZE, getImapFetchWindow, getImapUidFromProviderMessageId, verifyImapConnection, verifyWebmailImapConnection } from "./emailSync";

describe("IMAP connection verification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    imapMocks.connect.mockResolvedValue(undefined);
    imapMocks.getMailboxLock.mockResolvedValue({ release: imapMocks.release });
    imapMocks.logout.mockResolvedValue(undefined);
    imapMocks.ImapFlow.mockImplementation(() => ({
      connect: imapMocks.connect,
      getMailboxLock: imapMocks.getMailboxLock,
      logout: imapMocks.logout,
      close: imapMocks.close,
    }));
  });

  it("uses TLS, verifies the configured mailbox, and never retains the supplied app password", async () => {
    await verifyImapConnection({ host: "imap.gmail.com", port: 993, secure: true, user: "owner@example.com", pass: "app-password", mailbox: "INBOX" });

    expect(imapMocks.ImapFlow).toHaveBeenCalledWith(expect.objectContaining({
      host: "imap.gmail.com",
      port: 993,
      secure: true,
      tls: { servername: "imap.gmail.com" },
      auth: { user: "owner@example.com", pass: "app-password" },
    }));
    expect(imapMocks.getMailboxLock).toHaveBeenCalledWith("INBOX");
    expect(imapMocks.release).toHaveBeenCalledOnce();
    expect(imapMocks.logout).toHaveBeenCalledOnce();
  });

  it("resolves Webmail to a validated public address while preserving the hostname for TLS", async () => {
    await verifyWebmailImapConnection({ host: "email.vnpt.vn", port: 993, user: "owner@vnpt.vn", pass: "mail-password", mailbox: "INBOX" });

    expect(imapMocks.ImapFlow).toHaveBeenCalledWith(expect.objectContaining({
      host: "203.0.113.44",
      port: 993,
      secure: true,
      tls: { servername: "email.vnpt.vn" },
      auth: { user: "owner@vnpt.vn", pass: "mail-password" },
    }));
  });
});

describe("IMAP inbox pagination", () => {
  it("builds a bounded UID window and keeps only batches of 100 messages", () => {
    expect(EMAIL_SYNC_BATCH_SIZE).toBe(100);
    expect(getImapFetchWindow(1201)).toEqual({ range: "801:1200", mayHaveOlderMessages: true });
    expect(getImapFetchWindow(801)).toEqual({ range: "401:800", mayHaveOlderMessages: true });
    expect(getImapFetchWindow(1)).toEqual({ range: null, mayHaveOlderMessages: false });
  });

  it("accepts only the UID portion of TaskFlow IMAP message identifiers", () => {
    expect(getImapUidFromProviderMessageId("987:1200")).toBe(1200);
    expect(getImapUidFromProviderMessageId("invalid:1200")).toBeNull();
    expect(getImapUidFromProviderMessageId("987:0")).toBeNull();
  });
});

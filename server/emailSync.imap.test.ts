import { beforeEach, describe, expect, it, vi } from "vitest";

const imapMocks = vi.hoisted(() => ({
  ImapFlow: vi.fn(),
  connect: vi.fn(),
  getMailboxLock: vi.fn(),
  fetch: vi.fn(),
  logout: vi.fn(),
  close: vi.fn(),
  release: vi.fn(),
}));

const dbMocks = vi.hoisted(() => ({
  getEmailAccountWithCredentials: vi.fn(),
  upsertEmailMessages: vi.fn(),
  setEmailAccountSyncState: vi.fn(),
}));

vi.mock("imapflow", () => ({ ImapFlow: imapMocks.ImapFlow }));
vi.mock("./db", () => dbMocks);
vi.mock("./emailOAuth", () => ({ decryptEmailToken: vi.fn(), encryptEmailToken: vi.fn() }));
vi.mock("./webmailImap", () => ({ resolvePublicWebmailImapHost: vi.fn().mockResolvedValue({ hostname: "email.vnpt.vn", address: "203.0.113.44" }) }));

import { EMAIL_SYNC_BATCH_SIZE, getImapFetchWindow, getImapUidFromProviderMessageId, getMailboxSyncErrorMessage, syncMailbox, verifyImapConnection, verifyWebmailImapConnection } from "./emailSync";

describe("IMAP connection verification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    imapMocks.connect.mockResolvedValue(undefined);
    imapMocks.getMailboxLock.mockResolvedValue({ release: imapMocks.release });
    imapMocks.logout.mockResolvedValue(undefined);
    imapMocks.ImapFlow.mockImplementation(() => ({
      connect: imapMocks.connect,
      getMailboxLock: imapMocks.getMailboxLock,
      fetch: imapMocks.fetch,
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
  it("builds a bounded UID window and keeps only batches of 50 messages", () => {
    expect(EMAIL_SYNC_BATCH_SIZE).toBe(50);
    expect(getImapFetchWindow(1201)).toEqual({ range: "1151:1200", mayHaveOlderMessages: true });
    expect(getImapFetchWindow(801)).toEqual({ range: "751:800", mayHaveOlderMessages: true });
    expect(getImapFetchWindow(1)).toEqual({ range: null, mayHaveOlderMessages: false });
  });

  it("accepts only the UID portion of TaskFlow IMAP message identifiers", () => {
    expect(getImapUidFromProviderMessageId("987:1200")).toBe(1200);
    expect(getImapUidFromProviderMessageId("invalid:1200")).toBeNull();
    expect(getImapUidFromProviderMessageId("987:0")).toBeNull();
  });

  it("replaces opaque IMAP command failures with actionable guidance", () => {
    expect(getMailboxSyncErrorMessage(new Error("Command failed"))).toContain("Máy chủ IMAP");
    expect(getMailboxSyncErrorMessage(new Error("Authentication failed"))).toBe("Authentication failed");
  });

  it("passes the UID range as a fetch option instead of a fetch data item", async () => {
    const client = {
      connect: imapMocks.connect,
      getMailboxLock: imapMocks.getMailboxLock,
      mailbox: { exists: 1, uidNext: 1201, uidValidity: 987 },
      fetch: imapMocks.fetch,
      logout: imapMocks.logout,
      close: imapMocks.close,
    };
    imapMocks.ImapFlow.mockImplementation(() => client);
    imapMocks.fetch.mockImplementation(async function* () {
      yield {
        uid: 1200,
        envelope: { subject: "Thông báo", from: [{ name: "TaskFlow", address: "no-reply@example.com" }], messageId: "id-1200" },
        flags: new Set<string>(),
        internalDate: new Date("2026-08-21T00:00:00.000Z"),
        source: Buffer.from("Subject: Thông báo\r\n\r\nNội dung"),
      };
    });
    dbMocks.getEmailAccountWithCredentials.mockResolvedValue({
      id: 7,
      provider: "gmail",
      authMethod: "app_password",
      imapHost: "imap.gmail.com",
      imapPort: 993,
      imapSecure: true,
      imapUsername: "owner@example.com",
      imapPasswordCiphertext: "encrypted-password",
      imapMailbox: "INBOX",
    });
    dbMocks.upsertEmailMessages.mockResolvedValue(undefined);
    dbMocks.setEmailAccountSyncState.mockResolvedValue(undefined);

    await syncMailbox(1, 7);

    expect(imapMocks.fetch).toHaveBeenCalledWith(
      "1151:1200",
      { envelope: true, flags: true, internalDate: true, source: true },
      { uid: true },
    );
  });
});

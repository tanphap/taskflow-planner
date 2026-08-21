import { describe, expect, it } from "vitest";
import { isWebmailImapHostname, resolvePublicWebmailImapHost } from "./webmailImap";

describe("Webmail IMAP host validation", () => {
  it("accepts a public mail hostname and resolves a public address", async () => {
    const result = await resolvePublicWebmailImapHost(" email.vnpt.vn ", async () => [{ address: "203.0.113.8", family: 4 }]);
    expect(result).toEqual({ hostname: "email.vnpt.vn", address: "203.0.113.8" });
  });

  it("rejects localhost, literal IP addresses, and malformed hostnames", () => {
    expect(isWebmailImapHostname("localhost")).toBe(false);
    expect(isWebmailImapHostname("127.0.0.1")).toBe(false);
    expect(isWebmailImapHostname("mail..example.com")).toBe(false);
    expect(isWebmailImapHostname("email.vnpt.vn")).toBe(true);
  });

  it("rejects hosts that resolve only to private network addresses", async () => {
    await expect(resolvePublicWebmailImapHost("mail.private.example", async () => [{ address: "10.1.2.3", family: 4 }])).rejects.toThrow("mạng nội bộ");
  });
});

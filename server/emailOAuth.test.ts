import { afterEach, describe, expect, it, vi } from "vitest";

describe("email OAuth token protection", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("encrypts OAuth access tokens with authenticated encryption and restores only intact ciphertext", async () => {
    vi.stubEnv("EMAIL_TOKEN_ENCRYPTION_KEY", Buffer.alloc(32, 19).toString("base64"));
    vi.resetModules();
    const { decryptEmailToken, encryptEmailToken } = await import("./emailOAuth");
    const token = "access-token-for-account-73";
    const ciphertext = encryptEmailToken(token);

    expect(ciphertext).not.toContain(token);
    expect(decryptEmailToken(ciphertext)).toBe(token);
    expect(() => decryptEmailToken(`${ciphertext.slice(0, -4)}AAAA`)).toThrow();
  });

  it("rejects a missing or invalid encryption key before any token can be encrypted", async () => {
    vi.stubEnv("EMAIL_TOKEN_ENCRYPTION_KEY", "not-a-32-byte-base64-key");
    vi.resetModules();
    const { encryptEmailToken } = await import("./emailOAuth");

    expect(() => encryptEmailToken("secret-token")).toThrow("EMAIL_TOKEN_ENCRYPTION_KEY");
  });

  it("reports Gmail and Webmail as ready when a valid IMAP encryption key is configured", async () => {
    vi.stubEnv("EMAIL_TOKEN_ENCRYPTION_KEY", Buffer.alloc(32, 47).toString("base64"));
    vi.resetModules();
    const { getEmailProviderConfiguration } = await import("./emailOAuth");

    expect(getEmailProviderConfiguration()).toEqual({ google: true, webmail: true });
  });
});

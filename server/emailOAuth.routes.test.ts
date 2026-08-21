import crypto from "crypto";
import { createServer } from "http";
import type { AddressInfo } from "net";
import express, { type Express } from "express";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({ createEmailOAuthSession: vi.fn(), consumeEmailOAuthSession: vi.fn(), upsertEmailAccount: vi.fn() }));
vi.mock("./_core/sdk", () => ({ sdk: { authenticateRequest: vi.fn() } }));

async function request(app: Express, path: string) {
  const server = createServer(app);
  await new Promise<void>(resolve => server.listen(0, resolve));
  const address = server.address() as AddressInfo;
  try { return await fetch(`http://127.0.0.1:${address.port}${path}`, { redirect: "manual" }); }
  finally { await new Promise<void>(resolve => server.close(() => resolve())); }
}

async function setup() {
  vi.stubEnv("MICROSOFT_OAUTH_CLIENT_ID", "microsoft-client-id");
  vi.stubEnv("MICROSOFT_OAUTH_CLIENT_SECRET", "microsoft-client-secret");
  vi.stubEnv("EMAIL_TOKEN_ENCRYPTION_KEY", Buffer.alloc(32, 21).toString("base64"));
  vi.resetModules();
  const db = await import("./db");
  const { sdk } = await import("./_core/sdk");
  const { registerEmailOAuthRoutes } = await import("./emailOAuth");
  const app = express();
  registerEmailOAuthRoutes(app);
  return { app, db, sdk };
}

describe("email OAuth state and PKCE routes", () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });

  it("creates an unguessable state, persists only its hash, and redirects with S256 PKCE", async () => {
    const { app, db, sdk } = await setup();
    vi.mocked(sdk.authenticateRequest).mockResolvedValue({ id: 73 } as never);
    vi.mocked(db.createEmailOAuthSession).mockResolvedValue(undefined);

    const response = await request(app, "/api/email/oauth/microsoft/start");
    const location = new URL(response.headers.get("location")!);
    const state = location.searchParams.get("state")!;
    const verifierHash = vi.mocked(db.createEmailOAuthSession).mock.calls[0]?.[2];

    expect(response.status).toBe(302);
    expect(location.origin).toBe("https://login.microsoftonline.com");
    expect(location.searchParams.get("scope")).toContain("IMAP.AccessAsUser.All");
    expect(location.searchParams.get("code_challenge_method")).toBe("S256");
    expect(state.length).toBeGreaterThanOrEqual(40);
    expect(verifierHash).toBe(crypto.createHash("sha256").update(state).digest("hex"));
    expect(vi.mocked(db.createEmailOAuthSession).mock.calls[0]?.[3]).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("does not exchange a code when state is expired, missing, or associated with another provider", async () => {
    const { app, db } = await setup();
    vi.mocked(db.consumeEmailOAuthSession).mockResolvedValue(null);

    const response = await request(app, "/api/email/oauth/microsoft/callback?state=expired-or-forged&code=provider-code");

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/?email=invalid-state&provider=microsoft");
    expect(db.consumeEmailOAuthSession).toHaveBeenCalledWith(crypto.createHash("sha256").update("expired-or-forged").digest("hex"));
    expect(db.upsertEmailAccount).not.toHaveBeenCalled();
  });
});

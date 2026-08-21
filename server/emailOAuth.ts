import crypto from "crypto";
import type { Express, Request, Response } from "express";
import { ENV } from "./_core/env";
import { sdk } from "./_core/sdk";
import * as db from "./db";

type EmailProvider = db.EmailProvider;
type TokenResponse = { access_token: string; refresh_token?: string; expires_in?: number; scope?: string };

const providerConfig = {
  google: { authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth", tokenEndpoint: "https://oauth2.googleapis.com/token", scopes: ["openid", "email", "profile", "https://www.googleapis.com/auth/gmail.readonly"], clientId: () => ENV.googleOAuthClientId, clientSecret: () => ENV.googleOAuthClientSecret },
  microsoft: { authorizationEndpoint: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize", tokenEndpoint: "https://login.microsoftonline.com/common/oauth2/v2.0/token", scopes: ["openid", "profile", "email", "offline_access", "https://graph.microsoft.com/User.Read", "https://graph.microsoft.com/Mail.Read"], clientId: () => ENV.microsoftOAuthClientId, clientSecret: () => ENV.microsoftOAuthClientSecret },
} as const;

function baseUrl(req: Request) {
  if (ENV.publicAppUrl) return ENV.publicAppUrl.replace(/\/$/, "");
  const protocol = String(req.headers["x-forwarded-proto"] ?? req.protocol ?? "https").split(",")[0];
  return `${protocol}://${req.get("host")}`;
}
function callbackUrl(req: Request, provider: EmailProvider) { return `${baseUrl(req)}/api/email/oauth/${provider}/callback`; }
function hash(value: string) { return crypto.createHash("sha256").update(value).digest("hex"); }
function pkceChallenge(verifier: string) { return crypto.createHash("sha256").update(verifier).digest("base64url"); }
function redirect(res: Response, path: string) { res.setHeader("Cache-Control", "no-store"); res.redirect(path); }
function encryptionKey() {
  const key = Buffer.from(ENV.emailTokenEncryptionKey, "base64");
  if (key.length !== 32) throw new Error("EMAIL_TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key");
  return key;
}
export function encryptEmailToken(value: string) {
  const iv = crypto.randomBytes(12); const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  return Buffer.concat([iv, cipher.update(value, "utf8"), cipher.final(), cipher.getAuthTag()]).toString("base64");
}
export function decryptEmailToken(value: string) {
  const raw = Buffer.from(value, "base64"); const iv = raw.subarray(0, 12); const tag = raw.subarray(raw.length - 16); const encrypted = raw.subarray(12, raw.length - 16);
  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), iv); decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
function isProvider(value: string): value is EmailProvider { return value === "google" || value === "microsoft"; }
function configured(provider: EmailProvider) { return Boolean(providerConfig[provider].clientId() && providerConfig[provider].clientSecret() && ENV.emailTokenEncryptionKey); }
export function getEmailProviderConfiguration() { return { google: configured("google"), microsoft: configured("microsoft") }; }

async function exchangeCode(provider: EmailProvider, code: string, verifier: string, redirectUri: string): Promise<TokenResponse> {
  const config = providerConfig[provider]; const body = new URLSearchParams({ client_id: config.clientId(), client_secret: config.clientSecret(), code, code_verifier: verifier, redirect_uri: redirectUri, grant_type: "authorization_code" });
  const response = await fetch(config.tokenEndpoint, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
  if (!response.ok) throw new Error(`Token exchange failed (${response.status})`);
  return response.json() as Promise<TokenResponse>;
}
async function identity(provider: EmailProvider, token: string) {
  const endpoint = provider === "google" ? "https://www.googleapis.com/oauth2/v3/userinfo" : "https://graph.microsoft.com/v1.0/me?$select=displayName,mail,userPrincipalName";
  const response = await fetch(endpoint, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error(`Could not read mailbox identity (${response.status})`);
  const value = await response.json() as Record<string, string>;
  const email = provider === "google" ? value.email : (value.mail || value.userPrincipalName);
  if (!email) throw new Error("Provider did not return an email address");
  return { email, displayName: provider === "google" ? value.name : value.displayName };
}

export function registerEmailOAuthRoutes(app: Express) {
  app.get("/api/email/oauth/:provider/start", async (req, res) => {
    const provider = req.params.provider;
    if (!isProvider(provider)) return res.status(404).send("Unsupported email provider");
    if (!configured(provider)) return redirect(res, `/?email=configuration-required&provider=${provider}`);
    try {
      const user = await sdk.authenticateRequest(req); if (!user) return res.status(401).send("Sign in to TaskFlow before connecting email.");
      const state = crypto.randomBytes(32).toString("base64url"); const verifier = crypto.randomBytes(64).toString("base64url");
      await db.createEmailOAuthSession(user.id, provider, hash(state), verifier, new Date(Date.now() + 10 * 60_000));
      const config = providerConfig[provider]; const url = new URL(config.authorizationEndpoint);
      url.searchParams.set("client_id", config.clientId()); url.searchParams.set("redirect_uri", callbackUrl(req, provider)); url.searchParams.set("response_type", "code"); url.searchParams.set("scope", config.scopes.join(" ")); url.searchParams.set("state", state); url.searchParams.set("code_challenge", pkceChallenge(verifier)); url.searchParams.set("code_challenge_method", "S256");
      if (provider === "google") { url.searchParams.set("access_type", "offline"); url.searchParams.set("prompt", "consent"); }
      return redirect(res, url.toString());
    } catch (error) { console.error("[Email OAuth] start failed", error); return res.status(500).send("Unable to start email connection."); }
  });
  app.get("/api/email/oauth/:provider/callback", async (req, res) => {
    const provider = req.params.provider;
    if (!isProvider(provider)) return res.status(404).send("Unsupported email provider");
    const error = typeof req.query.error === "string" ? req.query.error : undefined; const state = typeof req.query.state === "string" ? req.query.state : undefined; const code = typeof req.query.code === "string" ? req.query.code : undefined;
    if (error || !state || !code) return redirect(res, `/?email=connection-cancelled&provider=${provider}`);
    try {
      const session = await db.consumeEmailOAuthSession(hash(state));
      if (!session || session.provider !== provider) return redirect(res, `/?email=invalid-state&provider=${provider}`);
      const tokens = await exchangeCode(provider, code, session.codeVerifier, callbackUrl(req, provider)); const mailbox = await identity(provider, tokens.access_token);
      await db.upsertEmailAccount(session.userId, { provider, email: mailbox.email, displayName: mailbox.displayName ?? null, accessTokenCiphertext: encryptEmailToken(tokens.access_token), refreshTokenCiphertext: tokens.refresh_token ? encryptEmailToken(tokens.refresh_token) : null, tokenExpiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null, scopes: tokens.scope ?? providerConfig[provider].scopes.join(" ") });
      return redirect(res, "/?email=connected");
    } catch (error) { console.error("[Email OAuth] callback failed", error); return redirect(res, `/?email=connection-failed&provider=${provider}`); }
  });
}

import { timingSafeEqual } from "node:crypto";
import type { Request } from "express";

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/**
 * Shared-secret auth for `/api/scheduled/*` endpoints when the app is NOT
 * running on Manus (e.g. self-hosted backend on ntpha + GitHub Actions cron).
 *
 * The caller (GitHub Actions workflow) sends `CRON_SECRET` as either
 * `Authorization: Bearer <secret>` or the `x-cron-secret` header.
 * Generate with: `openssl rand -hex 32`.
 */
export function isCronSecretRequest(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.authorization;
  if (typeof auth === "string" && auth.startsWith("Bearer ")) {
    return safeEqual(auth.slice("Bearer ".length), secret);
  }
  const header = req.headers["x-cron-secret"];
  if (typeof header === "string") return safeEqual(header, secret);
  return false;
}

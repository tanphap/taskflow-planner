import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { getSupabaseAdmin } from "./supabaseAdmin";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

function getBearerToken(req: CreateExpressContextOptions["req"]): string | null {
  const authHeader = req.headers.authorization;
  if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  return null;
}

/**
 * Resolves the signed-in TaskFlow user from a Supabase Auth access token.
 * The browser client (see `client/src/lib/supabase.ts`) attaches the current
 * Supabase session's access token as an Authorization header on every
 * request. We verify it against Supabase Auth (service role) and map the
 * Supabase user UUID to our local `users.openId`, auto-provisioning the row
 * on first sign-in.
 */
async function authenticateSupabaseRequest(
  req: CreateExpressContextOptions["req"]
): Promise<User | null> {
  const token = getBearerToken(req);
  if (!token) return null;

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) return null;

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return null;

  const supabaseUser = data.user;
  const signedInAt = new Date();
  let user = await db.getUserByOpenId(supabaseUser.id);

  if (!user) {
    const metadataName =
      typeof supabaseUser.user_metadata?.full_name === "string"
        ? supabaseUser.user_metadata.full_name
        : typeof supabaseUser.user_metadata?.name === "string"
          ? supabaseUser.user_metadata.name
          : null;

    try {
      await db.upsertUser({
        openId: supabaseUser.id,
        name: metadataName,
        email: supabaseUser.email ?? null,
        loginMethod: supabaseUser.app_metadata?.provider ?? "email",
        lastSignedIn: signedInAt,
      });
      user = await db.getUserByOpenId(supabaseUser.id);
    } catch (error) {
      console.error("[Auth] Failed to provision user from Supabase session:", error);
      return null;
    }
  } else {
    await db.upsertUser({ openId: user.openId, lastSignedIn: signedInAt });
  }

  return user ?? null;
}

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await authenticateSupabaseRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}

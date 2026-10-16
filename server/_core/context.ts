import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { createClient } from "@supabase/supabase-js";
import * as db from "../db";
import { sdk } from "./sdk";
import { ENV } from "./env";

const supabase =
  ENV.supabaseUrl && ENV.supabaseAnonKey
    ? createClient(ENV.supabaseUrl, ENV.supabaseAnonKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : null;

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  const authorization = opts.req.headers.authorization;
  const accessToken =
    typeof authorization === "string" && authorization.startsWith("Bearer ")
      ? authorization.slice(7)
      : null;

  if (accessToken && supabase) {
    const { data, error } = await supabase.auth.getUser(accessToken);
    if (!error && data.user) {
      const authUser = data.user;
      await db.upsertUser({
        openId: authUser.id,
        name:
          authUser.user_metadata.full_name ??
          authUser.user_metadata.name ??
          null,
        email: authUser.email ?? null,
        loginMethod: authUser.app_metadata.provider ?? "supabase",
        lastSignedIn: new Date(),
      });
      user = (await db.getUserByOpenId(authUser.id)) ?? null;
    }
  }

  try {
    if (!user && !accessToken) {
      user = await sdk.authenticateRequest(opts.req);
    }
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

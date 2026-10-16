import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { ENV } from "./env";

/**
 * Server-only Supabase client authenticated with the service role key.
 * Used to verify browser-supplied access tokens (`auth.getUser`) and to
 * perform privileged Auth operations. NEVER expose this client or the
 * service role key to the browser.
 */
let _supabaseAdmin: SupabaseClient | null = null;

/**
 * Node 20 has no global WebSocket, and @supabase/realtime-js throws
 * ("Node.js detected but native WebSocket not found") at client
 * construction time — which would silently break ALL authenticated
 * requests (createContext swallows the throw and yields user=null).
 * This server only uses auth/admin APIs, never realtime, so a stub
 * constructor is enough to satisfy the check. (Proper fix: Node 22+.)
 */
if (typeof (globalThis as unknown as { WebSocket?: unknown }).WebSocket === "undefined") {
  (globalThis as unknown as { WebSocket?: unknown }).WebSocket = class {
    constructor() {
      throw new Error("WebSocket is not available in this runtime");
    }
  };
}

export function getSupabaseAdmin(): SupabaseClient | null {
  if (_supabaseAdmin) return _supabaseAdmin;
  if (!ENV.supabaseUrl || !ENV.supabaseServiceRoleKey) {
    console.warn(
      "[Supabase] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not configured; Supabase auth verification is disabled."
    );
    return null;
  }
  _supabaseAdmin = createClient(ENV.supabaseUrl, ENV.supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return _supabaseAdmin;
}

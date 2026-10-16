import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { ENV } from "./env";

/**
 * Server-only Supabase client authenticated with the service role key.
 * Used to verify browser-supplied access tokens (`auth.getUser`) and to
 * perform privileged Auth operations. NEVER expose this client or the
 * service role key to the browser.
 */
let _supabaseAdmin: SupabaseClient | null = null;

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

type RequestHeaders = {
  cookie?: string;
  authorization?: string;
};

/**
 * Historically returned the Manus OAuth session token so it could be
 * forwarded to the Heartbeat/Forge scheduler as `x-manus-user-session` (job
 * ownership attribution). Human sign-in now uses Supabase Auth, whose access
 * token is not a Manus session, so there is nothing valid to forward here.
 * Heartbeat falls back to the project owner identity when this is empty —
 * see `server/_core/heartbeat.ts`. The scheduled-callback cron flow in
 * `server/_core/sdk.ts` is unrelated and unaffected.
 */
export function getRequestSessionToken(_headers: RequestHeaders): string {
  return "";
}

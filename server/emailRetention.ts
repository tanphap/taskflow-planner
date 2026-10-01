import * as db from "./db";

export const EMAIL_RETENTION_DAYS = 30;

export function emailRetentionCutoff(now = new Date()) {
  return new Date(now.getTime() - EMAIL_RETENTION_DAYS * 24 * 60 * 60 * 1000);
}

/** Deletes TaskFlow's local email cache; it never deletes from the upstream mailbox. */
export async function runEmailRetentionCleanup(now = new Date()) {
  const cutoff = emailRetentionCutoff(now);
  const deleted = await db.deleteEmailDataOlderThan(cutoff);
  return { cutoff, ...deleted };
}

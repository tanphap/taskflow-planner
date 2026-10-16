import { ENV } from "./_core/env";
import { getSupabaseAdmin } from "./_core/supabaseAdmin";

function normalizeKey(relKey: string): string {
  const key = relKey.replace(/\\/g, "/").replace(/^\/+/, "");
  const segments = key.split("/");
  if (!key || segments.some(segment => !segment || segment === "." || segment === "..")) {
    throw new Error("Invalid storage key");
  }
  return key;
}

function appendHashSuffix(relKey: string): string {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

async function createSignedUrl(key: string): Promise<string> {
  const { data, error } = await getSupabaseAdmin()
    .storage.from(ENV.supabaseStorageBucket)
    .createSignedUrl(normalizeKey(key), 60 * 60);
  if (error) throw new Error(`Supabase Storage signed URL failed: ${error.message}`);
  return data.signedUrl;
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
): Promise<{ key: string; url: string }> {
  const key = appendHashSuffix(normalizeKey(relKey));
  const { error } = await getSupabaseAdmin()
    .storage.from(ENV.supabaseStorageBucket)
    .upload(key, data, { contentType, upsert: false });
  if (error) throw new Error(`Supabase Storage upload failed: ${error.message}`);
  return { key, url: await createSignedUrl(key) };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  return { key, url: await createSignedUrl(key) };
}

export async function storageGetSignedUrl(relKey: string): Promise<string> {
  return createSignedUrl(relKey);
}

import { supabase } from "@/integrations/supabase/client";

export const AVATAR_BUCKET = "user-avatars";
export const AVATAR_MAX = 2 * 1024 * 1024; // 2 MB
export const AVATAR_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

const SIGNED_AVATAR_CACHE_MS = 50 * 60_000;
const signedAvatarCache = new Map<string, { url: string; expiresAt: number }>();

export function invalidateSignedAvatarUrl(path: string | null | undefined) {
  if (!path || /^https?:\/\//i.test(path)) return;
  signedAvatarCache.delete(path);
}

/** Returns a signed URL (1h) for a stored avatar path, or null. */
export async function signedAvatarUrl(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  // If already a full URL (legacy), return as-is.
  if (/^https?:\/\//i.test(path)) return path;
  const cached = signedAvatarCache.get(path);
  if (cached && cached.expiresAt > Date.now()) return cached.url;
  try {
    const { data, error } = await supabase.storage.from(AVATAR_BUCKET).createSignedUrl(path, 3600);
    if (error) return null;
    const url = data?.signedUrl ?? null;
    if (url) signedAvatarCache.set(path, { url, expiresAt: Date.now() + SIGNED_AVATAR_CACHE_MS });
    return url;
  } catch {
    return null;
  }
}

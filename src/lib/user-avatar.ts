import { supabase } from "@/integrations/supabase/client";
import { pcDelete, pcGet, pcSet } from "@/lib/persistent-cache";

export const AVATAR_BUCKET = "user-avatars";
export const AVATAR_MAX = 2 * 1024 * 1024; // 2 MB
export const AVATAR_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

const SIGNED_AVATAR_CACHE_MS = 50 * 60_000;
const signedAvatarCache = new Map<string, { url: string; expiresAt: number }>();

function persistKey(path: string) {
  return `fos:signed-avatar:${path}`;
}

export function invalidateSignedAvatarUrl(path: string | null | undefined) {
  if (!path || /^https?:\/\//i.test(path)) return;
  signedAvatarCache.delete(path);
  pcDelete(persistKey(path));
}

/** Synchronous read of a previously-issued signed URL from localStorage. */
export function getCachedAvatarUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  const mem = signedAvatarCache.get(path);
  if (mem && mem.expiresAt > Date.now()) return mem.url;
  const stored = pcGet<string>(persistKey(path));
  if (stored) {
    signedAvatarCache.set(path, { url: stored, expiresAt: Date.now() + SIGNED_AVATAR_CACHE_MS });
    return stored;
  }
  return null;
}

/** Returns a signed URL (1h) for a stored avatar path, or null. */
export async function signedAvatarUrl(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  const cached = getCachedAvatarUrl(path);
  if (cached) return cached;
  try {
    const { data, error } = await supabase.storage.from(AVATAR_BUCKET).createSignedUrl(path, 3600);
    if (error) return null;
    const url = data?.signedUrl ?? null;
    if (url) {
      signedAvatarCache.set(path, { url, expiresAt: Date.now() + SIGNED_AVATAR_CACHE_MS });
      pcSet(persistKey(path), url, SIGNED_AVATAR_CACHE_MS);
    }
    return url;
  } catch {
    return null;
  }
}

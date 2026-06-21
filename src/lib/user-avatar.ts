import { supabase } from "@/integrations/supabase/client";

export const AVATAR_BUCKET = "user-avatars";
export const AVATAR_MAX = 2 * 1024 * 1024; // 2 MB
export const AVATAR_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

/** Returns a signed URL (1h) for a stored avatar path, or null. */
export async function signedAvatarUrl(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  // If already a full URL (legacy), return as-is.
  if (/^https?:\/\//i.test(path)) return path;
  try {
    const { data, error } = await supabase.storage.from(AVATAR_BUCKET).createSignedUrl(path, 3600);
    if (error) return null;
    return data?.signedUrl ?? null;
  } catch {
    return null;
  }
}

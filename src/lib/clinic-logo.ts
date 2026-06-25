import { supabase } from "@/integrations/supabase/client";
import { pcDelete, pcGet, pcSet } from "@/lib/persistent-cache";

type StorageObjectRef = { bucket: string; path: string };

const SIGNED_LOGO_TTL_MS = 50 * 60_000;

function persistKey(raw: string) {
  return `fos:signed-logo:${raw}`;
}

export function invalidateSignedClinicLogoUrl(raw: string | null | undefined) {
  const value = raw?.trim();
  if (!value || /^https?:\/\//i.test(value)) return;
  pcDelete(persistKey(value));
}

function storageObjectFromUrl(raw: string): StorageObjectRef | null {
  try {
    const url = new URL(raw);
    const marker = "/storage/v1/object/";
    const idx = url.pathname.indexOf(marker);
    if (idx === -1) return null;
    const tail = url.pathname.slice(idx + marker.length);
    const parts = tail.split("/");
    if (parts.length < 3) return null;
    const mode = parts.shift();
    if (mode !== "sign" && mode !== "public") return null;
    const bucket = decodeURIComponent(parts.shift() ?? "");
    const path = decodeURIComponent(parts.join("/"));
    if (!bucket || !path) return null;
    return { bucket, path };
  } catch {
    return null;
  }
}

async function signedFrom(bucket: string, path: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

/** Synchronous read of a cached resolved logo URL for a given raw value. */
export function getCachedClinicLogoUrl(raw: string | null | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;
  if (/^https?:\/\//i.test(value) && !value.includes("/storage/v1/object/")) return value;
  return pcGet<string>(persistKey(value));
}

export async function resolveClinicLogoUrl(raw: string | null | undefined): Promise<string | null> {
  const value = raw?.trim();
  if (!value) return null;

  const cached = pcGet<string>(persistKey(value));
  if (cached) return cached;

  let resolved: string | null = null;
  const embeddedStorageRef = /^https?:\/\//i.test(value) ? storageObjectFromUrl(value) : null;
  if (embeddedStorageRef) {
    resolved = (await signedFrom(embeddedStorageRef.bucket, embeddedStorageRef.path)) ?? value;
  } else if (/^https?:\/\//i.test(value)) {
    resolved = value;
  } else {
    resolved = (await signedFrom("documents", value)) ?? (await signedFrom("clinic-logos", value));
  }

  if (resolved) pcSet(persistKey(value), resolved, SIGNED_LOGO_TTL_MS);
  return resolved;
}

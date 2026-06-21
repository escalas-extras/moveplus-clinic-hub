import { supabase } from "@/integrations/supabase/client";

type StorageObjectRef = { bucket: string; path: string };

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

export async function resolveClinicLogoUrl(raw: string | null | undefined): Promise<string | null> {
  const value = raw?.trim();
  if (!value) return null;

  const embeddedStorageRef = /^https?:\/\//i.test(value) ? storageObjectFromUrl(value) : null;
  if (embeddedStorageRef) {
    return (await signedFrom(embeddedStorageRef.bucket, embeddedStorageRef.path)) ?? value;
  }

  if (/^https?:\/\//i.test(value)) return value;

  return (await signedFrom("clinic-logos", value)) ?? (await signedFrom("documents", value));
}
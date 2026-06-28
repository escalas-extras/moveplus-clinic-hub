/**
 * Carrega e normaliza a logo da clínica para embed em PDFs.
 * Único ponto de entrada — usado por buildPdf e receipt-pdf.
 */
import { supabase } from "@/integrations/supabase/client";
import { invalidateSignedClinicLogoUrl } from "@/lib/clinic-logo";
import { prepareLogoForPdf, urlToDataUrl } from "./pdf-engine/logo";
import type { PreparedLogo } from "./pdf-engine/types";

function isLikelyImageUrl(url: string): boolean {
  if (/\.git(\?|$|#)/i.test(url)) return false;
  if (/^https?:\/\/(www\.)?github\.com\//i.test(url) && !/\/raw\//.test(url)) return false;
  return true;
}

function storageRefFromUrl(raw: string): { bucket: string; path: string } | null {
  try {
    const url = new URL(raw);
    const marker = "/storage/v1/object/";
    const idx = url.pathname.indexOf(marker);
    if (idx === -1) return null;
    const tail = url.pathname.slice(idx + marker.length).split("/");
    const mode = tail.shift();
    if (mode !== "sign" && mode !== "public") return null;
    const bucket = decodeURIComponent(tail.shift() ?? "");
    const path = decodeURIComponent(tail.join("/"));
    if (!bucket || !path) return null;
    return { bucket, path };
  } catch {
    return null;
  }
}

async function signFresh(bucket: string, path: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

/**
 * Resolve logo_url → PreparedLogo PNG transparente.
 * Retorna null se ausente ou se a normalização falhar (PDF usa monograma).
 */
export async function loadClinicLogoForPdf(clinicLogoUrl?: string | null): Promise<PreparedLogo | null> {
  const value = clinicLogoUrl?.trim();
  if (!value) return null;

  invalidateSignedClinicLogoUrl(value);

  let resolved: string | null = null;
  const embedded = /^https?:\/\//i.test(value) ? storageRefFromUrl(value) : null;
  if (embedded) {
    resolved = (await signFresh(embedded.bucket, embedded.path)) ?? value;
  } else if (/^https?:\/\//i.test(value)) {
    resolved = value;
  } else {
    resolved = (await signFresh("documents", value)) ?? (await signFresh("clinic-logos", value));
  }

  if (!resolved || !isLikelyImageUrl(resolved)) return null;
  const raw = await urlToDataUrl(resolved);
  if (!raw) return null;
  return prepareLogoForPdf(raw);
}

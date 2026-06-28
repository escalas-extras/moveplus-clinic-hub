import type { PreparedLogo } from "./types";
import { PDF_LOGO } from "./tokens";
import { applyMattePipeline } from "./logo-matte";

const logoCache = new Map<string, PreparedLogo>();
const MAX_CACHE = 32;

function cacheSet(key: string, value: PreparedLogo) {
  if (logoCache.size >= MAX_CACHE) {
    const first = logoCache.keys().next().value;
    if (first) logoCache.delete(first);
  }
  logoCache.set(key, value);
}

export function dataUrlImageFormat(dataUrl: string): "PNG" | "JPEG" | "WEBP" | undefined {
  if (/^data:image\/jpe?g/i.test(dataUrl)) return "JPEG";
  if (/^data:image\/webp/i.test(dataUrl)) return "WEBP";
  if (/^data:image\/png/i.test(dataUrl)) return "PNG";
  return undefined;
}

function isBrowserCanvasAvailable(): boolean {
  return typeof window !== "undefined" && typeof Image !== "undefined" && typeof document !== "undefined";
}

async function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = dataUrl;
  });
}

/** Normaliza logo para PNG com transparência preservada e mattes removidos (browser). */
export async function normalizeLogoDataUrl(dataUrl: string): Promise<PreparedLogo | null> {
  const cached = logoCache.get(dataUrl);
  if (cached) return cached;
  if (!isBrowserCanvasAvailable()) return null;

  try {
    const img = await loadImage(dataUrl);
    let width = Math.max(1, img.naturalWidth || img.width);
    let height = Math.max(1, img.naturalHeight || img.height);

    const maxDim = PDF_LOGO.maxCanvasDim;
    if (width > maxDim || height > maxDim) {
      const scale = maxDim / Math.max(width, height);
      width = Math.round(width * scale);
      height = Math.round(height * scale);
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return null;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    applyMattePipeline(ctx, width, height);

    const normalized = canvas.toDataURL("image/png");
    const prepared: PreparedLogo = { dataUrl: normalized, width, height, format: "PNG" };
    cacheSet(dataUrl, prepared);
    return prepared;
  } catch {
    return null;
  }
}

/** Carrega URL remota e retorna data URL bruta (sem normalização). */
export async function urlToDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") || "";
    if (!ct.startsWith("image/")) return null;
    const buf = await res.arrayBuffer();
    if (buf.byteLength === 0) return null;
    if (typeof window === "undefined") {
      const b64 = Buffer.from(buf).toString("base64");
      return `data:${ct};base64,${b64}`;
    }
    return await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onloadend = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(new Blob([buf], { type: ct }));
    });
  } catch {
    return null;
  }
}

/** Pipeline completo: fetch → data URL → normalização PNG + cache. */
export async function prepareLogoFromUrl(url: string): Promise<PreparedLogo | null> {
  const raw = await urlToDataUrl(url);
  if (!raw) return null;
  return normalizeLogoDataUrl(raw);
}

/** Prepara logo já em data URL para embed no PDF. Retorna null se normalização falhar. */
export async function prepareLogoForPdf(dataUrl: string | null): Promise<PreparedLogo | null> {
  if (!dataUrl) return null;
  if (!dataUrl.startsWith("data:image/")) return null;
  return normalizeLogoDataUrl(dataUrl);
}

/** Normaliza data URL ou PreparedLogo — nunca retorna string crua. */
export async function prepareLogoInput(
  input: string | PreparedLogo | null | undefined,
): Promise<PreparedLogo | null> {
  if (!input) return null;
  if (typeof input === "object" && "format" in input) return input;
  if (typeof input === "string" && input.startsWith("data:image/")) {
    return prepareLogoForPdf(input);
  }
  return null;
}

export function clearLogoCache() {
  logoCache.clear();
}

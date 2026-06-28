/**
 * Normalização de logo em Node (fixtures/CI) — usa @napi-rs/canvas.
 * Não importar em código de produção (browser bundle).
 */
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { applyMattePipeline } from "../../src/lib/pdf-engine/logo-matte";
import { PDF_LOGO } from "../../src/lib/pdf-engine/tokens";
import type { PreparedLogo } from "../../src/lib/pdf-engine/types";

const logoCache = new Map<string, PreparedLogo>();
const MAX_CACHE = 32;

function cacheSet(key: string, value: PreparedLogo) {
  if (logoCache.size >= MAX_CACHE) {
    const first = logoCache.keys().next().value;
    if (first) logoCache.delete(first);
  }
  logoCache.set(key, value);
}

export async function normalizeLogoDataUrlNode(dataUrl: string): Promise<PreparedLogo | null> {
  const cached = logoCache.get(dataUrl);
  if (cached) return cached;

  try {
    const img = await loadImage(dataUrl);
    let width = Math.max(1, img.width);
    let height = Math.max(1, img.height);
    const maxDim = PDF_LOGO.maxCanvasDim;
    if (width > maxDim || height > maxDim) {
      const scale = maxDim / Math.max(width, height);
      width = Math.round(width * scale);
      height = Math.round(height * scale);
    }

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    applyMattePipeline(ctx as unknown as CanvasRenderingContext2D, width, height);

    const normalized = canvas.toDataURL("image/png");
    const prepared: PreparedLogo = { dataUrl: normalized, width, height, format: "PNG" };
    cacheSet(dataUrl, prepared);
    return prepared;
  } catch {
    return null;
  }
}

/** Equivalente Node de prepareLogoInput — nunca retorna string crua. */
export async function prepareLogoInputNode(
  input: string | PreparedLogo | null | undefined,
): Promise<PreparedLogo | null> {
  if (!input) return null;
  if (typeof input === "object" && "format" in input) return input;
  if (typeof input === "string" && input.startsWith("data:image/")) {
    return normalizeLogoDataUrlNode(input);
  }
  return null;
}

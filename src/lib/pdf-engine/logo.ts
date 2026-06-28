import type { PreparedLogo } from "./types";
import { PDF_LOGO } from "./tokens";

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

function removeBlackMatte(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const image = ctx.getImageData(0, 0, width, height);
  const data = image.data;
  const corners = [
    [0, 0],
    [width - 1, 0],
    [0, height - 1],
    [width - 1, height - 1],
  ];
  const darkCorners = corners.filter(([x, y]) => {
    const i = (y * width + x) * 4;
    return data[i + 3] > 245 && data[i] < 24 && data[i + 1] < 24 && data[i + 2] < 24;
  }).length;
  if (darkCorners < 3) return;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] > 245 && data[i] < 30 && data[i + 1] < 30 && data[i + 2] < 30) {
      data[i + 3] = 0;
    }
  }
  ctx.putImageData(image, 0, 0);
}

function removeWhiteMatte(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const image = ctx.getImageData(0, 0, width, height);
  const data = image.data;
  const isWhiteEdge = (x: number, y: number) => {
    const i = (y * width + x) * 4;
    const a = data[i + 3];
    if (a < 230) return false;
    return data[i] > 240 && data[i + 1] > 240 && data[i + 2] > 240;
  };

  let whiteEdge = 0;
  let edge = 0;
  for (let x = 0; x < width; x++) {
    edge += 2;
    if (isWhiteEdge(x, 0)) whiteEdge++;
    if (isWhiteEdge(x, height - 1)) whiteEdge++;
  }
  for (let y = 1; y < height - 1; y++) {
    edge += 2;
    if (isWhiteEdge(0, y)) whiteEdge++;
    if (isWhiteEdge(width - 1, y)) whiteEdge++;
  }
  if (edge === 0 || whiteEdge / edge < 0.55) return;

  const seen = new Uint8Array(width * height);
  const queue: Array<[number, number]> = [];
  const push = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const idx = y * width + x;
    if (seen[idx] || !isWhiteEdge(x, y)) return;
    seen[idx] = 1;
    queue.push([x, y]);
  };
  for (let x = 0; x < width; x++) {
    push(x, 0);
    push(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    push(0, y);
    push(width - 1, y);
  }

  for (let qi = 0; qi < queue.length; qi++) {
    const [x, y] = queue[qi];
    const i = (y * width + x) * 4;
    data[i + 3] = 0;
    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
  }
  ctx.putImageData(image, 0, 0);
}

function removeDarkEdgeMatte(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const image = ctx.getImageData(0, 0, width, height);
  const data = image.data;
  const isDarkEdgePixel = (x: number, y: number) => {
    const i = (y * width + x) * 4;
    const alpha = data[i + 3];
    if (alpha < 230) return false;
    return data[i] < 42 && data[i + 1] < 42 && data[i + 2] < 42;
  };

  let darkEdge = 0;
  let edge = 0;
  for (let x = 0; x < width; x++) {
    edge += 2;
    if (isDarkEdgePixel(x, 0)) darkEdge++;
    if (isDarkEdgePixel(x, height - 1)) darkEdge++;
  }
  for (let y = 1; y < height - 1; y++) {
    edge += 2;
    if (isDarkEdgePixel(0, y)) darkEdge++;
    if (isDarkEdgePixel(width - 1, y)) darkEdge++;
  }
  if (edge === 0 || darkEdge / edge < 0.18) return;

  const seen = new Uint8Array(width * height);
  const queue: Array<[number, number]> = [];
  const push = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const idx = y * width + x;
    if (seen[idx] || !isDarkEdgePixel(x, y)) return;
    seen[idx] = 1;
    queue.push([x, y]);
  };
  for (let x = 0; x < width; x++) {
    push(x, 0);
    push(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    push(0, y);
    push(width - 1, y);
  }

  for (let qi = 0; qi < queue.length; qi++) {
    const [x, y] = queue[qi];
    const i = (y * width + x) * 4;
    data[i + 3] = 0;
    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
  }
  ctx.putImageData(image, 0, 0);
}

async function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = dataUrl;
  });
}

/** Normaliza logo para PNG com transparência preservada e mattes removidos. */
export async function normalizeLogoDataUrl(dataUrl: string): Promise<PreparedLogo> {
  const cached = logoCache.get(dataUrl);
  if (cached) return cached;

  if (!isBrowserCanvasAvailable()) {
    const prepared: PreparedLogo = {
      dataUrl,
      width: PDF_LOGO.boxW,
      height: PDF_LOGO.boxH,
      format: "PNG",
    };
    cacheSet(dataUrl, prepared);
    return prepared;
  }

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
    if (!ctx) {
      const fallback: PreparedLogo = { dataUrl, width, height, format: "PNG" };
      cacheSet(dataUrl, fallback);
      return fallback;
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    removeBlackMatte(ctx, width, height);
    removeWhiteMatte(ctx, width, height);
    removeDarkEdgeMatte(ctx, width, height);

    const normalized = canvas.toDataURL("image/png");
    const prepared: PreparedLogo = { dataUrl: normalized, width, height, format: "PNG" };
    cacheSet(dataUrl, prepared);
    return prepared;
  } catch {
    const fallback: PreparedLogo = {
      dataUrl,
      width: PDF_LOGO.boxW,
      height: PDF_LOGO.boxH,
      format: "PNG",
    };
    cacheSet(dataUrl, fallback);
    return fallback;
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

/** Prepara logo já em data URL para embed no PDF. */
export async function prepareLogoForPdf(dataUrl: string | null): Promise<PreparedLogo | null> {
  if (!dataUrl) return null;
  return normalizeLogoDataUrl(dataUrl);
}

export function clearLogoCache() {
  logoCache.clear();
}

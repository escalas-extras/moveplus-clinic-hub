import type jsPDF from "jspdf";
import type { ClinicData, PreparedLogo } from "./types";
import { PDF_COLORS } from "./tokens";
import { cleanText } from "./text";
import { dataUrlImageFormat } from "./logo";
import { drawMonogram } from "./icons";

export function fitRect(srcW: number, srcH: number, boxX: number, boxY: number, boxW: number, boxH: number) {
  const safeW = Math.max(1, srcW);
  const safeH = Math.max(1, srcH);
  const scale = Math.min(boxW / safeW, boxH / safeH);
  const w = safeW * scale;
  const h = safeH * scale;
  return { x: boxX + (boxW - w) / 2, y: boxY + (boxH - h) / 2, w, h };
}

export type ImageDrawResult = "ok" | "fallback" | "skipped";

/**
 * Desenha imagem contida no box, preservando proporção e centralizando.
 * Sempre usa PNG normalizado quando disponível (PreparedLogo).
 */
export function drawContainedImage(
  doc: jsPDF,
  image: string | PreparedLogo,
  x: number,
  y: number,
  boxW: number,
  boxH: number,
): ImageDrawResult {
  const dataUrl = typeof image === "string" ? image : image.dataUrl;
  const naturalW = typeof image === "string"
    ? Number((doc as jsPDF & { getImageProperties?: (s: string) => { width?: number; height?: number } }).getImageProperties?.(dataUrl)?.width) || boxW
    : image.width;
  const naturalH = typeof image === "string"
    ? Number((doc as jsPDF & { getImageProperties?: (s: string) => { width?: number; height?: number } }).getImageProperties?.(dataUrl)?.height) || boxH
    : image.height;

  const fit = fitRect(naturalW, naturalH, x, y, boxW, boxH);
  const format = typeof image === "string" ? (dataUrlImageFormat(dataUrl) ?? "PNG") : "PNG";
  const embedFormat = format === "WEBP" ? "PNG" : format;
  doc.addImage(dataUrl, embedFormat, fit.x, fit.y, fit.w, fit.h, undefined, "FAST");
  return "ok";
}

export function drawLogoOrFallback(
  doc: jsPDF,
  clinic: ClinicData,
  logo: string | PreparedLogo | null,
  x: number,
  y: number,
  boxW: number,
  boxH: number,
): ImageDrawResult {
  if (!logo) {
    drawMonogram(doc, clinic, x, y, Math.min(boxW, boxH));
    return "fallback";
  }
  try {
    return drawContainedImage(doc, logo, x, y, boxW, boxH);
  } catch {
    drawMonogram(doc, clinic, x, y, Math.min(boxW, boxH));
    return "fallback";
  }
}

/** Área branca de respiro antes da logo — evita artefatos de fundo. */
export function clearLogoBackdrop(doc: jsPDF, x: number, y: number, w: number, h: number) {
  doc.setFillColor(...PDF_COLORS.paper);
  doc.rect(x - 2, y - 2, w + 4, h + 4, "F");
}

export function drawSignatureImage(
  doc: jsPDF,
  image: string | PreparedLogo,
  x: number,
  y: number,
  maxW: number,
  maxH: number,
): boolean {
  try {
    drawContainedImage(doc, image, x, y - maxH, maxW, maxH);
    return true;
  } catch {
    return false;
  }
}

export function clinicMonogramLetter(clinic: ClinicData): string {
  const name = cleanText(clinic.nome_fantasia) || "FisioOS";
  return name.charAt(0).toUpperCase() || "F";
}

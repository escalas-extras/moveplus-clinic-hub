import type jsPDF from "jspdf";
import type { ClinicData, PreparedLogo } from "./types";
import { PDF_COLORS, PDF_LOGO } from "./tokens";
import { cleanText } from "./text";
import { dataUrlImageFormat } from "./logo";
import { drawMonogram } from "./icons";

export type LogoBoxRect = { x: number; y: number; w: number; h: number };

export function fitRect(srcW: number, srcH: number, boxX: number, boxY: number, boxW: number, boxH: number) {
  const safeW = Math.max(1, srcW);
  const safeH = Math.max(1, srcH);
  const scale = Math.min(boxW / safeW, boxH / safeH);
  const w = safeW * scale;
  const h = safeH * scale;
  return { x: boxX + (boxW - w) / 2, y: boxY + (boxH - h) / 2, w, h };
}

/** Calcula retângulo da logo centralizado verticalmente no container do cabeçalho. */
export function computeLogoBoxRect(
  containerX: number,
  containerY: number,
  containerH: number,
  boxW: number = PDF_LOGO.boxW,
  boxH: number = PDF_LOGO.boxH,
  paddingLeft: number = PDF_LOGO.padding,
): LogoBoxRect {
  return {
    x: containerX + paddingLeft,
    y: containerY + Math.max(0, (containerH - boxH) / 2),
    w: boxW,
    h: boxH,
  };
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
  const compression = embedFormat === "PNG" ? "NONE" : "FAST";
  doc.addImage(dataUrl, embedFormat, fit.x, fit.y, fit.w, fit.h, undefined, compression);
  return "ok";
}

function drawMonogramInBox(doc: jsPDF, clinic: ClinicData, rect: LogoBoxRect) {
  const monoSize = Math.min(rect.w, rect.h) * 0.88;
  const monoX = rect.x + (rect.w - monoSize) / 2;
  const monoY = rect.y + (rect.h - monoSize) / 2;
  drawMonogram(doc, clinic, monoX, monoY, monoSize);
}

/**
 * Desenha logo da clínica em área fixa — object-contain, centralizada, sem distorção.
 * Equivalente PDF do componente LogoBox (UI).
 */
export function drawLogoBox(
  doc: jsPDF,
  clinic: ClinicData,
  logo: PreparedLogo | null,
  rect: LogoBoxRect,
): ImageDrawResult {
  if (!logo || logo.format !== "PNG") {
    drawMonogramInBox(doc, clinic, rect);
    return "fallback";
  }
  try {
    const inset = PDF_LOGO.inset;
    clearLogoBackdrop(doc, rect.x, rect.y, rect.w, rect.h);
    return drawContainedImage(
      doc,
      logo,
      rect.x + inset,
      rect.y + inset,
      rect.w - inset * 2,
      rect.h - inset * 2,
    );
  } catch {
    drawMonogramInBox(doc, clinic, rect);
    return "fallback";
  }
}

/** @deprecated Use drawLogoBox com computeLogoBoxRect. */
export function drawLogoOrFallback(
  doc: jsPDF,
  clinic: ClinicData,
  logo: PreparedLogo | null,
  x: number,
  y: number,
  boxW: number,
  boxH: number,
): ImageDrawResult {
  return drawLogoBox(doc, clinic, logo, { x, y, w: boxW, h: boxH });
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

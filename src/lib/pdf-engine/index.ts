export type {
  BuildPdfOpts,
  ClinicData,
  ClinicalTrend,
  EvolutionItem,
  PdfBlock,
  PdfContent,
  PdfRenderCtx,
  PdfSection,
  PreparedLogo,
  Professional,
} from "./types";

export {
  PDF_COLORS,
  PDF_LOGO,
  PDF_QR,
  PDF_SPACING,
  PDF_TYPOGRAPHY,
  applyClinicPalette,
  hexToRgb,
} from "./tokens";

export { cleanText, isEmptyText, truncateLine, wrapText } from "./text";

export {
  clearLogoCache,
  dataUrlImageFormat,
  normalizeLogoDataUrl,
  prepareLogoForPdf,
  prepareLogoFromUrl,
  urlToDataUrl,
} from "./logo";

export {
  drawContainedImage,
  drawLogoOrFallback,
  drawSignatureImage,
  fitRect,
  type ImageDrawResult,
} from "./images";

export {
  drawDocumentHeader,
  drawHeaderBottomRule,
  drawLeftBand,
  drawLegacyClinicHeader,
  drawPageChrome,
  type HeaderEngineOptions,
} from "./header-engine";

export {
  drawDocumentFooter,
  drawLegacyFooter,
  drawValidationQr,
  type FooterEngineOptions,
} from "./footer-engine";

export { drawMiniIcon, drawMonogram, fieldIconFor, type IconKind } from "./icons";

export { renderPdf } from "./render";

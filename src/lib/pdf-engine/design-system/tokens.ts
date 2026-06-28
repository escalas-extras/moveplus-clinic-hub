import type { DocumentColorTokens, DocumentLogoTokens, DocumentSpacingTokens, DocumentTypographyScale } from "./types";

/** Escala tipográfica oficial — nunca usar tamanhos fora desta escala. */
export const DS_TYPOGRAPHY: DocumentTypographyScale = {
  docTitle: 11,
  docSubtitle: 8,
  sectionTitle: 10,
  label: 7.5,
  body: 9.5,
  caption: 7,
  footer: 6.5,
  footerSmall: 6,
  sigName: 9.5,
  sigRole: 8.5,
};

/** Grid A4 — margens, ritmo vertical, áreas reservadas. */
export const DS_SPACING: DocumentSpacingTokens = {
  margin: 44,
  headerH: 178,
  footerH: 48,
  sectionGap: 14,
  sectionPadX: 18,
  sectionPadY: 14,
  sectionRadius: 10,
  lineH: 14,
  rhythm: 16,
  sigContractH: 200,
  qrSize: 42,
  qrMarginBottom: 10,
};

export const DS_LOGO: DocumentLogoTokens = {
  boxW: 132,
  boxH: 124,
  inset: 4,
};

/** Cores base FisioOS — sobrescritas por white label em createDocumentTheme(). */
export const DS_COLORS_BASE: DocumentColorTokens = {
  primary: [15, 76, 92],
  secondary: [43, 182, 115],
  surface: [248, 250, 252],
  surfaceAlt: [241, 245, 249],
  muted: [100, 116, 139],
  border: [203, 213, 225],
  borderSoft: [226, 232, 240],
  ink: [30, 41, 59],
  paper: [255, 255, 255],
  success: [5, 122, 85],
  warning: [180, 83, 9],
  danger: [185, 28, 28],
};

export const DS_LAYOUT_ID = "fisioos-ds" as const;

import type { ClinicData, PreparedLogo } from "../types";

export type Rgb = [number, number, number];

/** Paleta mutável — white label via createDocumentTheme(). */
export type DocumentColorTokens = {
  primary: Rgb;
  secondary: Rgb;
  surface: Rgb;
  surfaceAlt: Rgb;
  muted: Rgb;
  border: Rgb;
  borderSoft: Rgb;
  ink: Rgb;
  paper: Rgb;
  success: Rgb;
  warning: Rgb;
  danger: Rgb;
};

export type DocumentTypographyScale = {
  docTitle: number;
  docSubtitle: number;
  sectionTitle: number;
  label: number;
  body: number;
  caption: number;
  footer: number;
  footerSmall: number;
  sigName: number;
  sigRole: number;
};

export type DocumentSpacingTokens = {
  margin: number;
  headerH: number;
  footerH: number;
  sectionGap: number;
  sectionPadX: number;
  sectionPadY: number;
  sectionRadius: number;
  lineH: number;
  rhythm: number;
  sigContractH: number;
  qrSize: number;
  qrMarginBottom: number;
};

export type DocumentLogoTokens = {
  boxW: number;
  boxH: number;
  inset: number;
};

export type DocumentTheme = {
  colors: DocumentColorTokens;
  type: DocumentTypographyScale;
  space: DocumentSpacingTokens;
  logo: DocumentLogoTokens;
};

export type DocumentRenderContext = {
  clinic: ClinicData;
  logo: PreparedLogo | null;
  pageW: number;
  pageH: number;
};

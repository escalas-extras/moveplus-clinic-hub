export type {
  DocumentColorTokens,
  DocumentLogoTokens,
  DocumentRenderContext,
  DocumentSpacingTokens,
  DocumentTheme,
  DocumentTypographyScale,
  Rgb,
} from "./types";

export {
  DS_COLORS_BASE,
  DS_LAYOUT_ID,
  DS_LOGO,
  DS_SPACING,
  DS_TYPOGRAPHY,
} from "./tokens";

export { createDocumentTheme } from "./theme";
export { renderFisioosDsDocument } from "./render-document";

export { drawDsHeader, drawDsRunningHeader } from "./components/header";
export { drawDsFooter, drawDsValidationQr } from "./components/footer";
export { drawSectionCard, measureSectionCard } from "./components/section-card";
export { drawDsContractSignatures, drawDsSignatureArea } from "./components/signature";
export { drawDsBadge, drawDsDivider, drawDsInfoGrid } from "./components/primitives";

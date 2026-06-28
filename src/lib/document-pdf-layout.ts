import type { BuildPdfOpts } from "@/lib/pdf-engine";
import { DS_LAYOUT_ID } from "@/lib/pdf-engine/design-system";

/** Layout premium compartilhado por PDFs clínicos (Avaliação, Evolução, etc.). */
export const CLINICAL_PREMIUM_LAYOUT = "clinical-premium" as const;

/** Document Design System oficial — contratos e futuros documentos migrados. */
export const FISIOOS_DS_LAYOUT = DS_LAYOUT_ID;

export function isContractPdf(title?: string | null, docType?: string | null): boolean {
  return /contrato/i.test(title || "") || docType === "contrato";
}

/** Contratos usam o Document Design System FisioOS (fisioos-ds). */
export function withContractPremiumLayout<T extends BuildPdfOpts>(
  opts: T,
  docType?: string | null,
): T {
  if (!isContractPdf(opts.title, docType)) return opts;
  return { ...opts, layout: FISIOOS_DS_LAYOUT };
}

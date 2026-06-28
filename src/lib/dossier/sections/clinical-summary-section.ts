import type { PdfBlock } from "@/lib/pdf-engine";
import type { DossierContext } from "../types";
import { hasMeaningfulText } from "../utils";

/** Resumo do caso — renderiza apenas quando houver conteúdo (futuro: texto consolidado). */
export function buildClinicalSummarySection(ctx: DossierContext): PdfBlock | null {
  const text = ctx.caseSummary?.trim();
  if (!hasMeaningfulText(text)) return null;

  return {
    title: "Resumo do caso",
    includeInIndex: true,
    indexLabel: "Resumo do caso",
    layout: { compact: true, editorial: true, minHeight: 80, idealHeight: 180, maxHeight: 260 },
    children: [{ kind: "highlight", label: "Síntese clínica", text: text! }],
  };
}

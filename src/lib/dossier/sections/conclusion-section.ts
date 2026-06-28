import type { PdfBlock } from "@/lib/pdf-engine";
import type { DossierConclusionMeta, DossierContext } from "../types";
import { hasMeaningfulText } from "../utils";
import {
  buildTreatmentPeriodLabel,
  buildTreatmentSummaryNarrative,
  computePanoramaStats,
} from "./case-panorama-section";
import { extractObjectiveLists } from "./comparative-section";

export function buildConclusionMeta(ctx: DossierContext): DossierConclusionMeta {
  const { achieved, pending } = extractObjectiveLists(ctx);
  const stats = computePanoramaStats(ctx);

  let professionalNotes = ctx.professionalNotes?.trim();
  if (!hasMeaningfulText(professionalNotes) && ctx.latestDischarge) {
    professionalNotes = String(ctx.latestDischarge.observacoes ?? "").trim() || undefined;
  }

  return {
    treatmentSummary: buildTreatmentSummaryNarrative(ctx),
    periodLabel: buildTreatmentPeriodLabel(ctx),
    sessionCount: stats.sessionCount,
    assessmentCount: stats.assessmentCount,
    evolutionCount: stats.evolutionCount,
    reassessmentCount: stats.reassessmentCount,
    objectivesAchieved: achieved,
    objectivesPending: pending,
    hasDischarge: stats.hasDischarge,
    professionalNotes: hasMeaningfulText(professionalNotes) ? professionalNotes : undefined,
    professional: ctx.professional,
  };
}

/** Metadados de assinatura — renderizados na página de conclusão. */
export function buildSignatureMeta(ctx: DossierContext) {
  return {
    professional: ctx.professional,
    generatedAt: ctx.generatedAt,
    validationHash: ctx.validationHash,
  };
}

/** Placeholder para extensão futura de blocos de conclusão inline (não usado na v2). */
export function buildConclusionSection(_ctx: DossierContext): PdfBlock | null {
  return null;
}

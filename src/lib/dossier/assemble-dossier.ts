import {
  buildAssessmentPdfOpts,
  buildDischargePdfOpts,
  buildEvolutionPdfOpts,
  buildReassessmentPdfOpts,
} from "@/lib/clinical-pdf-builders";
import type { AssessmentRow } from "@/components/reassessment-premium/compare-utils";
import type { PdfBlock, Professional } from "@/lib/pdf-engine";
import type { ClinicalDossierInput, DossierContext, DossierConclusionMeta } from "./types";
import { buildIndexEntries } from "./index-builder";
import { composeEditorialLayout, type LayoutComposerResult } from "./layout-composer";
import { buildIdentificationSection } from "./sections/identification-section";
import { buildTimelineSection } from "./sections/timeline-section";
import { buildClinicalSummarySection } from "./sections/clinical-summary-section";
import { buildComparativeSection } from "./sections/comparative-section";
import { buildObjectivesSection } from "./sections/objectives-section";
import { buildDocumentsSection } from "./sections/documents-section";
import { computePanoramaStats } from "./sections/case-panorama-section";
import { buildConclusionMeta } from "./sections/conclusion-section";
import { pushSanitizedBlocks } from "./utils";

function pickProfessional(
  assessments: Record<string, unknown>[],
  evolutions: Record<string, unknown>[],
  discharges: Record<string, unknown>[],
): Professional | null {
  for (const list of [discharges, assessments, evolutions]) {
    for (const row of list) {
      const prof = row.professionals as Professional | null | undefined;
      if (prof?.nome) return prof;
    }
  }
  return null;
}

function buildContext(input: ClinicalDossierInput, generatedAt: string, validationHash: string): DossierContext {
  const sortedAssessments = [...input.assessments].sort((a, b) =>
    String(a.data ?? "").localeCompare(String(b.data ?? "")),
  );
  const sortedEvolutions = [...input.evolutions].sort((a, b) => {
    const da = `${a.data ?? ""}${a.hora ?? ""}`;
    const db = `${b.data ?? ""}${b.hora ?? ""}`;
    return da.localeCompare(db);
  });
  const reassessments = sortedAssessments.filter((a) => a.tipo === "reavaliacao");
  const latestDischarge = [...input.discharges].sort((a, b) =>
    String(b.data_alta ?? "").localeCompare(String(a.data_alta ?? "")),
  )[0];

  return {
    patient: input.patient,
    sortedAssessments,
    initialAssessment: sortedAssessments.find((a) => a.tipo !== "reavaliacao"),
    reassessments,
    sortedEvolutions,
    latestDischarge,
    documents: input.documents,
    goals: input.goals ?? [],
    professional: pickProfessional(sortedAssessments, sortedEvolutions, input.discharges),
    clinicId: (input.patient.clinic_id as string | null) ?? null,
    generatedAt,
    validationHash,
    institutionalMessage: input.institutionalMessage,
    caseSummary: input.caseSummary ?? null,
    professionalNotes: input.professionalNotes ?? null,
  };
}

export type AssembledDossier = {
  blocks: PdfBlock[];
  ctx: DossierContext;
  conclusion: DossierConclusionMeta;
  indexEntries: ReturnType<typeof buildIndexEntries>;
  panorama: ReturnType<typeof computePanoramaStats>;
  layoutComposer: LayoutComposerResult["stats"];
};

export function assembleDossier(input: ClinicalDossierInput, generatedAt: string, validationHash: string): AssembledDossier {
  const ctx = buildContext(input, generatedAt, validationHash);
  const rawBlocks: PdfBlock[] = [];

  rawBlocks.push(buildIdentificationSection(ctx));

  if (ctx.initialAssessment) {
    pushSanitizedBlocks(
      rawBlocks,
      buildAssessmentPdfOpts(
        ctx.initialAssessment,
        ctx.patient,
        ctx.sortedEvolutions,
        ctx.sortedAssessments,
      ).blocks ?? [],
      { indexLabel: "Avaliação inicial" },
    );
  }

  const summary = buildClinicalSummarySection(ctx);
  if (summary) rawBlocks.push(summary);

  if (ctx.sortedEvolutions.length) {
    rawBlocks.push({
      title: "Evoluções",
      includeInIndex: true,
      indexLabel: "Evoluções",
      children: [
        {
          kind: "badge",
          label: "Registros consolidados",
          text: `${ctx.sortedEvolutions.length} evolução(ões) integrada(s) neste histórico.`,
          variant: "info",
        },
      ],
    });
    for (const evo of ctx.sortedEvolutions) {
      pushSanitizedBlocks(rawBlocks, buildEvolutionPdfOpts(evo, ctx.patient).blocks ?? [], {
        includeInIndex: false,
      });
    }
  }

  if (ctx.reassessments.length) {
    rawBlocks.push({
      title: "Reavaliações",
      includeInIndex: true,
      indexLabel: "Reavaliações",
      children: [
        {
          kind: "badge",
          label: "Total de reavaliações",
          text: String(ctx.reassessments.length),
          variant: "info",
        },
      ],
    });
    for (const rev of ctx.reassessments) {
      pushSanitizedBlocks(
        rawBlocks,
        buildReassessmentPdfOpts(rev, ctx.patient, ctx.sortedAssessments as AssessmentRow[]).blocks ?? [],
        { includeInIndex: false },
      );
    }
  }

  const comparative = buildComparativeSection(ctx);
  if (comparative) rawBlocks.push(comparative);

  const objectives = buildObjectivesSection(ctx);
  if (objectives) rawBlocks.push(objectives);

  if (ctx.latestDischarge) {
    let dischargeBlocks = buildDischargePdfOpts(
      ctx.latestDischarge,
      ctx.patient,
      ctx.sortedAssessments,
      ctx.sortedEvolutions.length,
    ).blocks ?? [];
    if (objectives) {
      dischargeBlocks = dischargeBlocks.filter((b) => b.title !== "Objetivos");
    }
    pushSanitizedBlocks(rawBlocks, dischargeBlocks, {
      indexLabel: "Alta fisioterapêutica",
    });
  }

  const timeline = buildTimelineSection(ctx);
  if (timeline) rawBlocks.push(timeline);

  const documents = buildDocumentsSection(ctx);
  if (documents) rawBlocks.push(documents);

  if (rawBlocks.length === 1 && !ctx.sortedEvolutions.length && !ctx.documents.length) {
    rawBlocks.push({
      title: "Conteúdo clínico",
      includeInIndex: false,
      children: [
        {
          kind: "paragraph",
          text: "Não há registros clínicos suficientes para consolidar neste histórico.",
        },
      ],
    });
  }

  const { blocks, stats: layoutComposer } = composeEditorialLayout(rawBlocks, ctx);

  return {
    blocks,
    ctx,
    conclusion: buildConclusionMeta(ctx),
    indexEntries: buildIndexEntries(blocks),
    panorama: computePanoramaStats(ctx),
    layoutComposer,
  };
}

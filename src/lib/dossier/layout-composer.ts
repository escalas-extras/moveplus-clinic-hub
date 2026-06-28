/**
 * Sprint D3 — Layout Composer editorial do Histórico Clínico Integrado.
 */

import type { PdfBlock } from "@/lib/pdf-engine";
import type { DossierContext } from "./types";
import { estimateSectionHeight } from "./section-estimates";
import { computePanoramaStats } from "./sections/case-panorama-section";

export type LayoutComposerResult = {
  blocks: PdfBlock[];
  stats: {
    sectionsIn: number;
    sectionsOut: number;
    forcedBreaksRemoved: number;
    mergedObjectivesIntoPanorama: boolean;
    estimatedPagesBefore: number;
    estimatedPagesAfter: number;
  };
};

const USABLE_PAGE_H = 680;

function countEstimatedPages(blocks: PdfBlock[], respectBreaks = false): number {
  let pages = 1;
  let used = 0;
  for (const b of blocks) {
    if (respectBreaks && b.pageBreakBefore && used > 0) {
      pages++;
      used = 0;
    }
    const h = estimateSectionHeight(b);
    if (used + h > USABLE_PAGE_H && used > 0) {
      pages++;
      used = h;
    } else {
      used += h;
    }
  }
  return pages;
}

function stripPageBreaks(blocks: PdfBlock[]): number {
  let n = 0;
  for (const b of blocks) {
    if (b.pageBreakBefore) n++;
    b.pageBreakBefore = false;
    b.layout = { ...b.layout, compact: true, editorial: true };
  }
  return n;
}

function buildPanoramaDashboard(ctx: DossierContext, extras: PdfBlock["children"] = []): PdfBlock {
  const stats = computePanoramaStats(ctx);
  const maxSessions = Math.max(stats.sessionCount, 20);
  const maxDocs = Math.max(stats.documentCount, 10);
  const objTotal = stats.objectivesAchieved.length + stats.objectivesPending.length;

  const items: Array<{
    label: string;
    value: string;
    variant: "success" | "warning" | "info" | "neutral";
    barValue?: number;
    barMax?: number;
  }> = [
    { label: "Paciente", value: stats.patientName, variant: "info" },
    { label: "Tempo", value: stats.followUpLabel, variant: "info" },
    {
      label: "Sessões",
      value: `${stats.sessionCount} registrada(s)`,
      variant: "info",
      barValue: stats.sessionCount,
      barMax: maxSessions,
    },
    { label: "Avaliações", value: String(stats.assessmentCount), variant: "info" },
    { label: "Evoluções", value: String(stats.evolutionCount), variant: "info" },
    { label: "Reavaliações", value: String(stats.reassessmentCount), variant: "info" },
    {
      label: "Escalas",
      value: stats.scalesUsed.length ? stats.scalesUsed.slice(0, 3).join(" · ") : "—",
      variant: "neutral",
    },
    {
      label: "Documentos",
      value: `${stats.documentCount} emitido(s)`,
      variant: "neutral",
      barValue: stats.documentCount,
      barMax: maxDocs,
    },
    {
      label: "Objetivos",
      value: `${stats.objectivesAchieved.length} ✓ · ${stats.objectivesPending.length} •`,
      variant: stats.objectivesPending.length ? "warning" : "success",
      barValue: objTotal || stats.objectivesAchieved.length,
      barMax: Math.max(objTotal, 8),
    },
    {
      label: "Alta",
      value: stats.hasDischarge ? `Sim · ${stats.dischargeDate ?? ""}` : "Não",
      variant: stats.hasDischarge ? "success" : "neutral",
    },
  ];

  for (const extra of extras) {
    if (extra.kind === "badge" || extra.kind === "objective") {
      items.push({
        label: extra.label ?? "Objetivo",
        value: extra.kind === "objective" ? extra.text : extra.text,
        variant:
          extra.kind === "objective"
            ? extra.status === "achieved"
              ? "success"
              : "warning"
            : extra.variant === "danger"
              ? "warning"
              : extra.variant,
      });
    }
  }

  return {
    title: "Panorama do caso",
    includeInIndex: true,
    indexLabel: "Panorama do caso",
    layout: { compact: true, editorial: true, dashboardColumns: 3, minHeight: 120, idealHeight: 220, maxHeight: 280 },
    children: [{ kind: "dashboard", columns: 3, items }],
  };
}

function insertAfterAssessment(out: PdfBlock[], block: PdfBlock) {
  const anchor = out.findIndex(
    (b) =>
      b.title === "Anamnese" ||
      b.title === "Exame físico" ||
      b.title === "Avaliação da dor (EVA)" ||
      b.indexLabel === "Avaliação inicial",
  );
  const pos = anchor >= 0 ? anchor + 1 : Math.min(1, out.length);
  out.splice(pos, 0, block);
}

export function composeEditorialLayout(blocks: PdfBlock[], ctx: DossierContext): LayoutComposerResult {
  const cloned = blocks.map((b) => ({ ...b, children: [...b.children] }));
  const estimatedPagesBefore = countEstimatedPages(cloned, true);
  const forcedBreaksRemoved = stripPageBreaks(cloned);

  const out: PdfBlock[] = [];
  let objectivesBlock: PdfBlock | null = null;
  let mergedObjectives = false;

  for (const block of cloned) {
    if (block.title === "Panorama do caso") continue;
    if (block.title === "Objetivos terapêuticos") {
      objectivesBlock = block;
      continue;
    }
    if (block.title === "Linha do tempo do tratamento") {
      block.layout = { compact: true, editorial: true };
      out.push(block);
      continue;
    }
    if (block.title === "Documentos emitidos") {
      block.layout = { compact: true, editorial: true };
      out.push(block);
      continue;
    }
    if (block.indexLabel === "Avaliação inicial") {
      block.layout = { compact: true, editorial: true };
    }
    if (block.title === "Panorama comparativo") {
      block.layout = { compact: true, editorial: true };
    }
    out.push(block);
  }

  const objCount = objectivesBlock?.children.length ?? 0;
  if (objectivesBlock && objCount <= 3) {
    mergedObjectives = true;
    const extras = objectivesBlock.children;
    insertAfterAssessment(out, buildPanoramaDashboard(ctx, extras));
  } else {
    insertAfterAssessment(out, buildPanoramaDashboard(ctx));
    if (objectivesBlock) {
      objectivesBlock.layout = { compact: true, editorial: true };
      const compIdx = out.findIndex((b) => b.title === "Panorama comparativo");
      if (compIdx >= 0) out.splice(compIdx + 1, 0, objectivesBlock);
      else out.push(objectivesBlock);
    }
  }

  const estimatedPagesAfter = countEstimatedPages(out, false);

  return {
    blocks: out,
    stats: {
      sectionsIn: blocks.length,
      sectionsOut: out.length,
      forcedBreaksRemoved,
      mergedObjectivesIntoPanorama: mergedObjectives,
      estimatedPagesBefore,
      estimatedPagesAfter,
    },
  };
}

export function computeLayoutFillRatio(
  pages: { contentH: number; topY: number }[],
  bottomY: number,
): number {
  if (!pages.length) return 0;
  const fills = pages.map((p) => {
    const usable = bottomY - p.topY;
    return usable > 0 ? Math.min(1, p.contentH / usable) : 0;
  });
  return fills.reduce((a, b) => a + b, 0) / fills.length;
}

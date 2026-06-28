import { parseScales } from "@/components/reassessment-premium/compare-utils";
import { fmtDate } from "@/lib/format";
import type { PdfBlock } from "@/lib/pdf-engine";
import type { DossierContext, DossierPanoramaStats } from "../types";
import { extractObjectiveLists } from "./comparative-section";
import { countDocumentGroups } from "./documents-section";

export function computePanoramaStats(ctx: DossierContext): DossierPanoramaStats {
  const firstDate =
    ctx.sortedAssessments[0]?.data ??
    ctx.sortedEvolutions[0]?.data ??
    null;
  const lastDate =
    ctx.latestDischarge?.data_alta ??
    ctx.sortedEvolutions.at(-1)?.data ??
    ctx.sortedAssessments.at(-1)?.data ??
    null;

  let followUpDays: number | null = null;
  let followUpLabel = "—";
  if (firstDate && lastDate) {
    const a = new Date(String(firstDate));
    const b = new Date(String(lastDate));
    followUpDays = Math.max(0, Math.round((b.getTime() - a.getTime()) / 86400000));
    followUpLabel =
      followUpDays === 0
        ? "Mesmo dia"
        : followUpDays === 1
          ? "1 dia"
          : `${followUpDays} dias`;
  }

  const scalesUsed = new Set<string>();
  for (const a of ctx.sortedAssessments) {
    const parsed = parseScales(a.scales_results);
    if (parsed.summary !== "—") {
      parsed.summary.split(" · ").forEach((s) => scalesUsed.add(s.split(":")[0]?.trim() || s));
    }
    if (a.rom_goniometry) scalesUsed.add("ADM / Goniometria");
    if (a.strength_mrc) scalesUsed.add("Força muscular (MRC)");
    if (a.eva != null) scalesUsed.add("EVA");
  }

  const { achieved, pending } = extractObjectiveLists(ctx);

  return {
    patientName: String(ctx.patient.nome_completo ?? "—"),
    followUpDays,
    followUpLabel,
    sessionCount: ctx.sortedEvolutions.length,
    assessmentCount: ctx.sortedAssessments.length,
    evolutionCount: ctx.sortedEvolutions.length,
    reassessmentCount: ctx.reassessments.length,
    scalesUsed: [...scalesUsed],
    documentCount: countDocumentGroups(ctx.documents),
    objectivesAchieved: achieved,
    objectivesPending: pending,
    hasDischarge: !!ctx.latestDischarge,
    dischargeDate: ctx.latestDischarge
      ? fmtDate(ctx.latestDischarge.data_alta as string)
      : undefined,
  };
}

export function buildCasePanoramaSection(ctx: DossierContext): PdfBlock | null {
  const stats = computePanoramaStats(ctx);
  const children: PdfBlock["children"] = [
    {
      kind: "badge",
      label: "Paciente",
      text: stats.patientName,
      variant: "info",
    },
    {
      kind: "badge",
      label: "Tempo de acompanhamento",
      text: stats.followUpLabel,
      variant: "info",
    },
    {
      kind: "badge",
      label: "Sessões registradas",
      text: String(stats.sessionCount),
      variant: "info",
    },
    {
      kind: "badge",
      label: "Avaliações",
      text: String(stats.assessmentCount),
      variant: "info",
    },
    {
      kind: "badge",
      label: "Evoluções",
      text: String(stats.evolutionCount),
      variant: "info",
    },
    {
      kind: "badge",
      label: "Reavaliações",
      text: String(stats.reassessmentCount),
      variant: "info",
    },
    {
      kind: "badge",
      label: "Escalas utilizadas",
      text: stats.scalesUsed.length ? stats.scalesUsed.join(" · ") : "Nenhuma escala registrada",
      variant: "neutral",
    },
    {
      kind: "badge",
      label: "Documentos emitidos",
      text: `${stats.documentCount} tipo(s) documental(is)`,
      variant: "neutral",
    },
    {
      kind: "badge",
      label: "Objetivos concluídos",
      text: stats.objectivesAchieved.length
        ? stats.objectivesAchieved.join(" · ")
        : "Nenhum registrado",
      variant: stats.objectivesAchieved.length ? "success" : "neutral",
    },
    {
      kind: "badge",
      label: "Objetivos pendentes",
      text: stats.objectivesPending.length
        ? stats.objectivesPending.join(" · ")
        : "Nenhum registrado",
      variant: stats.objectivesPending.length ? "warning" : "neutral",
    },
    {
      kind: "badge",
      label: "Alta registrada",
      text: stats.hasDischarge
        ? `Sim · ${stats.dischargeDate ?? ""}`
        : "Não",
      variant: stats.hasDischarge ? "success" : "neutral",
    },
  ];

  return {
    title: "Panorama do caso",
    includeInIndex: true,
    indexLabel: "Panorama do caso",
    layout: { compact: true, editorial: true, estimatedHeight: 280 },
    children,
  };
}

export function buildTreatmentPeriodLabel(ctx: DossierContext): string {
  const stats = computePanoramaStats(ctx);
  if (!ctx.sortedAssessments.length && !ctx.sortedEvolutions.length) return "—";
  const first =
    ctx.sortedAssessments[0]?.data ?? ctx.sortedEvolutions[0]?.data;
  const last =
    ctx.latestDischarge?.data_alta ??
    ctx.sortedEvolutions.at(-1)?.data ??
    ctx.sortedAssessments.at(-1)?.data;
  if (!first || !last) return stats.followUpLabel;
  return `${fmtDate(first as string)} a ${fmtDate(last as string)} (${stats.followUpLabel})`;
}

export function buildTreatmentSummaryNarrative(ctx: DossierContext): string {
  const parts: string[] = [];
  const name = String(ctx.patient.nome_completo ?? "paciente");

  if (ctx.sortedAssessments.length) {
    parts.push(
      `Acompanhamento fisioterapêutico de ${name} com ${ctx.sortedAssessments.length} avaliação(ões) registrada(s).`,
    );
  }
  if (ctx.sortedEvolutions.length) {
    parts.push(`${ctx.sortedEvolutions.length} sessão(ões)/evolução(ões) documentada(s).`);
  }
  if (ctx.latestDischarge) {
    parts.push(
      `Alta em ${fmtDate(ctx.latestDischarge.data_alta as string)}: ${String(ctx.latestDischarge.motivo ?? "encerramento registrado")}.`,
    );
  } else if (ctx.sortedAssessments.length || ctx.sortedEvolutions.length) {
    parts.push("Tratamento em curso ou sem alta formal registrada.");
  }
  return parts.join(" ") || "Histórico consolidado a partir dos registros clínicos disponíveis.";
}

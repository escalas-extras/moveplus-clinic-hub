import {
  buildEvolutionSummary,
  buildMetricCompares,
  pickComparisonTriplet,
  type AssessmentRow,
} from "@/components/reassessment-premium/compare-utils";
import type { PdfBlock } from "@/lib/pdf-engine";
import type { DossierContext } from "../types";

function parseMetric(val: string): number | null {
  const n = parseFloat(String(val).replace(/[^\d.,-]/g, "").replace(",", "."));
  return Number.isNaN(n) ? null : n;
}

export function buildComparativeSection(ctx: DossierContext): PdfBlock | null {
  const rows = ctx.sortedAssessments as AssessmentRow[];
  if (rows.length < 2) return null;

  const { inicial, ultima, atual } = pickComparisonTriplet(rows);
  if (!inicial) return null;

  const metrics = buildMetricCompares(inicial, ultima, atual ?? ultima ?? inicial);
  const summary = buildEvolutionSummary(inicial, ultima, atual ?? ultima ?? inicial, metrics);

  const children: PdfBlock["children"] = [];
  const barRows: Array<{
    label: string;
    inicial: number;
    atual: number;
    max?: number;
    trend?: "melhorou" | "estavel" | "piorou" | "indeterminado";
  }> = [];

  for (const m of metrics.filter((x) => x.atual !== "—" || x.inicial !== "—")) {
    const ini = parseMetric(m.inicial);
    const cur = parseMetric(m.atual);
    if (ini != null && cur != null) {
      barRows.push({
        label: m.label,
        inicial: ini,
        atual: cur,
        max: Math.max(ini, cur, 10),
        trend: m.trend,
      });
    } else {
      children.push({
        kind: "badge",
        label: m.label,
        text: `Inicial ${m.inicial} · Atual ${m.atual}`,
        variant: m.trend === "melhorou" ? "success" : m.trend === "piorou" ? "warning" : "neutral",
      });
    }
  }

  if (barRows.length) {
    children.unshift({ kind: "compare-bars", rows: barRows });
  }

  if (summary.melhoras.length) {
    children.push({
      kind: "badge",
      label: "Evoluções favoráveis",
      text: summary.melhoras.join(" · "),
      variant: "success",
    });
  }

  if (!children.length) return null;

  return {
    title: "Panorama comparativo",
    includeInIndex: true,
    indexLabel: "Panorama comparativo",
    layout: {
      compact: true,
      editorial: true,
      minHeight: 80,
      idealHeight: 160,
      maxHeight: 240,
    },
    children,
  };
}

export function extractObjectiveLists(ctx: DossierContext): {
  achieved: string[];
  pending: string[];
} {
  const rows = ctx.sortedAssessments as AssessmentRow[];
  if (rows.length < 2) return { achieved: [], pending: [] };
  const { inicial, ultima, atual } = pickComparisonTriplet(rows);
  if (!inicial) return { achieved: [], pending: [] };
  const metrics = buildMetricCompares(inicial, ultima, atual ?? ultima ?? inicial);
  const summary = buildEvolutionSummary(inicial, ultima, atual ?? ultima ?? inicial, metrics);
  return {
    achieved: summary.objetivosAlcancados,
    pending: summary.objetivosPendentes,
  };
}

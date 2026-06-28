import type { PdfBlock } from "@/lib/pdf-engine";
import type { DossierContext } from "../types";
import { hasMeaningfulText } from "../utils";

function objectiveStatus(raw: string): "achieved" | "pending" | "progress" {
  const s = raw.toLowerCase();
  if (s.includes("alcan") || s.includes("conclu")) return "achieved";
  if (s.includes("andamento") || s.includes("progress")) return "progress";
  return "pending";
}

export function buildObjectivesSection(ctx: DossierContext): PdfBlock | null {
  const children: PdfBlock["children"] = [];

  for (const g of ctx.goals) {
    children.push({
      kind: "objective",
      label: String(g.term ?? "Objetivo"),
      text: String(g.description ?? "—"),
      status: objectiveStatus(String(g.status ?? "")),
    });
  }

  const latest = ctx.sortedAssessments.at(-1);
  if (latest && hasMeaningfulText(latest.objetivos)) {
    children.push({
      kind: "highlight",
      label: "Objetivos da última avaliação",
      text: String(latest.objetivos),
    });
  }

  if (ctx.latestDischarge) {
    if (hasMeaningfulText(ctx.latestDischarge.objetivos_alcancados)) {
      children.push({
        kind: "objective",
        label: "Alcançados na alta",
        text: String(ctx.latestDischarge.objetivos_alcancados),
        status: "achieved",
      });
    }
    if (hasMeaningfulText(ctx.latestDischarge.objetivos_pendentes)) {
      children.push({
        kind: "objective",
        label: "Pendentes na alta",
        text: String(ctx.latestDischarge.objetivos_pendentes),
        status: "pending",
      });
    }
  }

  if (!children.length) return null;

  return {
    title: "Objetivos terapêuticos",
    includeInIndex: true,
    indexLabel: "Objetivos terapêuticos",
    layout: {
      compact: true,
      editorial: true,
      minHeight: 80,
      idealHeight: 180,
      maxHeight: 320,
    },
    children,
  };
}

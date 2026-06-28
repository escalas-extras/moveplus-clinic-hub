import { fmtDate } from "@/lib/format";
import type { PdfBlock } from "@/lib/pdf-engine";
import type { DossierContext } from "../types";

type TimelineEvent = { sortKey: string; date: string; title: string };

export function buildTimelineSection(ctx: DossierContext): PdfBlock | null {
  const events: TimelineEvent[] = [];

  const initial = ctx.initialAssessment;
  if (initial) {
    events.push({
      sortKey: `${initial.data ?? ""}0000`,
      date: fmtDate(initial.data as string),
      title: "Avaliação inicial",
    });
  }

  for (const evo of ctx.sortedEvolutions) {
    events.push({
      sortKey: `${evo.data ?? ""}${String(evo.hora ?? "").replace(/:/g, "")}`,
      date: fmtDate(evo.data as string),
      title: "Evolução",
    });
  }

  for (const rev of ctx.reassessments) {
    events.push({
      sortKey: `${rev.data ?? ""}1200`,
      date: fmtDate(rev.data as string),
      title: "Reavaliação",
    });
  }

  if (ctx.latestDischarge) {
    events.push({
      sortKey: `${ctx.latestDischarge.data_alta ?? ""}2359`,
      date: fmtDate(ctx.latestDischarge.data_alta as string),
      title: "Alta",
    });
  }

  if (events.length < 2) return null;

  events.sort((a, b) => a.sortKey.localeCompare(b.sortKey));

  return {
    title: "Linha do tempo do tratamento",
    includeInIndex: true,
    indexLabel: "Linha do tempo do tratamento",
    layout: { compact: true, editorial: true, minHeight: 120, idealHeight: 240, maxHeight: 360 },
    children: [{ kind: "timeline", items: events.map((e) => ({ date: e.date, title: e.title })) }],
  };
}

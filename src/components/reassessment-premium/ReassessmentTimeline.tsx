import { useMemo } from "react";
import { ClipboardList, Activity, RefreshCw } from "lucide-react";
import { InfoCard, StatusBadge } from "@/components/layout";
import { fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AssessmentRow } from "./compare-utils";

type EvolutionRow = {
  id: string;
  data: string;
  hora: string | null;
  procedimentos: string | null;
  professionals?: { nome: string } | null;
};

type TimelineEvent = {
  id: string;
  date: string;
  hora?: string | null;
  kind: "assessment" | "reassessment" | "evolution";
  title: string;
  subtitle?: string;
};

const KIND_META = {
  assessment: { icon: ClipboardList, color: "#0F4C5C", label: "Avaliação" },
  reassessment: { icon: RefreshCw, color: "#4F9CF9", label: "Reavaliação" },
  evolution: { icon: Activity, color: "#2BB673", label: "Evolução" },
} as const;

type ReassessmentTimelineProps = {
  assessments: AssessmentRow[];
  evolutions: EvolutionRow[];
};

export function ReassessmentTimeline({ assessments, evolutions }: ReassessmentTimelineProps) {
  const items = useMemo(() => {
    const events: TimelineEvent[] = [];
    assessments.forEach((a) => {
      events.push({
        id: `a-${a.id}`,
        date: a.data,
        kind: a.tipo === "reavaliacao" ? "reassessment" : "assessment",
        title: a.tipo === "reavaliacao" ? "Reavaliação fisioterapêutica" : "Avaliação inicial",
        subtitle: [a.professionals?.nome, a.queixa_principal?.slice(0, 72)].filter(Boolean).join(" · "),
      });
    });
    evolutions.forEach((e) => {
      events.push({
        id: `e-${e.id}`,
        date: e.data,
        hora: e.hora,
        kind: "evolution",
        title: "Sessão / Evolução",
        subtitle: [e.professionals?.nome, e.procedimentos?.slice(0, 72)].filter(Boolean).join(" · "),
      });
    });
    return events.sort((a, b) => {
      const da = `${a.date}T${a.hora ?? "00:00"}`;
      const db = `${b.date}T${b.hora ?? "00:00"}`;
      return db.localeCompare(da);
    });
  }, [assessments, evolutions]);

  if (!items.length) {
    return (
      <InfoCard title="Linha do tempo clínica" description="Histórico de avaliações, evoluções e reavaliações.">
        <p className="text-sm text-muted-foreground">Nenhum evento clínico registrado para este paciente.</p>
      </InfoCard>
    );
  }

  return (
    <InfoCard title="Linha do tempo clínica" description="Avaliações, evoluções e reavaliações em ordem cronológica.">
      <ol className="relative space-y-0 border-l-2 border-slate-200 pl-4 sm:pl-6">
        {items.map((item, idx) => {
          const meta = KIND_META[item.kind];
          const Icon = meta.icon;
          return (
            <li key={item.id} className={cn("relative pb-6 last:pb-0", idx === 0 && "pt-1")}>
              <span
                className="absolute -left-[calc(0.5rem+5px)] flex h-3 w-3 rounded-full ring-4 ring-white sm:-left-[calc(0.75rem+5px)]"
                style={{ background: meta.color, top: "0.35rem" }}
                aria-hidden
              />
              <div className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm sm:p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex min-w-0 items-start gap-2">
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                      style={{ background: `${meta.color}18`, color: meta.color }}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900">{item.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {fmtDate(item.date)}
                        {item.hora ? ` · ${String(item.hora).slice(0, 5)}` : ""}
                      </div>
                      {item.subtitle && (
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{item.subtitle}</p>
                      )}
                    </div>
                  </div>
                  <StatusBadge variant="neutral">{meta.label}</StatusBadge>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </InfoCard>
  );
}

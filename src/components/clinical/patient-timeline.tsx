import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ClipboardList, Activity, RefreshCw, LogOut, FileText, History } from "lucide-react";
import { fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { InfoCard, EmptyState } from "@/components/layout";
import { useActiveClinic } from "@/lib/active-clinic";

type TimelineKind = "assessment" | "reassessment" | "evolution" | "discharge" | "document";

type TimelineItem = {
  id: string;
  date: string;
  hora?: string | null;
  kind: TimelineKind;
  title: string;
  subtitle?: string;
};

const KIND_META: Record<TimelineKind, { label: string; icon: any; color: string }> = {
  assessment:   { label: "Avaliação",   icon: ClipboardList, color: "#0F4C5C" },
  reassessment: { label: "Reavaliação", icon: RefreshCw,     color: "#4F9CF9" },
  evolution:    { label: "Evolução",    icon: Activity,      color: "#2BB673" },
  discharge:    { label: "Alta",        icon: LogOut,        color: "#E07A5F" },
  document:     { label: "Documento",   icon: FileText,      color: "#64748B" },
};

const KIND_ORDER: TimelineKind[] = ["assessment", "reassessment", "evolution", "discharge", "document"];

function monthLabel(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "Sem data";
  return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

export function PatientTimeline({ patientId }: { patientId: string }) {
  const { clinicId } = useActiveClinic();
  const [filter, setFilter] = useState<TimelineKind | "all">("all");

  const q = useQuery({
    queryKey: ["timeline", clinicId, patientId],
    enabled: !!clinicId && !!patientId,
    queryFn: async (): Promise<TimelineItem[]> => {
      const [assess, evol, disc, docs] = await Promise.all([
        supabase.from("assessments").select("id, data, tipo, queixa_principal, professionals(nome)").eq("clinic_id", clinicId!).eq("patient_id", patientId),
        supabase.from("evolutions").select("id, data, hora, procedimentos, professionals(nome)").eq("clinic_id", clinicId!).eq("patient_id", patientId),
        supabase
          .from("patient_discharges")
          .select("id, data_alta, motivo, professionals(nome), patients!inner(clinic_id)")
          .eq("patient_id", patientId)
          .eq("patients.clinic_id", clinicId!),
        supabase.from("documents").select("id, tipo, emitido_em, patients!inner(clinic_id)").eq("patient_id", patientId).eq("patients.clinic_id", clinicId!).limit(50),
      ]);
      const items: TimelineItem[] = [];
      (assess.data ?? []).forEach((a: any) => items.push({
        id: `a-${a.id}`,
        date: a.data,
        kind: a.tipo === "reavaliacao" ? "reassessment" : "assessment",
        title: a.tipo === "reavaliacao" ? "Reavaliação fisioterapêutica" : "Avaliação inicial",
        subtitle: [a.professionals?.nome, a.queixa_principal?.slice(0, 80)].filter(Boolean).join(" · "),
      }));
      (evol.data ?? []).forEach((e: any) => items.push({
        id: `e-${e.id}`,
        date: e.data,
        hora: e.hora,
        kind: "evolution",
        title: "Sessão / Evolução",
        subtitle: [e.professionals?.nome, e.procedimentos?.slice(0, 80)].filter(Boolean).join(" · "),
      }));
      (disc.data ?? []).forEach((d: any) => items.push({
        id: `d-${d.id}`,
        date: d.data_alta,
        kind: "discharge",
        title: "Alta fisioterapêutica",
        subtitle: [d.professionals?.nome, d.motivo].filter(Boolean).join(" · "),
      }));
      (docs.data ?? []).forEach((d: any) => items.push({
        id: `doc-${d.id}`,
        date: (d.emitido_em ?? "").slice(0, 10),
        kind: "document",
        title: `Documento emitido (${d.tipo})`,
      }));
      return items.sort((a, b) => (a.date > b.date ? -1 : a.date < b.date ? 1 : (b.hora ?? "").localeCompare(a.hora ?? "")));
    },
  });

  const items = q.data ?? [];

  const counts = useMemo(() => {
    const c: Record<TimelineKind, number> = {
      assessment: 0, reassessment: 0, evolution: 0, discharge: 0, document: 0,
    };
    items.forEach((it) => { c[it.kind] += 1; });
    return c;
  }, [items]);

  const filtered = filter === "all" ? items : items.filter((it) => it.kind === filter);

  const groups = useMemo(() => {
    const map = new Map<string, TimelineItem[]>();
    filtered.forEach((it) => {
      const key = monthLabel(it.date);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(it);
    });
    return Array.from(map.entries());
  }, [filtered]);

  if (q.isLoading) {
    return <div className="text-sm text-muted-foreground">Carregando timeline…</div>;
  }

  if (!items.length) {
    return (
      <EmptyState
        icon={History}
        title="Nenhum evento clínico ainda"
        description="O histórico do paciente aparecerá aqui à medida que avaliações, evoluções, reavaliações, documentos e altas forem registrados."
        className="py-12"
      />
    );
  }

  return (
    <InfoCard
      icon={History}
      title="Linha do tempo clínica"
      description={`${items.length} evento${items.length === 1 ? "" : "s"} · do mais recente ao mais antigo`}
    >
      {/* Filtros por categoria (client-side, sem novas queries) */}
      <div className="mb-5 flex flex-wrap gap-1.5">
        <FilterChip active={filter === "all"} onClick={() => setFilter("all")} color="#0F4C5C" label="Tudo" count={items.length} />
        {KIND_ORDER.map((kind) =>
          counts[kind] > 0 ? (
            <FilterChip
              key={kind}
              active={filter === kind}
              onClick={() => setFilter(kind)}
              color={KIND_META[kind].color}
              label={KIND_META[kind].label}
              count={counts[kind]}
            />
          ) : null,
        )}
      </div>

      <div className="space-y-6">
        {groups.map(([month, monthItems]) => (
          <div key={month}>
            <div className="mb-2 flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{month}</span>
              <span className="h-px flex-1 bg-slate-100" />
            </div>
            <ol className="relative ml-3 space-y-4 before:absolute before:bottom-1 before:left-0 before:top-1 before:w-px before:bg-gradient-to-b before:from-primary/30 before:via-border before:to-transparent">
              {monthItems.map((it) => {
                const meta = KIND_META[it.kind];
                const Icon = meta.icon;
                return (
                  <li key={it.id} className="ml-6">
                    <span
                      className="absolute -left-[14px] flex h-7 w-7 items-center justify-center rounded-full shadow-soft ring-4 ring-background"
                      style={{ background: `linear-gradient(135deg, ${meta.color}, color-mix(in oklab, ${meta.color} 70%, white))` }}
                    >
                      <Icon className="h-3.5 w-3.5 text-white" />
                    </span>
                    <div className="rounded-xl border border-slate-100 bg-white px-3.5 py-2.5 transition-colors hover:border-slate-200">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: meta.color }}>{meta.label}</span>
                        <span className="text-xs tabular-nums text-muted-foreground">
                          {fmtDate(it.date)}{it.hora ? ` · ${String(it.hora).slice(0, 5)}` : ""}
                        </span>
                      </div>
                      <div className="mt-0.5 text-sm font-semibold text-slate-900">{it.title}</div>
                      {it.subtitle && <div className="mt-0.5 text-xs text-muted-foreground">{it.subtitle}</div>}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        ))}
      </div>
    </InfoCard>
  );
}

function FilterChip({
  active,
  onClick,
  color,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  color: string;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
        active
          ? "border-transparent text-white"
          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
      )}
      style={active ? { background: color } : undefined}
    >
      <span
        className="h-2 w-2 rounded-full"
        style={{ background: active ? "rgba(255,255,255,0.8)" : color }}
        aria-hidden
      />
      {label}
      <span className={cn("tabular-nums", active ? "text-white/80" : "text-slate-400")}>{count}</span>
    </button>
  );
}

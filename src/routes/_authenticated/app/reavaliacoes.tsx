import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveClinic } from "@/lib/active-clinic";
import { fmtDate } from "@/lib/format";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  RefreshCw,
  ArrowRight,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AppShell,
  ClinicalSkeleton,
  EmptyState,
  InfoCard,
  KpiCard,
  KpiGrid,
  PageHeader,
  PageSection,
  SearchField,
  StatusBadge,
  clinical,
} from "@/components/layout";
import { cn } from "@/lib/utils";
import { ReassessmentWorkspace, type ScheduleItem } from "@/components/reassessment-premium";

export const Route = createFileRoute("/_authenticated/app/reavaliacoes")({
  component: ReassessmentsPage,
});

type ScheduleRow = ScheduleItem & {
  patients: { nome_completo: string } | null;
};

function ReassessmentsPage() {
  const { clinicId } = useActiveClinic();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "overdue" | "upcoming" | "done">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["reassessments-pending", clinicId],
    enabled: !!clinicId,
    queryFn: async () => {
      const { data } = await supabase
        .from("reassessment_schedule")
        .select("id, scheduled_for, completed_at, interval_days, patient_id, patients(nome_completo)")
        .eq("clinic_id", clinicId!)
        .order("scheduled_for", { ascending: true });
      return (data ?? []) as ScheduleRow[];
    },
  });

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const { overdue, upcoming, done } = useMemo(() => {
    const o: ScheduleRow[] = [];
    const u: ScheduleRow[] = [];
    const d: ScheduleRow[] = [];
    items.forEach((i) => {
      if (i.completed_at) d.push(i);
      else if (new Date(i.scheduled_for) < today) o.push(i);
      else u.push(i);
    });
    return { overdue: o, upcoming: u, done: d };
  }, [items, today]);

  const filtered = useMemo(() => {
    let list = items;
    if (filter === "overdue") list = overdue;
    else if (filter === "upcoming") list = upcoming;
    else if (filter === "done") list = done;

    const s = q.toLowerCase().trim();
    if (!s) return list;
    return list.filter((i) => (i.patients?.nome_completo ?? "").toLowerCase().includes(s));
  }, [items, overdue, upcoming, done, filter, q]);

  const selected = items.find((i) => i.id === selectedId) ?? null;

  return (
    <AppShell clinical>
      <PageHeader
        icon={RefreshCw}
        eyebrow="Acompanhamento evolutivo"
        breadcrumbs={[{ label: "Clínica", to: "/app" }, { label: "Reavaliações" }]}
        title="Reavaliações"
        description="Ferramenta clínica comparativa — visualize a evolução desde a avaliação inicial."
      />

      {isLoading ? (
        <ClinicalSkeleton variant="split" kpiCount={3} />
      ) : (
        <>
          <KpiGrid columns={3}>
            <KpiCard
              icon={AlertTriangle}
              label="Atrasadas"
              value={overdue.length}
              accent="#e11d48"
              hideDelta
              tone={overdue.length > 0 ? "warning" : "default"}
            />
            <KpiCard
              icon={CalendarClock}
              label="A vencer"
              value={upcoming.length}
              accent="#d97706"
              hideDelta
            />
            <KpiCard
              icon={CheckCircle2}
              label="Concluídas"
              value={done.length}
              accent="#059669"
              hideDelta
            />
          </KpiGrid>

          <div className={cn(clinical.splitLayout, "xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]")}>
            <div className="min-w-0 space-y-4">
              <InfoCard icon={Filter} title="Filtros" description="Refine a lista de reavaliações agendadas.">
                <div className="flex flex-wrap items-center gap-2">
                  <SearchField
                    placeholder="Buscar paciente…"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {(
                      [
                        ["all", "Todas"],
                        ["overdue", "Atrasadas"],
                        ["upcoming", "A vencer"],
                        ["done", "Concluídas"],
                      ] as const
                    ).map(([key, label]) => (
                      <Button
                        key={key}
                        type="button"
                        size="sm"
                        variant={filter === key ? "default" : "outline"}
                        className="rounded-lg"
                        onClick={() => setFilter(key)}
                      >
                        {label}
                      </Button>
                    ))}
                  </div>
                </div>
              </InfoCard>

              <PageSection
                title="Agenda de reavaliações"
                description={`${filtered.length} registro${filtered.length === 1 ? "" : "s"}`}
                contentClassName="p-0"
              >
                {filtered.length === 0 ? (
                  <EmptyState
                    icon={RefreshCw}
                    title={q ? "Nenhuma reavaliação encontrada" : "Nenhuma reavaliação agendada"}
                    description={
                      q
                        ? "Tente outro nome ou limpe a busca."
                        : "As reavaliações são agendadas automaticamente conforme a periodicidade do paciente."
                    }
                    className="py-12"
                  />
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {filtered.map((item) => (
                      <ScheduleRowItem
                        key={item.id}
                        item={item}
                        today={today}
                        selected={selectedId === item.id}
                        onSelect={() => setSelectedId(item.id)}
                      />
                    ))}
                  </ul>
                )}
              </PageSection>
            </div>

            <div className="min-w-0">
              {selected ? (
                <ReassessmentWorkspace schedule={selected} onClose={() => setSelectedId(null)} />
              ) : (
                <EmptyState
                  icon={RefreshCw}
                  title="Selecione uma reavaliação"
                  description="Escolha um paciente na lista para abrir o comparativo evolutivo, resumo, timeline, gráficos e wizard de registro."
                  className="min-h-[420px] py-16"
                />
              )}
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}

function ScheduleRowItem({
  item,
  today,
  selected,
  onSelect,
}: {
  item: ScheduleRow;
  today: Date;
  selected: boolean;
  onSelect: () => void;
}) {
  const isDone = !!item.completed_at;
  const isOverdue = !isDone && new Date(item.scheduled_for) < today;

  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          "flex w-full flex-wrap items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors hover:bg-slate-50",
          selected && "bg-primary/5 ring-1 ring-inset ring-primary/20",
          clinical.focusRing,
        )}
      >
        <div className="min-w-0">
          <p className="truncate font-semibold text-sm text-slate-900">
            {item.patients?.nome_completo ?? "—"}
          </p>
          <p className="text-xs text-muted-foreground">
            {isDone
              ? `Concluída · ${fmtDate(item.completed_at!)}`
              : `Agendada para ${fmtDate(item.scheduled_for)} · ${item.interval_days}d`}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {isOverdue && <StatusBadge variant="danger">Atrasada</StatusBadge>}
          {!isDone && !isOverdue && <StatusBadge variant="warning">Agendada</StatusBadge>}
          {isDone && <StatusBadge variant="success">Concluída</StatusBadge>}
          <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden />
        </div>
      </button>
    </li>
  );
}

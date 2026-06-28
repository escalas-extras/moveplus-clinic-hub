import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveClinic } from "@/lib/active-clinic";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Stethoscope,
  Search,
  ArrowRight,
  Lock,
  Clock,
  Activity,
  LayoutGrid,
  List,
  TrendingUp,
  Minus,
  TrendingDown,
} from "lucide-react";
import {
  AppShell,
  ClinicalDataTable,
  ClinicalSkeleton,
  EmptyState,
  InfoCard,
  KpiCard,
  KpiGrid,
  PageHeader,
  PageSection,
  PatientRecordLink,
  QueryErrorState,
  SearchField,
  StatusBadge,
} from "@/components/layout";
import { fmtDate } from "@/lib/format";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/_authenticated/app/evolucoes")({
  component: EvolucoesPage,
});

type EvolutionRow = {
  id: string;
  data: string;
  hora: string;
  sessao_numero: number | null;
  locked_at: string | null;
  patient_id: string;
  eva: number | null;
  procedimentos: string | null;
  conduta: string | null;
  resposta_paciente: string | null;
  evolucao_observada: string | null;
  sinais_vitais: Record<string, unknown> | null;
  patients: { nome_completo: string } | null;
  professionals: { nome: string } | null;
};

type ViewMode = "timeline" | "lista";

function getIndicator(row: EvolutionRow): "melhorou" | "estavel" | "piorou" | null {
  const v = row.sinais_vitais?.indicador_evolucao;
  if (v === "melhorou" || v === "estavel" || v === "piorou") return v;
  return null;
}

function EvolucoesPage() {
  const { clinicId } = useActiveClinic();
  const [q, setQ] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("timeline");

  const { data: items = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["evolucoes-list", clinicId],
    enabled: !!clinicId,
    queryFn: async () => {
      const { data } = await supabase
        .from("evolutions")
        .select(
          "id, data, hora, sessao_numero, locked_at, patient_id, eva, procedimentos, conduta, resposta_paciente, evolucao_observada, sinais_vitais, patients(nome_completo), professionals(nome)",
        )
        .eq("clinic_id", clinicId!)
        .order("data", { ascending: false })
        .order("hora", { ascending: false })
        .limit(200);
      return (data ?? []) as EvolutionRow[];
    },
  });

  const filtered = useMemo(() => {
    const s = q.toLowerCase().trim();
    if (!s) return items;
    return items.filter((a) => {
      const hay = [
        a.patients?.nome_completo,
        a.professionals?.nome,
        a.procedimentos,
        a.conduta,
        a.resposta_paciente,
        a.evolucao_observada,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(s);
    });
  }, [items, q]);

  const kpis = useMemo(() => {
    return {
      total: items.length,
      assinadas: items.filter((a) => a.locked_at).length,
      pendentes: items.filter((a) => !a.locked_at).length,
    };
  }, [items]);

  const timelineSorted = useMemo(
    () =>
      [...filtered].sort((a, b) => {
        const da = `${a.data}T${a.hora ?? "00:00"}`;
        const db = `${b.data}T${b.hora ?? "00:00"}`;
        return db.localeCompare(da);
      }),
    [filtered],
  );

  return (
    <AppShell clinical>
      <PageHeader
        icon={Stethoscope}
        eyebrow="Prontuário evolutivo"
        breadcrumbs={[{ label: "Clínica", to: "/app" }, { label: "Evoluções" }]}
        title="Evoluções"
        description="Histórico cronológico de sessões registradas em todos os prontuários."
      />

      {isError ? (
        <QueryErrorState onRetry={() => void refetch()} />
      ) : isLoading ? (
        <ClinicalSkeleton variant="split" kpiCount={3} />
      ) : (
        <>
          <KpiGrid columns={3}>
            <KpiCard icon={Activity} label="Total de evoluções" value={kpis.total} accent="var(--primary)" hideDelta />
            <KpiCard icon={Lock} label="Assinadas" value={kpis.assinadas} accent="#059669" hideDelta />
            <KpiCard icon={Clock} label="Sem assinatura" value={kpis.pendentes} accent="#d97706" hideDelta />
          </KpiGrid>

          <InfoCard icon={Search} title="Pesquisa por texto" description="Busque em paciente, profissional ou conteúdo clínico.">
            <div className="flex flex-wrap items-center gap-3">
              <SearchField
                placeholder="Buscar evoluções…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
                <TabsList className="rounded-xl">
                  <TabsTrigger value="timeline" className="gap-1.5 rounded-lg">
                    <LayoutGrid className="h-4 w-4" />
                    Timeline
                  </TabsTrigger>
                  <TabsTrigger value="lista" className="gap-1.5 rounded-lg">
                    <List className="h-4 w-4" />
                    Lista
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </InfoCard>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
            <PageSection
              icon={Activity}
              title={viewMode === "timeline" ? "Timeline cronológica" : "Lista de evoluções"}
              description={`${filtered.length} registro${filtered.length === 1 ? "" : "s"}`}
              contentClassName={viewMode === "lista" ? "p-0" : undefined}
            >
              {filtered.length === 0 ? (
                <EmptyState
                  icon={Stethoscope}
                  title={q ? "Nenhuma evolução encontrada" : "Nenhuma evolução registrada"}
                  description={
                    q
                      ? "Ajuste a busca ou limpe o filtro."
                      : "As evoluções são registradas a cada sessão diretamente no prontuário do paciente."
                  }
                  action={!q ? { label: "Ir para pacientes", to: "/app/pacientes" } : undefined}
                  className="py-12"
                />
              ) : viewMode === "timeline" ? (
                <ol className="relative ml-3 space-y-6 before:absolute before:bottom-2 before:left-0 before:top-2 before:w-px before:bg-gradient-to-b before:from-primary/40 before:via-slate-200 before:to-transparent">
                  {timelineSorted.map((a) => (
                    <TimelineItem key={a.id} row={a} />
                  ))}
                </ol>
              ) : (
                <ClinicalDataTable>
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                      <tr>
                        <th className="px-5 py-3 text-left font-bold">Data</th>
                        <th className="hidden px-5 py-3 text-left font-bold sm:table-cell">Hora</th>
                        <th className="px-5 py-3 text-left font-bold">Paciente</th>
                        <th className="hidden px-5 py-3 text-left font-bold md:table-cell">Profissional</th>
                        <th className="hidden px-5 py-3 text-left font-bold sm:table-cell">Sessão</th>
                        <th className="px-5 py-3 text-right font-bold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filtered.map((a) => (
                        <tr key={a.id} className="transition-colors hover:bg-primary/[0.03]">
                          <td className="whitespace-nowrap px-5 py-3.5 tabular-nums font-medium">
                            {a.data ? fmtDate(a.data) : "—"}
                          </td>
                          <td className="hidden px-5 py-3.5 tabular-nums text-muted-foreground sm:table-cell">
                            {a.hora ? String(a.hora).slice(0, 5) : "—"}
                          </td>
                          <td className="px-5 py-3.5">
                            <PatientRecordLink
                              patientId={a.patient_id}
                              name={a.patients?.nome_completo ?? "—"}
                            />
                          </td>
                          <td className="hidden px-5 py-3.5 text-muted-foreground md:table-cell">
                            {a.professionals?.nome ?? "—"}
                          </td>
                          <td className="hidden px-5 py-3.5 tabular-nums sm:table-cell">
                            {a.sessao_numero ? `#${a.sessao_numero}` : "—"}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <StatusBadge variant={a.locked_at ? "success" : "warning"}>
                              {a.locked_at ? "Assinada" : "Sem assinatura"}
                            </StatusBadge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ClinicalDataTable>
              )}
            </PageSection>

            {filtered.length > 0 && (
            <aside>
              <PageSection icon={Clock} title="Histórico recente" description="Últimas sessões registradas.">
                <ul className="divide-y divide-slate-100">
                  {timelineSorted.slice(0, 8).map((a) => (
                    <li key={a.id} className="py-3 first:pt-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-xs font-semibold tabular-nums text-primary">
                            {fmtDate(a.data)} · {String(a.hora).slice(0, 5)}
                          </div>
                          <div className="truncate text-sm font-medium">
                            {a.patients?.nome_completo ?? "—"}
                          </div>
                          <div className="truncate text-xs text-muted-foreground">
                            {a.professionals?.nome ?? "—"}
                            {a.sessao_numero ? ` · Sessão #${a.sessao_numero}` : ""}
                          </div>
                        </div>
                        <IndicatorBadge indicator={getIndicator(a)} />
                      </div>
                      <Link
                        to="/app/pacientes/$id"
                        params={{ id: a.patient_id }}
                        className="mt-1.5 inline-block text-xs font-medium text-primary hover:underline"
                      >
                        Abrir prontuário →
                      </Link>
                    </li>
                  ))}
                </ul>
              </PageSection>
            </aside>
            )}
          </div>
        </>
      )}
    </AppShell>
  );
}

function TimelineItem({ row: a }: { row: EvolutionRow }) {
  const indicator = getIndicator(a);
  const snippet =
    a.evolucao_observada?.slice(0, 120) ||
    a.procedimentos?.slice(0, 120) ||
    a.resposta_paciente?.slice(0, 120) ||
    "—";

  return (
    <li className="relative ml-6">
      <span className="absolute -left-[22px] flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-soft ring-4 ring-white">
        <Activity className="h-4 w-4" />
      </span>
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_12px_32px_-28px_rgba(15,23,42,0.45)] transition-shadow hover:shadow-[0_18px_44px_-32px_rgba(15,23,42,0.55)]">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-primary">
              {fmtDate(a.data)} · {String(a.hora).slice(0, 5)}
              {a.sessao_numero ? ` · Sessão #${a.sessao_numero}` : ""}
            </div>
            <PatientRecordLink
              patientId={a.patient_id}
              name={a.patients?.nome_completo ?? "—"}
              className="mt-1 text-base"
            />
            <p className="text-sm text-muted-foreground">{a.professionals?.nome ?? "—"}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <IndicatorBadge indicator={indicator} />
            {a.eva != null && a.eva > 0 && (
              <StatusBadge variant="neutral">EVA {a.eva}</StatusBadge>
            )}
            <StatusBadge variant={a.locked_at ? "success" : "warning"}>
              {a.locked_at ? "Assinada" : "Sem assinatura"}
            </StatusBadge>
          </div>
        </div>
        <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{snippet}</p>
      </div>
    </li>
  );
}

function IndicatorBadge({ indicator }: { indicator: "melhorou" | "estavel" | "piorou" | null }) {
  if (!indicator) return null;
  const meta = {
    melhorou: { label: "Melhorou", icon: TrendingUp, variant: "success" as const },
    estavel: { label: "Estável", icon: Minus, variant: "info" as const },
    piorou: { label: "Piorou", icon: TrendingDown, variant: "danger" as const },
  }[indicator];
  const Icon = meta.icon;
  return (
    <StatusBadge variant={meta.variant}>
      <Icon className="mr-1 h-3 w-3" />
      {meta.label}
    </StatusBadge>
  );
}

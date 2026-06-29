import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveClinic } from "@/lib/active-clinic";
import { fmtDate } from "@/lib/format";
import {
  LogOut,
  Filter,
  CalendarDays,
  TrendingUp,
  Hash,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AppShell,
  ClinicalSkeleton,
  EmptyState,
  FilterField,
  InfoCard,
  KpiCard,
  KpiGrid,
  PageSection,
  QueryErrorState,
  SearchField,
  SelectableListRow,
  clinical,
} from "@/components/layout";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  DischargeWorkspace,
  computeClinicKpis,
  type PatientListItem,
} from "@/components/discharge-premium";

export const Route = createFileRoute("/_authenticated/app/altas")({
  component: AltasPage,
});

type DischargeRow = {
  id: string;
  data_alta: string;
  motivo: string;
  patient_id: string;
  patients: { nome_completo: string; clinic_id: string } | null;
};

function AltasPage() {
  const { clinicId } = useActiveClinic();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "done">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const pendingQ = useQuery({
    queryKey: ["altas-pending", clinicId],
    enabled: !!clinicId,
    queryFn: async () => {
      const { data } = await supabase
        .from("patients")
        .select("id, nome_completo, data_nascimento, data_alta, situacao, clinic_id")
        .eq("clinic_id", clinicId!)
        .eq("situacao", "ativo")
        .is("data_alta", null)
        .order("nome_completo");
      return (data ?? []) as PatientListItem[];
    },
  });

  const dischargesQ = useQuery({
    queryKey: ["altas-clinic", clinicId],
    enabled: !!clinicId,
    queryFn: async () => {
      const { data } = await supabase
        .from("patient_discharges")
        .select("id, data_alta, motivo, patient_id, patients!inner(nome_completo, clinic_id)")
        .eq("patients.clinic_id", clinicId!)
        .order("data_alta", { ascending: false })
        .limit(200);
      return (data ?? []) as DischargeRow[];
    },
  });

  const statsQ = useQuery({
    queryKey: ["altas-stats", clinicId],
    enabled: !!clinicId,
    queryFn: async () => {
      const { data: discharges } = await supabase
        .from("patient_discharges")
        .select("patient_id, data_alta, motivo, patients!inner(clinic_id)")
        .eq("patients.clinic_id", clinicId!);

      const statsByPatient = new Map<string, { dias: number; sessoes: number }>();
      const sample = (discharges ?? []).slice(0, 40);

      await Promise.all(
        sample.map(async (d) => {
          const pid = d.patient_id;
          const [{ data: assess }, { count: evoCount }] = await Promise.all([
            supabase
              .from("assessments")
              .select("data")
              .eq("clinic_id", clinicId!)
              .eq("patient_id", pid)
              .order("data", { ascending: true })
              .limit(1),
            supabase
              .from("evolutions")
              .select("id", { count: "exact", head: true })
              .eq("clinic_id", clinicId!)
              .eq("patient_id", pid),
          ]);
          const start = assess?.[0]?.data ? new Date(assess[0].data) : new Date(d.data_alta);
          const end = new Date(d.data_alta);
          const dias = Math.max(0, Math.round((end.getTime() - start.getTime()) / 86400000));
          statsByPatient.set(pid, { dias, sessoes: evoCount ?? 0 });
        }),
      );

      return computeClinicKpis(discharges ?? [], statsByPatient);
    },
  });

  const kpis = useMemo(() => {
    const pending = pendingQ.data?.length ?? 0;
    const done = dischargesQ.data?.length ?? 0;
    return {
      altasMes: statsQ.data?.altasMes ?? 0,
      recuperados: statsQ.data?.recuperados ?? 0,
      tempoMedio: statsQ.data?.tempoMedio ?? 0,
      mediaSessoes: statsQ.data?.mediaSessoes ?? 0,
      pending,
      done,
    };
  }, [pendingQ.data, dischargesQ.data, statsQ.data]);

  type ListItem =
    | { kind: "pending"; patient: PatientListItem }
    | { kind: "done"; discharge: DischargeRow };

  const listItems = useMemo((): ListItem[] => {
    const pending: ListItem[] = (pendingQ.data ?? []).map((p) => ({ kind: "pending", patient: p }));
    const done: ListItem[] = (dischargesQ.data ?? []).map((d) => ({ kind: "done", discharge: d }));
    if (filter === "pending") return pending;
    if (filter === "done") return done;
    return [...pending, ...done];
  }, [pendingQ.data, dischargesQ.data, filter]);

  const filtered = useMemo(() => {
    const s = q.toLowerCase().trim();
    if (!s) return listItems;
    return listItems.filter((item) => {
      const name =
        item.kind === "pending"
          ? item.patient.nome_completo
          : item.discharge.patients?.nome_completo ?? "";
      return name.toLowerCase().includes(s);
    });
  }, [listItems, q]);

  const selectedPatient = useMemo((): PatientListItem | null => {
    if (!selectedId) return null;
    const pending = pendingQ.data?.find((p) => p.id === selectedId);
    if (pending) return pending;
    const discharge = dischargesQ.data?.find((d) => d.patient_id === selectedId);
    if (discharge) {
      return {
        id: discharge.patient_id,
        nome_completo: discharge.patients?.nome_completo ?? "—",
        data_nascimento: null,
        data_alta: discharge.data_alta,
        situacao: "inativo",
        clinic_id: clinicId!,
      };
    }
    return null;
  }, [selectedId, pendingQ.data, dischargesQ.data, clinicId]);

  const loading = pendingQ.isLoading || dischargesQ.isLoading;
  const hasError = pendingQ.isError || dischargesQ.isError;

  return (
    <AppShell clinical>
      <PageHeader
        icon={LogOut}
        eyebrow="Encerramento clínico"
        breadcrumbs={[{ label: "Clínica", to: "/app" }, { label: "Altas" }]}
        title="Alta fisioterapêutica"
        description="Encerramento do ciclo clínico com comparativo evolutivo, assistente guiado e documentação."
      />

      {hasError ? (
        <QueryErrorState
          onRetry={() => {
            void pendingQ.refetch();
            void dischargesQ.refetch();
          }}
        />
      ) : loading ? (
        <ClinicalSkeleton variant="split" kpiCount={4} />
      ) : (
        <>
          <KpiGrid columns={4}>
            <KpiCard icon={CalendarDays} label="Altas do mês" value={kpis.altasMes} accent="var(--primary)" hideDelta />
            <KpiCard icon={TrendingUp} label="Pacientes recuperados" value={kpis.recuperados} accent="#059669" hideDelta />
            <KpiCard
              icon={Hash}
              label="Tempo médio de tratamento"
              value={kpis.tempoMedio > 0 ? `${kpis.tempoMedio}d` : "—"}
              accent="#0284c7"
              hideDelta
            />
            <KpiCard icon={Users} label="Média de sessões / paciente" value={kpis.mediaSessoes} accent="#64748b" hideDelta />
          </KpiGrid>

          <div className={cn(clinical.splitLayout, "xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]")}>
            <div className="min-w-0 space-y-4">
              <InfoCard icon={Filter} title="Busca e filtros" description="Pacientes em tratamento ou já com alta registrada.">
                <div className="flex flex-wrap items-end gap-3">
                  <SearchField
                    placeholder="Buscar paciente…"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                  />
                  <FilterField label="Status" className="min-w-[140px]">
                    <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
                      <SelectTrigger className={cn("rounded-xl", clinical.select)}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="pending">Em tratamento</SelectItem>
                        <SelectItem value="done">Com alta</SelectItem>
                      </SelectContent>
                    </Select>
                  </FilterField>
                </div>
              </InfoCard>

              <PageSection
                icon={LogOut}
                title="Pacientes"
                description={`${filtered.length} registro${filtered.length === 1 ? "" : "s"} · ${kpis.pending} aguardando alta`}
                contentClassName="p-0"
              >
                {filtered.length === 0 ? (
                  <EmptyState
                    icon={LogOut}
                    title={q ? "Nenhum paciente encontrado" : "Nenhum paciente na lista"}
                    description={
                      q
                        ? "Tente outro nome ou limpe a busca."
                        : "Pacientes ativos aparecem aqui para processamento de alta."
                    }
                    className="py-12"
                  />
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {filtered.map((item) =>
                      item.kind === "pending" ? (
                        <SelectableListRow
                          key={`p-${item.patient.id}`}
                          title={item.patient.nome_completo}
                          subtitle="Em tratamento · pronto para alta"
                          badge={{ label: "Ativo", variant: "warning" }}
                          selected={selectedId === item.patient.id}
                          onSelect={() => setSelectedId(item.patient.id)}
                        />
                      ) : (
                        <SelectableListRow
                          key={`d-${item.discharge.id}`}
                          title={item.discharge.patients?.nome_completo ?? "—"}
                          subtitle={`Alta em ${fmtDate(item.discharge.data_alta)} · ${item.discharge.motivo}`}
                          badge={{ label: "Alta registrada", variant: "success" }}
                          selected={selectedId === item.discharge.patient_id}
                          onSelect={() => setSelectedId(item.discharge.patient_id)}
                        />
                      ),
                    )}
                  </ul>
                )}
              </PageSection>
            </div>

            <div className="min-w-0">
              {selectedPatient ? (
                <DischargeWorkspace
                  patient={selectedPatient}
                  onClose={() => setSelectedId(null)}
                />
              ) : (
                <EmptyState
                  icon={LogOut}
                  title="Selecione um paciente"
                  description="Escolha um paciente para abrir o assistente de alta, comparativo final, resumo automático e timeline clínica."
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

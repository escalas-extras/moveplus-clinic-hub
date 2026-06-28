import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Plus,
  Users,
  Activity,
  ClipboardList,
  FileText,
  RefreshCw,
  DollarSign,
  Stethoscope,
  X,
  CalendarDays,
  Phone,
  LayoutGrid,
  List,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  AppShell,
  ClinicalDialogBody,
  ClinicalDialogContent,
  ClinicalDialogHeader,
  ClinicalDialogTitle,
  ClinicalSkeleton,
  EmptyState,
  PageSection,
  PrimaryActionButton,
  QueryErrorState,
  SearchField,
  StatusBadge,
} from "@/components/layout";
import { OpsModuleStack } from "@/components/ops";
import { HomeHeroV2 } from "@/components/dashboard";
import {
  PatientCrmCard,
  PatientAvatar,
  patientStatusLabel,
  patientStatusVariant,
  contactOf,
  type ApptSummary,
} from "@/components/patients/PatientCrmCard";
import { PatientCrmFilters, type SortMode, type StatusFilter } from "@/components/patients/PatientCrmFilters";
import { Skeleton } from "@/components/ui/skeleton";
import { PatientForm, type PatientInput } from "@/components/patient-form";
import { fmtDate } from "@/lib/format";
import { useActiveClinic } from "@/lib/active-clinic";
import { useBranding } from "@/lib/branding";
import { safeDeletePatient } from "@/lib/patient-delete";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/pacientes/")({
  component: PacientesPage,
});

type PatientRow = {
  id: string;
  nome_completo: string;
  cpf: string | null;
  data_nascimento: string | null;
  telefone: string | null;
  whatsapp: string | null;
  convenio_nome: string | null;
  situacao: "ativo" | "inativo";
  data_alta: string | null;
  created_at: string;
  updated_at: string;
};

type ViewMode = "cards" | "lista";

type TimelineEntry = {
  id: string;
  date: string;
  kind: "assessment" | "reassessment" | "evolution" | "document" | "financial";
  title: string;
  subtitle?: string;
};

function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function PacientesPage() {
  const qc = useQueryClient();
  const navigate = useNavigate({ from: "/app/pacientes" });
  const { clinicId, isAdmin } = useActiveClinic();
  const brand = useBranding();
  const dateLabel = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [filterStatus, setFilterStatus] = useState<StatusFilter>("ativo");
  const [filterProf, setFilterProf] = useState("all");
  const [filterConvenio, setFilterConvenio] = useState("all");
  const [sort, setSort] = useState<SortMode>("nome_asc");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const monthIso = ymd(startOfMonth(new Date()));
  const todayIso = ymd(new Date());

  const kpis = useQuery({
    queryKey: ["patients-kpis", clinicId, monthIso],
    enabled: !!clinicId,
    queryFn: async () => {
      const cid = clinicId!;
      const [total, novos, emTratamento, altas] = await Promise.all([
        supabase.from("patients").select("id", { count: "exact", head: true }).eq("clinic_id", cid),
        supabase
          .from("patients")
          .select("id", { count: "exact", head: true })
          .eq("clinic_id", cid)
          .gte("created_at", monthIso),
        supabase
          .from("patients")
          .select("id", { count: "exact", head: true })
          .eq("clinic_id", cid)
          .eq("situacao", "ativo")
          .is("data_alta", null),
        supabase
          .from("patients")
          .select("id", { count: "exact", head: true })
          .eq("clinic_id", cid)
          .or("situacao.eq.inativo,data_alta.not.is.null"),
      ]);
      return {
        total: total.count ?? 0,
        novos: novos.count ?? 0,
        emTratamento: emTratamento.count ?? 0,
        altas: altas.count ?? 0,
      };
    },
  });

  const list = useQuery({
    queryKey: ["patients", clinicId, filterStatus],
    enabled: !!clinicId,
    queryFn: async () => {
      let query = supabase.from("patients").select("*").eq("clinic_id", clinicId!);
      if (filterStatus === "ativo") query = query.eq("situacao", "ativo");
      else if (filterStatus === "inativo") query = query.eq("situacao", "inativo");
      else if (filterStatus === "tratamento")
        query = query.eq("situacao", "ativo").is("data_alta", null);
      else if (filterStatus === "alta")
        query = query.or("situacao.eq.inativo,data_alta.not.is.null");
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as PatientRow[];
    },
  });

  const profs = useQuery({
    queryKey: ["professionals-active", clinicId],
    enabled: !!clinicId,
    queryFn: async () =>
      (
        await supabase
          .from("professionals")
          .select("id, nome")
          .eq("clinic_id", clinicId!)
          .eq("situacao", "ativo")
          .order("nome")
      ).data ?? [],
  });

  const profPatientIds = useQuery({
    queryKey: ["patient-ids-by-prof", clinicId, filterProf],
    enabled: !!clinicId && filterProf !== "all",
    queryFn: async () => {
      const cid = clinicId!;
      const [appts, assess, evol] = await Promise.all([
        supabase
          .from("appointments")
          .select("patient_id")
          .eq("clinic_id", cid)
          .eq("professional_id", filterProf),
        supabase
          .from("assessments")
          .select("patient_id")
          .eq("clinic_id", cid)
          .eq("professional_id", filterProf),
        supabase
          .from("evolutions")
          .select("patient_id")
          .eq("clinic_id", cid)
          .eq("professional_id", filterProf),
      ]);
      const ids = new Set<string>();
      for (const row of appts.data ?? []) ids.add(row.patient_id);
      for (const row of assess.data ?? []) ids.add(row.patient_id);
      for (const row of evol.data ?? []) ids.add(row.patient_id);
      return ids;
    },
  });

  const apptSummary = useQuery({
    queryKey: ["patient-appt-summary", clinicId],
    enabled: !!clinicId,
    queryFn: async () => {
      const { data } = await supabase
        .from("appointments")
        .select("patient_id, data, horario, status")
        .eq("clinic_id", clinicId!)
        .order("data")
        .order("horario");
      const map = new Map<string, ApptSummary>();
      for (const a of data ?? []) {
        if (!a.patient_id || !a.data) continue;
        const cur = map.get(a.patient_id) ?? { last: null, next: null };
        const cancelled = a.status === "cancelado";
        if (!cancelled) {
          if (a.data < todayIso || a.status === "realizado") {
            if (!cur.last || a.data > cur.last.data || (a.data === cur.last.data && a.horario > cur.last.horario)) {
              cur.last = { data: a.data, horario: a.horario };
            }
          }
          if (a.data >= todayIso && a.status !== "realizado") {
            if (!cur.next || a.data < cur.next.data || (a.data === cur.next.data && a.horario < cur.next.horario)) {
              cur.next = { data: a.data, horario: a.horario };
            }
          }
        }
        map.set(a.patient_id, cur);
      }
      return map;
    },
  });

  const create = useMutation({
    mutationFn: async (input: PatientInput) => {
      if (!clinicId) throw new Error("Clínica ativa não identificada");
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("patients")
        .insert({ ...input, clinic_id: clinicId, created_by: u.user?.id } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Paciente cadastrado");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["patients"] });
      qc.invalidateQueries({ queryKey: ["patients-kpis"] });
    },
    onError: (e: { message?: string }) => toast.error(e.message ?? "Erro ao cadastrar"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      if (!clinicId) throw new Error("Clínica ativa não identificada");
      return safeDeletePatient({ clinicId, patientId: id });
    },
    onSuccess: (res) => {
      toast.success(
        res.action === "deleted"
          ? "Paciente excluído"
          : "Paciente inativado (histórico clínico preservado)",
      );
      setSelectedId(null);
      qc.invalidateQueries({ queryKey: ["patients"] });
      qc.invalidateQueries({ queryKey: ["patients-kpis"] });
    },
    onError: (e: { message?: string }) => toast.error(e.message ?? "Erro ao excluir"),
  });

  const convenioOptions = useMemo(() => {
    const set = new Set<string>();
    for (const p of list.data ?? []) {
      if (p.convenio_nome?.trim()) set.add(p.convenio_nome.trim());
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [list.data]);

  const filtered = useMemo(() => {
    const search = q.trim().toLowerCase();
    let rows = [...(list.data ?? [])];

    if (search) {
      rows = rows.filter((p) => {
        const hay = [p.nome_completo, p.cpf, p.telefone, p.whatsapp, p.convenio_nome]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(search);
      });
    }

    if (filterProf !== "all" && profPatientIds.data) {
      rows = rows.filter((p) => profPatientIds.data!.has(p.id));
    }

    if (filterConvenio === "particular") {
      rows = rows.filter((p) => !(p.convenio_nome ?? "").trim());
    } else if (filterConvenio !== "all") {
      rows = rows.filter((p) => (p.convenio_nome ?? "").trim() === filterConvenio);
    }

    rows.sort((a, b) => {
      if (sort === "nome_desc") return b.nome_completo.localeCompare(a.nome_completo, "pt-BR");
      if (sort === "recentes")
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sort === "atualizados")
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      return a.nome_completo.localeCompare(b.nome_completo, "pt-BR");
    });

    return rows;
  }, [list.data, q, filterProf, filterConvenio, sort, profPatientIds.data]);

  const selected = useMemo(
    () => filtered.find((p) => p.id === selectedId) ?? null,
    [filtered, selectedId],
  );

  const hasActiveFilters =
    filterStatus !== "ativo" ||
    filterProf !== "all" ||
    filterConvenio !== "all" ||
    q.trim() !== "" ||
    sort !== "nome_asc";

  const loading = list.isLoading || kpis.isLoading;

  return (
    <AppShell clinical>
      <OpsModuleStack className="patients-crm space-y-3 sm:space-y-4">
        <HomeHeroV2
          title="Pacientes"
          clinicName={brand.clinicName}
          dateLabel={dateLabel}
          primaryColor={brand.primaryColor}
          secondaryColor={brand.secondaryColor}
          daySummary={
            !loading && kpis.data
              ? [
                  { label: "ativos", value: kpis.data.emTratamento },
                  { label: "novos este mês", value: kpis.data.novos },
                  { label: "altas recentes", value: kpis.data.altas },
                ]
              : undefined
          }
          actions={
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <PrimaryActionButton className="h-10 gap-2 px-4 text-sm" style={{ background: brand.primaryColor }}>
                  <Plus className="h-4 w-4" />
                  Novo paciente
                </PrimaryActionButton>
              </DialogTrigger>
              <ClinicalDialogContent>
                <ClinicalDialogHeader>
                  <ClinicalDialogTitle>Novo paciente</ClinicalDialogTitle>
                </ClinicalDialogHeader>
                <ClinicalDialogBody>
                  <PatientForm onSubmit={(v) => create.mutate(v)} submitting={create.isPending} />
                </ClinicalDialogBody>
              </ClinicalDialogContent>
            </Dialog>
          }
        />

      {list.isError || kpis.isError ? (
        <QueryErrorState
          onRetry={() => {
            void list.refetch();
            void kpis.refetch();
          }}
        />
      ) : loading ? (
        <ClinicalSkeleton variant="split" kpiCount={3} />
      ) : (
        <>
          <section className="patients-crm-search rounded-2xl border border-[rgba(15,76,92,0.12)] bg-white/90 px-4 py-3.5 shadow-[var(--fos-card-shadow)] sm:px-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <SearchField
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar nome, CPF, telefone ou convênio…"
                wrapperClassName="w-full sm:max-w-none sm:flex-[2]"
                className="h-11 border-[rgba(15,76,92,0.12)] bg-white pl-10 text-base shadow-sm"
                autoFocus
              />
              <div className="flex items-center justify-between gap-3 sm:flex-1 sm:justify-end">
                <p className="text-sm text-slate-600">
                  <span className="font-bold tabular-nums text-[var(--fos-primary)]">{filtered.length}</span>{" "}
                  paciente{filtered.length === 1 ? "" : "s"}
                </p>
                <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
                  <TabsList className="rounded-xl">
                    <TabsTrigger value="cards" className="gap-1.5 rounded-lg">
                      <LayoutGrid className="h-4 w-4" />
                      <span className="hidden sm:inline">Cards</span>
                    </TabsTrigger>
                    <TabsTrigger value="lista" className="gap-1.5 rounded-lg">
                      <List className="h-4 w-4" />
                      <span className="hidden sm:inline">Lista</span>
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>
          </section>

          <PatientCrmFilters
            filterStatus={filterStatus}
            onFilterStatus={setFilterStatus}
            filterProf={filterProf}
            onFilterProf={setFilterProf}
            profs={profs.data ?? []}
            filterConvenio={filterConvenio}
            onFilterConvenio={setFilterConvenio}
            convenioOptions={convenioOptions}
            sort={sort}
            onSort={setSort}
          />

          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_280px] xl:gap-4">
            <div className="min-w-0">
              {!filtered.length ? (
                <EmptyState
                  icon={Users}
                  title={q || hasActiveFilters ? "Nenhum paciente encontrado" : "Nenhum paciente cadastrado ainda"}
                  description={
                    q || hasActiveFilters
                      ? "Ajuste os filtros ou limpe a busca para ver mais resultados."
                      : "Comece cadastrando seu primeiro paciente para abrir prontuários, gerar documentos e agendar atendimentos."
                  }
                  action={
                    !q && !hasActiveFilters
                      ? { label: "Cadastrar primeiro paciente", onClick: () => setOpen(true) }
                      : undefined
                  }
                  className="rounded-2xl border border-[rgba(15,76,92,0.08)] bg-white/80 py-12"
                />
              ) : viewMode === "cards" ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {filtered.map((p) => (
                    <PatientCrmCard
                      key={p.id}
                      patient={p}
                      summary={apptSummary.data?.get(p.id)}
                      selected={selectedId === p.id}
                      isAdmin={isAdmin}
                      onSelect={() => setSelectedId(p.id)}
                      onOpen={() => navigate({ to: "/app/pacientes/$id", params: { id: p.id } })}
                      onDelete={() => remove.mutate(p.id)}
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filtered.map((p) => (
                    <PatientCrmCard
                      key={p.id}
                      layout="row"
                      patient={p}
                      summary={apptSummary.data?.get(p.id)}
                      selected={selectedId === p.id}
                      isAdmin={isAdmin}
                      onSelect={() => setSelectedId(p.id)}
                      onOpen={() => navigate({ to: "/app/pacientes/$id", params: { id: p.id } })}
                      onDelete={() => remove.mutate(p.id)}
                    />
                  ))}
                </div>
              )}
            </div>

            <aside className="min-w-0 space-y-3">
              {selected ? (
                <SelectedPatientPanel
                  patient={selected}
                  summary={apptSummary.data?.get(selected.id)}
                  onClose={() => setSelectedId(null)}
                  onOpen={() => navigate({ to: "/app/pacientes/$id", params: { id: selected.id } })}
                />
              ) : (
                <PageSection
                  icon={Users}
                  title="Detalhes do paciente"
                  description="Selecione um paciente para ver timeline e atalhos."
                  contentClassName="py-6"
                >
                  <EmptyState
                    icon={Users}
                    title="Nenhum paciente selecionado"
                    description="Clique em um card da lista para visualizar o resumo clínico e ações rápidas."
                    className="py-4"
                  />
                </PageSection>
              )}
            </aside>
          </div>
        </>
      )}
      </OpsModuleStack>
    </AppShell>
  );
}

function SelectedPatientPanel({
  patient: p,
  summary,
  onClose,
  onOpen,
}: {
  patient: PatientRow;
  summary?: ApptSummary;
  onClose: () => void;
  onOpen: () => void;
}) {
  const { clinicId } = useActiveClinic();

  const timeline = useQuery({
    queryKey: ["patient-crm-timeline", clinicId, p.id],
    enabled: !!clinicId && !!p.id,
    queryFn: async (): Promise<TimelineEntry[]> => {
      const cid = clinicId!;
      const [assess, evol, reass, docs, financial] = await Promise.all([
        supabase
          .from("assessments")
          .select("id, data, tipo, professionals(nome)")
          .eq("clinic_id", cid)
          .eq("patient_id", p.id)
          .order("data", { ascending: false })
          .limit(5),
        supabase
          .from("evolutions")
          .select("id, data, hora, professionals(nome)")
          .eq("clinic_id", cid)
          .eq("patient_id", p.id)
          .order("data", { ascending: false })
          .limit(5),
        supabase
          .from("reassessment_schedule")
          .select("id, scheduled_for, completed_at")
          .eq("clinic_id", cid)
          .eq("patient_id", p.id)
          .order("scheduled_for", { ascending: false })
          .limit(5),
        supabase
          .from("clinical_documents")
          .select("id, issued_at, doc_type, title")
          .eq("clinic_id", cid)
          .eq("patient_id", p.id)
          .order("issued_at", { ascending: false })
          .limit(5),
        supabase
          .from("financial_entries")
          .select("id, data, valor, status")
          .eq("clinic_id", cid)
          .eq("patient_id", p.id)
          .order("data", { ascending: false })
          .limit(5),
      ]);

      const items: TimelineEntry[] = [];
      for (const a of assess.data ?? []) {
        items.push({
          id: `a-${a.id}`,
          date: a.data,
          kind: a.tipo === "reavaliacao" ? "reassessment" : "assessment",
          title: a.tipo === "reavaliacao" ? "Reavaliação" : "Avaliação",
          subtitle: (a as any).professionals?.nome ?? undefined,
        });
      }
      for (const e of evol.data ?? []) {
        items.push({
          id: `e-${e.id}`,
          date: e.data,
          kind: "evolution",
          title: "Evolução",
          subtitle: (e as any).professionals?.nome ?? undefined,
        });
      }
      for (const r of reass.data ?? []) {
        items.push({
          id: `r-${r.id}`,
          date: r.scheduled_for,
          kind: "reassessment",
          title: r.completed_at ? "Reavaliação concluída" : "Reavaliação agendada",
        });
      }
      for (const d of docs.data ?? []) {
        items.push({
          id: `d-${d.id}`,
          date: (d.issued_at ?? "").slice(0, 10),
          kind: "document",
          title: d.title || `Documento (${d.doc_type})`,
        });
      }
      for (const f of financial.data ?? []) {
        items.push({
          id: `f-${f.id}`,
          date: f.data,
          kind: "financial",
          title: `Financeiro · ${f.status}`,
          subtitle: f.valor != null ? `R$ ${Number(f.valor).toFixed(2)}` : undefined,
        });
      }

      return items
        .filter((i) => i.date)
        .sort((a, b) => (a.date > b.date ? -1 : a.date < b.date ? 1 : 0))
        .slice(0, 8);
    },
  });

  return (
    <div className="space-y-4">
      <PageSection
        icon={Users}
        title={p.nome_completo}
        actions={
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose} aria-label="Fechar">
            <X className="h-4 w-4" />
          </Button>
        }
        contentClassName="space-y-4"
      >
        <div className="flex items-center gap-3">
          <PatientAvatar name={p.nome_completo} size="lg" />
          <div className="min-w-0">
            <StatusBadge variant={patientStatusVariant(p)}>{patientStatusLabel(p)}</StatusBadge>
            <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="h-3.5 w-3.5" />
              {contactOf(p)}
            </p>
            <p className="text-xs text-muted-foreground">{p.convenio_nome ?? "Particular"}</p>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Último atendimento
            </dt>
            <dd className="mt-1 font-medium tabular-nums">
              {summary?.last
                ? `${fmtDate(summary.last.data)} · ${String(summary.last.horario).slice(0, 5)}`
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Próximo atendimento
            </dt>
            <dd className="mt-1 font-medium tabular-nums">
              {summary?.next
                ? `${fmtDate(summary.next.data)} · ${String(summary.next.horario).slice(0, 5)}`
                : "—"}
            </dd>
          </div>
        </dl>

        <Button className="w-full rounded-xl" onClick={onOpen}>
          Abrir prontuário completo
        </Button>
      </PageSection>

      <PageSection icon={Activity} title="Timeline resumida" contentClassName="py-3">
        {timeline.isLoading ? (
          <div className="space-y-2 px-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 rounded-lg" />
            ))}
          </div>
        ) : !timeline.data?.length ? (
          <EmptyState
            icon={ClipboardList}
            title="Sem eventos ainda"
            description="Registre avaliações, evoluções ou documentos no prontuário."
            action={{ label: "Abrir prontuário", onClick: onOpen }}
            className="py-6"
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {timeline.data.map((item) => (
              <TimelineRow key={item.id} item={item} />
            ))}
          </ul>
        )}
      </PageSection>

      <PageSection icon={Stethoscope} title="Ações rápidas" contentClassName="py-4">
        <div className="grid grid-cols-2 gap-2">
          <QuickLink icon={ClipboardList} label="Prontuário" to="/app/pacientes/$id" params={{ id: p.id }} />
          <QuickLink icon={CalendarDays} label="Agenda" to="/app/agenda" />
          <QuickLink icon={Activity} label="Avaliação" to="/app/pacientes/$id" params={{ id: p.id }} />
          <QuickLink icon={DollarSign} label="Financeiro" to="/app/financeiro" />
        </div>
      </PageSection>
    </div>
  );
}

const TIMELINE_META: Record<
  TimelineEntry["kind"],
  { icon: LucideIcon; variant: "success" | "warning" | "info" | "neutral" }
> = {
  assessment: { icon: ClipboardList, variant: "info" },
  reassessment: { icon: RefreshCw, variant: "warning" },
  evolution: { icon: Activity, variant: "success" },
  document: { icon: FileText, variant: "neutral" },
  financial: { icon: DollarSign, variant: "info" },
};

function TimelineRow({ item }: { item: TimelineEntry }) {
  const meta = TIMELINE_META[item.kind];
  const Icon = meta.icon;
  return (
    <li className="flex items-start gap-3 px-1 py-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{item.title}</span>
          <StatusBadge variant={meta.variant} className="text-[10px]">
            {fmtDate(item.date)}
          </StatusBadge>
        </div>
        {item.subtitle && (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{item.subtitle}</p>
        )}
      </div>
    </li>
  );
}

function QuickLink({
  icon: Icon,
  label,
  to,
  params,
  className,
}: {
  icon: LucideIcon;
  label: string;
  to: string;
  params?: Record<string, string>;
  className?: string;
}) {
  return (
    <Link
      to={to as any}
      params={params as any}
      className={cn(
        "flex items-center gap-2 rounded-xl border border-slate-200/80 bg-slate-50/60 px-3 py-2.5 text-sm font-medium transition-colors hover:border-primary/30 hover:bg-primary/5",
        className,
      )}
    >
      <Icon className="h-4 w-4 text-primary" />
      {label}
    </Link>
  );
}

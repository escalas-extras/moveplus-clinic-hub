import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  UserCircle2,
  Pencil,
  CheckCircle2,
  XCircle,
  CalendarDays,
  Search,
  Clock,
  GripVertical,
  X,
  Activity,
} from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { fmtDate } from "@/lib/format";
import { useActiveClinic } from "@/lib/active-clinic";
import {
  AppShell,
  ClinicalField,
  ClinicalSkeleton,
  ClinicalDialogBody,
  ClinicalDialogContent,
  ClinicalDialogFooter,
  ClinicalDialogHeader,
  ClinicalDialogTitle,
  EmptyState,
  FilterField,
  FormFooter,
  FormGrid,
  PageSection,
  QueryErrorState,
  SearchField,
  SecondaryActionButton,
  StatusBadge,
  clinical,
  InfoCard,
} from "@/components/layout";
import {
  PageHero,
  ModuleStack,
  PageToolbar,
  OperationalCard,
  OperationalCardsGrid,
  ActionButton,
} from "@/components/ui-system";
import { AgendaSidePanel } from "@/components/agenda/AgendaSidePanel";
import { useBranding } from "@/lib/branding";
import { cn } from "@/lib/utils";
import { SupportGuardButton, SupportGuardClickable } from "@/components/support-guard";

export const Route = createFileRoute("/_authenticated/app/agenda")({
  component: AgendaPage,
});

type Form = {
  patient_id: string;
  professional_id: string;
  data: string;
  horario: string;
  duracao_min: number;
  status: Status;
  tipo?: string;
  observacao?: string;
};
type ViewMode = "dia" | "semana" | "mes";
type Status = "agendado" | "confirmado" | "realizado" | "cancelado";

type Appt = {
  id: string;
  data: string;
  horario: string;
  duracao_min: number;
  status: Status | string;
  observacao: string | null;
  patient_id: string;
  professional_id: string;
  patients: { nome_completo: string } | null;
  professionals: { nome: string } | null;
};

const STATUS_LABEL: Record<Status, string> = {
  agendado: "Pendente",
  confirmado: "Confirmado",
  realizado: "Realizado",
  cancelado: "Cancelado",
};

const STATUS_VARIANT: Record<Status, "success" | "warning" | "danger" | "info" | "neutral"> = {
  confirmado: "success",
  agendado: "warning",
  realizado: "info",
  cancelado: "danger",
};

const STATUS_CLASS: Record<Status, string> = {
  confirmado:
    "border-l-emerald-500 bg-emerald-50/95 text-emerald-900 ring-emerald-200/70 hover:bg-emerald-50 hover:shadow-[0_4px_14px_-6px_rgba(16,185,129,0.35)]",
  agendado:
    "border-l-amber-500 bg-amber-50/95 text-amber-900 ring-amber-200/70 hover:bg-amber-50 hover:shadow-[0_4px_14px_-6px_rgba(245,158,11,0.35)]",
  realizado:
    "border-l-sky-500 bg-sky-50/95 text-sky-900 ring-sky-200/70 hover:bg-sky-50 hover:shadow-[0_4px_14px_-6px_rgba(14,165,233,0.35)]",
  cancelado:
    "border-l-rose-500 bg-rose-50/90 text-rose-800 ring-rose-200/60 opacity-95 hover:opacity-100 hover:shadow-[0_4px_14px_-6px_rgba(244,63,94,0.25)]",
};

const ALL_STATUSES: Status[] = ["confirmado", "agendado", "realizado", "cancelado"];
const DND_MIME = "application/x-moveplus-agenda-appt";

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function currentHHMM() {
  const n = new Date();
  return `${String(n.getHours()).padStart(2, "0")}:${String(n.getMinutes()).padStart(2, "0")}`;
}
function startOfWeek(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - x.getDay());
  return x;
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function translateError(msg?: string): string {
  if (!msg) return "Não foi possível salvar. Tente novamente.";
  const m = msg.toLowerCase();
  if (m.includes("modo suporte"))
    return "Modo Suporte ativo: somente leitura. Encerre a sessão para fazer alterações.";
  if (m.includes("row-level security") || m.includes("permission"))
    return "Você não tem permissão para alterar este agendamento.";
  if (m.includes("locked") || m.includes("bloqueado"))
    return "Registro bloqueado: não pode ser alterado.";
  if (m.includes("limite contratado")) return msg;
  return msg;
}

function AgendaPage() {
  const qc = useQueryClient();
  const { clinicId, supportMode } = useActiveClinic();
  const brand = useBranding();
  const todayIso = ymd(new Date());
  const dateLabel = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const [view, setView] = useState<ViewMode>("dia");
  const [anchor, setAnchor] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [open, setOpen] = useState(false);
  const [slotPrefill, setSlotPrefill] = useState<{ data: string; horario: string } | null>(null);
  const [filterProf, setFilterProf] = useState<string>("all");
  const [filterPatient, setFilterPatient] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<Status | "all">("all");
  const [search, setSearch] = useState("");
  const [selectedAppt, setSelectedAppt] = useState<Appt | null>(null);
  const [editing, setEditing] = useState<Appt | null>(null);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const { rangeStart, rangeEnd } = useMemo(() => {
    if (view === "dia") return { rangeStart: anchor, rangeEnd: anchor };
    if (view === "semana") {
      const s = startOfWeek(anchor);
      return { rangeStart: s, rangeEnd: addDays(s, 6) };
    }
    return { rangeStart: startOfMonth(anchor), rangeEnd: endOfMonth(anchor) };
  }, [view, anchor]);

  const list = useQuery({
    queryKey: ["appts", clinicId, ymd(rangeStart), ymd(rangeEnd)],
    enabled: !!clinicId,
    queryFn: async () => {
      const { data } = await supabase
        .from("appointments")
        .select(
          "id, data, horario, duracao_min, status, observacao, patient_id, professional_id, patients(nome_completo), professionals(nome)",
        )
        .eq("clinic_id", clinicId!)
        .gte("data", ymd(rangeStart))
        .lte("data", ymd(rangeEnd))
        .order("data")
        .order("horario");
      return (data ?? []) as Appt[];
    },
  });

  const patients = useQuery({
    queryKey: ["patients-all", clinicId],
    enabled: !!clinicId,
    queryFn: async () =>
      (
        await supabase
          .from("patients")
          .select("id, nome_completo")
          .eq("clinic_id", clinicId!)
          .order("nome_completo")
      ).data ?? [],
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

  const create = useMutation({
    mutationFn: async (v: Form) => {
      if (!clinicId) throw new Error("Clínica ativa não identificada.");
      if (supportMode)
        throw new Error("Modo Suporte ativo: somente leitura. Encerre a sessão para fazer alterações.");
      if (!v.patient_id || !v.professional_id || !v.data || !v.horario) {
        throw new Error("Preencha paciente, profissional, data e horário.");
      }
      const { data: u } = await supabase.auth.getUser();
      const tipo = (v.tipo ?? "Atendimento").trim();
      const observacao =
        [tipo && `Tipo: ${tipo}`, v.observacao?.trim()].filter(Boolean).join("\n") || null;
      const payload = {
        clinic_id: clinicId,
        patient_id: v.patient_id,
        professional_id: v.professional_id,
        data: v.data || null,
        horario: v.horario,
        duracao_min: Number.isFinite(Number(v.duracao_min)) ? Number(v.duracao_min) : 60,
        status: v.status ?? "agendado",
        observacao,
        created_by: u.user?.id ?? null,
      };
      const { error } = await supabase.from("appointments").insert(payload as any).select("id").single();
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Agendamento criado");
      setOpen(false);
      setSlotPrefill(null);
      qc.invalidateQueries({ queryKey: ["appts", clinicId] });
    },
    onError: (e: { message?: string }) => toast.error(translateError(e?.message)),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Status }) => {
      if (!clinicId) throw new Error("Clínica ativa não identificada.");
      const { error } = await supabase
        .from("appointments")
        .update({ status: status as any })
        .eq("id", id)
        .eq("clinic_id", clinicId);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      toast.success(`Marcado como ${STATUS_LABEL[v.status]}`);
      qc.invalidateQueries({ queryKey: ["appts", clinicId] });
      setSelectedAppt((prev) => (prev?.id === v.id ? { ...prev, status: v.status } : prev));
    },
    onError: (e: { message?: string }) => toast.error(translateError(e?.message)),
  });

  const update = useMutation({
    mutationFn: async (v: Form & { id: string; status: Status }) => {
      if (!clinicId) throw new Error("Clínica ativa não identificada.");
      if (supportMode)
        throw new Error("Modo Suporte ativo: somente leitura. Encerre a sessão para fazer alterações.");
      if (!v.patient_id || !v.professional_id || !v.data || !v.horario) {
        throw new Error("Preencha paciente, profissional, data e horário.");
      }
      const { id, status, tipo: _tipo, ...rest } = v;
      const payload = {
        ...rest,
        data: rest.data || null,
        horario: rest.horario,
        observacao: rest.observacao?.trim() || null,
        duracao_min: Number.isFinite(Number(rest.duracao_min)) ? Number(rest.duracao_min) : 60,
        status: status as any,
      };
      const { error } = await supabase
        .from("appointments")
        .update(payload as any)
        .eq("id", id)
        .eq("clinic_id", clinicId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Agendamento atualizado");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["appts", clinicId] });
    },
    onError: (e: { message?: string }) => toast.error(translateError(e?.message)),
  });

  const reschedule = useMutation({
    mutationFn: async ({ id, data, horario }: { id: string; data: string; horario: string }) => {
      if (!clinicId) throw new Error("Clínica ativa não identificada.");
      if (supportMode)
        throw new Error("Modo Suporte ativo: somente leitura. Encerre a sessão para fazer alterações.");
      const { error } = await supabase
        .from("appointments")
        .update({ data, horario })
        .eq("id", id)
        .eq("clinic_id", clinicId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Horário remarcado");
      qc.invalidateQueries({ queryKey: ["appts", clinicId] });
    },
    onError: (e: { message?: string }) => toast.error(translateError(e?.message)),
  });

  function openNewSlot(dateStr: string, hour?: number) {
    if (supportMode) {
      toast.error("Modo Suporte ativo: somente leitura. Encerre a sessão para fazer alterações.");
      return;
    }
    const horario = hour != null ? `${String(hour).padStart(2, "0")}:00` : "08:00";
    setSlotPrefill({ data: dateStr, horario });
    setOpen(true);
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (list.data ?? []).filter((a) => {
      if (filterProf !== "all" && a.professional_id !== filterProf) return false;
      if (filterPatient !== "all" && a.patient_id !== filterPatient) return false;
      if (filterStatus !== "all" && a.status !== filterStatus) return false;
      if (q) {
        const hay = [a.patients?.nome_completo, a.professionals?.nome, a.observacao]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [list.data, filterProf, filterPatient, filterStatus, search]);

  const todayAppointments = useMemo(
    () => filtered.filter((a) => a.data === todayIso),
    [filtered, todayIso],
  );

  const daySummary = useMemo(() => {
    const todays = todayAppointments;
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const emAndamento = todays.filter((a) => {
      if (a.status === "cancelado" || a.status === "realizado") return false;
      const [h, m] = String(a.horario).slice(0, 5).split(":").map(Number);
      const start = h * 60 + (m || 0);
      const end = start + (a.duracao_min || 30);
      return nowMin >= start && nowMin < end;
    }).length;
    return {
      total: todays.length,
      confirmado: todays.filter((a) => a.status === "confirmado").length,
      agendado: todays.filter((a) => a.status === "agendado").length,
      cancelado: todays.filter((a) => a.status === "cancelado").length,
      emAndamento,
    };
  }, [todayAppointments]);

  const agendaSideData = useMemo(() => {
    const nowStr = currentHHMM();
    const upcoming = todayAppointments
      .filter(
        (a) =>
          a.status !== "cancelado" &&
          a.status !== "realizado" &&
          String(a.horario).slice(0, 5) >= nowStr,
      )
      .sort((x, y) => String(x.horario).localeCompare(String(y.horario)));

    const waiting = todayAppointments
      .filter(
        (a) =>
          (a.status === "agendado" || a.status === "confirmado") &&
          String(a.horario).slice(0, 5) <= nowStr,
      )
      .sort((x, y) => String(x.horario).localeCompare(String(y.horario)));

    const alerts: { id: string; message: string; tone: "warning" | "danger" | "neutral" }[] = [];
    const overdue = todayAppointments.filter(
      (a) => a.status === "agendado" && String(a.horario).slice(0, 5) < nowStr,
    );
    if (overdue.length > 0) {
      alerts.push({
        id: "overdue",
        message: `${overdue.length} atendimento(s) atrasado(s) aguardando confirmação`,
        tone: "danger",
      });
    }
    if (daySummary.cancelado > 0) {
      alerts.push({
        id: "cancelled",
        message: `${daySummary.cancelado} cancelamento(s) registrado(s) hoje`,
        tone: "warning",
      });
    }
    if (daySummary.agendado > 0) {
      alerts.push({
        id: "pending",
        message: `${daySummary.agendado} atendimento(s) pendente(s) de confirmação`,
        tone: "neutral",
      });
    }

    return { upcoming, waiting, alerts };
  }, [todayAppointments, daySummary.agendado, daySummary.cancelado]);

  const mapSideItem = useCallback(
    (a: Appt) => {
      const s = (a.status ?? "agendado") as Status;
      return {
        id: a.id,
        horario: String(a.horario),
        patientName: a.patients?.nome_completo ?? "—",
        professionalName: a.professionals?.nome ?? undefined,
        statusLabel: STATUS_LABEL[s] ?? s,
        statusVariant: STATUS_VARIANT[s] ?? "neutral",
        onSelect: () => setSelectedAppt(a),
      };
    },
    [],
  );

  const selectedFromList = useMemo(() => {
    if (!selectedAppt) return null;
    return filtered.find((a) => a.id === selectedAppt.id) ?? selectedAppt;
  }, [selectedAppt, filtered]);

  function shift(delta: number) {
    if (view === "dia") setAnchor(addDays(anchor, delta));
    else if (view === "semana") setAnchor(addDays(anchor, delta * 7));
    else {
      const d = new Date(anchor);
      d.setMonth(d.getMonth() + delta);
      setAnchor(d);
    }
  }

  const headerLabel = useMemo(() => {
    if (view === "dia") return fmtDate(ymd(anchor));
    if (view === "semana") {
      const s = startOfWeek(anchor);
      const e = addDays(s, 6);
      return `${s.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} — ${e.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}`;
    }
    return anchor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  }, [view, anchor]);

  const handleReschedule = useCallback(
    (id: string, data: string, horario: string) => {
      reschedule.mutate({ id, data, horario });
    },
    [reschedule],
  );

  const hasActiveFilters =
    filterProf !== "all" || filterPatient !== "all" || filterStatus !== "all" || search.trim() !== "";

  return (
    <AppShell clinical>
      <ModuleStack className="agenda-operational space-y-3 sm:space-y-4">
        <PageHero
          title="Agenda"
          clinicName={brand.clinicName}
          dateLabel={dateLabel}
          primaryColor={brand.primaryColor}
          secondaryColor={brand.secondaryColor}
          daySummary={
            !list.isLoading && !list.isError
              ? [
                  { label: "atendimentos hoje", value: daySummary.total },
                  { label: "aguardando", value: agendaSideData.waiting.length },
                  { label: "próximos", value: agendaSideData.upcoming.length },
                ]
              : undefined
          }
          actions={
            <>
              <SupportGuardButton
                supportMode={supportMode}
                onClick={() => openNewSlot(todayIso)}
                tooltip="Modo Suporte ativo — novo agendamento bloqueado"
                className={cn("h-10 gap-2 px-4 text-sm", clinical.btnPrimary)}
                style={{ background: brand.primaryColor }}
              >
                <Plus className="h-4 w-4" />
                Novo atendimento
              </SupportGuardButton>
              <ActionButton variant="secondary"
                className="h-10 px-4 text-sm bg-white/90"
                onClick={() => {
                  const d = new Date();
                  d.setHours(0, 0, 0, 0);
                  setAnchor(d);
                  setView("dia");
                }}
              >
                Hoje
              </ActionButton>
              <ActionButton variant="secondary"
                className="h-10 px-4 text-sm bg-white/90"
                onClick={() => {
                  const d = new Date();
                  d.setHours(0, 0, 0, 0);
                  setAnchor(d);
                  setView("semana");
                }}
              >
                Semana
              </ActionButton>
            </>
          }
        />

      <NewAppointmentDialog
        open={open}
        setOpen={(o: boolean) => {
          setOpen(o);
          if (!o) setSlotPrefill(null);
        }}
        create={create}
        patients={patients.data ?? []}
        profs={profs.data ?? []}
        initialDate={slotPrefill?.data ?? ymd(anchor)}
        initialHora={slotPrefill?.horario ?? "08:00"}
        disabled={supportMode}
      />

      {list.isError ? (
        <QueryErrorState onRetry={() => void list.refetch()} />
      ) : list.isLoading ? (
        <ClinicalSkeleton variant="split" kpiCount={5} />
      ) : (
        <>
          <OperationalCardsGrid className="xl:grid-cols-5">
            <OperationalCard
              static
              compact
              title="Atendimentos hoje"
              icon={CalendarDays}
              value={daySummary.total}
              context="Total programado para hoje"
              to="/app/agenda"
              accent={brand.primaryColor}
            />
            <OperationalCard
              static
              compact
              title="Confirmados"
              icon={CheckCircle2}
              value={daySummary.confirmado}
              context="Pacientes com consulta confirmada"
              to="/app/agenda"
              accent="#059669"
            />
            <OperationalCard
              static
              compact
              title="Em andamento"
              icon={Activity}
              value={daySummary.emAndamento}
              context="Atendimentos no horário atual"
              to="/app/agenda"
              accent={brand.secondaryColor}
            />
            <OperationalCard
              static
              compact
              title="Cancelados"
              icon={XCircle}
              value={daySummary.cancelado}
              context="Cancelamentos registrados hoje"
              to="/app/agenda"
              accent="#e11d48"
            />
            <OperationalCard
              static
              compact
              title="Pendentes"
              icon={Clock}
              value={daySummary.agendado}
              context="Aguardando confirmação"
              to="/app/agenda"
              accent="#d97706"
              alert={daySummary.agendado > 0}
            />
          </OperationalCardsGrid>

          <PageToolbar
            showMobileFilters={showMobileFilters}
            onToggleMobileFilters={() => setShowMobileFilters((v) => !v)}
            hasActiveFilters={hasActiveFilters}
            filterColumns={3}
            toolbar={
              <>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={() => shift(-1)} aria-label="Anterior">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="min-w-[8rem] text-center text-sm font-medium capitalize text-slate-700">
                    {headerLabel}
                  </span>
                  <Button variant="ghost" size="icon" onClick={() => shift(1)} aria-label="Próximo">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                <SearchField
                  className="min-w-[180px] flex-1 sm:max-w-xs"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Pesquisa rápida…"
                />
              </>
            }
            trailing={
              <Tabs value={view} onValueChange={(v) => setView(v as ViewMode)}>
                <TabsList className="rounded-xl">
                  <TabsTrigger value="dia" className="rounded-lg">
                    Dia
                  </TabsTrigger>
                  <TabsTrigger value="semana" className="rounded-lg">
                    Semana
                  </TabsTrigger>
                  <TabsTrigger value="mes" className="rounded-lg">
                    Mês
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            }
          >
              <FilterField label="Profissional">
                <Select value={filterProf} onValueChange={setFilterProf}>
                  <SelectTrigger className={cn("rounded-xl", clinical.select)}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {(profs.data ?? []).map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FilterField>
              <FilterField label="Paciente">
                <Select value={filterPatient} onValueChange={setFilterPatient}>
                  <SelectTrigger className={cn("rounded-xl", clinical.select)}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {(patients.data ?? []).map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nome_completo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FilterField>
              <FilterField label="Status">
                <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as Status | "all")}>
                  <SelectTrigger className={cn("rounded-xl", clinical.select)}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {ALL_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {STATUS_LABEL[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FilterField>
          </PageToolbar>

          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_240px] xl:gap-4">
            <div className="min-w-0">
              {view === "dia" ? (
                <DayView
                  items={filtered}
                  day={ymd(anchor)}
                  onStatus={(id, s) => updateStatus.mutate({ id, status: s })}
                  onEdit={(a) => setEditing(a)}
                  onSelect={(a) => setSelectedAppt(a)}
                  selectedId={selectedAppt?.id}
                  disabled={supportMode}
                  onNew={() => openNewSlot(ymd(anchor))}
                  onSlotClick={(h) => openNewSlot(ymd(anchor), h)}
                  onReschedule={handleReschedule}
                  isRescheduling={reschedule.isPending}
                />
              ) : view === "semana" ? (
                <WeekView
                  items={filtered}
                  weekStart={startOfWeek(anchor)}
                  onPick={(d) => {
                    setAnchor(d);
                    setView("dia");
                  }}
                  onSelect={(a) => setSelectedAppt(a)}
                  onNewOnDay={(d) => openNewSlot(ymd(d))}
                  disabled={supportMode}
                  onReschedule={handleReschedule}
                />
              ) : (
                <MonthView
                  items={filtered}
                  anchor={anchor}
                  onPick={(d) => {
                    setAnchor(d);
                    setView("dia");
                  }}
                />
              )}
            </div>

            <aside className="min-w-0 space-y-2.5">
              {selectedFromList ? (
                <DetailPanel
                  appt={selectedFromList}
                  onClose={() => setSelectedAppt(null)}
                  onEdit={() => setEditing(selectedFromList)}
                  onStatus={(s) => updateStatus.mutate({ id: selectedFromList.id, status: s })}
                  disabled={supportMode}
                />
              ) : null}

              <AgendaSidePanel
                upcoming={agendaSideData.upcoming.map(mapSideItem)}
                waiting={agendaSideData.waiting.map(mapSideItem)}
                alerts={agendaSideData.alerts}
                onSelectItem={(id) => {
                  const appt = filtered.find((a) => a.id === id);
                  if (appt) setSelectedAppt(appt);
                }}
              />

              <InfoCard padded={false} className="overflow-hidden">
                <CalendarPicker
                  mode="single"
                  selected={anchor}
                  onSelect={(d) => d && setAnchor(d)}
                  className="pointer-events-auto mx-auto p-2"
                />
              </InfoCard>
            </aside>
          </div>
        </>
      )}

      <EditAppointmentDialog
        appt={editing}
        onClose={() => setEditing(null)}
        update={update}
        patients={patients.data ?? []}
        profs={profs.data ?? []}
        disabled={supportMode}
      />
      </ModuleStack>
    </AppShell>
  );
}

function DetailPanel({
  appt,
  onClose,
  onEdit,
  onStatus,
  disabled,
}: {
  appt: Appt;
  onClose: () => void;
  onEdit: () => void;
  onStatus: (s: Status) => void;
  disabled: boolean;
}) {
  const s = (appt.status ?? "agendado") as Status;
  return (
    <PageSection
      icon={CalendarDays}
      title="Detalhes do atendimento"
      actions={
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose} aria-label="Fechar">
          <X className="h-4 w-4" />
        </Button>
      }
      contentClassName="space-y-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold tracking-tight">
            {appt.patients?.nome_completo ?? "—"}
          </h3>
          <p className="text-sm text-muted-foreground">{appt.professionals?.nome ?? "—"}</p>
        </div>
        <StatusBadge variant={STATUS_VARIANT[s] ?? "neutral"}>{STATUS_LABEL[s] ?? s}</StatusBadge>
      </div>

      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Data</dt>
          <dd className="mt-1 font-medium">{fmtDate(appt.data)}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Horário</dt>
          <dd className="mt-1 font-medium tabular-nums">{String(appt.horario).slice(0, 5)}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Duração</dt>
          <dd className="mt-1 font-medium">{appt.duracao_min} min</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</dt>
          <dd className="mt-1 font-medium">{STATUS_LABEL[s] ?? s}</dd>
        </div>
      </dl>

      {appt.observacao && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Observação
          </p>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{appt.observacao}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
        {appt.patient_id && (
          <Button asChild variant="outline" size="sm" className="rounded-lg">
            <Link to="/app/pacientes/$id" params={{ id: appt.patient_id }}>
              <UserCircle2 className="mr-2 h-4 w-4" />
              Ver paciente
            </Link>
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          className="rounded-lg"
          disabled={disabled}
          onClick={() => {
            if (disabled)
              return toast.error(
                "Modo Suporte ativo: esta ação é somente leitura. Encerre o modo suporte para editar.",
              );
            onEdit();
          }}
        >
          <Pencil className="mr-2 h-4 w-4" />
          Editar
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="rounded-lg"
          disabled={disabled || s === "confirmado"}
          onClick={() => onStatus("confirmado")}
        >
          Confirmar
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="rounded-lg"
          disabled={disabled || s === "realizado"}
          onClick={() => onStatus("realizado")}
        >
          Realizado
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="rounded-lg text-rose-600 hover:text-rose-700"
          disabled={disabled || s === "cancelado"}
          onClick={() => onStatus("cancelado")}
        >
          Cancelar
        </Button>
      </div>

      {!disabled && (
        <p className="text-xs text-muted-foreground">
          Arraste o atendimento na grade para remarcar horário.
        </p>
      )}
    </PageSection>
  );
}

function DayView({
  items,
  day,
  onStatus,
  onEdit,
  onSelect,
  selectedId,
  disabled,
  onSlotClick,
  onReschedule,
  isRescheduling,
}: {
  items: Appt[];
  day: string;
  onStatus: (id: string, s: Status) => void;
  onEdit: (a: Appt) => void;
  onSelect: (a: Appt) => void;
  selectedId?: string;
  disabled: boolean;
  onNew: () => void;
  onSlotClick: (hour: number) => void;
  onReschedule: (id: string, data: string, horario: string) => void;
  isRescheduling: boolean;
}) {
  const [dragOverHour, setDragOverHour] = useState<number | null>(null);
  const todays = items.filter((a) => a.data === day);
  const hours = Array.from({ length: 14 }, (_, i) => i + 7);

  if (!todays.length) {
    return (
      <PageSection icon={CalendarDays} title="Grade do dia" description={fmtDate(day)}>
        <EmptyState
          icon={CalendarDays}
          title="Agenda livre neste dia"
          description="Clique em um horário vazio abaixo ou crie um novo agendamento."
          action={{ label: "Novo agendamento", onClick: onSlotClick.bind(null, 8) }}
          className="py-10"
        />
        <ul className="mt-4 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200/80">
          {hours.map((h) => (
            <TimeSlotRow
              key={h}
              hour={h}
              day={day}
              isDragOver={dragOverHour === h}
              disabled={disabled || isRescheduling}
              onDragOver={() => setDragOverHour(h)}
              onDragLeave={() => setDragOverHour(null)}
              onDrop={(id) => {
                setDragOverHour(null);
                onReschedule(id, day, `${String(h).padStart(2, "0")}:00`);
              }}
              onEmptyClick={() => onSlotClick(h)}
            />
          ))}
        </ul>
      </PageSection>
    );
  }

  return (
    <PageSection
      icon={CalendarDays}
      title="Grade do dia"
      description={!disabled ? "Arraste atendimentos para remarcar" : fmtDate(day)}
      contentClassName="p-0"
      className="agenda-day-view"
    >
      <ul className="divide-y divide-slate-100/90 overflow-hidden rounded-xl border border-[rgba(15,76,92,0.1)] bg-white/60">
        {hours.map((h) => {
          const slot = todays.filter((a) => Number(String(a.horario).slice(0, 2)) === h);
          return (
            <li
              key={h}
              className={cn(
                "grid min-h-[52px] grid-cols-[48px_minmax(0,1fr)] gap-2 px-2 py-1.5 transition-colors sm:grid-cols-[52px_minmax(0,1fr)] sm:px-3",
                dragOverHour === h && "bg-primary/5",
              )}
              onDragOver={(e) => {
                if (disabled) return;
                e.preventDefault();
                setDragOverHour(h);
              }}
              onDragLeave={() => setDragOverHour(null)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverHour(null);
                if (disabled) return;
                const raw = e.dataTransfer.getData(DND_MIME);
                if (!raw) return;
                try {
                  const { id } = JSON.parse(raw) as { id: string };
                  onReschedule(id, day, `${String(h).padStart(2, "0")}:00`);
                } catch {
                  /* ignore malformed payload */
                }
              }}
            >
              <div className="pt-1.5 text-[11px] font-bold tabular-nums text-slate-500">
                {String(h).padStart(2, "0")}:00
              </div>
              <div className="space-y-1.5">
                {slot.length === 0 ? (
                  <SupportGuardClickable
                    supportMode={disabled}
                    onClick={() => onSlotClick(h)}
                    tooltip="Horário vazio bloqueado no Modo Suporte"
                  >
                    <button
                      type="button"
                      className="h-9 w-full rounded-lg border border-dashed border-slate-200/90 bg-slate-50/40 text-[11px] text-slate-400 transition hover:border-[var(--fos-primary)]/40 hover:bg-[rgba(15,76,92,0.04)] hover:text-[var(--fos-primary)] disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label={`Criar agendamento às ${String(h).padStart(2, "0")}:00`}
                    >
                      + Novo agendamento
                    </button>
                  </SupportGuardClickable>
                ) : (
                  slot.map((a) => (
                    <AppointmentBlock
                      key={a.id}
                      a={a}
                      selected={selectedId === a.id}
                      onStatus={onStatus}
                      onEdit={onEdit}
                      onSelect={onSelect}
                      disabled={disabled}
                    />
                  ))
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </PageSection>
  );
}

function TimeSlotRow({
  hour,
  day,
  isDragOver,
  disabled,
  onDragOver,
  onDragLeave,
  onDrop,
  onEmptyClick,
}: {
  hour: number;
  day: string;
  isDragOver: boolean;
  disabled: boolean;
  onDragOver: () => void;
  onDragLeave: () => void;
  onDrop: (id: string) => void;
  onEmptyClick: () => void;
}) {
  return (
    <li
      className={cn(
        "grid min-h-[56px] grid-cols-[60px_minmax(0,1fr)] gap-3 px-4 py-2 transition-colors",
        isDragOver && "bg-primary/5",
      )}
      onDragOver={(e) => {
        if (disabled) return;
        e.preventDefault();
        onDragOver();
      }}
      onDragLeave={onDragLeave}
      onDrop={(e) => {
        e.preventDefault();
        if (disabled) return;
        const raw = e.dataTransfer.getData(DND_MIME);
        if (!raw) return;
        try {
          const { id } = JSON.parse(raw) as { id: string };
          onDrop(id);
        } catch {
          /* ignore */
        }
      }}
    >
      <div className="pt-2 text-xs font-semibold tabular-nums text-muted-foreground">
        {String(hour).padStart(2, "0")}:00
      </div>
      <SupportGuardClickable
        supportMode={disabled}
        onClick={onEmptyClick}
        tooltip="Horário vazio bloqueado no Modo Suporte"
      >
        <button
          type="button"
          className="w-full rounded-lg border border-dashed border-slate-200 py-2 text-xs text-muted-foreground/70 transition hover:border-primary/40 hover:bg-primary/5 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          {disabled ? "—" : "+ Novo agendamento"}
        </button>
      </SupportGuardClickable>
    </li>
  );
}

function AppointmentBlock({
  a,
  selected,
  onStatus,
  onEdit,
  onSelect,
  disabled,
}: {
  a: Appt;
  selected?: boolean;
  onStatus: (id: string, s: Status) => void;
  onEdit: (a: Appt) => void;
  onSelect: (a: Appt) => void;
  disabled: boolean;
}) {
  const s = (a.status ?? "agendado") as Status;
  return (
    <div
      draggable={!disabled}
      onDragStart={(e) => {
        if (disabled) {
          e.preventDefault();
          return;
        }
        e.dataTransfer.setData(DND_MIME, JSON.stringify({ id: a.id }));
        e.dataTransfer.effectAllowed = "move";
      }}
      className={cn(
        "agenda-appt-block group flex cursor-grab items-start gap-2 rounded-xl border-l-[3px] px-2.5 py-2 ring-1 transition-all duration-200 hover:-translate-y-px active:cursor-grabbing sm:gap-2.5 sm:px-3 sm:py-2.5",
        STATUS_CLASS[s],
        selected && "ring-2 ring-[var(--fos-primary)] ring-offset-1 shadow-sm",
      )}
      onClick={() => onSelect(a)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onSelect(a);
      }}
    >
      {!disabled && (
        <GripVertical className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-30 transition-opacity group-hover:opacity-60" aria-hidden />
      )}
      <div className="w-11 shrink-0 pt-0.5 text-[11px] font-bold tabular-nums sm:w-12 sm:text-xs">
        {String(a.horario).slice(0, 5)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold leading-tight tracking-tight">
          {a.patients?.nome_completo ?? "—"}
        </div>
        <div className="truncate text-[11px] font-medium opacity-75">
          {a.professionals?.nome ?? "—"} · {a.duracao_min} min
        </div>
      </div>
      <StatusBadge variant={STATUS_VARIANT[s] ?? "neutral"} className="shrink-0 text-[10px] sm:inline-flex">
        {STATUS_LABEL[s]}
      </StatusBadge>
      <RowActions a={a} onStatus={onStatus} onEdit={onEdit} disabled={disabled} />
    </div>
  );
}

function RowActions({
  a,
  onStatus,
  onEdit,
  disabled,
}: {
  a: Appt;
  onStatus: (id: string, s: Status) => void;
  onEdit: (a: Appt) => void;
  disabled: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 bg-popover">
        {a.patient_id && (
          <DropdownMenuItem asChild>
            <Link to="/app/pacientes/$id" params={{ id: a.patient_id }}>
              <UserCircle2 className="mr-2 h-4 w-4" /> Ver paciente
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          onClick={() => {
            if (disabled)
              return toast.error(
                "Modo Suporte ativo: esta ação é somente leitura. Encerre o modo suporte para editar.",
              );
            onEdit(a);
          }}
          className={cn("cursor-pointer", disabled && "cursor-not-allowed opacity-50")}
        >
          <Pencil className="mr-2 h-4 w-4" /> Editar
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            if (disabled)
              return toast.error(
                "Modo Suporte ativo: esta ação é somente leitura. Encerre o modo suporte para editar.",
              );
            onStatus(a.id, "confirmado");
          }}
          className={cn("cursor-pointer", disabled && "cursor-not-allowed opacity-50")}
        >
          Marcar como Confirmado
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            if (disabled)
              return toast.error(
                "Modo Suporte ativo: esta ação é somente leitura. Encerre o modo suporte para editar.",
              );
            onStatus(a.id, "realizado");
          }}
          className={cn("cursor-pointer", disabled && "cursor-not-allowed opacity-50")}
        >
          <CheckCircle2 className="mr-2 h-4 w-4" /> Marcar como Realizado
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            if (disabled)
              return toast.error(
                "Modo Suporte ativo: esta ação é somente leitura. Encerre o modo suporte para editar.",
              );
            onStatus(a.id, "cancelado");
          }}
          className={cn("cursor-pointer text-rose-600", disabled && "cursor-not-allowed opacity-50")}
        >
          <XCircle className="mr-2 h-4 w-4" /> Cancelar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function WeekView({
  items,
  weekStart,
  onPick,
  onSelect,
  onNewOnDay,
  disabled,
  onReschedule,
}: {
  items: Appt[];
  weekStart: Date;
  onPick: (d: Date) => void;
  onSelect: (a: Appt) => void;
  onNewOnDay: (d: Date) => void;
  disabled: boolean;
  onReschedule: (id: string, data: string, horario: string) => void;
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = ymd(new Date());
  const [dragOverDay, setDragOverDay] = useState<string | null>(null);

  return (
    <PageSection icon={CalendarDays} title="Visão semanal" description="Arraste para remarcar em outro dia">
      <div className="overflow-x-auto rounded-xl border border-slate-200/80">
        <div className="min-w-[640px]">
          <div className="grid grid-cols-7 border-b bg-slate-50 text-xs">
            {days.map((d) => {
              const key = ymd(d);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onPick(d)}
                  className={cn(
                    "px-2 py-2 text-left transition hover:bg-slate-100",
                    key === today && "bg-primary/10",
                  )}
                >
                  <div className="uppercase tracking-wider text-muted-foreground">
                    {d.toLocaleDateString("pt-BR", { weekday: "short" })}
                  </div>
                  <div className="text-lg font-semibold tabular-nums">{d.getDate()}</div>
                </button>
              );
            })}
          </div>
          <div className="grid min-h-[420px] grid-cols-7 divide-x divide-slate-100">
            {days.map((d) => {
              const key = ymd(d);
              const dayItems = items
                .filter((a) => a.data === key)
                .sort((x, y) => String(x.horario).localeCompare(String(y.horario)));
              return (
                <div
                  key={key}
                  className={cn(
                    "space-y-1.5 p-2 transition-colors",
                    dragOverDay === key && "bg-primary/5",
                  )}
                  onDragOver={(e) => {
                    if (disabled) return;
                    e.preventDefault();
                    setDragOverDay(key);
                  }}
                  onDragLeave={() => setDragOverDay(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOverDay(null);
                    if (disabled) return;
                    const raw = e.dataTransfer.getData(DND_MIME);
                    if (!raw) return;
                    try {
                      const { id, horario } = JSON.parse(raw) as { id: string; horario?: string };
                      onReschedule(id, key, horario ?? "08:00");
                    } catch {
                      /* ignore */
                    }
                  }}
                >
                  {dayItems.map((a) => {
                    const s = (a.status ?? "agendado") as Status;
                    return (
                      <div
                        key={a.id}
                        draggable={!disabled}
                        onDragStart={(e) => {
                          if (disabled) {
                            e.preventDefault();
                            return;
                          }
                          e.dataTransfer.setData(
                            DND_MIME,
                            JSON.stringify({ id: a.id, horario: String(a.horario).slice(0, 5) }),
                          );
                          e.dataTransfer.effectAllowed = "move";
                        }}
                        className={cn(
                          "w-full cursor-grab rounded-lg border-l-4 px-2 py-1.5 ring-1 active:cursor-grabbing",
                          STATUS_CLASS[s],
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => onSelect(a)}
                          className="w-full text-left"
                        >
                          <div className="text-[11px] font-semibold tabular-nums">
                            {String(a.horario).slice(0, 5)}
                          </div>
                          <div className="truncate text-xs font-medium">
                            {a.patients?.nome_completo ?? "—"}
                          </div>
                          <div className="truncate text-[10px] opacity-80">
                            {a.professionals?.nome ?? ""}
                          </div>
                        </button>
                      </div>
                    );
                  })}
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onNewOnDay(d)}
                    className="w-full rounded-lg border border-dashed border-slate-200 py-1.5 text-[11px] text-muted-foreground/70 transition hover:border-primary/40 hover:bg-primary/5 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    + Novo
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </PageSection>
  );
}

function MonthView({
  items,
  anchor,
  onPick,
}: {
  items: Appt[];
  anchor: Date;
  onPick: (d: Date) => void;
}) {
  const first = startOfMonth(anchor);
  const gridStart = startOfWeek(first);
  const today = ymd(new Date());
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const counts = new Map<string, number>();
  for (const a of items) counts.set(a.data, (counts.get(a.data) ?? 0) + 1);

  return (
    <PageSection icon={CalendarDays} title="Visão mensal" description="Clique em um dia para detalhar">
      <div className="overflow-x-auto rounded-xl border border-slate-200/80">
        <div className="min-w-[560px]">
          <div className="grid grid-cols-7 border-b bg-slate-50 text-[11px] uppercase tracking-wider text-muted-foreground">
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
              <div key={d} className="px-2 py-2 text-center font-semibold">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 grid-rows-6">
            {cells.map((d) => {
              const key = ymd(d);
              const inMonth = d.getMonth() === anchor.getMonth();
              const count = counts.get(key) ?? 0;
              const isToday = key === today;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onPick(d)}
                  className={cn(
                    "min-h-[88px] border-b border-r border-slate-100 p-2 text-left transition hover:bg-slate-50",
                    !inMonth && "bg-slate-50/80 text-muted-foreground/50",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        "inline-flex h-7 w-7 items-center justify-center rounded-full text-sm tabular-nums",
                        isToday && "bg-primary font-semibold text-primary-foreground",
                      )}
                    >
                      {d.getDate()}
                    </span>
                    {count > 0 && (
                      <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                        {count}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </PageSection>
  );
}

function NewAppointmentDialog({
  open,
  setOpen,
  create,
  patients,
  profs,
  initialDate,
  initialHora,
  disabled,
}: {
  open: boolean;
  setOpen: (o: boolean) => void;
  create: { mutate: (v: Form) => void; isPending: boolean };
  patients: { id: string; nome_completo: string }[];
  profs: { id: string; nome: string }[];
  initialDate: string;
  initialHora: string;
  disabled: boolean;
}) {
  const { register, handleSubmit, setValue, watch, reset } = useForm<Form>({
    defaultValues: {
      data: initialDate,
      horario: initialHora ?? "08:00",
      duracao_min: 60,
      status: "agendado",
      tipo: "Atendimento",
    },
  });
  const patient_id = watch("patient_id");
  const professional_id = watch("professional_id");
  const status = watch("status") ?? "agendado";

  useEffect(() => {
    if (open) {
      reset({
        patient_id: "" as any,
        professional_id: "" as any,
        data: initialDate,
        horario: initialHora ?? "08:00",
        duracao_min: 60,
        status: "agendado",
        tipo: "Atendimento",
        observacao: "",
      });
    }
  }, [open, initialDate, initialHora, reset]);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <ClinicalDialogContent>
        <ClinicalDialogHeader>
          <ClinicalDialogTitle>Novo agendamento</ClinicalDialogTitle>
        </ClinicalDialogHeader>
        <ClinicalDialogBody>
        <form onSubmit={handleSubmit((v) => create.mutate(v))} className="space-y-4">
          <FormGrid>
            <ClinicalField label="Paciente" required filled={!!patient_id} className="sm:col-span-2">
              <Select
                value={patient_id ?? ""}
                onValueChange={(v) => setValue("patient_id", v)}
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome_completo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </ClinicalField>
            <ClinicalField label="Profissional" required filled={!!professional_id} className="sm:col-span-2">
              <Select
                value={professional_id ?? ""}
                onValueChange={(v) => setValue("professional_id", v)}
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {profs.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </ClinicalField>
            <ClinicalField label="Data" required filled={!!watch("data")}>
              <Input type="date" required {...register("data")} disabled={disabled} />
            </ClinicalField>
            <ClinicalField label="Hora" required filled={!!watch("horario")}>
              <Input type="time" required {...register("horario")} disabled={disabled} />
            </ClinicalField>
            <ClinicalField label="Duração (min)" hint="Intervalos de 15 minutos.">
              <Input
                type="number"
                min={15}
                step={15}
                {...register("duracao_min", { valueAsNumber: true })}
                disabled={disabled}
              />
            </ClinicalField>
            <ClinicalField label="Tipo">
              <Input {...register("tipo")} disabled={disabled} placeholder="Atendimento" />
            </ClinicalField>
            <ClinicalField label="Status">
              <Select
                value={status}
                onValueChange={(v) => setValue("status", v as Status)}
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALL_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </ClinicalField>
            <ClinicalField label="Observação" optional className="sm:col-span-2">
              <Textarea rows={2} {...register("observacao")} disabled={disabled} />
            </ClinicalField>
          </FormGrid>
          <ClinicalDialogFooter>
            <PrimaryActionButton
              type="submit"
              loading={create.isPending}
              disabled={disabled || !patient_id || !professional_id}
            >
              Agendar
            </PrimaryActionButton>
          </ClinicalDialogFooter>
        </form>
        </ClinicalDialogBody>
      </ClinicalDialogContent>
    </Dialog>
  );
}

function EditAppointmentDialog({
  appt,
  onClose,
  update,
  patients,
  profs,
  disabled,
}: {
  appt: Appt | null;
  onClose: () => void;
  update: { mutate: (v: Form & { id: string; status: Status }) => void; isPending: boolean };
  patients: { id: string; nome_completo: string }[];
  profs: { id: string; nome: string }[];
  disabled: boolean;
}) {
  const open = !!appt;
  const { register, handleSubmit, setValue, watch, reset } = useForm<Form & { status: Status }>({
    defaultValues: {
      patient_id: "",
      professional_id: "",
      data: "",
      horario: "08:00",
      duracao_min: 60,
      observacao: "",
      status: "agendado",
    },
  });

  useEffect(() => {
    if (appt) {
      reset({
        patient_id: appt.patient_id ?? "",
        professional_id: appt.professional_id ?? "",
        data: appt.data ?? "",
        horario: String(appt.horario ?? "").slice(0, 5),
        duracao_min: Number(appt.duracao_min ?? 60),
        observacao: appt.observacao ?? "",
        status: (appt.status ?? "agendado") as Status,
      });
    }
  }, [appt, reset]);

  const patient_id = watch("patient_id");
  const professional_id = watch("professional_id");
  const status = watch("status");

  function onSubmit(v: Form & { status: Status }) {
    if (!appt) return;
    update.mutate({ ...v, id: appt.id });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o && !update.isPending) onClose();
      }}
    >
      <ClinicalDialogContent className="h-[min(85vh,760px)] w-[min(90vw,720px)]">
        <ClinicalDialogHeader>
          <ClinicalDialogTitle>Editar agendamento</ClinicalDialogTitle>
        </ClinicalDialogHeader>
        <ClinicalDialogBody>
        {disabled && (
          <div className="mb-4 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-amber-200">
            Modo Suporte ativo: somente leitura. Encerre a sessão para fazer alterações.
          </div>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormGrid>
            <ClinicalField label="Paciente" required filled={!!patient_id} className="sm:col-span-2">
              <Select
                value={patient_id ?? ""}
                onValueChange={(v) => setValue("patient_id", v)}
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome_completo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </ClinicalField>
            <ClinicalField label="Profissional" required filled={!!professional_id} className="sm:col-span-2">
              <Select
                value={professional_id ?? ""}
                onValueChange={(v) => setValue("professional_id", v)}
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {profs.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </ClinicalField>
            <ClinicalField label="Data" required filled={!!watch("data")}>
              <Input type="date" required {...register("data")} disabled={disabled} />
            </ClinicalField>
            <ClinicalField label="Hora" required filled={!!watch("horario")}>
              <Input type="time" required {...register("horario")} disabled={disabled} />
            </ClinicalField>
            <ClinicalField label="Duração (min)">
              <Input
                type="number"
                {...register("duracao_min", { valueAsNumber: true })}
                disabled={disabled}
              />
            </ClinicalField>
            <ClinicalField label="Status" className="sm:col-span-2">
              <Select
                value={status}
                onValueChange={(v) => setValue("status", v as Status)}
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["agendado", "confirmado", "realizado", "cancelado"] as Status[]).map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </ClinicalField>
            <ClinicalField label="Observação" optional className="sm:col-span-2">
              <Textarea rows={2} {...register("observacao")} disabled={disabled} />
            </ClinicalField>
          </FormGrid>
          <ClinicalDialogFooter className="justify-end">
            <SecondaryActionButton type="button" onClick={onClose} disabled={update.isPending}>
              Cancelar
            </SecondaryActionButton>
            <PrimaryActionButton
              type="submit"
              loading={update.isPending}
              disabled={disabled || !patient_id || !professional_id}
            >
              Salvar alterações
            </PrimaryActionButton>
          </ClinicalDialogFooter>
        </form>
        </ClinicalDialogBody>
      </ClinicalDialogContent>
    </Dialog>
  );
}

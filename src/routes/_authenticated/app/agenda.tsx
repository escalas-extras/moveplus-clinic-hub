import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Plus, ChevronLeft, ChevronRight, MoreVertical, UserCircle2, Pencil, CheckCircle2, XCircle, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { fmtDate } from "@/lib/format";
import { useActiveClinic } from "@/lib/active-clinic";
import { EmptyState } from "@/components/empty-state";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/agenda")({
  component: AgendaPage,
});

type Form = { patient_id: string; professional_id: string; data: string; horario: string; duracao_min: number; observacao?: string };
type ViewMode = "dia" | "semana" | "mes";
type Status = "agendado" | "confirmado" | "realizado" | "cancelado";

const STATUS_LABEL: Record<Status, string> = {
  agendado: "Pendente",
  confirmado: "Confirmado",
  realizado: "Realizado",
  cancelado: "Cancelado",
};

const STATUS_CLASS: Record<Status, string> = {
  confirmado: "bg-emerald-50 text-emerald-700 ring-emerald-200 border-l-emerald-500",
  agendado:   "bg-amber-50 text-amber-800 ring-amber-200 border-l-amber-500",
  realizado:  "bg-sky-50 text-sky-700 ring-sky-200 border-l-sky-500",
  cancelado:  "bg-rose-50 text-rose-700 ring-rose-200 border-l-rose-500",
};

const STATUS_DOT: Record<Status, string> = {
  confirmado: "bg-emerald-500",
  agendado:   "bg-amber-500",
  realizado:  "bg-sky-500",
  cancelado:  "bg-rose-500",
};

const ALL_STATUSES: Status[] = ["confirmado", "agendado", "realizado", "cancelado"];

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function startOfWeek(d: Date) {
  const x = new Date(d); x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - x.getDay());
  return x;
}
function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth() + 1, 0); }

function translateError(msg?: string): string {
  if (!msg) return "Não foi possível salvar. Tente novamente.";
  const m = msg.toLowerCase();
  if (m.includes("modo suporte")) return "Modo Suporte ativo: somente leitura. Encerre a sessão para fazer alterações.";
  if (m.includes("row-level security") || m.includes("permission")) return "Você não tem permissão para alterar este agendamento.";
  if (m.includes("locked") || m.includes("bloqueado")) return "Registro bloqueado: não pode ser alterado.";
  if (m.includes("limite contratado")) return msg;
  return msg;
}

function AgendaPage() {
  const qc = useQueryClient();
  const { clinicId, supportMode } = useActiveClinic();
  const [view, setView] = useState<ViewMode>("dia");
  const [anchor, setAnchor] = useState<Date>(() => { const d = new Date(); d.setHours(0,0,0,0); return d; });
  const [open, setOpen] = useState(false);
  const [slotPrefill, setSlotPrefill] = useState<{ data: string; horario: string } | null>(null);
  const [filterProf, setFilterProf] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<Status | "all">("all");

  const { rangeStart, rangeEnd } = useMemo(() => {
    if (view === "dia")    return { rangeStart: anchor, rangeEnd: anchor };
    if (view === "semana") { const s = startOfWeek(anchor); return { rangeStart: s, rangeEnd: addDays(s, 6) }; }
    return { rangeStart: startOfMonth(anchor), rangeEnd: endOfMonth(anchor) };
  }, [view, anchor]);

  const list = useQuery({
    queryKey: ["appts", clinicId, ymd(rangeStart), ymd(rangeEnd)],
    enabled: !!clinicId,
    queryFn: async () => {
      const { data } = await supabase
        .from("appointments")
        .select("id, data, horario, duracao_min, status, observacao, patient_id, professional_id, patients(nome_completo), professionals(nome)")
        .eq("clinic_id", clinicId!)
        .gte("data", ymd(rangeStart))
        .lte("data", ymd(rangeEnd))
        .order("data").order("horario");
      return (data ?? []) as any[];
    },
  });

  const patients = useQuery({
    queryKey: ["patients-all", clinicId],
    enabled: !!clinicId,
    queryFn: async () => (await supabase.from("patients").select("id, nome_completo").eq("clinic_id", clinicId!).order("nome_completo")).data ?? [],
  });
  const profs = useQuery({
    queryKey: ["professionals-active", clinicId],
    enabled: !!clinicId,
    queryFn: async () => (await supabase.from("professionals").select("id, nome").eq("clinic_id", clinicId!).eq("situacao", "ativo").order("nome")).data ?? [],
  });

  const create = useMutation({
    mutationFn: async (v: Form) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("appointments").insert({ ...v, created_by: u.user?.id } as any);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Agendamento criado"); setOpen(false); setSlotPrefill(null); qc.invalidateQueries({ queryKey: ["appts", clinicId] }); },
    onError: (e: any) => toast.error(e.message),
  });

  function openNewSlot(dateStr: string, hour?: number) {
    if (supportMode) return;
    const horario = hour != null ? `${String(hour).padStart(2, "0")}:00` : "08:00";
    setSlotPrefill({ data: dateStr, horario });
    setOpen(true);
  }

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
    onSuccess: (_d, v) => { toast.success(`Marcado como ${STATUS_LABEL[v.status]}`); qc.invalidateQueries({ queryKey: ["appts", clinicId] }); },
    onError: (e: any) => toast.error(translateError(e?.message)),
  });

  const [editing, setEditing] = useState<any | null>(null);
  const update = useMutation({
    mutationFn: async (v: Form & { id: string; status: Status }) => {
      if (!clinicId) throw new Error("Clínica ativa não identificada.");
      const { id, status, ...rest } = v;
      const { error } = await supabase
        .from("appointments")
        .update({ ...rest, status: status as any })
        .eq("id", id)
        .eq("clinic_id", clinicId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Agendamento atualizado");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["appts", clinicId] });
    },
    onError: (e: any) => toast.error(translateError(e?.message)),
  });

  // Filtering (applied to list)
  const filtered = useMemo(() => {
    return (list.data ?? []).filter((a) => {
      if (filterProf !== "all" && a.professional_id !== filterProf) return false;
      if (filterStatus !== "all" && a.status !== filterStatus) return false;
      return true;
    });
  }, [list.data, filterProf, filterStatus]);

  // Day summary (always for anchor day)
  const daySummary = useMemo(() => {
    const day = ymd(anchor);
    const todays = (list.data ?? []).filter((a) => a.data === day);
    return {
      total: todays.length,
      confirmado: todays.filter((a) => a.status === "confirmado").length,
      agendado:   todays.filter((a) => a.status === "agendado").length,
      realizado:  todays.filter((a) => a.status === "realizado").length,
      cancelado:  todays.filter((a) => a.status === "cancelado").length,
    };
  }, [list.data, anchor]);

  function shift(delta: number) {
    if (view === "dia")    setAnchor(addDays(anchor, delta));
    else if (view === "semana") setAnchor(addDays(anchor, delta * 7));
    else { const d = new Date(anchor); d.setMonth(d.getMonth() + delta); setAnchor(d); }
  }

  const headerLabel = useMemo(() => {
    if (view === "dia") return fmtDate(ymd(anchor));
    if (view === "semana") {
      const s = startOfWeek(anchor); const e = addDays(s, 6);
      return `${s.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} — ${e.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}`;
    }
    return anchor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  }, [view, anchor]);

  return (
    <div className="space-y-6">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:flex-wrap sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-[2rem] leading-tight font-semibold tracking-tight">Agenda</h1>
          <p className="mt-1.5 text-[15px] text-muted-foreground capitalize">{headerLabel}</p>
        </div>
        <div className="shrink-0">
          <Button disabled={supportMode} onClick={() => openNewSlot(ymd(anchor))}>
            <Plus className="h-4 w-4 mr-2" />Novo agendamento
          </Button>
          <NewAppointmentDialog
            open={open}
            setOpen={(o: boolean) => { setOpen(o); if (!o) setSlotPrefill(null); }}
            create={create}
            patients={patients.data ?? []}
            profs={profs.data ?? []}
            initialDate={slotPrefill?.data ?? ymd(anchor)}
            initialHora={slotPrefill?.horario ?? "08:00"}
          />
        </div>
      </header>

      {/* Top controls */}
      <Card className="p-3 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => shift(-1)} aria-label="Anterior"><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => { const d = new Date(); d.setHours(0,0,0,0); setAnchor(d); }}>Hoje</Button>
          <Button variant="ghost" size="icon" onClick={() => shift(1)} aria-label="Próximo"><ChevronRight className="h-4 w-4" /></Button>
        </div>
        <div className="ml-auto">
          <Tabs value={view} onValueChange={(v) => setView(v as ViewMode)}>
            <TabsList>
              <TabsTrigger value="dia">Dia</TabsTrigger>
              <TabsTrigger value="semana">Semana</TabsTrigger>
              <TabsTrigger value="mes">Mês</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        {/* Main pane */}
        <div className="min-w-0 space-y-4">
          {list.isLoading ? (
            <Card className="p-8 text-center text-sm text-muted-foreground">Carregando…</Card>
          ) : view === "dia" ? (
            <DayView items={filtered} day={ymd(anchor)} onStatus={(id, s) => updateStatus.mutate({ id, status: s })} onEdit={(a) => setEditing(a)} disabled={supportMode} onNew={() => openNewSlot(ymd(anchor))} onSlotClick={(h) => openNewSlot(ymd(anchor), h)} />
          ) : view === "semana" ? (
            <WeekView items={filtered} weekStart={startOfWeek(anchor)} onPick={(d) => { setAnchor(d); setView("dia"); }} onNewOnDay={(d) => openNewSlot(ymd(d))} disabled={supportMode} />
          ) : (
            <MonthView items={filtered} anchor={anchor} onPick={(d) => { setAnchor(d); setView("dia"); }} />
          )}
        </div>

        {/* Side panel — desktop only */}
        <aside className="hidden lg:block space-y-4">
          <Card className="p-3">
            <CalendarPicker
              mode="single"
              selected={anchor}
              onSelect={(d) => d && setAnchor(d)}
              className="pointer-events-auto"
            />
          </Card>

          <Card className="p-4 space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Filtros</div>
            <div className="space-y-2">
              <Label className="text-xs">Profissional</Label>
              <Select value={filterProf} onValueChange={setFilterProf}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {(profs.data ?? []).map((p: any) => (<SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Status</Label>
              <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {ALL_STATUSES.map((s) => (<SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </Card>

          <Card className="p-4 space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Resumo do dia</div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-semibold tabular-nums">{daySummary.total}</span>
              <span className="text-sm text-muted-foreground">atendimentos</span>
            </div>
            <ul className="space-y-1.5 text-sm">
              {ALL_STATUSES.map((s) => (
                <li key={s} className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className={cn("h-2 w-2 rounded-full", STATUS_DOT[s])} />
                    {STATUS_LABEL[s]}
                  </span>
                  <span className="tabular-nums text-muted-foreground">{daySummary[s]}</span>
                </li>
              ))}
            </ul>
          </Card>
        </aside>
      </div>

      <EditAppointmentDialog
        appt={editing}
        onClose={() => setEditing(null)}
        update={update}
        patients={patients.data ?? []}
        profs={profs.data ?? []}
        disabled={supportMode}
      />
    </div>
  );
}

/* ───────────────────────── DAY VIEW ───────────────────────── */

function DayView({ items, day, onStatus, onEdit, disabled, onNew, onSlotClick }: {
  items: any[]; day: string; onStatus: (id: string, s: Status) => void; onEdit: (a: any) => void; disabled: boolean; onNew: () => void; onSlotClick: (hour: number) => void;
}) {
  const todays = items.filter((a) => a.data === day);
  if (!todays.length) {
    // Mesmo sem agendamentos, mostrar grade clicável de horários
    const hours = Array.from({ length: 14 }, (_, i) => i + 7);
    return (
      <Card className="p-0 overflow-hidden">
        <div className="px-4 py-3 border-b bg-muted/30 text-xs text-muted-foreground">
          Clique em um horário vazio para criar um agendamento.
        </div>
        <ul className="divide-y divide-border/60">
          {hours.map((h) => (
            <li key={h} className="grid grid-cols-[60px_minmax(0,1fr)] gap-3 px-4 py-2 min-h-[56px]">
              <div className="text-xs font-semibold tabular-nums text-muted-foreground pt-2">{String(h).padStart(2,"0")}:00</div>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onSlotClick(h)}
                className="rounded-md border border-dashed border-border/60 text-xs text-muted-foreground/70 hover:bg-primary/5 hover:border-primary/40 hover:text-primary transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {disabled ? "—" : "+ Novo agendamento"}
              </button>
            </li>
          ))}
        </ul>
      </Card>
    );
  }
  const hours = Array.from({ length: 14 }, (_, i) => i + 7);
  return (
    <Card className="p-0 overflow-hidden">
      <ul className="divide-y divide-border/60">
        {hours.map((h) => {
          const slot = todays.filter((a) => Number(String(a.horario).slice(0, 2)) === h);
          return (
            <li key={h} className="grid grid-cols-[60px_minmax(0,1fr)] gap-3 px-4 py-2 min-h-[64px]">
              <div className="text-xs font-semibold tabular-nums text-muted-foreground pt-2">{String(h).padStart(2, "0")}:00</div>
              <div className="space-y-2">
                {slot.length === 0 ? (
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onSlotClick(h)}
                    className="w-full h-10 rounded-md border border-dashed border-border/50 text-xs text-muted-foreground/60 hover:border-primary/50 hover:bg-primary/5 hover:text-primary transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label={`Criar agendamento às ${String(h).padStart(2,"0")}:00`}
                  >
                    + Novo agendamento
                  </button>
                ) : slot.map((a) => <AppointmentBlock key={a.id} a={a} onStatus={onStatus} onEdit={onEdit} disabled={disabled} />)}
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function AppointmentBlock({ a, onStatus, onEdit, disabled }: { a: any; onStatus: (id: string, s: Status) => void; onEdit: (a: any) => void; disabled: boolean }) {
  const s = (a.status ?? "agendado") as Status;
  return (
    <div className={cn("rounded-xl border-l-4 ring-1 px-3 py-2 flex items-start gap-3", STATUS_CLASS[s])}>
      <div className="text-xs font-semibold tabular-nums w-12 shrink-0 pt-0.5">{String(a.horario).slice(0, 5)}</div>
      <div className="min-w-0 flex-1">
        <div className="font-medium truncate">{a.patients?.nome_completo ?? "—"}</div>
        <div className="text-xs opacity-80 truncate">
          {a.professionals?.nome ?? "—"} · Atendimento · {a.duracao_min} min
        </div>
      </div>
      <Badge variant="outline" className="bg-white/60 border-transparent text-[10px] uppercase tracking-wide shrink-0">{STATUS_LABEL[s]}</Badge>
      <RowActions a={a} onStatus={onStatus} onEdit={onEdit} disabled={disabled} />
    </div>
  );
}

function RowActions({ a, onStatus, onEdit, disabled }: { a: any; onStatus: (id: string, s: Status) => void; onEdit: (a: any) => void; disabled: boolean }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0"><MoreVertical className="h-4 w-4" /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 bg-popover">
        {a.patient_id && (
          <DropdownMenuItem asChild>
            <Link to="/app/pacientes/$id" params={{ id: a.patient_id }}><UserCircle2 className="h-4 w-4 mr-2" /> Ver paciente</Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem disabled={disabled} onClick={() => onEdit(a)}><Pencil className="h-4 w-4 mr-2" /> Editar</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={disabled} onClick={() => onStatus(a.id, "confirmado")}>Marcar como Confirmado</DropdownMenuItem>
        <DropdownMenuItem disabled={disabled} onClick={() => onStatus(a.id, "realizado")}><CheckCircle2 className="h-4 w-4 mr-2" /> Marcar como Realizado</DropdownMenuItem>
        <DropdownMenuItem disabled={disabled} onClick={() => onStatus(a.id, "cancelado")} className="text-rose-600"><XCircle className="h-4 w-4 mr-2" /> Cancelar</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ───────────────────────── WEEK VIEW ───────────────────────── */

function WeekView({ items, weekStart, onPick, onNewOnDay, disabled }: { items: any[]; weekStart: Date; onPick: (d: Date) => void; onNewOnDay: (d: Date) => void; disabled: boolean }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = ymd(new Date());
  return (
    <Card className="p-0 overflow-hidden">
      <div className="grid grid-cols-7 border-b bg-muted/40 text-xs">
        {days.map((d) => {
          const key = ymd(d);
          return (
            <button
              key={key}
              onClick={() => onPick(d)}
              className={cn("px-2 py-2 text-left hover:bg-muted/60 transition", key === today && "bg-primary/10")}
            >
              <div className="uppercase tracking-wider text-muted-foreground">{d.toLocaleDateString("pt-BR", { weekday: "short" })}</div>
              <div className="text-lg font-semibold tabular-nums">{d.getDate()}</div>
            </button>
          );
        })}
      </div>
      <div className="grid grid-cols-7 min-h-[420px] divide-x divide-border/60">
        {days.map((d) => {
          const key = ymd(d);
          const dayItems = items.filter((a) => a.data === key).sort((x, y) => String(x.horario).localeCompare(String(y.horario)));
          return (
            <div key={key} className="p-2 space-y-1.5">
              {dayItems.map((a) => {
                const s = (a.status ?? "agendado") as Status;
                return (
                  <button
                    key={a.id}
                    onClick={() => onPick(d)}
                    className={cn("w-full text-left rounded-md border-l-4 ring-1 px-2 py-1.5", STATUS_CLASS[s])}
                  >
                    <div className="text-[11px] font-semibold tabular-nums">{String(a.horario).slice(0, 5)}</div>
                    <div className="text-xs truncate font-medium">{a.patients?.nome_completo ?? "—"}</div>
                    <div className="text-[10px] truncate opacity-80">{a.professionals?.nome ?? ""}</div>
                  </button>
                );
              })}
              <button
                type="button"
                disabled={disabled}
                onClick={() => onNewOnDay(d)}
                className="w-full text-[11px] rounded-md border border-dashed border-border/60 text-muted-foreground/70 hover:bg-primary/5 hover:border-primary/40 hover:text-primary py-1.5 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                + Novo
              </button>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/* ───────────────────────── MONTH VIEW ───────────────────────── */

function MonthView({ items, anchor, onPick }: { items: any[]; anchor: Date; onPick: (d: Date) => void }) {
  const first = startOfMonth(anchor);
  const gridStart = startOfWeek(first);
  const today = ymd(new Date());
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const counts = new Map<string, number>();
  for (const a of items) counts.set(a.data, (counts.get(a.data) ?? 0) + 1);

  return (
    <Card className="p-0 overflow-hidden">
      <div className="grid grid-cols-7 border-b bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
        {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
          <div key={d} className="px-2 py-2 text-center font-semibold">{d}</div>
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
              onClick={() => onPick(d)}
              className={cn(
                "min-h-[88px] border-b border-r border-border/60 p-2 text-left transition hover:bg-muted/40",
                !inMonth && "bg-muted/20 text-muted-foreground/50",
              )}
            >
              <div className="flex items-center justify-between">
                <span className={cn(
                  "inline-flex h-7 w-7 items-center justify-center rounded-full text-sm tabular-nums",
                  isToday && "bg-primary text-primary-foreground font-semibold",
                )}>{d.getDate()}</span>
                {count > 0 && (
                  <Badge variant="secondary" className="text-[10px] h-5 px-1.5">{count}</Badge>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

/* ───────────────────────── NEW DIALOG ───────────────────────── */

function NewAppointmentDialog({ open, setOpen, create, patients, profs, initialDate, initialHora }: any) {
  const { register, handleSubmit, setValue, watch, reset } = useForm<Form>({
    defaultValues: { data: initialDate, horario: initialHora ?? "08:00", duracao_min: 60 },
  });
  const patient_id = watch("patient_id");
  const professional_id = watch("professional_id");

  // Reset whenever the dialog opens with a new slot
  useEffect(() => {
    if (open) {
      reset({
        patient_id: "" as any,
        professional_id: "" as any,
        data: initialDate,
        horario: initialHora ?? "08:00",
        duracao_min: 60,
        observacao: "",
      });
    }
  }, [open, initialDate, initialHora, reset]);

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Novo agendamento</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit((v) => create.mutate(v))} className="space-y-3">
          <div>
            <Label className="text-xs uppercase">Paciente</Label>
            <Select value={patient_id ?? ""} onValueChange={(v) => setValue("patient_id", v)}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{patients.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.nome_completo}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs uppercase">Profissional</Label>
            <Select value={professional_id ?? ""} onValueChange={(v) => setValue("professional_id", v)}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{profs.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div><Label className="text-xs uppercase">Data</Label><Input type="date" {...register("data")} /></div>
            <div><Label className="text-xs uppercase">Hora</Label><Input type="time" {...register("horario")} /></div>
            <div><Label className="text-xs uppercase">Duração</Label><Input type="number" {...register("duracao_min", { valueAsNumber: true })} /></div>
          </div>
          <div><Label className="text-xs uppercase">Observação</Label><Textarea rows={2} {...register("observacao")} /></div>
          <div className="flex justify-end"><Button type="submit" disabled={create.isPending || !patient_id || !professional_id}>Agendar</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ───────────────────────── EDIT DIALOG ───────────────────────── */

function EditAppointmentDialog({ appt, onClose, update, patients, profs, disabled }: {
  appt: any | null;
  onClose: () => void;
  update: { mutate: (v: any) => void; isPending: boolean };
  patients: any[];
  profs: any[];
  disabled: boolean;
}) {
  const open = !!appt;
  const { register, handleSubmit, setValue, watch, reset } = useForm<Form & { status: Status }>({
    defaultValues: {
      patient_id: "", professional_id: "", data: "", horario: "08:00",
      duracao_min: 60, observacao: "", status: "agendado",
    },
  });

  // Reset form whenever a new appointment is opened
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
    <Dialog open={open} onOpenChange={(o) => { if (!o && !update.isPending) onClose(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Editar agendamento</DialogTitle></DialogHeader>
        {disabled && (
          <div className="rounded-md bg-amber-50 ring-1 ring-amber-200 text-amber-800 text-xs px-3 py-2">
            Modo Suporte ativo: somente leitura. Encerre a sessão para fazer alterações.
          </div>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div>
            <Label className="text-xs uppercase">Paciente</Label>
            <Select value={patient_id ?? ""} onValueChange={(v) => setValue("patient_id", v)} disabled={disabled}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{patients.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.nome_completo}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs uppercase">Profissional</Label>
            <Select value={professional_id ?? ""} onValueChange={(v) => setValue("professional_id", v)} disabled={disabled}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{profs.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div><Label className="text-xs uppercase">Data</Label><Input type="date" {...register("data")} disabled={disabled} /></div>
            <div><Label className="text-xs uppercase">Hora</Label><Input type="time" {...register("horario")} disabled={disabled} /></div>
            <div><Label className="text-xs uppercase">Duração</Label><Input type="number" {...register("duracao_min", { valueAsNumber: true })} disabled={disabled} /></div>
          </div>
          <div>
            <Label className="text-xs uppercase">Status</Label>
            <Select value={status} onValueChange={(v) => setValue("status", v as Status)} disabled={disabled}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(["agendado", "confirmado", "realizado", "cancelado"] as Status[]).map((s) => (
                  <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs uppercase">Observação</Label>
            <Textarea rows={2} {...register("observacao")} disabled={disabled} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={update.isPending}>Cancelar</Button>
            <Button type="submit" disabled={disabled || update.isPending || !patient_id || !professional_id}>
              {update.isPending ? "Salvando…" : "Salvar alterações"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

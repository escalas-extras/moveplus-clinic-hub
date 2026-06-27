import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveClinic } from "@/lib/active-clinic";
import { useAuth } from "@/lib/auth";
import { useBranding } from "@/lib/branding";
import { fmtDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AppShell,
  EmptyState,
  InfoCard,
  PageHeader,
  PageSection,
  StatusBadge,
} from "@/components/layout";
import {
  Users,
  CalendarDays,
  FileText,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Sparkles,
  AlertTriangle,
  FileSignature,
  ClipboardList,
  UserCheck,
  ArrowRight,
  Plus,
  Clock,
  DollarSign,
  CalendarRange,
  Stethoscope,
  Settings,
  UserPlus,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/")({
  beforeLoad: async () => {
    const { data: sess } = await supabase.auth.getUser();
    if (!sess.user) return;
    const [rolesRes, supportRes] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", sess.user.id),
      supabase.rpc("current_support_session_clinic"),
    ]);
    const isSuperAdmin = (rolesRes.data ?? []).some((r) => r.role === "super_admin");
    const inSupport = !!supportRes.data;
    if (isSuperAdmin && !inSupport) throw redirect({ to: "/app/admin-saas" });
  },
  component: PainelClinico,
});

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function startOfWeek(d: Date) {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const s = new Date(d);
  s.setDate(d.getDate() + diff);
  return isoDate(s);
}

function endOfWeek(d: Date) {
  const s = new Date(startOfWeek(d) + "T00:00:00");
  s.setDate(s.getDate() + 6);
  return isoDate(s);
}

function getGreeting(hour: number) {
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

function getDisplayName(user: ReturnType<typeof useAuth>["user"]) {
  const meta = user?.user_metadata as { full_name?: string } | undefined;
  if (meta?.full_name) return meta.full_name.split(" ")[0];
  if (user?.email) return user.email.split("@")[0];
  return "";
}

type ApptRow = {
  id: string;
  data?: string;
  horario: string;
  status: string | null;
  observacao: string | null;
  patients: { nome_completo: string } | null;
  professionals: { nome: string } | null;
};

type PatientRow = {
  id: string;
  nome_completo: string;
  created_at: string;
};

const STATUS_VARIANT: Record<string, "success" | "warning" | "danger" | "neutral"> = {
  agendado: "warning",
  pendente: "warning",
  confirmado: "success",
  realizado: "success",
  concluido: "success",
  cancelado: "danger",
  faltou: "danger",
};

const STATUS_LABEL: Record<string, string> = {
  agendado: "Pendente",
  pendente: "Pendente",
  confirmado: "Confirmado",
  realizado: "Confirmado",
  concluido: "Confirmado",
  cancelado: "Cancelado",
  faltou: "Cancelado",
};

function PainelClinico() {
  const { clinicId } = useActiveClinic();
  const { user } = useAuth();
  const brand = useBranding();

  const today = new Date();
  const todayIso = isoDate(today);
  const weekStartIso = startOfWeek(today);
  const weekEndIso = endOfWeek(today);
  const thisMonth = startOfMonth(today);
  const prevMonth = new Date(thisMonth.getFullYear(), thisMonth.getMonth() - 1, 1);
  const thisMonthIso = isoDate(thisMonth);
  const prevMonthIso = isoDate(prevMonth);

  const greeting = getGreeting(today.getHours());
  const displayName = getDisplayName(user);
  const headerTitle = displayName ? `${greeting}, ${displayName}` : greeting;
  const headerDescription = `${brand.clinicName} · ${today.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })}`;

  const stats = useQuery({
    queryKey: [
      "painel-clinico",
      clinicId,
      todayIso,
      weekStartIso,
      weekEndIso,
      thisMonthIso,
      prevMonthIso,
    ],
    enabled: !!clinicId,
    queryFn: async () => {
      const cid = clinicId!;
      const [
        pacientesAtivos,
        pacientesAntes,
        atendHoje,
        agendaSemana,
        atendMes,
        atendPrev,
        docsMes,
        docsPrev,
        reavalPend,
        docsRascunho,
        evolSemAssin,
        retorno,
        hoje,
        proximos,
        pacientesRecentes,
      ] = await Promise.all([
        supabase
          .from("patients")
          .select("id", { count: "exact", head: true })
          .eq("clinic_id", cid)
          .eq("situacao", "ativo"),
        supabase
          .from("patients")
          .select("id", { count: "exact", head: true })
          .eq("clinic_id", cid)
          .eq("situacao", "ativo")
          .lt("created_at", thisMonthIso),
        supabase
          .from("appointments")
          .select("id", { count: "exact", head: true })
          .eq("clinic_id", cid)
          .eq("data", todayIso),
        supabase
          .from("appointments")
          .select("id", { count: "exact", head: true })
          .eq("clinic_id", cid)
          .gte("data", weekStartIso)
          .lte("data", weekEndIso),
        supabase
          .from("appointments")
          .select("id", { count: "exact", head: true })
          .eq("clinic_id", cid)
          .gte("data", thisMonthIso),
        supabase
          .from("appointments")
          .select("id", { count: "exact", head: true })
          .eq("clinic_id", cid)
          .gte("data", prevMonthIso)
          .lt("data", thisMonthIso),
        supabase
          .from("clinical_documents")
          .select("id", { count: "exact", head: true })
          .eq("clinic_id", cid)
          .gte("issued_at", thisMonthIso),
        supabase
          .from("clinical_documents")
          .select("id", { count: "exact", head: true })
          .eq("clinic_id", cid)
          .gte("issued_at", prevMonthIso)
          .lt("issued_at", thisMonthIso),
        supabase
          .from("reassessment_schedule")
          .select("id, patient_id, scheduled_for, patients(nome_completo)")
          .eq("clinic_id", cid)
          .lte("scheduled_for", todayIso)
          .is("completed_at", null)
          .order("scheduled_for")
          .limit(10),
        supabase
          .from("clinical_documents")
          .select("id", { count: "exact", head: true })
          .eq("clinic_id", cid)
          .is("locked_at", null),
        supabase
          .from("evolutions")
          .select("id", { count: "exact", head: true })
          .eq("clinic_id", cid)
          .is("locked_at", null),
        supabase
          .from("patients")
          .select("id, nome_completo, updated_at")
          .eq("clinic_id", cid)
          .eq("situacao", "ativo")
          .order("updated_at", { ascending: true })
          .limit(5),
        supabase
          .from("appointments")
          .select("id, data, horario, status, observacao, patients(nome_completo), professionals(nome)")
          .eq("clinic_id", cid)
          .eq("data", todayIso)
          .order("horario"),
        supabase
          .from("appointments")
          .select("id, data, horario, status, observacao, patients(nome_completo), professionals(nome)")
          .eq("clinic_id", cid)
          .gt("data", todayIso)
          .lte("data", weekEndIso)
          .order("data")
          .order("horario")
          .limit(8),
        supabase
          .from("patients")
          .select("id, nome_completo, created_at")
          .eq("clinic_id", cid)
          .eq("situacao", "ativo")
          .order("created_at", { ascending: false })
          .limit(5),
      ]);
      return {
        pacientesAtivos: pacientesAtivos.count ?? 0,
        pacientesAntes: pacientesAntes.count ?? 0,
        atendHoje: atendHoje.count ?? 0,
        agendaSemana: agendaSemana.count ?? 0,
        atendMes: atendMes.count ?? 0,
        atendPrev: atendPrev.count ?? 0,
        docsMes: docsMes.count ?? 0,
        docsPrev: docsPrev.count ?? 0,
        reavalPend: reavalPend.data ?? [],
        docsRascunho: docsRascunho.count ?? 0,
        evolSemAssin: evolSemAssin.count ?? 0,
        retorno: retorno.data ?? [],
        hoje: (hoje.data ?? []) as ApptRow[],
        proximos: (proximos.data ?? []) as ApptRow[],
        pacientesRecentes: (pacientesRecentes.data ?? []) as PatientRow[],
      };
    },
  });

  const s = stats.data;
  const reavalCount = s?.reavalPend.length ?? 0;
  const isNewClinic =
    !!s && s.pacientesAtivos === 0 && s.atendMes === 0 && s.docsMes === 0;
  const loading = stats.isLoading;

  return (
    <AppShell className="dashboard-premium">
      <PageHeader
        icon={Sparkles}
        eyebrow={brand.clinicName}
        title={headerTitle}
        description={headerDescription}
        actions={
          <>
            <Button
              asChild
              className="dash-btn-primary rounded-xl font-semibold shadow-soft"
              style={{ background: brand.primaryColor }}
            >
              <Link to="/app/pacientes">
                <Plus className="h-4 w-4" />
                Novo paciente
              </Link>
            </Button>
            <Button asChild variant="outline" className="dash-btn-ghost rounded-xl font-medium">
              <Link to="/app/agenda">
                <CalendarDays className="h-4 w-4" />
                Agendar
              </Link>
            </Button>
          </>
        }
      />

      {loading ? (
        <DashboardSkeleton />
      ) : (
        <>
          {isNewClinic && (
            <InfoCard
              icon={Sparkles}
              title="Sua clínica está pronta para iniciar"
              description="Cadastre o primeiro paciente, configure sua agenda e emita seu primeiro documento."
              className="border-dashed"
              style={{
                borderColor: `${brand.primaryColor}66`,
                background: `linear-gradient(135deg, ${brand.primaryColor}10, ${brand.secondaryColor}08)`,
              }}
            >
              <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
                <Link
                  to="/app/pacientes"
                  className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline"
                >
                  Cadastrar paciente <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <Link
                  to="/app/agenda"
                  className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline"
                >
                  Abrir agenda <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <Link
                  to="/app/configuracoes"
                  className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline"
                >
                  Personalizar marca <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </InfoCard>
          )}

          <section className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
            <StatCard
              icon={Users}
              label="Pacientes ativos"
              value={s?.pacientesAtivos ?? 0}
              previous={s?.pacientesAntes ?? 0}
              period="vs início do mês"
              to="/app/pacientes"
              accent={brand.primaryColor}
            />
            <StatCard
              icon={Clock}
              label="Atendimentos hoje"
              value={s?.atendHoje ?? 0}
              to="/app/agenda"
              accent={brand.secondaryColor}
              hideDelta
              subtitle={s?.atendHoje ? "Agendados para hoje" : "Nenhum hoje"}
            />
            <StatCard
              icon={CalendarRange}
              label="Agenda desta semana"
              value={s?.agendaSemana ?? 0}
              to="/app/agenda"
              accent={brand.primaryColor}
              hideDelta
              subtitle="Seg — Dom"
            />
            <StatCard
              icon={RefreshCw}
              label="Reavaliações pendentes"
              value={reavalCount}
              tone={reavalCount > 0 ? "warning" : "default"}
              to="/app/reavaliacoes"
              accent={reavalCount > 0 ? "var(--warning)" : brand.primaryColor}
              hideDelta
              subtitle={reavalCount > 0 ? "Requer atenção" : "Em dia"}
            />
            <StatCard
              icon={FileText}
              label="Documentos emitidos"
              value={s?.docsMes ?? 0}
              previous={s?.docsPrev ?? 0}
              period="vs mês anterior"
              to="/app/documentos"
              accent={brand.secondaryColor}
            />
            <StatCard
              icon={DollarSign}
              label="Receita do mês"
              value="—"
              to="/app/financeiro"
              accent={brand.primaryColor}
              hideDelta
              subtitle="Em breve"
              isPlaceholder
            />
          </section>

          <div className="grid gap-6 lg:grid-cols-[1.65fr_1fr]">
            <PageSection
              icon={CalendarDays}
              title="Agenda do dia"
              description="Atendimentos programados para hoje"
              actions={
                <Link
                  to="/app/agenda"
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  Ver semana →
                </Link>
              }
            >
              {!s?.hoje.length ? (
                <EmptyState
                  icon={CalendarDays}
                  title="Nenhum atendimento hoje"
                  description="Sua agenda está livre. Aproveite para organizar a semana ou cadastrar novos pacientes."
                  action={{ label: "Abrir agenda", to: "/app/agenda" }}
                  className="py-10"
                />
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200/80">
                  <table className="w-full min-w-[480px] text-sm">
                    <thead className="bg-slate-50 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold">Horário</th>
                        <th className="px-4 py-3 text-left font-semibold">Paciente</th>
                        <th className="hidden px-4 py-3 text-left font-semibold sm:table-cell">
                          Atendimento
                        </th>
                        <th className="px-4 py-3 text-right font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {s.hoje.map((a) => (
                        <AgendaRow key={a.id} appt={a} accent={brand.primaryColor} />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </PageSection>

            <PageSection
              icon={Clock}
              title="Próximos atendimentos"
              description="Agenda dos próximos dias"
              actions={
                <Link
                  to="/app/agenda"
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  Ver todos →
                </Link>
              }
            >
              {!s?.proximos.length ? (
                <EmptyState
                  icon={Clock}
                  title="Sem atendimentos futuros"
                  description="Não há consultas agendadas para o restante da semana."
                  action={{ label: "Agendar consulta", to: "/app/agenda" }}
                  className="py-10"
                />
              ) : (
                <ul className="space-y-2">
                  {s.proximos.map((a) => (
                    <li key={a.id}>
                      <Link
                        to="/app/agenda"
                        className="flex items-center gap-3 rounded-xl border border-transparent px-3 py-3 transition-colors hover:border-slate-200 hover:bg-slate-50"
                      >
                        <div
                          className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg text-[10px] font-bold leading-tight"
                          style={{ background: `${brand.primaryColor}14`, color: brand.primaryColor }}
                        >
                          <span>{fmtDate(a.data).slice(0, 5)}</span>
                          <span className="tabular-nums">{String(a.horario).slice(0, 5)}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium">
                            {a.patients?.nome_completo ?? "—"}
                          </div>
                          <div className="truncate text-xs text-muted-foreground">
                            {a.observacao || a.professionals?.nome || "Consulta"}
                          </div>
                        </div>
                        <StatusBadge variant={STATUS_VARIANT[a.status ?? ""] ?? "neutral"}>
                          {STATUS_LABEL[a.status ?? ""] ?? a.status ?? "—"}
                        </StatusBadge>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </PageSection>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <PageSection
              icon={Users}
              title="Pacientes recentes"
              description="Últimos cadastros na clínica"
              actions={
                <Link
                  to="/app/pacientes"
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  Ver todos →
                </Link>
              }
            >
              {!s?.pacientesRecentes.length ? (
                <EmptyState
                  icon={UserPlus}
                  title="Nenhum paciente cadastrado"
                  description="Comece cadastrando seu primeiro paciente para acompanhar evoluções e documentos."
                  action={{ label: "Cadastrar paciente", to: "/app/pacientes" }}
                  className="py-10"
                />
              ) : (
                <ul className="divide-y divide-slate-100">
                  {s.pacientesRecentes.map((p) => (
                    <li key={p.id}>
                      <Link
                        to="/app/pacientes/$id"
                        params={{ id: p.id }}
                        className="flex items-center justify-between gap-3 px-1 py-3.5 transition-colors hover:bg-slate-50"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                            {p.nome_completo.charAt(0).toUpperCase()}
                          </div>
                          <span className="truncate font-medium">{p.nome_completo}</span>
                        </div>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {fmtDate(p.created_at)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </PageSection>

            <PageSection
              icon={Sparkles}
              title="Ações rápidas"
              description="Atalhos e pendências operacionais"
            >
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <QuickAction icon={UserPlus} label="Novo paciente" to="/app/pacientes" />
                <QuickAction icon={CalendarDays} label="Agendar" to="/app/agenda" />
                <QuickAction icon={FileText} label="Documentos" to="/app/documentos" />
                <QuickAction icon={Stethoscope} label="Evoluções" to="/app/evolucoes" />
                <QuickAction icon={RefreshCw} label="Reavaliações" to="/app/reavaliacoes" />
                <QuickAction icon={Settings} label="Configurações" to="/app/configuracoes" />
              </div>

              <div className="mt-5 space-y-1.5 border-t border-slate-100 pt-5">
                <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                  Pendências
                </p>
                <ActivityRow
                  icon={ClipboardList}
                  label="Documentos pendentes"
                  count={s?.docsRascunho ?? 0}
                  to="/app/documentos"
                  tone={(s?.docsRascunho ?? 0) > 0 ? "warning" : "default"}
                />
                <ActivityRow
                  icon={AlertTriangle}
                  label="Reavaliações vencidas"
                  count={reavalCount}
                  to="/app/reavaliacoes"
                  tone={reavalCount > 0 ? "danger" : "default"}
                />
                <ActivityRow
                  icon={FileSignature}
                  label="Evoluções sem assinatura"
                  count={s?.evolSemAssin ?? 0}
                  to="/app/evolucoes"
                  tone={(s?.evolSemAssin ?? 0) > 0 ? "warning" : "default"}
                />
                <ActivityRow
                  icon={UserCheck}
                  label="Pacientes aguardando retorno"
                  count={s?.retorno.length ?? 0}
                  to="/app/pacientes"
                  tone="default"
                />
              </div>

              {s &&
                reavalCount === 0 &&
                (s.docsRascunho ?? 0) === 0 &&
                (s.evolSemAssin ?? 0) === 0 && (
                  <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200/70 bg-emerald-50/60 px-3 py-2.5 text-xs text-emerald-800">
                    <Sparkles className="h-3.5 w-3.5" />
                    Tudo em dia. Nenhuma pendência crítica.
                  </div>
                )}
            </PageSection>
          </div>
        </>
      )}
    </AppShell>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_18px_44px_-36px_rgba(15,23,42,0.55)]"
          >
            <Skeleton className="h-9 w-9 rounded-xl" />
            <Skeleton className="mt-5 h-9 w-16" />
            <Skeleton className="mt-3 h-4 w-24" />
            <Skeleton className="mt-2 h-3 w-20" />
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.65fr_1fr]">
        <Skeleton className="h-80 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-72 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    </div>
  );
}

function AgendaRow({ appt, accent }: { appt: ApptRow; accent: string }) {
  return (
    <tr className="transition-colors hover:bg-slate-50">
      <td className="px-4 py-3.5 tabular-nums font-semibold" style={{ color: accent }}>
        {String(appt.horario).slice(0, 5)}
      </td>
      <td className="max-w-[140px] truncate px-4 py-3.5 font-medium sm:max-w-none">
        {appt.patients?.nome_completo ?? "—"}
      </td>
      <td className="hidden truncate px-4 py-3.5 text-muted-foreground sm:table-cell">
        {appt.observacao || appt.professionals?.nome || "Consulta"}
      </td>
      <td className="px-4 py-3.5 text-right">
        <StatusBadge variant={STATUS_VARIANT[appt.status ?? ""] ?? "neutral"}>
          {STATUS_LABEL[appt.status ?? ""] ?? appt.status ?? "—"}
        </StatusBadge>
      </td>
    </tr>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  previous,
  period,
  to,
  accent,
  tone = "default",
  hideDelta,
  subtitle,
  isPlaceholder,
}: {
  icon: LucideIcon;
  label: string;
  value: number | string;
  previous?: number;
  period?: string;
  to?: string;
  accent: string;
  tone?: "default" | "warning";
  hideDelta?: boolean;
  subtitle?: string;
  isPlaceholder?: boolean;
}) {
  const numValue = typeof value === "number" ? value : 0;
  const hasPrev = typeof previous === "number" && previous > 0;
  const delta = hasPrev ? ((numValue - previous!) / previous!) * 100 : numValue > 0 ? 100 : 0;
  const up = delta > 0;
  const down = delta < 0;
  const DeltaIcon = up ? ArrowUpRight : down ? ArrowDownRight : Minus;
  const deltaCls = up
    ? "text-emerald-700 bg-emerald-50 ring-emerald-200"
    : down
      ? "text-rose-700 bg-rose-50 ring-rose-200"
      : "text-muted-foreground bg-muted ring-border";

  const inner = (
    <div
      className={cn(
        "relative h-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_18px_44px_-36px_rgba(15,23,42,0.55)] transition-shadow sm:p-6",
        to && "hover:shadow-[0_18px_44px_-32px_rgba(15,23,42,0.65)]",
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-12 -top-12 h-24 w-24 rounded-full opacity-[0.07] blur-2xl"
        style={{ background: accent }}
      />
      <div className="relative flex items-start justify-between">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-xl"
          style={{ background: `${accent}14`, color: accent }}
        >
          <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
        </div>
        {!hideDelta && !isPlaceholder && (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1",
              deltaCls,
            )}
          >
            <DeltaIcon className="h-3 w-3" />
            {hasPrev ? `${Math.abs(delta).toFixed(0)}%` : numValue > 0 ? "Novo" : "0%"}
          </span>
        )}
        {hideDelta && tone === "warning" && numValue > 0 && (
          <StatusBadge variant="warning">Atenção</StatusBadge>
        )}
      </div>
      <div
        className={cn(
          "mt-5 text-3xl font-bold tabular-nums tracking-tight sm:text-[2rem]",
          tone === "warning" && numValue > 0 && "text-amber-700",
          isPlaceholder && "text-muted-foreground",
        )}
      >
        {value}
      </div>
      <div className="mt-2 truncate text-[13px] font-semibold text-foreground">{label}</div>
      <div className="mt-1 text-[12px] text-muted-foreground">
        {subtitle ?? (hasPrev ? `${previous} ${period ?? ""}`.trim() : period ?? "Período inicial")}
      </div>
    </div>
  );

  if (!to) return inner;
  return (
    <Link to={to} className="block h-full">
      {inner}
    </Link>
  );
}

function QuickAction({
  icon: Icon,
  label,
  to,
}: {
  icon: LucideIcon;
  label: string;
  to: string;
}) {
  return (
    <Link
      to={to}
      className="flex flex-col items-center gap-2 rounded-xl border border-slate-200/80 bg-slate-50/50 px-3 py-4 text-center transition-colors hover:border-primary/30 hover:bg-primary/5"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-soft">
        <Icon className="h-4 w-4" />
      </div>
      <span className="text-xs font-semibold leading-tight text-slate-800">{label}</span>
    </Link>
  );
}

function ActivityRow({
  icon: Icon,
  label,
  count,
  to,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  count: number;
  to: string;
  tone: "default" | "warning" | "danger";
}) {
  const cls =
    tone === "danger"
      ? "text-rose-700 bg-rose-50 ring-rose-200"
      : tone === "warning"
        ? "text-amber-700 bg-amber-50 ring-amber-200"
        : "text-muted-foreground bg-muted ring-border";
  return (
    <Link
      to={to}
      className="group flex items-center gap-3 rounded-xl border border-transparent px-3 py-3 transition-colors hover:border-slate-200 hover:bg-slate-50"
    >
      <div className={cn("rounded-lg p-1.5 ring-1", cls)}>
        <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13.5px] font-medium">{label}</div>
      </div>
      <div
        className="text-[19px] font-semibold tabular-nums"
        style={{ color: count > 0 ? undefined : "var(--muted-foreground)" }}
      >
        {count}
      </div>
      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 transition-colors group-hover:text-primary" />
    </Link>
  );
}

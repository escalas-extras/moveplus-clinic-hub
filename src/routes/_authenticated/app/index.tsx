import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveClinic } from "@/lib/active-clinic";
import { useAuth } from "@/lib/auth";
import { useBranding } from "@/lib/branding";
import { fmtDate, brl } from "@/lib/format";
import { appointmentStatusLabel } from "@/lib/appointment-status";
import {
  AppShell,
  ClinicalSkeleton,
  InfoCard,
  QueryErrorState,
} from "@/components/layout";
import {
  PageHero,
  ModuleStack,
  OperationalCard,
  OperationalCardsGrid,
  QuickAction,
  ActionButton,
} from "@/components/ui-system";
import { AttentionList, type AttentionItem } from "@/components/dashboard";
import {
  Users,
  CalendarDays,
  FileText,
  RefreshCw,
  Sparkles,
  AlertTriangle,
  ClipboardList,
  ArrowRight,
  Plus,
  DollarSign,
  Stethoscope,
  Wallet,
} from "lucide-react";

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

type ReavalRow = {
  id: string;
  patient_id: string;
  scheduled_for: string;
  patients: { nome_completo: string } | null;
};

const STATUS_LABEL = appointmentStatusLabel;

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
  const dateLabel = today.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

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
        docsMes,
        docsPrev,
        reavalPend,
        docsRascunho,
        evolSemAssin,
        hoje,
        receitaMesRows,
        recebiveisVencidos,
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
          .limit(8),
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
          .from("appointments")
          .select("id, data, horario, status, observacao, patients(nome_completo), professionals(nome)")
          .eq("clinic_id", cid)
          .eq("data", todayIso)
          .order("horario")
          .limit(6),
        supabase
          .from("financial_entries")
          .select("valor")
          .eq("clinic_id", cid)
          .eq("entry_type", "receivable")
          .eq("status", "pago")
          .gte("data", thisMonthIso),
        supabase
          .from("financial_entries")
          .select("id", { count: "exact", head: true })
          .eq("clinic_id", cid)
          .eq("entry_type", "receivable")
          .eq("status", "pendente")
          .lt("data_vencimento", todayIso),
      ]);

      const receitaMes = (receitaMesRows.data ?? []).reduce((sum, r) => sum + Number(r.valor), 0);

      return {
        pacientesAtivos: pacientesAtivos.count ?? 0,
        pacientesAntes: pacientesAntes.count ?? 0,
        atendHoje: atendHoje.count ?? 0,
        agendaSemana: agendaSemana.count ?? 0,
        docsMes: docsMes.count ?? 0,
        docsPrev: docsPrev.count ?? 0,
        reavalPend: (reavalPend.data ?? []) as ReavalRow[],
        docsRascunho: docsRascunho.count ?? 0,
        evolSemAssin: evolSemAssin.count ?? 0,
        hoje: (hoje.data ?? []) as ApptRow[],
        receitaMes,
        recebiveisVencidos: recebiveisVencidos.count ?? 0,
      };
    },
  });

  const s = stats.data;
  const reavalCount = s?.reavalPend.length ?? 0;
  const pendenciasTotal =
    reavalCount + (s?.docsRascunho ?? 0) + (s?.evolSemAssin ?? 0) + (s?.recebiveisVencidos ?? 0);
  const isNewClinic = !!s && s.pacientesAtivos === 0 && s.docsMes === 0 && s.atendHoje === 0;
  const loading = stats.isLoading;

  const attentionItems = useMemo((): AttentionItem[] => {
    if (!s) return [];
    const items: AttentionItem[] = [];

    for (const a of s.hoje.slice(0, 3)) {
      items.push({
        id: `appt-${a.id}`,
        icon: CalendarDays,
        title: a.patients?.nome_completo ?? "Atendimento",
        subtitle: `${String(a.horario).slice(0, 5)} · ${a.professionals?.nome ?? "Consulta"}`,
        meta: STATUS_LABEL(a.status ?? ""),
        to: "/app/agenda",
        tone: "default",
      });
    }

    for (const r of s.reavalPend.slice(0, 3)) {
      items.push({
        id: `reaval-${r.id}`,
        icon: RefreshCw,
        title: r.patients?.nome_completo ?? "Reavaliação",
        subtitle: `Vencida em ${fmtDate(r.scheduled_for)}`,
        meta: "Reavaliação",
        to: "/app/reavaliacoes",
        tone: "warning",
      });
    }

    if (s.docsRascunho > 0) {
      items.push({
        id: "docs-rascunho",
        icon: FileText,
        title: "Documentos pendentes de finalização",
        subtitle: `${s.docsRascunho} rascunho(s) aguardando`,
        meta: String(s.docsRascunho),
        to: "/app/documentos",
        tone: "warning",
      });
    }

    if (s.recebiveisVencidos > 0) {
      items.push({
        id: "fin-vencidos",
        icon: Wallet,
        title: "Recebimentos vencidos",
        subtitle: "Títulos a receber em atraso",
        meta: String(s.recebiveisVencidos),
        to: "/app/financeiro/inadimplencia",
        tone: "danger",
      });
    }

    if (s.evolSemAssin > 0) {
      items.push({
        id: "evol-sem-assin",
        icon: ClipboardList,
        title: "Evoluções sem assinatura",
        subtitle: `${s.evolSemAssin} registro(s) pendente(s)`,
        meta: String(s.evolSemAssin),
        to: "/app/evolucoes",
        tone: "warning",
      });
    }

    return items.slice(0, 8);
  }, [s]);

  const pacientesDelta =
    s && s.pacientesAntes > 0
      ? Math.round(((s.pacientesAtivos - s.pacientesAntes) / s.pacientesAntes) * 100)
      : s && s.pacientesAtivos > 0
        ? 100
        : 0;

  const docsDelta =
    s && s.docsPrev > 0
      ? Math.round(((s.docsMes - s.docsPrev) / s.docsPrev) * 100)
      : s && s.docsMes > 0
        ? 100
        : 0;

  return (
    <AppShell clinical>
      <ModuleStack className="space-y-4 sm:space-y-5">
        <PageHero
          greeting={greeting}
          displayName={displayName || undefined}
          clinicName={brand.clinicName}
          dateLabel={dateLabel}
          primaryColor={brand.primaryColor}
          secondaryColor={brand.secondaryColor}
          daySummary={
            !loading && s
              ? [
                  { label: "atendimentos hoje", value: s.atendHoje },
                  { label: "pendências", value: pendenciasTotal },
                  { label: "na semana", value: s.agendaSemana },
                ]
              : undefined
          }
          actions={
            <>
              <ActionButton asChild className="h-10 px-4 text-sm" style={{ background: brand.primaryColor }}>
                <Link to="/app/pacientes">
                  <Plus className="h-4 w-4" />
                  Novo paciente
                </Link>
              </ActionButton>
              <ActionButton variant="secondary" asChild className="h-10 px-4 text-sm bg-white/90">
                <Link to="/app/agenda">
                  <CalendarDays className="h-4 w-4" />
                  Agendar
                </Link>
              </ActionButton>
            </>
          }
        />

        {stats.isError ? (
          <QueryErrorState onRetry={() => void stats.refetch()} />
        ) : loading ? (
          <ClinicalSkeleton variant="dashboard" kpiCount={6} />
        ) : (
          <>
            {isNewClinic && (
              <InfoCard variant="highlight" hoverable icon={Sparkles} title="Sua clínica está pronta para iniciar" description="Cadastre o primeiro paciente e abra sua agenda.">
                <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
                  <Link to="/app/pacientes" className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline">
                    Cadastrar paciente <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                  <Link to="/app/agenda" className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline">
                    Abrir agenda <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </InfoCard>
            )}

            <OperationalCardsGrid>
              <OperationalCard
                title="Agenda de hoje"
                icon={CalendarDays}
                value={s?.atendHoje ?? 0}
                context={s?.atendHoje ? "Atendimentos programados para hoje" : "Nenhum atendimento — agende agora"}
                to="/app/agenda"
                accent={brand.primaryColor}
                trend={{ label: `${s?.agendaSemana ?? 0} na semana`, tone: "neutral" }}
              />
              <OperationalCard
                title="Pacientes ativos"
                icon={Users}
                value={s?.pacientesAtivos ?? 0}
                context="Cadastros ativos na clínica"
                to="/app/pacientes"
                accent={brand.secondaryColor}
                trend={
                  pacientesDelta !== 0
                    ? { label: `${pacientesDelta > 0 ? "+" : ""}${pacientesDelta}% vs mês`, tone: pacientesDelta > 0 ? "success" : "neutral" }
                    : { label: "Estável no mês", tone: "neutral" }
                }
              />
              <OperationalCard
                title="Reavaliações"
                icon={RefreshCw}
                value={reavalCount}
                context={reavalCount > 0 ? "Reavaliações vencidas ou pendentes" : "Reavaliações em dia"}
                to="/app/reavaliacoes"
                accent={reavalCount > 0 ? "var(--fos-warning)" : brand.primaryColor}
                alert={reavalCount > 0}
                trend={reavalCount > 0 ? { label: "Requer atenção", tone: "warning" } : { label: "Em dia", tone: "success" }}
              />
              <OperationalCard
                title="Financeiro do mês"
                icon={DollarSign}
                value={s?.receitaMes ? brl(s.receitaMes) : "—"}
                context={s?.receitaMes ? "Receitas realizadas no mês" : "Acompanhe receitas e pendências"}
                to="/app/financeiro"
                accent="#059669"
                alert={(s?.recebiveisVencidos ?? 0) > 0}
                trend={
                  (s?.recebiveisVencidos ?? 0) > 0
                    ? { label: `${s?.recebiveisVencidos} vencido(s)`, tone: "danger" }
                    : { label: "Ver centro financeiro", tone: "neutral" }
                }
              />
              <OperationalCard
                title="Documentos recentes"
                icon={FileText}
                value={s?.docsMes ?? 0}
                context="Emitidos no mês corrente"
                to="/app/documentos"
                accent={brand.primaryColor}
                trend={
                  docsDelta !== 0
                    ? { label: `${docsDelta > 0 ? "+" : ""}${docsDelta}% vs mês ant.`, tone: docsDelta > 0 ? "success" : "neutral" }
                    : undefined
                }
              />
              <OperationalCard
                title="Pendências clínicas"
                icon={AlertTriangle}
                value={pendenciasTotal}
                context="Docs, evoluções, reavaliações e financeiro"
                to="/app/documentos"
                accent={pendenciasTotal > 0 ? "var(--fos-warning)" : brand.secondaryColor}
                alert={pendenciasTotal > 0}
                trend={pendenciasTotal > 0 ? { label: "Resolver agora", tone: "warning" } : { label: "Tudo em dia", tone: "success" }}
              />
            </OperationalCardsGrid>

            <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr] lg:gap-5">
              <AttentionList items={attentionItems} />
              <QuickAction
                items={[
                  { label: "Agenda", icon: CalendarDays, to: "/app/agenda" },
                  { label: "Pacientes", icon: Users, to: "/app/pacientes" },
                  { label: "Financeiro", icon: DollarSign, to: "/app/financeiro" },
                  { label: "Documentos", icon: FileText, to: "/app/documentos" },
                  { label: "Avaliações", icon: Stethoscope, to: "/app/avaliacoes" },
                ]}
              />
            </div>
          </>
        )}
      </ModuleStack>
    </AppShell>
  );
}

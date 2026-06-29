import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveClinic } from "@/lib/active-clinic";
import { useAuth } from "@/lib/auth";
import { useBranding } from "@/lib/branding";
import { AppShell, ClinicalSkeleton, QueryErrorState } from "@/components/layout";
import { ClinicHomeDashboard } from "@/components/home";
import type { AttentionItem } from "@/components/dashboard";
import {
  CalendarDays,
  ClipboardList,
  FileText,
  RefreshCw,
  Wallet,
} from "lucide-react";
import { fmtDate } from "@/lib/format";

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
        docsTotal,
        profissionais,
        avaliacoes,
        recibos,
        reavalPend,
        docsRascunho,
        evolSemAssin,
        hoje,
        receitaMesRows,
        recebiveisVencidos,
        recentDocs,
        recentPatients,
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
          .from("clinical_documents")
          .select("id", { count: "exact", head: true })
          .eq("clinic_id", cid),
        supabase
          .from("professionals")
          .select("id", { count: "exact", head: true })
          .eq("clinic_id", cid),
        supabase
          .from("assessments")
          .select("id", { count: "exact", head: true })
          .eq("clinic_id", cid),
        supabase
          .from("receipts")
          .select("id", { count: "exact", head: true })
          .eq("clinic_id", cid),
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
          .limit(12),
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
        supabase
          .from("clinical_documents")
          .select("id, title, doc_type, issued_at, locked_at, patients(nome_completo)")
          .eq("clinic_id", cid)
          .order("issued_at", { ascending: false })
          .limit(5),
        supabase
          .from("patients")
          .select("id, nome_completo, created_at, situacao")
          .eq("clinic_id", cid)
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      const receitaMes = (receitaMesRows.data ?? []).reduce((sum, r) => sum + Number(r.valor), 0);

      return {
        pacientesAtivos: pacientesAtivos.count ?? 0,
        pacientesAntes: pacientesAntes.count ?? 0,
        atendHoje: atendHoje.count ?? 0,
        agendaSemana: agendaSemana.count ?? 0,
        docsMes: docsMes.count ?? 0,
        docsPrev: docsPrev.count ?? 0,
        docsTotal: docsTotal.count ?? 0,
        profissionais: profissionais.count ?? 0,
        avaliacoes: avaliacoes.count ?? 0,
        recibos: recibos.count ?? 0,
        reavalPend: reavalPend.data ?? [],
        docsRascunho: docsRascunho.count ?? 0,
        evolSemAssin: evolSemAssin.count ?? 0,
        hoje: hoje.data ?? [],
        receitaMes,
        recebiveisVencidos: recebiveisVencidos.count ?? 0,
        recentDocs: recentDocs.data ?? [],
        recentPatients: recentPatients.data ?? [],
      };
    },
  });

  const s = stats.data;
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
        meta: a.status ?? undefined,
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

  return (
    <AppShell clinical>
      {stats.isError ? (
        <QueryErrorState onRetry={() => void stats.refetch()} />
      ) : loading || !s ? (
        <ClinicalSkeleton variant="dashboard" kpiCount={4} />
      ) : (
        <ClinicHomeDashboard
          greeting={greeting}
          displayName={displayName || undefined}
          clinicName={brand.clinicName}
          dateLabel={dateLabel}
          primaryColor={brand.primaryColor}
          secondaryColor={brand.secondaryColor}
          stats={s}
          attentionItems={attentionItems}
          isNewClinic={isNewClinic}
          logoUploaded={brand.hasOwnLogo}
        />
      )}
    </AppShell>
  );
}

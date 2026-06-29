import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useActiveClinic } from "@/lib/active-clinic";
import { useAuth } from "@/lib/auth";
import { useBranding } from "@/lib/branding";
import {
  EMPTY_DASHBOARD_DETAILS,
  fetchDashboardCoreStats,
  fetchDashboardDetailStats,
  type DashboardStats,
} from "@/lib/dashboard-stats";
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

  const dateKey = {
    todayIso,
    weekStartIso,
    weekEndIso,
    thisMonthIso,
    prevMonthIso,
  };

  const coreStats = useQuery({
    queryKey: ["painel-clinico-core", clinicId, todayIso, weekStartIso, weekEndIso, thisMonthIso, prevMonthIso],
    enabled: !!clinicId,
    staleTime: 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    queryFn: () => fetchDashboardCoreStats(clinicId!, dateKey),
  });

  const detailStats = useQuery({
    queryKey: ["painel-clinico-details", clinicId, todayIso],
    enabled: !!clinicId && !!coreStats.data,
    staleTime: 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    queryFn: () => fetchDashboardDetailStats(clinicId!, todayIso),
  });

  const s = useMemo((): DashboardStats | undefined => {
    if (!coreStats.data) return undefined;
    return {
      ...EMPTY_DASHBOARD_DETAILS,
      ...coreStats.data,
      ...(detailStats.data ?? {}),
    };
  }, [coreStats.data, detailStats.data]);

  const isNewClinic = !!s && s.pacientesAtivos === 0 && s.docsMes === 0 && s.atendHoje === 0;
  const loadingCore = coreStats.isLoading;
  const loadingDetails = detailStats.isLoading && !detailStats.data;

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
      {coreStats.isError ? (
        <QueryErrorState onRetry={() => void coreStats.refetch()} />
      ) : loadingCore || !s ? (
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
          loadingDetails={loadingDetails}
        />
      )}
    </AppShell>
  );
}

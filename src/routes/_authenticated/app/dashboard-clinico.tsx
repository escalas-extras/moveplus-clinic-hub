import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Activity, AlertTriangle, ClipboardList, TrendingUp, Users, CalendarClock } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from "recharts";
import { SCALES, type ScaleType } from "@/lib/clinical-scales";
import { useMemo } from "react";
import { useActiveClinic } from "@/lib/active-clinic";
import { useBranding } from "@/lib/branding";
import {
  AppShell,
  ClinicalSkeleton,
  EmptyState,
  KpiCard,
  KpiGrid,
  PageHeader,
  PageSection,
  QueryErrorState,
} from "@/components/layout";

export const Route = createFileRoute("/_authenticated/app/dashboard-clinico")({
  component: ClinicalDashboard,
});

function chartColors(primary: string) {
  return [primary, "#4a8c5e", "#7bb88a", "#b3dcbd", "#d9eede"];
}

function ClinicalDashboard() {
  const { clinicId } = useActiveClinic();
  const brand = useBranding();
  const monthIso = useMemo(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  }, []);

  const counts = useQuery({
    queryKey: ["clinical-dashboard", clinicId],
    enabled: !!clinicId,
    queryFn: async () => {
      const [pacientes, ativos, altas, scales, goals, reass] = await Promise.all([
        supabase.from("patients").select("id", { count: "exact", head: true }).eq("clinic_id", clinicId!),
        supabase.from("patients").select("id", { count: "exact", head: true }).eq("clinic_id", clinicId!).eq("situacao", "ativo"),
        supabase.from("patients").select("id", { count: "exact", head: true }).eq("clinic_id", clinicId!).eq("situacao", "inativo"),
        supabase
          .from("assessment_scales")
          .select("scale_type, risk_level, total_score, applied_at, patients!inner(clinic_id)")
          .eq("patients.clinic_id", clinicId!)
          .gte("applied_at", monthIso),
        supabase
          .from("assessment_goals")
          .select("status, term, patients!inner(clinic_id)")
          .eq("patients.clinic_id", clinicId!),
        supabase.from("reassessment_schedule").select("id, scheduled_for, completed_at").eq("clinic_id", clinicId!),
      ]);
      return {
        total: pacientes.count ?? 0,
        ativos: ativos.count ?? 0,
        altas: altas.count ?? 0,
        scales: scales.data ?? [],
        goals: goals.data ?? [],
        reass: reass.data ?? [],
      };
    },
  });

  const d = counts.data;
  const riskDist = useMemo(() => {
    const m: Record<string, number> = {};
    (d?.scales ?? []).forEach((s) => {
      if (s.risk_level) m[s.risk_level] = (m[s.risk_level] ?? 0) + 1;
    });
    return Object.entries(m).map(([k, v]) => ({ name: k, value: v }));
  }, [d]);

  const scalesByType = useMemo(() => {
    const m: Record<string, number> = {};
    (d?.scales ?? []).forEach((s) => {
      m[s.scale_type] = (m[s.scale_type] ?? 0) + 1;
    });
    return Object.entries(m).map(([k, v]) => ({ name: SCALES[k as ScaleType]?.title ?? k, value: v }));
  }, [d]);

  const goalsStatus = useMemo(() => {
    const m: Record<string, number> = {};
    (d?.goals ?? []).forEach((g) => {
      m[g.status] = (m[g.status] ?? 0) + 1;
    });
    return Object.entries(m).map(([k, v]) => ({ name: k, value: v }));
  }, [d]);

  const today = new Date().toISOString().slice(0, 10);
  const reassPending = (d?.reass ?? []).filter((r) => !r.completed_at && r.scheduled_for <= today).length;
  const palette = chartColors(brand.primaryColor);

  return (
    <AppShell clinical>
      <PageHeader
        icon={Activity}
        eyebrow="Gestão clínica"
        breadcrumbs={[{ label: "Clínica", to: "/app" }, { label: "Indicadores" }]}
        title="Indicadores Clínicos"
        description="Visão consolidada de pacientes, escalas aplicadas, risco clínico e objetivos terapêuticos."
      />

      {counts.isError ? (
        <QueryErrorState onRetry={() => void counts.refetch()} />
      ) : counts.isLoading ? (
        <ClinicalSkeleton variant="dashboard" kpiCount={4} />
      ) : (
        <>
          <KpiGrid columns={4}>
            <KpiCard icon={Users} label="Pacientes ativos" value={d?.ativos ?? 0} accent={brand.primaryColor} hideDelta />
            <KpiCard icon={TrendingUp} label="Inativos / altas" value={d?.altas ?? 0} accent="#64748b" hideDelta />
            <KpiCard icon={ClipboardList} label="Escalas no mês" value={d?.scales.length ?? 0} accent={brand.secondaryColor} hideDelta />
            <KpiCard
              icon={CalendarClock}
              label="Reavaliações pendentes"
              value={reassPending}
              accent={reassPending > 0 ? "#d97706" : brand.secondaryColor}
              hideDelta
            />
          </KpiGrid>

          <div className="grid gap-6 lg:grid-cols-2">
            <PageSection icon={AlertTriangle} title="Distribuição de risco clínico" contentClassName="p-4">
              {riskDist.length ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={riskDist} dataKey="value" nameKey="name" outerRadius={80} label>
                      {riskDist.map((_, i) => (
                        <Cell key={i} fill={palette[i % palette.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState icon={AlertTriangle} title="Sem dados de risco" description="Aplique escalas nas avaliações para visualizar a distribuição." className="py-8" />
              )}
            </PageSection>

            <PageSection icon={Activity} title="Escalas aplicadas no mês" contentClassName="p-4">
              {scalesByType.length ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={scalesByType}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" fontSize={11} />
                    <YAxis fontSize={11} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="value" fill={brand.primaryColor} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState icon={ClipboardList} title="Sem escalas no período" description="Nenhuma escala foi registrada neste mês." className="py-8" />
              )}
            </PageSection>

            <PageSection icon={TrendingUp} title="Status dos objetivos terapêuticos" className="lg:col-span-2" contentClassName="p-4">
              {goalsStatus.length ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={goalsStatus}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" fontSize={11} />
                    <YAxis fontSize={11} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="value" fill={brand.secondaryColor} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState icon={TrendingUp} title="Sem objetivos definidos" description="Objetivos terapêuticos aparecem após avaliações com metas registradas." className="py-8" />
              )}
            </PageSection>
          </div>
        </>
      )}
    </AppShell>
  );
}

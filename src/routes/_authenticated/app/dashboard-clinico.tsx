import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Activity, AlertTriangle, ClipboardList, TrendingUp, Users, CalendarClock } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid, LineChart, Line } from "recharts";
import { RISK_COLORS, SCALES, type ScaleType } from "@/lib/clinical-scales";
import { useMemo } from "react";

export const Route = createFileRoute("/_authenticated/app/dashboard-clinico")({
  component: ClinicalDashboard,
});

const COLORS = ["#2f5d3a", "#4a8c5e", "#7bb88a", "#b3dcbd", "#d9eede"];

function ClinicalDashboard() {
  const monthIso = useMemo(() => { const d = new Date(); d.setDate(1); return d.toISOString().slice(0,10); }, []);

  const counts = useQuery({
    queryKey: ["clinical-dashboard"],
    queryFn: async () => {
      const [pacientes, ativos, altas, scales, goals, reass] = await Promise.all([
        supabase.from("patients").select("id", { count: "exact", head: true }),
        supabase.from("patients").select("id", { count: "exact", head: true }).eq("situacao", "ativo"),
        supabase.from("patients").select("id", { count: "exact", head: true }).eq("situacao", "inativo"),
        supabase.from("assessment_scales").select("scale_type, risk_level, total_score, applied_at").gte("applied_at", monthIso),
        supabase.from("assessment_goals").select("status, term"),
        supabase.from("reassessment_schedule").select("id, scheduled_for, completed_at"),
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
    (d?.scales ?? []).forEach((s) => { if (s.risk_level) m[s.risk_level] = (m[s.risk_level] ?? 0) + 1; });
    return Object.entries(m).map(([k, v]) => ({ name: k, value: v }));
  }, [d]);

  const scalesByType = useMemo(() => {
    const m: Record<string, number> = {};
    (d?.scales ?? []).forEach((s) => { m[s.scale_type] = (m[s.scale_type] ?? 0) + 1; });
    return Object.entries(m).map(([k, v]) => ({ name: SCALES[k as ScaleType]?.title ?? k, value: v }));
  }, [d]);

  const goalsStatus = useMemo(() => {
    const m: Record<string, number> = {};
    (d?.goals ?? []).forEach((g) => { m[g.status] = (m[g.status] ?? 0) + 1; });
    return Object.entries(m).map(([k, v]) => ({ name: k, value: v }));
  }, [d]);

  const today = new Date().toISOString().slice(0,10);
  const reassPending = (d?.reass ?? []).filter((r) => !r.completed_at && r.scheduled_for <= today).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Painel Clínico</h1>
        <p className="text-sm text-muted-foreground">Indicadores clínicos consolidados</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi icon={Users} label="Pacientes ativos" value={d?.ativos ?? 0} />
        <Kpi icon={TrendingUp} label="Inativos / Altas" value={d?.altas ?? 0} />
        <Kpi icon={ClipboardList} label="Escalas no mês" value={d?.scales.length ?? 0} />
        <Kpi icon={CalendarClock} label="Reavaliações pendentes" value={reassPending} alert={reassPending > 0} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-4">
          <h3 className="font-semibold mb-2 flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Distribuição de Risco Clínico</h3>
          {riskDist.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={riskDist} dataKey="value" nameKey="name" outerRadius={80} label>
                  {riskDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-muted-foreground">Sem dados</p>}
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold mb-2 flex items-center gap-2"><Activity className="h-4 w-4" /> Escalas aplicadas no mês</h3>
          {scalesByType.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={scalesByType}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={11} />
                <YAxis fontSize={11} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#2f5d3a" />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-muted-foreground">Sem dados</p>}
        </Card>

        <Card className="p-4 lg:col-span-2">
          <h3 className="font-semibold mb-2">Status dos objetivos terapêuticos</h3>
          {goalsStatus.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={goalsStatus}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={11} />
                <YAxis fontSize={11} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#4a8c5e" />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-muted-foreground">Sem objetivos definidos</p>}
        </Card>
      </div>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, alert }: { icon: any; label: string; value: number; alert?: boolean }) {
  return (
    <Card className={`p-4 ${alert ? "border-amber-400" : ""}`}>
      <div className="flex items-center gap-2 text-muted-foreground text-xs"><Icon className="h-4 w-4" /> {label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </Card>
  );
}

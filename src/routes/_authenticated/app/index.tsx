import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useRoles } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Users, CalendarDays, ClipboardCheck, Wallet, RefreshCw, FileWarning, LogOut, AlertTriangle, TrendingUp, Plus } from "lucide-react";
import { brl, fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { OnboardingChecklist } from "@/components/onboarding-checklist";
import { useBranding } from "@/lib/branding";

export const Route = createFileRoute("/_authenticated/app/")({
  component: Dashboard,
});

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

function Dashboard() {
  const { user } = useAuth();
  const { isAdmin } = useRoles(user?.id);
  const brand = useBranding();
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = new Date(); monthStart.setDate(1);
  const monthIso = monthStart.toISOString().slice(0, 10);

  const stats = useQuery({
    queryKey: ["dashboard-premium", today, monthIso, isAdmin],
    queryFn: async () => {
      const [pacientes, novos, hoje, mesPag, sessoesMes, pendentes, reavalAtrasadas, altasMes] = await Promise.all([
        supabase.from("patients").select("id", { count: "exact", head: true }).eq("situacao", "ativo"),
        supabase.from("patients").select("id", { count: "exact", head: true }).gte("created_at", monthIso),
        supabase.from("appointments").select("id, horario, status, patients(nome_completo), professionals(nome)").eq("data", today).order("horario"),
        supabase.from("financial_entries").select("valor").eq("status", "pago").gte("data", monthIso),
        supabase.from("evolutions").select("id", { count: "exact", head: true }).gte("data", monthIso),
        supabase.from("financial_entries").select("id", { count: "exact", head: true }).eq("status", "pendente"),
        supabase.from("reassessment_schedule").select("id, patient_id, scheduled_for, patients(nome_completo)").lte("scheduled_for", today).is("completed_at", null).order("scheduled_for").limit(10),
        supabase.from("patient_discharges").select("id", { count: "exact", head: true }).gte("data_alta", monthIso),
      ]);
      const fatMes = (mesPag.data ?? []).reduce((s, r) => s + Number(r.valor ?? 0), 0);
      return {
        pacientesAtivos: pacientes.count ?? 0,
        novosMes: novos.count ?? 0,
        hoje: hoje.data ?? [],
        fatMes,
        sessoesMes: sessoesMes.count ?? 0,
        pendentes: pendentes.count ?? 0,
        reavalAtrasadas: reavalAtrasadas.data ?? [],
        altasMes: altasMes.count ?? 0,
      };
    },
  });

  const s = stats.data;
  const userName = (user?.user_metadata as any)?.full_name?.split(" ")[0] || "";

  return (
    <div className="space-y-6">
      {/* Saudação com identidade da clínica */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl">{greeting()}{userName ? `, ${userName}` : ""} 👋</h1>
          <p className="text-muted-foreground text-sm">
            <span style={{ color: brand.primaryColor }} className="font-medium">{brand.clinicName}</span> · {fmtDate(today)}
          </p>
        </div>
        <div className="text-xs text-muted-foreground italic">{brand.slogan}</div>
      </div>

      <OnboardingChecklist />

      {/* Cards principais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <StatCard icon={Users} label="Pacientes ativos" value={s?.pacientesAtivos ?? "—"} hint={`${s?.novosMes ?? 0} novos no mês`} to="/app/pacientes" color={brand.primaryColor} />
        <StatCard icon={CalendarDays} label="Atendimentos hoje" value={s?.hoje.length ?? "—"} to="/app/agenda" color={brand.primaryColor} />
        <StatCard icon={RefreshCw} label="Reavaliações vencidas" value={s?.reavalAtrasadas.length ?? "—"} to="/app/reavaliacoes" color={(s?.reavalAtrasadas.length ?? 0) > 0 ? "#c75c3a" : brand.primaryColor} />
        <StatCard icon={ClipboardCheck} label="Sessões no mês" value={s?.sessoesMes ?? "—"} color={brand.primaryColor} />
        <StatCard icon={LogOut} label="Altas no mês" value={s?.altasMes ?? "—"} color={brand.primaryColor} />
        {isAdmin && (
          <>
            <StatCard icon={Wallet} label="Faturamento do mês" value={brl(s?.fatMes ?? 0)} hint={`${s?.pendentes ?? 0} pendentes`} to="/app/financeiro" color={brand.primaryColor} />
            <StatCard icon={TrendingUp} label="Sessões/paciente" value={s && s.pacientesAtivos ? (s.sessoesMes / s.pacientesAtivos).toFixed(1) : "—"} color={brand.primaryColor} />
            <StatCard icon={FileWarning} label="Contas pendentes" value={s?.pendentes ?? "—"} to="/app/financeiro" color={brand.primaryColor} />
          </>
        )}
      </div>

      {/* Alertas inteligentes */}
      {s && s.reavalAtrasadas.length > 0 && (
        <Card className="p-5 border-l-4" style={{ borderLeftColor: "#c75c3a" }}>
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-sm">{s.reavalAtrasadas.length} reavaliação(ões) em atraso</h3>
              <ul className="mt-2 space-y-1 text-sm">
                {s.reavalAtrasadas.slice(0, 5).map((r: any) => (
                  <li key={r.id} className="flex items-center justify-between gap-2">
                    <Link to="/app/pacientes/$id" params={{ id: r.patient_id }} className="hover:underline truncate">
                      {r.patients?.nome_completo}
                    </Link>
                    <span className="text-xs text-muted-foreground tabular-nums">vence em {fmtDate(r.scheduled_for)}</span>
                  </li>
                ))}
                {s.reavalAtrasadas.length > 5 && (
                  <li><Link to="/app/reavaliacoes" className="text-xs text-primary hover:underline">Ver todas →</Link></li>
                )}
              </ul>
            </div>
          </div>
        </Card>
      )}

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Agenda do dia */}
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Agenda de hoje</h2>
            <Link to="/app/agenda" className="text-xs text-primary hover:underline">Ver semana</Link>
          </div>
          {!s?.hoje.length ? (
            <p className="text-sm text-muted-foreground">Nenhum atendimento agendado para hoje.</p>
          ) : (
            <ul className="divide-y">
              {s.hoje.map((a: any) => (
                <li key={a.id} className="py-3 flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{a.patients?.nome_completo}</div>
                    <div className="text-xs text-muted-foreground truncate">{a.professionals?.nome} · {a.status}</div>
                  </div>
                  <div className="text-sm tabular-nums" style={{ color: brand.primaryColor }}>{String(a.horario).slice(0, 5)}</div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Ações rápidas */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Ações rápidas</h2>
          <div className="space-y-2">
            <QuickAction to="/app/pacientes" icon={Plus} label="Novo paciente" color={brand.primaryColor} />
            <QuickAction to="/app/agenda" icon={CalendarDays} label="Agendar atendimento" color={brand.primaryColor} />
            <QuickAction to="/app/reavaliacoes" icon={RefreshCw} label="Programar reavaliação" color={brand.primaryColor} />
            <QuickAction to="/app/templates" icon={ClipboardCheck} label="Gerenciar modelos" color={brand.primaryColor} />
          </div>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, hint, to, color }: { icon: any; label: string; value: any; hint?: string; to?: string; color?: string }) {
  const content = (
    <Card className={cn("p-4 sm:p-5 h-full lift", to && "lift-hover cursor-pointer")}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] sm:text-xs uppercase tracking-[0.12em] text-muted-foreground truncate">{label}</div>
          <div className="text-2xl sm:text-3xl font-semibold mt-1.5 tabular-nums">{value}</div>
          {hint && <div className="text-xs text-muted-foreground mt-1 truncate">{hint}</div>}
        </div>
        <div
          className="rounded-2xl p-2.5 flex-shrink-0 ring-1 ring-white/60"
          style={{ background: color ? `linear-gradient(135deg, ${color}22, ${color}10)` : undefined, color }}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
  if (!to) return content;
  return <Link to={to} className="block h-full">{content}</Link>;
}

function QuickAction({ to, icon: Icon, label, color }: { to: string; icon: any; label: string; color: string }) {
  return (
    <Link to={to} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors text-sm">
      <div className="rounded p-1.5" style={{ background: `${color}15`, color }}>
        <Icon className="h-4 w-4" />
      </div>
      <span className="flex-1">{label}</span>
    </Link>
  );
}

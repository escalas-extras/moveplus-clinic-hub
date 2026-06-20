import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useRoles } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Users, CalendarDays, ClipboardCheck, Wallet } from "lucide-react";
import { brl, fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { OnboardingChecklist } from "@/components/onboarding-checklist";




export const Route = createFileRoute("/_authenticated/app/")({
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();
  const { isAdmin } = useRoles(user?.id);
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = new Date(); monthStart.setDate(1);
  const monthIso = monthStart.toISOString().slice(0, 10);

  const stats = useQuery({
    queryKey: ["dashboard", today, monthIso, isAdmin],
    queryFn: async () => {
      const [pacientes, novos, hoje, mesPag, sessoesMes, pendentes] = await Promise.all([
        supabase.from("patients").select("id", { count: "exact", head: true }).eq("situacao", "ativo"),
        supabase.from("patients").select("id", { count: "exact", head: true }).gte("created_at", monthIso),
        supabase.from("appointments").select("*, patients(nome_completo), professionals(nome)").eq("data", today).order("horario"),
        supabase.from("financial_entries").select("valor").eq("status", "pago").gte("data", monthIso),
        supabase.from("evolutions").select("id", { count: "exact", head: true }).gte("data", monthIso),
        supabase.from("financial_entries").select("id", { count: "exact", head: true }).eq("status", "pendente"),
      ]);
      const fatMes = (mesPag.data ?? []).reduce((s, r) => s + Number(r.valor ?? 0), 0);
      return {
        pacientesAtivos: pacientes.count ?? 0,
        novosMes: novos.count ?? 0,
        hoje: hoje.data ?? [],
        fatMes,
        sessoesMes: sessoesMes.count ?? 0,
        pendentes: pendentes.count ?? 0,
      };
    },
  });

  const s = stats.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl">Bom dia 👋</h1>
        <p className="text-muted-foreground text-sm">Resumo da clínica em {fmtDate(today)}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Pacientes ativos" value={s?.pacientesAtivos ?? "—"} hint={`${s?.novosMes ?? 0} novos no mês`} to="/app/pacientes" />
        <StatCard icon={CalendarDays} label="Atendimentos hoje" value={s?.hoje.length ?? "—"} to="/app/agenda" />
        <StatCard icon={ClipboardCheck} label="Sessões no mês" value={s?.sessoesMes ?? "—"} />
        {isAdmin && <StatCard icon={Wallet} label="Faturamento do mês" value={brl(s?.fatMes ?? 0)} hint={`${s?.pendentes ?? 0} pendentes`} to="/app/financeiro" />}
      </div>

      <Card className="p-6">
        <h2 className="text-xl mb-4">Agenda de hoje</h2>
        {!s?.hoje.length ? (
          <p className="text-sm text-muted-foreground">Nenhum atendimento agendado para hoje.</p>
        ) : (
          <ul className="divide-y">
            {s.hoje.map((a: any) => (
              <li key={a.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="font-medium">{a.patients?.nome_completo}</div>
                  <div className="text-xs text-muted-foreground">{a.professionals?.nome} · {a.status}</div>
                </div>
                <div className="text-sm tabular-nums">{String(a.horario).slice(0, 5)}</div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, hint, to }: { icon: any; label: string; value: any; hint?: string; to?: string }) {
  const content = (
    <Card className={cn("p-5", to && "hover:border-primary/60 hover:shadow-sm transition-colors cursor-pointer")}>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
          <div className="text-2xl font-semibold mt-1">{value}</div>
          {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
        </div>
        <div className="rounded-lg p-2 bg-secondary text-secondary-foreground">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
  if (!to) return content;
  return (
    <Link to={to} className="block">
      {content}
    </Link>
  );
}

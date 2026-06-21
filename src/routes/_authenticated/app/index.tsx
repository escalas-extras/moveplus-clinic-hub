import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useRoles } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Users, CalendarDays, ClipboardCheck, Wallet, RefreshCw, FileWarning, LogOut, AlertTriangle, TrendingUp, Plus, FileText, BookOpen, BarChart3 } from "lucide-react";
import { brl, fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { OnboardingChecklist } from "@/components/onboarding-checklist";
import { useBranding } from "@/lib/branding";

export const Route = createFileRoute("/_authenticated/app/")({
  beforeLoad: async () => {
    const { data: sess } = await supabase.auth.getUser();
    if (!sess.user) return;
    const [rolesRes, membersRes] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", sess.user.id),
      supabase.from("clinic_members").select("id").eq("user_id", sess.user.id).eq("active", true).limit(1),
    ]);
    const isSuperAdmin = (rolesRes.data ?? []).some((r) => r.role === "super_admin");
    const hasClinic = (membersRes.data ?? []).length > 0;
    if (isSuperAdmin && !hasClinic) throw redirect({ to: "/app/admin-saas" });
  },
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
      const [pacientes, novos, hoje, mesPag, sessoesMes, pendentes, reavalPend, altasMes, docsMes] = await Promise.all([
        supabase.from("patients").select("id", { count: "exact", head: true }).eq("situacao", "ativo"),
        supabase.from("patients").select("id", { count: "exact", head: true }).gte("created_at", monthIso),
        supabase.from("appointments").select("id, horario, status, patients(nome_completo), professionals(nome)").eq("data", today).order("horario"),
        supabase.from("financial_entries").select("valor").eq("status", "pago").gte("data", monthIso),
        supabase.from("evolutions").select("id", { count: "exact", head: true }).gte("data", monthIso),
        supabase.from("financial_entries").select("id", { count: "exact", head: true }).eq("status", "pendente"),
        supabase.from("reassessment_schedule").select("id, patient_id, scheduled_for, patients(nome_completo)").lte("scheduled_for", today).is("completed_at", null).order("scheduled_for").limit(10),
        supabase.from("patient_discharges").select("id", { count: "exact", head: true }).gte("data_alta", monthIso),
        supabase.from("assessments").select("id", { count: "exact", head: true }).gte("created_at", monthIso),
      ]);
      const fatMes = (mesPag.data ?? []).reduce((s, r) => s + Number(r.valor ?? 0), 0);
      return {
        pacientesAtivos: pacientes.count ?? 0,
        novosMes: novos.count ?? 0,
        hoje: hoje.data ?? [],
        fatMes,
        sessoesMes: sessoesMes.count ?? 0,
        pendentes: pendentes.count ?? 0,
        reavalAtrasadas: reavalPend.data ?? [],
        altasMes: altasMes.count ?? 0,
        docsMes: docsMes.count ?? 0,
      };
    },
  });

  const s = stats.data;
  const userName = (user?.user_metadata as any)?.full_name?.split(" ")[0] || "";

  return (
    <div className="space-y-10">
      {/* Saudação minimalista — topbar já mostra clínica e data */}
      {/* Saudação personalizada */}
      <div>
        <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight">{greeting()}{userName ? `, ${userName}` : ""}</h1>
        <p className="text-muted-foreground text-sm mt-2">Gestão clínica de hoje · {brand.clinicName} · {fmtDate(today)}</p>
      </div>

      <OnboardingChecklist />

      {/* Indicadores principais */}
      <section className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">Indicadores</h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
          <StatCard icon={Users} label="Pacientes" value={s?.pacientesAtivos ?? 0} hint={s?.novosMes ? `+${s.novosMes} este mês` : undefined} to="/app/pacientes" color={brand.primaryColor} />
          <StatCard icon={CalendarDays} label="Atendimentos de hoje" value={s?.hoje.length ?? 0} to="/app/agenda" color={brand.secondaryColor} />
          <StatCard icon={FileText} label="Documentos emitidos" value={s?.docsMes ?? 0} to="/app/documentos" color={brand.primaryColor} />
          <StatCard icon={RefreshCw} label="Reavaliações pendentes" value={s?.reavalAtrasadas.length ?? 0} to="/app/reavaliacoes" color={(s?.reavalAtrasadas.length ?? 0) > 0 ? "#c75c3a" : brand.primaryColor} tone={(s?.reavalAtrasadas.length ?? 0) > 0 ? "warn" : "default"} />
        </div>
        {isAdmin && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
            <StatCard icon={ClipboardCheck} label="Sessões no mês" value={s?.sessoesMes ?? 0} color={brand.primaryColor} small />
            <StatCard icon={LogOut} label="Altas no mês" value={s?.altasMes ?? 0} color={brand.secondaryColor} small />
            <StatCard icon={Wallet} label="Faturamento do mês" value={brl(s?.fatMes ?? 0)} hint={s?.pendentes ? `${s.pendentes} pendentes` : undefined} to="/app/financeiro" color={brand.primaryColor} small />
            <StatCard icon={TrendingUp} label="Sessões/paciente" value={s && s.pacientesAtivos ? (s.sessoesMes / s.pacientesAtivos).toFixed(1) : "0"} color={brand.primaryColor} small />
          </div>
        )}
      </section>

      {/* Alertas inteligentes */}
      {s && s.reavalAtrasadas.length > 0 && (
        <Card className="p-6 border-l-4" style={{ borderLeftColor: "#c75c3a" }}>
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

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Agenda do dia */}
        <Card className="p-7 lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-1">Hoje</div>
              <h2 className="text-xl font-semibold tracking-tight">Agenda do dia</h2>
            </div>
            <Link to="/app/agenda" className="text-xs text-primary hover:underline">Ver semana →</Link>
          </div>
          {!s?.hoje.length ? (
            <p className="text-sm text-muted-foreground">Nenhum atendimento agendado para hoje.</p>
          ) : (
            <ul className="divide-y divide-white/60">
              {s.hoje.map((a: any) => (
                <li key={a.id} className="py-3.5 flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{a.patients?.nome_completo}</div>
                    <div className="text-xs text-muted-foreground truncate">{a.professionals?.nome} · {a.status}</div>
                  </div>
                  <div className="text-base font-semibold tabular-nums" style={{ color: brand.primaryColor }}>{String(a.horario).slice(0, 5)}</div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Ações rápidas */}
        <Card className="p-7">
          <div className="mb-5">
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-1">Atalhos</div>
            <h2 className="text-xl font-semibold tracking-tight">Ações rápidas</h2>
          </div>
          <div className="space-y-1.5">
            <QuickAction to="/app/pacientes" icon={Plus} label="Novo paciente" color={brand.primaryColor} />
            <QuickAction to="/app/agenda" icon={CalendarDays} label="Agendar atendimento" color={brand.primaryColor} />
            <QuickAction to="/app/reavaliacoes" icon={RefreshCw} label="Programar reavaliação" color={brand.primaryColor} />
            <QuickAction to="/app/documentos" icon={ClipboardCheck} label="Emitir documento" color={brand.primaryColor} />
          </div>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, hint, to, color, tone = "default", small = false }: { icon: any; label: string; value: any; hint?: string; to?: string; color?: string; tone?: "default" | "warn"; small?: boolean }) {
  const content = (
    <Card className={cn("p-6 h-full lift relative overflow-hidden", to && "lift-hover cursor-pointer")}>
      {/* halo interno suave na cor */}
      <div
        className="absolute -top-12 -right-12 w-40 h-40 rounded-full opacity-30 blur-2xl pointer-events-none"
        style={{ background: color ?? undefined }}
        aria-hidden
      />
      <div className="relative">
        <div className="flex items-center justify-between">
          <div
            className="rounded-xl p-2 flex items-center justify-center"
            style={{ background: color ? `${color}18` : undefined, color }}
          >
            <Icon className="h-4 w-4" />
          </div>
          {tone === "warn" && <span className="text-[10px] uppercase tracking-wider font-semibold text-orange-600">Atenção</span>}
        </div>
        <div className={cn("num-hero mt-4 font-semibold", small ? "text-3xl sm:text-4xl" : "text-5xl sm:text-6xl")} style={{ color: tone === "warn" ? "#c75c3a" : undefined }}>
          {value}
        </div>
        <div className="mt-3 text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-medium truncate">{label}</div>
        {hint && <div className="text-xs text-muted-foreground/80 mt-1 truncate">{hint}</div>}
      </div>
    </Card>
  );
  if (!to) return content;
  return <Link to={to} className="block h-full">{content}</Link>;
}

function QuickAction({ to, icon: Icon, label, color }: { to: string; icon: any; label: string; color: string }) {
  return (
    <Link to={to} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/60 transition-colors text-sm lift">
      <div className="rounded-lg p-1.5" style={{ background: `${color}18`, color }}>
        <Icon className="h-4 w-4" />
      </div>
      <span className="flex-1">{label}</span>
      <span className="text-muted-foreground/60">→</span>
    </Link>
  );
}


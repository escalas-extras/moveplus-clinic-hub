import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveClinic } from "@/lib/active-clinic";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users, CalendarDays, FileText, RefreshCw, ArrowUpRight, ArrowDownRight,
  Minus, Sparkles, AlertTriangle, FileSignature, ClipboardList, UserCheck,
  ArrowRight, Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useBranding } from "@/lib/branding";

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
    // Admin SaaS sempre vai ao painel SaaS, exceto quando em Modo Suporte (atuando como clínica).
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

const STATUS_META: Record<string, { label: string; cls: string }> = {
  agendado:   { label: "Pendente",   cls: "bg-amber-50 text-amber-700 ring-1 ring-amber-200" },
  pendente:   { label: "Pendente",   cls: "bg-amber-50 text-amber-700 ring-1 ring-amber-200" },
  confirmado: { label: "Confirmado", cls: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" },
  realizado:  { label: "Confirmado", cls: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" },
  concluido:  { label: "Confirmado", cls: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" },
  cancelado:  { label: "Cancelado",  cls: "bg-rose-50 text-rose-700 ring-1 ring-rose-200" },
  faltou:     { label: "Cancelado",  cls: "bg-rose-50 text-rose-700 ring-1 ring-rose-200" },
};

function PainelClinico() {
  const { clinicId } = useActiveClinic();
  const brand = useBranding();

  const today = new Date();
  const todayIso = isoDate(today);
  const thisMonth = startOfMonth(today);
  const prevMonth = new Date(thisMonth.getFullYear(), thisMonth.getMonth() - 1, 1);
  const thisMonthIso = isoDate(thisMonth);
  const prevMonthIso = isoDate(prevMonth);

  const stats = useQuery({
    queryKey: ["painel-clinico", clinicId, todayIso, thisMonthIso, prevMonthIso],
    enabled: !!clinicId,
    queryFn: async () => {
      const cid = clinicId!;
      const [
        pacientesAtivos, pacientesAntes,
        atendMes, atendPrev,
        docsMes, docsPrev,
        reavalPend,
        // sidebar
        docsRascunho, evolSemAssin, retorno,
        hoje,
      ] = await Promise.all([
        supabase.from("patients").select("id", { count: "exact", head: true }).eq("clinic_id", cid).eq("situacao", "ativo"),
        supabase.from("patients").select("id", { count: "exact", head: true }).eq("clinic_id", cid).eq("situacao", "ativo").lt("created_at", thisMonthIso),
        supabase.from("appointments").select("id", { count: "exact", head: true }).eq("clinic_id", cid).gte("data", thisMonthIso),
        supabase.from("appointments").select("id", { count: "exact", head: true }).eq("clinic_id", cid).gte("data", prevMonthIso).lt("data", thisMonthIso),
        supabase.from("clinical_documents").select("id", { count: "exact", head: true }).eq("clinic_id", cid).gte("issued_at", thisMonthIso),
        supabase.from("clinical_documents").select("id", { count: "exact", head: true }).eq("clinic_id", cid).gte("issued_at", prevMonthIso).lt("issued_at", thisMonthIso),
        supabase.from("reassessment_schedule").select("id, patient_id, scheduled_for, patients(nome_completo)").eq("clinic_id", cid).lte("scheduled_for", todayIso).is("completed_at", null).order("scheduled_for").limit(10),
        // sidebar
        supabase.from("clinical_documents").select("id", { count: "exact", head: true }).eq("clinic_id", cid).is("locked_at", null),
        supabase.from("evolutions").select("id", { count: "exact", head: true }).eq("clinic_id", cid).is("locked_at", null),
        supabase.from("patients").select("id, nome_completo, updated_at").eq("clinic_id", cid).eq("situacao", "ativo").order("updated_at", { ascending: true }).limit(5),
        supabase.from("appointments").select("id, horario, status, observacao, patients(nome_completo), professionals(nome)").eq("clinic_id", cid).eq("data", todayIso).order("horario"),
      ]);
      return {
        pacientesAtivos: pacientesAtivos.count ?? 0,
        pacientesAntes: pacientesAntes.count ?? 0,
        atendMes: atendMes.count ?? 0,
        atendPrev: atendPrev.count ?? 0,
        docsMes: docsMes.count ?? 0,
        docsPrev: docsPrev.count ?? 0,
        reavalPend: reavalPend.data ?? [],
        docsRascunho: docsRascunho.count ?? 0,
        evolSemAssin: evolSemAssin.count ?? 0,
        retorno: retorno.data ?? [],
        hoje: hoje.data ?? [],
      };
    },
  });

  const s = stats.data;
  const reavalCount = s?.reavalPend.length ?? 0;
  const isNewClinic = !!s && s.pacientesAtivos === 0 && s.atendMes === 0 && s.docsMes === 0;

  return (
    <div className="space-y-8">
      {/* Cabeçalho */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-3">
            <Sparkles className="h-3.5 w-3.5" style={{ color: brand.primaryColor }} /> {brand.clinicName}
          </div>
          <h1 className="text-[2rem] leading-tight font-semibold tracking-tight">Painel Clínico</h1>
          <p className="mt-1.5 text-[16px] text-muted-foreground">Resumo operacional da clínica em tempo real.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/app/pacientes" className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-soft" style={{ background: brand.primaryColor }}>
            <Plus className="h-4 w-4" /> Novo paciente
          </Link>
          <Link to="/app/agenda" className="inline-flex items-center gap-2 rounded-xl bg-white/75 px-4 py-2 text-sm font-medium shadow-soft hover:bg-white">
            <CalendarDays className="h-4 w-4" /> Agendar
          </Link>
        </div>
      </header>

      {/* Onboarding card quando clínica nova */}
      {isNewClinic && (
        <Card className="p-6 border border-dashed" style={{ borderColor: `${brand.primaryColor}66`, background: `linear-gradient(135deg, ${brand.primaryColor}10, ${brand.secondaryColor}08)` }}>
          <div className="flex items-start gap-4">
            <div className="rounded-2xl p-3 text-white shadow-soft" style={{ background: `linear-gradient(135deg, ${brand.primaryColor}, ${brand.secondaryColor})` }}>
              <Sparkles className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h2 className="text-[24px] font-semibold tracking-tight">Sua clínica está pronta para iniciar.</h2>
              <p className="text-[14px] text-muted-foreground mt-1">Cadastre o primeiro paciente, configure sua agenda e emita seu primeiro documento.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link to="/app/pacientes" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">Cadastrar paciente <ArrowRight className="h-3.5 w-3.5" /></Link>
                <span className="text-muted-foreground/50">·</span>
                <Link to="/app/agenda" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">Abrir agenda <ArrowRight className="h-3.5 w-3.5" /></Link>
                <span className="text-muted-foreground/50">·</span>
                <Link to="/app/configuracoes" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">Personalizar marca <ArrowRight className="h-3.5 w-3.5" /></Link>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* KPIs */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
        <KpiCard
          icon={Users}
          label="Pacientes ativos"
          value={s?.pacientesAtivos ?? 0}
          previous={s?.pacientesAntes ?? 0}
          to="/app/pacientes"
          accent={brand.primaryColor}
          period="vs início do mês"
        />
        <KpiCard
          icon={CalendarDays}
          label="Atendimentos do mês"
          value={s?.atendMes ?? 0}
          previous={s?.atendPrev ?? 0}
          to="/app/agenda"
          accent={brand.secondaryColor}
          period="vs mês anterior"
        />
        <KpiCard
          icon={FileText}
          label="Documentos emitidos"
          value={s?.docsMes ?? 0}
          previous={s?.docsPrev ?? 0}
          to="/app/documentos"
          accent={brand.primaryColor}
          period="vs mês anterior"
        />
        <KpiCard
          icon={RefreshCw}
          label="Reavaliações pendentes"
          value={reavalCount}
          tone={reavalCount > 0 ? "warning" : "default"}
          to="/app/reavaliacoes"
          accent={reavalCount > 0 ? "var(--warning)" : brand.primaryColor}
          hideDelta
          subtitle={reavalCount > 0 ? "Requer atenção" : "Em dia"}
        />
      </section>

      {/* Agenda + Atividades */}
      <div className="grid lg:grid-cols-[1.7fr_1fr] gap-5">
        {/* Agenda de hoje */}
        <Card className="p-6 lg:p-7 h-full">
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-1">Hoje</div>
              <h2 className="text-[24px] font-semibold tracking-tight">Agenda do dia</h2>
            </div>
            <Link to="/app/agenda" className="text-xs font-medium text-primary hover:underline">Ver semana →</Link>
          </div>

          {!s?.hoje.length ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              <CalendarDays className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
              Nenhum atendimento agendado para hoje.
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border/60">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-semibold">Horário</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Paciente</th>
                    <th className="text-left px-4 py-2.5 font-semibold hidden sm:table-cell">Atendimento</th>
                    <th className="text-right px-4 py-2.5 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {s.hoje.map((a: any) => {
                    const meta = STATUS_META[a.status as string] ?? { label: a.status ?? "—", cls: "bg-muted text-muted-foreground" };
                    return (
                      <tr key={a.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 tabular-nums font-semibold" style={{ color: brand.primaryColor }}>{String(a.horario).slice(0, 5)}</td>
                        <td className="px-4 py-3 font-medium truncate">{a.patients?.nome_completo ?? "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground truncate hidden sm:table-cell">
                          {a.observacao || a.professionals?.nome || "Consulta"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={cn("inline-flex items-center text-[11px] font-semibold rounded-full px-2.5 py-0.5", meta.cls)}>{meta.label}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Atividades Importantes */}
        <Card className="p-6 lg:p-7 h-full">
          <div className="mb-5">
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-1">Pendências</div>
            <h2 className="text-[24px] font-semibold tracking-tight">Atividades importantes</h2>
          </div>
          <div className="space-y-2">
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

          {s && reavalCount === 0 && (s.docsRascunho ?? 0) === 0 && (s.evolSemAssin ?? 0) === 0 && (
            <div className="mt-6 rounded-xl bg-emerald-50/60 border border-emerald-200/70 px-3 py-2.5 text-xs text-emerald-800 flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5" /> Tudo em dia. Nenhuma pendência crítica.
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

/* ───── Subcomponentes ───── */

function KpiCard({
  icon: Icon, label, value, previous, period, to, accent, tone = "default", hideDelta, subtitle,
}: {
  icon: any;
  label: string;
  value: number;
  previous?: number;
  period?: string;
  to?: string;
  accent: string;
  tone?: "default" | "warning";
  hideDelta?: boolean;
  subtitle?: string;
}) {
  const hasPrev = typeof previous === "number" && previous > 0;
  const delta = hasPrev ? ((value - previous!) / previous!) * 100 : value > 0 ? 100 : 0;
  const up = delta > 0;
  const down = delta < 0;
  const DeltaIcon = up ? ArrowUpRight : down ? ArrowDownRight : Minus;
  const deltaCls = up
    ? "text-emerald-700 bg-emerald-50 ring-emerald-200"
    : down
      ? "text-rose-700 bg-rose-50 ring-rose-200"
      : "text-muted-foreground bg-muted ring-border";

  const inner = (
    <Card className={cn("p-5 lg:p-6 h-full lift relative overflow-hidden", to && "lift-hover cursor-pointer")}>
      <div
        aria-hidden
        className="absolute -top-10 -right-10 h-28 w-28 rounded-full opacity-25 blur-2xl pointer-events-none"
        style={{ background: accent }}
      />
      <div className="relative flex items-start justify-between">
        <div
          className="rounded-xl p-2.5 flex items-center justify-center"
          style={{ background: `${accent}1A`, color: accent }}
        >
          <Icon className="h-4 w-4" />
        </div>
        {!hideDelta && (
          <span className={cn("inline-flex items-center gap-1 text-[11px] font-semibold rounded-full px-2 py-0.5 ring-1", deltaCls)}>
            <DeltaIcon className="h-3 w-3" />
            {hasPrev ? `${Math.abs(delta).toFixed(0)}%` : value > 0 ? "Novo" : "0%"}
          </span>
        )}
        {hideDelta && tone === "warning" && (
          <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 ring-1 ring-amber-200 border-0 text-[10px] uppercase tracking-wider">Atenção</Badge>
        )}
      </div>
      <div className="mt-5 num-hero text-[2.5rem] sm:text-[3rem] font-semibold" style={{ color: tone === "warning" ? "var(--warning-foreground)" : undefined }}>
        {value}
      </div>
      <div className="mt-2 text-[14px] font-medium text-foreground truncate">{label}</div>
      <div className="text-[12px] text-muted-foreground mt-0.5">
        {subtitle ?? (hasPrev ? `${previous} ${period ?? ""}`.trim() : period ?? "Período inicial")}
      </div>
    </Card>
  );
  if (!to) return inner;
  return <Link to={to} className="block h-full">{inner}</Link>;
}

function ActivityRow({
  icon: Icon, label, count, to, tone,
}: {
  icon: any;
  label: string;
  count: number;
  to: string;
  tone: "default" | "warning" | "danger";
}) {
  const cls =
    tone === "danger" ? "text-rose-700 bg-rose-50 ring-rose-200" :
    tone === "warning" ? "text-amber-700 bg-amber-50 ring-amber-200" :
    "text-muted-foreground bg-muted ring-border";
  return (
    <Link
      to={to}
      className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/70 transition-colors group border border-transparent hover:border-border/60"
    >
      <div className={cn("rounded-lg p-2 ring-1", cls)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-medium truncate">{label}</div>
      </div>
      <div className="text-[20px] font-semibold tabular-nums" style={{ color: count > 0 ? undefined : "var(--muted-foreground)" }}>{count}</div>
      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-primary transition-colors" />
    </Link>
  );
}

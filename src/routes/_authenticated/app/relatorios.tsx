import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  BarChart3,
  Download,
  Users,
  Activity,
  Wallet,
  ClipboardCheck,
  CalendarDays,
  CalendarRange,
  CalendarClock,
  Stethoscope,
  TrendingUp,
  Clock,
  Layers,
  ShieldAlert,
  Inbox,
} from "lucide-react";
import {
  AppShell,
  PageHeader,
  KpiCard,
  KpiGrid,
  InfoCard,
  EmptyState,
  FilterField,
} from "@/components/layout";
import { brl, fmtDate } from "@/lib/format";
import { formatPaymentMethod } from "@/lib/finance";
import { useActiveClinic } from "@/lib/active-clinic";

export const Route = createFileRoute("/_authenticated/app/relatorios")({
  component: ReportsPage,
});

function toCSV(rows: any[], columns: { key: string; label: string }[]): string {
  const header = columns.map((c) => `"${c.label}"`).join(";");
  const body = rows
    .map((r) =>
      columns
        .map((c) => {
          const v = r[c.key];
          const s = v == null ? "" : String(v).replace(/"/g, '""');
          return `"${s}"`;
        })
        .join(";"),
    )
    .join("\n");
  return `${header}\n${body}`;
}

function downloadCSV(filename: string, csv: string) {
  // BOM para Excel ler acentos em UTF-8
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function ReportsPage() {
  const { clinicId } = useActiveClinic();
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const [from, setFrom] = useState(firstDay.toISOString().slice(0, 10));
  const [to, setTo] = useState(today.toISOString().slice(0, 10));

  const { data: clinical } = useQuery({
    queryKey: ["report-clinical", clinicId, from, to],
    enabled: !!clinicId,
    queryFn: async () => {
      if (!clinicId) {
        return { pacientesTotal: 0, pacientesAtivos: 0, avaliacoes: 0, evolucoes: 0, atrasadas: 0, proximas: 0, profCounts: {}, riskCounts: {}, scalesRaw: [] };
      }
      const [pat, assess, evo, scales, reaval] = await Promise.all([
        supabase.from("patients").select("id, situacao", { count: "exact" }).eq("clinic_id", clinicId),
        supabase.from("assessments").select("id, status, clinical_profiles, data").eq("clinic_id", clinicId).gte("data", from).lte("data", to),
        supabase.from("evolutions").select("id, data").eq("clinic_id", clinicId).gte("data", from).lte("data", to),
        supabase
          .from("assessment_scales")
          .select("scale_code, risk_level, total_score, applied_at, patients!inner(clinic_id)")
          .eq("patients.clinic_id", clinicId)
          .gte("applied_at", from)
          .lte("applied_at", to + "T23:59:59"),
        supabase.from("reassessment_schedule").select("id, scheduled_for, completed_at").eq("clinic_id", clinicId),
      ]);
      const profCounts: Record<string, number> = {};
      (assess.data ?? []).forEach((a: any) => {
        (a.clinical_profiles ?? []).forEach((p: string) => { profCounts[p] = (profCounts[p] || 0) + 1; });
      });
      const riskCounts: Record<string, number> = {};
      (scales.data ?? []).forEach((s: any) => {
        if (s.risk_level) riskCounts[s.risk_level] = (riskCounts[s.risk_level] || 0) + 1;
      });
      const t = new Date();
      return {
        pacientesTotal: pat.count ?? 0,
        pacientesAtivos: (pat.data ?? []).filter((p: any) => p.situacao === "ativo").length,
        avaliacoes: assess.data?.length ?? 0,
        evolucoes: evo.data?.length ?? 0,
        atrasadas: (reaval.data ?? []).filter((r: any) => !r.completed_at && new Date(r.scheduled_for) < t).length,
        proximas: (reaval.data ?? []).filter((r: any) => !r.completed_at && new Date(r.scheduled_for) >= t).length,
        profCounts, riskCounts,
        scalesRaw: scales.data ?? [],
      };
    },
  });

  const { data: operational } = useQuery({
    queryKey: ["report-operational", clinicId, from, to],
    enabled: !!clinicId,
    queryFn: async () => {
      if (!clinicId) {
        return { atendimentos: 0, byStatus: {}, byProf: {}, profissionaisAtivos: 0 };
      }
      const [appt, prof] = await Promise.all([
        supabase.from("appointments").select("status, data, professional_id, professionals(nome)").eq("clinic_id", clinicId).gte("data", from).lte("data", to),
        supabase.from("professionals").select("id, nome, situacao").eq("clinic_id", clinicId),
      ]);
      const byStatus: Record<string, number> = {};
      const byProf: Record<string, number> = {};
      (appt.data ?? []).forEach((a: any) => {
        byStatus[a.status] = (byStatus[a.status] || 0) + 1;
        const n = a.professionals?.nome || "—";
        byProf[n] = (byProf[n] || 0) + 1;
      });
      return {
        atendimentos: appt.data?.length ?? 0,
        byStatus, byProf,
        profissionaisAtivos: (prof.data ?? []).filter((p: any) => p.situacao === "ativo").length,
      };
    },
  });

  const { data: financial } = useQuery({
    queryKey: ["report-financial", clinicId, from, to],
    enabled: !!clinicId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_entries")
        .select("id, data, valor, status, forma_pagamento, observacoes, category_id, entry_type, financial_categories(type, name)")
        .eq("clinic_id", clinicId!)
        .gte("data", from)
        .lte("data", to);
      if (error) throw error;
      const rows: any[] = data ?? [];

      const isExpense = (row: any) =>
        row.entry_type === "payable" || row.financial_categories?.type === "expense";
      const isIncome = (row: any) =>
        row.entry_type !== "payable" && (!row.category_id || row.financial_categories?.type === "income");

      const activeRows = rows.filter((d) => d.status !== "cancelado");

      const recebido = activeRows
        .filter((d) => d.status === "pago" && isIncome(d))
        .reduce((s, d) => s + Number(d.valor || 0), 0);
      const pendente = activeRows
        .filter((d) => d.status === "pendente" && isIncome(d))
        .reduce((s, d) => s + Number(d.valor || 0), 0);
      const despesas = activeRows
        .filter((d) => d.status === "pago" && isExpense(d))
        .reduce((s, d) => s + Number(d.valor || 0), 0);
      return { recebido, pendente, despesas, entries: activeRows };
    },
  });


  const exportPatients = async () => {
    if (!clinicId) return;
    const { data } = await supabase
      .from("patients")
      .select("nome_completo, cpf, data_nascimento, sexo, telefone, situacao, created_at")
      .eq("clinic_id", clinicId);
    downloadCSV(`pacientes-${from}.csv`, toCSV(data ?? [], [

      { key: "nome_completo", label: "Nome" },
      { key: "cpf", label: "CPF" },
      { key: "data_nascimento", label: "Nascimento" },
      { key: "sexo", label: "Sexo" },
      { key: "telefone", label: "Telefone" },
      { key: "situacao", label: "Situação" },
      { key: "created_at", label: "Cadastro" },
    ]));
  };

  const exportEvolutions = async () => {
    if (!clinicId) return;
    const { data } = await supabase
      .from("evolutions")
      .select("data, conduta, intercorrencias, patients(nome_completo), professionals(nome)")
      .eq("clinic_id", clinicId)
      .gte("data", from).lte("data", to);
    const rows = (data ?? []).map((e: any) => ({
      data: e.data,
      paciente: e.patients?.nome_completo,
      profissional: e.professionals?.nome,
      conduta: e.conduta,
      intercorrencias: e.intercorrencias,
    }));
    downloadCSV(`evolucoes-${from}_${to}.csv`, toCSV(rows, [
      { key: "data", label: "Data" }, { key: "paciente", label: "Paciente" },
      { key: "profissional", label: "Profissional" }, { key: "conduta", label: "Conduta" },
      { key: "intercorrencias", label: "Intercorrências" },
    ]));
  };

  const exportFinancial = async () => {
    if (!clinicId) return;
    if (!financial?.entries) return;
    const rows = financial.entries.map((e: any) => ({
      data: e.data,
      categoria: e.financial_categories?.name ?? "—",
      tipo: e.entry_type === "payable" ? "Despesa" : "Receita",
      valor: e.valor,
      status: e.status,
      forma_pagamento: formatPaymentMethod(e.forma_pagamento),
      observacoes: e.observacoes ?? "",
    }));
    downloadCSV(`financeiro-${from}_${to}.csv`, toCSV(rows, [
      { key: "data", label: "Data" },
      { key: "categoria", label: "Categoria" },
      { key: "tipo", label: "Tipo" },
      { key: "valor", label: "Valor" },
      { key: "status", label: "Status" },
      { key: "forma_pagamento", label: "Forma de pagamento" },
      { key: "observacoes", label: "Observações" },
    ]));
  };

  const profCounts = Object.entries(clinical?.profCounts ?? {});
  const riskCounts = Object.entries(clinical?.riskCounts ?? {});
  const statusCounts = Object.entries(operational?.byStatus ?? {});
  const profByCount = Object.entries(operational?.byProf ?? {});

  return (
    <AppShell clinical>
      <PageHeader
        icon={BarChart3}
        eyebrow="Relatórios"
        breadcrumbs={[{ label: "Clínica", to: "/app" }, { label: "Relatórios" }]}
        title="Relatórios executivos"
        description="Indicadores consolidados de clínica, operação e financeiro — exporte para Excel/CSV."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportPatients}>
              <Download className="h-4 w-4 mr-1.5" /> Pacientes
            </Button>
            <Button variant="outline" size="sm" onClick={exportEvolutions}>
              <Download className="h-4 w-4 mr-1.5" /> Evoluções
            </Button>
            <Button variant="outline" size="sm" onClick={exportFinancial}>
              <Download className="h-4 w-4 mr-1.5" /> Financeiro
            </Button>
          </div>
        }
      />

      {/* Filtro de período — compacto */}
      <div className="fos-surface-card flex flex-wrap items-end gap-3 rounded-2xl p-3 sm:p-4">
        <FilterField label="De" htmlFor="rel-from" className="space-y-1.5">
          <Input
            id="rel-from"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="h-10 w-[150px]"
          />
        </FilterField>
        <FilterField label="Até" htmlFor="rel-to" className="space-y-1.5">
          <Input
            id="rel-to"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="h-10 w-[150px]"
          />
        </FilterField>
        <div className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-[rgba(15,76,92,0.12)] bg-[rgba(15,76,92,0.03)] px-3 py-1.5 text-xs font-medium text-slate-600">
          <CalendarRange className="h-3.5 w-3.5 text-primary" aria-hidden />
          {fmtDate(from)} → {fmtDate(to)}
        </div>
      </div>

      <Tabs defaultValue="clinical" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 sm:inline-flex sm:w-auto">
          <TabsTrigger value="clinical"><Activity className="h-4 w-4 mr-1.5" /> Clínico</TabsTrigger>
          <TabsTrigger value="operational"><ClipboardCheck className="h-4 w-4 mr-1.5" /> Operacional</TabsTrigger>
          <TabsTrigger value="financial"><Wallet className="h-4 w-4 mr-1.5" /> Financeiro</TabsTrigger>
        </TabsList>

        {/* ───────── CLÍNICO ───────── */}
        <TabsContent value="clinical" className="space-y-4">
          <KpiGrid columns={4}>
            <KpiCard icon={Users} label="Pacientes ativos" value={clinical?.pacientesAtivos ?? "—"} accent="var(--primary)" hideDelta />
            <KpiCard icon={ClipboardCheck} label="Avaliações no período" value={clinical?.avaliacoes ?? "—"} accent="#0284c7" hideDelta />
            <KpiCard icon={Activity} label="Evoluções no período" value={clinical?.evolucoes ?? "—"} accent="#059669" hideDelta />
            <KpiCard icon={CalendarClock} label="Reavaliações atrasadas" value={clinical?.atrasadas ?? "—"} accent="#d97706" tone="warning" hideDelta />
          </KpiGrid>

          <div className="grid gap-4 md:grid-cols-2">
            <InfoCard icon={Layers} title="Perfis clínicos atendidos" description="Distribuição por perfil no período selecionado.">
              {profCounts.length ? (
                <div className="flex flex-wrap gap-2">
                  {profCounts.map(([k, v]) => (
                    <Badge key={k} variant="outline" className="text-xs font-medium">
                      {k}: {v as number}
                    </Badge>
                  ))}
                </div>
              ) : (
                <EmptyState icon={Inbox} title="Sem dados no período" description="Nenhum perfil clínico registrado no intervalo selecionado." className="py-10" />
              )}
            </InfoCard>

            <InfoCard icon={ShieldAlert} title="Distribuição de risco" description="Estratificação por escalas aplicadas.">
              {riskCounts.length ? (
                <div className="flex flex-wrap gap-2">
                  {riskCounts.map(([k, v]) => (
                    <Badge key={k} variant={k.includes("alto") ? "destructive" : "secondary"} className="text-xs font-medium">
                      {k}: {v as number}
                    </Badge>
                  ))}
                </div>
              ) : (
                <EmptyState icon={Inbox} title="Sem escalas aplicadas" description="Nenhuma escala foi aplicada no intervalo selecionado." className="py-10" />
              )}
            </InfoCard>
          </div>
        </TabsContent>

        {/* ───────── OPERACIONAL ───────── */}
        <TabsContent value="operational" className="space-y-4">
          <KpiGrid columns={3}>
            <KpiCard icon={CalendarDays} label="Atendimentos no período" value={operational?.atendimentos ?? "—"} accent="var(--primary)" hideDelta />
            <KpiCard icon={Stethoscope} label="Profissionais ativos" value={operational?.profissionaisAtivos ?? "—"} accent="#0284c7" hideDelta />
            <KpiCard icon={CalendarRange} label="Período analisado" value={`${fmtDate(from)} → ${fmtDate(to)}`} accent="#64748b" hideDelta />
          </KpiGrid>

          <div className="grid gap-4 md:grid-cols-2">
            <InfoCard icon={ClipboardCheck} title="Atendimentos por status">
              {statusCounts.length ? (
                <div className="space-y-0.5">
                  {statusCounts.map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between border-b border-slate-100 py-2 text-sm last:border-0">
                      <span className="capitalize text-slate-700">{k}</span>
                      <span className="font-semibold tabular-nums text-slate-950">{v as number}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState icon={Inbox} title="Sem atendimentos" description="Nenhum atendimento no intervalo selecionado." className="py-10" />
              )}
            </InfoCard>

            <InfoCard icon={Stethoscope} title="Atendimentos por profissional">
              {profByCount.length ? (
                <div className="space-y-0.5">
                  {profByCount.map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between border-b border-slate-100 py-2 text-sm last:border-0">
                      <span className="truncate text-slate-700">{k}</span>
                      <span className="font-semibold tabular-nums text-slate-950">{v as number}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState icon={Inbox} title="Sem atendimentos" description="Nenhum atendimento por profissional no período." className="py-10" />
              )}
            </InfoCard>
          </div>
        </TabsContent>

        {/* ───────── FINANCEIRO ───────── */}
        <TabsContent value="financial" className="space-y-4">
          <KpiGrid columns={3}>
            <KpiCard icon={TrendingUp} label="Recebido" value={brl(financial?.recebido ?? 0)} accent="#059669" hideDelta />
            <KpiCard icon={Clock} label="A receber (pendente)" value={brl(financial?.pendente ?? 0)} accent="#d97706" hideDelta />
            <KpiCard icon={Wallet} label="Despesas" value={brl(financial?.despesas ?? 0)} accent="#e11d48" hideDelta />
          </KpiGrid>

          <InfoCard icon={Wallet} title="Integração de pagamentos" variant="highlight">
            <p className="text-sm leading-relaxed text-slate-600">
              Módulo financeiro preparado para integração com gateways de pagamento (Stripe, Mercado Pago, Pagar.me) — Backlog Pós-V1.
            </p>
          </InfoCard>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

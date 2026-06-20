import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Download, Users, Activity, Wallet, ClipboardCheck } from "lucide-react";
import { brl, fmtDate } from "@/lib/format";

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
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const [from, setFrom] = useState(firstDay.toISOString().slice(0, 10));
  const [to, setTo] = useState(today.toISOString().slice(0, 10));

  const { data: clinical } = useQuery({
    queryKey: ["report-clinical", from, to],
    queryFn: async () => {
      const [pat, assess, evo, scales, reaval] = await Promise.all([
        supabase.from("patients").select("id, situacao", { count: "exact" }),
        supabase.from("assessments").select("id, status, clinical_profiles, data").gte("data", from).lte("data", to),
        supabase.from("evolutions").select("id, data").gte("data", from).lte("data", to),
        supabase.from("assessment_scales").select("scale_code, risk_level, total_score, applied_at").gte("applied_at", from).lte("applied_at", to + "T23:59:59"),
        supabase.from("reassessment_schedule").select("id, scheduled_for, completed_at"),
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
    queryKey: ["report-operational", from, to],
    queryFn: async () => {
      const [appt, prof] = await Promise.all([
        supabase.from("appointments").select("status, data, professional_id, professionals(nome)").gte("data", from).lte("data", to),
        supabase.from("professionals").select("id, nome, situacao"),
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
    queryKey: ["report-financial", from, to],
    queryFn: async () => {
      const { data } = await supabase.from("financial_entries").select("*").gte("data", from).lte("data", to);
      const rows: any[] = data ?? [];
      const recebido = rows.filter((d) => d.status === "pago" && d.tipo === "receita").reduce((s, d) => s + Number(d.valor || 0), 0);
      const pendente = rows.filter((d) => d.status === "pendente").reduce((s, d) => s + Number(d.valor || 0), 0);
      const despesas = rows.filter((d) => d.tipo === "despesa").reduce((s, d) => s + Number(d.valor || 0), 0);
      return { recebido, pendente, despesas, entries: rows };
    },
  });


  const exportPatients = async () => {
    const { data } = await supabase.from("patients").select("nome_completo, cpf, data_nascimento, sexo, telefone, situacao, created_at");
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
    const { data } = await supabase
      .from("evolutions")
      .select("data, conduta, intercorrencias, patients(nome_completo), professionals(nome)")
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
    if (!financial?.entries) return;
    const rows = financial.entries.map((e: any) => ({
      data: e.data, tipo: e.tipo, descricao: e.descricao, valor: e.valor, status: e.status,
    }));
    downloadCSV(`financeiro-${from}_${to}.csv`, toCSV(rows, [
      { key: "data", label: "Data" }, { key: "tipo", label: "Tipo" },
      { key: "descricao", label: "Descrição" }, { key: "valor", label: "Valor" },
      { key: "status", label: "Status" },
    ]));
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <header>
        <h1 className="text-2xl font-semibold">Relatórios Executivos</h1>
        <p className="text-sm text-muted-foreground">Indicadores consolidados — exporte para Excel/CSV.</p>
      </header>

      <Card className="p-4 flex flex-wrap items-end gap-3">
        <div>
          <Label className="text-xs">De</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
        </div>
        <div>
          <Label className="text-xs">Até</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
        </div>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={exportPatients}><Download className="h-4 w-4 mr-1" /> Pacientes</Button>
          <Button variant="outline" size="sm" onClick={exportEvolutions}><Download className="h-4 w-4 mr-1" /> Evoluções</Button>
          <Button variant="outline" size="sm" onClick={exportFinancial}><Download className="h-4 w-4 mr-1" /> Financeiro</Button>
        </div>
      </Card>

      <Tabs defaultValue="clinical">
        <TabsList>
          <TabsTrigger value="clinical"><Activity className="h-4 w-4 mr-1" /> Clínico</TabsTrigger>
          <TabsTrigger value="operational"><ClipboardCheck className="h-4 w-4 mr-1" /> Operacional</TabsTrigger>
          <TabsTrigger value="financial"><Wallet className="h-4 w-4 mr-1" /> Financeiro</TabsTrigger>
        </TabsList>

        <TabsContent value="clinical" className="space-y-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Kpi icon={<Users className="h-4 w-4" />} label="Pacientes ativos" value={clinical?.pacientesAtivos ?? "—"} />
            <Kpi label="Avaliações no período" value={clinical?.avaliacoes ?? "—"} />
            <Kpi label="Evoluções no período" value={clinical?.evolucoes ?? "—"} />
            <Kpi label="Reavaliações atrasadas" value={clinical?.atrasadas ?? "—"} variant="warn" />
          </div>
          <Card className="p-4">
            <h3 className="font-semibold mb-2">Perfis clínicos atendidos</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(clinical?.profCounts ?? {}).map(([k, v]) => (
                <Badge key={k} variant="outline">{k}: {v as number}</Badge>
              ))}
              {!Object.keys(clinical?.profCounts ?? {}).length && <p className="text-sm text-muted-foreground">Sem dados no período.</p>}
            </div>
          </Card>
          <Card className="p-4">
            <h3 className="font-semibold mb-2">Distribuição de risco (escalas)</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(clinical?.riskCounts ?? {}).map(([k, v]) => (
                <Badge key={k} variant={k.includes("alto") ? "destructive" : "secondary"}>{k}: {v as number}</Badge>
              ))}
              {!Object.keys(clinical?.riskCounts ?? {}).length && <p className="text-sm text-muted-foreground">Sem escalas aplicadas no período.</p>}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="operational" className="space-y-4">
          <div className="grid sm:grid-cols-3 gap-3">
            <Kpi label="Atendimentos no período" value={operational?.atendimentos ?? "—"} />
            <Kpi label="Profissionais ativos" value={operational?.profissionaisAtivos ?? "—"} />
            <Kpi label="Período" value={`${fmtDate(from)} → ${fmtDate(to)}`} />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="p-4">
              <h3 className="font-semibold mb-2">Atendimentos por status</h3>
              {Object.entries(operational?.byStatus ?? {}).map(([k, v]) => (
                <div key={k} className="flex justify-between text-sm py-1 border-b last:border-0">
                  <span className="capitalize">{k}</span><span className="font-medium">{v as number}</span>
                </div>
              ))}
            </Card>
            <Card className="p-4">
              <h3 className="font-semibold mb-2">Atendimentos por profissional</h3>
              {Object.entries(operational?.byProf ?? {}).map(([k, v]) => (
                <div key={k} className="flex justify-between text-sm py-1 border-b last:border-0">
                  <span>{k}</span><span className="font-medium">{v as number}</span>
                </div>
              ))}
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="financial" className="space-y-4">
          <div className="grid sm:grid-cols-3 gap-3">
            <Kpi label="Recebido" value={brl(financial?.recebido ?? 0)} variant="success" />
            <Kpi label="A receber (pendente)" value={brl(financial?.pendente ?? 0)} variant="warn" />
            <Kpi label="Despesas" value={brl(financial?.despesas ?? 0)} />
          </div>
          <Card className="p-4 text-sm text-muted-foreground">
            Módulo financeiro preparado para integração com gateways de pagamento (Stripe, Mercado Pago, Pagar.me) — Backlog Pós-V1.
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Kpi({ icon, label, value, variant }: any) {
  const color = variant === "warn" ? "text-amber-700" : variant === "success" ? "text-emerald-700" : "text-foreground";
  return (
    <Card className="p-4">
      {icon && <div className="text-muted-foreground mb-1">{icon}</div>}
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-semibold mt-1 ${color}`}>{value}</p>
    </Card>
  );
}

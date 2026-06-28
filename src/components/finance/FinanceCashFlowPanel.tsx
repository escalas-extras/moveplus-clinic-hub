import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { BarChart3, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/layout/EmptyState";
import { FinanceKpiCard, FinanceKpiGrid } from "./FinanceKpiCard";
import { StatusBadge } from "@/components/layout/StatusBadge";
import {
  assertFinanceClinicId,
  applyCashFlowFilters,
  cashFlowFiltersKey,
  cashFlowStatusLabel,
  computeCashFlowSummary,
  defaultCashFlowFilters,
  downloadCashFlowCsv,
  financeQueryKeys,
  groupCashFlowLines,
  isCashFlowSourceRow,
  rowMatchesCashFlowPeriod,
  toCashFlowCsv,
  type CashFlowEntryRow,
  type CashFlowFilters,
  type CashFlowGrouping,
  type CashFlowView,
} from "@/lib/finance";
import { brl, fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { FinancePanelGate } from "./FinancePanelGate";
import {
  FINANCE_FILTER_GRID,
  FINANCE_PANEL_ROOT,
  FINANCE_TABLE,
  FINANCE_TABLE_CARD,
  FINANCE_TABLE_SCROLL,
} from "./finance-layout";

type FinanceCashFlowPanelProps = {
  clinicId: string | null;
  clinicLoading: boolean;
};

const SELECT_ALL = "all";

const VIEW_LABELS: Record<CashFlowView, string> = {
  realizado: "Realizado",
  previsto: "Previsto",
  comparativo: "Comparativo",
};

const GROUPING_LABELS: Record<CashFlowGrouping, string> = {
  day: "Dia",
  week: "Semana",
  month: "Mês",
};

export function FinanceCashFlowPanel({ clinicId, clinicLoading }: FinanceCashFlowPanelProps) {
  const [filters, setFilters] = useState<CashFlowFilters>(() => defaultCashFlowFilters());

  const lookups = useQuery({
    queryKey: financeQueryKeys.cashFlowLookups(clinicId),
    enabled: !!clinicId,
    queryFn: async () => {
      assertFinanceClinicId(clinicId);
      const [categories, costCenters] = await Promise.all([
        supabase.from("financial_categories").select("id, name, type").eq("clinic_id", clinicId).order("sort_order"),
        supabase.from("financial_cost_centers").select("id, name").eq("clinic_id", clinicId).eq("is_active", true).order("sort_order"),
      ]);
      if (categories.error) throw categories.error;
      if (costCenters.error) throw costCenters.error;
      return {
        categories: categories.data ?? [],
        costCenters: costCenters.data ?? [],
      };
    },
  });

  const entries = useQuery({
    queryKey: financeQueryKeys.cashFlow(clinicId, cashFlowFiltersKey(filters)),
    enabled: !!clinicId,
    queryFn: async () => {
      assertFinanceClinicId(clinicId);
      const { data, error } = await supabase
        .from("financial_entries")
        .select(`
          *,
          patients(nome_completo),
          professionals(nome),
          financial_categories(id, name, type),
          financial_cost_centers(id, name, code)
        `)
        .eq("clinic_id", clinicId)
        .in("entry_type", ["receivable", "payable"])
        .neq("status", "cancelado")
        .order("updated_at", { ascending: false })
        .limit(2000);
      if (error) throw error;
      const rows = (data ?? []) as CashFlowEntryRow[];
      return rows.filter(
        (r) => isCashFlowSourceRow(r) && rowMatchesCashFlowPeriod(r, filters.from, filters.to),
      );
    },
  });

  const lines = useMemo(
    () => applyCashFlowFilters(entries.data ?? [], filters),
    [entries.data, filters],
  );

  const summary = useMemo(
    () =>
      computeCashFlowSummary(entries.data ?? [], {
        from: filters.from,
        to: filters.to,
        categoryId: filters.categoryId,
        costCenterId: filters.costCenterId,
        typeFilter: filters.typeFilter,
      }),
    [entries.data, filters.from, filters.to, filters.categoryId, filters.costCenterId, filters.typeFilter],
  );

  const grouped = useMemo(
    () => groupCashFlowLines(lines, filters.grouping),
    [lines, filters.grouping],
  );

  function exportCsv() {
    if (!lines.length) return;
    downloadCashFlowCsv(
      `fluxo-caixa-${filters.from}_${filters.to}.csv`,
      toCashFlowCsv(lines),
    );
  }

  return (
    <FinancePanelGate
      clinicId={clinicId}
      clinicLoading={clinicLoading}
      loading={entries.isLoading || lookups.isLoading}
      error={entries.error ?? lookups.error}
      onRetry={() => {
        void entries.refetch();
        void lookups.refetch();
      }}
      loadingLabel="Carregando fluxo de caixa…"
      errorFallback="Não foi possível carregar o fluxo de caixa."
    >
    <div className={FINANCE_PANEL_ROOT}>
      <FinanceKpiGrid columns={4}>
        <FinanceKpiCard
          icon={BarChart3}
          label="Entradas realizadas"
          value={brl(summary.entradasRealizadas)}
          hideDelta
          variant="premium"
          accent="#10b981"
        />
        <FinanceKpiCard
          icon={BarChart3}
          label="Saídas realizadas"
          value={brl(summary.saidasRealizadas)}
          hideDelta
          variant="premium"
          accent="#ef4444"
        />
        <FinanceKpiCard
          icon={BarChart3}
          label="Saldo realizado"
          value={brl(summary.saldoRealizado)}
          hideDelta
          variant="premium"
          accent="#3b82f6"
          tone={summary.saldoRealizado < 0 ? "warning" : "default"}
        />
        <FinanceKpiCard
          icon={BarChart3}
          label="Saldo previsto"
          value={brl(summary.saldoPrevisto)}
          hideDelta
          variant="premium"
          accent="#8b5cf6"
          tone={summary.saldoPrevisto < 0 ? "warning" : "default"}
        />
      </FinanceKpiGrid>

      <Card className="min-w-0 max-w-full p-4 space-y-4">
        <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className={cn(FINANCE_FILTER_GRID, "min-w-0 flex-1")}>
            <div>
              <Label className="text-xs">Período de</Label>
              <Input
                type="date"
                className="h-9"
                value={filters.from}
                onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs">Período até</Label>
              <Input
                type="date"
                className="h-9"
                value={filters.to}
                onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs">Categoria</Label>
              <Select
                value={filters.categoryId}
                onValueChange={(v) => setFilters((f) => ({ ...f, categoryId: v }))}
              >
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={SELECT_ALL}>Todas</SelectItem>
                  {(lookups.data?.categories ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Centro de custo</Label>
              <Select
                value={filters.costCenterId}
                onValueChange={(v) => setFilters((f) => ({ ...f, costCenterId: v }))}
              >
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={SELECT_ALL}>Todos</SelectItem>
                  {(lookups.data?.costCenters ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Tipo</Label>
              <Select
                value={filters.typeFilter}
                onValueChange={(v) => setFilters((f) => ({ ...f, typeFilter: v as CashFlowFilters["typeFilter"] }))}
              >
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="receitas">Receitas</SelectItem>
                  <SelectItem value="despesas">Despesas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Agrupamento</Label>
              <Select
                value={filters.grouping}
                onValueChange={(v) => setFilters((f) => ({ ...f, grouping: v as CashFlowGrouping }))}
              >
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(GROUPING_LABELS) as CashFlowGrouping[]).map((g) => (
                    <SelectItem key={g} value={g}>{GROUPING_LABELS[g]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button variant="outline" onClick={exportCsv} disabled={!lines.length}>
            <Download className="mr-2 h-4 w-4" />
            Exportar CSV
          </Button>
        </div>

        <Tabs
          value={filters.view}
          onValueChange={(v) => setFilters((f) => ({ ...f, view: v as CashFlowView }))}
        >
          <TabsList>
            {(Object.keys(VIEW_LABELS) as CashFlowView[]).map((v) => (
              <TabsTrigger key={v} value={v}>{VIEW_LABELS[v]}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </Card>

      {grouped.length > 0 && (
        <Card className={FINANCE_TABLE_CARD}>
          <div className="border-b bg-muted/40 px-4 py-2">
            <h3 className="text-sm font-semibold">Resumo por {GROUPING_LABELS[filters.grouping].toLowerCase()}</h3>
          </div>
          <div className={FINANCE_TABLE_SCROLL}>
            <table className={FINANCE_TABLE}>
              <thead className="bg-muted/60">
                <tr className="text-left">
                  <th className="px-4 py-2">Período</th>
                  <th className="px-4 py-2 text-right">Entradas</th>
                  <th className="px-4 py-2 text-right">Saídas</th>
                  <th className="px-4 py-2 text-right">Saldo</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {grouped.map((g) => (
                  <tr key={g.key}>
                    <td className="px-4 py-2 font-medium">{g.label}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-emerald-700">{brl(g.entradas)}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-rose-700">{brl(g.saidas)}</td>
                    <td className={cn("px-4 py-2 text-right tabular-nums font-medium", g.saldo < 0 && "text-amber-700")}>
                      {brl(g.saldo)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {lines.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="Sem movimentações no período"
          description="Ajuste o período ou a visão (realizado/previsto) para ver entradas e saídas consolidadas."
        />
      ) : (
        <Card className={FINANCE_TABLE_CARD}>
          <div className="border-b bg-muted/40 px-4 py-2">
            <h3 className="text-sm font-semibold">Movimentações ({lines.length})</h3>
          </div>
          <div className={FINANCE_TABLE_SCROLL}>
            <table className={FINANCE_TABLE}>
              <thead className="bg-muted/60">
                <tr className="text-left">
                  <th className="px-4 py-3">Data</th>
                  {filters.view === "comparativo" && <th className="px-4 py-3">Visão</th>}
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3 hidden md:table-cell">Categoria</th>
                  <th className="px-4 py-3 hidden lg:table-cell">Centro de custo</th>
                  <th className="px-4 py-3">Descrição</th>
                  <th className="px-4 py-3 text-right">Valor</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {lines.map((line) => (
                  <tr key={line.id}>
                    <td className="px-4 py-2 tabular-nums">{fmtDate(line.date)}</td>
                    {filters.view === "comparativo" && (
                      <td className="px-4 py-2">
                        <StatusBadge variant={line.visao === "realizado" ? "success" : "info"}>
                          {line.visao === "realizado" ? "Realizado" : "Previsto"}
                        </StatusBadge>
                      </td>
                    )}
                    <td className="px-4 py-2">
                      <StatusBadge variant={line.tipo === "receita" ? "success" : "danger"}>
                        {line.tipo === "receita" ? "Receita" : "Despesa"}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-2 hidden md:table-cell text-muted-foreground">{line.categoria}</td>
                    <td className="px-4 py-2 hidden lg:table-cell text-muted-foreground">{line.centroCusto}</td>
                    <td className="px-4 py-2 max-w-[200px] truncate">{line.descricao}</td>
                    <td className={cn(
                      "px-4 py-2 text-right tabular-nums font-medium",
                      line.tipo === "receita" ? "text-emerald-700" : "text-rose-700",
                    )}>
                      {line.tipo === "receita" ? "+" : "−"}{brl(line.valor)}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">{cashFlowStatusLabel(line)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
    </FinancePanelGate>
  );
}

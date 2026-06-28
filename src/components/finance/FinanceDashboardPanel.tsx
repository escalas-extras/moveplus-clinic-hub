import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  BarChart3,
  FolderTree,
  Landmark,
  LayoutDashboard,
  Plus,
  Receipt,
} from "lucide-react";
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
import { EmptyState } from "@/components/layout/EmptyState";
import { InfoCard } from "@/components/layout/InfoCard";
import { KpiCard } from "@/components/layout/KpiCard";
import { KpiGrid } from "@/components/layout/KpiGrid";
import { PageSection } from "@/components/layout/PageSection";
import { StatusBadge } from "@/components/layout/StatusBadge";
import {
  assertFinanceClinicId,
  computeCurrentMonthSummary,
  computeDashboardKpis,
  dashboardFiltersKey,
  defaultDashboardFilters,
  financeQueryKeys,
  topCostCenters,
  topExpenseCategories,
  topIncomeCategories,
  upcomingPayables,
  upcomingReceivables,
  type CashFlowEntryRow,
  type DashboardFilters,
} from "@/lib/finance";
import { brl, fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { FinancePanelGate } from "./FinancePanelGate";

type FinanceDashboardPanelProps = {
  clinicId: string | null;
  clinicLoading: boolean;
  onNewReceivable?: () => void;
  onNewPayable?: () => void;
  onOpenCashFlow?: () => void;
  onOpenCategories?: () => void;
  onOpenCostCenters?: () => void;
  onOpenLegacy?: () => void;
};

const SELECT_ALL = "all";

export function FinanceDashboardPanel({
  clinicId,
  clinicLoading,
  onNewReceivable,
  onNewPayable,
  onOpenCashFlow,
  onOpenCategories,
  onOpenCostCenters,
  onOpenLegacy,
}: FinanceDashboardPanelProps) {
  const [filters, setFilters] = useState<DashboardFilters>(() => defaultDashboardFilters());

  const lookups = useQuery({
    queryKey: financeQueryKeys.dashboardLookups(clinicId),
    enabled: !!clinicId,
    queryFn: async () => {
      assertFinanceClinicId(clinicId);
      const [categories, costCenters] = await Promise.all([
        supabase.from("financial_categories").select("id, name, type").eq("clinic_id", clinicId).order("sort_order"),
        supabase.from("financial_cost_centers").select("id, name").eq("clinic_id", clinicId).eq("is_active", true).order("sort_order"),
      ]);
      if (categories.error) throw categories.error;
      if (costCenters.error) throw costCenters.error;
      return { categories: categories.data ?? [], costCenters: costCenters.data ?? [] };
    },
  });

  const entries = useQuery({
    queryKey: financeQueryKeys.dashboard(clinicId, dashboardFiltersKey(filters)),
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
      return (data ?? []) as CashFlowEntryRow[];
    },
  });

  const kpis = useMemo(
    () => computeDashboardKpis(entries.data ?? [], filters),
    [entries.data, filters],
  );

  const monthSummary = useMemo(
    () => computeCurrentMonthSummary(entries.data ?? []),
    [entries.data],
  );

  const incomeCats = useMemo(
    () => topIncomeCategories(entries.data ?? [], filters),
    [entries.data, filters],
  );

  const expenseCats = useMemo(
    () => topExpenseCategories(entries.data ?? [], filters),
    [entries.data, filters],
  );

  const costCentersRank = useMemo(
    () => topCostCenters(entries.data ?? [], filters),
    [entries.data, filters],
  );

  const nextReceivables = useMemo(
    () => upcomingReceivables(entries.data ?? [], filters),
    [entries.data, filters],
  );

  const nextPayables = useMemo(
    () => upcomingPayables(entries.data ?? [], filters),
    [entries.data, filters],
  );

  const hasData = (entries.data?.length ?? 0) > 0;

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
      loadingLabel="Carregando dashboard financeiro…"
      errorFallback="Não foi possível carregar o dashboard financeiro."
    >
    <div className="space-y-8">
      <Card className="p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <Label className="text-xs">Período de</Label>
            <Input type="date" className="h-9" value={filters.from} onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))} />
          </div>
          <div>
            <Label className="text-xs">Período até</Label>
            <Input type="date" className="h-9" value={filters.to} onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))} />
          </div>
          <div>
            <Label className="text-xs">Categoria</Label>
            <Select value={filters.categoryId} onValueChange={(v) => setFilters((f) => ({ ...f, categoryId: v }))}>
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
            <Select value={filters.costCenterId} onValueChange={(v) => setFilters((f) => ({ ...f, costCenterId: v }))}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={SELECT_ALL}>Todos</SelectItem>
                {(lookups.data?.costCenters ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            {onNewReceivable && (
              <Button size="sm" onClick={onNewReceivable}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Novo recebimento
              </Button>
            )}
            {onNewPayable && (
              <Button size="sm" variant="outline" onClick={onNewPayable}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Nova despesa
              </Button>
            )}
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap gap-2">
        {onOpenCashFlow && (
          <Button variant="outline" size="sm" onClick={onOpenCashFlow}>
            <BarChart3 className="mr-1.5 h-3.5 w-3.5" />
            Fluxo de caixa
          </Button>
        )}
        {onOpenCategories && (
          <Button variant="outline" size="sm" onClick={onOpenCategories}>
            <FolderTree className="mr-1.5 h-3.5 w-3.5" />
            Categorias
          </Button>
        )}
        {onOpenCostCenters && (
          <Button variant="outline" size="sm" onClick={onOpenCostCenters}>
            <Landmark className="mr-1.5 h-3.5 w-3.5" />
            Centros de custo
          </Button>
        )}
        {onOpenLegacy && (
          <Button variant="outline" size="sm" onClick={onOpenLegacy}>
            <Receipt className="mr-1.5 h-3.5 w-3.5" />
            Lançamentos v1
          </Button>
        )}
      </div>

      {!hasData ? (
        <EmptyState
          icon={LayoutDashboard}
          title="Sem movimentações financeiras"
          description="Cadastre contas a receber ou a pagar para visualizar o dashboard executivo."
          action={onNewReceivable ? { label: "Novo recebimento", onClick: onNewReceivable } : undefined}
        />
      ) : (
        <>
          <KpiGrid columns={4}>
            <KpiCard icon={ArrowDownCircle} label="Receita realizada" value={brl(kpis.receitaRealizada)} hideDelta variant="premium" accent="#10b981" />
            <KpiCard icon={ArrowUpCircle} label="Despesa realizada" value={brl(kpis.despesaRealizada)} hideDelta variant="premium" accent="#ef4444" />
            <KpiCard
              icon={LayoutDashboard}
              label="Saldo realizado"
              value={brl(kpis.saldoRealizado)}
              hideDelta
              variant="premium"
              accent="#3b82f6"
              tone={kpis.saldoRealizado < 0 ? "warning" : "default"}
            />
            <KpiCard
              icon={LayoutDashboard}
              label="Saldo previsto"
              value={brl(kpis.saldoPrevisto)}
              hideDelta
              variant="premium"
              accent="#8b5cf6"
              tone={kpis.saldoPrevisto < 0 ? "warning" : "default"}
            />
          </KpiGrid>

          <KpiGrid columns={4}>
            <KpiCard icon={ArrowDownCircle} label="Receitas em aberto" value={brl(kpis.receitasEmAberto)} hideDelta tone="warning" />
            <KpiCard icon={ArrowUpCircle} label="Despesas em aberto" value={brl(kpis.despesasEmAberto)} hideDelta tone="warning" />
            <KpiCard icon={ArrowDownCircle} label="Vencidos a receber" value={brl(kpis.vencidosReceber)} hideDelta tone={kpis.vencidosReceber > 0 ? "warning" : "default"} />
            <KpiCard icon={ArrowUpCircle} label="Vencidos a pagar" value={brl(kpis.vencidosPagar)} hideDelta tone={kpis.vencidosPagar > 0 ? "warning" : "default"} />
          </KpiGrid>

          <PageSection title="Resumo do mês atual" description={`Consolidado de ${monthSummary.monthLabel} (independente do filtro de período).`}>
            <div className="grid gap-4 sm:grid-cols-3">
              <InfoCard icon={ArrowDownCircle} title="Receitas" description="Realizadas no mês corrente.">
                <p className="text-2xl font-bold tabular-nums text-emerald-700">{brl(monthSummary.receitaRealizada)}</p>
              </InfoCard>
              <InfoCard icon={ArrowUpCircle} title="Despesas" description="Realizadas no mês corrente.">
                <p className="text-2xl font-bold tabular-nums text-rose-700">{brl(monthSummary.despesaRealizada)}</p>
              </InfoCard>
              <InfoCard icon={LayoutDashboard} title="Saldo" description="Resultado do mês corrente.">
                <p className={cn("text-2xl font-bold tabular-nums", monthSummary.saldoRealizado < 0 ? "text-amber-700" : "text-slate-900")}>
                  {brl(monthSummary.saldoRealizado)}
                </p>
              </InfoCard>
            </div>
          </PageSection>

          <div className="grid gap-6 lg:grid-cols-2">
            <UpcomingCard title="Próximos recebimentos" items={nextReceivables} emptyLabel="Nenhum recebimento pendente." />
            <UpcomingCard title="Próximos pagamentos" items={nextPayables} emptyLabel="Nenhum pagamento pendente." />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <RankingCard title="Maiores receitas por categoria" items={incomeCats} tone="income" />
            <RankingCard title="Maiores despesas por categoria" items={expenseCats} tone="expense" />
            <RankingCard title="Centros de custo relevantes" items={costCentersRank} tone="neutral" />
          </div>
        </>
      )}
    </div>
    </FinancePanelGate>
  );
}

function UpcomingCard({
  title,
  items,
  emptyLabel,
}: {
  title: string;
  items: ReturnType<typeof upcomingReceivables>;
  emptyLabel: string;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="border-b bg-muted/40 px-4 py-3">
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      {items.length === 0 ? (
        <p className="p-6 text-sm text-muted-foreground">{emptyLabel}</p>
      ) : (
        <ul className="divide-y">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="font-medium truncate">{item.descricao}</p>
                <p className="text-xs text-muted-foreground tabular-nums">{fmtDate(item.date)}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-semibold tabular-nums">{brl(item.valor)}</p>
                {item.overdue && (
                  <StatusBadge variant="warning" className="mt-1">Vencido</StatusBadge>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function RankingCard({
  title,
  items,
  tone,
}: {
  title: string;
  items: { id: string; name: string; total: number }[];
  tone: "income" | "expense" | "neutral";
}) {
  const valueCls =
    tone === "income" ? "text-emerald-700" : tone === "expense" ? "text-rose-700" : "text-slate-900";

  return (
    <Card className="overflow-hidden">
      <div className="border-b bg-muted/40 px-4 py-3">
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      {items.length === 0 ? (
        <p className="p-6 text-sm text-muted-foreground">Sem dados no período.</p>
      ) : (
        <ul className="divide-y">
          {items.map((item, i) => (
            <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}.</span>
                <span className="truncate text-sm">{item.name}</span>
              </div>
              <span className={cn("text-sm font-semibold tabular-nums shrink-0", valueCls)}>{brl(item.total)}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

import {
  ArrowDownCircle,
  ArrowUpCircle,
  BarChart3,
  LayoutDashboard,
  Plus,
} from "lucide-react";
import { FINANCE_FILTER_BAR } from "./finance-layout";
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
import type { DashboardFilters } from "@/lib/finance";
import { brl } from "@/lib/format";
import { FinanceExecutiveKpiCard, FinanceExecutiveKpiGrid } from "./FinanceKpiCard";
import { FinancePanelGate } from "./FinancePanelGate";
import { useFinanceExecutiveDashboard } from "./useFinanceExecutiveDashboard";

const SELECT_ALL = "all";

type FinanceExecutiveStripProps = {
  clinicId: string | null;
  clinicLoading: boolean;
  filters: DashboardFilters;
  onFiltersChange: (filters: DashboardFilters) => void;
  onNewReceivable?: () => void;
  onNewPayable?: () => void;
};

export function FinanceExecutiveStrip({
  clinicId,
  clinicLoading,
  filters,
  onFiltersChange,
  onNewReceivable,
  onNewPayable,
}: FinanceExecutiveStripProps) {
  const { kpis, lookups, isLoading, error, refetch } = useFinanceExecutiveDashboard(clinicId, filters);

  return (
    <FinancePanelGate
      clinicId={clinicId}
      clinicLoading={clinicLoading}
      loading={isLoading}
      error={error}
      onRetry={refetch}
      loadingLabel="Carregando indicadores…"
      errorFallback="Não foi possível carregar os indicadores financeiros."
    >
      <section aria-label="Dashboard financeiro" className="min-w-0 w-full max-w-full space-y-4">
        <FinanceExecutiveKpiGrid columns={4}>
          <FinanceExecutiveKpiCard
            icon={ArrowDownCircle}
            label="Entradas"
            value={brl(kpis.receitaRealizada)}
            hideDelta
            accent="#10b981"
          />
          <FinanceExecutiveKpiCard
            icon={ArrowUpCircle}
            label="Saídas"
            value={brl(kpis.despesaRealizada)}
            hideDelta
            accent="#ef4444"
          />
          <FinanceExecutiveKpiCard
            icon={LayoutDashboard}
            label="Saldo"
            value={brl(kpis.saldoRealizado)}
            hideDelta
            accent="#3b82f6"
            tone={kpis.saldoRealizado < 0 ? "warning" : "default"}
          />
          <FinanceExecutiveKpiCard
            icon={BarChart3}
            label="Saldo previsto"
            value={brl(kpis.saldoPrevisto)}
            hideDelta
            accent="#8b5cf6"
            tone={kpis.saldoPrevisto < 0 ? "warning" : "default"}
          />
        </FinanceExecutiveKpiGrid>

        <div className={FINANCE_FILTER_BAR}>
          <div className="grid min-w-0 gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <Label className="text-[11px] text-muted-foreground">Período de</Label>
              <Input
                type="date"
                className="mt-1 h-8 text-sm"
                value={filters.from}
                onChange={(e) => onFiltersChange({ ...filters, from: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground">Período até</Label>
              <Input
                type="date"
                className="mt-1 h-8 text-sm"
                value={filters.to}
                onChange={(e) => onFiltersChange({ ...filters, to: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground">Categoria</Label>
              <Select
                value={filters.categoryId}
                onValueChange={(v) => onFiltersChange({ ...filters, categoryId: v })}
              >
                <SelectTrigger className="mt-1 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SELECT_ALL}>Todas</SelectItem>
                  {(lookups.data?.categories ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground">Centro de custo</Label>
              <Select
                value={filters.costCenterId}
                onValueChange={(v) => onFiltersChange({ ...filters, costCenterId: v })}
              >
                <SelectTrigger className="mt-1 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
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
                <Button size="sm" className="h-8" onClick={onNewReceivable}>
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Recebimento
                </Button>
              )}
              {onNewPayable && (
                <Button size="sm" variant="outline" className="h-8" onClick={onNewPayable}>
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Despesa
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>
    </FinancePanelGate>
  );
}

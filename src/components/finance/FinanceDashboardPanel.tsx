import {
  ArrowDownCircle,
  ArrowUpCircle,
  LayoutDashboard,
} from "lucide-react";
import { OpsDataListPanel } from "@/components/ops";
import { EmptyState } from "@/components/layout";
import { FinanceKpiCard, FinanceKpiGrid } from "./FinanceKpiCard";
import { PageSection } from "@/components/layout/PageSection";
import { StatusBadge } from "@/components/layout/StatusBadge";
import type { DashboardFilters } from "@/lib/finance";
import { brl, fmtDate } from "@/lib/format";
import { FinancePanelGate } from "./FinancePanelGate";
import { FINANCE_PANEL_ROOT } from "./finance-layout";
import { useFinanceExecutiveDashboard } from "./useFinanceExecutiveDashboard";

type FinanceDashboardPanelProps = {
  clinicId: string | null;
  clinicLoading: boolean;
  filters: DashboardFilters;
  onNewReceivable?: () => void;
};

export function FinanceDashboardPanel({
  clinicId,
  clinicLoading,
  filters,
  onNewReceivable,
}: FinanceDashboardPanelProps) {
  const {
    kpis,
    monthSummary,
    incomeCats,
    expenseCats,
    costCentersRank,
    nextReceivables,
    nextPayables,
    hasData,
    isLoading,
    error,
    refetch,
  } = useFinanceExecutiveDashboard(clinicId, filters);

  return (
    <FinancePanelGate
      clinicId={clinicId}
      clinicLoading={clinicLoading}
      loading={isLoading}
      error={error}
      onRetry={refetch}
      loadingLabel="Preparando visão financeira…"
      errorFallback="Não foi possível carregar o dashboard financeiro."
    >
      <div className={FINANCE_PANEL_ROOT}>
        {!hasData ? (
          <EmptyState
            icon={LayoutDashboard}
            title="Comece pelo financeiro"
            description="Registre um recebimento ou despesa para ver o resumo da clínica aqui."
            action={onNewReceivable ? { label: "Novo recebimento", onClick: onNewReceivable } : undefined}
            className="py-12"
          />
        ) : (
          <>
            <PageSection
              title="Análise do período"
              description="Vencimentos, saldo mensal e rankings consolidados."
            >
              <FinanceKpiGrid columns={4}>
                <FinanceKpiCard icon={ArrowDownCircle} label="Receitas em aberto" value={brl(kpis.receitasEmAberto)} hideDelta tone="warning" />
                <FinanceKpiCard icon={ArrowUpCircle} label="Despesas em aberto" value={brl(kpis.despesasEmAberto)} hideDelta tone="warning" />
                <FinanceKpiCard icon={ArrowDownCircle} label="Vencidos a receber" value={brl(kpis.vencidosReceber)} hideDelta tone={kpis.vencidosReceber > 0 ? "warning" : "default"} />
                <FinanceKpiCard icon={ArrowUpCircle} label="Vencidos a pagar" value={brl(kpis.vencidosPagar)} hideDelta tone={kpis.vencidosPagar > 0 ? "warning" : "default"} />
              </FinanceKpiGrid>
            </PageSection>

            <FinanceKpiGrid columns={3}>
              <FinanceKpiCard
                icon={ArrowDownCircle}
                label={`Receitas · ${monthSummary.monthLabel}`}
                value={brl(monthSummary.receitaRealizada)}
                subtitle="Realizadas no mês"
                hideDelta
                accent="#059669"
              />
              <FinanceKpiCard
                icon={ArrowUpCircle}
                label={`Despesas · ${monthSummary.monthLabel}`}
                value={brl(monthSummary.despesaRealizada)}
                subtitle="Realizadas no mês"
                hideDelta
                accent="#e11d48"
              />
              <FinanceKpiCard
                icon={LayoutDashboard}
                label={`Saldo · ${monthSummary.monthLabel}`}
                value={brl(monthSummary.saldoRealizado)}
                subtitle="Resultado do mês"
                hideDelta
                accent="#0284c7"
                tone={monthSummary.saldoRealizado < 0 ? "warning" : "default"}
              />
            </FinanceKpiGrid>

            <div className="grid min-w-0 gap-4 lg:grid-cols-2">
              <OpsDataListPanel
                title="Próximos recebimentos"
                emptyLabel="Nenhum recebimento pendente."
                valueTone="income"
                items={nextReceivables.map((item) => ({
                  id: item.id,
                  primary: item.descricao,
                  secondary: fmtDate(item.date),
                  value: brl(item.valor),
                  badge: item.overdue ? (
                    <StatusBadge variant="warning" className="mt-1">Vencido</StatusBadge>
                  ) : undefined,
                }))}
              />
              <OpsDataListPanel
                title="Próximos pagamentos"
                emptyLabel="Nenhum pagamento pendente."
                valueTone="expense"
                items={nextPayables.map((item) => ({
                  id: item.id,
                  primary: item.descricao,
                  secondary: fmtDate(item.date),
                  value: brl(item.valor),
                  badge: item.overdue ? (
                    <StatusBadge variant="warning" className="mt-1">Vencido</StatusBadge>
                  ) : undefined,
                }))}
              />
            </div>

            <div className="grid min-w-0 gap-4 lg:grid-cols-3">
              <OpsDataListPanel
                title="Maiores receitas por categoria"
                valueTone="income"
                items={incomeCats.map((item, i) => ({
                  id: item.id,
                  primary: item.name,
                  value: brl(item.total),
                  rank: i + 1,
                }))}
              />
              <OpsDataListPanel
                title="Maiores despesas por categoria"
                valueTone="expense"
                items={expenseCats.map((item, i) => ({
                  id: item.id,
                  primary: item.name,
                  value: brl(item.total),
                  rank: i + 1,
                }))}
              />
              <OpsDataListPanel
                title="Centros de custo relevantes"
                valueTone="neutral"
                items={costCentersRank.map((item, i) => ({
                  id: item.id,
                  primary: item.name,
                  value: brl(item.total),
                  rank: i + 1,
                }))}
              />
            </div>
          </>
        )}
      </div>
    </FinancePanelGate>
  );
}

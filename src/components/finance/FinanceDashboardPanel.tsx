import {
  ArrowDownCircle,
  ArrowUpCircle,
  LayoutDashboard,
} from "lucide-react";
import { OpsDataListPanel } from "@/components/ops";
import { EmptyState, InfoCard } from "@/components/layout";
import { FinanceKpiCard, FinanceKpiGrid } from "./FinanceKpiCard";
import { PageSection } from "@/components/layout/PageSection";
import { StatusBadge } from "@/components/layout/StatusBadge";
import type { DashboardFilters } from "@/lib/finance";
import { brl, fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";
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
      loadingLabel="Carregando dashboard financeiro…"
      errorFallback="Não foi possível carregar o dashboard financeiro."
    >
      <div className={FINANCE_PANEL_ROOT}>
        {!hasData ? (
          <EmptyState
            icon={LayoutDashboard}
            title="Sem movimentações financeiras"
            description="Cadastre contas a receber ou a pagar para visualizar o dashboard executivo."
            action={onNewReceivable ? { label: "Novo recebimento", onClick: onNewReceivable } : undefined}
          />
        ) : (
          <>
            <PageSection
              title="Análise executiva"
              description="Comparativos, vencimentos e rankings consolidados no período selecionado."
            >
            <FinanceKpiGrid columns={4}>
              <FinanceKpiCard icon={ArrowDownCircle} label="Receitas em aberto" value={brl(kpis.receitasEmAberto)} hideDelta tone="warning" />
              <FinanceKpiCard icon={ArrowUpCircle} label="Despesas em aberto" value={brl(kpis.despesasEmAberto)} hideDelta tone="warning" />
              <FinanceKpiCard icon={ArrowDownCircle} label="Vencidos a receber" value={brl(kpis.vencidosReceber)} hideDelta tone={kpis.vencidosReceber > 0 ? "warning" : "default"} />
              <FinanceKpiCard icon={ArrowUpCircle} label="Vencidos a pagar" value={brl(kpis.vencidosPagar)} hideDelta tone={kpis.vencidosPagar > 0 ? "warning" : "default"} />
            </FinanceKpiGrid>

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

            <div className="grid min-w-0 gap-6 lg:grid-cols-2">
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

            <div className="grid min-w-0 gap-6 lg:grid-cols-3">
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
            </PageSection>
          </>
        )}
      </div>
    </FinancePanelGate>
  );
}

import {
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  BarChart3,
  Building2,
  Package,
  UserCircle2,
} from "lucide-react";
import { brl } from "@/lib/format";
import type { DashboardFilters } from "@/lib/finance";
import { OPS_OPS_GRID } from "@/components/ops";
import { FinanceOperationCard } from "./FinanceOperationCard";
import { FinancePanelGate } from "./FinancePanelGate";
import { FINANCE_ROUTES } from "./finance-routes";
import { useFinanceOperationsSnapshot } from "./useFinanceOperationsSnapshot";

type FinanceOperationsGridProps = {
  clinicId: string | null;
  clinicLoading: boolean;
  dashboardFilters: DashboardFilters;
};

export function FinanceOperationsGrid({
  clinicId,
  clinicLoading,
  dashboardFilters,
}: FinanceOperationsGridProps) {
  const { metrics, isLoading, error, refetch } = useFinanceOperationsSnapshot(clinicId, dashboardFilters);

  return (
    <FinancePanelGate
      clinicId={clinicId}
      clinicLoading={clinicLoading}
      loading={isLoading}
      error={error}
      onRetry={refetch}
      loadingLabel="Carregando operação financeira…"
      errorFallback="Não foi possível carregar os indicadores operacionais."
    >
      <section aria-label="Operação financeira" className={OPS_OPS_GRID}>
        <FinanceOperationCard
          title="Contas a Receber"
          icon={ArrowDownCircle}
          accent="#10b981"
          headline={brl(metrics.receber.valorAberto)}
          to={FINANCE_ROUTES.receber}
          metrics={[
            { label: "Títulos em aberto", value: String(metrics.receber.quantidade) },
            { label: "Vencimentos próximos", value: String(metrics.receber.proximosVencimentos) },
          ]}
        />
        <FinanceOperationCard
          title="Contas a Pagar"
          icon={ArrowUpCircle}
          accent="#ef4444"
          headline={brl(metrics.pagar.valorAberto)}
          to={FINANCE_ROUTES.pagar}
          metrics={[
            { label: "Títulos em aberto", value: String(metrics.pagar.quantidade) },
            { label: "Próximos vencimentos", value: String(metrics.pagar.proximosVencimentos) },
          ]}
        />
        <FinanceOperationCard
          title="Fluxo de Caixa"
          icon={BarChart3}
          accent="#3b82f6"
          headline={brl(metrics.fluxo.saldo)}
          to={FINANCE_ROUTES.fluxo}
          metrics={[
            { label: "Entradas", value: brl(metrics.fluxo.entradas) },
            { label: "Saídas", value: brl(metrics.fluxo.saidas) },
            { label: "Saldo previsto", value: brl(metrics.fluxo.saldoPrevisto) },
          ]}
        />
        <FinanceOperationCard
          title="Pacotes"
          icon={Package}
          accent="#8b5cf6"
          headline={`${metrics.pacotes.ativos} ativos`}
          to={FINANCE_ROUTES.pacotes}
          metrics={[
            { label: "Vencendo em breve", value: String(metrics.pacotes.vencendoEmBreve), emphasis: metrics.pacotes.vencendoEmBreve > 0 },
            { label: "Sessões restantes", value: String(metrics.pacotes.sessoesRestantes) },
          ]}
        />
        <FinanceOperationCard
          title="Convênios"
          icon={Building2}
          accent="#0ea5e9"
          headline={brl(metrics.convenios.valorPrevisto)}
          to={FINANCE_ROUTES.convenios}
          metrics={[
            { label: "Guias ativas", value: String(metrics.convenios.guias) },
            { label: "Pendências", value: String(metrics.convenios.pendencias), emphasis: metrics.convenios.pendencias > 0 },
          ]}
        />
        <FinanceOperationCard
          title="Inadimplência"
          icon={AlertTriangle}
          accent="#f97316"
          headline={brl(metrics.inadimplencia.valorVencido)}
          to={FINANCE_ROUTES.inadimplencia}
          metrics={[
            { label: "Pacientes", value: String(metrics.inadimplencia.pacientes) },
            { label: "Crítico (>30 dias)", value: brl(metrics.inadimplencia.criticoAcima30), emphasis: metrics.inadimplencia.criticoAcima30 > 0 },
          ]}
        />
        <FinanceOperationCard
          title="Receita por Profissional"
          icon={UserCircle2}
          accent="#6366f1"
          headline={brl(metrics.receitaProfissional.receitaTotal)}
          to={FINANCE_ROUTES.receitaProfissional}
          metrics={[
            {
              label: "Maior faturamento",
              value: metrics.receitaProfissional.maiorFaturamento
                ? `${metrics.receitaProfissional.maiorFaturamento.slice(0, 18)}${metrics.receitaProfissional.maiorFaturamento.length > 18 ? "…" : ""}`
                : "—",
            },
            { label: "Ticket médio", value: brl(metrics.receitaProfissional.ticketMedio) },
          ]}
        />
      </section>
    </FinancePanelGate>
  );
}

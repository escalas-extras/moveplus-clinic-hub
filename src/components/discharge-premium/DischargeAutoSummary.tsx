import { memo } from "react";
import { Activity, CalendarDays, RefreshCw, Stethoscope, TrendingDown, Hash } from "lucide-react";
import { KpiCard, KpiGrid } from "@/components/layout";
import type { TreatmentStats } from "./discharge-utils";

type DischargeAutoSummaryProps = {
  stats: TreatmentStats;
};

function DischargeAutoSummaryInner({ stats }: DischargeAutoSummaryProps) {
  const evaDelta =
    stats.evaInicial != null && stats.evaAtual != null
      ? `${stats.evaInicial} → ${stats.evaAtual}`
      : "—";

  return (
    <KpiGrid columns={3} className="lg:grid-cols-3 xl:grid-cols-6">
      <KpiCard icon={Hash} label="Sessões realizadas" value={stats.sessoes} accent="var(--primary)" hideDelta />
      <KpiCard
        icon={CalendarDays}
        label="Tempo de tratamento"
        value={`${stats.diasTratamento}d`}
        accent="#0284c7"
        hideDelta
        subtitle="Desde a avaliação inicial"
      />
      <KpiCard
        icon={TrendingDown}
        label="Evolução EVA"
        value={evaDelta}
        accent="#059669"
        hideDelta
        subtitle={stats.evolucaoFuncional.slice(0, 40)}
      />
      <KpiCard
        icon={Activity}
        label="Evolução funcional"
        value={stats.evolucaoFuncional.length > 24 ? "Ver resumo" : stats.evolucaoFuncional}
        accent="#7c3aed"
        hideDelta
        isPlaceholder={stats.evolucaoFuncional.startsWith("Sem")}
      />
      <KpiCard icon={RefreshCw} label="Reavaliações" value={stats.reavaliacoes} accent="#d97706" hideDelta />
      <KpiCard icon={Stethoscope} label="Evoluções registradas" value={stats.evolucoes} accent="#64748b" hideDelta />
    </KpiGrid>
  );
}

export const DischargeAutoSummary = memo(DischargeAutoSummaryInner);

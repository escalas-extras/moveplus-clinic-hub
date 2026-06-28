import { createFileRoute } from "@tanstack/react-router";
import { BarChart3 } from "lucide-react";
import { useActiveClinic } from "@/lib/active-clinic";
import {
  FinanceModuleShell,
  FinanceCashFlowPanel,
  FINANCE_MODULE_META,
} from "@/components/finance";

export const Route = createFileRoute("/_authenticated/app/financeiro/fluxo")({
  component: FinanceFluxoPage,
});

function FinanceFluxoPage() {
  const { clinicId, loading: clinicLoading } = useActiveClinic();
  const meta = FINANCE_MODULE_META.fluxo;

  return (
    <FinanceModuleShell
      title={meta.title}
      description={meta.description}
      breadcrumb={meta.breadcrumb}
      icon={BarChart3}
    >
      <FinanceCashFlowPanel clinicId={clinicId} clinicLoading={clinicLoading} />
    </FinanceModuleShell>
  );
}

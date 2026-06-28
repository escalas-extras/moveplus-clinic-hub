import { createFileRoute } from "@tanstack/react-router";
import { ArrowUpCircle } from "lucide-react";
import { useActiveClinic } from "@/lib/active-clinic";
import {
  FinanceModuleShell,
  FinancePayablesPanel,
  FINANCE_MODULE_META,
} from "@/components/finance";

export const Route = createFileRoute("/_authenticated/app/financeiro/pagar")({
  component: FinancePagarPage,
});

function FinancePagarPage() {
  const { clinicId, supportMode, loading: clinicLoading } = useActiveClinic();
  const meta = FINANCE_MODULE_META.pagar;

  return (
    <FinanceModuleShell
      title={meta.title}
      description={meta.description}
      breadcrumb={meta.breadcrumb}
      icon={ArrowUpCircle}
    >
      <FinancePayablesPanel
        clinicId={clinicId}
        clinicLoading={clinicLoading}
        supportMode={supportMode}
      />
    </FinanceModuleShell>
  );
}

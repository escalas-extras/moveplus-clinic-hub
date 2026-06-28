import { createFileRoute } from "@tanstack/react-router";
import { Building2 } from "lucide-react";
import { useActiveClinic } from "@/lib/active-clinic";
import {
  FinanceModuleShell,
  FinanceHealthInsurancePanel,
  FINANCE_MODULE_META,
} from "@/components/finance";

export const Route = createFileRoute("/_authenticated/app/financeiro/convenios")({
  component: FinanceConveniosPage,
});

function FinanceConveniosPage() {
  const { clinicId, supportMode, loading: clinicLoading } = useActiveClinic();
  const meta = FINANCE_MODULE_META.convenios;

  return (
    <FinanceModuleShell
      title={meta.title}
      description={meta.description}
      breadcrumb={meta.breadcrumb}
      icon={Building2}
    >
      <FinanceHealthInsurancePanel
        clinicId={clinicId}
        clinicLoading={clinicLoading}
        supportMode={supportMode}
      />
    </FinanceModuleShell>
  );
}

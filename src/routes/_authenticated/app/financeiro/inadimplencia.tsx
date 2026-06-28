import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import { useActiveClinic } from "@/lib/active-clinic";
import {
  FinanceModuleShell,
  FinanceDelinquencyPanel,
  FINANCE_MODULE_META,
} from "@/components/finance";

export const Route = createFileRoute("/_authenticated/app/financeiro/inadimplencia")({
  component: FinanceInadimplenciaPage,
});

function FinanceInadimplenciaPage() {
  const { clinicId, supportMode, loading: clinicLoading } = useActiveClinic();
  const meta = FINANCE_MODULE_META.inadimplencia;

  return (
    <FinanceModuleShell
      title={meta.title}
      description={meta.description}
      breadcrumb={meta.breadcrumb}
      icon={AlertTriangle}
    >
      <FinanceDelinquencyPanel
        clinicId={clinicId}
        clinicLoading={clinicLoading}
        supportMode={supportMode}
      />
    </FinanceModuleShell>
  );
}

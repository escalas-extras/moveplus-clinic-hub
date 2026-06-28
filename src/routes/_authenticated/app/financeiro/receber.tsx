import { createFileRoute } from "@tanstack/react-router";
import { ArrowDownCircle } from "lucide-react";
import { useActiveClinic } from "@/lib/active-clinic";
import {
  FinanceModuleShell,
  FinanceReceivablesPanel,
  FINANCE_MODULE_META,
} from "@/components/finance";

export const Route = createFileRoute("/_authenticated/app/financeiro/receber")({
  component: FinanceReceberPage,
});

function FinanceReceberPage() {
  const { clinicId, supportMode, loading: clinicLoading } = useActiveClinic();
  const meta = FINANCE_MODULE_META.receber;

  return (
    <FinanceModuleShell
      title={meta.title}
      description={meta.description}
      breadcrumb={meta.breadcrumb}
      icon={ArrowDownCircle}
    >
      <FinanceReceivablesPanel
        clinicId={clinicId}
        clinicLoading={clinicLoading}
        supportMode={supportMode}
      />
    </FinanceModuleShell>
  );
}

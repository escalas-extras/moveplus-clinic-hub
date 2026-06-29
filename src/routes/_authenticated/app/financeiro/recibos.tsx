import { createFileRoute } from "@tanstack/react-router";
import { Receipt } from "lucide-react";
import { useActiveClinic } from "@/lib/active-clinic";
import { FinanceModuleShell, FinanceRecibosPanel, FINANCE_MODULE_META } from "@/components/finance";

export const Route = createFileRoute("/_authenticated/app/financeiro/recibos")({
  component: FinanceRecibosPage,
});

function FinanceRecibosPage() {
  const { clinicId, supportMode, loading: clinicLoading } = useActiveClinic();
  const meta = FINANCE_MODULE_META.recibos;

  return (
    <FinanceModuleShell
      title={meta.title}
      description={meta.description}
      breadcrumb={meta.breadcrumb}
      icon={Receipt}
    >
      <FinanceRecibosPanel
        clinicId={clinicId}
        clinicLoading={clinicLoading}
        supportMode={supportMode}
      />
    </FinanceModuleShell>
  );
}

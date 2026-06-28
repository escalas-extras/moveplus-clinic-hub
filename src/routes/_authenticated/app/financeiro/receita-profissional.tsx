import { createFileRoute } from "@tanstack/react-router";
import { UserCircle2 } from "lucide-react";
import { useActiveClinic } from "@/lib/active-clinic";
import {
  FinanceModuleShell,
  FinanceProfessionalRevenuePanel,
  FINANCE_MODULE_META,
} from "@/components/finance";

export const Route = createFileRoute("/_authenticated/app/financeiro/receita-profissional")({
  component: FinanceReceitaProfissionalPage,
});

function FinanceReceitaProfissionalPage() {
  const { clinicId, loading: clinicLoading } = useActiveClinic();
  const meta = FINANCE_MODULE_META.receitaProfissional;

  return (
    <FinanceModuleShell
      title={meta.title}
      description={meta.description}
      breadcrumb={meta.breadcrumb}
      icon={UserCircle2}
    >
      <FinanceProfessionalRevenuePanel clinicId={clinicId} clinicLoading={clinicLoading} />
    </FinanceModuleShell>
  );
}

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Settings2, Wallet } from "lucide-react";
import { useActiveClinic } from "@/lib/active-clinic";
import { AppShell } from "@/components/layout";
import { PageHero, ModuleStack, ActionButton } from "@/components/ui-system";
import {
  FinanceDashboardPanel,
  FinanceExecutiveStrip,
  FinanceHomeSummaryCards,
  FinanceOperationsGrid,
  FINANCE_ROUTES,
} from "@/components/finance";
import { defaultDashboardFilters } from "@/lib/finance";

export const Route = createFileRoute("/_authenticated/app/financeiro/")({
  component: FinanceiroHomePage,
});

function FinanceiroHomePage() {
  const { clinicId, loading: clinicLoading } = useActiveClinic();
  const [dashboardFilters, setDashboardFilters] = useState(() => defaultDashboardFilters());
  const navigate = useNavigate();

  return (
    <AppShell clinical>
      <PageHero
        variant="module"
        icon={Wallet}
        eyebrow="Gestão"
        title="Painel Financeiro"
        description="Resumo financeiro da clínica e acesso rápido aos módulos operacionais."
        breadcrumbs={[{ label: "Clínica", to: "/app" }, { label: "Financeiro" }]}
        actions={
          <ActionButton variant="outline" asChild className="h-9 px-3 text-xs">
            <Link to={FINANCE_ROUTES.administracao}>
              <Settings2 className="mr-1.5 h-3.5 w-3.5" />
              Administração
            </Link>
          </ActionButton>
        }
      />

      <ModuleStack className="space-y-4 sm:space-y-5">
        <FinanceExecutiveStrip
          clinicId={clinicId}
          clinicLoading={clinicLoading}
          filters={dashboardFilters}
          onFiltersChange={setDashboardFilters}
          onNewReceivable={() => navigate({ to: FINANCE_ROUTES.receber })}
          onNewPayable={() => navigate({ to: FINANCE_ROUTES.pagar })}
        />

        <FinanceHomeSummaryCards clinicId={clinicId} clinicLoading={clinicLoading} />

        <FinanceOperationsGrid
          clinicId={clinicId}
          clinicLoading={clinicLoading}
          dashboardFilters={dashboardFilters}
        />

        <FinanceDashboardPanel
          clinicId={clinicId}
          clinicLoading={clinicLoading}
          filters={dashboardFilters}
          onNewReceivable={() => navigate({ to: FINANCE_ROUTES.receber })}
        />
      </ModuleStack>
    </AppShell>
  );
}

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { AppShell } from "@/components/layout";
import { OpsBackLink } from "@/components/ops";
import { PageHero, ModuleStack } from "@/components/ui-system";
import { FINANCE_ROUTES } from "./finance-routes";

type FinanceModuleShellProps = {
  title: string;
  description: string;
  breadcrumb: string;
  icon: LucideIcon;
  children: ReactNode;
};

export function FinanceModuleShell({
  title,
  description,
  breadcrumb,
  icon,
  children,
}: FinanceModuleShellProps) {
  return (
    <AppShell clinical>
      <OpsBackLink to={FINANCE_ROUTES.home} />

      <PageHero
        variant="module"
        icon={icon}
        eyebrow="Gestão"
        title={title}
        description={description}
        breadcrumbs={[
          { label: "Clínica", to: "/app" },
          { label: "Financeiro", to: FINANCE_ROUTES.home },
          { label: breadcrumb },
        ]}
      />

      <ModuleStack className="min-w-0 w-full max-w-full space-y-4 sm:space-y-5">{children}</ModuleStack>
    </AppShell>
  );
}

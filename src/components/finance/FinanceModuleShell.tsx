import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { AppShell, PageHeader } from "@/components/layout";
import { OpsBackLink } from "@/components/ops";
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

      <PageHeader
        className="ops-page-hero ops-page-hero--module"
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

      <div className="ops-module-stack min-w-0 w-full max-w-full">{children}</div>
    </AppShell>
  );
}

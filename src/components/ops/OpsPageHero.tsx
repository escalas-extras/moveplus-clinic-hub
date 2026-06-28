import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { PageHeader, type BreadcrumbItem } from "@/components/layout";
import { DashboardHero, type DashboardHeroProps } from "@/components/dashboard/DashboardHero";

type OpsPageHeroModuleProps = {
  variant?: "module";
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: ReactNode;
  className?: string;
};

type OpsPageHeroWelcomeProps = {
  variant: "welcome";
  className?: string;
} & DashboardHeroProps;

export type OpsPageHeroProps = OpsPageHeroModuleProps | OpsPageHeroWelcomeProps;

/** Hero unificado — módulos usam PageHeader; dashboard usa welcome banner. */
export function OpsPageHero(props: OpsPageHeroProps) {
  if (props.variant === "welcome") {
    const { variant: _, className, ...heroProps } = props;
    return <DashboardHero className={cn("ops-page-hero ops-page-hero--welcome", className)} {...heroProps} />;
  }

  const { icon, eyebrow, title, description, breadcrumbs, actions, className } = props;
  return (
    <PageHeader
      className={cn("ops-page-hero ops-page-hero--module", className)}
      icon={icon}
      eyebrow={eyebrow}
      title={title}
      description={description}
      breadcrumbs={breadcrumbs}
      actions={actions}
    />
  );
}

type OpsBackLinkProps = {
  to: string;
  label?: string;
  className?: string;
};

export function OpsBackLink({ to, label = "← Dashboard Financeiro", className }: OpsBackLinkProps) {
  return (
    <Link
      to={to}
      className={cn(
        "ops-back-link mb-4 inline-flex items-center text-xs font-medium text-muted-foreground transition-colors hover:text-foreground",
        className,
      )}
    >
      {label}
    </Link>
  );
}

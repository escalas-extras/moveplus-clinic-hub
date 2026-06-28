import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import {
  PageHero,
  type PageHeroModuleProps,
  type PageHeroOperationalProps,
} from "@/components/ui-system/PageHero";
import { DashboardHero, type DashboardHeroProps } from "@/components/dashboard/DashboardHero";

type OpsPageHeroModuleProps = Omit<PageHeroModuleProps, "variant">;
type OpsPageHeroWelcomeProps = { variant: "welcome"; className?: string } & DashboardHeroProps;

export type OpsPageHeroProps = OpsPageHeroModuleProps | OpsPageHeroWelcomeProps;

/** @deprecated Use PageHero from @/components/ui-system */
export function OpsPageHero(props: OpsPageHeroProps) {
  if (props.variant === "welcome") {
    const { variant: _, className, ...heroProps } = props;
    return <DashboardHero className={cn("page-hero page-hero--welcome", className)} {...heroProps} />;
  }
  return <PageHero variant="module" {...props} />;
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
        "fos-back-link mb-4 inline-flex items-center text-xs font-medium text-muted-foreground transition-colors hover:text-foreground",
        className,
      )}
    >
      {label}
    </Link>
  );
}

export type { PageHeroOperationalProps };

import type { ReactNode } from "react";
import { KpiCard, type KpiCardProps } from "@/components/layout/KpiCard";
import { KpiGrid } from "@/components/layout/KpiGrid";
import { cn } from "@/lib/utils";

/** KPI compacto (~30% menor) — painéis de módulo. */
export function FinanceKpiCard(props: KpiCardProps) {
  return (
    <KpiCard
      {...props}
      size="compact"
      variant={props.variant ?? "premium"}
    />
  );
}

/** KPI denso (~25% menor que compact) — faixa executiva no topo da página. */
export function FinanceExecutiveKpiCard(props: KpiCardProps) {
  return (
    <KpiCard
      {...props}
      size="dense"
      variant={props.variant ?? "premium"}
    />
  );
}

type FinanceKpiGridProps = {
  children: ReactNode;
  columns?: 2 | 3 | 4 | 6;
  className?: string;
};

export function FinanceKpiGrid({ children, columns = 4, className }: FinanceKpiGridProps) {
  return (
    <KpiGrid columns={columns} className={cn("gap-3 lg:gap-3.5", className)}>
      {children}
    </KpiGrid>
  );
}

export function FinanceExecutiveKpiGrid({ children, columns = 4, className }: FinanceKpiGridProps) {
  return (
    <KpiGrid columns={columns} className={cn("gap-2 lg:gap-2.5", className)}>
      {children}
    </KpiGrid>
  );
}

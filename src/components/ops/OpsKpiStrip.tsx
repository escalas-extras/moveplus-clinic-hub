import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { KpiGrid } from "@/components/layout/KpiGrid";
import { KpiCard, type KpiCardProps } from "@/components/layout/KpiCard";
import { opsAccent, opsKpiColumns } from "./ops-tokens";

type OpsKpiStripProps = {
  children: ReactNode;
  columns?: 2 | 3 | 4 | 6;
  /** dashboard = 6 colunas; module = 4 colunas */
  preset?: keyof typeof opsKpiColumns;
  className?: string;
};

export function OpsKpiStrip({ children, columns, preset = "module", className }: OpsKpiStripProps) {
  const cols = columns ?? opsKpiColumns[preset];
  return (
    <KpiGrid columns={cols} className={cn("ops-kpi-strip", className)}>
      {children}
    </KpiGrid>
  );
}

type OpsKpiCardProps = Omit<KpiCardProps, "variant"> & {
  /** Usa tokens semânticos do design system quando informado. */
  accentKey?: keyof typeof opsAccent;
  /** Dashboard mantém tamanho default; módulos usam compact. */
  module?: boolean;
};

/** KPI padronizado — variant premium, accent semântico e tamanho por contexto. */
export function OpsKpiCard({
  accentKey,
  accent,
  module = true,
  size,
  ...props
}: OpsKpiCardProps) {
  const resolvedAccent = accent ?? (accentKey ? opsAccent[accentKey] : opsAccent.primary);
  return (
    <KpiCard
      variant="premium"
      size={size ?? (module ? "compact" : "default")}
      accent={resolvedAccent}
      {...props}
    />
  );
}

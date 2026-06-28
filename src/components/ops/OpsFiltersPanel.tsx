import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { InfoCard } from "@/components/layout/InfoCard";
import { Button } from "@/components/ui/button";
import { OPS_FILTER_GRID } from "./ops-tokens";

type OpsMobileFilterToggleProps = {
  active?: boolean;
  expanded: boolean;
  onToggle: () => void;
  className?: string;
};

export function OpsMobileFilterToggle({
  active,
  expanded,
  onToggle,
  className,
}: OpsMobileFilterToggleProps) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      aria-expanded={expanded}
      className={cn("rounded-lg lg:hidden ops-filter-toggle", className)}
      onClick={onToggle}
    >
      <Filter className="mr-2 h-4 w-4" />
      Filtros
      {active && <span className="ml-1.5 h-2 w-2 rounded-full bg-primary" aria-hidden />}
    </Button>
  );
}

type OpsFiltersPanelProps = {
  icon?: LucideIcon;
  title?: string;
  description?: string;
  toolbar?: ReactNode;
  actions?: ReactNode;
  /** Conteúdo alinhado à direita (ex.: tabs de visualização). */
  trailing?: ReactNode;
  children: ReactNode;
  showMobileFilters: boolean;
  hasActiveFilters?: boolean;
  onToggleMobileFilters: () => void;
  filterColumns?: 2 | 3 | 4 | 5;
  className?: string;
};

const filterColClass: Record<NonNullable<OpsFiltersPanelProps["filterColumns"]>, string> = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-3",
  4: "lg:grid-cols-4",
  5: "sm:grid-cols-2 lg:grid-cols-5",
};

/** Painel de filtros padronizado — toolbar + grid responsivo com toggle mobile. */
export function OpsFiltersPanel({
  icon,
  title,
  description,
  toolbar,
  actions,
  trailing,
  children,
  showMobileFilters,
  hasActiveFilters,
  onToggleMobileFilters,
  filterColumns = 4,
  className,
}: OpsFiltersPanelProps) {
  const inner = (
    <div className="space-y-4">
      {(toolbar || actions || trailing) && (
        <div className="flex flex-wrap items-center gap-2">
          {toolbar}
          {actions}
          <OpsMobileFilterToggle
            active={hasActiveFilters}
            expanded={showMobileFilters}
            onToggle={onToggleMobileFilters}
          />
          {trailing && <div className="ml-auto flex flex-wrap items-center gap-2">{trailing}</div>}
        </div>
      )}

      <div
        className={cn(
          OPS_FILTER_GRID,
          filterColClass[filterColumns],
          showMobileFilters ? "grid" : "hidden lg:grid",
        )}
      >
        {children}
      </div>
    </div>
  );

  if (title) {
    return (
      <InfoCard
        icon={icon}
        title={title}
        description={description}
        className={cn("ops-filters-panel", className)}
      >
        {inner}
      </InfoCard>
    );
  }

  return (
    <InfoCard padded className={cn("ops-filters-panel", className)}>
      {inner}
    </InfoCard>
  );
}

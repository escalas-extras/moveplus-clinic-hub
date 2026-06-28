import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { OpsFiltersPanel } from "@/components/ops/OpsFiltersPanel";

export type PageToolbarProps = ComponentProps<typeof OpsFiltersPanel>;

/** Toolbar de filtros e busca — padrão único para módulos operacionais. */
export function PageToolbar({ className, ...props }: PageToolbarProps) {
  return <OpsFiltersPanel {...props} className={cn("fos-page-toolbar", className)} />;
}

export { OpsMobileFilterToggle as PageToolbarMobileToggle } from "@/components/ops/OpsFiltersPanel";

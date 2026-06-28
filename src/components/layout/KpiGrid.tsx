import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { clinical } from "./clinical-classes";

type KpiGridProps = {
  children: ReactNode;
  columns?: 2 | 3 | 4 | 6;
  className?: string;
};

const colClass: Record<NonNullable<KpiGridProps["columns"]>, string> = {
  2: "grid-cols-2",
  3: "grid-cols-2 sm:grid-cols-3",
  4: "grid-cols-2 sm:grid-cols-4",
  6: "grid-cols-2 md:grid-cols-3 xl:grid-cols-3 gap-4 lg:gap-5",
};

export function KpiGrid({ children, columns = 4, className }: KpiGridProps) {
  return (
    <section aria-label="Indicadores" className={cn(clinical.kpiGrid, colClass[columns], className)}>
      {children}
    </section>
  );
}

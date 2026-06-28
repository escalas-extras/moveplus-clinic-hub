import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { clinical } from "./clinical-classes";

export type BreadcrumbItem = {
  label: string;
  to?: string;
};

type PageBreadcrumbProps = {
  items: BreadcrumbItem[];
  className?: string;
};

export function PageBreadcrumb({ items, className }: PageBreadcrumbProps) {
  if (!items.length) return null;

  return (
    <nav aria-label="Breadcrumb" className={cn("mb-3", className)}>
      <ol className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <li key={`${item.label}-${i}`} className="inline-flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3 w-3 shrink-0 opacity-50" aria-hidden />}
              {item.to && !isLast ? (
                <Link
                  to={item.to}
                  className={cn(
                    "font-medium text-muted-foreground transition-colors hover:text-primary",
                    clinical.focusRing,
                    "rounded-sm px-0.5",
                  )}
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className={cn(isLast ? "font-semibold text-slate-700" : "font-medium")}
                  aria-current={isLast ? "page" : undefined}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

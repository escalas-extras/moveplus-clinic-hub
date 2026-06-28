import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageBreadcrumb, type BreadcrumbItem } from "./PageBreadcrumb";

type PageHeaderProps = {
  title: string;
  description?: string;
  eyebrow?: string;
  icon?: LucideIcon;
  breadcrumbs?: BreadcrumbItem[];
  actions?: ReactNode;
  className?: string;
};

export function PageHeader({
  title,
  description,
  eyebrow,
  icon: Icon,
  breadcrumbs,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn("flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between lg:gap-5", className)}>
      <div className="min-w-0">
        {breadcrumbs && breadcrumbs.length > 0 && <PageBreadcrumb items={breadcrumbs} />}
        {(eyebrow || Icon) && (
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-primary shadow-[0_10px_24px_-20px_rgba(15,23,42,0.45)]">
            {Icon && <Icon className="h-3.5 w-3.5" aria-hidden />}
            {eyebrow}
          </div>
        )}
        <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl lg:text-[2.15rem]">
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      )}
    </header>
  );
}

export type { BreadcrumbItem };

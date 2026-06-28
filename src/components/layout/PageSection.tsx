import { memo, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { clinical } from "./clinical-classes";

type PageSectionProps = {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
  contentClassName?: string;
};

function PageSectionInner({
  icon: Icon,
  title,
  description,
  actions,
  children,
  className,
  contentClassName,
}: PageSectionProps) {
  return (
    <section className={cn(clinical.pageSection, className)}>
      <div className={clinical.pageSectionHeader}>
        <div className="flex min-w-0 flex-1 flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3.5">
            {Icon && (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-soft ring-1 ring-black/[0.04]">
                <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary/70">Módulo</p>
              <h2 className="mt-0.5 text-base font-bold tracking-tight text-slate-900 sm:text-lg">{title}</h2>
              {description && (
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{description}</p>
              )}
            </div>
          </div>
          {actions && <div className="shrink-0">{actions}</div>}
        </div>
      </div>
      {children && <div className={cn(clinical.pageSectionBody, contentClassName)}>{children}</div>}
    </section>
  );
}

export const PageSection = memo(PageSectionInner);

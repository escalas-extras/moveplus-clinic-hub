import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type SectionHeaderProps = {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: ReactNode;
  className?: string;
};

/** Cabeçalho de seção compacto — reutilizável em módulos operacionais. */
export function SectionHeader({ title, description, icon: Icon, action, className }: SectionHeaderProps) {
  return (
    <div className={cn("section-header flex flex-wrap items-end justify-between gap-2", className)}>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          {Icon && (
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[rgba(15,76,92,0.06)] text-[var(--fos-primary)]">
              <Icon className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
            </span>
          )}
          <h2 className="text-sm font-semibold tracking-tight text-slate-900">{title}</h2>
        </div>
        {description && (
          <p className="mt-0.5 text-xs text-slate-500">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

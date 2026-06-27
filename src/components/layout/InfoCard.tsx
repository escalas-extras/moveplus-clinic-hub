import type { HTMLAttributes, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type InfoCardProps = HTMLAttributes<HTMLDivElement> & {
  icon?: LucideIcon;
  title?: string;
  description?: string;
  action?: ReactNode;
  padded?: boolean;
};

export function InfoCard({
  icon: Icon,
  title,
  description,
  action,
  padded = true,
  className,
  children,
  ...props
}: InfoCardProps) {
  const hasHeader = Icon || title || description || action;

  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200/80 bg-white text-card-foreground shadow-[0_18px_44px_-36px_rgba(15,23,42,0.55)]",
        padded && "p-5 sm:p-6",
        className,
      )}
      {...props}
    >
      {hasHeader && (
        <div className={cn("flex flex-wrap items-start justify-between gap-4", children && "mb-5")}>
          <div className="flex min-w-0 items-start gap-3">
            {Icon && (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-soft">
                <Icon className="h-5 w-5" />
              </div>
            )}
            <div className="min-w-0">
              {title && (
                <h2 className="text-base font-bold tracking-tight text-slate-950 sm:text-lg">
                  {title}
                </h2>
              )}
              {description && (
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {description}
                </p>
              )}
            </div>
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

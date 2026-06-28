import type { LucideIcon } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { clinical } from "@/components/layout/clinical-classes";

export type OpsOperationMetric = {
  label: string;
  value: string;
  emphasis?: boolean;
};

type OpsOperationCardProps = {
  title: string;
  icon: LucideIcon;
  accent: string;
  headline: string;
  metrics: OpsOperationMetric[];
  to: string;
  active?: boolean;
};

/** Card operacional clicável — navegação para submódulos (hub de operações). */
export function OpsOperationCard({
  title,
  icon: Icon,
  accent,
  headline,
  metrics,
  to,
  active,
}: OpsOperationCardProps) {
  return (
    <Link
      to={to}
      className={cn(
        "ops-operation-card group relative flex min-w-0 cursor-pointer flex-col rounded-2xl border bg-card p-4 text-left no-underline transition-all duration-200",
        clinical.cardHover,
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        active
          ? "border-primary/35 shadow-[0_8px_24px_-12px_rgba(15,76,92,0.22)] ring-1 ring-primary/15"
          : "border-[var(--fos-card-border)] shadow-[var(--fos-card-shadow)]",
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-0.5 rounded-t-2xl opacity-90"
        style={{ background: `linear-gradient(90deg, ${accent}, color-mix(in oklab, ${accent} 55%, var(--fos-secondary)))` }}
      />
      <div className="relative mb-2 flex items-center gap-2">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-transform group-hover:scale-[1.02]"
          style={{ background: `${accent}14`, color: accent }}
        >
          <Icon className="h-4 w-4" strokeWidth={2.25} aria-hidden />
        </span>
        <h3 className="text-sm font-semibold tracking-tight text-foreground">{title}</h3>
      </div>

      <p className="relative text-xl font-bold tabular-nums tracking-tight text-slate-950 sm:text-2xl">{headline}</p>

      <dl className="relative mt-3 space-y-1 border-t border-border/40 pt-3">
        {metrics.map((line) => (
          <div key={line.label} className="flex items-baseline justify-between gap-2 text-xs">
            <dt className="text-muted-foreground">{line.label}</dt>
            <dd
              className={cn(
                "tabular-nums text-right font-medium text-foreground",
                line.emphasis && "text-amber-700",
              )}
            >
              {line.value}
            </dd>
          </div>
        ))}
      </dl>
    </Link>
  );
}

import type { CSSProperties, ReactNode } from "react";
import { CalendarDays, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export type DashboardHeroProps = {
  greeting: string;
  displayName?: string;
  clinicName: string;
  dateLabel: string;
  primaryColor: string;
  secondaryColor: string;
  /** Indicador operacional do dia (ex.: atendimentos hoje). */
  dayMetric?: { label: string; value: string | number; hint?: string };
  actions?: ReactNode;
  className?: string;
};

export function DashboardHero({
  greeting,
  displayName,
  clinicName,
  dateLabel,
  primaryColor,
  secondaryColor,
  dayMetric,
  actions,
  className,
}: DashboardHeroProps) {
  const title = displayName ? `${greeting}, ${displayName}` : greeting;

  return (
    <section
      className={cn("dashboard-hero relative overflow-hidden rounded-[1.35rem]", className)}
      style={
        {
          "--hero-primary": primaryColor,
          "--hero-secondary": secondaryColor,
        } as CSSProperties
      }
    >
      <div className="dashboard-hero-bg" aria-hidden />
      <div className="relative flex flex-col gap-6 px-6 py-8 sm:px-8 sm:py-10 lg:flex-row lg:items-end lg:justify-between lg:gap-8">
        <div className="min-w-0 flex-1 space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/50 bg-white/55 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--hero-primary)] shadow-sm backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            {clinicName}
          </div>

          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl lg:text-[2.65rem] lg:leading-[1.08]">
              {title}
            </h1>
            <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600 sm:text-base">
              <span className="inline-flex items-center gap-1.5 capitalize">
                <CalendarDays className="h-4 w-4 shrink-0 text-[var(--hero-primary)]" aria-hidden />
                {dateLabel}
              </span>
            </p>
          </div>

          {dayMetric && (
            <div className="inline-flex flex-wrap items-center gap-3 rounded-2xl border border-white/60 bg-white/70 px-4 py-3 shadow-[var(--fos-card-shadow)] backdrop-blur-md">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                  {dayMetric.label}
                </div>
                <div className="text-2xl font-bold tabular-nums tracking-tight text-[var(--hero-primary)] kpi-value">
                  {dayMetric.value}
                </div>
              </div>
              {dayMetric.hint && (
                <>
                  <div className="hidden h-10 w-px bg-slate-200 sm:block" aria-hidden />
                  <p className="max-w-[220px] text-xs leading-relaxed text-slate-600">{dayMetric.hint}</p>
                </>
              )}
            </div>
          )}
        </div>

        {actions && (
          <div className="flex shrink-0 flex-wrap items-center gap-2.5 lg:justify-end">{actions}</div>
        )}
      </div>
    </section>
  );
}

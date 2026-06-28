import type { CSSProperties, ReactNode } from "react";
import { CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

export type HomeHeroV2Props = {
  /** Se informado, substitui saudação + nome. */
  title?: string;
  greeting?: string;
  displayName?: string;
  clinicName: string;
  dateLabel: string;
  primaryColor: string;
  secondaryColor: string;
  daySummary?: { label: string; value: string | number }[];
  actions?: ReactNode;
  className?: string;
};

/** Hero compacto da Home — premium, leve, focado na operação do dia. */
export function HomeHeroV2({
  title: titleOverride,
  greeting,
  displayName,
  clinicName,
  dateLabel,
  primaryColor,
  secondaryColor,
  daySummary,
  actions,
  className,
}: HomeHeroV2Props) {
  const heading = titleOverride ?? (displayName && greeting ? `${greeting}, ${displayName}` : greeting ?? clinicName);

  return (
    <section
      className={cn(
        "home-hero-v2 relative overflow-hidden rounded-2xl border border-[rgba(15,76,92,0.1)] bg-white/80 px-5 py-4 shadow-[var(--fos-card-shadow)] backdrop-blur-sm sm:px-6 sm:py-5",
        className,
      )}
      style={
        {
          "--hero-primary": primaryColor,
          "--hero-secondary": secondaryColor,
        } as CSSProperties
      }
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full opacity-[0.07] blur-2xl"
        style={{ background: primaryColor }}
      />
      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--hero-primary)]">
            {clinicName}
          </p>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-[1.75rem]">{heading}</h1>
            <p className="mt-1 flex items-center gap-1.5 text-sm capitalize text-slate-600">
              <CalendarDays className="h-3.5 w-3.5 shrink-0 text-[var(--hero-primary)]" aria-hidden />
              {dateLabel}
            </p>
          </div>

          {daySummary && daySummary.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-0.5">
              {daySummary.map((chip) => (
                <div
                  key={chip.label}
                  className="inline-flex items-baseline gap-1.5 rounded-lg border border-[rgba(15,76,92,0.1)] bg-[rgba(15,76,92,0.03)] px-2.5 py-1"
                >
                  <span className="text-lg font-bold tabular-nums text-[var(--hero-primary)]">{chip.value}</span>
                  <span className="text-[11px] text-slate-600">{chip.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {actions && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
        )}
      </div>
    </section>
  );
}

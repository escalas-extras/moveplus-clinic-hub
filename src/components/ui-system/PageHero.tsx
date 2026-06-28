import type { CSSProperties, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader, type BreadcrumbItem } from "@/components/layout";
import { FOS_RADIUS, FOS_RADIUS_SM, FOS_TITLE_PAGE, FOS_EYEBROW } from "./tokens";

export type PageHeroChip = { label: string; value: string | number };

export type PageHeroOperationalProps = {
  variant?: "operational";
  title?: string;
  greeting?: string;
  displayName?: string;
  clinicName: string;
  dateLabel: string;
  primaryColor: string;
  secondaryColor: string;
  chips?: PageHeroChip[];
  /** @deprecated use chips */
  daySummary?: PageHeroChip[];
  actions?: ReactNode;
  className?: string;
};

export type PageHeroModuleProps = {
  variant: "module";
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: ReactNode;
  className?: string;
};

export type PageHeroProps = PageHeroOperationalProps | PageHeroModuleProps;

/** Hero unificado — operacional (Dashboard/Agenda/Pacientes) ou módulo (Financeiro). */
export function PageHero(props: PageHeroProps) {
  if (props.variant === "module") {
    const { icon, eyebrow, title, description, breadcrumbs, actions, className } = props;
    return (
      <PageHeader
        className={cn("page-hero page-hero--module", className)}
        icon={icon}
        eyebrow={eyebrow}
        title={title}
        description={description}
        breadcrumbs={breadcrumbs}
        actions={actions}
      />
    );
  }

  const {
    title: titleOverride,
    greeting,
    displayName,
    clinicName,
    dateLabel,
    primaryColor,
    secondaryColor,
    chips,
    daySummary,
    actions,
    className,
  } = props;

  const summary = chips ?? daySummary;
  const heading =
    titleOverride ?? (displayName && greeting ? `${greeting}, ${displayName}` : greeting ?? clinicName);

  return (
    <section
      className={cn(
        "page-hero page-hero--operational relative overflow-hidden border border-[rgba(15,76,92,0.1)] bg-white/80 px-5 py-4 shadow-[var(--fos-card-shadow)] backdrop-blur-sm sm:px-6 sm:py-5",
        FOS_RADIUS,
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
          <p className={FOS_EYEBROW} style={{ color: primaryColor }}>
            {clinicName}
          </p>
          <div>
            <h1 className={FOS_TITLE_PAGE}>{heading}</h1>
            <p className="mt-1 flex items-center gap-1.5 text-sm capitalize text-slate-600">
              <CalendarDays className="h-3.5 w-3.5 shrink-0 text-[var(--hero-primary)]" aria-hidden />
              {dateLabel}
            </p>
          </div>

          {summary && summary.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-0.5">
              {summary.map((chip) => (
                <div
                  key={chip.label}
                  className={cn(
                    "inline-flex max-w-full items-baseline gap-1.5 border border-[rgba(15,76,92,0.1)] bg-[rgba(15,76,92,0.03)] px-2.5 py-1",
                    FOS_RADIUS_SM,
                  )}
                >
                  <span className="truncate text-base font-bold tabular-nums text-[var(--hero-primary)] sm:text-lg">
                    {chip.value}
                  </span>
                  <span className="text-[11px] text-slate-600">{chip.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </section>
  );
}

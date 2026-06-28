import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { clinical } from "@/components/layout/clinical-classes";

export type OperationalCardTrend = {
  label: string;
  tone?: "success" | "warning" | "danger" | "neutral";
};

export type OperationalCardProps = {
  title: string;
  icon: LucideIcon;
  value: string | number;
  context: string;
  to?: string;
  accent?: string;
  trend?: OperationalCardTrend;
  alert?: boolean;
  compact?: boolean;
  /** Somente exibição — sem navegação ao clicar. */
  static?: boolean;
  /** Ação local (ex.: aplicar filtro) — substitui navegação. */
  onClick?: () => void;
};

const trendToneClass: Record<NonNullable<OperationalCardTrend["tone"]>, string> = {
  success: "text-emerald-700 bg-emerald-50",
  warning: "text-amber-700 bg-amber-50",
  danger: "text-rose-700 bg-rose-50",
  neutral: "text-slate-600 bg-slate-100",
};

/** Card operacional acionável — número, contexto, tendência e navegação. */
export function OperationalCard({
  title,
  icon: Icon,
  value,
  context = "",
  to,
  accent = "var(--fos-primary)",
  trend,
  alert,
  compact,
  static: isStatic,
  onClick,
}: OperationalCardProps) {
  const SafeIcon = Icon ?? ArrowUpRight;
  const displayValue = value ?? "—";
  const interactive = !isStatic && (!!onClick || !!to);
  const cardClass = cn(
    "operational-card group relative flex w-full flex-col rounded-2xl border bg-white/90 text-left transition-all duration-200",
    compact ? "min-h-[88px] p-2.5" : "min-h-[108px] p-3.5",
    interactive && clinical.cardHover,
    alert
      ? "border-amber-200/80 shadow-[0_4px_20px_-8px_rgba(245,158,11,0.35)]"
      : "border-[rgba(15,76,92,0.1)] shadow-[var(--fos-card-shadow)]",
  );

  const inner = (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-0.5 rounded-t-2xl opacity-90"
        style={{ background: `linear-gradient(90deg, ${accent}, color-mix(in oklab, ${accent} 50%, var(--fos-secondary)))` }}
      />
      <div className="flex items-start justify-between gap-2">
        <div
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
          style={{ background: `${accent}14`, color: accent }}
        >
          <SafeIcon className={cn("stroke-[2.25]", compact ? "h-3.5 w-3.5" : "h-4 w-4")} aria-hidden />
        </div>
        {interactive && (
          <ArrowUpRight
            className="h-3.5 w-3.5 shrink-0 text-slate-300 transition-colors group-hover:text-[var(--fos-primary)]"
            aria-hidden
          />
        )}
      </div>

      <p className={cn("font-bold uppercase tracking-[0.12em] text-slate-500", compact ? "mt-1.5 text-[9px]" : "mt-2.5 text-[10px]")}>{title}</p>
      <p className={cn("font-bold tabular-nums tracking-tight text-slate-950", compact ? "text-lg" : "text-2xl")}>{displayValue}</p>
      <p
        className={cn(
          "text-[11px] leading-snug text-slate-600",
          compact ? "mt-0.5 line-clamp-1" : "mt-1 line-clamp-2",
        )}
      >
        {context}
      </p>

      {trend && (
        <span
          className={cn(
            "mt-1.5 inline-flex w-fit rounded-md px-1.5 py-0.5 text-[10px] font-semibold",
            trendToneClass[trend.tone ?? "neutral"],
          )}
        >
          {trend.label}
        </span>
      )}
    </>
  );

  if (isStatic) return <div className={cardClass}>{inner}</div>;
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cardClass}>
        {inner}
      </button>
    );
  }
  return (
    <Link to={to ?? "/app/agenda"} className={cn(cardClass, "no-underline")}>
      {inner}
    </Link>
  );
}

type OperationalCardsGridProps = {
  children: ReactNode;
  className?: string;
};

export function OperationalCardsGrid({ children, className }: OperationalCardsGridProps) {
  return (
    <section
      aria-label="Indicadores operacionais"
      className={cn(
        "grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-3 xl:grid-cols-6",
        className,
      )}
    >
      {children}
    </section>
  );
}

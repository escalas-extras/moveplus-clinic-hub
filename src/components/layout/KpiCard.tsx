import { memo } from "react";
import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusBadge } from "./StatusBadge";
import { clinical } from "./clinical-classes";
import { Sparkline } from "@/components/dashboard/Sparkline";

export type KpiCardProps = {
  icon: LucideIcon;
  label: string;
  value: number | string;
  accent?: string;
  to?: string;
  previous?: number;
  period?: string;
  subtitle?: string;
  hideDelta?: boolean;
  tone?: "default" | "warning";
  isPlaceholder?: boolean;
  className?: string;
  sparkline?: number[];
  variant?: "default" | "premium";
};

function KpiCardInner({
  icon: Icon,
  label,
  value,
  accent = "var(--primary)",
  to,
  previous,
  period,
  subtitle,
  hideDelta,
  tone = "default",
  isPlaceholder,
  className,
  sparkline,
  variant = "default",
}: KpiCardProps) {
  const isPremium = variant === "premium";
  const numValue = typeof value === "number" ? value : 0;
  const hasPrev = typeof previous === "number" && previous > 0;
  const delta = hasPrev ? ((numValue - previous!) / previous!) * 100 : numValue > 0 ? 100 : 0;
  const up = delta > 0;
  const down = delta < 0;
  const DeltaIcon = up ? ArrowUpRight : down ? ArrowDownRight : Minus;
  const deltaCls = up
    ? "text-emerald-800 bg-emerald-50 ring-emerald-200/90"
    : down
      ? "text-rose-800 bg-rose-50 ring-rose-200/90"
      : "text-slate-600 bg-slate-100 ring-slate-200/90";

  const meta = subtitle ?? (hasPrev ? `${previous} ${period ?? ""}`.trim() : period ?? "");

  const inner = (
    <div
      className={cn(
        clinical.kpiCard,
        clinical.cardHover,
        "relative flex h-full flex-col overflow-hidden",
        isPremium ? "min-h-[156px] p-5 sm:p-6" : "p-4 sm:p-5",
        to && "cursor-pointer",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-1 rounded-t-2xl opacity-95"
        style={{ background: `linear-gradient(90deg, ${accent}, color-mix(in oklab, ${accent} 55%, #2bb673))` }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-14 -top-14 h-32 w-32 rounded-full opacity-[0.11] blur-2xl"
        style={{ background: accent }}
      />

      <div className="relative flex items-start justify-between gap-3">
        <div
          className={cn(
            "flex shrink-0 items-center justify-center rounded-xl ring-1 ring-black/[0.05] shadow-[0_1px_2px_rgba(15,76,92,0.06)]",
            isPremium ? "h-12 w-12" : "h-10 w-10",
          )}
          style={{ background: `${accent}18`, color: accent }}
          aria-hidden
        >
          <Icon className={cn(isPremium ? "h-5 w-5" : "h-4 w-4")} strokeWidth={2.25} />
        </div>
        {!hideDelta && !isPlaceholder && previous !== undefined && (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1",
              deltaCls,
            )}
          >
            <DeltaIcon className="h-3.5 w-3.5" aria-hidden />
            {hasPrev ? `${Math.abs(delta).toFixed(0)}%` : numValue > 0 ? "Novo" : "0%"}
          </span>
        )}
        {hideDelta && tone === "warning" && numValue > 0 && (
          <StatusBadge variant="warning">Atenção</StatusBadge>
        )}
      </div>

      <div className="relative mt-4 flex flex-1 flex-col">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">{label}</p>
        <div
          className={cn(
            "mt-1 font-bold tabular-nums tracking-tight text-slate-950 kpi-value",
            isPremium ? "text-[2rem] leading-none sm:text-[2.35rem]" : "text-2xl sm:text-[1.85rem]",
            tone === "warning" && numValue > 0 && "text-amber-700",
            isPlaceholder && "text-slate-400",
          )}
          aria-label={`${label}: ${value}`}
        >
          {value}
        </div>
        {meta && <p className="mt-2 text-xs leading-relaxed text-slate-500">{meta}</p>}
      </div>

      {sparkline && sparkline.length >= 2 && (
        <div className="fos-kpi-card__sparkline relative mt-4 border-t border-[rgba(15,76,92,0.08)] pt-3">
          <Sparkline data={sparkline} color={accent} height={32} className="w-full max-w-none opacity-90" integrated />
        </div>
      )}
    </div>
  );

  if (!to) return inner;
  return (
    <Link to={to} className={cn("block h-full", clinical.focusRing, "rounded-2xl")}>
      {inner}
    </Link>
  );
}

export const KpiCard = memo(KpiCardInner);

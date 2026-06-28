import { memo } from "react";
import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusBadge } from "./StatusBadge";
import { clinical } from "./clinical-classes";

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
}: KpiCardProps) {
  const numValue = typeof value === "number" ? value : 0;
  const hasPrev = typeof previous === "number" && previous > 0;
  const delta = hasPrev ? ((numValue - previous!) / previous!) * 100 : numValue > 0 ? 100 : 0;
  const up = delta > 0;
  const down = delta < 0;
  const DeltaIcon = up ? ArrowUpRight : down ? ArrowDownRight : Minus;
  const deltaCls = up
    ? "text-emerald-700 bg-emerald-50 ring-emerald-200"
    : down
      ? "text-rose-700 bg-rose-50 ring-rose-200"
      : "text-muted-foreground bg-muted ring-border";

  const inner = (
    <div
      className={cn(
        clinical.card,
        "relative h-full overflow-hidden p-4 sm:p-5",
        to && clinical.cardHover,
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-12 -top-12 h-24 w-24 rounded-full opacity-[0.07] blur-2xl"
        style={{ background: accent }}
      />
      <div className="relative flex items-start justify-between gap-2">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
          style={{ background: `${accent}18`, color: accent }}
          aria-hidden
        >
          <Icon className="h-4 w-4" strokeWidth={2} />
        </div>
        {!hideDelta && !isPlaceholder && previous !== undefined && (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1",
              deltaCls,
            )}
          >
            <DeltaIcon className="h-3 w-3" aria-hidden />
            {hasPrev ? `${Math.abs(delta).toFixed(0)}%` : numValue > 0 ? "Novo" : "0%"}
          </span>
        )}
        {hideDelta && tone === "warning" && numValue > 0 && (
          <StatusBadge variant="warning">Atenção</StatusBadge>
        )}
      </div>
      <div
        className={cn(
          "mt-3 text-2xl font-bold tabular-nums tracking-tight sm:text-[1.75rem]",
          tone === "warning" && numValue > 0 && "text-amber-700",
          isPlaceholder && "text-muted-foreground",
        )}
        aria-label={`${label}: ${value}`}
      >
        {value}
      </div>
      <div className="mt-1 truncate text-xs font-semibold text-foreground sm:text-[13px]">{label}</div>
      {(subtitle || period || previous !== undefined) && (
        <div className="mt-0.5 text-[11px] text-muted-foreground sm:text-xs">
          {subtitle ?? (hasPrev ? `${previous} ${period ?? ""}`.trim() : period ?? "")}
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

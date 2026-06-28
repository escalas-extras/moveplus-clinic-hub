import { memo, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type StatusBadgeVariant = "status" | "success" | "neutral" | "warning" | "danger" | "info";

const variantClasses: Record<StatusBadgeVariant, { wrap: string; dot: string }> = {
  status: {
    wrap: "bg-primary/10 text-primary ring-primary/25",
    dot: "bg-primary",
  },
  success: {
    wrap: "bg-emerald-50/95 text-emerald-800 ring-emerald-200/90",
    dot: "bg-emerald-500",
  },
  neutral: {
    wrap: "bg-slate-100/95 text-slate-700 ring-slate-200/90",
    dot: "bg-slate-400",
  },
  warning: {
    wrap: "bg-amber-50/95 text-amber-800 ring-amber-200/90",
    dot: "bg-amber-500",
  },
  danger: {
    wrap: "bg-rose-50/95 text-rose-800 ring-rose-200/90",
    dot: "bg-rose-500",
  },
  info: {
    wrap: "bg-sky-50/95 text-sky-800 ring-sky-200/90",
    dot: "bg-sky-500",
  },
};

type StatusBadgeProps = {
  children: ReactNode;
  variant?: StatusBadgeVariant;
  className?: string;
  dot?: boolean;
};

function StatusBadgeInner({ children, variant = "neutral", className, dot = true }: StatusBadgeProps) {
  const v = variantClasses[variant];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold leading-none ring-1 shadow-[0_1px_0_rgba(255,255,255,0.6)_inset]",
        v.wrap,
        className,
      )}
    >
      {dot && <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", v.dot)} aria-hidden />}
      {children}
    </span>
  );
}

export const StatusBadge = memo(StatusBadgeInner);

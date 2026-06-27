import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type StatusBadgeVariant = "success" | "neutral" | "warning" | "danger" | "info";

const variantClasses: Record<StatusBadgeVariant, string> = {
  success: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  neutral: "bg-slate-100 text-slate-600 ring-slate-200",
  warning: "bg-amber-50 text-amber-700 ring-amber-200",
  danger: "bg-rose-50 text-rose-700 ring-rose-200",
  info: "bg-sky-50 text-sky-700 ring-sky-200",
};

type StatusBadgeProps = {
  children: ReactNode;
  variant?: StatusBadgeVariant;
  className?: string;
};

export function StatusBadge({
  children,
  variant = "neutral",
  className,
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold leading-none ring-1",
        variantClasses[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}

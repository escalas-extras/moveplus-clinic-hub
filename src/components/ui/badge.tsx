import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { clinical } from "@/components/layout/clinical-classes";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold leading-none ring-1 shadow-[0_1px_0_rgba(255,255,255,0.6)_inset] transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary/10 text-primary ring-primary/20",
        secondary: "bg-slate-100/95 text-slate-700 ring-slate-200/90",
        destructive: "bg-rose-50/95 text-rose-800 ring-rose-200/90",
        outline: "border-transparent bg-transparent text-foreground ring-slate-200/90",
        success: "bg-emerald-50/95 text-emerald-800 ring-emerald-200/90",
        warning: "bg-amber-50/95 text-amber-800 ring-amber-200/90",
        info: "bg-sky-50/95 text-sky-800 ring-sky-200/90",
        neutral: "bg-slate-100/95 text-slate-700 ring-slate-200/90",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

function Badge({ className, variant, dot = false, children, ...props }: BadgeProps) {
  const dotColor =
    variant === "success"
      ? "bg-emerald-500"
      : variant === "warning"
        ? "bg-amber-500"
        : variant === "destructive"
          ? "bg-rose-500"
          : variant === "info"
            ? "bg-sky-500"
            : variant === "secondary" || variant === "neutral"
              ? "bg-slate-400"
              : "bg-primary";

  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", dotColor)} aria-hidden />}
      {children}
    </div>
  );
}


export { Badge, badgeVariants };

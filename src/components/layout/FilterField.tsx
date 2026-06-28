import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type FilterFieldProps = {
  label: string;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
  hint?: string;
  error?: string;
  success?: string;
};

export function FilterField({ label, htmlFor, children, className, hint, error, success }: FilterFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label
        htmlFor={htmlFor}
        className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500"
      >
        {label}
      </Label>
      {children}
      {error && <p className="text-xs font-medium text-destructive">{error}</p>}
      {!error && success && <p className="text-xs font-medium text-emerald-700">{success}</p>}
      {!error && !success && hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

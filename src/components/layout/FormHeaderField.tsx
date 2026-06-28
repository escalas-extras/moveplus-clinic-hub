import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type FormHeaderFieldProps = {
  label: string;
  value: ReactNode;
  className?: string;
};

/** Campo somente leitura no cabeçalho de formulários clínicos. */
export function FormHeaderField({ label, value, className }: FormHeaderFieldProps) {
  return (
    <div className={cn("min-w-0", className)}>
      <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">{label}</div>
      <div className="mt-1 truncate text-sm font-semibold text-slate-950">{value}</div>
    </div>
  );
}

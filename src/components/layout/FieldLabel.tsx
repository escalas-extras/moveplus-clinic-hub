import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type FieldLabelProps = {
  children: ReactNode;
  htmlFor?: string;
  /** Campo obrigatório — exibe asterisco e destaque se não preenchido. */
  required?: boolean;
  /** Campo opcional — exibe marcador discreto. */
  optional?: boolean;
  /** Indica preenchimento para feedback visual de obrigatório. */
  filled?: boolean;
  className?: string;
};

export function FieldLabel({
  children,
  htmlFor,
  required,
  optional,
  filled,
  className,
}: FieldLabelProps) {
  return (
    <Label
      htmlFor={htmlFor}
      className={cn(
        "fos-field-label text-[11px] font-bold uppercase tracking-[0.12em]",
        required && !filled ? "text-destructive" : "text-slate-600",
        className,
      )}
    >
      {children}
      {required && (
        <span className="ml-0.5 text-destructive" aria-hidden>
          *
        </span>
      )}
      {optional && !required && (
        <span className="ml-1.5 text-[10px] font-medium normal-case tracking-normal text-slate-400">
          (opcional)
        </span>
      )}
    </Label>
  );
}

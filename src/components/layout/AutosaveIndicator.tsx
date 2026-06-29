import { memo } from "react";
import { Cloud, CloudOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type AutosaveIndicatorProps = {
  saving: boolean;
  lastSavedAt: Date | null;
  className?: string;
};

function AutosaveIndicatorInner({ saving, lastSavedAt, className }: AutosaveIndicatorProps) {
  if (saving) {
    return (
      <span
        role="status"
        aria-live="polite"
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700 ring-1 ring-sky-200",
          className,
        )}
      >
        <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
        Salvando alterações…
      </span>
    );
  }
  if (lastSavedAt) {
    return (
      <span
        role="status"
        aria-live="polite"
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200",
          className,
        )}
      >
        <Cloud className="h-3 w-3" aria-hidden />
        Tudo salvo · {lastSavedAt.toLocaleTimeString().slice(0, 5)}
      </span>
    );
  }
  return (
    <span
      role="status"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-muted-foreground ring-1 ring-slate-200",
        className,
      )}
    >
      <CloudOff className="h-3 w-3" aria-hidden />
      Pronto para editar
    </span>
  );
}

export const AutosaveIndicator = memo(AutosaveIndicatorInner);

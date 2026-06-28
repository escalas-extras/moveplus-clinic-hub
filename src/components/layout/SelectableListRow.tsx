import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { StatusBadge } from "./StatusBadge";
import { clinical } from "./AppShell";
import { cn } from "@/lib/utils";

type SelectableListRowProps = {
  title: string;
  subtitle: string;
  badge?: { label: string; variant: "success" | "warning" | "danger" | "info" | "neutral" };
  selected?: boolean;
  onSelect: () => void;
  trailing?: ReactNode;
};

/** Linha selecionável padronizada — reavaliações, altas e listas split. */
export function SelectableListRow({
  title,
  subtitle,
  badge,
  selected,
  onSelect,
  trailing,
}: SelectableListRowProps) {
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          "flex min-h-[52px] w-full flex-wrap items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors hover:bg-slate-50",
          selected && "bg-primary/5 ring-1 ring-inset ring-primary/20",
          clinical.focusRing,
        )}
      >
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{title}</p>
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {badge && <StatusBadge variant={badge.variant}>{badge.label}</StatusBadge>}
          {trailing}
          <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden />
        </div>
      </button>
    </li>
  );
}

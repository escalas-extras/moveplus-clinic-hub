import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/layout/EmptyState";
import { clinical } from "@/components/layout/clinical-classes";
import { Inbox } from "lucide-react";

export type OpsDataListItem = {
  id: string;
  primary: string;
  secondary?: string;
  value: ReactNode;
  badge?: ReactNode;
  rank?: number;
};

type OpsDataListPanelProps = {
  title: string;
  items: OpsDataListItem[];
  emptyLabel?: string;
  valueTone?: "income" | "expense" | "neutral" | "default";
  className?: string;
};

const valueToneClass: Record<NonNullable<OpsDataListPanelProps["valueTone"]>, string> = {
  income: "text-emerald-700",
  expense: "text-rose-700",
  neutral: "text-slate-900",
  default: "text-foreground",
};

/** Painel de lista/tabulação leve — rankings, vencimentos e resumos tabulares. */
export function OpsDataListPanel({
  title,
  items,
  emptyLabel = "Sem dados no período.",
  valueTone = "default",
  className,
}: OpsDataListPanelProps) {
  const valueCls = valueToneClass[valueTone];

  return (
    <section className={cn(clinical.pageSection, "ops-data-list-panel min-w-0", className)}>
      <header className={clinical.pageSectionHeader}>
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      </header>

      {items.length === 0 ? (
        <div className={clinical.pageSectionBody}>
          <EmptyState
            icon={Inbox}
            title={emptyLabel}
            className="py-8"
          />
        </div>
      ) : (
        <ul className="divide-y divide-[rgba(15,76,92,0.08)]">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5"
            >
              <div className="flex min-w-0 items-center gap-2">
                {item.rank != null && (
                  <span className="w-5 shrink-0 text-xs font-bold text-muted-foreground">{item.rank}.</span>
                )}
                <div className="min-w-0">
                  <p className="truncate font-medium text-sm">{item.primary}</p>
                  {item.secondary && (
                    <p className="text-xs text-muted-foreground tabular-nums">{item.secondary}</p>
                  )}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className={cn("text-sm font-semibold tabular-nums", valueCls)}>{item.value}</div>
                {item.badge}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

import type { LucideIcon } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { ChevronRight, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/layout/EmptyState";
import { PageSection } from "@/components/layout/PageSection";
import { StatusBadge, type StatusBadgeVariant } from "@/components/layout/StatusBadge";

export type AttentionItem = {
  id: string;
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  meta?: string;
  to: string;
  tone?: "default" | "warning" | "danger";
};

type AttentionListProps = {
  items?: AttentionItem[];
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
};

const toneBadge: Record<NonNullable<AttentionItem["tone"]>, StatusBadgeVariant> = {
  default: "neutral",
  warning: "warning",
  danger: "danger",
};

/** Lista curta de prioridades — seção “Atenção agora”. */
export function AttentionList({
  items = [],
  emptyTitle = "Tudo em dia",
  emptyDescription = "Nenhuma pendência urgente no momento. Aproveite para avançar na rotina.",
  className,
}: AttentionListProps) {
  return (
    <PageSection
      icon={Inbox}
      title="Atenção agora"
      description="Prioridades que pedem ação imediata."
      className={className}
      contentClassName="p-0 sm:p-0"
    >
      {items.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={emptyTitle}
          description={emptyDescription}
          className="py-8"
        />
      ) : (
        <ul className="divide-y divide-[rgba(15,76,92,0.08)]">
          {items.map((item) => {
            const Icon = item.icon ?? Inbox;
            const tone = item.tone ?? "default";
            return (
              <li key={item.id}>
                <Link
                  to={item.to ?? "/app"}
                  className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[rgba(15,76,92,0.03)] sm:px-5"
                >
                  <div
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                      item.tone === "danger"
                        ? "bg-rose-50 text-rose-700"
                        : item.tone === "warning"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-[rgba(15,76,92,0.06)] text-[var(--fos-primary)]",
                    )}
                  >
                    <Icon className="h-4 w-4" strokeWidth={2} aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900 group-hover:text-[var(--fos-primary)]">
                      {item.title}
                    </p>
                    {item.subtitle && (
                      <p className="truncate text-xs text-slate-500">{item.subtitle}</p>
                    )}
                  </div>
                  {item.meta && (
                    <StatusBadge variant={toneBadge[tone] ?? "neutral"} className="shrink-0">
                      {item.meta}
                    </StatusBadge>
                  )}
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 group-hover:text-[var(--fos-primary)]" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </PageSection>
  );
}

import type { LucideIcon } from "lucide-react";
import { AlertTriangle, Clock, Users } from "lucide-react";
import { SectionHeader, StatusBadge, EmptyState } from "@/components/layout";
import { cn } from "@/lib/utils";

export type AgendaSideItem = {
  id: string;
  horario: string;
  patientName: string;
  professionalName?: string;
  statusLabel: string;
  statusVariant: "success" | "warning" | "danger" | "info" | "neutral";
  onSelect?: () => void;
};

export type AgendaAlert = {
  id: string;
  message: string;
  tone: "warning" | "danger" | "neutral";
};

type AgendaSidePanelProps = {
  upcoming: AgendaSideItem[];
  waiting: AgendaSideItem[];
  alerts: AgendaAlert[];
  onSelectItem?: (id: string) => void;
  className?: string;
};

function SideList({
  title,
  icon,
  items,
  emptyTitle,
  onSelectItem,
}: {
  title: string;
  icon: LucideIcon;
  items: AgendaSideItem[];
  emptyTitle: string;
  onSelectItem?: (id: string) => void;
}) {
  return (
    <section className="rounded-xl border border-[rgba(15,76,92,0.08)] bg-white/80 p-3 shadow-[0_1px_3px_rgba(15,76,92,0.04)]">
      <SectionHeader title={title} icon={icon} className="mb-2" />
      {items.length === 0 ? (
        <p className="py-3 text-center text-xs text-slate-500">{emptyTitle}</p>
      ) : (
        <ul className="space-y-1">
          {items.slice(0, 5).map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => {
                  item.onSelect?.();
                  onSelectItem?.(item.id);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-[rgba(15,76,92,0.04)]"
              >
                <span className="w-10 shrink-0 text-[11px] font-bold tabular-nums text-[var(--fos-primary)]">
                  {item.horario.slice(0, 5)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-slate-900">{item.patientName}</p>
                  {item.professionalName && (
                    <p className="truncate text-[10px] text-slate-500">{item.professionalName}</p>
                  )}
                </div>
                <StatusBadge variant={item.statusVariant} className="shrink-0 text-[10px]">
                  {item.statusLabel}
                </StatusBadge>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Painel lateral discreto da Agenda — próximos, aguardando e alertas. */
export function AgendaSidePanel({
  upcoming,
  waiting,
  alerts,
  onSelectItem,
  className,
}: AgendaSidePanelProps) {
  return (
    <aside className={cn("agenda-side-panel space-y-2.5", className)}>
      <SideList
        title="Próximos atendimentos"
        icon={Clock}
        items={upcoming}
        emptyTitle="Sem atendimentos próximos hoje"
        onSelectItem={onSelectItem}
      />
      <SideList
        title="Pacientes aguardando"
        icon={Users}
        items={waiting}
        emptyTitle="Ninguém aguardando no momento"
        onSelectItem={onSelectItem}
      />
      <section className="rounded-xl border border-[rgba(15,76,92,0.08)] bg-white/80 p-3 shadow-[0_1px_3px_rgba(15,76,92,0.04)]">
        <SectionHeader title="Alertas" icon={AlertTriangle} className="mb-2" />
        {alerts.length === 0 ? (
          <EmptyState
            icon={AlertTriangle}
            title="Sem alertas"
            description="Nenhuma pendência crítica na agenda de hoje."
            className="py-4"
          />
        ) : (
          <ul className="space-y-1.5">
            {alerts.map((a) => (
              <li
                key={a.id}
                className={cn(
                  "rounded-lg px-2.5 py-2 text-xs leading-snug",
                  a.tone === "danger"
                    ? "bg-rose-50 text-rose-800"
                    : a.tone === "warning"
                      ? "bg-amber-50 text-amber-800"
                      : "bg-slate-50 text-slate-700",
                )}
              >
                {a.message}
              </li>
            ))}
          </ul>
        )}
      </section>
    </aside>
  );
}

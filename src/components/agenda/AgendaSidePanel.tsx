import type { LucideIcon } from "lucide-react";
import { AlertTriangle, CalendarDays, Clock, Users } from "lucide-react";
import { SectionHeader, StatusBadge, EmptyState } from "@/components/layout";
import { cn } from "@/lib/utils";

function formatHorario(horario: string | null | undefined) {
  return String(horario ?? "—").slice(0, 5);
}

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
  nextAppointment?: AgendaSideItem | null;
  upcoming?: AgendaSideItem[];
  waiting?: AgendaSideItem[];
  alerts?: AgendaAlert[];
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
                  {formatHorario(item.horario)}
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

function NextAppointmentCard({
  item,
  onSelectItem,
}: {
  item: AgendaSideItem;
  onSelectItem?: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        item.onSelect?.();
        onSelectItem?.(item.id);
      }}
      className="w-full rounded-xl border border-[rgba(15,76,92,0.12)] bg-gradient-to-br from-[rgba(15,76,92,0.04)] to-white p-3 text-left shadow-[0_1px_3px_rgba(15,76,92,0.06)] transition hover:border-[var(--fos-primary)]/25 hover:shadow-[0_4px_14px_-8px_rgba(15,76,92,0.2)]"
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Próximo atendimento</p>
      <p className="mt-1 text-xl font-bold tabular-nums text-[var(--fos-primary)]">{formatHorario(item.horario)}</p>
      <p className="mt-0.5 truncate text-sm font-semibold text-slate-900">{item.patientName ?? "—"}</p>
      {item.professionalName && (
        <p className="truncate text-xs text-slate-500">{item.professionalName}</p>
      )}
      <StatusBadge variant={item.statusVariant} className="mt-2 text-[10px]">
        {item.statusLabel}
      </StatusBadge>
    </button>
  );
}

/** Painel lateral discreto da Agenda — hoje, próximo, aguardando e alertas. */
export function AgendaSidePanel({
  nextAppointment,
  upcoming = [],
  waiting = [],
  alerts = [],
  onSelectItem,
  className,
}: AgendaSidePanelProps) {
  const hasAnyData = !!nextAppointment || upcoming.length > 0 || waiting.length > 0 || alerts.length > 0;

  return (
    <aside className={cn("agenda-side-panel space-y-2.5", className)}>
      <div className="rounded-xl border border-[rgba(15,76,92,0.08)] bg-white/80 p-3 shadow-[0_1px_3px_rgba(15,76,92,0.04)]">
        <SectionHeader title="Hoje" icon={CalendarDays} className="mb-2.5" />

        {!hasAnyData ? (
          <EmptyState
            icon={CalendarDays}
            title="Agenda livre hoje"
            description="Nenhum atendimento agendado para hoje."
            className="py-5"
          />
        ) : nextAppointment ? (
          <NextAppointmentCard item={nextAppointment} onSelectItem={onSelectItem} />
        ) : (
          <p className="rounded-lg bg-slate-50 px-3 py-2.5 text-xs text-slate-600">
            Nenhum atendimento futuro restante hoje.
          </p>
        )}
      </div>

      <SideList
        title="Próximos horários"
        icon={Clock}
        items={upcoming.slice(nextAppointment ? 1 : 0)}
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

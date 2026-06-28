import { Link } from "@tanstack/react-router";
import { StatusBadge } from "@/components/layout/StatusBadge";
import { appointmentStatusLabel, appointmentStatusVariant } from "@/lib/appointment-status";
import { cn } from "@/lib/utils";

export type AgendaTimelineItem = {
  id: string;
  horario: string;
  status: string | null;
  observacao: string | null;
  patients: { nome_completo: string } | null;
  professionals: { nome: string } | null;
};

type AgendaTimelineProps = {
  items: AgendaTimelineItem[];
  accent: string;
  className?: string;
};

const STATUS_VARIANT = appointmentStatusVariant;
const STATUS_LABEL = appointmentStatusLabel;

export function AgendaTimeline({ items, accent, className }: AgendaTimelineProps) {
  return (
    <ul className={cn("dashboard-agenda-timeline", className)}>
      {items.map((appt, index) => {
        const time = String(appt.horario).slice(0, 5);
        const isLast = index === items.length - 1;
        return (
          <li key={appt.id} className="dashboard-agenda-timeline-item relative flex gap-4 sm:gap-5">
            <div className="flex w-14 shrink-0 flex-col items-center sm:w-16">
              <div
                className="flex h-12 w-full flex-col items-center justify-center rounded-xl text-center shadow-sm ring-1 ring-black/[0.04]"
                style={{ background: `${accent}12`, color: accent }}
              >
                <span className="text-[10px] font-bold uppercase tracking-wide opacity-70">Hora</span>
                <span className="text-sm font-bold tabular-nums leading-none">{time}</span>
              </div>
              {!isLast && <div className="dashboard-agenda-timeline-rail mt-2 w-0.5 flex-1 min-h-[1.5rem]" aria-hidden />}
            </div>

            <div className="min-w-0 flex-1 pb-6">
              <Link
                to="/app/agenda"
                className={cn(
                  "group block rounded-2xl border border-[rgba(15,76,92,0.10)] bg-white/90 p-4 shadow-[var(--fos-card-shadow)]",
                  "transition-all duration-200 hover:-translate-y-0.5 hover:border-[rgba(15,76,92,0.18)] hover:shadow-[var(--shadow-lift)]",
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-base font-semibold text-slate-900 group-hover:text-[var(--fos-primary)]">
                      {appt.patients?.nome_completo ?? "—"}
                    </div>
                    <div className="mt-1 truncate text-sm text-slate-600">
                      {appt.observacao || appt.professionals?.nome || "Consulta"}
                    </div>
                  </div>
                  <StatusBadge
                    variant={STATUS_VARIANT(appt.status ?? "")}
                    className="shrink-0 shadow-sm"
                  >
                    {STATUS_LABEL(appt.status ?? "")}
                  </StatusBadge>
                </div>
              </Link>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

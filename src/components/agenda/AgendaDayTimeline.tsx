import { Link } from "@tanstack/react-router";
import {
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  PlayCircle,
  Receipt,
} from "lucide-react";
import { StatusBadge, EmptyState, PageSection } from "@/components/layout";
import { cn } from "@/lib/utils";
import {
  AGENDA_VISUAL_META,
  AgendaStatusLegend,
  getAgendaVisualStatus,
  type ApptLike,
} from "@/components/agenda/agenda-visual-status";
import { SupportGuardClickable } from "@/components/support-guard";

export type TimelineAppt = ApptLike & {
  patient_id: string;
  patients: { nome_completo: string } | null;
  professionals: { nome: string } | null;
  observacao: string | null;
};

type Props = {
  items: TimelineAppt[];
  dayIso: string;
  isToday: boolean;
  selectedId?: string;
  disabled?: boolean;
  onSelect: (appt: TimelineAppt) => void;
  onConfirm: (id: string) => void;
  onReschedule: (appt: TimelineAppt) => void;
  onNew: () => void;
};

export function AgendaDayTimeline({
  items,
  dayIso,
  isToday,
  selectedId,
  disabled,
  onSelect,
  onConfirm,
  onReschedule,
  onNew,
}: Props) {
  const sorted = [...items].sort((a, b) => String(a.horario).localeCompare(String(b.horario)));
  const now = new Date();

  return (
    <PageSection
      icon={CalendarClock}
      title="Timeline do dia"
      description={isToday ? "Sequência operacional de hoje — do mais cedo ao mais tarde." : `Atendimentos em ${dayIso}`}
      contentClassName="space-y-4"
      className="fos-animate-in"
    >
      <AgendaStatusLegend />

      {sorted.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title={isToday ? "Nenhum atendimento agendado para hoje" : "Agenda livre neste dia"}
          description="Crie um novo atendimento ou escolha outro período."
          action={{ label: "Agendar atendimento", onClick: onNew }}
          className="py-10"
        />
      ) : (
        <ol className="relative space-y-0 pl-1 before:absolute before:bottom-4 before:left-[27px] before:top-2 before:w-0.5 before:bg-gradient-to-b before:from-primary/30 before:via-slate-200 before:to-transparent">
          {sorted.map((appt, index) => {
            const visual = getAgendaVisualStatus(appt, now, dayIso);
            const meta = AGENDA_VISUAL_META[visual];
            const time = String(appt.horario).slice(0, 5);
            const isLast = index === sorted.length - 1;

            return (
              <li key={appt.id} className={cn("relative flex gap-4 pb-5", isLast && "pb-0")}>
                <div className="relative z-10 flex w-14 shrink-0 flex-col items-center pt-1">
                  <span
                    className={cn(
                      "flex h-11 w-full flex-col items-center justify-center rounded-xl text-center shadow-sm ring-1 ring-black/[0.04]",
                      visual === "em_atendimento" ? "bg-sky-50 text-sky-700 ring-sky-200" : "bg-white text-slate-800",
                    )}
                  >
                    <span className="text-sm font-bold tabular-nums leading-none">{time}</span>
                  </span>
                  {!isLast && <div className="mt-2 w-0.5 flex-1 min-h-[1rem] bg-transparent" aria-hidden />}
                </div>

                <article
                  className={cn(
                    "min-w-0 flex-1 rounded-2xl border-l-4 bg-white p-4 shadow-[var(--fos-card-shadow)] transition-all duration-200 hover:-translate-y-px hover:shadow-[var(--shadow-lift)]",
                    meta.border,
                    selectedId === appt.id && "ring-2 ring-primary ring-offset-1",
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge variant={meta.badge}>{meta.label}</StatusBadge>
                        <span className="text-xs text-slate-500">{appt.professionals?.nome ?? "Profissional"}</span>
                      </div>
                      <h3 className="mt-1.5 text-base font-bold text-slate-950 sm:text-lg">
                        {appt.patients?.nome_completo ?? "Paciente"}
                      </h3>
                      {appt.observacao && (
                        <p className="mt-1 line-clamp-2 text-sm text-slate-600">{appt.observacao}</p>
                      )}
                    </div>
                  </div>

                  <AgendaQuickActions
                    appt={appt}
                    disabled={disabled}
                    onSelect={() => onSelect(appt)}
                    onConfirm={() => onConfirm(appt.id)}
                    onReschedule={() => onReschedule(appt)}
                  />
                </article>
              </li>
            );
          })}
        </ol>
      )}
    </PageSection>
  );
}

function AgendaQuickActions({
  appt,
  disabled,
  onSelect,
  onConfirm,
  onReschedule,
}: {
  appt: TimelineAppt;
  disabled?: boolean;
  onSelect: () => void;
  onConfirm: () => void;
  onReschedule: () => void;
}) {
  return (
    <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
      <ActionChip icon={PlayCircle} label="Abrir atendimento" onClick={onSelect} primary />
      <SupportGuardClickable supportMode={!!disabled} onClick={onReschedule} tooltip="Bloqueado no Modo Suporte">
        <ActionChip icon={CalendarClock} label="Reagendar" onClick={onReschedule} disabled={disabled} />
      </SupportGuardClickable>
      <SupportGuardClickable supportMode={!!disabled} onClick={onConfirm} tooltip="Bloqueado no Modo Suporte">
        <ActionChip icon={CheckCircle2} label="Confirmar presença" onClick={onConfirm} disabled={disabled} />
      </SupportGuardClickable>
      {appt.patient_id && (
        <ActionChip
          icon={Receipt}
          label="Emitir recibo"
          to="/app/financeiro/recibos"
        />
      )}
      {appt.patient_id && (
        <ActionChip
          icon={ClipboardList}
          label="Registrar evolução"
          to="/app/pacientes/$id"
          params={{ id: appt.patient_id }}
          hash="evolucoes"
        />
      )}
    </div>
  );
}

function ActionChip({
  icon: Icon,
  label,
  onClick,
  to,
  params,
  hash,
  disabled,
  primary,
}: {
  icon: typeof PlayCircle;
  label: string;
  onClick?: () => void;
  to?: string;
  params?: Record<string, string>;
  hash?: string;
  disabled?: boolean;
  primary?: boolean;
}) {
  const className = cn(
    "inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-[11px] font-semibold transition sm:text-xs",
    primary
      ? "border-primary/20 bg-primary/5 text-primary hover:bg-primary hover:text-white"
      : "border-slate-200 bg-white text-slate-700 hover:border-primary/25 hover:text-primary",
    disabled && "pointer-events-none opacity-50",
  );

  if (to) {
    return (
      <Link to={to} params={params} hash={hash} className={className}>
        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
        {label}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} disabled={disabled} className={className}>
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {label}
    </button>
  );
}

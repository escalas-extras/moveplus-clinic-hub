import { Link } from "@tanstack/react-router";
import { CalendarDays, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, PageSection } from "@/components/layout";
import { AgendaTimeline, type AgendaTimelineItem } from "@/components/dashboard/AgendaTimeline";

type NextAppointmentsProps = {
  items: AgendaTimelineItem[];
  accent: string;
  loading?: boolean;
};

function firstName(full?: string | null) {
  if (!full) return "Paciente";
  return full.trim().split(/\s+/)[0];
}

export function NextAppointmentsSection({ items, accent, loading }: NextAppointmentsProps) {
  const next = items[0];

  return (
    <PageSection
      icon={CalendarDays}
      title="Próximos atendimentos"
      description="Sua timeline do dia — quem atender e em qual horário."
      contentClassName="space-y-4"
      className="fos-animate-in"
    >
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-muted/40" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="Nenhum atendimento agendado para hoje"
          description="Abra a agenda e programe as sessões da clínica."
          action={{ label: "Agendar atendimento", to: "/app/agenda" }}
          className="py-10"
        />
      ) : (
        <>
          <ul className="space-y-0" aria-label="Timeline de atendimentos">
            {items.slice(0, 6).map((appt, index) => {
              const time = String(appt.horario).slice(0, 5);
              const isLast = index === Math.min(items.length, 6) - 1;
              return (
                <li key={appt.id} className="relative flex gap-4 pb-4 sm:gap-5">
                  <div className="flex w-14 shrink-0 flex-col items-center sm:w-16">
                    <div
                      className="flex h-11 w-full flex-col items-center justify-center rounded-xl text-center shadow-sm ring-1 ring-black/[0.04] transition-transform duration-200 hover:scale-[1.02]"
                      style={{ background: `${accent}14`, color: accent }}
                    >
                      <span className="text-sm font-bold tabular-nums leading-none">{time}</span>
                    </div>
                    {!isLast && (
                      <div
                        className="mt-2 w-0.5 flex-1 min-h-[1.25rem] rounded-full bg-gradient-to-b from-[rgba(15,76,92,0.15)] to-transparent"
                        aria-hidden
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 pt-1">
                    <p className="text-base font-semibold text-slate-900 sm:text-lg">
                      {firstName(appt.patients?.nome_completo)}
                    </p>
                    <p className="text-sm text-slate-500">
                      {appt.professionals?.nome ?? "Consulta"}
                      {appt.observacao ? ` · ${appt.observacao}` : ""}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="flex flex-col gap-2 border-t border-[rgba(15,76,92,0.08)] pt-4 sm:flex-row sm:items-center sm:justify-between">
            {next && (
              <p className="text-sm text-slate-600">
                Próximo: <span className="font-semibold text-slate-900">{String(next.horario).slice(0, 5)}</span>
                {" · "}
                {firstName(next.patients?.nome_completo)}
              </p>
            )}
            <Button asChild className="rounded-xl sm:shrink-0">
              <Link to="/app/agenda">
                <Play className="mr-2 h-4 w-4" />
                Abrir atendimento
              </Link>
            </Button>
          </div>
        </>
      )}
    </PageSection>
  );
}

/** Versão compacta com cards — reutiliza AgendaTimeline completa quando necessário */
export { AgendaTimeline };

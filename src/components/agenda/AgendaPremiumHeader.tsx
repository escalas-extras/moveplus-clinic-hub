import {
  Activity,
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { OperationalCard, OperationalCardsGrid } from "@/components/dashboard/OperationalCard";
import { cn } from "@/lib/utils";

type Props = {
  totalToday: number;
  nextLabel: string;
  nextPatient?: string | null;
  completed: number;
  inProgress: number;
  overdue: number;
  primaryColor?: string;
  secondaryColor?: string;
  onFilterToday?: () => void;
  onSelectNext?: () => void;
  className?: string;
};

export function AgendaPremiumHeader({
  totalToday,
  nextLabel,
  nextPatient,
  completed,
  inProgress,
  overdue,
  primaryColor = "var(--fos-primary)",
  secondaryColor = "var(--fos-secondary)",
  onFilterToday,
  onSelectNext,
  className,
}: Props) {
  return (
    <section className={cn("agenda-premium-header space-y-3 fos-animate-in", className)}>
      <div className="rounded-3xl border border-[rgba(15,76,92,0.1)] bg-white/95 px-5 py-4 shadow-[var(--fos-card-shadow)] sm:px-6 sm:py-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">Central operacional</p>
        <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">Agenda de hoje</h2>
        <p className="mt-1 text-sm capitalize text-slate-600">
          {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </div>

      <OperationalCardsGrid className="grid-cols-2 lg:grid-cols-5 xl:grid-cols-5">
        <OperationalCard
          compact
          title="Hoje"
          icon={CalendarDays}
          value={totalToday}
          context="Atendimentos programados"
          accent={primaryColor}
          onClick={onFilterToday}
        />
        <OperationalCard
          compact
          title="Próximo atendimento"
          icon={Clock}
          value={nextLabel}
          context={nextPatient ?? "Nenhum restante hoje"}
          accent={secondaryColor}
          onClick={onSelectNext}
          static={!nextPatient}
          alert={!!nextPatient}
        />
        <OperationalCard
          compact
          title="Concluídos"
          icon={CheckCircle2}
          value={completed}
          context="Atendimentos finalizados hoje"
          accent="#64748b"
        />
        <OperationalCard
          compact
          title="Em andamento"
          icon={Activity}
          value={inProgress}
          context="Sessões em curso agora"
          accent="#0ea5e9"
          alert={inProgress > 0}
        />
        <OperationalCard
          compact
          title="Atrasados"
          icon={AlertTriangle}
          value={overdue}
          context="Aguardando início ou confirmação"
          accent="#e11d48"
          alert={overdue > 0}
        />
      </OperationalCardsGrid>
    </section>
  );
}

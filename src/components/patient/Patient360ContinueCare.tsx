import { Link } from "@tanstack/react-router";
import { ChevronRight, ClipboardList, History, Pencil } from "lucide-react";
import { PageSection, EmptyState } from "@/components/layout";
import { fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";

type AssessmentDraft = {
  id: string;
  data: string;
  status: string;
  tipo?: string;
};

type EvolutionRow = {
  id: string;
  data: string;
  hora: string;
  locked_at?: string | null;
};

type Props = {
  patientId: string;
  assessments: AssessmentDraft[];
  evolutions: EvolutionRow[];
  onNewEvolution: () => void;
  onEditAssessment: (id: string) => void;
  onGoToTab: (tab: string) => void;
};

export function Patient360ContinueCare({
  assessments,
  evolutions,
  onNewEvolution,
  onEditAssessment,
  onGoToTab,
}: Props) {
  const draftAssessment = assessments.find((a) => a.status !== "finalizada");
  const latestEvolution = evolutions[0];
  const unsignedLatest = latestEvolution && !latestEvolution.locked_at;

  const hasAction = draftAssessment || latestEvolution;

  return (
    <PageSection
      icon={History}
      title="Continue atendimento"
      description="Retome de onde parou sem perder contexto."
      contentClassName="space-y-2"
      className="fos-animate-in"
    >
      {!hasAction ? (
        <EmptyState
          icon={ClipboardList}
          title="Primeiro atendimento"
          description="Registre a avaliação inicial ou a primeira evolução para iniciar o histórico clínico."
          action={{ label: "Novo atendimento", onClick: onNewEvolution }}
          className="py-8"
        />
      ) : (
        <>
          {draftAssessment && (
            <ContinueRow
              title={`Avaliação em rascunho · ${fmtDate(draftAssessment.data)}`}
              subtitle="Finalize ou continue preenchendo a avaliação"
              onClick={() => onEditAssessment(draftAssessment.id)}
            />
          )}
          {unsignedLatest && (
            <ContinueRow
              title={`Evolução pendente · ${fmtDate(latestEvolution!.data)}`}
              subtitle="Assine ou complemente o registro da sessão"
              onClick={() => onGoToTab("evolucoes")}
            />
          )}
          {latestEvolution && (
            <ContinueRow
              title={`Última sessão · ${fmtDate(latestEvolution.data)} ${String(latestEvolution.hora).slice(0, 5)}`}
              subtitle="Registrar nova evolução a partir da última sessão"
              onClick={onNewEvolution}
            />
          )}
          <button
            type="button"
            onClick={() => onGoToTab("clinico")}
            className="w-full rounded-xl border border-dashed border-slate-200 py-2 text-xs font-medium text-slate-500 transition hover:border-primary/30 hover:text-primary"
          >
            Ver módulos clínicos completos
          </button>
        </>
      )}
    </PageSection>
  );
}

function ContinueRow({
  title,
  subtitle,
  onClick,
  to,
}: {
  title: string;
  subtitle: string;
  onClick?: () => void;
  to?: string;
}) {
  const className = cn(
    "group flex w-full items-center gap-3 rounded-2xl border border-[rgba(15,76,92,0.08)] bg-white px-4 py-3.5 text-left",
    "transition-all duration-200 hover:-translate-y-px hover:border-primary/20 hover:shadow-[var(--shadow-lift)]",
  );
  const inner = (
    <>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
        <Pencil className="h-5 w-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900">{title}</p>
        <p className="truncate text-xs text-slate-500">{subtitle}</p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-primary" aria-hidden />
    </>
  );

  if (to) {
    return (
      <Link to={to} className={className}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {inner}
    </button>
  );
}

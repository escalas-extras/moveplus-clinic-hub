import { CheckCircle2, AlertCircle, MinusCircle, Target, ListTodo } from "lucide-react";
import { InfoCard, PageSection } from "@/components/layout";
import type { EvolutionSummary } from "./compare-utils";

type ReassessmentSummaryProps = {
  summary: EvolutionSummary;
};

export function ReassessmentSummary({ summary }: ReassessmentSummaryProps) {
  return (
    <PageSection
      title="Resumo evolutivo"
      description="Síntese automática com base nos dados comparados."
      contentClassName="p-0"
    >
      <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3 sm:p-5">
        <SummaryBlock
          icon={CheckCircle2}
          title="Principais melhoras"
          items={summary.melhoras}
          empty="Nenhuma melhora detectada automaticamente."
          tone="success"
        />
        <SummaryBlock
          icon={MinusCircle}
          title="Pontos sem evolução"
          items={summary.semEvolucao}
          empty="Sem registros estáveis identificados."
          tone="neutral"
        />
        <SummaryBlock
          icon={AlertCircle}
          title="Novas limitações"
          items={summary.novasLimitacoes}
          empty="Nenhuma limitação nova sinalizada."
          tone="warning"
        />
        <SummaryBlock
          icon={Target}
          title="Objetivos alcançados"
          items={summary.objetivosAlcancados}
          empty="Objetivos alcançados serão listados conforme registro."
          tone="success"
        />
        <SummaryBlock
          icon={ListTodo}
          title="Objetivos pendentes"
          items={summary.objetivosPendentes}
          empty="Sem objetivos pendentes registrados."
          tone="info"
          className="sm:col-span-2 lg:col-span-2"
        />
      </div>
    </PageSection>
  );
}

function SummaryBlock({
  icon: Icon,
  title,
  items,
  empty,
  tone,
  className,
}: {
  icon: typeof CheckCircle2;
  title: string;
  items: string[];
  empty: string;
  tone: "success" | "warning" | "neutral" | "info";
  className?: string;
}) {
  const border =
    tone === "success"
      ? "border-emerald-200/80 bg-emerald-50/30"
      : tone === "warning"
        ? "border-amber-200/80 bg-amber-50/30"
        : tone === "info"
          ? "border-sky-200/80 bg-sky-50/30"
          : "border-slate-200/80 bg-slate-50/40";

  return (
    <InfoCard className={className} padded>
      <div className={`rounded-xl border p-3 ${border}`}>
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Icon className="h-4 w-4 shrink-0" aria-hidden />
          {title}
        </div>
        {items.length ? (
          <ul className="space-y-1.5 text-xs leading-relaxed text-slate-700 sm:text-sm">
            {items.map((item, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-muted-foreground">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground sm:text-sm">{empty}</p>
        )}
      </div>
    </InfoCard>
  );
}

import { TrendingDown, TrendingUp, Minus, HelpCircle } from "lucide-react";
import { InfoCard, StatusBadge, clinical } from "@/components/layout";
import { cn } from "@/lib/utils";
import {
  assessmentLabel,
  type ClinicalTrend,
  type MetricCompare,
} from "./compare-utils";

type ReassessmentComparatorPanelProps = {
  metrics: MetricCompare[];
  inicialLabel: string;
  ultimaLabel: string;
  atualLabel: string;
};

export function ReassessmentComparatorPanel({
  metrics,
  inicialLabel,
  ultimaLabel,
  atualLabel,
}: ReassessmentComparatorPanelProps) {
  return (
    <InfoCard
      title="Comparativo inteligente"
      description="Avaliação inicial, última reavaliação e registro atual lado a lado."
    >
      <div className="mb-4 grid gap-2 sm:grid-cols-3">
        <ColumnLabel title="Avaliação inicial" subtitle={inicialLabel} accent="var(--primary)" />
        <ColumnLabel title="Última reavaliação" subtitle={ultimaLabel} accent="#0284c7" />
        <ColumnLabel title="Reavaliação atual" subtitle={atualLabel} accent="#059669" />
      </div>

      <div className="space-y-3">
        {metrics.map((m) => (
          <MetricRow key={m.key} metric={m} />
        ))}
      </div>
    </InfoCard>
  );
}

function ColumnLabel({
  title,
  subtitle,
  accent,
}: {
  title: string;
  subtitle: string;
  accent: string;
}) {
  return (
    <div className={cn(clinical.card, "p-3 sm:p-4")}>
      <div className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: accent }}>
        {title}
      </div>
      <div className="mt-1 text-xs text-muted-foreground">{subtitle}</div>
    </div>
  );
}

function MetricRow({ metric }: { metric: MetricCompare }) {
  return (
    <div className={cn(clinical.card, "overflow-hidden")}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/60 px-3 py-2 sm:px-4">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-700">{metric.label}</span>
        <TrendBadge trend={metric.trend} />
      </div>
      <div className="grid gap-px bg-slate-100 sm:grid-cols-3">
        <CompareCell label="Inicial" value={metric.inicial} />
        <CompareCell label="Última" value={metric.ultima} />
        <CompareCell label="Atual" value={metric.atual} highlight />
      </div>
    </div>
  );
}

function CompareCell({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className={cn("bg-white p-3 sm:p-4", highlight && "bg-emerald-50/40")}>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-slate-800 sm:text-sm">{value}</div>
    </div>
  );
}

export function TrendBadge({ trend }: { trend: ClinicalTrend }) {
  const meta = {
    melhorou: { label: "Melhorou", icon: TrendingUp, variant: "success" as const },
    estavel: { label: "Estável", icon: Minus, variant: "info" as const },
    piorou: { label: "Piorou", icon: TrendingDown, variant: "danger" as const },
    indeterminado: { label: "—", icon: HelpCircle, variant: "neutral" as const },
  }[trend];
  const Icon = meta.icon;
  return (
    <StatusBadge variant={meta.variant}>
      <Icon className="mr-1 h-3 w-3" aria-hidden />
      {meta.label}
    </StatusBadge>
  );
}

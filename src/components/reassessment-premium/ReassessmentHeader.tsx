import { calcAge, fmtDate } from "@/lib/format";
import type { ReactNode } from "react";
import { InfoCard, StatusBadge } from "@/components/layout";
import { RefreshCw } from "lucide-react";
import type { AssessmentRow } from "./compare-utils";

type ReassessmentHeaderProps = {
  patient?: { nome_completo?: string; data_nascimento?: string | null } | null;
  diagnosis?: string;
  reavNumber: number;
  date?: string;
  professional?: string;
  status: string;
  scheduleLabel?: string;
};

export function ReassessmentHeader({
  patient,
  diagnosis,
  reavNumber,
  date,
  professional,
  status,
  scheduleLabel,
}: ReassessmentHeaderProps) {
  const ageYears = patient?.data_nascimento ? calcAge(patient.data_nascimento) : null;
  const statusVariant =
    status === "finalizada" ? "success" : status === "rascunho" ? "warning" : "info";

  return (
    <InfoCard
      icon={RefreshCw}
      title="Reavaliação fisioterapêutica"
      description="Comparativo evolutivo desde a avaliação inicial."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        <HeaderField label="Paciente" value={patient?.nome_completo ?? "—"} />
        <HeaderField label="Idade" value={ageYears != null ? `${ageYears} anos` : "—"} />
        <HeaderField
          label="Diagnóstico"
          value={diagnosis?.trim() || "—"}
          className="sm:col-span-2 lg:col-span-1 xl:col-span-2"
        />
        <HeaderField label="Nº reavaliação" value={reavNumber > 0 ? `#${reavNumber}` : "—"} />
        <HeaderField label="Data" value={date ? fmtDate(date) : "—"} />
        <HeaderField label="Profissional" value={professional ?? "—"} />
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Status</div>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <StatusBadge variant={statusVariant}>{status}</StatusBadge>
            {scheduleLabel && <StatusBadge variant="neutral">{scheduleLabel}</StatusBadge>}
          </div>
        </div>
      </div>
    </InfoCard>
  );
}

function HeaderField({
  label,
  value,
  className,
}: {
  label: string;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
      <div className="mt-1 truncate text-sm font-semibold text-slate-950">{value}</div>
    </div>
  );
}

export function headerDiagnosis(
  inicial: AssessmentRow | null,
  atual: AssessmentRow | null,
): string {
  return (
    atual?.diagnostico_clinico ||
    atual?.diagnostico_fisio ||
    inicial?.diagnostico_clinico ||
    inicial?.diagnostico_fisio ||
    ""
  );
}

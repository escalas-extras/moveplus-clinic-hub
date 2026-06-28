import type { ReactNode } from "react";
import { fmtDate } from "@/lib/format";
import { InfoCard, StatusBadge } from "@/components/layout";
import { LogOut } from "lucide-react";

type DischargeHeaderProps = {
  patientName: string;
  diagnosis?: string;
  dataAlta: string;
  professional?: string;
  status: string;
  motivo?: string;
};

export function DischargeHeader({
  patientName,
  diagnosis,
  dataAlta,
  professional,
  status,
  motivo,
}: DischargeHeaderProps) {
  const statusVariant =
    status === "assinada" ? "success" : status === "rascunho" ? "warning" : "info";

  return (
    <InfoCard
      icon={LogOut}
      title="Alta fisioterapêutica"
      description="Encerramento do ciclo clínico com registro profissional."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <HeaderField label="Paciente" value={patientName} />
        <HeaderField label="Diagnóstico" value={diagnosis?.trim() || "—"} className="sm:col-span-2 lg:col-span-1" />
        <HeaderField label="Data da alta" value={fmtDate(dataAlta)} />
        <HeaderField label="Profissional" value={professional ?? "—"} />
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Status</div>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <StatusBadge variant={statusVariant}>{status}</StatusBadge>
            {motivo && <StatusBadge variant="neutral">{motivo}</StatusBadge>}
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
  assessments: { diagnostico_clinico?: string | null; diagnostico_fisio?: string | null }[],
): string {
  const latest = [...assessments].reverse().find((a) => a.diagnostico_clinico || a.diagnostico_fisio);
  return latest?.diagnostico_clinico || latest?.diagnostico_fisio || "";
}

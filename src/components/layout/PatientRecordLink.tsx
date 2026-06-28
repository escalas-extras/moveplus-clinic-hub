import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

type PatientRecordLinkProps = {
  patientId: string;
  name: string;
  className?: string;
};

/** Link padronizado para prontuário do paciente — usado em listagens clínicas. */
export function PatientRecordLink({ patientId, name, className }: PatientRecordLinkProps) {
  return (
    <Link
      to="/app/pacientes/$id"
      params={{ id: patientId }}
      className={cn(
        "inline-flex min-h-[44px] max-w-full items-center gap-1 font-semibold text-slate-950 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-sm",
        className,
      )}
    >
      <span className="truncate">{name}</span>
      <ArrowRight className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden />
    </Link>
  );
}

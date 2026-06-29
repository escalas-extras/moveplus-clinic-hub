import { Building2, ChevronRight, Lock } from "lucide-react";
import { ClinicLogo } from "@/components/clinic-logo";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/layout";
import type { Branding } from "@/lib/branding";
import type { UserClinicOption } from "@/lib/clinic-selection";
import { cn } from "@/lib/utils";

const ROLE_LABELS: Record<string, string> = {
  owner: "Proprietário",
  admin: "Administrador",
  profissional: "Profissional",
  recepcao: "Recepção",
  financeiro: "Financeiro",
};

function statusVariant(status: UserClinicOption["operationalStatus"]) {
  if (status === "active") return "success" as const;
  if (status === "trial") return "info" as const;
  if (status === "suspended") return "warning" as const;
  return "neutral" as const;
}

function blockedMessage(status: UserClinicOption["operationalStatus"]) {
  if (status === "suspended") {
    return "Acesso temporariamente indisponível. Seus dados estão preservados — fale com o suporte.";
  }
  if (status === "inactive" || status === "canceled") {
    return "Esta clínica está inativa no momento. Entre em contato com o suporte para reativar.";
  }
  return "Entre em contato com o suporte para regularizar seu acesso.";
}

type ClinicSelectionCardProps = {
  option: UserClinicOption;
  brand: Branding;
  selecting: boolean;
  onEnter: () => void;
};

export function ClinicSelectionCard({ option, brand, selecting, onEnter }: ClinicSelectionCardProps) {
  const allowed = option.accessAllowed;

  return (
    <article
      className={cn(
        "overflow-hidden rounded-2xl border bg-white shadow-sm transition-all duration-200",
        allowed ? "border-slate-200/90 hover:border-slate-300 hover:shadow-md" : "border-slate-200/70 opacity-95",
      )}
    >
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 items-start gap-4">
          <div className="shrink-0">
            {brand.hasOwnLogo || brand.logoUrl ? (
              <ClinicLogo brand={brand} size="md" variant="inline" />
            ) : (
              <div
                className="flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-sm"
                style={{
                  background: `linear-gradient(135deg, ${brand.primaryColor}, ${brand.secondaryColor})`,
                }}
              >
                <Building2 className="h-5 w-5" aria-hidden />
              </div>
            )}
          </div>
          <div className="min-w-0 space-y-2">
            <div>
              <h2 className="truncate text-base font-semibold text-slate-900">{option.clinicName}</h2>
              <p className="text-xs text-slate-500">
                {ROLE_LABELS[option.role] ?? option.role}
                {option.planName ? ` · ${option.planName}` : " · Sem plano ativo"}
              </p>
            </div>
            <StatusBadge variant={statusVariant(option.operationalStatus)}>{option.statusLabel}</StatusBadge>
            {!allowed ? (
              <p className="flex items-start gap-1.5 text-xs leading-relaxed text-amber-800/90">
                <Lock className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
                {blockedMessage(option.operationalStatus)}
              </p>
            ) : null}
          </div>
        </div>
        <Button
          className="h-11 w-full shrink-0 sm:w-auto sm:min-w-[120px]"
          disabled={!allowed || selecting}
          loading={selecting}
          onClick={onEnter}
        >
          {allowed ? (
            <>
              Entrar
              <ChevronRight className="ml-1 h-4 w-4" aria-hidden />
            </>
          ) : (
            "Indisponível"
          )}
        </Button>
      </div>
    </article>
  );
}

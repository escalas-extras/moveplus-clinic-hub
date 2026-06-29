import type { ReactNode } from "react";
import { Building2, Mail, LogOut, ShieldOff, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ClinicOperationalStatus } from "@/lib/saas/clinic-operational-status";
import { AccessFlowShell } from "./AccessFlowShell";

const SUPPORT_EMAIL = "suporte@fisioos.app";

type AccessStatus = ClinicOperationalStatus | "no_clinic" | "denied" | "loading" | null;

type AccessRestrictedScreenProps = {
  title?: string;
  description?: string;
  status?: AccessStatus;
  trialDaysLeft?: number | null;
  actions?: ReactNode;
  onLogout?: () => void;
  embedded?: boolean;
};

function defaultCopy(status?: AccessStatus) {
  if (status === "no_clinic") {
    return {
      title: "Nenhuma clínica vinculada",
      description:
        "Sua conta ainda não está associada a uma clínica. Peça ao administrador da clínica ou ao suporte FisioOS para receber o convite de acesso.",
      hint: "Assim que o vínculo for criado, você poderá entrar normalmente.",
    };
  }
  if (status === "denied") {
    return {
      title: "Não foi possível continuar",
      description:
        "Não conseguimos concluir seu acesso agora. Tente novamente em instantes ou fale com o suporte se o problema persistir.",
      hint: null,
    };
  }
  if (status === "suspended") {
    return {
      title: "Acesso temporariamente restrito",
      description:
        "Seu acesso está temporariamente restrito. Os dados da clínica estão preservados. Entre em contato com o suporte para regularizar.",
      hint: "Nenhum dado clínico foi removido.",
    };
  }
  if (status === "inactive" || status === "canceled") {
    return {
      title: "Clínica inativa",
      description:
        "Esta clínica está inativa no momento. Seus dados permanecem seguros. Fale com o suporte para reativar o acesso.",
      hint: null,
    };
  }
  if (status === "trial") {
    return {
      title: "Período de avaliação encerrado",
      description:
        "O período de teste terminou. Seus dados estão preservados. Entre em contato com o suporte para escolher um plano e continuar.",
      hint: null,
    };
  }
  return {
    title: "Acesso temporariamente restrito",
    description:
      "Seu acesso está temporariamente restrito. Os dados da clínica estão preservados. Entre em contato com o suporte para regularizar.",
    hint: null,
  };
}

function StatusIcon({ status }: { status?: AccessStatus }) {
  const className = "h-8 w-8";
  if (status === "no_clinic") return <UserX className={className} aria-hidden />;
  return <ShieldOff className={className} aria-hidden />;
}

export function AccessRestrictedScreen({
  title,
  description,
  status,
  trialDaysLeft: _trialDaysLeft,
  actions,
  onLogout,
  embedded = false,
}: AccessRestrictedScreenProps) {
  const copy = defaultCopy(status);
  const resolvedTitle = title ?? copy.title;
  const resolvedDescription = description ?? copy.description;

  const panel = (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-8 shadow-sm">
      <div className="flex flex-col items-center gap-5 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-700 ring-1 ring-amber-200/70">
          <StatusIcon status={status} />
        </div>
        <div className="max-w-md space-y-2">
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">{resolvedTitle}</h1>
          <p className="text-sm leading-relaxed text-slate-600">{resolvedDescription}</p>
          {copy.hint ? <p className="text-xs text-slate-500">{copy.hint}</p> : null}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
          {actions}
          <Button variant="outline" asChild className="h-10">
            <a href={`mailto:${SUPPORT_EMAIL}`}>
              <Mail className="mr-2 h-4 w-4" />
              Contatar suporte
            </a>
          </Button>
          {onLogout ? (
            <Button variant="ghost" className="h-10" onClick={onLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Sair da conta
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );

  if (embedded) return panel;

  return (
    <AccessFlowShell narrow>
      {panel}
    </AccessFlowShell>
  );
}

/** Skeleton para carregamento da seleção de clínicas */
export function ClinicSelectionSkeleton() {
  return (
    <AccessFlowShell>
      <div className="space-y-3 animate-pulse">
        <div className="h-8 w-48 rounded-lg bg-slate-200/80" />
        <div className="h-4 w-72 max-w-full rounded bg-slate-100" />
        {[1, 2].map((i) => (
          <div key={i} className="rounded-2xl border border-slate-200/80 bg-white p-5">
            <div className="flex gap-4">
              <div className="h-12 w-12 rounded-xl bg-slate-100" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-40 rounded bg-slate-100" />
                <div className="h-3 w-28 rounded bg-slate-50" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </AccessFlowShell>
  );
}

export function ClinicSelectionEmptyHint() {
  return (
    <p className="flex items-center gap-2 text-xs text-slate-500">
      <Building2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
      Precisa de ajuda?{" "}
      <a className="font-medium text-[#0F4C5C] underline-offset-2 hover:underline" href={`mailto:${SUPPORT_EMAIL}`}>
        suporte@fisioos.app
      </a>
    </p>
  );
}

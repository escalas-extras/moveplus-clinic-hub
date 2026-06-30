import { Link } from "@tanstack/react-router";
import { ChevronRight, ClipboardList, FileText, History } from "lucide-react";
import { PageSection, EmptyState } from "@/components/layout";
import { fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";

type ResumePatient = {
  id: string;
  nome_completo: string;
  created_at: string;
};

type ResumeDoc = {
  id: string;
  title: string;
  issued_at: string;
  locked_at: string | null;
  patients: { nome_completo: string } | null;
};

type ContinueWhereLeftOffProps = {
  lastPatient: ResumePatient | null;
  lastDocument: ResumeDoc | null;
  unsignedEvolutions: number;
};

function ResumeRow({
  icon: Icon,
  title,
  subtitle,
  to,
  params,
}: {
  icon: typeof History;
  title: string;
  subtitle: string;
  to: string;
  params?: Record<string, string>;
}) {
  return (
    <Link
      to={to}
      params={params}
      className={cn(
        "group flex items-center gap-3 rounded-2xl border border-[rgba(15,76,92,0.08)] bg-white px-4 py-3.5",
        "transition-all duration-200 hover:-translate-y-px hover:border-primary/20 hover:shadow-[var(--shadow-lift)]",
      )}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900">{title}</p>
        <p className="truncate text-xs text-slate-500">{subtitle}</p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-primary" aria-hidden />
    </Link>
  );
}

export function ContinueWhereLeftOff({
  lastPatient,
  lastDocument,
  unsignedEvolutions,
}: ContinueWhereLeftOffProps) {
  const hasAny = !!lastPatient || !!lastDocument || unsignedEvolutions > 0;

  return (
    <PageSection
      icon={History}
      title="Continue de onde parou"
      description="Retome o trabalho sem perder o contexto."
      contentClassName="space-y-2"
      className="fos-animate-in"
    >
      {!hasAny ? (
        <EmptyState
          icon={History}
          title="Nada para retomar ainda"
          description="Quando você cadastrar pacientes, evoluir prontuários ou emitir documentos, eles aparecerão aqui."
          action={{ label: "Cadastrar primeiro paciente", to: "/app/pacientes" }}
          className="py-8"
        />
      ) : (
        <>
          {lastPatient ? (
            <ResumeRow
              icon={History}
              title={`Último prontuário · ${lastPatient.nome_completo}`}
              subtitle={`Cadastrado em ${fmtDate(lastPatient.created_at.slice(0, 10))}`}
              to="/app/pacientes/$id"
              params={{ id: lastPatient.id }}
            />
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-3 text-sm text-slate-600">
              Você ainda não possui pacientes cadastrados.{" "}
              <Link to="/app/pacientes" className="font-semibold text-primary hover:underline">
                Cadastrar primeiro paciente
              </Link>
            </div>
          )}

          {unsignedEvolutions > 0 ? (
            <ResumeRow
              icon={ClipboardList}
              title="Última evolução pendente"
              subtitle={`${unsignedEvolutions} evolução(ões) aguardando assinatura`}
              to="/app/evolucoes"
            />
          ) : (
            <ResumeRow
              icon={ClipboardList}
              title="Nova evolução"
              subtitle="Registre a evolução do atendimento de hoje"
              to="/app/evolucoes"
            />
          )}

          {lastDocument ? (
            <ResumeRow
              icon={FileText}
              title={`Último documento · ${lastDocument.title}`}
              subtitle={
                lastDocument.patients?.nome_completo
                  ? `${lastDocument.patients.nome_completo} · ${lastDocument.locked_at ? fmtDate(lastDocument.issued_at) : "Rascunho"}`
                  : lastDocument.locked_at
                    ? fmtDate(lastDocument.issued_at)
                    : "Rascunho pendente"
              }
              to="/app/documentos"
            />
          ) : (
            <ResumeRow
              icon={FileText}
              title="Emitir documento"
              subtitle="Nenhum documento emitido ainda — comece pelo primeiro laudo ou orientação"
              to="/app/documentos"
            />
          )}
        </>
      )}
    </PageSection>
  );
}

import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  FileCheck2,
  FileText,
  Image,
  ReceiptText,
  Sparkles,
  Stethoscope,
  Users,
} from "lucide-react";
import { EmptyState, InfoCard, PageSection, StatusBadge } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

type ActivationMetric = {
  logoUploaded: boolean;
  professionalsCount?: number | null;
  patientsCount?: number | null;
  assessmentsCount?: number | null;
  documentsCount?: number | null;
  receiptsCount?: number | null;
};

type ActivationStep = {
  key: string;
  title: string;
  description: string;
  to: string;
  done: boolean;
  icon: typeof Image;
};

type ClinicActivationCenterProps = {
  metrics: ActivationMetric;
  className?: string;
};

function positive(value: number | null | undefined) {
  return Number(value ?? 0) > 0;
}

function buildActivationSteps(metrics: ActivationMetric): ActivationStep[] {
  return [
    {
      key: "logo",
      title: "Logo enviada",
      description: "Identidade visual aplicada na experiência e nos documentos.",
      to: "/app/configuracoes",
      done: metrics.logoUploaded,
      icon: Image,
    },
    {
      key: "professionals",
      title: "Profissionais cadastrados",
      description: "Equipe clínica pronta para assinar atendimentos e documentos.",
      to: "/app/profissionais",
      done: positive(metrics.professionalsCount),
      icon: Stethoscope,
    },
    {
      key: "patients",
      title: "Pacientes cadastrados",
      description: "Base inicial criada para operar agenda, prontuário e financeiro.",
      to: "/app/pacientes",
      done: positive(metrics.patientsCount),
      icon: Users,
    },
    {
      key: "assessment",
      title: "Primeira avaliação",
      description: "Prontuário clínico iniciado com avaliação registrada.",
      to: "/app/avaliacoes",
      done: positive(metrics.assessmentsCount),
      icon: ClipboardList,
    },
    {
      key: "document",
      title: "Primeiro documento",
      description: "Rotina documental validada para relatórios, declarações ou contratos.",
      to: "/app/documentos",
      done: positive(metrics.documentsCount),
      icon: FileText,
    },
    {
      key: "receipt",
      title: "Primeiro recibo",
      description: "Fluxo financeiro mínimo testado com recibo emitido.",
      to: "/app/financeiro/recibos",
      done: positive(metrics.receiptsCount),
      icon: ReceiptText,
    },
  ];
}

export function ClinicActivationCenter({ metrics, className }: ClinicActivationCenterProps) {
  const steps = buildActivationSteps(metrics);
  const completed = steps.filter((step) => step.done).length;
  const progress = Math.round((completed / steps.length) * 100);
  const nextStep = steps.find((step) => !step.done);
  const complete = completed === steps.length;

  return (
    <PageSection
      icon={Sparkles}
      title="Centro de ativação da clínica"
      description="Jornada essencial para transformar a clínica em uma operação pronta para vender, atender e documentar."
      actions={
        complete ? (
          <StatusBadge variant="success">Completa</StatusBadge>
        ) : (
          <StatusBadge variant="warning">{completed}/{steps.length} etapas</StatusBadge>
        )
      }
      className={className}
      contentClassName="space-y-5"
    >
      {complete ? (
        <EmptyState
          icon={FileCheck2}
          title="Clínica totalmente configurada."
          description="Os elementos essenciais de ativação já foram concluídos."
          className="py-10"
        />
      ) : (
        <>
          <InfoCard
            variant="highlight"
            icon={Sparkles}
            title={`${progress}% configurada`}
            description={nextStep ? `Próxima ação: ${nextStep.title.toLowerCase()}.` : "Revise os itens de ativação."}
            action={
              nextStep ? (
                <Button asChild className="h-10 px-4 text-sm">
                  <Link to={nextStep.to}>
                    Continuar configuração
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              ) : null
            }
          >
            <div className="space-y-3">
              <Progress value={progress} className="h-2.5" />
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-600">
                <span>{completed} etapas concluídas</span>
                <span className="h-1 w-1 rounded-full bg-slate-300" aria-hidden />
                <span>{steps.length - completed} pendentes</span>
              </div>
            </div>
          </InfoCard>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {steps.map((step) => (
              <ActivationStepCard key={step.key} step={step} />
            ))}
          </div>
        </>
      )}
    </PageSection>
  );
}

function ActivationStepCard({ step }: { step: ActivationStep }) {
  const Icon = step.icon;
  return (
    <Link
      to={step.to}
      className={cn(
        "group flex min-h-[132px] flex-col justify-between rounded-2xl border bg-white/90 p-4 shadow-[0_10px_28px_-22px_rgba(15,76,92,0.55)] transition-[border-color,box-shadow,transform,background-color] duration-200 hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_18px_42px_-24px_rgba(15,76,92,0.65)]",
        step.done ? "border-emerald-200/80" : "border-[rgba(15,76,92,0.12)] hover:border-primary/25",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1",
            step.done
              ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
              : "bg-primary/8 text-primary ring-primary/15",
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <StatusBadge variant={step.done ? "success" : "neutral"} className="text-[10px]">
          {step.done ? "Concluído" : "Pendente"}
        </StatusBadge>
      </div>
      <div className="mt-4 space-y-1.5">
        <div className="flex items-center gap-2">
          {step.done && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
          <h3 className="text-sm font-bold tracking-tight text-slate-950">{step.title}</h3>
        </div>
        <p className="text-xs leading-relaxed text-slate-600">{step.description}</p>
      </div>
    </Link>
  );
}

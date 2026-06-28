import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveClinic } from "@/lib/active-clinic";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ClinicalSkeleton, EmptyState } from "@/components/layout";
import {
  GitCompare,
  FileText,
  Clock,
  BarChart3,
  PenLine,
  X,
  ExternalLink,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { fmtDate } from "@/lib/format";
import { AssessmentWizard } from "@/components/assessment-wizard";
import { ReassessmentHeader, headerDiagnosis } from "./ReassessmentHeader";
import { ReassessmentComparatorPanel } from "./ReassessmentComparatorPanel";
import { ReassessmentSummary } from "./ReassessmentSummary";
import { ReassessmentTimeline } from "./ReassessmentTimeline";
import { ReassessmentCharts } from "./ReassessmentCharts";
import {
  assessmentLabel,
  buildEvolutionSummary,
  buildMetricCompares,
  pickComparisonTriplet,
  type AssessmentRow,
} from "./compare-utils";

export type ScheduleItem = {
  id: string;
  scheduled_for: string;
  completed_at: string | null;
  interval_days: number;
  patient_id: string;
  patients?: { nome_completo: string } | null;
};

const ASSESSMENT_SELECT = `
  id, data, tipo, eva, rom_goniometry, strength_mrc, scales_results,
  testes_especificos, objetivos, therapeutic_goals, queixa_principal,
  orto_limitacoes, locked_at, status, professional_id, wizard_step,
  diagnostico_clinico, diagnostico_fisio,
  professionals(nome)
`;

type ReassessmentWorkspaceProps = {
  schedule: ScheduleItem;
  onClose: () => void;
};

function ymd(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function ReassessmentWorkspace({ schedule, onClose }: ReassessmentWorkspaceProps) {
  const { clinicId } = useActiveClinic();
  const qc = useQueryClient();
  const patientId = schedule.patient_id;
  const isOverdue = !schedule.completed_at && new Date(schedule.scheduled_for) < new Date();
  const isPending = !schedule.completed_at;

  const patientQ = useQuery({
    queryKey: ["reaval-patient", clinicId, patientId],
    enabled: !!clinicId && !!patientId,
    queryFn: async () => {
      const { data } = await supabase
        .from("patients")
        .select("id, nome_completo, data_nascimento, clinic_id")
        .eq("id", patientId)
        .single();
      return data;
    },
  });

  const assessmentsQ = useQuery({
    queryKey: ["reaval-assessments", clinicId, patientId],
    enabled: !!clinicId && !!patientId,
    queryFn: async () => {
      const { data } = await supabase
        .from("assessments")
        .select(ASSESSMENT_SELECT)
        .eq("clinic_id", clinicId!)
        .eq("patient_id", patientId)
        .order("data", { ascending: true });
      return (data ?? []) as AssessmentRow[];
    },
  });

  const evolutionsQ = useQuery({
    queryKey: ["reaval-evolutions", clinicId, patientId],
    enabled: !!clinicId && !!patientId,
    queryFn: async () => {
      const { data } = await supabase
        .from("evolutions")
        .select("id, data, hora, procedimentos, professionals(nome)")
        .eq("clinic_id", clinicId!)
        .eq("patient_id", patientId)
        .order("data", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  const triplet = useMemo(
    () => pickComparisonTriplet(assessmentsQ.data ?? []),
    [assessmentsQ.data],
  );

  const metrics = useMemo(
    () => buildMetricCompares(triplet.inicial, triplet.ultima, triplet.atual),
    [triplet],
  );

  const summary = useMemo(
    () => buildEvolutionSummary(triplet.inicial, triplet.ultima, triplet.atual, metrics),
    [triplet, metrics],
  );

  const wizardAssessment = useMemo(() => {
    if (triplet.draft) return triplet.draft;
    if (isPending) {
      return {
        tipo: "reavaliacao" as const,
        data: ymd(),
        patient_id: patientId,
      };
    }
    return triplet.atual ?? undefined;
  }, [triplet, isPending, patientId]);

  const status = triplet.atual?.locked_at
    ? "finalizada"
    : triplet.draft || isPending
      ? "rascunho"
      : "registrada";

  const profName =
    triplet.atual?.professionals?.nome ??
    triplet.ultima?.professionals?.nome ??
    triplet.inicial?.professionals?.nome ??
    "—";

  const scheduleLabel = schedule.completed_at
    ? "Concluída"
    : isOverdue
      ? "Atrasada"
      : "Agendada";

  const loading = patientQ.isLoading || assessmentsQ.isLoading;

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["reaval-assessments", clinicId, patientId] });
    qc.invalidateQueries({ queryKey: ["reassessments-pending", clinicId] });
    qc.invalidateQueries({ queryKey: ["assessments", clinicId, patientId] });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <ClinicalSkeleton variant="wizard" />
      </div>
    );
  }

  if (!triplet.inicial) {
    return (
      <div className="space-y-4">
        <EmptyState
          icon={GitCompare}
          title="Avaliação inicial necessária"
          description="Registre a avaliação inicial do paciente antes de iniciar uma reavaliação comparativa."
          className="py-10"
        />
        <div className="flex justify-center">
          <Button asChild className="rounded-xl">
            <Link to="/app/pacientes/$id" params={{ id: patientId }}>
              Abrir prontuário
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-premium clinical-module space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-bold text-slate-950">
            {schedule.patients?.nome_completo ?? patientQ.data?.nome_completo ?? "Paciente"}
          </h2>
          <p className="text-xs text-muted-foreground">
            Agendada para {fmtDate(schedule.scheduled_for)} · intervalo {schedule.interval_days}d
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="rounded-xl" asChild>
            <Link to="/app/pacientes/$id" params={{ id: patientId }}>
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
              Prontuário
            </Link>
          </Button>
          <Button variant="ghost" size="sm" className="rounded-xl" onClick={onClose} aria-label="Fechar painel">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ReassessmentHeader
        patient={patientQ.data}
        diagnosis={headerDiagnosis(triplet.inicial, triplet.atual)}
        reavNumber={triplet.reavNumber || 1}
        date={triplet.atual?.data ?? schedule.scheduled_for}
        professional={profName}
        status={status}
        scheduleLabel={scheduleLabel}
      />

      <Tabs defaultValue="comparativo" className="space-y-4">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 rounded-xl p-1">
          <TabsTrigger value="comparativo" className="gap-1.5 rounded-lg">
            <GitCompare className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Comparativo</span>
          </TabsTrigger>
          <TabsTrigger value="resumo" className="gap-1.5 rounded-lg">
            <FileText className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Resumo</span>
          </TabsTrigger>
          <TabsTrigger value="timeline" className="gap-1.5 rounded-lg">
            <Clock className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Timeline</span>
          </TabsTrigger>
          <TabsTrigger value="graficos" className="gap-1.5 rounded-lg">
            <BarChart3 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Gráficos</span>
          </TabsTrigger>
          {isPending && (
            <TabsTrigger value="registrar" className="gap-1.5 rounded-lg">
              <PenLine className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Registrar</span>
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="comparativo" className="mt-0">
          <ReassessmentComparatorPanel
            metrics={metrics}
            inicialLabel={assessmentLabel(triplet.inicial, "Sem registro")}
            ultimaLabel={assessmentLabel(triplet.ultima, "Nenhuma anterior")}
            atualLabel={assessmentLabel(triplet.atual, "Em elaboração")}
          />
        </TabsContent>

        <TabsContent value="resumo" className="mt-0">
          <ReassessmentSummary summary={summary} />
        </TabsContent>

        <TabsContent value="timeline" className="mt-0">
          <ReassessmentTimeline
            assessments={assessmentsQ.data ?? []}
            evolutions={evolutionsQ.data ?? []}
          />
        </TabsContent>

        <TabsContent value="graficos" className="mt-0">
          <ReassessmentCharts
            inicial={triplet.inicial}
            ultima={triplet.ultima}
            atual={triplet.atual}
          />
        </TabsContent>

        {isPending && (
          <TabsContent value="registrar" className="mt-0">
            <AssessmentWizard
              patientId={patientId}
              patient={patientQ.data}
              assessment={wizardAssessment}
              onDone={invalidateAll}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

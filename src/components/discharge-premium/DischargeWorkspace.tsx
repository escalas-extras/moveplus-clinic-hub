import { memo, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveClinic } from "@/lib/active-clinic";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ClinicalSkeleton, EmptyState } from "@/components/layout";
import {
  GitCompare,
  Clock,
  PenLine,
  X,
  ExternalLink,
  FileDown,
  Lock,
  Sparkles,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { fmtDate } from "@/lib/format";
import { downloadPdf } from "@/lib/pdf";
import { buildDischargePdfOpts } from "@/lib/pdf-builders";
import { DischargeHeader, headerDiagnosis } from "./DischargeHeader";
import { DischargeAutoSummary } from "./DischargeAutoSummary";
import { DischargeFinalComparator } from "./DischargeFinalComparator";
import { DischargeTimeline } from "./DischargeTimeline";
import { DischargeWizard } from "./DischargeWizard";
import { DischargeChecklistPanel } from "./DischargeChecklist";
import {
  ASSESSMENT_FIELDS,
  computeTreatmentStats,
} from "./discharge-utils";
import type { AssessmentRow } from "@/components/reassessment-premium";

export type PatientListItem = {
  id: string;
  nome_completo: string;
  data_nascimento: string | null;
  data_alta: string | null;
  situacao: string;
  clinic_id: string;
};

type DischargeWorkspaceProps = {
  patient: PatientListItem;
  onClose: () => void;
};

function DischargeWorkspaceInner({ patient, onClose }: DischargeWorkspaceProps) {
  const { clinicId, supportMode } = useActiveClinic();
  const qc = useQueryClient();
  const isDischarged = !!patient.data_alta || patient.situacao === "inativo";

  const assessmentsQ = useQuery({
    queryKey: ["discharge-ws-assessments", clinicId, patient.id],
    enabled: !!clinicId,
    queryFn: async () => {
      const { data } = await supabase
        .from("assessments")
        .select(ASSESSMENT_FIELDS)
        .eq("clinic_id", clinicId!)
        .eq("patient_id", patient.id)
        .order("data", { ascending: true });
      return (data ?? []) as AssessmentRow[];
    },
  });

  const evolutionsQ = useQuery({
    queryKey: ["discharge-ws-evolutions", clinicId, patient.id],
    enabled: !!clinicId,
    queryFn: async () => {
      const { count } = await supabase
        .from("evolutions")
        .select("id", { count: "exact", head: true })
        .eq("clinic_id", clinicId!)
        .eq("patient_id", patient.id);
      const { data } = await supabase
        .from("evolutions")
        .select("id, data, hora, procedimentos, professionals(nome)")
        .eq("clinic_id", clinicId!)
        .eq("patient_id", patient.id)
        .order("data", { ascending: false })
        .limit(50);
      return { count: count ?? 0, rows: data ?? [] };
    },
  });

  const dischargesQ = useQuery({
    queryKey: ["discharges", clinicId, patient.id],
    enabled: !!clinicId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patient_discharges")
        .select("*, professionals(nome, conselho, registro, profissao), patients!inner(clinic_id)")
        .eq("patient_id", patient.id)
        .eq("patients.clinic_id", clinicId!)
        .order("data_alta", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const stats = useMemo(
    () =>
      computeTreatmentStats(
        assessmentsQ.data ?? [],
        evolutionsQ.data?.count ?? 0,
        patient.data_alta ?? new Date().toISOString().slice(0, 10),
      ),
    [assessmentsQ.data, evolutionsQ.data?.count, patient.data_alta],
  );

  const latestDischarge = dischargesQ.data?.[0];
  const profName = latestDischarge?.professionals?.nome ?? "—";
  const status = latestDischarge?.locked_at
    ? "assinada"
    : isDischarged
      ? "registrada"
      : "em elaboração";

  const lock = useMutation({
    mutationFn: async (id: string) => {
      if (supportMode) throw new Error("Modo Suporte ativo: somente leitura.");
      const { error } = await supabase
        .from("patient_discharges")
        .update({ locked_at: new Date().toISOString() })
        .eq("id", id)
        .eq("patient_id", patient.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Alta assinada");
      qc.invalidateQueries({ queryKey: ["discharges", clinicId, patient.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function buildPdfOpts(d: (typeof dischargesQ.data)[0]) {
    return buildDischargePdfOpts(
      d,
      patient,
      assessmentsQ.data ?? [],
      evolutionsQ.data?.count ?? 0,
    );
  }

  const loading = assessmentsQ.isLoading || evolutionsQ.isLoading || dischargesQ.isLoading;

  if (loading) {
    return <ClinicalSkeleton variant="wizard" />;
  }

  if (!assessmentsQ.data?.length) {
    return (
      <EmptyState
        icon={Sparkles}
        title="Sem avaliação inicial"
        description="Registre uma avaliação fisioterapêutica antes de processar a alta."
        className="py-12"
      />
    );
  }

  return (
    <div className="dashboard-premium clinical-module space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="truncate text-lg font-bold text-slate-950">{patient.nome_completo}</h2>
        <div className="flex flex-wrap gap-2">
          {latestDischarge && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="rounded-xl"
                onClick={() => {
                  const d = latestDischarge;
                  const missing: string[] = [];
                  if (!patient.nome_completo) missing.push("paciente");
                  if (!d.professionals?.nome) missing.push("profissional");
                  if (!d.data_alta) missing.push("data da alta");
                  if (!d.motivo) missing.push("motivo");
                  if (!d.recomendacoes) missing.push("recomendações");
                  if (!d.plano_domiciliar) missing.push("plano domiciliar");
                  if (missing.length) {
                    toast.error(`Dados insuficientes para PDF: ${missing.join(", ")}`);
                    return;
                  }
                  downloadPdf(buildPdfOpts(d));
                }}
              >
                <FileDown className="mr-1.5 h-3.5 w-3.5" />
                PDF
              </Button>
              {!latestDischarge.locked_at && (
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => lock.mutate(latestDischarge.id)}
                >
                  <Lock className="mr-1.5 h-3.5 w-3.5" />
                  Assinar
                </Button>
              )}
            </>
          )}
          <Button variant="outline" size="sm" className="rounded-xl" asChild>
            <Link to="/app/pacientes/$id" params={{ id: patient.id }}>
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
              Prontuário
            </Link>
          </Button>
          <Button variant="ghost" size="sm" className="rounded-xl" onClick={onClose} aria-label="Fechar">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <DischargeHeader
        patientName={patient.nome_completo}
        diagnosis={headerDiagnosis(assessmentsQ.data)}
        dataAlta={latestDischarge?.data_alta ?? new Date().toISOString().slice(0, 10)}
        professional={profName}
        status={status}
        motivo={latestDischarge?.motivo}
      />

      <Tabs defaultValue={isDischarged ? "resumo" : "assistente"} className="space-y-4">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 rounded-xl p-1">
          {!isDischarged && (
            <TabsTrigger value="assistente" className="gap-1.5 rounded-lg">
              <PenLine className="h-3.5 w-3.5" />
              Assistente
            </TabsTrigger>
          )}
          <TabsTrigger value="resumo" className="gap-1.5 rounded-lg">
            <Sparkles className="h-3.5 w-3.5" />
            Resumo
          </TabsTrigger>
          <TabsTrigger value="comparativo" className="gap-1.5 rounded-lg">
            <GitCompare className="h-3.5 w-3.5" />
            Comparativo
          </TabsTrigger>
          <TabsTrigger value="timeline" className="gap-1.5 rounded-lg">
            <Clock className="h-3.5 w-3.5" />
            Timeline
          </TabsTrigger>
        </TabsList>

        {!isDischarged && (
          <TabsContent value="assistente" className="mt-0">
            <DischargeWizard
              patientId={patient.id}
              patientName={patient.nome_completo}
              stats={stats}
              onSuccess={() => {
                qc.invalidateQueries({ queryKey: ["altas-pending", clinicId] });
                qc.invalidateQueries({ queryKey: ["altas-clinic", clinicId] });
              }}
            />
          </TabsContent>
        )}

        <TabsContent value="resumo" className="mt-0 space-y-4">
          <DischargeAutoSummary stats={stats} />
          {isDischarged && latestDischarge && (
            <DischargeChecklistPanel
              value={{
                objetivosConcluidos: !!latestDischarge.objetivos_alcancados,
                orientacoesEntregues: !!latestDischarge.recomendacoes,
                exerciciosDomiciliares: !!latestDischarge.plano_domiciliar,
                encaminhamento: latestDischarge.motivo?.includes("Encaminhamento") ?? false,
                documentacaoCompleta: true,
              }}
              onChange={() => {}}
              readOnly
            />
          )}
        </TabsContent>

        <TabsContent value="comparativo" className="mt-0">
          <DischargeFinalComparator assessments={assessmentsQ.data ?? []} />
        </TabsContent>

        <TabsContent value="timeline" className="mt-0">
          <DischargeTimeline
            assessments={assessmentsQ.data ?? []}
            evolutions={evolutionsQ.data?.rows ?? []}
            discharges={dischargesQ.data ?? []}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export const DischargeWorkspace = memo(DischargeWorkspaceInner);

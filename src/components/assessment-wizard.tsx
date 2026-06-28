import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "sonner";
import {
  ArrowLeft, ArrowRight, CheckCircle2, Loader2, Sparkles, FileText, Stethoscope,
  ClipboardList, Activity, Target, Pen, User, Save, AlertCircle, History, Circle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { EmptyState, InfoCard, StatusBadge, AutosaveIndicator, ClinicalSkeleton, FieldLabel } from "@/components/layout";
import { PageHero, ActionButton } from "@/components/ui-system";
import { useBranding } from "@/lib/branding";
import { calcAge, fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  detectDiagnoses, PROFILE_COLOR, PROFILE_LABEL,
  type ClinicalProfile, type DiagnosisCatalogItem,
} from "@/lib/clinical-profiles";
import { useActiveClinic } from "@/lib/active-clinic";
import { ClinicalTabs } from "@/components/clinical/clinical-tabs";
import { EvaScale } from "@/components/clinical/eva-scale";

const STEPS = [
  { key: "identificacao", label: "Identificação", icon: User },
  { key: "diagnostico", label: "Diagnóstico", icon: Stethoscope },
  { key: "anamnese", label: "Anamnese", icon: FileText },
  { key: "exame", label: "Exame Físico", icon: Activity },
  { key: "escalas", label: "Escalas", icon: ClipboardList },
  { key: "plano", label: "Plano Terapêutico", icon: Target },
  { key: "assinaturas", label: "Assinaturas", icon: Pen },
] as const;

function clampStepIndex(idx: number | null | undefined, total = STEPS.length): number {
  const n = Number.isFinite(idx) ? Number(idx) : 0;
  return Math.min(Math.max(0, n), Math.max(0, total - 1));
}

const ASSESSMENT_TEXTAREA =
  "mt-2 w-full min-w-0 max-w-full rounded-xl border-[rgba(15,76,92,0.1)] bg-[rgba(15,76,92,0.02)] text-sm leading-relaxed text-slate-800 placeholder:text-slate-400 focus:border-[var(--fos-primary)]/30 focus:bg-white focus:ring-2 focus:ring-[var(--fos-primary)]/10";

const ASSESSMENT_STEP_CARD = "assessment-step-card border-[rgba(15,76,92,0.08)] bg-white/80 shadow-[0_1px_4px_rgba(15,76,92,0.04)]";

const ASSESSMENT_INPUT =
  "mt-2 rounded-xl border-[rgba(15,76,92,0.1)] bg-[rgba(15,76,92,0.02)] text-sm focus:border-[var(--fos-primary)]/30 focus:bg-white focus:ring-2 focus:ring-[var(--fos-primary)]/10";

type StepKey = (typeof STEPS)[number]["key"];

type WizardPayload = {
  professional_id: string;
  tipo: "avaliacao" | "reavaliacao";
  data: string;
  diagnostico_clinico: string;
  medico_responsavel: string;
  diagnostico_fisio: string;
  diagnosis_codes: string[];
  clinical_profiles: ClinicalProfile[];
  queixa_principal: string;
  hma: string;
  hmp: string;
  antecedentes_pessoais: string;
  antecedentes_familiares: string;
  habitos_vida: string;
  medicamentos: string;
  // exame físico — neuro
  neuro_consciencia: string;
  neuro_comunicacao: string;
  neuro_cognicao: string;
  neuro_tonus: string;
  neuro_coordenacao: string;
  neuro_equilibrio: string;
  // exame físico — orto
  orto_dor_movimento: string;
  orto_limitacoes: string;
  orto_testes: string;
  // exame físico — respiratório
  resp_fr: string;
  resp_spo2: string;
  resp_oxigenio: string;
  resp_ausculta: string;
  resp_tosse: string;
  resp_dispneia: string;
  // exame físico — geral
  eva: number;
  inspecao: string;
  palpacao: string;
  // plano
  objetivos: string;
  condutas: string;
  recursos_terapeuticos: string;
};

const emptyPayload = (): WizardPayload => ({
  professional_id: "",
  tipo: "avaliacao",
  data: new Date().toISOString().slice(0, 10),
  diagnostico_clinico: "",
  medico_responsavel: "",
  diagnostico_fisio: "",
  diagnosis_codes: [],
  clinical_profiles: [],
  queixa_principal: "",
  hma: "",
  hmp: "",
  antecedentes_pessoais: "",
  antecedentes_familiares: "",
  habitos_vida: "",
  medicamentos: "",
  neuro_consciencia: "",
  neuro_comunicacao: "",
  neuro_cognicao: "",
  neuro_tonus: "",
  neuro_coordenacao: "",
  neuro_equilibrio: "",
  orto_dor_movimento: "",
  orto_limitacoes: "",
  orto_testes: "",
  resp_fr: "",
  resp_spo2: "",
  resp_oxigenio: "",
  resp_ausculta: "",
  resp_tosse: "",
  resp_dispneia: "",
  eva: 0,
  inspecao: "",
  palpacao: "",
  objetivos: "",
  condutas: "",
  recursos_terapeuticos: "",
});

function fromAssessment(a: any): WizardPayload {
  const base = emptyPayload();
  if (!a) return base;
  return {
    ...base,
    professional_id: a.professional_id ?? "",
    tipo: a.tipo ?? "avaliacao",
    data: a.data ?? base.data,
    diagnostico_clinico: a.diagnostico_clinico ?? "",
    medico_responsavel: a.medico_responsavel ?? "",
    diagnostico_fisio: a.diagnostico_fisio ?? "",
    diagnosis_codes: a.diagnosis_codes ?? [],
    clinical_profiles: a.clinical_profiles ?? [],
    queixa_principal: a.queixa_principal ?? "",
    hma: a.hma ?? "",
    hmp: a.hmp ?? "",
    antecedentes_pessoais: a.antecedentes_pessoais ?? "",
    antecedentes_familiares: a.antecedentes_familiares ?? "",
    habitos_vida: a.habitos_vida ?? "",
    medicamentos: a.medicamentos ?? "",
    eva: a.eva ?? 0,
    inspecao: a.inspecao ?? "",
    palpacao: a.palpacao ?? "",
    objetivos: a.objetivos ?? "",
    condutas: a.condutas ?? "",
    recursos_terapeuticos: a.recursos_terapeuticos ?? "",
    // os campos neuro/orto/resp podem vir do JSON sinais_vitais legado
    neuro_consciencia: a.sinais_vitais?.nivel_consciencia ?? "",
    neuro_comunicacao: a.sinais_vitais?.neuro_comunicacao ?? "",
    neuro_cognicao: a.sinais_vitais?.neuro_cognicao ?? "",
    neuro_tonus: a.sinais_vitais?.tonus ?? "",
    neuro_coordenacao: a.sinais_vitais?.neuro_coordenacao ?? "",
    neuro_equilibrio: a.sinais_vitais?.neuro_equilibrio ?? "",
    orto_dor_movimento: a.sinais_vitais?.orto_dor_movimento ?? "",
    orto_limitacoes: a.sinais_vitais?.orto_limitacoes ?? "",
    orto_testes: a.sinais_vitais?.orto_testes ?? "",
    resp_fr: a.sinais_vitais?.fr ?? "",
    resp_spo2: a.sinais_vitais?.spo2 ?? "",
    resp_oxigenio: a.sinais_vitais?.resp_oxigenio ?? "",
    resp_ausculta: a.sinais_vitais?.ausculta ?? "",
    resp_tosse: a.sinais_vitais?.tosse ?? "",
    resp_dispneia: a.sinais_vitais?.resp_dispneia ?? "",
  };
}

// Mapeia o payload para a row da tabela assessments
function toRow(v: WizardPayload, patientId: string, clinicId: string) {
  return {
    clinic_id: clinicId,
    patient_id: patientId,
    professional_id: v.professional_id,
    tipo: v.tipo,
    data: v.data,
    diagnostico_clinico: v.diagnostico_clinico || null,
    medico_responsavel: v.medico_responsavel || null,
    diagnostico_fisio: v.diagnostico_fisio || null,
    diagnosis_codes: v.diagnosis_codes,
    clinical_profiles: v.clinical_profiles,
    queixa_principal: v.queixa_principal || null,
    hma: v.hma || null,
    hmp: v.hmp || null,
    antecedentes_pessoais: v.antecedentes_pessoais || null,
    antecedentes_familiares: v.antecedentes_familiares || null,
    habitos_vida: v.habitos_vida || null,
    medicamentos: v.medicamentos || null,
    inspecao: v.inspecao || null,
    palpacao: v.palpacao || null,
    eva: v.eva == null || Number.isNaN(Number(v.eva)) ? 0 : Number(v.eva),
    objetivos: v.objetivos || null,
    condutas: v.condutas || null,
    recursos_terapeuticos: v.recursos_terapeuticos || null,
    sinais_vitais: {
      nivel_consciencia: v.neuro_consciencia,
      neuro_comunicacao: v.neuro_comunicacao,
      neuro_cognicao: v.neuro_cognicao,
      tonus: v.neuro_tonus,
      neuro_coordenacao: v.neuro_coordenacao,
      neuro_equilibrio: v.neuro_equilibrio,
      orto_dor_movimento: v.orto_dor_movimento,
      orto_limitacoes: v.orto_limitacoes,
      orto_testes: v.orto_testes,
      fr: v.resp_fr,
      spo2: v.resp_spo2,
      resp_oxigenio: v.resp_oxigenio,
      ausculta: v.resp_ausculta,
      tosse: v.resp_tosse,
      resp_dispneia: v.resp_dispneia,
    },
  };
}

type Props = {
  patientId: string;
  patient?: any;
  assessment?: any;
  onDone: () => void;
};

export function AssessmentWizard({ patientId, patient, assessment, onDone }: Props) {
  const isEdit = !!assessment?.id;
  const { clinicId } = useActiveClinic();
  const brand = useBranding();
  const qc = useQueryClient();
  const [stepIdx, setStepIdx] = useState<number>(() => clampStepIndex(assessment?.wizard_step ?? 0));
  const [savingDraft, setSavingDraft] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [appliedTemplates, setAppliedTemplates] = useState<string[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { register, watch, setValue, getValues, handleSubmit, reset, control } = useForm<WizardPayload>({
    defaultValues: fromAssessment(assessment),
  });

  const formValues = watch();
  const ageYears = patient?.data_nascimento ? calcAge(patient.data_nascimento) : null;

  // Catálogos -----------------------------------------------------------------
  const diagnoses = useQuery({
    queryKey: ["catalog_diagnoses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("catalog_diagnoses" as any)
        .select("*")
        .eq("active", true)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as unknown as DiagnosisCatalogItem[];
    },
    staleTime: 5 * 60_000,
  });

  const profs = useQuery({
    queryKey: ["professionals-active", clinicId],
    enabled: !!clinicId,
    queryFn: async () => {
      const { data } = await supabase
        .from("professionals")
        .select("id, nome, profissao, conselho, registro")
        .eq("clinic_id", clinicId!)
        .eq("situacao", "ativo")
        .order("nome");
      return data ?? [];
    },
  });

  // Carregar rascunho salvo ---------------------------------------------------
  useEffect(() => {
    if (isEdit) return;
    let mounted = true;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data } = await supabase
        .from("assessment_drafts" as any)
        .select("payload, wizard_step, updated_at")
        .eq("user_id", u.user.id)
        .eq("patient_id", patientId)
        .is("assessment_id", null)
        .maybeSingle();
      if (mounted && data) {
        const d = data as any;
        reset({ ...emptyPayload(), ...(d.payload || {}) });
        setStepIdx(clampStepIndex(d.wizard_step ?? 0));
        setLastSavedAt(new Date(d.updated_at));
        toast.info("Rascunho recuperado");
      }
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, patientId]);

  // Detecção automática de perfil clínico -------------------------------------
  const detection = useMemo(() => {
    if (!diagnoses.data) return { codes: [], profiles: [] as ClinicalProfile[], items: [] };
    return detectDiagnoses(formValues.diagnostico_clinico, diagnoses.data, ageYears ?? null);
  }, [formValues.diagnostico_clinico, diagnoses.data, ageYears]);

  // Sincroniza perfis detectados ↔ payload (estável)
  useEffect(() => {
    const cur = (getValues("clinical_profiles") ?? []).slice().sort().join(",");
    const det = detection.profiles.slice().sort().join(",");
    if (cur !== det) setValue("clinical_profiles", detection.profiles, { shouldDirty: true });
    const curCodes = (getValues("diagnosis_codes") ?? []).slice().sort().join(",");
    const detCodes = detection.codes.slice().sort().join(",");
    if (curCodes !== detCodes) setValue("diagnosis_codes", detection.codes, { shouldDirty: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detection.profiles.join(","), detection.codes.join(",")]);

  // AUTO-SAVE -----------------------------------------------------------------
  const persistDraft = async (silent = true) => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    setSavingDraft(true);
    try {
      const payload = getValues();
      if (isEdit) {
        const { error } = await supabase
          .from("assessment_drafts" as any)
          .upsert(
            {
              assessment_id: assessment.id,
              patient_id: patientId,
              user_id: u.user.id,
              payload: payload as any,
              wizard_step: stepIdx,
            },
            { onConflict: "assessment_id" },
          );
        if (error) throw error;
      } else {
        // upsert por (user_id, patient_id) — onConflict precisa do índice único parcial,
        // mas aqui usamos delete-then-insert simples para evitar dependência do parser
        const { data: existing } = await supabase
          .from("assessment_drafts" as any)
          .select("id")
          .eq("user_id", u.user.id)
          .eq("patient_id", patientId)
          .is("assessment_id", null)
          .maybeSingle();
        if (existing) {
          await supabase
            .from("assessment_drafts" as any)
            .update({ payload: payload as any, wizard_step: stepIdx })
            .eq("id", (existing as any).id);
        } else {
          await supabase.from("assessment_drafts" as any).insert({
            patient_id: patientId,
            user_id: u.user.id,
            payload: payload as any,
            wizard_step: stepIdx,
          });
        }
      }
      // auditoria
      await supabase.from("assessment_audit_log" as any).insert({
        assessment_id: assessment?.id ?? null,
        patient_id: patientId,
        user_id: u.user.id,
        action: "autosave",
        step: STEPS[clampStepIndex(stepIdx)].key,
      });
      setLastSavedAt(new Date());
      if (!silent) toast.success("Rascunho salvo");
    } catch (e: any) {
      if (!silent) toast.error(e.message);
    } finally {
      setSavingDraft(false);
    }
  };

  // dispara auto-save após pausa de digitação
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void persistDraft(true);
    }, 1500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    JSON.stringify(formValues),
    stepIdx,
  ]);

  // Salvar definitivo / finalizar --------------------------------------------
  const save = useMutation({
    mutationFn: async (finalize: boolean) => {
      const v = getValues();
      if (!clinicId) throw new Error("Clínica ativa não identificada");
      if (!v.professional_id) throw new Error("Selecione o profissional");
      if (finalize && !v.queixa_principal.trim()) throw new Error("Queixa principal obrigatória para finalizar");

      const { data: u } = await supabase.auth.getUser();
      const row = toRow(v, patientId, clinicId);
      const extras: any = {
        wizard_step: stepIdx,
        wizard_completed: finalize,
        last_autosaved_at: new Date().toISOString(),
      };

      let id = assessment?.id as string | undefined;
      if (isEdit) {
        if (finalize) {
          extras.status = "finalizada";
          extras.locked_at = new Date().toISOString();
        }
        const { error } = await supabase.from("assessments").update({ ...row, ...extras } as any).eq("clinic_id", clinicId).eq("id", id!);
        if (error) throw error;
      } else {
        const insertRow: any = {
          ...row,
          ...extras,
          created_by: u.user?.id,
          status: finalize ? "finalizada" : "rascunho",
          locked_at: finalize ? new Date().toISOString() : null,
        };
        const { data, error } = await supabase.from("assessments").insert(insertRow).select("id").single();
        if (error) throw error;
        id = (data as any).id;
      }

      await supabase.from("assessment_audit_log" as any).insert({
        assessment_id: id,
        patient_id: patientId,
        user_id: u.user?.id,
        action: finalize ? "finalize" : isEdit ? "update" : "create",
        step: STEPS[clampStepIndex(stepIdx)].key,
        details: { profiles: v.clinical_profiles, diagnoses: v.diagnosis_codes },
      });

      // limpa rascunho da nova avaliação
      if (!isEdit && u.user) {
        await supabase
          .from("assessment_drafts" as any)
          .delete()
          .eq("user_id", u.user.id)
          .eq("patient_id", patientId)
          .is("assessment_id", null);
      }
    },
    onSuccess: (_d, finalize) => {
      toast.success(finalize ? "Avaliação finalizada" : "Avaliação salva");
      qc.invalidateQueries({ queryKey: ["assessments", clinicId, patientId] });
      onDone();
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Aplicar template de diagnóstico ------------------------------------------
  const applyTemplate = (d: DiagnosisCatalogItem) => {
    const cur = getValues();
    const append = (existing: string, addition: string | null) => {
      if (!addition) return existing;
      if (existing && existing.includes(addition)) return existing;
      return [existing, addition].filter(Boolean).join("\n\n");
    };
    setValue("hma", append(cur.hma, d.template_anamnese), { shouldDirty: true });
    setValue("objetivos", append(cur.objetivos, d.template_objetivos), { shouldDirty: true });
    setValue("condutas", append(cur.condutas, d.template_condutas), { shouldDirty: true });
    setAppliedTemplates((arr) => Array.from(new Set([...arr, d.code])));
    toast.success(`Modelo "${d.label}" aplicado`);
    void supabase.auth.getUser().then(({ data: u }) => {
      supabase.from("assessment_audit_log" as any).insert({
        assessment_id: assessment?.id ?? null,
        patient_id: patientId,
        user_id: u.user?.id,
        action: "template_applied",
        step: STEPS[clampStepIndex(stepIdx)].key,
        details: { code: d.code, label: d.label },
      });
    });
  };

  const goNext = () => setStepIdx((i) => Math.min(STEPS.length - 1, i + 1));
  const goPrev = () => setStepIdx((i) => Math.max(0, i - 1));

  const progress = ((stepIdx + 1) / STEPS.length) * 100;
  const current = STEPS[clampStepIndex(stepIdx)] ?? STEPS[0];
  const profiles = formValues.clinical_profiles ?? [];

  const profName = useMemo(
    () => (profs.data ?? []).find((p) => p.id === formValues.professional_id)?.nome ?? "—",
    [profs.data, formValues.professional_id],
  );

  const profSpecialty = useMemo(() => {
    const prof = (profs.data ?? []).find((p) => p.id === formValues.professional_id);
    if (profiles.length > 0) return PROFILE_LABEL[profiles[0]];
    return prof?.profissao?.trim() || "Fisioterapia";
  }, [profs.data, formValues.professional_id, profiles]);

  const assessmentStatus = assessment?.locked_at
    ? "finalizada"
    : (assessment?.status ?? "rascunho");

  const statusDisplay =
    assessmentStatus === "finalizada" ? "Finalizada" : assessmentStatus === "rascunho" ? "Rascunho" : assessmentStatus;

  const stepStates = useMemo(
    () => STEPS.map((s) => getStepFillState(s.key, formValues)),
    [formValues],
  );

  const bootLoading = diagnoses.isLoading || profs.isLoading;

  if (bootLoading) {
    return <ClinicalSkeleton variant="wizard" />;
  }

  return (
    <div className="assessment-wizard dashboard-premium clinical-module space-y-5 pb-6">
      <PageHero
        title={formValues.tipo === "reavaliacao" ? "Reavaliação clínica" : "Avaliação clínica"}
        clinicName={patient?.nome_completo ?? "Paciente"}
        dateLabel={`${fmtDate(formValues.data)} · ${profName}`}
        primaryColor={brand.primaryColor}
        secondaryColor={brand.secondaryColor}
        daySummary={[
          { label: "paciente", value: patient?.nome_completo ?? "—" },
          { label: "especialidade", value: profSpecialty },
          { label: "status", value: statusDisplay },
        ]}
      />

      <section className="assessment-wizard-progress rounded-2xl border border-[rgba(15,76,92,0.1)] bg-white/85 px-5 py-4 shadow-[var(--fos-card-shadow)] sm:px-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[rgba(15,76,92,0.08)] text-[var(--fos-primary)]">
                <current.icon className="h-4 w-4" strokeWidth={2.25} aria-hidden />
              </span>
              <div>
                <h2 className="text-base font-bold tracking-tight text-slate-950 sm:text-lg">{current.label}</h2>
                <p className="text-xs text-slate-500">
                  Etapa {stepIdx + 1} de {STEPS.length} · {Math.round(progress)}% concluído
                </p>
              </div>
            </div>
          </div>
          <AutosaveIndicator saving={savingDraft} lastSavedAt={lastSavedAt} />
        </div>
        <div className="flex gap-1.5" role="progressbar" aria-valuenow={stepIdx + 1} aria-valuemin={1} aria-valuemax={STEPS.length}>
          {STEPS.map((s, i) => (
            <div
              key={s.key}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-all duration-300",
                i < stepIdx
                  ? "bg-[var(--fos-primary)]"
                  : i === stepIdx
                    ? "bg-[var(--fos-primary)]/70"
                    : "bg-slate-200/90",
              )}
              title={s.label}
            />
          ))}
        </div>
        {profiles.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5 border-t border-[rgba(15,76,92,0.06)] pt-3">
            {profiles.map((p) => (
              <Badge key={p} variant="outline" className={cn("text-[10px]", PROFILE_COLOR[p])}>
                {PROFILE_LABEL[p]}
              </Badge>
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[240px_minmax(0,1fr)_260px]">
        <WizardStepNav
          steps={STEPS}
          currentIdx={stepIdx}
          stepStates={stepStates}
          onSelect={setStepIdx}
          className="hidden lg:block"
        />

        <div className="min-w-0 space-y-5">
          <WizardStepNav
            steps={STEPS}
            currentIdx={stepIdx}
            stepStates={stepStates}
            onSelect={setStepIdx}
            className="lg:hidden"
            compact
          />

          <div className="assessment-wizard-step space-y-5 rounded-2xl border border-[rgba(15,76,92,0.1)] bg-white/90 p-4 shadow-[var(--fos-card-shadow)] sm:p-6">
          {current.key === "identificacao" && (
            <StepIdentificacao
              values={formValues}
              setValue={setValue}
              register={register}
              profs={profs.data ?? []}
              patient={patient}
              ageYears={ageYears}
            />
          )}
          {current.key === "diagnostico" && (
            <StepDiagnostico
              values={formValues}
              register={register}
              detection={detection}
              catalog={diagnoses.data ?? []}
              applyTemplate={applyTemplate}
              applied={appliedTemplates}
            />
          )}
          {current.key === "anamnese" && <StepAnamnese register={register} values={formValues} />}
          {current.key === "exame" && (
            <StepExame
              register={register}
              values={formValues}
              setValue={setValue}
              control={control}
              profiles={profiles}
            />
          )}
          {current.key === "escalas" && (
            <InfoCard className={ASSESSMENT_STEP_CARD} icon={ClipboardList} title="Escalas clínicas" description="Instrumentos de mensuração vinculados ao paciente.">
              <ClinicalTabs patientId={patientId} assessmentId={assessment?.id} />
            </InfoCard>
          )}
          {current.key === "plano" && (
            <StepPlano register={register} suggested={detection.items.flatMap((d) => d.suggested_objectives)} />
          )}
          {current.key === "assinaturas" && (
            <PlaceholderPhase
              title="Assinaturas digitais"
              phase="Fase 4"
              description="Captura de assinatura por toque/mouse para fisioterapeuta, paciente e responsável, com selo de data/hora e bloqueio da avaliação ao assinar."
            />
          )}
          </div>
        </div>

        <PreviousAssessmentsPanel
          patientId={patientId}
          currentId={assessment?.id}
          className="hidden xl:block"
        />
      </div>

      <div className="assessment-wizard-footer sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[rgba(15,76,92,0.1)] bg-white/95 px-4 py-3.5 shadow-[0_-8px_28px_-12px_rgba(15,76,92,0.18)] backdrop-blur-sm sm:px-5">
        <ActionButton variant="secondary" onClick={goPrev} disabled={stepIdx === 0} className="h-10 gap-2 px-4 text-sm">
          <ArrowLeft className="h-4 w-4" />
          Anterior
        </ActionButton>
        <div className="flex flex-wrap gap-2">
          <ActionButton
            variant="secondary"
            onClick={() => persistDraft(false)}
            disabled={savingDraft}
            className="h-10 gap-2 px-4 text-sm"
          >
            {savingDraft ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar
          </ActionButton>
          {stepIdx < STEPS.length - 1 ? (
            <ActionButton onClick={goNext} className="h-10 gap-2 px-4 text-sm" style={{ background: brand.primaryColor }}>
              Próximo
              <ArrowRight className="h-4 w-4" />
            </ActionButton>
          ) : (
            <>
              <ActionButton
                variant="secondary"
                onClick={() => save.mutate(false)}
                disabled={save.isPending}
                className="h-10 gap-2 px-4 text-sm"
              >
                {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Salvar
              </ActionButton>
              <ActionButton
                onClick={() => save.mutate(true)}
                disabled={save.isPending}
                className="h-10 gap-2 px-4 text-sm"
                style={{ background: brand.primaryColor }}
              >
                <CheckCircle2 className="h-4 w-4" />
                Finalizar
              </ActionButton>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// PREMIUM SHELL
// ============================================================================

type StepFillState = "empty" | "partial" | "complete";

function getStepFillState(key: StepKey, v: WizardPayload): StepFillState {
  switch (key) {
    case "identificacao":
      return v.professional_id ? "complete" : "empty";
    case "diagnostico":
      return v.diagnostico_clinico?.trim() || v.diagnostico_fisio?.trim() ? "complete" : "empty";
    case "anamnese":
      if (v.queixa_principal?.trim()) return "complete";
      if (v.hma?.trim() || v.hmp?.trim()) return "partial";
      return "empty";
    case "exame":
      if (v.eva > 0 || v.inspecao?.trim() || v.palpacao?.trim()) return "partial";
      if (v.neuro_consciencia?.trim() || v.orto_dor_movimento?.trim() || v.resp_fr?.trim())
        return "partial";
      return "empty";
    case "escalas":
      return "partial";
    case "plano":
      return v.objetivos?.trim() || v.condutas?.trim() ? "complete" : "empty";
    case "assinaturas":
      return "empty";
    default:
      return "empty";
  }
}

function WizardStepNav({
  steps,
  currentIdx,
  stepStates,
  onSelect,
  className,
  compact,
}: {
  steps: typeof STEPS;
  currentIdx: number;
  stepStates: StepFillState[];
  onSelect: (idx: number) => void;
  className?: string;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div className={cn("flex gap-2 overflow-x-auto pb-1", className)} role="tablist" aria-label="Etapas">
        {steps.map((s, i) => {
          const Icon = s.icon;
          const state = stepStates[i];
          return (
            <button
              key={s.key}
              type="button"
              role="tab"
              aria-selected={i === currentIdx}
              onClick={() => onSelect(i)}
              className={cn(
                "inline-flex shrink-0 items-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-semibold transition-all",
                i === currentIdx
                  ? "border-[var(--fos-primary)]/30 bg-[var(--fos-primary)] text-white shadow-sm"
                  : state === "complete"
                    ? "border-emerald-200/80 bg-emerald-50/80 text-emerald-800"
                    : "border-[rgba(15,76,92,0.1)] bg-white/80 text-slate-600 hover:border-[rgba(15,76,92,0.18)]",
              )}
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/20 text-[10px] font-bold tabular-nums">
                {i + 1}
              </span>
              <Icon className="h-3.5 w-3.5" />
              {s.label}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <nav className={cn("assessment-wizard-nav space-y-1.5", className)} aria-label="Etapas da avaliação">
      {steps.map((s, i) => {
        const Icon = s.icon;
        const state = stepStates[i];
        const isActive = i === currentIdx;
        return (
          <button
            key={s.key}
            type="button"
            onClick={() => onSelect(i)}
            className={cn(
              "group flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left text-sm transition-all duration-200",
              isActive
                ? "border-[var(--fos-primary)]/25 bg-[rgba(15,76,92,0.06)] font-semibold text-[var(--fos-primary)] shadow-sm"
                : "border-transparent text-slate-600 hover:border-[rgba(15,76,92,0.1)] hover:bg-white/80",
            )}
          >
            <span
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold tabular-nums transition-colors",
                isActive
                  ? "bg-[var(--fos-primary)] text-white"
                  : state === "complete"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-slate-100 text-slate-500 group-hover:bg-slate-200/80",
              )}
            >
              {state === "complete" && !isActive ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                i + 1
              )}
            </span>
            <span className="flex min-w-0 flex-1 items-center gap-2">
              <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-[var(--fos-primary)]" : "text-slate-400")} />
              <span className="truncate">{s.label}</span>
            </span>
            {state === "partial" && (
              <Circle className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" />
            )}
          </button>
        );
      })}
    </nav>
  );
}

function PreviousAssessmentsPanel({
  patientId,
  currentId,
  className,
}: {
  patientId: string;
  currentId?: string;
  className?: string;
}) {
  const { clinicId } = useActiveClinic();
  const history = useQuery({
    queryKey: ["assessment-history", clinicId, patientId, currentId],
    enabled: !!clinicId && !!patientId,
    queryFn: async () => {
      let q = supabase
        .from("assessments")
        .select("id, data, tipo, status, locked_at, diagnostico_clinico, professionals(nome)")
        .eq("clinic_id", clinicId!)
        .eq("patient_id", patientId)
        .order("data", { ascending: false })
        .limit(6);
      if (currentId) q = q.neq("id", currentId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <aside className={className}>
      <InfoCard className={ASSESSMENT_STEP_CARD} icon={History} title="Avaliações anteriores" description="Histórico resumido do paciente.">
        {history.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-lg" />
            ))}
          </div>
        ) : !history.data?.length ? (
          <EmptyState
            icon={History}
            title="Primeira avaliação"
            description="Não há avaliações anteriores registradas para este paciente."
            className="py-6"
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {(history.data as any[]).map((a) => (
              <li key={a.id} className="py-3 first:pt-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold tabular-nums text-primary">{fmtDate(a.data)}</div>
                    <div className="mt-0.5 truncate text-sm font-medium capitalize">{a.tipo ?? "avaliação"}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {a.diagnostico_clinico?.slice(0, 60) || a.professionals?.nome || "—"}
                    </div>
                  </div>
                  <StatusBadge variant={a.locked_at ? "success" : "warning"}>
                    {a.locked_at ? "Finalizada" : "Rascunho"}
                  </StatusBadge>
                </div>
                <Link
                  to="/app/pacientes/$id"
                  params={{ id: patientId }}
                  className="mt-2 inline-block text-xs font-medium text-primary hover:underline"
                >
                  Ver no prontuário →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </InfoCard>
    </aside>
  );
}

// ============================================================================
// STEPS
// ============================================================================

function StepIdentificacao({ values, setValue, register, profs, patient, ageYears }: any) {
  return (
    <div className="space-y-5">
      <InfoCard className={ASSESSMENT_STEP_CARD} icon={User} title="Identificação" description="Profissional responsável e dados da sessão.">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <FieldLabel required filled={!!values.professional_id}>
              Profissional
            </FieldLabel>
            <Select
              value={values.professional_id}
              onValueChange={(v) => setValue("professional_id", v, { shouldDirty: true })}
            >
              <SelectTrigger className={cn(ASSESSMENT_INPUT, !values.professional_id && "border-destructive ring-1 ring-destructive/30")}>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {profs.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!values.professional_id && (
              <p className="mt-1 text-[11px] text-destructive">Campo obrigatório</p>
            )}
          </div>
          <div>
            <FieldLabel>Tipo</FieldLabel>
            <Select value={values.tipo} onValueChange={(v) => setValue("tipo", v, { shouldDirty: true })}>
              <SelectTrigger className={ASSESSMENT_INPUT}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="avaliacao">Avaliação</SelectItem>
                <SelectItem value="reavaliacao">Reavaliação</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <FieldLabel required filled={!!values.data}>
              Data
            </FieldLabel>
            <Input type="date" className={ASSESSMENT_INPUT} {...register("data")} />
          </div>
        </div>
      </InfoCard>
      {patient && (
        <InfoCard className={ASSESSMENT_STEP_CARD} icon={User} title="Dados do paciente" description="Referência rápida do cadastro.">
          <div className="grid gap-3 sm:grid-cols-3 text-sm">
            <Info label="Paciente" value={patient.nome_completo} />
            <Info label="Idade" value={ageYears != null ? `${ageYears} anos` : "—"} />
            <Info label="Sexo" value={patient.sexo ?? "—"} />
          </div>
        </InfoCard>
      )}
    </div>
  );
}

function StepDiagnostico({ values, register, detection, catalog, applyTemplate, applied }: any) {
  const suggestions: DiagnosisCatalogItem[] = detection.items;
  return (
    <div className="space-y-5">
      <InfoCard className={ASSESSMENT_STEP_CARD} icon={Stethoscope} title="Diagnóstico clínico" description="CID, descrição e diagnóstico fisioterapêutico.">
        <div className="space-y-5">
          <div>
            <FieldLabel filled={!!values.diagnostico_clinico?.trim()}>Diagnóstico clínico (CID / descrição)</FieldLabel>
            <Textarea
              rows={3}
              className={ASSESSMENT_TEXTAREA}
              placeholder="Ex.: AVC isquêmico em território de ACM esquerda, com hemiparesia direita"
              {...register("diagnostico_clinico")}
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Conforme você digita, o sistema detecta o perfil clínico e sugere modelos clínicos.
            </p>
          </div>
          <div className="grid w-full min-w-0 gap-4 sm:grid-cols-2">
            <div className="min-w-0 w-full">
              <FieldLabel>Médico responsável</FieldLabel>
              <Input className={cn(ASSESSMENT_TEXTAREA, "h-11")} placeholder="Nome / CRM" {...register("medico_responsavel")} />
            </div>
            <div className="min-w-0 w-full">
              <FieldLabel>Diagnóstico fisioterapêutico</FieldLabel>
              <Input className={cn(ASSESSMENT_TEXTAREA, "h-11")} placeholder="Ex.: hemiparesia direita pós-AVC" {...register("diagnostico_fisio")} />
            </div>
          </div>
        </div>
      </InfoCard>

      <InfoCard
        className={ASSESSMENT_STEP_CARD}
        icon={Sparkles}
        title="Biblioteca de modelos clínicos"
        description={`${catalog.length} modelos disponíveis para aplicar na anamnese e plano.`}
      >
        {catalog.length === 0 ? (
          <EmptyState icon={Sparkles} title="Biblioteca vazia" description="Nenhum modelo clínico cadastrado no catálogo." className="py-6" />
        ) : (
          <>
            {suggestions.length > 0 && (
              <div className="mb-4">
                <p className="mb-2 text-xs text-muted-foreground">Sugeridos pelo diagnóstico:</p>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((d) => (
                    <Button
                      key={d.code}
                      size="sm"
                      variant={applied.includes(d.code) ? "secondary" : "default"}
                      className="rounded-xl"
                      onClick={() => applyTemplate(d)}
                    >
                      <Sparkles className="mr-1 h-3 w-3" />
                      {d.label}
                      {applied.includes(d.code) && <CheckCircle2 className="ml-1 h-3 w-3" />}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            <Accordion type="single" collapsible>
              <AccordionItem value="all" className="border-none">
                <AccordionTrigger className="rounded-xl border px-3 py-2 text-xs hover:no-underline">
                  Ver biblioteca completa
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid max-h-72 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                    {catalog.map((d: DiagnosisCatalogItem) => (
                      <button
                        key={d.code}
                        type="button"
                        onClick={() => applyTemplate(d)}
                        className="rounded-xl border border-slate-200 p-3 text-left transition hover:border-primary/30 hover:bg-primary/5"
                      >
                        <div className="text-sm font-medium">{d.label}</div>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {d.clinical_profiles.map((p) => (
                            <Badge key={p} variant="outline" className={`text-[10px] ${PROFILE_COLOR[p as ClinicalProfile]}`}>
                              {PROFILE_LABEL[p as ClinicalProfile]}
                            </Badge>
                          ))}
                        </div>
                      </button>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </>
        )}
      </InfoCard>
    </div>
  );
}

function StepAnamnese({ register, values }: any) {
  return (
    <div className="space-y-5 w-full min-w-0">
      <InfoCard className={ASSESSMENT_STEP_CARD} icon={FileText} title="Queixa principal" description="Motivo da consulta e início do atendimento.">
        <FieldLabel required filled={!!values.queixa_principal?.trim()}>
          Queixa principal
        </FieldLabel>
        <Textarea
          rows={2}
          className={cn(ASSESSMENT_TEXTAREA, !values.queixa_principal?.trim() && "border-destructive/50")}
          {...register("queixa_principal")}
        />
        {!values.queixa_principal?.trim() && (
          <p className="mt-1 text-[11px] text-destructive">Obrigatório para finalizar a avaliação</p>
        )}
      </InfoCard>
      <InfoCard className={ASSESSMENT_STEP_CARD} icon={FileText} title="História da moléstia atual (HMA)">
        <Textarea rows={4} className={ASSESSMENT_TEXTAREA} {...register("hma")} />
      </InfoCard>
      <InfoCard className={ASSESSMENT_STEP_CARD} icon={FileText} title="História da moléstia pregressa (HMP)">
        <Textarea rows={3} className={ASSESSMENT_TEXTAREA} {...register("hmp")} />
      </InfoCard>
      <InfoCard className={ASSESSMENT_STEP_CARD} icon={FileText} title="Antecedentes pessoais e familiares">
        <div className="grid w-full min-w-0 gap-3 sm:grid-cols-2">
          <div className="min-w-0 w-full">
            <FieldLabel>Pessoais</FieldLabel>
            <Textarea rows={3} className={ASSESSMENT_TEXTAREA} {...register("antecedentes_pessoais")} />
          </div>
          <div className="min-w-0 w-full">
            <FieldLabel>Familiares</FieldLabel>
            <Textarea rows={3} className={ASSESSMENT_TEXTAREA} {...register("antecedentes_familiares")} />
          </div>
        </div>
      </InfoCard>
      <InfoCard className={ASSESSMENT_STEP_CARD} icon={FileText} title="Medicamentos e hábitos">
        <div className="grid w-full min-w-0 gap-3 sm:grid-cols-2">
          <div className="min-w-0 w-full">
            <FieldLabel>Medicamentos em uso</FieldLabel>
            <Textarea rows={3} className={ASSESSMENT_TEXTAREA} {...register("medicamentos")} />
          </div>
          <div className="min-w-0 w-full">
            <FieldLabel>Hábitos de vida</FieldLabel>
            <Textarea rows={3} className={ASSESSMENT_TEXTAREA} {...register("habitos_vida")} />
          </div>
        </div>
      </InfoCard>
    </div>
  );
}

function StepExame({ register, values, setValue, control, profiles }: any) {
  const show = (p: ClinicalProfile) => profiles?.includes(p);
  return (
    <div className="space-y-5">
      <InfoCard className={ASSESSMENT_STEP_CARD} icon={Activity} title="Avaliação geral" description="EVA, inspeção e palpação.">
        <div className="space-y-5">
          <Controller
            control={control}
            name="eva"
            render={({ field }) => (
              <EvaScale
                label="EVA — Dor"
                value={Number(field.value ?? 0)}
                onChange={(v) => {
                  const n = Number(v);
                  const normalizedValue = Number.isFinite(n) ? Math.min(10, Math.max(0, Math.round(n))) : 0;
                  field.onChange(normalizedValue);
                  setValue("eva", normalizedValue, {
                    shouldDirty: true,
                    shouldTouch: true,
                    shouldValidate: false,
                  });
                }}
              />
            )}
          />
          <div className="grid w-full min-w-0 gap-4 sm:grid-cols-2">
            <Field label="Inspeção" reg={register("inspecao")} />
            <Field label="Palpação" reg={register("palpacao")} />
          </div>
        </div>
      </InfoCard>

      {show("neuro") && (
        <InfoCard className={ASSESSMENT_STEP_CARD} icon={Activity} title="Avaliação neurológica" description="Perfil neuro detectado automaticamente.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nível de consciência" reg={register("neuro_consciencia")} />
            <Field label="Comunicação" reg={register("neuro_comunicacao")} />
            <Field label="Cognição" reg={register("neuro_cognicao")} />
            <Field label="Tônus muscular (Ashworth)" reg={register("neuro_tonus")} />
            <Field label="Coordenação" reg={register("neuro_coordenacao")} />
            <Field label="Equilíbrio" reg={register("neuro_equilibrio")} />
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Escalas detalhadas (MRC, Ashworth, Berg) na etapa Escalas.
          </p>
        </InfoCard>
      )}

      {show("orto") && (
        <InfoCard className={ASSESSMENT_STEP_CARD} icon={Activity} title="Avaliação ortopédica">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Dor por movimento" reg={register("orto_dor_movimento")} />
            <Field label="Limitações funcionais" reg={register("orto_limitacoes")} />
            <Field label="Testes especiais" reg={register("orto_testes")} multiline />
          </div>
        </InfoCard>
      )}

      {show("respiratorio") && (
        <InfoCard className={ASSESSMENT_STEP_CARD} icon={Activity} title="Avaliação respiratória">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="FR (irpm)" reg={register("resp_fr")} />
            <Field label="SpO₂ (%)" reg={register("resp_spo2")} />
            <Field label="Uso de O₂" reg={register("resp_oxigenio")} />
            <Field label="Ausculta pulmonar" reg={register("resp_ausculta")} />
            <Field label="Tosse" reg={register("resp_tosse")} />
            <Field label="Dispneia (mMRC)" reg={register("resp_dispneia")} />
          </div>
        </InfoCard>
      )}

      {profiles?.length === 0 && (
        <EmptyState
          icon={AlertCircle}
          title="Perfis clínicos não detectados"
          description="Preencha o diagnóstico clínico na etapa anterior para exibir seções específicas (Neuro, Orto, Respiratório)."
          className="py-8"
        />
      )}
    </div>
  );
}

function StepPlano({ register, suggested }: any) {
  const uniqueSuggested: string[] = Array.from(new Set(suggested ?? []));
  return (
    <div className="space-y-5">
      {uniqueSuggested.length > 0 && (
        <InfoCard className={ASSESSMENT_STEP_CARD} icon={Sparkles} title="Objetivos sugeridos" description="Baseados no diagnóstico detectado.">
          <div className="flex flex-wrap gap-1.5">
            {uniqueSuggested.map((o) => (
              <Badge key={o} variant="secondary" className="rounded-lg">
                {o.replace(/_/g, " ")}
              </Badge>
            ))}
          </div>
        </InfoCard>
      )}
      <InfoCard className={ASSESSMENT_STEP_CARD} icon={Target} title="Plano terapêutico" description="Objetivos, condutas e recursos.">
        <div className="space-y-4 w-full min-w-0">
          <div className="w-full min-w-0">
            <FieldLabel>Objetivos terapêuticos</FieldLabel>
            <Textarea rows={4} className={ASSESSMENT_TEXTAREA} {...register("objetivos")} />
          </div>
          <div className="w-full min-w-0">
            <FieldLabel>Condutas</FieldLabel>
            <Textarea rows={4} className={ASSESSMENT_TEXTAREA} {...register("condutas")} />
          </div>
          <div className="w-full min-w-0">
            <FieldLabel>Recursos terapêuticos</FieldLabel>
            <Textarea rows={3} className={ASSESSMENT_TEXTAREA} {...register("recursos_terapeuticos")} />
          </div>
        </div>
      </InfoCard>
    </div>
  );
}

function PlaceholderPhase({
  title, phase, description, scales,
}: { title: string; phase: string; description: string; scales?: string[] }) {
  const uniqueScales = scales ? Array.from(new Set(scales)) : [];
  return (
    <InfoCard className={cn(ASSESSMENT_STEP_CARD, "border-dashed")} icon={Pen} title={title} description={description}>
      <div className="text-center">
        <Badge variant="outline" className="mx-auto">{phase}</Badge>
        {uniqueScales.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-xs text-muted-foreground">Escalas habilitadas para este paciente:</p>
            <div className="flex flex-wrap justify-center gap-1.5">
              {uniqueScales.map((s) => (
                <Badge key={s} variant="secondary" className="uppercase">{s}</Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </InfoCard>
  );
}

// helpers --------------------------------------------------------------------

function Field({ label, reg, multiline }: { label: string; reg: any; multiline?: boolean }) {
  return (
    <div className="w-full min-w-0">
      <FieldLabel>{label}</FieldLabel>
      {multiline ? (
        <Textarea rows={2} className={ASSESSMENT_TEXTAREA} {...reg} />
      ) : (
        <Input className={ASSESSMENT_TEXTAREA} {...reg} />
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-xl border border-[rgba(15,76,92,0.06)] bg-[rgba(15,76,92,0.02)] px-3 py-2.5">
      <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</div>
      <div className="mt-1 text-sm font-medium text-slate-800">{value ?? "—"}</div>
    </div>
  );
}

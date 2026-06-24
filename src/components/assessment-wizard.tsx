import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "sonner";
import {
  ArrowLeft, ArrowRight, CheckCircle2, Loader2, Sparkles, FileText, Stethoscope,
  ClipboardList, Activity, Target, Pen, User, Save, AlertCircle,
} from "lucide-react";
import { calcAge } from "@/lib/format";
import {
  detectDiagnoses, PROFILE_COLOR, PROFILE_LABEL,
  type ClinicalProfile, type DiagnosisCatalogItem,
} from "@/lib/clinical-profiles";
import { useActiveClinic } from "@/lib/active-clinic";
import { ClinicalTabs } from "@/components/clinical/clinical-tabs";
import { buildAssessmentAuditDetails, mergeAssessmentUpdate } from "@/lib/assessment-merge";
import { validateProfessionalForDoc } from "@/lib/professional-resolver";
import { SignaturePad } from "@/components/clinical/signature-pad";

const STEPS = [
  { key: "identificacao", label: "Identificação", icon: User },
  { key: "diagnostico", label: "Diagnóstico", icon: Stethoscope },
  { key: "anamnese", label: "Anamnese", icon: FileText },
  { key: "exame", label: "Exame Físico", icon: Activity },
  { key: "escalas", label: "Escalas", icon: ClipboardList },
  { key: "plano", label: "Plano Terapêutico", icon: Target },
  { key: "assinaturas", label: "Assinaturas", icon: Pen },
] as const;

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
  eva: number | null;
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
  eva: null,
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
    eva: a.eva ?? null,
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
    eva: v.eva,
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
  const qc = useQueryClient();
  const [stepIdx, setStepIdx] = useState<number>(assessment?.wizard_step ?? 0);
  const [savingDraft, setSavingDraft] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [appliedTemplates, setAppliedTemplates] = useState<string[]>([]);
  const [draftAssessmentId, setDraftAssessmentId] = useState<string | null>(assessment?.id ?? null);
  const [creatingAssessmentDraft, setCreatingAssessmentDraft] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { register, watch, setValue, getValues, handleSubmit, reset } = useForm<WizardPayload>({
    defaultValues: fromAssessment(assessment),
  });

  const formValues = watch();
  const ageYears = patient?.data_nascimento ? calcAge(patient.data_nascimento) : null;
  const activeAssessmentId = assessment?.id ?? draftAssessmentId ?? undefined;

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
        .select("id, nome, profissao, conselho, registro, situacao, profile_id")
        .eq("clinic_id", clinicId!)
        .eq("situacao", "ativo")
        .order("nome");
      return data ?? [];
    },
  });

  const selectedProfessional = profs.data?.find((p) => p.id === formValues.professional_id) ?? null;
  const signatures = useQuery({
    queryKey: ["sigs", clinicId, patientId, activeAssessmentId],
    enabled: !!clinicId && !!patientId && !!activeAssessmentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clinical_signatures")
        .select("id, signer_role")
        .eq("patient_id", patientId)
        .eq("assessment_id", activeAssessmentId!)
        .eq("signer_role", "profissional")
        .limit(1);
      if (error) throw error;
      return data ?? [];
    },
  });

  const ensureAssessmentRecord = async () => {
    if (activeAssessmentId || creatingAssessmentDraft) return activeAssessmentId ?? null;
    if (!clinicId) throw new Error("Clínica ativa não identificada");
    const v = getValues();
    if (!v.professional_id) {
      throw new Error("Selecione o profissional antes de registrar instrumentos clínicos.");
    }
    setCreatingAssessmentDraft(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const insertRow: any = {
        ...toRow(v, patientId, clinicId),
        wizard_step: stepIdx,
        wizard_completed: false,
        last_autosaved_at: new Date().toISOString(),
        created_by: u.user?.id,
        status: "rascunho",
        locked_at: null,
      };
      const { data, error } = await supabase
        .from("assessments")
        .insert(insertRow)
        .select("id")
        .single();
      if (error) throw error;
      const id = (data as any).id as string;
      setDraftAssessmentId(id);
      await supabase.from("assessment_audit_log" as any).insert({
        assessment_id: id,
        patient_id: patientId,
        user_id: u.user?.id,
        action: "create",
        step: STEPS[stepIdx].key,
        details: { source: "assessment-wizard", reason: "ensure-assessment-before-clinical-tabs" },
      });
      return id;
    } finally {
      setCreatingAssessmentDraft(false);
    }
  };

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
        setStepIdx(d.wizard_step ?? 0);
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
      const draftId = assessment?.id ?? draftAssessmentId;
      if (isEdit || draftId) {
        const { error } = await supabase
          .from("assessment_drafts" as any)
          .upsert(
            {
              assessment_id: draftId,
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
        assessment_id: assessment?.id ?? draftAssessmentId ?? null,
        patient_id: patientId,
        user_id: u.user.id,
        action: "autosave",
        step: STEPS[stepIdx].key,
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

  useEffect(() => {
    if (STEPS[stepIdx].key !== "escalas" || activeAssessmentId) return;
    void ensureAssessmentRecord().catch((e: any) => {
      toast.error(e.message);
      setStepIdx(0);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIdx, activeAssessmentId]);

  // Salvar definitivo / finalizar --------------------------------------------
  const save = useMutation({
    mutationFn: async (finalize: boolean) => {
      const v = getValues();
      if (!clinicId) throw new Error("Clínica ativa não identificada");
      if (!v.professional_id) throw new Error("Selecione o profissional");
      if (finalize) {
        const validation = validateProfessionalForDoc(selectedProfessional as any);
        if (validation.status !== "ok") throw new Error(validation.message);
        if (!activeAssessmentId) throw new Error("Salve a avaliação antes de registrar a assinatura profissional.");
        if (!signatures.data?.some((s) => s.signer_role === "profissional")) {
          throw new Error("Registre a assinatura do profissional responsável antes de finalizar.");
        }
        const missing = [
          !v.queixa_principal.trim() ? "Queixa principal" : null,
          !v.diagnostico_fisio.trim() ? "Diagnóstico fisioterapêutico" : null,
          !v.objetivos.trim() ? "Objetivos terapêuticos" : null,
          !v.condutas.trim() ? "Plano de tratamento" : null,
        ].filter(Boolean);
        if (missing.length) throw new Error(`Para finalizar, preencha: ${missing.join(", ")}.`);
      }

      const { data: u } = await supabase.auth.getUser();
      const row = toRow(v, patientId, clinicId);
      const extras: any = {
        wizard_step: stepIdx,
        wizard_completed: finalize,
        last_autosaved_at: new Date().toISOString(),
      };

      let id = activeAssessmentId;
      const hadAssessmentId = !!id;
      let auditDetails: Record<string, any> = {
        source: "assessment-wizard",
        finalize,
        changed_fields: Object.keys({ ...row, ...extras }),
        preserved_fields: [],
        profiles: v.clinical_profiles,
        diagnoses: v.diagnosis_codes,
      };
      if (id) {
        if (finalize) {
          extras.status = "finalizada";
          extras.locked_at = new Date().toISOString();
        }
        const patch = { ...row, ...extras };
        const { data: current, error: loadErr } = await supabase
          .from("assessments")
          .select("*")
          .eq("clinic_id", clinicId)
          .eq("id", id)
          .maybeSingle();
        if (loadErr) throw loadErr;
        if (!current) throw new Error("Avaliação não encontrada para atualização.");
        const merged = mergeAssessmentUpdate(current, patch, { source: "wizard" });
        auditDetails = {
          ...buildAssessmentAuditDetails({
            existing: current,
            merged,
            patch,
            source: "wizard",
            finalize,
          }),
          profiles: v.clinical_profiles,
          diagnoses: v.diagnosis_codes,
        };
        const { error } = await supabase.from("assessments").update(merged as any).eq("clinic_id", clinicId).eq("id", id);
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
        action: finalize ? "finalize" : hadAssessmentId ? "update" : "create",
        step: STEPS[stepIdx].key,
        details: auditDetails,
      });

      // limpa rascunho da nova avaliação
      if (!isEdit && u.user) {
        await supabase
          .from("assessment_drafts" as any)
          .delete()
          .eq("user_id", u.user.id)
          .eq("patient_id", patientId)
          .or(`assessment_id.is.null,assessment_id.eq.${id}`);
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
        step: STEPS[stepIdx].key,
        details: { code: d.code, label: d.label },
      });
    });
  };

  const goNext = () => setStepIdx((i) => Math.min(STEPS.length - 1, i + 1));
  const goPrev = () => setStepIdx((i) => Math.max(0, i - 1));

  const progress = ((stepIdx + 1) / STEPS.length) * 100;
  const current = STEPS[stepIdx];
  const profiles = formValues.clinical_profiles ?? [];

  return (
    <div className="space-y-4 pb-4">
      {/* HEADER */}
      <div className="sticky top-0 z-10 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 bg-background/90 backdrop-blur border-b">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Etapa {stepIdx + 1}/{STEPS.length}</span>
              {savingDraft ? (
                <span className="inline-flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" />salvando…</span>
              ) : lastSavedAt ? (
                <span className="inline-flex items-center gap-1"><Save className="h-3 w-3" />salvo {lastSavedAt.toLocaleTimeString().slice(0, 5)}</span>
              ) : null}
            </div>
            <h3 className="text-lg font-semibold flex items-center gap-2 mt-0.5">
              <current.icon className="h-5 w-5 text-primary" />
              {current.label}
            </h3>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {profiles.map((p) => (
              <Badge key={p} variant="outline" className={PROFILE_COLOR[p]}>{PROFILE_LABEL[p]}</Badge>
            ))}
            {profiles.length === 0 && (
              <span className="text-xs text-muted-foreground">Nenhum perfil detectado</span>
            )}
          </div>
        </div>
        <Progress value={progress} className="h-1.5 mt-2" />
        <div className="hidden sm:flex gap-1 mt-2 overflow-x-auto">
          {STEPS.map((s, i) => (
            <button
              key={s.key}
              onClick={() => setStepIdx(i)}
              className={`text-xs px-2 py-1 rounded-full whitespace-nowrap border transition ${
                i === stepIdx
                  ? "bg-primary text-primary-foreground border-primary"
                  : i < stepIdx
                  ? "bg-primary/10 text-primary border-primary/30"
                  : "bg-muted text-muted-foreground border-transparent"
              }`}
            >
              {i + 1}. {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* CONTEÚDO */}
      <div className="space-y-4">
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
        {current.key === "anamnese" && (
          <StepAnamnese register={register} />
        )}
        {current.key === "exame" && (
          <StepExame
            register={register}
            values={formValues}
            setValue={setValue}
            profiles={profiles}
          />
        )}
        {current.key === "escalas" && (
          <ClinicalTabs patientId={patientId} assessmentId={activeAssessmentId} requireAssessment />
        )}
        {current.key === "plano" && (
          <StepPlano register={register} suggested={detection.items.flatMap((d) => d.suggested_objectives)} />
        )}
        {current.key === "assinaturas" && (
          <Card className="p-4 space-y-3">
            <h4 className="text-sm font-semibold">Assinatura profissional</h4>
            {activeAssessmentId ? (
              <SignaturePad
                patientId={patientId}
                assessmentId={activeAssessmentId}
                defaultRole="profissional"
                lockRole
                defaultName={selectedProfessional?.nome ?? ""}
                onSigned={() => signatures.refetch()}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                Salve a avaliação antes de registrar a assinatura profissional.
              </p>
            )}
          </Card>
        )}
      </div>

      {/* NAVEGAÇÃO */}
      <div className="flex items-center justify-between gap-2 pt-4 border-t sticky bottom-0 bg-background -mx-4 sm:-mx-6 px-4 sm:px-6 py-3">
        <Button variant="outline" onClick={goPrev} disabled={stepIdx === 0}>
          <ArrowLeft className="h-4 w-4 mr-1" />Anterior
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => persistDraft(false)} disabled={savingDraft}>
            <Save className="h-4 w-4 mr-1" />Salvar rascunho
          </Button>
          {stepIdx < STEPS.length - 1 ? (
            <Button onClick={goNext}>
              Próximo<ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => save.mutate(false)} disabled={save.isPending}>
                {save.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}Salvar
              </Button>
              <Button onClick={() => save.mutate(true)} disabled={save.isPending}>
                <CheckCircle2 className="h-4 w-4 mr-1" />Finalizar
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// STEPS
// ============================================================================

function StepIdentificacao({ values, setValue, register, profs, patient, ageYears }: any) {
  return (
    <Card className="p-4 space-y-4">
      <div className="grid sm:grid-cols-3 gap-3">
        <div>
          <Label className="text-xs uppercase">Profissional *</Label>
          <Select value={values.professional_id} onValueChange={(v) => setValue("professional_id", v, { shouldDirty: true })}>
            <SelectTrigger className={!values.professional_id ? "border-destructive" : ""}>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {profs.map((p: any) => (
                <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs uppercase">Tipo</Label>
          <Select value={values.tipo} onValueChange={(v) => setValue("tipo", v, { shouldDirty: true })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="avaliacao">Avaliação</SelectItem>
              <SelectItem value="reavaliacao">Reavaliação</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs uppercase">Data</Label>
          <Input type="date" {...register("data")} />
        </div>
      </div>
      {patient && (
        <div className="rounded-lg border bg-muted/30 p-3 grid sm:grid-cols-3 gap-x-4 gap-y-1 text-sm">
          <Info label="Paciente" value={patient.nome_completo} />
          <Info label="Idade" value={ageYears != null ? `${ageYears} anos` : "—"} />
          <Info label="Sexo" value={patient.sexo ?? "—"} />
        </div>
      )}
    </Card>
  );
}

function StepDiagnostico({ values, register, detection, catalog, applyTemplate, applied }: any) {
  const suggestions: DiagnosisCatalogItem[] = detection.items;
  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-3">
        <div>
          <Label className="text-xs uppercase">Diagnóstico clínico (CID / descrição)</Label>
          <Textarea
            rows={3}
            placeholder="Ex.: AVC isquêmico em território de ACM esquerda, com hemiparesia direita"
            {...register("diagnostico_clinico")}
          />
          <p className="text-[11px] text-muted-foreground mt-1">
            Conforme você digita, o sistema detecta o perfil clínico e sugere modelos clínicos.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs uppercase">Médico responsável</Label>
            <Input placeholder="Nome / CRM" {...register("medico_responsavel")} />
          </div>
          <div>
            <Label className="text-xs uppercase">Diagnóstico fisioterapêutico</Label>
            <Input placeholder="Ex.: hemiparesia direita pós-AVC" {...register("diagnostico_fisio")} />
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h4 className="text-sm font-semibold">Biblioteca de modelos clínicos</h4>
          </div>
          <span className="text-xs text-muted-foreground">{catalog.length} disponíveis</span>
        </div>
        {suggestions.length > 0 && (
          <div className="mb-3">
            <p className="text-xs text-muted-foreground mb-2">Sugeridos pelo diagnóstico:</p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((d) => (
                <Button
                  key={d.code}
                  size="sm"
                  variant={applied.includes(d.code) ? "secondary" : "default"}
                  onClick={() => applyTemplate(d)}
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  {d.label}
                  {applied.includes(d.code) && <CheckCircle2 className="h-3 w-3 ml-1" />}
                </Button>
              ))}
            </div>
          </div>
        )}
        <Accordion type="single" collapsible>
          <AccordionItem value="all">
            <AccordionTrigger className="text-xs">Ver biblioteca completa</AccordionTrigger>
            <AccordionContent>
              <div className="grid sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
                {catalog.map((d: DiagnosisCatalogItem) => (
                  <button
                    key={d.code}
                    onClick={() => applyTemplate(d)}
                    className="text-left border rounded-md p-2 hover:bg-accent transition"
                  >
                    <div className="text-sm font-medium">{d.label}</div>
                    <div className="flex flex-wrap gap-1 mt-1">
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
      </Card>
    </div>
  );
}

function StepAnamnese({ register }: any) {
  return (
    <Accordion type="multiple" defaultValue={["queixa", "hma"]} className="space-y-2">
      <SectionAccordion value="queixa" title="Queixa principal *">
        <Textarea rows={2} {...register("queixa_principal")} />
      </SectionAccordion>
      <SectionAccordion value="hma" title="História da Moléstia Atual (HMA)">
        <Textarea rows={4} {...register("hma")} />
      </SectionAccordion>
      <SectionAccordion value="hmp" title="História da Moléstia Pregressa (HMP)">
        <Textarea rows={3} {...register("hmp")} />
      </SectionAccordion>
      <SectionAccordion value="antec" title="Antecedentes pessoais e familiares">
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs uppercase">Pessoais</Label>
            <Textarea rows={3} {...register("antecedentes_pessoais")} />
          </div>
          <div>
            <Label className="text-xs uppercase">Familiares</Label>
            <Textarea rows={3} {...register("antecedentes_familiares")} />
          </div>
        </div>
      </SectionAccordion>
      <SectionAccordion value="med" title="Medicamentos e hábitos">
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs uppercase">Medicamentos em uso</Label>
            <Textarea rows={3} {...register("medicamentos")} />
          </div>
          <div>
            <Label className="text-xs uppercase">Hábitos de vida</Label>
            <Textarea rows={3} {...register("habitos_vida")} />
          </div>
        </div>
      </SectionAccordion>
    </Accordion>
  );
}

function StepExame({ register, values, setValue, profiles }: any) {
  const show = (p: ClinicalProfile) => profiles?.includes(p);
  return (
    <Accordion type="multiple" defaultValue={["geral", ...profiles]} className="space-y-2">
      <SectionAccordion value="geral" title="Avaliação geral">
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between">
              <Label className="text-xs uppercase">EVA — Dor (0–10)</Label>
              <span className="text-sm font-semibold tabular-nums">{values.eva == null ? "Não avaliado" : values.eva}</span>
            </div>
            {values.eva == null ? (
              <Button type="button" variant="outline" size="sm" onClick={() => setValue("eva", 0, { shouldDirty: true })}>
                Registrar EVA
              </Button>
            ) : (
              <>
                <Slider
                  value={[values.eva]}
                  max={10}
                  step={1}
                  onValueChange={(v) => setValue("eva", v[0], { shouldDirty: true })}
                />
                <Button type="button" variant="ghost" size="sm" className="mt-2 px-0 text-xs" onClick={() => setValue("eva", null, { shouldDirty: true })}>
                  Marcar como não avaliado
                </Button>
              </>
            )}
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs uppercase">Inspeção</Label>
              <Textarea rows={2} {...register("inspecao")} />
            </div>
            <div>
              <Label className="text-xs uppercase">Palpação</Label>
              <Textarea rows={2} {...register("palpacao")} />
            </div>
          </div>
        </div>
      </SectionAccordion>

      {show("neuro") && (
        <SectionAccordion value="neuro" title="Avaliação Neurológica" badge="Neuro">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Nível de consciência" reg={register("neuro_consciencia")} />
            <Field label="Comunicação" reg={register("neuro_comunicacao")} />
            <Field label="Cognição" reg={register("neuro_cognicao")} />
            <Field label="Tônus muscular (Ashworth)" reg={register("neuro_tonus")} />
            <Field label="Coordenação" reg={register("neuro_coordenacao")} />
            <Field label="Equilíbrio" reg={register("neuro_equilibrio")} />
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">
            Escalas detalhadas (MRC, Ashworth, Berg) serão preenchidas na etapa Escalas (Fase 2).
          </p>
        </SectionAccordion>
      )}

      {show("orto") && (
        <SectionAccordion value="orto" title="Avaliação Ortopédica" badge="Orto">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Dor por movimento" reg={register("orto_dor_movimento")} />
            <Field label="Limitações funcionais" reg={register("orto_limitacoes")} />
            <Field label="Testes especiais" reg={register("orto_testes")} multiline />
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">
            Goniometria bilateral e tabela MRC serão preenchidas na etapa Escalas (Fase 2).
          </p>
        </SectionAccordion>
      )}

      {show("respiratorio") && (
        <SectionAccordion value="respiratorio" title="Avaliação Respiratória" badge="Resp">
          <div className="grid sm:grid-cols-3 gap-3">
            <Field label="FR (irpm)" reg={register("resp_fr")} />
            <Field label="SpO₂ (%)" reg={register("resp_spo2")} />
            <Field label="Uso de O₂" reg={register("resp_oxigenio")} />
            <Field label="Ausculta pulmonar" reg={register("resp_ausculta")} />
            <Field label="Tosse" reg={register("resp_tosse")} />
            <Field label="Dispneia (mMRC)" reg={register("resp_dispneia")} />
          </div>
        </SectionAccordion>
      )}

      {profiles?.length === 0 && (
        <div className="text-xs text-muted-foreground bg-muted/40 rounded-md p-3 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>
            Preencha o diagnóstico clínico na etapa anterior para que o sistema mostre as seções
            específicas (Neuro / Orto / Respiratório / Geriátrico) automaticamente.
          </span>
        </div>
      )}
    </Accordion>
  );
}

function StepPlano({ register, suggested }: any) {
  const uniqueSuggested: string[] = Array.from(new Set(suggested ?? []));
  return (
    <Card className="p-4 space-y-3">
      {uniqueSuggested.length > 0 && (
        <div className="rounded-md border bg-primary/5 p-3">
          <p className="text-xs font-medium mb-1.5">Objetivos sugeridos pelo diagnóstico:</p>
          <div className="flex flex-wrap gap-1.5">
            {uniqueSuggested.map((o) => (
              <Badge key={o} variant="secondary">{o.replace(/_/g, " ")}</Badge>
            ))}
          </div>
        </div>
      )}
      <div>
        <Label className="text-xs uppercase">Objetivos terapêuticos</Label>
        <Textarea rows={4} {...register("objetivos")} />
      </div>
      <div>
        <Label className="text-xs uppercase">Condutas</Label>
        <Textarea rows={4} {...register("condutas")} />
      </div>
      <div>
        <Label className="text-xs uppercase">Recursos terapêuticos</Label>
        <Textarea rows={3} {...register("recursos_terapeuticos")} />
      </div>
      <p className="text-[11px] text-muted-foreground">
        Metas estruturadas (prazo / indicador / status) com histórico chegam na Fase 3.
      </p>
    </Card>
  );
}

function PlaceholderPhase({
  title, phase, description, scales,
}: { title: string; phase: string; description: string; scales?: string[] }) {
  const uniqueScales = scales ? Array.from(new Set(scales)) : [];
  return (
    <Card className="p-6 text-center space-y-3 border-dashed">
      <Badge variant="outline" className="mx-auto">{phase}</Badge>
      <h4 className="text-lg font-semibold">{title}</h4>
      <p className="text-sm text-muted-foreground max-w-md mx-auto">{description}</p>
      {uniqueScales.length > 0 && (
        <div className="pt-2">
          <p className="text-xs text-muted-foreground mb-2">Escalas que serão habilitadas para este paciente:</p>
          <div className="flex flex-wrap gap-1.5 justify-center">
            {uniqueScales.map((s) => (
              <Badge key={s} variant="secondary" className="uppercase">{s}</Badge>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

// helpers --------------------------------------------------------------------

function SectionAccordion({
  value, title, badge, children,
}: { value: string; title: string; badge?: string; children: React.ReactNode }) {
  return (
    <AccordionItem value={value} className="border rounded-lg bg-card">
      <AccordionTrigger className="px-4 py-3 hover:no-underline">
        <span className="flex items-center gap-2 text-sm font-medium">
          {title}
          {badge && <Badge variant="outline" className="text-[10px]">{badge}</Badge>}
        </span>
      </AccordionTrigger>
      <AccordionContent className="px-4 pb-4 pt-1">{children}</AccordionContent>
    </AccordionItem>
  );
}

function Field({ label, reg, multiline }: { label: string; reg: any; multiline?: boolean }) {
  return (
    <div>
      <Label className="text-xs uppercase">{label}</Label>
      {multiline ? <Textarea rows={2} {...reg} /> : <Input {...reg} />}
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className="font-medium">{value ?? "—"}</div>
    </div>
  );
}

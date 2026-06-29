import { memo, useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveClinic } from "@/lib/active-clinic";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileText,
  Target,
  TrendingUp,
  AlertTriangle,
  BookOpen,
  Share2,
  ClipboardCheck,
  Sparkles,
  Loader2,
} from "lucide-react";
import {
  AutosaveIndicator,
  InfoCard,
  clinical,
  ClinicalField,
  FormSection,
} from "@/components/layout";
import { cn } from "@/lib/utils";
import { DischargeChecklistPanel, isChecklistComplete } from "./DischargeChecklist";
import { DischargeAutoSummary } from "./DischargeAutoSummary";
import {
  ASSESSMENT_FIELDS,
  DISCHARGE_MOTIVOS,
  defaultDischargeForm,
  draftStorageKey,
  mergeFormForDb,
  prefillFromClinical,
  type DischargeWizardForm,
  type TreatmentStats,
} from "./discharge-utils";
import type { AssessmentRow } from "@/components/reassessment-premium";

const STEPS = [
  { key: "resumo", label: "Resumo clínico", icon: Sparkles },
  { key: "objetivos_alcancados", label: "Objetivos alcançados", icon: Target },
  { key: "objetivos_pendentes", label: "Objetivos pendentes", icon: ClipboardCheck },
  { key: "ganhos", label: "Ganhos funcionais", icon: TrendingUp },
  { key: "limitacoes", label: "Limitações remanescentes", icon: AlertTriangle },
  { key: "orientacoes", label: "Orientações finais", icon: BookOpen },
  { key: "plano", label: "Plano domiciliar", icon: FileText },
  { key: "encaminhamentos", label: "Encaminhamentos", icon: Share2 },
  { key: "conclusao", label: "Conclusão", icon: CheckCircle2 },
] as const;

type DischargeWizardProps = {
  patientId: string;
  patientName: string;
  stats: TreatmentStats;
  onSuccess: () => void;
  readOnly?: boolean;
};

function DischargeWizardInner({ patientId, patientName, stats, onSuccess, readOnly }: DischargeWizardProps) {
  const { clinicId, supportMode } = useActiveClinic();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState<DischargeWizardForm>(() => defaultDischargeForm());
  const [stepIdx, setStepIdx] = useState(0);
  const [savingDraft, setSavingDraft] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hydratedRef = useRef(false);

  const assessmentsQ = useQuery({
    queryKey: ["discharge-assessments", clinicId, patientId],
    enabled: !!clinicId && !!patientId,
    queryFn: async () => {
      const { data } = await supabase
        .from("assessments")
        .select(ASSESSMENT_FIELDS)
        .eq("clinic_id", clinicId!)
        .eq("patient_id", patientId)
        .order("data", { ascending: true });
      return (data ?? []) as AssessmentRow[];
    },
  });

  const myProf = useQuery({
    queryKey: ["my-prof", clinicId, user?.id],
    enabled: !!user?.id && !!clinicId,
    queryFn: async () =>
      (
        await supabase
          .from("professionals")
          .select("id, nome")
          .eq("clinic_id", clinicId!)
          .eq("profile_id", user!.id)
          .maybeSingle()
      ).data,
  });

  useEffect(() => {
    if (!clinicId || hydratedRef.current) return;
    const raw = localStorage.getItem(draftStorageKey(clinicId, patientId));
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as DischargeWizardForm;
        setForm(parsed);
        setStepIdx(parsed.wizardStep ?? 0);
        setLastSavedAt(new Date());
      } catch {
        /* ignore */
      }
    }
    hydratedRef.current = true;
  }, [clinicId, patientId]);

  useEffect(() => {
    if (!assessmentsQ.data?.length || readOnly) return;
    setForm((prev) => {
      if (prev.resumo_clinico) return prev;
      return prefillFromClinical(prev, assessmentsQ.data!, stats);
    });
  }, [assessmentsQ.data, stats, readOnly]);

  const persistDraft = useCallback(
    (next: DischargeWizardForm) => {
      if (!clinicId || readOnly) return;
      setSavingDraft(true);
      localStorage.setItem(draftStorageKey(clinicId, patientId), JSON.stringify(next));
      setTimeout(() => {
        setSavingDraft(false);
        setLastSavedAt(new Date());
      }, 300);
    },
    [clinicId, patientId, readOnly],
  );

  const updateForm = useCallback(
    (patch: Partial<DischargeWizardForm>) => {
      setForm((prev) => {
        const next = { ...prev, ...patch };
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => persistDraft(next), 800);
        return next;
      });
    },
    [persistDraft],
  );

  const create = useMutation({
    mutationFn: async () => {
      if (!clinicId) throw new Error("Clínica ativa não identificada.");
      if (supportMode) throw new Error("Modo Suporte ativo: somente leitura.");
      if (!form.motivo) throw new Error("Informe o motivo da alta");
      const hasEncaminhamento = form.motivo.includes("Encaminhamento") || !!form.encaminhamentos.trim();
      if (!isChecklistComplete(form.checklist, hasEncaminhamento)) {
        throw new Error("Complete o checklist clínico antes de registrar a alta");
      }
      const payload = mergeFormForDb(form);
      const { data: activePatient } = await supabase.from("patients").select("id").eq("clinic_id", clinicId).eq("id", patientId).maybeSingle();
      if (!activePatient) throw new Error("Paciente não pertence à clínica ativa.");
      const { error } = await supabase.from("patient_discharges").insert({
        patient_id: patientId,
        professional_id: myProf.data?.id ?? null,
        ...payload,
      });
      if (error) throw error;
      await supabase
        .from("patients")
        .update({ data_alta: form.data_alta })
        .eq("clinic_id", clinicId!)
        .eq("id", patientId);
    },
    onSuccess: () => {
      if (clinicId) localStorage.removeItem(draftStorageKey(clinicId, patientId));
      toast.success("Alta registrada com sucesso");
      qc.invalidateQueries({ queryKey: ["discharges", clinicId, patientId] });
      qc.invalidateQueries({ queryKey: ["altas-clinic", clinicId] });
      qc.invalidateQueries({ queryKey: ["altas-pending", clinicId] });
      qc.invalidateQueries({ queryKey: ["patient", clinicId, patientId] });
      qc.invalidateQueries({ queryKey: ["timeline", clinicId, patientId] });
      onSuccess();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const progress = ((stepIdx + 1) / STEPS.length) * 100;
  const current = STEPS[stepIdx];
  const hasEncaminhamento =
    form.motivo.includes("Encaminhamento") || !!form.encaminhamentos.trim();

  if (readOnly) return null;

  return (
    <div className="space-y-4">
      <div className={cn(clinical.card, "p-4 sm:p-5")}>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <current.icon className="h-4 w-4 text-primary" />
            {current.label}
            <span className="text-xs font-normal text-muted-foreground">
              · Etapa {stepIdx + 1} de {STEPS.length}
            </span>
          </div>
          <AutosaveIndicator saving={savingDraft} lastSavedAt={lastSavedAt} />
        </div>
        <Progress value={progress} className="h-2" />
        <p className="mt-1.5 text-xs text-muted-foreground">{Math.round(progress)}% concluído · {patientName}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[200px_minmax(0,1fr)]">
        <WizardStepNav steps={STEPS} currentIdx={stepIdx} onSelect={setStepIdx} className="hidden lg:block" />
        <WizardStepNav steps={STEPS} currentIdx={stepIdx} onSelect={setStepIdx} className="lg:hidden" compact />

        <div className="min-w-0 space-y-4">
          {current.key === "resumo" && (
            <>
              <DischargeAutoSummary stats={stats} />
              <InfoCard title="Resumo clínico automático" description="Revise e complemente o resumo gerado.">
                <div className="mb-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Data da alta
                    </Label>
                    <Input
                      type="date"
                      className={cn("mt-1.5", clinical.input)}
                      value={form.data_alta}
                      onChange={(e) => updateForm({ data_alta: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Motivo
                    </Label>
                    <Select value={form.motivo} onValueChange={(v) => updateForm({ motivo: v })}>
                      <SelectTrigger className={cn("mt-1.5 rounded-xl", clinical.select)}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DISCHARGE_MOTIVOS.map((m) => (
                          <SelectItem key={m} value={m}>
                            {m}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <FieldText
                  label="Resumo clínico do tratamento"
                  value={form.resumo_clinico}
                  onChange={(v) => updateForm({ resumo_clinico: v })}
                  rows={5}
                />
              </InfoCard>
            </>
          )}

          {current.key === "objetivos_alcancados" && (
            <StepCard title="Objetivos alcançados" description="Metas terapêuticas atingidas durante o tratamento.">
              <FieldText
                label="Objetivos alcançados"
                value={form.objetivos_alcancados}
                onChange={(v) => updateForm({ objetivos_alcancados: v })}
                rows={6}
              />
            </StepCard>
          )}

          {current.key === "objetivos_pendentes" && (
            <StepCard title="Objetivos pendentes" description="Metas não alcançadas ou parcialmente atingidas.">
              <FieldText
                label="Objetivos pendentes"
                value={form.objetivos_pendentes}
                onChange={(v) => updateForm({ objetivos_pendentes: v })}
                rows={6}
              />
            </StepCard>
          )}

          {current.key === "ganhos" && (
            <StepCard title="Ganhos funcionais" description="Melhoras observadas na funcionalidade do paciente.">
              <FieldText
                label="Ganhos funcionais"
                value={form.ganhos_funcionais}
                onChange={(v) => updateForm({ ganhos_funcionais: v })}
                rows={6}
              />
            </StepCard>
          )}

          {current.key === "limitacoes" && (
            <StepCard title="Limitações remanescentes" description="Restrições que persistem após o tratamento.">
              <FieldText
                label="Limitações remanescentes"
                value={form.limitacoes_remanescentes}
                onChange={(v) => updateForm({ limitacoes_remanescentes: v })}
                rows={6}
              />
            </StepCard>
          )}

          {current.key === "orientacoes" && (
            <StepCard title="Orientações finais" description="Recomendações gerais pós-alta.">
              <FieldText
                label="Orientações finais"
                value={form.orientacoes_finais}
                onChange={(v) => updateForm({ orientacoes_finais: v })}
                rows={6}
              />
            </StepCard>
          )}

          {current.key === "plano" && (
            <StepCard title="Plano domiciliar" description="Exercícios e cuidados em domicílio.">
              <FieldText
                label="Plano domiciliar / HEP"
                value={form.plano_domiciliar}
                onChange={(v) => updateForm({ plano_domiciliar: v })}
                rows={6}
              />
            </StepCard>
          )}

          {current.key === "encaminhamentos" && (
            <StepCard title="Encaminhamentos" description="Encaminhamentos a outros profissionais ou serviços.">
              <FieldText
                label="Encaminhamentos"
                value={form.encaminhamentos}
                onChange={(v) => updateForm({ encaminhamentos: v })}
                rows={5}
              />
            </StepCard>
          )}

          {current.key === "conclusao" && (
            <>
              <DischargeChecklistPanel
                value={form.checklist}
                onChange={(c) => updateForm({ checklist: c })}
              />
              <StepCard title="Conclusão" description="Observações finais e confirmação da alta.">
                <FieldText
                  label="Notas de conclusão"
                  value={form.conclusao}
                  onChange={(v) => updateForm({ conclusao: v })}
                  rows={4}
                />
              </StepCard>
            </>
          )}
        </div>
      </div>

      <div className={clinical.stickyFooter}>
        <Button
          variant="outline"
          onClick={() => {
            const next = Math.max(0, stepIdx - 1);
            setStepIdx(next);
            updateForm({ wizardStep: next });
          }}
          disabled={stepIdx === 0}
          className="rounded-xl"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Anterior
        </Button>
        <div className="flex flex-wrap gap-2">
          {stepIdx < STEPS.length - 1 ? (
            <Button
              onClick={() => {
                const next = Math.min(STEPS.length - 1, stepIdx + 1);
                setStepIdx(next);
                updateForm({ wizardStep: next });
              }}
              className={cn(clinical.btnPrimary, "rounded-xl")}
            >
              Próximo
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={() => create.mutate()}
              disabled={create.isPending || !isChecklistComplete(form.checklist, hasEncaminhamento)}
              className={cn(clinical.btnPrimary, "rounded-xl")}
            >
              {create.isPending ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-1 h-4 w-4" />
              )}
              Registrar alta
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export const DischargeWizard = memo(DischargeWizardInner);

function StepCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <FormSection title={title} description={description}>
      {children}
    </FormSection>
  );
}

function FieldText({
  label,
  value,
  onChange,
  rows = 4,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <ClinicalField label={label} optional>
      <Textarea
        rows={rows}
        className={cn(clinical.textarea)}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </ClinicalField>
  );
}

function WizardStepNav({
  steps,
  currentIdx,
  onSelect,
  className,
  compact,
}: {
  steps: typeof STEPS;
  currentIdx: number;
  onSelect: (i: number) => void;
  className?: string;
  compact?: boolean;
}) {
  return (
    <nav className={cn("space-y-1", className)} aria-label="Etapas do assistente de alta">
      {steps.map((s, i) => {
        const Icon = s.icon;
        const active = i === currentIdx;
        return (
          <button
            key={s.key}
            type="button"
            onClick={() => onSelect(i)}
            className={cn(
              "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors",
              active ? "bg-primary/10 font-semibold text-primary" : "text-muted-foreground hover:bg-slate-50",
              compact && "text-xs py-1.5",
              clinical.focusRing,
            )}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
            <span className="truncate">{s.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

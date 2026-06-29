import { createFileRoute, useSearch, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import {
  FileText, Eye, Save, Lock, Check, ChevronLeft, ChevronRight,
  ClipboardList, User2, FileCheck2, Send, AlertTriangle, ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { buildPdf } from "@/lib/pdf";
import { CURRENT_LAYOUT_PREVIEW_NOTICE, previewLiveDocumentPdf } from "@/lib/clinical-document-pdf";
import { withContractPremiumLayout } from "@/lib/document-pdf-layout";
import { ClinicalDocumentPdfActions } from "@/components/clinical-document-pdf-actions";
import { resolveResponsibleProfessional, validateProfessionalForDoc } from "@/lib/professional-resolver";
import { buildMergeData, renderTemplateSections, type ContratanteData } from "@/lib/merge-tags";
import { useAuth } from "@/lib/auth";
import { useActiveClinic } from "@/lib/active-clinic";
import { fmtDate, fmtDateTime, calcAge } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  AppShell,
  ClinicalField,
  EmptyState,
  FormGrid,
  PageHeader,
  SearchField,
  clinical,
} from "@/components/layout";

type SearchSchema = { patient?: string; template?: string };

export const Route = createFileRoute("/_authenticated/app/documentos")({
  component: DocumentosPage,
  validateSearch: (s: Record<string, unknown>): SearchSchema => ({
    patient: typeof s.patient === "string" ? s.patient : undefined,
    template: typeof s.template === "string" ? s.template : undefined,
  }),
});

const DOC_TYPE_LABEL: Record<string, string> = {
  avaliacao_inicial: "Avaliação",
  avaliacao: "Avaliação",
  reavaliacao: "Reavaliação",
  evolucao: "Evolução",
  relatorio: "Relatório",
  alta: "Alta",
  encaminhamento: "Encaminhamento",
  parecer: "Documento / Termo",
  termo: "Termo",
  declaracao: "Declaração",
  laudo: "Laudo",
  contrato: "Contrato",
  plano: "Plano Terapêutico",
  recibo: "Recibo",
};

const normalizeTemplateName = (name?: string | null) =>
  (name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const STEPS = [
  { id: 1, label: "Modelo", icon: ClipboardList },
  { id: 2, label: "Paciente", icon: User2 },
  { id: 3, label: "Visualização", icon: FileCheck2 },
  { id: 4, label: "Emitir e Arquivar", icon: Send },
] as const;

function DocumentosPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const search = useSearch({ from: "/_authenticated/app/documentos" });
  const { clinicId: activeClinicId, supportMode } = useActiveClinic();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [templateId, setTemplateId] = useState<string>(search.template || "");
  const [patientId, setPatientId] = useState<string>(search.patient || "");
  const [templateSearch, setTemplateSearch] = useState("");
  const [patientSearch, setPatientSearch] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);

  const [contratanteMode, setContratanteMode] = useState<"paciente" | "responsavel">("paciente");
  const [contratanteForm, setContratanteForm] = useState<ContratanteData>({
    nome: "", cpf: "", rg: "", vinculo: "", telefone: "", endereco: "", email: "",
  });

  // ----- DATA -----
  const { data: templates = [] } = useQuery({
    queryKey: ["doc-templates-active", activeClinicId],
    enabled: !!activeClinicId,
    queryFn: async () => {
      const { data } = await supabase
        .from("document_templates")
        .select("*")
        .eq("clinic_id", activeClinicId!)
        .eq("is_active", true)
        .order("doc_type")
        .order("name");
      return data || [];
    },
  });

  const { data: patients = [] } = useQuery({
    queryKey: ["patients-min", activeClinicId],
    enabled: !!activeClinicId,
    queryFn: async () => {
      const { data } = await supabase
        .from("patients")
        .select("id, nome_completo, cpf, data_nascimento, cid_principal")
        .eq("clinic_id", activeClinicId!)
        .order("nome_completo");
      return data || [];
    },
  });

  const { data: patient } = useQuery({
    queryKey: ["patient-full", activeClinicId, patientId],
    enabled: !!activeClinicId && !!patientId,
    queryFn: async () => {
      const { data } = await supabase.from("patients").select("*").eq("id", patientId).eq("clinic_id", activeClinicId!).single();
      return data;
    },
  });

  const { data: lastAssessment } = useQuery({
    queryKey: ["patient-last-assessment", activeClinicId, patientId],
    enabled: !!activeClinicId && !!patientId,
    queryFn: async () => {
      const { data } = await supabase
        .from("assessments").select("*")
        .eq("clinic_id", activeClinicId!).eq("patient_id", patientId)
        .order("data", { ascending: false }).limit(1).maybeSingle();
      return data;
    },
  });

  const { data: scales = [] } = useQuery({
    queryKey: ["patient-scales", lastAssessment?.id],
    enabled: !!lastAssessment?.id,
    queryFn: async () => {
      const { data } = await supabase.from("assessment_scales").select("*").eq("assessment_id", lastAssessment!.id);
      return data || [];
    },
  });

  const { data: lastDischarge } = useQuery({
    queryKey: ["patient-discharge", activeClinicId, patientId],
    enabled: !!activeClinicId && !!patientId,
    queryFn: async () => {
      const { data } = await supabase
        .from("patient_discharges")
        .select("*, patients!inner(clinic_id)")
        .eq("patient_id", patientId)
        .eq("patients.clinic_id", activeClinicId!)
        .order("data_alta", { ascending: false }).limit(1).maybeSingle();
      return data;
    },
  });

  const { data: clinic } = useQuery({
    queryKey: ["clinic-settings", activeClinicId],
    enabled: !!activeClinicId,
    queryFn: async () => {
      const { data } = await supabase.from("clinic_settings").select("*").eq("clinic_id", activeClinicId!).maybeSingle();
      return data;
    },
  });

  const { data: professionalInfo, isLoading: professionalLoading } = useQuery({
    queryKey: ["my-professional", user?.id, activeClinicId],
    enabled: !!user?.id && !!activeClinicId,
    queryFn: async () => {
      const prof = await resolveResponsibleProfessional(activeClinicId!, user!.id);
      return validateProfessionalForDoc(prof);
    },
  });
  const professional = professionalInfo?.professional ?? null;
  const professionalReady = professionalInfo?.status === "ok";

  const { data: emitted = [], refetch: refetchEmitted } = useQuery({
    queryKey: ["clinical-documents", activeClinicId, patientId],
    enabled: !!activeClinicId && !!patientId,
    queryFn: async () => {
      const { data } = await supabase
        .from("clinical_documents").select("*")
        .eq("clinic_id", activeClinicId!).eq("patient_id", patientId)
        .order("issued_at", { ascending: false });
      return data || [];
    },
  });

  // ----- DERIVED -----
  const visibleTemplates = useMemo(() => {
    const byName = new Map<string, any>();
    for (const t of templates as any[]) {
      if (activeClinicId && t.clinic_id && t.clinic_id !== activeClinicId) continue;
      const key = normalizeTemplateName(t.name) || t.id;
      const current = byName.get(key);
      if (!current || (t.is_default && !current.is_default) || (t.updated_at && current.updated_at && t.updated_at > current.updated_at)) {
        byName.set(key, t);
      }
    }
    return Array.from(byName.values()).sort((a: any, b: any) =>
      String(a.doc_type || "").localeCompare(String(b.doc_type || ""), "pt-BR") ||
      String(a.name || "").localeCompare(String(b.name || ""), "pt-BR"),
    );
  }, [templates, activeClinicId]);

  const template = visibleTemplates.find((t: any) => t.id === templateId);
  const isContractTemplate = !!template && /contrato/i.test(template.name || "");

  const filteredTemplates = useMemo(() => {
    const q = templateSearch.trim().toLowerCase();
    if (!q) return visibleTemplates;
    return visibleTemplates.filter((t: any) =>
      t.name?.toLowerCase().includes(q) ||
      (DOC_TYPE_LABEL[t.doc_type] || "").toLowerCase().includes(q),
    );
  }, [visibleTemplates, templateSearch]);

  const filteredPatients = useMemo(() => {
    if (!patientSearch.trim()) return patients;
    const q = patientSearch.toLowerCase();
    return patients.filter((p: any) =>
      p.nome_completo?.toLowerCase().includes(q) || p.cpf?.includes(q),
    );
  }, [patients, patientSearch]);

  const effectiveContratante: ContratanteData | null = useMemo(() => {
    if (!isContractTemplate) return null;
    if (contratanteMode === "paciente") {
      return {
        nome: patient?.nome_completo ?? null,
        cpf: patient?.cpf ?? null,
        rg: (patient as any)?.rg ?? null,
        vinculo: "Próprio paciente",
        telefone: patient?.telefone ?? (patient as any)?.whatsapp ?? null,
        endereco: [patient?.endereco, patient?.bairro, patient?.cidade, patient?.estado].filter(Boolean).join(", ") || null,
        email: (patient as any)?.email ?? null,
      };
    }
    return contratanteForm;
  }, [isContractTemplate, contratanteMode, contratanteForm, patient]);

  const renderedSections = useMemo(() => {
    if (!template || !patient) return [];
    const data = buildMergeData({
      patient, assessment: lastAssessment, scales, professional, clinic,
      discharge: lastDischarge, contratante: effectiveContratante,
    });
    return renderTemplateSections((template.sections as any) || [], data);
  }, [template, patient, lastAssessment, scales, professional, clinic, lastDischarge, effectiveContratante]);

  const buildPdfOpts = () =>
    withContractPremiumLayout({
      title: template?.name || "Documento",
      subtitle: `Emitido em ${fmtDate(new Date())}`,
      patientName: patient?.nome_completo,
      professional: professional ?? null,
      sections: renderedSections,
      clinicId: ((patient as any)?.clinic_id ?? activeClinicId ?? null) as string | null,
      contratante: isContractTemplate
        ? { nome: effectiveContratante?.nome ?? null, cpf: effectiveContratante?.cpf ?? null, vinculo: effectiveContratante?.vinculo ?? null }
        : null,
      patientSnapshot: isContractTemplate
        ? { nome: patient?.nome_completo ?? null, cpf: patient?.cpf ?? null }
        : null,
    });

  // ----- ACTIONS -----
  const emit = useMutation({
    mutationFn: async () => {
      if (supportMode) throw new Error("Modo suporte: emissão bloqueada.");
      if (!template || !patient) throw new Error("Selecione paciente e modelo");
      if (!activeClinicId) throw new Error("Clínica ativa não identificada");
      if (!professionalReady) throw new Error(professionalInfo?.message ?? "Profissional responsável não disponível.");
      if (isContractTemplate && contratanteMode === "responsavel") {
        const f = contratanteForm;
        if (!f.nome?.trim() || !f.cpf?.trim() || !f.rg?.trim() || !f.vinculo?.trim() || !f.telefone?.trim() || !f.endereco?.trim()) {
          throw new Error("Preencha os dados obrigatórios do responsável (nome, CPF, RG, vínculo, telefone, endereço).");
        }
      }
      const hashBytes = crypto.getRandomValues(new Uint8Array(24));
      const validation_hash = Array.from(hashBytes).map((b) => b.toString(16).padStart(2, "0")).join("");
      const opts = { ...buildPdfOpts(), validationHash: validation_hash };
      const doc = await buildPdf(opts);
      const blob = doc.output("blob");
      if (!activeClinicId) throw new Error("Clínica ativa não selecionada");
      const path = `${activeClinicId}/clinical/${patient.id}/${template.doc_type}-${Date.now()}.pdf`;
      const { error: upErr } = await supabase.storage.from("documents").upload(path, blob, { contentType: "application/pdf", upsert: true });
      if (upErr) throw upErr;

      const name = (template.name || "").toLowerCase();
      let cdocType: string;
      if (template.doc_type === "alta") cdocType = "alta";
      else if (template.doc_type === "encaminhamento") cdocType = "encaminhamento";
      else if (template.doc_type === "avaliacao_inicial") cdocType = "avaliacao";
      else if (template.doc_type === "reavaliacao") cdocType = "reavaliacao";
      else if (template.doc_type === "evolucao") cdocType = "evolucao";
      else if (template.doc_type === "relatorio") cdocType = name.includes("plano terap") ? "plano" : "relatorio";
      else if (template.doc_type === "parecer") {
        if (name.includes("contrato")) cdocType = "contrato";
        else if (name.includes("declara")) cdocType = "declaracao";
        else if (name.includes("termo")) cdocType = "termo";
        else if (name.includes("pericial") || name.includes("laudo")) cdocType = "laudo";
        else cdocType = "termo";
      } else cdocType = "relatorio";

      const nowIso = new Date().toISOString();
      const { error: insErr } = await supabase.from("clinical_documents").insert({
        clinic_id: activeClinicId,
        patient_id: patient.id,
        professional_id: professional?.id ?? null,
        doc_type: cdocType as any,
        title: template.name,
        template_id: template.id,
        template_version: template.version,
        content: {
          sections: renderedSections,
          ...(isContractTemplate ? {
            contratante_mode: contratanteMode,
            contratante: effectiveContratante,
            paciente_snapshot: { nome: patient.nome_completo, cpf: patient.cpf, rg: (patient as any).rg ?? null },
          } : {}),
        } as any,
        body_text: renderedSections.map((s) => `## ${s.title}\n${s.body}`).join("\n\n"),
        validation_hash,
        pdf_url: path,
        issued_at: nowIso,
        locked_at: nowIso,
      });
      if (insErr) throw insErr;
      return { path, hash: validation_hash, blob };
    },
    onSuccess: async (r) => {
      toast.success("Documento emitido e arquivado no prontuário");
      const url = URL.createObjectURL(r.blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(template?.name || "documento").replace(/\s+/g, "_")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      qc.invalidateQueries({ queryKey: ["clinical-documents", activeClinicId, patientId] });
      refetchEmitted();
    },
    onError: (e: any) => toast.error(e.message || "Erro ao emitir"),
  });

  useEffect(() => {
    if (search.patient && search.patient !== patientId) setPatientId(search.patient);
    if (search.template && search.template !== templateId) setTemplateId(search.template);
  }, [search.patient, search.template]);

  // ----- VALIDATION GATES -----
  const canAdvanceFrom1 = !!templateId;
  const canAdvanceFrom2 = !!patientId;
  const missing: string[] = [];
  if (!template) missing.push("Modelo de documento");
  if (!patient) missing.push("Paciente");
  if (professionalLoading) missing.push("Validando profissional responsável…");
  else if (professionalInfo && !professionalReady) missing.push(professionalInfo.message || "Profissional responsável");
  if (isContractTemplate && contratanteMode === "responsavel") {
    const f = contratanteForm;
    if (!f.nome?.trim() || !f.cpf?.trim() || !f.rg?.trim() || !f.vinculo?.trim() || !f.telefone?.trim() || !f.endereco?.trim()) {
      missing.push("Dados do contratante (nome, CPF, RG, vínculo, telefone, endereço)");
    }
  }
  const canEmit = missing.length === 0 && !supportMode;

  const next = () => setStep((s) => (Math.min(4, s + 1) as 1 | 2 | 3 | 4));
  const prev = () => setStep((s) => (Math.max(1, s - 1) as 1 | 2 | 3 | 4));

  return (
    <AppShell clinical className="max-w-6xl">
      <PageHeader
        icon={FileText}
        eyebrow="Documentos clínicos"
        breadcrumbs={[{ label: "Clínica", to: "/app" }, { label: "Documentos" }]}
        title="Emissão de Documentos"
        description="Siga as etapas para gerar um documento clínico oficial e arquivá-lo no prontuário do paciente."
      />

      {supportMode && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-4 text-sm flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-amber-700 dark:text-amber-300 mt-0.5 shrink-0" />
          <div>
            <div className="font-medium text-amber-900 dark:text-amber-200">Modo suporte: emissão bloqueada.</div>
            <p className="text-xs text-amber-800 dark:text-amber-300/90">
              Você pode navegar pelo wizard e visualizar a prévia, mas a emissão e o arquivamento estão desabilitados.
            </p>
          </div>
        </div>
      )}

      {/* Progress bar */}
      <Card className={cn(clinical.card, "p-4 shadow-none")}>
        <ol className="flex items-center gap-2">
          {STEPS.map((s, idx) => {
            const status: "current" | "done" | "pending" =
              step === s.id ? "current" : step > s.id ? "done" : "pending";
            const Icon = s.icon;
            return (
              <li key={s.id} className="flex items-center gap-2 flex-1 min-w-0">
                <button
                  type="button"
                  onClick={() => {
                    if (s.id < step) setStep(s.id);
                    if (s.id === 2 && canAdvanceFrom1) setStep(2);
                    if (s.id === 3 && canAdvanceFrom1 && canAdvanceFrom2) setStep(3);
                    if (s.id === 4 && canAdvanceFrom1 && canAdvanceFrom2) setStep(4);
                  }}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-xl border transition-colors min-w-0",
                    status === "current" && "bg-primary text-primary-foreground border-primary",
                    status === "done" && "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300",
                    status === "pending" && "bg-muted/40 border-border text-muted-foreground",
                  )}
                >
                  <span className={cn(
                    "h-6 w-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0",
                    status === "current" && "bg-primary-foreground/20",
                    status === "done" && "bg-emerald-600 text-white",
                    status === "pending" && "bg-background border",
                  )}>
                    {status === "done" ? <Check className="h-3.5 w-3.5" /> : s.id}
                  </span>
                  <span className="hidden sm:flex items-center gap-1.5 text-sm font-medium truncate">
                    <Icon className="h-4 w-4" /> {s.label}
                  </span>
                </button>
                {idx < STEPS.length - 1 && (
                  <div className={cn("h-px flex-1", step > s.id ? "bg-emerald-400" : "bg-border")} />
                )}
              </li>
            );
          })}
        </ol>
      </Card>

      <div className="grid lg:grid-cols-[1fr_360px] gap-6">
        {/* Main column */}
        <div className="space-y-4">
          {/* STEP 1 — Modelo */}
          {step === 1 && (
            <Card className={cn(clinical.card, "space-y-4 p-5 shadow-none")}>
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Escolha o modelo</h2>
                <p className="text-xs text-muted-foreground">Modelos disponíveis na sua clínica.</p>
              </div>
              <SearchField
                placeholder="Buscar modelo por nome ou categoria…"
                value={templateSearch}
                onChange={(e) => setTemplateSearch(e.target.value)}
              />
              {filteredTemplates.length === 0 ? (
                <EmptyState
                  icon={ClipboardList}
                  title="Nenhum modelo encontrado"
                  description="Ajuste a busca ou cadastre modelos em Configurações."
                  className="py-10"
                />
              ) : (
                <div className="grid sm:grid-cols-2 gap-3">
                  {filteredTemplates.map((t: any) => {
                    const selected = t.id === templateId;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setTemplateId(t.id)}
                        className={cn(
                          "text-left p-4 rounded-xl border transition-all hover:border-primary/60 hover:shadow-sm",
                          selected ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border bg-card",
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <FileText className={cn("h-5 w-5 shrink-0", selected ? "text-primary" : "text-muted-foreground")} />
                          {selected && <Check className="h-4 w-4 text-primary" />}
                        </div>
                        <div className="mt-2 font-medium text-sm">{t.name}</div>
                        {t.description && (
                          <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.description}</div>
                        )}
                        <div className="mt-3 flex items-center gap-2">
                          <Badge variant="secondary" className="text-[10px]">
                            {DOC_TYPE_LABEL[t.doc_type] || t.doc_type}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">v{t.version}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </Card>
          )}

          {/* STEP 2 — Paciente */}
          {step === 2 && (
            <Card className={cn(clinical.card, "space-y-4 p-5 shadow-none")}>
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Selecione o paciente</h2>
                <p className="text-xs text-muted-foreground">Apenas pacientes da clínica ativa.</p>
              </div>
              <SearchField
                placeholder="Buscar por nome ou CPF…"
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
              />
              {filteredPatients.length === 0 ? (
                <EmptyState
                  icon={User2}
                  title="Nenhum paciente encontrado"
                  description="Ajuste a busca ou cadastre um paciente."
                  className="py-10"
                />
              ) : (
                <div className="grid sm:grid-cols-2 gap-3 max-h-[55vh] overflow-auto pr-1">
                  {filteredPatients.slice(0, 80).map((p: any) => {
                    const selected = p.id === patientId;
                    const age = p.data_nascimento ? calcAge(p.data_nascimento) : null;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPatientId(p.id)}
                        className={cn(
                          "text-left p-3 rounded-xl border transition-all hover:border-primary/60 hover:shadow-sm",
                          selected ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border bg-card",
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-medium text-sm truncate">{p.nome_completo}</div>
                            <div className="text-xs text-muted-foreground flex flex-wrap gap-2 mt-0.5">
                              {p.cpf && <span>CPF {p.cpf}</span>}
                              {age != null && <span>{age} anos</span>}
                              {p.cid_principal && <Badge variant="outline" className="text-[10px]">CID {p.cid_principal}</Badge>}
                            </div>
                          </div>
                          {selected && <Check className="h-4 w-4 text-primary shrink-0" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Contratante (se contrato) */}
              {isContractTemplate && patientId && (
                <div className="space-y-4 border-t border-[rgba(15,76,92,0.1)] pt-4">
                  <ClinicalField label="Contratante">
                    <RadioGroup
                      value={contratanteMode}
                      onValueChange={(v) => setContratanteMode(v as "paciente" | "responsavel")}
                      className="flex flex-col gap-3 text-sm sm:flex-row"
                    >
                      <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-[rgba(15,76,92,0.12)] px-3 py-2.5 transition-colors hover:bg-slate-50">
                        <RadioGroupItem value="paciente" id="ct-pac" />
                        <span>Próprio paciente</span>
                      </label>
                      <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-[rgba(15,76,92,0.12)] px-3 py-2.5 transition-colors hover:bg-slate-50">
                        <RadioGroupItem value="responsavel" id="ct-resp" />
                        <span>Responsável / contratante financeiro</span>
                      </label>
                    </RadioGroup>
                  </ClinicalField>
                  {contratanteMode === "responsavel" && (
                    <FormGrid>
                      <ClinicalField label="Nome completo" required filled={!!contratanteForm.nome?.trim()} className="sm:col-span-2">
                        <Input value={contratanteForm.nome ?? ""} onChange={(e) => setContratanteForm((f) => ({ ...f, nome: e.target.value }))} maxLength={120} />
                      </ClinicalField>
                      <ClinicalField label="CPF" required filled={!!contratanteForm.cpf?.trim()}>
                        <Input value={contratanteForm.cpf ?? ""} onChange={(e) => setContratanteForm((f) => ({ ...f, cpf: e.target.value }))} maxLength={20} />
                      </ClinicalField>
                      <ClinicalField label="RG" required filled={!!contratanteForm.rg?.trim()}>
                        <Input value={contratanteForm.rg ?? ""} onChange={(e) => setContratanteForm((f) => ({ ...f, rg: e.target.value }))} maxLength={20} />
                      </ClinicalField>
                      <ClinicalField label="Vínculo" required filled={!!contratanteForm.vinculo?.trim()}>
                        <Input value={contratanteForm.vinculo ?? ""} onChange={(e) => setContratanteForm((f) => ({ ...f, vinculo: e.target.value }))} placeholder="Mãe, filho(a), cônjuge…" maxLength={60} />
                      </ClinicalField>
                      <ClinicalField label="Telefone" required filled={!!contratanteForm.telefone?.trim()}>
                        <Input value={contratanteForm.telefone ?? ""} onChange={(e) => setContratanteForm((f) => ({ ...f, telefone: e.target.value }))} maxLength={30} />
                      </ClinicalField>
                      <ClinicalField label="Endereço" required filled={!!contratanteForm.endereco?.trim()} className="sm:col-span-2">
                        <Textarea value={contratanteForm.endereco ?? ""} onChange={(e) => setContratanteForm((f) => ({ ...f, endereco: e.target.value }))} rows={2} maxLength={240} />
                      </ClinicalField>
                      <ClinicalField label="E-mail" optional className="sm:col-span-2">
                        <Input type="email" value={contratanteForm.email ?? ""} onChange={(e) => setContratanteForm((f) => ({ ...f, email: e.target.value }))} maxLength={120} />
                      </ClinicalField>
                    </FormGrid>
                  )}
                </div>
              )}
            </Card>
          )}

          {/* STEP 3 — Visualização */}
          {step === 3 && (
            <Card className={cn(clinical.card, "space-y-4 p-5 shadow-none")}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">Confira os dados</h2>
                  <p className="text-xs text-muted-foreground">Revise antes de emitir o documento.</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setPreviewOpen(true)} disabled={!template || !patient}>
                  <Eye className="h-4 w-4 mr-2" /> Ver prévia completa
                </Button>
              </div>

              {missing.length > 0 && (
                <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-3 text-sm flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-700 dark:text-amber-300 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-medium text-amber-900 dark:text-amber-200">Pendências para emitir:</div>
                    <ul className="list-disc pl-4 text-xs text-amber-800 dark:text-amber-300/90 mt-1 space-y-0.5">
                      {missing.map((m, i) => <li key={i}>{m}</li>)}
                    </ul>
                    {professionalInfo && !professionalReady && (
                      <Link to="/app/profissionais">
                        <Button size="sm" variant="outline" className="mt-2">Abrir Profissionais</Button>
                      </Link>
                    )}
                  </div>
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-3">
                <SummaryRow label="Modelo" value={template?.name} badge={template ? (DOC_TYPE_LABEL[template.doc_type] || template.doc_type) : null} />
                <SummaryRow label="Paciente" value={patient?.nome_completo} sub={patient?.cpf ? `CPF ${patient.cpf}` : null} />
                <SummaryRow label="Profissional responsável" value={professional?.nome_completo} sub={professional ? `${professional.conselho ?? ""} ${professional.registro_conselho ?? ""}`.trim() || null : null} />
                <SummaryRow label="Clínica" value={(clinic as any)?.nome_fantasia || (clinic as any)?.razao_social || "—"} />
              </div>

              <div className="rounded-xl border bg-muted/30 p-4">
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Prévia do conteúdo</div>
                <div className="space-y-3 max-h-80 overflow-auto text-sm">
                  {renderedSections.length === 0 && <div className="text-muted-foreground">Selecione modelo e paciente para gerar a prévia.</div>}
                  {renderedSections.map((s, i) => (
                    <div key={i}>
                      <div className="font-semibold text-primary">{s.title}</div>
                      <div className="whitespace-pre-wrap text-foreground/90 text-xs">{s.body}</div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {/* STEP 4 — Emitir e Arquivar */}
          {step === 4 && (
            <Card className={cn(clinical.card, "space-y-4 p-5 shadow-none")}>
              <div>
                <h2 className="text-lg font-semibold">Emitir e arquivar</h2>
                <p className="text-xs text-muted-foreground">
                  O documento será gerado em PDF, armazenado no prontuário e disponibilizado para download imediato.
                </p>
              </div>

              {missing.length > 0 && (
                <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-3 text-sm flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-700 dark:text-amber-300 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-medium text-amber-900 dark:text-amber-200">Não é possível emitir ainda.</div>
                    <ul className="list-disc pl-4 text-xs text-amber-800 dark:text-amber-300/90 mt-1 space-y-0.5">
                      {missing.map((m, i) => <li key={i}>{m}</li>)}
                    </ul>
                  </div>
                </div>
              )}

              <div className="rounded-xl border border-blue-200 bg-blue-50/80 dark:bg-blue-950/20 dark:border-blue-900 p-3 text-xs text-blue-900 dark:text-blue-200">
                {CURRENT_LAYOUT_PREVIEW_NOTICE} Use este botão antes de arquivar para ver o layout atual do PDF.
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={!template || !patient || professionalLoading || !professionalReady}
                  onClick={() => void previewLiveDocumentPdf(buildPdfOpts())}
                >
                  <FileText className="h-4 w-4 mr-2" /> Pré-visualizar com layout atual
                </Button>
                <Button
                  type="button"
                  disabled={!canEmit || emit.isPending}
                  loading={emit.isPending}
                  onClick={() => emit.mutate()}
                  title={supportMode ? "Modo suporte: emissão bloqueada." : undefined}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {emit.isPending ? "Emitindo…" : "Emitir e arquivar"}
                </Button>
              </div>
            </Card>
          )}

          {/* Wizard navigation */}
          <div className="flex items-center justify-between">
            <Button variant="ghost" type="button" onClick={prev} disabled={step === 1}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
            </Button>
            {step < 4 && (
              <Button
                type="button"
                onClick={next}
                disabled={
                  (step === 1 && !canAdvanceFrom1) ||
                  (step === 2 && !canAdvanceFrom2)
                }
              >
                Avançar <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </div>

        {/* Side panel — Documentos emitidos */}
        <Card className={cn(clinical.card, "h-fit space-y-3 p-4 shadow-none lg:sticky lg:top-4")}>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm">Documentos do paciente</h2>
            {patient && <Badge variant="outline" className="max-w-[160px] truncate">{patient.nome_completo}</Badge>}
          </div>
          {!patient && (
            <EmptyState
              icon={User2}
              title="Nenhum paciente selecionado"
              description="Selecione um paciente para ver os documentos arquivados."
              className="py-8"
            />
          )}
          {patient && emitted.length === 0 && (
            <EmptyState
              icon={FileText}
              title="Nenhum documento emitido"
              description="Os documentos gerados aparecerão aqui após a emissão."
              className="py-8"
            />
          )}
          <div className="space-y-2 max-h-[60vh] overflow-auto">
            {emitted.map((d: any) => (
              <div key={d.id} className="border rounded-xl p-3 hover:bg-muted/40 transition-colors">
                <div className="font-medium text-sm truncate">{d.title}</div>
                <div className="text-xs text-muted-foreground flex flex-wrap gap-2 mt-1">
                  <Badge variant="secondary" className="text-[10px]">{DOC_TYPE_LABEL[d.doc_type] || d.doc_type}</Badge>
                  <span>{fmtDateTime(d.issued_at)}</span>
                </div>
                {d.locked_at && (
                  <div className="text-[10px] text-emerald-600 flex items-center gap-1 mt-1">
                    <Lock className="h-3 w-3" /> Assinado
                  </div>
                )}
                {d.pdf_url && (
                  <div className="mt-2">
                    <ClinicalDocumentPdfActions
                      document={d}
                      patientName={patient?.nome_completo}
                      compact
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Preview modal */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{template?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            {renderedSections.map((s, i) => (
              <div key={i}>
                <h3 className="font-semibold text-primary mb-1">{s.title}</h3>
                <div className="whitespace-pre-wrap text-foreground/90">{s.body}</div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function SummaryRow({ label, value, sub, badge }: { label: string; value?: string | null; sub?: string | null; badge?: string | null }) {
  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm font-medium mt-0.5 truncate">{value || <span className="text-muted-foreground">—</span>}</div>
      {sub && <div className="text-xs text-muted-foreground truncate">{sub}</div>}
      {badge && <Badge variant="secondary" className="mt-1 text-[10px]">{badge}</Badge>}
    </div>
  );
}

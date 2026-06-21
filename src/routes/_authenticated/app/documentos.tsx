import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Eye, Download, Save, Lock, Search } from "lucide-react";
import { toast } from "sonner";
import { buildPdf, previewPdf } from "@/lib/pdf";
import { buildMergeData, renderTemplateSections, type ContratanteData } from "@/lib/merge-tags";
import { useAuth } from "@/lib/auth";
import { fmtDate, fmtDateTime } from "@/lib/format";

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

function DocumentosPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const search = useSearch({ from: "/_authenticated/app/documentos" });

  const [patientId, setPatientId] = useState<string>(search.patient || "");
  const [templateId, setTemplateId] = useState<string>(search.template || "");
  const [patientSearch, setPatientSearch] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);

  // Contratante (apenas para Contrato): "Próprio paciente" ou "Responsável"
  const [contratanteMode, setContratanteMode] = useState<"paciente" | "responsavel">("paciente");
  const [contratanteForm, setContratanteForm] = useState<ContratanteData>({
    nome: "", cpf: "", rg: "", vinculo: "", telefone: "", endereco: "", email: "",
  });

  // ----- DATA -----
  const { data: activeClinicId } = useQuery({
    queryKey: ["active-clinic-id", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const [{ data: supportCid }, { data: ownCid }] = await Promise.all([
        supabase.rpc("current_support_session_clinic"),
        supabase.rpc("current_clinic_id"),
      ]);
      return ((supportCid as string | null) ?? (ownCid as string | null) ?? null);
    },
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["doc-templates-active"],
    queryFn: async () => {
      const { data } = await supabase
        .from("document_templates")
        .select("*")
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

  const filteredPatients = useMemo(() => {
    if (!patientSearch.trim()) return patients;
    const q = patientSearch.toLowerCase();
    return patients.filter((p: any) =>
      p.nome_completo?.toLowerCase().includes(q) || p.cpf?.includes(q),
    );
  }, [patients, patientSearch]);

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
        .from("assessments")
        .select("*")
        .eq("clinic_id", activeClinicId!)
        .eq("patient_id", patientId)
        .order("data", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const { data: scales = [] } = useQuery({
    queryKey: ["patient-scales", lastAssessment?.id],
    enabled: !!lastAssessment?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("assessment_scales")
        .select("*")
        .eq("assessment_id", lastAssessment!.id);
      return data || [];
    },
  });

  const { data: lastDischarge } = useQuery({
    queryKey: ["patient-discharge", patientId],
    enabled: !!patientId,
    queryFn: async () => {
      const { data } = await supabase
        .from("patient_discharges")
        .select("*")
        .eq("patient_id", patientId)
        .order("data_alta", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const { data: clinic } = useQuery({
    queryKey: ["clinic-settings"],
    queryFn: async () => {
      const { data: cid } = await supabase.rpc("current_clinic_id");
      if (!cid) return null;
      const { data } = await supabase.from("clinic_settings").select("*").eq("clinic_id", cid as string).maybeSingle();
      return data;
    },
  });

  const { data: professional } = useQuery({
    queryKey: ["my-professional", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data: byProfile } = await supabase
        .from("professionals")
        .select("*")
        .eq("profile_id", user!.id)
        .maybeSingle();
      if (byProfile) return byProfile;
      // Fallback: se o vínculo profile_id não existir, usa o primeiro profissional ativo da clínica.
      const { data: fallback } = await supabase
        .from("professionals")
        .select("*")
        .eq("situacao", "ativo")
        .order("nome")
        .limit(1)
        .maybeSingle();
      return fallback;
    },
  });

  const { data: emitted = [], refetch: refetchEmitted } = useQuery({
    queryKey: ["clinical-documents", activeClinicId, patientId],
    enabled: !!activeClinicId && !!patientId,
    queryFn: async () => {
      const { data } = await supabase
        .from("clinical_documents")
        .select("*")
        .eq("clinic_id", activeClinicId!)
        .eq("patient_id", patientId)
        .order("issued_at", { ascending: false });
      return data || [];
    },
  });

  // ----- RENDER -----
  const template = templates.find((t: any) => t.id === templateId);
  const isContractTemplate = !!template && /contrato/i.test(template.name || "");

  // Contratante efetivo: quando "próprio paciente", clona dados do paciente;
  // quando "responsável", usa o formulário.
  const effectiveContratante: ContratanteData | null = useMemo(() => {
    if (!isContractTemplate) return null;
    if (contratanteMode === "paciente") {
      return {
        nome: patient?.nome_completo ?? null,
        cpf: patient?.cpf ?? null,
        rg: patient?.rg ?? null,
        vinculo: "Próprio paciente",
        telefone: patient?.telefone ?? patient?.whatsapp ?? null,
        endereco: [patient?.endereco, patient?.bairro, patient?.cidade, patient?.estado].filter(Boolean).join(", ") || null,
        email: (patient as any)?.email ?? null,
      };
    }
    return contratanteForm;
  }, [isContractTemplate, contratanteMode, contratanteForm, patient]);

  const renderedSections = useMemo(() => {
    if (!template || !patient) return [];
    const data = buildMergeData({
      patient,
      assessment: lastAssessment,
      scales,
      professional,
      clinic,
      discharge: lastDischarge,
      contratante: effectiveContratante,
    });
    return renderTemplateSections((template.sections as any) || [], data);
  }, [template, patient, lastAssessment, scales, professional, clinic, lastDischarge, effectiveContratante]);

  const buildPdfOpts = () => ({
    title: template?.name || "Documento",
    subtitle: `Emitido em ${fmtDate(new Date())}`,
    patientName: patient?.nome_completo,
    professional: professional ?? null,
    sections: renderedSections,
    contratante: isContractTemplate
      ? {
          nome: effectiveContratante?.nome ?? null,
          cpf: effectiveContratante?.cpf ?? null,
          vinculo: effectiveContratante?.vinculo ?? null,
        }
      : null,
    patientSnapshot: isContractTemplate
      ? { nome: patient?.nome_completo ?? null, cpf: patient?.cpf ?? null }
      : null,
  });

  // ----- ACTIONS -----
  const emit = useMutation({
    mutationFn: async () => {
      if (!template || !patient) throw new Error("Selecione paciente e modelo");
      if (isContractTemplate && contratanteMode === "responsavel") {
        const f = contratanteForm;
        if (!f.nome?.trim() || !f.cpf?.trim() || !f.rg?.trim() || !f.vinculo?.trim() || !f.telefone?.trim() || !f.endereco?.trim()) {
          throw new Error("Preencha os dados obrigatórios do responsável (nome, CPF, RG, vínculo, telefone, endereço).");
        }
      }
      const hashBytes = crypto.getRandomValues(new Uint8Array(24));
      const validation_hash = Array.from(hashBytes).map((b) => b.toString(16).padStart(2, "0")).join("");

      const opts = { ...buildPdfOpts(), validationHash: validation_hash };

      // 2) build PDF blob
      const doc = await buildPdf(opts);
      const blob = doc.output("blob");
      const path = `clinical/${patient.id}/${template.doc_type}-${Date.now()}.pdf`;

      // 3) upload
      const { error: upErr } = await supabase.storage.from("documents").upload(path, blob, {
        contentType: "application/pdf",
        upsert: true,
      });
      if (upErr) throw upErr;

      // Map template → clinical_documents.doc_type (granular)
      const name = (template.name || "").toLowerCase();
      let cdocType: string;
      if (template.doc_type === "alta") cdocType = "alta";
      else if (template.doc_type === "encaminhamento") cdocType = "encaminhamento";
      else if (template.doc_type === "avaliacao_inicial") cdocType = "avaliacao";
      else if (template.doc_type === "reavaliacao") cdocType = "reavaliacao";
      else if (template.doc_type === "evolucao") cdocType = "evolucao";
      else if (template.doc_type === "relatorio") {
        if (name.includes("plano terap")) cdocType = "plano";
        else cdocType = "relatorio";
      } else if (template.doc_type === "parecer") {
        if (name.includes("contrato")) cdocType = "contrato";
        else if (name.includes("declara")) cdocType = "declaracao";
        else if (name.includes("termo")) cdocType = "termo";
        else if (name.includes("pericial") || name.includes("laudo")) cdocType = "laudo";
        else cdocType = "termo";
      } else cdocType = "relatorio";

      // 4) insert clinical_documents (already locked = official issuance)
      const nowIso = new Date().toISOString();
      const { error: insErr } = await supabase.from("clinical_documents").insert({
        patient_id: patient.id,
        professional_id: professional?.id ?? null,
        doc_type: cdocType as any,
        title: template.name,
        template_id: template.id,
        template_version: template.version,
        content: {
          sections: renderedSections,
          ...(isContractTemplate
            ? {
                contratante_mode: contratanteMode,
                contratante: effectiveContratante,
                paciente_snapshot: {
                  nome: patient.nome_completo,
                  cpf: patient.cpf,
                  rg: (patient as any).rg ?? null,
                },
              }
            : {}),
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
      // also trigger immediate download
      const url = URL.createObjectURL(r.blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(template?.name || "documento").replace(/\s+/g, "_")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      qc.invalidateQueries({ queryKey: ["clinical-documents", patientId] });
      refetchEmitted();
    },
    onError: (e: any) => toast.error(e.message || "Erro ao emitir"),
  });

  useEffect(() => {
    if (search.patient && search.patient !== patientId) setPatientId(search.patient);
    if (search.template && search.template !== templateId) setTemplateId(search.template);
  }, [search.patient, search.template]);

  const groupedTemplates = useMemo(() => {
    const g: Record<string, any[]> = {};
    for (const t of templates) {
      (g[t.doc_type] = g[t.doc_type] || []).push(t);
    }
    return g;
  }, [templates]);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">Emissão de Documentos</h1>
        <p className="text-sm text-muted-foreground">
          Selecione um modelo e um paciente. O documento será preenchido automaticamente com os dados clínicos e arquivado no prontuário.
        </p>
      </header>

      <div className="grid lg:grid-cols-[1fr_1fr] gap-4">
        {/* Coluna esquerda — seleção */}
        <Card className="p-4 space-y-4">
          <div>
            <Label>1. Modelo de documento</Label>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Selecionar modelo..." /></SelectTrigger>
              <SelectContent className="max-h-[60vh]">
                {Object.entries(groupedTemplates).map(([type, list]) => (
                  <div key={type}>
                    <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase">
                      {DOC_TYPE_LABEL[type] || type}
                    </div>
                    {list.map((t: any) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name} <span className="text-xs text-muted-foreground ml-1">v{t.version}</span>
                      </SelectItem>
                    ))}
                  </div>
                ))}
              </SelectContent>
            </Select>
            {template?.description && (
              <p className="text-xs text-muted-foreground mt-1">{template.description}</p>
            )}
          </div>

          <div>
            <Label>2. Paciente</Label>
            <div className="relative mt-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
                placeholder="Buscar por nome ou CPF..."
                className="pl-8"
              />
            </div>
            <div className="mt-2 max-h-64 overflow-auto border rounded">
              {filteredPatients.slice(0, 30).map((p: any) => (
                <button
                  key={p.id}
                  onClick={() => setPatientId(p.id)}
                  className={`block w-full text-left px-3 py-2 text-sm hover:bg-muted ${patientId === p.id ? "bg-primary/10 font-medium" : ""}`}
                >
                  {p.nome_completo}
                  {p.cpf && <span className="text-xs text-muted-foreground ml-2">CPF {p.cpf}</span>}
                </button>
              ))}
              {filteredPatients.length === 0 && (
                <div className="p-4 text-sm text-muted-foreground text-center">Nenhum paciente.</div>
              )}
            </div>
          </div>

          {isContractTemplate && (
            <div className="border-t pt-3 space-y-2">
              <Label>3. Contratante</Label>
              <RadioGroup
                value={contratanteMode}
                onValueChange={(v) => setContratanteMode(v as "paciente" | "responsavel")}
                className="flex flex-col sm:flex-row gap-3 text-sm"
              >
                <label className="flex items-center gap-2 cursor-pointer">
                  <RadioGroupItem value="paciente" id="ct-pac" />
                  <span>Próprio paciente</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <RadioGroupItem value="responsavel" id="ct-resp" />
                  <span>Responsável / contratante financeiro</span>
                </label>
              </RadioGroup>

              {contratanteMode === "responsavel" && (
                <div className="grid sm:grid-cols-2 gap-2 pt-2">
                  <div className="sm:col-span-2">
                    <Label className="text-xs">Nome completo *</Label>
                    <Input
                      value={contratanteForm.nome ?? ""}
                      onChange={(e) => setContratanteForm((f) => ({ ...f, nome: e.target.value }))}
                      maxLength={120}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">CPF *</Label>
                    <Input
                      value={contratanteForm.cpf ?? ""}
                      onChange={(e) => setContratanteForm((f) => ({ ...f, cpf: e.target.value }))}
                      maxLength={20}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">RG *</Label>
                    <Input
                      value={contratanteForm.rg ?? ""}
                      onChange={(e) => setContratanteForm((f) => ({ ...f, rg: e.target.value }))}
                      maxLength={20}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Vínculo com o paciente *</Label>
                    <Input
                      value={contratanteForm.vinculo ?? ""}
                      onChange={(e) => setContratanteForm((f) => ({ ...f, vinculo: e.target.value }))}
                      placeholder="Mãe, filho(a), cônjuge…"
                      maxLength={60}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Telefone *</Label>
                    <Input
                      value={contratanteForm.telefone ?? ""}
                      onChange={(e) => setContratanteForm((f) => ({ ...f, telefone: e.target.value }))}
                      maxLength={30}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-xs">Endereço *</Label>
                    <Textarea
                      value={contratanteForm.endereco ?? ""}
                      onChange={(e) => setContratanteForm((f) => ({ ...f, endereco: e.target.value }))}
                      rows={2}
                      maxLength={240}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-xs">E-mail (opcional)</Label>
                    <Input
                      type="email"
                      value={contratanteForm.email ?? ""}
                      onChange={(e) => setContratanteForm((f) => ({ ...f, email: e.target.value }))}
                      maxLength={120}
                    />
                  </div>
                </div>
              )}
            </div>
          )}


          <div className="flex flex-wrap gap-2 pt-2">
            <Button
              variant="outline"
              disabled={!template || !patient}
              onClick={() => setPreviewOpen(true)}
            >
              <Eye className="h-4 w-4 mr-2" /> Pré-visualizar
            </Button>
            <Button
              variant="outline"
              disabled={!template || !patient}
              onClick={() => previewPdf(buildPdfOpts())}
            >
              <FileText className="h-4 w-4 mr-2" /> Abrir PDF
            </Button>
            <Button
              disabled={!template || !patient || emit.isPending}
              onClick={() => emit.mutate()}
            >
              <Save className="h-4 w-4 mr-2" />
              {emit.isPending ? "Emitindo..." : "Emitir e arquivar"}
            </Button>
          </div>
        </Card>

        {/* Coluna direita — documentos emitidos do paciente */}
        <Card className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Documentos do paciente</h2>
            {patient && <Badge variant="outline">{patient.nome_completo}</Badge>}
          </div>
          {!patient && (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Selecione um paciente para ver os documentos arquivados.
            </p>
          )}
          {patient && emitted.length === 0 && (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Nenhum documento emitido ainda para este paciente.
            </p>
          )}
          <div className="space-y-2 max-h-[60vh] overflow-auto">
            {emitted.map((d: any) => (
              <div key={d.id} className="border rounded p-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-medium text-sm truncate">{d.title}</div>
                  <div className="text-xs text-muted-foreground flex flex-wrap gap-2 mt-1">
                    <Badge variant="secondary" className="text-[10px]">{DOC_TYPE_LABEL[d.doc_type] || d.doc_type}</Badge>
                    <span>{fmtDateTime(d.issued_at)}</span>
                    {d.locked_at && <span className="flex items-center gap-1 text-emerald-600"><Lock className="h-3 w-3" /> Assinado</span>}
                  </div>
                  {d.validation_hash && (
                    <code className="text-[10px] text-muted-foreground">#{String(d.validation_hash).slice(0, 12)}…</code>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  {d.pdf_url && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        const { data } = await supabase.storage.from("documents").createSignedUrl(d.pdf_url, 300);
                        if (data?.signedUrl) window.open(data.signedUrl, "_blank");
                      }}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Preview Modal */}
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
    </div>
  );
}

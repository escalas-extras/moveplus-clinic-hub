import { createFileRoute, Link, useParams, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import {
  AppShell,
  EmptyState,
  InfoCard,
  ClinicalSkeleton,
  ClinicalDialogBody,
  ClinicalDialogContent,
  ClinicalDialogHeader,
  ClinicalDialogTitle,
} from "@/components/layout";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  Plus,
  FileDown,
  Lock,
  Eye,
  Printer,
  CheckCircle2,
  Trash2,
  Pencil,
  ClipboardList,
  FileText,
  Activity,
} from "lucide-react";
import { fmtDate } from "@/lib/format";
import { PatientForm } from "@/components/patient-form";
import { EvolutionForm } from "@/components/evolution-form";
import { AssessmentForm } from "@/components/assessment-form";
import { AssessmentWizard } from "@/components/assessment-wizard";
import { toast } from "sonner";
import { buildPdf, downloadPdf, printPdf, uploadAndRegisterPdf } from "@/lib/pdf";
import { buildAssessmentPdfOpts, buildEvolutionPdfOpts } from "@/lib/pdf-builders";
import { PdfPreviewDialog } from "@/components/pdf-preview-dialog";
import { useAuth } from "@/lib/auth";
import { safeDeletePatient } from "@/lib/patient-delete";
import { deleteClinicalRecord, type ClinicalRecordTable } from "@/lib/clinical-record-delete";
import { useActiveClinic } from "@/lib/active-clinic";
import { ClinicalTabs } from "@/components/clinical/clinical-tabs";
import { PatientTimeline } from "@/components/clinical/patient-timeline";
import { DischargePanel } from "@/components/clinical/discharge-panel";
import { ReassessmentComparator } from "@/components/clinical/reassessment-comparator";
import { PatientDocumentsTab } from "@/components/clinical/patient-documents-tab";
import { GenerateDossierButton } from "@/components/clinical/generate-dossier-button";
import {
  Patient360Header,
  Patient360SummaryCards,
  Patient360NewSessionBar,
  Patient360ContinueCare,
  Patient360RecentDocuments,
  Patient360Alerts,
  usePatient360Counts,
  usePatient360NextSession,
} from "@/components/patient";
import { ModuleStack } from "@/components/ui-system";

export const Route = createFileRoute("/_authenticated/app/pacientes/$id")({
  component: PatientPage,
});

function PatientPage() {
  const { id } = useParams({ from: "/_authenticated/app/pacientes/$id" });
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { clinicId, isAdmin, supportMode } = useActiveClinic();
  const [editOpen, setEditOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{
    table: ClinicalRecordTable;
    rowId: string;
    title: string;
    description: string;
    lockedAt?: string | null;
    status?: string | null;
  } | null>(null);
  const [evoOpen, setEvoOpen] = useState(false);
  const [avalOpen, setAvalOpen] = useState(false);
  const [linkedEvoFor, setLinkedEvoFor] = useState<string | null>(null);
  const [editAssessment, setEditAssessment] = useState<any | null>(null);
  const [editMode, setEditMode] = useState<"wizard" | "classic">("wizard");
  const [pdfPreview, setPdfPreview] = useState<Parameters<typeof buildPdf>[0] | null>(null);
  const [activeTab, setActiveTab] = useState("avaliacoes");

  const patient = useQuery({
    queryKey: ["patient", clinicId, id],
    enabled: !!clinicId && !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patients")
        .select("*")
        .eq("clinic_id", clinicId!)
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const evolutions = useQuery({
    queryKey: ["evolutions", clinicId, id],
    enabled: !!clinicId && !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("evolutions")
        .select("*, professionals(nome, conselho, registro, profissao)")
        .eq("clinic_id", clinicId!)
        .eq("patient_id", id)
        .order("data", { ascending: false })
        .order("hora", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const assessments = useQuery({
    queryKey: ["assessments", clinicId, id],
    enabled: !!clinicId && !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessments")
        .select("*, professionals(nome, conselho, registro, profissao), assessment_modules(module_type)")
        .eq("clinic_id", clinicId!)
        .eq("patient_id", id)
        .order("data", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const update = useMutation({
    mutationFn: async (input: any) => {
      const { error } = await supabase.from("patients").update(input).eq("clinic_id", clinicId!).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Paciente atualizado");
      setEditOpen(false);
      qc.invalidateQueries({ queryKey: ["patient", clinicId, id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const finalize = useMutation({
    mutationFn: async (a: any) => {
      const { error } = await supabase
        .from("assessments")
        .update({ status: "finalizada", locked_at: new Date().toISOString() })
        .eq("clinic_id", clinicId!)
        .eq("id", a.id);
      if (error) throw error;
      await uploadAndRegisterPdf({
        pdfOpts: buildAssessmentPdfOpts(a, patient.data, evolutions.data ?? [], assessments.data ?? []),
        folder: a.tipo === "reavaliacao" ? "reavaliacoes" : "avaliacoes",
        tipo: a.tipo === "reavaliacao" ? "reavaliacao" : "avaliacao",
        patientId: a.patient_id,
        professionalId: a.professional_id,
        referenciaId: a.id,
        clinicId: clinicId!,
      });

    },
    onSuccess: () => {
      toast.success("Avaliação finalizada e PDF arquivado");
      qc.invalidateQueries({ queryKey: ["assessments", clinicId, id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const lock = useMutation({
    mutationFn: async ({ table, rowId }: { table: "assessments" | "evolutions"; rowId: string }) => {
      const { error } = await supabase.from(table).update({ locked_at: new Date().toISOString() }).eq("clinic_id", clinicId!).eq("id", rowId);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      toast.success("Registro assinado");
      qc.invalidateQueries({ queryKey: [v.table === "assessments" ? "assessments" : "evolutions", clinicId, id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteRecord = useMutation({
    mutationFn: async (input: {
      table: ClinicalRecordTable;
      rowId: string;
      lockedAt?: string | null;
      status?: string | null;
    }) => {
      if (!clinicId) throw new Error("Clínica ativa não identificada");
      await deleteClinicalRecord({
        clinicId,
        table: input.table,
        rowId: input.rowId,
        supportMode,
        lockedAt: input.lockedAt,
        status: input.status,
      });
      return input;
    },
    onSuccess: (v) => {
      toast.success("Registro excluído");
      setPendingDelete(null);
      qc.invalidateQueries({ queryKey: [v.table, clinicId, id] });
      qc.invalidateQueries({ queryKey: ["timeline", clinicId, id] });
      qc.invalidateQueries({ queryKey: ["patient-clinical-documents", clinicId, id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deletePatient = useMutation({
    mutationFn: async () => {
      if (!clinicId) throw new Error("Clínica ativa não identificada");
      return safeDeletePatient({ clinicId, patientId: id });
    },
    onSuccess: (res) => {
      toast.success(
        res.action === "deleted"
          ? "Paciente excluído"
          : "Paciente inativado (histórico clínico preservado)",
      );
      qc.invalidateQueries({ queryKey: ["patients", clinicId] });
      navigate({ to: "/app/pacientes" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const counts360 = usePatient360Counts(id);
  const nextSession = usePatient360NextSession(id);

  if (patient.isLoading || !clinicId) {
    return (
      <AppShell clinical>
        <ClinicalSkeleton variant="record" kpiCount={0} />
      </AppShell>
    );
  }
  if (!patient.data) {
    return (
      <AppShell clinical>
        <EmptyState
          icon={ClipboardList}
          title="Paciente não encontrado"
          description="O paciente solicitado não existe ou não pertence a esta clínica."
          action={{ label: "Voltar para pacientes", to: "/app/pacientes" }}
        />
      </AppShell>
    );
  }
  const p = patient.data;

  const assessmentsList = assessments.data ?? [];
  const evolutionsList = evolutions.data ?? [];
  const latestAssessment = assessmentsList[0] as any | undefined;
  const latestEvolution = evolutionsList[0] as any | undefined;
  const objetivoPrincipal =
    latestAssessment?.objetivos || latestAssessment?.queixa_principal || (p as any).cid_principal || null;
  const draftAssessmentsCount = assessmentsList.filter((a: any) => a.status !== "finalizada").length;
  const unsignedEvolutionsCount = evolutionsList.filter((e: any) => !e.locked_at).length;

  return (
    <AppShell clinical>
      <ModuleStack className="patient-360 space-y-5 sm:space-y-6 pb-24 sm:pb-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit text-muted-foreground">
        <Link to="/app/pacientes"><ArrowLeft className="h-4 w-4 mr-1.5" />Pacientes</Link>
      </Button>

      <Patient360Header
        patient={p as any}
        lastEvolutionDate={latestEvolution?.data ?? null}
      />

      <div className="flex flex-wrap items-center justify-end gap-2">
        <GenerateDossierButton
          patient={p as Record<string, unknown>}
          assessments={assessmentsList as Record<string, unknown>[]}
          evolutions={evolutionsList as Record<string, unknown>[]}
        />
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogTrigger asChild><Button variant="outline" size="sm"><Pencil className="h-4 w-4 mr-1.5" />Editar dados</Button></DialogTrigger>
          <ClinicalDialogContent>
            <ClinicalDialogHeader>
              <ClinicalDialogTitle>Editar paciente</ClinicalDialogTitle>
            </ClinicalDialogHeader>
            <ClinicalDialogBody>
              <PatientForm defaultValues={p as any} onSubmit={(v) => update.mutate(v)} submitting={update.isPending} />
            </ClinicalDialogBody>
          </ClinicalDialogContent>
        </Dialog>
        {isAdmin && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4 mr-1.5" />Excluir
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir {p.nome_completo}?</AlertDialogTitle>
                <AlertDialogDescription>
                  Se houver histórico clínico, financeiro ou agenda vinculado, o paciente será <strong>inativado</strong> (dados preservados). Caso contrário, será excluído definitivamente.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => deletePatient.mutate()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Confirmar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      <Patient360SummaryCards
        patientId={id}
        nextSessionLabel={nextSession.data ?? "Nenhuma sessão agendada"}
        therapeuticPlan={objetivoPrincipal}
        documentsCount={counts360.data?.documentsCount ?? 0}
        financialPendingCount={counts360.data?.financialPendingCount ?? 0}
        onOpenDocuments={() => setActiveTab("documentos")}
      />

      <Patient360NewSessionBar onNewSession={() => setEvoOpen(true)} />

      <Patient360Alerts
        patientId={id}
        draftAssessments={draftAssessmentsCount}
        unsignedEvolutions={unsignedEvolutionsCount}
      />

      <div className="grid gap-5 xl:grid-cols-[1.35fr_1fr]">
        <PatientTimeline patientId={id} />
        <div className="space-y-5">
          <Patient360ContinueCare
            patientId={id}
            assessments={assessmentsList as any}
            evolutions={evolutionsList as any}
            onNewEvolution={() => setEvoOpen(true)}
            onEditAssessment={(assessmentId) => {
              const a = assessmentsList.find((x: any) => x.id === assessmentId);
              if (a) {
                setEditMode("wizard");
                setEditAssessment(a);
              }
            }}
            onGoToTab={setActiveTab}
          />
          <Patient360RecentDocuments patientId={id} />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 sm:w-auto sm:inline-flex">
          <TabsTrigger value="avaliacoes" id="avaliacoes"><ClipboardList className="h-4 w-4 mr-1.5" />Avaliações</TabsTrigger>
          <TabsTrigger value="evolucoes" id="evolucoes">Evoluções</TabsTrigger>
          <TabsTrigger value="reavaliacao">Reavaliação</TabsTrigger>
          <TabsTrigger value="clinico">Clínico</TabsTrigger>
          <TabsTrigger value="documentos"><FileText className="h-4 w-4 mr-1.5" />Documentos</TabsTrigger>
          <TabsTrigger value="alta">Alta</TabsTrigger>
          <TabsTrigger value="dados">Dados</TabsTrigger>
        </TabsList>

        <TabsContent value="reavaliacao">
          <ReassessmentComparator patientId={id} />
        </TabsContent>

        <TabsContent value="documentos">
          <PatientDocumentsTab patientId={id} />
        </TabsContent>

        <TabsContent value="alta">
          <DischargePanel patientId={id} patient={p} />
        </TabsContent>



        <TabsContent value="dados">
          <InfoCard icon={ClipboardList} title="Dados cadastrais" description="Informações pessoais e de contato do paciente.">
            <div className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
              <Info label="Data de nascimento" value={fmtDate(p.data_nascimento)} />
              <Info label="Estado civil" value={p.estado_civil} />
              <Info label="Profissão" value={p.profissao} />
              <Info label="Naturalidade" value={p.naturalidade} />
              <Info label="Telefone" value={p.telefone} />
              <Info label="WhatsApp" value={p.whatsapp} />
              <Info label="Convênio" value={[(p as any).convenio_nome, (p as any).convenio_carteirinha].filter(Boolean).join(" · ")} />
              <Info label="Endereço residencial" value={p.endereco} />
              <Info label="Endereço comercial" value={p.endereco_comercial} />
              <Info label="Bairro" value={p.bairro} />
              <Info label="Cidade / Estado" value={[p.cidade, p.estado].filter(Boolean).join(" - ")} />
              <Info label="CEP" value={p.cep} />
              <Info label="Responsável" value={p.responsavel} />
              <Info label="Contato p/ recado" value={p.contato_recado} />
              <Info label="Observações" value={p.observacoes} className="sm:col-span-2 lg:col-span-3" />
            </div>
          </InfoCard>
        </TabsContent>

        <TabsContent value="avaliacoes">
          <div className="flex justify-end mb-3">
            <Dialog open={avalOpen} onOpenChange={(o) => { setAvalOpen(o); if (o) setEditMode("wizard"); }}>
              <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Nova avaliação</Button></DialogTrigger>
              <ClinicalDialogContent>
                <ClinicalDialogHeader>
                  <ClinicalDialogTitle className="flex flex-wrap items-center justify-between gap-3">
                    <span>Nova avaliação fisioterapêutica</span>
                    <div className="flex gap-1 text-xs">
                      <button
                        type="button"
                        onClick={() => setEditMode("wizard")}
                        className={`rounded-md border px-2 py-1 ${editMode === "wizard" ? "border-primary bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                      >Wizard</button>
                      <button
                        type="button"
                        onClick={() => setEditMode("classic")}
                        className={`rounded-md border px-2 py-1 ${editMode === "classic" ? "border-primary bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                      >Modo clássico</button>
                    </div>
                  </ClinicalDialogTitle>
                </ClinicalDialogHeader>
                <ClinicalDialogBody>
                  {editMode === "wizard" ? (
                    <AssessmentWizard patientId={p.id} patient={p} onDone={() => { setAvalOpen(false); qc.invalidateQueries({ queryKey: ["assessments", clinicId, id] }); }} />
                  ) : (
                    <AssessmentForm patientId={p.id} patient={p} onDone={() => { setAvalOpen(false); qc.invalidateQueries({ queryKey: ["assessments", clinicId, id] }); }} />
                  )}
                </ClinicalDialogBody>
              </ClinicalDialogContent>
            </Dialog>
          </div>
          <div className="space-y-3">
            {!assessments.data?.length && (
              <EmptyState
                icon={ClipboardList}
                title="Sem avaliações registradas"
                description="Crie a primeira avaliação fisioterapêutica para iniciar o histórico clínico deste paciente."
                action={{ label: "Nova avaliação", onClick: () => { setEditMode("wizard"); setAvalOpen(true); } }}
                className="py-12"
              />
            )}
            {assessments.data?.map((a: any) => {
              const linked = evolutions.data?.filter((e: any) => e.assessment_id === a.id) ?? [];
              return (
                <Card key={a.id} className="p-5">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <div className="text-sm font-medium capitalize">{a.tipo} · {fmtDate(a.data)}</div>
                      <div className="text-xs text-muted-foreground">{a.professionals?.nome}</div>
                      <div className="text-xs mt-1 flex flex-wrap gap-1">
                        {a.assessment_modules?.map((m: any) => (
                          <span key={m.module_type} className="rounded-full bg-secondary px-2 py-0.5 text-secondary-foreground">{m.module_type}</span>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <span className={`text-xs self-center px-2 py-0.5 rounded-full ${a.status === "finalizada" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                        {a.status === "finalizada" ? "Finalizada" : "Rascunho"}
                      </span>
                      <Button size="sm" variant="outline" onClick={() => setPdfPreview(buildAssessmentPdfOpts(a, p, evolutions.data ?? [], assessments.data ?? []))}><Eye className="h-4 w-4 mr-1" />Visualizar</Button>
                      <Button size="sm" variant="outline" onClick={() => downloadPdf(buildAssessmentPdfOpts(a, p, evolutions.data ?? [], assessments.data ?? []))}><FileDown className="h-4 w-4 mr-1" />Baixar</Button>
                      <Button size="sm" variant="outline" onClick={() => printPdf(buildAssessmentPdfOpts(a, p, evolutions.data ?? [], assessments.data ?? []))}><Printer className="h-4 w-4 mr-1" />Imprimir</Button>

                      {a.status !== "finalizada" && (
                        <Button size="sm" onClick={() => finalize.mutate(a)} disabled={finalize.isPending}>
                          <CheckCircle2 className="h-4 w-4 mr-1" />Finalizar
                        </Button>
                      )}
                      {(isAdmin || a.status !== "finalizada") && (
                        <Button size="sm" variant="outline" onClick={() => { setEditMode("wizard"); setEditAssessment(a); }}>
                          <Pencil className="h-4 w-4 mr-1" />Editar
                        </Button>
                      )}
                      {isAdmin && !supportMode && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive hover:text-destructive"
                          onClick={() =>
                            setPendingDelete({
                              table: "assessments",
                              rowId: a.id,
                              title: "Excluir esta avaliação?",
                              description: `A avaliação de ${fmtDate(a.data)} será removida permanentemente. As evoluções vinculadas permanecerão, mas perderão o vínculo.`,
                              lockedAt: a.locked_at,
                              status: a.status,
                            })
                          }
                        >
                          <Trash2 className="h-4 w-4 mr-1" />Excluir
                        </Button>
                      )}
                    </div>
                  </div>
                  {a.queixa_principal && <p className="text-sm mt-3"><b>Queixa:</b> {a.queixa_principal}</p>}

                  <div className="mt-4 border-t pt-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Evoluções vinculadas ({linked.length})
                      </div>
                      <Button size="sm" variant="outline" onClick={() => setLinkedEvoFor(a.id)}>
                        <Plus className="h-3 w-3 mr-1" />Nova evolução
                      </Button>
                    </div>
                    {linked.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Nenhuma evolução vinculada a esta avaliação.</p>
                    ) : (
                      <ul className="space-y-1.5 text-xs">
                        {linked.map((e: any) => (
                          <li key={e.id} className="flex flex-wrap gap-x-2">
                            <span className="font-medium">{fmtDate(e.data)} {String(e.hora).slice(0, 5)}</span>
                            <span className="text-muted-foreground">— {e.professionals?.nome}</span>
                            {e.evolucao_observada && <span className="text-muted-foreground">· {e.evolucao_observada.slice(0, 80)}{e.evolucao_observada.length > 80 ? "…" : ""}</span>}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>

          <Dialog open={!!linkedEvoFor} onOpenChange={(o) => !o && setLinkedEvoFor(null)}>
            <ClinicalDialogContent className="h-[min(88vh,920px)] w-[min(90vw,960px)]">
              <ClinicalDialogHeader>
                <ClinicalDialogTitle>Nova evolução vinculada à avaliação</ClinicalDialogTitle>
              </ClinicalDialogHeader>
              <ClinicalDialogBody>
              {linkedEvoFor && (
              <EvolutionForm
                patientId={p.id}
                patient={p}
                assessmentId={linkedEvoFor}
                onDone={() => { setLinkedEvoFor(null); qc.invalidateQueries({ queryKey: ["evolutions", clinicId, id] }); }}
              />
              )}
              </ClinicalDialogBody>
            </ClinicalDialogContent>
          </Dialog>

          <Dialog open={!!editAssessment} onOpenChange={(o) => !o && setEditAssessment(null)}>
            <ClinicalDialogContent>
              <ClinicalDialogHeader>
                <ClinicalDialogTitle className="flex flex-wrap items-center justify-between gap-3">
                  <span>Editar avaliação {editAssessment?.status === "finalizada" ? "(finalizada · admin)" : ""}</span>
                  <div className="flex gap-1 text-xs">
                    <button
                      type="button"
                      onClick={() => setEditMode("wizard")}
                      className={`rounded-md border px-2 py-1 ${editMode === "wizard" ? "border-primary bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                    >Wizard</button>
                    <button
                      type="button"
                      onClick={() => setEditMode("classic")}
                      className={`rounded-md border px-2 py-1 ${editMode === "classic" ? "border-primary bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                    >Modo clássico</button>
                  </div>
                </ClinicalDialogTitle>
              </ClinicalDialogHeader>
              <ClinicalDialogBody>
              {editAssessment && (
                editMode === "wizard" ? (
                  <AssessmentWizard
                    patientId={p.id}
                    patient={p}
                    assessment={editAssessment}
                    onDone={() => { setEditAssessment(null); qc.invalidateQueries({ queryKey: ["assessments", clinicId, id] }); }}
                  />
                ) : (
                  <AssessmentForm
                    patientId={p.id}
                    patient={p}
                    assessment={editAssessment}
                    onDone={() => { setEditAssessment(null); qc.invalidateQueries({ queryKey: ["assessments", clinicId, id] }); }}
                  />
                )
              )}
              </ClinicalDialogBody>
            </ClinicalDialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="evolucoes">
          <div className="flex justify-end mb-3">
            <Dialog open={evoOpen} onOpenChange={setEvoOpen}>
              <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Nova evolução</Button></DialogTrigger>
              <ClinicalDialogContent>
                <ClinicalDialogHeader>
                  <ClinicalDialogTitle>Nova evolução</ClinicalDialogTitle>
                </ClinicalDialogHeader>
                <ClinicalDialogBody>
                <EvolutionForm patientId={p.id} patient={p} onDone={() => { setEvoOpen(false); qc.invalidateQueries({ queryKey: ["evolutions", clinicId, id] }); }} />
                </ClinicalDialogBody>
              </ClinicalDialogContent>
            </Dialog>
          </div>
          <div className="space-y-3">
            {!evolutions.data?.length && (
              <EmptyState
                icon={Activity}
                title="Sem evoluções registradas"
                description="Registre a primeira evolução para acompanhar a progressão clínica do paciente."
                action={{ label: "Nova evolução", onClick: () => setEvoOpen(true) }}
                className="py-12"
              />
            )}
            {evolutions.data?.map((e: any) => (
              <Card key={e.id} className="p-5">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="text-sm font-medium">{fmtDate(e.data)} · {String(e.hora).slice(0, 5)}</div>
                    <div className="text-xs text-muted-foreground">
                      {e.professionals?.nome}{e.assessment_id ? " · vinculada a uma avaliação" : ""}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" variant="outline" onClick={() => setPdfPreview(buildEvolutionPdfOpts(e, p))}><Eye className="h-4 w-4 mr-1" />Visualizar</Button>
                    <Button size="sm" variant="outline" onClick={() => downloadPdf(buildEvolutionPdfOpts(e, p))}><FileDown className="h-4 w-4 mr-1" />Baixar</Button>
                    <Button size="sm" variant="outline" onClick={() => printPdf(buildEvolutionPdfOpts(e, p))}><Printer className="h-4 w-4 mr-1" />Imprimir</Button>
                    {!e.locked_at && <Button size="sm" variant="outline" onClick={() => lock.mutate({ table: "evolutions", rowId: e.id })}><Lock className="h-4 w-4 mr-1" />Assinar</Button>}
                    {e.locked_at && <span className="text-xs text-muted-foreground self-center">Assinada</span>}
                    {isAdmin && !supportMode && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:text-destructive"
                        onClick={() =>
                          setPendingDelete({
                            table: "evolutions",
                            rowId: e.id,
                            title: "Excluir esta evolução?",
                            description: `A evolução de ${fmtDate(e.data)} será removida permanentemente.`,
                            lockedAt: e.locked_at,
                          })
                        }
                      >
                        <Trash2 className="h-4 w-4 mr-1" />Excluir
                      </Button>
                    )}
                  </div>
                </div>
                <div className="mt-3 grid sm:grid-cols-2 gap-3 text-sm">
                  {e.procedimentos && <div><b>Conduta:</b> {e.procedimentos}</div>}
                  {e.resposta_paciente && <div><b>Estado do paciente:</b> {e.resposta_paciente}</div>}
                  {e.evolucao_observada && <div className="sm:col-span-2"><b>Resultados:</b> {e.evolucao_observada}</div>}
                  {e.intercorrencias && <div className="sm:col-span-2"><b>Intercorrências:</b> {e.intercorrencias}</div>}
                  {e.conduta && <div className="sm:col-span-2"><b>Próximos passos:</b> {e.conduta}</div>}
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="clinico">
          <ClinicalTabs patientId={id} />
        </TabsContent>
      </Tabs>
      </ModuleStack>
      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(open) => {
          if (!open && !deleteRecord.isPending) setPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{pendingDelete?.title}</AlertDialogTitle>
            <AlertDialogDescription>{pendingDelete?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteRecord.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteRecord.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault();
                if (!pendingDelete) return;
                deleteRecord.mutate({
                  table: pendingDelete.table,
                  rowId: pendingDelete.rowId,
                  lockedAt: pendingDelete.lockedAt,
                  status: pendingDelete.status,
                });
              }}
            >
              {deleteRecord.isPending ? "Excluindo…" : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <PdfPreviewDialog
        open={!!pdfPreview}
        onOpenChange={(o) => !o && setPdfPreview(null)}
        pdfOpts={pdfPreview}
      />
    </AppShell>
  );
}

function Info({ label, value, className }: { label: string; value: any; className?: string }) {
  return (
    <div className={className}>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5">{value || "—"}</div>
    </div>
  );
}



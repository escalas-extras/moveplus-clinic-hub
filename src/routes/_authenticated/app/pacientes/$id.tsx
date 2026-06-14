import { createFileRoute, Link, useParams, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ArrowLeft, Plus, FileDown, Lock, Eye, Printer, CheckCircle2, Trash2, Pencil } from "lucide-react";
import { calcAge, fmtDate } from "@/lib/format";
import { PatientForm } from "@/components/patient-form";
import { EvolutionForm } from "@/components/evolution-form";
import { AssessmentForm } from "@/components/assessment-form";
import { toast } from "sonner";
import { downloadPdf, previewPdf, printPdf, uploadAndRegisterPdf } from "@/lib/pdf";
import { useAuth, useRoles } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/app/pacientes/$id")({
  component: PatientPage,
});

function PatientPage() {
  const { id } = useParams({ from: "/_authenticated/app/pacientes/$id" });
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { isAdmin } = useRoles(user?.id);
  const [editOpen, setEditOpen] = useState(false);
  const [evoOpen, setEvoOpen] = useState(false);
  const [avalOpen, setAvalOpen] = useState(false);
  const [linkedEvoFor, setLinkedEvoFor] = useState<string | null>(null);
  const [editAssessment, setEditAssessment] = useState<any | null>(null);

  const patient = useQuery({
    queryKey: ["patient", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("patients").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

  const evolutions = useQuery({
    queryKey: ["evolutions", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("evolutions")
        .select("*, professionals(nome, conselho, registro, profissao)")
        .eq("patient_id", id)
        .order("data", { ascending: false })
        .order("hora", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const assessments = useQuery({
    queryKey: ["assessments", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessments")
        .select("*, professionals(nome, conselho, registro, profissao), assessment_modules(module_type)")
        .eq("patient_id", id)
        .order("data", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const update = useMutation({
    mutationFn: async (input: any) => {
      const { error } = await supabase.from("patients").update(input).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Paciente atualizado");
      setEditOpen(false);
      qc.invalidateQueries({ queryKey: ["patient", id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const finalize = useMutation({
    mutationFn: async (a: any) => {
      const { error } = await supabase
        .from("assessments")
        .update({ status: "finalizada", locked_at: new Date().toISOString() })
        .eq("id", a.id);
      if (error) throw error;
      await uploadAndRegisterPdf({
        pdfOpts: buildAssessmentPdfOpts(a, patient.data, evolutions.data ?? []),
        folder: a.tipo === "reavaliacao" ? "reavaliacoes" : "avaliacoes",
        tipo: a.tipo === "reavaliacao" ? "reavaliacao" : "avaliacao",
        patientId: a.patient_id,
        professionalId: a.professional_id,
        referenciaId: a.id,
      });

    },
    onSuccess: () => {
      toast.success("Avaliação finalizada e PDF arquivado");
      qc.invalidateQueries({ queryKey: ["assessments", id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const lock = useMutation({
    mutationFn: async ({ table, rowId }: { table: "assessments" | "evolutions"; rowId: string }) => {
      const { error } = await supabase.from(table).update({ locked_at: new Date().toISOString() }).eq("id", rowId);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      toast.success("Registro assinado");
      qc.invalidateQueries({ queryKey: [v.table === "assessments" ? "assessments" : "evolutions", id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteRecord = useMutation({
    mutationFn: async ({ table, rowId }: { table: "assessments" | "evolutions"; rowId: string }) => {
      const { error } = await supabase.from(table).delete().eq("id", rowId);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      toast.success("Registro excluído");
      qc.invalidateQueries({ queryKey: [v.table === "assessments" ? "assessments" : "evolutions", id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deletePatient = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("patients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Paciente excluído");
      qc.invalidateQueries({ queryKey: ["patients"] });
      navigate({ to: "/app/pacientes" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (patient.isLoading) return <div className="text-sm text-muted-foreground">Carregando…</div>;
  if (!patient.data) return <div>Paciente não encontrado.</div>;
  const p = patient.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm"><Link to="/app/pacientes"><ArrowLeft className="h-4 w-4 mr-1" />Voltar</Link></Button>
          <div>
            <h1 className="text-2xl">{p.nome_completo}</h1>
            <p className="text-xs text-muted-foreground">
              {calcAge(p.data_nascimento) ?? "—"} anos · {p.sexo ?? "—"} · {p.cpf ?? "Sem CPF"}
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogTrigger asChild><Button variant="outline">Editar dados</Button></DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Editar paciente</DialogTitle></DialogHeader>
              <PatientForm defaultValues={p as any} onSubmit={(v) => update.mutate(v)} submitting={update.isPending} />
            </DialogContent>
          </Dialog>
          {isAdmin && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4 mr-1" />Excluir paciente
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir {p.nome_completo}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Remove permanentemente o paciente e todos os dados clínicos vinculados (avaliações, evoluções, anexos, agendamentos). Ação irreversível.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => deletePatient.mutate()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Excluir definitivamente
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      <Tabs defaultValue="dados">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="dados">Dados</TabsTrigger>
          <TabsTrigger value="avaliacoes">Avaliações</TabsTrigger>
          <TabsTrigger value="evolucoes">Evoluções</TabsTrigger>
        </TabsList>

        <TabsContent value="dados">
          <Card className="p-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <Info label="Data de nascimento" value={fmtDate(p.data_nascimento)} />
            <Info label="Estado civil" value={p.estado_civil} />
            <Info label="Profissão" value={p.profissao} />
            <Info label="Naturalidade" value={p.naturalidade} />
            <Info label="Telefone" value={p.telefone} />
            <Info label="WhatsApp" value={p.whatsapp} />
            <Info label="Endereço residencial" value={p.endereco} />
            <Info label="Endereço comercial" value={p.endereco_comercial} />
            <Info label="Bairro" value={p.bairro} />
            <Info label="Cidade / Estado" value={[p.cidade, p.estado].filter(Boolean).join(" - ")} />
            <Info label="CEP" value={p.cep} />
            <Info label="Responsável" value={p.responsavel} />
            <Info label="Contato p/ recado" value={p.contato_recado} />
            <Info label="Observações" value={p.observacoes} className="sm:col-span-2 lg:col-span-3" />
          </Card>
        </TabsContent>

        <TabsContent value="avaliacoes">
          <div className="flex justify-end mb-3">
            <Dialog open={avalOpen} onOpenChange={setAvalOpen}>
              <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Nova avaliação</Button></DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Nova avaliação fisioterapêutica — Modelo CREFITO-8</DialogTitle></DialogHeader>
                <AssessmentForm patientId={p.id} patient={p} onDone={() => { setAvalOpen(false); qc.invalidateQueries({ queryKey: ["assessments", id] }); }} />
              </DialogContent>
            </Dialog>
          </div>
          <div className="space-y-3">
            {!assessments.data?.length && <Card className="p-6 text-sm text-muted-foreground">Sem avaliações registradas.</Card>}
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
                      <Button size="sm" variant="outline" onClick={() => previewPdf(buildAssessmentPdfOpts(a, p, evolutions.data ?? []))}><Eye className="h-4 w-4 mr-1" />Visualizar</Button>
                      <Button size="sm" variant="outline" onClick={() => downloadPdf(buildAssessmentPdfOpts(a, p, evolutions.data ?? []))}><FileDown className="h-4 w-4 mr-1" />Baixar</Button>
                      <Button size="sm" variant="outline" onClick={() => printPdf(buildAssessmentPdfOpts(a, p, evolutions.data ?? []))}><Printer className="h-4 w-4 mr-1" />Imprimir</Button>

                      {a.status !== "finalizada" && (
                        <Button size="sm" onClick={() => finalize.mutate(a)} disabled={finalize.isPending}>
                          <CheckCircle2 className="h-4 w-4 mr-1" />Finalizar
                        </Button>
                      )}
                      {isAdmin && (
                        <Button size="sm" variant="outline" onClick={() => setEditAssessment(a)}>
                          <Pencil className="h-4 w-4 mr-1" />Editar
                        </Button>
                      )}
                      {isAdmin && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="outline" className="text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4 mr-1" />Excluir
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir esta avaliação?</AlertDialogTitle>
                              <AlertDialogDescription>
                                A avaliação de {fmtDate(a.data)} será removida permanentemente. As evoluções vinculadas permanecerão, mas perderão o vínculo.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteRecord.mutate({ table: "assessments", rowId: a.id })} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
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
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Nova evolução vinculada à avaliação</DialogTitle></DialogHeader>
              {linkedEvoFor && (
                <EvolutionForm
                  patientId={p.id}
                  assessmentId={linkedEvoFor}
                  onDone={() => { setLinkedEvoFor(null); qc.invalidateQueries({ queryKey: ["evolutions", id] }); }}
                />
              )}
            </DialogContent>
          </Dialog>

          <Dialog open={!!editAssessment} onOpenChange={(o) => !o && setEditAssessment(null)}>
            <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  Editar avaliação {editAssessment?.status === "finalizada" ? "(finalizada · acesso de administrador)" : ""}
                </DialogTitle>
              </DialogHeader>
              {editAssessment && (
                <AssessmentForm
                  patientId={p.id}
                  patient={p}
                  assessment={editAssessment}
                  onDone={() => { setEditAssessment(null); qc.invalidateQueries({ queryKey: ["assessments", id] }); }}
                />
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="evolucoes">
          <div className="flex justify-end mb-3">
            <Dialog open={evoOpen} onOpenChange={setEvoOpen}>
              <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Nova evolução</Button></DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Nova evolução</DialogTitle></DialogHeader>
                <EvolutionForm patientId={p.id} onDone={() => { setEvoOpen(false); qc.invalidateQueries({ queryKey: ["evolutions", id] }); }} />
              </DialogContent>
            </Dialog>
          </div>
          <div className="space-y-3">
            {!evolutions.data?.length && <Card className="p-6 text-sm text-muted-foreground">Sem evoluções.</Card>}
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
                    <Button size="sm" variant="outline" onClick={() => previewPdf(buildEvolutionPdfOpts(e, p))}><Eye className="h-4 w-4 mr-1" />Visualizar</Button>
                    <Button size="sm" variant="outline" onClick={() => downloadPdf(buildEvolutionPdfOpts(e, p))}><FileDown className="h-4 w-4 mr-1" />Baixar</Button>
                    <Button size="sm" variant="outline" onClick={() => printPdf(buildEvolutionPdfOpts(e, p))}><Printer className="h-4 w-4 mr-1" />Imprimir</Button>
                    {!e.locked_at && <Button size="sm" variant="outline" onClick={() => lock.mutate({ table: "evolutions", rowId: e.id })}><Lock className="h-4 w-4 mr-1" />Assinar</Button>}
                    {e.locked_at && <span className="text-xs text-muted-foreground self-center">Assinada</span>}
                    {isAdmin && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="outline" className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4 mr-1" />Excluir
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir esta evolução?</AlertDialogTitle>
                            <AlertDialogDescription>
                              A evolução de {fmtDate(e.data)} será removida permanentemente.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteRecord.mutate({ table: "evolutions", rowId: e.id })} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
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
      </Tabs>
    </div>
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

function fmtYesNo(v: any) {
  if (v === true) return "Sim";
  if (v === false) return "Não";
  return "—";
}

const PDF_HABITOS: { id: string; label: string }[] = [
  { id: "atividade_fisica", label: "Realiza atividade física?" },
  { id: "qualidade_sono", label: "Boa qualidade do sono?" },
  { id: "alimentacao", label: "Alimentação saudável?" },
  { id: "internacoes", label: "Internações recentes?" },
  { id: "quedas", label: "Quedas nos últimos 12 meses?" },
  { id: "cirurgia_previa", label: "Cirurgia prévia?" },
  { id: "fadiga_dispneia", label: "Fadiga / dispneia?" },
  { id: "angina", label: "Angina / aperto / queimação?" },
  { id: "formigamento_mmii", label: "Formigamento em MMII?" },
  { id: "sincope", label: "Quadro de síncope?" },
  { id: "sequela_motora", label: "Sequela motora?" },
  { id: "fumante", label: "Fumante?" },
  { id: "alcool", label: "Bebida alcoólica / substâncias?" },
  { id: "multidisciplinar", label: "Equipe multidisciplinar?" },
  { id: "atividade_social", label: "Atividade social / lazer?" },
  { id: "deambula", label: "Deambula?" },
  { id: "auxiliar_marcha", label: "Auxiliar de marcha?" },
  { id: "cadeirante_acamado", label: "Cadeirante / acamado?" },
  { id: "esfincter", label: "Controle de esfíncter?" },
  { id: "vertigem", label: "Vertigem?" },
  { id: "visao", label: "Distúrbio de visão?" },
  { id: "audicao", label: "Distúrbio de audição?" },
  { id: "outros_tratamentos", label: "Outros tratamentos?" },
];
const PDF_SEGMENTOS = ["MSD", "MSE", "MID", "MIE", "Tronco", "Face"] as const;
const PDF_POSTURA = [
  { id: "cabeca", label: "Cabeça" },
  { id: "ombros", label: "Ombros" },
  { id: "mmss", label: "MMSS" },
  { id: "coluna", label: "Coluna" },
  { id: "pelve", label: "Pelve" },
  { id: "mmii", label: "MMII" },
  { id: "joelhos", label: "Joelhos" },
  { id: "tornozelos", label: "Tornozelos" },
  { id: "pes", label: "Pés" },
];

function buildEvolutionPdfOpts(e: any, p: any) {
  const sv: Array<[string, string]> = [];
  if (e.pa) sv.push(["PA", String(e.pa)]);
  if (e.fc != null && e.fc !== "") sv.push(["FC", `${e.fc} bpm`]);
  if (e.fr != null && e.fr !== "") sv.push(["FR", `${e.fr} irpm`]);
  if (e.spo2 != null && e.spo2 !== "") sv.push(["SpO₂", `${e.spo2}%`]);

  return {
    title: `Evolução Clínica`,
    subtitle: `${fmtDate(e.data)}${e.hora ? ` às ${String(e.hora).slice(0, 5)}` : ""}`,
    patientName: p.nome_completo,
    professional: e.professionals,
    blocks: [
      {
        title: "Identificação",
        children: [
          {
            kind: "grid" as const,
            rows: [
              ["Paciente", p?.nome_completo ?? "—"],
              ["Data / Hora", `${fmtDate(e.data)}${e.hora ? ` ${String(e.hora).slice(0, 5)}` : ""}`],
              ["Profissional", e.professionals?.nome ?? "—"],
              ["Registro", e.professionals?.registro ?? e.professionals?.conselho ?? "—"],
            ],
          },
        ],
      },
      ...(sv.length || e.eva != null
        ? [{
            title: "Sinais vitais e dor",
            children: [
              ...(sv.length ? [{ kind: "grid" as const, rows: sv, columns: 2 as const }] : []),
              { kind: "eva" as const, value: e.eva ?? null },
            ],
          }]
        : []),
      {
        title: "Sessão",
        children: [
          { kind: "highlight" as const, label: "Conduta aplicada", text: e.procedimentos || "—" },
          { kind: "paragraph" as const, label: "Estado de saúde do paciente", text: e.resposta_paciente || "—" },
          { kind: "paragraph" as const, label: "Resultados observados", text: e.evolucao_observada || "—" },
          { kind: "paragraph" as const, label: "Intercorrências", text: e.intercorrencias || "—" },
          { kind: "paragraph" as const, label: "Próximos passos", text: e.conduta || "—" },
          { kind: "paragraph" as const, label: "Próximos objetivos", text: e.proximos_objetivos || "—" },
        ],
      },
    ],
  };
}

function buildGeriatricChildren(a: any): any[] {
  const children: any[] = [];

  // Doenças previas
  const doencas: any[] = Array.isArray(a.doencas_previas) ? a.doencas_previas : [];
  const doencasRows = doencas
    .filter((d) => d && (d.patologia || d.medicamento || d.observacao))
    .map((d) => [d.patologia || "—", [d.medicamento && `Med.: ${d.medicamento}`, d.observacao && `Obs.: ${d.observacao}`].filter(Boolean).join(" · ") || "—"] as [string, string]);
  if (doencasRows.length) {
    children.push({ kind: "paragraph" as const, label: "Doenças preexistentes", text: "" });
    children.push({ kind: "grid" as const, rows: doencasRows, columns: 2 as const });
  }

  // Sinais vitais
  const sv = a.sinais_vitais || {};
  const svRows: Array<[string, string]> = [];
  const push = (k: string, v: any) => { if (v != null && String(v).trim() !== "") svRows.push([k, String(v)]); };
  push("PA", sv.pa); push("FC", sv.fc); push("FR", sv.fr); push("PR", sv.pr); push("SpO₂", sv.spo2);
  push("Ausculta", sv.ausculta); push("Tosse", sv.tosse); push("Secreção", sv.secrecao);
  push("Tônus", sv.tonus); push("Trofismo", sv.trofismo); push("Clônus", sv.clonus);
  push("Cintura (cm)", a.med_cintura); push("Quadril (cm)", a.med_quadril); push("ICQ", a.icq);
  push("Nível de consciência", a.nivel_consciencia);
  if (svRows.length) {
    children.push({ kind: "paragraph" as const, label: "Sinais vitais e medidas", text: "" });
    children.push({ kind: "grid" as const, rows: svRows, columns: 2 as const });
  }

  // Hábitos / anamnese
  const habitos = a.habitos_anamnese || {};
  const habitosRows: Array<[string, string]> = [];
  for (const h of PDF_HABITOS) {
    const v = habitos[h.id];
    if (!v) continue;
    const resp = v.resposta ? (v.resposta === "sim" ? "Sim" : v.resposta === "nao" ? "Não" : v.resposta) : "";
    const obs = v.obs ? ` — ${v.obs}` : "";
    if (resp || obs) habitosRows.push([h.label, `${resp}${obs}`]);
  }
  if (habitosRows.length) {
    children.push({ kind: "paragraph" as const, label: "Hábitos e anamnese geriátrica", text: "" });
    children.push({ kind: "grid" as const, rows: habitosRows, columns: 1 as const });
  }

  // Exame físico por segmento
  const ef = a.exame_fisico || {};
  const efRows: Array<[string, string]> = [];
  for (const seg of PDF_SEGMENTOS) {
    const v = ef[seg];
    if (!v) continue;
    const parts = [
      v.fm && `FM: ${v.fm}`,
      v.sens && `Sens.: ${v.sens}`,
      v.edema && `Edema: ${v.edema}`,
      v.adm && `ADM: ${v.adm}`,
    ].filter(Boolean).join(" · ");
    if (parts) efRows.push([seg, parts]);
  }
  if (efRows.length) {
    children.push({ kind: "paragraph" as const, label: "Exame físico por segmento", text: "" });
    children.push({ kind: "grid" as const, rows: efRows, columns: 1 as const });
  }

  // Postura
  const post = a.postura_alinhamento || {};
  const postRows: Array<[string, string]> = [];
  for (const it of PDF_POSTURA) {
    const v = post[it.id];
    if (!v) continue;
    const status = v.status ? (v.status === "normal" ? "Normal" : v.status === "alterado" ? "Alterado" : v.status) : "";
    const obs = v.obs ? ` — ${v.obs}` : "";
    if (status || obs) postRows.push([it.label, `${status}${obs}`]);
  }
  if (postRows.length) {
    children.push({ kind: "paragraph" as const, label: "Avaliação postural", text: "" });
    children.push({ kind: "grid" as const, rows: postRows, columns: 2 as const });
  }

  if (a.observacoes_gerais) {
    children.push({ kind: "paragraph" as const, label: "Observações gerais", text: a.observacoes_gerais });
  }

  return children;
}

function buildAssessmentPdfOpts(a: any, p: any, allEvolutions: any[] = []) {
  const isReaval = a.tipo === "reavaliacao";
  const linked = allEvolutions
    .filter((e) => e.assessment_id === a.id)
    .slice()
    .sort((x, y) => (x.data < y.data ? -1 : 1));

  const apresentacaoOpts = [
    { key: "deambulando", label: "Deambulando" },
    { key: "apoio", label: "Com apoio" },
    { key: "cadeirante", label: "Cadeirante" },
    { key: "hospitalizado", label: "Hospitalizado" },
    { key: "orientado", label: "Orientado" },
  ];
  const inspecaoOpts = [
    { key: "edema", label: "Edema" },
    { key: "hematoma", label: "Hematoma" },
    { key: "atrofia", label: "Atrofia muscular" },
    { key: "cicatriz", label: "Cicatriz" },
    { key: "deformidade", label: "Deformidade" },
    { key: "alteracao_cor", label: "Alteração de cor" },
  ];
  const aSet: Set<string> = new Set(a.apresentacao || []);
  const iSet: Set<string> = new Set(a.inspecao_flags || []);

  return {
    title: `${isReaval ? "Reavaliação" : "Avaliação"} Fisioterapêutica`,
    subtitle: `Conforme Resolução COFFITO 414/2012 · Emitida em ${fmtDate(a.data)}`,
    patientName: p?.nome_completo,
    professional: a.professionals,
    blocks: [
      {
        title: "1. Identificação",
        children: [
          {
            kind: "grid" as const,
            rows: [
              ["Nome", p?.nome_completo ?? "—"],
              ["Data de avaliação", fmtDate(a.data)],
              ["Data de nascimento", `${fmtDate(p?.data_nascimento)}${calcAge(p?.data_nascimento) != null ? `  (${calcAge(p?.data_nascimento)} anos)` : ""}`],
              ["Sexo", p?.sexo ?? "—"],
              ["Estado civil", p?.estado_civil ?? "—"],
              ["Profissão", p?.profissao ?? "—"],
              ["Naturalidade", p?.naturalidade ?? "—"],
              ["Telefone", p?.telefone ?? "—"],
              ["Cidade / Estado", [p?.cidade, p?.estado].filter(Boolean).join(" - ") || "—"],
              ["Bairro", p?.bairro ?? "—"],
              ["Endereço residencial", p?.endereco ?? "—"],
              ["Endereço comercial", p?.endereco_comercial ?? "—"],
              ["Profissional", a.professionals?.nome ?? "—"],
            ],
          },
        ],
      },
      {
        title: "2. Diagnósticos",
        children: [
          { kind: "highlight" as const, label: "Diagnóstico clínico", text: a.diagnostico_clinico || "—" },
          { kind: "highlight" as const, label: "Diagnóstico fisioterapêutico", text: a.diagnostico_fisio || "—" },
        ],
      },
      {
        title: "3. Avaliação Clínica (Anamnese)",
        children: [
          { kind: "highlight" as const, label: "Queixa principal", text: a.queixa_principal || "—" },
          { kind: "paragraph" as const, label: "História da Moléstia Atual (HMA)", text: a.hma || "—" },
          { kind: "paragraph" as const, label: "História da Moléstia Pregressa (HMP)", text: a.hmp || "—" },
          { kind: "paragraph" as const, label: "História clínica", text: a.historia_clinica || "—" },
          { kind: "paragraph" as const, label: "Hábitos de vida", text: a.habitos_vida || "—" },
          { kind: "paragraph" as const, label: "Antecedentes pessoais", text: a.antecedentes_pessoais || "—" },
          { kind: "paragraph" as const, label: "Antecedentes familiares", text: a.antecedentes_familiares || "—" },
          { kind: "paragraph" as const, label: "Tratamentos realizados", text: a.tratamentos_realizados || "—" },
        ],
      },
      {
        title: "4. Exame Clínico / Físico",
        children: [
          {
            kind: "checks" as const,
            label: "Apresentação do paciente",
            items: apresentacaoOpts.map((o) => ({ label: o.label, checked: aSet.has(o.key) })),
          },
          {
            kind: "grid" as const,
            rows: [
              ["Exames complementares", fmtYesNo(a.tem_exames) + (a.exames_complementares ? `\n${a.exames_complementares}` : "")],
              ["Uso de medicamentos", fmtYesNo(a.usa_medicamentos) + (a.medicamentos ? `\n${a.medicamentos}` : "")],
              ["Cirurgias prévias", fmtYesNo(a.teve_cirurgias) + (a.cirurgias ? `\n${a.cirurgias}` : "")],
            ],
          },
          {
            kind: "checks" as const,
            label: "Inspeção",
            items: inspecaoOpts.map((o) => ({ label: o.label, checked: iSet.has(o.key) })),
          },
          { kind: "paragraph" as const, label: "Palpação / observações", text: a.palpacao || a.inspecao || "—" },
          { kind: "paragraph" as const, label: "Semiologia", text: a.semiologia || "—" },
          { kind: "paragraph" as const, label: "Testes específicos", text: a.testes_especificos || "—" },
        ],
      },
      {
        title: "5. Avaliação da Dor (EVA)",
        children: [{ kind: "eva" as const, value: a.eva ?? null }],
      },
      {
        title: "6. Plano Terapêutico",
        children: [
          { kind: "highlight" as const, label: "Objetivos terapêuticos", text: a.objetivos || "—" },
          { kind: "highlight" as const, label: "Plano de tratamento", text: a.condutas || "—" },
          { kind: "paragraph" as const, label: "Recursos terapêuticos", text: a.recursos_terapeuticos || "—" },
        ],
      },
      ...(linked.length
        ? [{
            title: "7. Evoluções Clínicas",
            children: [{
              kind: "evolutions" as const,
              items: linked.map((e, idx) => ({
                data: fmtDate(e.data),
                hora: e.hora,
                index: idx + 1,
                conduta: e.procedimentos,
                resultado: e.evolucao_observada,
                intercorrencias: e.intercorrencias,
                proximos: e.conduta,
              })),
            }],
          }]
        : []),
    ],
  };
}


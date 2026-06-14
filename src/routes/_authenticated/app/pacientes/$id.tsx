import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Plus, FileDown, Lock, Eye, Printer, CheckCircle2 } from "lucide-react";
import { calcAge, fmtDate } from "@/lib/format";
import { PatientForm } from "@/components/patient-form";
import { EvolutionForm } from "@/components/evolution-form";
import { AssessmentForm } from "@/components/assessment-form";
import { toast } from "sonner";
import { downloadPdf, previewPdf, printPdf, uploadAndRegisterPdf } from "@/lib/pdf";

export const Route = createFileRoute("/_authenticated/app/pacientes/$id")({
  component: PatientPage,
});

function PatientPage() {
  const { id } = useParams({ from: "/_authenticated/app/pacientes/$id" });
  const qc = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [evoOpen, setEvoOpen] = useState(false);
  const [avalOpen, setAvalOpen] = useState(false);
  const [linkedEvoFor, setLinkedEvoFor] = useState<string | null>(null);

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
        pdfOpts: buildAssessmentPdfOpts(a, patient.data),
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
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogTrigger asChild><Button variant="outline">Editar dados</Button></DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Editar paciente</DialogTitle></DialogHeader>
            <PatientForm defaultValues={p as any} onSubmit={(v) => update.mutate(v)} submitting={update.isPending} />
          </DialogContent>
        </Dialog>
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
                      <Button size="sm" variant="outline" onClick={() => previewPdf(buildAssessmentPdfOpts(a, p))}><Eye className="h-4 w-4 mr-1" />Visualizar</Button>
                      <Button size="sm" variant="outline" onClick={() => downloadPdf(buildAssessmentPdfOpts(a, p))}><FileDown className="h-4 w-4 mr-1" />Baixar</Button>
                      <Button size="sm" variant="outline" onClick={() => printPdf(buildAssessmentPdfOpts(a, p))}><Printer className="h-4 w-4 mr-1" />Imprimir</Button>
                      {a.status !== "finalizada" && (
                        <Button size="sm" onClick={() => finalize.mutate(a)} disabled={finalize.isPending}>
                          <CheckCircle2 className="h-4 w-4 mr-1" />Finalizar
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

function buildEvolutionPdfOpts(e: any, p: any) {
  return {
    title: `Evolução Clínica — ${fmtDate(e.data)}`,
    patientName: p.nome_completo,
    professional: e.professionals,
    sections: [
      { title: "Data/Hora", body: `${fmtDate(e.data)} às ${String(e.hora).slice(0, 5)}` },
      { title: "Conduta aplicada", body: e.procedimentos || "—" },
      { title: "Estado de saúde do paciente", body: e.resposta_paciente || "—" },
      { title: "Resultados obtidos", body: e.evolucao_observada || "—" },
      { title: "Intercorrências", body: e.intercorrencias || "—" },
      { title: "Conduta / próximos passos", body: e.conduta || "—" },
      { title: "Próximos objetivos", body: e.proximos_objetivos || "—" },
    ],
  };
}

function fmtYesNo(v: any) {
  if (v === true) return "Sim";
  if (v === false) return "Não";
  return "—";
}

function buildAssessmentPdfOpts(a: any, p: any) {
  const ident = [
    `Data da avaliação: ${fmtDate(a.data)}`,
    `Nome: ${p?.nome_completo ?? "—"}`,
    `Data de nascimento: ${fmtDate(p?.data_nascimento) ?? "—"}${calcAge(p?.data_nascimento) != null ? ` (${calcAge(p?.data_nascimento)} anos)` : ""}`,
    `Sexo: ${p?.sexo ?? "—"}   ·   Estado civil: ${p?.estado_civil ?? "—"}`,
    `Telefone: ${p?.telefone ?? "—"}`,
    `Profissão: ${p?.profissao ?? "—"}   ·   Naturalidade: ${p?.naturalidade ?? "—"}`,
    `Cidade: ${p?.cidade ?? "—"}   ·   Bairro: ${p?.bairro ?? "—"}`,
    `Endereço residencial: ${p?.endereco ?? "—"}`,
    `Endereço comercial: ${p?.endereco_comercial ?? "—"}`,
    `Diagnóstico clínico: ${a.diagnostico_clinico ?? "—"}`,
    `Diagnóstico fisioterapêutico: ${a.diagnostico_fisio ?? "—"}`,
  ].join("\n");

  return {
    title: `${a.tipo === "reavaliacao" ? "Reavaliação" : "Avaliação"} Fisioterapêutica — ${fmtDate(a.data)}`,
    patientName: p?.nome_completo,
    professional: a.professionals,
    sections: [
      // 1
      { title: "1. Identificação", body: ident },
      // 2
      { title: "2.1 História clínica", body: a.historia_clinica || "—" },
      { title: "2.2 Queixa principal", body: a.queixa_principal || "—" },
      { title: "2.3 Hábitos de vida", body: a.habitos_vida || "—" },
      { title: "2.4 HMA", body: a.hma || "—" },
      { title: "2.5 HMP", body: a.hmp || "—" },
      { title: "2.6 Antecedentes pessoais", body: a.antecedentes_pessoais || "—" },
      { title: "2.7 Antecedentes familiares", body: a.antecedentes_familiares || "—" },
      { title: "2.8 Tratamentos realizados", body: a.tratamentos_realizados || "—" },
      // 3
      { title: "3.1 Apresentação do paciente", body: (a.apresentacao && a.apresentacao.length ? a.apresentacao.join(", ") : "—") },
      { title: "3.2 Exames complementares", body: `${fmtYesNo(a.tem_exames)}${a.exames_complementares ? `\n${a.exames_complementares}` : ""}` },
      { title: "3.3 Uso de medicamentos", body: `${fmtYesNo(a.usa_medicamentos)}${a.medicamentos ? `\n${a.medicamentos}` : ""}` },
      { title: "3.4 Cirurgias", body: `${fmtYesNo(a.teve_cirurgias)}${a.cirurgias ? `\n${a.cirurgias}` : ""}` },
      {
        title: "3.5 Inspeção / Palpação",
        body: [
          a.inspecao_flags && a.inspecao_flags.length ? `Flags: ${a.inspecao_flags.join(", ")}` : null,
          a.inspecao ? `Inspeção: ${a.inspecao}` : null,
          a.palpacao ? `Palpação: ${a.palpacao}` : null,
        ].filter(Boolean).join("\n") || "—",
      },
      { title: "3.6 Semiologia", body: a.semiologia || "—" },
      { title: "3.7 Testes específicos", body: a.testes_especificos || "—" },
      { title: "3.8 Avaliação da dor (EVA)", body: a.eva != null ? `${a.eva} / 10` : "—" },
      // 4
      { title: "4.1 Objetivos de tratamento", body: a.objetivos || "—" },
      { title: "4.2 Recursos terapêuticos", body: a.recursos_terapeuticos || "—" },
      { title: "4.3 Plano de tratamento", body: a.condutas || "—" },
    ],
  };
}

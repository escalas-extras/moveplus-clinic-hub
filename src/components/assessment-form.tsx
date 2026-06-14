import { useForm } from "react-hook-form";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { calcImc, calcAge, fmtDate } from "@/lib/format";
import { Eye } from "lucide-react";
import { PdfPreviewDialog } from "@/components/pdf-preview-dialog";
import { buildAssessmentPdfOpts } from "@/lib/pdf-builders";

type ModuleType = "geral" | "traumato_ortopedica" | "neurologica" | "cardiorrespiratoria" | "postural" | "geriatrica" | "pediatrica" | "esportiva" | "rpg" | "pilates" | "dor_cronica" | "funcional" | "personalizada";

const MODULES: { value: ModuleType; label: string }[] = [
  { value: "geral", label: "Geral Fisioterapêutica" },
  { value: "traumato_ortopedica", label: "Traumato-Ortopédica" },
  { value: "neurologica", label: "Neurológica" },
  { value: "cardiorrespiratoria", label: "Cardiorrespiratória" },
  { value: "postural", label: "Postural" },
  { value: "geriatrica", label: "Geriátrica" },
  { value: "pediatrica", label: "Pediátrica" },
  { value: "esportiva", label: "Esportiva" },
  { value: "rpg", label: "RPG" },
  { value: "pilates", label: "Pilates Terapêutico" },
  { value: "dor_cronica", label: "Dor Crônica" },
  { value: "funcional", label: "Funcional" },
  { value: "personalizada", label: "Personalizada" },
];

const APRESENTACAO_OPTS = ["Deambulando", "Deambulando com apoio/auxílio", "Cadeira de rodas", "Internado", "Orientado"];
const INSPECAO_OPTS = ["Normal", "Edema", "Cicatrização incompleta", "Eritemas", "Outros"];

const DOENCAS_PADRAO = [
  "AVC / AVE", "Ansiedade", "Câncer", "Colesterol", "Depressão", "Diabetes", "Dislipidemia",
  "DPOC", "Hipertensão arterial", "Linfedema", "Lipedema", "Neuropatias", "Obesidade", "Osteoporose",
];

const HABITOS_PERGUNTAS: { id: string; label: string; obsHint?: string }[] = [
  { id: "atividade_fisica", label: "Realiza alguma atividade física?", obsHint: "caminhada / academia / pilates / hidroginástica / outros" },
  { id: "qualidade_sono", label: "Possui uma boa qualidade do sono?", obsHint: "horas / usa medicamento / acorda à noite" },
  { id: "alimentacao", label: "Possui alimentação saudável?", obsHint: "restrições / disfagia / suplementação" },
  { id: "internacoes", label: "Teve internações recentes?", obsHint: "suporte respiratório (baixo/alto fluxo, VMI, VNI)" },
  { id: "quedas", label: "Teve alguma queda nos últimos 12 meses?", obsHint: "QPA/QPE, local, circunstância" },
  { id: "cirurgia_previa", label: "Possui cirurgia prévia?", obsHint: "ortopédica / vascular / cardíaca / neurológica / câncer / cesárea / prótese" },
  { id: "fadiga_dispneia", label: "Sente fadiga / dispneia?", obsHint: "mínimos / médios / grandes esforços" },
  { id: "angina", label: "Sente angina / aperto / queimação?", obsHint: "repouso / movimento leve / movimento intenso" },
  { id: "formigamento_mmii", label: "Sente formigamento em MMII?", obsHint: "repouso / ortostase / início ou fim do dia" },
  { id: "sincope", label: "Já teve quadro de síncope?", obsHint: "perda de consciência, pródromos, tonturas, palidez, etc." },
  { id: "sequela_motora", label: "Possui sequela motora?", obsHint: "paresia / plegia / AMP / poliomielite / outras" },
  { id: "fumante", label: "É fumante?", obsHint: "ativo / passivo / maços por dia" },
  { id: "alcool", label: "Bebida alcoólica / outras substâncias?" },
  { id: "multidisciplinar", label: "Faz acompanhamento com equipe multidisciplinar?", obsHint: "nutrição / psicologia / fono / enfermagem / odonto / outros" },
  { id: "atividade_social", label: "Participa de atividade social ou lazer?", obsHint: "com supervisão / sem supervisão" },
  { id: "deambula", label: "Deambula?", obsHint: "marcha típica/atípica, arrasta pés, base alargada, claudicação..." },
  { id: "auxiliar_marcha", label: "Utiliza auxiliar de marcha?", obsHint: "andador / muleta / bengala / apoio em familiar / outros" },
  { id: "cadeirante_acamado", label: "Cadeirante / acamado?", obsHint: "mobilidade e capacidade de transferência" },
  { id: "esfincter", label: "Controle de esfíncter?", obsHint: "micção / defecação / fralda geriátrica" },
  { id: "vertigem", label: "Vertigem?", obsHint: "desequilíbrio, zumbidos, movimentos oculares" },
  { id: "visao", label: "Distúrbio de visão?", obsHint: "presbiopia / catarata / glaucoma / diplopia / outras" },
  { id: "audicao", label: "Distúrbio de audição?", obsHint: "presbiacusia / zumbido / otite / outras" },
  { id: "outros_tratamentos", label: "Já fez outros tratamentos?", obsHint: "acupuntura / quiropraxia / fitoterapia / massagem / outros" },
];

const SEGMENTOS = ["MSD", "MSE", "MID", "MIE", "Tronco", "Face"] as const;

const POSTURA_ITENS = [
  { id: "cabeca", label: "Alinhamento da cabeça" },
  { id: "ombros", label: "Alinhamento dos ombros" },
  { id: "mmss", label: "Alinhamento dos MMSS" },
  { id: "coluna", label: "Alinhamento da coluna" },
  { id: "pelve", label: "Alinhamento da pelve" },
  { id: "mmii", label: "Alinhamento dos MMII" },
  { id: "joelhos", label: "Alinhamento dos joelhos" },
  { id: "tornozelos", label: "Alinhamento dos tornozelos" },
  { id: "pes", label: "Alinhamento dos pés" },
];

type FormInput = {
  professional_id: string;
  tipo: "avaliacao" | "reavaliacao";
  data: string;
  diagnostico_clinico?: string;
  medico_responsavel?: string;
  diagnostico_fisio?: string;
  historia_clinica?: string;
  queixa_principal?: string;
  habitos_vida?: string;
  hma?: string;
  hmp?: string;
  antecedentes_pessoais?: string;
  antecedentes_familiares?: string;
  tratamentos_realizados?: string;
  tem_exames?: boolean;
  exames_complementares?: string;
  usa_medicamentos?: boolean;
  medicamentos?: string;
  teve_cirurgias?: boolean;
  cirurgias?: string;
  inspecao?: string;
  palpacao?: string;
  semiologia?: string;
  testes_especificos?: string;
  objetivos?: string;
  recursos_terapeuticos?: string;
  condutas?: string;
  peso?: number | null;
  estatura?: number | null;
};

export function AssessmentForm({ patientId, patient, assessment, onDone }: { patientId: string; patient?: any; assessment?: any; onDone: () => void }) {
  const isEdit = !!assessment?.id;
  const [modules, setModules] = useState<ModuleType[]>(
    assessment?.assessment_modules?.length ? assessment.assessment_modules.map((m: any) => m.module_type) : ["geral"]
  );
  const [apresentacao, setApresentacao] = useState<string[]>(assessment?.apresentacao ?? []);
  const [inspecaoFlags, setInspecaoFlags] = useState<string[]>(assessment?.inspecao_flags ?? []);
  const [eva, setEva] = useState<number>(assessment?.eva ?? 0);

  // Ficha geriátrica
  const [doencasPrevias, setDoencasPrevias] = useState<Array<{ patologia: string; ativo: boolean; medicacao: string; observacao: string }>>(
    assessment?.doencas_previas?.length
      ? assessment.doencas_previas
      : DOENCAS_PADRAO.map((p) => ({ patologia: p, ativo: false, medicacao: "", observacao: "" }))
  );
  const [habitos, setHabitos] = useState<Record<string, { resposta: "sim" | "nao" | ""; obs: string }>>(
    assessment?.habitos_anamnese ?? Object.fromEntries(HABITOS_PERGUNTAS.map((h) => [h.id, { resposta: "", obs: "" }]))
  );
  const [exameFisico, setExameFisico] = useState<Record<string, { fm: string; sens: string; edema: string; adm: string }>>(
    assessment?.exame_fisico ?? Object.fromEntries(SEGMENTOS.map((s) => [s, { fm: "", sens: "", edema: "", adm: "" }]))
  );
  const [postura, setPostura] = useState<Record<string, { status: "normal" | "alterada" | ""; obs: string }>>(
    assessment?.postura_alinhamento ?? Object.fromEntries(POSTURA_ITENS.map((p) => [p.id, { status: "", obs: "" }]))
  );
  const [sinaisVitais, setSinaisVitais] = useState<Record<string, string>>(
    assessment?.sinais_vitais ?? { pa: "", fc: "", fr: "", pr: "", spo2: "", ausculta: "", tosse: "", secrecao: "", tonus: "", trofismo: "", clonus: "" }
  );
  const [avaliacaoAlgica, setAvaliacaoAlgica] = useState<Array<{ local: string; repouso: string; movimento: string; fatores: string; impacto: string }>>(
    Array.isArray(assessment?.avaliacao_algica) && assessment.avaliacao_algica.length
      ? assessment.avaliacao_algica
      : Array.from({ length: 5 }, () => ({ local: "", repouso: "", movimento: "", fatores: "", impacto: "" }))
  );
  const [pdfPreview, setPdfPreview] = useState<ReturnType<typeof buildAssessmentPdfOpts> | null>(null);

  const { register, handleSubmit, setValue, watch } = useForm<FormInput>({
    defaultValues: assessment
      ? {
          professional_id: assessment.professional_id,
          tipo: assessment.tipo,
          data: assessment.data,
          diagnostico_clinico: assessment.diagnostico_clinico ?? "",
          medico_responsavel: assessment.medico_responsavel ?? "",
          diagnostico_fisio: assessment.diagnostico_fisio ?? "",
          historia_clinica: assessment.historia_clinica ?? "",
          queixa_principal: assessment.queixa_principal ?? "",
          habitos_vida: assessment.habitos_vida ?? "",
          hma: assessment.hma ?? "",
          hmp: assessment.hmp ?? "",
          antecedentes_pessoais: assessment.antecedentes_pessoais ?? "",
          antecedentes_familiares: assessment.antecedentes_familiares ?? "",
          tratamentos_realizados: assessment.tratamentos_realizados ?? "",
          tem_exames: assessment.tem_exames ?? undefined,
          exames_complementares: assessment.exames_complementares ?? "",
          usa_medicamentos: assessment.usa_medicamentos ?? undefined,
          medicamentos: assessment.medicamentos ?? "",
          teve_cirurgias: assessment.teve_cirurgias ?? undefined,
          cirurgias: assessment.cirurgias ?? "",
          inspecao: assessment.inspecao ?? "",
          palpacao: assessment.palpacao ?? "",
          semiologia: assessment.semiologia ?? "",
          testes_especificos: assessment.testes_especificos ?? "",
          objetivos: assessment.objetivos ?? "",
          recursos_terapeuticos: assessment.recursos_terapeuticos ?? "",
          condutas: assessment.condutas ?? "",
          peso: assessment.peso ?? null,
          estatura: assessment.estatura ?? null,
        }
      : { tipo: "avaliacao", data: new Date().toISOString().slice(0, 10) },
  });

  const profs = useQuery({
    queryKey: ["professionals-active"],
    queryFn: async () => {
      const { data } = await supabase.from("professionals").select("id, nome").eq("situacao", "ativo").order("nome");
      return data ?? [];
    },
  });

  const save = useMutation({
    mutationFn: async ({ v, finalize }: { v: FormInput; finalize: boolean }) => {
      const { data: u } = await supabase.auth.getUser();
      const imc = calcImc(v.peso, v.estatura);
      const payload: any = {
        patient_id: patientId,
        professional_id: v.professional_id,
        tipo: v.tipo,
        data: v.data,
        diagnostico_clinico: v.diagnostico_clinico || null,
        medico_responsavel: v.medico_responsavel || null,
        diagnostico_fisio: v.diagnostico_fisio || null,
        historia_clinica: v.historia_clinica || null,
        queixa_principal: v.queixa_principal || null,
        habitos_vida: v.habitos_vida || null,
        hma: v.hma || null,
        hmp: v.hmp || null,
        antecedentes_pessoais: v.antecedentes_pessoais || null,
        antecedentes_familiares: v.antecedentes_familiares || null,
        tratamentos_realizados: v.tratamentos_realizados || null,
        apresentacao,
        tem_exames: v.tem_exames ?? null,
        exames_complementares: v.exames_complementares || null,
        usa_medicamentos: v.usa_medicamentos ?? null,
        medicamentos: v.medicamentos || null,
        teve_cirurgias: v.teve_cirurgias ?? null,
        cirurgias: v.cirurgias || null,
        inspecao_flags: inspecaoFlags,
        inspecao: v.inspecao || null,
        palpacao: v.palpacao || null,
        semiologia: v.semiologia || null,
        testes_especificos: v.testes_especificos || null,
        eva,
        objetivos: v.objetivos || null,
        recursos_terapeuticos: v.recursos_terapeuticos || null,
        condutas: v.condutas || null,
        peso: v.peso || null,
        estatura: v.estatura || null,
        imc,
        doencas_previas: doencasPrevias,
        habitos_anamnese: habitos,
        exame_fisico: exameFisico,
        postura_alinhamento: postura,
        sinais_vitais: sinaisVitais,
        avaliacao_algica: avaliacaoAlgica.filter((r) => r.local || r.repouso || r.movimento || r.fatores || r.impacto),
        med_cintura: sinaisVitais.cintura ? Number(sinaisVitais.cintura) : null,
        med_quadril: sinaisVitais.quadril ? Number(sinaisVitais.quadril) : null,
        icq: sinaisVitais.cintura && sinaisVitais.quadril ? Number((Number(sinaisVitais.cintura) / Number(sinaisVitais.quadril)).toFixed(2)) : null,
        nivel_consciencia: sinaisVitais.nivel_consciencia || null,
        observacoes_gerais: sinaisVitais.observacoes_gerais || null,
      };
      if (isEdit) {
        if (finalize) {
          payload.status = "finalizada";
          payload.locked_at = new Date().toISOString();
        }
        const { error } = await supabase.from("assessments").update(payload).eq("id", assessment.id);
        if (error) throw error;
      } else {
        payload.created_by = u.user?.id;
        payload.status = finalize ? "finalizada" : "rascunho";
        payload.locked_at = finalize ? new Date().toISOString() : null;
        const { error } = await supabase.from("assessments").insert(payload).select("id").single();
        if (error) throw error;
      }
    },
    onSuccess: (_d, vars) => {
      toast.success(isEdit ? "Avaliação atualizada" : vars.finalize ? "Avaliação finalizada" : "Rascunho salvo");
      onDone();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const professional_id = watch("professional_id");
  const tipo = watch("tipo");
  const dataVal = watch("data");
  const queixa = watch("queixa_principal");
  const temExames = watch("tem_exames");
  const usaMed = watch("usa_medicamentos");
  const teveCir = watch("teve_cirurgias");

  const missingFinalize: string[] = [];
  if (!professional_id) missingFinalize.push("Profissional");
  if (!tipo) missingFinalize.push("Tipo");
  if (!dataVal) missingFinalize.push("Data");
  if (!queixa?.trim()) missingFinalize.push("Queixa principal");

  const submit = (finalize: boolean) => {
    if (finalize && missingFinalize.length) {
      toast.error(`Para finalizar, preencha: ${missingFinalize.join(", ")}.`);
      return;
    }
    if (!professional_id) {
      toast.error("Selecione um profissional.");
      return;
    }
    handleSubmit((v) => save.mutate({ v, finalize }))();
  };

  const openPreview = () => {
    const v = watch();
    const prof = profs.data?.find((p) => p.id === v.professional_id);
    const preview: any = {
      ...v,
      assessment_modules: modules.map((m) => ({ module_type: m })),
      apresentacao,
      inspecao_flags: inspecaoFlags,
      eva,
      doencas_previas: doencasPrevias,
      habitos_anamnese: habitos,
      exame_fisico: exameFisico,
      postura_alinhamento: postura,
      sinais_vitais: sinaisVitais,
      avaliacao_algica: avaliacaoAlgica.filter((r) => r.local || r.repouso || r.movimento || r.fatores || r.impacto),
      med_cintura: sinaisVitais.cintura ? Number(sinaisVitais.cintura) : null,
      med_quadril: sinaisVitais.quadril ? Number(sinaisVitais.quadril) : null,
      icq: sinaisVitais.cintura && sinaisVitais.quadril ? Number((Number(sinaisVitais.cintura) / Number(sinaisVitais.quadril)).toFixed(2)) : null,
      nivel_consciencia: sinaisVitais.nivel_consciencia || null,
      observacoes_gerais: sinaisVitais.observacoes_gerais || null,
      professionals: prof,
      status: "rascunho",
    };
    setPdfPreview(buildAssessmentPdfOpts(preview, patient, []));
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); submit(false); }} className="space-y-6 pb-24">
      {/* SEÇÃO 1 - IDENTIFICAÇÃO */}
      <Section title="1. Identificação">
        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <Label className="text-xs uppercase">Profissional *</Label>
            <Select value={professional_id ?? ""} onValueChange={(v) => setValue("professional_id", v)}>
              <SelectTrigger className={!professional_id ? "border-destructive ring-1 ring-destructive/40" : ""}>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>{profs.data?.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent>
            </Select>
            {!professional_id && (
              <p className="text-xs text-destructive mt-1">Selecione um profissional para finalizar.</p>
            )}
          </div>
          <div>
            <Label className="text-xs uppercase">Tipo</Label>
            <Select value={tipo} onValueChange={(v) => setValue("tipo", v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="avaliacao">Avaliação</SelectItem>
                <SelectItem value="reavaliacao">Reavaliação</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs uppercase">Data da avaliação</Label><Input type="date" required {...register("data")} /></div>
        </div>

        {patient && (
          <div className="mt-3 rounded-lg border bg-muted/30 p-3 grid sm:grid-cols-3 gap-x-4 gap-y-1 text-sm">
            <Info label="Nome" value={patient.nome_completo} />
            <Info label="Nascimento" value={`${fmtDate(patient.data_nascimento) ?? "—"}${calcAge(patient.data_nascimento) != null ? ` (${calcAge(patient.data_nascimento)}a)` : ""}`} />
            <Info label="Sexo" value={patient.sexo} />
            <Info label="Telefone" value={patient.telefone} />
            <Info label="Estado civil" value={patient.estado_civil} />
            <Info label="Profissão" value={patient.profissao} />
            <Info label="Naturalidade" value={patient.naturalidade} />
            <Info label="Cidade" value={patient.cidade} />
            <Info label="Bairro" value={patient.bairro} />
            <Info label="End. residencial" value={patient.endereco} className="sm:col-span-3" />
            <Info label="End. comercial" value={patient.endereco_comercial} className="sm:col-span-3" />
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-3 mt-3">
          <div><Label className="text-xs uppercase">Diagnóstico clínico</Label><Input {...register("diagnostico_clinico")} /></div>
          <div><Label className="text-xs uppercase">Médico responsável</Label><Input {...register("medico_responsavel")} /></div>
          <div className="sm:col-span-2"><Label className="text-xs uppercase">Diagnóstico fisioterapêutico</Label><Input {...register("diagnostico_fisio")} /></div>
        </div>
      </Section>

      {/* SEÇÃO 2 - AVALIAÇÃO */}
      <Section title="2. Avaliação">
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="2.1 História clínica" wide><Textarea rows={2} {...register("historia_clinica")} /></Field>
          <Field label="2.2 Queixa principal *" wide><Textarea rows={2} {...register("queixa_principal")} /></Field>
          <Field label="2.3 Hábitos de vida" wide><Textarea rows={2} {...register("habitos_vida")} /></Field>
          <Field label="2.4 HMA"><Textarea rows={2} {...register("hma")} /></Field>
          <Field label="2.5 HMP"><Textarea rows={2} {...register("hmp")} /></Field>
          <Field label="2.6 Antecedentes pessoais"><Textarea rows={2} {...register("antecedentes_pessoais")} /></Field>
          <Field label="2.7 Antecedentes familiares"><Textarea rows={2} {...register("antecedentes_familiares")} /></Field>
          <Field label="2.8 Tratamentos realizados" wide><Textarea rows={2} {...register("tratamentos_realizados")} /></Field>
        </div>
      </Section>

      {/* SEÇÃO 3 - EXAME CLÍNICO/FÍSICO */}
      <Section title="3. Exame clínico / físico">
        <div className="space-y-4">
          <div>
            <Label className="text-xs uppercase mb-2 block">3.1 Apresentação do paciente</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 rounded-lg bg-muted/40">
              {APRESENTACAO_OPTS.map((opt) => (
                <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={apresentacao.includes(opt)}
                    onCheckedChange={(c) => setApresentacao((p) => c ? Array.from(new Set([...p, opt])) : p.filter(x => x !== opt))}
                  />
                  {opt}
                </label>
              ))}
            </div>
          </div>

          <YesNoBlock label="3.2 Exames complementares" value={temExames} onChange={(v) => setValue("tem_exames", v)}>
            <Textarea rows={2} placeholder="Descreva os exames" {...register("exames_complementares")} />
          </YesNoBlock>

          <YesNoBlock label="3.3 Uso de medicamentos" value={usaMed} onChange={(v) => setValue("usa_medicamentos", v)}>
            <Textarea rows={2} placeholder="Descreva os medicamentos" {...register("medicamentos")} />
          </YesNoBlock>

          <YesNoBlock label="3.4 Cirurgias" value={teveCir} onChange={(v) => setValue("teve_cirurgias", v)}>
            <Textarea rows={2} placeholder="Descreva as cirurgias" {...register("cirurgias")} />
          </YesNoBlock>

          <div>
            <Label className="text-xs uppercase mb-2 block">3.5 Inspeção / Palpação</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 rounded-lg bg-muted/40 mb-2">
              {INSPECAO_OPTS.map((opt) => (
                <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={inspecaoFlags.includes(opt)}
                    onCheckedChange={(c) => setInspecaoFlags((p) => c ? Array.from(new Set([...p, opt])) : p.filter(x => x !== opt))}
                  />
                  {opt}
                </label>
              ))}
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div><Label className="text-xs uppercase">Observações – Inspeção</Label><Textarea rows={2} {...register("inspecao")} /></div>
              <div><Label className="text-xs uppercase">Observações – Palpação</Label><Textarea rows={2} {...register("palpacao")} /></div>
            </div>
          </div>

          <Field label="3.6 Semiologia" wide><Textarea rows={3} {...register("semiologia")} /></Field>
          <Field label="3.7 Testes específicos" wide><Textarea rows={3} {...register("testes_especificos")} /></Field>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs uppercase">3.8 Avaliação da dor (EVA)</Label>
              <span className="text-sm font-medium tabular-nums">{eva.toFixed(0)} / 10</span>
            </div>
            <Slider value={[eva]} min={0} max={10} step={1} onValueChange={(v) => setEva(v[0] ?? 0)} />
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1 px-1">
              <span>0 sem dor</span><span>5</span><span>10 dor máxima</span>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <div><Label className="text-xs uppercase">Peso (kg)</Label><Input type="number" step="0.1" {...register("peso", { valueAsNumber: true })} /></div>
            <div><Label className="text-xs uppercase">Estatura (m)</Label><Input type="number" step="0.01" {...register("estatura", { valueAsNumber: true })} /></div>
            <div><Label className="text-xs uppercase">IMC</Label><Input readOnly value={calcImc(watch("peso"), watch("estatura")) ?? ""} /></div>
          </div>
        </div>
      </Section>

      {/* SEÇÃO 4 - FICHA GERIÁTRICA */}
      <Section title="4. Ficha geriátrica">
        <div className="space-y-6">
          {/* 4.1 Doenças prévias */}
          <div>
            <Label className="text-xs uppercase mb-2 block">4.1 Doenças prévias</Label>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="text-left p-2 w-8"></th>
                    <th className="text-left p-2">Patologia</th>
                    <th className="text-left p-2">Medicação</th>
                    <th className="text-left p-2">Observação</th>
                  </tr>
                </thead>
                <tbody>
                  {doencasPrevias.map((d, i) => (
                    <tr key={d.patologia + i} className="border-t">
                      <td className="p-2">
                        <Checkbox checked={d.ativo} onCheckedChange={(c) => setDoencasPrevias((arr) => arr.map((x, idx) => idx === i ? { ...x, ativo: !!c } : x))} />
                      </td>
                      <td className="p-2 font-medium whitespace-nowrap">
                        {d.patologia === "__outras__" ? (
                          <Input value={d.patologia === "__outras__" ? "" : d.patologia} placeholder="Outra patologia" onChange={(e) => setDoencasPrevias((arr) => arr.map((x, idx) => idx === i ? { ...x, patologia: e.target.value } : x))} />
                        ) : d.patologia}
                      </td>
                      <td className="p-2"><Input value={d.medicacao} onChange={(e) => setDoencasPrevias((arr) => arr.map((x, idx) => idx === i ? { ...x, medicacao: e.target.value } : x))} /></td>
                      <td className="p-2"><Input value={d.observacao} onChange={(e) => setDoencasPrevias((arr) => arr.map((x, idx) => idx === i ? { ...x, observacao: e.target.value } : x))} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => setDoencasPrevias((arr) => [...arr, { patologia: "", ativo: true, medicacao: "", observacao: "" }])}>+ Outra patologia</Button>
          </div>

          {/* 4.2 Hábitos e anamnese Sim/Não */}
          <div>
            <Label className="text-xs uppercase mb-2 block">4.2 Hábitos e anamnese</Label>
            <div className="space-y-2">
              {HABITOS_PERGUNTAS.map((q) => {
                const cur = habitos[q.id] ?? { resposta: "", obs: "" };
                return (
                  <div key={q.id} className="grid sm:grid-cols-[1fr_auto_2fr] gap-2 items-start p-2 rounded-md bg-muted/30">
                    <div className="text-sm">{q.label}</div>
                    <div className="flex gap-1">
                      <Button type="button" size="sm" variant={cur.resposta === "sim" ? "default" : "outline"} onClick={() => setHabitos((h) => ({ ...h, [q.id]: { ...cur, resposta: "sim" } }))}>Sim</Button>
                      <Button type="button" size="sm" variant={cur.resposta === "nao" ? "default" : "outline"} onClick={() => setHabitos((h) => ({ ...h, [q.id]: { ...cur, resposta: "nao" } }))}>Não</Button>
                    </div>
                    <Input placeholder={q.obsHint ?? "Observações"} value={cur.obs} onChange={(e) => setHabitos((h) => ({ ...h, [q.id]: { ...cur, obs: e.target.value } }))} />
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4.3 Sinais vitais */}
          <div>
            <Label className="text-xs uppercase mb-2 block">4.3 Sinais vitais</Label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                { id: "pa", label: "PA (basal)" }, { id: "fc", label: "FC" }, { id: "fr", label: "FR" }, { id: "pr", label: "PR" }, { id: "spo2", label: "SpO2" },
              ].map((f) => (
                <div key={f.id}>
                  <Label className="text-[10px] uppercase">{f.label}</Label>
                  <Input value={sinaisVitais[f.id] ?? ""} onChange={(e) => setSinaisVitais((s) => ({ ...s, [f.id]: e.target.value }))} />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
              <div>
                <Label className="text-[10px] uppercase">Med. cintura (cm)</Label>
                <Input type="number" step="0.1" value={sinaisVitais.cintura ?? ""} onChange={(e) => setSinaisVitais((s) => ({ ...s, cintura: e.target.value }))} />
              </div>
              <div>
                <Label className="text-[10px] uppercase">Med. quadril (cm)</Label>
                <Input type="number" step="0.1" value={sinaisVitais.quadril ?? ""} onChange={(e) => setSinaisVitais((s) => ({ ...s, quadril: e.target.value }))} />
              </div>
              <div>
                <Label className="text-[10px] uppercase">ICQ</Label>
                <Input readOnly value={sinaisVitais.cintura && sinaisVitais.quadril ? (Number(sinaisVitais.cintura) / Number(sinaisVitais.quadril)).toFixed(2) : ""} />
              </div>
            </div>
            <div className="grid sm:grid-cols-3 gap-3 mt-3">
              <div><Label className="text-[10px] uppercase">Ausculta pulmonar</Label><Input value={sinaisVitais.ausculta ?? ""} onChange={(e) => setSinaisVitais((s) => ({ ...s, ausculta: e.target.value }))} /></div>
              <div><Label className="text-[10px] uppercase">Tosse</Label><Input value={sinaisVitais.tosse ?? ""} onChange={(e) => setSinaisVitais((s) => ({ ...s, tosse: e.target.value }))} /></div>
              <div><Label className="text-[10px] uppercase">Secreção</Label><Input value={sinaisVitais.secrecao ?? ""} onChange={(e) => setSinaisVitais((s) => ({ ...s, secrecao: e.target.value }))} /></div>
              <div><Label className="text-[10px] uppercase">Tônus</Label><Input value={sinaisVitais.tonus ?? ""} onChange={(e) => setSinaisVitais((s) => ({ ...s, tonus: e.target.value }))} /></div>
              <div><Label className="text-[10px] uppercase">Trofismo</Label><Input value={sinaisVitais.trofismo ?? ""} onChange={(e) => setSinaisVitais((s) => ({ ...s, trofismo: e.target.value }))} /></div>
              <div><Label className="text-[10px] uppercase">Clônus</Label><Input value={sinaisVitais.clonus ?? ""} onChange={(e) => setSinaisVitais((s) => ({ ...s, clonus: e.target.value }))} /></div>
            </div>
            <div className="mt-3">
              <Label className="text-[10px] uppercase">Nível de consciência</Label>
              <Select value={sinaisVitais.nivel_consciencia ?? ""} onValueChange={(v) => setSinaisVitais((s) => ({ ...s, nivel_consciencia: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="lucido_orientado">Lúcido e orientado</SelectItem>
                  <SelectItem value="lucido_confusao">Lúcido com períodos de confusão</SelectItem>
                  <SelectItem value="desorientado">Desorientado</SelectItem>
                  <SelectItem value="inconsciente">Inconsciente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 4.4 Exame físico (força/sensibilidade/edema/ADM) */}
          <div>
            <Label className="text-xs uppercase mb-2 block">4.4 Exame físico por segmento</Label>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="text-left p-2">Segmento</th>
                    <th className="text-left p-2">Força muscular</th>
                    <th className="text-left p-2">Sensibilidade</th>
                    <th className="text-left p-2">Edema</th>
                    <th className="text-left p-2">Limitação ADM</th>
                  </tr>
                </thead>
                <tbody>
                  {SEGMENTOS.map((seg) => {
                    const r = exameFisico[seg] ?? { fm: "", sens: "", edema: "", adm: "" };
                    return (
                      <tr key={seg} className="border-t">
                        <td className="p-2 font-medium">{seg}</td>
                        <td className="p-2"><Input value={r.fm} onChange={(e) => setExameFisico((m) => ({ ...m, [seg]: { ...r, fm: e.target.value } }))} placeholder="0-5" /></td>
                        <td className="p-2"><Input value={r.sens} onChange={(e) => setExameFisico((m) => ({ ...m, [seg]: { ...r, sens: e.target.value } }))} /></td>
                        <td className="p-2"><Input value={r.edema} onChange={(e) => setExameFisico((m) => ({ ...m, [seg]: { ...r, edema: e.target.value } }))} /></td>
                        <td className="p-2"><Input value={r.adm} onChange={(e) => setExameFisico((m) => ({ ...m, [seg]: { ...r, adm: e.target.value } }))} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 4.5 Avaliação postural */}
          <div>
            <Label className="text-xs uppercase mb-2 block">4.5 Avaliação postural</Label>
            <div className="space-y-2">
              {POSTURA_ITENS.map((p) => {
                const cur = postura[p.id] ?? { status: "", obs: "" };
                return (
                  <div key={p.id} className="grid sm:grid-cols-[1fr_auto_2fr] gap-2 items-center p-2 rounded-md bg-muted/30">
                    <div className="text-sm">{p.label}</div>
                    <div className="flex gap-1">
                      <Button type="button" size="sm" variant={cur.status === "normal" ? "default" : "outline"} onClick={() => setPostura((s) => ({ ...s, [p.id]: { ...cur, status: "normal" } }))}>Normal</Button>
                      <Button type="button" size="sm" variant={cur.status === "alterada" ? "default" : "outline"} onClick={() => setPostura((s) => ({ ...s, [p.id]: { ...cur, status: "alterada" } }))}>Alterada</Button>
                    </div>
                    <Input placeholder="Observações" value={cur.obs} onChange={(e) => setPostura((s) => ({ ...s, [p.id]: { ...cur, obs: e.target.value } }))} />
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4.6 Avaliação álgica multi-local */}
          <div>
            <Label className="text-xs uppercase mb-2 block">4.6 Avaliação álgica (locais de dor)</Label>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="text-left p-2 w-10">#</th>
                    <th className="text-left p-2">Local</th>
                    <th className="text-left p-2 w-24">Repouso (0-10)</th>
                    <th className="text-left p-2 w-24">Movimento (0-10)</th>
                    <th className="text-left p-2">Fatores que agravam / aliviam</th>
                    <th className="text-left p-2">Impacto nas AVDs</th>
                    <th className="p-2 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {avaliacaoAlgica.map((row, i) => (
                    <tr key={i} className="border-t align-top">
                      <td className="p-2 text-muted-foreground">{i + 1}</td>
                      <td className="p-2"><Input value={row.local} onChange={(e) => setAvaliacaoAlgica((arr) => arr.map((x, idx) => idx === i ? { ...x, local: e.target.value } : x))} /></td>
                      <td className="p-2"><Input type="number" min={0} max={10} value={row.repouso} onChange={(e) => setAvaliacaoAlgica((arr) => arr.map((x, idx) => idx === i ? { ...x, repouso: e.target.value } : x))} /></td>
                      <td className="p-2"><Input type="number" min={0} max={10} value={row.movimento} onChange={(e) => setAvaliacaoAlgica((arr) => arr.map((x, idx) => idx === i ? { ...x, movimento: e.target.value } : x))} /></td>
                      <td className="p-2"><Input value={row.fatores} onChange={(e) => setAvaliacaoAlgica((arr) => arr.map((x, idx) => idx === i ? { ...x, fatores: e.target.value } : x))} /></td>
                      <td className="p-2"><Input value={row.impacto} onChange={(e) => setAvaliacaoAlgica((arr) => arr.map((x, idx) => idx === i ? { ...x, impacto: e.target.value } : x))} /></td>
                      <td className="p-2">
                        <Button type="button" variant="ghost" size="sm" onClick={() => setAvaliacaoAlgica((arr) => arr.filter((_, idx) => idx !== i))}>×</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => setAvaliacaoAlgica((arr) => [...arr, { local: "", repouso: "", movimento: "", fatores: "", impacto: "" }])}>+ Adicionar local</Button>
          </div>

          {/* 4.7 Observações gerais */}
          <div>
            <Label className="text-xs uppercase">4.7 Observações gerais</Label>
            <Textarea rows={3} value={sinaisVitais.observacoes_gerais ?? ""} onChange={(e) => setSinaisVitais((s) => ({ ...s, observacoes_gerais: e.target.value }))} />
          </div>
        </div>
      </Section>

      {/* SEÇÃO 5 - PLANO TERAPÊUTICO */}
      <Section title="5. Plano terapêutico">
        <div className="grid sm:grid-cols-1 gap-3">
          <Field label="5.1 Objetivos de tratamento"><Textarea rows={3} {...register("objetivos")} /></Field>
          <Field label="5.2 Recursos terapêuticos"><Textarea rows={3} {...register("recursos_terapeuticos")} /></Field>
          <Field label="5.3 Plano de tratamento"><Textarea rows={3} {...register("condutas")} /></Field>
        </div>
      </Section>

      {/* MÓDULOS OPCIONAIS */}
      <Section title="Módulos opcionais (especialidades)">
        <p className="text-xs text-muted-foreground mb-2">Mantenha "Geral" para a ficha CREFITO padrão. Ative módulos adicionais para fluxos especializados.</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 rounded-lg bg-muted/40">
          {MODULES.map((m) => (
            <label key={m.value} className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={modules.includes(m.value)}
                onCheckedChange={(c) =>
                  setModules((prev) => (c ? Array.from(new Set([...prev, m.value])) : prev.filter((x) => x !== m.value)))
                }
              />
              {m.label}
            </label>
          ))}
        </div>
      </Section>

      <div className="sticky bottom-0 -mx-6 px-6 py-3 bg-background/95 backdrop-blur border-t flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2 z-10">
        {missingFinalize.length > 0 && (
          <p className="text-xs text-muted-foreground sm:mr-auto">
            Para finalizar: <span className="text-destructive font-medium">{missingFinalize.join(", ")}</span>
          </p>
        )}
        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" disabled={save.isPending || !professional_id} onClick={() => submit(false)} className="flex-1 sm:flex-none">
            {save.isPending ? "Salvando…" : isEdit ? "Salvar alterações" : "Salvar rascunho"}
          </Button>
          {(!isEdit || assessment?.status !== "finalizada") && (
            <Button type="button" disabled={save.isPending} onClick={() => submit(true)} className="flex-1 sm:flex-none">
              Finalizar avaliação
            </Button>
          )}
        </div>
      </div>
    </form>
  );

  function _afterMount() {
    if (modules.length === 0) setModules(["geral"]);
  }
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border p-4 space-y-2">
      <h3 className="text-sm font-semibold text-primary">{title}</h3>
      <div>{children}</div>
    </section>
  );
}

function Field({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <Label className="text-xs uppercase">{label}</Label>
      {children}
    </div>
  );
}

function Info({ label, value, className }: { label: string; value: any; className?: string }) {
  return (
    <div className={className}>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div>{value || "—"}</div>
    </div>
  );
}

function YesNoBlock({ label, value, onChange, children }: { label: string; value: boolean | undefined; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <Label className="text-xs uppercase">{label}</Label>
        <div className="flex gap-2">
          <Button type="button" size="sm" variant={value === true ? "default" : "outline"} onClick={() => onChange(true)}>Sim</Button>
          <Button type="button" size="sm" variant={value === false ? "default" : "outline"} onClick={() => onChange(false)}>Não</Button>
        </div>
      </div>
      {value && children}
    </div>
  );
}

import { useForm } from "react-hook-form";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Eye } from "lucide-react";
import { PdfPreviewDialog } from "@/components/pdf-preview-dialog";
import { buildEvolutionPdfOpts } from "@/lib/pdf-builders";

type FormInput = {
  professional_id: string;
  data: string;
  hora: string;
  sessao_numero?: number | null;
  procedimentos?: string;
  resposta_paciente?: string;
  evolucao_observada?: string;
  conduta?: string;
  intercorrencias?: string;
  proximos_objetivos?: string;
  inspecao?: string;
  palpacao?: string;
  observacoes_gerais?: string;
};

type PainRow = { local: string; repouso: string; movimento: string; fatores: string; impacto: string };

export function EvolutionForm({
  patientId,
  assessmentId,
  patient,
  onDone,
}: {
  patientId: string;
  assessmentId?: string;
  patient?: any;
  onDone: () => void;
}) {
  const today = new Date();
  const [eva, setEva] = useState<number>(0);
  const [sv, setSv] = useState<Record<string, string>>({
    pa: "", fc: "", fr: "", pr: "", spo2: "",
    ausculta: "", tosse: "", secrecao: "",
    tonus: "", trofismo: "", clonus: "",
    nivel_consciencia: "",
  });
  const [dor, setDor] = useState<PainRow[]>([
    { local: "", repouso: "", movimento: "", fatores: "", impacto: "" },
  ]);
  const [pdfPreview, setPdfPreview] = useState<ReturnType<typeof buildEvolutionPdfOpts> | null>(null);

  const { register, handleSubmit, setValue, watch } = useForm<FormInput>({
    defaultValues: {
      data: today.toISOString().slice(0, 10),
      hora: today.toTimeString().slice(0, 5),
    },
  });

  const profs = useQuery({
    queryKey: ["professionals-active"],
    queryFn: async () => {
      const { data } = await supabase.from("professionals").select("id, nome").eq("situacao", "ativo").order("nome");
      return data ?? [];
    },
  });

  const save = useMutation({
    mutationFn: async (v: FormInput) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("evolutions").insert({
        patient_id: patientId,
        assessment_id: assessmentId ?? null,
        professional_id: v.professional_id,
        data: v.data,
        hora: v.hora,
        sessao_numero: v.sessao_numero || null,
        pa: sv.pa || null,
        fc: sv.fc || null,
        fr: sv.fr || null,
        spo2: sv.spo2 || null,
        eva,
        sinais_vitais: sv,
        avaliacao_algica: dor.filter((r) => r.local || r.repouso || r.movimento || r.fatores || r.impacto),
        inspecao: v.inspecao || null,
        palpacao: v.palpacao || null,
        nivel_consciencia: sv.nivel_consciencia || null,
        observacoes_gerais: v.observacoes_gerais || null,
        procedimentos: v.procedimentos || null,
        resposta_paciente: v.resposta_paciente || null,
        evolucao_observada: v.evolucao_observada || null,
        conduta: v.conduta || null,
        intercorrencias: v.intercorrencias || null,
        proximos_objetivos: v.proximos_objetivos || null,
        created_by: u.user?.id,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Evolução registrada"); onDone(); },
    onError: (e: any) => toast.error(e.message),
  });

  const professional_id = watch("professional_id");

  const openPreview = () => {
    const v = watch();
    const prof = profs.data?.find((p) => p.id === v.professional_id);
    const preview: any = {
      ...v,
      professionals: prof,
      eva,
      sinais_vitais: sv,
      avaliacao_algica: dor.filter((r) => r.local || r.repouso || r.movimento || r.fatores || r.impacto),
      pa: sv.pa,
      fc: sv.fc,
      fr: sv.fr,
      spo2: sv.spo2,
      nivel_consciencia: sv.nivel_consciencia || null,
    };
    setPdfPreview(buildEvolutionPdfOpts(preview, patient));
  };

  return (
    <form onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-4">
      {assessmentId && (
        <p className="text-xs text-muted-foreground rounded-md bg-muted/40 px-3 py-2">
          Esta evolução será vinculada à avaliação selecionada.
        </p>
      )}
      <div className="grid sm:grid-cols-3 gap-3">
        <div>
          <Label className="text-xs uppercase tracking-wide">Profissional *</Label>
          <Select value={professional_id ?? ""} onValueChange={(v) => setValue("professional_id", v)}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {profs.data?.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div><Label className="text-xs uppercase">Data</Label><Input type="date" required {...register("data")} /></div>
        <div><Label className="text-xs uppercase">Hora</Label><Input type="time" required {...register("hora")} /></div>
      </div>
      <div><Label className="text-xs uppercase">Sessão nº</Label><Input type="number" {...register("sessao_numero", { valueAsNumber: true })} /></div>

      {/* SINAIS VITAIS */}
      <div className="rounded-lg border p-3 space-y-3">
        <Label className="text-xs uppercase">Sinais vitais</Label>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { id: "pa", label: "PA" }, { id: "fc", label: "FC (bpm)" }, { id: "fr", label: "FR (irpm)" }, { id: "pr", label: "PR" }, { id: "spo2", label: "SpO2 (%)" },
          ].map((f) => (
            <div key={f.id}>
              <Label className="text-[10px] uppercase">{f.label}</Label>
              <Input value={sv[f.id] ?? ""} onChange={(e) => setSv((s) => ({ ...s, [f.id]: e.target.value }))} />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div><Label className="text-[10px] uppercase">Ausculta pulmonar</Label><Input value={sv.ausculta} onChange={(e) => setSv((s) => ({ ...s, ausculta: e.target.value }))} /></div>
          <div><Label className="text-[10px] uppercase">Tosse</Label><Input value={sv.tosse} onChange={(e) => setSv((s) => ({ ...s, tosse: e.target.value }))} /></div>
          <div><Label className="text-[10px] uppercase">Secreção</Label><Input value={sv.secrecao} onChange={(e) => setSv((s) => ({ ...s, secrecao: e.target.value }))} /></div>
          <div><Label className="text-[10px] uppercase">Tônus</Label><Input value={sv.tonus} onChange={(e) => setSv((s) => ({ ...s, tonus: e.target.value }))} /></div>
          <div><Label className="text-[10px] uppercase">Trofismo</Label><Input value={sv.trofismo} onChange={(e) => setSv((s) => ({ ...s, trofismo: e.target.value }))} /></div>
          <div><Label className="text-[10px] uppercase">Clônus</Label><Input value={sv.clonus} onChange={(e) => setSv((s) => ({ ...s, clonus: e.target.value }))} /></div>
        </div>
        <div>
          <Label className="text-[10px] uppercase">Nível de consciência</Label>
          <Select value={sv.nivel_consciencia} onValueChange={(v) => setSv((s) => ({ ...s, nivel_consciencia: v }))}>
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

      {/* INSPEÇÃO / PALPAÇÃO */}
      <div className="grid sm:grid-cols-2 gap-3">
        <div><Label className="text-xs uppercase">Inspeção</Label><Textarea rows={2} {...register("inspecao")} /></div>
        <div><Label className="text-xs uppercase">Palpação</Label><Textarea rows={2} {...register("palpacao")} /></div>
      </div>

      {/* AVALIAÇÃO ÁLGICA */}
      <div className="rounded-lg border p-3 space-y-3">
        <Label className="text-xs uppercase">Avaliação álgica</Label>
        <div>
          <div className="flex items-center justify-between mb-1">
            <Label className="text-[10px] uppercase">EVA (dor geral)</Label>
            <span className="text-sm font-medium tabular-nums">{eva.toFixed(0)} / 10</span>
          </div>
          <Slider value={[eva]} min={0} max={10} step={1} onValueChange={(v) => setEva(v[0] ?? 0)} />
        </div>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="text-left p-2 w-8">#</th>
                <th className="text-left p-2">Local</th>
                <th className="text-left p-2 w-20">Repouso</th>
                <th className="text-left p-2 w-20">Movim.</th>
                <th className="text-left p-2">Fatores agravam/aliviam</th>
                <th className="text-left p-2">Impacto AVDs</th>
                <th className="p-2 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {dor.map((row, i) => (
                <tr key={i} className="border-t align-top">
                  <td className="p-2 text-muted-foreground">{i + 1}</td>
                  <td className="p-2"><Input value={row.local} onChange={(e) => setDor((arr) => arr.map((x, idx) => idx === i ? { ...x, local: e.target.value } : x))} /></td>
                  <td className="p-2"><Input type="number" min={0} max={10} value={row.repouso} onChange={(e) => setDor((arr) => arr.map((x, idx) => idx === i ? { ...x, repouso: e.target.value } : x))} /></td>
                  <td className="p-2"><Input type="number" min={0} max={10} value={row.movimento} onChange={(e) => setDor((arr) => arr.map((x, idx) => idx === i ? { ...x, movimento: e.target.value } : x))} /></td>
                  <td className="p-2"><Input value={row.fatores} onChange={(e) => setDor((arr) => arr.map((x, idx) => idx === i ? { ...x, fatores: e.target.value } : x))} /></td>
                  <td className="p-2"><Input value={row.impacto} onChange={(e) => setDor((arr) => arr.map((x, idx) => idx === i ? { ...x, impacto: e.target.value } : x))} /></td>
                  <td className="p-2"><Button type="button" variant="ghost" size="sm" onClick={() => setDor((arr) => arr.filter((_, idx) => idx !== i))}>×</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => setDor((arr) => [...arr, { local: "", repouso: "", movimento: "", fatores: "", impacto: "" }])}>+ Adicionar local</Button>
      </div>

      <div><Label className="text-xs uppercase">Conduta aplicada</Label><Textarea rows={2} {...register("procedimentos")} /></div>
      <div><Label className="text-xs uppercase">Estado de saúde do paciente</Label><Textarea rows={2} {...register("resposta_paciente")} /></div>
      <div><Label className="text-xs uppercase">Resultados obtidos</Label><Textarea rows={2} {...register("evolucao_observada")} /></div>
      <div><Label className="text-xs uppercase">Intercorrências</Label><Textarea rows={2} {...register("intercorrencias")} /></div>
      <div><Label className="text-xs uppercase">Conduta / próximos passos</Label><Textarea rows={2} {...register("conduta")} /></div>
      <div><Label className="text-xs uppercase">Próximos objetivos</Label><Textarea rows={2} {...register("proximos_objetivos")} /></div>
      <div><Label className="text-xs uppercase">Observações gerais</Label><Textarea rows={2} {...register("observacoes_gerais")} /></div>
      <div className="flex justify-end"><Button type="submit" disabled={save.isPending || !professional_id}>{save.isPending ? "Salvando…" : "Registrar evolução"}</Button></div>
    </form>
  );
}

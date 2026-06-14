import { useForm } from "react-hook-form";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { calcImc } from "@/lib/format";

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

type FormInput = {
  professional_id: string;
  tipo: "avaliacao" | "reavaliacao";
  data: string;
  diagnostico_clinico?: string;
  medico_responsavel?: string;
  diagnostico_fisio?: string;
  queixa_principal?: string;
  hma?: string;
  antecedentes_pessoais?: string;
  antecedentes_familiares?: string;
  tratamentos_realizados?: string;
  exames_complementares?: string;
  medicamentos?: string;
  inspecao?: string;
  palpacao?: string;
  marcha?: string;
  equilibrio?: string;
  coordenacao?: string;
  objetivos?: string;
  condutas?: string;
  peso?: number | null;
  estatura?: number | null;
};

export function AssessmentForm({ patientId, onDone }: { patientId: string; onDone: () => void }) {
  const [modules, setModules] = useState<ModuleType[]>(["geral"]);
  const { register, handleSubmit, setValue, watch, getValues } = useForm<FormInput>({
    defaultValues: { tipo: "avaliacao", data: new Date().toISOString().slice(0, 10) },
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
      const { data: ins, error } = await supabase.from("assessments").insert({
        patient_id: patientId,
        professional_id: v.professional_id,
        tipo: v.tipo,
        data: v.data,
        diagnostico_clinico: v.diagnostico_clinico || null,
        medico_responsavel: v.medico_responsavel || null,
        diagnostico_fisio: v.diagnostico_fisio || null,
        queixa_principal: v.queixa_principal || null,
        hma: v.hma || null,
        antecedentes_pessoais: v.antecedentes_pessoais || null,
        antecedentes_familiares: v.antecedentes_familiares || null,
        tratamentos_realizados: v.tratamentos_realizados || null,
        exames_complementares: v.exames_complementares || null,
        medicamentos: v.medicamentos || null,
        inspecao: v.inspecao || null,
        palpacao: v.palpacao || null,
        marcha: v.marcha || null,
        equilibrio: v.equilibrio || null,
        coordenacao: v.coordenacao || null,
        objetivos: v.objetivos || null,
        condutas: v.condutas || null,
        peso: v.peso || null,
        estatura: v.estatura || null,
        imc,
        created_by: u.user?.id,
        status: (finalize ? "finalizada" : "rascunho") as any,
        locked_at: finalize ? new Date().toISOString() : null,
      }).select("id").single();
      if (error) throw error;
      if (modules.length) {
        const { error: e2 } = await supabase.from("assessment_modules").insert(
          modules.map((m) => ({ assessment_id: ins.id, module_type: m, payload: {} as any })),
        );
        if (e2) throw e2;
      }
    },
    onSuccess: (_d, vars) => { toast.success(vars.finalize ? "Avaliação finalizada" : "Rascunho salvo"); onDone(); },
    onError: (e: any) => toast.error(e.message),
  });

  const professional_id = watch("professional_id");
  const tipo = watch("tipo");
  const dataVal = watch("data");
  const queixa = watch("queixa_principal");

  const missingFinalize: string[] = [];
  if (!professional_id) missingFinalize.push("Profissional");
  if (!tipo) missingFinalize.push("Tipo");
  if (!dataVal) missingFinalize.push("Data");
  if (!modules.length) missingFinalize.push("Pelo menos um módulo");
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

  return (
    <form onSubmit={(e) => { e.preventDefault(); submit(false); }} className="space-y-5 pb-24">
      <section className="grid sm:grid-cols-3 gap-3">
        <div>
          <Label className="text-xs uppercase">Profissional *</Label>
          <Select value={professional_id ?? ""} onValueChange={(v) => setValue("professional_id", v)}>
            <SelectTrigger className={!professional_id ? "border-destructive ring-1 ring-destructive/40" : ""}>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>{profs.data?.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent>
          </Select>
          {!professional_id && (
            <p className="text-xs text-destructive mt-1">Selecione um profissional para finalizar a avaliação.</p>
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
        <div><Label className="text-xs uppercase">Data</Label><Input type="date" required {...register("data")} /></div>
      </section>


      <section>
        <Label className="text-xs uppercase mb-2 block">Módulos da avaliação</Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 rounded-lg bg-muted/50">
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
      </section>

      <section className="grid sm:grid-cols-2 gap-3">
        <div><Label className="text-xs uppercase">Diagnóstico clínico</Label><Input {...register("diagnostico_clinico")} /></div>
        <div><Label className="text-xs uppercase">Médico responsável</Label><Input {...register("medico_responsavel")} /></div>
        <div className="sm:col-span-2"><Label className="text-xs uppercase">Diagnóstico fisioterapêutico</Label><Input {...register("diagnostico_fisio")} /></div>
        <div className="sm:col-span-2"><Label className="text-xs uppercase">Queixa principal</Label><Textarea rows={2} {...register("queixa_principal")} /></div>
        <div className="sm:col-span-2"><Label className="text-xs uppercase">HMA</Label><Textarea rows={2} {...register("hma")} /></div>
        <div><Label className="text-xs uppercase">Antecedentes pessoais</Label><Textarea rows={2} {...register("antecedentes_pessoais")} /></div>
        <div><Label className="text-xs uppercase">Antecedentes familiares</Label><Textarea rows={2} {...register("antecedentes_familiares")} /></div>
        <div><Label className="text-xs uppercase">Tratamentos realizados</Label><Textarea rows={2} {...register("tratamentos_realizados")} /></div>
        <div><Label className="text-xs uppercase">Exames complementares</Label><Textarea rows={2} {...register("exames_complementares")} /></div>
        <div className="sm:col-span-2"><Label className="text-xs uppercase">Medicamentos</Label><Textarea rows={2} {...register("medicamentos")} /></div>
      </section>

      <section className="grid sm:grid-cols-3 gap-3">
        <div><Label className="text-xs uppercase">Peso (kg)</Label><Input type="number" step="0.1" {...register("peso", { valueAsNumber: true })} /></div>
        <div><Label className="text-xs uppercase">Estatura (m)</Label><Input type="number" step="0.01" {...register("estatura", { valueAsNumber: true })} /></div>
        <div><Label className="text-xs uppercase">IMC</Label><Input readOnly value={calcImc(watch("peso"), watch("estatura")) ?? ""} /></div>
      </section>

      <section className="grid sm:grid-cols-2 gap-3">
        <div><Label className="text-xs uppercase">Inspeção</Label><Textarea rows={2} {...register("inspecao")} /></div>
        <div><Label className="text-xs uppercase">Palpação</Label><Textarea rows={2} {...register("palpacao")} /></div>
        <div><Label className="text-xs uppercase">Marcha</Label><Input {...register("marcha")} /></div>
        <div><Label className="text-xs uppercase">Equilíbrio</Label><Input {...register("equilibrio")} /></div>
        <div className="sm:col-span-2"><Label className="text-xs uppercase">Coordenação motora</Label><Input {...register("coordenacao")} /></div>
        <div className="sm:col-span-2"><Label className="text-xs uppercase">Objetivos terapêuticos</Label><Textarea rows={2} {...register("objetivos")} /></div>
        <div className="sm:col-span-2"><Label className="text-xs uppercase">Condutas terapêuticas</Label><Textarea rows={2} {...register("condutas")} /></div>
      </section>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" disabled={save.isPending || !professional_id} onClick={() => submit(false)}>
          {save.isPending ? "Salvando…" : "Salvar rascunho"}
        </Button>
        <Button type="button" disabled={save.isPending || !professional_id} onClick={() => submit(true)}>
          Finalizar avaliação
        </Button>
      </div>
    </form>
  );
}

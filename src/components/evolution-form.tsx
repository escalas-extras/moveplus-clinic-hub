import { useForm } from "react-hook-form";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

type Input = {
  professional_id: string;
  data: string;
  hora: string;
  sessao_numero?: number | null;
  procedimentos?: string;
  resposta_paciente?: string;
  evolucao_observada?: string;
  conduta?: string;
  proximos_objetivos?: string;
};

export function EvolutionForm({ patientId, onDone }: { patientId: string; onDone: () => void }) {
  const today = new Date();
  const { register, handleSubmit, setValue, watch } = useForm<Input>({
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
    mutationFn: async (v: Input) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("evolutions").insert({
        patient_id: patientId,
        professional_id: v.professional_id,
        data: v.data,
        hora: v.hora,
        sessao_numero: v.sessao_numero || null,
        procedimentos: v.procedimentos || null,
        resposta_paciente: v.resposta_paciente || null,
        evolucao_observada: v.evolucao_observada || null,
        conduta: v.conduta || null,
        proximos_objetivos: v.proximos_objetivos || null,
        created_by: u.user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Evolução registrada"); onDone(); },
    onError: (e: any) => toast.error(e.message),
  });

  const professional_id = watch("professional_id");

  return (
    <form onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-4">
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
      <div><Label className="text-xs uppercase">Procedimentos realizados</Label><Textarea rows={2} {...register("procedimentos")} /></div>
      <div><Label className="text-xs uppercase">Resposta do paciente</Label><Textarea rows={2} {...register("resposta_paciente")} /></div>
      <div><Label className="text-xs uppercase">Evolução observada</Label><Textarea rows={2} {...register("evolucao_observada")} /></div>
      <div><Label className="text-xs uppercase">Conduta adotada</Label><Textarea rows={2} {...register("conduta")} /></div>
      <div><Label className="text-xs uppercase">Próximos objetivos</Label><Textarea rows={2} {...register("proximos_objetivos")} /></div>
      <div className="flex justify-end"><Button type="submit" disabled={save.isPending || !professional_id}>{save.isPending ? "Salvando…" : "Registrar evolução"}</Button></div>
    </form>
  );
}

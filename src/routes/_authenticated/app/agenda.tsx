import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { fmtDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/app/agenda")({
  component: AgendaPage,
});

type Form = { patient_id: string; professional_id: string; data: string; horario: string; duracao_min: number; observacao?: string };

const STATUS = ["agendado", "confirmado", "realizado", "cancelado"] as const;

function AgendaPage() {
  const qc = useQueryClient();
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [open, setOpen] = useState(false);

  const list = useQuery({
    queryKey: ["appts", date],
    queryFn: async () => {
      const { data } = await supabase
        .from("appointments")
        .select("*, patients(nome_completo), professionals(nome)")
        .eq("data", date)
        .order("horario");
      return data ?? [];
    },
  });

  const patients = useQuery({
    queryKey: ["patients-all"],
    queryFn: async () => (await supabase.from("patients").select("id, nome_completo").order("nome_completo")).data ?? [],
  });
  const profs = useQuery({
    queryKey: ["professionals-active"],
    queryFn: async () => (await supabase.from("professionals").select("id, nome").eq("situacao", "ativo").order("nome")).data ?? [],
  });

  const create = useMutation({
    mutationFn: async (v: Form) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("appointments").insert({ ...v, created_by: u.user?.id });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Agendado"); setOpen(false); qc.invalidateQueries({ queryKey: ["appts"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("appointments").update({ status: status as any }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["appts"] }),
  });

  function shiftDay(delta: number) {
    const d = new Date(date + "T00:00:00");
    d.setDate(d.getDate() + delta);
    setDate(d.toISOString().slice(0, 10));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl">Agenda</h1>
          <p className="text-sm text-muted-foreground">{fmtDate(date)}</p>
        </div>
        <NewAppointmentDialog open={open} setOpen={setOpen} create={create} patients={patients.data ?? []} profs={profs.data ?? []} initialDate={date} />
      </div>

      <Card className="p-3 flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => shiftDay(-1)}><ChevronLeft className="h-4 w-4" /></Button>
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="max-w-[180px]" />
        <Button variant="ghost" size="icon" onClick={() => shiftDay(1)}><ChevronRight className="h-4 w-4" /></Button>
        <Button variant="outline" size="sm" onClick={() => setDate(new Date().toISOString().slice(0, 10))}>Hoje</Button>
      </Card>

      <Card>
        {!list.data?.length ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Nenhum atendimento neste dia.</div>
        ) : (
          <ul className="divide-y">
            {list.data.map((a: any) => (
              <li key={a.id} className="p-4 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-4">
                  <div className="text-lg font-semibold tabular-nums">{String(a.horario).slice(0, 5)}</div>
                  <div>
                    <div className="font-medium">{a.patients?.nome_completo}</div>
                    <div className="text-xs text-muted-foreground">{a.professionals?.nome} · {a.duracao_min} min</div>
                  </div>
                </div>
                <Select value={a.status} onValueChange={(s) => updateStatus.mutate({ id: a.id, status: s })}>
                  <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function NewAppointmentDialog({ open, setOpen, create, patients, profs, initialDate }: any) {
  const { register, handleSubmit, setValue, watch, reset } = useForm<Form>({
    defaultValues: { data: initialDate, horario: "08:00", duracao_min: 60 },
  });
  const patient_id = watch("patient_id");
  const professional_id = watch("professional_id");

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Novo agendamento</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Novo agendamento</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit((v) => create.mutate(v))} className="space-y-3">
          <div>
            <Label className="text-xs uppercase">Paciente</Label>
            <Select value={patient_id ?? ""} onValueChange={(v) => setValue("patient_id", v)}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{patients.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.nome_completo}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs uppercase">Profissional</Label>
            <Select value={professional_id ?? ""} onValueChange={(v) => setValue("professional_id", v)}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{profs.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div><Label className="text-xs uppercase">Data</Label><Input type="date" {...register("data")} /></div>
            <div><Label className="text-xs uppercase">Hora</Label><Input type="time" {...register("horario")} /></div>
            <div><Label className="text-xs uppercase">Duração</Label><Input type="number" {...register("duracao_min", { valueAsNumber: true })} /></div>
          </div>
          <div><Label className="text-xs uppercase">Observação</Label><Textarea rows={2} {...register("observacao")} /></div>
          <div className="flex justify-end"><Button type="submit" disabled={create.isPending || !patient_id || !professional_id}>Agendar</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

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
import { Plus, FileDown, Check } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { brl, fmtDate } from "@/lib/format";
import { generatePdf } from "@/lib/pdf";
import { useActiveClinic } from "@/lib/active-clinic";

export const Route = createFileRoute("/_authenticated/app/financeiro")({
  component: FinanceiroPage,
});

type Form = { patient_id: string; professional_id: string; data: string; valor: number; forma_pagamento?: any; status: "pago" | "pendente"; observacoes?: string };

function FinanceiroPage() {
  const qc = useQueryClient();
  const { clinicId } = useActiveClinic();
  const [open, setOpen] = useState(false);
  const monthStart = new Date(); monthStart.setDate(1);
  const monthIso = monthStart.toISOString().slice(0, 10);

  const list = useQuery({
    queryKey: ["fin", clinicId],
    enabled: !!clinicId,
    queryFn: async () => {
      const { data } = await supabase
        .from("financial_entries")
        .select("*, patients(nome_completo), professionals(nome, conselho, registro, profissao)")
        .eq("clinic_id", clinicId!)
        .order("data", { ascending: false })
        .limit(200);
      return data ?? [];
    },
  });

  const totals = useQuery({
    queryKey: ["fin-totals", clinicId, monthIso],
    enabled: !!clinicId,
    queryFn: async () => {
      const { data: pagos } = await supabase.from("financial_entries").select("valor").eq("clinic_id", clinicId!).eq("status", "pago").gte("data", monthIso);
      const { data: pend } = await supabase.from("financial_entries").select("valor").eq("clinic_id", clinicId!).eq("status", "pendente");
      const totalMes = (pagos ?? []).reduce((s, r) => s + Number(r.valor), 0);
      const totalPend = (pend ?? []).reduce((s, r) => s + Number(r.valor), 0);
      return { totalMes, totalPend };
    },
  });

  const patients = useQuery({ queryKey: ["patients-all", clinicId], enabled: !!clinicId, queryFn: async () => (await supabase.from("patients").select("id, nome_completo").order("nome_completo")).data ?? [] });
  const profs = useQuery({ queryKey: ["professionals-active", clinicId], enabled: !!clinicId, queryFn: async () => (await supabase.from("professionals").select("id, nome").eq("situacao","ativo").order("nome")).data ?? [] });

  const create = useMutation({
    mutationFn: async (v: Form) => {
      const { data: u } = await supabase.auth.getUser();
      const payload: any = { ...v, created_by: u.user?.id };
      if (clinicId) payload.clinic_id = clinicId;
      const { error } = await supabase.from("financial_entries").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Lançamento criado"); setOpen(false); qc.invalidateQueries({ queryKey: ["fin", clinicId] }); qc.invalidateQueries({ queryKey: ["fin-totals", clinicId] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const markPaid = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("financial_entries").update({ status: "pago" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["fin", clinicId] }); qc.invalidateQueries({ queryKey: ["fin-totals", clinicId] }); },
  });

  async function emitReceipt(entry: any) {
    const { data: rec, error } = await supabase.from("receipts").insert({
      financial_entry_id: entry.id,
      patient_id: entry.patient_id,
      professional_id: entry.professional_id,
      valor: entry.valor,
      data: entry.data,
      forma_pagamento: entry.forma_pagamento,
    }).select("numero").single();
    if (error) return toast.error(error.message);
    await generatePdf({
      title: `Recibo nº ${rec.numero}`,
      patientName: entry.patients?.nome_completo,
      professional: entry.professionals,
      sections: [
        { title: "Valor", body: brl(entry.valor) },
        { title: "Forma de pagamento", body: entry.forma_pagamento || "—" },
        { title: "Data", body: fmtDate(entry.data) },
        { title: "Referente a", body: `Atendimento fisioterapêutico — ${entry.patients?.nome_completo}` },
        { title: "Declaração", body: `Recebi a quantia de ${brl(entry.valor)} referente ao atendimento prestado.` },
      ],
    });
    toast.success(`Recibo nº ${rec.numero} emitido`);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-3xl">Financeiro</h1><p className="text-sm text-muted-foreground">Lançamentos e recibos</p></div>
        <NewEntryDialog open={open} setOpen={setOpen} create={create} patients={patients.data ?? []} profs={profs.data ?? []} />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Card className="p-5"><div className="text-xs uppercase text-muted-foreground">Faturamento do mês</div><div className="text-2xl font-semibold mt-1">{brl(totals.data?.totalMes ?? 0)}</div></Card>
        <Card className="p-5"><div className="text-xs uppercase text-muted-foreground">A receber</div><div className="text-2xl font-semibold mt-1">{brl(totals.data?.totalPend ?? 0)}</div></Card>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/60">
            <tr className="text-left">
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3">Paciente</th>
              <th className="px-4 py-3 hidden md:table-cell">Forma</th>
              <th className="px-4 py-3 text-right">Valor</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {list.data?.map((e: any) => (
              <tr key={e.id}>
                <td className="px-4 py-2 tabular-nums">{fmtDate(e.data)}</td>
                <td className="px-4 py-2">{e.patients?.nome_completo}</td>
                <td className="px-4 py-2 hidden md:table-cell">{e.forma_pagamento || "—"}</td>
                <td className="px-4 py-2 text-right tabular-nums">{brl(e.valor)}</td>
                <td className="px-4 py-2"><span className={"text-xs rounded-full px-2 py-0.5 " + (e.status === "pago" ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground")}>{e.status}</span></td>
                <td className="px-4 py-2 text-right">
                  <div className="inline-flex gap-1">
                    {e.status === "pendente" && <Button size="sm" variant="outline" onClick={() => markPaid.mutate(e.id)}><Check className="h-3 w-3 mr-1" />Pago</Button>}
                    <Button size="sm" variant="outline" onClick={() => emitReceipt(e)}><FileDown className="h-3 w-3 mr-1" />Recibo</Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!list.data?.length && <div className="p-8 text-center text-sm text-muted-foreground">Sem lançamentos.</div>}
      </Card>
    </div>
  );
}

function NewEntryDialog({ open, setOpen, create, patients, profs }: any) {
  const { register, handleSubmit, setValue, watch, reset } = useForm<Form>({
    defaultValues: { data: new Date().toISOString().slice(0, 10), status: "pago", forma_pagamento: "pix" },
  });
  const patient_id = watch("patient_id");
  const professional_id = watch("professional_id");
  const forma = watch("forma_pagamento");
  const status = watch("status");

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Novo lançamento</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Novo lançamento</DialogTitle></DialogHeader>
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
          <div className="grid grid-cols-2 gap-2">
            <div><Label className="text-xs uppercase">Data</Label><Input type="date" {...register("data")} /></div>
            <div><Label className="text-xs uppercase">Valor</Label><Input type="number" step="0.01" {...register("valor", { valueAsNumber: true })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs uppercase">Forma</Label>
              <Select value={forma} onValueChange={(v) => setValue("forma_pagamento", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["pix","dinheiro","cartao","transferencia"].map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs uppercase">Status</Label>
              <Select value={status} onValueChange={(v) => setValue("status", v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pago">Pago</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div><Label className="text-xs uppercase">Observações</Label><Textarea rows={2} {...register("observacoes")} /></div>
          <div className="flex justify-end"><Button type="submit" disabled={create.isPending || !patient_id || !professional_id}>Salvar</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

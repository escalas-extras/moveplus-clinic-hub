import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Plus, FileDown, Check, Receipt, XCircle, Printer } from "lucide-react";
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
  const { clinicId, supportMode } = useActiveClinic();
  const [tab, setTab] = useState<"lancamentos" | "recibos">("lancamentos");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[2rem] leading-tight font-semibold tracking-tight">Financeiro</h1>
        <p className="mt-1.5 text-[15px] text-muted-foreground">Lançamentos e recibos da clínica</p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList>
          <TabsTrigger value="lancamentos">Lançamentos</TabsTrigger>
          <TabsTrigger value="recibos"><Receipt className="h-3.5 w-3.5 mr-1.5" />Recibos</TabsTrigger>
        </TabsList>

        <TabsContent value="lancamentos" className="space-y-6 mt-4">
          <LancamentosTab clinicId={clinicId} supportMode={supportMode} />
        </TabsContent>

        <TabsContent value="recibos" className="space-y-4 mt-4">
          <RecibosTab clinicId={clinicId} supportMode={supportMode} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ───────────────────────── LANÇAMENTOS ───────────────────────── */

function LancamentosTab({ clinicId, supportMode }: { clinicId: string | null; supportMode: boolean }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const monthStart = new Date(); monthStart.setDate(1);
  const monthIso = monthStart.toISOString().slice(0, 10);

  const list = useQuery({
    queryKey: ["fin", clinicId],
    enabled: !!clinicId,
    queryFn: async () => {
      const { data } = await supabase
        .from("financial_entries")
        .select("*, patients(nome_completo, cpf), professionals(nome, conselho, registro, profissao)")
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
  const profs = useQuery({ queryKey: ["professionals-active", clinicId], enabled: !!clinicId, queryFn: async () => (await supabase.from("professionals").select("id, nome").eq("situacao", "ativo").order("nome")).data ?? [] });

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
    if (!clinicId) return toast.error("Clínica ativa não identificada.");
    const { data: u } = await supabase.auth.getUser();
    const payload: any = {
      financial_entry_id: entry.id,
      patient_id: entry.patient_id,
      professional_id: entry.professional_id,
      clinic_id: clinicId,
      valor: entry.valor,
      data: entry.data,
      forma_pagamento: entry.forma_pagamento,
      description: `Atendimento fisioterapêutico — ${entry.patients?.nome_completo ?? ""}`.trim(),
      created_by: u.user?.id,
    };
    const { data: rec, error } = await supabase.from("receipts").insert(payload).select("numero").single();
    if (error) return toast.error(error.message);
    await renderReceiptPdf({
      numero: rec!.numero,
      patientName: entry.patients?.nome_completo,
      patientCpf: entry.patients?.cpf,
      description: payload.description,
      amount: entry.valor,
      payment_method: entry.forma_pagamento,
      payment_date: entry.data,
      issued_at: new Date().toISOString(),
    });
    toast.success(`Recibo nº ${rec!.numero} emitido`);
    qc.invalidateQueries({ queryKey: ["receipts", clinicId] });
  }

  return (
    <>
      <div className="flex justify-end">
        <NewEntryDialog open={open} setOpen={setOpen} create={create} patients={patients.data ?? []} profs={profs.data ?? []} disabled={supportMode} />
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
                    {e.status === "pendente" && <Button size="sm" variant="outline" disabled={supportMode} onClick={() => markPaid.mutate(e.id)}><Check className="h-3 w-3 mr-1" />Pago</Button>}
                    <Button size="sm" variant="outline" disabled={supportMode} onClick={() => emitReceipt(e)}><FileDown className="h-3 w-3 mr-1" />Recibo</Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!list.data?.length && <div className="p-8 text-center text-sm text-muted-foreground">Sem lançamentos.</div>}
      </Card>
    </>
  );
}

function NewEntryDialog({ open, setOpen, create, patients, profs, disabled }: any) {
  const { register, handleSubmit, setValue, watch, reset } = useForm<Form>({
    defaultValues: { data: new Date().toISOString().slice(0, 10), status: "pago", forma_pagamento: "pix" },
  });
  const patient_id = watch("patient_id");
  const professional_id = watch("professional_id");
  const forma = watch("forma_pagamento");
  const status = watch("status");

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild><Button disabled={disabled}><Plus className="h-4 w-4 mr-2" />Novo lançamento</Button></DialogTrigger>
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
                  {["pix", "dinheiro", "cartao", "transferencia"].map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
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

/* ───────────────────────── RECIBOS ───────────────────────── */

type ReceiptForm = {
  patient_id: string;
  financial_entry_id?: string | null;
  description: string;
  amount: number;
  payment_method: "pix" | "dinheiro" | "cartao" | "transferencia";
  payment_date: string;
};

function RecibosTab({ clinicId, supportMode }: { clinicId: string | null; supportMode: boolean }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [cancelOf, setCancelOf] = useState<any | null>(null);

  const list = useQuery({
    queryKey: ["receipts", clinicId],
    enabled: !!clinicId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("receipts")
        .select("id, numero, data, valor, forma_pagamento, description, status, cancelled_at, cancellation_reason, created_at, patient_id, financial_entry_id, patients(nome_completo, cpf)")
        .eq("clinic_id", clinicId!)
        .order("numero", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  const patients = useQuery({
    queryKey: ["patients-all", clinicId],
    enabled: !!clinicId,
    queryFn: async () => (await supabase.from("patients").select("id, nome_completo, cpf").eq("clinic_id", clinicId!).order("nome_completo")).data ?? [],
  });

  const create = useMutation({
    mutationFn: async (v: ReceiptForm) => {
      if (!clinicId) throw new Error("Clínica ativa não identificada.");
      const { data: u } = await supabase.auth.getUser();
      const payload: any = {
        clinic_id: clinicId,
        patient_id: v.patient_id,
        financial_entry_id: v.financial_entry_id || null,
        description: v.description,
        valor: v.amount,
        data: v.payment_date,
        forma_pagamento: v.payment_method,
        created_by: u.user?.id,
      };
      const { data, error } = await supabase.from("receipts").insert(payload).select("numero").single();
      if (error) throw error;
      return data!.numero as number;
    },
    onSuccess: async (numero, v) => {
      toast.success(`Recibo nº ${numero} emitido`);
      setOpen(false);
      const pat = (patients.data ?? []).find((p: any) => p.id === v.patient_id);
      await renderReceiptPdf({
        numero,
        patientName: pat?.nome_completo,
        patientCpf: pat?.cpf,
        description: v.description,
        amount: v.amount,
        payment_method: v.payment_method,
        payment_date: v.payment_date,
        issued_at: new Date().toISOString(),
      });
      qc.invalidateQueries({ queryKey: ["receipts", clinicId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const cancel = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("receipts")
        .update({ status: "cancelado", cancelled_at: new Date().toISOString(), cancelled_by: u.user?.id, cancellation_reason: reason } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Recibo cancelado"); setCancelOf(null); qc.invalidateQueries({ queryKey: ["receipts", clinicId] }); },
    onError: (e: any) => toast.error(e.message),
  });

  async function reprint(r: any) {
    await renderReceiptPdf({
      numero: r.numero,
      patientName: r.patients?.nome_completo,
      patientCpf: r.patients?.cpf,
      description: r.description ?? "Atendimento",
      amount: Number(r.valor),
      payment_method: r.forma_pagamento ?? "—",
      payment_date: r.data,
      issued_at: r.created_at,
      cancelled: r.status === "cancelado",
      cancellation_reason: r.cancellation_reason,
    });
  }

  return (
    <>
      <div className="flex justify-end">
        <NewReceiptDialog
          open={open}
          setOpen={setOpen}
          create={create}
          patients={patients.data ?? []}
          disabled={supportMode}
          clinicId={clinicId}
        />
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/60">
            <tr className="text-left">
              <th className="px-4 py-3">Nº</th>
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3">Paciente</th>
              <th className="px-4 py-3 hidden md:table-cell">Descrição</th>
              <th className="px-4 py-3 text-right">Valor</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {list.data?.map((r: any) => (
              <tr key={r.id} className={r.status === "cancelado" ? "opacity-60" : ""}>
                <td className="px-4 py-2 tabular-nums font-semibold">#{r.numero}</td>
                <td className="px-4 py-2 tabular-nums">{fmtDate(r.data)}</td>
                <td className="px-4 py-2">{r.patients?.nome_completo ?? "—"}</td>
                <td className="px-4 py-2 hidden md:table-cell text-muted-foreground truncate max-w-[260px]">{r.description ?? "—"}</td>
                <td className="px-4 py-2 text-right tabular-nums">{brl(r.valor)}</td>
                <td className="px-4 py-2">
                  {r.status === "cancelado"
                    ? <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200">Cancelado</Badge>
                    : <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Ativo</Badge>}
                </td>
                <td className="px-4 py-2 text-right">
                  <div className="inline-flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => reprint(r)}><Printer className="h-3 w-3 mr-1" />PDF</Button>
                    {r.status !== "cancelado" && (
                      <Button size="sm" variant="outline" disabled={supportMode} onClick={() => setCancelOf(r)} className="text-rose-600 hover:text-rose-700">
                        <XCircle className="h-3 w-3 mr-1" />Cancelar
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!list.data?.length && <div className="p-8 text-center text-sm text-muted-foreground">Sem recibos emitidos.</div>}
      </Card>

      <CancelReceiptDialog
        receipt={cancelOf}
        onClose={() => setCancelOf(null)}
        onConfirm={(reason) => cancelOf && cancel.mutate({ id: cancelOf.id, reason })}
        pending={cancel.isPending}
      />
    </>
  );
}

function NewReceiptDialog({ open, setOpen, create, patients, disabled, clinicId }: any) {
  const { register, handleSubmit, setValue, watch, reset } = useForm<ReceiptForm>({
    defaultValues: {
      payment_date: new Date().toISOString().slice(0, 10),
      payment_method: "pix",
      description: "Atendimento fisioterapêutico",
    },
  });
  const patient_id = watch("patient_id");
  const payment_method = watch("payment_method");
  const financial_entry_id = watch("financial_entry_id");

  // Lançamentos do paciente selecionado (opcional)
  const entries = useQuery({
    queryKey: ["fin-by-patient", clinicId, patient_id],
    enabled: !!clinicId && !!patient_id,
    queryFn: async () => (await supabase
      .from("financial_entries")
      .select("id, data, valor, forma_pagamento, status")
      .eq("clinic_id", clinicId!)
      .eq("patient_id", patient_id)
      .order("data", { ascending: false })
      .limit(50)).data ?? [],
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button disabled={disabled}><Plus className="h-4 w-4 mr-2" />Novo recibo</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Emitir recibo</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit((v) => create.mutate(v))} className="space-y-3">
          <div>
            <Label className="text-xs uppercase">Paciente</Label>
            <Select value={patient_id ?? ""} onValueChange={(v) => { setValue("patient_id", v); setValue("financial_entry_id", null); }}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{patients.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.nome_completo}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs uppercase">Vincular a lançamento (opcional)</Label>
            <Select
              value={financial_entry_id ?? "none"}
              onValueChange={(v) => setValue("financial_entry_id", v === "none" ? null : v)}
              disabled={!patient_id}
            >
              <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {(entries.data ?? []).map((e: any) => (
                  <SelectItem key={e.id} value={e.id}>{fmtDate(e.data)} — {brl(e.valor)} ({e.status})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs uppercase">Descrição do serviço</Label>
            <Textarea rows={2} {...register("description", { required: true })} />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-xs uppercase">Valor</Label>
              <Input type="number" step="0.01" {...register("amount", { valueAsNumber: true, required: true })} />
            </div>
            <div>
              <Label className="text-xs uppercase">Data</Label>
              <Input type="date" {...register("payment_date", { required: true })} />
            </div>
            <div>
              <Label className="text-xs uppercase">Forma</Label>
              <Select value={payment_method} onValueChange={(v) => setValue("payment_method", v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["pix", "dinheiro", "cartao", "transferencia"].map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={create.isPending || !patient_id}>Emitir recibo</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CancelReceiptDialog({ receipt, onClose, onConfirm, pending }: { receipt: any | null; onClose: () => void; onConfirm: (reason: string) => void; pending: boolean }) {
  const [reason, setReason] = useState("");
  const open = !!receipt;
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { onClose(); setReason(""); } }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Cancelar recibo nº {receipt?.numero}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            O recibo será marcado como <strong>cancelado</strong> e preservado no histórico.
            Esta ação não pode ser desfeita.
          </p>
          <div>
            <Label className="text-xs uppercase">Motivo do cancelamento</Label>
            <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Informe o motivo…" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { onClose(); setReason(""); }}>Voltar</Button>
          <Button
            variant="destructive"
            disabled={pending || reason.trim().length < 3}
            onClick={() => { onConfirm(reason.trim()); setReason(""); }}
          >
            Confirmar cancelamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ───────────────────────── PDF ───────────────────────── */

const PAYMENT_LABEL: Record<string, string> = {
  pix: "PIX",
  dinheiro: "Dinheiro",
  cartao: "Cartão",
  transferencia: "Transferência",
};

async function renderReceiptPdf(opts: {
  numero: number;
  patientName?: string | null;
  patientCpf?: string | null;
  description: string;
  amount: number;
  payment_method: string;
  payment_date: string;
  issued_at: string;
  cancelled?: boolean;
  cancellation_reason?: string | null;
}) {
  const sections: any[] = [
    {
      title: `Recibo nº ${opts.numero}`,
      body: [
        `Recebi(emos) de ${opts.patientName ?? "—"}${opts.patientCpf ? ` (CPF ${opts.patientCpf})` : ""}`,
        `a importância de ${brl(opts.amount)} (${PAYMENT_LABEL[opts.payment_method] ?? opts.payment_method})`,
        `referente a: ${opts.description}`,
        ``,
        `Data do pagamento: ${fmtDate(opts.payment_date)}`,
        `Data de emissão: ${fmtDate(opts.issued_at.slice(0, 10))}`,
      ].join("\n"),
    },
    {
      title: "Declaração",
      body: `Para clareza e devida quitação, firma-se o presente recibo no valor de ${brl(opts.amount)}.`,
    },
  ];
  if (opts.cancelled) {
    sections.push({
      title: "⚠️ RECIBO CANCELADO",
      body: opts.cancellation_reason ? `Motivo: ${opts.cancellation_reason}` : "Este recibo foi cancelado e não possui validade fiscal.",
    });
  }

  await generatePdf({
    title: `Recibo nº ${opts.numero}`,
    patientName: opts.patientName ?? undefined,
    sections,
    hideSignature: true,
  } as any);
}

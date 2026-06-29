import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, FileDown, Check, XCircle, Printer, Eye } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { brl, fmtDate } from "@/lib/format";
import {
  downloadReceiptPdf,
  previewReceiptPdf,
  printReceiptPdf,
  getStoredReceiptPrintMode,
  type ReceiptPdfData,
} from "@/lib/receipt-pdf";
import { invalidateFinanceModuleQueries } from "@/lib/finance";
import { PAYMENT_METHOD_LABELS, PAYMENT_METHOD_OPTIONS, formatPaymentMethod } from "@/lib/finance";
import { SupportGuardButton } from "@/components/support-guard";
import { FinancePanelGate } from "./FinancePanelGate";
import { FINANCE_TABLE_CARD, FINANCE_TABLE_SCROLL, FINANCE_TABLE } from "./finance-layout";

type Form = { patient_id: string; professional_id: string; data: string; valor: number; forma_pagamento?: any; status: "pago" | "pendente"; observacoes?: string };

function requiredDate(value?: string | null) {
  const v = value?.trim();
  return v ? v : null;
}

function requiredText(value: unknown, label: string) {
  const v = typeof value === "string" ? value.trim() : "";
  if (!v) throw new Error(`${label} é obrigatório.`);
  return v;
}

function requiredAmount(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) throw new Error("Informe um valor maior que zero.");
  return n;
}

async function renderReceiptPdf(
  opts: ReceiptPdfData,
  mode: "preview" | "download" | "print" = "download",
) {
  const data: ReceiptPdfData = {
    ...opts,
    printMode: opts.printMode ?? getStoredReceiptPrintMode(),
  };
  if (mode === "preview") await previewReceiptPdf(data);
  else if (mode === "print") await printReceiptPdf(data);
  else await downloadReceiptPdf(data);
}

export function FinanceLegacyLancamentosPanel({ clinicId, clinicLoading, supportMode }: { clinicId: string | null; clinicLoading: boolean; supportMode: boolean }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const monthStart = new Date(); monthStart.setDate(1);
  const monthIso = monthStart.toISOString().slice(0, 10);

  const list = useQuery({
    queryKey: ["fin", clinicId],
    enabled: !!clinicId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_entries")
        .select("*, patients(nome_completo, cpf), professionals(nome, conselho, registro, profissao)")
        .eq("clinic_id", clinicId!)
        .eq("entry_type", "receivable")
        .order("data", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  const totals = useQuery({
    queryKey: ["fin-totals", clinicId, monthIso],
    enabled: !!clinicId,
    queryFn: async () => {
      const { data: pagos } = await supabase
        .from("financial_entries")
        .select("valor")
        .eq("clinic_id", clinicId!)
        .eq("entry_type", "receivable")
        .eq("status", "pago")
        .gte("data", monthIso);
      const { data: pend } = await supabase
        .from("financial_entries")
        .select("valor")
        .eq("clinic_id", clinicId!)
        .eq("entry_type", "receivable")
        .eq("status", "pendente");
      const totalMes = (pagos ?? []).reduce((s, r) => s + Number(r.valor), 0);
      const totalPend = (pend ?? []).reduce((s, r) => s + Number(r.valor), 0);
      return { totalMes, totalPend };
    },
  });

  const patients = useQuery({ queryKey: ["patients-all", clinicId], enabled: !!clinicId, queryFn: async () => (await supabase.from("patients").select("id, nome_completo").eq("clinic_id", clinicId!).order("nome_completo")).data ?? [] });
  const profs = useQuery({ queryKey: ["professionals-active", clinicId], enabled: !!clinicId, queryFn: async () => (await supabase.from("professionals").select("id, nome").eq("clinic_id", clinicId!).eq("situacao", "ativo").order("nome")).data ?? [] });

  const create = useMutation({
    mutationFn: async (v: Form) => {
      if (!clinicId) throw new Error("Clínica ativa não identificada.");
      if (supportMode) throw new Error("Modo Suporte ativo: somente leitura. Encerre a sessão para fazer alterações.");
      const { data: u } = await supabase.auth.getUser();
      const payload: any = {
        clinic_id: clinicId,
        entry_type: "receivable",
        patient_id: requiredText(v.patient_id, "Paciente"),
        professional_id: requiredText(v.professional_id, "Profissional"),
        data: requiredDate(v.data),
        data_vencimento: requiredDate(v.data),
        valor: requiredAmount(v.valor),
        forma_pagamento: v.forma_pagamento || null,
        status: v.status ?? "pendente",
        observacoes: v.observacoes?.trim() || null,
        created_by: u.user?.id ?? null,
      };
      if (!payload.data) throw new Error("Data é obrigatória.");
      if (payload.status === "pago") payload.data_recebimento = payload.data;
      const { error } = await supabase.from("financial_entries").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Lançamento criado"); setOpen(false); invalidateFinanceModuleQueries(qc, clinicId); },
    onError: (e: any) => toast.error(e.message),
  });

  const markPaid = useMutation({
    mutationFn: async (id: string) => {
      if (!clinicId) throw new Error("Clínica ativa não identificada.");
      if (supportMode) throw new Error("Modo Suporte ativo: somente leitura. Encerre a sessão para fazer alterações.");
      const { error } = await supabase
        .from("financial_entries")
        .update({ status: "pago", data_recebimento: new Date().toISOString().slice(0, 10) })
        .eq("id", id)
        .eq("clinic_id", clinicId)
        .eq("entry_type", "receivable");
      if (error) throw error;
    },
    onSuccess: () => { invalidateFinanceModuleQueries(qc, clinicId); },
  });

  async function emitReceipt(entry: any) {
    if (!clinicId) return toast.error("Clínica ativa não identificada.");
    if (supportMode) return toast.error("Modo Suporte ativo: somente leitura. Encerre a sessão para fazer alterações.");
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
      responsavelFinanceiro: entry.patients?.responsavel,
      description: payload.description,
      serviceLabel: "atendimento fisioterapêutico",
      amount: entry.valor,
      payment_method: entry.forma_pagamento,
      payment_date: entry.data,
      issued_at: new Date().toISOString(),
      professional: entry.professionals,
      clinicId,
    }, "download");
    toast.success(`Recibo nº ${rec!.numero} emitido`);
    qc.invalidateQueries({ queryKey: ["receipts", clinicId] });
  }

  return (
    <FinancePanelGate
      clinicId={clinicId}
      clinicLoading={clinicLoading}
      loading={list.isLoading || totals.isLoading || patients.isLoading || profs.isLoading}
      error={list.error ?? totals.error ?? patients.error ?? profs.error}
      onRetry={() => {
        void list.refetch();
        void totals.refetch();
        void patients.refetch();
        void profs.refetch();
      }}
      loadingLabel="Carregando lançamentos…"
      errorFallback="Não foi possível carregar os lançamentos."
    >
    <>
      <div className="flex min-w-0 w-full max-w-full flex-wrap justify-end gap-2">
        <SupportGuardButton supportMode={supportMode} onClick={() => setOpen(true)} tooltip="Novo lançamento bloqueado no Modo Suporte">
          <Plus className="h-4 w-4 mr-2" />Novo lançamento
        </SupportGuardButton>
        <NewEntryDialog open={open} setOpen={setOpen} create={create} patients={patients.data ?? []} profs={profs.data ?? []} disabled={supportMode} />
      </div>

      <div className="grid min-w-0 w-full max-w-full gap-4 sm:grid-cols-2">
        <Card className="p-5"><div className="text-xs uppercase text-muted-foreground">Faturamento do mês</div><div className="text-2xl font-semibold mt-1">{brl(totals.data?.totalMes ?? 0)}</div></Card>
        <Card className="p-5"><div className="text-xs uppercase text-muted-foreground">A receber</div><div className="text-2xl font-semibold mt-1">{brl(totals.data?.totalPend ?? 0)}</div></Card>
      </div>

      <Card className={FINANCE_TABLE_CARD}>
        <div className={FINANCE_TABLE_SCROLL}>
        <table className={FINANCE_TABLE}>
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
                <td className="px-4 py-2 hidden md:table-cell">{formatPaymentMethod(e.forma_pagamento)}</td>
                <td className="px-4 py-2 text-right tabular-nums">{brl(e.valor)}</td>
                <td className="px-4 py-2"><span className={"text-xs rounded-full px-2 py-0.5 " + (e.status === "pago" ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground")}>{e.status}</span></td>
                <td className="px-4 py-2 text-right">
                  <div className="inline-flex flex-wrap justify-end gap-1">
                    {e.status === "pendente" && (
                      <SupportGuardButton size="sm" variant="outline" supportMode={supportMode} onClick={() => markPaid.mutate(e.id)} tooltip="Marcar como pago bloqueado no Modo Suporte">
                        <Check className="h-3 w-3 mr-1" />Pago
                      </SupportGuardButton>
                    )}
                    <SupportGuardButton size="sm" variant="outline" supportMode={supportMode} onClick={() => emitReceipt(e)} tooltip="Emitir recibo bloqueado no Modo Suporte">
                        <FileDown className="h-3 w-3 mr-1" />Recibo
                      </SupportGuardButton>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        {!list.data?.length && <div className="p-8 text-center text-sm text-muted-foreground">Sem lançamentos.</div>}
      </Card>
    </>
    </FinancePanelGate>
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
      <DialogContent>
        <DialogHeader><DialogTitle>Novo lançamento</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit((v) => create.mutate(v))} className="space-y-3">
          <div>
            <Label className="text-xs uppercase">Paciente</Label>
            <Select value={patient_id ?? ""} onValueChange={(v) => setValue("patient_id", v)} disabled={disabled}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{patients.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.nome_completo}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs uppercase">Profissional</Label>
            <Select value={professional_id ?? ""} onValueChange={(v) => setValue("professional_id", v)} disabled={disabled}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{profs.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label className="text-xs uppercase">Data</Label><Input type="date" required {...register("data")} disabled={disabled} /></div>
            <div><Label className="text-xs uppercase">Valor</Label><Input type="number" step="0.01" min="0.01" required {...register("valor", { valueAsNumber: true })} disabled={disabled} /></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs uppercase">Forma</Label>
              <Select value={forma} onValueChange={(v) => setValue("forma_pagamento", v)} disabled={disabled}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHOD_OPTIONS.map((f) => <SelectItem key={f} value={f}>{PAYMENT_METHOD_LABELS[f]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs uppercase">Status</Label>
              <Select value={status} onValueChange={(v) => setValue("status", v as any)} disabled={disabled}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pago">Pago</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div><Label className="text-xs uppercase">Observações</Label><Textarea rows={2} {...register("observacoes")} disabled={disabled} /></div>
          <div className="flex justify-end"><Button type="submit" disabled={disabled || create.isPending || !patient_id || !professional_id}>Salvar</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export { FinanceRecibosPanel as FinanceLegacyRecibosPanel } from "./FinanceRecibosPanel";


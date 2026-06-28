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
import { Plus, FileDown, Check, Receipt, XCircle, Printer, Eye, Wallet, FolderTree, Landmark, ArrowDownCircle } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { brl, fmtDate } from "@/lib/format";
import {
  downloadReceiptPdf,
  previewReceiptPdf,
  printReceiptPdf,
  getStoredReceiptPrintMode,
  type ReceiptPdfData,
  type ReceiptPrintMode,
} from "@/lib/receipt-pdf";
import { ReceiptPrintModeSelector } from "@/components/receipt-print-mode";
import { useActiveClinic } from "@/lib/active-clinic";
import { SupportGuardButton } from "@/components/support-guard";
import { AppShell, PageHeader } from "@/components/layout";
import { FinanceModuleHub, FinanceCategoriesPanel, FinanceCostCentersPanel, FinanceReceivablesPanel } from "@/components/finance";
import { financeQueryKeys } from "@/lib/finance";

export const Route = createFileRoute("/_authenticated/app/financeiro")({
  component: FinanceiroPage,
});

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

function FinanceiroPage() {
  const { clinicId, supportMode } = useActiveClinic();
  const [tab, setTab] = useState<"visao-geral" | "categorias" | "centros-custo" | "receber" | "lancamentos" | "recibos">("visao-geral");
  const monthStart = new Date();
  monthStart.setDate(1);
  const monthIso = monthStart.toISOString().slice(0, 10);

  const totals = useQuery({
    queryKey: financeQueryKeys.entryTotals(clinicId, monthIso),
    enabled: !!clinicId,
    queryFn: async () => {
      const { data: pagos } = await supabase
        .from("financial_entries")
        .select("valor")
        .eq("clinic_id", clinicId!)
        .eq("status", "pago")
        .gte("data", monthIso);
      const { data: pend } = await supabase
        .from("financial_entries")
        .select("valor")
        .eq("clinic_id", clinicId!)
        .eq("status", "pendente");
      const totalMes = (pagos ?? []).reduce((s, r) => s + Number(r.valor), 0);
      const totalPend = (pend ?? []).reduce((s, r) => s + Number(r.valor), 0);
      return { totalMes, totalPend };
    },
  });

  return (
    <AppShell clinical>
      <PageHeader
        icon={Wallet}
        eyebrow="Gestão"
        title="Financeiro"
        description="Base arquitetural Sprint G1 — hub modular com categorias, centros de custo, contas e fluxo de caixa."
        breadcrumbs={[{ label: "Clínica", to: "/app" }, { label: "Financeiro" }]}
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="visao-geral">Visão geral</TabsTrigger>
          <TabsTrigger value="categorias">
            <FolderTree className="h-3.5 w-3.5 mr-1.5" />
            Categorias
          </TabsTrigger>
          <TabsTrigger value="centros-custo">
            <Landmark className="h-3.5 w-3.5 mr-1.5" />
            Centros de Custo
          </TabsTrigger>
          <TabsTrigger value="receber">
            <ArrowDownCircle className="h-3.5 w-3.5 mr-1.5" />
            Contas a Receber
          </TabsTrigger>
          <TabsTrigger value="lancamentos">Lançamentos v1</TabsTrigger>
          <TabsTrigger value="recibos">
            <Receipt className="h-3.5 w-3.5 mr-1.5" />
            Recibos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="visao-geral" className="mt-6">
          <FinanceModuleHub
            receivedMonth={totals.data?.totalMes ?? 0}
            pendingTotal={totals.data?.totalPend ?? 0}
            onOpenLegacy={() => setTab("lancamentos")}
            onOpenCategories={() => setTab("categorias")}
            onOpenCostCenters={() => setTab("centros-custo")}
            onOpenReceivables={() => setTab("receber")}
          />
        </TabsContent>

        <TabsContent value="categorias" className="mt-6">
          <FinanceCategoriesPanel clinicId={clinicId} supportMode={supportMode} />
        </TabsContent>

        <TabsContent value="centros-custo" className="mt-6">
          <FinanceCostCentersPanel clinicId={clinicId} supportMode={supportMode} />
        </TabsContent>

        <TabsContent value="receber" className="mt-6">
          <FinanceReceivablesPanel clinicId={clinicId} supportMode={supportMode} />
        </TabsContent>

        <TabsContent value="lancamentos" className="space-y-6 mt-6">
          <LancamentosTab clinicId={clinicId} supportMode={supportMode} />
        </TabsContent>

        <TabsContent value="recibos" className="space-y-4 mt-6">
          <RecibosTab clinicId={clinicId} supportMode={supportMode} />
        </TabsContent>
      </Tabs>
    </AppShell>
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
      const { data, error } = await supabase
        .from("financial_entries")
        .select("*, patients(nome_completo, cpf), professionals(nome, conselho, registro, profissao)")
        .eq("clinic_id", clinicId!)
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
      const { data: pagos } = await supabase.from("financial_entries").select("valor").eq("clinic_id", clinicId!).eq("status", "pago").gte("data", monthIso);
      const { data: pend } = await supabase.from("financial_entries").select("valor").eq("clinic_id", clinicId!).eq("status", "pendente");
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
    onSuccess: () => { toast.success("Lançamento criado"); setOpen(false); qc.invalidateQueries({ queryKey: ["fin", clinicId] }); qc.invalidateQueries({ queryKey: ["fin-totals", clinicId] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const markPaid = useMutation({
    mutationFn: async (id: string) => {
      if (!clinicId) throw new Error("Clínica ativa não identificada.");
      if (supportMode) throw new Error("Modo Suporte ativo: somente leitura. Encerre a sessão para fazer alterações.");
      const { error } = await supabase.from("financial_entries").update({ status: "pago", data_recebimento: new Date().toISOString().slice(0, 10) }).eq("id", id).eq("clinic_id", clinicId);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["fin", clinicId] }); qc.invalidateQueries({ queryKey: ["fin-totals", clinicId] }); },
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
    <>
      <div className="flex justify-end">
        <SupportGuardButton supportMode={supportMode} onClick={() => setOpen(true)} tooltip="Novo lançamento bloqueado no Modo Suporte">
          <Plus className="h-4 w-4 mr-2" />Novo lançamento
        </SupportGuardButton>
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
                  {["pix", "dinheiro", "cartao", "transferencia"].map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
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
  const [printMode, setPrintMode] = useState<ReceiptPrintMode>(() => getStoredReceiptPrintMode());

  const list = useQuery({
    queryKey: ["receipts", clinicId],
    enabled: !!clinicId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("receipts")
        .select("id, numero, data, valor, forma_pagamento, description, status, cancelled_at, cancellation_reason, created_at, patient_id, professional_id, financial_entry_id, patients(nome_completo, cpf, responsavel), professionals(nome, profissao, conselho, registro)")
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
    queryFn: async () => (await supabase.from("patients").select("id, nome_completo, cpf, responsavel").eq("clinic_id", clinicId!).order("nome_completo")).data ?? [],
  });

  const create = useMutation({
    mutationFn: async (v: ReceiptForm) => {
      if (!clinicId) throw new Error("Clínica ativa não identificada.");
      if (supportMode) throw new Error("Modo Suporte ativo: somente leitura. Encerre a sessão para fazer alterações.");
      const { data: u } = await supabase.auth.getUser();
      const payload: any = {
        clinic_id: clinicId,
        patient_id: requiredText(v.patient_id, "Paciente"),
        financial_entry_id: v.financial_entry_id || null,
        description: requiredText(v.description, "Descrição"),
        valor: requiredAmount(v.amount),
        data: requiredDate(v.payment_date),
        forma_pagamento: v.payment_method,
        created_by: u.user?.id ?? null,
      };
      if (!payload.data) throw new Error("Data de pagamento é obrigatória.");
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
        responsavelFinanceiro: pat?.responsavel,
        description: v.description,
        serviceLabel: v.description,
        amount: v.amount,
        payment_method: v.payment_method,
        payment_date: v.payment_date,
        issued_at: new Date().toISOString(),
        clinicId,
        printMode,
      }, "download");
      qc.invalidateQueries({ queryKey: ["receipts", clinicId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const cancel = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      if (!clinicId) throw new Error("Clínica ativa não identificada.");
      if (supportMode) throw new Error("Modo Suporte ativo: somente leitura. Encerre a sessão para fazer alterações.");
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("receipts")
        .update({ status: "cancelado", cancelled_at: new Date().toISOString(), cancelled_by: u.user?.id, cancellation_reason: reason } as any)
        .eq("id", id)
        .eq("clinic_id", clinicId)
        .neq("status", "cancelado");
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Recibo cancelado"); setCancelOf(null); qc.invalidateQueries({ queryKey: ["receipts", clinicId] }); },
    onError: (e: any) => toast.error(e.message),
  });

  async function reprint(r: any, mode: "preview" | "download" | "print") {
    await renderReceiptPdf({
      numero: r.numero,
      patientName: r.patients?.nome_completo,
      patientCpf: r.patients?.cpf,
      responsavelFinanceiro: r.patients?.responsavel,
      description: r.description ?? "Atendimento",
      serviceLabel: r.description ?? "atendimento fisioterapêutico",
      amount: Number(r.valor),
      payment_method: r.forma_pagamento ?? "—",
      payment_date: r.data,
      issued_at: r.created_at,
      professional: r.professionals,
      cancelled: r.status === "cancelado",
      cancellation_reason: r.cancellation_reason,
      clinicId,
      printMode,
    }, mode);
  }


  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <ReceiptPrintModeSelector value={printMode} onChange={setPrintMode} className="rounded-lg border bg-muted/30 p-4" />
        <SupportGuardButton supportMode={supportMode} onClick={() => setOpen(true)} tooltip="Novo recibo bloqueado no Modo Suporte">
          <Plus className="h-4 w-4 mr-2" />Novo recibo
        </SupportGuardButton>
      </div>
      <NewReceiptDialog
        open={open}
        setOpen={setOpen}
        create={create}
        patients={patients.data ?? []}
        disabled={supportMode}
        clinicId={clinicId}
        printMode={printMode}
        onPrintModeChange={setPrintMode}
      />

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
                    <Button size="sm" variant="outline" onClick={() => reprint(r, "preview")}><Eye className="h-3 w-3 mr-1" />Ver</Button>
                    <Button size="sm" variant="outline" onClick={() => reprint(r, "download")}><FileDown className="h-3 w-3 mr-1" />Baixar</Button>
                    <Button size="sm" variant="outline" onClick={() => reprint(r, "print")}><Printer className="h-3 w-3 mr-1" />Imprimir</Button>
                    {r.status !== "cancelado" && (
                      <SupportGuardButton size="sm" variant="outline" supportMode={supportMode} onClick={() => setCancelOf(r)} tooltip="Cancelar recibo bloqueado no Modo Suporte" className="text-rose-600 hover:text-rose-700">
                        <XCircle className="h-3 w-3 mr-1" />Cancelar
                      </SupportGuardButton>
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

function NewReceiptDialog({ open, setOpen, create, patients, disabled, clinicId, printMode, onPrintModeChange }: any) {
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
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Emitir recibo</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit((v) => create.mutate(v))} className="space-y-3">
          <div>
            <Label className="text-xs uppercase">Paciente</Label>
            <Select value={patient_id ?? ""} onValueChange={(v) => { setValue("patient_id", v); setValue("financial_entry_id", null); }} disabled={disabled}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{patients.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.nome_completo}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs uppercase">Vincular a lançamento (opcional)</Label>
            <Select
              value={financial_entry_id ?? "none"}
              onValueChange={(v) => setValue("financial_entry_id", v === "none" ? null : v)}
              disabled={disabled || !patient_id}
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
            <Textarea rows={2} {...register("description", { required: true })} disabled={disabled} />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-xs uppercase">Valor</Label>
              <Input type="number" step="0.01" min="0.01" {...register("amount", { valueAsNumber: true, required: true })} disabled={disabled} />
            </div>
            <div>
              <Label className="text-xs uppercase">Data</Label>
              <Input type="date" {...register("payment_date", { required: true })} disabled={disabled} />
            </div>
            <div>
              <Label className="text-xs uppercase">Forma</Label>
              <Select value={payment_method} onValueChange={(v) => setValue("payment_method", v as any)} disabled={disabled}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["pix", "dinheiro", "cartao", "transferencia"].map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <ReceiptPrintModeSelector value={printMode} onChange={onPrintModeChange} compact />

          <DialogFooter>
            <Button type="submit" disabled={disabled || create.isPending || !patient_id}>Emitir recibo</Button>
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
// Template White Label dinâmico — vide src/lib/receipt-pdf.ts

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


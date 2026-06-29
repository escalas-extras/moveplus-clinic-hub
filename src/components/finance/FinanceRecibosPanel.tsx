import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SupportGuardButton } from "@/components/support-guard";
import {
  Plus,
  FileDown,
  XCircle,
  Printer,
  Eye,
  Search,
  RefreshCw,
  CheckCircle2,
  Ban,
  Receipt,
  MousePointerClick,
} from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { brl, fmtDate } from "@/lib/format";
import {
  downloadReceiptPdf,
  previewReceiptPdf,
  printReceiptPdf,
  downloadReceiptsBatchPdf,
  printReceiptsBatchPdf,
  getStoredReceiptPrintMode,
  type ReceiptPdfData,
  type ReceiptPrintMode,
} from "@/lib/receipt-pdf";
import { ReceiptPrintModeSelector } from "@/components/receipt-print-mode";
import { EmptyState } from "@/components/layout/EmptyState";
import { StatusBadge } from "@/components/layout/StatusBadge";
import { FinancePanelGate } from "./FinancePanelGate";
import { FinanceKpiCard, FinanceKpiGrid } from "./FinanceKpiCard";
import {
  FINANCE_FILTER_BAR,
  FINANCE_PANEL_ROOT,
  FINANCE_TABLE,
  FINANCE_TABLE_CARD,
  FINANCE_TABLE_SCROLL,
} from "./finance-layout";
import { cn } from "@/lib/utils";

import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHOD_OPTIONS,
  type PaymentMethod,
} from "@/lib/finance";

type ReceiptForm = {
  patient_id: string;
  financial_entry_id?: string | null;
  description: string;
  amount: number;
  payment_method: PaymentMethod;
  payment_date: string;
};

type ReceiptRow = {
  id: string;
  numero: number;
  data: string;
  valor: number;
  forma_pagamento: string | null;
  description: string | null;
  status: string;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  created_at: string;
  patient_id: string;
  professional_id: string | null;
  financial_entry_id: string | null;
  patients: { nome_completo: string; cpf: string | null; responsavel: string | null } | null;
  professionals: {
    nome: string;
    profissao: string | null;
    conselho: string | null;
    registro: string | null;
  } | null;
};

type ReceiptFilters = {
  search: string;
  patientId: string;
  status: "all" | "ativo" | "cancelado";
  dateFrom: string;
  dateTo: string;
};

const DEFAULT_FILTERS: ReceiptFilters = {
  search: "",
  patientId: "all",
  status: "all",
  dateFrom: "",
  dateTo: "",
};

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

function rowToPdfData(r: ReceiptRow, clinicId: string | null, printMode: ReceiptPrintMode): ReceiptPdfData {
  return {
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
  };
}

function filterReceipts(rows: ReceiptRow[], filters: ReceiptFilters): ReceiptRow[] {
  const q = filters.search.trim().toLowerCase();

  return rows.filter((r) => {
    if (filters.patientId !== "all" && r.patient_id !== filters.patientId) return false;
    if (filters.status === "ativo" && r.status === "cancelado") return false;
    if (filters.status === "cancelado" && r.status !== "cancelado") return false;
    if (filters.dateFrom && r.data < filters.dateFrom) return false;
    if (filters.dateTo && r.data > filters.dateTo) return false;
    if (q) {
      const hay = [String(r.numero), r.patients?.nome_completo ?? "", r.description ?? ""]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

type RecibosActionChipProps = {
  label: string;
  icon: typeof Plus;
  onClick: () => void;
  variant?: "default" | "destructive" | "outline";
  disabled?: boolean;
};

function RecibosActionChip({
  label,
  icon: Icon,
  onClick,
  variant = "outline",
  disabled,
}: RecibosActionChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "fos-recibos-action-chip inline-flex h-9 items-center justify-center gap-2 rounded-lg border px-3 text-center transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-50",
        variant === "destructive" &&
          "border-rose-200/80 bg-rose-50/50 text-rose-700 hover:bg-rose-50",
        variant === "default" &&
          "border-primary/25 bg-primary/[0.06] text-primary hover:bg-primary/[0.1]",
        variant === "outline" && "border-border/80 bg-card hover:bg-muted/30",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      <span className="text-xs font-semibold leading-tight">{label}</span>
    </button>
  );
}

type FinanceRecibosPanelProps = {
  clinicId: string | null;
  clinicLoading: boolean;
  supportMode: boolean;
};

export function FinanceRecibosPanel({ clinicId, clinicLoading, supportMode }: FinanceRecibosPanelProps) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [batchCancelOpen, setBatchCancelOpen] = useState(false);
  const [printPrompt, setPrintPrompt] = useState<"print" | "download" | null>(null);
  const [printMode, setPrintMode] = useState<ReceiptPrintMode>(() => getStoredReceiptPrintMode());
  const [filters, setFilters] = useState<ReceiptFilters>(DEFAULT_FILTERS);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const list = useQuery({
    queryKey: ["receipts", clinicId],
    enabled: !!clinicId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("receipts")
        .select(
          "id, numero, data, valor, forma_pagamento, description, status, cancelled_at, cancellation_reason, created_at, patient_id, professional_id, financial_entry_id, patients(nome_completo, cpf, responsavel), professionals(nome, profissao, conselho, registro)",
        )
        .eq("clinic_id", clinicId!)
        .order("numero", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as ReceiptRow[];
    },
  });

  const patients = useQuery({
    queryKey: ["patients-all", clinicId],
    enabled: !!clinicId,
    queryFn: async () =>
      (
        await supabase
          .from("patients")
          .select("id, nome_completo, cpf, responsavel")
          .eq("clinic_id", clinicId!)
          .order("nome_completo")
      ).data ?? [],
  });

  const filtered = useMemo(
    () => filterReceipts(list.data ?? [], filters),
    [list.data, filters],
  );

  const selectedCount = selected.size;
  const selectedVisibleRows = useMemo(
    () => filtered.filter((r) => selected.has(r.id)),
    [filtered, selected],
  );

  const stats = useMemo(() => {
    let ativos = 0;
    let cancelados = 0;
    let totalEmitido = 0;
    for (const r of filtered) {
      const valor = Number(r.valor ?? 0);
      totalEmitido += valor;
      if (r.status === "cancelado") cancelados += 1;
      else ativos += 1;
    }
    const totalSelecionado = selectedVisibleRows.reduce((s, r) => s + Number(r.valor ?? 0), 0);
    return { ativos, cancelados, totalEmitido, totalSelecionado, selectedCount: selectedVisibleRows.length };
  }, [filtered, selectedVisibleRows]);

  const create = useMutation({
    mutationFn: async (v: ReceiptForm) => {
      if (!clinicId) throw new Error("Clínica ativa não identificada.");
      if (supportMode) throw new Error("Modo Suporte ativo: somente leitura. Encerre a sessão para fazer alterações.");
      const { data: u } = await supabase.auth.getUser();
      const payload: Record<string, unknown> = {
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
      const pat = (patients.data ?? []).find((p: { id: string }) => p.id === v.patient_id);
      await renderReceiptPdf(
        {
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
        },
        "download",
      );
      qc.invalidateQueries({ queryKey: ["receipts", clinicId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cancelBatch = useMutation({
    mutationFn: async ({ ids, reason }: { ids: string[]; reason: string }) => {
      if (!clinicId) throw new Error("Clínica ativa não identificada.");
      if (supportMode) throw new Error("Modo Suporte ativo: somente leitura. Encerre a sessão para fazer alterações.");
      const { data: u } = await supabase.auth.getUser();
      for (const id of ids) {
        const { error } = await supabase
          .from("receipts")
          .update({
            status: "cancelado",
            cancelled_at: new Date().toISOString(),
            cancelled_by: u.user?.id,
            cancellation_reason: reason,
          } as never)
          .eq("id", id)
          .eq("clinic_id", clinicId)
          .neq("status", "cancelado");
        if (error) throw error;
      }
    },
    onSuccess: (_, { ids }) => {
      toast.success(`${ids.length} recibo(s) cancelado(s)`);
      setBatchCancelOpen(false);
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ["receipts", clinicId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function toggleSelect(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggleSelectAll(checked: boolean) {
    if (!checked) {
      setSelected((prev) => {
        const next = new Set(prev);
        filtered.forEach((r) => next.delete(r.id));
        return next;
      });
      return;
    }
    setSelected((prev) => {
      const next = new Set(prev);
      filtered.forEach((r) => next.add(r.id));
      return next;
    });
  }

  function requireSelection(): ReceiptRow[] | null {
    if (!selectedVisibleRows.length) {
      toast.warning("Selecione pelo menos um recibo.");
      return null;
    }
    return selectedVisibleRows;
  }

  async function previewSelected() {
    const rows = requireSelection();
    if (!rows) return;
    if (rows.length > 1) {
      toast.warning("Selecione apenas um recibo para visualizar.");
      return;
    }
    await reprint(rows[0], "preview");
  }

  function requestPrint() {
    if (!requireSelection()) return;
    setPrintPrompt("print");
  }

  function requestDownload() {
    if (!requireSelection()) return;
    setPrintPrompt("download");
  }

  async function runWithPrintMode(action: "print" | "download", mode: ReceiptPrintMode) {
    const rows = selectedVisibleRows;
    if (!rows.length) return;
    setPrintMode(mode);
    if (action === "print") {
      const items = rows.map((r) => rowToPdfData(r, clinicId, mode));
      await printReceiptsBatchPdf(items);
      toast.success(`${rows.length} recibo(s) enviado(s) para impressão.`);
      return;
    }
    if (rows.length === 1) {
      await renderReceiptPdf(rowToPdfData(rows[0], clinicId, mode), "download");
      toast.success("Recibo baixado.");
      return;
    }
    const items = rows.map((r) => rowToPdfData(r, clinicId, mode));
    await downloadReceiptsBatchPdf(items, `Recibos_${items.length}.pdf`);
    toast.success(`${rows.length} recibos baixados em PDF agrupado.`);
  }

  function openBatchCancel() {
    const rows = requireSelection();
    if (!rows) return;
    const cancellable = rows.filter((r) => r.status !== "cancelado");
    if (!cancellable.length) {
      toast.info("Os recibos selecionados já estão cancelados.");
      return;
    }
    if (supportMode) {
      toast.error("Modo Suporte ativo: somente leitura.");
      return;
    }
    setBatchCancelOpen(true);
  }

  async function reprint(r: ReceiptRow, mode: "preview" | "download" | "print") {
    await renderReceiptPdf(rowToPdfData(r, clinicId, printMode), mode);
  }

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((r) => selected.has(r.id));

  const hasReceipts = (list.data?.length ?? 0) > 0;
  const emptyTitle = hasReceipts
    ? "Nenhum recibo corresponde aos filtros"
    : "Sem recibos emitidos";
  const emptyDescription = hasReceipts
    ? "Ajuste a busca, o período ou o paciente para localizar recibos."
    : "Emita o primeiro recibo para registrar pagamentos e imprimir comprovantes.";

  const statusKpiClass = (status: ReceiptFilters["status"]) =>
    cn(
      "transition-shadow",
      filters.status === status && "ring-2 ring-primary/30 shadow-sm",
    );

  return (
    <FinancePanelGate
      clinicId={clinicId}
      clinicLoading={clinicLoading}
      loading={list.isLoading || patients.isLoading}
      error={list.error ?? patients.error}
      onRetry={() => {
        void list.refetch();
        void patients.refetch();
      }}
      loadingLabel="Carregando recibos…"
      errorFallback="Não foi possível carregar os recibos."
    >
      <div className={cn(FINANCE_PANEL_ROOT, "space-y-3")}>
        <FinanceKpiGrid columns={4} className="gap-2 lg:gap-2.5">
          <button
            type="button"
            className="min-w-0 text-left"
            onClick={() => setFilters((f) => ({ ...f, status: "ativo" }))}
            aria-pressed={filters.status === "ativo"}
          >
            <FinanceKpiCard
              icon={CheckCircle2}
              label="Ativos"
              value={String(stats.ativos)}
              hideDelta
              accent="#10b981"
              className={statusKpiClass("ativo")}
            />
          </button>
          <button
            type="button"
            className="min-w-0 text-left"
            onClick={() => setFilters((f) => ({ ...f, status: "cancelado" }))}
            aria-pressed={filters.status === "cancelado"}
          >
            <FinanceKpiCard
              icon={Ban}
              label="Cancelados"
              value={String(stats.cancelados)}
              hideDelta
              accent="#ef4444"
              tone={stats.cancelados > 0 ? "warning" : "default"}
              className={statusKpiClass("cancelado")}
            />
          </button>
          <button
            type="button"
            className="min-w-0 text-left"
            onClick={() => setFilters((f) => ({ ...f, status: "all" }))}
            aria-pressed={filters.status === "all"}
          >
            <FinanceKpiCard
              icon={Receipt}
              label={`Total · ${filtered.length}`}
              value={brl(stats.totalEmitido)}
              subtitle="Emitido no filtro"
              hideDelta
              accent="#3b82f6"
              className={statusKpiClass("all")}
            />
          </button>
          <FinanceKpiCard
            icon={MousePointerClick}
            label={stats.selectedCount > 0 ? `Selecionados · ${stats.selectedCount}` : "Selecionados"}
            value={brl(stats.totalSelecionado)}
            hideDelta
            accent="#8b5cf6"
          />
        </FinanceKpiGrid>

        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            {selectedCount === 0 ? (
              <>
                <SupportGuardButton
                  supportMode={supportMode}
                  tooltip="Novo recibo bloqueado no Modo Suporte"
                  size="sm"
                  className="h-9 gap-1.5 px-3 text-xs"
                  onClick={() => setOpen(true)}
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden />
                  Novo recibo
                </SupportGuardButton>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 gap-1.5 px-3 text-xs"
                  onClick={() => void list.refetch()}
                  disabled={list.isFetching}
                >
                  <RefreshCw className={cn("h-3.5 w-3.5", list.isFetching && "animate-spin")} aria-hidden />
                  Atualizar lista
                </Button>
              </>
            ) : (
              <>
                <RecibosActionChip label="Visualizar" icon={Eye} onClick={() => void previewSelected()} />
                <RecibosActionChip label="Imprimir" icon={Printer} onClick={requestPrint} />
                <RecibosActionChip label="Baixar PDF" icon={FileDown} onClick={requestDownload} />
                <RecibosActionChip
                  label="Cancelar"
                  icon={XCircle}
                  variant="destructive"
                  onClick={openBatchCancel}
                  disabled={supportMode}
                />
              </>
            )}
          </div>

          <div className={FINANCE_FILTER_BAR}>
            <div className="grid min-w-0 items-center gap-2 sm:grid-cols-2 lg:grid-cols-5">
              <div className="relative sm:col-span-2">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="h-9 pl-8"
                  placeholder="Pesquisar Nº, paciente, descrição…"
                  value={filters.search}
                  onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                />
              </div>
              <Input
                className="h-9"
                type="date"
                aria-label="Período (de)"
                value={filters.dateFrom}
                onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
              />
              <Input
                className="h-9"
                type="date"
                aria-label="Período (até)"
                value={filters.dateTo}
                onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
              />
              <Select
                value={filters.patientId}
                onValueChange={(v) => setFilters((f) => ({ ...f, patientId: v }))}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Paciente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os pacientes</SelectItem>
                  {(patients.data ?? []).map((p: { id: string; nome_completo: string }) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome_completo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {(filters.search ||
              filters.patientId !== "all" ||
              filters.status !== "all" ||
              filters.dateFrom ||
              filters.dateTo) && (
              <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
                {filters.status !== "all" && (
                  <span className="text-[11px] text-muted-foreground">
                    Status: {filters.status === "ativo" ? "Ativos" : "Cancelados"}
                  </span>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="ml-auto h-7 text-xs"
                  onClick={() => setFilters(DEFAULT_FILTERS)}
                >
                  Limpar filtros
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-2 md:hidden">
            {filtered.length > 0 && (
              <label className="flex items-center gap-2 rounded-lg border bg-muted/20 px-3 py-2 text-xs">
                <Checkbox
                  checked={allFilteredSelected}
                  onCheckedChange={(c) => toggleSelectAll(c === true)}
                  aria-label="Selecionar todos os recibos visíveis"
                />
                Selecionar todos ({filtered.length})
              </label>
            )}
            {filtered.map((r) => (
              <div
                key={r.id}
                className={cn(
                  "rounded-lg border bg-card p-3",
                  r.status === "cancelado" && "opacity-70",
                  selected.has(r.id) && "border-primary/40 ring-1 ring-primary/20",
                )}
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={selected.has(r.id)}
                    onCheckedChange={(c) => toggleSelect(r.id, c === true)}
                    aria-label={`Selecionar recibo ${r.numero}`}
                    className="mt-0.5"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold tabular-nums">#{r.numero}</span>
                      <StatusBadge variant={r.status === "cancelado" ? "danger" : "success"}>
                        {r.status === "cancelado" ? "Cancelado" : "Ativo"}
                      </StatusBadge>
                    </div>
                    <p className="mt-1 truncate text-sm font-medium">{r.patients?.nome_completo ?? "—"}</p>
                    <div className="mt-1 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span className="tabular-nums">{fmtDate(r.data)}</span>
                      <span className="font-semibold tabular-nums text-foreground">{brl(r.valor)}</span>
                    </div>
                    {r.description && (
                      <p className="mt-1 truncate text-xs text-muted-foreground">{r.description}</p>
                    )}
                  </div>
                </div>
                <div className="mt-2 flex justify-end gap-1 border-t border-border/50 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    aria-label={`Visualizar recibo ${r.numero}`}
                    onClick={() => void reprint(r, "preview")}
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    aria-label={`Imprimir recibo ${r.numero}`}
                    onClick={() => void reprint(r, "print")}
                  >
                    <Printer className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
            {!filtered.length && (
              <Card className={FINANCE_TABLE_CARD}>
                <EmptyState
                  icon={Receipt}
                  title={emptyTitle}
                  description={emptyDescription}
                  action={
                    !hasReceipts && !supportMode
                      ? { label: "Novo recibo", onClick: () => setOpen(true) }
                      : undefined
                  }
                  className="py-10"
                />
              </Card>
            )}
          </div>

          <Card className={cn(FINANCE_TABLE_CARD, "hidden md:block")}>
            <div className="flex items-center justify-between border-b bg-muted/40 px-3 py-2">
              <h3 className="text-sm font-semibold">Recibos ({filtered.length})</h3>
              {selectedCount > 0 && (
                <span className="text-xs text-muted-foreground">{selectedCount} selecionado(s)</span>
              )}
            </div>
            {filtered.length > 0 ? (
              <div className={FINANCE_TABLE_SCROLL}>
                <table className={cn(FINANCE_TABLE, "min-w-[820px]")}>
                  <thead className="bg-muted/60">
                    <tr className="text-left text-xs font-medium text-muted-foreground">
                      <th className="w-10 px-3 py-2">
                        <Checkbox
                          checked={allFilteredSelected}
                          onCheckedChange={(c) => toggleSelectAll(c === true)}
                          aria-label="Selecionar todos os recibos visíveis"
                        />
                      </th>
                      <th className="px-3 py-2">Nº</th>
                      <th className="px-3 py-2">Data</th>
                      <th className="px-3 py-2">Paciente</th>
                      <th className="px-3 py-2">Descrição</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2 text-right">Valor</th>
                      <th className="w-24 px-3 py-2 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-sm">
                    {filtered.map((r) => (
                      <tr
                        key={r.id}
                        className={cn(
                          r.status === "cancelado" && "opacity-70",
                          selected.has(r.id) && "bg-primary/[0.03]",
                        )}
                      >
                        <td className="px-3 py-2">
                          <Checkbox
                            checked={selected.has(r.id)}
                            onCheckedChange={(c) => toggleSelect(r.id, c === true)}
                            aria-label={`Selecionar recibo ${r.numero}`}
                          />
                        </td>
                        <td className="px-3 py-2 tabular-nums font-semibold">#{r.numero}</td>
                        <td className="px-3 py-2 tabular-nums whitespace-nowrap">{fmtDate(r.data)}</td>
                        <td className="max-w-[160px] truncate px-3 py-2">{r.patients?.nome_completo ?? "—"}</td>
                        <td className="max-w-[200px] truncate px-3 py-2 text-muted-foreground">
                          {r.description ?? "—"}
                        </td>
                        <td className="px-3 py-2">
                          <StatusBadge variant={r.status === "cancelado" ? "danger" : "success"}>
                            {r.status === "cancelado" ? "Cancelado" : "Ativo"}
                          </StatusBadge>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums font-medium">{brl(r.valor)}</td>
                        <td className="px-3 py-2">
                          <div className="flex justify-end gap-0.5">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              aria-label={`Visualizar recibo ${r.numero}`}
                              onClick={() => void reprint(r, "preview")}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              aria-label={`Imprimir recibo ${r.numero}`}
                              onClick={() => void reprint(r, "print")}
                            >
                              <Printer className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                icon={Receipt}
                title={emptyTitle}
                description={emptyDescription}
                action={
                  !hasReceipts && !supportMode
                    ? { label: "Novo recibo", onClick: () => setOpen(true) }
                    : undefined
                }
                className="py-10"
              />
            )}
          </Card>
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

        <PrintModeDialog
          action={printPrompt}
          value={printMode}
          onChange={setPrintMode}
          onClose={() => setPrintPrompt(null)}
          onConfirm={(mode) => {
            const action = printPrompt;
            setPrintPrompt(null);
            if (action) void runWithPrintMode(action, mode);
          }}
        />

        <BatchCancelReceiptDialog
          open={batchCancelOpen}
          count={selectedVisibleRows.filter((r) => r.status !== "cancelado").length}
          onClose={() => setBatchCancelOpen(false)}
          onConfirm={(reason) => {
            const ids = selectedVisibleRows.filter((r) => r.status !== "cancelado").map((r) => r.id);
            cancelBatch.mutate({ ids, reason });
          }}
          pending={cancelBatch.isPending}
        />
      </div>
    </FinancePanelGate>
  );
}

function NewReceiptDialog({
  open,
  setOpen,
  create,
  patients,
  disabled,
  clinicId,
  printMode,
  onPrintModeChange,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  create: { mutate: (v: ReceiptForm) => void; isPending: boolean };
  patients: Array<{ id: string; nome_completo: string }>;
  disabled: boolean;
  clinicId: string | null;
  printMode: ReceiptPrintMode;
  onPrintModeChange: (m: ReceiptPrintMode) => void;
}) {
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

  const entries = useQuery({
    queryKey: ["fin-by-patient", clinicId, patient_id],
    enabled: !!clinicId && !!patient_id,
    queryFn: async () =>
      (
        await supabase
          .from("financial_entries")
          .select("id, data, valor, forma_pagamento, status")
          .eq("clinic_id", clinicId!)
          .eq("entry_type", "receivable")
          .eq("patient_id", patient_id)
          .neq("status", "cancelado")
          .order("data", { ascending: false })
          .limit(50)
      ).data ?? [],
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Emitir recibo</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((v) => create.mutate(v))} className="space-y-3">
          <div>
            <Label className="text-xs uppercase">Paciente</Label>
            <Select
              value={patient_id ?? ""}
              onValueChange={(v) => {
                setValue("patient_id", v);
                setValue("financial_entry_id", null);
              }}
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {patients.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nome_completo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs uppercase">Vincular a lançamento (opcional)</Label>
            <Select
              value={financial_entry_id ?? "none"}
              onValueChange={(v) => setValue("financial_entry_id", v === "none" ? null : v)}
              disabled={disabled || !patient_id}
            >
              <SelectTrigger>
                <SelectValue placeholder="Nenhum" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {(entries.data ?? []).map((e: { id: string; data: string; valor: number; status: string }) => (
                  <SelectItem key={e.id} value={e.id}>
                    {fmtDate(e.data)} — {brl(e.valor)} ({e.status})
                  </SelectItem>
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
              <Input
                type="number"
                step="0.01"
                min="0.01"
                {...register("amount", { valueAsNumber: true, required: true })}
                disabled={disabled}
              />
            </div>
            <div>
              <Label className="text-xs uppercase">Data</Label>
              <Input type="date" {...register("payment_date", { required: true })} disabled={disabled} />
            </div>
            <div>
              <Label className="text-xs uppercase">Forma</Label>
              <Select
                value={payment_method}
                onValueChange={(v) => setValue("payment_method", v as ReceiptForm["payment_method"])}
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHOD_OPTIONS.map((f) => (
                    <SelectItem key={f} value={f}>
                      {PAYMENT_METHOD_LABELS[f]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <ReceiptPrintModeSelector value={printMode} onChange={onPrintModeChange} compact />

          <DialogFooter>
            <Button type="submit" disabled={disabled || create.isPending || !patient_id}>
              Emitir recibo
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PrintModeDialog({
  action,
  value,
  onChange,
  onClose,
  onConfirm,
}: {
  action: "print" | "download" | null;
  value: ReceiptPrintMode;
  onChange: (mode: ReceiptPrintMode) => void;
  onClose: () => void;
  onConfirm: (mode: ReceiptPrintMode) => void;
}) {
  return (
    <Dialog open={!!action} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{action === "print" ? "Imprimir recibos" : "Baixar PDF"}</DialogTitle>
        </DialogHeader>
        <ReceiptPrintModeSelector value={value} onChange={onChange} />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => onConfirm(value)}>
            {action === "print" ? "Imprimir" : "Baixar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BatchCancelReceiptDialog({
  open,
  count,
  onClose,
  onConfirm,
  pending,
}: {
  open: boolean;
  count: number;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  pending: boolean;
}) {
  const [reason, setReason] = useState("");
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          onClose();
          setReason("");
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancelar {count} recibo(s)</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Os recibos selecionados serão marcados como <strong>cancelados</strong>. Informe o motivo
            único para todos.
          </p>
          <div>
            <Label className="text-xs uppercase">Motivo do cancelamento</Label>
            <Textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Informe o motivo…"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onClose();
              setReason("");
            }}
          >
            Voltar
          </Button>
          <Button
            variant="destructive"
            disabled={pending || reason.trim().length < 3}
            onClick={() => {
              onConfirm(reason.trim());
              setReason("");
            }}
          >
            Confirmar cancelamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

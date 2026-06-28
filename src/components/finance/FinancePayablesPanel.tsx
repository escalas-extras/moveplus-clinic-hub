import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowUpCircle,
  CheckCircle2,
  Loader2,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { EmptyState } from "@/components/layout/EmptyState";
import { KpiCard } from "@/components/layout/KpiCard";
import { KpiGrid } from "@/components/layout/KpiGrid";
import { StatusBadge } from "@/components/layout/StatusBadge";
import { SupportGuardButton } from "@/components/support-guard";
import {
  PAYABLE_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  assertFinanceClinicId,
  computePayableSummary,
  defaultPayableFilters,
  filterActiveCategories,
  filterPayablesClient,
  financeQueryKeys,
  invalidateFinanceModuleQueries,
  isPayableOverdue,
  parsePayableForm,
  payableStatusVariant,
  payableSupplierLabel,
  type PaymentMethod,
  type PaymentStatus,
  type PayableFilters,
  type PayableRow,
} from "@/lib/finance";
import { brl, fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { FinancePanelGate } from "./FinancePanelGate";

type FinancePayablesPanelProps = {
  clinicId: string | null;
  clinicLoading: boolean;
  supportMode: boolean;
};

type PayableFormState = {
  professional_id: string;
  valor: string;
  data: string;
  data_vencimento: string;
  category_id: string;
  cost_center_id: string;
  documento: string;
  observacoes: string;
};

const SELECT_ALL = "all";
const todayIso = () => new Date().toISOString().slice(0, 10);

function emptyForm(): PayableFormState {
  const today = todayIso();
  return {
    professional_id: "",
    valor: "",
    data: today,
    data_vencimento: today,
    category_id: "",
    cost_center_id: "",
    documento: "",
    observacoes: "",
  };
}

function filtersKey(filters: PayableFilters) {
  const { search: _s, supplier: _sup, ...rest } = filters;
  return JSON.stringify(rest);
}

export function FinancePayablesPanel({ clinicId, clinicLoading, supportMode }: FinancePayablesPanelProps) {
  const qc = useQueryClient();
  const [filters, setFilters] = useState<PayableFilters>(() => defaultPayableFilters());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [payTarget, setPayTarget] = useState<PayableRow | null>(null);
  const [cancelTarget, setCancelTarget] = useState<PayableRow | null>(null);
  const [editing, setEditing] = useState<PayableRow | null>(null);
  const [form, setForm] = useState<PayableFormState>(emptyForm);
  const [payDate, setPayDate] = useState(todayIso());
  const [payMethod, setPayMethod] = useState<PaymentMethod>("pix");

  const lookups = useQuery({
    queryKey: financeQueryKeys.payableLookups(clinicId),
    enabled: !!clinicId,
    queryFn: async () => {
      assertFinanceClinicId(clinicId);
      const [professionals, categories, costCenters] = await Promise.all([
        supabase.from("professionals").select("id, nome").eq("clinic_id", clinicId).eq("situacao", "ativo").order("nome"),
        supabase.from("financial_categories").select("*").eq("clinic_id", clinicId).eq("type", "expense").order("sort_order"),
        supabase.from("financial_cost_centers").select("*").eq("clinic_id", clinicId).order("sort_order"),
      ]);
      if (professionals.error) throw professionals.error;
      if (categories.error) throw categories.error;
      if (costCenters.error) throw costCenters.error;
      return {
        professionals: professionals.data ?? [],
        categories: filterActiveCategories(categories.data ?? []),
        costCenters: (costCenters.data ?? []).filter((c) => c.is_active),
      };
    },
  });

  const payables = useQuery({
    queryKey: financeQueryKeys.payables(clinicId, filtersKey(filters)),
    enabled: !!clinicId,
    queryFn: async () => {
      assertFinanceClinicId(clinicId);
      let q = supabase
        .from("financial_entries")
        .select(`
          *,
          professionals(nome),
          financial_categories(id, name, type),
          financial_cost_centers(id, name, code)
        `)
        .eq("clinic_id", clinicId)
        .eq("entry_type", "payable")
        .gte("data_vencimento", filters.from)
        .lte("data_vencimento", filters.to)
        .order("data_vencimento", { ascending: false })
        .limit(500);

      if (filters.status !== SELECT_ALL) q = q.eq("status", filters.status);
      if (filters.categoryId !== SELECT_ALL) q = q.eq("category_id", filters.categoryId);
      if (filters.costCenterId !== SELECT_ALL) q = q.eq("cost_center_id", filters.costCenterId);
      if (filters.professionalId !== SELECT_ALL) q = q.eq("professional_id", filters.professionalId);

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as PayableRow[];
    },
  });

  const filteredRows = useMemo(
    () => filterPayablesClient(payables.data ?? [], filters),
    [payables.data, filters],
  );

  const summary = useMemo(() => computePayableSummary(filteredRows), [filteredRows]);

  const invalidate = () => {
    invalidateFinanceModuleQueries(qc, clinicId);
  };

  const validateExpenseCategory = (categoryId: string | null) => {
    if (!categoryId) return;
    const cat = (lookups.data?.categories ?? []).find((c) => c.id === categoryId);
    if (!cat) throw new Error("Categoria inválida ou inativa.");
    if (cat.type !== "expense") throw new Error("Selecione apenas categorias de despesa.");
  };

  const save = useMutation({
    mutationFn: async () => {
      assertFinanceClinicId(clinicId);
      if (supportMode) throw new Error("Modo Suporte ativo: somente leitura. Encerre a sessão para fazer alterações.");
      const parsed = parsePayableForm({
        ...form,
        professional_id: form.professional_id || null,
        category_id: form.category_id || null,
        cost_center_id: form.cost_center_id || null,
      });
      validateExpenseCategory(parsed.category_id);

      const { data: u } = await supabase.auth.getUser();
      const payload = {
        clinic_id: clinicId,
        entry_type: "payable" as const,
        patient_id: null,
        professional_id: parsed.professional_id,
        valor: parsed.valor,
        data: parsed.data,
        data_vencimento: parsed.data_vencimento,
        category_id: parsed.category_id,
        cost_center_id: parsed.cost_center_id,
        documento: parsed.documento,
        observacoes: parsed.observacoes,
      };

      if (editing) {
        const { error } = await supabase
          .from("financial_entries")
          .update(payload)
          .eq("id", editing.id)
          .eq("clinic_id", clinicId)
          .eq("entry_type", "payable")
          .neq("status", "cancelado");
        if (error) throw error;
        return;
      }

      const { error } = await supabase.from("financial_entries").insert({
        ...payload,
        status: "pendente",
        created_by: u.user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(editing ? "Despesa atualizada" : "Conta a pagar cadastrada");
      setDialogOpen(false);
      setEditing(null);
      setForm(emptyForm());
      invalidate();
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Erro ao salvar"),
  });

  const markPaid = useMutation({
    mutationFn: async () => {
      assertFinanceClinicId(clinicId);
      if (!payTarget) return;
      if (supportMode) throw new Error("Modo Suporte ativo: somente leitura. Encerre a sessão para fazer alterações.");
      const { error } = await supabase
        .from("financial_entries")
        .update({
          status: "pago",
          data_recebimento: payDate,
          forma_pagamento: payMethod,
        })
        .eq("id", payTarget.id)
        .eq("clinic_id", clinicId)
        .eq("entry_type", "payable")
        .eq("status", "pendente");
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pagamento registrado");
      setPayTarget(null);
      invalidate();
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Erro ao registrar pagamento"),
  });

  const reopen = useMutation({
    mutationFn: async (row: PayableRow) => {
      assertFinanceClinicId(clinicId);
      if (supportMode) throw new Error("Modo Suporte ativo: somente leitura. Encerre a sessão para fazer alterações.");
      const { error } = await supabase
        .from("financial_entries")
        .update({
          status: "pendente",
          data_recebimento: null,
          forma_pagamento: null,
        })
        .eq("id", row.id)
        .eq("clinic_id", clinicId)
        .eq("entry_type", "payable")
        .eq("status", "pago");
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pagamento reaberto");
      invalidate();
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Erro ao reabrir"),
  });

  const cancel = useMutation({
    mutationFn: async () => {
      assertFinanceClinicId(clinicId);
      if (!cancelTarget) return;
      if (supportMode) throw new Error("Modo Suporte ativo: somente leitura. Encerre a sessão para fazer alterações.");
      const { error } = await supabase
        .from("financial_entries")
        .update({ status: "cancelado" })
        .eq("id", cancelTarget.id)
        .eq("clinic_id", clinicId)
        .eq("entry_type", "payable")
        .eq("status", "pendente");
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Conta cancelada");
      setCancelTarget(null);
      invalidate();
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Erro ao cancelar"),
  });

  function openCreate() {
    setEditing(null);
    setForm(emptyForm());
    setDialogOpen(true);
  }

  function openEdit(row: PayableRow) {
    setEditing(row);
    setForm({
      professional_id: row.professional_id ?? "",
      valor: String(row.valor),
      data: row.data,
      data_vencimento: row.data_vencimento ?? row.data,
      category_id: row.category_id ?? "",
      cost_center_id: row.cost_center_id ?? "",
      documento: row.documento ?? "",
      observacoes: row.observacoes ?? "",
    });
    setDialogOpen(true);
  }

  return (
    <FinancePanelGate
      clinicId={clinicId}
      clinicLoading={clinicLoading}
      loading={payables.isLoading || lookups.isLoading}
      error={payables.error ?? lookups.error}
      onRetry={() => {
        void payables.refetch();
        void lookups.refetch();
      }}
      loadingLabel="Carregando contas a pagar…"
      errorFallback="Não foi possível carregar as contas a pagar."
    >
    <div className="space-y-6">
      <KpiGrid columns={4}>
        <KpiCard
          icon={ArrowUpCircle}
          label="Despesas em aberto"
          value={brl(summary.emAberto)}
          tone={summary.emAberto > 0 ? "warning" : "default"}
          hideDelta
          variant="premium"
          accent="#f59e0b"
        />
        <KpiCard
          icon={CheckCircle2}
          label="Pagas"
          value={brl(summary.pagas)}
          hideDelta
          variant="premium"
          accent="#10b981"
        />
        <KpiCard
          icon={ArrowUpCircle}
          label="Total do período"
          value={brl(summary.totalPeriodo)}
          hideDelta
          variant="premium"
          accent="#3b82f6"
        />
        <KpiCard
          icon={AlertCircle}
          label="Vencidas"
          value={brl(summary.vencidas)}
          tone={summary.vencidas > 0 ? "warning" : "default"}
          hideDelta
          variant="premium"
          accent="#ef4444"
        />
      </KpiGrid>

      <Card className="p-4 space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 flex-1">
            <FilterDate label="Venc. de" value={filters.from} onChange={(v) => setFilters((f) => ({ ...f, from: v }))} />
            <FilterDate label="Venc. até" value={filters.to} onChange={(v) => setFilters((f) => ({ ...f, to: v }))} />
            <FilterSelect
              label="Status"
              value={filters.status}
              onChange={(v) => setFilters((f) => ({ ...f, status: v as PaymentStatus | "all" }))}
              options={[
                { value: SELECT_ALL, label: "Todos" },
                { value: "pendente", label: PAYABLE_STATUS_LABELS.pendente },
                { value: "pago", label: PAYABLE_STATUS_LABELS.pago },
                { value: "cancelado", label: PAYABLE_STATUS_LABELS.cancelado },
              ]}
            />
            <FilterSelect
              label="Categoria"
              value={filters.categoryId}
              onChange={(v) => setFilters((f) => ({ ...f, categoryId: v }))}
              options={[
                { value: SELECT_ALL, label: "Todas" },
                ...(lookups.data?.categories ?? []).map((c) => ({ value: c.id, label: c.name })),
              ]}
            />
            <FilterSelect
              label="Centro de custo"
              value={filters.costCenterId}
              onChange={(v) => setFilters((f) => ({ ...f, costCenterId: v }))}
              options={[
                { value: SELECT_ALL, label: "Todos" },
                ...(lookups.data?.costCenters ?? []).map((c) => ({ value: c.id, label: c.name })),
              ]}
            />
            <FilterSelect
              label="Profissional"
              value={filters.professionalId}
              onChange={(v) => setFilters((f) => ({ ...f, professionalId: v }))}
              options={[
                { value: SELECT_ALL, label: "Todos" },
                ...(lookups.data?.professionals ?? []).map((p) => ({ value: p.id, label: p.nome })),
              ]}
            />
            <div>
              <Label className="text-xs">Fornecedor</Label>
              <Input
                className="h-9"
                placeholder="Filtrar…"
                value={filters.supplier}
                onChange={(e) => setFilters((f) => ({ ...f, supplier: e.target.value }))}
              />
            </div>
          </div>
          <SupportGuardButton supportMode={supportMode} onClick={openCreate} tooltip="Nova despesa bloqueada no Modo Suporte">
            <Plus className="mr-2 h-4 w-4" />
            Nova despesa
          </SupportGuardButton>
        </div>
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Pesquisar observação, documento ou profissional…"
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          />
        </div>
      </Card>

      {filteredRows.length === 0 ? (
        <EmptyState
          icon={ArrowUpCircle}
          title="Nenhuma conta a pagar"
          description="Ajuste os filtros ou cadastre uma nova despesa para o período selecionado."
          action={{ label: "Nova despesa", onClick: openCreate }}
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/60">
                <tr className="text-left">
                  <th className="px-4 py-3">Vencimento</th>
                  <th className="px-4 py-3">Fornecedor / Doc.</th>
                  <th className="px-4 py-3 hidden lg:table-cell">Profissional</th>
                  <th className="px-4 py-3 hidden md:table-cell">Categoria</th>
                  <th className="px-4 py-3 text-right">Valor</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredRows.map((row) => {
                  const overdue = isPayableOverdue(row);
                  return (
                    <tr
                      key={row.id}
                      className={cn(
                        row.status === "cancelado" && "opacity-60",
                        overdue && row.status === "pendente" && "bg-amber-50/50",
                      )}
                    >
                      <td className="px-4 py-2 tabular-nums">
                        {fmtDate(row.data_vencimento ?? row.data)}
                        {overdue && row.status === "pendente" && (
                          <span className="ml-2 text-[10px] font-semibold uppercase text-amber-700">Vencida</span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <div className="font-medium">{payableSupplierLabel(row)}</div>
                        {row.observacoes && row.documento && (
                          <div className="text-xs text-muted-foreground truncate max-w-[220px]">{row.observacoes}</div>
                        )}
                      </td>
                      <td className="px-4 py-2 hidden lg:table-cell">{row.professionals?.nome ?? "—"}</td>
                      <td className="px-4 py-2 hidden md:table-cell text-muted-foreground">
                        {row.financial_categories?.name ?? "—"}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums font-medium">{brl(row.valor)}</td>
                      <td className="px-4 py-2">
                        <StatusBadge variant={payableStatusVariant(row.status)}>
                          {PAYABLE_STATUS_LABELS[row.status]}
                        </StatusBadge>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex justify-end flex-wrap gap-1">
                          {row.status !== "cancelado" && (
                            <SupportGuardButton
                              size="sm"
                              variant="outline"
                              supportMode={supportMode}
                              onClick={() => openEdit(row)}
                              tooltip="Editar bloqueado no Modo Suporte"
                            >
                              <Pencil className="h-3 w-3 mr-1" />
                              Editar
                            </SupportGuardButton>
                          )}
                          {row.status === "pendente" && (
                            <>
                              <SupportGuardButton
                                size="sm"
                                variant="outline"
                                supportMode={supportMode}
                                onClick={() => {
                                  setPayTarget(row);
                                  setPayDate(todayIso());
                                  setPayMethod("pix");
                                }}
                                tooltip="Registrar pagamento bloqueado no Modo Suporte"
                              >
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Pagar
                              </SupportGuardButton>
                              <SupportGuardButton
                                size="sm"
                                variant="outline"
                                supportMode={supportMode}
                                onClick={() => setCancelTarget(row)}
                                tooltip="Cancelar bloqueado no Modo Suporte"
                                className="text-rose-600 hover:text-rose-700"
                              >
                                <XCircle className="h-3 w-3 mr-1" />
                                Cancelar
                              </SupportGuardButton>
                            </>
                          )}
                          {row.status === "pago" && (
                            <SupportGuardButton
                              size="sm"
                              variant="outline"
                              supportMode={supportMode}
                              onClick={() => reopen.mutate(row)}
                              tooltip="Reabrir bloqueado no Modo Suporte"
                            >
                              <RotateCcw className="h-3 w-3 mr-1" />
                              Reabrir
                            </SupportGuardButton>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <PayableFormDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditing(null);
            setForm(emptyForm());
          }
        }}
        form={form}
        setForm={setForm}
        editing={editing}
        lookups={lookups.data}
        onSubmit={() => save.mutate()}
        pending={save.isPending}
        supportMode={supportMode}
      />

      <Dialog open={!!payTarget} onOpenChange={(o) => !o && setPayTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar pagamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {payTarget && payableSupplierLabel(payTarget)} — {brl(payTarget?.valor ?? 0)}
            </p>
            <div>
              <Label className="text-xs uppercase">Data do pagamento</Label>
              <Input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs uppercase">Forma de pagamento</Label>
              <Select value={payMethod} onValueChange={(v) => setPayMethod(v as PaymentMethod)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map((m) => (
                    <SelectItem key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayTarget(null)}>Voltar</Button>
            <Button onClick={() => markPaid.mutate()} disabled={markPaid.isPending || supportMode}>
              Confirmar pagamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!cancelTarget} onOpenChange={(o) => !o && setCancelTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar conta a pagar</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            A conta será marcada como <strong>Cancelada</strong> e permanecerá no histórico.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelTarget(null)}>Voltar</Button>
            <Button
              variant="destructive"
              onClick={() => cancel.mutate()}
              disabled={cancel.isPending || supportMode}
            >
              Confirmar cancelamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </FinancePanelGate>
  );
}

function FilterDate({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input type="date" value={value} onChange={(e) => onChange(e.target.value)} className="h-9" />
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

type PayableFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: PayableFormState;
  setForm: (form: PayableFormState) => void;
  editing: PayableRow | null;
  lookups: {
    professionals: { id: string; nome: string }[];
    categories: { id: string; name: string; type: string }[];
    costCenters: { id: string; name: string }[];
  } | undefined;
  onSubmit: () => void;
  pending: boolean;
  supportMode: boolean;
};

function PayableFormDialog({
  open,
  onOpenChange,
  form,
  setForm,
  editing,
  lookups,
  onSubmit,
  pending,
  supportMode,
}: PayableFormDialogProps) {
  const readOnly = supportMode || editing?.status === "cancelado";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar conta a pagar" : "Nova conta a pagar"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs uppercase">Fornecedor / Documento</Label>
            <Input
              value={form.documento}
              onChange={(e) => setForm({ ...form, documento: e.target.value })}
              disabled={readOnly}
              placeholder="Nome do fornecedor ou nº do documento"
            />
          </div>
          <div>
            <Label className="text-xs uppercase">Profissional (opcional)</Label>
            <Select
              value={form.professional_id || "none"}
              onValueChange={(v) => setForm({ ...form, professional_id: v === "none" ? "" : v })}
              disabled={readOnly}
            >
              <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {(lookups?.professionals ?? []).map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs uppercase">Valor</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={form.valor}
                onChange={(e) => setForm({ ...form, valor: e.target.value })}
                disabled={readOnly}
              />
            </div>
            <div>
              <Label className="text-xs uppercase">Emissão</Label>
              <Input
                type="date"
                value={form.data}
                onChange={(e) => setForm({ ...form, data: e.target.value })}
                disabled={readOnly}
              />
            </div>
          </div>
          <div>
            <Label className="text-xs uppercase">Vencimento</Label>
            <Input
              type="date"
              value={form.data_vencimento}
              onChange={(e) => setForm({ ...form, data_vencimento: e.target.value })}
              disabled={readOnly}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs uppercase">Categoria (despesa)</Label>
              <Select
                value={form.category_id || "none"}
                onValueChange={(v) => setForm({ ...form, category_id: v === "none" ? "" : v })}
                disabled={readOnly}
              >
                <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {(lookups?.categories ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs uppercase">Centro de custo</Label>
              <Select
                value={form.cost_center_id || "none"}
                onValueChange={(v) => setForm({ ...form, cost_center_id: v === "none" ? "" : v })}
                disabled={readOnly}
              >
                <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {(lookups?.costCenters ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs uppercase">Observações</Label>
            <Textarea
              rows={2}
              value={form.observacoes}
              onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
              disabled={readOnly}
              placeholder="Detalhes adicionais, NF, etc."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={onSubmit}
            disabled={readOnly || pending || !form.valor || (!form.documento.trim() && !form.observacoes.trim())}
          >
            {pending ? "Salvando…" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowDownCircle,
  CheckCircle2,
  Eye,
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
import { Switch } from "@/components/ui/switch";
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
import { FinanceKpiCard, FinanceKpiGrid } from "./FinanceKpiCard";
import { StatusBadge } from "@/components/layout/StatusBadge";
import { SupportGuardButton } from "@/components/support-guard";
import {
  BOLETO_INTEGRATION_NOTICE,
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHOD_OPTIONS,
  RECEIVABLE_DISPLAY_STATUS,
  assertFinanceClinicId,
  createFinancialInstallmentPlan,
  computeReceivableSummary,
  defaultReceivableFilters,
  filterActiveCategories,
  filterReceivablesClient,
  financeQueryKeys,
  formatPaymentMethod,
  getReceivableDisplayStatus,
  invalidateFinanceModuleQueries,
  isReceivableOverdue,
  parseReceivableForm,
  parseInstallmentOptions,
  receivableDisplayStatusVariant,
  type PaymentMethod,
  type PaymentStatus,
  type ReceivableFilters,
  type ReceivableRow,
} from "@/lib/finance";
import { brl, fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { FinanceInstallmentPlanDialog } from "./FinanceInstallmentPlanDialog";
import { FinanceReceiveDialog, type ReceivePaymentPayload } from "./FinanceReceiveDialog";
import { FinanceReceivableDetailDialog } from "./FinanceReceivableDetailDialog";
import { FinancePanelGate } from "./FinancePanelGate";
import {
  FINANCE_FILTER_BAR,
  FINANCE_FILTER_GRID,
  FINANCE_PANEL_ROOT,
  FINANCE_TABLE,
  FINANCE_TABLE_CARD,
  FINANCE_TABLE_SCROLL,
} from "./finance-layout";

type FinanceReceivablesPanelProps = {
  clinicId: string | null;
  clinicLoading: boolean;
  supportMode: boolean;
};

type ReceivableFormState = {
  patient_id: string;
  professional_id: string;
  valor: string;
  data: string;
  data_vencimento: string;
  category_id: string;
  cost_center_id: string;
  documento: string;
  observacoes: string;
  forma_pagamento: PaymentMethod;
  boleto_nosso_numero: string;
  boleto_link: string;
  parcelar: boolean;
  installments_count: string;
  first_due_date: string;
};

const SELECT_ALL = "all";
const todayIso = () => new Date().toISOString().slice(0, 10);

function emptyForm(): ReceivableFormState {
  const today = todayIso();
  return {
    patient_id: "",
    professional_id: "",
    valor: "",
    data: today,
    data_vencimento: today,
    category_id: "",
    cost_center_id: "",
    documento: "",
    observacoes: "",
    forma_pagamento: "pix",
    boleto_nosso_numero: "",
    boleto_link: "",
    parcelar: false,
    installments_count: "2",
    first_due_date: today,
  };
}

function filtersKey(filters: ReceivableFilters) {
  const { search: _s, ...rest } = filters;
  return JSON.stringify(rest);
}

export function FinanceReceivablesPanel({ clinicId, clinicLoading, supportMode }: FinanceReceivablesPanelProps) {
  const qc = useQueryClient();
  const [filters, setFilters] = useState<ReceivableFilters>(() => defaultReceivableFilters());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [receiveTarget, setReceiveTarget] = useState<ReceivableRow | null>(null);
  const [detailTarget, setDetailTarget] = useState<ReceivableRow | null>(null);
  const [cancelTarget, setCancelTarget] = useState<ReceivableRow | null>(null);
  const [editing, setEditing] = useState<ReceivableRow | null>(null);
  const [form, setForm] = useState<ReceivableFormState>(emptyForm);
  const [viewPlanId, setViewPlanId] = useState<string | null>(null);

  const lookups = useQuery({
    queryKey: financeQueryKeys.receivableLookups(clinicId),
    enabled: !!clinicId,
    queryFn: async () => {
      assertFinanceClinicId(clinicId);
      const [patients, professionals, categories, costCenters] = await Promise.all([
        supabase.from("patients").select("id, nome_completo").eq("clinic_id", clinicId).order("nome_completo"),
        supabase.from("professionals").select("id, nome").eq("clinic_id", clinicId).eq("situacao", "ativo").order("nome"),
        supabase.from("financial_categories").select("*").eq("clinic_id", clinicId).eq("type", "income").order("sort_order"),
        supabase.from("financial_cost_centers").select("*").eq("clinic_id", clinicId).order("sort_order"),
      ]);
      if (patients.error) throw patients.error;
      if (professionals.error) throw professionals.error;
      if (categories.error) throw categories.error;
      if (costCenters.error) throw costCenters.error;
      return {
        patients: patients.data ?? [],
        professionals: professionals.data ?? [],
        categories: filterActiveCategories(categories.data ?? []),
        costCenters: (costCenters.data ?? []).filter((c) => c.is_active),
      };
    },
  });

  const receivables = useQuery({
    queryKey: financeQueryKeys.receivables(clinicId, filtersKey(filters)),
    enabled: !!clinicId,
    queryFn: async () => {
      assertFinanceClinicId(clinicId);
      let q = supabase
        .from("financial_entries")
        .select(`
          *,
          patients(nome_completo, cpf),
          professionals(nome),
          financial_categories(id, name, type),
          financial_cost_centers(id, name, code)
        `)
        .eq("clinic_id", clinicId)
        .eq("entry_type", "receivable")
        .gte("data_vencimento", filters.from)
        .lte("data_vencimento", filters.to)
        .order("data_vencimento", { ascending: false })
        .limit(500);

      if (filters.status !== SELECT_ALL && filters.status !== "vencido") {
        q = q.eq("status", filters.status);
      }
      if (filters.paymentMethod !== SELECT_ALL) q = q.eq("forma_pagamento", filters.paymentMethod);
      if (filters.categoryId !== SELECT_ALL) q = q.eq("category_id", filters.categoryId);
      if (filters.costCenterId !== SELECT_ALL) q = q.eq("cost_center_id", filters.costCenterId);
      if (filters.patientId !== SELECT_ALL) q = q.eq("patient_id", filters.patientId);
      if (filters.professionalId !== SELECT_ALL) q = q.eq("professional_id", filters.professionalId);

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as ReceivableRow[];
    },
  });

  const filteredRows = useMemo(() => {
    let rows = filterReceivablesClient(receivables.data ?? [], filters.search);
    if (filters.status === "vencido") {
      rows = rows.filter((r) => r.status === "pendente" && isReceivableOverdue(r));
    }
    return rows;
  }, [receivables.data, filters.search, filters.status]);

  const summary = useMemo(() => computeReceivableSummary(filteredRows), [filteredRows]);

  const invalidate = () => {
    invalidateFinanceModuleQueries(qc, clinicId);
  };

  const save = useMutation({
    mutationFn: async () => {
      assertFinanceClinicId(clinicId);
      if (supportMode) throw new Error("Modo Suporte ativo: somente leitura. Encerre a sessão para fazer alterações.");
      const parsed = parseReceivableForm({
        ...form,
        category_id: form.category_id || null,
        cost_center_id: form.cost_center_id || null,
      });

      const paymentExtras =
        parsed.forma_pagamento === "boleto"
          ? {
              boleto_nosso_numero: form.boleto_nosso_numero.trim() || null,
              boleto_link: form.boleto_link.trim() || null,
            }
          : {
              boleto_nosso_numero: null,
              boleto_link: null,
            };

      const { data: u } = await supabase.auth.getUser();

      const payload = {
        clinic_id: clinicId,
        entry_type: "receivable" as const,
        patient_id: parsed.patient_id,
        professional_id: parsed.professional_id,
        valor: parsed.valor,
        data: parsed.data,
        data_vencimento: parsed.data_vencimento,
        category_id: parsed.category_id,
        cost_center_id: parsed.cost_center_id,
        documento: parsed.documento,
        observacoes: parsed.observacoes,
        forma_pagamento: parsed.forma_pagamento as PaymentMethod,
        ...paymentExtras,
      };

      if (editing) {
        const { error } = await supabase
          .from("financial_entries")
          .update(payload)
          .eq("id", editing.id)
          .eq("clinic_id", clinicId)
          .neq("status", "cancelado");
        if (error) throw error;
        return;
      }

      const installmentOpts = parseInstallmentOptions({
        enabled: form.parcelar,
        installments_count: form.installments_count,
        first_due_date: form.first_due_date,
        totalAmount: parsed.valor,
      });

      if (installmentOpts) {
        if (!parsed.category_id) throw new Error("Categoria de receita é obrigatória para parcelamento.");
        await createFinancialInstallmentPlan(supabase, {
          clinicId,
          sourceType: "manual",
          sourceId: null,
          patientId: parsed.patient_id,
          professionalId: parsed.professional_id,
          totalAmount: parsed.valor,
          installmentsCount: installmentOpts.installmentsCount,
          firstDueDate: installmentOpts.firstDueDate,
          issueDate: parsed.data,
          categoryId: parsed.category_id,
          costCenterId: parsed.cost_center_id,
          documentoBase: parsed.documento,
          observacoesBase: parsed.observacoes ?? "Parcelamento",
          createdBy: u.user?.id ?? null,
        });
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
      toast.success(
        editing ? "Conta atualizada" : form.parcelar ? "Parcelamento gerado" : "Conta a receber cadastrada",
      );
      setDialogOpen(false);
      setEditing(null);
      setForm(emptyForm());
      invalidate();
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Erro ao salvar"),
  });

  const markReceived = useMutation({
    mutationFn: async (payload: ReceivePaymentPayload) => {
      assertFinanceClinicId(clinicId);
      if (!receiveTarget) return;
      if (supportMode) throw new Error("Modo Suporte ativo: somente leitura. Encerre a sessão para fazer alterações.");

      const obsAppend = payload.observacao?.trim();
      const mergedObs =
        obsAppend && receiveTarget.observacoes
          ? `${receiveTarget.observacoes}\n${obsAppend}`
          : obsAppend || receiveTarget.observacoes;

      const { error } = await supabase
        .from("financial_entries")
        .update({
          status: "pago",
          data_recebimento: payload.receiveDate,
          forma_pagamento: payload.receiveMethod,
          pix_chave: payload.pix_chave,
          comprovante_url: payload.comprovante_url,
          recebido_por: payload.recebido_por,
          observacoes: mergedObs,
        })
        .eq("id", receiveTarget.id)
        .eq("clinic_id", clinicId)
        .eq("status", "pendente");
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Recebimento registrado");
      setReceiveTarget(null);
      invalidate();
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Erro ao registrar recebimento"),
  });

  const reopen = useMutation({
    mutationFn: async (row: ReceivableRow) => {
      assertFinanceClinicId(clinicId);
      if (supportMode) throw new Error("Modo Suporte ativo: somente leitura. Encerre a sessão para fazer alterações.");
      const { error } = await supabase
        .from("financial_entries")
        .update({
          status: "pendente",
          data_recebimento: null,
          pix_chave: null,
          comprovante_url: null,
          recebido_por: null,
        })
        .eq("id", row.id)
        .eq("clinic_id", clinicId)
        .eq("status", "pago");
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Recebimento reaberto");
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

  function openEdit(row: ReceivableRow) {
    setEditing(row);
    setForm({
      patient_id: row.patient_id,
      professional_id: row.professional_id,
      valor: String(row.valor),
      data: row.data,
      data_vencimento: row.data_vencimento ?? row.data,
      category_id: row.category_id ?? "",
      cost_center_id: row.cost_center_id ?? "",
      documento: row.documento ?? "",
      observacoes: row.observacoes ?? "",
      forma_pagamento: row.forma_pagamento ?? "pix",
      boleto_nosso_numero: row.boleto_nosso_numero ?? "",
      boleto_link: row.boleto_link ?? "",
      parcelar: false,
      installments_count: "2",
      first_due_date: row.data_vencimento ?? row.data,
    });
    setDialogOpen(true);
  }

  return (
    <FinancePanelGate
      clinicId={clinicId}
      clinicLoading={clinicLoading}
      loading={receivables.isLoading || lookups.isLoading}
      error={receivables.error ?? lookups.error}
      onRetry={() => {
        void receivables.refetch();
        void lookups.refetch();
      }}
      loadingLabel="Preparando contas a receber…"
      errorFallback="Não foi possível carregar as contas a receber."
    >
    <div className={FINANCE_PANEL_ROOT}>
      <FinanceKpiGrid columns={4}>
        <FinanceKpiCard
          icon={ArrowDownCircle}
          label="Em aberto"
          value={brl(summary.emAberto)}
          tone={summary.emAberto > 0 ? "warning" : "default"}
          hideDelta
          variant="premium"
        />
        <FinanceKpiCard
          icon={CheckCircle2}
          label="Recebidas"
          value={brl(summary.recebidas)}
          hideDelta
          variant="premium"
          accent="#10b981"
        />
        <FinanceKpiCard
          icon={ArrowDownCircle}
          label="Total do período"
          value={brl(summary.totalPeriodo)}
          hideDelta
          variant="premium"
          accent="#3b82f6"
        />
        <FinanceKpiCard
          icon={AlertCircle}
          label="Vencidas"
          value={brl(summary.vencidas)}
          tone={summary.vencidas > 0 ? "warning" : "default"}
          hideDelta
          variant="premium"
          accent="#ef4444"
        />
      </FinanceKpiGrid>

      <div className={cn(FINANCE_FILTER_BAR, "space-y-2")}>
        <div className="flex min-w-0 flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div className={cn(FINANCE_FILTER_GRID, "min-w-0 flex-1")}>
            <FilterDate label="Venc. de" value={filters.from} onChange={(v) => setFilters((f) => ({ ...f, from: v }))} />
            <FilterDate label="Venc. até" value={filters.to} onChange={(v) => setFilters((f) => ({ ...f, to: v }))} />
            <FilterSelect
              label="Status"
              value={filters.status}
              onChange={(v) => setFilters((f) => ({ ...f, status: v as ReceivableFilters["status"] }))}
              options={[
                { value: SELECT_ALL, label: "Todos" },
                { value: "pendente", label: RECEIVABLE_DISPLAY_STATUS.aberto },
                { value: "pago", label: RECEIVABLE_DISPLAY_STATUS.recebido },
                { value: "vencido", label: RECEIVABLE_DISPLAY_STATUS.vencido },
                { value: "cancelado", label: RECEIVABLE_DISPLAY_STATUS.cancelado },
              ]}
            />
            <FilterSelect
              label="Forma de recebimento"
              value={filters.paymentMethod}
              onChange={(v) => setFilters((f) => ({ ...f, paymentMethod: v as PaymentMethod | "all" }))}
              options={[
                { value: SELECT_ALL, label: "Todas" },
                ...PAYMENT_METHOD_OPTIONS.map((m) => ({ value: m, label: PAYMENT_METHOD_LABELS[m] })),
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
              label="Paciente"
              value={filters.patientId}
              onChange={(v) => setFilters((f) => ({ ...f, patientId: v }))}
              options={[
                { value: SELECT_ALL, label: "Todos" },
                ...(lookups.data?.patients ?? []).map((p) => ({ value: p.id, label: p.nome_completo })),
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
          </div>
          <SupportGuardButton supportMode={supportMode} onClick={openCreate} tooltip="Nova conta bloqueada no Modo Suporte">
            <Plus className="mr-2 h-4 w-4" />
            Nova receita
          </SupportGuardButton>
        </div>
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-9 pl-9"
            placeholder="Pesquisar paciente, observação ou documento…"
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          />
        </div>
      </div>

      {filteredRows.length === 0 ? (
        <EmptyState
          icon={ArrowDownCircle}
          title="Nenhuma conta a receber"
          description="Ajuste os filtros ou cadastre uma nova receita para o período selecionado."
          action={{ label: "Nova receita", onClick: openCreate }}
        />
      ) : (
        <Card className={FINANCE_TABLE_CARD}>
          <div className={FINANCE_TABLE_SCROLL}>
            <table className={FINANCE_TABLE}>
              <thead className="bg-muted/60">
                <tr className="text-left">
                  <th className="px-4 py-3">Vencimento</th>
                  <th className="px-4 py-3">Paciente</th>
                  <th className="px-4 py-3 hidden lg:table-cell">Profissional</th>
                  <th className="px-4 py-3 hidden md:table-cell">Categoria</th>
                  <th className="px-4 py-3 hidden lg:table-cell">Forma</th>
                  <th className="px-4 py-3 text-right">Valor</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredRows.map((row) => {
                  const overdue = isReceivableOverdue(row);
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
                        <div className="font-medium">{row.patients?.nome_completo ?? "—"}</div>
                        {row.documento && (
                          <div className="text-xs text-muted-foreground">Doc: {row.documento}</div>
                        )}
                        {row.installment_plan_id && row.installment_number && row.installment_total && (
                          <div className="text-xs text-primary">
                            Parcela {row.installment_number}/{row.installment_total}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2 hidden lg:table-cell">{row.professionals?.nome ?? "—"}</td>
                      <td className="px-4 py-2 hidden md:table-cell text-muted-foreground">
                        {row.financial_categories?.name ?? "—"}
                      </td>
                      <td className="px-4 py-2 hidden lg:table-cell text-muted-foreground">
                        {formatPaymentMethod(row.forma_pagamento)}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums font-medium">{brl(row.valor)}</td>
                      <td className="px-4 py-2">
                        <StatusBadge variant={receivableDisplayStatusVariant(getReceivableDisplayStatus(row))}>
                          {RECEIVABLE_DISPLAY_STATUS[getReceivableDisplayStatus(row)]}
                        </StatusBadge>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex justify-end flex-wrap gap-1">
                          <Button size="sm" variant="outline" onClick={() => setDetailTarget(row)}>
                            <Eye className="h-3 w-3 mr-1" />
                            Detalhe
                          </Button>
                          {row.installment_plan_id && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setViewPlanId(row.installment_plan_id!)}
                            >
                              Ver parcelas
                            </Button>
                          )}
                          {row.status !== "cancelado" && !row.installment_plan_id && (
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
                                onClick={() => setReceiveTarget(row)}
                                tooltip="Registrar recebimento bloqueado no Modo Suporte"
                              >
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Receber
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

      <FinanceInstallmentPlanDialog
        open={!!viewPlanId}
        onOpenChange={(o) => !o && setViewPlanId(null)}
        planId={viewPlanId}
        clinicId={clinicId}
        supportMode={supportMode}
      />

      <ReceivableFormDialog
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

      <FinanceReceiveDialog
        open={!!receiveTarget}
        onOpenChange={(o) => !o && setReceiveTarget(null)}
        patientLabel={receiveTarget?.patients?.nome_completo ?? "—"}
        amountLabel={brl(receiveTarget?.valor ?? 0)}
        initialMethod={receiveTarget?.forma_pagamento ?? "pix"}
        onConfirm={(payload) => markReceived.mutate(payload)}
        pending={markReceived.isPending}
        supportMode={supportMode}
      />

      <FinanceReceivableDetailDialog row={detailTarget} onClose={() => setDetailTarget(null)} />

      <Dialog open={!!cancelTarget} onOpenChange={(o) => !o && setCancelTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar conta a receber</DialogTitle>
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

type ReceivableFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: ReceivableFormState;
  setForm: (form: ReceivableFormState) => void;
  editing: ReceivableRow | null;
  lookups: {
    patients: { id: string; nome_completo: string }[];
    professionals: { id: string; nome: string }[];
    categories: { id: string; name: string }[];
    costCenters: { id: string; name: string }[];
  } | undefined;
  onSubmit: () => void;
  pending: boolean;
  supportMode: boolean;
};

function ReceivableFormDialog({
  open,
  onOpenChange,
  form,
  setForm,
  editing,
  lookups,
  onSubmit,
  pending,
  supportMode,
}: ReceivableFormDialogProps) {
  const readOnly = supportMode || editing?.status === "cancelado";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar conta a receber" : "Nova conta a receber"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs uppercase">Paciente</Label>
            <Select
              value={form.patient_id}
              onValueChange={(v) => setForm({ ...form, patient_id: v })}
              disabled={readOnly}
            >
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {(lookups?.patients ?? []).map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.nome_completo}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs uppercase">Profissional</Label>
            <Select
              value={form.professional_id}
              onValueChange={(v) => setForm({ ...form, professional_id: v })}
              disabled={readOnly}
            >
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {(lookups?.professionals ?? []).map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs uppercase">Forma de recebimento *</Label>
            <Select
              value={form.forma_pagamento}
              onValueChange={(v) => setForm({ ...form, forma_pagamento: v as PaymentMethod })}
              disabled={readOnly}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHOD_OPTIONS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {PAYMENT_METHOD_LABELS[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {form.forma_pagamento === "boleto" && (
            <div className="space-y-3 rounded-lg border border-amber-200/80 bg-amber-50/50 p-3">
              <p className="text-xs text-amber-900">{BOLETO_INTEGRATION_NOTICE}</p>
              <div>
                <Label className="text-xs uppercase">Nosso número / referência</Label>
                <Input
                  value={form.boleto_nosso_numero}
                  onChange={(e) => setForm({ ...form, boleto_nosso_numero: e.target.value })}
                  disabled={readOnly}
                  placeholder="Referência do boleto"
                />
              </div>
              <div>
                <Label className="text-xs uppercase">Link do boleto (opcional)</Label>
                <Input
                  value={form.boleto_link}
                  onChange={(e) => setForm({ ...form, boleto_link: e.target.value })}
                  disabled={readOnly}
                  placeholder="https://…"
                />
              </div>
            </div>
          )}
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
              <Label className="text-xs uppercase">Documento (opcional)</Label>
              <Input
                value={form.documento}
                onChange={(e) => setForm({ ...form, documento: e.target.value })}
                disabled={readOnly}
                placeholder="NF, boleto, ref."
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs uppercase">Emissão</Label>
              <Input
                type="date"
                value={form.data}
                onChange={(e) => setForm({ ...form, data: e.target.value })}
                disabled={readOnly}
              />
            </div>
            <div>
              <Label className="text-xs uppercase">Vencimento</Label>
              <Input
                type="date"
                value={form.parcelar ? form.first_due_date : form.data_vencimento}
                onChange={(e) =>
                  setForm(
                    form.parcelar
                      ? { ...form, first_due_date: e.target.value }
                      : { ...form, data_vencimento: e.target.value },
                  )
                }
                disabled={readOnly}
              />
              {form.parcelar && !editing && (
                <p className="mt-1 text-[10px] text-muted-foreground">1ª parcela — demais vencimentos mensais</p>
              )}
            </div>
          </div>
          {!editing && (
            <div className="rounded-lg border p-3 space-y-3">
              <label className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium">Parcelar receita</span>
                <Switch
                  checked={form.parcelar}
                  disabled={readOnly}
                  onCheckedChange={(checked) =>
                    setForm({
                      ...form,
                      parcelar: checked,
                      first_due_date: form.first_due_date || form.data_vencimento || form.data,
                    })
                  }
                />
              </label>
              {form.parcelar && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs uppercase">Nº parcelas</Label>
                    <Input
                      type="number"
                      min={2}
                      value={form.installments_count}
                      onChange={(e) => setForm({ ...form, installments_count: e.target.value })}
                      disabled={readOnly}
                    />
                  </div>
                  <div>
                    <Label className="text-xs uppercase">1º vencimento</Label>
                    <Input
                      type="date"
                      value={form.first_due_date}
                      onChange={(e) => setForm({ ...form, first_due_date: e.target.value })}
                      disabled={readOnly}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs uppercase">Categoria</Label>
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
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={onSubmit}
            disabled={readOnly || pending || !form.patient_id || !form.professional_id || !form.valor}
          >
            {pending ? "Salvando…" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

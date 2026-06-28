import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Eye,
  Loader2,
  MessageSquare,
  RotateCcw,
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
import { FinanceKpiCard, FinanceKpiGrid } from "./FinanceKpiCard";
import { PageSection } from "@/components/layout/PageSection";
import { StatusBadge } from "@/components/layout/StatusBadge";
import { SupportGuardButton } from "@/components/support-guard";
import {
  DELINQUENCY_AGE_BUCKET_LABELS,
  DELINQUENCY_ORIGIN_LABELS,
  PAYMENT_METHOD_LABELS,
  assertFinanceClinicId,
  computeDaysOverdue,
  computeDelinquencySummary,
  defaultDelinquencyFilters,
  delinquencyAgeTone,
  delinquencyFiltersKey,
  delinquencyOriginLabel,
  downloadDelinquencyCsv,
  filterDelinquencyRows,
  financeQueryKeys,
  invalidateFinanceModuleQueries,
  toDelinquencyCsv,
  todayIso,
  type DelinquencyFilters,
  type DelinquencyRow,
  type PaymentMethod,
} from "@/lib/finance";
import { brl, fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { FinancePanelGate } from "./FinancePanelGate";
import {
  FINANCE_FILTER_GRID,
  FINANCE_PANEL_ROOT,
  FINANCE_TABLE,
  FINANCE_TABLE_CARD,
  FINANCE_TABLE_SCROLL,
} from "./finance-layout";

type FinanceDelinquencyPanelProps = {
  clinicId: string | null;
  clinicLoading: boolean;
  supportMode: boolean;
};

const SELECT_ALL = "all";

export function FinanceDelinquencyPanel({ clinicId, clinicLoading, supportMode }: FinanceDelinquencyPanelProps) {
  const qc = useQueryClient();
  const [filters, setFilters] = useState<DelinquencyFilters>(() => defaultDelinquencyFilters());
  const [receiveTarget, setReceiveTarget] = useState<DelinquencyRow | null>(null);
  const [detailTarget, setDetailTarget] = useState<DelinquencyRow | null>(null);
  const [notesTarget, setNotesTarget] = useState<DelinquencyRow | null>(null);
  const [receiveDate, setReceiveDate] = useState(todayIso());
  const [receiveMethod, setReceiveMethod] = useState<PaymentMethod>("pix");
  const [collectionNotes, setCollectionNotes] = useState("");

  const lookups = useQuery({
    queryKey: financeQueryKeys.delinquencyLookups(clinicId),
    enabled: !!clinicId,
    queryFn: async () => {
      assertFinanceClinicId(clinicId);
      const [patients, categories, costCenters] = await Promise.all([
        supabase.from("patients").select("id, nome_completo").eq("clinic_id", clinicId).order("nome_completo"),
        supabase.from("financial_categories").select("id, name").eq("clinic_id", clinicId).eq("type", "income").order("sort_order"),
        supabase.from("financial_cost_centers").select("id, name").eq("clinic_id", clinicId).eq("is_active", true).order("sort_order"),
      ]);
      if (patients.error) throw patients.error;
      if (categories.error) throw categories.error;
      if (costCenters.error) throw costCenters.error;
      return {
        patients: patients.data ?? [],
        categories: categories.data ?? [],
        costCenters: costCenters.data ?? [],
      };
    },
  });

  const delinquency = useQuery({
    queryKey: financeQueryKeys.delinquency(clinicId, delinquencyFiltersKey(filters)),
    enabled: !!clinicId,
    queryFn: async () => {
      assertFinanceClinicId(clinicId);
      const today = todayIso();
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
        .eq("status", "pendente")
        .lt("data_vencimento", today)
        .gte("data_vencimento", filters.from)
        .lte("data_vencimento", filters.to)
        .order("data_vencimento", { ascending: true })
        .limit(1000);

      if (filters.patientId !== SELECT_ALL) q = q.eq("patient_id", filters.patientId);
      if (filters.categoryId !== SELECT_ALL) q = q.eq("category_id", filters.categoryId);
      if (filters.costCenterId !== SELECT_ALL) q = q.eq("cost_center_id", filters.costCenterId);

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as DelinquencyRow[];
    },
  });

  const filteredRows = useMemo(
    () => filterDelinquencyRows(delinquency.data ?? [], filters),
    [delinquency.data, filters],
  );

  const summary = useMemo(() => computeDelinquencySummary(filteredRows), [filteredRows]);

  const invalidate = () => invalidateFinanceModuleQueries(qc, clinicId);

  const markReceived = useMutation({
    mutationFn: async () => {
      assertFinanceClinicId(clinicId);
      if (!receiveTarget) return;
      if (supportMode) throw new Error("Modo Suporte ativo: somente leitura. Encerre a sessão para fazer alterações.");
      const { error } = await supabase
        .from("financial_entries")
        .update({
          status: "pago",
          data_recebimento: receiveDate,
          forma_pagamento: receiveMethod,
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

  const saveCollectionNotes = useMutation({
    mutationFn: async () => {
      assertFinanceClinicId(clinicId);
      if (!notesTarget) return;
      if (supportMode) throw new Error("Modo Suporte ativo: somente leitura. Encerre a sessão para fazer alterações.");
      const { error } = await supabase
        .from("financial_entries")
        .update({ collection_notes: collectionNotes.trim() || null })
        .eq("id", notesTarget.id)
        .eq("clinic_id", clinicId)
        .eq("status", "pendente");
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Nota de cobrança salva");
      setNotesTarget(null);
      setCollectionNotes("");
      invalidate();
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Erro ao salvar nota"),
  });

  function openNotes(row: DelinquencyRow) {
    setNotesTarget(row);
    setCollectionNotes(row.collection_notes ?? "");
  }

  function exportCsv() {
    if (!filteredRows.length) return;
    downloadDelinquencyCsv(
      `inadimplencia-${filters.from}_${filters.to}.csv`,
      toDelinquencyCsv(filteredRows),
    );
  }

  function resetFilters() {
    setFilters(defaultDelinquencyFilters());
  }

  return (
    <FinancePanelGate
      clinicId={clinicId}
      clinicLoading={clinicLoading}
      loading={delinquency.isLoading || lookups.isLoading}
      error={delinquency.error ?? lookups.error}
      onRetry={() => {
        void delinquency.refetch();
        void lookups.refetch();
      }}
      loadingLabel="Carregando inadimplência…"
      errorFallback="Não foi possível carregar os recebíveis vencidos."
    >
    <div className={FINANCE_PANEL_ROOT}>
      <FinanceKpiGrid columns={3}>
        <FinanceKpiCard
          icon={AlertTriangle}
          label="Total vencido"
          value={brl(summary.totalVencido)}
          tone={summary.totalVencido > 0 ? "warning" : "default"}
          hideDelta
          variant="premium"
          accent="#ef4444"
        />
        <FinanceKpiCard
          icon={AlertTriangle}
          label="Títulos vencidos"
          value={String(summary.quantidade)}
          tone={summary.quantidade > 0 ? "warning" : "default"}
          hideDelta
          variant="premium"
        />
        <FinanceKpiCard
          icon={AlertTriangle}
          label="Maior devedor"
          value={summary.maiorDevedorNome ? brl(summary.maiorDevedorValor) : "—"}
          subtitle={summary.maiorDevedorNome ?? undefined}
          tone={summary.maiorDevedorValor > 0 ? "warning" : "default"}
          hideDelta
          variant="premium"
        />
      </FinanceKpiGrid>

      <FinanceKpiGrid columns={3}>
        <FinanceKpiCard
          icon={AlertTriangle}
          label="Vencidos 1–7 dias"
          value={brl(summary.vencidos1a7)}
          hideDelta
          variant="premium"
          accent="#f59e0b"
        />
        <FinanceKpiCard
          icon={AlertTriangle}
          label="Vencidos 8–30 dias"
          value={brl(summary.vencidos8a30)}
          hideDelta
          variant="premium"
          accent="#f97316"
        />
        <FinanceKpiCard
          icon={AlertTriangle}
          label="Vencidos acima de 30 dias"
          value={brl(summary.vencidosAcima30)}
          hideDelta
          variant="premium"
          accent="#ef4444"
        />
      </FinanceKpiGrid>

      <Card className="min-w-0 max-w-full p-4">
        <div className={FINANCE_FILTER_GRID}>
          <FilterDate
            label="Vencimento de"
            value={filters.from}
            onChange={(v) => setFilters((f) => ({ ...f, from: v }))}
          />
          <FilterDate
            label="Vencimento até"
            value={filters.to}
            onChange={(v) => setFilters((f) => ({ ...f, to: v }))}
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
            label="Origem"
            value={filters.origin}
            onChange={(v) => setFilters((f) => ({ ...f, origin: v as DelinquencyFilters["origin"] }))}
            options={[
              { value: SELECT_ALL, label: "Todas" },
              ...Object.entries(DELINQUENCY_ORIGIN_LABELS).map(([value, label]) => ({ value, label })),
            ]}
          />
          <FilterSelect
            label="Faixa de atraso"
            value={filters.ageBucket}
            onChange={(v) => setFilters((f) => ({ ...f, ageBucket: v as DelinquencyFilters["ageBucket"] }))}
            options={Object.entries(DELINQUENCY_AGE_BUCKET_LABELS).map(([value, label]) => ({ value, label }))}
          />
          <div className="flex items-end gap-2">
            <Button variant="outline" size="sm" className="h-9" onClick={resetFilters}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Limpar
            </Button>
            <Button variant="outline" size="sm" className="h-9" onClick={exportCsv} disabled={!filteredRows.length}>
              <Download className="mr-1.5 h-3.5 w-3.5" />
              CSV
            </Button>
          </div>
        </div>
      </Card>

      <PageSection
        title="Recebíveis vencidos"
        description="Títulos pendentes com vencimento anterior a hoje."
      >
        {!filteredRows.length ? (
          <EmptyState
            icon={CheckCircle2}
            title="Nenhum título vencido"
            description="Não há recebíveis inadimplentes para os filtros selecionados."
          />
        ) : (
          <Card className={FINANCE_TABLE_CARD}>
            <div className={FINANCE_TABLE_SCROLL}>
              <table className={FINANCE_TABLE}>
                <thead className="bg-muted/60">
                  <tr className="text-left">
                    <th className="px-4 py-3">Paciente</th>
                    <th className="px-4 py-3 hidden md:table-cell">Documento</th>
                    <th className="px-4 py-3">Vencimento</th>
                    <th className="px-4 py-3 text-right">Atraso</th>
                    <th className="px-4 py-3 text-right">Valor</th>
                    <th className="px-4 py-3 hidden lg:table-cell">Categoria</th>
                    <th className="px-4 py-3 hidden lg:table-cell">Centro</th>
                    <th className="px-4 py-3 hidden sm:table-cell">Origem</th>
                    <th className="px-4 py-3 hidden xl:table-cell">Observações</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredRows.map((row) => {
                    const due = row.data_vencimento ?? "";
                    const days = due ? computeDaysOverdue(due) : 0;
                    const tone = delinquencyAgeTone(days);
                    return (
                      <tr key={row.id} className="hover:bg-muted/30">
                        <td className="px-4 py-2 font-medium">{row.patients?.nome_completo ?? "—"}</td>
                        <td className="px-4 py-2 hidden md:table-cell text-muted-foreground tabular-nums">
                          {row.patients?.cpf ?? row.documento ?? "—"}
                        </td>
                        <td className="px-4 py-2 tabular-nums">{fmtDate(due)}</td>
                        <td className="px-4 py-2 text-right">
                          <StatusBadge
                            variant={tone === "danger" ? "danger" : tone === "warning" ? "warning" : "neutral"}
                          >
                            {`${days}d`}
                          </StatusBadge>
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums font-medium">{brl(row.valor)}</td>
                        <td className="px-4 py-2 hidden lg:table-cell text-muted-foreground">
                          {row.financial_categories?.name ?? "—"}
                        </td>
                        <td className="px-4 py-2 hidden lg:table-cell text-muted-foreground">
                          {row.financial_cost_centers?.name ?? "—"}
                        </td>
                        <td className="px-4 py-2 hidden sm:table-cell">
                          <StatusBadge variant="neutral">{delinquencyOriginLabel(row)}</StatusBadge>
                        </td>
                        <td className="px-4 py-2 hidden xl:table-cell max-w-[200px] truncate text-muted-foreground">
                          {row.observacoes ?? row.collection_notes ?? "—"}
                        </td>
                        <td className="px-4 py-2 text-right">
                          <div className="inline-flex flex-wrap justify-end gap-1">
                            <Button size="sm" variant="outline" onClick={() => setDetailTarget(row)}>
                              <Eye className="h-3 w-3 mr-1" />
                              Detalhes
                            </Button>
                            <SupportGuardButton
                              size="sm"
                              variant="outline"
                              supportMode={supportMode}
                              onClick={() => openNotes(row)}
                              tooltip="Notas de cobrança bloqueadas no Modo Suporte"
                            >
                              <MessageSquare className="h-3 w-3 mr-1" />
                              Cobrança
                            </SupportGuardButton>
                            <SupportGuardButton
                              size="sm"
                              variant="outline"
                              supportMode={supportMode}
                              onClick={() => {
                                setReceiveTarget(row);
                                setReceiveDate(todayIso());
                                setReceiveMethod("pix");
                              }}
                              tooltip="Registrar recebimento bloqueado no Modo Suporte"
                            >
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Receber
                            </SupportGuardButton>
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
      </PageSection>

      <Dialog open={!!receiveTarget} onOpenChange={(o) => !o && setReceiveTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar recebimento</DialogTitle>
          </DialogHeader>
          {receiveTarget && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {receiveTarget.patients?.nome_completo} — {brl(receiveTarget.valor)} (venc. {fmtDate(receiveTarget.data_vencimento ?? "")})
              </p>
              <div>
                <Label className="text-xs uppercase">Data do recebimento</Label>
                <Input type="date" value={receiveDate} onChange={(e) => setReceiveDate(e.target.value)} disabled={supportMode} />
              </div>
              <div>
                <Label className="text-xs uppercase">Forma de pagamento</Label>
                <Select value={receiveMethod} onValueChange={(v) => setReceiveMethod(v as PaymentMethod)} disabled={supportMode}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReceiveTarget(null)}>Cancelar</Button>
            <Button onClick={() => markReceived.mutate()} disabled={supportMode || markReceived.isPending}>
              Confirmar recebimento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!detailTarget} onOpenChange={(o) => !o && setDetailTarget(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes do título</DialogTitle>
          </DialogHeader>
          {detailTarget && (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <DetailItem label="Paciente" value={detailTarget.patients?.nome_completo ?? "—"} />
              <DetailItem label="CPF" value={detailTarget.patients?.cpf ?? "—"} />
              <DetailItem label="Documento" value={detailTarget.documento ?? "—"} />
              <DetailItem label="Vencimento" value={fmtDate(detailTarget.data_vencimento ?? "")} />
              <DetailItem
                label="Dias em atraso"
                value={String(computeDaysOverdue(detailTarget.data_vencimento ?? todayIso()))}
              />
              <DetailItem label="Valor" value={brl(detailTarget.valor)} />
              <DetailItem label="Categoria" value={detailTarget.financial_categories?.name ?? "—"} />
              <DetailItem label="Centro de custo" value={detailTarget.financial_cost_centers?.name ?? "—"} />
              <DetailItem label="Origem" value={delinquencyOriginLabel(detailTarget)} />
              <DetailItem label="Profissional" value={detailTarget.professionals?.nome ?? "—"} className="col-span-2" />
              {detailTarget.installment_plan_id && (
                <DetailItem
                  label="Parcela"
                  value={`${detailTarget.installment_number ?? "?"}/${detailTarget.installment_total ?? "?"}`}
                />
              )}
              <DetailItem label="Observações" value={detailTarget.observacoes ?? "—"} className="col-span-2" />
              <DetailItem label="Notas de cobrança" value={detailTarget.collection_notes ?? "—"} className="col-span-2" />
            </dl>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailTarget(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!notesTarget}
        onOpenChange={(o) => {
          if (!o) {
            setNotesTarget(null);
            setCollectionNotes("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nota de cobrança</DialogTitle>
          </DialogHeader>
          {notesTarget && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {notesTarget.patients?.nome_completo} — {brl(notesTarget.valor)}
              </p>
              <div>
                <Label className="text-xs uppercase">Observação de cobrança</Label>
                <Textarea
                  rows={4}
                  value={collectionNotes}
                  onChange={(e) => setCollectionNotes(e.target.value)}
                  placeholder="Ex.: contato telefônico em 15/06, prometeu pagar até sexta…"
                  disabled={supportMode}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setNotesTarget(null); setCollectionNotes(""); }}>Cancelar</Button>
            <Button
              onClick={() => saveCollectionNotes.mutate()}
              disabled={supportMode || saveCollectionNotes.isPending}
            >
              Salvar nota
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </FinancePanelGate>
  );
}

function DetailItem({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={cn(className)}>
      <dt className="text-xs uppercase text-muted-foreground">{label}</dt>
      <dd className="mt-0.5">{value}</dd>
    </div>
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

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  ArrowDownCircle,
  Download,
  Eye,
  Loader2,
  RotateCcw,
  UserCircle2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/layout/EmptyState";
import { KpiCard } from "@/components/layout/KpiCard";
import { KpiGrid } from "@/components/layout/KpiGrid";
import { PageSection } from "@/components/layout/PageSection";
import { StatusBadge } from "@/components/layout/StatusBadge";
import {
  DELINQUENCY_ORIGIN_LABELS,
  PROFESSIONAL_REVENUE_STATUS_FILTER_LABELS,
  assertFinanceClinicId,
  computeProfessionalRevenueSummary,
  defaultProfessionalRevenueFilters,
  downloadProfessionalRevenueCsv,
  filterProfessionalRevenueRows,
  financeQueryKeys,
  formatParticipacaoPercent,
  groupProfessionalRevenue,
  professionalRevenueFiltersKey,
  professionalRevenueOriginLabel,
  PROFESSIONAL_REVENUE_UNASSIGNED_ID,
  PROFESSIONAL_REVENUE_UNASSIGNED_LABEL,
  toProfessionalRevenueCsv,
  toProfessionalRevenueDetailCsv,
  type ProfessionalRevenueFilters,
  type ProfessionalRevenueGroup,
  type ProfessionalRevenueRow,
} from "@/lib/finance";
import { brl, fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";

type FinanceProfessionalRevenuePanelProps = {
  clinicId: string | null;
};

const SELECT_ALL = "all";

export function FinanceProfessionalRevenuePanel({ clinicId }: FinanceProfessionalRevenuePanelProps) {
  const [filters, setFilters] = useState<ProfessionalRevenueFilters>(defaultProfessionalRevenueFilters);
  const [detailGroup, setDetailGroup] = useState<ProfessionalRevenueGroup | null>(null);

  const lookups = useQuery({
    queryKey: financeQueryKeys.professionalRevenueLookups(clinicId),
    enabled: !!clinicId,
    queryFn: async () => {
      assertFinanceClinicId(clinicId);
      const [professionals, categories, costCenters] = await Promise.all([
        supabase.from("professionals").select("id, nome").eq("clinic_id", clinicId).eq("situacao", "ativo").order("nome"),
        supabase.from("financial_categories").select("id, name").eq("clinic_id", clinicId).eq("type", "income").order("sort_order"),
        supabase.from("financial_cost_centers").select("id, name").eq("clinic_id", clinicId).eq("is_active", true).order("sort_order"),
      ]);
      if (professionals.error) throw professionals.error;
      if (categories.error) throw categories.error;
      if (costCenters.error) throw costCenters.error;
      return {
        professionals: professionals.data ?? [],
        categories: categories.data ?? [],
        costCenters: costCenters.data ?? [],
      };
    },
  });

  const revenue = useQuery({
    queryKey: financeQueryKeys.professionalRevenue(clinicId, professionalRevenueFiltersKey(filters)),
    enabled: !!clinicId,
    queryFn: async () => {
      assertFinanceClinicId(clinicId);
      const { data, error } = await supabase
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
        .neq("status", "cancelado")
        .order("updated_at", { ascending: false })
        .limit(5000);
      if (error) throw error;
      return (data ?? []) as ProfessionalRevenueRow[];
    },
  });

  const filteredRows = useMemo(
    () => filterProfessionalRevenueRows(revenue.data ?? [], filters),
    [revenue.data, filters],
  );

  const groups = useMemo(() => groupProfessionalRevenue(filteredRows), [filteredRows]);

  const summary = useMemo(
    () => computeProfessionalRevenueSummary(filteredRows, groups),
    [filteredRows, groups],
  );

  function exportCsv() {
    if (!groups.length) return;
    downloadProfessionalRevenueCsv(
      `receita-profissional-${filters.from}_${filters.to}.csv`,
      toProfessionalRevenueCsv(groups),
    );
  }

  function exportDetailCsv(group: ProfessionalRevenueGroup) {
    downloadProfessionalRevenueCsv(
      `receita-${group.nome.replace(/\s+/g, "-").toLowerCase()}-${filters.from}_${filters.to}.csv`,
      toProfessionalRevenueDetailCsv(group),
    );
  }

  function resetFilters() {
    setFilters(defaultProfessionalRevenueFilters());
  }

  if (revenue.isLoading || lookups.isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Carregando receita por profissional…
      </div>
    );
  }

  if (revenue.isError) {
    return (
      <Card className="p-8 text-center">
        <p className="text-sm text-destructive">Não foi possível carregar a receita por profissional.</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={() => revenue.refetch()}>
          Tentar novamente
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <KpiGrid columns={3}>
        <KpiCard
          icon={ArrowDownCircle}
          label="Receita realizada"
          value={brl(summary.receitaRealizadaTotal)}
          hideDelta
          variant="premium"
          accent="#10b981"
        />
        <KpiCard
          icon={ArrowDownCircle}
          label="Receita prevista"
          value={brl(summary.receitaPrevistaTotal)}
          hideDelta
          variant="premium"
          accent="#3b82f6"
        />
        <KpiCard
          icon={UserCircle2}
          label="Maior receita"
          value={summary.maiorReceitaNome ? brl(summary.maiorReceitaValor) : "—"}
          subtitle={summary.maiorReceitaNome ?? undefined}
          hideDelta
          variant="premium"
        />
      </KpiGrid>

      <KpiGrid columns={3}>
        <KpiCard
          icon={ArrowDownCircle}
          label="Títulos recebidos"
          value={String(summary.qtdRecebidos)}
          hideDelta
          variant="premium"
        />
        <KpiCard
          icon={ArrowDownCircle}
          label="Títulos em aberto"
          value={String(summary.qtdAbertos)}
          hideDelta
          variant="premium"
          tone={summary.qtdAbertos > 0 ? "warning" : "default"}
        />
        <KpiCard
          icon={ArrowDownCircle}
          label="Ticket médio"
          value={brl(summary.ticketMedioGlobal)}
          hideDelta
          variant="premium"
        />
      </KpiGrid>

      <Card className="p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
          <FilterDate
            label="Período de"
            value={filters.from}
            onChange={(v) => setFilters((f) => ({ ...f, from: v }))}
          />
          <FilterDate
            label="Período até"
            value={filters.to}
            onChange={(v) => setFilters((f) => ({ ...f, to: v }))}
          />
          <FilterSelect
            label="Profissional"
            value={filters.professionalId}
            onChange={(v) => setFilters((f) => ({ ...f, professionalId: v }))}
            options={[
              { value: SELECT_ALL, label: "Todos" },
              { value: PROFESSIONAL_REVENUE_UNASSIGNED_ID, label: PROFESSIONAL_REVENUE_UNASSIGNED_LABEL },
              ...(lookups.data?.professionals ?? []).map((p) => ({ value: p.id, label: p.nome })),
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
            onChange={(v) => setFilters((f) => ({ ...f, origin: v as ProfessionalRevenueFilters["origin"] }))}
            options={[
              { value: SELECT_ALL, label: "Todas" },
              ...Object.entries(DELINQUENCY_ORIGIN_LABELS).map(([value, label]) => ({ value, label })),
            ]}
          />
          <FilterSelect
            label="Status"
            value={filters.status}
            onChange={(v) => setFilters((f) => ({ ...f, status: v as ProfessionalRevenueFilters["status"] }))}
            options={Object.entries(PROFESSIONAL_REVENUE_STATUS_FILTER_LABELS).map(([value, label]) => ({ value, label }))}
          />
          <div className="flex items-end gap-2">
            <Button variant="outline" size="sm" className="h-9" onClick={resetFilters}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Limpar
            </Button>
            <Button variant="outline" size="sm" className="h-9" onClick={exportCsv} disabled={!groups.length}>
              <Download className="mr-1.5 h-3.5 w-3.5" />
              CSV
            </Button>
          </div>
        </div>
      </Card>

      <PageSection
        title="Receita por profissional"
        description="Realizado (recebidos) e previsto (em aberto) no período selecionado."
      >
        {!groups.length ? (
          <EmptyState
            icon={UserCircle2}
            title="Sem receita no período"
            description="Não há recebíveis para os filtros selecionados."
          />
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/60">
                  <tr className="text-left">
                    <th className="px-4 py-3">Profissional</th>
                    <th className="px-4 py-3 text-right">Realizada</th>
                    <th className="px-4 py-3 text-right">Prevista</th>
                    <th className="px-4 py-3 text-right">Total</th>
                    <th className="px-4 py-3 text-right hidden md:table-cell">Recebidos</th>
                    <th className="px-4 py-3 text-right hidden md:table-cell">Em aberto</th>
                    <th className="px-4 py-3 text-right hidden lg:table-cell">Ticket médio</th>
                    <th className="px-4 py-3 text-right hidden sm:table-cell">Participação</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {groups.map((group) => (
                    <tr
                      key={group.professionalId}
                      className={cn(
                        "hover:bg-muted/30",
                        group.professionalId === PROFESSIONAL_REVENUE_UNASSIGNED_ID && "bg-muted/20",
                      )}
                    >
                      <td className="px-4 py-2 font-medium">
                        {group.nome}
                        {group.professionalId === PROFESSIONAL_REVENUE_UNASSIGNED_ID && (
                          <StatusBadge variant="warning" className="ml-2">
                            Sem vínculo
                          </StatusBadge>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums text-emerald-700">{brl(group.receitaRealizada)}</td>
                      <td className="px-4 py-2 text-right tabular-nums text-sky-700">{brl(group.receitaPrevista)}</td>
                      <td className="px-4 py-2 text-right tabular-nums font-semibold">{brl(group.totalGeral)}</td>
                      <td className="px-4 py-2 text-right tabular-nums hidden md:table-cell">{group.qtdRecebidos}</td>
                      <td className="px-4 py-2 text-right tabular-nums hidden md:table-cell">{group.qtdAbertos}</td>
                      <td className="px-4 py-2 text-right tabular-nums hidden lg:table-cell">{brl(group.ticketMedio)}</td>
                      <td className="px-4 py-2 text-right tabular-nums hidden sm:table-cell">
                        {formatParticipacaoPercent(group.participacaoPercentual)}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <Button size="sm" variant="outline" onClick={() => setDetailGroup(group)}>
                          <Eye className="h-3 w-3 mr-1" />
                          Detalhes
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </PageSection>

      <Dialog open={!!detailGroup} onOpenChange={(o) => !o && setDetailGroup(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detailGroup?.nome ?? "Detalhes"}</DialogTitle>
          </DialogHeader>
          {detailGroup && (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-sm">
                <DetailStat label="Realizada" value={brl(detailGroup.receitaRealizada)} />
                <DetailStat label="Prevista" value={brl(detailGroup.receitaPrevista)} />
                <DetailStat label="Total" value={brl(detailGroup.totalGeral)} />
                <DetailStat label="Participação" value={formatParticipacaoPercent(detailGroup.participacaoPercentual)} />
              </div>

              <Tabs defaultValue="recebidos">
                <TabsList>
                  <TabsTrigger value="recebidos">
                    Recebidos ({detailGroup.qtdRecebidos})
                  </TabsTrigger>
                  <TabsTrigger value="abertos">
                    Em aberto ({detailGroup.qtdAbertos})
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="recebidos" className="mt-4">
                  <EntryTable
                    rows={detailGroup.entries.filter((r) => r.status === "pago")}
                    emptyLabel="Nenhum título recebido no período."
                  />
                </TabsContent>
                <TabsContent value="abertos" className="mt-4">
                  <EntryTable
                    rows={detailGroup.entries.filter((r) => r.status === "pendente")}
                    emptyLabel="Nenhum título em aberto no período."
                  />
                </TabsContent>
              </Tabs>
            </>
          )}
          <DialogFooter>
            {detailGroup && (
              <Button variant="outline" onClick={() => exportDetailCsv(detailGroup)}>
                <Download className="h-3 w-3 mr-1" />
                Exportar CSV
              </Button>
            )}
            <Button variant="outline" onClick={() => setDetailGroup(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DetailStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function EntryTable({ rows, emptyLabel }: { rows: ProfessionalRevenueRow[]; emptyLabel: string }) {
  if (!rows.length) {
    return <p className="py-6 text-center text-sm text-muted-foreground">{emptyLabel}</p>;
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/60">
            <tr className="text-left">
              <th className="px-4 py-3">Paciente</th>
              <th className="px-4 py-3 hidden md:table-cell">Documento</th>
              <th className="px-4 py-3">Vencimento</th>
              <th className="px-4 py-3">Recebimento</th>
              <th className="px-4 py-3 text-right">Valor</th>
              <th className="px-4 py-3 hidden sm:table-cell">Origem</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-2">{row.patients?.nome_completo ?? "—"}</td>
                <td className="px-4 py-2 hidden md:table-cell text-muted-foreground tabular-nums">
                  {row.patients?.cpf ?? row.documento ?? "—"}
                </td>
                <td className="px-4 py-2 tabular-nums">{fmtDate(row.data_vencimento ?? row.data)}</td>
                <td className="px-4 py-2 tabular-nums">
                  {row.status === "pago" ? fmtDate(row.data_recebimento ?? row.data) : "—"}
                </td>
                <td className="px-4 py-2 text-right tabular-nums font-medium">{brl(row.valor)}</td>
                <td className="px-4 py-2 hidden sm:table-cell">
                  <StatusBadge variant="neutral">{professionalRevenueOriginLabel(row)}</StatusBadge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
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

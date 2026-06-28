/**
 * Sprint G1.7 — Dashboard Financeiro (consolidação financial_entries).
 */

import {
  computeCashFlowSummary,
  forecastDate,
  realizedDate,
  type CashFlowEntryRow,
} from "./cash-flow-helpers";
import { isReceivableOverdue } from "./receivable-helpers";
import { payableSupplierLabel, type PayableRow } from "./payable-helpers";
import type { ReceivableRow } from "./receivable-helpers";

export type DashboardFilters = {
  from: string;
  to: string;
  categoryId: string;
  costCenterId: string;
};

export type DashboardKpis = {
  receitaRealizada: number;
  despesaRealizada: number;
  saldoRealizado: number;
  receitasEmAberto: number;
  despesasEmAberto: number;
  vencidosReceber: number;
  vencidosPagar: number;
  saldoPrevisto: number;
};

export type DashboardRankingItem = {
  id: string;
  name: string;
  total: number;
};

export type DashboardUpcomingItem = {
  id: string;
  date: string;
  descricao: string;
  valor: number;
  tipo: "receita" | "despesa";
  overdue: boolean;
};

export type DashboardMonthSummary = {
  monthLabel: string;
  receitaRealizada: number;
  despesaRealizada: number;
  saldoRealizado: number;
};

const SELECT_ALL = "all";
const TODAY = () => new Date().toISOString().slice(0, 10);

export function defaultDashboardFilters(): DashboardFilters {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  return {
    from: firstDay.toISOString().slice(0, 10),
    to: today.toISOString().slice(0, 10),
    categoryId: SELECT_ALL,
    costCenterId: SELECT_ALL,
  };
}

export function dashboardFiltersKey(filters: DashboardFilters): string {
  return JSON.stringify(filters);
}

function matchesDashboardScope(row: CashFlowEntryRow, filters: DashboardFilters): boolean {
  if (row.status === "cancelado") return false;
  if (row.entry_type !== "receivable" && row.entry_type !== "payable") return false;
  if (filters.categoryId !== SELECT_ALL && row.category_id !== filters.categoryId) return false;
  if (filters.costCenterId !== SELECT_ALL && row.cost_center_id !== filters.costCenterId) return false;
  return true;
}

function inPeriod(iso: string, from: string, to: string): boolean {
  return iso >= from && iso <= to;
}

function entryLabel(row: CashFlowEntryRow): string {
  if (row.entry_type === "receivable") {
    const r = row as ReceivableRow;
    return row.documento?.trim() || r.patients?.nome_completo || row.observacoes?.trim() || "Receita";
  }
  return payableSupplierLabel(row as PayableRow);
}

export function computeDashboardKpis(
  rows: CashFlowEntryRow[],
  filters: DashboardFilters,
): DashboardKpis {
  const scoped = rows.filter((r) => matchesDashboardScope(r, filters));

  const cashFlow = computeCashFlowSummary(scoped, {
    from: filters.from,
    to: filters.to,
    categoryId: filters.categoryId,
    costCenterId: filters.costCenterId,
    typeFilter: "all",
  });

  let receitasEmAberto = 0;
  let despesasEmAberto = 0;
  let vencidosReceber = 0;
  let vencidosPagar = 0;

  for (const row of scoped) {
    if (row.status !== "pendente") continue;
    const valor = Number(row.valor ?? 0);
    if (row.entry_type === "receivable") {
      receitasEmAberto += valor;
      if (isReceivableOverdue(row)) vencidosReceber += valor;
    } else if (row.entry_type === "payable") {
      despesasEmAberto += valor;
      if (isReceivableOverdue(row)) vencidosPagar += valor;
    }
  }

  return {
    receitaRealizada: cashFlow.entradasRealizadas,
    despesaRealizada: cashFlow.saidasRealizadas,
    saldoRealizado: cashFlow.saldoRealizado,
    receitasEmAberto,
    despesasEmAberto,
    vencidosReceber,
    vencidosPagar,
    saldoPrevisto: receitasEmAberto - despesasEmAberto,
  };
}

export function computeCurrentMonthSummary(rows: CashFlowEntryRow[]): DashboardMonthSummary {
  const today = new Date();
  const from = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  const to = TODAY();
  const monthLabel = today.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  const kpis = computeDashboardKpis(rows, {
    from,
    to,
    categoryId: SELECT_ALL,
    costCenterId: SELECT_ALL,
  });

  return {
    monthLabel,
    receitaRealizada: kpis.receitaRealizada,
    despesaRealizada: kpis.despesaRealizada,
    saldoRealizado: kpis.saldoRealizado,
  };
}

function rankByField(
  rows: CashFlowEntryRow[],
  filters: DashboardFilters,
  field: "category" | "cost_center",
  tipo: "receita" | "despesa",
  limit = 5,
): DashboardRankingItem[] {
  const entryType = tipo === "receita" ? "receivable" : "payable";
  const map = new Map<string, DashboardRankingItem>();

  for (const row of rows) {
    if (!matchesDashboardScope(row, filters)) continue;
    if (row.entry_type !== entryType || row.status !== "pago") continue;
    if (!inPeriod(realizedDate(row), filters.from, filters.to)) continue;

    const ref =
      field === "category"
        ? row.financial_categories
        : row.financial_cost_centers;
    const id = field === "category" ? row.category_id : row.cost_center_id;
    const name =
      field === "category"
        ? row.financial_categories?.name ?? "Sem categoria"
        : row.financial_cost_centers?.name ?? "Sem centro de custo";

    const key = id ?? `__none_${name}`;
    const existing = map.get(key) ?? { id: key, name, total: 0 };
    existing.total += Number(row.valor ?? 0);
    map.set(key, existing);
  }

  return [...map.values()].sort((a, b) => b.total - a.total).slice(0, limit);
}

export function topIncomeCategories(rows: CashFlowEntryRow[], filters: DashboardFilters) {
  return rankByField(rows, filters, "category", "receita");
}

export function topExpenseCategories(rows: CashFlowEntryRow[], filters: DashboardFilters) {
  return rankByField(rows, filters, "category", "despesa");
}

export function topCostCenters(rows: CashFlowEntryRow[], filters: DashboardFilters) {
  const receita = rankByField(rows, filters, "cost_center", "receita", 10);
  const despesa = rankByField(rows, filters, "cost_center", "despesa", 10);
  const map = new Map<string, DashboardRankingItem>();

  for (const item of [...receita, ...despesa]) {
    const existing = map.get(item.id) ?? { ...item, total: 0 };
    existing.total += item.total;
    map.set(item.id, existing);
  }

  return [...map.values()].sort((a, b) => b.total - a.total).slice(0, 5);
}

export function upcomingReceivables(rows: CashFlowEntryRow[], filters: DashboardFilters, limit = 5): DashboardUpcomingItem[] {
  return rows
    .filter((r) => matchesDashboardScope(r, filters) && r.entry_type === "receivable" && r.status === "pendente")
    .map((r) => ({
      id: r.id,
      date: forecastDate(r),
      descricao: entryLabel(r),
      valor: Number(r.valor ?? 0),
      tipo: "receita" as const,
      overdue: isReceivableOverdue(r),
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, limit);
}

export function upcomingPayables(rows: CashFlowEntryRow[], filters: DashboardFilters, limit = 5): DashboardUpcomingItem[] {
  return rows
    .filter((r) => matchesDashboardScope(r, filters) && r.entry_type === "payable" && r.status === "pendente")
    .map((r) => ({
      id: r.id,
      date: forecastDate(r),
      descricao: entryLabel(r),
      valor: Number(r.valor ?? 0),
      tipo: "despesa" as const,
      overdue: isReceivableOverdue(r),
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, limit);
}

export function rowMatchesDashboardFetch(row: CashFlowEntryRow, from: string, to: string): boolean {
  if (row.status === "cancelado") return false;
  if (row.entry_type !== "receivable" && row.entry_type !== "payable") return false;
  if (row.status === "pago" && inPeriod(realizedDate(row), from, to)) return true;
  if (row.status === "pendente") return true;
  return false;
}

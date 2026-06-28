/**
 * Sprint G1.6 — Fluxo de Caixa (consolidação financial_entries).
 */

import type { FinancialEntryRow, PaymentStatus } from "./types";
import { PAYABLE_STATUS_LABELS, RECEIVABLE_STATUS_LABELS } from "./constants";
import { payableSupplierLabel, type PayableRow } from "./payable-helpers";
import type { ReceivableRow } from "./receivable-helpers";

export type CashFlowView = "realizado" | "previsto" | "comparativo";
export type CashFlowTypeFilter = "all" | "receitas" | "despesas";
export type CashFlowGrouping = "day" | "week" | "month";

export type CashFlowFilters = {
  from: string;
  to: string;
  view: CashFlowView;
  typeFilter: CashFlowTypeFilter;
  categoryId: string;
  costCenterId: string;
  grouping: CashFlowGrouping;
};

export type CashFlowEntryRow = FinancialEntryRow & {
  patients?: { nome_completo: string } | null;
  professionals?: { nome: string } | null;
  financial_categories?: { id: string; name: string; type: string } | null;
  financial_cost_centers?: { id: string; name: string; code: string | null } | null;
};

export type CashFlowLine = {
  id: string;
  entryId: string;
  date: string;
  tipo: "receita" | "despesa";
  categoria: string;
  centroCusto: string;
  descricao: string;
  valor: number;
  status: PaymentStatus;
  visao: "realizado" | "previsto";
  entry_type: string;
};

export type CashFlowSummary = {
  entradasRealizadas: number;
  saidasRealizadas: number;
  saldoRealizado: number;
  saldoPrevisto: number;
};

export type CashFlowGroupRow = {
  key: string;
  label: string;
  entradas: number;
  saidas: number;
  saldo: number;
};

const SELECT_ALL = "all";

export function defaultCashFlowFilters(): CashFlowFilters {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  return {
    from: firstDay.toISOString().slice(0, 10),
    to: today.toISOString().slice(0, 10),
    view: "comparativo",
    typeFilter: "all",
    categoryId: SELECT_ALL,
    costCenterId: SELECT_ALL,
    grouping: "day",
  };
}

export function cashFlowFiltersKey(filters: CashFlowFilters): string {
  return JSON.stringify(filters);
}

function inPeriod(isoDate: string, from: string, to: string): boolean {
  return isoDate >= from && isoDate <= to;
}

export function realizedDate(row: CashFlowEntryRow): string {
  return row.data_recebimento ?? row.data;
}

export function forecastDate(row: CashFlowEntryRow): string {
  return row.data_vencimento ?? row.data;
}

function entryDescription(row: CashFlowEntryRow): string {
  if (row.entry_type === "receivable") {
    const r = row as ReceivableRow;
    return row.documento?.trim() || r.patients?.nome_completo || row.observacoes?.trim() || "—";
  }
  return payableSupplierLabel(row as PayableRow);
}

export function toCashFlowLine(row: CashFlowEntryRow, visao: "realizado" | "previsto"): CashFlowLine | null {
  if (row.status === "cancelado") return null;

  if (visao === "realizado") {
    if (row.status !== "pago") return null;
  } else if (row.status !== "pendente") {
    return null;
  }

  const tipo = row.entry_type === "payable" ? "despesa" : "receita";
  const date = visao === "realizado" ? realizedDate(row) : forecastDate(row);

  return {
    id: `${row.id}-${visao}`,
    entryId: row.id,
    date,
    tipo,
    categoria: row.financial_categories?.name ?? "—",
    centroCusto: row.financial_cost_centers?.name ?? "—",
    descricao: entryDescription(row),
    valor: Number(row.valor ?? 0),
    status: row.status,
    visao,
    entry_type: row.entry_type,
  };
}

export function applyCashFlowFilters(
  rows: CashFlowEntryRow[],
  filters: CashFlowFilters,
): CashFlowLine[] {
  const lines: CashFlowLine[] = [];

  const views: Array<"realizado" | "previsto"> =
    filters.view === "comparativo" ? ["realizado", "previsto"] : [filters.view];

  for (const row of rows) {
    if (row.status === "cancelado") continue;
    if (filters.categoryId !== SELECT_ALL && row.category_id !== filters.categoryId) continue;
    if (filters.costCenterId !== SELECT_ALL && row.cost_center_id !== filters.costCenterId) continue;

    for (const visao of views) {
      const line = toCashFlowLine(row, visao);
      if (!line) continue;
      if (!inPeriod(line.date, filters.from, filters.to)) continue;
      if (filters.typeFilter === "receitas" && line.tipo !== "receita") continue;
      if (filters.typeFilter === "despesas" && line.tipo !== "despesa") continue;
      lines.push(line);
    }
  }

  return lines.sort((a, b) => b.date.localeCompare(a.date) || a.tipo.localeCompare(b.tipo));
}

export function computeCashFlowSummary(
  rows: CashFlowEntryRow[],
  filters: Pick<CashFlowFilters, "from" | "to" | "categoryId" | "costCenterId" | "typeFilter">,
): CashFlowSummary {
  const base = { ...defaultCashFlowFilters(), ...filters };

  const realizadas = applyCashFlowFilters(rows, { ...base, view: "realizado" });
  const previstas = applyCashFlowFilters(rows, { ...base, view: "previsto" });

  let entradasRealizadas = 0;
  let saidasRealizadas = 0;
  for (const l of realizadas) {
    if (l.tipo === "receita") entradasRealizadas += l.valor;
    else saidasRealizadas += l.valor;
  }

  let entradasPrevistas = 0;
  let saidasPrevistas = 0;
  for (const l of previstas) {
    if (l.tipo === "receita") entradasPrevistas += l.valor;
    else saidasPrevistas += l.valor;
  }

  return {
    entradasRealizadas,
    saidasRealizadas,
    saldoRealizado: entradasRealizadas - saidasRealizadas,
    saldoPrevisto: entradasPrevistas - saidasPrevistas,
  };
}

function weekStartKey(isoDate: string): string {
  const d = new Date(isoDate + "T12:00:00");
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function monthKey(isoDate: string): string {
  return isoDate.slice(0, 7);
}

function fmtDateBr(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function groupLabel(key: string, grouping: CashFlowGrouping): string {
  if (grouping === "day") return fmtDateBr(key);
  if (grouping === "week") return `Semana de ${fmtDateBr(key)}`;
  const [y, m] = key.split("-");
  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return `${months[Number(m) - 1]}/${y}`;
}

export function groupCashFlowLines(lines: CashFlowLine[], grouping: CashFlowGrouping): CashFlowGroupRow[] {
  const map = new Map<string, CashFlowGroupRow>();

  for (const line of lines) {
    const key =
      grouping === "day" ? line.date : grouping === "week" ? weekStartKey(line.date) : monthKey(line.date);

    const existing = map.get(key) ?? {
      key,
      label: groupLabel(key, grouping),
      entradas: 0,
      saidas: 0,
      saldo: 0,
    };

    if (line.tipo === "receita") existing.entradas += line.valor;
    else existing.saidas += line.valor;
    existing.saldo = existing.entradas - existing.saidas;
    map.set(key, existing);
  }

  return [...map.values()].sort((a, b) => b.key.localeCompare(a.key));
}

export function cashFlowStatusLabel(line: CashFlowLine): string {
  if (line.entry_type === "payable") return PAYABLE_STATUS_LABELS[line.status];
  return RECEIVABLE_STATUS_LABELS[line.status];
}

export function toCashFlowCsv(lines: CashFlowLine[]): string {
  const header = ["Data", "Visão", "Tipo", "Categoria", "Centro de Custo", "Descrição", "Valor", "Status"]
    .map((h) => `"${h}"`)
    .join(";");
  const body = lines
    .map((l) =>
      [
        l.date,
        l.visao === "realizado" ? "Realizado" : "Previsto",
        l.tipo === "receita" ? "Receita" : "Despesa",
        l.categoria,
        l.centroCusto,
        l.descricao,
        String(l.valor),
        cashFlowStatusLabel(l),
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(";"),
    )
    .join("\n");
  return `${header}\n${body}`;
}

export function downloadCashFlowCsv(filename: string, csv: string): void {
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function isCashFlowSourceRow(row: CashFlowEntryRow): boolean {
  return (
    row.status !== "cancelado" &&
    (row.entry_type === "receivable" || row.entry_type === "payable")
  );
}

export function rowMatchesCashFlowPeriod(row: CashFlowEntryRow, from: string, to: string): boolean {
  if (row.status === "pago") {
    return inPeriod(realizedDate(row), from, to);
  }
  if (row.status === "pendente") {
    return inPeriod(forecastDate(row), from, to);
  }
  return false;
}

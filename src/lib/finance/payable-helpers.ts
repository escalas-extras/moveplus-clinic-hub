/**
 * Sprint G1.5 — helpers de Contas a Pagar (financial_entries payable).
 */

import type { FinancialEntryRow, PaymentStatus } from "./types";
import {
  computeReceivableSummary,
  isReceivableOverdue,
  receivableStatusVariant,
  type ReceivableSummary,
} from "./receivable-helpers";

export type PayableFilters = {
  from: string;
  to: string;
  status: PaymentStatus | "all";
  categoryId: string;
  costCenterId: string;
  professionalId: string;
  supplier: string;
  search: string;
};

export type PayableSummary = {
  emAberto: number;
  pagas: number;
  totalPeriodo: number;
  vencidas: number;
};

export type PayableRow = FinancialEntryRow & {
  professionals?: { nome: string } | null;
  financial_categories?: { id: string; name: string; type: string } | null;
  financial_cost_centers?: { id: string; name: string; code: string | null } | null;
};

export const isPayableOverdue = isReceivableOverdue;
export const payableStatusVariant = receivableStatusVariant;

export function computePayableSummary(rows: PayableRow[]): PayableSummary {
  const base: ReceivableSummary = computeReceivableSummary(rows as Parameters<typeof computeReceivableSummary>[0]);
  return {
    emAberto: base.emAberto,
    pagas: base.recebidas,
    totalPeriodo: base.totalPeriodo,
    vencidas: base.vencidas,
  };
}

export function matchesPayableSearch(row: PayableRow, search: string): boolean {
  const q = search.trim().toLowerCase();
  if (!q) return true;
  const prof = row.professionals?.nome?.toLowerCase() ?? "";
  const obs = row.observacoes?.toLowerCase() ?? "";
  const doc = row.documento?.toLowerCase() ?? "";
  return prof.includes(q) || obs.includes(q) || doc.includes(q);
}

export function matchesPayableSupplier(row: PayableRow, supplier: string): boolean {
  const q = supplier.trim().toLowerCase();
  if (!q) return true;
  const obs = row.observacoes?.toLowerCase() ?? "";
  const doc = row.documento?.toLowerCase() ?? "";
  return obs.includes(q) || doc.includes(q);
}

export function filterPayablesClient(rows: PayableRow[], filters: Pick<PayableFilters, "search" | "supplier">): PayableRow[] {
  return rows.filter(
    (r) => matchesPayableSearch(r, filters.search) && matchesPayableSupplier(r, filters.supplier),
  );
}

export function parsePayableForm(input: {
  professional_id?: string | null;
  valor: number | string;
  data: string;
  data_vencimento: string;
  category_id?: string | null;
  cost_center_id?: string | null;
  documento?: string | null;
  observacoes?: string | null;
  forma_pagamento?: string | null;
}) {
  const valor = Number(input.valor);
  if (!Number.isFinite(valor) || valor <= 0) throw new Error("Informe um valor maior que zero.");
  if (!input.data?.trim()) throw new Error("Data de emissão é obrigatória.");
  if (!input.data_vencimento?.trim()) throw new Error("Data de vencimento é obrigatória.");

  const fornecedor = input.documento?.trim();
  if (!fornecedor && !input.observacoes?.trim()) {
    throw new Error("Informe o fornecedor (documento) ou observações.");
  }

  return {
    professional_id: input.professional_id?.trim() || null,
    valor,
    data: input.data.trim(),
    data_vencimento: input.data_vencimento.trim(),
    category_id: input.category_id?.trim() || null,
    cost_center_id: input.cost_center_id?.trim() || null,
    documento: fornecedor || null,
    observacoes: input.observacoes?.trim() || null,
    forma_pagamento: input.forma_pagamento?.trim() || null,
  };
}

export function defaultPayableFilters(): PayableFilters {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  return {
    from: firstDay.toISOString().slice(0, 10),
    to: today.toISOString().slice(0, 10),
    status: "all",
    categoryId: "all",
    costCenterId: "all",
    professionalId: "all",
    supplier: "",
    search: "",
  };
}

export function payableSupplierLabel(row: PayableRow): string {
  return row.documento?.trim() || row.observacoes?.trim()?.split("\n")[0] || "—";
}

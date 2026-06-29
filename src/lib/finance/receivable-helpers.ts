/**
 * Sprint G1.4 — helpers de Contas a Receber (financial_entries receivable).
 */

import type { FinancialEntryRow, PaymentMethod, PaymentStatus } from "./types";
import { RECEIVABLE_DISPLAY_STATUS } from "./constants";

export type ReceivableFilters = {
  from: string;
  to: string;
  status: PaymentStatus | "all" | "vencido";
  paymentMethod: PaymentMethod | "all";
  categoryId: string;
  costCenterId: string;
  patientId: string;
  professionalId: string;
  search: string;
};

export type ReceivableSummary = {
  emAberto: number;
  recebidas: number;
  totalPeriodo: number;
  vencidas: number;
  porForma: Partial<Record<PaymentMethod, { recebido: number; aberto: number }>>;
};

export type ReceivableRow = FinancialEntryRow & {
  patients?: { nome_completo: string; cpf: string | null } | null;
  professionals?: { nome: string } | null;
  financial_categories?: { id: string; name: string; type: string } | null;
  financial_cost_centers?: { id: string; name: string; code: string | null } | null;
};

const TODAY_ISO = () => new Date().toISOString().slice(0, 10);

export function isReceivableOverdue(row: Pick<FinancialEntryRow, "status" | "data_vencimento">): boolean {
  if (row.status !== "pendente") return false;
  const due = row.data_vencimento ?? row.data;
  return !!due && due < TODAY_ISO();
}

export function computeReceivableSummary(rows: ReceivableRow[]): ReceivableSummary {
  let emAberto = 0;
  let recebidas = 0;
  let totalPeriodo = 0;
  let vencidas = 0;
  const porForma: ReceivableSummary["porForma"] = {};

  for (const row of rows) {
    const valor = Number(row.valor ?? 0);
    if (row.status === "cancelado") continue;
    totalPeriodo += valor;
    const method = row.forma_pagamento;
    if (method) {
      if (!porForma[method]) porForma[method] = { recebido: 0, aberto: 0 };
    }
    if (row.status === "pendente") {
      emAberto += valor;
      if (isReceivableOverdue(row)) vencidas += valor;
      if (method && porForma[method]) porForma[method].aberto += valor;
    } else if (row.status === "pago") {
      recebidas += valor;
      if (method && porForma[method]) porForma[method].recebido += valor;
    }
  }

  return { emAberto, recebidas, totalPeriodo, vencidas, porForma };
}

export type ReceivableDisplayStatus = keyof typeof RECEIVABLE_DISPLAY_STATUS;

export function getReceivableDisplayStatus(
  row: Pick<FinancialEntryRow, "status" | "data_vencimento" | "data">,
): ReceivableDisplayStatus {
  if (row.status === "cancelado") return "cancelado";
  if (row.status === "pago") return "recebido";
  if (isReceivableOverdue(row)) return "vencido";
  return "aberto";
}

export function receivableDisplayStatusVariant(
  key: ReceivableDisplayStatus,
): "success" | "warning" | "danger" | "neutral" {
  if (key === "recebido") return "success";
  if (key === "vencido") return "danger";
  if (key === "aberto") return "warning";
  if (key === "cancelado") return "danger";
  return "neutral";
}

export function matchesReceivableSearch(row: ReceivableRow, search: string): boolean {
  const q = search.trim().toLowerCase();
  if (!q) return true;
  const patient = row.patients?.nome_completo?.toLowerCase() ?? "";
  const obs = row.observacoes?.toLowerCase() ?? "";
  const doc = row.documento?.toLowerCase() ?? "";
  return patient.includes(q) || obs.includes(q) || doc.includes(q);
}

export function filterReceivablesClient(rows: ReceivableRow[], search: string): ReceivableRow[] {
  if (!search.trim()) return rows;
  return rows.filter((r) => matchesReceivableSearch(r, search));
}

export function parseReceivableForm(input: {
  patient_id: string;
  professional_id: string;
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
  if (!input.patient_id?.trim()) throw new Error("Paciente é obrigatório.");
  if (!input.professional_id?.trim()) throw new Error("Profissional é obrigatório.");
  if (!input.data?.trim()) throw new Error("Data de emissão é obrigatória.");
  if (!input.data_vencimento?.trim()) throw new Error("Data de vencimento é obrigatória.");
  if (!input.forma_pagamento?.trim()) throw new Error("Forma de recebimento é obrigatória.");

  return {
    patient_id: input.patient_id.trim(),
    professional_id: input.professional_id.trim(),
    valor,
    data: input.data.trim(),
    data_vencimento: input.data_vencimento.trim(),
    category_id: input.category_id?.trim() || null,
    cost_center_id: input.cost_center_id?.trim() || null,
    documento: input.documento?.trim() || null,
    observacoes: input.observacoes?.trim() || null,
    forma_pagamento: input.forma_pagamento?.trim() || null,
  };
}

export function receivableStatusVariant(status: PaymentStatus): "success" | "warning" | "danger" | "neutral" {
  if (status === "pago") return "success";
  if (status === "pendente") return "warning";
  if (status === "cancelado") return "danger";
  return "neutral";
}

export function defaultReceivableFilters(): ReceivableFilters {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  return {
    from: firstDay.toISOString().slice(0, 10),
    to: today.toISOString().slice(0, 10),
    status: "all",
    paymentMethod: "all",
    categoryId: "all",
    costCenterId: "all",
    patientId: "all",
    professionalId: "all",
    search: "",
  };
}

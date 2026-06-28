/**
 * Sprint G2.5 — Inadimplência (recebíveis vencidos em financial_entries).
 */

import { DELINQUENCY_ORIGIN_LABELS } from "./constants";
import { downloadCashFlowCsv } from "./cash-flow-helpers";
import type { FinancialEntryRow } from "./types";
import type { ReceivableRow } from "./receivable-helpers";

export type DelinquencyOrigin = keyof typeof DELINQUENCY_ORIGIN_LABELS;

export type DelinquencyAgeBucket = "all" | "1-7" | "8-30" | "31+";

export type DelinquencyFilters = {
  from: string;
  to: string;
  patientId: string;
  categoryId: string;
  costCenterId: string;
  origin: DelinquencyOrigin | "all";
  ageBucket: DelinquencyAgeBucket;
};

export type DelinquencyRow = ReceivableRow;

export type DelinquencySummary = {
  totalVencido: number;
  quantidade: number;
  vencidos1a7: number;
  vencidos8a30: number;
  vencidosAcima30: number;
  maiorDevedorNome: string | null;
  maiorDevedorValor: number;
};

const SELECT_ALL = "all";

export const todayIso = () => new Date().toISOString().slice(0, 10);

export function isDelinquentEntry(
  row: Pick<FinancialEntryRow, "entry_type" | "status" | "data_vencimento">,
): boolean {
  if (row.entry_type !== "receivable") return false;
  if (row.status !== "pendente") return false;
  const due = row.data_vencimento;
  return !!due && due < todayIso();
}

export function computeDaysOverdue(dueIso: string, refDate = todayIso()): number {
  const due = new Date(`${dueIso}T12:00:00`);
  const ref = new Date(`${refDate}T12:00:00`);
  return Math.max(0, Math.floor((ref.getTime() - due.getTime()) / 86400000));
}

export function inferReceivableOrigin(row: Pick<
  FinancialEntryRow,
  "health_insurance_provider_id" | "patient_health_insurance_id" | "installment_plan_id" | "documento" | "observacoes"
>): DelinquencyOrigin {
  if (row.health_insurance_provider_id || row.patient_health_insurance_id) return "convenio";
  if (row.installment_plan_id) return "parcelamento";
  if (row.documento?.startsWith("PACOTE-") || row.observacoes?.includes("Contratação pacote")) return "pacote";
  return "manual";
}

export function delinquencyOriginLabel(row: DelinquencyRow): string {
  return DELINQUENCY_ORIGIN_LABELS[inferReceivableOrigin(row)];
}

function matchesAgeBucket(days: number, bucket: DelinquencyAgeBucket): boolean {
  if (bucket === SELECT_ALL) return true;
  if (bucket === "1-7") return days >= 1 && days <= 7;
  if (bucket === "8-30") return days >= 8 && days <= 30;
  return days >= 31;
}

export function filterDelinquencyRows(rows: DelinquencyRow[], filters: DelinquencyFilters): DelinquencyRow[] {
  return rows.filter((row) => {
    const due = row.data_vencimento;
    if (!due || !isDelinquentEntry(row)) return false;

    const origin = inferReceivableOrigin(row);
    if (filters.origin !== SELECT_ALL && origin !== filters.origin) return false;

    const days = computeDaysOverdue(due);
    if (!matchesAgeBucket(days, filters.ageBucket)) return false;

    return true;
  });
}

export function computeDelinquencySummary(rows: DelinquencyRow[]): DelinquencySummary {
  let totalVencido = 0;
  let vencidos1a7 = 0;
  let vencidos8a30 = 0;
  let vencidosAcima30 = 0;
  const byPatient = new Map<string, { name: string; total: number }>();

  for (const row of rows) {
    const due = row.data_vencimento;
    if (!due) continue;
    const valor = Number(row.valor ?? 0);
    const days = computeDaysOverdue(due);

    totalVencido += valor;
    if (days >= 1 && days <= 7) vencidos1a7 += valor;
    else if (days >= 8 && days <= 30) vencidos8a30 += valor;
    else if (days >= 31) vencidosAcima30 += valor;

    const patientId = row.patient_id ?? "unknown";
    const name = row.patients?.nome_completo ?? "Sem paciente";
    const prev = byPatient.get(patientId);
    if (prev) prev.total += valor;
    else byPatient.set(patientId, { name, total: valor });
  }

  let maiorDevedorNome: string | null = null;
  let maiorDevedorValor = 0;
  for (const { name, total } of byPatient.values()) {
    if (total > maiorDevedorValor) {
      maiorDevedorValor = total;
      maiorDevedorNome = name;
    }
  }

  return {
    totalVencido,
    quantidade: rows.length,
    vencidos1a7,
    vencidos8a30,
    vencidosAcima30,
    maiorDevedorNome,
    maiorDevedorValor,
  };
}

export function defaultDelinquencyFilters(): DelinquencyFilters {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const from = new Date(today);
  from.setFullYear(from.getFullYear() - 1);

  return {
    from: from.toISOString().slice(0, 10),
    to: yesterday.toISOString().slice(0, 10),
    patientId: SELECT_ALL,
    categoryId: SELECT_ALL,
    costCenterId: SELECT_ALL,
    origin: SELECT_ALL,
    ageBucket: SELECT_ALL,
  };
}

export function delinquencyFiltersKey(filters: DelinquencyFilters): string {
  return JSON.stringify(filters);
}

export function toDelinquencyCsv(rows: DelinquencyRow[]): string {
  const header = [
    "Paciente",
    "Documento",
    "Vencimento",
    "Dias em atraso",
    "Valor",
    "Categoria",
    "Centro de Custo",
    "Origem",
    "Observações",
    "Notas de cobrança",
  ]
    .map((h) => `"${h}"`)
    .join(";");

  const body = rows
    .map((row) => {
      const due = row.data_vencimento ?? "";
      const days = due ? computeDaysOverdue(due) : 0;
      return [
        row.patients?.nome_completo ?? "",
        row.patients?.cpf ?? row.documento ?? "",
        due,
        String(days),
        String(row.valor),
        row.financial_categories?.name ?? "",
        row.financial_cost_centers?.name ?? "",
        delinquencyOriginLabel(row),
        row.observacoes ?? "",
        row.collection_notes ?? "",
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(";");
    })
    .join("\n");

  return `${header}\n${body}`;
}

export function downloadDelinquencyCsv(filename: string, csv: string): void {
  downloadCashFlowCsv(filename, csv);
}

export function delinquencyAgeTone(days: number): "warning" | "danger" | "neutral" {
  if (days >= 31) return "danger";
  if (days >= 8) return "warning";
  return "neutral";
}

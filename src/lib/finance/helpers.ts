/**
 * Sprint G1.1 — helpers puros do Financeiro Base.
 */

import type { QueryClient } from "@tanstack/react-query";
import type { FinanceEntryTotals, FinancialEntryRow } from "./types";
import { PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS } from "./constants";

export function assertFinanceClinicId(clinicId: string | null | undefined): asserts clinicId is string {
  if (!clinicId) throw new Error("Clínica ativa não definida.");
}

/** Invalida caches compartilhados após mutações em financial_entries (G1.8). */
export function invalidateFinanceModuleQueries(
  qc: QueryClient,
  clinicId: string | null | undefined,
) {
  if (!clinicId) return;
  void qc.invalidateQueries({ queryKey: ["finance", clinicId] });
  void qc.invalidateQueries({ queryKey: ["fin", clinicId] });
  void qc.invalidateQueries({ queryKey: ["fin-totals", clinicId] });
  void qc.invalidateQueries({ queryKey: ["report-financial", clinicId] });
}

export function sumEntryValues(rows: Pick<FinancialEntryRow, "valor">[]): number {
  return rows.reduce((s, r) => s + Number(r.valor ?? 0), 0);
}

export function computeEntryTotalsFromRows(
  rows: Pick<FinancialEntryRow, "valor" | "status">[],
  monthStartIso: string,
): FinanceEntryTotals {
  const receivedMonth = sumEntryValues(
    rows.filter((r) => r.status === "pago" && r.valor != null),
  );
  const pendingTotal = sumEntryValues(rows.filter((r) => r.status === "pendente"));
  void monthStartIso;
  return { receivedMonth, pendingTotal };
}

export function formatPaymentMethod(method: FinancialEntryRow["forma_pagamento"]): string {
  if (!method) return "—";
  return PAYMENT_METHOD_LABELS[method] ?? method;
}

export function formatPaymentStatus(status: FinancialEntryRow["status"]): string {
  return PAYMENT_STATUS_LABELS[status] ?? status;
}

/** Prefixo de auditoria financeira (saas_audit_log / audit_log futuro). */
export function financeAuditAction(suffix: string): string {
  return `finance.${suffix}`;
}

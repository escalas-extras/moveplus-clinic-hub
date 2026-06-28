/**
 * Sprint G2.3 — helpers de parcelamento financeiro.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { FinancialInstallmentPlanRow, InstallmentPlanStatus, InstallmentSourceType } from "./types";

export type InstallmentScheduleItem = {
  installment_number: number;
  installment_total: number;
  valor: number;
  data_vencimento: string;
  documento: string;
  observacoes: string;
};

export type CreateInstallmentPlanInput = {
  clinicId: string;
  sourceType: InstallmentSourceType;
  sourceId: string | null;
  patientId: string;
  professionalId: string | null;
  totalAmount: number;
  installmentsCount: number;
  firstDueDate: string;
  issueDate: string;
  categoryId: string;
  costCenterId: string | null;
  documentoBase: string | null;
  observacoesBase: string | null;
  createdBy: string | null;
};

export function addMonthsIso(isoDate: string, months: number): string {
  const d = new Date(isoDate + "T12:00:00");
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

/** Divide valor total em parcelas; última parcela ajusta centavos. */
export function computeInstallmentAmounts(totalAmount: number, installmentsCount: number): number[] {
  if (installmentsCount < 2) {
    throw new Error("Informe pelo menos 2 parcelas.");
  }
  if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
    throw new Error("Valor total inválido para parcelamento.");
  }

  const baseCents = Math.floor((totalAmount * 100) / installmentsCount);
  const amounts: number[] = [];

  for (let i = 0; i < installmentsCount - 1; i += 1) {
    amounts.push(baseCents / 100);
  }

  const sumPrevious = amounts.reduce((s, v) => s + v, 0);
  const last = Math.round((totalAmount - sumPrevious) * 100) / 100;
  amounts.push(last);

  const sum = Math.round(amounts.reduce((s, v) => s + v, 0) * 100) / 100;
  if (Math.abs(sum - totalAmount) > 0.01) {
    throw new Error("Erro ao calcular parcelas.");
  }

  return amounts;
}

export function buildInstallmentSchedule(input: {
  totalAmount: number;
  installmentsCount: number;
  firstDueDate: string;
  documentoBase?: string | null;
  observacoesBase?: string | null;
  planLabel?: string;
}): InstallmentScheduleItem[] {
  const { totalAmount, installmentsCount, firstDueDate } = input;
  if (!firstDueDate?.trim()) throw new Error("Primeiro vencimento é obrigatório.");

  const amounts = computeInstallmentAmounts(totalAmount, installmentsCount);
  const docBase = input.documentoBase?.trim() || "PARC";
  const obsBase = input.observacoesBase?.trim() || "Parcelamento";
  const planLabel = input.planLabel?.trim() || obsBase;

  return amounts.map((valor, index) => {
    const n = index + 1;
    return {
      installment_number: n,
      installment_total: installmentsCount,
      valor,
      data_vencimento: addMonthsIso(firstDueDate.trim(), index),
      documento: `${docBase}-${n}/${installmentsCount}`.slice(0, 120),
      observacoes: `${obsBase} — Parcela ${n} de ${installmentsCount}${planLabel !== obsBase ? ` (${planLabel})` : ""}`.slice(0, 500),
    };
  });
}

export function parseInstallmentOptions(input: {
  enabled: boolean;
  installments_count: number | string;
  first_due_date: string;
  totalAmount: number;
}) {
  if (!input.enabled) return null;

  const installmentsCount = Number(input.installments_count);
  if (!Number.isInteger(installmentsCount) || installmentsCount < 2) {
    throw new Error("Informe pelo menos 2 parcelas.");
  }
  if (!input.first_due_date?.trim()) {
    throw new Error("Informe o vencimento da primeira parcela.");
  }

  computeInstallmentAmounts(input.totalAmount, installmentsCount);

  return {
    installmentsCount,
    firstDueDate: input.first_due_date.trim(),
  };
}

export function installmentPlanStatusVariant(
  status: InstallmentPlanStatus,
): "success" | "warning" | "danger" | "neutral" {
  if (status === "active") return "success";
  if (status === "completed") return "neutral";
  if (status === "canceled") return "danger";
  return "neutral";
}

export async function createFinancialInstallmentPlan(
  supabase: SupabaseClient<Database>,
  input: CreateInstallmentPlanInput,
): Promise<{ planId: string; entryIds: string[] }> {
  const schedule = buildInstallmentSchedule({
    totalAmount: input.totalAmount,
    installmentsCount: input.installmentsCount,
    firstDueDate: input.firstDueDate,
    documentoBase: input.documentoBase,
    observacoesBase: input.observacoesBase,
  });

  const { data: plan, error: planError } = await supabase
    .from("financial_installment_plans")
    .insert({
      clinic_id: input.clinicId,
      source_type: input.sourceType,
      source_id: input.sourceId,
      patient_id: input.patientId,
      total_amount: input.totalAmount,
      installments_count: input.installmentsCount,
      first_due_date: input.firstDueDate,
      status: "active",
      created_by: input.createdBy,
    })
    .select("id")
    .single();

  if (planError) throw planError;

  const entries = schedule.map((item) => ({
    clinic_id: input.clinicId,
    entry_type: "receivable" as const,
    patient_id: input.patientId,
    professional_id: input.professionalId,
    valor: item.valor,
    data: input.issueDate,
    data_vencimento: item.data_vencimento,
    category_id: input.categoryId,
    cost_center_id: input.costCenterId,
    documento: item.documento,
    observacoes: item.observacoes,
    status: "pendente" as const,
    installment_plan_id: plan.id,
    installment_number: item.installment_number,
    installment_total: item.installment_total,
    created_by: input.createdBy,
  }));

  const { data: inserted, error: entriesError } = await supabase
    .from("financial_entries")
    .insert(entries)
    .select("id");

  if (entriesError) throw entriesError;

  return {
    planId: plan.id,
    entryIds: (inserted ?? []).map((e) => e.id),
  };
}

export async function cancelFinancialInstallmentPlan(
  supabase: SupabaseClient<Database>,
  clinicId: string,
  planId: string,
): Promise<void> {
  const { data: plan, error: planError } = await supabase
    .from("financial_installment_plans")
    .select("id, status")
    .eq("id", planId)
    .eq("clinic_id", clinicId)
    .single();

  if (planError) throw planError;
  if (plan.status === "canceled") throw new Error("Plano já cancelado.");
  if (plan.status === "completed") throw new Error("Plano já concluído.");

  const { data: entries, error: entriesError } = await supabase
    .from("financial_entries")
    .select("id, status")
    .eq("clinic_id", clinicId)
    .eq("installment_plan_id", planId);

  if (entriesError) throw entriesError;

  const rows = entries ?? [];
  if (rows.some((e) => e.status === "pago")) {
    throw new Error("Não é possível cancelar plano com parcelas pagas.");
  }

  const pendingIds = rows.filter((e) => e.status === "pendente").map((e) => e.id);
  if (pendingIds.length > 0) {
    const { error: cancelError } = await supabase
      .from("financial_entries")
      .update({ status: "cancelado" })
      .eq("clinic_id", clinicId)
      .in("id", pendingIds)
      .eq("status", "pendente");
    if (cancelError) throw cancelError;
  }

  const { error: updatePlanError } = await supabase
    .from("financial_installment_plans")
    .update({ status: "canceled" })
    .eq("id", planId)
    .eq("clinic_id", clinicId);
  if (updatePlanError) throw updatePlanError;
}

export async function findInstallmentPlanBySource(
  supabase: SupabaseClient<Database>,
  clinicId: string,
  sourceType: InstallmentSourceType,
  sourceId: string,
): Promise<FinancialInstallmentPlanRow | null> {
  const { data, error } = await supabase
    .from("financial_installment_plans")
    .select("*")
    .eq("clinic_id", clinicId)
    .eq("source_type", sourceType)
    .eq("source_id", sourceId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export function sumInstallmentAmounts(amounts: number[]): number {
  return Math.round(amounts.reduce((s, v) => s + v, 0) * 100) / 100;
}

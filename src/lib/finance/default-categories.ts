/**
 * Sprint G1.2 — categorias padrão sugeridas (sem duplicar por clínica/tipo/nome).
 */

import { supabase } from "@/integrations/supabase/client";
import type { FinancialCategoryType } from "./types";

type DefaultCategorySeed = {
  name: string;
  sort_order: number;
  color?: string;
};

export const DEFAULT_INCOME_CATEGORIES: DefaultCategorySeed[] = [
  { name: "Consultas", sort_order: 10, color: "#10b981" },
  { name: "Sessões", sort_order: 20, color: "#3b82f6" },
  { name: "Pacotes", sort_order: 30, color: "#8b5cf6" },
  { name: "Convênios", sort_order: 40, color: "#f59e0b" },
  { name: "Outros recebimentos", sort_order: 50, color: "#64748b" },
];

export const DEFAULT_EXPENSE_CATEGORIES: DefaultCategorySeed[] = [
  { name: "Aluguel", sort_order: 10, color: "#ef4444" },
  { name: "Materiais", sort_order: 20, color: "#f59e0b" },
  { name: "Salários", sort_order: 30, color: "#3b82f6" },
  { name: "Impostos", sort_order: 40, color: "#64748b" },
  { name: "Marketing", sort_order: 50, color: "#8b5cf6" },
  { name: "Sistemas", sort_order: 60, color: "#10b981" },
  { name: "Outras despesas", sort_order: 70, color: "#94a3b8" },
];

const DEFAULTS_BY_TYPE: Record<FinancialCategoryType, DefaultCategorySeed[]> = {
  income: DEFAULT_INCOME_CATEGORIES,
  expense: DEFAULT_EXPENSE_CATEGORIES,
};

function categoryKey(type: FinancialCategoryType, name: string) {
  return `${type}:${name.trim().toLowerCase()}`;
}

/**
 * Insere categorias padrão ausentes para a clínica ativa.
 * Idempotente: respeita unique(clinic_id, type, name).
 */
export async function ensureDefaultFinanceCategories(clinicId: string): Promise<void> {
  const { data: existing, error: readError } = await supabase
    .from("financial_categories")
    .select("name, type")
    .eq("clinic_id", clinicId);

  if (readError) throw readError;

  const existingKeys = new Set(
    (existing ?? []).map((row) => categoryKey(row.type as FinancialCategoryType, row.name)),
  );

  const toInsert: Array<{
    clinic_id: string;
    name: string;
    type: FinancialCategoryType;
    sort_order: number;
    color: string | null;
    is_active: boolean;
  }> = [];

  for (const type of ["income", "expense"] as const) {
    for (const seed of DEFAULTS_BY_TYPE[type]) {
      if (existingKeys.has(categoryKey(type, seed.name))) continue;
      toInsert.push({
        clinic_id: clinicId,
        name: seed.name,
        type,
        sort_order: seed.sort_order,
        color: seed.color ?? null,
        is_active: true,
      });
    }
  }

  if (!toInsert.length) return;

  const { error: insertError } = await supabase.from("financial_categories").insert(toInsert);
  if (insertError) throw insertError;
}

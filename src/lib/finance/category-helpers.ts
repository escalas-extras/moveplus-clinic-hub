/**
 * Sprint G1.2 — helpers de categorias financeiras.
 */

import type { FinancialCategoryRow, FinancialCategoryType } from "./types";
import { FINANCIAL_CATEGORY_TYPE_PLURAL } from "./constants";

export function normalizeCategoryName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

export function isDuplicateCategoryError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: string; message?: string };
  return e.code === "23505" || (e.message?.includes("financial_categories_clinic_type_name_unique") ?? false);
}

export function duplicateCategoryMessage(type: FinancialCategoryType): string {
  return `Já existe uma categoria de ${FINANCIAL_CATEGORY_TYPE_PLURAL[type].toLowerCase()} com este nome.`;
}

export function groupCategoriesByType(categories: FinancialCategoryRow[]) {
  const income = categories
    .filter((c) => c.type === "income")
    .sort(sortCategories);
  const expense = categories
    .filter((c) => c.type === "expense")
    .sort(sortCategories);
  return { income, expense };
}

export function sortCategories(a: FinancialCategoryRow, b: FinancialCategoryRow) {
  if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
  return a.name.localeCompare(b.name, "pt-BR");
}

export function filterActiveCategories(categories: FinancialCategoryRow[]) {
  return categories.filter((c) => c.is_active);
}

export function parseCategoryForm(input: {
  name: string;
  type: FinancialCategoryType;
  color?: string | null;
  sort_order?: number | string;
}) {
  const name = normalizeCategoryName(input.name);
  if (!name) throw new Error("Nome é obrigatório.");
  if (!input.type) throw new Error("Tipo é obrigatório.");

  const sort_order = Number(input.sort_order ?? 0);
  const color = input.color?.trim() || null;

  return { name, type: input.type, color, sort_order: Number.isFinite(sort_order) ? sort_order : 0 };
}

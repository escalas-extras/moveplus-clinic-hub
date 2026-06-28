/**
 * Sprint G1.3 — helpers de centros de custo.
 */

import type { FinancialCostCenterRow } from "./types";

export function normalizeCostCenterName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

export function normalizeCostCenterCode(code: string | null | undefined): string | null {
  const v = code?.trim().toUpperCase() || "";
  return v || null;
}

export function isDuplicateCostCenterError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: string; message?: string };
  return e.code === "23505" || (e.message?.includes("financial_cost_centers_clinic_name_unique") ?? false);
}

export function duplicateCostCenterMessage(): string {
  return "Já existe um centro de custo com este nome nesta clínica.";
}

export function sortCostCenters(a: FinancialCostCenterRow, b: FinancialCostCenterRow) {
  if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
  return a.name.localeCompare(b.name, "pt-BR");
}

export function filterActiveCostCenters(centers: FinancialCostCenterRow[]) {
  return centers.filter((c) => c.is_active);
}

export function parseCostCenterForm(input: {
  name: string;
  code?: string | null;
  color?: string | null;
  sort_order?: number | string;
}) {
  const name = normalizeCostCenterName(input.name);
  if (!name) throw new Error("Nome é obrigatório.");

  const sort_order = Number(input.sort_order ?? 0);
  const color = input.color?.trim() || null;
  const code = normalizeCostCenterCode(input.code);

  return {
    name,
    code,
    color,
    sort_order: Number.isFinite(sort_order) ? sort_order : 0,
  };
}

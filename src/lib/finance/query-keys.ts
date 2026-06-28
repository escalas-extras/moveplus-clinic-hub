/**
 * Sprint G1.1 — query keys centralizadas (TanStack Query).
 */

export const financeQueryKeys = {
  all: (clinicId: string | null | undefined) => ["finance", clinicId] as const,
  entries: (clinicId: string | null | undefined) => ["finance", clinicId, "entries"] as const,
  entryTotals: (clinicId: string | null | undefined, monthIso: string) =>
    ["finance", clinicId, "entry-totals", monthIso] as const,
  hub: (clinicId: string | null | undefined) => ["finance", clinicId, "hub"] as const,
  categories: (clinicId: string | null | undefined) => ["finance", clinicId, "categories"] as const,
  costCenters: (clinicId: string | null | undefined) => ["finance", clinicId, "cost-centers"] as const,
  receivables: (clinicId: string | null | undefined, filtersKey: string) =>
    ["finance", clinicId, "receivables", filtersKey] as const,
  receivableLookups: (clinicId: string | null | undefined) =>
    ["finance", clinicId, "receivable-lookups"] as const,
  payables: (clinicId: string | null | undefined, filtersKey: string) =>
    ["finance", clinicId, "payables", filtersKey] as const,
  payableLookups: (clinicId: string | null | undefined) =>
    ["finance", clinicId, "payable-lookups"] as const,
  cashFlow: (clinicId: string | null | undefined, filtersKey: string) =>
    ["finance", clinicId, "cash-flow", filtersKey] as const,
  cashFlowLookups: (clinicId: string | null | undefined) =>
    ["finance", clinicId, "cash-flow-lookups"] as const,
} as const;

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
  dashboard: (clinicId: string | null | undefined, filtersKey: string) =>
    ["finance", clinicId, "dashboard", filtersKey] as const,
  dashboardLookups: (clinicId: string | null | undefined) =>
    ["finance", clinicId, "dashboard-lookups"] as const,
  packageTemplates: (clinicId: string | null | undefined) =>
    ["finance", clinicId, "package-templates"] as const,
  patientPackages: (clinicId: string | null | undefined, filtersKey: string) =>
    ["finance", clinicId, "patient-packages", filtersKey] as const,
  packageLookups: (clinicId: string | null | undefined) =>
    ["finance", clinicId, "package-lookups"] as const,
  packageUsages: (clinicId: string | null | undefined, contractId: string) =>
    ["finance", clinicId, "package-usages", contractId] as const,
  patientPackageDetail: (clinicId: string | null | undefined, contractId: string) =>
    ["finance", clinicId, "patient-package", contractId] as const,
  installmentPlan: (clinicId: string | null | undefined, planId: string) =>
    ["finance", clinicId, "installment-plan", planId] as const,
} as const;

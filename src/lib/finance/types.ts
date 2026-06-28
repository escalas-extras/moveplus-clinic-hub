/**
 * Sprint G1.1 — tipos de domínio do módulo Financeiro Base.
 * Alinhados ao Supabase existente; extensões futuras documentadas em module-registry.
 */

import type { Database } from "@/integrations/supabase/types";

export type FinancialEntryRow = Database["public"]["Tables"]["financial_entries"]["Row"];
export type FinancialEntryInsert = Database["public"]["Tables"]["financial_entries"]["Insert"];
export type FinancialCategoryRow = Database["public"]["Tables"]["financial_categories"]["Row"];
export type FinancialCategoryInsert = Database["public"]["Tables"]["financial_categories"]["Insert"];
export type FinancialCategoryUpdate = Database["public"]["Tables"]["financial_categories"]["Update"];
export type FinancialCategoryType = FinancialCategoryRow["type"];
export type FinancialCostCenterRow = Database["public"]["Tables"]["financial_cost_centers"]["Row"];
export type FinancialCostCenterInsert = Database["public"]["Tables"]["financial_cost_centers"]["Insert"];
export type FinancialCostCenterUpdate = Database["public"]["Tables"]["financial_cost_centers"]["Update"];
export type ClinicalPackageTemplateRow = Database["public"]["Tables"]["clinical_package_templates"]["Row"];
export type ClinicalPackageTemplateInsert = Database["public"]["Tables"]["clinical_package_templates"]["Insert"];
export type ClinicalPackageTemplateUpdate = Database["public"]["Tables"]["clinical_package_templates"]["Update"];
export type PatientPackageContractRow = Database["public"]["Tables"]["patient_package_contracts"]["Row"];
export type PatientPackageContractInsert = Database["public"]["Tables"]["patient_package_contracts"]["Insert"];
export type PatientPackageUsageRow = Database["public"]["Tables"]["patient_package_usages"]["Row"];
export type PatientPackageUsageInsert = Database["public"]["Tables"]["patient_package_usages"]["Insert"];
export type PatientPackageStatus = Database["public"]["Enums"]["patient_package_status"];
export type PatientPackageUsageStatus = Database["public"]["Enums"]["patient_package_usage_status"];
export type FinancialInstallmentPlanRow = Database["public"]["Tables"]["financial_installment_plans"]["Row"];
export type InstallmentPlanStatus = Database["public"]["Enums"]["installment_plan_status"];
export type InstallmentSourceType = FinancialInstallmentPlanRow["source_type"];
export type PaymentMethod = Database["public"]["Enums"]["payment_method"];
export type PaymentStatus = Database["public"]["Enums"]["payment_status"];
export type FinancialEntryType = FinancialEntryRow["entry_type"];

/** Módulos planejados na trilha G1 (Financeiro Base). */
export type FinanceModuleId =
  | "dashboard"
  | "categories"
  | "cost_centers"
  | "receivables"
  | "payables"
  | "cash_flow"
  | "legacy_entries"
  | "packages"
  | "installments";

export type FinanceModuleStatus = "active" | "planned" | "legacy";

export type FinanceModuleDefinition = {
  id: FinanceModuleId;
  title: string;
  description: string;
  status: FinanceModuleStatus;
  /** Rota futura ou atual (quando existir). */
  route?: string;
  sprint?: string;
};

/** Escopo multi-clínica — toda query/mutation deve receber clinicId. */
export type FinanceTenantScope = {
  clinicId: string;
};

/** Resumo operacional v1 (financial_entries). */
export type FinanceEntryTotals = {
  receivedMonth: number;
  pendingTotal: number;
};

/** Direção contábil prevista para G1.2+ (ainda não persistida em todas as linhas). */
export type FinanceEntryDirection = "receita" | "despesa";

export type FinanceAuditContext = {
  clinicId: string;
  userId?: string | null;
  action: string;
};

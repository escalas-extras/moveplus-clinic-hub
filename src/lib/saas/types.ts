/** Tipos compartilhados — Admin SaaS FisioOS. */

export type { ClinicOperationalStatus, ClinicOperationalRow } from "./clinic-operational-status";
export type { ClinicListSegment } from "./clinic-segmentation";

export type SaasDashboardClinics = {
  total: number;
  total_all: number;
  active: number;
  inactive: number;
  suspended: number;
  test: number;
  new_30d: number;
  inactive_or_suspended: number;
};

export type SaasDashboardPlanRow = {
  code: string;
  name: string;
  count: number;
  mrr: number;
  trial: number;
};

export type SaasRecentAccess = {
  id: string;
  action: string;
  created_at: string;
  clinic_id: string | null;
  clinic_name: string | null;
};

export type SaasDashboardData = {
  clinics: SaasDashboardClinics;
  users: { total: number };
  patients: { total: number };
  documents: { total: number; this_month: number };
  recent_clinics: Array<{
    id: string;
    nome: string;
    slug: string | null;
    status: string;
    plan: string | null;
    created_at: string;
  }>;
  recent_access: SaasRecentAccess[];
  plans: SaasDashboardPlanRow[];
  mrr: number;
  arr: number;
  avg_ticket: number;
  trial_count: number;
  trials_expiring: number;
  paid_clients: number;
  active_plan_contracts: number;
  canceled_count: number;
  growth: Array<{ month: string; count: number }>;
  plans_catalog_count: number;
};

export type SaasNavTarget =
  | "clinics"
  | "plans"
  | "catalog"
  | "audit"
  | "commercial"
  | "trials"
  | "billing"
  | "support"
  | "settings";

export type SaasCommercialSubscription = {
  clinic_id: string;
  clinic_name: string;
  clinic_slug: string | null;
  clinic_status: string;
  plan_code: string | null;
  plan_name: string;
  plan_status: string;
  started_at: string | null;
  trial_ends_at: string | null;
  canceled_at: string | null;
  monthly_value: number;
  next_due_at: string | null;
  health_score: number;
  churn_risk: "baixo" | "medio" | "alto";
  usage: {
    users: number;
    patients: number;
    documents_month: number;
    clinical_activity_30d: number;
    last_activity_at: string | null;
  };
  limits: {
    max_users: number | null;
    max_patients: number | null;
    max_documents_month: number | null;
    max_storage_mb: number | null;
    modules: string[];
  };
};

export type SaasCommercialMonthlyFee = {
  clinic_id: string;
  clinic_name: string;
  competence: string;
  due_at: string | null;
  amount: number;
  status: "trial" | "open" | "overdue" | "suspended" | "canceled";
  source: "derived";
};

export type SaasCommercialHistoryEvent = {
  id: string;
  clinic_id: string | null;
  clinic_name: string | null;
  action: string;
  created_at: string;
  old_data: unknown;
  new_data: unknown;
};

export type SaasCommercialCenterData = {
  summary: {
    active_subscriptions: number;
    trials: number;
    suspended: number;
    canceled: number;
    overdue: number;
    trials_expiring: number;
    at_risk: number;
    average_health_score: number;
    estimated_mrr: number;
  };
  subscriptions: SaasCommercialSubscription[];
  monthly_fees: SaasCommercialMonthlyFee[];
  upcoming_due: SaasCommercialMonthlyFee[];
  overdue: SaasCommercialMonthlyFee[];
  trials_expiring: SaasCommercialSubscription[];
  at_risk: SaasCommercialSubscription[];
  history: SaasCommercialHistoryEvent[];
};

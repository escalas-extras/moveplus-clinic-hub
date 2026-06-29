export const PLAN_FEATURES = [
  "documentos",
  "templates_personalizados",
  "biblioteca_exercicios",
  "home_care",
  "marketing",
  "relatorios_avancados",
  "white_label",
  "usuarios",
  "pacientes",
  "profissionais",
] as const;

export type PlanFeature = (typeof PLAN_FEATURES)[number] | string;

export type ClinicPlanLimits = {
  plan_id: string | null;
  plan_code: string | null;
  plan_name: string | null;
  status: string | null;
  modules: string[];
  max_users: number | null;
  max_patients: number | null;
  max_documents_month: number | null;
  max_storage_mb: number | null;
};

export function normalizePlanModules(modules: unknown): string[] {
  if (!Array.isArray(modules)) return [];
  return modules.filter((item): item is string => typeof item === "string");
}

export function isFeatureEnabled(planCode: string | null | undefined, feature: PlanFeature, modules: unknown = []) {
  const enabled = normalizePlanModules(modules);
  if (enabled.includes("*")) return true;
  if (enabled.includes(feature)) return true;

  // Conservative defaults for old catalogs that may not have modules fully configured.
  if (planCode === "enterprise") return true;
  if (planCode === "clinic") {
    return ["documentos", "templates_personalizados", "biblioteca_exercicios", "home_care", "marketing", "relatorios_avancados", "usuarios", "pacientes", "profissionais"].includes(feature);
  }
  if (planCode === "professional") {
    return ["documentos", "biblioteca_exercicios", "relatorios_avancados", "usuarios", "pacientes", "profissionais"].includes(feature);
  }
  if (planCode === "starter") {
    return ["documentos", "usuarios", "pacientes", "profissionais"].includes(feature);
  }
  return false;
}

export async function getClinicPlanLimits(client: any, clinicId: string): Promise<ClinicPlanLimits> {
  const { data, error } = await client
    .from("clinic_plans")
    .select(
      "status, plan_id, plans(id, code, name, modules, max_users, max_patients, max_documents_month, max_storage_mb)",
    )
    .eq("clinic_id", clinicId)
    .in("status", ["active", "trial", "suspended"])
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);

  const plan = data?.plans ?? null;
  return {
    plan_id: data?.plan_id ?? plan?.id ?? null,
    plan_code: plan?.code ?? null,
    plan_name: plan?.name ?? null,
    status: data?.status ?? null,
    modules: normalizePlanModules(plan?.modules),
    max_users: plan?.max_users ?? null,
    max_patients: plan?.max_patients ?? null,
    max_documents_month: plan?.max_documents_month ?? null,
    max_storage_mb: plan?.max_storage_mb ?? null,
  };
}

export async function canUseFeature(client: any, clinicId: string, feature: PlanFeature) {
  const limits = await getClinicPlanLimits(client, clinicId);
  return isFeatureEnabled(limits.plan_code, feature, limits.modules);
}

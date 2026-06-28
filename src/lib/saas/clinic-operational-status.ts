/** Status operacional unificado clínica + plano (Admin SaaS / gate de acesso). */

export type ClinicOperationalStatus =
  | "trial"
  | "active"
  | "suspended"
  | "inactive"
  | "canceled";

export type ClinicOperationalRow = {
  clinic_status: string | null;
  plan_status: string | null;
  trial_ends_at: string | null;
};

export function trialDaysRemaining(trialEndsAt: string | null | undefined, now = new Date()): number | null {
  if (!trialEndsAt) return null;
  const end = new Date(trialEndsAt);
  if (Number.isNaN(end.getTime())) return null;
  const diff = end.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)));
}

export function resolveOperationalStatus(row: ClinicOperationalRow): ClinicOperationalStatus {
  const cs = (row.clinic_status ?? "").toLowerCase();
  const ps = (row.plan_status ?? "").toLowerCase();

  if (cs === "canceled" || ps === "canceled") return "canceled";
  if (cs === "inactive") return "inactive";
  if (cs === "suspended" || ps === "suspended") return "suspended";

  if (ps === "trial") {
    const days = trialDaysRemaining(row.trial_ends_at);
    if (row.trial_ends_at && days === 0) return "suspended";
    return "trial";
  }

  if (ps === "active" && cs === "active") return "active";
  if (cs === "active" && !ps) return "inactive";
  return cs === "active" ? "inactive" : "inactive";
}

export function clinicOperationalAccessAllowed(row: ClinicOperationalRow): boolean {
  const status = resolveOperationalStatus(row);
  return status === "trial" || status === "active";
}

export const OPERATIONAL_STATUS_LABEL: Record<ClinicOperationalStatus, string> = {
  trial: "Trial",
  active: "Ativo",
  suspended: "Suspenso",
  inactive: "Inativo",
  canceled: "Cancelado",
};

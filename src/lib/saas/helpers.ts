import { SAAS_AUDIT_ACTION_LABEL, SAAS_TRIAL_EXPIRY_DAYS } from "./constants";
import type { SaasRecentAccess } from "./types";

export function formatSaasMoney(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function countTrialsExpiring(
  rows: Array<{ status: string; trial_ends_at?: string | null; clinic_id: string }>,
  excludeClinicIds: Set<string>,
  withinDays = SAAS_TRIAL_EXPIRY_DAYS,
  now = new Date(),
): number {
  const limit = new Date(now);
  limit.setDate(limit.getDate() + withinDays);
  return rows.filter((row) => {
    if (row.status !== "trial" || excludeClinicIds.has(row.clinic_id) || !row.trial_ends_at) {
      return false;
    }
    const end = new Date(row.trial_ends_at);
    return !Number.isNaN(end.getTime()) && end <= limit;
  }).length;
}

export function formatAuditAction(action: string): string {
  return SAAS_AUDIT_ACTION_LABEL[action] ?? action.replace(/\./g, " · ");
}

export function formatSaasDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function auditToAttentionItems(rows: SaasRecentAccess[]) {
  return rows.map((row) => ({
    id: row.id,
    title: formatAuditAction(row.action),
    subtitle: row.clinic_name ?? "Operação global",
    meta: formatSaasDateTime(row.created_at),
    tone: "default" as const,
  }));
}

import { SAAS_TRIAL_EXPIRY_DAYS } from "./constants";
import { formatAuditAction, formatSaasDateTime } from "./helpers";
import type { SaasDashboardData, SaasRecentAccess } from "./types";

export type ExecutiveAttentionItem = {
  id: string;
  title: string;
  description?: string;
  tone: "warning" | "danger" | "default";
  meta?: string;
};

export type ExecutiveSoonMonitor = {
  id: string;
  label: string;
};

export type ExecutiveAuditGroup = {
  id: string;
  label: string;
  items: Array<{ id: string; title: string; subtitle: string; meta: string }>;
};

const SOON_MONITORS: ExecutiveSoonMonitor[] = [
  { id: "no-owner", label: "Sem proprietário" },
  { id: "low-health", label: "Health baixo" },
  { id: "no-users", label: "Sem usuários" },
  { id: "no-patients", label: "Sem pacientes" },
  { id: "no-docs", label: "Sem documentos" },
];

export function buildExecutiveAttentionItems(data: SaasDashboardData): ExecutiveAttentionItem[] {
  const items: ExecutiveAttentionItem[] = [];

  if (data.trials_expiring > 0) {
    items.push({
      id: "trials-expiring",
      title: `Trial termina em até ${SAAS_TRIAL_EXPIRY_DAYS} dias`,
      description: `${data.trials_expiring} clínica(s) com trial crítico`,
      tone: "warning",
      meta: "Conversão",
    });
  }

  if (data.clinics.suspended > 0) {
    items.push({
      id: "suspended",
      title: "Clínicas suspensas",
      description: `${data.clinics.suspended} clínica(s) com acesso comercial suspenso`,
      tone: "danger",
      meta: "Operação",
    });
  }

  if (data.canceled_count > 0) {
    items.push({
      id: "canceled",
      title: "Assinaturas canceladas",
      description: `${data.canceled_count} contrato(s) cancelado(s) na base`,
      tone: "warning",
      meta: "Comercial",
    });
  }

  if (data.clinics.inactive > 0) {
    items.push({
      id: "inactive",
      title: "Clínicas inativas",
      description: `${data.clinics.inactive} clínica(s) com status inativo`,
      tone: "default",
      meta: "Operação",
    });
  }

  return items;
}

export function getExecutiveSoonMonitors() {
  return SOON_MONITORS;
}

function auditMatches(action: string, patterns: string[]) {
  const a = action.toLowerCase();
  return patterns.some((p) => a.includes(p));
}

function mapAuditRow(row: SaasRecentAccess) {
  return {
    id: row.id,
    title: formatAuditAction(row.action),
    subtitle: row.clinic_name ?? "Operação global",
    meta: formatSaasDateTime(row.created_at),
  };
}

export function buildExecutiveAuditGroups(rows: SaasRecentAccess[]): ExecutiveAuditGroup[] {
  const provision: SaasRecentAccess[] = [];
  const plans: SaasRecentAccess[] = [];
  const blocks: SaasRecentAccess[] = [];
  const reactivations: SaasRecentAccess[] = [];
  const other: SaasRecentAccess[] = [];

  for (const row of rows) {
    const action = row.action;
    if (auditMatches(action, ["provision", "owner.invite", "owner.change"])) {
      provision.push(row);
    } else if (auditMatches(action, ["plan."])) {
      plans.push(row);
    } else if (auditMatches(action, ["cancel", "mark_test", "status", "suspend", "inactive"])) {
      blocks.push(row);
    } else if (auditMatches(action, ["trial_convert", "reactivat", "owner_activated"])) {
      reactivations.push(row);
    } else {
      other.push(row);
    }
  }

  const groups: ExecutiveAuditGroup[] = [
    { id: "provision", label: "Provisionamentos", items: provision.slice(0, 5).map(mapAuditRow) },
    { id: "plans", label: "Planos alterados", items: plans.slice(0, 5).map(mapAuditRow) },
    { id: "blocks", label: "Bloqueios", items: blocks.slice(0, 5).map(mapAuditRow) },
    { id: "reactivations", label: "Reativações", items: reactivations.slice(0, 5).map(mapAuditRow) },
  ];

  if (other.length) {
    groups.push({
      id: "recent",
      label: "Últimas ações",
      items: other.slice(0, 6).map(mapAuditRow),
    });
  }

  return groups;
}

export function totalPlansSold(data: SaasDashboardData) {
  return data.plans.reduce((sum, p) => sum + p.count, 0);
}

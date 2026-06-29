import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  isKnownTestClinicCandidate,
  isProtectedMovePlusClinic,
  resolveClinicNameFields,
  segmentClinic,
  type ClinicListSegment,
  type ClinicSettingsNameLookup,
} from "@/lib/saas/clinic-segmentation";
import { countTrialsExpiring } from "@/lib/saas/helpers";

const STATUS_VALUES = ["active", "inactive", "suspended", "canceled"] as const;

async function loadClinicSettingsLookup(
  supabaseAdmin: any,
  clinics: Array<{ id: string; settings_id?: string | null }>,
): Promise<ClinicSettingsNameLookup> {
  const ids = clinics.map((c) => c.id);
  const settingsIds = clinics.map((c) => c.settings_id).filter(Boolean) as string[];
  const fantasiaBySettingsId: Record<string, string | null> = {};
  const byClinicId: Record<string, { nome_fantasia: string | null; razao_social: string | null }> = {};

  if (settingsIds.length) {
    const { data: settingsRows } = await supabaseAdmin
      .from("clinic_settings")
      .select("id, nome_fantasia")
      .in("id", settingsIds);
    for (const s of settingsRows ?? []) fantasiaBySettingsId[s.id] = s.nome_fantasia;
  }

  if (ids.length) {
    const { data: settingsByClinic } = await supabaseAdmin
      .from("clinic_settings")
      .select("clinic_id, nome_fantasia, razao_social")
      .in("clinic_id", ids);
    for (const s of settingsByClinic ?? []) {
      if (!s.clinic_id) continue;
      byClinicId[s.clinic_id] = {
        nome_fantasia: s.nome_fantasia ?? null,
        razao_social: s.razao_social ?? null,
      };
    }
  }

  return { fantasiaBySettingsId, byClinicId };
}

async function assertClinicNotProtected(supabaseAdmin: any, clinicId: string) {
  const { data: clinic } = await supabaseAdmin
    .from("clinics")
    .select("id, nome, slug, settings_id")
    .eq("id", clinicId)
    .maybeSingle();
  if (!clinic) throw new Error("Clínica não encontrada.");
  let nome_fantasia: string | null = null;
  let razao_social: string | null = null;
  if (clinic.settings_id) {
    const { data: s } = await supabaseAdmin
      .from("clinic_settings")
      .select("nome_fantasia, razao_social")
      .eq("id", clinic.settings_id)
      .maybeSingle();
    nome_fantasia = s?.nome_fantasia ?? null;
    razao_social = s?.razao_social ?? null;
  }
  if (!nome_fantasia || !razao_social) {
    const { data: byClinic } = await supabaseAdmin
      .from("clinic_settings")
      .select("nome_fantasia, razao_social")
      .eq("clinic_id", clinicId)
      .maybeSingle();
    nome_fantasia = nome_fantasia ?? byClinic?.nome_fantasia ?? null;
    razao_social = razao_social ?? byClinic?.razao_social ?? null;
  }
  if (isProtectedMovePlusClinic({ nome: clinic.nome, slug: clinic.slug, nome_fantasia, razao_social })) {
    throw new Error("Esta clínica Move+ está protegida e não pode ser alterada.");
  }
  return clinic;
}

async function assertSuperAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "super_admin",
  });
  if (error) throw new Error("Falha ao verificar permissão: " + error.message);
  if (!data) throw new Error("Acesso restrito a super administradores.");
}

function trialEndsInDays(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

async function getCurrentPlanRow(supabaseAdmin: any, clinicId: string) {
  const { data } = await supabaseAdmin
    .from("clinic_plans")
    .select("id, status, plan_id, trial_ends_at")
    .eq("clinic_id", clinicId)
    .in("status", ["active", "trial"])
    .maybeSingle();
  return data;
}

async function resolvePlanIdForClinic(supabaseAdmin: any, clinicId: string) {
  const current = await getCurrentPlanRow(supabaseAdmin, clinicId);
  if (current?.plan_id) return current.plan_id;
  const { data: clinic } = await supabaseAdmin
    .from("clinics")
    .select("plan")
    .eq("id", clinicId)
    .maybeSingle();
  if (!clinic?.plan) return null;
  const { data: plan } = await supabaseAdmin
    .from("plans")
    .select("id")
    .eq("code", clinic.plan)
    .eq("active", true)
    .maybeSingle();
  return plan?.id ?? null;
}

async function logAudit(
  supabaseAdmin: any,
  userId: string,
  action: string,
  entityType: string,
  entityId: string | null,
  oldData: any = null,
  newData: any = null,
  clinicId: string | null = null,
) {
  try {
    await supabaseAdmin.from("saas_audit_log").insert({
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      old_data: oldData,
      new_data: newData,
      clinic_id:
        clinicId ??
        (entityType === "clinic" ? entityId : newData?.clinic_id ?? oldData?.clinic_id ?? null),
    });
  } catch (e) {
    // best-effort
    console.error("[saas_audit_log]", e);
  }
}

// ------------------------------------------------------------
// Dashboard
// ------------------------------------------------------------
export const getSaasDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [clinics, members, patients, docs, recentClinics, planAgg, plansCatalog, allClinicPlans, recentAudit] =
      await Promise.all([
        supabaseAdmin.from("clinics").select("id,status,created_at,nome,slug,settings_id"),
        supabaseAdmin
          .from("clinic_members")
          .select("user_id", { count: "exact", head: false })
          .eq("active", true),
        supabaseAdmin.from("patients").select("id", { count: "exact", head: true }),
        supabaseAdmin.from("clinical_documents").select("id, created_at"),
        supabaseAdmin
          .from("clinics")
          .select("id, nome, slug, status, plan, created_at, settings_id")
          .order("created_at", { ascending: false })
          .limit(20),
        supabaseAdmin
          .from("clinic_plans")
          .select(
            "clinic_id, plan_id, status, trial_ends_at, plans(id,code,name,monthly_price,price_cents)",
          )
          .in("status", ["active", "trial"]),
        supabaseAdmin
          .from("plans")
          .select("id,code,name,monthly_price,price_cents"),
        supabaseAdmin.from("clinic_plans").select("clinic_id, status"),
        supabaseAdmin
          .from("saas_audit_log")
          .select("id, action, created_at, clinic_id")
          .order("created_at", { ascending: false })
          .limit(8),
      ]);

    const clinicsRows = (clinics.data ?? []).filter((c: any) => c.status !== "deleted");
    const settingsLookup = await loadClinicSettingsLookup(supabaseAdmin, clinicsRows);
    const isProdClinic = (c: any) =>
      segmentClinic({
        status: c.status,
        is_test: !!(c as any).is_test,
        ...resolveClinicNameFields(c, settingsLookup),
      }) === "production";
    const prodRows = clinicsRows.filter(isProdClinic);
    const testRows = clinicsRows.filter((c: any) => !isProdClinic(c));
    const prodClinicIds = new Set(prodRows.map((c: any) => c.id));
    const active = prodRows.filter((c: any) => c.status === "active").length;
    const inactive = prodRows.filter((c: any) => c.status === "inactive").length;
    const suspended = prodRows.filter((c: any) => c.status === "suspended").length;
    const testCount = testRows.length;
    const inactiveOrSuspended = prodRows.filter((c: any) =>
      ["inactive", "suspended", "canceled"].includes(c.status),
    ).length;

    const testClinicIds = new Set(testRows.map((c: any) => c.id));
    const productionPlanAgg = ((planAgg.data ?? []) as any[]).filter((row) =>
      prodClinicIds.has(row.clinic_id),
    );

    const uniqueUsers = new Set((members.data ?? []).map((m: any) => m.user_id));

    const docsRows = docs.data ?? [];
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);
    const docsMonth = docsRows.filter((d: any) => new Date(d.created_at) >= thisMonth)
      .length;

    const thirtyAgo = new Date();
    thirtyAgo.setDate(thirtyAgo.getDate() - 30);
    const newClinics30d = prodRows.filter(
      (c: any) => new Date(c.created_at) >= thirtyAgo,
    ).length;

    const planCounts: Record<
      string,
      { code: string; name: string; count: number; mrr: number; trial: number }
    > = {};
    let mrr = 0;
    let trialCount = 0;
    for (const row of productionPlanAgg) {
      const p = row.plans;
      if (!p) continue;
      const price = Number(p.monthly_price ?? (p.price_cents ?? 0) / 100) || 0;
      const key = p.code;
      planCounts[key] = planCounts[key] || {
        code: p.code,
        name: p.name,
        count: 0,
        mrr: 0,
        trial: 0,
      };
      planCounts[key].count += 1;
      if (row.status === "trial") {
        planCounts[key].trial += 1;
        trialCount += 1;
      } else {
        planCounts[key].mrr += price;
        mrr += price;
      }
    }

    const paidContracts = productionPlanAgg.filter((r: any) => r.status === "active").length;
    const trialsExpiring = countTrialsExpiring(
      productionPlanAgg as Array<{
        status: string;
        trial_ends_at?: string | null;
        clinic_id: string;
      }>,
      testClinicIds,
    );
    const avgTicket = paidContracts > 0 ? mrr / paidContracts : 0;

    const canceledContracts = (allClinicPlans.data ?? []).filter(
      (r: any) => r.status === "canceled" && prodClinicIds.has(r.clinic_id),
    ).length;

    // Monthly growth — clinics created in last 6 months
    const growth: { month: string; count: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const next = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const label = d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
      const count = prodRows.filter((c: any) => {
        const dt = new Date(c.created_at);
        return dt >= d && dt < next;
      }).length;
      growth.push({ month: label, count });
    }

    const auditClinicIds = Array.from(
      new Set((recentAudit.data ?? []).map((r: any) => r.clinic_id).filter(Boolean)),
    ) as string[];
    const clinicNames: Record<string, string> = {};
    if (auditClinicIds.length) {
      const { data: auditClinics } = await supabaseAdmin
        .from("clinics")
        .select("id, nome")
        .in("id", auditClinicIds);
      for (const c of auditClinics ?? []) clinicNames[c.id] = c.nome;
    }

    return {
      clinics: {
        active,
        inactive,
        suspended,
        total: prodRows.length,
        total_all: clinicsRows.length,
        new_30d: newClinics30d,
        test: testCount,
        inactive_or_suspended: inactiveOrSuspended,
      },
      users: { total: uniqueUsers.size },
      patients: { total: patients.count ?? 0 },
      documents: { total: docsRows.length, this_month: docsMonth },
      recent_clinics: (recentClinics.data ?? []).filter((c: any) =>
        prodClinicIds.has(c.id),
      ).slice(0, 5),
      recent_access: (recentAudit.data ?? []).map((row: any) => ({
        id: row.id,
        action: row.action,
        created_at: row.created_at,
        clinic_id: row.clinic_id ?? null,
        clinic_name: row.clinic_id ? clinicNames[row.clinic_id] ?? null : null,
      })),
      plans: Object.values(planCounts),
      mrr,
      arr: mrr * 12,
      avg_ticket: avgTicket,
      trial_count: trialCount,
      trials_expiring: trialsExpiring,
      paid_clients: paidContracts,
      active_plan_contracts: paidContracts + trialCount,
      canceled_count: canceledContracts,
      growth,
      plans_catalog_count: (plansCatalog.data ?? []).length,
    };
  });

// ------------------------------------------------------------
// Clinics list (rich)
// ------------------------------------------------------------
const listClinicsFiltersSchema = z.object({
  segment: z.enum(["production", "test", "inactive", "all"]).default("production"),
  status: z.string().optional(),
  plan_code: z.string().optional(),
});

export const listClinicsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => listClinicsFiltersSchema.parse(d ?? {}))
  .handler(async ({ data: filters, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const queryClient = supabaseAdmin;
    const serviceClient = supabaseAdmin;

    const { data: clinics, error } = await queryClient
      .from("clinics")
      .select("id, nome, slug, plan, status, active, created_at, updated_at, settings_id, trial_ends_at")
      .neq("status", "deleted")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const rawClinics = clinics ?? [];

    const ids = rawClinics.map((c: any) => c.id);
    const settingsLookup = await loadClinicSettingsLookup(queryClient, rawClinics);
    const counts: Record<string, { users: number }> = {};
    if (ids.length) {
      const { data: mems } = await queryClient
        .from("clinic_members")
        .select("clinic_id")
        .eq("active", true)
        .in("clinic_id", ids);
      for (const m of mems ?? []) {
        counts[m.clinic_id] = counts[m.clinic_id] || { users: 0 };
        counts[m.clinic_id].users += 1;
      }
    }

    const planByClinic: Record<
      string,
      { code: string; name: string; status: string; trial_ends_at: string | null }
    > = {};
    if (ids.length) {
      const { data: cps } = await queryClient
        .from("clinic_plans")
        .select("clinic_id, status, trial_ends_at, plans(code,name)")
        .in("clinic_id", ids)
        .in("status", ["active", "trial", "suspended"])
        .order("created_at", { ascending: false });
      for (const row of (cps ?? []) as any[]) {
        if (planByClinic[row.clinic_id]) continue;
        if (row.plans) {
          planByClinic[row.clinic_id] = {
            code: row.plans.code,
            name: row.plans.name,
            status: row.status,
            trial_ends_at: row.trial_ends_at,
          };
        }
      }
    }

    let patientsByClinic: Record<string, number> = {};
    let docsByClinic: Record<string, number> = {};
    if (ids.length) {
      const [{ data: pats }, { data: docs }] = await Promise.all([
        queryClient.from("patients").select("clinic_id").in("clinic_id", ids),
        queryClient.from("clinical_documents").select("clinic_id").in("clinic_id", ids),
      ]);
      for (const p of pats ?? []) {
        if (p.clinic_id) patientsByClinic[p.clinic_id] = (patientsByClinic[p.clinic_id] || 0) + 1;
      }
      for (const d of docs ?? []) {
        if (d.clinic_id) docsByClinic[d.clinic_id] = (docsByClinic[d.clinic_id] || 0) + 1;
      }
    }

    // legacy estimate (fallback) — kept for clinics without clinic_id on old rows
    if (ids.length && Object.keys(patientsByClinic).length === 0) {
      const { data: mems } = await queryClient
        .from("clinic_members")
        .select("clinic_id, user_id")
        .in("clinic_id", ids)
        .eq("active", true);
      const userToClinic: Record<string, string> = {};
      for (const m of mems ?? []) userToClinic[m.user_id] = m.clinic_id;
      const userIds = Object.keys(userToClinic);
      if (userIds.length) {
        const { data: pats } = await queryClient
          .from("patients")
          .select("id, created_by")
          .in("created_by", userIds);
        for (const p of pats ?? []) {
          if (!p.created_by) continue;
          const cid = userToClinic[p.created_by as string];
          if (cid) patientsByClinic[cid] = (patientsByClinic[cid] || 0) + 1;
        }
      }
    }

    // Owners (role=owner) per clinic
    const ownerByClinic: Record<
      string,
      { member_id: string; user_id: string; active: boolean; created_at: string }
    > = {};
    if (ids.length) {
      const { data: owners } = await queryClient
        .from("clinic_members")
        .select("id, clinic_id, user_id, active, created_at")
        .in("clinic_id", ids)
        .eq("role", "owner")
        .order("created_at", { ascending: true });
      for (const o of owners ?? []) {
        if (!ownerByClinic[o.clinic_id])
          ownerByClinic[o.clinic_id] = {
            member_id: o.id,
            user_id: o.user_id,
            active: !!o.active,
            created_at: o.created_at,
          };
      }
    }

    const ownerUserIds = Array.from(
      new Set(Object.values(ownerByClinic).map((o) => o.user_id)),
    );
    const authByUser: Record<
      string,
      { email: string | null; confirmed_at: string | null; invited_at: string | null }
    > = {};
    if (ownerUserIds.length && serviceClient) {
      try {
        const { data: list } = await serviceClient.auth.admin.listUsers({
          page: 1,
          perPage: 200,
        });
        for (const u of list?.users ?? []) {
          if (!ownerUserIds.includes(u.id)) continue;
          authByUser[u.id] = {
            email: u.email ?? null,
            confirmed_at: (u as any).email_confirmed_at ?? null,
            invited_at:
              (u as any).invited_at ??
              (u as any).confirmation_sent_at ??
              u.created_at ??
              null,
          };
        }
      } catch (e) {
        console.error("[listClinicsAdmin] auth.admin.listUsers", e);
      }
    }

    // Lazy reconciliation: confirmed owner still pending → activate + audit.
    const now = Date.now();
    const EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;
    const ownerEntries = serviceClient ? Object.entries(ownerByClinic) : [];
    for (const [clinicId, owner] of ownerEntries) {
      const auth = authByUser[owner.user_id];
      if (auth?.confirmed_at && !owner.active) {
        const { error: actErr } = await serviceClient
          .from("clinic_members")
          .update({ active: true })
          .eq("id", owner.member_id);
        if (!actErr) {
          owner.active = true;
          await logAudit(
            serviceClient,
            context.userId,
            "clinic.owner_activated",
            "clinic_member",
            owner.member_id,
            null,
            { clinic_id: clinicId, email: auth.email },
          );
        }
      }
    }

    const resolvedRows = rawClinics.map((c: any) => {
      const nameFields = resolveClinicNameFields(c, settingsLookup);
      const segment = segmentClinic({
        status: c.status,
        is_test: !!(c as any).is_test,
        ...nameFields,
      });
      const protectedMove = isProtectedMovePlusClinic(nameFields);
      return {
        id: c.id,
        nome: c.nome,
        slug: c.slug,
        status: c.status,
        active: c.active,
        plan: c.plan,
        nameFields,
        nome_fantasia: nameFields.nome_fantasia,
        razao_social: nameFields.razao_social,
        segment,
        protected: protectedMove,
      };
    });
    const resolvedByClinic = new Map(resolvedRows.map((row) => [row.id, row]));

    const mapped = rawClinics.map((c: any) => {
      const owner = ownerByClinic[c.id];
      const auth = owner ? authByUser[owner.user_id] : undefined;
      let owner_status: "active" | "pending" | "expired" | "none" = "none";
      if (owner) {
        if (auth?.confirmed_at) owner_status = "active";
        else if (
          auth?.invited_at &&
          now - new Date(auth.invited_at).getTime() > EXPIRY_MS
        )
          owner_status = "expired";
        else owner_status = "pending";
      }
      const planInfo = planByClinic[c.id];
      const resolved = resolvedByClinic.get(c.id);
      const nameFields = resolved?.nameFields ?? resolveClinicNameFields(c, settingsLookup);
      const nome_fantasia = nameFields.nome_fantasia;
      const trialEndsAt = planInfo?.trial_ends_at ?? c.trial_ends_at ?? null;
      const trialDaysLeft =
        trialEndsAt != null
          ? Math.max(
              0,
              Math.ceil(
                (new Date(trialEndsAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000),
              ),
            )
          : null;
      const rowSegment = resolved?.segment ?? segmentClinic({
        status: c.status,
        is_test: !!(c as any).is_test,
        ...nameFields,
      });
      return {
        id: c.id,
        nome: c.nome,
        nome_fantasia,
        slug: c.slug,
        plan: c.plan,
        plan_label: planInfo?.name ?? c.plan ?? "—",
        plan_status: planInfo?.status ?? null,
        plan_code: planInfo?.code ?? c.plan ?? null,
        trial_ends_at: trialEndsAt,
        trial_days_left: trialDaysLeft,
        status: c.status,
        is_test: !!(c as any).is_test,
        segment: rowSegment,
        protected: resolved?.protected ?? isProtectedMovePlusClinic(nameFields),
        test_candidate: isKnownTestClinicCandidate(nameFields),
        active: c.active,
        created_at: c.created_at,
        updated_at: c.updated_at,
        user_count: counts[c.id]?.users ?? 0,
        patient_count: patientsByClinic[c.id] ?? 0,
        document_count: docsByClinic[c.id] ?? 0,
        owner_email: auth?.email ?? null,
        owner_user_id: owner?.user_id ?? null,
        owner_member_id: owner?.member_id ?? null,
        owner_status,
        owner_invited_at: auth?.invited_at ?? null,
        owner_confirmed_at: auth?.confirmed_at ?? null,
      };
    });

    const filtered = mapped.filter((row) => {
      const effectiveSegment = row.protected ? "production" : row.segment;
      if (filters.segment !== "all" && effectiveSegment !== filters.segment) return false;
      if (filters.status && filters.status !== "all" && row.status !== filters.status) return false;
      if (filters.plan_code && filters.plan_code !== "all") {
        const code = row.plan_code ?? row.plan;
        if (code !== filters.plan_code) return false;
      }
      return true;
    });
    return filtered;
  });

// ------------------------------------------------------------
// Commercial center (derived SaaS billing/health view)
// ------------------------------------------------------------
function monthCompetence(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function sameMonthDay(base: string | null | undefined, date = new Date()) {
  if (!base) return null;
  const started = new Date(base);
  if (Number.isNaN(started.getTime())) return null;
  const due = new Date(date.getFullYear(), date.getMonth(), started.getDate());
  return due.toISOString();
}

function daysUntil(dateIso: string | null | undefined) {
  if (!dateIso) return null;
  const t = new Date(dateIso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.ceil((t - Date.now()) / (24 * 60 * 60 * 1000));
}

function commercialRisk(score: number): "baixo" | "medio" | "alto" {
  if (score < 45) return "alto";
  if (score < 70) return "medio";
  return "baixo";
}

export const getSaasCommercialCenter = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const last30 = new Date();
    last30.setDate(last30.getDate() - 30);
    const now = new Date();

    const [clinicsRes, plansRes, membersRes, patientsRes, docsRes, apptsRes, evolRes, assessRes, auditRes] =
      await Promise.all([
        supabaseAdmin
          .from("clinics")
          .select("id, nome, slug, status, active, plan, created_at, updated_at, trial_ends_at, canceled_at, settings_id")
          .neq("status", "deleted"),
        supabaseAdmin
          .from("clinic_plans")
          .select(
            "id, clinic_id, plan_id, status, started_at, trial_ends_at, canceled_at, created_at, updated_at, plans(code,name,monthly_price,price_cents,max_users,max_patients,max_documents_month,max_storage_mb,modules)",
          )
          .order("created_at", { ascending: false }),
        supabaseAdmin.from("clinic_members").select("clinic_id").eq("active", true),
        supabaseAdmin.from("patients").select("clinic_id"),
        supabaseAdmin.from("clinical_documents").select("clinic_id, issued_at").gte("issued_at", monthStart.toISOString()),
        supabaseAdmin.from("appointments").select("clinic_id, data").gte("data", last30.toISOString().slice(0, 10)),
        supabaseAdmin.from("evolutions").select("clinic_id, data").gte("data", last30.toISOString().slice(0, 10)),
        supabaseAdmin.from("assessments").select("clinic_id, data").gte("data", last30.toISOString().slice(0, 10)),
        supabaseAdmin
          .from("saas_audit_log")
          .select("id, clinic_id, action, created_at, old_data, new_data")
          .order("created_at", { ascending: false })
          .limit(200),
      ]);

    for (const res of [clinicsRes, plansRes, membersRes, patientsRes, docsRes, apptsRes, evolRes, assessRes, auditRes]) {
      if (res.error) throw new Error(res.error.message);
    }

    const clinics = clinicsRes.data ?? [];
    const settingsLookup = await loadClinicSettingsLookup(supabaseAdmin, clinics);
    const commercialClinics = clinics.filter((c: any) =>
      segmentClinic({
        status: c.status,
        is_test: !!(c as any).is_test,
        ...resolveClinicNameFields(c, settingsLookup),
      }) === "production",
    );
    const commercialClinicIds = new Set(commercialClinics.map((c: any) => c.id));
    const clinicName: Record<string, string> = {};
    for (const c of commercialClinics) clinicName[c.id] = c.nome;

    const activePlanByClinic: Record<string, any> = {};
    for (const cp of plansRes.data ?? []) {
      if (!commercialClinicIds.has(cp.clinic_id)) continue;
      if (activePlanByClinic[cp.clinic_id]) continue;
      if (["active", "trial", "suspended", "canceled"].includes(cp.status)) {
        activePlanByClinic[cp.clinic_id] = cp;
      }
    }

    const count = (rows: any[] | null, field = "clinic_id") => {
      const out: Record<string, number> = {};
      for (const row of rows ?? []) {
        const cid = row[field];
        if (cid) out[cid] = (out[cid] ?? 0) + 1;
      }
      return out;
    };

    const users = count(membersRes.data);
    const patients = count(patientsRes.data);
    const docsMonth = count(docsRes.data);
    const appts = count(apptsRes.data);
    const evols = count(evolRes.data);
    const assessments = count(assessRes.data);
    const lastActivity: Record<string, string> = {};
    for (const rows of [docsRes.data ?? [], apptsRes.data ?? [], evolRes.data ?? [], assessRes.data ?? []]) {
      for (const r of rows as any[]) {
        const cid = r.clinic_id;
        const stamp = r.issued_at ?? r.data;
        if (!cid || !stamp) continue;
        if (!lastActivity[cid] || new Date(stamp).getTime() > new Date(lastActivity[cid]).getTime()) {
          lastActivity[cid] = stamp;
        }
      }
    }

    const subscriptions = commercialClinics.map((c: any) => {
      const cp = activePlanByClinic[c.id];
      const plan = cp?.plans ?? null;
      const monthly = Number(plan?.monthly_price ?? ((plan?.price_cents ?? 0) / 100)) || 0;
      const clinicalActivity = (appts[c.id] ?? 0) + (evols[c.id] ?? 0) + (assessments[c.id] ?? 0) + (docsMonth[c.id] ?? 0);
      const planStatus = cp?.status ?? (c.status === "active" ? "none" : c.status);
      const trialDays = daysUntil(cp?.trial_ends_at ?? c.trial_ends_at);
      let score = 35;
      if (c.status === "active") score += 15;
      if (planStatus === "active") score += 15;
      if (planStatus === "trial") score += 8;
      if ((users[c.id] ?? 0) > 0) score += 10;
      if ((patients[c.id] ?? 0) > 0) score += 10;
      if (clinicalActivity > 0) score += 15;
      if (clinicalActivity >= 10) score += 10;
      if (["suspended", "canceled", "inactive"].includes(c.status) || ["suspended", "canceled"].includes(planStatus)) score -= 30;
      if (planStatus === "trial" && trialDays != null && trialDays <= 3) score -= 10;
      score = Math.max(0, Math.min(100, score));
      return {
        clinic_id: c.id,
        clinic_name: c.nome,
        clinic_slug: c.slug ?? null,
        clinic_status: c.status,
        plan_code: plan?.code ?? c.plan ?? null,
        plan_name: plan?.name ?? c.plan ?? "Sem plano",
        plan_status: planStatus,
        started_at: cp?.started_at ?? c.created_at ?? null,
        trial_ends_at: cp?.trial_ends_at ?? c.trial_ends_at ?? null,
        canceled_at: cp?.canceled_at ?? c.canceled_at ?? null,
        monthly_value: monthly,
        next_due_at: planStatus === "trial" ? (cp?.trial_ends_at ?? c.trial_ends_at ?? null) : sameMonthDay(cp?.started_at ?? c.created_at),
        health_score: score,
        churn_risk: commercialRisk(score),
        usage: {
          users: users[c.id] ?? 0,
          patients: patients[c.id] ?? 0,
          documents_month: docsMonth[c.id] ?? 0,
          clinical_activity_30d: clinicalActivity,
          last_activity_at: lastActivity[c.id] ?? null,
        },
        limits: {
          max_users: plan?.max_users ?? null,
          max_patients: plan?.max_patients ?? null,
          max_documents_month: plan?.max_documents_month ?? null,
          max_storage_mb: plan?.max_storage_mb ?? null,
          modules: Array.isArray(plan?.modules) ? plan.modules : [],
        },
      };
    });

    const competence = monthCompetence(now);
    const monthlyFees = subscriptions.map((s) => {
      const dueDays = daysUntil(s.next_due_at);
      const status =
        s.plan_status === "trial"
          ? "trial"
          : s.plan_status === "canceled"
            ? "canceled"
            : s.plan_status === "suspended" || s.clinic_status === "suspended"
              ? "suspended"
              : dueDays != null && dueDays < 0
                ? "overdue"
                : "open";
      return {
        clinic_id: s.clinic_id,
        clinic_name: s.clinic_name,
        competence,
        due_at: s.next_due_at,
        amount: s.monthly_value,
        status,
        source: "derived" as const,
      };
    });

    const history = (auditRes.data ?? []).map((row: any) => ({
      id: row.id,
      clinic_id: row.clinic_id ?? null,
      clinic_name: row.clinic_id ? clinicName[row.clinic_id] ?? null : null,
      action: row.action,
      created_at: row.created_at,
      old_data: row.old_data ?? null,
      new_data: row.new_data ?? null,
    }));

    return {
      summary: {
        active_subscriptions: subscriptions.filter((s) => s.plan_status === "active" && s.clinic_status === "active").length,
        trials: subscriptions.filter((s) => s.plan_status === "trial" && s.clinic_status === "active").length,
        suspended: subscriptions.filter((s) => s.plan_status === "suspended" || s.clinic_status === "suspended").length,
        canceled: subscriptions.filter((s) => s.plan_status === "canceled" || s.clinic_status === "canceled").length,
        overdue: monthlyFees.filter((m) => m.status === "overdue").length,
        trials_expiring: subscriptions.filter((s) => s.plan_status === "trial" && (daysUntil(s.trial_ends_at) ?? 99) <= 7).length,
        at_risk: subscriptions.filter((s) => s.churn_risk === "alto").length,
        average_health_score: subscriptions.length
          ? Math.round(subscriptions.reduce((sum, s) => sum + s.health_score, 0) / subscriptions.length)
          : 0,
        estimated_mrr: subscriptions
          .filter((s) => s.plan_status === "active" && s.clinic_status === "active")
          .reduce((sum, s) => sum + s.monthly_value, 0),
      },
      subscriptions,
      monthly_fees: monthlyFees,
      upcoming_due: monthlyFees
        .filter((m) => m.due_at && ["open", "trial"].includes(m.status) && (daysUntil(m.due_at) ?? 99) <= 7)
        .slice(0, 20),
      overdue: monthlyFees.filter((m) => m.status === "overdue").slice(0, 20),
      trials_expiring: subscriptions
        .filter((s) => s.plan_status === "trial" && (daysUntil(s.trial_ends_at) ?? 99) <= 7)
        .slice(0, 20),
      at_risk: subscriptions.filter((s) => s.churn_risk === "alto").slice(0, 20),
      history,
    };
  });

// ------------------------------------------------------------
// Status change
// ------------------------------------------------------------
const setStatusInput = z.object({
  id: z.string().uuid(),
  status: z.enum(STATUS_VALUES),
});
export const setClinicStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => setStatusInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.status !== "active") {
      await assertClinicNotProtected(supabaseAdmin, data.id);
    }
    const { data: prev } = await supabaseAdmin
      .from("clinics")
      .select("status, trial_ends_at")
      .eq("id", data.id)
      .maybeSingle();
    const { error } = await supabaseAdmin
      .from("clinics")
      .update({
        status: data.status,
        ...(data.status === "active" ? { trial_ends_at: prev?.trial_ends_at ?? null } : {}),
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    const currentPlan = await getCurrentPlanRow(supabaseAdmin, data.id);
    if (data.status === "suspended" && currentPlan) {
      await supabaseAdmin
        .from("clinic_plans")
        .update({ status: "suspended" })
        .eq("id", currentPlan.id);
    }
    if (data.status === "active") {
      const { data: suspendedPlan } = await supabaseAdmin
        .from("clinic_plans")
        .select("id, trial_ends_at")
        .eq("clinic_id", data.id)
        .eq("status", "suspended")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (suspendedPlan) {
        const restoreStatus = suspendedPlan.trial_ends_at ? "trial" : "active";
        await supabaseAdmin
          .from("clinic_plans")
          .update({ status: restoreStatus })
          .eq("id", suspendedPlan.id);
      } else if (currentPlan?.status === "suspended") {
        await supabaseAdmin
          .from("clinic_plans")
          .update({ status: "active" })
          .eq("id", currentPlan.id);
      }
    }
    if (data.status === "canceled") {
      await supabaseAdmin
        .from("clinic_plans")
        .update({ status: "canceled", canceled_at: new Date().toISOString() })
        .eq("clinic_id", data.id)
        .in("status", ["active", "trial", "suspended"]);
    }

    const action =
      data.status === "active"
        ? "clinic.activate"
        : data.status === "suspended"
          ? "clinic.suspend"
          : data.status === "canceled"
            ? "clinic.cancel"
            : "clinic.deactivate";
    await logAudit(
      supabaseAdmin,
      context.userId,
      action,
      "clinic",
      data.id,
      prev,
      { status: data.status },
      data.id,
    );
    return { ok: true };
  });

const trialDaysInput = z.object({
  clinic_id: z.string().uuid(),
  days: z.number().int().min(1).max(365).default(14),
});

export const startClinicTrial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => trialDaysInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const endsAt = trialEndsInDays(data.days);
    const planId = await resolvePlanIdForClinic(supabaseAdmin, data.clinic_id);
    if (!planId) throw new Error("Clínica sem plano vinculado. Atribua um plano antes do trial.");

    const current = await getCurrentPlanRow(supabaseAdmin, data.clinic_id);
    if (current) {
      const { error } = await supabaseAdmin
        .from("clinic_plans")
        .update({ status: "trial", trial_ends_at: endsAt })
        .eq("id", current.id);
      if (error) throw new Error(error.message);
    } else {
      await supabaseAdmin
        .from("clinic_plans")
        .update({ status: "canceled", canceled_at: new Date().toISOString() })
        .eq("clinic_id", data.clinic_id)
        .in("status", ["active", "trial"]);
      const { error } = await supabaseAdmin.from("clinic_plans").insert({
        clinic_id: data.clinic_id,
        plan_id: planId,
        status: "trial",
        trial_ends_at: endsAt,
      });
      if (error) throw new Error(error.message);
    }

    await supabaseAdmin
      .from("clinics")
      .update({ status: "active", trial_ends_at: endsAt })
      .eq("id", data.clinic_id);

    await logAudit(
      supabaseAdmin,
      context.userId,
      "clinic.trial_start",
      "clinic",
      data.clinic_id,
      null,
      { days: data.days, trial_ends_at: endsAt },
      data.clinic_id,
    );
    return { ok: true, trial_ends_at: endsAt };
  });

export const extendClinicTrial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => trialDaysInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const current = await getCurrentPlanRow(supabaseAdmin, data.clinic_id);
    if (!current || current.status !== "trial") {
      throw new Error("A clínica não está em trial.");
    }
    const base = current.trial_ends_at ? new Date(current.trial_ends_at) : new Date();
    base.setDate(base.getDate() + data.days);
    const endsAt = base.toISOString();

    await supabaseAdmin
      .from("clinic_plans")
      .update({ trial_ends_at: endsAt })
      .eq("id", current.id);
    await supabaseAdmin
      .from("clinics")
      .update({ status: "active", trial_ends_at: endsAt })
      .eq("id", data.clinic_id);

    await logAudit(
      supabaseAdmin,
      context.userId,
      "clinic.trial_extend",
      "clinic",
      data.clinic_id,
      { trial_ends_at: current.trial_ends_at },
      { days: data.days, trial_ends_at: endsAt },
      data.clinic_id,
    );
    return { ok: true, trial_ends_at: endsAt };
  });

export const convertTrialToActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ clinic_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const current = await getCurrentPlanRow(supabaseAdmin, data.clinic_id);
    if (!current || current.status !== "trial") {
      throw new Error("A clínica não está em trial.");
    }
    await supabaseAdmin
      .from("clinic_plans")
      .update({ status: "active", trial_ends_at: null })
      .eq("id", current.id);
    await supabaseAdmin
      .from("clinics")
      .update({ status: "active", trial_ends_at: null })
      .eq("id", data.clinic_id);

    await logAudit(
      supabaseAdmin,
      context.userId,
      "clinic.trial_convert",
      "clinic",
      data.clinic_id,
      { plan_status: "trial" },
      { plan_status: "active" },
      data.clinic_id,
    );
    return { ok: true };
  });

export const cancelClinicSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ clinic_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertClinicNotProtected(supabaseAdmin, data.clinic_id);
    const { data: prev } = await supabaseAdmin
      .from("clinics")
      .select("status")
      .eq("id", data.clinic_id)
      .maybeSingle();

    await supabaseAdmin
      .from("clinics")
      .update({ status: "canceled" })
      .eq("id", data.clinic_id);
    await supabaseAdmin
      .from("clinic_plans")
      .update({ status: "canceled", canceled_at: new Date().toISOString() })
      .eq("clinic_id", data.clinic_id)
      .in("status", ["active", "trial", "suspended"]);

    await logAudit(
      supabaseAdmin,
      context.userId,
      "clinic.cancel",
      "clinic",
      data.clinic_id,
      prev,
      { status: "canceled" },
      data.clinic_id,
    );
    return { ok: true };
  });

// ------------------------------------------------------------
// Provision new clinic
// ------------------------------------------------------------
const provisionInput = z.object({
  nome: z.string().min(2, "Nome obrigatório"),
  plan_code: z.string().min(1),
  owner_email: z.string().email().optional().or(z.literal("")),
  nome_fantasia: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().max(2).optional(),
  start_as_trial: z.boolean().optional(),
  trial_days: z.number().int().min(1).max(365).optional(),
});
export const provisionClinic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => provisionInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let ownerUserId: string | null = null;
    let ownerInvited = false;
    let ownerExisted = false;
    let ownerEmail: string | null = null;

    if (data.owner_email && data.owner_email.trim()) {
      ownerEmail = data.owner_email.trim().toLowerCase();
      const { data: usersList, error: uErr } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 200,
      });
      if (uErr) throw new Error("Falha ao buscar usuários: " + uErr.message);
      const found = usersList?.users?.find(
        (u: any) => u.email?.toLowerCase() === ownerEmail,
      );
      if (found) {
        ownerUserId = found.id;
        ownerExisted = !!(found as any).email_confirmed_at;
      } else {
        const redirectTo = `${process.env.SITE_URL ?? "https://fisioos.app"}/set-password`;
        const { data: invited, error: invErr } =
          await supabaseAdmin.auth.admin.inviteUserByEmail(ownerEmail, {
            redirectTo,
          });
        if (invErr) throw new Error("Falha ao convidar proprietário: " + invErr.message);
        ownerUserId = invited.user?.id ?? null;
        ownerInvited = true;
        if (ownerUserId) {
          await supabaseAdmin
            .from("profiles")
            .upsert(
              { id: ownerUserId, email: ownerEmail, full_name: ownerEmail },
              { onConflict: "id" },
            );
        }
      }
    }

    const result = await provisionClinicFallback({
      nome: data.nome,
      plan_code: data.plan_code,
      owner_user_id: ownerUserId,
      owner_pending: ownerInvited,
      nome_fantasia: data.nome_fantasia,
      cidade: data.cidade,
      estado: data.estado,
      start_as_trial: data.start_as_trial,
      trial_days: data.trial_days ?? 14,
      supabaseAdmin,
    });

    await logAudit(
      supabaseAdmin,
      context.userId,
      "clinic.create",
      "clinic",
      result.clinic_id,
      null,
      { nome: data.nome, slug: result.slug, plan_code: data.plan_code },
    );

    if (ownerInvited && ownerEmail) {
      await logAudit(
        supabaseAdmin,
        context.userId,
        "clinic.owner_invited",
        "clinic",
        result.clinic_id,
        null,
        { email: ownerEmail, user_id: ownerUserId },
      );
    }

    return {
      ...result,
      owner_invited: ownerInvited,
      owner_existed: ownerExisted,
      owner_email: ownerEmail,
    };
  });

async function provisionClinicFallback(args: {
  nome: string;
  plan_code: string;
  owner_user_id: string | null;
  owner_pending?: boolean;
  nome_fantasia?: string;
  cidade?: string;
  estado?: string;
  start_as_trial?: boolean;
  trial_days?: number;
  supabaseAdmin: any;
}) {
  const { supabaseAdmin } = args;

  const { data: plan, error: pErr } = await supabaseAdmin
    .from("plans")
    .select("id")
    .eq("code", args.plan_code)
    .eq("active", true)
    .single();
  if (pErr || !plan) throw new Error("Plano inexistente: " + args.plan_code);

  const { data: slugData, error: slugErr } = await supabaseAdmin.rpc(
    "generate_clinic_slug",
    { _name: args.nome },
  );
  if (slugErr) throw new Error("Falha ao gerar slug: " + slugErr.message);
  const slug = slugData as string;

  const { data: settings, error: sErr } = await supabaseAdmin
    .from("clinic_settings")
    .insert({
      nome_fantasia: args.nome_fantasia || args.nome,
      cidade: args.cidade || null,
      estado: args.estado || null,
    })
    .select("id")
    .single();
  if (sErr) throw new Error("Falha em clinic_settings: " + sErr.message);

  const { data: clinic, error: cErr } = await supabaseAdmin
    .from("clinics")
    .insert({
      nome: args.nome,
      slug,
      plan: args.plan_code,
      settings_id: settings.id,
      active: true,
      status: "active",
    })
    .select("id")
    .single();
  if (cErr) throw new Error("Falha em clinics: " + cErr.message);

  await supabaseAdmin
    .from("clinic_settings")
    .update({ clinic_id: clinic.id })
    .eq("id", settings.id);

  const trialEnds = args.start_as_trial ? trialEndsInDays(args.trial_days ?? 14) : null;
  await supabaseAdmin.from("clinic_plans").insert({
    clinic_id: clinic.id,
    plan_id: plan.id,
    status: args.start_as_trial ? "trial" : "active",
    trial_ends_at: trialEnds,
  });

  if (args.start_as_trial && trialEnds) {
    await supabaseAdmin.from("clinics").update({ trial_ends_at: trialEnds }).eq("id", clinic.id);
  }

  if (args.owner_user_id) {
    await supabaseAdmin.from("clinic_members").insert({
      clinic_id: clinic.id,
      user_id: args.owner_user_id,
      role: "owner",
      is_default: false,
      active: args.owner_pending ? false : true,
    });
  }

  // Seed genérico de templates default por clínica (idempotente)
  const { error: seedErr } = await supabaseAdmin.rpc(
    "seed_default_document_templates",
    { _clinic_id: clinic.id },
  );
  if (seedErr) {
    console.error("[provisionClinicFallback] seed_default_document_templates", seedErr);
  }

  return { clinic_id: clinic.id, slug };
}

// ------------------------------------------------------------
// Owner management (invite-driven)
// ------------------------------------------------------------
function getInviteRedirect() {
  return `${process.env.SITE_URL ?? "https://fisioos.app"}/set-password`;
}

export const resendOwnerInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ clinic_id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: owner } = await supabaseAdmin
      .from("clinic_members")
      .select("id, user_id")
      .eq("clinic_id", data.clinic_id)
      .eq("role", "owner")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (!owner) throw new Error("Esta clínica não possui proprietário definido.");
    const { data: u, error: uErr } = await supabaseAdmin.auth.admin.getUserById(
      owner.user_id,
    );
    if (uErr) throw new Error(uErr.message);
    const email = u.user?.email;
    if (!email) throw new Error("Proprietário sem e-mail no Auth.");
    const { error: iErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: getInviteRedirect(),
    });
    if (iErr) throw new Error("Falha ao reenviar convite: " + iErr.message);
    await logAudit(
      supabaseAdmin,
      context.userId,
      "clinic.owner_reinvited",
      "clinic",
      data.clinic_id,
      null,
      { email },
    );
    return { ok: true };
  });

export const cancelOwnerInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ clinic_id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: owner } = await supabaseAdmin
      .from("clinic_members")
      .select("id, user_id")
      .eq("clinic_id", data.clinic_id)
      .eq("role", "owner")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (!owner) throw new Error("Esta clínica não possui proprietário definido.");
    const { data: u } = await supabaseAdmin.auth.admin.getUserById(owner.user_id);
    if (u?.user?.email_confirmed_at) {
      throw new Error(
        "O proprietário já ativou o acesso. Use 'Alterar e-mail' para trocá-lo.",
      );
    }
    const email = u?.user?.email ?? null;
    await supabaseAdmin.from("clinic_members").delete().eq("id", owner.id);
    await logAudit(
      supabaseAdmin,
      context.userId,
      "clinic.owner_invite_canceled",
      "clinic",
      data.clinic_id,
      null,
      { email, user_id: owner.user_id },
    );
    return { ok: true };
  });

export const changeClinicOwner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        clinic_id: z.string().uuid(),
        new_email: z.string().email(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const newEmail = data.new_email.trim().toLowerCase();

    // Remove current owner (if any)
    const { data: prev } = await supabaseAdmin
      .from("clinic_members")
      .select("id, user_id")
      .eq("clinic_id", data.clinic_id)
      .eq("role", "owner")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    let prevEmail: string | null = null;
    if (prev) {
      const { data: pu } = await supabaseAdmin.auth.admin.getUserById(prev.user_id);
      prevEmail = pu?.user?.email ?? null;
      await supabaseAdmin.from("clinic_members").delete().eq("id", prev.id);
    }

    // Resolve/invite new user
    const { data: list } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    const found = list?.users?.find((u: any) => u.email?.toLowerCase() === newEmail);
    let userId: string | null = null;
    let pending = false;
    if (found) {
      userId = found.id;
      pending = !(found as any).email_confirmed_at;
    } else {
      const { data: invited, error: invErr } =
        await supabaseAdmin.auth.admin.inviteUserByEmail(newEmail, {
          redirectTo: getInviteRedirect(),
        });
      if (invErr) throw new Error("Falha ao convidar proprietário: " + invErr.message);
      userId = invited.user?.id ?? null;
      pending = true;
      if (userId) {
        await supabaseAdmin
          .from("profiles")
          .upsert(
            { id: userId, email: newEmail, full_name: newEmail },
            { onConflict: "id" },
          );
      }
    }
    if (!userId) throw new Error("Falha ao resolver novo proprietário.");

    await supabaseAdmin.from("clinic_members").insert({
      clinic_id: data.clinic_id,
      user_id: userId,
      role: "owner",
      is_default: false,
      active: !pending,
    });

    await logAudit(
      supabaseAdmin,
      context.userId,
      "clinic.owner_changed",
      "clinic",
      data.clinic_id,
      { previous_email: prevEmail, previous_user_id: prev?.user_id ?? null },
      { new_email: newEmail, new_user_id: userId, pending },
    );
    if (pending) {
      await logAudit(
        supabaseAdmin,
        context.userId,
        "clinic.owner_invited",
        "clinic",
        data.clinic_id,
        null,
        { email: newEmail, user_id: userId },
      );
    }
    return { ok: true, pending };
  });


// ============================================================
// PLANS — Catálogo comercial CRUD
// ============================================================

const planPayload = z.object({
  code: z.string().min(2).max(40).regex(/^[a-z0-9_-]+$/, "use letras minúsculas, números, _ ou -"),
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  monthly_price: z.number().min(0).nullable().optional(),
  annual_price: z.number().min(0).nullable().optional(),
  max_users: z.number().int().min(0).nullable().optional(),
  max_patients: z.number().int().min(0).nullable().optional(),
  max_documents_month: z.number().int().min(0).nullable().optional(),
  max_storage_mb: z.number().int().min(0).nullable().optional(),
  modules: z.array(z.string()).default([]),
  active: z.boolean().default(true),
  featured: z.boolean().default(false),
  sort_order: z.number().int().default(0),
});

function toRow(p: z.infer<typeof planPayload>) {
  const monthly = p.monthly_price ?? 0;
  return {
    code: p.code,
    name: p.name,
    description: p.description ?? null,
    monthly_price: p.monthly_price ?? null,
    annual_price: p.annual_price ?? null,
    price_cents: Math.round(Number(monthly) * 100),
    max_users: p.max_users ?? null,
    max_patients: p.max_patients ?? null,
    max_documents_month: p.max_documents_month ?? null,
    max_storage_mb: p.max_storage_mb ?? null,
    modules: p.modules ?? [],
    active: p.active,
    featured: p.featured,
    sort_order: p.sort_order ?? 0,
  };
}

export const listPlans = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("plans")
      .select(
        "id, code, name, description, monthly_price, annual_price, price_cents, max_users, max_patients, max_documents_month, max_storage_mb, modules, active, featured, sort_order",
      )
      .order("sort_order")
      .order("name");
    if (error) throw new Error(error.message);

    // attach in_use counts (clinics linked)
    const ids = (data ?? []).map((p: any) => p.id);
    const usage: Record<string, number> = {};
    if (ids.length) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: cps } = await supabaseAdmin
        .from("clinic_plans")
        .select("plan_id")
        .in("plan_id", ids)
        .in("status", ["active", "trial"]);
      for (const r of cps ?? []) usage[r.plan_id] = (usage[r.plan_id] || 0) + 1;
    }
    return (data ?? []).map((p: any) => ({ ...p, in_use: usage[p.id] ?? 0 }));
  });

export const createPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => planPayload.parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const row = toRow(data);
    const { data: inserted, error } = await supabaseAdmin
      .from("plans")
      .insert(row)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    await logAudit(supabaseAdmin, context.userId, "plan.create", "plan", inserted.id, null, row);
    return { id: inserted.id };
  });

export const updatePlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), patch: planPayload }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: prev } = await supabaseAdmin
      .from("plans")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    const row = toRow(data.patch);
    const { error } = await supabaseAdmin.from("plans").update(row).eq("id", data.id);
    if (error) throw new Error(error.message);
    await logAudit(supabaseAdmin, context.userId, "plan.update", "plan", data.id, prev, row);
    return { ok: true };
  });

export const togglePlanActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), active: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("plans")
      .update({ active: data.active })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await logAudit(
      supabaseAdmin,
      context.userId,
      data.active ? "plan.activate" : "plan.deactivate",
      "plan",
      data.id,
      null,
      { active: data.active },
    );
    return { ok: true };
  });

export const duplicatePlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: src, error: sErr } = await supabaseAdmin
      .from("plans")
      .select("*")
      .eq("id", data.id)
      .single();
    if (sErr || !src) throw new Error("Plano não encontrado");
    let newCode = `${src.code}-copy`;
    let n = 1;
    while (true) {
      const { data: exists } = await supabaseAdmin
        .from("plans")
        .select("id")
        .eq("code", newCode)
        .maybeSingle();
      if (!exists) break;
      n += 1;
      newCode = `${src.code}-copy-${n}`;
    }
    const { id, created_at, updated_at, ...rest } = src as any;
    const { data: inserted, error } = await supabaseAdmin
      .from("plans")
      .insert({
        ...rest,
        code: newCode,
        name: `${src.name} (cópia)`,
        active: false,
        featured: false,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    await logAudit(
      supabaseAdmin,
      context.userId,
      "plan.duplicate",
      "plan",
      inserted.id,
      { from_plan_id: data.id },
      { code: newCode },
    );
    return { ok: true };
  });

export const deletePlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: cps } = await supabaseAdmin
      .from("clinic_plans")
      .select("id")
      .eq("plan_id", data.id)
      .limit(1);
    if ((cps ?? []).length > 0)
      throw new Error("Plano em uso por clínicas. Inative em vez de excluir.");
    const { data: prev } = await supabaseAdmin
      .from("plans")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    const { error } = await supabaseAdmin.from("plans").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await logAudit(supabaseAdmin, context.userId, "plan.delete", "plan", data.id, prev, null);
    return { ok: true };
  });

export const reorderPlans = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ order: z.array(z.string().uuid()).min(1) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    for (let i = 0; i < data.order.length; i++) {
      const { error } = await supabaseAdmin
        .from("plans")
        .update({ sort_order: i + 1 })
        .eq("id", data.order[i]);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

// ------------------------------------------------------------
// Assign plan (with audit)
// ------------------------------------------------------------
const assignPlanInput = z.object({
  clinic_id: z.string().uuid(),
  plan_code: z.string().min(1),
  notes: z.string().optional(),
});
export const assignPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => assignPlanInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: plan, error: pErr } = await supabaseAdmin
      .from("plans")
      .select("id, code")
      .eq("code", data.plan_code)
      .single();
    if (pErr || !plan) throw new Error("Plano inexistente");

    const { data: current } = await supabaseAdmin
      .from("clinic_plans")
      .select("id, plan_id, plans(code)")
      .eq("clinic_id", data.clinic_id)
      .in("status", ["active", "trial"])
      .maybeSingle();

    const { error: cancelErr } = await supabaseAdmin
      .from("clinic_plans")
      .update({ status: "canceled", canceled_at: new Date().toISOString() })
      .eq("clinic_id", data.clinic_id)
      .in("status", ["active", "trial"]);
    if (cancelErr) throw new Error(`Falha ao encerrar plano anterior: ${cancelErr.message}`);

    const { error: iErr } = await supabaseAdmin.from("clinic_plans").insert({
      clinic_id: data.clinic_id,
      plan_id: plan.id,
      status: "active",
    });
    if (iErr) throw new Error(iErr.message);

    const { error: clinicErr } = await supabaseAdmin
      .from("clinics")
      .update({ plan: data.plan_code })
      .eq("id", data.clinic_id);
    if (clinicErr) throw new Error(`Falha ao espelhar plano na clínica: ${clinicErr.message}`);

    await supabaseAdmin.from("plan_change_audit").insert({
      clinic_id: data.clinic_id,
      from_plan_id: current?.plan_id ?? null,
      to_plan_id: plan.id,
      from_plan_code: (current as any)?.plans?.code ?? null,
      to_plan_code: plan.code,
      changed_by: context.userId,
      notes: data.notes ?? null,
    });

    await logAudit(
      supabaseAdmin,
      context.userId,
      "clinic.plan_change",
      "clinic",
      data.clinic_id,
      { plan_code: (current as any)?.plans?.code ?? null },
      { plan_code: plan.code, notes: data.notes ?? null },
    );

    return { ok: true };
  });

export const listPlanChangeAudit = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ clinic_id: z.string().uuid().optional() }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("plan_change_audit")
      .select("id, clinic_id, from_plan_code, to_plan_code, changed_by, notes, created_at, clinics(nome)")
      .order("created_at", { ascending: false })
      .limit(100);
    if (data.clinic_id) q = q.eq("clinic_id", data.clinic_id);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

// ------------------------------------------------------------
// Auditoria administrativa (todos os eventos)
// ------------------------------------------------------------
export const listSaasAudit = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        clinic_id: z.string().uuid().optional(),
        user_id: z.string().uuid().optional(),
        action: z.string().optional(),
        from: z.string().optional(),
        to: z.string().optional(),
        limit: z.number().int().min(1).max(500).optional(),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("saas_audit_log")
      .select(
        "id, created_at, user_id, action, entity_type, entity_id, clinic_id, old_data, new_data, details, ip_address",
      )
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 200);
    if (data.clinic_id) q = q.eq("clinic_id", data.clinic_id);
    if (data.user_id) q = q.eq("user_id", data.user_id);
    if (data.action) q = q.ilike("action", `%${data.action}%`);
    if (data.from) q = q.gte("created_at", data.from);
    if (data.to) q = q.lte("created_at", data.to);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    const userIds = Array.from(
      new Set((rows ?? []).map((r: any) => r.user_id).filter(Boolean)),
    );
    const clinicIds = Array.from(
      new Set((rows ?? []).map((r: any) => r.clinic_id).filter(Boolean)),
    );
    const emails: Record<string, string> = {};
    if (userIds.length) {
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("id, email")
        .in("id", userIds);
      for (const p of profiles ?? []) emails[p.id] = p.email ?? "";
    }
    const clinicNames: Record<string, string> = {};
    if (clinicIds.length) {
      const { data: cs } = await supabaseAdmin
        .from("clinics")
        .select("id, nome")
        .in("id", clinicIds);
      for (const c of cs ?? []) clinicNames[c.id] = c.nome;
    }
    return (rows ?? []).map((r: any) => ({
      ...r,
      user_email: emails[r.user_id] ?? null,
      clinic_name: r.clinic_id ? clinicNames[r.clinic_id] ?? null : null,
    }));
  });


// ------------------------------------------------------------
// Clinic delete (soft delete)
// ------------------------------------------------------------
const clinicCountsInput = z.object({ id: z.string().uuid() });

export const getClinicCounts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => clinicCountsInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const cid = data.id;
    const head = { count: "exact" as const, head: true };

    const [clinic, members, patients, docs, profs, attachments] = await Promise.all([
      supabaseAdmin.from("clinics").select("id, nome, slug, status").eq("id", cid).maybeSingle(),
      supabaseAdmin.from("clinic_members").select("id", head).eq("clinic_id", cid),
      supabaseAdmin.from("patients").select("id", head).eq("clinic_id", cid),
      supabaseAdmin.from("clinical_documents").select("id", head).eq("clinic_id", cid),
      supabaseAdmin.from("professionals").select("id", head).eq("clinic_id", cid),
      supabaseAdmin.from("patient_attachments").select("id", head),
    ]);

    return {
      clinic: clinic.data,
      counts: {
        members: members.count ?? 0,
        patients: patients.count ?? 0,
        documents: docs.count ?? 0,
        professionals: profs.count ?? 0,
        attachments: attachments.count ?? 0,
      },
    };
  });

const deleteClinicInput = z.object({
  id: z.string().uuid(),
  confirm_name: z.string().min(1, "Confirmação obrigatória"),
  acknowledge_documents: z.boolean().optional(),
});

export const softDeleteClinic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => deleteClinicInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: clinic, error: cErr } = await supabaseAdmin
      .from("clinics")
      .select("id, nome, slug, status")
      .eq("id", data.id)
      .maybeSingle();
    if (cErr) throw new Error(cErr.message);
    if (!clinic) throw new Error("Clínica não encontrada.");
    await assertClinicNotProtected(supabaseAdmin, data.id);
    if (clinic.status === "deleted") throw new Error("Clínica já está excluída.");

    const expected = (clinic.slug || clinic.nome || "").trim().toLowerCase();
    const given = data.confirm_name.trim().toLowerCase();
    if (given !== expected) {
      await logAudit(supabaseAdmin, context.userId, "clinic.delete_failed", "clinic", clinic.id, clinic, {
        reason: "confirmation_mismatch",
      });
      throw new Error(`Confirmação incorreta. Digite exatamente: ${clinic.slug ?? clinic.nome}`);
    }

    // White-label: confirmação genérica baseada no slug/nome da própria clínica
    // (validada acima). Sem regras hardcoded por tenant.

    // Documents emitted require explicit acknowledgement
    const { count: docCount } = await supabaseAdmin
      .from("clinical_documents")
      .select("id", { count: "exact", head: true })
      .eq("clinic_id", clinic.id);
    if ((docCount ?? 0) > 0 && !data.acknowledge_documents) {
      throw new Error(
        `Esta clínica possui ${docCount} documentos clínicos emitidos. Confirme novamente para prosseguir com a exclusão lógica.`,
      );
    }

    await logAudit(supabaseAdmin, context.userId, "clinic.delete_requested", "clinic", clinic.id, clinic, {
      docCount,
    });

    // Soft delete: status = 'deleted', active = false
    const { error: upErr } = await supabaseAdmin
      .from("clinics")
      .update({ status: "deleted", active: false })
      .eq("id", clinic.id);
    if (upErr) {
      await logAudit(supabaseAdmin, context.userId, "clinic.delete_failed", "clinic", clinic.id, clinic, {
        error: upErr.message,
      });
      throw new Error("Falha ao excluir: " + upErr.message);
    }

    // Disable members so they lose access immediately (auth users preserved).
    await supabaseAdmin
      .from("clinic_members")
      .update({ active: false })
      .eq("clinic_id", clinic.id);

    await logAudit(supabaseAdmin, context.userId, "clinic.deleted", "clinic", clinic.id, clinic, {
      docCount,
      soft: true,
    });

    return { ok: true, soft: true };
  });

// ------------------------------------------------------------
// Reset comercial controlado da Move+ (dry-run por padrão)
// ------------------------------------------------------------
const movePlusResetInput = z.object({
  clinic_id: z.string().uuid().optional(),
  dry_run: z.boolean().default(true),
  confirm: z.string().optional(),
});

const MOVE_PLUS_RESET_CONFIRMATION = "RESET MOVE+";

const MOVE_PLUS_RESET_TABLES = [
  "clinical_signatures",
  "receipts",
  "patient_package_usages",
  "patient_package_contracts",
  "financial_entries",
  "financial_installment_plans",
  "reassessment_schedule",
  "clinical_documents",
  "evolutions",
  "assessments",
  "patient_discharges",
  "appointments",
] as const;

type MovePlusResetTable = (typeof MOVE_PLUS_RESET_TABLES)[number];
type MovePlusResetCounts = Record<MovePlusResetTable, number>;

function emptyMovePlusResetCounts(): MovePlusResetCounts {
  return Object.fromEntries(MOVE_PLUS_RESET_TABLES.map((table) => [table, 0])) as MovePlusResetCounts;
}

async function countByClinic(supabaseAdmin: any, table: string, clinicId: string) {
  const { count, error } = await supabaseAdmin
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("clinic_id", clinicId);
  if (error) throw new Error(`${table}: ${error.message}`);
  return count ?? 0;
}

async function countByIds(supabaseAdmin: any, table: string, column: string, ids: string[]) {
  if (ids.length === 0) return 0;
  const { count, error } = await supabaseAdmin
    .from(table)
    .select("id", { count: "exact", head: true })
    .in(column, ids);
  if (error) throw new Error(`${table}: ${error.message}`);
  return count ?? 0;
}

async function deleteByClinic(supabaseAdmin: any, table: string, clinicId: string) {
  const { error } = await supabaseAdmin.from(table).delete().eq("clinic_id", clinicId);
  if (error) throw new Error(`${table}: ${error.message}`);
}

async function deleteByIds(supabaseAdmin: any, table: string, column: string, ids: string[]) {
  if (ids.length === 0) return;
  const { error } = await supabaseAdmin.from(table).delete().in(column, ids);
  if (error) throw new Error(`${table}: ${error.message}`);
}

async function findMovePlusClinicForReset(supabaseAdmin: any, clinicId?: string) {
  let query = supabaseAdmin
    .from("clinics")
    .select("id, nome, slug, status, active, settings_id")
    .neq("status", "deleted");
  if (clinicId) query = query.eq("id", clinicId);

  const { data: clinics, error } = await query;
  if (error) throw new Error(error.message);
  const rows = clinics ?? [];
  const settingsLookup = await loadClinicSettingsLookup(supabaseAdmin, rows);
  const protectedClinics = rows
    .map((clinic: any) => ({
      ...clinic,
      nameFields: resolveClinicNameFields(clinic, settingsLookup),
    }))
    .filter((clinic: any) => isProtectedMovePlusClinic(clinic.nameFields));

  if (protectedClinics.length === 0) {
    throw new Error("Clínica Move+ protegida não encontrada para reset.");
  }

  return protectedClinics.find((clinic: any) => clinic.active) ?? protectedClinics[0];
}

async function collectMovePlusResetCounts(supabaseAdmin: any, clinicId: string) {
  const counts = emptyMovePlusResetCounts();
  const { data: patients } = await supabaseAdmin
    .from("patients")
    .select("id")
    .eq("clinic_id", clinicId);
  const patientIds = (patients ?? []).map((patient: any) => patient.id).filter(Boolean);

  counts.receipts = await countByClinic(supabaseAdmin, "receipts", clinicId);
  counts.patient_package_usages = await countByClinic(supabaseAdmin, "patient_package_usages", clinicId);
  counts.patient_package_contracts = await countByClinic(supabaseAdmin, "patient_package_contracts", clinicId);
  counts.financial_entries = await countByClinic(supabaseAdmin, "financial_entries", clinicId);
  counts.financial_installment_plans = await countByClinic(supabaseAdmin, "financial_installment_plans", clinicId);
  counts.reassessment_schedule = await countByClinic(supabaseAdmin, "reassessment_schedule", clinicId);
  counts.clinical_documents = await countByClinic(supabaseAdmin, "clinical_documents", clinicId);
  counts.evolutions = await countByClinic(supabaseAdmin, "evolutions", clinicId);
  counts.assessments = await countByClinic(supabaseAdmin, "assessments", clinicId);
  counts.appointments = await countByClinic(supabaseAdmin, "appointments", clinicId);
  counts.clinical_signatures = await countByIds(supabaseAdmin, "clinical_signatures", "patient_id", patientIds);
  counts.patient_discharges = await countByIds(supabaseAdmin, "patient_discharges", "patient_id", patientIds);

  return { counts, patientIds };
}

export const resetMovePlusDemoData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => movePlusResetInput.parse(d ?? {}))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const clinic = await findMovePlusClinicForReset(supabaseAdmin, data.clinic_id);
    const before = await collectMovePlusResetCounts(supabaseAdmin, clinic.id);

    if (data.dry_run) {
      return {
        ok: true,
        dry_run: true,
        clinic: { id: clinic.id, nome: clinic.nome, slug: clinic.slug },
        counts: before.counts,
        preserved: [
          "clinics",
          "users",
          "clinic_members",
          "plans",
          "clinic_plans",
          "clinic_settings",
          "document_templates",
          "patients",
          "roles/permissions",
        ],
      };
    }

    if (data.confirm !== MOVE_PLUS_RESET_CONFIRMATION) {
      throw new Error(`Confirmação inválida. Digite exatamente: ${MOVE_PLUS_RESET_CONFIRMATION}`);
    }

    await deleteByIds(supabaseAdmin, "clinical_signatures", "patient_id", before.patientIds);
    await deleteByClinic(supabaseAdmin, "receipts", clinic.id);
    await deleteByClinic(supabaseAdmin, "patient_package_usages", clinic.id);
    await deleteByClinic(supabaseAdmin, "patient_package_contracts", clinic.id);
    await deleteByClinic(supabaseAdmin, "financial_entries", clinic.id);
    await deleteByClinic(supabaseAdmin, "financial_installment_plans", clinic.id);
    await deleteByClinic(supabaseAdmin, "reassessment_schedule", clinic.id);
    await deleteByClinic(supabaseAdmin, "clinical_documents", clinic.id);
    await deleteByClinic(supabaseAdmin, "evolutions", clinic.id);
    await deleteByClinic(supabaseAdmin, "assessments", clinic.id);

    if (before.patientIds.length > 0) {
      await supabaseAdmin
        .from("patients")
        .update({ discharge_id: null })
        .eq("clinic_id", clinic.id);
      await deleteByIds(supabaseAdmin, "patient_discharges", "patient_id", before.patientIds);
    }

    await deleteByClinic(supabaseAdmin, "appointments", clinic.id);

    const after = await collectMovePlusResetCounts(supabaseAdmin, clinic.id);
    await logAudit(
      supabaseAdmin,
      context.userId,
      "clinic.move_plus_demo_reset",
      "clinic",
      clinic.id,
      before.counts,
      { counts_after: after.counts, preserved_patients: before.patientIds.length },
      clinic.id,
    );

    return {
      ok: true,
      dry_run: false,
      clinic: { id: clinic.id, nome: clinic.nome, slug: clinic.slug },
      counts: before.counts,
      counts_after: after.counts,
      preserved_patients: before.patientIds.length,
    };
  });

// ------------------------------------------------------------
// Diagnóstico SaaS (somente leitura)
// ------------------------------------------------------------
export const getSaasClinicDiagnostic = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: clinics, error } = await supabaseAdmin
      .from("clinics")
      .select("id, nome, slug, status, plan, created_at, updated_at, settings_id")
      .neq("status", "deleted")
      .order("nome");
    if (error) throw new Error(error.message);

    const ids = (clinics ?? []).map((c) => c.id);
    const settingsLookup = await loadClinicSettingsLookup(supabaseAdmin, clinics ?? []);

    async function countMap(table: string) {
      const out: Record<string, number> = {};
      for (const id of ids) {
        const { count } = await supabaseAdmin
          .from(table)
          .select("id", { count: "exact", head: true })
          .eq("clinic_id", id);
        out[id] = count ?? 0;
      }
      return out;
    }

    const [patients, docs, appts, members, entries, receipts] = await Promise.all([
      countMap("patients"),
      countMap("clinical_documents"),
      countMap("appointments"),
      countMap("clinic_members"),
      countMap("financial_entries"),
      countMap("receipts"),
    ]);

    const rows = (clinics ?? []).map((c) => {
      const nameFields = resolveClinicNameFields(c, settingsLookup);
      const nome_fantasia = nameFields.nome_fantasia;
      const protectedMove = isProtectedMovePlusClinic(nameFields);
      const testCandidate = isKnownTestClinicCandidate(nameFields);
      return {
        id: c.id,
        nome: c.nome,
        nome_fantasia,
        slug: c.slug,
        status: c.status,
        is_test: !!(c as any).is_test,
        plan: c.plan,
        segment: segmentClinic({
          status: c.status,
          is_test: !!(c as any).is_test,
          ...nameFields,
        }),
        protected: protectedMove,
        test_candidate: testCandidate,
        updated_at: c.updated_at,
        counts: {
          patients: patients[c.id] ?? 0,
          documents: docs[c.id] ?? 0,
          appointments: appts[c.id] ?? 0,
          members: members[c.id] ?? 0,
          financial_entries: entries[c.id] ?? 0,
          receipts: receipts[c.id] ?? 0,
        },
      };
    });

    return {
      generated_at: new Date().toISOString(),
      total: rows.length,
      protected: rows.filter((r) => r.protected),
      test_candidates: rows.filter((r) => r.test_candidate && !r.protected),
      active_test_clinics: rows.filter(
        (r) => r.test_candidate && !r.protected && r.status === "active" && !r.is_test,
      ),
      recommended_actions: rows
        .filter((r) => r.test_candidate && !r.protected && r.status === "active" && !r.is_test)
        .map((r) => ({
          clinic_id: r.id,
          nome: r.nome,
          action: "mark_as_test_and_inactivate",
          note: "Requer confirmação explícita no Admin SaaS — nenhum dado será apagado",
        })),
      clinics: rows,
    };
  });

// ------------------------------------------------------------
// Marcar clínica como teste (inativa + flag — sem apagar dados)
// ------------------------------------------------------------
export const markClinicAsTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        clinic_id: z.string().uuid(),
        confirm_name: z.string().min(2),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const clinic = await assertClinicNotProtected(supabaseAdmin, data.clinic_id);

    let nome_fantasia: string | null = null;
    if (clinic.settings_id) {
      const { data: s } = await supabaseAdmin
        .from("clinic_settings")
        .select("nome_fantasia")
        .eq("id", clinic.settings_id)
        .maybeSingle();
      nome_fantasia = s?.nome_fantasia ?? null;
    }

    const expected = [clinic.nome, nome_fantasia].filter(Boolean);
    if (!expected.some((n) => n === data.confirm_name.trim())) {
      throw new Error("Confirmação inválida: digite o nome exato da clínica.");
    }

    const { data: prev } = await supabaseAdmin
      .from("clinics")
      .select("status")
      .eq("id", data.clinic_id)
      .maybeSingle();

    await supabaseAdmin
      .from("clinics")
      .update({ status: "inactive", active: false })
      .eq("id", data.clinic_id);

    const currentPlan = await getCurrentPlanRow(supabaseAdmin, data.clinic_id);
    if (currentPlan) {
      await supabaseAdmin
        .from("clinic_plans")
        .update({ status: "suspended" })
        .eq("id", currentPlan.id);
    }

    await logAudit(
      supabaseAdmin,
      context.userId,
      "clinic.mark_test",
      "clinic",
      data.clinic_id,
      prev,
      { status: "inactive", active: false },
      data.clinic_id,
    );

    return { ok: true };
  });

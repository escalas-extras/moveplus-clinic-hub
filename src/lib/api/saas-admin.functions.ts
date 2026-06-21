import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const STATUS_VALUES = ["active", "inactive", "suspended"] as const;

async function assertSuperAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "super_admin",
  });
  if (error) throw new Error("Falha ao verificar permissão: " + error.message);
  if (!data) throw new Error("Acesso restrito a super administradores.");
}

async function logAudit(
  supabaseAdmin: any,
  userId: string,
  action: string,
  entityType: string,
  entityId: string | null,
  oldData: any = null,
  newData: any = null,
) {
  try {
    await supabaseAdmin.from("saas_audit_log").insert({
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      old_data: oldData,
      new_data: newData,
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

    const [clinics, members, patients, docs, recentClinics, planAgg, plansCatalog, allClinicPlans] =
      await Promise.all([
        supabaseAdmin.from("clinics").select("id,status,created_at"),
        supabaseAdmin
          .from("clinic_members")
          .select("user_id", { count: "exact", head: false })
          .eq("active", true),
        supabaseAdmin.from("patients").select("id", { count: "exact", head: true }),
        supabaseAdmin.from("clinical_documents").select("id, created_at"),
        supabaseAdmin
          .from("clinics")
          .select("id, nome, slug, status, plan, created_at")
          .order("created_at", { ascending: false })
          .limit(5),
        supabaseAdmin
          .from("clinic_plans")
          .select("plan_id, status, plans(id,code,name,monthly_price,price_cents)")
          .in("status", ["active", "trial"]),
        supabaseAdmin
          .from("plans")
          .select("id,code,name,monthly_price,price_cents"),
        supabaseAdmin.from("clinic_plans").select("status"),
      ]);

    const clinicsRows = clinics.data ?? [];
    const active = clinicsRows.filter((c: any) => c.status === "active").length;
    const inactive = clinicsRows.filter((c: any) => c.status === "inactive").length;
    const suspended = clinicsRows.filter((c: any) => c.status === "suspended").length;

    const uniqueUsers = new Set((members.data ?? []).map((m: any) => m.user_id));

    const docsRows = docs.data ?? [];
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);
    const docsMonth = docsRows.filter((d: any) => new Date(d.created_at) >= thisMonth)
      .length;

    const thirtyAgo = new Date();
    thirtyAgo.setDate(thirtyAgo.getDate() - 30);
    const newClinics30d = clinicsRows.filter(
      (c: any) => new Date(c.created_at) >= thirtyAgo,
    ).length;

    const planCounts: Record<
      string,
      { code: string; name: string; count: number; mrr: number; trial: number }
    > = {};
    let mrr = 0;
    let trialCount = 0;
    for (const row of (planAgg.data ?? []) as any[]) {
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

    const paidContracts = (planAgg.data ?? []).filter(
      (r: any) => r.status === "active",
    ).length;
    const avgTicket = paidContracts > 0 ? mrr / paidContracts : 0;

    const canceledContracts = (allClinicPlans.data ?? []).filter(
      (r: any) => r.status === "canceled",
    ).length;

    // Monthly growth — clinics created in last 6 months
    const growth: { month: string; count: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const next = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const label = d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
      const count = clinicsRows.filter((c: any) => {
        const dt = new Date(c.created_at);
        return dt >= d && dt < next;
      }).length;
      growth.push({ month: label, count });
    }

    return {
      clinics: {
        active,
        inactive,
        suspended,
        total: clinicsRows.length,
        new_30d: newClinics30d,
      },
      users: { total: uniqueUsers.size },
      patients: { total: patients.count ?? 0 },
      documents: { total: docsRows.length, this_month: docsMonth },
      recent_clinics: recentClinics.data ?? [],
      plans: Object.values(planCounts),
      mrr,
      arr: mrr * 12,
      avg_ticket: avgTicket,
      trial_count: trialCount,
      canceled_count: canceledContracts,
      growth,
      plans_catalog_count: (plansCatalog.data ?? []).length,
    };
  });

// ------------------------------------------------------------
// Clinics list (rich)
// ------------------------------------------------------------
export const listClinicsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: clinics, error } = await supabaseAdmin
      .from("clinics")
      .select("id, nome, slug, plan, status, active, created_at, settings_id")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const ids = (clinics ?? []).map((c: any) => c.id);
    const counts: Record<string, { users: number }> = {};
    if (ids.length) {
      const { data: mems } = await supabaseAdmin
        .from("clinic_members")
        .select("clinic_id")
        .eq("active", true)
        .in("clinic_id", ids);
      for (const m of mems ?? []) {
        counts[m.clinic_id] = counts[m.clinic_id] || { users: 0 };
        counts[m.clinic_id].users += 1;
      }
    }

    const planByClinic: Record<string, { code: string; name: string }> = {};
    if (ids.length) {
      const { data: cps } = await supabaseAdmin
        .from("clinic_plans")
        .select("clinic_id, plans(code,name)")
        .in("clinic_id", ids)
        .in("status", ["active", "trial"]);
      for (const row of (cps ?? []) as any[]) {
        if (row.plans)
          planByClinic[row.clinic_id] = { code: row.plans.code, name: row.plans.name };
      }
    }

    let patientsByClinic: Record<string, number> = {};
    if (ids.length) {
      const { data: mems } = await supabaseAdmin
        .from("clinic_members")
        .select("clinic_id, user_id")
        .in("clinic_id", ids)
        .eq("active", true);
      const userToClinic: Record<string, string> = {};
      for (const m of mems ?? []) userToClinic[m.user_id] = m.clinic_id;
      const userIds = Object.keys(userToClinic);
      if (userIds.length) {
        const { data: pats } = await supabaseAdmin
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

    return (clinics ?? []).map((c: any) => ({
      id: c.id,
      nome: c.nome,
      slug: c.slug,
      plan: c.plan,
      plan_label: planByClinic[c.id]?.name ?? c.plan ?? "—",
      status: c.status,
      active: c.active,
      created_at: c.created_at,
      user_count: counts[c.id]?.users ?? 0,
      patient_count: patientsByClinic[c.id] ?? 0,
    }));
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
    const { data: prev } = await supabaseAdmin
      .from("clinics")
      .select("status")
      .eq("id", data.id)
      .maybeSingle();
    const { error } = await supabaseAdmin
      .from("clinics")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await logAudit(
      supabaseAdmin,
      context.userId,
      data.status === "active"
        ? "clinic.activate"
        : data.status === "suspended"
          ? "clinic.suspend"
          : "clinic.deactivate",
      "clinic",
      data.id,
      prev,
      { status: data.status },
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
});
export const provisionClinic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => provisionInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let ownerUserId: string | null = null;
    if (data.owner_email && data.owner_email.trim()) {
      const email = data.owner_email.trim().toLowerCase();
      const { data: usersList, error: uErr } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 200,
      });
      if (uErr) throw new Error("Falha ao buscar usuários: " + uErr.message);
      const found = usersList?.users?.find((u: any) => u.email?.toLowerCase() === email);
      if (!found) {
        throw new Error(
          `Usuário com email ${email} não encontrado. Convide o owner antes de provisionar a clínica.`,
        );
      }
      ownerUserId = found.id;
    }

    const result = await provisionClinicFallback({
      nome: data.nome,
      plan_code: data.plan_code,
      owner_user_id: ownerUserId,
      nome_fantasia: data.nome_fantasia,
      cidade: data.cidade,
      estado: data.estado,
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
    return result;
  });

async function provisionClinicFallback(args: {
  nome: string;
  plan_code: string;
  owner_user_id: string | null;
  nome_fantasia?: string;
  cidade?: string;
  estado?: string;
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

  await supabaseAdmin.from("clinic_plans").insert({
    clinic_id: clinic.id,
    plan_id: plan.id,
    status: "active",
  });

  if (args.owner_user_id) {
    await supabaseAdmin.from("clinic_members").insert({
      clinic_id: clinic.id,
      user_id: args.owner_user_id,
      role: "owner",
      is_default: false,
      active: true,
    });
  }

  return { clinic_id: clinic.id, slug };
}

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

    await supabaseAdmin
      .from("clinic_plans")
      .update({ status: "canceled", canceled_at: new Date().toISOString() })
      .eq("clinic_id", data.clinic_id)
      .in("status", ["active", "trial"]);

    const { error: iErr } = await supabaseAdmin.from("clinic_plans").insert({
      clinic_id: data.clinic_id,
      plan_id: plan.id,
      status: "active",
    });
    if (iErr) throw new Error(iErr.message);

    await supabaseAdmin
      .from("clinics")
      .update({ plan: data.plan_code })
      .eq("id", data.clinic_id);

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
  .handler(async ({ context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("saas_audit_log")
      .select("id, created_at, user_id, action, entity_type, entity_id, old_data, new_data")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);

    const userIds = Array.from(
      new Set((rows ?? []).map((r: any) => r.user_id).filter(Boolean)),
    );
    const emails: Record<string, string> = {};
    if (userIds.length) {
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("id, email")
        .in("id", userIds);
      for (const p of profiles ?? []) emails[p.id] = p.email ?? "";
    }
    return (rows ?? []).map((r: any) => ({ ...r, user_email: emails[r.user_id] ?? null }));
  });

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const PLAN_CODES = ["starter", "professional", "clinic", "enterprise"] as const;
const STATUS_VALUES = ["active", "inactive", "suspended"] as const;

async function assertSuperAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "super_admin",
  });
  if (error) throw new Error("Falha ao verificar permissão: " + error.message);
  if (!data) throw new Error("Acesso restrito a super administradores.");
}

// ------------------------------------------------------------
// Dashboard
// ------------------------------------------------------------
export const getSaasDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [clinics, members, patients, docs, recentClinics, planAgg] = await Promise.all([
      supabaseAdmin.from("clinics").select("id,status,created_at"),
      supabaseAdmin.from("clinic_members").select("user_id", { count: "exact", head: false }).eq("active", true),
      supabaseAdmin.from("patients").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("clinical_documents").select("id, created_at"),
      supabaseAdmin
        .from("clinics")
        .select("id, nome, slug, status, plan, created_at")
        .order("created_at", { ascending: false })
        .limit(5),
      supabaseAdmin
        .from("clinic_plans")
        .select("plan_id, plans(code,name)")
        .in("status", ["active", "trial"]),
    ]);

    const clinicsRows = clinics.data ?? [];
    const active = clinicsRows.filter((c: any) => c.status === "active").length;
    const inactive = clinicsRows.filter((c: any) => c.status !== "active").length;

    const uniqueUsers = new Set((members.data ?? []).map((m: any) => m.user_id));

    const docsRows = docs.data ?? [];
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);
    const docsMonth = docsRows.filter((d: any) => new Date(d.created_at) >= thisMonth).length;

    const planCounts: Record<string, { code: string; name: string; count: number }> = {};
    for (const row of (planAgg.data ?? []) as any[]) {
      const p = row.plans;
      if (!p) continue;
      const key = p.code;
      planCounts[key] = planCounts[key] || { code: p.code, name: p.name, count: 0 };
      planCounts[key].count += 1;
    }

    return {
      clinics: { active, inactive, total: clinicsRows.length },
      users: { total: uniqueUsers.size },
      patients: { total: patients.count ?? 0 },
      documents: { total: docsRows.length, this_month: docsMonth },
      recent_clinics: recentClinics.data ?? [],
      plans: Object.values(planCounts),
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

    // Active plan by clinic
    const planByClinic: Record<string, { code: string; name: string }> = {};
    if (ids.length) {
      const { data: cps } = await supabaseAdmin
        .from("clinic_plans")
        .select("clinic_id, plans(code,name)")
        .in("clinic_id", ids)
        .in("status", ["active", "trial"]);
      for (const row of (cps ?? []) as any[]) {
        if (row.plans) planByClinic[row.clinic_id] = { code: row.plans.code, name: row.plans.name };
      }
    }

    // Patient counts via created_by → clinic_members mapping (patients has no clinic_id yet).
    // For dashboard purposes only: counts patients created by users that belong to the clinic.
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
          const cid = userToClinic[p.created_by];
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
    const { error } = await supabaseAdmin
      .from("clinics")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ------------------------------------------------------------
// Provision new clinic
// ------------------------------------------------------------
const provisionInput = z.object({
  nome: z.string().min(2, "Nome obrigatório"),
  plan_code: z.enum(PLAN_CODES),
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
          `Usuário com email ${email} não encontrado. Convide o owner antes de provisionar a clínica.`
        );
      }
      ownerUserId = found.id;
    }

    // Call the SQL function (it self-checks super_admin via auth.uid; admin client bypasses, so check already done above)
    const { data: clinicId, error } = await supabaseAdmin.rpc("provision_clinic", {
      _nome: data.nome,
      _plan_code: data.plan_code,
      _owner_user_id: ownerUserId,
      _nome_fantasia: data.nome_fantasia ?? null,
      _cidade: data.cidade ?? null,
      _estado: data.estado ?? null,
    });

    if (error) {
      // Admin client has no auth.uid → role check inside fn will fail. Fall back to direct insert path.
      if (String(error.message).includes("super_admin")) {
        return await provisionClinicFallback({
          ...data,
          owner_user_id: ownerUserId,
          supabaseAdmin,
        });
      }
      throw new Error(error.message);
    }

    return { clinic_id: clinicId };
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

  const { data: slugData, error: slugErr } = await supabaseAdmin.rpc("generate_clinic_slug", {
    _name: args.nome,
  });
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

  await supabaseAdmin.from("clinic_settings").update({ clinic_id: clinic.id }).eq("id", settings.id);

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

// ------------------------------------------------------------
// Plans
// ------------------------------------------------------------
export const listPlans = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("plans")
      .select("id, code, name, description, price_cents, max_users, max_patients, max_documents_month, max_storage_mb, modules, active, sort_order")
      .order("sort_order");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const assignPlanInput = z.object({
  clinic_id: z.string().uuid(),
  plan_code: z.enum(PLAN_CODES),
});
export const assignPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => assignPlanInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: plan, error: pErr } = await supabaseAdmin
      .from("plans")
      .select("id")
      .eq("code", data.plan_code)
      .single();
    if (pErr || !plan) throw new Error("Plano inexistente");

    // Cancel existing active plan
    await supabaseAdmin
      .from("clinic_plans")
      .update({ status: "canceled", canceled_at: new Date().toISOString() })
      .eq("clinic_id", data.clinic_id)
      .in("status", ["active", "trial"]);

    // Insert new
    const { error: iErr } = await supabaseAdmin.from("clinic_plans").insert({
      clinic_id: data.clinic_id,
      plan_id: plan.id,
      status: "active",
    });
    if (iErr) throw new Error(iErr.message);

    // Mirror on clinics.plan
    await supabaseAdmin.from("clinics").update({ plan: data.plan_code }).eq("id", data.clinic_id);

    return { ok: true };
  });

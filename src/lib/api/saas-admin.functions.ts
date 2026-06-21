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
      .neq("status", "deleted")
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

    // Owners (role=owner) per clinic
    const ownerByClinic: Record<
      string,
      { member_id: string; user_id: string; active: boolean; created_at: string }
    > = {};
    if (ids.length) {
      const { data: owners } = await supabaseAdmin
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
    if (ownerUserIds.length) {
      try {
        const { data: list } = await supabaseAdmin.auth.admin.listUsers({
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
    for (const [clinicId, owner] of Object.entries(ownerByClinic)) {
      const auth = authByUser[owner.user_id];
      if (auth?.confirmed_at && !owner.active) {
        const { error: actErr } = await supabaseAdmin
          .from("clinic_members")
          .update({ active: true })
          .eq("id", owner.member_id);
        if (!actErr) {
          owner.active = true;
          await logAudit(
            supabaseAdmin,
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

    return (clinics ?? []).map((c: any) => {
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
      return {
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
        owner_email: auth?.email ?? null,
        owner_user_id: owner?.user_id ?? null,
        owner_member_id: owner?.member_id ?? null,
        owner_status,
        owner_invited_at: auth?.invited_at ?? null,
        owner_confirmed_at: auth?.confirmed_at ?? null,
      };
    });
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
        const redirectTo = `${process.env.SITE_URL ?? "https://moveplus-clinic-hub.lovable.app"}/set-password`;
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
      owner_pending: ownerInvited, // pending when invited, active when user already existed
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
  return `${process.env.SITE_URL ?? "https://moveplus-clinic-hub.lovable.app"}/set-password`;
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


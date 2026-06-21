import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const CLINIC_ROLES = ["owner", "admin", "profissional", "recepcao", "financeiro"] as const;
export type ClinicRole = (typeof CLINIC_ROLES)[number];

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
  clinicId: string | null,
  details: any = null,
) {
  try {
    await supabaseAdmin.from("saas_audit_log").insert({
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      clinic_id: clinicId,
      details,
      new_data: details,
    });
  } catch (e) {
    console.error("[saas_audit_log]", e);
  }
}

// ============================================================
// Usuários da clínica
// ============================================================
export const listClinicMembers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ clinic_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: members, error } = await supabaseAdmin
      .from("clinic_members")
      .select("id, user_id, role, is_default, active, created_at")
      .eq("clinic_id", data.clinic_id)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);

    const ids = (members ?? []).map((m: any) => m.user_id);
    const profiles: Record<string, { full_name: string | null; email: string | null }> =
      {};
    const confirmed: Record<string, boolean> = {};
    if (ids.length) {
      const { data: profs } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name, email")
        .in("id", ids);
      for (const p of profs ?? [])
        profiles[p.id] = { full_name: p.full_name, email: p.email };
      try {
        const { data: list } = await supabaseAdmin.auth.admin.listUsers({
          page: 1,
          perPage: 200,
        });
        for (const u of list?.users ?? []) confirmed[u.id] = !!u.email_confirmed_at;
      } catch {
        /* ignore */
      }
    }
    return (members ?? []).map((m: any) => ({
      ...m,
      profile: profiles[m.user_id] ?? { full_name: null, email: null },
      confirmed: confirmed[m.user_id] ?? false,
    }));
  });

export const inviteClinicMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        clinic_id: z.string().uuid(),
        email: z.string().email(),
        full_name: z.string().min(1),
        role: z.enum(CLINIC_ROLES),
        redirect_to: z.string().url(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Reuse existing user when present
    let userId: string | null = null;
    const { data: list } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    const found = list?.users?.find(
      (u: any) => u.email?.toLowerCase() === data.email.toLowerCase(),
    );
    if (found) {
      userId = found.id;
    } else {
      const { data: invited, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(
        data.email,
        { data: { full_name: data.full_name }, redirectTo: data.redirect_to },
      );
      if (error) throw new Error(error.message);
      userId = invited.user?.id ?? null;
    }
    if (!userId) throw new Error("Falha ao criar usuário");

    await supabaseAdmin
      .from("profiles")
      .upsert(
        { id: userId, full_name: data.full_name, email: data.email },
        { onConflict: "id" },
      );

    const { error: mErr } = await supabaseAdmin.from("clinic_members").insert({
      clinic_id: data.clinic_id,
      user_id: userId,
      role: data.role,
      is_default: false,
      active: true,
    });
    if (mErr && !mErr.message.includes("duplicate"))
      throw new Error("Vínculo: " + mErr.message);

    await logAudit(
      supabaseAdmin,
      context.userId,
      "user.invite",
      "clinic_member",
      userId,
      data.clinic_id,
      { email: data.email, role: data.role },
    );
    return { ok: true, user_id: userId };
  });

export const resendClinicMemberInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        user_id: z.string().uuid(),
        clinic_id: z.string().uuid(),
        redirect_to: z.string().url(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: u, error } = await supabaseAdmin.auth.admin.getUserById(data.user_id);
    if (error) throw new Error(error.message);
    const email = u.user?.email;
    if (!email) throw new Error("Usuário sem e-mail");
    const fn = (u.user?.user_metadata as any)?.full_name;
    const { error: iErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: fn ? { full_name: fn } : undefined,
      redirectTo: data.redirect_to,
    });
    if (iErr) throw new Error(iErr.message);
    await logAudit(
      supabaseAdmin,
      context.userId,
      "user.invite_resend",
      "clinic_member",
      data.user_id,
      data.clinic_id,
      { email },
    );
    return { ok: true };
  });

export const setClinicMemberActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), active: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: prev } = await supabaseAdmin
      .from("clinic_members")
      .select("clinic_id, user_id, active")
      .eq("id", data.id)
      .maybeSingle();
    const { error } = await supabaseAdmin
      .from("clinic_members")
      .update({ active: data.active })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await logAudit(
      supabaseAdmin,
      context.userId,
      data.active ? "user.activate" : "user.deactivate",
      "clinic_member",
      data.id,
      prev?.clinic_id ?? null,
      { active: data.active },
    );
    return { ok: true };
  });

export const changeClinicMemberRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), role: z.enum(CLINIC_ROLES) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: prev } = await supabaseAdmin
      .from("clinic_members")
      .select("clinic_id, role")
      .eq("id", data.id)
      .maybeSingle();
    const { error } = await supabaseAdmin
      .from("clinic_members")
      .update({ role: data.role })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await logAudit(
      supabaseAdmin,
      context.userId,
      "user.change_role",
      "clinic_member",
      data.id,
      prev?.clinic_id ?? null,
      { from: prev?.role, to: data.role },
    );
    return { ok: true };
  });

export const removeClinicMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: prev } = await supabaseAdmin
      .from("clinic_members")
      .select("clinic_id, user_id, role")
      .eq("id", data.id)
      .maybeSingle();
    const { error } = await supabaseAdmin
      .from("clinic_members")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await logAudit(
      supabaseAdmin,
      context.userId,
      "user.remove",
      "clinic_member",
      data.id,
      prev?.clinic_id ?? null,
      prev,
    );
    return { ok: true };
  });

// ============================================================
// Identidade visual
// ============================================================
export const getClinicBranding = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ clinic_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: s, error } = await supabaseAdmin
      .from("clinic_settings")
      .select(
        "id, clinic_id, nome_fantasia, logo_url, primary_color, secondary_color, slogan, app_name, crefito_default, rodape_institucional, cidade, estado",
      )
      .eq("clinic_id", data.clinic_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return s;
  });

export const updateClinicBranding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        clinic_id: z.string().uuid(),
        nome_fantasia: z.string().optional(),
        logo_url: z.string().optional().nullable(),
        primary_color: z.string().optional(),
        secondary_color: z.string().optional(),
        slogan: z.string().optional().nullable(),
        app_name: z.string().optional().nullable(),
        crefito_default: z.string().optional().nullable(),
        rodape_institucional: z.string().optional().nullable(),
        cidade: z.string().optional().nullable(),
        estado: z.string().max(2).optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { clinic_id, ...patch } = data;
    const { data: existing } = await supabaseAdmin
      .from("clinic_settings")
      .select("id")
      .eq("clinic_id", clinic_id)
      .maybeSingle();
    if (existing) {
      const { error } = await supabaseAdmin
        .from("clinic_settings")
        .update(patch)
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
    } else {
      const { data: ins, error } = await supabaseAdmin
        .from("clinic_settings")
        .insert({ clinic_id, ...patch } as any)
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      await supabaseAdmin
        .from("clinics")
        .update({ settings_id: ins.id })
        .eq("id", clinic_id);
    }
    await logAudit(
      supabaseAdmin,
      context.userId,
      "clinic.branding_update",
      "clinic_settings",
      clinic_id,
      clinic_id,
      patch,
    );
    return { ok: true };
  });

// ============================================================
// Modo Suporte
// ============================================================
export const startSupportSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({ clinic_id: z.string().uuid(), reason: z.string().optional() })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { data: id, error } = await context.supabase.rpc("start_support_session", {
      _clinic_id: data.clinic_id,
      _reason: data.reason ?? undefined,
    } as any);
    if (error) throw new Error(error.message);
    return { id };
  });

export const endSupportSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.rpc("end_support_session");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getActiveSupportSession = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isSuper } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "super_admin",
    });
    if (!isSuper) return null;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: s } = await supabaseAdmin
      .from("support_sessions")
      .select("id, clinic_id, started_at, reason, clinics(nome, slug)")
      .eq("super_admin_id", context.userId)
      .is("ended_at", null)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return s;
  });

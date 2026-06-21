import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const RoleEnum = z.enum(["admin", "physiotherapist"]);

async function resolveActiveClinicId(context: { supabase: any }): Promise<string | null> {
  const { data: supportClinic } = await context.supabase.rpc("current_support_session_clinic");
  if (supportClinic) return supportClinic as string;
  const { data: clinicId } = await context.supabase.rpc("current_clinic_id");
  return (clinicId as string | null) ?? null;
}

// Allow platform admin/super_admin OR clinic owner/admin of the user's current clinic.
// Returns the active clinic id (support session clinic for super_admin, else user's clinic).
async function ensureCanManageUsers(context: { supabase: any; userId: string }): Promise<string | null> {
  const [{ data: isAdmin }, { data: isSuper }] = await Promise.all([
    context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
    context.supabase.rpc("has_role", { _user_id: context.userId, _role: "super_admin" }),
  ]);
  const activeClinicId = await resolveActiveClinicId(context);
  if (isAdmin || isSuper) return activeClinicId;
  if (activeClinicId) {
    const { data: isOwner } = await context.supabase.rpc("has_role_in", {
      _clinic_id: activeClinicId,
      _role: "owner",
    });
    const { data: isClinicAdmin } = await context.supabase.rpc("has_role_in", {
      _clinic_id: activeClinicId,
      _role: "admin",
    });
    if (isOwner || isClinicAdmin) return activeClinicId;
  }
  throw new Error("Forbidden");
}

export const inviteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      email: z.string().email().max(255),
      full_name: z.string().min(1).max(255),
      role: RoleEnum,
      redirect_to: z.string().url().max(2048),
    }),
  )
  .handler(async ({ data, context }) => {
    const activeClinicId = await ensureCanManageUsers(context);
    if (!activeClinicId) {
      throw new Error("Nenhuma clínica ativa para vincular o novo usuário.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: invited, error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      data.email,
      {
        data: { full_name: data.full_name },
        redirectTo: data.redirect_to,
      },
    );
    if (inviteErr) throw new Error(inviteErr.message);
    const newUserId = invited.user?.id;
    if (!newUserId) throw new Error("Falha ao enviar convite");

    // Ensure profile reflects provided name/email
    await supabaseAdmin
      .from("profiles")
      .upsert({ id: newUserId, full_name: data.full_name, email: data.email }, { onConflict: "id" });

    // Replace any auto-assigned role from handle_new_user with the chosen role
    await supabaseAdmin.from("user_roles").delete().eq("user_id", newUserId);
    const { error: roleInsertErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: newUserId, role: data.role });
    if (roleInsertErr) throw new Error(roleInsertErr.message);

    // Vincular o novo usuário à clínica ativa (isolamento multi-tenant)
    const memberRole = data.role === "admin" ? "admin" : "physiotherapist";
    const { error: memberErr } = await supabaseAdmin
      .from("clinic_members")
      .upsert(
        {
          clinic_id: activeClinicId,
          user_id: newUserId,
          role: memberRole,
          active: true,
          is_default: true,
        },
        { onConflict: "clinic_id,user_id" },
      );
    if (memberErr) throw new Error(memberErr.message);

    return { ok: true, user_id: newUserId };
  });

export const resendInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      user_id: z.string().uuid(),
      redirect_to: z.string().url().max(2048),
    }),
  )
  .handler(async ({ data, context }) => {
    const activeClinicId = await ensureCanManageUsers(context);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Garantir que o usuário pertence à clínica ativa antes de reenviar
    if (activeClinicId) {
      const { data: membership } = await supabaseAdmin
        .from("clinic_members")
        .select("user_id")
        .eq("clinic_id", activeClinicId)
        .eq("user_id", data.user_id)
        .eq("active", true)
        .maybeSingle();
      if (!membership) throw new Error("Usuário não pertence a esta clínica.");
    }

    const { data: userRes, error: getErr } = await supabaseAdmin.auth.admin.getUserById(data.user_id);
    if (getErr) throw new Error(getErr.message);
    const email = userRes.user?.email;
    if (!email) throw new Error("Usuário sem e-mail");

    const full_name = (userRes.user?.user_metadata as any)?.full_name as string | undefined;
    const { error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: full_name ? { full_name } : undefined,
      redirectTo: data.redirect_to,
    });
    if (inviteErr) throw new Error(inviteErr.message);
    return { ok: true };
  });

export const listAllUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const activeClinicId = await ensureCanManageUsers(context);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Isolamento multi-tenant: lista APENAS membros da clínica ativa.
    if (!activeClinicId) {
      return { users: [] };
    }

    const { data: members, error: memErr } = await supabaseAdmin
      .from("clinic_members")
      .select("user_id, role, created_at, active")
      .eq("clinic_id", activeClinicId)
      .eq("active", true)
      .order("created_at", { ascending: false });
    if (memErr) throw new Error(memErr.message);

    const ids = Array.from(new Set((members ?? []).map((m) => m.user_id)));
    if (ids.length === 0) return { users: [] };

    const [{ data: profs }, { data: roles }] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, full_name, email").in("id", ids),
      supabaseAdmin.from("user_roles").select("user_id, role").in("user_id", ids),
    ]);

    const profilesById = new Map(
      (profs ?? []).map((p) => [p.id, { full_name: p.full_name, email: p.email }]),
    );
    // Prioriza role global admin; senão usa role do clinic_members.
    const globalRoleById = new Map<string, "admin" | "physiotherapist">();
    for (const r of roles ?? []) {
      if (r.role === "admin") globalRoleById.set(r.user_id, "admin");
      else if (r.role === "physiotherapist" && !globalRoleById.has(r.user_id))
        globalRoleById.set(r.user_id, "physiotherapist");
    }

    const confirmedMap = new Map<string, boolean>();
    try {
      const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
      for (const u of list?.users ?? []) {
        confirmedMap.set(u.id, !!u.email_confirmed_at);
      }
    } catch {
      // ignore
    }

    const users = (members ?? []).map((m) => {
      const memberRole = m.role === "owner" || m.role === "admin" ? "admin" : "physiotherapist";
      const role = globalRoleById.get(m.user_id) ?? (memberRole as "admin" | "physiotherapist");
      return {
        user_id: m.user_id,
        role,
        created_at: m.created_at,
        profile: profilesById.get(m.user_id) ?? { full_name: null, email: null },
        confirmed: confirmedMap.get(m.user_id) ?? false,
      };
    });
    return { users };
  });

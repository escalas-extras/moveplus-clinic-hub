import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const RoleEnum = z.enum(["admin", "physiotherapist"]);

// Allow platform admin/super_admin OR clinic owner/admin of the user's current clinic.
async function ensureCanManageUsers(context: { supabase: any; userId: string }) {
  const [{ data: isAdmin }, { data: isSuper }, { data: clinicId }] = await Promise.all([
    context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
    context.supabase.rpc("has_role", { _user_id: context.userId, _role: "super_admin" }),
    context.supabase.rpc("current_clinic_id"),
  ]);
  if (isAdmin || isSuper) return;
  if (clinicId) {
    const { data: isOwner } = await context.supabase.rpc("has_role_in", {
      _clinic_id: clinicId,
      _role: "owner",
    });
    const { data: isClinicAdmin } = await context.supabase.rpc("has_role_in", {
      _clinic_id: clinicId,
      _role: "admin",
    });
    if (isOwner || isClinicAdmin) return;
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
    await ensureCanManageUsers(context);

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
    await ensureCanManageUsers(context);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
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
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: roles, error } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, role, created_at")
      .in("role", ["admin", "physiotherapist"])
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const ids = Array.from(new Set((roles ?? []).map((r) => r.user_id)));
    let profilesById = new Map<string, { full_name: string | null; email: string | null }>();
    if (ids.length) {
      const { data: profs } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name, email")
        .in("id", ids);
      profilesById = new Map(
        (profs ?? []).map((p) => [p.id, { full_name: p.full_name, email: p.email }]),
      );
    }

    // Fetch confirmation status via admin listUsers
    const confirmedMap = new Map<string, boolean>();
    try {
      const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
      for (const u of list?.users ?? []) {
        confirmedMap.set(u.id, !!u.email_confirmed_at);
      }
    } catch {
      // ignore; field will default to false
    }

    const users = (roles ?? []).map((r) => ({
      user_id: r.user_id,
      role: r.role as "admin" | "physiotherapist",
      created_at: r.created_at,
      profile: profilesById.get(r.user_id) ?? { full_name: null, email: null },
      confirmed: confirmedMap.get(r.user_id) ?? false,
    }));
    return { users };
  });

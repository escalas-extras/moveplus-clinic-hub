import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const createAdminUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      email: z.string().email().max(255),
      password: z.string().min(8).max(72),
      full_name: z.string().min(1).max(255),
    }),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error: roleErr } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (roleErr) throw new Error(roleErr.message);
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name },
    });
    if (createErr) throw new Error(createErr.message);
    const newUserId = created.user?.id;
    if (!newUserId) throw new Error("Falha ao criar usuário");

    // Ensure admin role (handle_new_user assigns physiotherapist by default for non-first users)
    const { error: roleInsertErr } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: newUserId, role: "admin" }, { onConflict: "user_id,role" });
    if (roleInsertErr) throw new Error(roleInsertErr.message);

    // Make sure profile reflects the provided name/email
    await supabaseAdmin
      .from("profiles")
      .upsert({ id: newUserId, full_name: data.full_name, email: data.email }, { onConflict: "id" });

    return { ok: true, user_id: newUserId };
  });

export const listAdminUsers = createServerFn({ method: "GET" })
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
      .eq("role", "admin")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const ids = (roles ?? []).map((r) => r.user_id);
    let profilesById = new Map<string, { full_name: string | null; email: string | null }>();
    if (ids.length) {
      const { data: profs } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name, email")
        .in("id", ids);
      profilesById = new Map((profs ?? []).map((p) => [p.id, { full_name: p.full_name, email: p.email }]));
    }
    const admins = (roles ?? []).map((r) => ({
      user_id: r.user_id,
      role: r.role,
      created_at: r.created_at,
      profiles: profilesById.get(r.user_id) ?? { full_name: null, email: null },
    }));
    return { admins };
  });

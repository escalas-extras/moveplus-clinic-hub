import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const PLAN_VALUES = ["starter", "professional", "clinic", "enterprise"] as const;

async function assertSuperAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "super_admin" });
  if (error) throw new Error("Falha ao verificar permissão: " + error.message);
  if (!data) throw new Error("Acesso restrito a super administradores.");
}

export const listClinics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: clinics, error } = await supabaseAdmin
      .from("clinics")
      .select("id, nome, slug, plan, active, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    // Counts
    const ids = (clinics ?? []).map((c: any) => c.id);
    let counts: Record<string, number> = {};
    if (ids.length) {
      const { data: mems } = await supabaseAdmin
        .from("clinic_members")
        .select("clinic_id")
        .in("clinic_id", ids);
      for (const m of mems ?? []) counts[m.clinic_id] = (counts[m.clinic_id] || 0) + 1;
    }

    return (clinics ?? []).map((c: any) => ({ ...c, member_count: counts[c.id] || 0 }));
  });

const createClinicInput = z.object({
  nome: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, "Use apenas letras minúsculas, números e hífens"),
  plan: z.enum(PLAN_VALUES),
  nome_fantasia: z.string().optional(),
  razao_social: z.string().optional(),
  cnpj: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
  primary_color: z.string().optional(),
  secondary_color: z.string().optional(),
  owner_email: z.string().email().optional(),
});

export const createClinic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => createClinicInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Insert settings first
    const { data: settings, error: sErr } = await supabaseAdmin
      .from("clinic_settings")
      .insert({
        nome_fantasia: data.nome_fantasia || data.nome,
        razao_social: data.razao_social || null,
        cnpj: data.cnpj || null,
        cidade: data.cidade || null,
        estado: data.estado || null,
        primary_color: data.primary_color || null,
        secondary_color: data.secondary_color || null,
      })
      .select("id")
      .single();
    if (sErr) throw new Error("Falha em clinic_settings: " + sErr.message);

    const { data: clinic, error: cErr } = await supabaseAdmin
      .from("clinics")
      .insert({
        nome: data.nome,
        slug: data.slug,
        plan: data.plan,
        settings_id: settings.id,
        active: true,
      })
      .select("id")
      .single();
    if (cErr) throw new Error("Falha em clinics: " + cErr.message);

    await supabaseAdmin.from("clinic_settings").update({ clinic_id: clinic.id }).eq("id", settings.id);

    // Optional owner by email (must already be a user)
    if (data.owner_email) {
      // Use admin list to find user
      const { data: usersList } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
      const u = usersList?.users?.find((x: any) => x.email?.toLowerCase() === data.owner_email!.toLowerCase());
      if (u) {
        await supabaseAdmin.from("clinic_members").insert({
          clinic_id: clinic.id,
          user_id: u.id,
          role: "owner",
          is_default: false,
          active: true,
        });
      }
    }

    return { id: clinic.id };
  });

const toggleInput = z.object({ id: z.string().uuid(), active: z.boolean() });
export const toggleClinicActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => toggleInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("clinics").update({ active: data.active }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

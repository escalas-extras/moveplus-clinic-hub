import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export type AppRole = "admin" | "physiotherapist" | "psychologist" | "nutritionist" | "occupational_therapist" | "speech_therapist" | "physical_educator" | "physician" | "other";
export type ClinicRole = "owner" | "admin" | "profissional" | "recepcao" | "financeiro" | string;

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const qc = useQueryClient();

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      const nextUser = session?.user ?? null;
      setUser((prev) => {
        // Invalida caches sensíveis ao usuário/clínica quando o usuário muda
        // ou ao login/logout. Bloco B: incluído `active-clinic` para evitar
        // qualquer reuso de contexto de clínica entre usuários no mesmo browser.
        if (prev?.id !== nextUser?.id || event === "SIGNED_IN" || event === "SIGNED_OUT") {
          qc.invalidateQueries({ queryKey: ["user-roles-combined"] });
          qc.invalidateQueries({ queryKey: ["platform-context"] });
          qc.invalidateQueries({ queryKey: ["plan-features"] });
          qc.invalidateQueries({ queryKey: ["active-clinic"] });
          qc.invalidateQueries({ queryKey: ["branding"] });
        }

        return nextUser;
      });
    });
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, [qc]);

  return { user, loading };
}

/**
 * Returns the user's clinic-scoped role.
 *
 * `isAdmin` is true ONLY when the user is owner/admin of the active clinic
 * (clinic_members.role) OR a super_admin impersonating that clinic via a
 * support session. The legacy global `user_roles.admin` role is INTENTIONALLY
 * NOT consulted here — it is reserved for the SaaS panel (see
 * `usePlatformContext`) and must not grant clinical-area permissions.
 *
 * Prefer `useActiveClinic()` (src/lib/active-clinic.ts) for new code.
 */
export function useRoles(userId?: string) {
  const { data, isLoading } = useQuery({
    queryKey: ["user-roles-combined", userId],
    enabled: !!userId,
    staleTime: 30_000,
    gcTime: 60_000,
    queryFn: async () => {
      const [rolesRes, memberRes, supportRes] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", userId!),
        supabase
          .from("clinic_members")
          .select("role, clinic_id, is_default")
          .eq("user_id", userId!)
          .eq("active", true)
          .order("is_default", { ascending: false }),
        supabase.rpc("current_support_session_clinic"),
      ]);
      const roles = (rolesRes.data ?? []).map((r) => r.role as AppRole);
      const members = memberRes.data ?? [];
      const supportClinic = (supportRes.data as string | null) ?? null;
      // In support mode, super_admin operates with the clinic's role context.
      const activeMember = supportClinic
        ? members.find((m) => m.clinic_id === supportClinic) ?? members[0]
        : members[0];
      const clinicRole = (activeMember?.role as ClinicRole | undefined) ?? null;
      const isClinicAdmin = clinicRole === "owner" || clinicRole === "admin";
      // Super_admin actively in support mode sees the admin UI of the
      // impersonated clinic. OUTSIDE support mode super_admin must NOT
      // get clinical admin privileges (only the SaaS panel).
      const isSupportAdmin = !!supportClinic && roles.includes("super_admin" as AppRole);
      return {
        roles,
        clinicRole,
        isAdmin: isClinicAdmin || isSupportAdmin,
      };
    },
  });

  return {
    roles: data?.roles ?? [],
    clinicRole: data?.clinicRole ?? null,
    isAdmin: data?.isAdmin ?? false,
    loading: isLoading,
  };
}


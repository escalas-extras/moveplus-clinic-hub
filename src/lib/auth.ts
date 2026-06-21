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
        // Invalida caches de permissões quando o usuário muda ou ao login/logout
        if (prev?.id !== nextUser?.id || event === "SIGNED_IN" || event === "SIGNED_OUT") {
          qc.invalidateQueries({ queryKey: ["user-roles-combined"] });
          qc.invalidateQueries({ queryKey: ["platform-context"] });
          qc.invalidateQueries({ queryKey: ["plan-features"] });
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
 * Returns the user's roles.
 * `isAdmin` is true when the user is a platform admin/super_admin OR
 * when the user is owner/admin of their current clinic (clinic_members.role).
 * This drives in-clinic admin-only UI (Usuários, Configurações, Financeiro, etc).
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
      // In support mode, super_admin operates as the clinic owner.
      const activeMember = supportClinic
        ? members.find((m) => m.clinic_id === supportClinic) ?? members[0]
        : members[0];
      const clinicRole = (activeMember?.role as ClinicRole | undefined) ?? null;
      const isPlatformAdmin = roles.includes("admin") || roles.includes("super_admin" as AppRole);
      const isClinicAdmin = clinicRole === "owner" || clinicRole === "admin";
      // In support mode super_admin should see admin UI of the impersonated clinic.
      const isSupportAdmin = !!supportClinic && roles.includes("super_admin" as AppRole);
      return {
        roles,
        clinicRole,
        isAdmin: isPlatformAdmin || isClinicAdmin || isSupportAdmin,
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

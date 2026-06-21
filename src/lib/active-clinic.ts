// Single source of truth for the active clinic context (Bloco A).
// Combines:
//  - clinic_members.role for the active clinic
//  - support_session (super_admin impersonating a clinic = read-only)
//  - plan modules + branding metadata
//
// All clinical UI (menus, gates, queryKeys, PDF builders) MUST read from
// this hook instead of mixing useRoles + usePlatformContext + manual RPCs.
// `user_roles.admin` is intentionally NOT consulted here — it only matters
// for the SaaS panel via `usePlatformContext`.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export type ActiveClinicRole =
  | "owner"
  | "admin"
  | "profissional"
  | "recepcao"
  | "financeiro"
  | string;

export type ActiveClinicContext = {
  clinicId: string | null;
  clinicRole: ActiveClinicRole | null;
  isOwner: boolean;
  isAdmin: boolean;            // owner OR admin of the active clinic (NOT global admin)
  isProfessional: boolean;
  supportMode: boolean;        // super_admin impersonating this clinic
  supportClinicId: string | null;
  loading: boolean;
};

async function fetchActiveClinic(userId: string) {
  const [memberRes, supportRes] = await Promise.all([
    supabase
      .from("clinic_members")
      .select("role, clinic_id, is_default")
      .eq("user_id", userId)
      .eq("active", true)
      .order("is_default", { ascending: false }),
    supabase.rpc("current_support_session_clinic"),
  ]);
  const members = memberRes.data ?? [];
  const supportClinicId = (supportRes.data as string | null) ?? null;

  // In support mode, super_admin operates with the clinic context (owner-equivalent).
  if (supportClinicId) {
    return {
      clinicId: supportClinicId,
      clinicRole: "owner" as ActiveClinicRole,
      isOwner: true,
      isAdmin: true,
      isProfessional: false,
      supportMode: true,
      supportClinicId,
    };
  }

  const active = members[0];
  const role = (active?.role as ActiveClinicRole | undefined) ?? null;
  return {
    clinicId: active?.clinic_id ?? null,
    clinicRole: role,
    isOwner: role === "owner",
    isAdmin: role === "owner" || role === "admin",
    isProfessional: role === "profissional",
    supportMode: false,
    supportClinicId: null,
  };
}

export function useActiveClinic(): ActiveClinicContext {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["active-clinic", user?.id],
    enabled: !!user?.id,
    staleTime: 30_000,
    gcTime: 60_000,
    queryFn: () => fetchActiveClinic(user!.id),
  });
  return {
    clinicId: data?.clinicId ?? null,
    clinicRole: data?.clinicRole ?? null,
    isOwner: data?.isOwner ?? false,
    isAdmin: data?.isAdmin ?? false,
    isProfessional: data?.isProfessional ?? false,
    supportMode: data?.supportMode ?? false,
    supportClinicId: data?.supportClinicId ?? null,
    loading: isLoading,
  };
}

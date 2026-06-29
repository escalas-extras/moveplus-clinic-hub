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

export type SessionBootstrap = {
  isSuperAdmin: boolean;
  isPlatformAdmin: boolean;
  hasClinic: boolean;
  clinicId: string | null;
  clinicRole: ActiveClinicRole | null;
  isOwner: boolean;
  isAdmin: boolean;
  isProfessional: boolean;
  supportMode: boolean;
  supportClinicId: string | null;
};

export async function fetchSessionBootstrap(userId: string): Promise<SessionBootstrap> {
  const [rolesRes, membersRes, supportRes] = await Promise.all([
    supabase.from("user_roles").select("role").eq("user_id", userId),
    supabase
      .from("clinic_members")
      .select("role, clinic_id, is_default")
      .eq("user_id", userId)
      .eq("active", true)
      .order("is_default", { ascending: false }),
    supabase.rpc("current_support_session_clinic"),
  ]);

  const roles = (rolesRes.data ?? []).map((r) => r.role as string);
  const isSuperAdmin = roles.includes("super_admin");
  const members = membersRes.data ?? [];
  const supportClinicId = (supportRes.data as string | null) ?? null;
  const inSupport = !!supportClinicId;
  const isPlatformAdmin = isSuperAdmin && !inSupport;
  const hasClinic = members.length > 0;

  if (supportClinicId) {
    const member = members.find((m) => m.clinic_id === supportClinicId) ?? members[0];
    const role = (member?.role as ActiveClinicRole | undefined) ?? "owner";
    return {
      isSuperAdmin,
      isPlatformAdmin,
      hasClinic,
      clinicId: supportClinicId,
      clinicRole: role,
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
    isSuperAdmin,
    isPlatformAdmin,
    hasClinic,
    clinicId: active?.clinic_id ?? null,
    clinicRole: role,
    isOwner: role === "owner",
    isAdmin: role === "owner" || role === "admin",
    isProfessional: role === "profissional",
    supportMode: false,
    supportClinicId: null,
  };
}

export function useSessionBootstrap() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["session-bootstrap", user?.id],
    enabled: !!user?.id,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    queryFn: () => fetchSessionBootstrap(user!.id),
  });

  return {
    data,
    loading: isLoading && !data,
  };
}

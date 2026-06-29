import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { getStoredActiveClinicId } from "@/lib/active-clinic-storage";

export type ActiveClinicRole =
  | "owner"
  | "admin"
  | "profissional"
  | "recepcao"
  | "financeiro"
  | string;

export type ClinicMembership = {
  clinicId: string;
  role: ActiveClinicRole;
  isDefault: boolean;
};

export type SessionBootstrap = {
  isSuperAdmin: boolean;
  isPlatformAdmin: boolean;
  hasClinic: boolean;
  membershipCount: number;
  needsClinicSelection: boolean;
  memberships: ClinicMembership[];
  clinicId: string | null;
  clinicRole: ActiveClinicRole | null;
  isOwner: boolean;
  isAdmin: boolean;
  isProfessional: boolean;
  supportMode: boolean;
  supportClinicId: string | null;
};

function resolveActiveMember(
  members: Array<{ clinic_id: string; role: string; is_default: boolean }>,
  userId: string,
  supportClinicId: string | null,
) {
  const memberships: ClinicMembership[] = members.map((m) => ({
    clinicId: m.clinic_id,
    role: m.role as ActiveClinicRole,
    isDefault: !!m.is_default,
  }));

  if (supportClinicId) {
    const member = members.find((m) => m.clinic_id === supportClinicId) ?? members[0];
    const role = (member?.role as ActiveClinicRole | undefined) ?? "owner";
    return {
      memberships,
      membershipCount: members.length,
      needsClinicSelection: false,
      clinicId: supportClinicId,
      clinicRole: role,
      isOwner: true,
      isAdmin: true,
      isProfessional: false,
      supportMode: true,
      supportClinicId,
    };
  }

  if (members.length === 0) {
    return {
      memberships,
      membershipCount: 0,
      needsClinicSelection: false,
      clinicId: null,
      clinicRole: null,
      isOwner: false,
      isAdmin: false,
      isProfessional: false,
      supportMode: false,
      supportClinicId: null,
    };
  }

  if (members.length === 1) {
    const m = members[0];
    const role = m.role as ActiveClinicRole;
    return {
      memberships,
      membershipCount: 1,
      needsClinicSelection: false,
      clinicId: m.clinic_id,
      clinicRole: role,
      isOwner: role === "owner",
      isAdmin: role === "owner" || role === "admin",
      isProfessional: role === "profissional",
      supportMode: false,
      supportClinicId: null,
    };
  }

  const storedId = getStoredActiveClinicId(userId);
  const storedMember = storedId ? members.find((m) => m.clinic_id === storedId) : null;
  if (storedMember) {
    const role = storedMember.role as ActiveClinicRole;
    return {
      memberships,
      membershipCount: members.length,
      needsClinicSelection: false,
      clinicId: storedMember.clinic_id,
      clinicRole: role,
      isOwner: role === "owner",
      isAdmin: role === "owner" || role === "admin",
      isProfessional: role === "profissional",
      supportMode: false,
      supportClinicId: null,
    };
  }

  return {
    memberships,
    membershipCount: members.length,
    needsClinicSelection: true,
    clinicId: null,
    clinicRole: null,
    isOwner: false,
    isAdmin: false,
    isProfessional: false,
    supportMode: false,
    supportClinicId: null,
  };
}

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

  const resolved = resolveActiveMember(members, userId, supportClinicId);

  return {
    isSuperAdmin,
    isPlatformAdmin,
    hasClinic,
    ...resolved,
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

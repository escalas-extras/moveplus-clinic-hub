import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export type PlatformContext = {
  isPlatformAdmin: boolean; // super_admin sem clinic_members
  isSuperAdmin: boolean;
  hasClinic: boolean;
  loading: boolean;
};

async function fetchContext(userId: string) {
  const [rolesRes, membersRes, supportRes] = await Promise.all([
    supabase.from("user_roles").select("role").eq("user_id", userId),
    supabase.from("clinic_members").select("id").eq("user_id", userId).eq("active", true).limit(1),
    supabase.rpc("current_support_session_clinic"),
  ]);
  const roles = (rolesRes.data ?? []).map((r) => r.role as string);
  const isSuperAdmin = roles.includes("super_admin");
  const hasClinic = (membersRes.data ?? []).length > 0;
  const inSupport = !!supportRes.data;
  // Admin SaaS (super_admin) é SEMPRE platform admin fora do modo suporte,
  // mesmo quando também é membro/owner de uma clínica. Isolamento total dos
  // dados clínicos: só vê dados de clínica via Modo Suporte explícito.
  return { isSuperAdmin, hasClinic, isPlatformAdmin: isSuperAdmin && !inSupport };
}

export function usePlatformContext(): PlatformContext {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["platform-context", user?.id],
    enabled: !!user?.id,
    staleTime: 30_000,
    gcTime: 60_000,
    queryFn: () => fetchContext(user!.id),
  });
  return {
    isPlatformAdmin: data?.isPlatformAdmin ?? false,
    isSuperAdmin: data?.isSuperAdmin ?? false,
    hasClinic: data?.hasClinic ?? false,
    loading: isLoading,
  };
}

export async function resolvePostLoginRedirect(userId: string): Promise<string> {
  const ctx = await fetchContext(userId);
  // Super admins (SaaS) sempre entram no painel administrativo,
  // mesmo quando também são membros/owners de uma clínica.
  // Usuários comuns/owners de clínica seguem para a clínica ativa.
  return ctx.isSuperAdmin ? "/app/admin-saas" : "/app";
}

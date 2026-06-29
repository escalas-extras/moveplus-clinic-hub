import { useSessionBootstrap, fetchSessionBootstrap } from "@/lib/session-bootstrap";
import { useAuth } from "@/lib/auth";

export type PlatformContext = {
  isPlatformAdmin: boolean;
  isSuperAdmin: boolean;
  hasClinic: boolean;
  loading: boolean;
};

export function usePlatformContext(): PlatformContext {
  const { loading: authLoading } = useAuth();
  const { data, loading } = useSessionBootstrap();

  return {
    isPlatformAdmin: data?.isPlatformAdmin ?? false,
    isSuperAdmin: data?.isSuperAdmin ?? false,
    hasClinic: data?.hasClinic ?? false,
    loading: authLoading || loading,
  };
}

export async function resolvePostLoginRedirect(userId: string): Promise<string> {
  const ctx = await fetchSessionBootstrap(userId);
  return ctx.isSuperAdmin ? "/app/admin-saas" : "/app";
}

export { fetchSessionBootstrap as fetchContext };

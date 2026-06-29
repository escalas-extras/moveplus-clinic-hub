import { useSessionBootstrap } from "@/lib/session-bootstrap";
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

export { resolvePostLoginRedirect, resolveEntryPath } from "@/lib/post-login-routing";
export { fetchSessionBootstrap as fetchContext } from "@/lib/session-bootstrap";

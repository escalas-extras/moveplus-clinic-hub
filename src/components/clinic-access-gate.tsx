import type { ReactNode } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useClinicOperationalAccess } from "@/lib/saas/use-clinic-operational-access";
import { AccessRestrictedScreen } from "@/components/access/AccessRestrictedScreen";
import { isEntryHelperPath } from "@/lib/post-login-routing";
import { supabase } from "@/integrations/supabase/client";
import { ClinicalSkeleton } from "@/components/layout";

const BYPASS_PATHS = ["/app/admin-saas", "/app/configuracoes"];

type Props = { children: ReactNode };

export function ClinicAccessGate({ children }: Props) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const qc = useQueryClient();
  const access = useClinicOperationalAccess();

  const bypass =
    BYPASS_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`)) ||
    isEntryHelperPath(pathname);

  if (bypass) {
    return <>{children}</>;
  }

  if (access.loading) {
    return (
      <div className="p-6">
        <ClinicalSkeleton variant="dashboard" kpiCount={2} />
      </div>
    );
  }

  if (access.allowed) {
    return <>{children}</>;
  }

  async function logout() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const blockedStatus =
    access.status === "trial" && (access.trialDaysLeft ?? 0) === 0 ? "suspended" : access.status;

  return (
    <AccessRestrictedScreen
      status={blockedStatus}
      trialDaysLeft={access.trialDaysLeft}
      embedded
      onLogout={() => void logout()}
    />
  );
}

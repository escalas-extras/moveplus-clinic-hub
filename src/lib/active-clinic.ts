// Single source of truth for the active clinic context (Bloco A).
// Reads from unified session bootstrap — one network round-trip for roles,
// clinic membership and support session.

import { useSessionBootstrap, type ActiveClinicRole } from "@/lib/session-bootstrap";
import { useAuth } from "@/lib/auth";

export type { ActiveClinicRole };

export type ActiveClinicContext = {
  clinicId: string | null;
  clinicRole: ActiveClinicRole | null;
  isOwner: boolean;
  isAdmin: boolean;
  isProfessional: boolean;
  supportMode: boolean;
  supportClinicId: string | null;
  loading: boolean;
};

export function useActiveClinic(): ActiveClinicContext {
  const { user, loading: authLoading } = useAuth();
  const { data, loading } = useSessionBootstrap();

  return {
    clinicId: data?.clinicId ?? null,
    clinicRole: data?.clinicRole ?? null,
    isOwner: data?.isOwner ?? false,
    isAdmin: data?.isAdmin ?? false,
    isProfessional: data?.isProfessional ?? false,
    supportMode: data?.supportMode ?? false,
    supportClinicId: data?.supportClinicId ?? null,
    loading: authLoading || loading,
  };
}

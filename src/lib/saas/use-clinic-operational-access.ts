import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveClinic } from "@/lib/active-clinic";
import { usePlatformContext } from "@/lib/platform-context";
import {
  clinicOperationalAccessAllowed,
  resolveOperationalStatus,
  trialDaysRemaining,
  type ClinicOperationalStatus,
} from "./clinic-operational-status";

export type ClinicOperationalAccess = {
  loading: boolean;
  allowed: boolean;
  status: ClinicOperationalStatus | null;
  trialEndsAt: string | null;
  trialDaysLeft: number | null;
};

async function fetchOperationalRow(clinicId: string) {
  const [clinicRes, planRes] = await Promise.all([
    supabase.from("clinics").select("status, trial_ends_at").eq("id", clinicId).maybeSingle(),
    supabase
      .from("clinic_plans")
      .select("status, trial_ends_at")
      .eq("clinic_id", clinicId)
      .in("status", ["active", "trial"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  const trialEndsAt =
    (planRes.data?.trial_ends_at as string | null) ??
    (clinicRes.data?.trial_ends_at as string | null) ??
    null;
  return {
    clinic_status: clinicRes.data?.status ?? null,
    plan_status: planRes.data?.status ?? null,
    trial_ends_at: trialEndsAt,
  };
}

export function useClinicOperationalAccess(): ClinicOperationalAccess {
  const { clinicId, supportMode, loading: clinicLoading } = useActiveClinic();
  const { isPlatformAdmin } = usePlatformContext();

  const { data, isLoading } = useQuery({
    queryKey: ["clinic-operational-access", clinicId],
    enabled: !!clinicId && !isPlatformAdmin,
    staleTime: 30_000,
    queryFn: () => fetchOperationalRow(clinicId!),
  });

  if (isPlatformAdmin || supportMode) {
    return {
      loading: clinicLoading,
      allowed: true,
      status: null,
      trialEndsAt: null,
      trialDaysLeft: null,
    };
  }

  if (!clinicId) {
    return {
      loading: clinicLoading || isLoading,
      allowed: false,
      status: null,
      trialEndsAt: null,
      trialDaysLeft: null,
    };
  }

  const row = data ?? { clinic_status: null, plan_status: null, trial_ends_at: null };
  const status = data ? resolveOperationalStatus(row) : null;
  const trialEndsAt = row.trial_ends_at;

  return {
    loading: clinicLoading || isLoading,
    allowed: data ? clinicOperationalAccessAllowed(row) : false,
    status,
    trialEndsAt,
    trialDaysLeft: trialDaysRemaining(trialEndsAt),
  };
}

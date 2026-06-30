import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useActiveClinic } from "@/lib/active-clinic";
import { useAuth } from "@/lib/auth";
import { useBranding } from "@/lib/branding";
import { supabase } from "@/integrations/supabase/client";
import {
  EMPTY_DASHBOARD_DETAILS,
  fetchDashboardCoreStats,
  fetchDashboardDetailStats,
  type DashboardStats,
} from "@/lib/dashboard-stats";
import { AppShell, ClinicalSkeleton, QueryErrorState } from "@/components/layout";
import { ClinicHomeDashboard } from "@/components/home";

export const Route = createFileRoute("/_authenticated/app/")({
  component: PainelClinico,
});

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function startOfWeek(d: Date) {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const s = new Date(d);
  s.setDate(d.getDate() + diff);
  return isoDate(s);
}

function endOfWeek(d: Date) {
  const s = new Date(startOfWeek(d) + "T00:00:00");
  s.setDate(s.getDate() + 6);
  return isoDate(s);
}

function getGreeting(hour: number) {
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

type HomeUserProfile = {
  full_name?: string | null;
  professional_name?: string | null;
};

function formatDisplayName(value: string | null | undefined, options?: { allowUsername?: boolean }): string {
  if (!value) return "";
  const raw = value.trim();
  if (!raw || raw.includes("@")) return "";

  let name = raw.replace(/[._-]+/g, " ").replace(/\s+/g, " ").trim();
  if (!name) return "";
  if (!options?.allowUsername && !name.includes(" ") && /\d/.test(name)) return "";

  const firstName = name.split(" ")[0];
  return firstName
    .split(" ")
    .map((part) => {
      if (!part) return part;
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(" ");
}

function getDisplayName(user: ReturnType<typeof useAuth>["user"], profile?: HomeUserProfile | null) {
  const professionalName = formatDisplayName(profile?.professional_name);
  if (professionalName) return professionalName;

  const profileFullName = formatDisplayName(profile?.full_name);
  if (profileFullName) return profileFullName;

  const meta = user?.user_metadata as { full_name?: string; name?: string } | undefined;
  const metadataFullName = formatDisplayName(meta?.full_name);
  if (metadataFullName) return metadataFullName;

  const metadataName = formatDisplayName(meta?.name);
  if (metadataName) return metadataName;

  return "Profissional";
}

function PainelClinico() {
  const { clinicId } = useActiveClinic();
  const { user } = useAuth();
  const brand = useBranding();

  const today = new Date();
  const todayIso = isoDate(today);
  const weekStartIso = startOfWeek(today);
  const weekEndIso = endOfWeek(today);
  const thisMonth = startOfMonth(today);
  const prevMonth = new Date(thisMonth.getFullYear(), thisMonth.getMonth() - 1, 1);
  const thisMonthIso = isoDate(thisMonth);
  const prevMonthIso = isoDate(prevMonth);

  const profile = useQuery({
    queryKey: ["home-user-profile", user?.id, clinicId],
    enabled: !!user?.id,
    staleTime: 10 * 60_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const [profileRes, professionalRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user!.id)
          .maybeSingle(),
        clinicId
          ? supabase
              .from("professionals")
              .select("nome")
              .eq("profile_id", user!.id)
              .eq("clinic_id", clinicId)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      return {
        full_name: profileRes.data?.full_name ?? null,
        professional_name: professionalRes.data?.nome ?? null,
      };
    },
  });

  const greeting = getGreeting(today.getHours());
  const displayName = getDisplayName(user, profile.data as HomeUserProfile | null);
  const dateLabel = today.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const dateKey = {
    todayIso,
    weekStartIso,
    weekEndIso,
    thisMonthIso,
    prevMonthIso,
  };

  const coreStats = useQuery({
    queryKey: ["painel-clinico-core", clinicId, todayIso, weekStartIso, weekEndIso, thisMonthIso, prevMonthIso],
    enabled: !!clinicId,
    staleTime: 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    queryFn: () => fetchDashboardCoreStats(clinicId!, dateKey),
  });

  const detailStats = useQuery({
    queryKey: ["painel-clinico-details", clinicId, todayIso],
    enabled: !!clinicId && !!coreStats.data,
    staleTime: 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    queryFn: () => fetchDashboardDetailStats(clinicId!, todayIso),
  });

  const s = useMemo((): DashboardStats | undefined => {
    if (!coreStats.data) return undefined;
    return {
      ...EMPTY_DASHBOARD_DETAILS,
      ...coreStats.data,
      ...(detailStats.data ?? {}),
    };
  }, [coreStats.data, detailStats.data]);

  const isNewClinic = !!s && s.pacientesAtivos === 0 && s.docsMes === 0 && s.atendHoje === 0;
  const loadingCore = coreStats.isLoading;
  const loadingDetails = detailStats.isLoading && !detailStats.data;

  return (
    <AppShell clinical>
      {coreStats.isError ? (
        <QueryErrorState onRetry={() => void coreStats.refetch()} />
      ) : loadingCore || !s ? (
        <ClinicalSkeleton variant="dashboard" kpiCount={4} />
      ) : (
        <ClinicHomeDashboard
          greeting={greeting}
          displayName={displayName}
          clinicName={brand.clinicName}
          dateLabel={dateLabel}
          primaryColor={brand.primaryColor}
          secondaryColor={brand.secondaryColor}
          stats={s}
          isNewClinic={isNewClinic}
          logoUploaded={brand.hasOwnLogo}
          loadingDetails={loadingDetails}
        />
      )}
    </AppShell>
  );
}

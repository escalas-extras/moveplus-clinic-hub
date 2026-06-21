import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePlatformContext } from "@/lib/platform-context";
import { useAuth } from "@/lib/auth";
import { resolveClinicLogoUrl } from "@/lib/clinic-logo";

export type Branding = {
  appName: string;
  clinicName: string;
  slogan: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  crefitoDefault: string | null;
  hasOwnLogo: boolean;
};

const DEFAULTS: Branding = {
  appName: "FisioOS",
  clinicName: "FisioOS",
  slogan: "Sistema operacional para clínicas de fisioterapia",
  logoUrl: null,
  primaryColor: "#0F4C5C",
  secondaryColor: "#2BB673",
  crefitoDefault: null,
  hasOwnLogo: false,
};

async function resolveClinicId(isPlatformAdmin: boolean): Promise<string | null> {
  const { data: supportCid } = await supabase.rpc("current_support_session_clinic");
  if (isPlatformAdmin && !supportCid) return null;
  if (supportCid) return supportCid as string;
  const { data: ownCid } = await supabase.rpc("current_clinic_id");
  return (ownCid as string | null) ?? null;
}

async function loadBranding(cid: string): Promise<Branding> {
  const { data } = await supabase
    .from("clinic_settings")
    .select("nome_fantasia, logo_url, primary_color, secondary_color, slogan, app_name, crefito_default")
    .eq("clinic_id", cid)
    .maybeSingle();
  if (!data) return DEFAULTS;
  const resolvedLogo = await resolveClinicLogoUrl(data.logo_url);
  return {
    appName: data.app_name || DEFAULTS.appName,
    clinicName: data.nome_fantasia || DEFAULTS.appName,
    slogan: data.slogan || DEFAULTS.slogan,
    logoUrl: resolvedLogo,
    primaryColor: data.primary_color || DEFAULTS.primaryColor,
    secondaryColor: data.secondary_color || DEFAULTS.secondaryColor,
    crefitoDefault: data.crefito_default || null,
    hasOwnLogo: !!resolvedLogo,
  } satisfies Branding;
}

export function useBranding(): Branding & { isLoading: boolean } {
  const { isPlatformAdmin, loading: ctxLoading } = usePlatformContext();
  const { user } = useAuth();

  // Resolve clinic_id separadamente, com cache estável, evitando refetch
  // de branding por oscilação transitória do platform-context.
  const { data: clinicId, isLoading: cidLoading } = useQuery({
    queryKey: ["branding-clinic-id", user?.id ?? "anon"],
    enabled: !ctxLoading && !!user?.id,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    queryFn: () => resolveClinicId(isPlatformAdmin),
  });

  // Branding por clinic_id: chave estável → não pisca ao trocar de rota.
  const { data, isLoading: brLoading } = useQuery({
    queryKey: ["branding", clinicId ?? "none"],
    enabled: !ctxLoading && !cidLoading && !!clinicId,
    staleTime: 15 * 60_000,
    gcTime: 60 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    queryFn: () => loadBranding(clinicId!),
  });

  const isLoading = ctxLoading || cidLoading || (!!clinicId && brLoading);
  return { ...(data ?? DEFAULTS), isLoading };
}

export const FISIOOS_DEFAULTS = DEFAULTS;

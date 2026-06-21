import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePlatformContext } from "@/lib/platform-context";
import { useAuth } from "@/lib/auth";

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

async function loadBranding(isPlatformAdmin: boolean): Promise<Branding> {
  // Platform context (super_admin sem clínica) sempre usa branding FisioOS.
  if (isPlatformAdmin) return DEFAULTS;
  // Resolve clinic_id via current_clinic_id() — sem fallback para a primeira clínica.
  const { data: cid } = await supabase.rpc("current_clinic_id");
  if (!cid) return DEFAULTS;
  const { data } = await supabase
    .from("clinic_settings")
    .select("nome_fantasia, logo_url, primary_color, secondary_color, slogan, app_name, crefito_default")
    .eq("clinic_id", cid as string)
    .maybeSingle();
  if (!data) return DEFAULTS;
  return {
    appName: data.app_name || DEFAULTS.appName,
    clinicName: data.nome_fantasia || DEFAULTS.appName,
    slogan: data.slogan || DEFAULTS.slogan,
    logoUrl: data.logo_url || null,
    primaryColor: data.primary_color || DEFAULTS.primaryColor,
    secondaryColor: data.secondary_color || DEFAULTS.secondaryColor,
    crefitoDefault: data.crefito_default || null,
    hasOwnLogo: !!data.logo_url,
  } satisfies Branding;
}

export function useBranding(): Branding {
  const { isPlatformAdmin, loading } = usePlatformContext();
  const { user } = useAuth();
  const { data } = useQuery({
    // queryKey inclui user.id para evitar reuso de cache entre usuários/clínicas no mesmo browser.
    queryKey: ["branding", user?.id ?? "anon", isPlatformAdmin],
    enabled: !loading && !!user?.id,
    staleTime: 5 * 60_000,
    queryFn: () => loadBranding(isPlatformAdmin),
  });
  return data ?? DEFAULTS;
}

export const FISIOOS_DEFAULTS = DEFAULTS;

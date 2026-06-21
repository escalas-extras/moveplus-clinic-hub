import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveClinic } from "@/lib/active-clinic";
import { resolveClinicLogoUrl } from "@/lib/clinic-logo";
import { pcGet, pcSet } from "@/lib/persistent-cache";

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

const BRAND_TTL_MS = 24 * 60 * 60_000; // 24h — only as instant-render hint
const brandKey = (cid: string) => `fos:branding:${cid}`;

async function loadBranding(cid: string): Promise<Branding> {
  const { data } = await supabase
    .from("clinic_settings")
    .select(
      "nome_fantasia, logo_url, primary_color, secondary_color, slogan, app_name, crefito_default",
    )
    .eq("clinic_id", cid)
    .maybeSingle();
  if (!data) return DEFAULTS;
  const resolvedLogo = await resolveClinicLogoUrl(data.logo_url);
  const branding: Branding = {
    appName: data.app_name || DEFAULTS.appName,
    clinicName: data.nome_fantasia || DEFAULTS.appName,
    slogan: data.slogan || DEFAULTS.slogan,
    logoUrl: resolvedLogo,
    primaryColor: data.primary_color || DEFAULTS.primaryColor,
    secondaryColor: data.secondary_color || DEFAULTS.secondaryColor,
    crefitoDefault: data.crefito_default || null,
    hasOwnLogo: !!resolvedLogo,
  };
  pcSet(brandKey(cid), branding, BRAND_TTL_MS);
  return branding;
}

export function useBranding(): Branding & { isLoading: boolean } {
  const { clinicId, loading: clinicLoading } = useActiveClinic();

  const initialBrand = clinicId ? pcGet<Branding>(brandKey(clinicId)) : null;

  const { data, isLoading: brLoading } = useQuery({
    queryKey: ["branding", clinicId ?? "none"],
    enabled: !!clinicId,
    staleTime: 0,
    gcTime: 60 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    initialData: initialBrand ?? undefined,
    queryFn: () => loadBranding(clinicId!),
  });

  const isLoading = clinicLoading || (!!clinicId && brLoading && !data);
  return { ...(data ?? DEFAULTS), isLoading };
}

export const FISIOOS_DEFAULTS = DEFAULTS;

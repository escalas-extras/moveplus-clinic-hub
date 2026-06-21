import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
  slogan: "Transformando atendimentos em resultados",
  logoUrl: null,
  primaryColor: "#0F4C5C",
  secondaryColor: "#2BB673",
  crefitoDefault: null,
  hasOwnLogo: false,
};

async function loadBranding(): Promise<Branding> {
  // Resolve clinic_id via current_clinic_id() helper; fallback to first row.
  const { data: cid } = await supabase.rpc("current_clinic_id");
  let q = supabase
    .from("clinic_settings")
    .select("nome_fantasia, logo_url, primary_color, secondary_color, slogan, app_name, crefito_default");
  q = cid ? q.eq("clinic_id", cid as string) : q.limit(1);
  const { data } = await q.maybeSingle();
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
  const { data } = useQuery({
    queryKey: ["branding"],
    staleTime: 5 * 60_000,
    queryFn: loadBranding,
  });
  return data ?? DEFAULTS;
}

export const FISIOOS_DEFAULTS = DEFAULTS;

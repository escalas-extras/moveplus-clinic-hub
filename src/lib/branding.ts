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
  primaryColor: "#2f5d3a",
  secondaryColor: "#c75c3a",
  crefitoDefault: null,
  hasOwnLogo: false,
};

export function useBranding(): Branding {
  const { data } = useQuery({
    queryKey: ["branding"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("clinic_settings")
        .select("nome_fantasia, logo_url, primary_color, secondary_color, slogan, app_name, crefito_default")
        .limit(1)
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
    },
  });
  return data ?? DEFAULTS;
}

export const FISIOOS_DEFAULTS = DEFAULTS;

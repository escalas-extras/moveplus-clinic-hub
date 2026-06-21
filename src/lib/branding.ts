import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePlatformContext } from "@/lib/platform-context";
import { useAuth } from "@/lib/auth";
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
const CID_TTL_MS = 24 * 60 * 60_000;

const cidKey = (uid: string) => `fos:clinic-id:${uid}`;
const brandKey = (cid: string) => `fos:branding:${cid}`;

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
  const { isPlatformAdmin, loading: ctxLoading } = usePlatformContext();
  const { user } = useAuth();

  const initialCid = user?.id ? pcGet<string>(cidKey(user.id)) : null;

  const { data: clinicId, isLoading: cidLoading } = useQuery({
    queryKey: ["branding-clinic-id", user?.id ?? "anon"],
    enabled: !ctxLoading && !!user?.id,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    initialData: initialCid ?? undefined,
    queryFn: async () => {
      const cid = await resolveClinicId(isPlatformAdmin);
      if (user?.id && cid) pcSet(cidKey(user.id), cid, CID_TTL_MS);
      return cid;
    },
  });

  const initialBrand = clinicId ? pcGet<Branding>(brandKey(clinicId)) : null;

  const { data, isLoading: brLoading } = useQuery({
    queryKey: ["branding", clinicId ?? "none"],
    enabled: !ctxLoading && !!clinicId,
    staleTime: 15 * 60_000,
    gcTime: 60 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    initialData: initialBrand ?? undefined,
    queryFn: () => loadBranding(clinicId!),
  });

  const isLoading = ctxLoading || cidLoading || (!!clinicId && brLoading && !data);
  return { ...(data ?? DEFAULTS), isLoading };
}

export const FISIOOS_DEFAULTS = DEFAULTS;

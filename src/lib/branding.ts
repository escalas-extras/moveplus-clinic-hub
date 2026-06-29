import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveClinic } from "@/lib/active-clinic";
import { getCachedClinicLogoUrl, resolveClinicLogoUrl } from "@/lib/clinic-logo";
import { preloadImageUrl } from "@/lib/image-preload";
import { pcGet, pcSet } from "@/lib/persistent-cache";

/**
 * Branding white-label
 *
 * Toda identidade visual do FisioOS é resolvida exclusivamente a partir da
 * clínica ativa (`clinic_id`) — nunca há fallback para marca de outra clínica.
 * Quando a clínica ativa não tem logo cadastrada, usamos o fallback
 * institucional do próprio produto (FisioOS).
 */
export type Branding = {
  /** Nome do app/plataforma exibido no chrome (header, login) */
  appName: string;
  /** Nome de exibição da clínica ativa (ou fallback institucional FisioOS) */
  name: string;
  /** Alias legado de `name` — mantido para componentes existentes */
  clinicName: string;
  /** Slogan curto exibido no login/landing */
  slogan: string;
  /** URL assinada da logo da clínica ativa — null quando não cadastrada */
  logo: string | null;
  /** Alias legado de `logo` — mantido para componentes existentes */
  logoUrl: string | null;
  /** Caminho bruto em storage (`clinic_settings.logo_url`) */
  logoPath?: string | null;
  /** Cor primária da clínica (HEX) */
  primaryColor: string;
  /** Cor secundária da clínica (HEX) */
  secondaryColor: string;
  /** Rodapé institucional para impressão / documentos */
  footer: string;
  /** Registro CREFITO default (preenche assinaturas) */
  crefitoDefault: string | null;
  /**
   * true quando a clínica possui logo cadastrada no banco (`logo_url`).
   * Usado para decidir entre mostrar a logo ou o monograma institucional.
   */
  hasOwnLogo: boolean;
};

const DEFAULT_APP_NAME = "FisioOS";
const DEFAULT_SLOGAN = "Sistema operacional para clínicas de fisioterapia";
const DEFAULT_PRIMARY = "#0F4C5C";
const DEFAULT_SECONDARY = "#2BB673";

const DEFAULTS: Branding = {
  appName: DEFAULT_APP_NAME,
  name: DEFAULT_APP_NAME,
  clinicName: DEFAULT_APP_NAME,
  slogan: DEFAULT_SLOGAN,
  logo: null,
  logoUrl: null,
  logoPath: null,
  primaryColor: DEFAULT_PRIMARY,
  secondaryColor: DEFAULT_SECONDARY,
  footer: `${DEFAULT_APP_NAME} · ${DEFAULT_SLOGAN}`,
  crefitoDefault: null,
  hasOwnLogo: false,
};

const BRAND_TTL_MS = 24 * 60 * 60_000; // 24h — only as instant-render hint
const BRAND_QUERY_STALE_MS = 30 * 60_000; // 30 min — sessão estável entre rotas
const LOGO_QUERY_STALE_MS = 50 * 60_000; // alinhado ao cache de signed URL
const brandKey = (cid: string) => `fos:branding:${cid}`;
const brandingSession = new Map<string, Branding>();

function normalizeBranding(data: Branding | undefined): Branding {
  if (!data) return DEFAULTS;

  const merged: Branding = { ...DEFAULTS, ...data };

  if ((data as Branding).logoUrl != null && merged.logo == null) {
    merged.logo = (data as Branding).logoUrl ?? null;
  }
  if ((data as Branding).logo != null && merged.logoUrl == null) {
    merged.logoUrl = (data as Branding).logo ?? null;
  }
  if ((data as Branding).clinicName && merged.name === DEFAULTS.name) {
    merged.name = (data as Branding).clinicName;
    merged.clinicName = (data as Branding).clinicName;
  }

  const logoPath = merged.logoPath?.trim() || null;
  merged.logoPath = logoPath;
  merged.hasOwnLogo = !!logoPath;

  return merged;
}

/** Cache instantâneo de metadados — sem URL assinada (expira antes do TTL do branding). */
function brandingHintFromCache(cached: Branding | null | undefined): Branding | undefined {
  if (!cached) return undefined;
  return normalizeBranding({
    ...cached,
    logo: null,
    logoUrl: null,
  });
}

async function loadBranding(cid: string): Promise<Branding> {
  const { data } = await supabase
    .from("clinic_settings")
    .select(
      "nome_fantasia, logo_url, primary_color, secondary_color, slogan, app_name, crefito_default, rodape_institucional, cidade, estado",
    )
    .eq("clinic_id", cid)
    .maybeSingle();

  if (!data) return DEFAULTS;

  const logoPath = data.logo_url?.trim() || null;
  const name = data.nome_fantasia || DEFAULTS.appName;
  const cityState = [data.cidade, data.estado].filter(Boolean).join("/");
  const footer =
    (data.rodape_institucional || "").trim() ||
    [name, cityState].filter(Boolean).join(" · ") ||
    DEFAULTS.footer;

  const branding: Branding = normalizeBranding({
    appName: data.app_name || DEFAULTS.appName,
    name,
    clinicName: name,
    slogan: data.slogan || DEFAULTS.slogan,
    logo: null,
    logoUrl: null,
    logoPath,
    primaryColor: data.primary_color || DEFAULTS.primaryColor,
    secondaryColor: data.secondary_color || DEFAULTS.secondaryColor,
    footer,
    crefitoDefault: data.crefito_default || null,
    hasOwnLogo: !!logoPath,
  });

  brandingSession.set(cid, branding);
  pcSet(brandKey(cid), branding, BRAND_TTL_MS);
  return branding;
}

export function useBranding(options?: { disabled?: boolean }): Branding & { isLoading: boolean } {
  const disabled = options?.disabled ?? false;
  const { clinicId, loading: clinicLoading } = useActiveClinic();

  const sessionBrand = clinicId ? brandingSession.get(clinicId) : null;
  const cachedBrand = sessionBrand ?? (clinicId ? pcGet<Branding>(brandKey(clinicId)) : null);
  const initialBrand = brandingHintFromCache(cachedBrand);

  const { data, isLoading: brLoading, isFetching: brFetching } = useQuery({
    queryKey: ["branding", clinicId ?? "none"],
    enabled: !disabled && !!clinicId,
    staleTime: BRAND_QUERY_STALE_MS,
    gcTime: 60 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchOnReconnect: false,
    initialData: initialBrand,
    placeholderData: (prev) => prev ?? initialBrand,
    queryFn: () => loadBranding(clinicId!),
  });

  const merged = normalizeBranding(data);
  const logoPath = merged.logoPath?.trim() || null;

  const cachedLogoUrl = logoPath ? getCachedClinicLogoUrl(logoPath) : null;

  const { data: resolvedLogo, isLoading: logoLoading } = useQuery({
    queryKey: ["clinic-logo-url", clinicId, logoPath],
    queryFn: () => resolveClinicLogoUrl(logoPath),
    enabled: !!clinicId && !!logoPath,
    staleTime: LOGO_QUERY_STALE_MS,
    gcTime: 60 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    initialData: cachedLogoUrl ?? undefined,
    placeholderData: (prev) => prev ?? cachedLogoUrl ?? undefined,
  });

  const logo = logoPath ? resolvedLogo ?? cachedLogoUrl ?? null : null;

  useEffect(() => {
    if (logo) void preloadImageUrl(logo);
  }, [logo]);

  if (disabled) {
    return { ...DEFAULTS, isLoading: false };
  }

  const metaReady = !!data;
  const logoPending = !!logoPath && logoLoading && !logo;
  const isLoading =
    !!clinicId && (!metaReady || logoPending) && (clinicLoading || brLoading || brFetching || logoPending);

  return {
    ...merged,
    logo,
    logoUrl: logo,
    hasOwnLogo: !!logoPath,
    isLoading,
  };
}

export const FISIOOS_DEFAULTS = DEFAULTS;

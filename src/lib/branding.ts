import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveClinic } from "@/lib/active-clinic";
import { resolveClinicLogoUrl } from "@/lib/clinic-logo";
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
  /** Cor primária da clínica (HEX) */
  primaryColor: string;
  /** Cor secundária da clínica (HEX) */
  secondaryColor: string;
  /** Rodapé institucional para impressão / documentos */
  footer: string;
  /** Registro CREFITO default (preenche assinaturas) */
  crefitoDefault: string | null;
  /**
   * true quando a clínica possui logo própria (após resolveClinicLogoUrl).
   * Usado para decidir entre mostrar a logo cadastrada ou o monograma/“Powered by FisioOS”.
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
  primaryColor: DEFAULT_PRIMARY,
  secondaryColor: DEFAULT_SECONDARY,
  footer: `${DEFAULT_APP_NAME} · ${DEFAULT_SLOGAN}`,
  crefitoDefault: null,
  hasOwnLogo: false,
};

const BRAND_TTL_MS = 24 * 60 * 60_000; // 24h — only as instant-render hint
const brandKey = (cid: string) => `fos:branding:${cid}`;

async function loadBranding(cid: string): Promise<Branding> {
  const { data } = await supabase
    .from("clinic_settings")
    .select(
      "nome_fantasia, logo_url, primary_color, secondary_color, slogan, app_name, crefito_default, rodape_institucional, cidade, estado",
    )
    .eq("clinic_id", cid)
    .maybeSingle();

  if (!data) return DEFAULTS;

  const resolvedLogo = await resolveClinicLogoUrl(data.logo_url);
  const name = data.nome_fantasia || DEFAULTS.appName;
  const cityState = [data.cidade, data.estado].filter(Boolean).join("/");
  const footer =
    (data.rodape_institucional || "").trim() ||
    [name, cityState].filter(Boolean).join(" · ") ||
    DEFAULTS.footer;

  const branding: Branding = {
    appName: data.app_name || DEFAULTS.appName,
    name,
    clinicName: name,
    slogan: data.slogan || DEFAULTS.slogan,
    logo: resolvedLogo,
    logoUrl: resolvedLogo,
    primaryColor: data.primary_color || DEFAULTS.primaryColor,
    secondaryColor: data.secondary_color || DEFAULTS.secondaryColor,
    footer,
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
  // Defensive: cached entries pré-migração podem não ter `logo`/`name`/`footer`.
  const merged = data ? { ...DEFAULTS, ...data } : DEFAULTS;
  // Normaliza aliases legados que possam ter vindo do cache antigo.
  if (data && (data as any).logoUrl !== undefined && merged.logo === DEFAULTS.logo) {
    merged.logo = (data as any).logoUrl ?? null;
  }
  if (data && (data as any).clinicName && merged.name === DEFAULTS.name) {
    merged.name = (data as any).clinicName;
    merged.clinicName = (data as any).clinicName;
  }
  return { ...merged, isLoading };
}

export const FISIOOS_DEFAULTS = DEFAULTS;

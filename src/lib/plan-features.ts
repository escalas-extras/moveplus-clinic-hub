import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useSessionBootstrap } from "@/lib/session-bootstrap";

/**
 * Returns the active feature set (modules) for the user's current clinic.
 * Super admins always have full access.
 */
export function usePlanFeatures() {
  const { user } = useAuth();
  const { data: boot, loading: bootLoading } = useSessionBootstrap();

  const { data: features = [], isLoading: featuresLoading } = useQuery({
    queryKey: ["plan-features", boot?.clinicId],
    enabled: !!user?.id && !!boot && !boot.isSuperAdmin && !!boot.clinicId,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const clinicId = boot!.clinicId!;
      const { data: cp } = await supabase
        .from("clinic_plans")
        .select("plans(modules)")
        .eq("clinic_id", clinicId)
        .in("status", ["active", "trial"])
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const mods = (cp as any)?.plans?.modules;
      if (Array.isArray(mods)) return mods as string[];
      return [];
    },
  });

  const isSuperAdmin = boot?.isSuperAdmin ?? false;
  const isPlatformAdmin = boot?.isPlatformAdmin ?? false;
  const resolvedFeatures = isSuperAdmin ? ["*"] : features;

  const has = (feature: string) => {
    if (isPlatformAdmin || isSuperAdmin) return true;
    if (resolvedFeatures.includes("*")) return true;
    return resolvedFeatures.includes(feature);
  };

  return {
    has,
    features: resolvedFeatures,
    isLoading: bootLoading || (featuresLoading && !isSuperAdmin),
  };
}

export const PLAN_FEATURE_LABELS: Record<string, string> = {
  agenda: "Agenda",
  pacientes: "Pacientes",
  avaliacoes: "Avaliações",
  evolucoes: "Evoluções",
  home_care: "Home Care",
  biblioteca: "Biblioteca",
  documentos: "Documentos",
  relatorios: "Relatórios",
  marketing: "Marketing",
  treinamentos: "Treinamentos",
  pops: "POPs",
  teleconsulta: "Teleconsulta",
  api: "API",
  multi_unidade: "Multiunidade",
  assinatura_digital: "Assinatura Digital",
  inteligencia_clinica: "Inteligência Clínica",
  financeiro: "Financeiro",
};

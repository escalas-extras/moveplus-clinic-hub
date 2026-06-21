import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { usePlatformContext } from "@/lib/platform-context";

/**
 * Returns the active feature set (modules) for the user's current clinic.
 * Super admins always have full access.
 */
export function usePlanFeatures() {
  const { user } = useAuth();
  const { isSuperAdmin, isPlatformAdmin } = usePlatformContext();

  const { data: features = [], isLoading } = useQuery({
    queryKey: ["plan-features", user?.id, isSuperAdmin],
    enabled: !!user?.id,
    queryFn: async () => {
      if (isSuperAdmin) return ["*"];
      const { data: members } = await supabase
        .from("clinic_members")
        .select("clinic_id")
        .eq("user_id", user!.id)
        .eq("active", true)
        .order("is_default", { ascending: false })
        .limit(1);
      const clinicId = members?.[0]?.clinic_id;
      if (!clinicId) return [];
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

  const has = (feature: string) => {
    if (isPlatformAdmin || isSuperAdmin) return true;
    if (features.includes("*")) return true;
    return features.includes(feature);
  };

  return { has, features, isLoading };
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

// Utilidades para detecção de perfil clínico a partir do diagnóstico.
// Os dados clínicos completos vêm de catalog_diagnoses (parametrizado no banco).

export type ClinicalProfile = "neuro" | "orto" | "respiratorio" | "geriatrico" | "paliativo";

export const PROFILE_LABEL: Record<ClinicalProfile, string> = {
  neuro: "Neurológico",
  orto: "Ortopédico",
  respiratorio: "Respiratório",
  geriatrico: "Geriátrico",
  paliativo: "Cuidados Paliativos",
};

export const PROFILE_COLOR: Record<ClinicalProfile, string> = {
  neuro: "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30",
  orto: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  respiratorio: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30",
  geriatrico: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  paliativo: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
};

export type DiagnosisCatalogItem = {
  id: string;
  code: string;
  label: string;
  keywords: string[];
  clinical_profiles: ClinicalProfile[];
  suggested_scales: string[];
  suggested_objectives: string[];
  template_anamnese: string | null;
  template_objetivos: string | null;
  template_condutas: string | null;
};

function normalize(text: string): string {
  return (text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Detecta diagnósticos e perfis clínicos a partir do texto livre + idade. */
export function detectDiagnoses(
  diagnosticoText: string,
  catalog: DiagnosisCatalogItem[],
  ageYears?: number | null,
): { codes: string[]; profiles: ClinicalProfile[]; items: DiagnosisCatalogItem[] } {
  const norm = normalize(diagnosticoText);
  const matches = catalog.filter((d) =>
    d.keywords.some((kw) => kw && norm.includes(normalize(kw))),
  );

  const profileSet = new Set<ClinicalProfile>();
  matches.forEach((m) => m.clinical_profiles.forEach((p) => profileSet.add(p)));

  // Idade ≥ 60 → adiciona perfil geriátrico automaticamente
  if (typeof ageYears === "number" && ageYears >= 60) {
    profileSet.add("geriatrico");
  }

  return {
    codes: matches.map((m) => m.code),
    profiles: Array.from(profileSet),
    items: matches,
  };
}

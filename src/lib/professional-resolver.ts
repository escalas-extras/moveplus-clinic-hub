// Resolução e validação canônica do "profissional responsável" de uma clínica.
// Compartilhado entre Documentos, builders de PDF e qualquer ponto de emissão.
// Arquitetura genérica: nenhuma referência hardcoded a clínica/usuário.

import { supabase } from "@/integrations/supabase/client";

export type ProfessionalLite = {
  id: string;
  nome: string | null;
  profissao: string | null;
  conselho: string | null;
  registro: string | null;
  situacao: string | null;
  profile_id: string | null;
} & Record<string, any>;

export type ProfessionalStatus =
  | "ok"
  | "no-link"
  | "inactive"
  | "missing-conselho"
  | "missing-registro";

export type ProfessionalValidation = {
  professional: ProfessionalLite | null;
  status: ProfessionalStatus;
  message: string;
};

/**
 * Regras de elegibilidade do profissional responsável por um documento clínico.
 * Aplicáveis a qualquer clínica do FisioOS (white-label).
 */
export function validateProfessionalForDoc(prof: ProfessionalLite | null): ProfessionalValidation {
  if (!prof) {
    return {
      professional: null,
      status: "no-link",
      message: "Nenhum profissional responsável ativo foi localizado para esta clínica.",
    };
  }
  if (prof.situacao && prof.situacao !== "ativo") {
    return { professional: prof, status: "inactive", message: "O profissional responsável está inativo." };
  }
  if (!prof.conselho?.trim()) {
    return {
      professional: prof,
      status: "missing-conselho",
      message: "Preencha o conselho profissional do responsável antes de emitir documentos.",
    };
  }
  if (!prof.registro?.trim()) {
    return {
      professional: prof,
      status: "missing-registro",
      message: "Preencha o número de registro profissional antes de emitir documentos.",
    };
  }
  return { professional: prof, status: "ok", message: "" };
}

/**
 * Resolve o profissional responsável da clínica ativa.
 * 1) Profissional vinculado ao usuário logado (profile_id = userId).
 * 2) Fallback: primeiro profissional ativo da clínica (prioriza os que têm profile_id).
 *
 * Não filtra por conselho/registro — a validação é feita por `validateProfessionalForDoc`
 * para que a UI consiga mostrar mensagens granulares ("preencha conselho", etc.).
 */
export async function resolveResponsibleProfessional(
  clinicId: string,
  userId: string | null | undefined,
): Promise<ProfessionalLite | null> {
  if (userId) {
    const { data: byProfile } = await supabase
      .from("professionals")
      .select("*")
      .eq("clinic_id", clinicId)
      .eq("profile_id", userId)
      .maybeSingle();
    if (byProfile) return byProfile as ProfessionalLite;
  }
  const { data: list } = await supabase
    .from("professionals")
    .select("*")
    .eq("clinic_id", clinicId)
    .eq("situacao", "ativo")
    .order("profile_id", { ascending: false, nullsFirst: false })
    .order("nome");
  const rows = (list ?? []) as ProfessionalLite[];
  return rows.find((p) => p.profile_id) ?? rows[0] ?? null;
}

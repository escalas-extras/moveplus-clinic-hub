import { supabase } from "@/integrations/supabase/client";

const HISTORY_TABLES = [
  "assessments",
  "evolutions",
  "clinical_documents",
  "documents",
  "receipts",
  "financial_entries",
  "appointments",
  "home_care_visits",
  "patient_attachments",
  "exercise_programs",
  "patient_discharges",
  "assessment_drafts",
  "assessment_scales",
  "assessment_mrc",
  "assessment_goniometry",
  "assessment_goals",
  "clinical_signatures",
  "reassessment_schedule",
] as const;

export type SafeDeleteResult = { action: "deleted" | "deactivated" };

async function deactivate(clinicId: string, patientId: string): Promise<SafeDeleteResult> {
  const { data, error } = await supabase
    .from("patients")
    .update({ situacao: "inativo" } as any)
    .eq("clinic_id", clinicId)
    .eq("id", patientId)
    .select("id");
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error("Sem permissão para inativar este paciente.");
  }
  return { action: "deactivated" };
}

/**
 * Exclusão segura de paciente:
 * - Se houver vínculo clínico/financeiro/agenda, inativa (situacao='inativo').
 * - Caso contrário, tenta excluir. Se o banco rejeitar por FK ou RLS, inativa.
 */
export async function safeDeletePatient(params: {
  clinicId: string;
  patientId: string;
}): Promise<SafeDeleteResult> {
  const { clinicId, patientId } = params;

  let hasHistory = false;
  for (const table of HISTORY_TABLES) {
    const { count, error } = await supabase
      .from(table as any)
      .select("id", { count: "exact", head: true })
      .eq("patient_id", patientId);
    if (error) continue;
    if ((count ?? 0) > 0) {
      hasHistory = true;
      break;
    }
  }

  if (hasHistory) {
    return deactivate(clinicId, patientId);
  }

  // Tenta exclusão definitiva
  const { data, error } = await supabase
    .from("patients")
    .delete()
    .eq("clinic_id", clinicId)
    .eq("id", patientId)
    .select("id");

  // FK violation (23503) ou similar → cair para inativação
  if (error) {
    const code = (error as any).code as string | undefined;
    if (code === "23503" || code === "23P01") {
      return deactivate(clinicId, patientId);
    }
    throw error;
  }

  // RLS pode silenciar o DELETE (0 linhas) → inativa como fallback
  if (!data || data.length === 0) {
    return deactivate(clinicId, patientId);
  }

  return { action: "deleted" };
}

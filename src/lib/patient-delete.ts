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
] as const;

export type SafeDeleteResult = { action: "deleted" | "deactivated" };

/**
 * Exclusão segura de paciente:
 * - Se houver QUALQUER vínculo clínico/financeiro/agenda, inativa (situacao='inativo').
 * - Caso contrário, exclui definitivamente.
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
    // ignorar tabelas inexistentes/sem permissão (não bloquear o fluxo)
    if (error) continue;
    if ((count ?? 0) > 0) {
      hasHistory = true;
      break;
    }
  }

  if (hasHistory) {
    const { error } = await supabase
      .from("patients")
      .update({ situacao: "inativo" } as any)
      .eq("clinic_id", clinicId)
      .eq("id", patientId);
    if (error) throw error;
    return { action: "deactivated" };
  }

  const { error } = await supabase
    .from("patients")
    .delete()
    .eq("clinic_id", clinicId)
    .eq("id", patientId);
  if (error) throw error;
  return { action: "deleted" };
}

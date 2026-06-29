import { supabase } from "@/integrations/supabase/client";

export type ClinicalRecordTable = "assessments" | "evolutions";

export type DeleteClinicalRecordParams = {
  clinicId: string;
  table: ClinicalRecordTable;
  rowId: string;
  supportMode?: boolean;
  lockedAt?: string | null;
  status?: string | null;
};

function mapDeleteError(error: { code?: string; message?: string }, table: ClinicalRecordTable): string {
  const code = error.code;
  if (code === "23503") {
    return table === "assessments"
      ? "Não é possível excluir: a avaliação possui documentos ou registros vinculados."
      : "Não é possível excluir: a evolução possui registros vinculados.";
  }
  if (code === "insufficient_privilege" || error.message?.includes("Modo Suporte")) {
    return "Modo Suporte ativo: exclusão não permitida. Encerre a sessão de suporte para continuar.";
  }
  return error.message || "Erro ao excluir registro.";
}

async function explainSilentDeleteFailure(
  clinicId: string,
  table: ClinicalRecordTable,
  rowId: string,
): Promise<string> {
  const { data: existing } = await supabase
    .from(table)
    .select("id, locked_at, status")
    .eq("clinic_id", clinicId)
    .eq("id", rowId)
    .maybeSingle();

  if (!existing) {
    return "Registro não encontrado ou já foi excluído.";
  }

  if (existing.locked_at) {
    return table === "assessments"
      ? "Não é possível excluir: avaliação assinada ou bloqueada."
      : "Não é possível excluir: evolução assinada.";
  }

  if (table === "assessments" && existing.status === "finalizada") {
    return "Sem permissão para excluir esta avaliação finalizada.";
  }

  return "Sem permissão para excluir este registro. Apenas administradores da clínica podem excluir.";
}

/**
 * Exclusão clínica com confirmação real (PostgREST/RLS pode retornar sucesso com 0 linhas).
 */
export async function deleteClinicalRecord(params: DeleteClinicalRecordParams): Promise<void> {
  const { clinicId, table, rowId, supportMode, lockedAt, status } = params;

  if (supportMode) {
    throw new Error("Modo Suporte ativo: exclusão não permitida. Encerre a sessão de suporte para continuar.");
  }

  if (lockedAt) {
    throw new Error(
      table === "assessments"
        ? "Não é possível excluir: avaliação assinada ou bloqueada."
        : "Não é possível excluir: evolução assinada.",
    );
  }

  if (table === "evolutions" && status === "finalizada") {
    throw new Error("Não é possível excluir: evolução finalizada.");
  }

  const { data, error } = await supabase
    .from(table)
    .delete()
    .eq("clinic_id", clinicId)
    .eq("id", rowId)
    .select("id");

  if (error) {
    throw new Error(mapDeleteError(error, table));
  }

  if (!data || data.length === 0) {
    throw new Error(await explainSilentDeleteFailure(clinicId, table, rowId));
  }
}

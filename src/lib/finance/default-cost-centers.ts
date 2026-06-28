/**
 * Sprint G1.3 — centros de custo padrão sugeridos (sem duplicar por clínica/nome).
 */

import { supabase } from "@/integrations/supabase/client";

type DefaultCostCenterSeed = {
  name: string;
  code?: string;
  sort_order: number;
  color?: string;
};

export const DEFAULT_COST_CENTERS: DefaultCostCenterSeed[] = [
  { name: "Atendimento Clínico", code: "CLIN", sort_order: 10, color: "#10b981" },
  { name: "Fisioterapia Domiciliar", code: "DOM", sort_order: 20, color: "#3b82f6" },
  { name: "Administrativo", code: "ADM", sort_order: 30, color: "#64748b" },
  { name: "Comercial", code: "COM", sort_order: 40, color: "#f59e0b" },
  { name: "Marketing", code: "MKT", sort_order: 50, color: "#8b5cf6" },
  { name: "Tecnologia", code: "TEC", sort_order: 60, color: "#06b6d4" },
  { name: "Financeiro", code: "FIN", sort_order: 70, color: "#ef4444" },
  { name: "Outros", code: "OUT", sort_order: 80, color: "#94a3b8" },
];

function costCenterKey(name: string) {
  return name.trim().toLowerCase();
}

/**
 * Insere centros de custo padrão ausentes para a clínica ativa.
 * Idempotente: respeita unique(clinic_id, name).
 */
export async function ensureDefaultFinanceCostCenters(clinicId: string): Promise<void> {
  const { data: existing, error: readError } = await supabase
    .from("financial_cost_centers")
    .select("name")
    .eq("clinic_id", clinicId);

  if (readError) throw readError;

  const existingKeys = new Set((existing ?? []).map((row) => costCenterKey(row.name)));

  const toInsert = DEFAULT_COST_CENTERS.filter((seed) => !existingKeys.has(costCenterKey(seed.name))).map(
    (seed) => ({
      clinic_id: clinicId,
      name: seed.name,
      code: seed.code ?? null,
      sort_order: seed.sort_order,
      color: seed.color ?? null,
      is_active: true,
    }),
  );

  if (!toInsert.length) return;

  const { error: insertError } = await supabase.from("financial_cost_centers").insert(toInsert);
  if (insertError) throw insertError;
}

/**
 * Sprint G2.4 — helpers de convênios (operadoras e vínculos).
 */

import type {
  HealthInsuranceProviderRow,
  PatientHealthInsuranceRow,
} from "./types";

export type HealthInsuranceProviderForm = {
  name: string;
  document: string;
  contact_name: string;
  phone: string;
  email: string;
  notes: string;
};

export type PatientHealthInsuranceForm = {
  patient_id: string;
  provider_id: string;
  plan_name: string;
  card_number: string;
  authorization_number: string;
  valid_until: string;
  notes: string;
};

export type PatientHealthInsuranceFilters = {
  patientId: string;
  providerId: string;
  search: string;
};

export type InsuranceReceivableForm = {
  patient_health_insurance_id: string;
  valor: string;
  data_vencimento: string;
  data: string;
  category_id: string;
  cost_center_id: string;
  documento: string;
  observacoes: string;
};

export type PatientHealthInsuranceRowView = PatientHealthInsuranceRow & {
  patients?: { nome_completo: string } | null;
  health_insurance_providers?: { name: string; is_active: boolean } | null;
};

export function parseHealthInsuranceProviderForm(input: HealthInsuranceProviderForm) {
  const name = input.name?.trim();
  if (!name) throw new Error("Nome do convênio é obrigatório.");
  return {
    name,
    document: input.document?.trim() || null,
    contact_name: input.contact_name?.trim() || null,
    phone: input.phone?.trim() || null,
    email: input.email?.trim() || null,
    notes: input.notes?.trim() || null,
  };
}

export function parsePatientHealthInsuranceForm(input: PatientHealthInsuranceForm) {
  if (!input.patient_id?.trim()) throw new Error("Paciente é obrigatório.");
  if (!input.provider_id?.trim()) throw new Error("Convênio é obrigatório.");
  return {
    patient_id: input.patient_id.trim(),
    provider_id: input.provider_id.trim(),
    plan_name: input.plan_name?.trim() || null,
    card_number: input.card_number?.trim() || null,
    authorization_number: input.authorization_number?.trim() || null,
    valid_until: input.valid_until?.trim() || null,
    notes: input.notes?.trim() || null,
  };
}

export function parseInsuranceReceivableForm(
  input: InsuranceReceivableForm,
  link: Pick<
    PatientHealthInsuranceRow,
    "patient_id" | "provider_id" | "authorization_number"
  > & { provider_name?: string },
) {
  if (!input.patient_health_insurance_id?.trim()) {
    throw new Error("Selecione o vínculo paciente x convênio.");
  }
  if (!input.category_id?.trim()) throw new Error("Categoria de receita é obrigatória.");
  if (!input.data?.trim()) throw new Error("Data de emissão é obrigatória.");
  if (!input.data_vencimento?.trim()) throw new Error("Vencimento é obrigatório.");

  const valor = Number(input.valor);
  if (!Number.isFinite(valor) || valor <= 0) throw new Error("Informe um valor maior que zero.");

  const documento =
    input.documento?.trim()
    || link.authorization_number?.trim()
    || (link.provider_name ? `CONV-${link.provider_name}`.slice(0, 120) : null);

  const obsBase = input.observacoes?.trim() || `Recebível convênio${link.provider_name ? `: ${link.provider_name}` : ""}`;

  return {
    patient_id: link.patient_id,
    health_insurance_provider_id: link.provider_id,
    patient_health_insurance_id: input.patient_health_insurance_id.trim(),
    valor,
    data: input.data.trim(),
    data_vencimento: input.data_vencimento.trim(),
    category_id: input.category_id.trim(),
    cost_center_id: input.cost_center_id?.trim() || null,
    documento,
    observacoes: obsBase,
  };
}

export function defaultPatientHealthInsuranceFilters(): PatientHealthInsuranceFilters {
  return { patientId: "all", providerId: "all", search: "" };
}

export function filterPatientHealthInsurancesClient(
  rows: PatientHealthInsuranceRowView[],
  search: string,
): PatientHealthInsuranceRowView[] {
  const q = search.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((row) => {
    const patient = row.patients?.nome_completo?.toLowerCase() ?? "";
    const provider = row.health_insurance_providers?.name?.toLowerCase() ?? "";
    const plan = row.plan_name?.toLowerCase() ?? "";
    const card = row.card_number?.toLowerCase() ?? "";
    return patient.includes(q) || provider.includes(q) || plan.includes(q) || card.includes(q);
  });
}

export function filterActiveHealthInsuranceProviders(providers: HealthInsuranceProviderRow[]) {
  return providers.filter((p) => p.is_active);
}

export function isDuplicateHealthInsuranceProviderError(error: unknown): boolean {
  return (
    typeof error === "object"
    && error !== null
    && "code" in error
    && (error as { code?: string }).code === "23505"
  );
}

export function duplicateHealthInsuranceProviderMessage(): string {
  return "Já existe um convênio com este nome nesta clínica.";
}

export function emptyHealthInsuranceProviderForm(): HealthInsuranceProviderForm {
  return { name: "", document: "", contact_name: "", phone: "", email: "", notes: "" };
}

export function emptyPatientHealthInsuranceForm(): PatientHealthInsuranceForm {
  return {
    patient_id: "",
    provider_id: "",
    plan_name: "",
    card_number: "",
    authorization_number: "",
    valid_until: "",
    notes: "",
  };
}

export function emptyInsuranceReceivableForm(today: string): InsuranceReceivableForm {
  return {
    patient_health_insurance_id: "",
    valor: "",
    data_vencimento: today,
    data: today,
    category_id: "",
    cost_center_id: "",
    documento: "",
    observacoes: "",
  };
}

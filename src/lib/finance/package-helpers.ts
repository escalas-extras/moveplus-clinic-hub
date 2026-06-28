/**
 * Sprint G2.1 — helpers de Pacotes clínico-financeiros.
 */

import type {
  ClinicalPackageTemplateRow,
  PatientPackageContractRow,
  PatientPackageStatus,
} from "./types";

export type PackageTemplateForm = {
  name: string;
  description: string;
  session_count: number | string;
  total_value: number | string;
  validity_days: number | string;
};

export type ContractPackageForm = {
  package_template_id: string;
  patient_id: string;
  professional_id: string;
  category_id: string;
  cost_center_id: string;
  contracted_at: string;
  contracted_value: number | string;
  sessions_total: number | string;
};

export type PatientPackageFilters = {
  patientId: string;
  status: PatientPackageStatus | "all";
  search: string;
};

export type PatientPackageRow = PatientPackageContractRow & {
  clinical_package_templates?: { name: string; session_count: number; validity_days: number } | null;
  patients?: { nome_completo: string } | null;
  professionals?: { nome: string } | null;
  financial_entries?: { id: string; status: string; valor: number } | null;
};

export function computeSessionUnitValue(totalValue: number, sessionCount: number): number {
  if (sessionCount <= 0) return 0;
  return Math.round((totalValue / sessionCount) * 100) / 100;
}

export function addDaysIso(isoDate: string, days: number): string {
  const d = new Date(isoDate + "T12:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function parsePackageTemplateForm(input: PackageTemplateForm) {
  const name = input.name?.trim();
  if (!name) throw new Error("Nome do pacote é obrigatório.");

  const session_count = Number(input.session_count);
  if (!Number.isInteger(session_count) || session_count <= 0) {
    throw new Error("Informe uma quantidade de sessões maior que zero.");
  }

  const total_value = Number(input.total_value);
  if (!Number.isFinite(total_value) || total_value <= 0) {
    throw new Error("Informe um valor total maior que zero.");
  }

  const validity_days = Number(input.validity_days);
  if (!Number.isInteger(validity_days) || validity_days <= 0) {
    throw new Error("Informe a validade em dias maior que zero.");
  }

  return {
    name,
    description: input.description?.trim() || null,
    session_count,
    total_value,
    validity_days,
  };
}

export function parseContractPackageForm(
  input: ContractPackageForm,
  template: Pick<ClinicalPackageTemplateRow, "session_count" | "total_value" | "validity_days" | "name">,
) {
  if (!input.package_template_id?.trim()) throw new Error("Selecione um pacote.");
  if (!input.patient_id?.trim()) throw new Error("Paciente é obrigatório.");
  if (!input.category_id?.trim()) throw new Error("Categoria de receita é obrigatória.");
  if (!input.contracted_at?.trim()) throw new Error("Data de contratação é obrigatória.");

  const sessions_total = Number(input.sessions_total || template.session_count);
  if (!Number.isInteger(sessions_total) || sessions_total <= 0) {
    throw new Error("Quantidade de sessões inválida.");
  }

  const contracted_value = Number(input.contracted_value || template.total_value);
  if (!Number.isFinite(contracted_value) || contracted_value <= 0) {
    throw new Error("Valor contratado inválido.");
  }

  const valid_until = addDaysIso(input.contracted_at.trim(), template.validity_days);

  return {
    package_template_id: input.package_template_id.trim(),
    patient_id: input.patient_id.trim(),
    professional_id: input.professional_id?.trim() || null,
    category_id: input.category_id.trim(),
    cost_center_id: input.cost_center_id?.trim() || null,
    contracted_at: input.contracted_at.trim(),
    valid_until,
    sessions_total,
    contracted_value,
    documento: `PACOTE-${template.name}`.slice(0, 120),
    observacoes: `Contratação pacote: ${template.name} — ${sessions_total} sessões`,
  };
}

export function defaultPatientPackageFilters(): PatientPackageFilters {
  return { patientId: "all", status: "all", search: "" };
}

export function filterPatientPackagesClient(rows: PatientPackageRow[], search: string): PatientPackageRow[] {
  const q = search.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((row) => {
    const patient = row.patients?.nome_completo?.toLowerCase() ?? "";
    const pkg = row.clinical_package_templates?.name?.toLowerCase() ?? "";
    return patient.includes(q) || pkg.includes(q);
  });
}

export function patientPackageStatusVariant(
  status: PatientPackageStatus,
): "success" | "warning" | "danger" | "neutral" {
  if (status === "ativo") return "success";
  if (status === "encerrado") return "neutral";
  if (status === "cancelado") return "danger";
  return "neutral";
}

export function isDuplicatePackageTemplateError(error: unknown): boolean {
  return (
    typeof error === "object"
    && error !== null
    && "code" in error
    && (error as { code?: string }).code === "23505"
  );
}

export function duplicatePackageTemplateMessage(): string {
  return "Já existe um pacote com este nome nesta clínica.";
}

export function filterActivePackageTemplates(templates: ClinicalPackageTemplateRow[]) {
  return templates.filter((t) => t.is_active);
}

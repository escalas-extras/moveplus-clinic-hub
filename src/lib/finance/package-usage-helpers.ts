/**
 * Sprint G2.2 — helpers de consumo de sessões de pacotes.
 */

import type {
  PatientPackageContractRow,
  PatientPackageUsageRow,
  PatientPackageUsageStatus,
} from "./types";

export type PackageUsageForm = {
  usage_date: string;
  quantity: number | string;
  professional_id: string;
  notes: string;
  confirmExpired: boolean;
};

export type PackageUsageRow = PatientPackageUsageRow & {
  professionals?: { nome: string } | null;
};

const TODAY_ISO = () => new Date().toISOString().slice(0, 10);

export function isPackageContractExpired(
  contract: Pick<PatientPackageContractRow, "valid_until">,
): boolean {
  return contract.valid_until < TODAY_ISO();
}

export function canRegisterPackageUsage(
  contract: Pick<PatientPackageContractRow, "status" | "sessions_remaining">,
): boolean {
  return contract.status === "ativo" && contract.sessions_remaining > 0;
}

export function parsePackageUsageForm(
  input: PackageUsageForm,
  contract: Pick<PatientPackageContractRow, "valid_until" | "sessions_remaining">,
) {
  if (!input.usage_date?.trim()) throw new Error("Data do consumo é obrigatória.");

  const quantity = Number(input.quantity);
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error("Informe uma quantidade válida maior que zero.");
  }

  if (quantity > contract.sessions_remaining) {
    throw new Error(`Saldo insuficiente. Restam ${contract.sessions_remaining} sessão(ões).`);
  }

  if (isPackageContractExpired(contract) && !input.confirmExpired) {
    throw new Error("Confirme o consumo fora da validade do contrato.");
  }

  return {
    usage_date: input.usage_date.trim(),
    quantity,
    professional_id: input.professional_id?.trim() || null,
    notes: input.notes?.trim() || null,
  };
}

export function parseUsageReversal(reason: string) {
  const reversal_reason = reason?.trim();
  if (!reversal_reason) throw new Error("Informe o motivo do estorno.");
  return { reversal_reason };
}

export function packageUsageStatusVariant(
  status: PatientPackageUsageStatus,
): "success" | "danger" | "neutral" {
  if (status === "active") return "success";
  if (status === "reversed") return "danger";
  return "neutral";
}

export function countActiveUsageQuantity(usages: Pick<PatientPackageUsageRow, "status" | "quantity">[]): number {
  return usages
    .filter((u) => u.status === "active")
    .reduce((sum, u) => sum + u.quantity, 0);
}

export function emptyPackageUsageForm(): PackageUsageForm {
  return {
    usage_date: TODAY_ISO(),
    quantity: "1",
    professional_id: "",
    notes: "",
    confirmExpired: false,
  };
}

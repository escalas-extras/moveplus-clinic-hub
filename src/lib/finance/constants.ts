/**
 * Sprint G1.1 — constantes do Financeiro Base.
 */

import type { FinancialCategoryType, PaymentMethod, PaymentStatus, PatientPackageStatus, PatientPackageUsageStatus } from "./types";

export const FINANCE_ROUTE_BASE = "/app/financeiro" as const;

export const FINANCE_FEATURE_KEY = "financeiro" as const;

/** Versão congelada do Financeiro Base MVP (Sprint G1.8). */
export const FINANCE_BASE_VERSION = "G1.8" as const;

/** Trilha G2 — Pacotes clínico-financeiros (Sprint G2.2). */
export const FINANCE_G2_VERSION = "G2.2" as const;

export const PATIENT_PACKAGE_STATUS_LABELS: Record<PatientPackageStatus, string> = {
  ativo: "Ativo",
  encerrado: "Encerrado",
  cancelado: "Cancelado",
};

export const PATIENT_PACKAGE_USAGE_STATUS_LABELS: Record<PatientPackageUsageStatus, string> = {
  active: "Ativo",
  reversed: "Estornado",
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  pix: "PIX",
  dinheiro: "Dinheiro",
  cartao: "Cartão",
  transferencia: "Transferência",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pago: "Pago",
  pendente: "Pendente",
  cancelado: "Cancelado",
};

/** Labels comerciais para Contas a Receber (G1.4). */
export const RECEIVABLE_STATUS_LABELS: Record<PaymentStatus, string> = {
  pendente: "Aberto",
  pago: "Recebido",
  cancelado: "Cancelado",
};

/** Labels comerciais para Contas a Pagar (G1.5). */
export const PAYABLE_STATUS_LABELS: Record<PaymentStatus, string> = {
  pendente: "Aberto",
  pago: "Pago",
  cancelado: "Cancelado",
};

export const FINANCIAL_ENTRY_TYPE_LABELS = {
  receivable: "Conta a receber",
  payable: "Conta a pagar",
} as const;

/** Papéis com acesso típico ao financeiro (clinic_members.role). */
export const FINANCE_ROLES = ["owner", "admin", "financeiro"] as const;

export const FINANCIAL_CATEGORY_TYPE_LABELS: Record<FinancialCategoryType, string> = {
  income: "Receita",
  expense: "Despesa",
};

export const FINANCIAL_CATEGORY_TYPE_PLURAL: Record<FinancialCategoryType, string> = {
  income: "Receitas",
  expense: "Despesas",
};

/** Cores sugeridas para categorias (hex). */
export const FINANCIAL_CATEGORY_COLOR_PRESETS = [
  "#10b981",
  "#3b82f6",
  "#8b5cf6",
  "#f59e0b",
  "#ef4444",
  "#64748b",
] as const;

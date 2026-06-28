/**
 * Sprint G1.1 — constantes do Financeiro Base.
 */

import type { FinancialCategoryType, InstallmentPlanStatus, PaymentMethod, PaymentStatus, PatientPackageStatus, PatientPackageUsageStatus } from "./types";

export const FINANCE_ROUTE_BASE = "/app/financeiro" as const;

export const FINANCE_FEATURE_KEY = "financeiro" as const;

/** Versão congelada do Financeiro Base MVP (Sprint G1.8). */
export const FINANCE_BASE_VERSION = "G1.8" as const;

/** Trilha G2 — Receita por Profissional (Sprint G2.6). */
export const FINANCE_G2_VERSION = "G2.6" as const;

export const INSTALLMENT_PLAN_STATUS_LABELS: Record<InstallmentPlanStatus, string> = {
  active: "Ativo",
  canceled: "Cancelado",
  completed: "Concluído",
};

export const PATIENT_PACKAGE_STATUS_LABELS: Record<PatientPackageStatus, string> = {
  ativo: "Ativo",
  encerrado: "Encerrado",
  cancelado: "Cancelado",
};

export const PATIENT_PACKAGE_USAGE_STATUS_LABELS: Record<PatientPackageUsageStatus, string> = {
  active: "Ativo",
  reversed: "Estornado",
};

export const DELINQUENCY_ORIGIN_LABELS = {
  pacote: "Pacote",
  convenio: "Convênio",
  parcelamento: "Parcelamento",
  manual: "Manual",
} as const;

export const DELINQUENCY_AGE_BUCKET_LABELS = {
  all: "Todas as faixas",
  "1-7": "1 a 7 dias",
  "8-30": "8 a 30 dias",
  "31+": "Acima de 30 dias",
} as const;

export const PROFESSIONAL_REVENUE_STATUS_FILTER_LABELS = {
  all: "Todos",
  pago: "Realizado",
  pendente: "Previsto",
} as const;

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

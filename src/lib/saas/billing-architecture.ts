import type {
  SaasCommercialCenterData,
  SaasCommercialHistoryEvent,
  SaasCommercialMonthlyFee,
  SaasCommercialSubscription,
} from "./types";

export type BillingGatewayProvider = "stripe" | "mercado_pago" | "asaas" | "pagseguro";

export type BillingEventKind =
  | "monthly_fee"
  | "discount"
  | "coupon"
  | "upgrade"
  | "downgrade"
  | "trial"
  | "suspension"
  | "cancellation";

export type BillingInvoiceStatus = "draft" | "open" | "paid" | "overdue" | "void" | "uncollectible";
export type BillingPaymentStatus = "pending" | "confirmed" | "failed" | "refunded";
export type BillingTransactionStatus = "planned" | "posted" | "reconciled" | "failed";

export type BillingInvoiceDraft = {
  id: string;
  clinic_id: string;
  clinic_name: string;
  competence: string;
  due_at: string | null;
  amount: number;
  status: BillingInvoiceStatus;
  source: "derived";
};

export type BillingSubscriptionDraft = {
  clinic_id: string;
  clinic_name: string;
  plan_name: string;
  plan_code: string | null;
  status: string;
  monthly_value: number;
  trial_ends_at: string | null;
  canceled_at: string | null;
  next_due_at: string | null;
};

export type BillingPaymentDraft = {
  id: string;
  invoice_id: string | null;
  clinic_id: string;
  amount: number;
  paid_at: string | null;
  status: BillingPaymentStatus;
  gateway_provider: BillingGatewayProvider | null;
  gateway_reference: string | null;
};

export type BillingTransactionDraft = {
  id: string;
  clinic_id: string | null;
  clinic_name: string | null;
  occurred_at: string;
  kind: BillingEventKind;
  label: string;
  amount: number | null;
  status: BillingTransactionStatus;
  source: "audit" | "derived";
};

export type BillingCenterProjection = {
  summary: {
    mrr: number;
    arr: number;
    expected_revenue: number;
    received_revenue: number;
    delinquency: number;
    trials: number;
    cancellations: number;
    active_subscriptions: number;
  };
  invoices: BillingInvoiceDraft[];
  payments: BillingPaymentDraft[];
  subscriptions: BillingSubscriptionDraft[];
  transactions: BillingTransactionDraft[];
};

export const BILLING_FINANCIAL_MODEL: Array<{
  kind: BillingEventKind;
  label: string;
  description: string;
  persistence: "planned" | "derived_now" | "future_gateway";
}> = [
  {
    kind: "monthly_fee",
    label: "Mensalidade",
    description: "Cobrança recorrente por clínica/plano.",
    persistence: "derived_now",
  },
  {
    kind: "discount",
    label: "Desconto",
    description: "Redução manual aplicada sobre invoice ou assinatura.",
    persistence: "planned",
  },
  {
    kind: "coupon",
    label: "Cupom",
    description: "Código promocional para trial, setup ou recorrência.",
    persistence: "planned",
  },
  {
    kind: "upgrade",
    label: "Upgrade",
    description: "Troca para plano superior com efeito financeiro futuro.",
    persistence: "derived_now",
  },
  {
    kind: "downgrade",
    label: "Downgrade",
    description: "Troca para plano inferior com ajuste de contrato.",
    persistence: "derived_now",
  },
  {
    kind: "trial",
    label: "Trial",
    description: "Período gratuito antes da primeira cobrança.",
    persistence: "derived_now",
  },
  {
    kind: "suspension",
    label: "Suspensão",
    description: "Interrupção operacional por regra comercial ou inadimplência.",
    persistence: "derived_now",
  },
  {
    kind: "cancellation",
    label: "Cancelamento",
    description: "Encerramento da assinatura com histórico preservado.",
    persistence: "derived_now",
  },
];

export const BILLING_GATEWAY_READINESS: Array<{
  provider: BillingGatewayProvider;
  label: string;
  status: "planned";
  notes: string;
}> = [
  { provider: "stripe", label: "Stripe", status: "planned", notes: "Checkout, invoices, webhooks e customer portal." },
  { provider: "mercado_pago", label: "Mercado Pago", status: "planned", notes: "Pix, cartão, boleto e notificações." },
  { provider: "asaas", label: "Asaas", status: "planned", notes: "Cobranças brasileiras, boleto/Pix e recorrência." },
  { provider: "pagseguro", label: "PagSeguro", status: "planned", notes: "Cartão, boleto e conciliação futura." },
];

export const BILLING_ENTITY_BLUEPRINT = [
  {
    name: "subscriptions",
    description: "Contrato comercial SaaS por clínica, plano, ciclo, trial, suspensão e cancelamento.",
  },
  {
    name: "invoices",
    description: "Documento de cobrança gerado por competência, com vencimento, descontos e status.",
  },
  {
    name: "payments",
    description: "Recebimento financeiro associado a invoice e gateway, quando houver integração.",
  },
  {
    name: "transactions",
    description: "Ledger de eventos financeiros: mensalidade, upgrade, downgrade, cupom, estorno e cancelamento.",
  },
] as const;

function invoiceStatusFromFee(status: SaasCommercialMonthlyFee["status"]): BillingInvoiceStatus {
  if (status === "overdue") return "overdue";
  if (status === "canceled") return "void";
  if (status === "suspended") return "uncollectible";
  return "open";
}

function kindFromAudit(action: string): BillingEventKind {
  if (action.includes("trial")) return "trial";
  if (action.includes("cancel")) return "cancellation";
  if (action.includes("status")) return "suspension";
  if (action.includes("plan.assign")) return "upgrade";
  return "monthly_fee";
}

function buildInvoice(fee: SaasCommercialMonthlyFee): BillingInvoiceDraft {
  return {
    id: `${fee.clinic_id}:${fee.competence}`,
    clinic_id: fee.clinic_id,
    clinic_name: fee.clinic_name,
    competence: fee.competence,
    due_at: fee.due_at,
    amount: fee.amount,
    status: invoiceStatusFromFee(fee.status),
    source: "derived",
  };
}

function buildSubscription(row: SaasCommercialSubscription): BillingSubscriptionDraft {
  return {
    clinic_id: row.clinic_id,
    clinic_name: row.clinic_name,
    plan_name: row.plan_name,
    plan_code: row.plan_code,
    status: row.plan_status,
    monthly_value: row.monthly_value,
    trial_ends_at: row.trial_ends_at,
    canceled_at: row.canceled_at,
    next_due_at: row.next_due_at,
  };
}

function buildAuditTransaction(row: SaasCommercialHistoryEvent): BillingTransactionDraft {
  return {
    id: row.id,
    clinic_id: row.clinic_id,
    clinic_name: row.clinic_name,
    occurred_at: row.created_at,
    kind: kindFromAudit(row.action),
    label: row.action,
    amount: null,
    status: "posted",
    source: "audit",
  };
}

function buildInvoiceTransaction(invoice: BillingInvoiceDraft): BillingTransactionDraft {
  return {
    id: `invoice:${invoice.id}`,
    clinic_id: invoice.clinic_id,
    clinic_name: invoice.clinic_name,
    occurred_at: invoice.due_at ?? new Date().toISOString(),
    kind: "monthly_fee",
    label: `Mensalidade ${invoice.competence}`,
    amount: invoice.amount,
    status: "planned",
    source: "derived",
  };
}

export function buildBillingCenterProjection(data: SaasCommercialCenterData): BillingCenterProjection {
  const invoices = data.monthly_fees.map(buildInvoice);
  const subscriptions = data.subscriptions.map(buildSubscription);
  const auditTransactions = data.history.map(buildAuditTransaction);
  const invoiceTransactions = invoices.map(buildInvoiceTransaction);
  const expectedRevenue = invoices
    .filter((invoice) => ["open", "overdue"].includes(invoice.status))
    .reduce((sum, invoice) => sum + invoice.amount, 0);
  const delinquency = invoices
    .filter((invoice) => invoice.status === "overdue")
    .reduce((sum, invoice) => sum + invoice.amount, 0);

  return {
    summary: {
      mrr: data.summary.estimated_mrr,
      arr: data.summary.estimated_mrr * 12,
      expected_revenue: expectedRevenue,
      received_revenue: 0,
      delinquency,
      trials: data.summary.trials,
      cancellations: data.summary.canceled,
      active_subscriptions: data.summary.active_subscriptions,
    },
    invoices,
    payments: [],
    subscriptions,
    transactions: [...auditTransactions, ...invoiceTransactions]
      .sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime())
      .slice(0, 80),
  };
}

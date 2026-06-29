export * from "./types";
export * from "./constants";
export * from "./helpers";
export {
  OPERATIONAL_STATUS_LABEL,
  resolveOperationalStatus,
  trialDaysRemaining,
  clinicOperationalAccessAllowed,
} from "./clinic-operational-status";
export {
  KNOWN_TEST_CLINIC_NAMES,
  segmentClinic,
  isKnownTestClinicCandidate,
  isProtectedMovePlusClinic,
  isProductionActiveClinic,
  resolveClinicNameFields,
  type ClinicSettingsNameLookup,
} from "./clinic-segmentation";
export {
  buildExecutiveAttentionItems,
  buildExecutiveAuditGroups,
  getExecutiveSoonMonitors,
  totalPlansSold,
} from "./executive-dashboard";
export {
  BILLING_ENTITY_BLUEPRINT,
  BILLING_FINANCIAL_MODEL,
  BILLING_GATEWAY_READINESS,
  buildBillingCenterProjection,
} from "./billing-architecture";
export {
  PLAN_FEATURES,
  canUseFeature,
  getClinicPlanLimits,
  isFeatureEnabled,
  normalizePlanModules,
  type ClinicPlanLimits,
  type PlanFeature,
} from "./plan-access";
export type {
  ExecutiveAttentionItem,
  ExecutiveAuditGroup,
  ExecutiveSoonMonitor,
} from "./executive-dashboard";
export type {
  BillingCenterProjection,
  BillingEventKind,
  BillingGatewayProvider,
  BillingInvoiceDraft,
  BillingInvoiceStatus,
  BillingPaymentDraft,
  BillingPaymentStatus,
  BillingSubscriptionDraft,
  BillingTransactionDraft,
  BillingTransactionStatus,
} from "./billing-architecture";
export { useClinicOperationalAccess } from "./use-clinic-operational-access";

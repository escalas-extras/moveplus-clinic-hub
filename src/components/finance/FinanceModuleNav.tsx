/**
 * @deprecated UX-03 — navegação substituída por FinanceOperationsGrid + FinanceAdminSection.
 * Re-exporta tipos para compatibilidade.
 */
export {
  FinanceAdminSection,
  type FinanceModuleTabId,
  type FinanceViewId,
  FINANCE_ADMIN_TAB_IDS,
} from "./FinanceAdminSection";

/** Mantido como alias; não renderiza menu. */
export function FinanceModuleNav() {
  return null;
}

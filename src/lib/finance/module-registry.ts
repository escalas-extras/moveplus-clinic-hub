/**
 * Sprint G1.1 — registro de módulos do Financeiro Base (roadmap G1).
 */

import { FINANCE_ROUTE_BASE } from "./constants";
import type { FinanceModuleDefinition } from "./types";

export const FINANCE_MODULE_REGISTRY: FinanceModuleDefinition[] = [
  {
    id: "dashboard",
    title: "Dashboard financeiro",
    description: "Visão consolidada de receitas, despesas e saldo do período.",
    status: "planned",
    route: FINANCE_ROUTE_BASE,
    sprint: "G1.5",
  },
  {
    id: "categories",
    title: "Categorias financeiras",
    description: "Plano de contas simplificado para classificar lançamentos.",
    status: "active",
    route: FINANCE_ROUTE_BASE,
    sprint: "G1.2",
  },
  {
    id: "cost_centers",
    title: "Centros de custo",
    description: "Segmentação por unidade, profissional ou projeto interno.",
    status: "planned",
    sprint: "G1.3",
  },
  {
    id: "receivables",
    title: "Contas a receber",
    description: "Títulos em aberto vinculados a pacientes e convênios futuros.",
    status: "planned",
    sprint: "G1.4",
  },
  {
    id: "payables",
    title: "Contas a pagar",
    description: "Obrigações da clínica com vencimento e status de pagamento.",
    status: "planned",
    sprint: "G1.4",
  },
  {
    id: "cash_flow",
    title: "Fluxo de caixa",
    description: "Entradas e saídas projetadas e realizadas por período.",
    status: "planned",
    sprint: "G1.5",
  },
  {
    id: "legacy_entries",
    title: "Lançamentos v1",
    description: "Registro operacional atual (financial_entries + recibos).",
    status: "legacy",
    route: FINANCE_ROUTE_BASE,
    sprint: "v1",
  },
];

export function getPlannedFinanceModules() {
  return FINANCE_MODULE_REGISTRY.filter((m) => m.status === "planned");
}

export function getActiveFinanceModules() {
  return FINANCE_MODULE_REGISTRY.filter((m) => m.status === "active");
}

export function getLegacyFinanceModules() {
  return FINANCE_MODULE_REGISTRY.filter((m) => m.status === "legacy");
}

import { FINANCE_ROUTE_BASE } from "@/lib/finance/constants";

export const FINANCE_ROUTES = {
  home: FINANCE_ROUTE_BASE,
  receber: `${FINANCE_ROUTE_BASE}/receber`,
  recibos: `${FINANCE_ROUTE_BASE}/recibos`,
  pagar: `${FINANCE_ROUTE_BASE}/pagar`,
  fluxo: `${FINANCE_ROUTE_BASE}/fluxo`,
  pacotes: `${FINANCE_ROUTE_BASE}/pacotes`,
  convenios: `${FINANCE_ROUTE_BASE}/convenios`,
  inadimplencia: `${FINANCE_ROUTE_BASE}/inadimplencia`,
  receitaProfissional: `${FINANCE_ROUTE_BASE}/receita-profissional`,
  relatorios: "/app/relatorios",
  administracao: `${FINANCE_ROUTE_BASE}/administracao`,
} as const;

export type FinanceRoutePath = (typeof FINANCE_ROUTES)[keyof typeof FINANCE_ROUTES];

export type FinanceModuleMeta = {
  title: string;
  description: string;
  breadcrumb: string;
};

export const FINANCE_MODULE_META: Record<
  Exclude<keyof typeof FINANCE_ROUTES, "home" | "administracao" | "relatorios">,
  FinanceModuleMeta
> = {
  receber: {
    title: "Recebimentos",
    description: "Títulos, recebimentos e acompanhamento de receitas da clínica.",
    breadcrumb: "Recebimentos",
  },
  recibos: {
    title: "Recibos",
    description: "Localize, selecione e imprima recibos em lote sem abrir um a um.",
    breadcrumb: "Recibos",
  },
  pagar: {
    title: "Contas a Pagar",
    description: "Despesas, pagamentos e controle de saídas financeiras.",
    breadcrumb: "Contas a Pagar",
  },
  fluxo: {
    title: "Fluxo de Caixa",
    description: "Entradas, saídas e saldo consolidado no período.",
    breadcrumb: "Fluxo de Caixa",
  },
  pacotes: {
    title: "Pacotes",
    description: "Modelos, contratos e saldo de sessões por paciente.",
    breadcrumb: "Pacotes",
  },
  convenios: {
    title: "Convênios",
    description: "Operadoras, vínculos de pacientes e recebíveis de convênio.",
    breadcrumb: "Convênios",
  },
  inadimplencia: {
    title: "Inadimplência",
    description: "Títulos vencidos, cobrança e recuperação de receitas.",
    breadcrumb: "Inadimplência",
  },
  receitaProfissional: {
    title: "Receita por Profissional",
    description: "Realizado, previsto e participação por profissional.",
    breadcrumb: "Receita por Profissional",
  },
};

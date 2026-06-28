# Sprint G1.7 — Dashboard Financeiro

Relatório de entrega. Data: 2026-06-27.

## Objetivo

Implementar **Dashboard Financeiro** executivo na aba **Visão geral** de `/app/financeiro`, consolidando `financial_entries` sem nova tabela.

## Build

`npm run build` — **aprovado**.

## Migration

**Nenhuma migration criada.**

---

## Arquivos criados

| Arquivo |
|---------|
| `src/lib/finance/dashboard-helpers.ts` |
| `src/components/finance/FinanceDashboardPanel.tsx` |
| `docs/auditorias/sprint-g1.7-dashboard-financeiro.md` |

## Arquivos alterados

| Arquivo | Alteração |
|---------|-----------|
| `src/lib/finance/query-keys.ts` | `dashboard`, `dashboardLookups` |
| `src/lib/finance/index.ts` | Export helpers |
| `src/lib/finance/module-registry.ts` | Dashboard → `active` |
| `src/routes/_authenticated/app/financeiro.tsx` | Visão geral → `FinanceDashboardPanel` |
| `src/components/finance/index.ts` | Export painel |

**Preservados:** Contas a Receber/Pagar, Fluxo de Caixa, Categorias, Centros de Custo, Lançamentos v1, Recibos, Core Clínico, PDFs.

`FinanceModuleHub.tsx` mantido no projeto (legado G1.1), substituído na aba Visão geral.

---

## Funcionalidades

### KPIs (8 cards)

| KPI | Regra |
|-----|--------|
| Receita realizada | receivable + pago + `data_recebimento` no período |
| Despesa realizada | payable + pago + `data_recebimento` no período |
| Saldo realizado | receita − despesa realizadas |
| Receitas em aberto | receivable + pendente |
| Despesas em aberto | payable + pendente |
| Vencidos a receber | pendente + vencimento &lt; hoje |
| Vencidos a pagar | pendente + vencimento &lt; hoje |
| Saldo previsto | receitas aberto − despesas aberto |

Cancelados **sempre ignorados**.

### Cards executivos

- Resumo do mês atual (independente do filtro de período)
- Próximos recebimentos (top 5 por vencimento)
- Próximos pagamentos (top 5)
- Ranking categorias receita / despesa
- Centros de custo mais relevantes

### Filtros

Período, categoria, centro de custo.

### Atalhos

Novo recebimento, Nova despesa, Fluxo de caixa, Categorias, Centros de custo, Lançamentos v1.

### Helpers reutilizados

`computeCashFlowSummary`, `realizedDate`, `forecastDate`, `isReceivableOverdue` (G1.4–G1.6).

---

## Como testar

1. Abrir `/app/financeiro` → **Visão geral**.
2. Cadastrar receitas/despesas pagas e abertas.
3. Conferir KPIs vs Contas a Receber/Pagar e Fluxo de Caixa.
4. Aplicar filtros de categoria/centro/período.
5. Validar resumo do mês atual.
6. Testar atalhos de navegação entre abas.
7. Estado vazio sem lançamentos.
8. Confirmar cancelados não entram nos totais.

---

## Riscos encontrados

| Risco | Mitigação |
|-------|-----------|
| Limite 2000 registros | Documentado |
| Legacy v1 (receivable sem `data_recebimento`) | Fallback `data` via helpers G1.6 |
| Rankings sem categoria/centro | Agrupados em "Sem categoria/centro" |
| `FinanceModuleHub` obsoleto na UI | Mantido exportado para referência |

---

## Próximos passos — G1.8 Revisão e congelamento Financeiro Base

1. Auditoria de consistência entre módulos G1.2–G1.7
2. Documentação arquitetural final
3. Remover ou arquivar `FinanceModuleHub` se não usado
4. Congelar escopo financeiro até nova trilha

---

## Fora de escopo (respeitado)

DRE, gráficos complexos, conciliação, PIX, NF-e, parcelamentos, convênios, pacotes, inadimplência, métricas SaaS.

# Sprint G1.6 — Fluxo de Caixa

Relatório de entrega. Data: 2026-06-27.

## Objetivo

Implementar **Fluxo de Caixa** consolidando Contas a Receber e Contas a Pagar a partir de `financial_entries`, sem nova tabela.

## Build

`npm run build` — **aprovado**.

## Migration

**Nenhuma migration criada.**

`financial_entries` já possui `entry_type`, `status`, `data_recebimento`, `data_vencimento`, categorias e centros de custo (G1.4/G1.5).

---

## Regras de consolidação

| Visão | Status | Tipo | Data usada |
|-------|--------|------|------------|
| **Realizado** | `pago` | receivable → entrada; payable → saída | `data_recebimento` → fallback `data` |
| **Previsto** | `pendente` | receivable → entrada; payable → saída | `data_vencimento` → fallback `data` |
| **Cancelado** | `cancelado` | — | **Ignorado sempre** |

---

## Arquivos criados

| Arquivo |
|---------|
| `src/lib/finance/cash-flow-helpers.ts` |
| `src/components/finance/FinanceCashFlowPanel.tsx` |
| `docs/auditorias/sprint-g1.6-fluxo-de-caixa.md` |

## Arquivos alterados

| Arquivo | Alteração |
|---------|-----------|
| `src/lib/finance/query-keys.ts` | `cashFlow`, `cashFlowLookups` |
| `src/lib/finance/index.ts` | Export helpers |
| `src/lib/finance/module-registry.ts` | Fluxo → `active`; dashboard → G1.7 |
| `src/routes/_authenticated/app/financeiro.tsx` | Tab **Fluxo de Caixa** |
| `src/components/finance/FinanceModuleHub.tsx` | Atalho fluxo de caixa |
| `src/components/finance/index.ts` | Export painel |

**Não alterados:** Contas a Receber, Contas a Pagar, Core Clínico, PDFs.

---

## Funcionalidades entregues

### `/app/financeiro` → **Fluxo de Caixa**

**Visões:** Realizado | Previsto | Comparativo (tabs)

**KPIs:**
- Entradas realizadas
- Saídas realizadas
- Saldo realizado
- Saldo previsto

**Filtros:** período, categoria, centro de custo, tipo (receitas/despesas/todos), agrupamento

**Tabela:** data, tipo, categoria, centro de custo, descrição, valor, status (+ coluna visão no comparativo)

**Agrupamentos:** resumo por dia / semana / mês (entradas, saídas, saldo)

**Exportação CSV:** padrão relatorios (BOM UTF-8, separador `;`)

**Estados:** loading, vazio, erro

---

## RLS / Segurança

Leitura via Supabase client + RLS `fin_tenant_select` existente. Sem mutações nesta aba. Modo Suporte N/A (somente leitura).

---

## Como testar

1. Cadastrar receitas e despesas em Contas a Receber / Pagar (algumas pagas, algumas abertas).
2. Abrir **Fluxo de Caixa**.
3. **Realizado:** ver entradas/saídas com status pago no período de `data_recebimento`.
4. **Previsto:** ver títulos abertos por `data_vencimento`.
5. **Comparativo:** ambas visões na mesma tabela.
6. Validar KPIs (saldo = entradas − saídas).
7. Testar agrupamento dia/semana/mês.
8. Exportar CSV e abrir no Excel.
9. Confirmar cancelados não aparecem.
10. Contas a Receber/Pagar inalteradas.

---

## Riscos encontrados

| Risco | Mitigação |
|-------|-----------|
| Limite 2000 registros na query | Documentado; paginação futura |
| Legacy sem `data_recebimento` | Fallback para `data` |
| KPI saldo previsto inclui só pendentes no período | Comportamento esperado (projeção) |
| Lançamentos v1 (receivable) entram no fluxo | Consistente — mesma fonte `financial_entries` |

---

## Próximos passos — G1.7 Dashboard Financeiro

1. Ativar módulo `dashboard` no registry
2. KPIs executivos derivados de `computeCashFlowSummary`
3. Gráficos simples (opcional)
4. Atalhos para CRUD e fluxo de caixa

---

## Fora de escopo (respeitado)

DRE, dashboard avançado, conciliação, PIX, NF-e, parcelamentos, convênios, pacotes, inadimplência, métricas SaaS, nova tabela.

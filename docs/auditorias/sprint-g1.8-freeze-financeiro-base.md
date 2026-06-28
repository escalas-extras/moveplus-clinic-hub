# Sprint G1.8 — Revisão e Congelamento do Financeiro Base

Relatório de entrega. Data: 2026-06-27.

## Objetivo

Revisar, estabilizar e **congelar** o Financeiro Base MVP (G1.1–G1.7), corrigindo apenas bugs, sem novas funcionalidades, migrations ou alterações no Core Clínico.

## Build

`npm run build` — **aprovado** (exit 0, 2026-06-27).

## Migration

**Nenhuma migration criada.**

---

## Arquivos alterados

| Arquivo | Alteração |
|---------|-----------|
| `src/lib/finance/helpers.ts` | `invalidateFinanceModuleQueries()` — invalidação unificada de caches |
| `src/lib/finance/constants.ts` | `FINANCE_BASE_VERSION = "G1.8"` |
| `src/lib/finance/module-registry.ts` | Comentário de congelamento G1.8 |
| `src/routes/_authenticated/app/financeiro.tsx` | Lançamentos v1: filtro `entry_type=receivable`; totais escopados; invalidação unificada; recibos: vínculo só receivables |
| `src/routes/_authenticated/app/relatorios.tsx` | KPIs excluem cancelados explicitamente; export CSV usa `entry_type` para tipo |
| `src/components/finance/FinanceReceivablesPanel.tsx` | Invalidação unificada pós-mutação |
| `src/components/finance/FinancePayablesPanel.tsx` | Invalidação unificada pós-mutação |
| `src/components/finance/FinanceModuleHub.tsx` | Comentário legado (substituído por dashboard G1.7) |
| `docs/architecture/FINANCE_MODULE_ARCHITECTURE.md` | Atualizado para estado pós-G1.7 + freeze G1.8 |
| `docs/auditorias/sprint-g1.8-freeze-financeiro-base.md` | Este relatório |

**Não alterados:** Core Clínico, PDFs clínicos (`pdf-engine.ts`, `receipt-pdf.ts`), migrations, novas telas/tabelas.

---

## Bugs corrigidos

### 1. Lançamentos v1 — escopo incorreto

**Problema:** Lista e totais incluíam registros `payable` e podiam distorcer KPIs legados.

**Correção:**
- Lista: `.eq("entry_type", "receivable")`
- Totais mês/pendente: mesmo filtro + status `pago`/`pendente`
- `markPaid`: restringe a `entry_type = receivable`
- Vínculo em recibos: só receivables não cancelados

### 2. Cache stale após mutações

**Problema:** Contas a receber/pagar e lançamentos v1 não invalidavam dashboard, fluxo de caixa e relatórios.

**Correção:** `invalidateFinanceModuleQueries()` centraliza invalidação de `["finance"]`, `["fin"]`, `["fin-totals"]` e `["report-financial"]`.

### 3. Relatórios financeiros — KPIs e export

**Problema:** KPIs calculados antes de filtrar cancelados; export CSV inferia tipo só pela categoria.

**Correção:** KPIs usam `activeRows` (sem cancelados); export usa `entry_type === "payable"` para Despesa/Receita.

---

## Pontos validados

### 1. Rotas e abas

| Aba | Status |
|-----|--------|
| Visão geral | `FinanceDashboardPanel` — KPIs, rankings, atalhos |
| Categorias | CRUD income/expense, defaults, RLS |
| Centros de Custo | CRUD, flag ativo |
| Contas a Receber | CRUD, receber/cancelar, filtros |
| Contas a Pagar | CRUD, pagar/cancelar, fornecedor via documento |
| Fluxo de Caixa | Realizado/Previsto/Comparativo, CSV |
| Lançamentos v1 | Legado receivable-only (pós-fix) |
| Recibos | Emitir, PDF, cancelar — intacto |

### 2. Permissões

| Item | Status |
|------|--------|
| `clinic_id` em queries | Todas filtram tenant |
| RLS Supabase | `fin_tenant_*`, `fin_cat_*`, `fin_cc_*` |
| Modo Suporte | `SupportGuardButton` + erro em mutações |
| `can_access_clinic` / `can_manage_clinic` | Políticas nas migrations G1.2–G1.5 |
| Vazamento entre clínicas | Sem queries cross-tenant |

### 3. UX (padronização existente)

- `PageHeader` + `AppShell` na rota principal
- Painéis G1.2–G1.7: `KpiGrid`, `EmptyState`, `StatusBadge`, dialogs consistentes
- Lançamentos v1 / Recibos: UI legada preservada (sem refactor de escopo)

### 4. Dados financeiros

| Regra | Validado em |
|-------|-------------|
| Cancelados excluídos | dashboard-helpers, cash-flow-helpers, relatorios (pós-fix) |
| Receitas = receivable | receivable-helpers, dashboard, fluxo |
| Despesas = payable | payable-helpers, dashboard, fluxo |
| Realizado = pago + data_recebimento | cash-flow-helpers, dashboard |
| Previsto = pendente + data_vencimento | cash-flow-helpers |
| Vencidos | isReceivableOverdue / isPayableOverdue |
| Categorias income/expense | filtros nos painéis AR/AP |
| Centros ativos | filterActiveCostCenters nos selects |

### 5. Compatibilidade

| Feature | Status |
|---------|--------|
| Lançamentos v1 | Funcional (escopo corrigido) |
| Recibos + PDF | Intacto |
| Relatórios + CSV | Funcional (KPIs/export corrigidos) |
| Dashboard | Funcional |
| Fluxo de caixa + CSV | Funcional |

### 6. Não implementado (confirmado)

DRE, PIX, NF-e, conciliação, pacotes, convênios, parcelamentos, inadimplência, billing SaaS, métricas SaaS — **fora do escopo**.

---

## Riscos remanescentes

1. **Query keys legadas** (`fin`, `fin-totals`) — mitigado por invalidação unificada; migração total para `financeQueryKeys` fica para G2+
2. **Duplicidade Recibos** — aba em `/app/financeiro` + rota `/app/recibos`
3. **Lançamentos v1** — legado; usuários devem migrar mentalmente para Contas a Receber
4. **Payables sem coluna fornecedor** — fornecedor via `documento` + `observacoes` (decisão G1.5)

---

## Comandos executados

```bash
npm run build
```

---

## Confirmação de build

**Aprovado.** `npm run build` concluiu com exit code 0, sem erros TypeScript ou de bundle.

---

## Recomendação de freeze

**APROVADO para congelamento** do Financeiro Base MVP na versão **G1.8**, desde que:

- Build passe sem erros
- Nenhuma regressão detectada no Core Clínico
- Novos recursos financeiros iniciem trilha **G2+** com revisão arquitetural

Constante de referência: `FINANCE_BASE_VERSION = "G1.8"` em `src/lib/finance/constants.ts`.

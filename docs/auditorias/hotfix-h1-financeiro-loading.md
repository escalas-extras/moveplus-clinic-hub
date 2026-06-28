# Hotfix H1 — Financeiro Loading Infinito

Relatório de entrega. Data: 2026-06-27.

## Objetivo

Corrigir loading infinito e estados inconsistentes em `/app/financeiro`, padronizar erros e garantir UX loading/erro/vazio/conteúdo em todas as abas.

## Build

`npm run build` — **aprovado** (exit 0).

## Migration

**Nenhuma.**

---

## Causa raiz

Dois problemas combinados:

### 1. Filtros inicializados com referência de função

Vários painéis usavam:

```tsx
useState(defaultDashboardFilters) // referência da função, não o objeto
```

Em vez de lazy init explícito:

```tsx
useState(() => defaultDashboardFilters())
```

Isso fazia o estado inicial ser a **função** (não o objeto de filtros). Consequências:

- `filters.from` / `filters.to` → `undefined`
- Query keys instáveis ou inválidas
- Inputs de data sem valor controlado
- Comportamento imprevisível entre painéis (alguns já usavam `()` corretamente)

**Painéis afetados:** Dashboard, Fluxo de Caixa, Contas a Receber, Contas a Pagar, Inadimplência, Receita por Profissional.

### 2. Clínica ativa sem gate explícito

Enquanto `useActiveClinic()` resolvia `clinicId`, os painéis montavam com `clinicId = null` e queries desabilitadas (`enabled: !!clinicId`). TanStack Query v5 não marca queries desabilitadas como `isLoading`, mas também **não carrega dados** — a UI podia ficar em estado ambíguo (sem spinner de clínica, sem erro, sem conteúdo) ou parecer “travada” ao trocar de aba.

**Correção:** prop `clinicLoading` + componente `FinancePanelGate` com estados explícitos para clínica, loading de queries, erro e ausência de clínica.

### 3. Erros de lookups ignorados (Dashboard / Fluxo)

Dashboard e Fluxo de Caixa tratavam apenas erro da query principal (`entries`), ignorando falha em `lookups` (categorias/centros de custo).

---

## Correções aplicadas

| Correção | Detalhe |
|----------|---------|
| Lazy init de filtros | `useState(() => defaultXxxFilters())` em 6 painéis |
| `FinancePanelGate` | Loading clínica → loading queries → erro → conteúdo |
| `FinanceErrorCard` | Erro padronizado + hint para migrations ausentes |
| `finance-error-helpers.ts` | `financeErrorMessage`, `isLikelyMissingMigrationError`, `financeErrorMigrationHint` |
| Lookups error | Dashboard e Fluxo: `entries.error ?? lookups.error` |
| `clinicLoading` | Propagado da rota para todos os painéis + Lançamentos v1 + Recibos |

---

## Arquivos criados

| Arquivo |
|---------|
| `src/lib/finance/finance-error-helpers.ts` |
| `src/components/finance/FinancePanelGate.tsx` |
| `docs/auditorias/hotfix-h1-financeiro-loading.md` |

## Arquivos alterados

| Arquivo |
|---------|
| `src/lib/finance/index.ts` |
| `src/components/finance/index.ts` |
| `src/components/finance/FinanceDashboardPanel.tsx` |
| `src/components/finance/FinanceCashFlowPanel.tsx` |
| `src/components/finance/FinanceReceivablesPanel.tsx` |
| `src/components/finance/FinancePayablesPanel.tsx` |
| `src/components/finance/FinanceDelinquencyPanel.tsx` |
| `src/components/finance/FinanceProfessionalRevenuePanel.tsx` |
| `src/components/finance/FinancePackagesPanel.tsx` |
| `src/components/finance/FinanceHealthInsurancePanel.tsx` |
| `src/components/finance/FinanceCategoriesPanel.tsx` |
| `src/components/finance/FinanceCostCentersPanel.tsx` |
| `src/routes/_authenticated/app/financeiro.tsx` |

**Preservados:** Core Clínico, PDFs clínicos, migrations, regras G1/G2.

---

## Abas validadas

| Aba | Loading clínica | Loading dados | Erro | Vazio | Conteúdo |
|-----|-----------------|---------------|------|-------|----------|
| Visão geral | Sim | Sim | Sim | Sim | Sim |
| Categorias | Sim | Sim | Sim | Sim | Sim |
| Centros de Custo | Sim | Sim | Sim | Sim | Sim |
| Contas a Receber | Sim | Sim | Sim | Sim | Sim |
| Contas a Pagar | Sim | Sim | Sim | Sim | Sim |
| Fluxo de Caixa | Sim | Sim | Sim | Sim | Sim |
| Pacotes | Sim | Sim | Sim | Sim | Sim |
| Convênios | Sim | Sim | Sim | Sim | Sim |
| Inadimplência | Sim | Sim | Sim | Sim | Sim |
| Receita por Profissional | Sim | Sim | Sim | Sim | Sim |
| Lançamentos v1 | Sim | Sim | Sim | Sim | Sim |
| Recibos | Sim | Sim | Sim | Sim | Sim |

---

## Riscos remanescentes

1. **Hint de migration** — heurística por mensagem de erro Postgres/PostgREST; falsos positivos/negativos possíveis.
2. **Sub-queries aninhadas** — Pacotes (contratos) e Convênios (vínculos) mantêm loading/erro local dentro do painel já carregado; comportamento correto mas duplo spinner em falha parcial.
3. **Volume de dados** — limites 2000–5000 entries inalterados (G2.7).
4. **Query keys legadas** — `fin`, `fin-totals` em Lançamentos v1 coexistem com `financeQueryKeys`.

---

## Critérios de aceite

| Critério | Status |
|----------|--------|
| Build aprovado | Sim |
| Nenhuma migration | Sim |
| Core Clínico intacto | Sim |
| PDFs intactos | Sim |
| Loading infinito corrigido | Sim |
| Erros padronizados | Sim |
| Todas as abas com estados UX | Sim |

# Sprint UX-01 — Financeiro Premium

Relatório de entrega. Data: 2026-06-27.

## Objetivo

Tela Financeiro mais comercial, limpa e focada na operação diária — somente UX/UI.

## Build

`npm run build` — **aprovado** (exit 0).

## Migration / regras

**Nenhuma alteração** em banco, migrations, queries, permissões, RLS, Core Clínico ou PDFs.

---

## Implementado

### 1. KPIs ~30% mais compactos

- `KpiCard` ganhou prop `size="compact"` (altura mínima 108px vs 156px premium).
- `FinanceKpiCard` / `FinanceKpiGrid` aplicados em todos os painéis financeiros.

### 2. Três áreas de navegação

| Área | Módulos | Destaque |
|------|---------|----------|
| **Operação** | Receber, Pagar, Fluxo, Pacotes, Convênios, Inadimplência | Cards primários (maiores, sombra ativa) |
| **Análises** | Dashboard Executivo, Receita por Profissional | Cards secundários |
| **Administração** | Card único expand/collapse + 4 sub-itens | Categorias, Centros de Custo, Lançamentos v1, Recibos |

### 3. Comportamento

- Aba inicial: **Contas a Receber** (foco operacional).
- Administração expande ao clicar no card ⚙; auto-expande se aba admin estiver ativa.
- Descrição do `PageHeader` atualizada para tom comercial.

### 4. Visual

- Mais espaço entre seções (`gap-8` nav, `mt-8` conteúdo).
- Grids responsivos sem overflow horizontal.
- Hierarquia visual clara (primário / secundário / admin).

---

## Arquivos alterados

| Arquivo |
|---------|
| `src/components/layout/KpiCard.tsx` |
| `src/components/finance/FinanceKpiCard.tsx` *(novo)* |
| `src/components/finance/FinanceModuleNav.tsx` |
| `src/components/finance/finance-layout.ts` |
| `src/components/finance/index.ts` |
| `src/routes/_authenticated/app/financeiro.tsx` |
| `src/components/finance/FinanceDashboardPanel.tsx` |
| `src/components/finance/FinanceReceivablesPanel.tsx` |
| `src/components/finance/FinancePayablesPanel.tsx` |
| `src/components/finance/FinanceCashFlowPanel.tsx` |
| `src/components/finance/FinanceDelinquencyPanel.tsx` |
| `src/components/finance/FinanceProfessionalRevenuePanel.tsx` |
| `docs/auditorias/sprint-ux-01-financeiro-premium.md` |

---

## Checklist visual

- [ ] Seção **Operação** com 6 cards destacados (2×3 no desktop)
- [ ] Seção **Análises** com 2 cards menores
- [ ] **Administração Financeira** expande/colapsa com 4 sub-cards
- [ ] KPIs visivelmente mais baixos nos painéis
- [ ] Sem scroll horizontal na página
- [ ] Todas as 12 abas/painéis funcionais

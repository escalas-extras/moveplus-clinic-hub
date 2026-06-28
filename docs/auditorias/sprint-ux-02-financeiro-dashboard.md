# Sprint UX-02 — Reorganização do Dashboard Financeiro

Relatório de entrega. Data: 2026-06-27.

## Objetivo

Priorizar informação antes de navegação — dashboard executivo visível ao abrir a página.

## Build

`npm run build` — **aprovado** (exit 0).

## Migration / regras

**Nenhuma alteração** em banco, queries, regras de negócio, permissões ou RLS.

---

## Nova hierarquia visual

```
Título (PageHeader)
    ↓
KPIs executivos (Entradas, Saídas, Saldo, Saldo previsto)
    ↓
Filtros de período/categoria
    ↓
Conteúdo (dashboard detalhado ou painel do módulo)
    ↓
Atalhos (Operação + Análises)
    ↓
Administração (recolhida)
```

---

## Implementado

| Item | Detalhe |
|------|---------|
| `FinanceExecutiveStrip` | 4 KPIs densos + filtros fixos no topo da página |
| `useFinanceExecutiveDashboard` | Hook compartilhado (mesmas query keys — dedupe RQ) |
| `FinanceDashboardPanel` | Modo `contentOnly` — resumos, rankings e próximos vencimentos |
| `FinanceModuleNav` | Atalhos compactos (chips) abaixo do conteúdo |
| `KpiCard size="dense"` | ~25% menor que compact (80px min-height) |
| Aba inicial | `visao-geral` (dashboard detalhado) |

---

## Arquivos alterados

| Arquivo |
|---------|
| `src/components/layout/KpiCard.tsx` |
| `src/components/finance/FinanceKpiCard.tsx` |
| `src/components/finance/FinanceExecutiveStrip.tsx` *(novo)* |
| `src/components/finance/useFinanceExecutiveDashboard.ts` *(novo)* |
| `src/components/finance/FinanceDashboardPanel.tsx` |
| `src/components/finance/FinanceModuleNav.tsx` |
| `src/components/finance/finance-layout.ts` |
| `src/components/finance/index.ts` |
| `src/routes/_authenticated/app/financeiro.tsx` |
| `docs/auditorias/sprint-ux-02-financeiro-dashboard.md` |

---

## Checklist visual

- [ ] Ao abrir `/app/financeiro`, KPIs visíveis sem rolar
- [ ] Filtros logo abaixo dos KPIs
- [ ] Dashboard detalhado (rankings, vencimentos) no centro
- [ ] Atalhos discretos abaixo do conteúdo — não competem com KPIs
- [ ] Administração recolhida por padrão
- [ ] Clique em atalho troca o painel central

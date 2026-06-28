# Sprint PREMIUM-01 — Design System Operacional

Relatório de entrega. Data: 2026-06-27.

## Objetivo

Criar padrão visual único para o FisioOS e aplicá-lo às quatro telas principais: Dashboard, Agenda, Financeiro e Pacientes.

## Build

`npm run build` — **aprovado** (exit 0).

## Escopo respeitado

**Nenhuma alteração** em regras de negócio, banco, queries ou permissões — somente UX/UI.

---

## Componentes reutilizáveis criados (`src/components/ops/`)

| Componente | Propósito |
|------------|-----------|
| `ops-tokens.ts` | Tokens de espaçamento, grid e accents semânticos |
| `OpsModuleStack` | Espaçamento vertical padronizado entre blocos |
| `OpsPageHero` | Hero unificado — `variant="welcome"` (dashboard) ou módulo (`PageHeader`) |
| `OpsBackLink` | Navegação de retorno para hubs |
| `OpsKpiStrip` / `OpsKpiCard` | KPIs premium com accents semânticos e tamanho por contexto |
| `OpsFiltersPanel` | Painel de filtros com toolbar, toggle mobile e grid responsivo |
| `OpsMobileFilterToggle` | Botão mobile de filtros com indicador ativo |
| `OpsOperationCard` | Card operacional clicável (navegação para submódulos) |
| `OpsDataListPanel` | Listas tabulares leves com empty state padronizado |

---

## Padronização aplicada

| Área | Antes | Depois |
|------|-------|--------|
| Hero | `DashboardHero` vs `PageHeader` isolados | `OpsPageHero` |
| KPIs | Variants/tamanhos/cores diferentes | `OpsKpiStrip` + `OpsKpiCard` + `opsAccent` |
| Filtros | InfoCard manual, shadcn Card (finance) | `OpsFiltersPanel` + `FilterField` |
| Cards operacionais | `FinanceOperationCard` próprio | `OpsOperationCard` (finance re-exporta) |
| Listas financeiras | shadcn `Card` + `<p>` vazio | `OpsDataListPanel` + `EmptyState` |
| Espaçamento | `space-y-*` ad hoc | `OpsModuleStack` |
| Ações | shadcn `Button` misturado | `PrimaryActionButton` / `OutlineActionButton` |

---

## Telas padronizadas

| Tela | Alterações |
|------|------------|
| `/app` (Dashboard) | `OpsPageHero` welcome, `OpsModuleStack`, `OpsKpiStrip` |
| `/app/agenda` | `OpsPageHero`, `OpsKpiStrip`, `OpsFiltersPanel` |
| `/app/pacientes` | `OpsPageHero`, `OpsKpiStrip`, `OpsFiltersPanel` |
| `/app/financeiro` | `OpsPageHero`, `OpsModuleStack`, filtros e listas via ops |

---

## Arquivos alterados (integração)

| Arquivo |
|---------|
| `src/routes/_authenticated/app/index.tsx` |
| `src/routes/_authenticated/app/agenda.tsx` |
| `src/routes/_authenticated/app/pacientes/index.tsx` |
| `src/routes/_authenticated/app/financeiro/index.tsx` |
| `src/components/finance/FinanceOperationCard.tsx` |
| `src/components/finance/FinanceOperationsGrid.tsx` |
| `src/components/finance/FinanceFiltersBar.tsx` |
| `src/components/finance/FinanceModuleShell.tsx` |
| `src/components/finance/FinanceDashboardPanel.tsx` |
| `src/styles.css` |

---

## Uso em novos módulos

```tsx
import {
  OpsPageHero,
  OpsModuleStack,
  OpsKpiStrip,
  OpsKpiCard,
  OpsFiltersPanel,
  OpsOperationCard,
  OpsDataListPanel,
} from "@/components/ops";
```

Todo novo módulo operacional deve compor a página a partir desses primitives.

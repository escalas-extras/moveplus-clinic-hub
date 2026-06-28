# Hotfix H2 — Ajuste de Largura do Financeiro

Relatório de entrega. Data: 2026-06-27.

## Objetivo

Corrigir overflow horizontal em `/app/financeiro` sem alterar regras de negócio, banco ou Core Clínico.

## Build

`npm run build` — **aprovado** (exit 0).

## Migration

**Nenhuma.**

---

## Causa do overflow

Três fatores combinados forçavam a largura da página além do container do AppShell:

### 1. Barra de abas principal (principal)

`TabsList` usa `inline-flex` + `TabsTrigger` com `whitespace-nowrap`. Com **12 abas** rotuladas, a lista não quebrava linha e empurrava toda a página para a direita.

### 2. Grids de filtros com muitas colunas em `xl`

Painéis de Inadimplência e Receita por Profissional usavam `xl:grid-cols-8`; Receber, Pagar e Fluxo usavam `xl:grid-cols-6`. Em viewports intermediárias, os filtros exigiam largura mínima maior que o container.

### 3. Falta de contenção (`min-w-0` / `max-w-full`)

Wrappers raiz dos painéis, `FinancePanelGate`, `TabsContent` e alguns cards/tabelas não propagavam `min-w-0`, impedindo que filhos flex/grid encolhessem dentro do AppShell. Tabelas largas sem `min-w` explícito no `<table>` não isolavam o scroll horizontal no card.

---

## Correções aplicadas

| Correção | Detalhe |
|----------|---------|
| `finance-layout.ts` | Tokens compartilhados: `FINANCE_PANEL_ROOT`, `FINANCE_FILTER_GRID`, `FINANCE_TABLE_*`, `FINANCE_TAB_CONTENT`, `FINANCE_TABS_LIST*` |
| `financeiro.tsx` | Tabs com scroll horizontal interno; `TabsContent` com `min-w-0 max-w-full`; tabelas Lançamentos/Recibos com scroll no card |
| `FinancePanelGate` | Children envolvidos em `min-w-0 w-full max-w-full` |
| Painéis G2 | Raiz `min-w-0 w-full max-w-full`; filtros em grid responsivo (máx. 4 colunas em `xl`, 6 em `2xl`) |
| Tabelas | `overflow-x-auto` apenas no wrapper do card; `<table className="min-w-[720px]">` para scroll interno |
| Filtros Pacotes/Convênios | `flex-wrap` + `min-w-0` nos inputs de busca |

---

## Arquivos criados

| Arquivo |
|---------|
| `src/components/finance/finance-layout.ts` |
| `docs/auditorias/hotfix-h2-financeiro-layout.md` |

## Arquivos alterados

| Arquivo |
|---------|
| `src/components/finance/index.ts` |
| `src/components/finance/FinancePanelGate.tsx` |
| `src/components/finance/FinanceDashboardPanel.tsx` |
| `src/components/finance/FinanceReceivablesPanel.tsx` |
| `src/components/finance/FinancePayablesPanel.tsx` |
| `src/components/finance/FinanceCashFlowPanel.tsx` |
| `src/components/finance/FinancePackagesPanel.tsx` |
| `src/components/finance/FinanceHealthInsurancePanel.tsx` |
| `src/components/finance/FinanceDelinquencyPanel.tsx` |
| `src/components/finance/FinanceProfessionalRevenuePanel.tsx` |
| `src/components/finance/FinanceCategoriesPanel.tsx` |
| `src/components/finance/FinanceCostCentersPanel.tsx` |
| `src/routes/_authenticated/app/financeiro.tsx` |

---

## Confirmação visual (checklist)

- [ ] Página `/app/financeiro` **não** gera scroll horizontal no body
- [ ] Barra de 12 abas rola horizontalmente **dentro** do container quando necessário
- [ ] Filtros quebram em múltiplas linhas em telas médias
- [ ] Tabelas largas (Receber, Pagar, Inadimplência, etc.) rolam **dentro do card**
- [ ] KPIs, cards e grids permanecem visíveis (nada importante oculto)
- [ ] Abas Lançamentos v1 e Recibos respeitam a largura do AppShell

---

## Fora de escopo (respeitado)

- Core Clínico
- PDFs clínicos
- Migrations / banco
- Regras de negócio financeiras

---

## Atualização H2 — Mini cards responsivos (navegação)

### Objetivo

Substituir a barra horizontal de abas por grid de mini cards (até 2 linhas no desktop).

### Causa do overflow (navegação)

Mesmo com scroll interno, `TabsList` + `inline-flex` + `whitespace-nowrap` em 12 abas empurrava a largura da página. A UX horizontal também dificultava descoberta dos módulos.

### Correção

| Item | Detalhe |
|------|---------|
| `FinanceModuleNav.tsx` | Grid de mini cards com ícone, título e descrição; estado ativo destacado |
| `FINANCE_NAV_GRID` | `grid-cols-2` → `md:grid-cols-3` → `lg:grid-cols-6` (12 abas = 2 linhas no desktop) |
| `financeiro.tsx` | Usa `<FinanceModuleNav />` no lugar de `TabsList` horizontal |

### Arquivos adicionais

| Arquivo |
|---------|
| `src/components/finance/FinanceModuleNav.tsx` |

### Build (mini cards)

`npm run build` — **aprovado** (exit 0).

### Checklist visual (navegação)

- [ ] 12 mini cards visíveis sem scroll horizontal na página
- [ ] Desktop (`lg+`): 6 colunas × 2 linhas
- [ ] Tablet: 3 colunas; mobile: 2 colunas
- [ ] Card ativo com borda/anel primário
- [ ] Todas as abas funcionais (conteúdo troca ao clicar)

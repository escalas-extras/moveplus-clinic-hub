# Sprint UX-03 — Dashboard Operacional do Financeiro

Relatório de entrega. Data: 2026-06-27.

## Objetivo

Centro de Operações Financeiras — informação protagonista, sem menu de navegação.

## Build

`npm run build` — **aprovado** (exit 0).

## Migration / regras

**Nenhuma alteração** em banco, migrations, queries existentes, helpers financeiros, permissões ou RLS.

---

## Nova hierarquia

```
Título
  ↓
Cards Operacionais Inteligentes (7)
  ↓
Filtros
  ↓
Conteúdo (hub analítico ou módulo)
  ↓
Administração Financeira (recolhida)
```

---

## Implementado

| Item | Detalhe |
|------|---------|
| `FinanceOperationsGrid` | 7 cards clicáveis com métricas operacionais |
| `FinanceOperationCard` | Painel vivo — hover com elevação suave, cursor pointer |
| `useFinanceOperationsSnapshot` | Agrega dados via helpers existentes (`computeReceivableSummary`, `computeDelinquencySummary`, etc.) |
| `FinanceFiltersBar` | Filtros abaixo dos cards operacionais |
| `FinanceAdminSection` | Admin recolhida (Categorias, Centros, Lançamentos v1, Recibos) |
| Hub `view=hub` | Bloco analítico (`FinanceDashboardPanel`) — rankings, vencimentos, resumo |
| Removido | Menu de atalhos / cards de navegação (UX-01/02) |

### Cards operacionais

| Card | Métricas | Navega para |
|------|----------|-------------|
| Receber | Valor aberto, títulos, vencimentos próximos | Contas a Receber |
| Pagar | Valor a pagar, quantidade, próximos vencimentos | Contas a Pagar |
| Fluxo | Saldo, entradas, saídas | Fluxo de Caixa |
| Pacotes | Ativos, vencendo, sessões restantes | Pacotes |
| Convênios | Valor previsto, guias, pendências | Convênios |
| Inadimplência | Valor vencido, pacientes, crítico >30d | Inadimplência |
| Receita Prof. | Receita total, maior faturamento, ticket médio | Receita por Profissional |

---

## Arquivos criados

| Arquivo |
|---------|
| `src/components/finance/FinanceOperationCard.tsx` |
| `src/components/finance/FinanceOperationsGrid.tsx` |
| `src/components/finance/FinanceFiltersBar.tsx` |
| `src/components/finance/FinanceAdminSection.tsx` |
| `src/components/finance/useFinanceOperationsSnapshot.ts` |
| `docs/auditorias/sprint-ux-03-financeiro-operacoes.md` |

## Arquivos alterados

| Arquivo |
|---------|
| `src/routes/_authenticated/app/financeiro.tsx` |
| `src/components/finance/FinanceDashboardPanel.tsx` |
| `src/components/finance/FinanceModuleNav.tsx` (deprecated stub) |
| `src/components/finance/finance-layout.ts` |
| `src/components/finance/index.ts` |

---

## Padrão FisioOS (Centro de Operações)

> Cada tela deve ser um Centro de Operações, não um menu de navegação.

Replicável em Agenda, Pacientes, Documentos, Relatórios e Dashboard Geral.

---

## Checklist visual

- [ ] 7 cards operacionais visíveis ao abrir a página
- [ ] Clique no card abre o módulo correspondente
- [ ] Filtros abaixo dos cards
- [ ] Hub analítico no carregamento inicial
- [ ] "← Voltar à visão analítica" ao navegar para módulo
- [ ] Administração recolhida no rodapé
- [ ] Sem menu de atalhos competindo com indicadores

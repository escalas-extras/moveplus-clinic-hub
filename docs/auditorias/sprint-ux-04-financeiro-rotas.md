# Sprint UX-04 — Arquitetura de Rotas do Financeiro

Relatório de entrega. Data: 2026-06-27.

## Objetivo

Transformar o módulo Financeiro em rotas independentes. A Home responde *“Como está minha clínica?”*; cada submódulo responde *“Como executo meu trabalho?”*.

## Build

`npm run build` — **aprovado** (exit 0).

## Migration / regras

**Nenhuma alteração** em banco, migrations, queries, helpers financeiros, permissões, RLS, Core Clínico ou PDFs.

---

## Rotas criadas

| Rota | Conteúdo |
|------|----------|
| `/app/financeiro` | Dashboard Home — cards, filtros, dashboard executivo |
| `/app/financeiro/receber` | `FinanceReceivablesPanel` |
| `/app/financeiro/pagar` | `FinancePayablesPanel` |
| `/app/financeiro/fluxo` | `FinanceCashFlowPanel` |
| `/app/financeiro/pacotes` | `FinancePackagesPanel` |
| `/app/financeiro/convenios` | `FinanceHealthInsurancePanel` |
| `/app/financeiro/inadimplencia` | `FinanceDelinquencyPanel` |
| `/app/financeiro/receita-profissional` | `FinanceProfessionalRevenuePanel` |
| `/app/financeiro/administracao` | Categorias, Centros de Custo, Lançamentos v1, Recibos |

---

## Padrão arquitetural

```
Home (Centro de Operações)
  ├── KPIs + Cards operacionais
  ├── Filtros de período
  └── Dashboard executivo (rankings, vencimentos, resumo)

Submódulos (Execução)
  ├── Breadcrumb: Financeiro > Módulo
  ├── ← Dashboard Financeiro
  └── Painel existente (sem duplicação)
```

---

## Implementado

| Item | Detalhe |
|------|---------|
| `finance-routes.ts` | Constantes `FINANCE_ROUTES` e metadados `FINANCE_MODULE_META` |
| `FinanceModuleShell` | Shell com breadcrumb, título, descrição e link de retorno |
| `FinanceOperationsGrid` | Cards navegam via `Link` para rotas dedicadas |
| `FinanceFiltersBar` | Botões Recebimento/Despesa navegam para `/receber` e `/pagar` |
| `FinanceLegacyPanels` | Lançamentos v1 e Recibos extraídos do monolito |
| Home | Sem painéis operacionais inline, sem `FinanceAdminSection` |
| Administração | Link discreto no header da Home → `/administracao` |

### Reutilização de componentes (sem duplicação)

Todos os painéis operacionais existentes foram **reutilizados** — apenas mudou o local de renderização:

- `FinanceReceivablesPanel`
- `FinancePayablesPanel`
- `FinanceCashFlowPanel`
- `FinancePackagesPanel`
- `FinanceHealthInsurancePanel`
- `FinanceDelinquencyPanel`
- `FinanceProfessionalRevenuePanel`
- `FinanceCategoriesPanel`
- `FinanceCostCentersPanel`
- `FinanceLegacyLancamentosPanel` / `FinanceLegacyRecibosPanel`

---

## Arquivos criados

| Arquivo |
|---------|
| `src/routes/_authenticated/app/financeiro/index.tsx` |
| `src/routes/_authenticated/app/financeiro/receber.tsx` |
| `src/routes/_authenticated/app/financeiro/pagar.tsx` |
| `src/routes/_authenticated/app/financeiro/fluxo.tsx` |
| `src/routes/_authenticated/app/financeiro/pacotes.tsx` |
| `src/routes/_authenticated/app/financeiro/convenios.tsx` |
| `src/routes/_authenticated/app/financeiro/inadimplencia.tsx` |
| `src/routes/_authenticated/app/financeiro/receita-profissional.tsx` |
| `src/routes/_authenticated/app/financeiro/administracao.tsx` |
| `src/components/finance/finance-routes.ts` |
| `src/components/finance/FinanceModuleShell.tsx` |
| `src/components/finance/FinanceLegacyPanels.tsx` |
| `docs/auditorias/sprint-ux-04-financeiro-rotas.md` |

## Arquivos alterados

| Arquivo |
|---------|
| `src/components/finance/FinanceOperationCard.tsx` |
| `src/components/finance/FinanceOperationsGrid.tsx` |
| `src/components/finance/FinanceFiltersBar.tsx` |
| `src/components/finance/index.ts` |
| `src/routeTree.gen.ts` (auto) |

## Arquivos removidos

| Arquivo |
|---------|
| `src/routes/_authenticated/app/financeiro.tsx` (monolito ~770 linhas) |

---

## Próximo padrão (futuro)

Aplicar o mesmo modelo **Home + Submódulos** em: Agenda, Pacientes, Documentos, Relatórios, Avaliações e Administração.

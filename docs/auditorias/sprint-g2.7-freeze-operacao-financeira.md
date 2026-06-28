# Sprint G2.7 — Freeze Operação Financeira

Relatório de revisão e congelamento. Data: 2026-06-27.

## Objetivo

Revisar, estabilizar e **congelar** a trilha G2 — Operação Financeira da Clínica (G2.1–G2.6).

## Build

`npm run build` — **aprovado** (exit 0).

## Migration

**Nenhuma** — sprint de revisão; bugs corrigidos apenas na UI.

---

## Escopo revisado

| Aba | Componente | Status revisão |
|-----|------------|----------------|
| Pacotes | `FinancePackagesPanel` | OK |
| Convênios | `FinanceHealthInsurancePanel` | OK (+ fix erro) |
| Inadimplência | `FinanceDelinquencyPanel` | OK (+ fix erro) |
| Receita por Profissional | `FinanceProfessionalRevenuePanel` | OK (+ fix erro) |
| Contas a Receber | `FinanceReceivablesPanel` | OK |
| Fluxo de Caixa | `FinanceCashFlowPanel` | OK |
| Dashboard | `FinanceDashboardPanel` | OK |

---

## Validação de regras de negócio

| Regra | Validação | Resultado |
|-------|-----------|-----------|
| Pacotes geram recebível | `FinancePackagesPanel` insert em `financial_entries` ou `createFinancialInstallmentPlan` | **OK** |
| Consumo reduz saldo | Triggers DB em `patient_package_usages` (G2.2) | **OK** |
| Estorno devolve saldo | Trigger de estorno (G2.2) | **OK** |
| Parcelas somam valor total | `computeInstallmentAmounts()` valida soma ± R$ 0,01 | **OK** |
| Parcelas entram no fluxo | `financial_entries` receivable pendente; `CashFlowPanel` inclui previsto | **OK** |
| Convênio gera recebível | `createReceivable` mutation em `FinanceHealthInsurancePanel` | **OK** |
| Inadimplência = vencidos pendentes | Query: `pendente` + `data_vencimento < hoje` | **OK** |
| Receita profissional ignora cancelados | Query: `.neq("status", "cancelado")` | **OK** |
| Sem professional_id → grupo separado | `PROFESSIONAL_REVENUE_UNASSIGNED_ID` / label dedicado | **OK** |

---

## Segurança

| Item | Status |
|------|--------|
| `clinic_id` em todas as queries G2 | Sim |
| RLS nas tabelas G2 | Sim (migrations G2.1–G2.5) |
| Triggers cross-clinic | Sim |
| Modo Suporte — UI | `SupportGuardButton` nos painéis mutáveis |
| Modo Suporte — DB | `fn_block_support_writes` |
| `can_access_clinic` / `can_manage_clinic` | Herdado das policies G1/G2 |

**Observação:** Receita por Profissional e Inadimplência são somente leitura — Modo Suporte compatível por design.

---

## UX revisada

| Estado | Pacotes | Convênios | Inadimplência | Receita Prof. | Receber | Fluxo | Dashboard |
|--------|---------|-----------|---------------|---------------|---------|-------|-----------|
| Loading | Sim | Sim | Sim | Sim | Sim | Sim | Sim |
| Vazio | Sim | Sim | Sim | Sim | Sim | Sim | Sim |
| Erro | Sim* | Sim* | Sim* | Sim* | Sim | Sim | Sim |

\*Corrigido nesta sprint (ver bugs abaixo).

Filtros, dialogs, badges, KPIs e responsividade básica (`overflow-x-auto`, grids responsivos) — **consistentes** com padrão Premium G1.

---

## Bugs corrigidos (G2.7)

| Bug | Arquivo | Correção |
|-----|---------|----------|
| Convênios sem estado de erro global | `FinanceHealthInsurancePanel.tsx` | Card de erro + retry para `providers`/`lookups` |
| Vínculos convênio falham silenciosamente | `FinanceHealthInsurancePanel.tsx` | Card de erro + retry para query `links` |
| Contratos de pacote falham → empty state | `FinancePackagesPanel.tsx` | Card de erro + retry para query `contracts` |
| Lookups inadimplência falham parcialmente | `FinanceDelinquencyPanel.tsx` | Erro inclui `lookups.isError` + retry duplo |
| Lookups receita prof. falham parcialmente | `FinanceProfessionalRevenuePanel.tsx` | Erro inclui `lookups.isError` + retry duplo |

---

## Arquivos alterados

| Arquivo | Alteração |
|---------|-----------|
| `src/components/finance/FinanceHealthInsurancePanel.tsx` | Estados de erro |
| `src/components/finance/FinancePackagesPanel.tsx` | Erro em contratos |
| `src/components/finance/FinanceDelinquencyPanel.tsx` | Erro em lookups |
| `src/components/finance/FinanceProfessionalRevenuePanel.tsx` | Erro em lookups |
| `src/lib/finance/constants.ts` | `FINANCE_G2_VERSION = "G2.7"` |
| `docs/architecture/FINANCE_MODULE_ARCHITECTURE.md` | Documentação G2 + freeze |
| `docs/auditorias/sprint-g2.7-freeze-operacao-financeira.md` | Este relatório |

**Preservados:** Core Clínico, PDFs clínicos, migrations existentes, regras G1/G2.

---

## Riscos remanescentes

1. **Volume de dados** — Inadimplência e Receita por Profissional limitam a 5000 entries; clínicas com alto volume podem precisar paginação server-side (G3+).
2. **Query keys legadas** — `fin`, `fin-totals` coexistem com `financeQueryKeys`; invalidação unificada mitiga stale cache.
3. **Profissional opcional** — AR manual (G1.4) ainda exige profissional; pacotes/convênios permitem null — comportamento intencional, documentado.
4. **Recibos duplicados** — aba em `/app/financeiro` e rota `/app/recibos`.
5. **Lançamentos v1** — legado; novos fluxos devem usar Contas a Receber.

---

## Regressão

| Área | Verificação |
|------|-------------|
| Core Clínico | Não alterado |
| PDFs clínicos | Não alterados |
| G1 (Receber, Pagar, Fluxo, Dashboard) | Sem alteração de lógica |
| G2.1–G2.6 | Apenas fixes de UX erro |
| Build | Executado nesta sprint |

---

## Recomendação de freeze

**Aprovar congelamento da trilha G2** com versão `FINANCE_G2_VERSION = "G2.7"`.

Critérios atendidos:
- Build aprovado
- Nenhuma migration nova
- Nenhuma funcionalidade nova
- Regras de negócio validadas por revisão de código
- Bugs de UX corrigidos
- Documentação atualizada

**Próximos recursos financeiros:** nova trilha G3+ com revisão arquitetural.

---

## Critérios de aceite

| Critério | Status |
|----------|--------|
| Build aprovado | Sim |
| Nenhuma migration nova | Sim |
| Core Clínico intacto | Sim |
| PDFs clínicos intactos | Sim |
| Financeiro G2 apto para congelamento | Sim |

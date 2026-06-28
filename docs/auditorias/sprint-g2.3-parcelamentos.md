# Sprint G2.3 — Parcelamentos financeiros

Relatório de entrega. Data: 2026-06-27.

## Objetivo

Implementar **parcelamento financeiro** para contas a receber e contratos de pacote, mantendo `financial_entries` como fonte operacional.

## Build

`npm run build` — **aprovado** (exit 0).

## Migration

`supabase/migrations/20260705120000_financial_installment_plans.sql`

- Tabela `financial_installment_plans`
- Enum `installment_plan_status` (`active`, `canceled`, `completed`)
- Colunas em `financial_entries`: `installment_plan_id`, `installment_number`, `installment_total`
- RLS `fin_inst_plan_tenant_*`, triggers de clínica e Modo Suporte

---

## Arquivos criados

| Arquivo |
|---------|
| `supabase/migrations/20260705120000_financial_installment_plans.sql` |
| `src/lib/finance/installment-helpers.ts` |
| `src/components/finance/FinanceInstallmentPlanDialog.tsx` |
| `docs/auditorias/sprint-g2.3-parcelamentos.md` |

## Arquivos alterados

| Arquivo | Alteração |
|---------|-----------|
| `src/integrations/supabase/types.ts` | Tipos plano + colunas em entries |
| `src/lib/finance/types.ts` | Aliases + `FinanceModuleId.installments` |
| `src/lib/finance/constants.ts` | Labels, `FINANCE_G2_VERSION = G2.3` |
| `src/lib/finance/query-keys.ts` | `installmentPlan` |
| `src/lib/finance/module-registry.ts` | Módulo Parcelamentos |
| `src/lib/finance/index.ts` | Export helpers |
| `src/components/finance/index.ts` | Export dialog |
| `src/components/finance/FinanceReceivablesPanel.tsx` | Parcelar na criação + ver/cancelar plano |
| `src/components/finance/FinancePackagesPanel.tsx` | Parcelar na contratação + ver plano |

**Preservados:** Core Clínico, PDFs clínicos, Financeiro Base G1 congelado.

---

## Funcionalidades

### Plano (`financial_installment_plans`)

| Campo | Descrição |
|-------|-----------|
| source_type | `manual` (receita) ou `package_contract` |
| source_id | ID do contrato (pacote) ou null |
| patient_id, total_amount, installments_count | Metadados |
| first_due_date, status | Vencimento inicial e ciclo de vida |

### Parcelas (`financial_entries`)

Cada parcela é um receivable `pendente` com:
- `valor` calculado (última parcela ajusta centavos)
- `data_vencimento` mensal a partir do 1º vencimento
- `documento`: `PARC-N/T`
- `observacoes` com referência ao parcelamento
- `category_id` obrigatório; `cost_center_id` opcional

### Regras

| Regra | Implementação |
|-------|---------------|
| Soma = total | `computeInstallmentAmounts()` |
| Mínimo 2 parcelas | Validação UI + CHECK DB |
| Cancelar plano sem parcelas pagas | `cancelFinancialInstallmentPlan()` |
| Cancelamento cancela pendentes | UPDATE status `cancelado` |
| Sem DELETE | Soft cancel apenas |
| Cancelados ignorados em KPIs | Já existente G1 (cash-flow, dashboard) |

### UI

**Contas a Receber:** toggle “Parcelar receita” no cadastro; botão “Ver parcelas”; cancelar plano no dialog.

**Pacotes:** toggle “Parcelar valor” na contratação; botão “Parcelas” no contrato; cancelamento de contrato cancela plano pendente.

---

## Integração financeira

- Parcelas aparecem em **Contas a Receber** (listagem individual)
- **Fluxo de Caixa previsto:** parcelas `pendente` com `data_vencimento`
- **Realizado:** parcelas `pago` com `data_recebimento`
- **Cancelados** excluídos dos KPIs (helpers G1.6/G1.7 inalterados)

---

## Segurança

| Item | Status |
|------|--------|
| `clinic_id` | Sim |
| RLS | `fin_inst_plan_tenant_*` |
| Match cross-table | Triggers |
| Modo Suporte | UI + DB |

---

## Fora de escopo (confirmado)

Juros, multa, boleto, PIX, NF-e, cartão, recorrência, inadimplência avançada, conciliação, convênios.

---

## Comandos executados

```bash
npm run build
```

## Critérios de aceite

| Critério | Status |
|----------|--------|
| Parcelamento gera parcelas corretas | OK |
| Soma fecha com total | OK |
| Parcelas em Contas a Receber | OK |
| Previsto no Fluxo de Caixa | OK |
| Realizado quando pago | OK |
| Cancelados ignorados | OK |
| Build aprovado | OK |
| Sem regressão Core Clínico | OK |
| Sem alteração PDFs | OK |

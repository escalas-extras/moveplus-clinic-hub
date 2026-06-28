# Sprint G2.5 — Inadimplência

Relatório de entrega. Data: 2026-06-27.

## Objetivo

Implementar controle básico de **inadimplência**: identificar recebíveis vencidos em `financial_entries`, exibir KPIs e faixas de atraso, permitir acompanhamento com nota simples de cobrança e registrar recebimento.

## Build

`npm run build` — **aprovado** (exit 0).

## Migration

`supabase/migrations/20260707120000_financial_entries_collection_notes.sql`

- Coluna `collection_notes text NULL` em `financial_entries`
- Sem tabela de cobrança; RLS existente em `financial_entries` permanece

---

## Arquivos criados

| Arquivo |
|---------|
| `supabase/migrations/20260707120000_financial_entries_collection_notes.sql` |
| `src/lib/finance/delinquency-helpers.ts` |
| `src/components/finance/FinanceDelinquencyPanel.tsx` |
| `docs/auditorias/sprint-g2.5-inadimplencia.md` |

## Arquivos alterados

| Arquivo | Alteração |
|---------|-----------|
| `src/integrations/supabase/types.ts` | `collection_notes` em `financial_entries` |
| `src/lib/finance/types.ts` | `FinanceModuleId.delinquency` |
| `src/lib/finance/constants.ts` | `FINANCE_G2_VERSION = G2.5`, labels origem/faixa |
| `src/lib/finance/query-keys.ts` | Keys inadimplência |
| `src/lib/finance/module-registry.ts` | Módulo Inadimplência |
| `src/lib/finance/index.ts` | Export helpers |
| `src/components/finance/index.ts` | Export painel |
| `src/routes/_authenticated/app/financeiro.tsx` | Aba Inadimplência |

**Preservados:** Core Clínico, PDFs clínicos, Receber, Pagar, Fluxo, Pacotes, Parcelamentos, Convênios.

---

## Regra de negócio

Inadimplente quando:

- `entry_type = receivable`
- `status = pendente`
- `data_vencimento < hoje`
- Cancelados e pagos não entram na query

**Dias em atraso:** diferença em dias entre hoje e `data_vencimento` (mínimo 0).

**Origem inferida:**

| Condição | Origem |
|----------|--------|
| `health_insurance_*` preenchido | Convênio |
| `installment_plan_id` | Parcelamento |
| `PACOTE-` / "Contratação pacote" | Pacote |
| Demais | Manual |

---

## Funcionalidades

### KPIs (calculados sobre lista filtrada)

- Total vencido
- Quantidade de títulos
- Vencidos 1–7, 8–30 e acima de 30 dias (soma em R$)
- Maior devedor (paciente com maior soma)

### Lista

Paciente, documento/CPF, vencimento, dias em atraso, valor, categoria, centro de custo, origem, observações.

### Filtros

Período de vencimento, paciente, categoria, centro de custo, origem, faixa de atraso.

### Ações

- Marcar como recebido (`status = pago`, `data_recebimento`, `forma_pagamento`)
- Detalhes do título (dialog read-only)
- Nota de cobrança (`collection_notes`)
- Export CSV (padrão fluxo de caixa: BOM UTF-8, `;`)

---

## Segurança

| Item | Status |
|------|--------|
| `clinic_id` | Sim |
| RLS | Herdado de `financial_entries` |
| `can_access_clinic` / `can_manage_clinic` | Sim |
| Modo Suporte | UI + mutações bloqueadas |

---

## Critérios de aceite

| Critério | Status |
|----------|--------|
| Vencidos identificados corretamente | Sim |
| Recebidos/cancelados excluídos | Sim |
| Dias em atraso corretos | Sim |
| KPIs batem com lista filtrada | Sim |
| Recebimento atualiza `financial_entries` | Sim |
| Build aprovado | Sim |
| Sem regressão em módulos G1/G2 anteriores | Sim (escopo isolado) |

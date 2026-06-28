# Sprint G1.5 — Contas a Pagar

Relatório de entrega. Data: 2026-06-27.

## Objetivo

Implementar **Contas a Pagar** reutilizando `financial_entries` com `entry_type = payable`, espelhando Contas a Receber (G1.4).

## Build

`npm run build` — **aprovado**.

---

## Análise do schema

| Requisito | Situação |
|-----------|----------|
| `entry_type = payable` | ✅ G1.4 |
| Status aberto/pago/cancelado | ✅ `pendente` / `pago` / `cancelado` |
| Vencimento / pagamento | ✅ `data_vencimento` / `data_recebimento` |
| Categoria despesa | ✅ `category_id` + filtro `type = expense` |
| Centro de custo | ✅ `cost_center_id` |
| Fornecedor | ✅ Campo `documento` + `observacoes` (sem coluna nova) |
| Paciente | N/A para payables — **migration** tornou `patient_id` nullable |
| Profissional | Opcional — **migration** tornou `professional_id` nullable |

**Decisão:** sem tabela nova; migration mínima para nullable + CHECK de integridade receivable.

---

## Migration

**Arquivo:** `supabase/migrations/20260702120000_financial_entries_payables.sql`

- `patient_id` e `professional_id` → nullable
- `CHECK`: `entry_type = payable` OU (`patient_id` AND `professional_id` NOT NULL) — protege receitas
- Índice parcial payables por vencimento

### Mapeamento de status (UI)

| DB | UI |
|----|-----|
| `pendente` | Aberto |
| `pago` | Pago |
| `cancelado` | Cancelado |

---

## RLS

Sem alteração — políticas `fin_tenant_*` existentes + Modo Suporte.

---

## Arquivos criados

| Arquivo |
|---------|
| `supabase/migrations/20260702120000_financial_entries_payables.sql` |
| `src/lib/finance/payable-helpers.ts` |
| `src/components/finance/FinancePayablesPanel.tsx` |
| `docs/auditorias/sprint-g1.5-contas-a-pagar.md` |

## Arquivos alterados

| Arquivo | Alteração |
|---------|-----------|
| `src/integrations/supabase/types.ts` | `patient_id` / `professional_id` nullable |
| `src/lib/finance/constants.ts` | `PAYABLE_STATUS_LABELS` |
| `src/lib/finance/query-keys.ts` | `payables`, `payableLookups` |
| `src/lib/finance/index.ts` | Export helpers |
| `src/lib/finance/module-registry.ts` | Payables → `active`; fluxo de caixa → G1.6 |
| `src/routes/_authenticated/app/financeiro.tsx` | Tab **Contas a Pagar** |
| `src/components/finance/FinanceModuleHub.tsx` | Atalho payables |
| `src/components/finance/index.ts` | Export painel |
| `src/routes/_authenticated/app/relatorios.tsx` | Despesas incluem `entry_type = payable` |

**Não alterados:** `FinanceReceivablesPanel.tsx`, Core Clínico, PDFs, recibos.

---

## Funcionalidades entregues

### `/app/financeiro` → **Contas a Pagar**

- Cadastrar, editar, cancelar, marcar paga, reabrir pagamento
- Apenas categorias **expense** (query + validação no save)
- Centros de custo ativos
- Fornecedor via `documento` / filtro em documento+observações
- Filtros: período, categoria, centro de custo, profissional, fornecedor, status
- Pesquisa: observação, documento, profissional
- KPIs: Despesas em aberto, Pagas, Total do período, Vencidas
- UX idêntica a Contas a Receber

---

## Como testar

1. Aplicar migration no Supabase.
2. `/app/financeiro` → **Contas a Pagar**.
3. Cadastrar despesa com fornecedor em documento, categoria expense, centro de custo.
4. Tentar categoria income — indisponível no select (somente expense carregadas).
5. **Pagar** → data + forma → status **Pago**.
6. **Reabrir** → volta **Aberto**.
7. **Cancelar** título aberto.
8. Validar KPI vencidas com vencimento passado.
9. Confirmar **Contas a Receber** e lançamentos v1 intactos.
10. Relatórios: despesas incluem payables pagos.

---

## Riscos encontrados

| Risco | Mitigação |
|-------|-----------|
| Fornecedor sem coluna dedicada | `documento` + `observacoes`; filtro fornecedor busca ambos |
| Nullable patient/professional | CHECK garante receivables com ambos preenchidos |
| `data_recebimento` usado como data de pagamento | Mesma coluna para recebimento e pagamento (semântica por `entry_type`) |
| Limite 500 registros | Igual G1.4; paginação futura |
| Migration CHECK pode falhar se dados órfãos receivable | Improvável pós-backfill G1.4 |

---

## Fora de escopo (respeitado)

Fluxo de caixa, dashboard, DRE, PIX, NF-e, parcelamentos, convênios, pacotes, inadimplência, Core Clínico, PDFs.

---

## Próximos passos — G1.6 Fluxo de Caixa

1. Consolidar `entry_type receivable/payable` por período (realizado vs projetado)
2. Usar `data_recebimento` / vencimentos para projeção
3. Dashboard financeiro unificado (registry `cash_flow`)
4. DRE simplificada opcional pós-fluxo

# Sprint G1.4 — Contas a Receber

Relatório de entrega. Data: 2026-06-27.

## Objetivo

Transformar o módulo financeiro em **Contas a Receber** comercialmente utilizável, reutilizando `financial_entries` sem nova tabela.

## Build

`npm run build` — **aprovado**.

---

## Análise do schema existente

| Requisito | Campo existente | Situação G1.4 |
|-----------|-----------------|-------------|
| Receita | `valor` | ✅ Mantido |
| Vencimento | — | ➕ `data_vencimento` |
| Pagamento | `data`, `forma_pagamento` | ➕ `data_recebimento` |
| Observação | `observacoes` | ✅ Mantido |
| Categoria | `category_id` | ✅ G1.2 |
| Centro de custo | `cost_center_id` | ✅ G1.3 |
| Paciente | `patient_id` | ✅ Mantido |
| Profissional | `professional_id` | ✅ Mantido |
| Documento | — | ➕ `documento` |
| Status cancelado | enum `payment_status` | ➕ valor `cancelado` |
| Tipo receita/despesa futura | — | ➕ `entry_type` (`receivable` \| `payable`) |

**Decisão:** não criar tabela `financial_receivables`. Estender `financial_entries`.

---

## Migration

**Arquivo:** `supabase/migrations/20260701120000_financial_entries_receivables.sql`

- `ALTER TYPE payment_status ADD VALUE 'cancelado'`
- Colunas: `data_vencimento`, `data_recebimento`, `documento`, `entry_type` (default `receivable`)
- Backfill: `data_vencimento = data`; `data_recebimento = data` onde `status = pago`
- Índices: vencimento, entry_type, status, documento

### Mapeamento de status (UI comercial)

| DB | UI |
|----|-----|
| `pendente` | Aberto |
| `pago` | Recebido |
| `cancelado` | Cancelado |

---

## RLS

Sem alteração — políticas `fin_tenant_*` em `financial_entries` já cobrem as novas colunas.

Modo Suporte: triggers existentes em `financial_entries`.

---

## Arquivos criados

| Arquivo |
|---------|
| `supabase/migrations/20260701120000_financial_entries_receivables.sql` |
| `src/lib/finance/receivable-helpers.ts` |
| `src/components/finance/FinanceReceivablesPanel.tsx` |
| `docs/auditorias/sprint-g1.4-contas-a-receber.md` |

## Arquivos alterados

| Arquivo | Alteração |
|---------|-----------|
| `src/integrations/supabase/types.ts` | Novos campos + enum `cancelado` |
| `src/lib/finance/types.ts` | `FinancialEntryType` |
| `src/lib/finance/constants.ts` | Labels receivable + cancelado |
| `src/lib/finance/query-keys.ts` | `receivables`, `receivableLookups` |
| `src/lib/finance/index.ts` | Export helpers |
| `src/lib/finance/module-registry.ts` | Receivables → `active`; payables → G1.5 |
| `src/routes/_authenticated/app/financeiro.tsx` | Tab **Contas a Receber**; lancamentos v1 compat |
| `src/components/finance/FinanceModuleHub.tsx` | Atalho contas a receber |
| `src/components/finance/index.ts` | Export painel |
| `src/routes/_authenticated/app/relatorios.tsx` | Exclui `cancelado` do export |

---

## Funcionalidades entregues

### Tela `/app/financeiro` → **Contas a Receber**

- Cadastrar, editar, cancelar, marcar recebida, reabrir recebimento
- Filtros: período (vencimento), categoria, centro de custo, paciente, profissional, status
- Pesquisa: paciente, observação, documento
- KPIs: Em aberto, Recebidas, Total do período, Vencidas
- Integração categorias (receita) e centros de custo ativos
- Estados loading / vazio / erro / Modo Suporte

### Compatibilidade lançamentos v1

- Novos lançamentos definem `entry_type`, `data_vencimento`, `data_recebimento` quando pago
- Lançamentos legados aparecem em Contas a Receber após backfill da migration

---

## Como testar

1. Aplicar migration no Supabase.
2. `/app/financeiro` → **Contas a Receber**.
3. Cadastrar receita com vencimento futuro → status **Aberto**.
4. **Receber** → informar data e forma → **Recebido**.
5. **Reabrir** → volta a **Aberto**.
6. **Cancelar** título aberto → **Cancelado** (sem delete).
7. Testar filtros e pesquisa por paciente/documento.
8. Verificar KPI **Vencidas** com título aberto e vencimento passado.
9. Confirmar recibos, lançamentos v1 e Core Clínico intactos.
10. RLS: usuário de outra clínica não vê títulos.

---

## Riscos encontrados

| Risco | Mitigação |
|-------|-----------|
| Lançamentos v1 e Contas a Receber compartilham tabela | `entry_type = receivable`; UI v1 preservada como legado |
| Limite 500 registros na listagem | Adequado para clínicas pequenas/médias; paginação futura |
| `entry_type = payable` reservado sem UI | Preparado para G1.5 Contas a Pagar |
| Migration enum `cancelado` | Requer deploy SQL antes do uso em produção |
| Edição de título já recebido | Permitida (exceto cancelados); reabrir limpa pagamento |

---

## Fora de escopo (respeitado)

Contas a pagar, fluxo de caixa, dashboard, parcelamentos, inadimplência, convênios, pacotes, Core Clínico, PDFs, Histórico Clínico.

---

## Próximos passos — G1.5 Contas a Pagar

1. UI **Contas a Pagar** com `entry_type = payable`
2. Campos opcionais: fornecedor (texto ou tabela futura), paciente nullable
3. Mesmos status e fluxo de baixa/cancelamento
4. Relatórios separando receitas e despesas por `entry_type`
5. Base para fluxo de caixa consolidado (G1.5+)

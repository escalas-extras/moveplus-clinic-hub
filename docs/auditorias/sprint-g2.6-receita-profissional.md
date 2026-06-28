# Sprint G2.6 — Receita por Profissional

Relatório de entrega. Data: 2026-06-27.

## Objetivo

Implementar visão de **receita por profissional**, consolidando recebíveis pagos (realizado) e pendentes (previsto) a partir de `financial_entries`.

## Build

`npm run build` — **aprovado** (exit 0).

## Migration

Nenhuma — somente leitura e agregação sobre `financial_entries` existente.

---

## Arquivos criados

| Arquivo |
|---------|
| `src/lib/finance/professional-revenue-helpers.ts` |
| `src/components/finance/FinanceProfessionalRevenuePanel.tsx` |
| `docs/auditorias/sprint-g2.6-receita-profissional.md` |

## Arquivos alterados

| Arquivo | Alteração |
|---------|-----------|
| `src/lib/finance/types.ts` | `FinanceModuleId.professional_revenue` |
| `src/lib/finance/constants.ts` | `FINANCE_G2_VERSION = G2.6`, labels filtro status |
| `src/lib/finance/query-keys.ts` | Keys receita por profissional |
| `src/lib/finance/module-registry.ts` | Módulo Receita por Profissional |
| `src/lib/finance/index.ts` | Export helpers |
| `src/components/finance/index.ts` | Export painel |
| `src/routes/_authenticated/app/financeiro.tsx` | Aba Receita por Profissional |

**Preservados:** Core Clínico, PDFs clínicos, demais módulos financeiros.

---

## Regra de negócio

Fonte: `financial_entries` com `entry_type = receivable`, **cancelados ignorados**.

| Visão | Status | Data de referência no período |
|-------|--------|-------------------------------|
| Realizado | `pago` | `data_recebimento` (fallback `data`) |
| Previsto | `pendente` | `data_vencimento` (fallback `data`) |

Agrupamento por `professional_id`. Registros sem profissional → grupo **"Sem profissional vinculado"**.

**Origem** (reutiliza G2.5): convênio, parcelamento, pacote, manual.

---

## Funcionalidades

### KPIs (lista filtrada)

- Receita realizada e prevista total
- Quantidade de títulos recebidos e em aberto
- Profissional com maior receita (total geral, exclui grupo sem vínculo)
- Ticket médio global

### Lista por profissional

Nome, realizada, prevista, total, qtd recebidos/abertos, ticket médio, participação %.

### Detalhamento

Dialog com abas **Recebidos** e **Em aberto**: paciente, documento, vencimento, recebimento, valor, origem. Totais do dialog batem com linha agrupada.

### Filtros

Período, profissional (incl. sem vínculo), categoria, centro de custo, origem, status (todos / realizado / previsto).

### Exportação CSV

- Resumo agrupado (aba principal)
- Detalhe por profissional (dialog)
- Padrão UTF-8 BOM + `;` (fluxo de caixa)

---

## Segurança

| Item | Status |
|------|--------|
| `clinic_id` | Sim |
| RLS | Herdado |
| Modo Suporte | Somente leitura (sem mutações) |

---

## Critérios de aceite

| Critério | Status |
|----------|--------|
| Realizado = somente `pago` | Sim |
| Previsto = somente `pendente` | Sim |
| Cancelados ignorados | Sim |
| Grupo sem `professional_id` | Sim |
| Filtros funcionam | Sim |
| Detalhes batem com totais | Sim |
| Build aprovado | Sim |
| Sem regressão Core/PDFs | Sim |

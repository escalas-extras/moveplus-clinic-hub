# Arquitetura — Módulo Financeiro Base (G1)

Documento técnico de referência. **Congelado em Sprint G1.8** (`FINANCE_BASE_VERSION = "G1.8"`).

## Visão geral

O Financeiro Base é um **módulo de gestão** separado do Core Clínico congelado. Opera no mesmo app multi-clínica (`clinic_id`), com RLS Supabase e feature flag `financeiro` no plano.

Fonte única de lançamentos: **`financial_entries`** (`entry_type`: `receivable` | `payable`).

```
src/
├── lib/finance/              # Domínio, tipos, registry, query keys, helpers
├── components/finance/     # Painéis por aba (dashboard, categorias, AR/AP, fluxo)
└── routes/.../financeiro.tsx   # Rota /app/financeiro (8 abas)
```

## Abas ativas (`/app/financeiro`)

| Aba | Componente | Sprint |
|-----|------------|--------|
| Visão geral | `FinanceDashboardPanel` | G1.7 |
| Categorias | `FinanceCategoriesPanel` | G1.2 |
| Centros de Custo | `FinanceCostCentersPanel` | G1.3 |
| Contas a Receber | `FinanceReceivablesPanel` | G1.4 |
| Contas a Pagar | `FinancePayablesPanel` | G1.5 |
| Fluxo de Caixa | `FinanceCashFlowPanel` | G1.6 |
| Lançamentos v1 | `LancamentosTab` (inline) | v1 |
| Recibos | `RecibosTab` (inline) | v1 |

`FinanceModuleHub.tsx` — legado G1.1, **não usado** na UI desde G1.7.

## Padrões reutilizados do projeto

| Padrão | Onde | Uso no Financeiro |
|--------|------|-------------------|
| Rotas autenticadas | `/_authenticated/app/*` | `/app/financeiro` |
| Multi-clínica | `useActiveClinic()` → `clinicId` | Obrigatório em queries |
| RLS tenant | `fin_tenant_*`, `fin_cat_*`, `fin_cc_*` | Escopo por clínica + papel |
| Layout | `AppShell`, `PageHeader`, `KpiGrid`, `EmptyState`, `StatusBadge` | Painéis G1.2–G1.7 |
| Data fetching | TanStack Query + Supabase client | `financeQueryKeys` + legado `fin` |
| Feature gate | `plan-features` → `financeiro` | Menu app-shell |
| Support mode | `SupportGuardButton` + triggers DB | Bloqueia mutações em impersonação |
| Auditoria | prefixo `finance.*` | `financeAuditAction()` em helpers |

## Persistência

### `financial_entries`

Lançamentos unificados (receitas e despesas).

| Coluna | Tipo | Notas |
|--------|------|-------|
| `clinic_id` | uuid | Tenant |
| `entry_type` | `receivable` \| `payable` | Receita vs despesa |
| `patient_id` | uuid? | Obrigatório para `receivable` |
| `professional_id` | uuid? | Obrigatório para `receivable` |
| `category_id` | uuid? | FK `financial_categories` |
| `cost_center_id` | uuid? | FK `financial_cost_centers` |
| `valor` | numeric | |
| `status` | `pago` \| `pendente` \| `cancelado` | Cancelados ignorados em KPIs |
| `forma_pagamento` | enum | pix, dinheiro, cartao, transferencia |
| `data` | date | Data de competência / registro |
| `data_vencimento` | date? | Previsto / vencimento |
| `data_recebimento` | date? | Realizado (pago/recebido) |
| `documento` | text? | NF, boleto, fornecedor (payables) |
| `observacoes` | text? | |
| `appointment_id` | uuid? | Opcional |

### `financial_categories` (G1.2)

Plano de contas simplificado. Tipos: `income` | `expense`. RLS `fin_cat_*`.

### `financial_cost_centers` (G1.3)

Segmentação interna. Flag `ativo`. RLS `fin_cc_*`.

### `receipts`

Recibos emitidos a partir de `financial_entry_id` — aba Recibos em `/app/financeiro` (+ rota `/app/recibos`).

## Regras de negócio consolidadas (G1.8)

| Conceito | Regra |
|----------|--------|
| Cancelados | Excluídos de dashboard, fluxo de caixa, KPIs e export ativo |
| Receitas | `entry_type = receivable` |
| Despesas | `entry_type = payable` |
| Realizado | `status = pago`; data = `data_recebimento ?? data` |
| Previsto | `status = pendente`; data = `data_vencimento ?? data` |
| Vencidos | pendente + `data_vencimento < hoje` |
| Categorias | income em receber; expense em pagar; inativas filtradas |
| Centros de custo | apenas ativos nos selects |

## Registry de módulos

`src/lib/finance/module-registry.ts` — todos os módulos G1.2–G1.7 `active`; `legacy_entries` = v1.

## Query keys

- Namespace principal: `["finance", clinicId, ...]` — `financeQueryKeys`
- Legado v1: `["fin", clinicId]`, `["fin-totals", clinicId]`, `["fin-by-patient", ...]`
- Relatórios: `["report-financial", clinicId, from, to]`

**Invalidação unificada (G1.8):** `invalidateFinanceModuleQueries(qc, clinicId)` em `helpers.ts` — invalida `finance`, `fin`, `fin-totals` e `report-financial`.

## Permissões

- **RLS:** `can_access_clinic(clinic_id)` leitura; `can_manage_clinic(clinic_id)` escrita
- **Papel:** `owner`, `admin`, `financeiro` em `clinic_members`
- **Support mode:** mutações bloqueadas na UI; triggers DB impedem escrita em impersonação
- **Tenant:** todas as queries filtram `.eq("clinic_id", clinicId)`

## Integrações preservadas

- Lançamentos v1 (receivable only na listagem/totais)
- Recibos + PDF (`receipt-pdf.ts` — **sem alteração**)
- Relatórios financeiros (`/app/relatorios`) + export CSV
- Dashboard e fluxo de caixa

## Fora de escopo G1 (congelado)

- DRE, PIX automático, NF-e, conciliação bancária
- Convênios, pacotes, parcelamento, inadimplência, billing SaaS
- Alterações em Core Clínico, PDFs clínicos, Histórico Integrado

## Riscos remanescentes

1. Query keys legadas (`fin`, `fin-totals`) coexistem com `financeQueryKeys` — invalidação unificada mitiga stale cache
2. Duplicidade UI: aba Recibos em `/app/financeiro` e rota `/app/recibos` — consolidar em sprint futura
3. Lançamentos v1 permanece legado; novos fluxos devem usar Contas a Receber/Pagar

## Próximo passo (pós-freeze)

Novos recursos financeiros exigem **nova trilha de sprint** (G2+). Não estender G1 sem revisão arquitetural.

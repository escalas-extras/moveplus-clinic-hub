# Arquitetura — Módulo Financeiro Base (G1)

Documento técnico de referência. Sprint G1.1.

## Visão geral

O Financeiro Base é um **módulo gestão** separado do Core Clínico congelado. Opera no mesmo app multi-clínica (`clinic_id`), com RLS Supabase e feature flag `financeiro` no plano.

```
src/
├── lib/finance/           # Domínio, tipos, registry, query keys, helpers
├── components/finance/    # UI compartilhada do hub e futuros formulários
└── routes/.../financeiro.tsx   # Rota /app/financeiro (hub + operação v1)
```

## Padrões reutilizados do projeto

| Padrão | Onde | Uso no Financeiro |
|--------|------|-------------------|
| Rotas autenticadas | `/_authenticated/app/*` | `/app/financeiro` |
| Multi-clínica | `useActiveClinic()` → `clinicId` | Obrigatório em queries |
| RLS tenant | `fin_tenant_*` em `financial_entries` | Escopo por clínica + papel |
| Layout premium | `AppShell`, `PageHeader`, `InfoCard`, `KpiGrid` | Hub G1.1 |
| Data fetching | TanStack Query + Supabase client | `financeQueryKeys` |
| Feature gate | `plan-features` → `financeiro` | Menu app-shell |
| Auditoria | `audit_log` / `saas_audit_log` | Prefixo `finance.*` (helpers) |
| Server fn | `src/lib/api/*.functions.ts` | G1.2+ para mutações complexas |

## Persistência existente (sem migration G1.1)

### `financial_entries`

Lançamentos v1 vinculados a paciente + profissional.

| Coluna | Tipo | Notas |
|--------|------|-------|
| `clinic_id` | uuid | Tenant |
| `patient_id` | uuid | Obrigatório |
| `professional_id` | uuid | Obrigatório |
| `valor` | numeric | |
| `status` | `pago` \| `pendente` | |
| `forma_pagamento` | enum | pix, dinheiro, cartao, transferencia |
| `data` | date | |
| `appointment_id` | uuid? | Opcional |

### `receipts`

Recibos emitidos a partir de `financial_entry_id` — rota dedicada `/app/recibos`.

## Entidades futuras (G1.2+)

| Entidade | Tabela proposta | Sprint |
|----------|-----------------|--------|
| Categorias financeiras | `financial_categories` | G1.2 |
| Centros de custo | `financial_cost_centers` | G1.3 |
| Contas a receber | evoluir `financial_entries` ou `financial_receivables` | G1.4 |
| Contas a pagar | `financial_payables` | G1.4 |
| Fluxo de caixa | view / agregação | G1.5 |
| Dashboard | composição de KPIs | G1.5 |

**G1.1 não cria essas tabelas** — apenas registry e tipos preparatórios.

## Registry de módulos

`src/lib/finance/module-registry.ts` — fonte única do roadmap UI (cards “Em breve”).

## Query keys

`src/lib/finance/query-keys.ts` — namespace `["finance", clinicId, ...]`.

Migrar gradualmente queries legadas (`["fin", clinicId]`) em sprints futuras.

## Permissões

- **RLS:** políticas `fin_tenant_*` em `financial_entries`
- **Papel:** `owner`, `admin`, `financeiro` em `clinic_members`
- **Support mode:** `SupportGuardButton` bloqueia mutações em impersonação

## Fora de escopo G1

- DRE, PIX automático, NF-e, conciliação bancária
- Convênios, pacotes, parcelamento, inadimplência
- Alterações em Core Clínico, PDFs, Histórico Integrado

## Riscos conhecidos

1. **`relatorios.tsx`** referencia colunas `tipo` e `descricao` em `financial_entries` que **não existem** no schema tipado — drift a corrigir em G1.2+
2. Query keys legadas (`fin`, `fin-totals`) coexistem com `financeQueryKeys`
3. Duplicidade UI: aba Recibos em `/app/financeiro` e rota `/app/recibos` — consolidar em sprint futura

## Próximo passo

**Sprint G1.2 — Categorias Financeiras:** migration `financial_categories`, CRUD, RLS, UI lista/cadastro.

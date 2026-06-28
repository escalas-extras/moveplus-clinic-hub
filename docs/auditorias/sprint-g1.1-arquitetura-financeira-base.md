# Sprint G1.1 — Arquitetura Financeira Base

Relatório de entrega. Data: 2026-06-28.

## Objetivo

Criar fundação arquitetural do módulo financeiro sem telas avançadas, sem alterar Core Clínico congelado.

## Build

`npm run build` — **aprovado**.

## Migration

**Nenhuma migration criada.**

### Justificativa

Tabelas existentes suficientes para operação v1 e hub G1.1:

- `financial_entries` — lançamentos com `clinic_id`, RLS tenant
- `receipts` — recibos (rota `/app/recibos`)

Entidades G1.2+ (`financial_categories`, centros de custo, payables) serão criadas quando a sprint correspondente exigir.

---

## Arquitetura atual encontrada

| Aspecto | Implementação |
|---------|---------------|
| Rota | `/app/financeiro` (existente), `/app/recibos` (módulo recibos) |
| DB | `financial_entries`, `receipts`, enums `payment_method`, `payment_status` |
| Tenant | `clinic_id` + trigger default + RLS `fin_tenant_*` |
| UI legada | Lançamentos + recibos inline (~600 LOC) |
| Relatórios | Tab financeiro em `/app/relatorios` (CSV) |
| Plano | Feature `financeiro` em `plan-features.ts` |
| Menu | `app-shell.tsx` → Financeiro + Recibos |

---

## Arquivos analisados

- `src/routes/_authenticated/app/financeiro.tsx`
- `src/routes/_authenticated/app/recibos.tsx`
- `src/routes/_authenticated/app/relatorios.tsx`
- `src/components/app-shell.tsx`
- `src/lib/active-clinic.ts`
- `src/lib/plan-features.ts`
- `src/lib/recibos.functions.ts`
- `src/integrations/supabase/types.ts` (financial_entries, receipts)
- `supabase/migrations/20260614141802_*.sql`
- `supabase/migrations/20260621115138_*.sql`
- `src/components/layout/*` (PageHeader, AppShell, InfoCard, KpiGrid)

---

## Arquivos criados

| Arquivo |
|---------|
| `src/lib/finance/types.ts` |
| `src/lib/finance/constants.ts` |
| `src/lib/finance/query-keys.ts` |
| `src/lib/finance/module-registry.ts` |
| `src/lib/finance/helpers.ts` |
| `src/lib/finance/index.ts` |
| `src/components/finance/FinanceModuleHub.tsx` |
| `src/components/finance/index.ts` |
| `docs/architecture/FINANCE_MODULE_ARCHITECTURE.md` |
| `docs/auditorias/sprint-g1.1-arquitetura-financeira-base.md` |

## Arquivos alterados

| Arquivo | Alteração |
|---------|-----------|
| `src/routes/_authenticated/app/financeiro.tsx` | Shell premium + tab Visão geral (hub G1) + lançamentos/recibos v1 preservados |

---

## Estrutura proposta Financeiro Base

```
src/lib/finance/
  types.ts              # Tipos de domínio + alinhamento Supabase
  constants.ts          # Labels, feature key, roles
  query-keys.ts         # TanStack Query namespace
  module-registry.ts    # Roadmap G1 (dashboard → cash_flow)
  helpers.ts            # Totais, formatação, audit prefix
  index.ts

src/components/finance/
  FinanceModuleHub.tsx  # Placeholder premium + KPIs + cards módulos
  index.ts

src/routes/.../financeiro.tsx
  Tab "Visão geral"     # Hub G1.1 (default)
  Tab "Lançamentos v1"  # financial_entries (legado)
  Tab "Recibos"         # legado inline (link também para /app/recibos)
```

---

## Critérios de aceite

| Critério | Status |
|----------|--------|
| Build sem erro | ✅ |
| Financeiro no app sem quebrar rotas | ✅ |
| Placeholder premium Design System | ✅ |
| Nenhum módulo clínico alterado | ✅ |
| Sem funcionalidade avançada | ✅ |
| Pronto para G1.2 Categorias | ✅ |

---

## Riscos

1. **Schema drift:** `relatorios.tsx` usa `tipo`/`descricao` ausentes em `financial_entries` tipado
2. **Duplicidade recibos:** aba + rota dedicada
3. **Query keys legadas:** migrar para `financeQueryKeys` incrementalmente

---

## Próximos passos (G1.2)

1. Migration `financial_categories` (clinic_id, nome, tipo receita/despesa, ativo)
2. RLS espelhando padrão `fin_tenant_*`
3. CRUD UI com layout premium
4. Vincular categorias a `financial_entries` (coluna opcional `category_id`)
5. Corrigir drift em relatórios financeiros

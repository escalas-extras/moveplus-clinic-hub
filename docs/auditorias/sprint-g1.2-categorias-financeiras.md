# Sprint G1.2 — Categorias Financeiras

Relatório de entrega. Data: 2026-06-27.

## Objetivo

Implementar categorias financeiras base (receita/despesa) com CRUD premium em `/app/financeiro`, RLS multi-clínica e preparação de `category_id` em lançamentos v1.

## Build

`npm run build` — **aprovado**.

---

## Migration

**Arquivo:** `supabase/migrations/20260629120000_financial_categories.sql`

### Tabela `financial_categories`

| Coluna | Tipo | Observação |
|--------|------|------------|
| id | uuid PK | `gen_random_uuid()` |
| clinic_id | uuid NOT NULL | FK → `clinics` ON DELETE CASCADE |
| name | text NOT NULL | |
| type | text NOT NULL | CHECK `income` \| `expense` |
| color | text NULL | hex opcional |
| sort_order | integer | default 0 |
| is_active | boolean | default true |
| created_at / updated_at | timestamptz | trigger `update_updated_at_column` |

**Restrições:** `UNIQUE (clinic_id, type, name)`

**Índices:** `clinic_id`, `(clinic_id, type)`, `(clinic_id, is_active)`

### Extensão `financial_entries`

- Coluna opcional `category_id uuid` → `financial_categories(id) ON DELETE SET NULL`
- Trigger `fn_financial_entry_category_clinic_match` — impede vínculo cross-clínica
- Índice parcial em `category_id`

### RLS

| Operação | Política | Função |
|----------|----------|--------|
| SELECT | `fin_cat_tenant_select` | `can_access_clinic(clinic_id)` |
| INSERT | `fin_cat_tenant_insert` | `can_manage_clinic(clinic_id)` |
| UPDATE | `fin_cat_tenant_update` | `can_manage_clinic(clinic_id)` |
| DELETE | `fin_cat_tenant_delete` | `can_manage_clinic(clinic_id)` |

Padrão alinhado a `financial_entries` (leitura tenant / escrita owner-admin).

Triggers `fn_block_support_writes` aplicados à nova tabela (Modo Suporte).

---

## Arquivos criados

| Arquivo |
|---------|
| `supabase/migrations/20260629120000_financial_categories.sql` |
| `src/lib/finance/default-categories.ts` |
| `src/lib/finance/category-helpers.ts` |
| `src/components/finance/FinanceCategoriesPanel.tsx` |
| `docs/auditorias/sprint-g1.2-categorias-financeiras.md` |

## Arquivos alterados

| Arquivo | Alteração |
|---------|-----------|
| `src/integrations/supabase/types.ts` | Tipos `financial_categories` + `category_id` em `financial_entries` |
| `src/lib/finance/types.ts` | Tipos de categoria |
| `src/lib/finance/constants.ts` | Labels, presets de cor |
| `src/lib/finance/index.ts` | Re-exports G1.2 |
| `src/lib/finance/module-registry.ts` | Categorias → status `active` |
| `src/routes/_authenticated/app/financeiro.tsx` | Tab **Categorias** + painel CRUD |
| `src/components/finance/FinanceModuleHub.tsx` | Seção módulos ativos + atalho categorias |
| `src/components/finance/index.ts` | Export `FinanceCategoriesPanel` |
| `src/routes/_authenticated/app/relatorios.tsx` | KPIs/CSV alinhados ao schema real |

---

## Funcionalidades entregues

1. **CRUD categorias** — criar, editar, ativar/inativar (sem delete definitivo)
2. **Agrupamento** — Receitas e Despesas com ordem e cor opcional
3. **Validações** — nome/tipo obrigatórios; unique por clínica+tipo+nome (UI + DB)
4. **Seed idempotente** — botão “Sugerir padrão” via `ensureDefaultFinanceCategories()` (12 categorias sugeridas)
5. **Estados UI** — loading, vazio, erro, Modo Suporte
6. **Relatório financeiro** — recebido/pendente/despesas sem colunas `tipo`/`descricao` inexistentes

### Categorias padrão sugeridas

**Receitas:** Consultas, Sessões, Pacotes, Convênios, Outros recebimentos  
**Despesas:** Aluguel, Materiais, Salários, Impostos, Marketing, Sistemas, Outras despesas

---

## Como testar

1. Aplicar migration no Supabase (`supabase db push` ou pipeline CI).
2. Login como owner/admin de uma clínica.
3. Abrir `/app/financeiro` → aba **Categorias**.
4. Clicar **Sugerir padrão** — verificar 12 categorias sem duplicar ao repetir.
5. Criar categoria customizada; tentar nome duplicado no mesmo tipo → erro.
6. Inativar categoria → badge “Inativa”; reativar via switch.
7. Usuário sem `can_manage_clinic` → consegue listar, não consegue criar/editar (RLS).
8. Modo Suporte → mutações bloqueadas (UI + trigger DB).
9. `/app/relatorios` → tab Financeiro: KPIs e export CSV com colunas reais.
10. Lançamentos v1 e recibos continuam operando (sem selector de categoria nesta sprint).

---

## Riscos encontrados

| Risco | Mitigação |
|-------|-----------|
| Seed exige `can_manage_clinic` | Seed manual via botão; não auto-seed na carga (evita erro para perfil financeiro read-only) |
| `category_id` ainda não exposto em lançamentos v1 | Coluna nullable pronta; UI de vínculo fica para sprint futura |
| Despesas no relatório = 0 até existirem lançamentos com categoria expense | Comportamento esperado; v1 trata entries sem categoria como receita |
| Migration pendente em produção | Deploy requer aplicar SQL antes de usar aba Categorias |

---

## Fora de escopo (respeitado)

Centros de custo, contas a pagar/receber, fluxo de caixa, DRE, dashboard avançado, Core Clínico, PDFs clínicos, recibos quebrados.

---

## Próximos passos — G1.3 Centros de Custo

1. Migration `financial_cost_centers` (clinic_id, name, code, is_active, sort_order).
2. RLS espelhando categorias (`can_access` / `can_manage`).
3. CRUD na aba ou sub-rota do Financeiro.
4. FK opcional `cost_center_id` em `financial_entries` ou tabela futura de payables.
5. Filtros por centro de custo em relatórios e dashboard G1.5.
6. Atualizar `module-registry`: `cost_centers` → `active`.

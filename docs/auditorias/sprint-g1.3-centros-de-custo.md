# Sprint G1.3 — Centros de Custo

Relatório de entrega. Data: 2026-06-27.

## Objetivo

Implementar centros de custo do Financeiro Base com CRUD premium, RLS multi-clínica e preparação de `cost_center_id` em lançamentos v1 — seguindo o padrão das Sprints G1.1 e G1.2.

## Build

`npm run build` — **aprovado**.

---

## Migration

**Arquivo:** `supabase/migrations/20260630120000_financial_cost_centers.sql`

### Tabela `financial_cost_centers`

| Coluna | Tipo | Observação |
|--------|------|------------|
| id | uuid PK | `gen_random_uuid()` |
| clinic_id | uuid NOT NULL | FK → `clinics` ON DELETE CASCADE |
| name | text NOT NULL | |
| code | text NULL | sigla opcional (ex.: CLIN) |
| color | text NULL | hex opcional |
| sort_order | integer | default 0 |
| is_active | boolean | default true |
| created_at / updated_at | timestamptz | trigger `update_updated_at_column` |

**Restrições:** `UNIQUE (clinic_id, name)`

**Índices:** `clinic_id`, `(clinic_id, is_active)`

### Extensão `financial_entries`

- Coluna opcional `cost_center_id uuid` → `financial_cost_centers(id) ON DELETE SET NULL`
- Trigger `fn_financial_entry_cost_center_clinic_match` — impede vínculo cross-clínica
- Índice parcial em `cost_center_id`

### RLS

| Operação | Política | Função |
|----------|----------|--------|
| SELECT | `fin_cc_tenant_select` | `can_access_clinic(clinic_id)` |
| INSERT | `fin_cc_tenant_insert` | `can_manage_clinic(clinic_id)` |
| UPDATE | `fin_cc_tenant_update` | `can_manage_clinic(clinic_id)` |
| DELETE | `fin_cc_tenant_delete` | `can_manage_clinic(clinic_id)` |

Mesmo padrão de `financial_categories`. Triggers `fn_block_support_writes` aplicados.

---

## Arquivos criados

| Arquivo |
|---------|
| `supabase/migrations/20260630120000_financial_cost_centers.sql` |
| `src/lib/finance/default-cost-centers.ts` |
| `src/lib/finance/cost-center-helpers.ts` |
| `src/components/finance/FinanceCostCentersPanel.tsx` |
| `docs/auditorias/sprint-g1.3-centros-de-custo.md` |

## Arquivos alterados

| Arquivo | Alteração |
|---------|-----------|
| `src/integrations/supabase/types.ts` | Tipos `financial_cost_centers` + `cost_center_id` |
| `src/lib/finance/types.ts` | Tipos de centro de custo |
| `src/lib/finance/index.ts` | Re-exports G1.3 |
| `src/lib/finance/module-registry.ts` | Centros de custo → `active` |
| `src/routes/_authenticated/app/financeiro.tsx` | Tab **Centros de Custo** |
| `src/components/finance/FinanceModuleHub.tsx` | Atalho módulo ativo |
| `src/components/finance/index.ts` | Export painel |

---

## Funcionalidades entregues

1. **CRUD centros de custo** — criar, editar, ativar/inativar (sem delete físico)
2. **Campos** — nome (obrigatório), código opcional, cor, ordem
3. **Validação** — nome único por clínica (UI + constraint DB)
4. **Seed idempotente** — botão “Sugerir padrões” via `ensureDefaultFinanceCostCenters()`
5. **Estados UI** — loading, vazio, erro, Modo Suporte
6. **Preparação schema** — `cost_center_id` em `financial_entries` (sem UI em lançamentos v1)

### Centros padrão sugeridos

Atendimento Clínico, Fisioterapia Domiciliar, Administrativo, Comercial, Marketing, Tecnologia, Financeiro, Outros

---

## Como testar

1. Aplicar migration no Supabase.
2. Login como owner/admin.
3. `/app/financeiro` → aba **Centros de Custo**.
4. **Sugerir padrões** → 8 centros; repetir sem duplicar.
5. Criar centro customizado; nome duplicado → erro.
6. Inativar/reativar via switch.
7. Perfil sem `can_manage_clinic` → lista OK, mutações bloqueadas (RLS).
8. Modo Suporte → mutações bloqueadas (UI + trigger).
9. Lançamentos v1 e recibos inalterados.
10. Core Clínico, PDFs e Histórico Integrado não tocados.

---

## Riscos encontrados

| Risco | Mitigação |
|-------|-----------|
| Seed exige `can_manage_clinic` | Botão manual “Sugerir padrões” (não auto-seed) |
| `cost_center_id` sem UI em lançamentos | Coluna nullable pronta para G1.4+ |
| Migration pendente em produção | Aplicar SQL antes de usar aba |
| Código não é unique | Apenas nome é unique por clínica (conforme spec) |

---

## Fora de escopo (respeitado)

Contas a pagar/receber, fluxo de caixa, dashboard, DRE, PIX, NF-e, conciliação, convênios, pacotes, parcelamentos, Core Clínico, PDFs.

---

## Próximos passos — G1.4 Contas a Pagar / Receber

1. Tabelas `financial_receivables` / `financial_payables` (ou modelo unificado de títulos).
2. Vínculo com `category_id`, `cost_center_id`, pacientes e profissionais.
3. Status de vencimento, baixa parcial/total.
4. Selector de categoria e centro de custo nos formulários de lançamento.
5. Integração com relatórios e preparação para fluxo de caixa (G1.5).

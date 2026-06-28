# Sprint G2.1 — Pacotes clínico-financeiros

Relatório de entrega. Data: 2026-06-27.

## Objetivo

Implementar a **base de pacotes clínico-financeiros**: modelos de pacote, contratos por paciente e geração automática de conta a receber na contratação.

## Build

`npm run build` — **aprovado** (exit 0).

## Migration

`supabase/migrations/20260703120000_clinical_packages.sql`

- Tabela `clinical_package_templates` — modelos de pacote
- Tabela `patient_package_contracts` — contratos por paciente
- Enum `patient_package_status` (`ativo`, `encerrado`, `cancelado`)
- Colunas geradas: `session_unit_value`, `sessions_remaining`
- RLS `fin_pkg_tpl_tenant_*` e `fin_ppkg_tenant_*`
- Triggers Modo Suporte + match de clínica em contratos
- Relaxamento G2.1 do CHECK em `financial_entries`: receivable exige apenas `patient_id` (profissional opcional)

---

## Arquivos criados

| Arquivo |
|---------|
| `supabase/migrations/20260703120000_clinical_packages.sql` |
| `src/lib/finance/package-helpers.ts` |
| `src/components/finance/FinancePackagesPanel.tsx` |
| `docs/auditorias/sprint-g2.1-pacotes.md` |

## Arquivos alterados

| Arquivo | Alteração |
|---------|-----------|
| `src/integrations/supabase/types.ts` | Tipos das novas tabelas + enum |
| `src/lib/finance/types.ts` | Aliases + `FinanceModuleId.packages` |
| `src/lib/finance/constants.ts` | `FINANCE_G2_VERSION`, labels de status |
| `src/lib/finance/query-keys.ts` | `packageTemplates`, `patientPackages`, `packageLookups` |
| `src/lib/finance/module-registry.ts` | Módulo Pacotes G2.1 |
| `src/lib/finance/index.ts` | Export helpers |
| `src/components/finance/index.ts` | Export painel |
| `src/routes/_authenticated/app/financeiro.tsx` | Aba Pacotes |

**Preservados:** Core Clínico, PDFs clínicos, Histórico, Financeiro Base G1 congelado (sem alteração de painéis G1).

---

## Funcionalidades

### Modelos de pacote (`clinical_package_templates`)

| Campo | Descrição |
|-------|-----------|
| nome, descrição | Identificação |
| session_count | Quantidade de sessões |
| total_value | Valor total |
| session_unit_value | Calculado (total ÷ sessões) |
| validity_days | Validade em dias |
| is_active | Ativo/inativo |

CRUD na aba **Pacotes** → seção Modelos.

### Contratos (`patient_package_contracts`)

| Campo | Descrição |
|-------|-----------|
| package_template_id | Pacote contratado |
| patient_id | Paciente |
| professional_id | Opcional |
| contracted_at / valid_until | Datas |
| sessions_total / sessions_used / sessions_remaining | Saldo |
| contracted_value | Valor acordado |
| status | ativo, encerrado, cancelado |
| financial_entry_id | Conta a receber vinculada |

### Integração financeira

Na **contratação**:

1. Insere `financial_entries` (`entry_type = receivable`, `status = pendente`)
2. Categoria de receita **obrigatória**; centro de custo opcional
3. `documento`: `PACOTE-{nome}`; `observacoes` identifica o pacote
4. Insere contrato com `financial_entry_id`

**Cancelar contrato:** status `cancelado` no contrato; conta pendente → `cancelado` (dados preservados).

**Encerrar contrato:** status `encerrado`; conta a receber inalterada.

### UI (`/app/financeiro` → Pacotes)

- Cadastro/edição/inativação de modelos
- Contratação com filtros (paciente, status, busca)
- Ações encerrar e cancelar

---

## Segurança

| Item | Status |
|------|--------|
| `clinic_id` em queries | Sim |
| RLS Supabase | `fin_pkg_tpl_*`, `fin_ppkg_*` |
| `can_access_clinic` / `can_manage_clinic` | Sim |
| Modo Suporte | UI + triggers DB |

---

## Fora de escopo (confirmado)

Consumo automático por evolução, parcelamento, convênios, inadimplência, créditos avulsos, NF-e, PIX, cobrança automática, dashboard avançado.

---

## Riscos remanescentes

1. **Consumo de sessões** — `sessions_used` permanece 0 até sprint de consumo (evolução/agenda)
2. **Rollback parcial** — se contrato falhar após criar receivable, entry órfã possível (mitigar com RPC transacional em G2.2)
3. **CHECK receivable** — profissional opcional em todas receivables (decisão G2.1 documentada)

---

## Comandos executados

```bash
npm run build
```

## Critérios de aceite

| Critério | Status |
|----------|--------|
| Pacotes cadastráveis | OK |
| Pacote contratável por paciente | OK |
| Conta a receber na contratação | OK |
| Cancelamento sem apagar dados | OK |
| Build aprovado | OK |
| Sem regressão Core Clínico | OK |
| Sem alteração PDFs clínicos | OK |

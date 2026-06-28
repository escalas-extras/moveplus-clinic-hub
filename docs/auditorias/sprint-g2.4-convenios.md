# Sprint G2.4 — Convênios

Relatório de entrega. Data: 2026-06-27.

## Objetivo

Implementar a **base de convênios**: cadastro de operadoras, vínculo paciente x convênio e recebíveis originados de convênio em `financial_entries`.

## Build

`npm run build` — **aprovado** (exit 0).

## Migration

`supabase/migrations/20260706120000_health_insurance.sql`

- `health_insurance_providers` — operadoras/convênios
- `patient_health_insurances` — vínculo paciente x convênio
- Colunas em `financial_entries`: `health_insurance_provider_id`, `patient_health_insurance_id`
- RLS `fin_hi_prov_tenant_*`, `fin_phi_tenant_*`
- Triggers de match de clínica + Modo Suporte

---

## Arquivos criados

| Arquivo |
|---------|
| `supabase/migrations/20260706120000_health_insurance.sql` |
| `src/lib/finance/health-insurance-helpers.ts` |
| `src/components/finance/FinanceHealthInsurancePanel.tsx` |
| `docs/auditorias/sprint-g2.4-convenios.md` |

## Arquivos alterados

| Arquivo | Alteração |
|---------|-----------|
| `src/integrations/supabase/types.ts` | Tipos convênios + colunas em entries |
| `src/lib/finance/types.ts` | Aliases + `FinanceModuleId.health_insurance` |
| `src/lib/finance/constants.ts` | `FINANCE_G2_VERSION = G2.4` |
| `src/lib/finance/query-keys.ts` | Keys convênios |
| `src/lib/finance/module-registry.ts` | Módulo Convênios |
| `src/lib/finance/index.ts` | Export helpers |
| `src/components/finance/index.ts` | Export painel |
| `src/routes/_authenticated/app/financeiro.tsx` | Aba Convênios |

**Preservados:** Core Clínico, PDFs clínicos, pacotes, parcelamentos, receber/pagar.

---

## Funcionalidades

### Operadoras (`health_insurance_providers`)

Cadastro com nome, documento, contato, telefone, e-mail, observações; ativar/inativar.

### Vínculos (`patient_health_insurances`)

Paciente + convênio + plano, carteirinha, autorização, validade; filtros por paciente/convênio/busca; ativar/inativar.

### Recebível convênio

Cria `financial_entries` receivable `pendente` com:
- `health_insurance_provider_id`, `patient_health_insurance_id`
- paciente, valor, vencimento, categoria receita, centro de custo opcional
- documento/autorização, observações

Aparece em **Contas a Receber** e **Fluxo de Caixa** (regras G1 inalteradas).

---

## Segurança

| Item | Status |
|------|--------|
| `clinic_id` | Sim |
| RLS | Sim |
| `can_access_clinic` / `can_manage_clinic` | Sim |
| Cross-clinic bloqueado | Triggers |
| Modo Suporte | UI + DB |

---

## Fora de escopo (confirmado)

Faturamento em lote, glosa, TISS, repasse, auditoria de contas, integração operadora, NF-e, PIX, boleto, conciliação.

---

## Comandos executados

```bash
npm run build
```

## Critérios de aceite

| Critério | Status |
|----------|--------|
| Convênios cadastráveis | OK |
| Paciente vinculável | OK |
| Recebível em financial_entries | OK |
| RLS preservada | OK |
| Build aprovado | OK |
| Sem regressão pacotes/parcelamentos/receber/pagar | OK |
| Sem alteração Core Clínico / PDFs | OK |

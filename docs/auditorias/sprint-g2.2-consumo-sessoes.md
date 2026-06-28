# Sprint G2.2 — Consumo de sessões / créditos

Relatório de entrega. Data: 2026-06-27.

## Objetivo

Implementar **consumo manual de sessões** dos pacotes contratados, com histórico, saldo atualizado e estorno — créditos = saldo de sessões do pacote.

## Build

`npm run build` — **aprovado** (exit 0).

## Migration

`supabase/migrations/20260704120000_patient_package_usages.sql`

- Tabela `patient_package_usages`
- Enum `patient_package_usage_status` (`active`, `reversed`)
- Triggers DB:
  - Valida contrato ativo e saldo antes de inserir
  - Incrementa `sessions_used` após consumo
  - Decrementa `sessions_used` após estorno
  - Bloqueia DELETE e alterações em consumos estornados
- RLS `fin_ppkg_use_tenant_*` + Modo Suporte

---

## Arquivos criados

| Arquivo |
|---------|
| `supabase/migrations/20260704120000_patient_package_usages.sql` |
| `src/lib/finance/package-usage-helpers.ts` |
| `src/components/finance/FinancePackageContractUsageDialog.tsx` |
| `docs/auditorias/sprint-g2.2-consumo-sessoes.md` |

## Arquivos alterados

| Arquivo | Alteração |
|---------|-----------|
| `src/integrations/supabase/types.ts` | Tipos `patient_package_usages` + enum |
| `src/lib/finance/types.ts` | Aliases de usage |
| `src/lib/finance/constants.ts` | Labels usage, `FINANCE_G2_VERSION = G2.2` |
| `src/lib/finance/query-keys.ts` | `packageUsages`, `patientPackageDetail` |
| `src/lib/finance/index.ts` | Export helpers |
| `src/components/finance/index.ts` | Export dialog |
| `src/components/finance/FinancePackagesPanel.tsx` | Botão Consumo por contrato |

**Preservados:** Core Clínico, PDFs clínicos, Financeiro Base G1, consumo automático por evolução (não implementado).

---

## Regras implementadas

| Regra | Camada |
|-------|--------|
| Consumo ≤ saldo | DB trigger + validação UI |
| Incrementa `sessions_used` | DB trigger AFTER INSERT |
| Decrementa no estorno | DB trigger AFTER UPDATE |
| Sem DELETE | DB trigger BEFORE DELETE |
| Estorno → `status = reversed` | UPDATE + histórico preservado |
| Contrato cancelado/encerrado | DB bloqueia INSERT; UI oculta formulário |
| Contrato vencido | Alerta + checkbox de confirmação (UI) |
| Cross-clinic | Triggers + RLS |

---

## UI

Na aba **Pacotes** → botão **Consumo** em cada contrato:

- Resumo: usadas, saldo (créditos), validade
- Registrar consumo (data, quantidade, profissional opcional, notas)
- Histórico com status Ativo/Estornado
- Estorno com motivo obrigatório

---

## Segurança

| Item | Status |
|------|--------|
| `clinic_id` | Sim |
| RLS | `fin_ppkg_use_tenant_*` |
| `can_access_clinic` / `can_manage_clinic` | Sim |
| Modo Suporte | UI + triggers DB |

---

## Fora de escopo (confirmado)

Consumo automático por evolução, agenda, parcelamento, convênios, inadimplência, NF-e, PIX, crédito financeiro separado, dashboard avançado.

---

## Comandos executados

```bash
npm run build
```

## Critérios de aceite

| Critério | Status |
|----------|--------|
| Consumo reduz saldo | OK |
| Estorno devolve saldo | OK |
| Saldo negativo bloqueado | OK |
| Consumo em contrato cancelado bloqueado | OK |
| Histórico preservado | OK |
| Build aprovado | OK |
| Sem regressão Core Clínico | OK |
| Sem alteração PDFs clínicos | OK |

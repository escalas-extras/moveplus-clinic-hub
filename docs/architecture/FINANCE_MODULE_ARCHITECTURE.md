# Arquitetura — Módulo Financeiro (G1 + G2)

Documento técnico de referência.

| Trilha | Versão | Status |
|--------|--------|--------|
| Financeiro Base | `FINANCE_BASE_VERSION = "G1.8"` | **Congelado** |
| Operação Financeira | `FINANCE_G2_VERSION = "G2.7"` | **Congelado** |

## Visão geral

O Financeiro opera no app multi-clínica (`clinic_id`), com RLS Supabase e feature flag `financeiro`.

Fonte única de lançamentos: **`financial_entries`** (`entry_type`: `receivable` | `payable`).

```
src/
├── lib/finance/              # Domínio, tipos, registry, query keys, helpers
├── components/finance/     # Painéis por aba
└── routes/.../financeiro.tsx   # Rota /app/financeiro
```

## Abas ativas (`/app/financeiro`)

| Aba | Componente | Sprint |
|-----|------------|--------|
| Visão geral | `FinanceDashboardPanel` | G1.7 |
| Categorias | `FinanceCategoriesPanel` | G1.2 |
| Centros de Custo | `FinanceCostCentersPanel` | G1.3 |
| Contas a Receber | `FinanceReceivablesPanel` | G1.4 / G2.3 |
| Contas a Pagar | `FinancePayablesPanel` | G1.5 |
| Fluxo de Caixa | `FinanceCashFlowPanel` | G1.6 |
| Pacotes | `FinancePackagesPanel` | G2.1–G2.2 |
| Convênios | `FinanceHealthInsurancePanel` | G2.4 |
| Inadimplência | `FinanceDelinquencyPanel` | G2.5 |
| Receita por Profissional | `FinanceProfessionalRevenuePanel` | G2.6 |
| Lançamentos v1 | `LancamentosTab` (inline) | v1 |
| Recibos | `RecibosTab` (inline) | v1 |

## Padrões reutilizados

| Padrão | Uso no Financeiro |
|--------|-------------------|
| Multi-clínica | `useActiveClinic()` → `clinicId` obrigatório |
| RLS tenant | `fin_*`, `fin_cat_*`, `fin_cc_*`, `fin_hi_*` |
| Layout Premium | `AppShell`, `PageHeader`, `KpiGrid`, `EmptyState`, `StatusBadge` |
| Data fetching | TanStack Query + `financeQueryKeys` |
| Support mode | `SupportGuardButton` + triggers DB |
| Invalidação | `invalidateFinanceModuleQueries(qc, clinicId)` |

## Persistência principal

### `financial_entries`

Lançamentos unificados. Colunas G2 relevantes:

| Coluna | Sprint | Notas |
|--------|--------|-------|
| `installment_plan_id`, `installment_number`, `installment_total` | G2.3 | Parcelamentos |
| `health_insurance_provider_id`, `patient_health_insurance_id` | G2.4 | Convênios |
| `collection_notes` | G2.5 | Notas de cobrança manual |

**Constraint receivable (G2.1+):** `entry_type = payable OR patient_id IS NOT NULL` — `professional_id` **opcional**.

### Tabelas G2

| Tabela | Sprint | Função |
|--------|--------|--------|
| `clinical_package_templates` | G2.1 | Modelos de pacote |
| `patient_package_contracts` | G2.1 | Contratos paciente |
| `patient_package_usages` | G2.2 | Consumo/estorno de sessões |
| `financial_installment_plans` | G2.3 | Planos de parcelamento |
| `health_insurance_providers` | G2.4 | Operadoras |
| `patient_health_insurances` | G2.4 | Vínculo paciente x convênio |

## Regras de negócio G1 (congelado G1.8)

| Conceito | Regra |
|----------|--------|
| Cancelados | Excluídos de dashboard, fluxo, KPIs |
| Realizado | `status = pago`; data = `data_recebimento ?? data` |
| Previsto | `status = pendente`; data = `data_vencimento ?? data` |
| Vencidos | pendente + `data_vencimento < hoje` |

## Regras de negócio G2 (congelado G2.7)

| Módulo | Regra |
|--------|--------|
| **Pacotes** | Contratação gera `financial_entries` receivable `pendente` (ou parcelas via plano) |
| **Consumo** | Trigger DB reduz `sessions_remaining`; estorno devolve saldo |
| **Parcelamentos** | `computeInstallmentAmounts()` soma = total; entradas entram no fluxo como receitas previstas |
| **Convênios** | Recebível manual com FKs `health_insurance_*`; `professional_id` opcional |
| **Inadimplência** | `pendente` + `data_vencimento < hoje`; pagos/cancelados excluídos |
| **Receita profissional** | Agrupa por `professional_id`; sem vínculo → "Sem profissional vinculado" |

## Registry e query keys

- `src/lib/finance/module-registry.ts` — módulos G1 + G2 `active`
- Namespace: `["finance", clinicId, ...]` — `financeQueryKeys`
- Legado v1: `["fin", clinicId]`, `["fin-totals", clinicId]`

## Permissões

- **RLS:** `can_access_clinic(clinic_id)` leitura; `can_manage_clinic(clinic_id)` escrita
- **Support mode:** mutações bloqueadas na UI; triggers DB impedem escrita
- **Tenant:** todas as queries filtram `.eq("clinic_id", clinicId)`

## Integrações preservadas

- Lançamentos v1, Recibos + PDF (`receipt-pdf.ts` — **sem alteração**)
- Relatórios financeiros (`/app/relatorios`)
- Core Clínico congelado

## Fora de escopo G2 (congelado)

- Comissão, repasse, split, metas, folha, DRE
- Cobrança automática, WhatsApp, e-mail, SMS, juros, multa, boleto, PIX automático
- Régua de cobrança, renegociação, acordos, protesto
- Billing SaaS, NF-e, conciliação bancária

## Riscos remanescentes

1. Query keys legadas (`fin`, `fin-totals`) coexistem com `financeQueryKeys` — mitigado por `invalidateFinanceModuleQueries`
2. Receita por profissional e inadimplência carregam até 5000 entries — volume alto pode exigir paginação server-side (pós-G2)
3. Duplicidade UI: aba Recibos em `/app/financeiro` e rota `/app/recibos`
4. Lançamentos v1 permanece legado; novos fluxos devem usar Contas a Receber/Pagar
5. Contas a Receber (G1.4) ainda exige `professional_id` no formulário manual; pacotes/convênios permitem null

## Próximo passo (pós-freeze G2)

Novos recursos financeiros exigem **nova trilha de sprint (G3+)**. Não estender G1/G2 sem revisão arquitetural.

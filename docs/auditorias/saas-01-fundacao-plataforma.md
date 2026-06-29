# SAAS-01 — Fundação da Plataforma SaaS

**Data:** 2026-06-27  
**Escopo:** Painel administrativo da plataforma (`/app/admin-saas`) — visão SaaS, não clínica.

## O que foi criado

- **Dashboard SaaS premium** com `PageHero`, `OperationalCard`, `AttentionList`, `QuickAction` e navegação interna por módulos.
- **8 KPIs operacionais:** total de clínicas, ativas, em trial, suspensas, clientes pagantes, MRR estimado, trials vencendo, acessos recentes.
- **Atalhos de módulos:** Clínicas, Planos, Trials, Assinaturas, Cobranças, Suporte, Configurações SaaS (placeholders onde aplicável).
- **Base `src/lib/saas/`:** `types.ts`, `constants.ts`, `helpers.ts`, `index.ts` (reexporta utilitários existentes).
- **Componente** `src/components/saas/SaasDashboardPanel.tsx`.

## Migration

**Nenhuma migration criada.** Campos já existentes foram reutilizados.

## Campos utilizados

| Tabela | Campos |
|--------|--------|
| `clinics` | `status`, `is_test`, `nome`, `slug`, `plan`, `created_at`, `active` |
| `clinic_plans` | `status`, `trial_ends_at`, `plan_id` (+ join `plans`) |
| `plans` | `code`, `name`, `monthly_price`, `price_cents` |
| `saas_audit_log` | `action`, `created_at`, `clinic_id` |
| `clinic_members` | usuários ativos (contagem) |

Status operacional derivado via `resolveOperationalStatus()` (`clinic-operational-status.ts`).

## Proteção de acesso

- Rota `/app/admin-saas` exige `super_admin` via RPC `has_role` no `beforeLoad`.
- Usuários de clínica comum são redirecionados para `/app`.
- Super admin fora de modo suporte é redirecionado de `/app` para `/app/admin-saas` (comportamento existente).

## Arquivos alterados

- `src/lib/saas/types.ts` (novo)
- `src/lib/saas/constants.ts` (novo)
- `src/lib/saas/helpers.ts` (novo)
- `src/lib/saas/index.ts` (novo)
- `src/components/saas/SaasDashboardPanel.tsx` (novo)
- `src/lib/api/saas-admin.functions.ts` — KPIs `trials_expiring`, `paid_clients`, `recent_access`, `total_all`
- `src/routes/_authenticated/app/admin-saas.tsx` — painel premium + navegação
- `src/styles.css` — estilos `.saas-platform`
- `docs/auditorias/saas-01-fundacao-plataforma.md` (este arquivo)

## Build

```bash
npm run build
```

Resultado: **aprovado** (exit code 0).

## Fora de escopo (conforme sprint)

Gateway de pagamento, PIX, NF-e, boleto, Stripe, Asaas, Mercado Pago, billing real, página pública de venda.

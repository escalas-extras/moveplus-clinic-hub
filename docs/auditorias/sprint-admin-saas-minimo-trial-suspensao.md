# Admin SaaS mínimo — Trial, ativação e suspensão

**Data:** 28/06/2026  
**Build:** `npm run build` — **sucesso**  
**Migration criada:** sim — `20260628120000_saas_clinic_operational_access.sql`

---

## Objetivo

Controle operacional de clínicas (trial, active, suspended, inactive, canceled) sem apagar dados clínicos, sem cobrança automática e sem alterar Core Clínico.

---

## Tabelas e campos utilizados

| Tabela | Campos |
|--------|--------|
| `clinics` | `status` (`active`, `inactive`, `suspended`, `canceled`, `deleted`), `trial_ends_at`, `suspended_at`, `canceled_at`, `active`, `plan` |
| `clinic_plans` | `status` (`active`, `trial`, `suspended`, `canceled`), `trial_ends_at`, `canceled_at`, `plan_id`, `clinic_id` |
| `plans` | `code`, `name`, `modules` (feature gating existente) |
| `clinic_members` | inalterado — membros preservados |
| `saas_audit_log` | `action`, `clinic_id`, `old_data`, `new_data` |

**Não criadas** novas tabelas. **Não apagados** pacientes, documentos, agenda, financeiro ou usuários.

---

## Migration

`supabase/migrations/20260628120000_saas_clinic_operational_access.sql`

- `clinic_has_operational_access(clinic_id)` — true se clínica ativa + plano `active`/`trial` não expirado
- `can_access_clinic(clinic_id)` — bloqueia membros em clínica suspensa/inativa/cancelada/sem plano; **support mode** continua funcionando

---

## Arquivos alterados

| Arquivo | Alteração |
|---------|-----------|
| `supabase/migrations/20260628120000_saas_clinic_operational_access.sql` | Gate RLS |
| `src/lib/api/saas-admin.functions.ts` | Trial start/extend/convert, cancel, sync plano, list enriquecida, provision trial |
| `src/lib/saas/clinic-operational-status.ts` | Status operacional unificado |
| `src/lib/saas/use-clinic-operational-access.ts` | Hook de acesso |
| `src/components/clinic-access-gate.tsx` | Tela de bloqueio amigável |
| `src/routes/_authenticated/app/route.tsx` | Layout com gate em rotas `/app/*` |
| `src/routes/_authenticated/app/admin-saas.tsx` | Colunas trial + ações rápidas + provision trial |

---

## Funcionalidades

### Status operacional

Derivado de `clinics.status` + `clinic_plans.status` + `trial_ends_at`:

- **trial** — plano em trial válido
- **active** — clínica e plano ativos
- **suspended** — clínica suspensa, plano suspenso ou trial expirado
- **inactive** — clínica inativa
- **canceled** — assinatura cancelada

### Admin SaaS — lista de clínicas

- Nome, plano, status operacional, trial até, dias restantes
- Ações: iniciar trial (14d), estender (+14d), converter → ativo, suspender, inativar, cancelar assinatura, reativar
- Nova clínica: checkbox **Iniciar em trial** + dias configuráveis

### Gate de acesso

- **trial / active** → app operacional normal
- **suspended / inactive / canceled** → tela: *"Acesso temporariamente indisponível. Entre em contato com o suporte."*
- RLS reforça bloqueio no banco (leitura/escrita clínica negada)
- `/app/admin-saas` e `/app/configuracoes` bypassam o gate (super admin / ajustes)

### Auditoria

Registrado em `saas_audit_log` (com `clinic_id`):

- `clinic.trial_start`, `clinic.trial_extend`, `clinic.trial_convert`
- `clinic.suspend`, `clinic.deactivate`, `clinic.activate`, `clinic.cancel`

**Pendência documentada:** `ip_address` não capturado nas server functions.

---

## Validação manual

1. **Aplicar migration** no Supabase (`supabase db push` ou painel SQL).
2. Login como **super_admin** → `/app/admin-saas` → aba **Clínicas**.
3. Selecionar clínica → **Iniciar trial (14d)** → verificar colunas *Trial até* e *Dias*.
4. Login como usuário da clínica → app operacional acessível.
5. **Suspender acesso** → usuário vê tela de bloqueio; dados permanecem (pacientes/agenda visíveis no admin/support).
6. **Reativar acesso** → app volta ao normal.
7. **Marcar inativa** / **Cancelar assinatura** → mesmo bloqueio, sem exclusão de dados.
8. **Estender trial** / **Converter trial → ativo** → status e dias atualizados.
9. **Nova clínica** com *Iniciar em trial* → provisionamento com plano vinculado em trial.

---

## Critérios de aceite

| Critério | Status |
|----------|--------|
| Colocar clínica em trial | ✅ |
| Ver dias restantes | ✅ |
| Suspender acesso | ✅ |
| Clínica suspensa não acessa app | ✅ (UI + RLS) |
| Dados preservados | ✅ |
| Reativar clínica | ✅ |
| Marcar inactive | ✅ |
| Nenhum dado clínico apagado | ✅ |
| npm run build passa | ✅ |

---

## Fora de escopo (conforme pedido)

- Cobrança automática / gateway / NF-e
- Alteração de Core Clínico ou regras clínicas
- Cron automático de expiração de trial (bloqueio ocorre na consulta de `trial_ends_at`)

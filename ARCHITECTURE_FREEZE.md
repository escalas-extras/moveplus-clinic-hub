# ARCHITECTURE FREEZE — FisioOS

**Data:** 21 de junho de 2026
**Status:** ✅ Arquitetura multi-tenant CONGELADA

---

## Confirmações de estabilização

| Camada | Status |
|---|---|
| Arquitetura multi-tenant | ✅ Estabilizada |
| Isolamento por clínica (`clinic_id` + RLS) | ✅ Validado |
| Permissões (`can_access_clinic`, `can_manage_clinic`, `has_role`, `has_role_in`) | ✅ Estabilizadas |
| Provisionamento (`provision_clinic`, seed canônico) | ✅ Estabilizado |
| PDFs tenant-aware (branding por `clinic_settings`) | ✅ Estabilizado |
| Busca global (escopo por clínica ativa) | ✅ Estabilizada |
| Avatar / branding por clínica | ✅ Estabilizado |
| Biblioteca de PDFs / templates canônicos Move+ | ✅ Estabilizada |
| Profissionais / Documentos / Assinaturas | ✅ Estabilizados |
| Storage policies (`documents`, `clinic-logos`, `user-avatars`) | ✅ Estabilizadas |
| Suporte em modo leitura (`support_sessions` + `fn_block_support_writes`) | ✅ Estabilizado |
| Regras de `super_admin` | ✅ Estabilizadas |

---

## Componentes congelados (não alterar sem autorização explícita)

- Coluna `clinic_id` em todas as tabelas multi-tenant
- Políticas RLS em todas as tabelas `public.*`
- Funções: `can_access_clinic`, `can_manage_clinic`, `current_clinic_id`,
  `current_support_session_clinic`, `is_member_of`, `has_role`, `has_role_in`,
  `shares_clinic_with`, `has_plan_feature`, `current_plan_limits`
- `clinic_members.role` e enum `app_role`
- `provision_clinic` e `seed_default_document_templates` / `apply_canonical_templates`
- Triggers de enforcement: `fn_enforce_patient_limit`, `fn_enforce_document_limit`,
  `fn_enforce_user_limit`, `fn_default_clinic_id`, `fn_block_support_writes`,
  `block_locked_updates`, `fn_set_validation_hash`, `fn_schedule_reassessment`,
  `fn_audit_trigger`, `fn_sync_clinic_status`, `fn_sync_clinic_lifecycle_dates`
- Storage buckets: `documents`, `clinic-logos`, `user-avatars` + policies
- Geração de PDF tenant-aware (cabeçalho/rodapé/branding por clínica)
- Modo Suporte (somente leitura para super_admin)
- `handle_new_user` e bootstrap do primeiro admin

---

## Escopo permitido a partir deste ponto

Alterações futuras estão limitadas a:

- UX (experiência do usuário)
- UI (componentes visuais)
- Fluxo visual e navegação
- Organização de menu e information architecture
- Design system (tokens, tipografia, espaçamento, animação)
- Melhorias operacionais **não estruturais**

## Escopo BLOQUEADO (requer autorização explícita)

- Qualquer migration de banco
- Alterações em RLS ou GRANTs
- Mudanças em funções `SECURITY DEFINER`
- Alterações em provisionamento ou seed canônico
- Mudanças em storage policies
- Alterações em modelo de papéis/permissões
- Mudanças em isolamento multi-tenant

---

**Próximo passo padrão:** evoluir apenas UX/UI sobre a base estabilizada.

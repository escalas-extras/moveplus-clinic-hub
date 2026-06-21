# FisioOS — Congelamento Arquitetural (Fase 2)

**Status:** ARQUITETURA MULTI-TENANT CONGELADA
**Data:** 21 de junho de 2026
**Autorização:** Rodada A concluída e validada pelo product owner.

---

## 1. Escopo do Congelamento

A partir desta data, os seguintes domínios são considerados **estabilizados** e
**não podem ser alterados sem autorização explícita do product owner**:

### 1.1 Modelo de tenancy
- Coluna `clinic_id` em todas as tabelas multi-tenant.
- Funções `current_clinic_id()` e `current_support_session_clinic()`.
- Tabela `clinic_members` e enum de papéis (`owner`, `admin`, `professional`,
  `reception`, `finance`).
- `support_sessions` (modo suporte super_admin → clínica, sempre leitura
  segura via mesmas policies).

### 1.2 Autorização
- Funções `can_access_clinic(clinic_id)` e `can_manage_clinic(clinic_id)`.
- `has_role(user_id, app_role)` (super_admin / plataforma).
- Policies RLS de todas as tabelas `public.*` que carregam `clinic_id`.
- Storage policies de `user-avatars`, `documents`, `clinic-logos`,
  `library-assets` (isolamento por `(storage.foldername(name))[1]`).

### 1.3 Provisionamento
- `handle_new_user()` (criação de profile + papel inicial).
- Fluxo padrão de criação de clínica (clinic_settings + clinic_members owner +
  plano padrão) — uniforme para qualquer clínica nova.

### 1.4 PDF tenant-aware
- Engine único `src/lib/pdf-engine.ts`.
- Resolver `src/lib/pdf.ts` (`buildPdf` com `clinicId` explícito + fallback
  `current_support_session_clinic` → `current_clinic_id`).
- `src/lib/professional-resolver.ts` (resolução + validação genérica de
  responsável técnico).
- `src/lib/library-pdf.ts` (`hideSignature: true` para materiais
  institucionais).

### 1.5 UI tenant-aware
- `useActiveClinic()` (única fonte de verdade do tenant ativo, inclusive em
  modo suporte).
- `useBranding()` (logo/cores/rodapé sempre da clínica ativa).
- `src/components/global-search.tsx` (modo `clinic` / `platform` resolvido
  por suporte + rota + papel, sem hardcode).
- `src/components/avatar-uploader.tsx` + `src/lib/user-avatar.ts`
  (upload self-service, cache invalidado por user_id).

---

## 2. Validação Confirmada (Rodada A)

| Item | Estado | Validação |
|---|---|---|
| 1. Profissionais (edição + vínculo + conselho/registro) | OK | Move+ (Veronice), Grasiela (grazi, Julio) — sem hardcode |
| 3. Assinaturas padronizadas no PDF | OK | Bloqueio quando faltam dados; formato `CREFITO nº [registro]` uniforme |
| 4. Avatar (upload + refresh imediato) | OK | Policies por `auth.uid()`; funciona para qualquer perfil |
| 5. Busca global (escopo por clínica ativa) | OK | Modo `clinic` forçado em suporte; isolamento por queryKey |
| 6. Biblioteca PDF | OK | PDF real (jsPDF blob), branding da clínica ativa, sem assinatura |
| Isolamento multi-tenant | OK | Policies `scope='global' OR can_access_clinic(clinic_id)` |
| Provisionamento de clínica nova | OK | Herda a mesma arquitetura sem cópia de dados |

---

## 3. Itens Bloqueados (exigem nova autorização)

NÃO alterar sem autorização explícita:

- Schema/colunas de tabelas com `clinic_id`.
- Qualquer policy RLS existente.
- Funções `current_clinic_id`, `current_support_session_clinic`,
  `can_access_clinic`, `can_manage_clinic`, `has_role`, `handle_new_user`.
- Enum `app_role` e tabela `user_roles`.
- Storage buckets e suas policies.
- Pipeline de geração de PDF (engine, resolver, branding).
- Regras de super_admin e regras de suporte em modo leitura.
- Fluxo de provisionamento de novas clínicas.

---

## 4. Itens Liberados (alterações permitidas sem nova autorização)

A partir desta data, alterações permitidas restringem-se a:

- UX (microinterações, feedback, copy, mensagens de erro de apresentação).
- UI (componentes visuais, espaçamento, tipografia, ícones).
- Fluxo visual (ordem de telas, wizards, onboarding visual).
- Organização de menu e navegação.
- Design system (tokens semânticos, variantes de componentes shadcn).
- Melhoria operacional não estrutural (atalhos, ordenação, filtros locais,
  estados vazios, loading states).

QUALQUER alteração que toque os itens do §3 exige nova autorização e
re-validação por clínica.

---

## 5. Próximo Passo

Aguardar autorização explícita do product owner para iniciar a fase
**UX Premium**.

— Fim do documento. —

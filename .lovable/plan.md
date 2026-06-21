## BLOCO I — Biblioteca Premium + Fundação SaaS Multi-Clínica

Sistema em produção (Move+). Execução em 4 fases sequenciais, com validação entre cada uma. **Nada será publicado automaticamente.**

---

### FASE 1 — Biblioteca Premium Real

**1.1 Conteúdo real (substituir 43 placeholders)**
- Popular `library_contents` com conteúdos completos (~800+ chars) nas categorias:
  - Neurologia: AVC, Parkinson, Alzheimer, Esclerose Múltipla, Lesão Medular
  - Ortopedia: Lombalgia, Cervicalgia, Joelho, Ombro, Artrose, Pós-op
  - Geriatria: Quedas, Mobilidade, Exercícios domiciliares, Sentar/levantar
  - Respiratória: Exercícios, Higiene brônquica, Orientações domiciliares
- Estrutura por item: título, resumo, conteúdo (markdown estruturado com seções, listas, alertas, "quando procurar atendimento"), tags, categoria, status=published, scope=global, clinic_id=null
- Inserção via `supabase--insert` (não migração — são dados)

**1.2 Renderização rica no modal**
- `src/routes/_authenticated/app/biblioteca.tsx`: substituir render cru por renderer markdown (react-markdown + remark-gfm) com estilos tipográficos (h1/h2/h3, ul/ol, blockquote para alertas, callouts).
- Componente novo: `src/components/library/library-content-view.tsx`

**1.3 PDF Engine para biblioteca**
- Remover `window.print()`.
- Novo builder `src/lib/pdf-builders.ts` → `buildLibraryContentPdf({ content, clinic })` usando o pdf-engine premium existente (cabeçalho white-label, título, corpo renderizado, rodapé com data/clínica, sem QR/hash por padrão).
- Botão "Gerar PDF" no modal chama o engine.

---

### FASE 2 — Fundação SaaS Multi-Clínica (sem quebrar Move+)

**2.1 Tabela `clinic_members`** (migração)
```
id, clinic_id (FK clinics), user_id (FK auth.users), role (enum: owner/admin/profissional/recepcao/financeiro),
is_default bool, active bool, created_at
unique(clinic_id, user_id)
```
+ GRANTs + RLS (usuário lê suas memberships; admin/owner gerencia da própria clínica).

**2.2 Helpers SECURITY DEFINER**
- `current_clinic_id()` → retorna `is_default=true` member da `auth.uid()`, fallback primeira ativa.
- `is_member_of(_clinic_id uuid)` → bool.
- `has_role_in(_clinic_id uuid, _role text)` → bool.
- Todos com `SET search_path = public`.

**2.3 Backfill seguro (Move+)**
- Identificar/garantir 1 row em `clinics` correspondendo à Move+ (criar se não existir, usando dados de `clinic_settings`).
- Adicionar `clinic_id uuid` (nullable) em `clinic_settings` com FK para `clinics`.
- Preencher `clinic_settings.clinic_id` = id da Move+.
- Inserir `clinic_members` para todos os `auth.users` existentes apontando para a Move+ com `is_default=true` e role mapeado de `user_roles` (admin→admin; physiotherapist→profissional).

**Não aplicar NOT NULL em tabelas clínicas nesta fase** — apenas preparação.

**2.4 Branding por clínica**
- `src/lib/branding.ts`: trocar `LIMIT 1` por busca via `current_clinic_id()` → `clinic_settings` filtrado por `clinic_id`. Fallback FisioOS se ausente.
- `merge-tags.ts` e `pdf-engine.ts`: receber/usar clínica resolvida.
- `validate_document_by_hash`: já recebe o doc — passar a juntar `clinic_settings` por `clinic_id` do documento (adicionar `clinic_id` em `clinical_documents` se não existir e backfill com a Move+).

---

### FASE 3 — Admin SaaS Inicial

**3.1 Role `super_admin`**
- Adicionar valor ao enum `app_role`.
- Atribuir ao usuário owner da Move+ via migração condicional.

**3.2 Rota `/app/admin-saas`** (gate `has_role(super_admin)`)
- Lista clínicas (tabela), criar/editar/ativar/inativar.
- Form: nome fantasia, razão social, CNPJ/CPF, telefone, email, cidade/UF, slug, plano (Starter/Professional/Clinic/Enterprise), logo, cores, responsável admin.
- Server functions (`createServerFn` + `requireSupabaseAuth` + check super_admin):
  - `listClinics`, `createClinic`, `updateClinic`, `toggleClinicActive`, `inviteClinicAdmin`.
- Ao criar clínica: insere `clinics`, `clinic_settings(clinic_id=…)`, convida admin (Auth Admin API) e cria `clinic_members` com role=owner.

**3.3 Campo `plan`** em `clinics` (já existe — adicionar enum check se necessário).

---

### FASE 4 — RLS Progressiva (apenas tabelas com clinic_id já backfilled)

Prioridade nesta fase: **apenas** `library_contents`, `document_templates`, `clinical_documents` (já têm `clinic_id` na coluna).

- Reescrever policies para:
  - SELECT: `scope='global' OR clinic_id = current_clinic_id() OR has_role(auth.uid(),'super_admin')`
  - INSERT/UPDATE/DELETE: `WITH CHECK clinic_id = current_clinic_id()` (ou super_admin)
- Backfill `clinic_id` nestas tabelas para Move+ onde nulo.
- **Não tocar** RLS de `patients/professionals/assessments/evolutions/appointments` neste bloco — fica para BLOCO II após backfill dedicado.

---

### Critérios de homologação (verificação ao fim)

Biblioteca: conteúdo real renderizado, PDF via engine, sem markdown cru, sem PDF vazio.
SaaS: Move+ operando, dados preservados, `clinic_members` populada, `current_clinic_id()` retornando Move+, branding/PDF corretos, admin SaaS criando clínica isolada.
Segurança: sem afrouxar RLS, validate_document_by_hash LGPD-safe mantido.

### Entrega
Relatório final com: conteúdos criados, tabelas/funções, RLS alterada, backfill executado, testes, pendências (RLS clínica plena, NOT NULL clinic_id em tabelas operacionais, seletor de clínica ativa na UI, convites por e-mail, billing).

---

### Ordem de execução proposta
1. Fase 1 (sem migração de schema — só dados + frontend + PDF builder).
2. Fase 2 (migração: clinic_members + helpers + clinic_id em clinic_settings/clinical_documents + backfill Move+).
3. Branding/PDF/merge-tags refactor.
4. Fase 3 (super_admin + rota admin-saas + server fns).
5. Fase 4 (RLS progressiva nas 3 tabelas seguras).
6. Relatório.

**Aguardo aprovação para iniciar pela Fase 1.**

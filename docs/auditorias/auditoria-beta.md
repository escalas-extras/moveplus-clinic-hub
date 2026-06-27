# Prontidão para Beta — FisioOS (READ ONLY)

Análise como se o produto fosse lançado **hoje**, com base no código, nas migrations Supabase e nas auditorias já realizadas (clínica, segurança, arquitetura, UX, performance, PDFs). Nenhum arquivo foi alterado.

---

## Resposta direta

### 1. O sistema está pronto para um Beta?

**Não para Beta aberto.** **Sim, com ressalvas, para Beta fechado** (1–3 clínicas piloto, provisionamento manual pelo time, escopo acordado).

O núcleo clínico funciona de ponta a ponta: pacientes → avaliação → evolução → documentos/PDF → agenda → financeiro básico. Porém há **bloqueadores de confiança** (segurança multi-tenant, convite de usuários quebrado) e **lacunas de produto** (onboarding desconectado, UX duplicada) que impedem tratar o lançamento como “pronto para mercado”.

| Veredicto | Condição |
|-----------|----------|
| Beta fechado (piloto) | Após corrigir itens **obrigatórios** abaixo |
| Beta aberto / self-serve | **Não recomendado** hoje |
| GO LIVE comercial | **Não** |

---

### 2. O que impede o lançamento?

| # | Impedimento | Severidade |
|---|-------------|------------|
| 1 | **Convite de fisioterapeuta falha no banco** — `clinic_members.role = "physiotherapist"` vs CHECK exigindo `"profissional"` | **CRÍTICO** |
| 2 | **RLS aberta em `public.documents`** — qualquer autenticado pode ler/inserir; tabela ainda usada por PDFs legados e timeline | **CRÍTICO** |
| 3 | **Papel global `admin` em `user_roles`** ainda ativo no banco + atribuído no convite — risco de isolamento entre clínicas | **CRÍTICO** |
| 4 | **Zero testes automatizados** — regressões silenciosas em fluxos críticos | **CRÍTICO** |
| 5 | **Extra Flow (`/app/recibos`)** depende de schema (`pagamentos`, `extras`, `recibos`) ausente nos types locais — pode falhar em prod se schema divergir | **ALTO** |
| 6 | **Onboarding incompleto** — `OnboardingChecklist` implementado mas nunca renderizado | **ALTO** |
| 7 | **Relatórios com bug provável** — query usa `scale_code`; schema tem `scale_type` | **ALTO** |
| 8 | **Performance** — bundle monolítico, sem lazy routes, QueryClient sem defaults | **ALTO** |
| 9 | **UX duplicada** — dois painéis “Painel Clínico”, recibos em dois lugares, wizard + form de avaliação | **MÉDIO** |
| 10 | **Documentação de produto vazia** — `docs/arquitetura/ARQUITETURA.md` e auditorias em arquivos de 1 linha | **MÉDIO** |

---

### 3. O que é obrigatório corrigir antes do Beta?

#### Segurança e multi-tenant (bloqueante)

| Item | Ação mínima |
|------|-------------|
| `public.documents` RLS | Fechar SELECT/INSERT ou migrar 100% para `clinical_documents` |
| Convite de usuário | Mapear `"physiotherapist"` → `"profissional"` em `clinic_members` |
| Papel global `admin` | Parar de gravar `user_roles.admin` no convite; revisar policies `clinics_admin` |
| `clinical_documents` insert | Validar `clinic_id = patient.clinic_id` no INSERT |

#### Produto e operação (bloqueante para piloto)

| Item | Ação mínima |
|------|-------------|
| Onboarding | Conectar `OnboardingChecklist` ao `/app` **ou** unificar com card existente |
| Relatórios | Corrigir `scale_code` → `scale_type`; adicionar `.eq("clinic_id")` explícito |
| Extra Flow | Confirmar schema em produção; tratar erro amigável se tabelas ausentes |
| Smoke tests manuais | Script de 15 passos cobrindo fluxo clínico completo (checklist GO LIVE abaixo) |

#### Mínimo de qualidade (recomendado forte)

| Item | Ação mínima |
|------|-------------|
| Testes | Pelo menos testes unitários em convite, recibos.functions, merge-tags |
| Monitoramento | Sentry ou equivalente já parcial (`lovable-error-reporting`) — validar em staging |

---

### 4. O que pode ficar para a versão 1.1?

| Área | Pode esperar |
|------|--------------|
| **Lazy loading / code splitting** | Performance aceitável em piloto pequeno |
| **Unificar wizard + form** de avaliação | Manter wizard como padrão; classic como fallback interno |
| **Merge dos dois dashboards** | `/app` operacional + `/app/dashboard-clinico` analítico |
| **Unificar Recibos** | Tab em Financeiro vs `/app/recibos` Extra Flow |
| **Seletor de clínica** | Usuários multi-clínica (schema suporta; UI não) |
| **Home Care / Marketing** | Módulos secundários; não bloqueiam prontuário core |
| **PDF dedicado para repasse de extras** | Reutilizar `receipt-pdf.ts` no Beta |
| **Camada `features/` no frontend** | Refactor arquitetural |
| **CSP / hardening XSS** | Beta fechado com clínicas confiáveis |
| **Alta automática de `situacao`** | Alta funciona; paciente não vira `inativo` automaticamente |
| **Reavaliação one-click** | Lista existe; iniciar reavaliação exige abrir prontuário |
| **Design system layout/** | Adoção gradual de `PageHeader`, `PageSection` |
| **Documentação interna** | Preencher docs após estabilizar Beta |

---

## Avaliação por módulo

| Módulo | Pronto Beta? | Classificação | Nota |
|--------|--------------|---------------|------|
| **Prontidão geral** | Condicional | **CRÍTICO** | Core sim; confiança não |
| **Cadastro** | Parcial | **CRÍTICO** | Invite-only OK; convite fisioterapeuta quebrado |
| **Onboarding** | Parcial | **ALTO** | Card no painel sim; checklist morto |
| **White Label** | Sim | **BAIXO** | Configurações + PDF + app shell maduros |
| **Agenda** | Sim | **BAIXO** | CRUD completo, tenant-scoped, modo suporte |
| **Pacientes** | Sim | **MÉDIO** | Prontuário rico; hook de clínica inconsistente na listagem |
| **Avaliação** | Sim | **MÉDIO** | Wizard 7 passos sólido; duplicidade wizard/form |
| **Evolução** | Sim | **BAIXO** | Form + listagem + PDF |
| **Reavaliação** | Sim | **MÉDIO** | Agenda de reavaliações + comparador; UX incompleta |
| **Alta** | Sim | **MÉDIO** | Panel + PDF + lock; não inativa paciente |
| **Biblioteca** | Sim | **BAIXO** | Conteúdo, favoritos, export PDF com branding |
| **PDFs** | Parcial | **ALTO** | Engine maduro; dual path legacy/moderno + RLS |
| **Financeiro** | Sim | **MÉDIO** | Lançamentos + recibos paciente OK |
| **Recibos Extra Flow** | Parcial | **ALTO** | UI pronta; schema/types incertos |
| **Relatórios** | Parcial | **ALTO** | CSV + tabs; filtros tenant frágeis + bug scales |
| **Dashboard** | Sim | **MÉDIO** | KPIs bons; naming duplicado |
| **Segurança** | Não | **CRÍTICO** | Ver auditoria de segurança |
| **Performance** | Parcial | **ALTO** | Funciona; não escala bem |
| **Escalabilidade** | Parcial | **ALTO** | RLS escala; frontend monolítico |
| **UX** | Parcial | **MÉDIO** | Fluxos existem; duplicações confundem |
| **Multi-tenant** | Parcial | **ALTO** | Backend maduro; client + legado inconsistentes |

---

## 5. Checklist GO LIVE (Beta fechado)

Use como gate antes de convidar clínicas piloto.

### A. Infraestrutura e ambiente

- [ ] **CRÍTICO** — Staging espelha produção (Supabase project, buckets, RLS aplicada)
- [ ] **CRÍTICO** — Variáveis `SUPABASE_*` e service role **somente server**
- [ ] **ALTO** — Backup automático Supabase configurado
- [ ] **ALTO** — Domínio + HTTPS + redirect URLs de convite (`/set-password`) corretos
- [ ] **MÉDIO** — Error reporting ativo em staging/prod

### B. Segurança (obrigatório)

- [ ] **CRÍTICO** — `public.documents` RLS fechada ou tabela deprecada
- [ ] **CRÍTICO** — Convite grava `clinic_members.role = "profissional"` (não `physiotherapist`)
- [ ] **CRÍTICO** — Convite **não** cria `user_roles.admin` global desnecessário
- [ ] **CRÍTICO** — Teste manual: usuário clínica A **não** lê paciente clínica B
- [ ] **ALTO** — Validação pública `/validar/{hash}` retorna só metadados LGPD
- [ ] **ALTO** — Modo suporte bloqueia escrita nas tabelas core (testar INSERT)

### C. Provisionamento e cadastro

- [ ] **CRÍTICO** — Clínica piloto provisionada (`provision_clinic` ou admin SaaS)
- [ ] **CRÍTICO** — Owner recebe convite e consegue definir senha em `/set-password`
- [ ] **CRÍTICO** — Owner convida fisioterapeuta — **membro aparece em Usuários**
- [ ] **ALTO** — Plano/trial ativo com módulos corretos (`usePlanFeatures`)
- [ ] **MÉDIO** — Super admin acessa SaaS; não vê dados clínicos sem modo suporte

### D. Onboarding da clínica piloto

- [ ] **ALTO** — Checklist visível (logo → profissional → paciente → avaliação)
- [ ] **ALTO** — White label: logo + cores refletem em PDF e sidebar
- [ ] **MÉDIO** — Primeiro paciente criado em < 5 minutos após login

### E. Fluxo clínico core (smoke test)

- [ ] **CRÍTICO** — Criar paciente
- [ ] **CRÍTICO** — Avaliação inicial (wizard) → finalizar/bloquear
- [ ] **CRÍTICO** — Evolução de sessão → salvar
- [ ] **CRÍTICO** — Emitir documento (PDF) → download + registro no prontuário
- [ ] **CRÍTICO** — QR/hash valida em `/validar/{hash}` (público)
- [ ] **ALTO** — Assinatura registrada no prontuário
- [ ] **ALTO** — Reavaliação aparece na lista de pendências
- [ ] **ALTO** — Alta registrada + PDF
- [ ] **MÉDIO** — Agenda: criar/editar/cancelar atendimento

### F. Financeiro e relatórios

- [ ] **ALTO** — Lançamento financeiro criado e listado
- [ ] **ALTO** — Recibo de paciente (Financeiro → Recibos) gera PDF
- [ ] **ALTO** — Extra Flow: confirmar schema; gerar recibo de pagamento (se piloto usar)
- [ ] **ALTO** — Relatório clínico carrega sem erro (escalas/riscos)
- [ ] **MÉDIO** — Export CSV de pacientes **só da clínica ativa**

### G. Performance e UX

- [ ] **ALTO** — First load aceitável em 4G (< 8s TTI em piloto)
- [ ] **ALTO** — `/app/pacientes/$id` abre sem travamento perceptível
- [ ] **MÉDIO** — Mobile: listagens usáveis (scroll horizontal aceitável)
- [ ] **MÉDIO** — Navegação clara: usuário sabe diferença Painel vs Indicadores

### H. Qualidade e operação

- [ ] **CRÍTICO** — Smoke test manual documentado e executado 1x
- [ ] **ALTO** — Pelo menos 1 teste automatizado em CI (`lint` + `build` mínimo)
- [ ] **ALTO** — Canal de suporte definido (WhatsApp/email + modo suporte treinado)
- [ ] **MÉDIO** — Termo de uso / LGPD básico apresentado ao piloto
- [ ] **MÉDIO** — Rollback plan (migration revert ou feature flag)

### I. GO / NO-GO final

| Critério | GO | NO-GO |
|----------|-----|-------|
| Todos os itens **CRÍTICO** de B, C, E | ✅ | ❌ |
| Convite fisioterapeuta funciona | ✅ | ❌ |
| Isolamento multi-tenant validado | ✅ | ❌ |
| Fluxo clínico E completo em staging | ✅ | ❌ |
| Clínica piloto treinada + suporte definido | ✅ | ❌ |

---

## Síntese por dimensão transversal

### Segurança — **CRÍTICO**
Backend multi-tenant bem desenhado, mas legado (`documents`, `admin` global) impede Beta confiável sem correção. Não lançar piloto antes dos itens de segurança do checklist.

### Performance — **ALTO**
Funcional para dezenas de usuários; jsPDF + recharts + rotas estáticas pesam o bundle. Aceitável em Beta fechado; planejar 1.1.

### Escalabilidade — **ALTO**
Postgres/RLS escala; frontend monolítico e queries inline não. SaaS admin em arquivo único (~1.500 linhas) limita evolução paralela.

### UX — **MÉDIO**
Experiência utilizável para fisioterapeuta experiente; duplicações (painéis, recibos, avaliação) aumentam curva de aprendizado. White label e prontuário são pontos fortes.

### Multi-tenant — **ALTO**
`useActiveClinic` é o modelo certo; implementação ainda inconsistente em algumas telas e no legado de roles/tabelas.

---

## Recomendação final

| Fase | Escopo | Prazo sugerido |
|------|--------|----------------|
| **Pré-Beta** | Corrigir 4 bloqueadores CRÍTICOS (convite, documents RLS, admin global, smoke test) | 1–2 semanas |
| **Beta fechado** | 1–3 clínicas, acompanhamento semanal, checklist GO LIVE | 4–8 semanas |
| **Beta ampliado** | Após 1.1 (UX dedup, performance, testes, relatórios) | pós-validação piloto |
| **V1.0 comercial** | Segurança auditada, testes CI, performance, docs | após Beta |

**Veredicto:** o FisioOS tem **produto clínico real e diferenciado** (prontuário estruturado, PDFs com validação, white label, multi-tenant no banco). **Não está pronto para Beta aberto hoje.** Com as correções obrigatórias de segurança e convite, **pode ir a Beta fechado** como piloto controlado — desde que expectativas de escopo e suporte estejam alinhadas com a clínica.

Nenhum arquivo foi modificado nesta análise.
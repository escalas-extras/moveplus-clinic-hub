Estou em **modo Ask** — não consigo gravar `docs/roadmap/PLANO-MESTRE.md`. Ative **Agent mode** e peça *“Grave o PLANO-MESTRE.md”* para persistir. Abaixo está o plano completo pronto para colar ou gravar.

**Fontes lidas:** `docs/backlog/BACKLOG-OFICIAL.md` (rascunho consolidado); `auditoria-clinica.md` (única auditoria persistida, 4,7 KB); demais `docs/auditorias/*.md` = 0 bytes no disco.

**Premissas do plano**
- Sprint = **2 semanas**, 1 dev full-time (+ founder para produto/jurídico quando indicado)
- **Neste ciclo:** só planejamento — sem implementação, sem migrations
- Itens que exigem migration (B-01, B-02, B-03, V1-19) dependem de **autorização explícita** conforme `ARCHITECTURE_FREEZE.md`

---

# PLANO MESTRE DE EXECUÇÃO — FisioOS

> **Documento:** `docs/roadmap/PLANO-MESTRE.md`  
> **Backlog:** `docs/backlog/BACKLOG-OFICIAL.md`  
> **Atualizado:** 2026-06-27  
> **Horizonte:** Beta → V1.0 → V1.1 → V2.0 (~18–24 meses)

## Mapa de marcos

| Marco | Sprint final | Duração acum. |
|---|---|---|
| **Beta fechado** | Sprint 4 | ~8 semanas |
| **V1.0 piloto** | Sprint 8 | ~16 semanas |
| **V1.1** | Sprint 14 | ~28 semanas |
| **V2.0** | Sprint 20+ | ~40+ semanas |

---

## FASE BETA — Sprints 1–4

### Sprint 1 — BI tenant-safe (bloqueador #1)

| Campo | Conteúdo |
|---|---|
| **Objetivo** | Eliminar vazamento cross-tenant em relatórios, dashboard clínico e KPIs |
| **Backlog** | B-05, B-06, B-07, B-17 |
| **Arquivos envolvidos** | `src/routes/_authenticated/app/relatorios.tsx`, `dashboard-clinico.tsx`, `diferenciais.tsx`, `src/lib/merge-tags.ts` (scale_code) |
| **Dependências** | Nenhuma |
| **Risco** | **Médio** — regressão em KPIs se filtros mal aplicados; validar com 2+ clínicas teste |
| **Critério de aceite** | Todas queries BI filtram `clinic_id`; distribuição de risco usa `scale_type`; KPIs diferenciais batem com contagem manual por clínica |
| **Tempo estimado** | **3–5 dias** |

---

### Sprint 2 — Segurança e convites

| Campo | Conteúdo |
|---|---|
| **Objetivo** | Fechar brechas de segurança e convites quebrados antes de dados reais no Beta |
| **Backlog** | B-01, B-02, B-03, B-04, B-08, V1-10 |
| **Arquivos envolvidos** | `supabase/migrations/*` (policies — **requer autorização freeze**), `src/lib/api/saas-admin.functions.ts`, `src/routes/_authenticated/app/usuarios.tsx`, `src/lib/pdf-engine.ts`, `src/lib/pdf.ts`, secrets Lovable (`SITE_URL`) |
| **Dependências** | Sprint 1 concluído; autorização explícita para migrations |
| **Risco** | **Alto** — migration em RLS/roles pode quebrar fluxos legados; rollback plan necessário |
| **Critério de aceite** | Security scan + linter limpos; convite profissional conclui signup; owner não recebe admin global; convites server-side e QR apontam URL produção; `public.documents` isolado |
| **Tempo estimado** | **5–8 dias** |

---

### Sprint 3 — Fundação engenharia e observabilidade

| Campo | Conteúdo |
|---|---|
| **Objetivo** | Pipeline mínimo de qualidade + visibilidade de erros + documentação dev |
| **Backlog** | B-09, B-10, B-11, B-12, B-13, B-14, B-18 (setup inicial) |
| **Arquivos envolvidos** | `.env.example`, `README.md`, `.github/workflows/ci.yml` (novo), config Sentry, `docs/auditorias/*.md`, `package.json` (script test placeholder), `src/routes/__root.tsx` (error boundary já existe) |
| **Dependências** | Sprint 2 concluído; conta Sentry; repo GitHub |
| **Risco** | **Médio** — CI pode falhar em Nitro beta; ajuste de workflow |
| **Critério de aceite** | CI lint+build verde em PR; Sentry captura erro teste; README + `.env.example` permitem `npm install && npm run dev`; auditorias commitadas no git |
| **Tempo estimado** | **5–7 dias** |

---

### Sprint 4 — Gate Beta (staging, legal, smoke)

| Campo | Conteúdo |
|---|---|
| **Objetivo** | Ambiente de homologação + checklist legal + smoke test documentado → **Beta fechado liberado** |
| **Backlog** | B-15, B-16, B-18 (smoke manual), V1-14 |
| **Arquivos envolvidos** | `docs/runbooks/smoke-test-beta.md` (novo), `GO-LIVE-V1.md` (referência), config Supabase staging, `docs/legal/` (termo LGPD — externo) |
| **Dependências** | Sprint 3; jurídico (B-16); projeto Supabase staging |
| **Risco** | **Alto** — staging divergente de prod; schema Extra Flow incerto |
| **Critério de aceite** | Staging espelha prod; termo LGPD assinado; smoke test 15 passos documentado e executado 1×; 1–3 clínicas convidadas identificadas |
| **Tempo estimado** | **8–10 dias** |

**🎯 MARCO BETA** — Critério global: Fase 1 BACKLOG 100% + smoke verde + zero item CRÍTICO aberto.

---

## FASE V1.0 — Sprints 5–8

### Sprint 5 — UX piloto e honestidade de produto

| Campo | Conteúdo |
|---|---|
| **Objetivo** | Reduzir fricção clínica nova e alinhar expectativa de módulos imaturos |
| **Backlog** | V1-01, V1-05, V1-06, V1-16, V1-20 |
| **Arquivos envolvidos** | `src/components/onboarding-checklist.tsx`, `src/routes/_authenticated/app/index.tsx`, `src/lib/plan-features.ts`, `src/components/app-shell.tsx`, `src/components/logo-uploader.tsx`, docs raiz (Move+→FisioOS) |
| **Dependências** | Marco Beta |
| **Risco** | **Baixo** |
| **Critério de aceite** | Checklist onboarding visível no `/app`; Marketing/Home Care/Recibos Extra com badge Beta ou ocultos; gate `inteligencia_clinica` funcional; upload logo restringe PNG/JPG |
| **Tempo estimado** | **4–5 dias** |

---

### Sprint 6 — Fluxo clínico core

| Campo | Conteúdo |
|---|---|
| **Objetivo** | Completar avaliação inteligível e reavaliação básica para demo piloto |
| **Backlog** | V1-03, V1-25, V1-24, V1-02 |
| **Arquivos envolvidos** | `src/components/assessment-wizard.tsx`, `src/components/clinical/signature-pad.tsx`, `src/lib/clinical-profiles.ts`, `src/routes/_authenticated/app/dashboard-clinico.tsx`, `src/routes/_authenticated/app/index.tsx` |
| **Dependências** | Sprint 5 |
| **Risco** | **Médio** — wizard grande (~970 linhas); regressão auto-save |
| **Critério de aceite** | Passo assinaturas funcional ou removido com redirect claro; objetivos sugeridos inseríveis; intervalo reavaliação lê catálogo; dashboards renomeados (Operacional vs Indicadores) |
| **Tempo estimado** | **6–8 dias** |

---

### Sprint 7 — Financeiro, PDFs e ops piloto

| Campo | Conteúdo |
|---|---|
| **Objetivo** | Estabilizar recibos, mitigar PDF lote, documentar operação |
| **Backlog** | V1-07 (decisão), V1-08, V1-11, V1-12, V1-15, V1-21 |
| **Arquivos envolvidos** | `src/routes/_authenticated/app/financeiro.tsx`, `recibos.tsx`, `src/lib/recibos.functions.ts`, `src/lib/receipt-pdf.ts`, `src/integrations/supabase/types.ts`, `docs/faq-piloto.md` (novo), integração Sentry client |
| **Dependências** | Sprint 4 staging; decisão produto V1-07 (ocultar Extra Flow no V1.0 ou documentar) |
| **Risco** | **Alto** — schema Extra Flow vs prod; lote PDF client-side |
| **Critério de aceite** | Decisão recibos documentada em `DECISOES.md`; types gerados ou mappers validados em staging; FAQ piloto ≥20 perguntas; erros Supabase chegam ao Sentry; baseline slow_queries registrada |
| **Tempo estimado** | **7–9 dias** |

---

### Sprint 8 — Go-live piloto (treinamento + hardening final)

| Campo | Conteúdo |
|---|---|
| **Objetivo** | Executar GO-LIVE §2–3 e fechar últimos bloqueadores → **V1.0 piloto** |
| **Backlog** | V1-17, V1-18, V1-19, V1-13, V1-22, V1-23 (runbook) |
| **Arquivos envolvidos** | `docs/arquitetura/ARQUITETURA.md`, `docs/decisoes/DECISOES.md`, `GO-LIVE-V1.md`, `src/lib/api/saas-admin.functions.ts`, policies `audit_log`, `docs/runbooks/provision-clinica.md` (novo) |
| **Dependências** | Sprints 5–7; migration autorizada para V1-19 |
| **Risco** | **Médio** — restore drill pode revelar gaps DR |
| **Critério de aceite** | GO-LIVE §9 sem bloqueadores; treinamento admin 2h + fisio 3h executados; fluxo paciente→avaliação→evolução→PDF→QR validado por clínica piloto; restore drill documentado; runbook provisionamento SaaS |
| **Tempo estimado** | **8–10 dias** |

**🎯 MARCO V1.0** — 1–10 clínicas piloto operando 30 dias supervisionados.

---

## FASE V1.1 — Sprints 9–14

### Sprint 9 — Performance e paginação

| Campo | Conteúdo |
|---|---|
| **Objetivo** | Preparar escala dentro da clínica (500+ pacientes) |
| **Backlog** | V1-26, M-21, M-22 |
| **Arquivos envolvidos** | `pacientes/index.tsx`, `avaliacoes.tsx`, `evolucoes.tsx`, `vite.config.ts` (lazy routes), `src/routeTree.gen.ts` |
| **Dependências** | Marco V1.0 |
| **Risco** | **Médio** — UX paginação vs busca |
| **Critério de aceite** | Listas paginadas server-side; TTI mobile melhora mensurável; clínica com 200+ pacientes usável |
| **Tempo estimado** | **5–7 dias** |

---

### Sprint 10 — Inteligência clínica v2

| Campo | Conteúdo |
|---|---|
| **Objetivo** | Conectar catálogos SQL e enriquecer reavaliação |
| **Backlog** | M-08, M-05, M-07, V1-04 (início deprecação form clássico) |
| **Arquivos envolvidos** | `clinical-profiles.ts`, `assessment-wizard.tsx`, `reassessment-comparator.tsx`, `scales-panel.tsx`, `goniometry-panel.tsx`, `mrc-panel.tsx`, migrations catálogo (autorização) |
| **Dependências** | Sprint 9 |
| **Risco** | **Médio** — catálogos seed-only hoje |
| **Critério de aceite** | Objetivos/escalas sugeridos por diagnóstico; comparador inclui ≥3 escalas; one-click reavaliação na lista |
| **Tempo estimado** | **7–9 dias** |

---

### Sprint 11 — PDF, documentos e LGPD UI

| Campo | Conteúdo |
|---|---|
| **Objetivo** | White label PDF + auditoria clínica vendável |
| **Backlog** | M-14, M-17, M-12, M-13 |
| **Arquivos envolvidos** | `pdf-engine.ts`, `pdf.ts`, `pdf-builders.ts`, `documentos.tsx`, nova rota `auditoria.tsx`, policies audit |
| **Dependências** | Sprint 10; V1-19 resolvido |
| **Risco** | **Alto** — volume audit_log; UI diff complexa |
| **Critério de aceite** | PDF usa `primary_color` clínica; `/app/auditoria` filtra por tabela/usuário/período; preview diff básico |
| **Tempo estimado** | **8–10 dias** |

---

### Sprint 12 — Refatoração financeiro + testes

| Campo | Conteúdo |
|---|---|
| **Objetivo** | Unificar recibos e estabelecer rede de segurança automatizada |
| **Backlog** | M-02, M-03, M-04, M-24, M-44 |
| **Arquivos envolvidos** | `financeiro.tsx`, `recibos.tsx`, `recibos.functions.ts`, `receipt-pdf.ts`, `.github/workflows/ci.yml`, `tests/` ou `e2e/`, staging config |
| **Dependências** | Sprint 7 decisão V1-07; Sprint 4 staging |
| **Risco** | **Alto** — refactor financeiro toca fluxo crítico |
| **Critério de aceite** | Um fluxo canônico de recibo documentado; smoke E2E verde no CI; PR bloqueado se build falhar |
| **Tempo estimado** | **10–12 dias** |

---

### Sprint 13 — Comercial consultivo + notificações

| Campo | Conteúdo |
|---|---|
| **Objetivo** | Reduzir dependência do founder (trial, landing, reavaliações) |
| **Backlog** | M-33, M-34, M-06, M-35 |
| **Arquivos envolvidos** | nova landing (rota pública ou site externo), `saas-admin.functions.ts`, `provision_clinic` RPC, Edge/cron notificações, `docs/comercial/` |
| **Dependências** | Sprint 12; B-08 domínio estável |
| **Risco** | **Alto** — trial semi-auto sem billing; cron infra |
| **Critério de aceite** | Landing + pricing publicados; super_admin provisiona trial em <5 min; e-mail reavaliação vencida (ou in-app); playbook CS |
| **Tempo estimado** | **10–12 dias** |

---

### Sprint 14 — Polish V1.1 (docs, home care, marketing)

| Campo | Conteúdo |
|---|---|
| **Objetivo** | Entregar promessas de módulos Beta e documentação self-service |
| **Backlog** | M-01, M-25, M-31, M-32, M-11 (MVP WYSIWYG ou adiar) |
| **Arquivos envolvidos** | `assessment-wizard.tsx`, `assessment-form.tsx` (remover), `home-care.tsx`, `marketing.tsx`, `biblioteca.tsx`, `docs/manual-usuario/` |
| **Dependências** | Sprints 9–13 |
| **Risco** | **Médio** — escopo WYSIWYG pode estourar sprint |
| **Critério de aceite** | Wizard único canônico; manual PDF + 5 vídeos; Home Care checklist MVP ou módulo removido do menu; marketing integrado à biblioteca |
| **Tempo estimado** | **10–14 dias** |

**🎯 MARCO V1.1** — NPS piloto >40; suporte <2h/semana/clínica; 30% trial→paid (se trial ativo).

---

## FASE V2.0 — Sprints 15–20+

### Sprint 15 — Billing e PLG foundation

| Campo | Conteúdo |
|---|---|
| **Objetivo** | Receita recorrente automatizada |
| **Backlog** | F-01, F-02 (fase 1: checkout + webhook) |
| **Arquivos envolvidos** | novo módulo billing, webhooks server fn, `clinic_plans`, Stripe/MP SDK, landing signup |
| **Dependências** | Marco V1.1; M-33 |
| **Risco** | **Crítico** — PCI/compliance; falhas de cobrança |
| **Critério de aceite** | Checkout funcional; webhook atualiza `clinic_plans`; fatura acessível in-app |
| **Tempo estimado** | **3–4 semanas** |

---

### Sprint 16 — Filas e PDF worker

| Campo | Conteúdo |
|---|---|
| **Objetivo** | Desacoplar trabalho pesado do browser |
| **Backlog** | F-04, F-05, F-06 |
| **Arquivos envolvidos** | Cloudflare Queues ou Edge worker, `pdf-engine.ts` (server adapter), `recibos.tsx` (delegar lote) |
| **Dependências** | Sprint 15 |
| **Risco** | **Crítico** — nova infra; paridade visual PDF server vs client |
| **Critério de aceite** | Lote 50 recibos sem freeze; fila com retry; cache CDN PDFs imutáveis |
| **Tempo estimado** | **3–4 semanas** |

---

### Sprint 17 — BI avançado e escala DB

| Campo | Conteúdo |
|---|---|
| **Objetivo** | Suportar 100+ clínicas com BI confiável |
| **Backlog** | F-09, F-07, F-08, M-23 |
| **Arquivos envolvidos** | migrations materialized views, `relatorios.tsx`, `dashboard-clinico.tsx`, FTS search |
| **Dependências** | Sprint 16; autorização migrations |
| **Risco** | **Alto** — refresh views; custo compute |
| **Critério de aceite** | Relatórios <3s p95; drill-down por profissional/diagnóstico; archival audit >12 meses |
| **Tempo estimado** | **3 semanas** |

---

### Sprint 18 — CDS avançado (red flags + NLP eval)

| Campo | Conteúdo |
|---|---|
| **Objetivo** | Diferenciação clínica real vs concorrentes |
| **Backlog** | F-10, F-11, F-12, M-09 |
| **Arquivos envolvidos** | rules engine v2, `assessment-wizard.tsx`, alertas painel, integração LLM (eval) |
| **Dependências** | Sprint 10 M-08 |
| **Risco** | **Crítico** — responsabilidade clínica; alucinação LLM |
| **Critério de aceite** | ≥5 red flags rule-based; comparador MCID Berg/Tinetti; LLM só assistivo (human-in-the-loop) |
| **Tempo estimado** | **4 semanas** |

---

### Sprint 19 — Enterprise e integrações

| Campo | Conteúdo |
|---|---|
| **Objetivo** | Tier Enterprise vendável |
| **Backlog** | F-18, F-13, F-19, F-03, M-42 |
| **Arquivos envolvidos** | DNS custom, API keys, webhooks, MFA admin, domínio white label login |
| **Dependências** | Sprint 15 billing |
| **Risco** | **Alto** — complexidade enterprise |
| **Critério de aceite** | Clínica Enterprise com subdomínio; API v1 documentada; dunning automático; 2FA admin |
| **Tempo estimado** | **4 semanas** |

---

### Sprint 20 — Home Care + Mobile + GTM

| Campo | Conteúdo |
|---|---|
| **Objetivo** | Módulos premium + aquisição inbound |
| **Backlog** | F-16, F-15, F-17, F-28 |
| **Arquivos envolvidos** | `home-care.tsx`, PWA/offline, app RN eval, site marketing, cases |
| **Dependências** | Sprints 14, 19 |
| **Risco** | **Alto** — escopo mobile nativo |
| **Critério de aceite** | Home Care checklist + PDF familiar; PWA offline avaliação; 3 case studies publicados |
| **Tempo estimado** | **4–6 semanas** |

**🎯 MARCO V2.0** — 100 clientes pagantes; MRR recorrente; infra 1k clínicas viável.

---

## Visão timeline

```
S1-S4   [████████] Beta
S5-S8   [████████] V1.0 piloto
S9-S14  [████████████] V1.1
S15-S20+[████████████████████] V2.0
```

| Sprint | Marco | Tempo acum. |
|---|---|---|
| 1–4 | Beta | ~8 sem |
| 5–8 | V1.0 | ~16 sem |
| 9–14 | V1.1 | ~28 sem |
| 15–20+ | V2.0 | ~40–48 sem |

---

## Riscos transversais

| Risco | Sprints afetados | Mitigação |
|---|---|---|
| `ARCHITECTURE_FREEZE` bloqueia migrations | 2, 8, 11, 17 | Autorização prévia por item |
| Schema Extra Flow ≠ prod | 4, 7, 12 | Validar em staging Sprint 4 |
| Auditorias não persistidas | 3 | Commit `docs/auditorias/` Sprint 3 |
| Founder bottleneck suporte | 4–14 | FAQ Sprint 7; manual Sprint 14 |
| Nitro 3 beta instável | 3, 12 | Pin version; CI gate |

---

## Checklist executivo por marco

**Beta:** B-01–B-18 ✓ · smoke ✓ · LGPD ✓ · Sentry ✓ · CI ✓  
**V1.0:** V1-01–V1-27 críticos ✓ · GO-LIVE §9 ✓ · treinamento ✓  
**V1.1:** M-01–M-45 prioritários ✓ · E2E CI ✓ · landing ✓  
**V2.0:** F-01–F-03 ✓ · filas ✓ · 100 clientes ✓

---

Para **gravar** este conteúdo em `docs/roadmap/PLANO-MESTRE.md`, alterne para **Agent mode**. Também recomendo **persistir** o `BACKLOG-OFICIAL.md` completo (hoje contém rascunho parcial) e salvar as auditorias do editor no git.
Estou em **modo Ask** — não consigo gravar arquivos. Para persistir automaticamente em `docs/backlog/BACKLOG-OFICIAL.md`, **alterne para Agent mode** e peça para aplicar o backlog.

Abaixo está o conteúdo completo pronto para colar ou para o agente gravar.

---

**Nota sobre fontes:** no disco, só `auditoria-clinica.md` (4,7 KB) está persistido; os outros 19 arquivos em `docs/auditorias/` têm 0 bytes. O backlog consolida esse arquivo + auditorias READ ONLY da sessão + `GO-LIVE-V1.md`, `BACKLOG-POS-V1.md` e `ARCHITECTURE_FREEZE.md`.

---

# BACKLOG OFICIAL — FisioOS

> Consolidado a partir de `docs/auditorias/*`, `GO-LIVE-V1.md`, `BACKLOG-POS-V1.md` e `ARCHITECTURE_FREEZE.md`.  
> **Atualizado:** 2026-06-27  
> **Escopo:** planejamento apenas — sem implementação, sem migrations neste ciclo.

**Legenda:** Prioridade = CRÍTICO · ALTO · MÉDIO · BAIXO | Esforço = Baixo · Médio · Alto

---

## FASE 1 — Obrigatório antes do Beta

| ID | Módulo | Problema | Prioridade | Impacto | Esforço | Dependências |
|---|---|---|---|---|---|---|
| B-01 | Segurança | RLS aberta em `public.documents` (legado) | CRÍTICO | Vazamento de dados; LGPD | Médio | Revisão policies |
| B-02 | Segurança | Convite grava `physiotherapist` vs CHECK `"profissional"` | CRÍTICO | Convite quebrado | Baixo | — |
| B-03 | Segurança | Convite concede `user_roles.admin` global | CRÍTICO | Escalação cross-tenant | Médio | B-02 |
| B-04 | Segurança | Security scan + linter Supabase pendentes | CRÍTICO | Vulnerabilidades ocultas | Baixo | Dashboard Supabase |
| B-05 | Relatórios | Queries sem `clinic_id` | CRÍTICO | BI cross-tenant | Baixo | — |
| B-06 | Relatórios | `scale_code` vs `scale_type` | CRÍTICO | KPIs de risco quebrados | Baixo | — |
| B-07 | Dashboard | Indicadores sem filtro tenant | ALTO | Gráficos cross-tenant | Baixo | — |
| B-08 | Infra | `SITE_URL` / QR apontam domínio errado | ALTO | Convites e validação quebrados | Baixo | Secrets Lovable |
| B-09 | Infra | Sem `.env.example` | CRÍTICO | Onboarding opaco | Baixo | — |
| B-10 | Infra | Sem CI/CD (lint + build) | CRÍTICO | Regressões em prod | Médio | GitHub |
| B-11 | Observabilidade | Sem Sentry/APM | CRÍTICO | MTTR alto | Médio | Conta observabilidade |
| B-12 | Observabilidade | Monitoramento manual; sem uptime | CRÍTICO | Incidentes silenciosos | Médio | B-11 |
| B-13 | Documentação | Sem README / guia instalação | CRÍTICO | Beta depende do founder | Baixo | — |
| B-14 | Documentação | Auditorias não commitadas (0 bytes) | ALTO | Perda de governança | Baixo | Salvar editor |
| B-15 | Infra | Sem staging/homologação | CRÍTICO | Beta em prod direto | Alto | Supabase staging |
| B-16 | Legal | Termo LGPD pendente | CRÍTICO | Bloqueio legal | Baixo | Jurídico |
| B-17 | Home Care / KPIs | Visitas sem filtro `clinic_id` em diferenciais | ALTO | KPIs incorretos | Baixo | — |
| B-18 | Testes | Zero testes automatizados | ALTO | Regressões silenciosas | Médio | B-10 |

**Saída Fase 1:** scan limpo; BI tenant-safe; convites OK; CI + Sentry; README; LGPD assinado.

---

## FASE 2 — Obrigatório antes da V1.0

| ID | Módulo | Problema | Prioridade | Impacto | Esforço | Dependências |
|---|---|---|---|---|---|---|
| V1-01 | Onboarding | `OnboardingChecklist` não renderizado | ALTO | Time-to-value alto | Baixo | — |
| V1-02 | Dashboard | Dois “Painel Clínico” sobrepostos | ALTO | Confusão UX | Médio | — |
| V1-03 | Avaliação | Passo Assinaturas do wizard = placeholder | ALTO | Fluxo incompleto | Médio | — |
| V1-04 | Avaliação | Wizard + form clássico duplicados | MÉDIO | Curva duplicada | Alto | — |
| V1-05 | SaaS | Gate `inteligencia_clinica` ausente | ALTO | Plano não honrado | Baixo | — |
| V1-06 | Produto | Marketing/Home Care visíveis sem Beta | ALTO | Expectativa falsa | Baixo | — |
| V1-07 | Financeiro | Dois domínios recibo (financeiro vs recibos) | CRÍTICO | Confusão operacional | Médio | Decisão produto |
| V1-08 | Financeiro | Extra Flow sem types Supabase | ALTO | Runtime errors | Médio | Schema prod |
| V1-09 | Financeiro | Extra Flow sem migration versionada | ALTO | Deploy inconsistente | Médio | B-15 |
| V1-10 | PDFs | QR fallback `fisioos.app` | ALTO | Validação errada | Baixo | B-08 |
| V1-11 | PDFs | Lote client-side sequencial | ALTO | Tab freeze | Médio | — |
| V1-12 | Ops | Baseline slow_queries ausente | MÉDIO | Sem referência perf | Baixo | — |
| V1-13 | Ops | Restore não testado | ALTO | DR teórico | Médio | B-15 |
| V1-14 | Ops | Smoke test não documentado | ALTO | Go-live ad hoc | Médio | B-10 |
| V1-15 | Documentação | FAQ/mínimo ausente para piloto | ALTO | Suporte 100% humano | Médio | — |
| V1-16 | Documentação | Move+ vs FisioOS inconsistente | MÉDIO | Confusão marca | Baixo | B-13 |
| V1-17 | Documentação | ARQUITETURA/ROADMAP/DECISOES vazios | ALTO | Decisões perdidas | Médio | B-14 |
| V1-18 | Treinamento | GO-LIVE §2–3 não executado | ALTO | Adoção lenta | Baixo | V1-01, V1-15 |
| V1-19 | Segurança | `audit_log` read global admin | ALTO | Audit cross-tenant | Médio | B-01 |
| V1-20 | Segurança | Logo SVG (XSS) | MÉDIO | Vetor ataque | Baixo | — |
| V1-21 | Observabilidade | Erros client só toast | ALTO | Bugs invisíveis | Médio | B-11 |
| V1-22 | Observabilidade | `saas_audit_log` best-effort | MÉDIO | Trilha incompleta | Baixo | — |
| V1-23 | Admin SaaS | Provision manual only | ALTO | Não escala | Médio | Runbook |
| V1-24 | Reavaliação | Ignora `default_reassessment_days` | MÉDIO | Intervalo errado | Baixo | — |
| V1-25 | Inteligência | Objetivos sugeridos read-only | ALTO | Demo fraco | Médio | — |
| V1-26 | Pacientes | Sem paginação server-side | ALTO | Lentidão 500+ | Médio | — |
| V1-27 | Auth | Google Auth pendente | MÉDIO | Fricção login | Médio | Supabase Auth |

**Saída Fase 2:** GO-LIVE §9 OK; fluxo paciente→PDF→QR; treinamento piloto; onboarding visível.

---

## FASE 3 — Melhorias V1.1

88 itens totais — principais:

| ID | Módulo | Problema | Prioridade | Esforço | Dependências |
|---|---|---|---|---|---|
| M-01 | Refatoração | Unificar fluxo avaliação | ALTO | Alto | V1-03, V1-04 |
| M-02 | Financeiro | Unificar recibos | CRÍTICO | Alto | V1-07–09 |
| M-05 | Reavaliação | Comparador sem escalas/MRC | ALTO | Médio | — |
| M-06 | Reavaliação | Sem notificações cron | ALTO | Médio | Infra jobs |
| M-08 | Inteligência | Conectar catálogos SQL | ALTO | Médio | V1-25 |
| M-11 | Documentos | WYSIWYG templates | ALTO | Alto | — |
| M-14 | PDFs | Cores tenant no pdf-engine | ALTO | Baixo | — |
| M-17 | LGPD | `/app/auditoria` clínica | ALTO | Alto | V1-19 |
| M-21 | Performance | Paginação listas | ALTO | Médio | V1-26 |
| M-24 | Testes | Smoke E2E + unit mínimo | ALTO | Alto | B-10 |
| M-25 | Documentação | Manual + vídeos | ALTO | Alto | V1-15 |
| M-31 | Home Care | Checklist prometido ausente | ALTO | Alto | — |
| M-33 | Comercial | Landing + pricing | ALTO | Alto | B-08 |
| M-34 | Comercial | Trial semi-auto | ALTO | Alto | V1-23 |
| M-44 | Infra | Staging + smoke por PR | ALTO | Alto | B-15 |

*(Itens M-03 a M-43 e M-45 listados na versão completa — ver Agent mode para arquivo integral.)*

---

## FASE 4 — Futuro V2.0

| ID | Módulo | Problema | Prioridade | Esforço | Dependências |
|---|---|---|---|---|---|
| F-01 | Comercial | Billing Stripe/MP | CRÍTICO | Alto | M-33 |
| F-02 | Comercial | Signup + trial + paywall | CRÍTICO | Alto | F-01 |
| F-04 | Escalabilidade | Filas/workers async | CRÍTICO | Alto | — |
| F-05 | PDFs | Worker server-side | CRÍTICO | Alto | F-04 |
| F-10 | Inteligência | Alertas red flags | CRÍTICO | Alto | M-08 |
| F-09 | BI | Materialized views | ALTO | Alto | B-05 |
| F-16 | Home Care | Módulo completo | ALTO | Alto | M-31 |
| F-18 | White Label | Domínio custom | MÉDIO | Alto | M-40 |

---

## Ordem de execução

1. **Fase 1:** B-05→B-07→B-17 → B-01→B-04 → B-08→B-12 → B-13→B-16  
2. **Fase 2:** V1-01→V1-06 → V1-03→V1-25 → V1-07→V1-08  
3. **Fase 3:** tracks Clínico / Produto / Eng em paralelo  
4. **Fase 4:** F-01→F-03 → F-04→F-06 → F-10  

**Fora de escopo neste ciclo:** migrations, alterações de banco, implementação.

---

Para gravar o arquivo completo (~88 itens em tabelas) em `docs/backlog/BACKLOG-OFICIAL.md`, **ative Agent mode** e diga: *“Grave o BACKLOG-OFICIAL.md”*.
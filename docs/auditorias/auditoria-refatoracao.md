# Consolidação de Auditorias — FisioOS

**Modo READ ONLY.** Nenhum arquivo foi alterado.

## Fontes e limitação

| Fonte | Status no disco |
|---|---|
| `docs/auditorias/auditoria-clinica.md` | **4,7 KB** — único arquivo persistido |
| Demais 19 arquivos em `docs/auditorias/` | **0 bytes** (conteúdo só no editor, não versionado) |
| Raiz: `GO-LIVE-V1.md`, `BACKLOG-POS-V1.md`, `ARCHITECTURE_FREEZE.md` | Completos |
| Auditorias da sessão anterior | Documentação, IA clínica, escalabilidade, observabilidade, deploy, comercial, produto final |

**Total consolidado:** ~20 auditorias temáticas deduplicadas em **23 itens únicos** agrupados por módulo.

---

## Inventário de achados por módulo

Legenda de esforço: **B** = Baixo (horas–1 dia) · **M** = Médio (2–5 dias) · **A** = Alto (1–3 semanas)

---

### Segurança & Compliance

| Sev. | Problema | Impacto | Benefício da correção | Esforço |
|---|---|---|---|---|
| **CRÍTICO** | RLS aberta em `public.documents` (legado: `USING(true)`) | Qualquer usuário autenticado lê/escreve documentos legados | Isolamento de dados clínicos; conformidade LGPD | **M** |
| **CRÍTICO** | Convite de profissional grava role `physiotherapist` vs CHECK `"profissional"` | Convite quebra; onboarding de equipe falha | Equipe entra sem intervenção manual | **B** |
| **CRÍTICO** | Convite pode conceder `user_roles.admin` global | Escalação de privilégio cross-tenant | Confiança B2B e auditoria | **M** |
| **CRÍTICO** | Security scan e linter Supabase pendentes (GO-LIVE §1.3) | Vulnerabilidades não mapeadas antes do piloto | Go-live com evidência | **B** |
| **ALTO** | `audit_log` leitura via `has_role(...,'admin')` global, não por clínica | Admin de uma clínica pode ver audit de outras | LGPD + isolamento tenant | **M** |
| **ALTO** | Termo LGPD / contrato piloto externo pendente | Bloqueio legal comercial | Venda formal | **B** (jurídico) |
| **MÉDIO** | Upload logo aceita SVG (risco XSS) | Vetor de ataque em branding | Hardening produção | **B** |
| **BAIXO** | 2FA, auditoria de login, senha forte por tenant | Ausentes (backlog) | Segurança enterprise | **A** (V1.1+) |

---

### Infraestrutura & Deploy

| Sev. | Problema | Impacto | Benefício | Esforço |
|---|---|---|---|---|
| **CRÍTICO** | Sem CI/CD / GitHub Actions | Deploy sem gate de qualidade | Build quebrado não chega a prod | **M** |
| **CRÍTICO** | Sem ambiente de homologação/staging | Beta testa direto em prod | Reduz incidentes | **A** |
| **CRÍTICO** | Sem `.env.example`; vars inferíveis só no código | Onboarding/deploy opaco | Dev e ops autônomos | **B** |
| **CRÍTICO** | Logs sem agregador (Sentry/Logtail) | MTTR alto em incidentes | Debug em minutos, não horas | **M** |
| **ALTO** | Deploy acoplado à Lovable Cloud; sem `npm run deploy` | Vendor lock-in; rollback opaco | Portabilidade | **A** |
| **ALTO** | `SITE_URL` default `https://fisioos.app` ≠ prod `moveplus-clinic-hub.lovable.app` | Convites server-side e QR errados | Links funcionais | **B** |
| **ALTO** | Rollback frontend não documentado; migrations forward-only | Incidente prolongado | Recuperação rápida | **M** |
| **ALTO** | Restore DB documentado mas sem drill testado | RTO teórico | DR confiável | **M** |
| **MÉDIO** | Nitro 3 beta em produção | Risco de instabilidade | Stack estável | **M** |
| **MÉDIO** | Backup Storage (PDFs/logos) não documentado separado do DB | Perda de arquivos em DR | Continuidade | **M** |
| **BAIXO** | Domínio custom + SSL pendente | Marca fraca | Profissionalismo comercial | **M** |

---

### Observabilidade & Operação

| Sev. | Problema | Impacto | Benefício | Esforço |
|---|---|---|---|---|
| **CRÍTICO** | Monitoramento 100% manual (GO-LIVE §5.2) | Falhas descobertas pelo cliente | Uptime previsível | **M** |
| **CRÍTICO** | Sem alertas infra (uptime, error rate, latência) | Incidentes silenciosos | SLA operacional | **M** |
| **ALTO** | Erros client Supabase só em toast, sem telemetria | Bugs invisíveis | Qualidade contínua | **M** |
| **ALTO** | Sem correlation ID / logs estruturados | Debug distribuído impossível | Rastreio ponta a ponta | **M** |
| **ALTO** | `saas_audit_log` best-effort (falha silenciosa) | Ops SaaS sem trilha | Auditoria confiável | **B** |
| **MÉDIO** | 3 trilhas de audit desconectadas (DB / wizard / SaaS) | Investigação fragmentada | Visão unificada | **A** |
| **MÉDIO** | `ip_address` em audit não populado | Forense incompleta | Compliance | **B** |
| **BAIXO** | Modo Suporte maduro (sessão, banner, guard, audit) | — | Diferencial ops | ✅ pronto |

---

### Documentação & DevEx

| Sev. | Problema | Impacto | Benefício | Esforço |
|---|---|---|---|---|
| **CRÍTICO** | Sem README raiz | Ninguém entende o projeto | Onboarding dev | **B** |
| **CRÍTICO** | Sem guia instalação local / primeiro dia dev | Dependência do founder | Escala de equipe | **M** |
| **CRÍTICO** | `docs/` ~85% vazio; auditorias não commitadas | Conhecimento perdido | Governança | **M** |
| **ALTO** | `ARQUITETURA.md`, `ROADMAP.md`, `DECISOES.md` vazios | Decisões não rastreáveis | Alinhamento | **M** |
| **ALTO** | Inconsistência Move+ vs FisioOS nos docs | Confusão operacional | Marca única | **B** |
| **ALTO** | Sem CHANGELOG / releases | Sem rastreabilidade | Release management | **B** |
| **ALTO** | API/server functions sem inventário | Integrações ad hoc | Manutenção | **M** |
| **MÉDIO** | Manual usuário / FAQ / vídeos ausentes | Suporte 100% humano | Escala CS | **A** |
| **MÉDIO** | Runbooks só em GO-LIVE (parcial) | Ops dependente de memória | Operação autônoma | **M** |

---

### SaaS & Comercial

| Sev. | Problema | Impacto | Benefício | Esforço |
|---|---|---|---|---|
| **CRÍTICO** | Zero billing SaaS (Stripe/MP) | Receita manual only | MRR previsível | **A** |
| **CRÍTICO** | Onboarding comercial inexistente (sem signup/trial self-serve) | CAC alto; founder obrigatório | PLG | **A** |
| **ALTO** | `OnboardingChecklist` implementado mas não renderizado | Time-to-value alto | Ativação | **B** |
| **ALTO** | Provisionamento só via super_admin | Não escala vendas | Self-serve | **M** |
| **ALTO** | Sem landing/pricing público; `/` → login | Zero inbound | Aquisição | **A** |
| **ALTO** | Retenção: sem dunning, NPS, churn analytics | Churn silencioso | LTV | **A** |
| **MÉDIO** | Trial schema pronto, fluxo manual | Conversão baixa | Trial→paid | **M** |
| **MÉDIO** | Marketing promete “IA clínica” acima da entrega | Expectativa vs realidade | Confiança | **B** (posicionamento) |
| **BAIXO** | Planos seed + limites DB + admin SaaS | Base sólida | Monetização | ✅ pronto |

---

### Dashboard

| Sev. | Problema | Impacto | Benefício | Esforço |
|---|---|---|---|---|
| **ALTO** | Dois painéis “Painel Clínico” (`/app` vs `/app/dashboard-clinico`) | Confusão UX | Clareza | **M** |
| **ALTO** | Indicadores clínicos sem filtro `clinic_id` em escalas/objetivos | Vazamento cross-tenant | Segurança BI | **B** |
| **MÉDIO** | Onboarding checklist não integrado ao painel | Clínica nova perdida | Ativação | **B** |
| **BAIXO** | KPIs operacionais ricos (agenda, reavaliações, rascunhos) | — | Valor diário | ✅ ~78% |

---

### Agenda

| Sev. | Problema | Impacto | Benefício | Esforço |
|---|---|---|---|---|
| **MÉDIO** | Sem lembretes e-mail/WhatsApp | Faltas | Adesão | **M** |
| **MÉDIO** | Sem vínculo automático agenda → evolução | Retrabalho | Fluxo contínuo | **M** |
| **BAIXO** | CRUD dia/semana/mês completo | — | Operação diária | ✅ ~88% |

---

### Pacientes & Prontuário

| Sev. | Problema | Impacto | Benefício | Esforço |
|---|---|---|---|---|
| **ALTO** | Listagem sem paginação server-side | Lentidão 500+ pacientes | Performance | **M** |
| **MÉDIO** | Wizard + form clássico duplicados | Curva de aprendizado | UX única | **A** |
| **MÉDIO** | Global search com `ilike` em 6 tabelas | Scan full table | Escala | **A** |
| **BAIXO** | Prontuário 360º (timeline, tabs, documentos, alta) | — | Diferencial | ✅ ~85% |

---

### Avaliação & Inteligência Clínica

| Sev. | Problema | Impacto | Benefício | Esforço |
|---|---|---|---|---|
| **CRÍTICO** | Sem alertas clínicos de risco (red flags) | Segurança do paciente | CDS real | **A** |
| **ALTO** | Passo Assinaturas do wizard é placeholder | Fluxo incompleto | Fechamento clínico | **M** |
| **ALTO** | Objetivos sugeridos read-only; `catalog_objectives` não conectado | Inteligência superficial | Outcomes SMART | **M** |
| **ALTO** | Diagnóstico por keyword (falsos +/-) | Erro clínico | Precisão | **A** |
| **ALTO** | Feature `inteligencia_clinica` no plano sem gate | Plano não honrado | SaaS honesto | **B** |
| **MÉDIO** | `catalog_scales.suggested_scales` não filtra UI | Escalas irrelevantes | Sugestão útil | **M** |
| **MÉDIO** | Protocolos na biblioteca desconectados do wizard | Conteúdo morto | Pathways | **M** |
| **BAIXO** | Wizard 7 passos + auto-save + perfis clínicos | — | Core forte | ✅ ~76% |

---

### Evolução

| Sev. | Problema | Impacto | Benefício | Esforço |
|---|---|---|---|---|
| **MÉDIO** | Assinatura = `locked_at`, não canvas integrado no form | Inconsistência vs avaliação | Padronização | **M** |
| **MÉDIO** | Sem vínculo obrigatório com sessão da agenda | Dados soltos | Rastreabilidade | **B** |
| **BAIXO** | Form completo + PDF + lista global | — | Uso diário | ✅ ~82% |

---

### Reavaliação

| Sev. | Problema | Impacto | Benefício | Esforço |
|---|---|---|---|---|
| **ALTO** | Comparador só EVA + texto (sem escalas/MRC/gonio) | Reavaliação superficial | Outcomes mensuráveis | **M** |
| **ALTO** | Sem notificações (cron/e-mail/WhatsApp) | Reavaliações atrasadas | Retenção clínica | **M** |
| **MÉDIO** | Intervalo fixo 90d; ignora `default_reassessment_days` do catálogo | Periodicidade errada | Inteligência rule-based | **B** |
| **MÉDIO** | Sem “iniciar reavaliação” one-click da lista global | Fricção | Produtividade | **B** |
| **BAIXO** | Trigger DB + fila pendências + alerta no painel | — | Base sólida | ✅ ~72% |

---

### Alta

| Sev. | Problema | Impacto | Benefício | Esforço |
|---|---|---|---|---|
| **MÉDIO** | Só no prontuário; sem módulo global | Visibilidade gerencial | BI de altas | **B** |
| **MÉDIO** | Fluxo `situacao` paciente parcial pós-alta | Dados inconsistentes | Integridade | **B** |
| **BAIXO** | `DischargePanel` + PDF + motivos padronizados | — | Entregável | ✅ ~70% |

---

### Escalas

| Sev. | Problema | Impacto | Benefício | Esforço |
|---|---|---|---|---|
| **CRÍTICO** | Relatórios usam `scale_code`; DB tem `scale_type` | Distribuição de risco quebrada | BI confiável | **B** |
| **MÉDIO** | Catálogo seed-only; sem editor admin | Rigidez clínica | Parametrização | **A** |
| **BAIXO** | 19 escalas + classificação + gráficos temporais | — | Diferencial | ✅ ~86% |

---

### Biblioteca

| Sev. | Problema | Impacto | Benefício | Esforço |
|---|---|---|---|---|
| **MÉDIO** | Conteúdo global; clínica não edita acervo | Personalização | White label conteúdo | **A** |
| **MÉDIO** | Sem versionamento de conteúdo | Histórico impreciso | Compliance | **M** |
| **BAIXO** | 8 tipos + favoritos + export PDF | — | Sticky content | ✅ ~83% |

---

### Documentos & Templates

| Sev. | Problema | Impacto | Benefício | Esforço |
|---|---|---|---|---|
| **MÉDIO** | Editor Markdown + merge tags (sem WYSIWYG) | Curva para admin | Autonomia clínica | **A** |
| **MÉDIO** | Sem diff visual entre versões | Auditoria fraca | Compliance | **M** |
| **MÉDIO** | Sem auto-emissão ao finalizar avaliação/alta | Retrabalho | Automação | **M** |
| **BAIXO** | Wizard 4 passos + QR + validação pública | — | Wow moment | ✅ ~84% |

---

### PDFs

| Sev. | Problema | Impacto | Benefício | Esforço |
|---|---|---|---|---|
| **CRÍTICO** | Geração client-side; lote sequencial em recibos | Tab freeze / OOM | Lotes confiáveis | **A** |
| **ALTO** | Cores fixas em `pdf-engine` vs branding clínica | White label incompleto | Marca consistente | **B** |
| **ALTO** | QR fallback `fisioos.app` se env ausente | Validação quebrada | Confiança externa | **B** |
| **MÉDIO** | Sem gráficos PNG embutidos | PDF menos rico | Relatório premium | **A** |
| **MÉDIO** | Sem CDN cache para PDFs imutáveis | Egress/custo | Performance | **M** |
| **BAIXO** | Engine V2 editorial + assinatura + multi-bloco | — | Diferencial | ✅ ~81% |

---

### Financeiro & Recibos

| Sev. | Problema | Impacto | Benefício | Esforço |
|---|---|---|---|---|
| **CRÍTICO** | Dois domínios: `receipts` (paciente) vs `recibos/extras/pagamentos` (Extra Flow) | Confusão operacional | Um fluxo claro | **A** |
| **ALTO** | Extra Flow: types Supabase ausentes; schema incerto em prod | Runtime errors | Type safety | **M** |
| **ALTO** | Extra Flow: sem migration local versionada | Deploy inconsistente | Reprodutibilidade | **M** |
| **MÉDIO** | PDF repasse reutiliza template de paciente | Layout inadequado | Profissionalismo | **M** |
| **MÉDIO** | “Última geração” em sessionStorage | Perda ao fechar aba | UX operacional | **B** |
| **MÉDIO** | Sem gateway pagamento clínica (backlog) | Financeiro básico | Receita clínica | **A** |
| **BAIXO** | Lançamentos + recibos paciente funcionais | — | MVP ok | ✅ ~68% |

---

### Home Care

| Sev. | Problema | Impacto | Benefício | Esforço |
|---|---|---|---|---|
| **ALTO** | UI promete checklist; só CRUD de visitas | Expectativa vs entrega | Credibilidade | **A** |
| **ALTO** | Query visitas em KPIs sem filtro tenant | Dados incorretos | BI confiável | **B** |
| **MÉDIO** | Sem offline/PWA domiciliar | Uso campo limitado | Diferencial | **A** |
| **BAIXO** | CRUD visitas básico | — | Esqueleto | ✅ ~42% |

---

### Marketing

| Sev. | Problema | Impacto | Benefício | Esforço |
|---|---|---|---|---|
| **ALTO** | Só calendário editorial; biblioteca `post_social` desconectada | Módulo vazio | Valor percebido | **M** |
| **ALTO** | Sem site/SEO/cases externos | Zero inbound | Aquisição | **A** |
| **BAIXO** | CRUD `marketing_calendar` | — | MVP mínimo | ✅ ~38% |

---

### White Label

| Sev. | Problema | Impacto | Benefício | Esforço |
|---|---|---|---|---|
| **MÉDIO** | PDF parcialmente tenant-aware | Marca inconsistente | Enterprise | **B** |
| **MÉDIO** | Sem domínio custom por clínica | White label limitado | Premium tier | **A** |
| **BAIXO** | Cores, logo, app_name, `useBranding()` maduros | — | Diferencial B2B | ✅ ~84% |

---

### Administração SaaS

| Sev. | Problema | Impacto | Benefício | Esforço |
|---|---|---|---|---|
| **ALTO** | Operação 100% manual (provision, trial, convite) | Não escala | Automação | **A** |
| **ALTO** | Convite owner quebrado (roles + SITE_URL) | Onboarding falha | Primeira venda | **B** |
| **MÉDIO** | `saas-admin.functions.ts` monolítico (~1.200 linhas) | Manutenção difícil | Velocidade dev | **A** |
| **BAIXO** | Painel completo: planos, limites, suporte, audit SaaS | — | Ops founder | ✅ ~87% |

---

### Configurações

| Sev. | Problema | Impacto | Benefício | Esforço |
|---|---|---|---|---|
| **MÉDIO** | Sem parametrização LGPD/retenção/senha | Compliance limitado | Enterprise | **A** |
| **BAIXO** | Dados clínica + white label + logo + preview | — | Setup 30 min | ✅ ~86% |

---

### Relatórios & BI

| Sev. | Problema | Impacto | Benefício | Esforço |
|---|---|---|---|---|
| **CRÍTICO** | Queries sem `clinic_id` (pacientes, avaliações, evoluções, escalas) | Dados cross-tenant | Confiabilidade legal | **B** |
| **CRÍTICO** | Bug `scale_code` vs `scale_type` | KPIs de risco vazios | BI utilizável | **B** |
| **ALTO** | Sem materialized views / drill-down | BI superficial | Decisão gerencial | **A** |
| **MÉDIO** | CSV only; sem Excel nativo | Fricção analistas | Exportação | **M** |
| **BAIXO** | Abas clínico/operacional/financeiro + CSV BOM | — | MVP export | ✅ ~62% |

---

### Escalabilidade & Performance

| Sev. | Problema | Impacto | Benefício | Esforço |
|---|---|---|---|---|
| **CRÍTICO** | Zero filas/workers async (1k+ clínicas inviável) | Trabalho inline trava | Escala | **A** |
| **ALTO** | Bundle monolítico; sem lazy routes | TTI alto | UX mobile | **M** |
| **ALTO** | `audit_log` write amplification + assinaturas PNG base64 | DB bloat | Custo/latência | **A** |
| **ALTO** | Sem cache Redis/CDN | Regeneração repetida | Performance/custo | **A** |
| **MÉDIO** | RLS subquery cost em volume | Latência queries | Escala 1k | **A** |
| **MÉDIO** | Zero testes automatizados | Regressões silenciosas | Confiança deploy | **A** |
| **BAIXO** | Índices Bloco C; ~100 clínicas viável com ajustes | — | Piloto ok | ✅ |

---

## Resumo quantitativo (deduplicado)

| Severidade | Qtd. itens |
|---|---|
| **CRÍTICO** | 18 |
| **ALTO** | 32 |
| **MÉDIO** | 28 |
| **BAIXO** | 15 (incl. itens maduros) |

---

# Roadmaps

## 1. Roadmap de Refatoração V1.0 (4–8 semanas)

**Objetivo:** piloto clínico confiável — 1–10 clínicas, founder-led.

| Semana | Entregas | Itens resolvidos |
|---|---|---|
| **S1 — Bloqueadores** | RLS `documents`; convite roles; filtro tenant relatórios + dashboard; fix `scale_type`; `SITE_URL`/QR | Segurança CRÍTICO, Relatórios CRÍTICO |
| **S2 — Qualidade** | Security scan + linter; CI mínimo (lint+build); `.env.example`; README | Deploy CRÍTICO, Docs CRÍTICO |
| **S3 — UX piloto** | Renderizar `OnboardingChecklist`; unificar label dashboards; ocultar/marcar Beta Marketing+Home Care+Recibos Extra | Dashboard ALTO, Comercial ALTO |
| **S4 — Clínico** | Completar passo assinaturas wizard OU remover placeholder; conectar objetivos sugeridos; intervalo reavaliação do catálogo | Avaliação ALTO, Reavaliação MÉDIO |
| **S5 — Ops** | Sentry + uptime básico; smoke test manual documentado; drill restore light | Observabilidade CRÍTICO |
| **S6 — Go-live** | Treinamento piloto; termo LGPD; checklist GO-LIVE §9 completo | Comercial CRÍTICO (legal) |

**Critério de saída V1.0:** fluxo paciente → avaliação → evolução → PDF → QR validado; zero vazamento tenant em BI; convites funcionando.

---

## 2. Roadmap V1.1 (3–6 meses)

**Objetivo:** retenção, polish comercial consultivo, redução de dívida.

| Trimestre | Frente | Entregas principais |
|---|---|---|
| **T1** | Refatoração | Unificar recibos; unificar fluxo avaliação; paginação listas; lazy routes |
| **T1** | Clínico | Comparador escalas/MRC; notificações reavaliação (cron); `/app/auditoria` clínica |
| **T2** | Produto | WYSIWYG templates; PDF cores tenant + gráficos PNG; export Excel |
| **T2** | Inteligência | Conectar `catalog_objectives/scales`; CDS rule-based v2; gate `inteligencia_clinica` |
| **T3** | Comercial | Landing + pricing; trial manual→semi-auto; FAQ + manual PDF + 5 vídeos |
| **T3** | Ops | Staging; CI completo; playbooks incidente; CS playbook + SLA piloto |

**Critério de saída V1.1:** suporte < 2h/semana/clínica; NPS piloto > 40; 30% menos fricção onboarding.

---

## 3. Roadmap V2.0 (6–18 meses)

**Objetivo:** escala SaaS (100+ clínicas), receita recorrente, diferenciação.

| Fase | Entregas |
|---|---|
| **Plataforma** | Billing Stripe/MP + dunning; signup self-serve + trial 14d; filas + PDF worker; Redis/cache CDN |
| **Escala** | Paginação/FTS global; particionamento `audit_log`; materialized views BI; multi-região eval |
| **Clínico avançado** | Alertas red flags; comparador MCID; NLP assistivo (Fase 2 IA); protocolos acionáveis |
| **Home Care / Mobile** | PWA offline; checklist domiciliar; portal família |
| **Enterprise** | Domínio custom; 2FA; ICP-Brasil eval; API pública v1; TISS/webhooks |
| **GTM** | Site SEO; cases; programa revenda; health score + churn alerts |

**Critério de saída V2.0:** 100 clientes pagantes; MRR previsível; churn < 5%/mês; infra suporta 1k clínicas com filas.

---

## 4. Ordem ideal de implementação

Prioridade = `(Severidade × Bloqueio comercial) / Esforço`

```
FASE 0 — Desbloqueio (não pular)
 1. Relatórios: clinic_id + scale_type          [CRÍTICO · B]
 2. Dashboard-clinico: filtro tenant             [ALTO · B]
 3. RLS public.documents                          [CRÍTICO · M]
 4. Convite: role profissional + admin scope      [CRÍTICO · M]
 5. SITE_URL + QR domínio produção               [ALTO · B]
 6. Security scan + linter Supabase               [CRÍTICO · B]

FASE 1 — Confiança operacional
 7. .env.example + README + persistir auditorias  [CRÍTICO · B-M]
 8. CI: lint + build (GitHub Actions)             [CRÍTICO · M]
 9. Sentry + uptime monitor                       [CRÍTICO · M]
10. OnboardingChecklist no /app                   [ALTO · B]

FASE 2 — UX clínica piloto
11. Wizard assinaturas (ou remover placeholder)   [ALTO · M]
12. Objetivos sugeridos clicáveis                 [ALTO · M]
13. Reavaliação: catálogo interval + one-click   [MÉDIO · B]
14. Ocultar/rotular Beta módulos imaturos         [ALTO · B]

FASE 3 — Dívida estrutural (pré-escala)
15. Paginação pacientes/avaliações/evoluções      [ALTO · M]
16. Unificar recibos (decidir domínio canônico)   [CRÍTICO · A]
17. Unificar fluxo avaliação (wizard canônico)    [MÉDIO · A]
18. PDF worker + fila lote                        [CRÍTICO · A]
19. Staging + smoke test automatizado             [CRÍTICO · A]

FASE 4 — Comercial (V1.1→V2)
20. Landing + trial + billing                     [CRÍTICO · A]
21. Comparador escalas + notificações reavaliação [ALTO · M]
22. /app/auditoria + export LGPD                  [MÉDIO · A]
23. BI materialized views + API pública           [ALTO · A]
```

---

## 5. Checklist executivo

### Go / No-Go Piloto V1.0

| # | Item | Responsável | Status |
|---|---|---|---|
| ☐ | Relatórios tenant-safe + `scale_type` corrigido | Eng | **Bloqueador** |
| ☐ | RLS `documents` fechada | Eng | **Bloqueador** |
| ☐ | Convites profissional/owner funcionando | Eng | **Bloqueador** |
| ☐ | `SITE_URL` produção configurado | Ops | **Bloqueador** |
| ☐ | Security scan + linter limpos | Eng | **Bloqueador** |
| ☐ | Termo LGPD assinado | Jurídico | **Bloqueador** |
| ☐ | CI lint+build verde | Eng | Recomendado |
| ☐ | Sentry + uptime ativo | Ops | Recomendado |
| ☐ | Onboarding checklist visível | Eng | Recomendado |
| ☐ | Smoke test fluxo feliz documentado | QA | Recomendado |
| ☐ | Treinamento admin 2h + fisio 3h agendado | CS | Recomendado |
| ☐ | 1–3 clínicas piloto selecionadas | Comercial | Recomendado |
| ☐ | Módulos Beta rotulados (Marketing, Home Care, Recibos Extra) | Produto | Recomendado |
| ☐ | Persistir auditorias em `docs/auditorias/` no git | Eng | Recomendado |

### Métricas de sucesso pós-piloto (30 dias)

| Métrica | Meta |
|---|---|
| Uptime | > 99% |
| Incidentes CRÍTICOS | 0 |
| Tempo config clínica nova | < 45 min com checklist |
| Fluxo PDF→QR validado | 100% clínicas piloto |
| Tickets suporte/semana/clínica | < 5 (founder-led) |
| Churn piloto | 0 |

### Decisão estratégica

| Pergunta | Resposta consolidada |
|---|---|
| Produto clínico pronto? | **Sim**, com ressalvas (piloto 1–10 clínicas) |
| Produto comercial self-serve pronto? | **Não** — V2.0 |
| Maior risco transversal? | **Segurança tenant + BI sem filtro** |
| Maior dívida técnica? | **Dois domínios recibos + PDF client-side + zero CI** |
| Próximo passo único? | **Fase 0 item 1–6** antes de qualquer venda |

---

## Ação imediata recomendada (fora do código)

Salvar e commitar os 19 arquivos de auditoria que estão **0 bytes no disco** — hoje o conhecimento de governança existe só no editor local e se perde entre sessões.

Nenhum arquivo foi alterado nesta consolidação.
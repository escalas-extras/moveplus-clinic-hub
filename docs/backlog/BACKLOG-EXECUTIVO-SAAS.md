# FisioOS — Backlog Executivo SaaS

Versao: 1.0  
Status: Producao futura  
Fonte mestre: Plano Diretor SaaS aprovado  
Escopo: epicos, funcionalidades, tarefas, criterios de aceite, arquivos envolvidos e testes por sprint.

---

## Regras de Execucao

Cada sprint deve seguir obrigatoriamente:

1. Auditoria
2. Planejamento
3. Implementacao
4. Revisao
5. Homologacao

Nenhuma sprint inicia antes da homologacao formal da sprint anterior.

## Criterios Globais

- Toda entidade clinica deve ter isolamento por `clinic_id`.
- Toda query clinica deve filtrar explicitamente a clinica ativa quando a tabela possuir `clinic_id`.
- A area da clinica nunca deve misturar funcoes de plataforma.
- A area Admin SaaS nunca deve operar dados clinicos fora do Modo Suporte.
- Nao criar telas concorrentes para a mesma funcao.
- Fluxos legados devem ser marcados, migrados ou removidos com decisao registrada.
- Modulos imaturos devem ser marcados como Beta ou ocultos por plano.
- Toda entrega deve ter loading, empty state, erro, permissao e responsividade revisados.

---

# Sprint 0 — Congelamento e Canonizacao

## Objetivo

Congelar novos modulos e estabilizar o mapa funcional do produto.

## Epico 0.1 — Inventario de Modulos

| Campo | Conteudo |
|---|---|
| Funcionalidades | Mapear rotas clinicas, Admin SaaS, modulos Beta e fluxos legados |
| Tarefas | Listar rotas em `/app`; identificar duplicidades; classificar cada modulo como Ativo, Beta, Legado ou Oculto |
| Criterios de aceite | Documento de rotas canonicas aprovado; nenhuma funcao critica sem dono funcional |
| Arquivos envolvidos | `src/routes/_authenticated/app/*`, `src/components/app-shell.tsx`, `src/lib/plan-features.ts` |
| Testes | Revisao manual de menu por perfil: super admin, owner, admin, profissional, recepcao, financeiro |

## Epico 0.2 — Decisoes de Produto

| Campo | Conteudo |
|---|---|
| Funcionalidades | Definir modulo canonico para recibos, financeiro, dashboard e templates |
| Tarefas | Registrar decisoes em documento; definir rotas que serao mantidas, redirecionadas ou removidas |
| Criterios de aceite | Nenhuma tela concorrente sem decisao registrada |
| Arquivos envolvidos | `docs/decisoes/DECISOES.md`, `docs/backlog/BACKLOG-EXECUTIVO-SAAS.md` |
| Testes | Revisao de navegacao e linguagem com checklist de usuario leigo |

---

# Sprint 1 — Seguranca Multi-clinica

## Objetivo

Garantir isolamento completo entre clinicas.

## Epico 1.1 — Auditoria de `clinic_id`

| Campo | Conteudo |
|---|---|
| Funcionalidades | Auditoria de queries clinicas, exports e dashboards |
| Tarefas | Revisar relatorios, dashboard clinico, agenda, pacientes, avaliacoes, evolucoes, reavaliacoes, altas e financeiro |
| Criterios de aceite | Toda query de tabela tenant-scoped possui filtro por `clinic_id` ou join seguro validado |
| Arquivos envolvidos | `src/routes/_authenticated/app/relatorios.tsx`, `dashboard-clinico.tsx`, `agenda.tsx`, `pacientes/*`, `avaliacoes.tsx`, `evolucoes.tsx`, `reavaliacoes.tsx`, `altas.tsx`, `financeiro/*` |
| Testes | Criar duas clinicas teste; validar que dados e exports nao cruzam clinicas |

## Epico 1.2 — RLS e Suporte Readonly

| Campo | Conteudo |
|---|---|
| Funcionalidades | Validar policies, support mode e bloqueio de escrita |
| Tarefas | Revisar RLS; validar `SupportGuardButton`; validar interceptador global; testar mutacoes em suporte |
| Criterios de aceite | Super admin em suporte consegue visualizar e nao consegue alterar dados operacionais |
| Arquivos envolvidos | `supabase/migrations/*`, `src/components/support-*`, `src/lib/active-clinic.ts`, `src/lib/platform-context.ts` |
| Testes | Tentativas de escrita em suporte retornam erro controlado; UI exibe bloqueio claro |

---

# Sprint 2 — URL Oficial e Identidade Publica

## Objetivo

Profissionalizar dominio, convites, QR, PDFs e Auth.

## Epico 2.1 — URL Canonica

| Campo | Conteudo |
|---|---|
| Funcionalidades | Definir e configurar `SITE_URL` oficial |
| Tarefas | Comprar dominio; configurar `app.fisioos.com.br`; configurar DNS, SSL, Lovable e Supabase Auth |
| Criterios de aceite | App abre no dominio oficial com HTTPS; URL Lovable permanece apenas como fallback temporario |
| Arquivos envolvidos | Secrets Lovable, Supabase Auth config, `.env.example` futuro |
| Testes | Login, convite, reset/set-password e navegacao em desktop/mobile |

## Epico 2.2 — QR e PDF

| Campo | Conteudo |
|---|---|
| Funcionalidades | Padronizar origem de links de validacao |
| Tarefas | Auditar fallbacks `fisioos.app`; garantir QR usando origem oficial; revisar textos no rodape |
| Criterios de aceite | Todo PDF emitido aponta para `/validar/{hash}` no dominio oficial |
| Arquivos envolvidos | `src/lib/pdf-engine/footer-engine.ts`, `src/lib/pdf-engine/design-system/components/footer.ts`, `src/lib/api/saas-admin.functions.ts` |
| Testes | Gerar PDF, escanear QR em celular fora da rede, validar hash publico |

---

# Sprint 3 — Separacao Clinica x Admin SaaS

## Objetivo

Eliminar mistura funcional entre operacao da clinica e gestao da plataforma.

## Epico 3.1 — Mapa de Responsabilidades

| Campo | Conteudo |
|---|---|
| Funcionalidades | Definir fronteiras de produto |
| Tarefas | Classificar telas em Clinica ou Plataforma; revisar menu; revisar redirects pos-login |
| Criterios de aceite | Usuario de clinica nao ve Admin SaaS; super admin nao entra na clinica sem suporte explicito |
| Arquivos envolvidos | `src/components/app-shell.tsx`, `src/lib/platform-context.ts`, `src/routes/_authenticated/app/admin-saas.tsx` |
| Testes | Login por perfil; tentativa de acesso direto por URL |

## Epico 3.2 — Admin SaaS Base

| Campo | Conteudo |
|---|---|
| Funcionalidades | Clinicas, planos, trial, status, suporte e auditoria |
| Tarefas | Validar fluxo de provisionamento; revisar status operacional; revisar modo suporte; revisar audit log SaaS |
| Criterios de aceite | Plataforma consegue provisionar, suspender, reativar e auditar clinica sem tocar no financeiro da clinica |
| Arquivos envolvidos | `src/routes/_authenticated/app/admin-saas.tsx`, `src/lib/api/saas-admin.functions.ts`, `src/components/saas/*` |
| Testes | Criar clinica teste, iniciar trial, suspender, reativar, entrar/sair do suporte |

---

# Sprint 4 — Onboarding Inteligente

## Objetivo

Levar a clinica nova ate o primeiro valor percebido sem depender totalmente de treinamento humano.

## Epico 4.1 — Checklist de Ativacao

| Campo | Conteudo |
|---|---|
| Funcionalidades | Checklist visivel no painel |
| Tarefas | Integrar `OnboardingChecklist`; revisar dismiss; medir etapas; criar estado de conclusao |
| Criterios de aceite | Clinica nova ve proximos passos e progresso ate 100% |
| Arquivos envolvidos | `src/components/onboarding-checklist.tsx`, `src/routes/_authenticated/app/index.tsx` |
| Testes | Clinica nova sem dados; clinica parcialmente configurada; clinica completa |

## Epico 4.2 — Ajuda Contextual

| Campo | Conteudo |
|---|---|
| Funcionalidades | Empty states e textos orientados |
| Tarefas | Revisar pacientes, agenda, avaliacoes, documentos, financeiro e configuracoes |
| Criterios de aceite | Cada tela vazia orienta uma acao clara e segura |
| Arquivos envolvidos | Rotas clinicas principais, `src/components/layout/EmptyState.tsx` |
| Testes | Revisao UX com usuario leigo; validacao mobile |

---

# Sprint 5 — Financeiro Canonico

## Objetivo

Centralizar toda operacao financeira da clinica e separar Billing SaaS.

## Epico 5.1 — Financeiro da Clinica

| Campo | Conteudo |
|---|---|
| Funcionalidades | Dashboard, receber, pagar, fluxo, pacotes, convenios, inadimplencia, receita profissional |
| Tarefas | Finalizar rotas; revisar query keys; validar permissoes; revisar labels e hierarquia |
| Criterios de aceite | Clinica entende o modulo financeiro como uma experiencia unica |
| Arquivos envolvidos | `src/routes/_authenticated/app/financeiro/*`, `src/components/finance/*`, `src/lib/finance/*` |
| Testes | Fluxo completo: receber, pagar, recibo, inadimplencia, relatorio |

## Epico 5.2 — Recibos Canonicos

| Campo | Conteudo |
|---|---|
| Funcionalidades | Definir e executar estrategia de recibos |
| Tarefas | Decidir `/app/financeiro/recibos` vs `/app/recibos`; migrar, redirecionar ou marcar legado |
| Criterios de aceite | Usuario encontra um unico caminho principal para recibos |
| Arquivos envolvidos | `src/routes/_authenticated/app/recibos.tsx`, `src/routes/_authenticated/app/financeiro/recibos.tsx`, `src/lib/receipt-pdf/*` |
| Testes | Emissao, impressao, download, lote, cancelamento, suporte readonly |

---

# Sprint 6 — Layout Premium Consistente

## Objetivo

Criar experiencia visual uniforme, confiavel e produtiva.

## Epico 6.1 — Padrao Visual Obrigatorio

| Campo | Conteudo |
|---|---|
| Funcionalidades | Padrao de pagina para modulos principais |
| Tarefas | Definir uso de `PageHero`, `PageHeader`, `ModuleStack`, `PageSection`, `KpiGrid`, tabelas e filtros |
| Criterios de aceite | Nenhuma tela principal usa layout improvisado sem justificativa |
| Arquivos envolvidos | `src/components/ui-system/*`, `src/components/layout/*`, `src/styles.css` |
| Testes | Snapshot visual manual em desktop e mobile |

## Epico 6.2 — Migracao de Telas Antigas

| Campo | Conteudo |
|---|---|
| Funcionalidades | Relatorios, Templates, Marketing, Home Care e Configuracoes |
| Tarefas | Harmonizar header, filtros, empty states, cards, tabelas e modais |
| Criterios de aceite | Produto parece um unico SaaS, nao telas de epocas diferentes |
| Arquivos envolvidos | `relatorios.tsx`, `templates.tsx`, `marketing.tsx`, `home-care.tsx`, `configuracoes.tsx` |
| Testes | Checklist de contraste, responsividade, overflow e hierarquia visual |

---

# Sprint 7 — Templates Globais e Documentos

## Objetivo

Criar biblioteca oficial de documentos profissionais.

## Epico 7.1 — Governanca de Templates

| Campo | Conteudo |
|---|---|
| Funcionalidades | Separar template global e template da clinica |
| Tarefas | Definir modelo de dados; criar gestao global no Admin SaaS; permitir duplicar para clinica |
| Criterios de aceite | Clinica personaliza copia sem alterar modelo global |
| Arquivos envolvidos | `src/routes/_authenticated/app/templates.tsx`, `admin-saas.tsx`, `supabase/migrations/*` futuro |
| Testes | Criar global, duplicar, editar copia, emitir documento |

## Epico 7.2 — Biblioteca Oficial

| Campo | Conteudo |
|---|---|
| Funcionalidades | Modelos para avaliacao, evolucao, reavaliacao, alta, convenio, INSS, medico, LGPD, contratos e home care |
| Tarefas | Escrever conteudo base; validar merge tags; validar PDFs |
| Criterios de aceite | Pacote inicial cobre autonomo, clinica pequena, media, domiciliar e ambulatorial |
| Arquivos envolvidos | Seeds/templates futuros, `src/lib/merge-tags.ts`, `src/lib/pdf*` |
| Testes | Renderizar PDF de cada modelo com dados reais de teste |

---

# Sprint 8 — Controle de Beta

## Objetivo

Controlar maturidade e expectativa comercial.

## Epico 8.1 — Modulos Beta

| Campo | Conteudo |
|---|---|
| Funcionalidades | Marketing, Home Care, IA e integracoes |
| Tarefas | Definir status; badge Beta; ocultar por plano; ajustar textos |
| Criterios de aceite | Nenhum modulo promete mais do que entrega |
| Arquivos envolvidos | `src/components/app-shell.tsx`, `src/lib/plan-features.ts`, rotas Beta |
| Testes | Menu por plano; review comercial de textos |

---

# Sprint 9 — Admin SaaS Comercial

## Objetivo

Transformar Admin SaaS em centro administrativo da empresa FisioOS.

## Epico 9.1 — Assinaturas e Saude Comercial

| Campo | Conteudo |
|---|---|
| Funcionalidades | Assinaturas, mensalidades, status financeiro, health score |
| Tarefas | Modelar assinatura SaaS; diferenciar de financeiro da clinica; criar metricas de uso |
| Criterios de aceite | Plataforma sabe quem esta ativo, trial, inadimplente, suspenso ou cancelado |
| Arquivos envolvidos | `admin-saas.tsx`, `src/lib/api/saas-admin.functions.ts`, migrations futuras |
| Testes | Alterar status e validar gate de acesso clinico |

## Epico 9.2 — Suporte e Operacao

| Campo | Conteudo |
|---|---|
| Funcionalidades | Historico de suporte, logs e visao por clinica |
| Tarefas | Consolidar eventos, ultimos acessos, erros e sessoes suporte |
| Criterios de aceite | Suporte entende contexto da clinica antes de entrar em modo suporte |
| Arquivos envolvidos | `src/components/saas/*`, `saas_audit_log`, `clinic_support_sessions` |
| Testes | Simular atendimento suporte com leitura auditavel |

---

# Sprint 10 — Billing SaaS

## Objetivo

Permitir venda automatica.

## Epico 10.1 — Checkout e Gateway

| Campo | Conteudo |
|---|---|
| Funcionalidades | Checkout, gateway, webhooks, trial, upgrade e downgrade |
| Tarefas | Escolher gateway; implementar webhook; atualizar assinatura e plano |
| Criterios de aceite | Pagamento altera status da assinatura sem acao manual |
| Arquivos envolvidos | Novas server functions, `clinic_plans`, Admin SaaS, secrets gateway |
| Testes | Pagamento aprovado, recusado, webhook duplicado, cancelamento |

## Epico 10.2 — Suspensao e Emails

| Campo | Conteudo |
|---|---|
| Funcionalidades | Suspensao por inadimplencia e comunicacoes |
| Tarefas | Criar eventos de trial; email D+1, D+7, D+13; falha pagamento; suspensao |
| Criterios de aceite | Cliente entende status e caminho de regularizacao |
| Arquivos envolvidos | Email provider, Admin SaaS, `ClinicAccessGate` |
| Testes | Trial vencido, inadimplente, reativado |

---

# Sprint 11 — Landing Comercial

## Objetivo

Criar frente comercial clara e confiavel.

## Epico 11.1 — Site Publico

| Campo | Conteudo |
|---|---|
| Funcionalidades | Home, recursos, planos, LGPD, contato, FAQ, demo e cases |
| Tarefas | Criar estrutura do site; CTA para demo/login; SEO basico |
| Criterios de aceite | Visitante entende valor do FisioOS sem contato humano |
| Arquivos envolvidos | Site externo ou rotas publicas futuras |
| Testes | Lighthouse basico; links para app; formulario de contato |

---

# Sprint 12 — Operacao e Go Live

## Objetivo

Escalar com previsibilidade.

## Epico 12.1 — Qualidade e Ambientes

| Campo | Conteudo |
|---|---|
| Funcionalidades | Staging, CI/CD, build, lint, smoke test |
| Tarefas | Criar `.env.example`; workflow; checklist de deploy; staging |
| Criterios de aceite | PR nao passa com build quebrado; staging valida fluxo critico |
| Arquivos envolvidos | `.github/workflows/*`, `.env.example`, docs/runbooks |
| Testes | Smoke: login, paciente, avaliacao, documento, QR, financeiro |

## Epico 12.2 — Backups e Go Live

| Campo | Conteudo |
|---|---|
| Funcionalidades | Backup, restore, checklist por clinica |
| Tarefas | Documentar rotina; executar restore drill; criar go-live checklist |
| Criterios de aceite | Restauracao testada e documentada |
| Arquivos envolvidos | `docs/runbooks/*`, Supabase config |
| Testes | Restore em staging; checklist assinado por responsavel |

---

# Sprint 13 — Observabilidade

## Objetivo

Operar com visibilidade real.

## Epico 13.1 — Logs, Metricas e Alertas

| Campo | Conteudo |
|---|---|
| Funcionalidades | Erros frontend, server functions, uptime, auditoria e alertas |
| Tarefas | Integrar Sentry/APM; criar uptime; padronizar captura de erro |
| Criterios de aceite | Erro real gera alerta acionavel |
| Arquivos envolvidos | `src/lib/error-capture.ts`, `src/lib/lovable-error-reporting.ts`, `src/routes/__root.tsx` |
| Testes | Erro controlado aparece no painel de observabilidade |

---

# Sprint 14 — ACL e Permissoes Profissionais

## Objetivo

Permitir controle fino por papel e perfil.

## Epico 14.1 — Matriz de Permissoes

| Campo | Conteudo |
|---|---|
| Funcionalidades | Papeis, permissoes, heranca e politicas |
| Tarefas | Definir matriz; alinhar UI e RLS; criar gates por acao |
| Criterios de aceite | Recepcao, financeiro, profissional, admin e owner veem apenas o necessario |
| Arquivos envolvidos | `useActiveClinic`, `useRoles`, `app-shell`, policies futuras |
| Testes | Testes por perfil em rotas e mutacoes |

---

# Sprint 15 — Performance

## Objetivo

Otimizar experiencia em escala.

## Epico 15.1 — Frontend e Dados

| Campo | Conteudo |
|---|---|
| Funcionalidades | Bundle, lazy loading, cache, virtualizacao e paginacao |
| Tarefas | Medir bundle; paginar listas; virtualizar tabelas grandes; revisar query limits |
| Criterios de aceite | Clinica com 500+ pacientes permanece fluida |
| Arquivos envolvidos | Pacientes, avaliacoes, evolucoes, financeiro, Vite/TanStack |
| Testes | Dataset grande em staging; medir TTI e tempo de consultas |

---

# Sprint 16 — Release Candidate

## Objetivo

Preparar producao comercial.

## Epico 16.1 — Regressao e Treinamento

| Campo | Conteudo |
|---|---|
| Funcionalidades | Regressao completa, docs, videos, rollback e go-live |
| Tarefas | Criar checklist RC; gravar treinamentos; validar rollback; revisar LGPD |
| Criterios de aceite | Produto apto para venda consultiva ampla |
| Arquivos envolvidos | `docs/`, runbooks, landing, Admin SaaS, app clinico |
| Testes | Regressao ponta a ponta; homologacao com clinica piloto |

---

## Ordem Executiva

1. Sprint 0 — Congelamento
2. Sprint 1 — Seguranca Multi-clinica
3. Sprint 2 — URL Oficial
4. Sprint 3 — Separacao Clinica x Admin SaaS
5. Sprint 4 — Onboarding
6. Sprint 5 — Financeiro Canonico
7. Sprint 6 — Layout Premium
8. Sprint 7 — Templates Globais
9. Sprint 8 — Beta
10. Sprint 9 — Admin SaaS Comercial
11. Sprint 10 — Billing
12. Sprint 11 — Landing
13. Sprint 12 — Operacao
14. Sprint 13 — Observabilidade
15. Sprint 14 — ACL
16. Sprint 15 — Performance
17. Sprint 16 — Release Candidate

## Marco Final

O FisioOS estara pronto para operacao comercial forte quando:

- houver dominio oficial e URL canonica;
- nao houver vazamento cross-tenant;
- clinica e plataforma estiverem separadas;
- financeiro da clinica estiver canonico;
- billing SaaS estiver separado e automatizado;
- templates globais estiverem governados;
- UX estiver consistente;
- onboarding guiar a ativacao;
- observabilidade, CI/CD, staging e go-live estiverem implantados.

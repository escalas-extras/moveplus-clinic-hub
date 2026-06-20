# BACKLOG PÓS-VERSÃO 1.0 — Move+

Itens identificados durante a execução da V1.0 que foram conscientemente adiados para preservar foco do MVP clínico e garantir qualidade da entrega.

## Documentação clínica
- Templates WYSIWYG completos para os 7 tipos de documento (`avaliacao_inicial`, `reavaliacao`, `evolucao`, `relatorio`, `alta`, `encaminhamento`, `parecer`). V1 entrega a tabela `clinical_documents` + assinatura + QR; templates por tipo e editor rich-text vão para esta sprint.
- Versionamento diff visual entre versões de um mesmo documento (atualmente registrado em `audit_log`, mas sem UI de comparação lado-a-lado).

## PDF profissional
- Embutir gráficos de evolução como PNG dentro do PDF (atualmente texto + tabelas). Requer canvas serverless ou pré-render no cliente.
- Layouts diferenciados por destinatário (convênio vs. home care vs. instituição). V1 usa layout único.

## Reavaliações
- Job `pg_cron` semanal disparando notificações de reavaliações vencidas via e-mail/WhatsApp.
- Sugestão automática de intervalo de reavaliação com base no diagnóstico (catalog_diagnoses).

## BI / Inteligência
- Materialized views agregadas para indicadores gerenciais (TTM, LTV de paciente, etc.).
- Tabela `bi_dimensions` parametrizada para drill-down por região, diagnóstico, profissional, faixa etária.
- Exportação CSV/Excel dos relatórios.

## Catálogos parametrizados
- Editor admin para `catalog_scales`, `catalog_diagnoses`, `catalog_objectives`, `normative_rom` (atualmente seed-only).
- Versionamento de catálogos (vigência início/fim) para garantir reprocessamento histórico fiel.

## Auditoria / LGPD
- Página admin `/app/auditoria` com filtro por tabela, usuário, período e visualização de diff.
- Exportação do relatório LGPD por titular (paciente) — direito de acesso e portabilidade.
- Política de retenção configurável e anonimização automatizada após inatividade.

## Mobile / UX
- App PWA com push notifications para reavaliações pendentes.
- Modo offline para captura de avaliação em domicílio (sincroniza ao reconectar).
- Suporte a digital pen / stylus na assinatura (atualmente touch e mouse OK).

## Segurança avançada
- 2FA obrigatório para admins.
- Auditoria de tentativas de login.
- Política de senha forte parametrizada por tenant.

## Integrações
- Webhook de finalização de avaliação para CRM/ERP da clínica.
- Integração com TISS para convênios.
- Importação de exames complementares (DICOM viewer, PDF parsing).

## Performance
- Paginação server-side em listas de pacientes/avaliações com índices compostos otimizados.
- Cache CDN para PDFs assinados (imutáveis).

## Multi-tenant SaaS
- Modelo de tenants para suportar múltiplas clínicas isoladas com RLS por `tenant_id`.
- Cobrança recorrente integrada (Stripe).

## BLOCO B — Itens adiados

- **Geração server-side de PDF** (worker dedicado para PDFs com >50 páginas)
- **Editor visual WYSIWYG** para modelos de documentos (atualmente Markdown + merge tags)
- **Versioning UI completo**: diff entre versões, restore
- **Multi-tenant ativo**: `clinics` + `clinic_id` criados em todas as tabelas, mas controle ainda single-tenant (helper `current_clinic_id()` + RLS multi-tenant a ativar antes do SaaS)
- **White-label**: tema dinâmico por clinic_settings.logo_url / cores
- **OCR de exames complementares** anexados ao paciente
- **Assinatura ICP-Brasil** (atualmente: canvas + hash de validação)
- **Notificação por e-mail/WhatsApp** de reavaliações atrasadas (cron pg_cron + Edge Function)
- **Templates por especialidade** (cardio, neuro pediátrica, oncológica)
- **API pública /api/public/validar** para validação programática via JSON

---

## BLOCO C — Hardening, Comercialização e Escala (HOMOLOGADO)

### Auditoria realizada
- 13 alertas iniciais → 3 falsos positivos remanescentes (funções `has_role`, `can_access_patient`, `current_professional_id` são intencionalmente executáveis por `authenticated` porque são chamadas pelas próprias políticas RLS — único caminho seguro).
- Queries mais lentas: todas <1ms média; nenhum gargalo de banco.

### Segurança aplicada
- Política de UPDATE em `patients` agora restrita a `created_by = auth.uid()` ou admin (era `USING(true)`).
- Política de INSERT em `patients` exige `created_by = auth.uid()`.
- INSERT direto em `audit_log` bloqueado para clientes — apenas triggers (definer) gravam.
- `EXECUTE` revogado de `anon` em todas as funções SECURITY DEFINER internas.
- `EXECUTE` revogado de `anon` e `authenticated` em funções de trigger (`handle_new_user`, `fn_audit_trigger`, `block_locked_updates`, `fn_set_validation_hash`, `fn_schedule_reassessment`, `update_updated_at_column`).
- View pública de validação (`v_document_validation`) já com `security_invoker=true` desde Bloco B.

### Performance — índices adicionados
- `assessments`: professional_id, (status, data DESC), GIN(clinical_profiles), next_reassessment_date (parcial).
- `patients`: created_by, situacao.
- `evolutions`: data DESC.
- `appointments`: (patient_id, data), (professional_id, data).
- `financial_entries`: data DESC, patient_id.
- `reassessment_schedule`: (patient_id, scheduled_for), scheduled_for (parcial pendentes).
- `clinical_documents`: validation_hash, clinic_id.
- `document_templates`: (doc_type) parcial WHERE is_default.

### Itens entregues no Bloco C
- **Onboarding checklist**: card progressivo no dashboard com 6 passos (clínica, logo, profissionais, paciente, avaliação, modelos) — dispensável e ressurge se houver pendência.
- **Relatórios Executivos** (`/app/relatorios`): KPIs clínicos, operacionais e financeiros com filtro por período + exportação CSV (UTF-8 BOM compatível com Excel) de pacientes, evoluções e financeiro.
- **Sidebar**: novas entradas Reavaliações, Relatórios, Modelos (admin).
- **Settings da clínica** já cobrem dados institucionais, logo e rodapé (preparado para white-label).

### Checklist de prontidão comercial
- [x] RLS hardened em todas as tabelas críticas
- [x] Auditoria automática em tabelas clínicas
- [x] PDFs com QR + hash de validação
- [x] Validação pública LGPD-safe (apenas iniciais)
- [x] Modelos parametrizáveis pelo admin
- [x] Indicadores clínicos / operacionais / financeiros
- [x] Onboarding self-service
- [x] Multi-tenant ready (clinic_id + clinics table)
- [x] Exportação CSV/Excel
- [x] Reavaliações automáticas
- [x] Assinaturas múltiplas (mouse/touch/tablet)
- [x] Índices em todas as colunas-chave

### Backlog Pós-V1.0 — adicionados no Bloco C
- **Tour interativo guiado** (driver.js) — atual: checklist + tooltips contextuais
- **Exportação Excel nativa (.xlsx)** — atual: CSV UTF-8 (lê no Excel)
- **Dashboards com gráficos avançados** (recharts já instalado; expandir além dos atuais)
- **Tema dinâmico por clínica** (white-label CSS variables)
- **Gateway de pagamento** (Stripe/Mercado Pago integrado a `financial_entries`)
- **Backup automático agendado** + restauração self-service
- **Two-factor authentication** (Supabase Auth MFA)
- **Logs de auditoria UI**: explorador visual do `audit_log`
- **Limite de plano** por clinic (assinaturas SaaS)
- **API pública v1** (REST com chaves por clínica) para integração de parceiros
- **App mobile nativo** (React Native) para fisioterapeutas em atendimento domiciliar

---

## Bloco D — Piloto Operacional (2026-06-20)

Itens identificados durante a preparação do go-live e direcionados ao roadmap V1.1:

- Manual do usuário em PDF e vídeos tutoriais curtos.
- Central de notificações in-app para reavaliações vencidas.
- App nativo para atendimento domiciliar offline.
- MFA (TOTP) para administradores.
- Integração com agenda Google/Outlook.
- Dashboard de BI avançado (coortes, NPS clínico).
- Templates de documentos com editor WYSIWYG.
- Geração de PDF server-side (renderização fiel a impressão).
- Integração com gateways de pagamento (Stripe/Paddle) para mensalidade.
- White-label completo (CSS variables por clínica).

Consulte `GO-LIVE-V1.md` para os entregáveis do Bloco D (checklists, DR, monitoramento).


## BLOCO E — Itens enviados ao Backlog

- WYSIWYG editor para cartilhas/protocolos (atualmente markdown/texto).
- Upload de imagens/anexos via Storage para conteúdos da biblioteca.
- Editor visual de posts/stories (canvas) com aplicação automática do logo.
- Geração de PDF server-side personalizado (cartilhas com logo da clínica).
- Banco de vídeos de exercícios (player + thumbnails).
- Prescrição de programa de exercícios via WhatsApp/Email com link público.
- Calendário visual (drag-and-drop) para marketing.
- Datas comemorativas pré-cadastradas (seed anual).
- Compartilhamento de conteúdo entre clínicas (scope='shared' com aprovação).
- Controle granular de visualização de treinamentos (% progresso, certificado).

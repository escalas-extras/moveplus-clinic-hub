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

# Move+ V1.0 — BLOCO D — Piloto Operacional e Go-Live

> Documento oficial de readiness para lançamento. Atualizado em 2026-06-20.
> A partir desta data, **suspenso desenvolvimento de novas funcionalidades**.
> Apenas **Bugs** e **Ajustes de UX críticos** entram na V1.0.
> Demais demandas → `BACKLOG-POS-V1.md` (roadmap V1.1).

---

## 1. Checklist de Implantação (Produção)

### 1.1 Infraestrutura
- [x] Frontend publicado em `moveplus-clinic-hub.lovable.app`
- [x] Backend Lovable Cloud ativo (`ACTIVE_HEALTHY`)
- [x] Storage bucket `documents` (privado, RLS ativa)
- [x] Secrets configurados (`LOVABLE_API_KEY`, `SUPABASE_*`)
- [ ] Domínio próprio conectado (ex.: `app.moveplus.com.br`) — opcional
- [ ] SSL validado no domínio próprio

### 1.2 Banco de Dados
- [x] Todas as migrações aplicadas (Blocos A, B, C)
- [x] RLS habilitada em 100% das tabelas `public.*`
- [x] GRANTs explícitos por tabela
- [x] Triggers de auditoria (`fn_audit_trigger`) ativos
- [x] Trigger de hash de validação ativa
- [x] Trigger de agendamento automático de reavaliação ativa
- [x] Índices críticos criados (12 índices Bloco C)
- [x] `pg_cron` / rotinas automáticas revisadas

### 1.3 Segurança
- [x] `has_role` / `can_access_patient` / `current_professional_id` revogados de `anon`
- [x] `audit_log` somente gravável por triggers
- [x] `patients`: UPDATE/INSERT restrito ao criador ou admin
- [x] Política `service_role` em todas as tabelas
- [x] Validação pública de documentos com mascaramento LGPD (iniciais)
- [ ] Executar `security--run_security_scan` antes do go-live
- [ ] Revisar resultados do `supabase--linter` antes do go-live

### 1.4 Performance
- [x] Índices em `assessments`, `patients`, `evolutions`, `appointments`, `financial_entries`, `reassessment_schedule`
- [ ] Baseline `supabase--slow_queries` capturada antes do go-live
- [ ] Plano de revisão semanal de slow queries durante o piloto

---

## 2. Checklist de Configuração Inicial da Clínica

Tempo estimado: **30–45 min**.

1. [ ] Criar conta do administrador (primeiro signup vira `admin` automaticamente)
2. [ ] Preencher dados da clínica (`/app/configuracoes`)
   - Razão social, CNPJ, endereço, telefone, e-mail
   - Logo (PNG, fundo transparente, máx. 1 MB)
   - Rodapé personalizado dos PDFs
3. [ ] Cadastrar profissionais (fisioterapeutas)
   - Nome, CREFITO, especialidade, e-mail
   - Atribuir roles (`physiotherapist` ou `admin`)
4. [ ] Cadastrar pacientes iniciais (mínimo 3 para validação)
5. [ ] Validar modelos clínicos em `/app/templates`
   - Avaliação Inicial
   - Relatório de Evolução
   - Relatório de Alta
   - Encaminhamento
6. [ ] Realizar 1 avaliação completa de teste com:
   - Escalas (Barthel + Berg + Braden)
   - MRC bilateral
   - Goniometria
   - Metas de curto/médio/longo prazo
   - Assinatura digital (profissional + paciente/responsável)
7. [ ] Gerar PDF e validar QR Code em `/validar/{hash}`
8. [ ] Validar fluxo no celular (responsividade)
9. [ ] Validar dashboard clínico e relatórios CSV

---

## 3. Checklist de Treinamento

### 3.1 Treinamento Administrador (2h)
- [ ] Visão geral do sistema e módulos
- [ ] Configuração da clínica e branding
- [ ] Gestão de profissionais e roles
- [ ] Modelos clínicos: criar, duplicar, versionar
- [ ] Relatórios executivos (clínico, operacional, financeiro)
- [ ] Exportação CSV
- [ ] Auditoria e LGPD

### 3.2 Treinamento Fisioterapeuta (3h)
- [ ] Cadastro de pacientes e perfis clínicos (Neuro/Orto/Resp/Geriátrico)
- [ ] Wizard de avaliação inteligente
- [ ] Aplicação de escalas funcionais (Barthel, Katz, Berg, Tinetti, Braden)
- [ ] MRC e Goniometria
- [ ] Definição e acompanhamento de metas
- [ ] Evoluções e auto-save
- [ ] Assinatura digital (touchscreen)
- [ ] Geração de PDFs e QR Code de validação
- [ ] Agenda e reavaliações automáticas
- [ ] Uso no celular (atendimento domiciliar)

### 3.3 Materiais de Apoio
- [ ] Manual do usuário (PDF) — backlog V1.1
- [ ] Vídeos tutoriais curtos (≤3 min cada) — backlog V1.1
- [ ] FAQ inicial

---

## 4. Ambiente de Produção — Revisão Final

| Item | Status | Observação |
|---|---|---|
| URL pública | ✅ | `moveplus-clinic-hub.lovable.app` |
| HTTPS | ✅ | Certificado Lovable |
| Auth Google | ⚠️ | Configurar provedor antes do go-live |
| Auth Email/Senha | ✅ | Confirmação de e-mail desabilitada (piloto) |
| Storage privado | ✅ | RLS ativa |
| Backup automático | ✅ | Lovable Cloud (diário) |
| Logs de auditoria | ✅ | `audit_log` em todas as tabelas clínicas |

---

## 5. Logs e Monitoramento

### 5.1 Fontes de log
- **Auditoria clínica**: `public.audit_log` (INSERT/UPDATE/DELETE de todas as tabelas clínicas, com `user_id`, `old_data`, `new_data`, timestamp).
- **Erros de runtime (frontend)**: console do navegador + ferramenta de Runtime Errors do Lovable.
- **Server functions**: `supabase--edge_function_logs` por nome.
- **Health do backend**: `supabase--cloud_status`.
- **Slow queries**: `supabase--slow_queries` (revisão semanal).

### 5.2 Rotina recomendada (semanal durante piloto)
1. Conferir `cloud_status` → deve estar `ACTIVE_HEALTHY`.
2. Rodar `supabase--linter` e tratar findings críticos.
3. Rodar `slow_queries limit=20` e indexar offensores.
4. Revisar últimas 200 linhas de `audit_log` para padrões suspeitos.
5. Conferir Runtime Errors do frontend e classificar (Bug / UX / V1.1).

---

## 6. Rotina de Backup

- **Backup automático**: Lovable Cloud realiza snapshot diário do banco (retenção padrão da plataforma).
- **Backup manual recomendado** antes de:
  - Cada migração estrutural.
  - Cadastro em massa (>50 registros).
  - Alteração de RLS ou roles.
- **Procedimento manual** (admin):
  1. Exportar CSVs críticos via `/app/relatorios` (pacientes, evoluções, financeiro).
  2. Armazenar em local seguro (Google Drive da clínica, criptografado).
  3. Registrar data, autor e hash do arquivo em planilha de controle.

---

## 7. Procedimento de Recuperação de Desastre (DR)

| Cenário | Ação |
|---|---|
| Backend inacessível | `supabase--cloud_status`. Se `ACTIVE_UNHEALTHY` ou inalcançável → `supabase--restart` (com aprovação do admin). |
| Dados corrompidos em uma tabela | Restaurar via snapshot diário do Lovable Cloud. Comunicar usuários por e-mail. |
| Perda de acesso admin | Promover outro usuário a `admin` via SQL (operação manual de suporte). |
| Vazamento suspeito | 1) Revogar sessões ativas. 2) Rotacionar `LOVABLE_API_KEY` e chaves Supabase. 3) Auditar `audit_log` das últimas 72h. 4) Notificar titulares conforme LGPD (até 72h). |
| Indisponibilidade prolongada (>4h) | Comunicar clínicas-piloto, oferecer fallback em papel para evolução do dia, reprocessar quando voltar. |

**RPO alvo**: 24h. **RTO alvo**: 2h.

---

## 8. Triagem de Demandas Durante o Piloto

Toda solicitação recebida deve ser classificada em **uma** das categorias:

| Categoria | Critério | Destino |
|---|---|---|
| **Bug** | Funcionalidade existente não funciona como especificado, ou gera erro/perda de dado. | V1.0 — corrigir imediatamente. |
| **Ajuste UX crítico** | Usuário não consegue concluir um fluxo essencial sem ajuda, ou erro frequente de uso. | V1.0 — corrigir no ciclo. |
| **Melhoria V1.1** | Otimização, conveniência, refinamento estético. | `BACKLOG-POS-V1.md`. |
| **Nova funcionalidade** | Recurso não previsto na V1.0. | `BACKLOG-POS-V1.md` (avaliar prioridade). |

Template de registro (uma linha por demanda em planilha de piloto):
`DATA | CLÍNICA | USUÁRIO | DESCRIÇÃO | CATEGORIA | PRIORIDADE | STATUS | RESPONSÁVEL`

---

## 9. Relatório Final de Readiness

| Pilar | Status | Bloqueador? |
|---|---|---|
| Funcionalidade clínica (Blocos A+B) | ✅ Concluído | Não |
| Segurança e RLS (Bloco C) | ✅ Concluído | Não |
| Performance e índices (Bloco C) | ✅ Concluído | Não |
| Documentos parametrizados e PDFs com QR | ✅ Concluído | Não |
| Validação pública LGPD | ✅ Concluído | Não |
| Onboarding visual | ✅ Concluído | Não |
| Relatórios executivos + CSV | ✅ Concluído | Não |
| Auth Google configurado | ⚠️ Pendente | **Sim** (se a clínica pediu Google) |
| Domínio próprio | ⚠️ Opcional | Não |
| Security scan limpo | ⚠️ Executar | **Sim** |
| Linter Supabase limpo | ⚠️ Executar | **Sim** |
| Treinamento da clínica-piloto | ⚠️ Agendar | **Sim** |
| Termo LGPD assinado pelo controlador | ⚠️ Externo | **Sim** |

**Veredito**: **APTO PARA PILOTO** após resolução dos itens marcados como bloqueador.

---

## 10. Próximos Passos

1. Resolver bloqueadores da seção 9.
2. Selecionar 1–3 clínicas-piloto.
3. Executar treinamento (seção 3).
4. Iniciar operação supervisionada por 30 dias.
5. Consolidar feedback semanal (seção 8).
6. Ao final do piloto: decidir entre V1.0 GA (general availability) ou ciclo V1.1.

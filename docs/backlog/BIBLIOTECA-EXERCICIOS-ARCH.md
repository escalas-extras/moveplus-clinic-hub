# FisioOS SaaS — Arquitetura Futura da Biblioteca de Exercícios

Versão: 1.0  
Status: arquitetura futura, sem implementação de banco  
Escopo: biblioteca de exercícios, protocolos e prescrições terapêuticas

## 1. Objetivo

Projetar a futura Biblioteca de Exercícios do FisioOS como um módulo SaaS escalável para fisioterapeutas, clínicas e operação multi-clínica, sem criar migrations, alterar Supabase, RLS, telas clínicas ou regras atuais.

O módulo deve permitir:

- Biblioteca global oficial FisioOS.
- Biblioteca personalizada por clínica.
- Protocolos terapêuticos reutilizáveis.
- Prescrição de exercícios para pacientes.
- Distribuição futura por PDF, WhatsApp, e-mail e portal do paciente.
- Base segura para IA sugerir exercícios a partir de avaliações, evolução e objetivos terapêuticos.

## 2. Princípios Arquiteturais

- Separar conteúdo global da plataforma e conteúdo privado da clínica.
- Nunca misturar prescrições de pacientes entre clínicas.
- Manter exercícios globais imutáveis para clínicas; customizações devem ser cópias ou overlays.
- Permitir versionamento de conteúdo clínico prescrito.
- Tratar mídia como ativo com custo, direito autoral e governança.
- Preparar permissões por plano sem acoplar ao billing real nesta sprint.
- Projetar para uso assistido por IA sem automatizar decisão clínica final.

## 3. Entidades Futuras

### 3.1 exercise_categories

Categorias de organização da biblioteca.

Campos sugeridos:

- id
- clinic_id, nulo para categoria global
- parent_id
- name
- slug
- description
- body_region
- joint
- sort_order
- status
- origin, global ou clinic
- created_by
- created_at
- updated_at

Observações:

- Categorias globais devem ser administradas pelo Admin SaaS.
- Categorias da clínica devem aparecer somente para a clínica proprietária.
- `parent_id` permite hierarquia como Membros inferiores > Joelho > Fortalecimento.

### 3.2 exercises

Entidade principal da biblioteca.

Campos sugeridos:

- id
- clinic_id, nulo para exercício global
- category_id
- source_exercise_id, usado quando clínica duplica exercício global
- name
- slug
- short_description
- description
- body_region
- joint
- muscle_group
- therapeutic_goal
- level, iniciante, intermediário, avançado
- equipment
- contraindications
- precautions
- default_duration_seconds
- default_repetitions
- default_sets
- default_frequency
- instructions
- clinical_notes
- tags_cache
- status, draft, active, archived
- origin, global ou clinic
- reviewed_by
- reviewed_at
- created_by
- created_at
- updated_at

Observações:

- Exercícios globais devem ter revisão editorial ou clínica.
- Exercícios de clínica podem nascer como cópia de um global.
- `source_exercise_id` permite rastrear a origem sem depender de herança frágil.

### 3.3 exercise_media

Mídias associadas ao exercício.

Campos sugeridos:

- id
- exercise_id
- clinic_id, redundância segura para escopo e RLS futura
- media_type, image, video, gif, document
- storage_path
- external_url
- thumbnail_path
- title
- description
- duration_seconds
- file_size_bytes
- mime_type
- copyright_status
- license_notes
- sort_order
- status
- created_by
- created_at
- updated_at

Observações:

- Deve suportar mídia global e mídia privada de clínica.
- Para vídeos, considerar transcodificação futura e thumbnails.
- Mídia externa deve ter governança para evitar links quebrados e violações de direitos.

### 3.4 exercise_tags

Tags estruturadas ou livres para busca, filtros e IA.

Campos sugeridos:

- id
- clinic_id, nulo para tag global
- name
- slug
- tag_type, região, objetivo, equipamento, patologia, nível, restrição
- status
- created_at
- updated_at

Relacionamento sugerido:

- exercises_tags, tabela ponte futura entre exercícios e tags.

Observações:

- A lista pedida inclui `exercise_tags`; para normalização completa, recomenda-se uma tabela ponte `exercise_tag_links`.
- `tags_cache` em `exercises` pode ser usado apenas como otimização de leitura, não como fonte canônica.

### 3.5 exercise_protocols

Protocolos terapêuticos reutilizáveis.

Campos sugeridos:

- id
- clinic_id, nulo para protocolo global
- source_protocol_id
- name
- slug
- description
- indication
- target_condition
- body_region
- therapeutic_goal
- level
- estimated_duration_days
- frequency
- contraindications
- precautions
- status, draft, active, archived
- origin, global ou clinic
- created_by
- reviewed_by
- reviewed_at
- created_at
- updated_at

Observações:

- Protocolos globais são modelos oficiais FisioOS.
- Protocolos da clínica podem ser criados do zero ou derivados de globais.
- Protocolo não deve ser prescrição; prescrição é instância para paciente.

### 3.6 protocol_exercises

Itens que compõem um protocolo.

Campos sugeridos:

- id
- protocol_id
- exercise_id
- sort_order
- phase
- day_number
- week_number
- sets
- repetitions
- duration_seconds
- hold_seconds
- rest_seconds
- frequency
- side, direita, esquerda, bilateral, não aplicável
- instructions_override
- precautions_override
- progression_notes
- created_at
- updated_at

Observações:

- Permite protocolo faseado.
- Overrides evitam duplicar exercício quando só muda dose ou instrução.

### 3.7 patient_exercise_prescriptions

Prescrição de exercícios para paciente.

Campos sugeridos:

- id
- clinic_id
- patient_id
- professional_id
- source_protocol_id
- title
- description
- clinical_goal
- start_date
- end_date
- frequency
- status, draft, active, completed, canceled, archived
- delivery_status, not_sent, sent, viewed, accepted
- portal_access_token_hash
- shared_at
- created_by
- created_at
- updated_at

Observações:

- Deve ser sempre escopada por `clinic_id`.
- Prescrição deve manter snapshot suficiente para não mudar historicamente se o exercício global for editado.
- Futura auditoria deve registrar criação, envio, edição e cancelamento.

### 3.8 prescription_exercise_items

Itens prescritos ao paciente.

Campos sugeridos:

- id
- prescription_id
- clinic_id
- patient_id
- exercise_id
- source_protocol_exercise_id
- exercise_snapshot
- media_snapshot
- sort_order
- phase
- sets
- repetitions
- duration_seconds
- hold_seconds
- rest_seconds
- frequency
- side
- patient_instructions
- clinical_notes
- status, active, skipped, completed, canceled
- created_at
- updated_at

Observações:

- `exercise_snapshot` preserva nome, instruções, contraindicações e doses no momento da prescrição.
- `media_snapshot` evita perda de histórico se mídia global for trocada.

### 3.9 exercise_favorites

Favoritos da clínica ou do profissional.

Campos sugeridos:

- id
- clinic_id
- professional_id, nulo quando favorito da clínica
- exercise_id
- protocol_id
- favorite_type, exercise ou protocol
- notes
- created_at

Observações:

- Favoritos por profissional melhoram produtividade.
- Favoritos por clínica ajudam padronização da equipe.
- Deve haver unicidade lógica por clínica/profissional/alvo.

## 4. Relacionamentos

### Exercício para Categoria

- `exercises.category_id` referencia `exercise_categories.id`.
- Categorias globais podem conter exercícios globais.
- Categorias da clínica podem conter exercícios da clínica.

Regra futura:

- Exercício de clínica não deve depender obrigatoriamente de categoria global para evitar quebra se a categoria global for reorganizada.

### Exercício para Mídia

- `exercise_media.exercise_id` referencia `exercises.id`.
- Um exercício pode ter múltiplas mídias.
- A mídia principal pode ser definida por `sort_order` ou campo futuro `is_primary`.

### Protocolo para Exercícios

- `exercise_protocols.id` se conecta a `protocol_exercises.protocol_id`.
- `protocol_exercises.exercise_id` referencia `exercises.id`.
- Um protocolo pode usar exercícios globais ou da clínica.

Regra futura:

- Protocolos globais devem usar apenas exercícios globais.
- Protocolos da clínica podem usar exercícios globais e exercícios da própria clínica.

### Paciente para Prescrição

- `patient_exercise_prescriptions.patient_id` referencia `patients.id`.
- `patient_exercise_prescriptions.clinic_id` deve ser obrigatório.
- Prescrição deve pertencer à mesma clínica do paciente.

### Prescrição para Exercícios

- `prescription_exercise_items.prescription_id` referencia `patient_exercise_prescriptions.id`.
- Cada item pode referenciar exercício original e preservar snapshot.

### Clínica para Favoritos e Templates

- `exercise_favorites.clinic_id` escopa favoritos.
- Protocolos da clínica funcionam como templates terapêuticos privados.
- Exercícios duplicados de globais ficam vinculados por `source_exercise_id`.

## 5. Campos e Taxonomia Recomendada

Campos clínicos principais:

- nome
- descrição
- região corporal
- articulação
- grupo muscular
- objetivo terapêutico
- nível
- equipamento
- contraindicações
- cuidados
- instruções ao paciente
- notas clínicas internas

Campos de dose:

- tempo
- repetições
- séries
- frequência
- tempo de sustentação
- descanso
- lado
- fase

Campos operacionais:

- status
- origem global/clínica
- autor
- revisor
- versão futura
- data de revisão
- tags
- mídia

## 6. Regras SaaS Futuras

### Biblioteca Global FisioOS

- Criada e mantida pela plataforma.
- Visível para clínicas conforme plano.
- Conteúdo global deve ser tratado como catálogo, não como dado clínico da clínica.
- Edições globais não devem alterar prescrições já emitidas.

### Biblioteca Personalizada por Clínica

- Clínica pode criar exercícios próprios.
- Clínica pode duplicar exercício global e adaptar linguagem, dose, observações e mídia.
- Conteúdo da clínica deve ser isolado por `clinic_id`.

### Duplicar Exercício Global

Fluxo futuro:

1. Usuário seleciona exercício global.
2. Sistema cria novo registro em `exercises` com `clinic_id`.
3. `source_exercise_id` aponta para o exercício global.
4. Mídias podem ser referenciadas ou copiadas conforme política de licença.

### Favoritos por Clínica e Profissional

- Profissional pode favoritar exercícios e protocolos para uso rápido.
- Clínica pode manter favoritos oficiais da equipe.
- Favoritos não devem alterar o exercício original.

### Protocolos Globais e da Clínica

- Protocolos globais são modelos oficiais.
- Protocolos de clínica são templates privados.
- Prescrição ao paciente instancia protocolo e congela snapshot dos itens.

### Permissões por Plano

Possíveis limites futuros:

- Plano básico: acesso à biblioteca global limitada, sem upload de vídeo próprio.
- Plano profissional: biblioteca global completa, favoritos e protocolos da clínica.
- Plano premium: mídia própria, portal do paciente, envio por WhatsApp/e-mail e IA.

Observação:

- Essas regras devem consultar módulo de permissões/planos, sem misturar com financeiro clínico.

## 7. Integrações Futuras

### Avaliação

- Sugerir exercícios com base em diagnóstico, objetivos, escalas, MRC, goniometria e queixa principal.
- Permitir criar prescrição a partir do plano terapêutico da avaliação.

### Evolução

- Registrar aderência, dor, dificuldade e resposta ao exercício.
- Ajustar prescrição com base na evolução.

### Protocolos Terapêuticos

- Vincular protocolo a objetivos terapêuticos e condições clínicas.
- Permitir progressão por fases.

### Documentos PDF

- Gerar PDF da prescrição com exercícios, imagens, QR code e orientações.
- Usar PDF Engine oficial do FisioOS.
- Manter identidade visual e white label da clínica.

### WhatsApp e E-mail

- Enviar link seguro da prescrição.
- Registrar envio e visualização.
- Evitar envio de dados sensíveis sem controle de consentimento.

### Portal do Paciente

- Paciente acessa prescrição, vídeos e instruções.
- Futuro registro de execução, dor e feedback.
- Token deve ser seguro, expirar ou ser revogável.

### IA Sugerindo Exercícios

- IA pode sugerir, mas fisioterapeuta aprova.
- Sugestão deve explicar critérios: objetivo, região, nível, contraindicações.
- IA não deve prescrever automaticamente sem validação profissional.

## 8. Riscos e Cuidados

### Direitos Autorais

- Vídeos, imagens e GIFs precisam de licença clara.
- Conteúdo global deve ser produzido internamente ou licenciado.
- Upload da clínica deve ter termo de responsabilidade.

### LGPD

- Prescrições são dados de saúde.
- Portal do paciente e compartilhamento exigem controle de acesso.
- Logs de acesso e consentimento são recomendados.

### Armazenamento

- Vídeos podem elevar custo rapidamente.
- Necessário limite por plano e compressão/transcodificação futura.
- Thumbnails e CDN devem ser considerados.

### Versionamento

- Exercício global pode mudar; prescrição emitida não deve mudar retroativamente.
- Snapshots são necessários para segurança clínica e jurídica.

### Auditoria

- Criar/editar/arquivar exercício.
- Criar/enviar/cancelar prescrição.
- Acessos do paciente ao portal.
- Alterações por IA devem registrar sugestão, aprovação e usuário responsável.

### Custo de Mídia

- Mídia global tem custo da plataforma.
- Mídia privada tem custo da clínica/plano.
- Vídeo exige governança de tamanho, duração e formato.

## 9. Separação Multi-Tenant

Regras futuras de isolamento:

- Dados globais: `clinic_id = null`, leitura controlada por plano.
- Dados de clínica: `clinic_id` obrigatório.
- Prescrições: sempre `clinic_id` obrigatório e coerente com paciente.
- Favoritos: sempre `clinic_id` obrigatório.
- Mídia: deve carregar escopo global ou da clínica.

RLS futura deve garantir:

- Clínica lê globais permitidos e seus próprios registros.
- Clínica não lê exercícios privados de outra clínica.
- Admin SaaS gerencia globais.
- Suporte pode ser somente leitura conforme modo suporte.

## 10. Fluxos Futuros

### Criar Exercício da Clínica

1. Usuário acessa Biblioteca de Exercícios.
2. Cria exercício próprio.
3. Define categoria, objetivo, dose padrão, cuidados e mídia.
4. Salva como rascunho ou ativo.

### Duplicar Exercício Global

1. Usuário abre exercício global.
2. Clica em duplicar para clínica.
3. Sistema cria cópia com `source_exercise_id`.
4. Usuário adapta instruções e dose.

### Criar Protocolo

1. Usuário cria protocolo.
2. Adiciona exercícios.
3. Define fases e progressão.
4. Salva como template da clínica.

### Prescrever para Paciente

1. Usuário escolhe paciente.
2. Seleciona protocolo ou exercícios avulsos.
3. Ajusta dose e instruções.
4. Gera PDF ou link de portal.
5. Sistema registra auditoria.

## 11. Backlog Técnico Futuro

Prioridade 1:

- Definir migrations com RLS multi-tenant.
- Criar catálogo global mínimo.
- Criar tela de listagem e filtros.
- Criar prescrição manual simples.

Prioridade 2:

- Protocolos globais e da clínica.
- Favoritos.
- Duplicação de exercício global.
- PDF de prescrição.

Prioridade 3:

- Upload e gestão de mídia.
- Portal do paciente.
- Envio por WhatsApp/e-mail.
- IA assistiva.

## 12. Fora de Escopo Agora

- Criar migrations.
- Alterar Supabase.
- Criar RLS.
- Alterar telas clínicas existentes.
- Alterar Admin SaaS.
- Alterar billing.
- Implementar upload de mídia.
- Implementar IA.

## 13. Decisão Arquitetural

A Biblioteca de Exercícios deve nascer como módulo clínico SaaS multi-tenant com três camadas:

1. Catálogo global FisioOS.
2. Biblioteca privada da clínica.
3. Prescrição congelada por paciente.

Essa separação evita mistura entre conteúdo editorial da plataforma, customização da clínica e dado clínico individual do paciente, preservando segurança, escalabilidade e confiança comercial.

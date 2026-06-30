# FisioOS Core — Arquitetura do Motor de Prescrição Clínica

> **Documento:** `docs/FISIOOS_CORE_ARCHITECTURE.md`  
> **Versão:** 1.0  
> **Escopo:** Referência oficial do Motor de Prescrição Clínica — **sem código, migrations, banco, rotas ou componentes**  
> **Relacionado:** `docs/architecture/FISIOOS_PLATFORM_ARCHITECTURE.md`

---

## 1. Objetivo

Definir o **Motor de Prescrição Clínica** como núcleo do FisioOS.

O FisioOS Core não é uma biblioteca de exercícios nem um cadastro de pacientes isolado. É o sistema que conduz o fisioterapeuta desde a entrada do paciente até a alta, organizando **avaliação, raciocínio clínico, plano terapêutico, prescrição, execução e evolução** em um fluxo contínuo e rastreável.

O motor existe para:

- **Centralizar a decisão clínica** no Caso Clínico, e não em módulos dispersos.
- **Prescrever condutas concretas** (exercícios, blocos, circuitos, protocolos adaptados) a partir de objetivos terapêuticos definidos.
- **Registrar o que foi feito, como foi feito e o que mudou** — sessão a sessão — gerando base para evolução, reavaliação e alta.
- **Servir de fundamento** para biblioteca, protocolos, IA e prescrição digital, sem que estes substituam o raciocínio do profissional.

Tudo o que orbita o Core — agenda, financeiro, documentos, marketplace — **consome ou complementa** este motor; não o substitui.

---

## 2. Fluxo Clínico

O fluxo abaixo representa a jornada canônica do paciente dentro do FisioOS Core. Cada etapa produz dados estruturados que alimentam a seguinte.

```
Paciente
  → Caso Clínico
  → Avaliação
  → Diagnóstico Funcional
  → Objetivos Terapêuticos
  → Plano Terapêutico
  → Sessões
  → Prescrições
  → Execução
  → Feedback
  → Evolução
  → Reavaliação
  → Alta
```

| Etapa | Papel no motor |
|-------|----------------|
| **Paciente** | Identidade e contexto demográfico; ponto de entrada do fluxo. |
| **Caso Clínico** | Container longitudinal de todo o tratamento; agrupa avaliações, plano, sessões e prescrições. |
| **Avaliação** | Coleta estruturada de dados clínicos (anamnese, exame físico, escalas, testes). |
| **Diagnóstico Funcional** | Síntese fisioterapêutica das limitações, capacidades e prognóstico funcional. |
| **Objetivos Terapêuticos** | Metas mensuráveis e temporais derivadas do diagnóstico funcional. |
| **Plano Terapêutico** | Estratégia viva de intervenção: frequência, foco, condutas previstas e critérios de progressão. |
| **Sessões** | Encontros clínicos agendados e realizados; unidade operacional do atendimento. |
| **Prescrições** | Condutas concretas prescritas para uma sessão ou período (exercícios, blocos, circuitos). |
| **Execução** | Registro do que o paciente/profissional efetivamente realizou na sessão. |
| **Feedback** | Resposta subjetiva e objetiva à execução (dor, tolerância, dificuldade, adesão). |
| **Evolução** | Registro clínico da sessão: resposta ao tratamento, ajustes e observações. |
| **Reavaliação** | Nova avaliação comparativa para medir progresso e revisar objetivos. |
| **Alta** | Encerramento formal do Caso Clínico com critérios documentados. |

O fluxo **não é estritamente linear**: reavaliações podem ocorrer durante o tratamento; o plano pode ser ajustado a qualquer momento; prescrições podem ser renovadas ou substituídas entre sessões.

---

## 3. Conceitos

### Paciente

Pessoa atendida pela clínica. Possui identidade, histórico e vínculo com um ou mais Casos Clínicos ao longo do tempo. O paciente **não é** o tratamento — é a entidade sobre a qual o motor opera.

### Caso Clínico

Unidade longitudinal de cuidado. Agrupa uma queixa, um período de tratamento, profissionais envolvidos, avaliações, plano terapêutico, sessões, prescrições e documentos. **Toda prescrição pertence a um Caso Clínico**, nunca a um módulo isolado.

### Avaliação

Processo estruturado de coleta de informações clínicas: anamnese, exame físico, testes funcionais, escalas, goniometria, força muscular e demais instrumentos. Pode ser inicial ou de reavaliação. Produz dados que fundamentam o Diagnóstico Funcional.

### Diagnóstico Funcional

Interpretação fisioterapêutica das limitações e potencialidades do paciente, expressa em linguagem funcional (não necessariamente CID). É a ponte entre os dados da avaliação e os Objetivos Terapêuticos.

### Objetivos

Metas clínicas mensuráveis, temporais e priorizadas. Exemplos: reduzir dor em repouso, recuperar amplitude de flexão de joelho, melhorar equilíbrio estático. Objetivos orientam **o que** prescrever e **quando** considerar progressão ou regressão.

### Plano Terapêutico

Documento vivo que descreve a estratégia de tratamento: objetivos, condutas previstas, frequência, duração estimada, critérios de progressão/regressão e responsáveis. **Evolui com o paciente** — não é um snapshot congelado na avaliação inicial.

### Sessão

Atendimento clínico individual, vinculado à agenda e ao Caso Clínico. É o momento em que prescrições são aplicadas, execução é registrada e evolução é documentada.

### Conduta

Intervenção terapêutica concreta prescrita ao paciente: exercício terapêutico, técnica manual, recurso eletrotermofototerapêutico, orientação educativa, etc. No motor, condutas são **instanciadas** a partir de modelos (protocolos, blocos) ou criadas ad hoc.

### Exercício

Unidade atômica de prescrição motora: nome, instruções, parâmetros (séries, repetições, tempo, carga), contraindicações e mídia de referência. Exercícios existem na biblioteca como **catálogo**; na prescrição tornam-se **condutas contextualizadas**.

### Bloco

Agrupamento lógico de exercícios ou condutas com ordem e propósito comum (ex.: aquecimento, fortalecimento, alongamento). Facilita prescrição repetível e leitura clínica.

### Circuito

Sequência de blocos ou exercícios executados em rodadas, com ordem, intervalos e critérios de transição. Usado quando a sessão tem estrutura cíclica ou station-based.

### Protocolo

Modelo reutilizável de prescrição: conjunto pré-definido de blocos, circuitos e exercícios para um perfil clínico ou objetivo. **Protocolos são templates**, não prescrições ativas — devem ser adaptados ao Caso Clínico antes de uso.

### Prescrição

Instância clínica de condutas atribuídas a um paciente, dentro de um Caso Clínico, para uma sessão ou período. Contém parâmetros ajustados, observações do fisioterapeuta e vínculo com objetivos. É o **produto final** do motor em cada ciclo de atendimento.

### Execução

Registro do que foi realizado na sessão: condutas executadas, parcialmente executadas ou omitidas; parâmetros efetivos (carga, repetições); tempo gasto.

### Feedback

Resposta à execução — do paciente (dor, esforço percebido, dificuldade) e/ou do profissional (tolerância, compensações, adesão). Alimenta decisões de progressão, regressão ou manutenção.

### Progressão

Aumento controlado de demanda terapêutica (carga, volume, complexidade, amplitude) quando critérios clínicos são atingidos. Deve ser **explicitamente decidida** pelo fisioterapeuta.

### Regressão

Redução temporária de demanda quando há dor, fadiga, recidiva ou baixa tolerância. Protege o paciente e mantém adesão ao tratamento.

### Reavaliação

Nova avaliação comparativa, geralmente periódica ou disparada por marco clínico. Mede evolução em relação à baseline e pode revisar diagnóstico funcional, objetivos e plano.

### Alta

Encerramento formal do Caso Clínico. Documenta critérios atingidos, orientações de manutenção, encaminhamentos e estado funcional final.

---

## 4. Regras

Estas regras são **invioláveis** na arquitetura do motor. Qualquer feature futura deve respeitá-las.

### Plano Terapêutico é vivo

O plano não termina na avaliação inicial. Sessões, feedback, evoluções e reavaliações **atualizam** o plano. O sistema deve versionar ou registrar alterações, não sobrescrever silenciosamente.

### Biblioteca não é o centro

A biblioteca de exercícios é um **repositório de insumos**. O centro do FisioOS é o **Caso Clínico** e seu fluxo de prescrição. Navegar exercícios sem contexto clínico é auxiliar, não operação principal.

### Protocolos são modelos

Protocolos aceleram a prescrição, mas **nunca** são aplicados automaticamente ao paciente. Toda instanciação exige revisão, adaptação e aprovação do fisioterapeuta no contexto do Caso Clínico.

### Prescrição pertence ao Caso Clínico

Prescrições não flutuam entre pacientes, clínicas ou sessões sem vínculo explícito. Rastreabilidade clínica e multi-tenant dependem deste agrupamento.

### IA apenas sugere

Inteligência artificial pode propor exercícios, blocos, progressões ou redações com base em avaliação e evolução. **Nunca** prescreve, altera plano ou registra evolução sem aprovação humana explícita.

### Toda decisão é aprovada pelo fisioterapeuta

Progressão, regressão, alta, alteração de objetivos e conteúdo de prescrição são **atribuição exclusiva** do profissional habilitado. O sistema registra, organiza e alerta — não decide.

---

## 5. Escopo futuro

Módulos e capacidades que **orbitam** o Motor de Prescrição Clínica, sem redefinir o núcleo:

| Módulo | Relação com o motor |
|--------|---------------------|
| **Biblioteca** | Catálogo global e por clínica de exercícios, mídia e metadados. Alimenta prescrições; não substitui o Caso Clínico. |
| **Protocolos** | Templates clínicos reutilizáveis (por patologia, região, objetivo). Instanciados como prescrição após adaptação. |
| **IA** | Sugestão contextual de condutas, progressão e documentação com base em avaliação, evolução e objetivos. Sempre sob aprovação do fisioterapeuta. |
| **Marketplace** | Distribuição de protocolos e conteúdos entre clínicas ou autores. Modelos entram na biblioteca; prescrições permanecem locais ao Caso Clínico. |
| **Prescrição digital** | Entrega da prescrição ao paciente por PDF, link, WhatsApp, e-mail ou portal — com parâmetros, vídeos e lembretes de execução domiciliar. |
| **Aplicativo do paciente** | Canal do paciente para visualizar prescrição, registrar execução domiciliar, feedback e adesão — retroalimentando o motor via Caso Clínico. |

Implementação destes módulos deve **estender** o fluxo da seção 2, respeitando as regras da seção 4.

---

**FISIOOS CORE ARCHITECTURE v1.0**

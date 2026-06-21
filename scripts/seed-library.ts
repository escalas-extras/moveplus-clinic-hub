// Generates SQL UPDATE statements to populate library_contents with rich markdown bodies.
// Run: bun scripts/seed-library.ts > /tmp/seed-library.sql

type Item = { title: string; body: string; summary?: string; tags?: string[] };

function esc(s: string) { return s.replace(/'/g, "''"); }
function tagArr(t: string[]) { return `ARRAY[${t.map((x) => `'${esc(x)}'`).join(",")}]::text[]`; }

// --- Generic templates ---

const cartilha = (cond: string, def: string, sintomas: string[], cuidados: string[], exercicios: string[], alerta: string, quando: string[]) => `
## Sobre a condição

${def}

## Sinais e sintomas mais comuns

${sintomas.map((s) => `- ${s}`).join("\n")}

## Cuidados no dia a dia

${cuidados.map((c) => `- ${c}`).join("\n")}

## Exercícios recomendados

${exercicios.map((e, i) => `${i + 1}. ${e}`).join("\n")}

Realize 1 a 2 séries de 8 a 12 repetições, conforme orientação do(a) fisioterapeuta. Respeite o limite de dor.

## Alertas de segurança

> ${alerta}

## Quando procurar atendimento imediato

${quando.map((q) => `- ${q}`).join("\n")}

## Acompanhamento fisioterapêutico

A fisioterapia em ${cond} é fundamental para preservar funcionalidade, prevenir complicações e melhorar qualidade de vida. Mantenha as sessões com regularidade e siga as orientações domiciliares.
`.trim();

const protocolo = (cond: string, objetivos: string[], avaliacao: string[], condutas: string[], freq: string, criterios: string[]) => `
## Indicação clínica

Protocolo destinado a pacientes com ${cond}, em fase ${objetivos.length > 0 ? "subaguda/crônica" : "aguda"} ou em manutenção funcional.

## Objetivos terapêuticos

${objetivos.map((o) => `- ${o}`).join("\n")}

## Avaliação inicial

${avaliacao.map((a) => `- ${a}`).join("\n")}

## Condutas fisioterapêuticas

${condutas.map((c, i) => `${i + 1}. ${c}`).join("\n")}

## Frequência e progressão

${freq}

## Critérios de progressão e alta

${criterios.map((c) => `- ${c}`).join("\n")}

> Adapte o protocolo ao perfil do paciente. Reavaliação a cada 4–6 semanas é recomendada para ajuste de condutas.

## Referências sugeridas

- Diretrizes COFFITO/SBF vigentes.
- Literatura clínica indexada (PEDro, Cochrane).
`.trim();

const exercicio = (nome: string, obj: string, execucao: string[], series: string, cuidados: string[]) => `
## Objetivo

${obj}

## Execução passo a passo

${execucao.map((p, i) => `${i + 1}. ${p}`).join("\n")}

## Séries e repetições

${series}

## Cuidados

${cuidados.map((c) => `- ${c}`).join("\n")}

> Em caso de dor aguda, tontura ou desconforto que não cessa, interrompa o exercício e contate seu fisioterapeuta.
`.trim();

// --- Specific contents ---

const items: Record<string, Item> = {
  // CARTILHAS
  "Cartilha AVC — Orientações ao Familiar": {
    summary: "Guia prático para familiares de pessoas que sofreram um Acidente Vascular Cerebral (AVC).",
    tags: ["AVC", "neurologia", "familiar", "cuidador"],
    body: cartilha(
      "pessoas com AVC",
      "O Acidente Vascular Cerebral (AVC) é uma interrupção do fluxo sanguíneo cerebral que pode causar perda de força, alteração da fala, sensibilidade, equilíbrio e cognição. A recuperação depende de reabilitação precoce, multiprofissional e contínua.",
      ["Fraqueza ou paralisia em um lado do corpo", "Dificuldade para falar ou compreender", "Alteração de equilíbrio e marcha", "Perda de sensibilidade ou formigamento", "Dificuldade para engolir (disfagia)"],
      ["Estimular o lado afetado em tarefas cotidianas (vestir, comer, escovar dentes)", "Posicionar adequadamente na cama e na cadeira para evitar feridas e contraturas", "Oferecer alimentos com consistência segura conforme orientação fonoaudiológica", "Estimular a comunicação com paciência, evitando completar frases", "Manter ambiente seguro: pisos antiderrapantes, barras de apoio, iluminação adequada"],
      ["Alongamento passivo do braço e perna afetados (5 min/dia)", "Transferências de cama para cadeira com auxílio", "Treino de equilíbrio sentado, com supervisão", "Marcha assistida em ambiente seguro", "Atividades de motricidade fina (pinçar objetos, abotoar)"],
      "Nunca force movimentos que causem dor intensa. Atenção a sinais de trombose venosa (inchaço, calor, dor na panturrilha) e a quedas.",
      ["Novo episódio de fraqueza súbita, dificuldade de fala ou desvio facial", "Convulsões", "Febre persistente", "Engasgos frequentes durante alimentação", "Queda com suspeita de fratura"],
    ),
  },
  "Cartilha Parkinson — Vida Diária": {
    summary: "Orientações para pessoas com Doença de Parkinson e seus familiares.",
    tags: ["Parkinson", "neurologia", "marcha", "equilíbrio"],
    body: cartilha(
      "pessoas com Doença de Parkinson",
      "A Doença de Parkinson é uma condição neurodegenerativa que afeta o movimento, causando tremor, rigidez, lentidão (bradicinesia) e alterações de equilíbrio. A fisioterapia mantém a mobilidade e previne quedas.",
      ["Tremor de repouso em mãos", "Rigidez muscular", "Lentidão de movimentos", "Postura inclinada para frente", "Marcha com passos curtos e arrastados", "Episódios de congelamento (freezing)"],
      ["Mantenha rotina regular de exercícios físicos", "Use sapatos firmes e antiderrapantes", "Retire tapetes soltos e obstáculos do caminho", "Use barras de apoio no banheiro", "Tome medicamentos rigorosamente nos horários prescritos", "Pratique boa hidratação e alimentação rica em fibras"],
      ["Marcha com pisadas largas e passadas marcadas em voz alta (1-2-1-2)", "Alongamento de coluna e ombros (manter por 30 segundos)", "Exercícios de equilíbrio em pé, com apoio próximo", "Treino de virar-se na cama em 4 passos", "Exercícios faciais e de fala em frente ao espelho"],
      "Cuidado com momentos de freezing (pés colados ao chão). Pare, respire e dê o primeiro passo grande e lateral.",
      ["Quedas com lesão", "Engasgos repetidos", "Piora abrupta dos sintomas", "Confusão mental nova", "Quadro depressivo importante"],
    ),
  },
  "Cartilha Alzheimer": {
    summary: "Orientações para cuidadores e familiares de pessoas com Doença de Alzheimer.",
    tags: ["Alzheimer", "demência", "cuidador", "geriatria"],
    body: cartilha(
      "pessoas com Doença de Alzheimer",
      "A Doença de Alzheimer é uma demência progressiva que afeta memória, linguagem, julgamento e funcionalidade. A fisioterapia preserva mobilidade, previne quedas e estimula funções cognitivas por meio do movimento.",
      ["Esquecimento de fatos recentes", "Dificuldade em tarefas habituais", "Desorientação no tempo e espaço", "Alteração de humor e comportamento", "Lentidão e marcha insegura nas fases avançadas"],
      ["Mantenha rotina estável e ambiente conhecido", "Use relógios, calendários e fotos para orientação", "Identifique cômodos com placas/figuras", "Garanta boa iluminação e remova obstáculos", "Estimule atividades físicas leves diárias", "Acompanhe a alimentação e hidratação"],
      ["Caminhadas curtas, supervisionadas, em ambiente seguro", "Exercícios de equilíbrio sentado e em pé", "Alongamentos suaves de membros superiores e inferiores", "Atividades com bola ou objetos coloridos para estimulação", "Jogos de coordenação simples"],
      "Evite ambientes muito estimulantes em fases avançadas (agitação). Supervisione banhos e escadas para prevenir quedas.",
      ["Queda com lesão", "Recusa alimentar prolongada", "Sinais de desidratação", "Agitação ou agressividade nova", "Febre, tosse persistente ou alteração urinária"],
    ),
  },
  "Cartilha Esclerose Múltipla": {
    summary: "Orientações para pessoas com Esclerose Múltipla.",
    tags: ["esclerose múltipla", "neurologia", "fadiga"],
    body: cartilha(
      "pessoas com Esclerose Múltipla",
      "A Esclerose Múltipla (EM) é uma doença autoimune que afeta o sistema nervoso central, causando fadiga, alterações motoras, sensoriais e de equilíbrio. A fisioterapia regular preserva força, mobilidade e independência.",
      ["Fadiga intensa, especialmente ao calor", "Fraqueza em membros", "Alterações de equilíbrio e coordenação", "Formigamento e dormência", "Visão turva ou dupla em surtos", "Alteração esfincteriana"],
      ["Evite exposição prolongada a calor (banhos quentes, sol forte)", "Hidrate-se bem ao longo do dia", "Faça pausas regulares para evitar fadiga extrema", "Pratique exercícios em horários de maior disposição", "Use órteses ou bengala quando indicado"],
      ["Alongamento global suave (10 min/dia)", "Fortalecimento leve com elásticos (membros superiores e inferiores)", "Exercícios de equilíbrio na cadeira e em pé", "Caminhadas curtas com pausas", "Exercícios respiratórios diafragmáticos"],
      "Respeite o sinal da fadiga. Excesso de esforço pode desencadear ou piorar sintomas (fenômeno de Uhthoff com calor).",
      ["Surto novo: piora súbita de força, visão ou equilíbrio", "Queda com lesão", "Retenção urinária ou perda total do controle esfincteriano", "Febre ou infecção sem causa aparente"],
    ),
  },
  "Cartilha Lesão Medular": {
    summary: "Guia de orientação para pessoas com lesão medular e cuidadores.",
    tags: ["lesão medular", "neurologia", "reabilitação"],
    body: cartilha(
      "pessoas com lesão medular",
      "A lesão medular causa perda parcial ou total da força, sensibilidade e funções autonômicas abaixo do nível afetado. A reabilitação fisioterapêutica é contínua e visa máxima independência funcional e prevenção de complicações.",
      ["Paralisia ou paresia abaixo do nível lesado", "Alteração de sensibilidade", "Espasticidade ou flacidez", "Disfunção vesical e intestinal", "Risco de úlceras por pressão", "Hipotensão postural"],
      ["Mude de posição na cama a cada 2 horas para prevenir úlceras", "Inspecione a pele diariamente, principalmente proeminências ósseas", "Mantenha cateterismo intermitente conforme orientação", "Use almofada antiescaras na cadeira de rodas", "Eleve a cabeceira lentamente para evitar tontura"],
      ["Mobilização passiva de todas as articulações (2x/dia)", "Transferências cama-cadeira treinadas com supervisão", "Fortalecimento de tronco e membros superiores", "Treino de equilíbrio sentado", "Exercícios respiratórios"],
      "Atenção a sinais de disreflexia autonômica (cefaleia súbita, rubor, sudorese acima do nível lesado) em lesões altas: é urgência médica.",
      ["Disreflexia autonômica", "Úlceras por pressão", "Sinais de infecção urinária (febre, urina turva)", "Espasticidade nova e intensa", "Trombose venosa profunda (panturrilha inchada e dolorosa)"],
    ),
  },
  "Cartilha Lombalgia": {
    summary: "Cartilha educativa para pacientes com dor lombar.",
    tags: ["lombalgia", "ortopedia", "coluna", "postura"],
    body: cartilha(
      "lombalgia",
      "A lombalgia é a dor na região lombar (parte baixa das costas), uma das queixas mais comuns na população. Na maioria dos casos é benigna e melhora com tratamento conservador, exercícios e cuidados posturais.",
      ["Dor lombar com ou sem irradiação", "Rigidez matinal", "Dificuldade para flexionar o tronco", "Dor ao ficar muito tempo sentado ou em pé", "Em casos com hérnia: dor irradiada para a perna"],
      ["Evite ficar muito tempo na mesma posição — alterne sentado e em pé", "Ao levantar peso, dobre os joelhos e mantenha a coluna ereta", "Use cadeira com bom apoio lombar", "Mantenha peso corporal adequado", "Pratique atividade física regular"],
      ["Báscula pélvica deitado (10 repetições)", "Ponte (10 repetições)", "Alongamento de isquiotibiais (manter 30 segundos)", "Joelho ao peito (10 repetições por lado)", "Cat-camel (10 repetições suaves)"],
      "Evite repouso prolongado na cama — piora o quadro. Atividade leve e progressiva é o tratamento de escolha.",
      ["Dor irradiada com perda de força na perna", "Alteração de sensibilidade em região genital ou perineal", "Perda de controle esfincteriano", "Febre associada à dor", "Dor após trauma significativo", "Perda de peso inexplicada"],
    ),
  },
  "Cartilha Cervicalgia": {
    summary: "Orientações para pacientes com dor cervical.",
    tags: ["cervicalgia", "ortopedia", "coluna", "ergonomia"],
    body: cartilha(
      "cervicalgia",
      "A cervicalgia é a dor na região do pescoço, comum em pessoas que passam muito tempo em postura inadequada (computador, celular) ou que sofreram tensão muscular. Geralmente é benigna e responde bem a exercícios e ajustes posturais.",
      ["Dor e rigidez no pescoço", "Tensão muscular nos ombros", "Dor de cabeça (cefaleia tensional)", "Dificuldade para girar a cabeça", "Em alguns casos: formigamento no braço"],
      ["Ajuste a altura do monitor à altura dos olhos", "Faça pausas a cada 50 minutos de trabalho", "Evite usar o celular com o pescoço muito flexionado", "Use travesseiro adequado (apoio à curvatura cervical)", "Pratique alongamentos durante o dia"],
      ["Rotação cervical lenta (5 para cada lado)", "Inclinação lateral suave (manter 15 segundos)", "Alongamento de trapézio superior", "Retração cervical (queixo para trás, 10 repetições)", "Fortalecimento isométrico cervical (5 segundos cada direção)"],
      "Evite manipulações bruscas de pescoço. Em caso de dor com formigamento intenso ou perda de força no braço, procure avaliação médica.",
      ["Perda de força ou sensibilidade em braços", "Tontura intensa associada a movimentos do pescoço", "Cefaleia súbita e muito intensa", "Febre com rigidez de pescoço", "Dor após trauma"],
    ),
  },
  "Cartilha Joelho": {
    summary: "Orientações para pacientes com dor no joelho.",
    tags: ["joelho", "ortopedia", "artrose", "ligamento"],
    body: cartilha(
      "dor no joelho",
      "A dor no joelho pode ter origem em sobrecarga, lesão ligamentar, condromalácia ou artrose. A fisioterapia fortalece a musculatura, melhora alinhamento e reduz a dor.",
      ["Dor anterior do joelho ao subir/descer escadas", "Estalos ou crepitação", "Inchaço após esforço", "Sensação de instabilidade", "Dificuldade para agachar"],
      ["Evite agachar profundamente sem orientação", "Use calçados com bom amortecimento", "Mantenha peso corporal adequado", "Aqueça antes de exercícios intensos", "Fortaleça quadríceps e glúteos regularmente"],
      ["Cadeira invertida (extensão de joelho com peso leve, 10 repetições)", "Ponte com apoio dos pés (10 repetições)", "Abdução de quadril deitado de lado (10 por lado)", "Alongamento de quadríceps em pé", "Mini-agachamento contra a parede (10 repetições)"],
      "Não treine se houver inchaço significativo ou dor que aumenta no dia seguinte ao exercício.",
      ["Joelho que trava ou cede subitamente", "Inchaço com vermelhidão e calor", "Incapacidade de apoiar peso", "Trauma com deformidade", "Febre associada à dor"],
    ),
  },
  "Cartilha Ombro": {
    summary: "Orientações para pacientes com dor ou limitação no ombro.",
    tags: ["ombro", "ortopedia", "manguito rotador"],
    body: cartilha(
      "dor no ombro",
      "A dor no ombro pode ser causada por tendinopatias do manguito rotador, bursite, ombro congelado (capsulite) ou lesões. A fisioterapia restaura amplitude de movimento e força.",
      ["Dor ao elevar o braço acima da cabeça", "Dor noturna ao deitar sobre o ombro", "Perda de força", "Limitação para pentear ou se vestir", "Em casos crônicos: rigidez (ombro congelado)"],
      ["Evite carregar peso excessivo no braço afetado", "Não durma sobre o ombro doloroso", "Aplique calor antes dos exercícios e gelo após esforço", "Mantenha boa postura ao trabalhar", "Não force movimentos que doem"],
      ["Pendular com peso leve (1 min, 2x ao dia)", "Elevação assistida com bastão", "Rotação externa com elástico (10 repetições)", "Alongamento da cápsula posterior", "Fortalecimento de escapulares (remada baixa)"],
      "Evite manipulações bruscas e movimentos abruptos. Progrida cargas gradualmente.",
      ["Trauma com deformidade visível", "Perda total da capacidade de elevar o braço", "Dor intensa que piora à noite e não responde a analgésicos", "Febre associada", "Formigamento no braço associado a fraqueza"],
    ),
  },
  "Cartilha Artrose": {
    summary: "Orientações para pessoas com osteoartrite (artrose).",
    tags: ["artrose", "ortopedia", "geriatria"],
    body: cartilha(
      "artrose",
      "A artrose (osteoartrite) é uma doença degenerativa das articulações, mais comum em joelhos, quadris, mãos e coluna. Causa dor, rigidez e limitação. Exercício é o tratamento mais eficaz.",
      ["Dor articular que melhora com repouso", "Rigidez matinal curta (até 30 minutos)", "Crepitação articular", "Limitação progressiva de movimento", "Dificuldade para atividades como subir escadas"],
      ["Mantenha peso corporal adequado", "Pratique atividades de baixo impacto (caminhada, natação, hidroginástica)", "Use calçados confortáveis e com amortecimento", "Evite carregar excesso de peso", "Use bengala no lado oposto à articulação dolorida se necessário"],
      ["Fortalecimento de quadríceps (cadeira extensora leve, 10 repetições)", "Alongamento global (15 minutos diários)", "Exercícios na água (hidroterapia)", "Mobilização articular suave", "Caminhada de 20-30 minutos, 3-5x por semana"],
      "Movimento é remédio. Repouso prolongado piora a rigidez e a fraqueza muscular.",
      ["Inchaço articular intenso com vermelhidão e calor (suspeita de artrite)", "Dor súbita e incapacitante", "Febre associada", "Queda com suspeita de fratura"],
    ),
  },
  "Cartilha Pós-Operatório": {
    summary: "Orientações gerais para o paciente em fase pós-operatória de cirurgias ortopédicas.",
    tags: ["pós-operatório", "ortopedia", "reabilitação"],
    body: cartilha(
      "pacientes pós-operatórios",
      "O pós-operatório é a fase de cicatrização e recuperação funcional após uma cirurgia. A fisioterapia precoce reduz complicações, recupera amplitude de movimento, força e função.",
      ["Dor no local cirúrgico", "Edema (inchaço) local", "Restrição de movimento", "Fraqueza muscular", "Cicatriz em formação"],
      ["Mantenha o curativo limpo e seco conforme orientação", "Eleve o membro operado nas primeiras 72h", "Use crioterapia (gelo) por 15-20 min, 3x ao dia, sobre a região (com proteção)", "Respeite as restrições de carga e movimento", "Tome a medicação prescrita nos horários certos"],
      ["Exercícios isométricos da musculatura ao redor (sem mover articulação operada)", "Mobilização das articulações vizinhas", "Exercícios respiratórios para evitar complicações pulmonares", "Marcha com auxiliar conforme prescrição", "Progressão gradual de carga"],
      "Nunca pule etapas da reabilitação. Respeite os prazos de cicatrização determinados pela equipe.",
      ["Vermelhidão, calor ou secreção purulenta na cicatriz", "Febre persistente acima de 38°C", "Dor súbita e intensa diferente da habitual", "Inchaço da panturrilha (suspeita de trombose)", "Falta de ar súbita"],
    ),
  },
  "Cartilha DPOC": {
    summary: "Orientações para pessoas com Doença Pulmonar Obstrutiva Crônica (DPOC).",
    tags: ["DPOC", "respiratória", "pneumologia"],
    body: cartilha(
      "pessoas com DPOC",
      "A DPOC é uma doença pulmonar crônica caracterizada por obstrução ao fluxo aéreo, geralmente associada ao tabagismo. A fisioterapia respiratória e o exercício físico melhoram a tolerância e a qualidade de vida.",
      ["Falta de ar (dispneia) aos esforços", "Tosse crônica", "Produção de catarro", "Chiado no peito", "Cansaço para atividades habituais"],
      ["Pare de fumar — fundamental", "Use as medicações inalatórias corretamente, nos horários", "Evite ambientes com fumaça e poluentes", "Tome vacinas (gripe e pneumonia) anualmente", "Mantenha boa nutrição e hidratação"],
      ["Respiração diafragmática (5 min, 3x ao dia)", "Respiração com lábios franzidos durante esforços", "Caminhada progressiva (5 a 30 minutos)", "Alongamentos de membros superiores", "Fortalecimento leve com elásticos"],
      "Em crise de dispneia, sente-se inclinado para frente com mãos apoiadas, respire com lábios franzidos e use a medicação de resgate.",
      ["Dispneia que não melhora com medicação de resgate", "Cianose (lábios/dedos azulados)", "Confusão mental nova", "Febre associada à piora respiratória", "Dor torácica intensa"],
    ),
  },
  "Cartilha Pós-Covid": {
    summary: "Orientações para reabilitação pós-COVID-19.",
    tags: ["pós-COVID", "respiratória", "reabilitação"],
    body: cartilha(
      "pacientes pós-COVID-19",
      "Após a fase aguda da COVID-19, muitos pacientes apresentam sintomas persistentes como fadiga, dispneia, fraqueza muscular e alterações cognitivas. A reabilitação multiprofissional acelera a recuperação.",
      ["Fadiga persistente", "Falta de ar aos esforços", "Fraqueza muscular generalizada", "Tosse residual", "Alteração de olfato e paladar", "Dificuldade de concentração ('brain fog')"],
      ["Retorne às atividades de forma progressiva — não force", "Respeite o sinal da fadiga, faça pausas", "Mantenha hidratação e alimentação adequadas", "Pratique higiene do sono", "Acompanhamento médico para alterações cardíacas/pulmonares"],
      ["Respiração diafragmática (5 min, 2x ao dia)", "Caminhada curta e progressiva (começar com 5 minutos)", "Fortalecimento leve de membros (elásticos ou peso corporal)", "Alongamentos globais", "Exercícios de equilíbrio se necessário"],
      "Cuidado com o esforço excessivo nas primeiras semanas — pode causar piora (post-exertional malaise). Progrida gradualmente.",
      ["Dor torácica", "Falta de ar súbita ou em repouso", "Palpitações intensas", "Tontura intensa ou desmaio", "Febre persistente"],
    ),
  },
  "Prevenção de Quedas": {
    summary: "Orientações para idosos e familiares sobre prevenção de quedas em casa.",
    tags: ["quedas", "geriatria", "segurança"],
    body: cartilha(
      "idosos com risco de quedas",
      "As quedas são a principal causa de lesões em idosos e podem gerar fraturas, perda de independência e medo de cair novamente. Com pequenas mudanças no ambiente e exercícios regulares, o risco diminui muito.",
      ["Insegurança ao caminhar", "Tontura ao levantar", "Fraqueza nas pernas", "Visão prejudicada", "Episódios prévios de queda"],
      ["Retire tapetes soltos e fios pelo chão", "Instale barras de apoio no banheiro", "Mantenha boa iluminação, especialmente noturna", "Use sapatos firmes, antiderrapantes, com cadarço ou velcro", "Levante-se da cama lentamente para evitar tontura", "Mantenha óculos sempre limpos e com grau atualizado"],
      ["Sentar e levantar da cadeira (10 repetições, 2x ao dia)", "Marcha tandem (pé na frente do outro, 10 passos)", "Apoio em uma perna só com apoio próximo (15 segundos cada lado)", "Caminhada diária de 20-30 minutos", "Alongamento de panturrilhas e quadris"],
      "Em caso de tontura ao levantar, sente-se imediatamente e aguarde antes de tentar novamente.",
      ["Queda com dor intensa, deformidade ou incapacidade de se mover", "Perda de consciência associada à queda", "Sangramento que não cessa", "Dor de cabeça importante após queda", "Confusão mental nova"],
    ),
  },
  "Mobilidade do Idoso": {
    summary: "Orientações para manter e melhorar a mobilidade na terceira idade.",
    tags: ["mobilidade", "geriatria", "independência"],
    body: cartilha(
      "idosos com perda de mobilidade",
      "Manter a mobilidade na terceira idade é fundamental para preservar independência, evitar quedas, manter saúde cardiovascular e qualidade de vida. Exercício regular é o tratamento mais eficaz.",
      ["Lentidão para caminhar", "Dificuldade para subir escadas", "Cansaço fácil", "Postura curvada", "Marcha com passos curtos"],
      ["Caminhe diariamente, mesmo que em distâncias curtas", "Suba escadas sempre que possível, com apoio no corrimão", "Mantenha boa hidratação e alimentação proteica", "Pratique atividade física regular orientada", "Use calçados firmes e adequados"],
      ["Caminhada de 20-30 minutos, 5x por semana", "Sentar e levantar de cadeira (10 repetições)", "Elevação de calcanhar em pé (15 repetições)", "Marcha estacionária (1 minuto)", "Alongamentos diários (15 minutos)"],
      "Comece sempre devagar e progrida conforme sua tolerância. Hidrate-se durante e após o exercício.",
      ["Dor torácica durante exercício", "Falta de ar intensa", "Tontura ou desmaio", "Queda durante atividade", "Dor articular muito intensa"],
    ),
  },
  "Exercícios Domiciliares": {
    summary: "Programa básico de exercícios para realizar em casa, com supervisão profissional periódica.",
    tags: ["exercícios", "domiciliar", "home care"],
    body: cartilha(
      "pacientes em programa domiciliar",
      "Exercícios em casa permitem manter os ganhos da fisioterapia entre as sessões. Devem ser realizados com regularidade, respeitando os limites e sob orientação profissional.",
      ["Esta cartilha apresenta um programa básico", "Pode ser adaptado pelo seu fisioterapeuta conforme suas necessidades", "Frequência ideal: 3 a 5 vezes por semana"],
      ["Reserve um horário fixo do dia para os exercícios", "Use roupas confortáveis", "Mantenha boa hidratação", "Faça em ambiente seguro, com apoio próximo se necessário", "Respeite seu limite — não force"],
      ["Aquecimento: caminhada estacionária (3 minutos)", "Alongamento global (5 minutos)", "Fortalecimento: sentar e levantar (10 repetições)", "Equilíbrio: ficar em uma perna (15 segundos cada lado, com apoio)", "Coordenação: marcha tandem (10 passos)", "Resfriamento: respiração diafragmática (3 minutos)"],
      "Pare imediatamente se sentir dor torácica, falta de ar intensa, tontura ou dor muscular muito forte.",
      ["Sintomas novos durante exercícios", "Quedas", "Piora persistente da dor após exercício", "Inchaço novo em articulações"],
    ),
  },

  // PROTOCOLOS
  "Protocolo AVC": {
    summary: "Protocolo fisioterapêutico para reabilitação pós-AVC em fase subaguda e crônica.",
    tags: ["AVC", "neurologia", "protocolo"],
    body: protocolo(
      "AVC",
      ["Recuperar/maximizar a função motora do hemicorpo afetado", "Treinar transferências e marcha independentes", "Prevenir contraturas e úlceras por pressão", "Estimular reaprendizagem motora baseada em tarefas", "Restaurar equilíbrio e propriocepção"],
      ["Escala de Fugl-Meyer (MMSS e MMII)", "Escala de Berg (equilíbrio)", "FIM (Medida de Independência Funcional)", "MRC para força muscular", "Teste do Timed Up and Go"],
      ["Mobilização passiva e ativa-assistida (30 min)", "Treino de transferências (sentado-pé, leito-cadeira)", "Estimulação sensorial do hemicorpo afetado", "Treino de marcha com suporte de peso (esteira/solo)", "Treino orientado à tarefa (CIMT, robótica quando disponível)", "Treino de equilíbrio estático e dinâmico", "Fortalecimento progressivo de musculatura paretica"],
      "Frequência mínima de 3 sessões semanais de 50–60 minutos. Em fase subaguda, intensificar para 5x/semana sempre que possível. Sessões podem ser divididas conforme tolerância à fadiga.",
      ["Marcha independente sem auxílio em superfícies planas", "Berg > 45 pontos", "Independência em transferências e AVDs básicas", "FIM com ganho clinicamente significativo (>10 pontos)", "Reintegração às atividades comunitárias"],
    ),
  },
  "Protocolo Parkinson": {
    summary: "Protocolo fisioterapêutico para Doença de Parkinson.",
    tags: ["Parkinson", "neurologia", "protocolo"],
    body: protocolo(
      "Doença de Parkinson",
      ["Manter ou melhorar mobilidade global", "Treinar marcha com estratégias para freezing", "Prevenir quedas", "Melhorar equilíbrio e postura", "Manter independência funcional"],
      ["UPDRS-III (motor)", "Escala de Berg e Mini-BESTest", "Timed Up and Go", "10-Meter Walk Test", "Escala de Hoehn & Yahr"],
      ["Aquecimento: caminhada com pisadas amplas (5 min)", "Alongamento global focado em coluna e ombros", "Treino de marcha com pistas visuais e auditivas (cadência)", "Treino de equilíbrio dinâmico (LSVT-BIG quando disponível)", "Fortalecimento de tronco e MMII", "Exercícios faciais e respiratórios", "Treino de dupla tarefa", "Treino de transferências e duplas tarefas cognitivas"],
      "3x por semana, sessões de 60 minutos. Realizar preferencialmente na janela ON da medicação (1 a 2h após a tomada).",
      ["Manutenção ou ganho de Berg ≥ 45", "TUG < 13.5s", "Ausência de quedas no período", "Independência funcional preservada", "Adesão a programa domiciliar"],
    ),
  },
  "Protocolo Alzheimer": {
    summary: "Protocolo fisioterapêutico para pessoas com Doença de Alzheimer e demências.",
    tags: ["Alzheimer", "demência", "geriatria"],
    body: protocolo(
      "Doença de Alzheimer",
      ["Preservar mobilidade funcional", "Reduzir risco de quedas", "Estimular cognição via movimento", "Manter independência em AVDs"],
      ["Mini-Exame do Estado Mental (MEEM)", "Escala de Berg", "Timed Up and Go", "Avaliação funcional simples (Katz/Lawton)", "Risco de quedas (Morse)"],
      ["Aquecimento leve com música familiar (5 min)", "Exercícios em circuito simples e repetitivo", "Treino de marcha em ambiente estruturado", "Atividades de coordenação com bola, balão", "Exercícios de equilíbrio com apoio", "Atividades duplas (motor + cognitivo simples)", "Resfriamento e relaxamento"],
      "2 a 3 sessões semanais de 40–50 minutos, em ambiente calmo, com cuidador presente. Adaptar conforme estágio da demência (leve/moderada/avançada).",
      ["Manutenção da mobilidade funcional", "Redução de episódios de queda", "Cuidador capacitado para estímulos em casa", "Adesão familiar ao plano"],
    ),
  },
  "Protocolo Geriátrico": {
    summary: "Protocolo de avaliação e tratamento fisioterapêutico para a pessoa idosa.",
    tags: ["geriatria", "protocolo", "idoso"],
    body: protocolo(
      "população idosa",
      ["Manter ou recuperar capacidade funcional", "Prevenir quedas e fraturas", "Manter força e mobilidade", "Promover autonomia"],
      ["Anamnese geriátrica detalhada", "Escala de Berg / Tinetti", "Timed Up and Go", "Velocidade de marcha (4m)", "Força de preensão palmar", "Escala de Katz/Lawton (AVDs)", "Mini Nutritional Assessment quando indicado"],
      ["Aquecimento articular global (10 min)", "Treino aeróbico moderado (caminhada/bike) — 20 min", "Fortalecimento progressivo (MMII, tronco, MMSS) — 20 min", "Treino de equilíbrio e propriocepção", "Treino de marcha e transferências", "Educação em saúde e orientações ao familiar"],
      "Mínimo de 2x por semana, sessões de 50–60 minutos. Reavaliações trimestrais.",
      ["Melhora ou manutenção de Berg ≥ 45", "TUG < 14s", "Manutenção da independência em AVDs", "Ausência de quedas", "Adesão ao programa domiciliar"],
    ),
  },
  "Protocolo Lombalgia": {
    summary: "Protocolo fisioterapêutico para lombalgia mecânica/crônica.",
    tags: ["lombalgia", "ortopedia", "protocolo"],
    body: protocolo(
      "lombalgia mecânica",
      ["Reduzir dor", "Restaurar mobilidade da coluna", "Fortalecer musculatura estabilizadora (core)", "Educar o paciente sobre prognóstico e cuidados", "Reintegrar às atividades habituais"],
      ["Escala visual analógica (EVA) de dor", "Oswestry Disability Index", "Teste de flexão anterior (Schober)", "Teste de força de tronco", "Avaliação postural"],
      ["Educação em neurociência da dor (10 min)", "Aquecimento e mobilidade lombar (báscula, cat-camel)", "Alongamento de isquiotibiais, glúteos e piriforme", "Fortalecimento de core (prancha, ponte, dead-bug) progressivo", "Exercícios de estabilização segmentar", "Treino aeróbico (caminhada/bike) — 20 min", "Orientações ergonômicas"],
      "2 a 3 sessões semanais por 6 a 12 semanas. Progredir cargas a cada 2 semanas conforme tolerância.",
      ["Redução de EVA em pelo menos 50%", "Oswestry < 20%", "Retorno às atividades habituais e laborais", "Plano de exercícios domiciliares estabelecido"],
    ),
  },
  "Protocolo Cervicalgia": {
    summary: "Protocolo fisioterapêutico para cervicalgia mecânica/postural.",
    tags: ["cervicalgia", "ortopedia", "protocolo"],
    body: protocolo(
      "cervicalgia mecânica",
      ["Reduzir dor", "Restaurar amplitude cervical", "Fortalecer flexores profundos e estabilizadores escapulares", "Corrigir postura cabeça-pescoço", "Educar sobre ergonomia"],
      ["EVA de dor", "Neck Disability Index", "ADM cervical (rotação, inclinação, flexão/extensão)", "Teste de flexão craniocervical", "Avaliação postural"],
      ["Mobilizações cervicais suaves", "Alongamento de trapézio superior, escalenos e elevador da escápula", "Fortalecimento de flexores profundos (chin tuck)", "Estabilização escapular (remada, retração)", "Liberação miofascial", "Termoterapia conforme tolerância", "Orientações ergonômicas"],
      "2 a 3 sessões semanais por 4 a 8 semanas, com programa domiciliar diário.",
      ["EVA com redução clinicamente significativa", "NDI < 14 pontos", "Retorno ao trabalho sem limitação", "Postura cabeça-pescoço corrigida"],
    ),
  },
  "Protocolo Artrose": {
    summary: "Protocolo fisioterapêutico para artrose de joelho e quadril.",
    tags: ["artrose", "ortopedia", "geriatria"],
    body: protocolo(
      "artrose de joelho e quadril",
      ["Reduzir dor", "Aumentar força de quadríceps e glúteos", "Melhorar amplitude articular", "Reduzir limitação funcional", "Educar sobre manejo crônico"],
      ["EVA / WOMAC", "ADM articular", "Força de quadríceps (dinamômetro ou cadeira invertida)", "Timed Up and Go", "Teste de marcha de 6 minutos"],
      ["Educação em manejo da doença (15 min na 1ª sessão)", "Aquecimento (bike sem carga, 5 min)", "Fortalecimento progressivo de quadríceps, glúteos e isquiotibiais", "Mobilização articular suave", "Exercícios aquáticos quando disponíveis", "Treino aeróbico de baixo impacto (20 min)", "Orientações sobre redução de peso e calçado"],
      "2 a 3 sessões por semana por 8 a 12 semanas. Programa de manutenção contínuo recomendado.",
      ["Redução de pelo menos 30% no WOMAC dor", "Ganho de força de quadríceps", "Manutenção ou ganho funcional no TUG", "Plano de exercícios domiciliares estabelecido"],
    ),
  },
  "Protocolo Fratura Fêmur": {
    summary: "Protocolo fisioterapêutico para reabilitação após fratura/osteossíntese de fêmur.",
    tags: ["fratura fêmur", "ortopedia", "pós-operatório"],
    body: protocolo(
      "fratura de fêmur pós-operatório",
      ["Prevenir complicações da imobilidade (TVP, escaras, pneumonia)", "Restaurar ADM e força do membro operado", "Treinar marcha com auxiliar conforme prescrição", "Recuperar independência funcional", "Prevenir nova queda"],
      ["Avaliação de dor (EVA)", "ADM de quadril e joelho", "Força de quadríceps e glúteos (graduada)", "Tinetti / Berg", "Funcionalidade (FIM)"],
      ["Fase 1 (precoce): exercícios respiratórios, mobilização passiva, isométricos de quadríceps e glúteos, transferências com proteção de carga", "Fase 2: marcha com andador conforme prescrição de carga, fortalecimento progressivo, alongamento", "Fase 3: progressão para muleta/bengala, treino de escada, marcha em diferentes superfícies", "Fase 4: treino funcional, reintegração às atividades, prevenção de quedas"],
      "Em fase hospitalar: 1–2x ao dia. Após alta: 3 a 5x por semana por 8 a 12 semanas conforme evolução.",
      ["Marcha independente com ou sem auxiliar conforme idade/condição", "ADM funcional", "Força grau 4 ou mais nos grupos principais", "Independência em transferências e AVDs", "Plano de prevenção de quedas estabelecido"],
    ),
  },
  "Protocolo DPOC": {
    summary: "Protocolo de reabilitação pulmonar para pacientes com DPOC.",
    tags: ["DPOC", "respiratória", "reabilitação pulmonar"],
    body: protocolo(
      "DPOC",
      ["Reduzir dispneia", "Aumentar tolerância ao exercício", "Melhorar qualidade de vida", "Educar sobre manejo da doença", "Reduzir exacerbações"],
      ["Espirometria recente", "Teste de marcha de 6 minutos", "Escala mMRC e CAT", "SpO₂ basal e em esforço", "Avaliação nutricional"],
      ["Treino aeróbico (esteira/bike) em intensidade moderada — 20 a 30 min", "Fortalecimento de MMSS (peitoral, ombros, dorso) com cargas leves", "Fortalecimento de MMII (quadríceps, glúteos)", "Exercícios respiratórios (diafragmática, lábios franzidos)", "Treino muscular inspiratório quando indicado (Threshold/PowerBreathe)", "Educação em saúde e ajuste de medicação inalatória", "Treino com AVDs simuladas"],
      "3 sessões semanais, 60 minutos, por 8 a 12 semanas. Manter programa de manutenção após o ciclo.",
      ["Aumento de pelo menos 30 m no TC6", "Redução do CAT em pelo menos 2 pontos", "Redução de exacerbações no período", "Adesão a programa domiciliar"],
    ),
  },
  "Protocolo Pós-Covid": {
    summary: "Protocolo fisioterapêutico para reabilitação pós-COVID-19.",
    tags: ["pós-COVID", "respiratória", "reabilitação"],
    body: protocolo(
      "pós-COVID-19",
      ["Reduzir fadiga e dispneia", "Recuperar força muscular global", "Restaurar capacidade aeróbica", "Reintegrar às atividades habituais", "Monitorar sintomas persistentes"],
      ["Teste de marcha de 6 minutos", "Borg para dispneia/fadiga", "SpO₂ em repouso e em esforço", "Força de preensão", "Sit-to-stand de 1 minuto", "Questionário de qualidade de vida"],
      ["Avaliação inicial com triagem para PASC", "Treino aeróbico progressivo (caminhada, bike) — iniciar com 5–10 min", "Fortalecimento progressivo de MMSS e MMII", "Treino respiratório (diafragmática, expansão torácica)", "Treino de equilíbrio se necessário", "Educação sobre pacing e manejo de fadiga", "Progressão guiada pela tolerância (regra da Borg ≤ 12-13)"],
      "2 a 3 sessões semanais por 6 a 12 semanas, com progressão cautelosa. Sinais de post-exertional malaise exigem regressão.",
      ["Ganho ≥ 50 m no TC6", "Redução de fadiga em escala de Borg", "Retorno às atividades habituais", "Adesão ao programa domiciliar"],
    ),
  },

  // EXERCÍCIOS
  "Sentar e Levantar": {
    summary: "Exercício funcional fundamental para força de MMII e prevenção de quedas.",
    tags: ["exercício", "MMII", "funcional"],
    body: exercicio(
      "Sentar e Levantar",
      "Fortalecer quadríceps, glúteos e musculatura do tronco, e treinar uma das transferências mais importantes do dia a dia.",
      ["Sente-se em uma cadeira firme, sem braços, com os pés apoiados no chão na largura do quadril", "Incline o tronco levemente para frente", "Empurre o chão com os pés e levante-se sem usar as mãos (se possível)", "Estenda completamente os quadris e joelhos no topo", "Volte a sentar de forma controlada, sem se deixar cair"],
      "3 séries de 10 repetições, 1 vez ao dia.",
      ["Use uma cadeira firme e estável", "Se necessário, apoie-se nos braços da cadeira no início e progrida para sem apoio", "Mantenha os joelhos alinhados com os pés (não deixe cair para dentro)", "Respire normalmente — não prenda a respiração"],
    ),
  },
  "Agachamento Apoiado": {
    summary: "Exercício de fortalecimento de MMII com apoio para segurança.",
    tags: ["exercício", "MMII", "quadríceps"],
    body: exercicio(
      "Agachamento Apoiado",
      "Fortalecer quadríceps, glúteos e core de forma segura, com apoio para iniciantes ou pacientes com instabilidade.",
      ["Posicione-se em pé de frente para uma parede ou cadeira estável, com as mãos apoiadas", "Coloque os pés na largura do quadril", "Flexione joelhos e quadris simultaneamente como se fosse sentar, descendo até onde for confortável (não passe de 90°)", "Mantenha o peso nos calcanhares e o tronco ereto", "Suba contraindo glúteos e quadríceps"],
      "3 séries de 10 a 15 repetições.",
      ["Não deixe os joelhos passarem da linha dos dedos dos pés", "Mantenha a coluna neutra", "Inicie com pequena amplitude e progrida conforme tolerância", "Não permita dor no joelho durante o movimento"],
    ),
  },
  "Ponte": {
    summary: "Exercício de fortalecimento de glúteos e estabilização lombar.",
    tags: ["exercício", "glúteo", "core", "lombar"],
    body: exercicio(
      "Ponte",
      "Fortalecer glúteos, isquiotibiais e musculatura estabilizadora da coluna lombar, melhorando postura e reduzindo dor lombar.",
      ["Deite-se de costas com joelhos flexionados e pés apoiados no chão na largura do quadril", "Mantenha braços relaxados ao lado do corpo", "Contraia os glúteos e eleve o quadril até formar uma linha reta entre joelhos, quadril e ombros", "Mantenha a posição por 2 segundos", "Desça lentamente sem deixar o quadril tocar o chão entre as repetições"],
      "3 séries de 10 a 15 repetições.",
      ["Mantenha a coluna neutra — não estenda demais", "Contraia o abdômen para estabilizar", "Não eleve o quadril mais alto do que o alinhamento com os joelhos", "Pare se sentir dor lombar"],
    ),
  },
  "Marcha Tandem": {
    summary: "Exercício de equilíbrio dinâmico essencial para prevenção de quedas.",
    tags: ["exercício", "equilíbrio", "quedas"],
    body: exercicio(
      "Marcha Tandem",
      "Treinar equilíbrio dinâmico colocando um pé exatamente na frente do outro, simulando uma linha imaginária.",
      ["Posicione-se próximo a uma parede ou corrimão para apoio se necessário", "Coloque o calcanhar de um pé exatamente em contato com a ponta do outro", "Olhe para frente, não para os pés", "Dê 10 a 15 passos seguindo uma linha imaginária reta", "Vire-se com cuidado e retorne"],
      "Realizar 2 a 3 vezes ao dia, 10 a 15 passos cada vez.",
      ["Sempre tenha um apoio próximo no início", "Pratique inicialmente com supervisão de alguém", "Aumente a dificuldade fechando os olhos (apenas quando seguro)", "Pare se sentir tontura"],
    ),
  },
  "Respiração Diafragmática": {
    summary: "Exercício respiratório básico para melhorar ventilação e reduzir dispneia.",
    tags: ["exercício", "respiratória", "diafragma"],
    body: exercicio(
      "Respiração Diafragmática",
      "Treinar o uso do diafragma na respiração, melhorando ventilação, reduzindo trabalho respiratório e aliviando ansiedade.",
      ["Deite-se confortavelmente ou sente-se com o tronco apoiado", "Coloque uma mão sobre o peito e outra sobre o abdômen", "Inspire lentamente pelo nariz, sentindo a mão sobre o abdômen subir (a do peito deve mover-se pouco)", "Expire lentamente pela boca com lábios franzidos, sentindo o abdômen descer", "Repita por 5 a 10 minutos"],
      "5 a 10 minutos, 2 a 3 vezes ao dia.",
      ["Não force a respiração — mantenha o ritmo confortável", "Em caso de tontura, faça pausas", "Em pacientes com DPOC, sempre associar à expiração com lábios franzidos"],
    ),
  },

  // DOCUMENTOS
  "Termo de Consentimento": {
    summary: "Modelo de Termo de Consentimento Livre e Esclarecido para tratamento fisioterapêutico.",
    tags: ["documento", "consentimento", "LGPD"],
    body: `
## Finalidade

Este Termo de Consentimento Livre e Esclarecido tem por objetivo informar ao(à) paciente, ou seu(sua) responsável legal, sobre a natureza, objetivos, riscos e benefícios do tratamento fisioterapêutico proposto, em consonância com a Resolução COFFITO nº 415/2012 e a Lei Geral de Proteção de Dados (LGPD).

## Esclarecimentos prestados

- O tratamento fisioterapêutico será conduzido por profissional habilitado e registrado no CREFITO.
- O plano terapêutico foi explicado de forma clara, incluindo objetivos, técnicas utilizadas, frequência e duração estimada.
- Foram apresentados os possíveis benefícios, bem como riscos e desconfortos inerentes ao tratamento (dor muscular tardia, fadiga, reações cutâneas leves).
- O paciente tem direito de interromper o tratamento a qualquer momento, sem prejuízo do atendimento.

## Tratamento de dados pessoais

Os dados pessoais e clínicos coletados serão utilizados exclusivamente para fins assistenciais, em conformidade com a LGPD. Não serão compartilhados sem consentimento expresso, exceto nas hipóteses legais previstas.

## Declaração

Declaro ter recebido todas as informações necessárias, ter tirado minhas dúvidas e CONSINTO livremente com o tratamento proposto, autorizando a coleta e tratamento dos meus dados conforme descrito.

## Assinaturas

Local e data: ______________________________________

Paciente / Responsável legal: ______________________________________

Profissional responsável (com CREFITO): ______________________________________
`.trim(),
  },
  "Autorização de Imagem": {
    summary: "Modelo de termo de autorização de uso de imagem para fins educativos e de marketing.",
    tags: ["documento", "imagem", "LGPD"],
    body: `
## Finalidade

Este documento autoriza a utilização de imagens (fotos e/ou vídeos) do(a) paciente para fins educativos, científicos, institucionais ou de divulgação dos serviços, em conformidade com a Lei Geral de Proteção de Dados (LGPD).

## Detalhamento

- A autorização é concedida de forma voluntária, podendo ser revogada a qualquer momento mediante solicitação por escrito.
- As imagens poderão ser utilizadas em materiais educativos, redes sociais, site institucional e materiais impressos, sem fins comerciais que não estejam vinculados à atividade fisioterapêutica.
- Não será divulgado nome, dados de identificação ou qualquer informação clínica do(a) paciente sem nova autorização específica.
- A clínica compromete-se a tratar as imagens com respeito, ética e em conformidade com a LGPD.

## Direitos do titular

O(A) paciente tem direito, a qualquer momento, a solicitar:

- Acesso às imagens armazenadas
- Correção ou retirada de imagens já publicadas
- Revogação total da autorização

## Declaração

Declaro estar ciente do uso pretendido e AUTORIZO a captação e divulgação de minhas imagens conforme descrito.

## Assinaturas

Local e data: ______________________________________

Paciente / Responsável legal: ______________________________________

Profissional responsável: ______________________________________
`.trim(),
  },
  "Declaração de Comparecimento": {
    summary: "Modelo de declaração para comprovar comparecimento do paciente à sessão.",
    tags: ["documento", "comparecimento"],
    body: `
## Modelo de Declaração

Declaramos, para os devidos fins, que o(a) Sr(a). [Nome do paciente], portador(a) do documento de identidade nº [RG/CPF], compareceu a esta clínica para atendimento fisioterapêutico no dia [data], no horário das [hora de início] às [hora de término].

## Observações

- A presente declaração tem caráter exclusivamente comprobatório de comparecimento, não substituindo atestado médico.
- Não contém informações clínicas, em respeito ao sigilo profissional e à LGPD.
- O atendimento foi realizado pelo(a) profissional [Nome do fisioterapeuta], CREFITO nº [registro].

## Validade

Esta declaração é válida apenas para a data e horário descritos.

## Assinatura

Local e data: ______________________________________

Profissional responsável: ______________________________________

CREFITO: ______________________________________

Carimbo da clínica.
`.trim(),
  },
  "Contrato de Prestação": {
    summary: "Modelo simplificado de contrato de prestação de serviços fisioterapêuticos.",
    tags: ["documento", "contrato", "jurídico"],
    body: `
## Partes

CONTRATADA: [Razão social da clínica], inscrita no CNPJ sob nº [CNPJ], com sede em [endereço], representada por [responsável técnico], CREFITO nº [registro].

CONTRATANTE: [Nome completo do paciente ou responsável], portador(a) do CPF nº [CPF], residente em [endereço].

## Objeto

O presente contrato tem por objeto a prestação de serviços fisioterapêuticos pela CONTRATADA ao(à) CONTRATANTE, conforme plano terapêutico definido após avaliação clínica.

## Obrigações da CONTRATADA

- Prestar atendimento por profissionais habilitados e registrados no CREFITO
- Garantir sigilo profissional e proteção de dados conforme LGPD
- Fornecer recibo dos pagamentos realizados
- Cumprir o plano terapêutico acordado

## Obrigações do(a) CONTRATANTE

- Comparecer às sessões agendadas com pontualidade
- Comunicar com antecedência mínima de 24 horas qualquer impossibilidade de comparecer
- Efetuar o pagamento conforme valores e condições acordados
- Seguir as orientações terapêuticas e cuidados domiciliares

## Valores e pagamento

Valor da sessão: R$ [valor]. Forma de pagamento: [condição]. Vencimento: [data].

## Vigência e rescisão

Este contrato vigora a partir da assinatura, podendo ser rescindido por qualquer das partes com aviso prévio de 7 dias.

## Foro

Fica eleito o foro da comarca de [cidade/UF] para dirimir quaisquer questões oriundas do presente contrato.

## Assinaturas

[Cidade/UF], [data].

CONTRATADA: ______________________________________

CONTRATANTE: ______________________________________
`.trim(),
  },

  // MARKETING / POSTS / TREINAMENTOS / POPS
  "Campanha AVC": {
    summary: "Sugestões de conteúdo para campanha de conscientização sobre AVC.",
    tags: ["marketing", "AVC", "campanha"],
    body: `
## Conceito da campanha

Conscientizar a comunidade sobre os sinais de AVC e a importância da fisioterapia precoce na reabilitação, posicionando a clínica como referência em reabilitação neurológica.

## Mensagens-chave

- Reconheça os sinais: SAMU — Sorriso assimétrico, Abraço fraco, Música (fala) confusa, Urgência (chame ajuda).
- A janela das primeiras 4,5 horas é crucial para o tratamento médico.
- A reabilitação fisioterapêutica precoce melhora drasticamente o prognóstico.

## Sugestões de peças

### Post 1 — Sinais de AVC
Imagem: ilustração com os 4 sinais SAMU.
Texto: "Saber reconhecer um AVC pode salvar uma vida. Em caso de dúvida, chame o SAMU — 192."

### Post 2 — Depoimento (paciente real, com autorização)
Vídeo curto (45s) mostrando paciente em recuperação com a equipe.
Texto: "A fisioterapia me devolveu a independência. Conheça nosso programa de reabilitação neurológica."

### Post 3 — Educativo
Carrossel com 5 mitos e verdades sobre AVC.

### Story diário — semana de conscientização
Estatísticas, sinais, dicas, equipe e bastidores.

## Canais sugeridos

Instagram, Facebook, Google Meu Negócio, WhatsApp Business (status).

## Métricas de acompanhamento

Alcance, engajamento, mensagens recebidas, agendamentos no período.
`.trim(),
  },
  "Campanha Mobilidade Idoso": {
    summary: "Sugestões de conteúdo para campanha de prevenção de quedas e manutenção da mobilidade na terceira idade.",
    tags: ["marketing", "geriatria", "campanha"],
    body: `
## Conceito da campanha

Educar idosos e familiares sobre prevenção de quedas, importância da mobilidade e papel da fisioterapia geriátrica.

## Mensagens-chave

- A cada 3 idosos, 1 cai por ano — e 20% das quedas geram lesões graves.
- Pequenas mudanças em casa reduzem em até 60% o risco de quedas.
- Exercícios regulares orientados são o melhor remédio para manter independência.

## Sugestões de peças

### Post 1 — Checklist da casa segura
Carrossel: tapetes, iluminação, barras de apoio, calçados.

### Post 2 — 3 exercícios para fazer em casa
Vídeo curto demonstrando: sentar/levantar, marcha tandem, equilíbrio em uma perna.

### Post 3 — Depoimento de paciente (com autorização)
Vídeo de 1 minuto mostrando ganho funcional.

### Story semanal
Dicas rápidas, agenda de eventos, "antes e depois" autorizado.

## Canais sugeridos

Instagram, Facebook (público familiares), WhatsApp Business.

## Métricas de acompanhamento

Alcance, mensagens recebidas, novos cadastros de pacientes geriátricos, participação em palestras.
`.trim(),
  },
  "Como usar a Move+": {
    summary: "Treinamento básico de uso do sistema FisioOS para a equipe Move+.",
    tags: ["treinamento", "sistema", "Move+"],
    body: `
## Objetivo do treinamento

Capacitar a equipe Move+ no uso do FisioOS para registro clínico, agendamento, evolução e gestão administrativa.

## Módulos abordados

### 1. Login e segurança
- Acesso pelo navegador
- Política de senhas
- Encerrar sessão ao sair

### 2. Cadastro de pacientes
- Como cadastrar um novo paciente
- Campos obrigatórios (LGPD)
- Anexar documentos

### 3. Agenda
- Criar agendamentos
- Reagendar e cancelar
- Confirmar presença

### 4. Avaliação e Evolução
- Iniciar avaliação
- Preencher campos clínicos
- Salvar como rascunho ou finalizar
- Registrar evoluções vinculadas

### 5. Documentos
- Gerar recibo, declaração, contrato
- Assinar digitalmente
- Validar por hash/QR Code

### 6. Biblioteca
- Buscar conteúdo
- Favoritar
- Gerar PDF de cartilhas para o paciente

## Boas práticas

- Sempre registrar evolução logo após a sessão
- Não compartilhar login
- Em caso de dúvida, consultar o admin da clínica

## Avaliação final

Quiz de 10 questões disponibilizado ao final.
`.trim(),
  },
  "Onboarding da Equipe": {
    summary: "Roteiro de integração para novos colaboradores da clínica.",
    tags: ["treinamento", "onboarding", "RH"],
    body: `
## Boas-vindas

Sejam bem-vindos(as) à equipe! Este roteiro de integração tem como objetivo apresentar a clínica, sua cultura, processos e ferramentas.

## Dia 1 — Apresentação

- Apresentação da clínica, missão, visão e valores
- Conhecer a equipe e instalações
- Entrega de uniforme, crachá e materiais
- Cadastro no FisioOS

## Dia 2 — Processos clínicos

- Fluxo de atendimento (recepção, avaliação, evolução, alta)
- Padrões de prontuário
- LGPD e sigilo profissional
- Protocolos clínicos utilizados

## Dia 3 — Processos administrativos

- Agendamento e confirmação
- Faturamento e convênios
- Comunicação com pacientes
- POPs operacionais

## Dia 4 — Sombra (shadowing)

- Acompanhar um(a) profissional sênior em atendimentos
- Observar fluxos completos

## Dia 5 — Avaliação inicial

- Conversa com gestão sobre dúvidas
- Plano de desenvolvimento individual
- Definição de mentor(a)

## Materiais de apoio

- Manual interno
- Treinamento FisioOS
- Protocolos clínicos
- Política de privacidade

## Acompanhamento

Reuniões 1:1 semanais nos primeiros 90 dias.
`.trim(),
  },
  "Post Dia do Fisioterapeuta": {
    summary: "Sugestão de post para o Dia do Fisioterapeuta (13 de outubro).",
    tags: ["marketing", "redes sociais", "data comemorativa"],
    body: `
## Sugestão de post

### Imagem
Foto da equipe (com autorização) em ambiente de atendimento, com uniforme da clínica.

### Texto
"Hoje, 13 de outubro, celebramos o Dia do Fisioterapeuta.

Reconhecemos cada profissional que dedica sua vida a devolver movimento, autonomia e qualidade de vida às pessoas. Na [nome da clínica], temos orgulho de contar com uma equipe comprometida com excelência técnica e acolhimento humano.

A todos os nossos profissionais: obrigado por transformarem vidas todos os dias.

#DiaDoFisioterapeuta #Fisioterapia #Movimento #Saúde"

### Story complementar

Bastidores: equipe trabalhando, café da equipe, depoimentos curtos em vídeo (3-5s cada) sobre "por que escolhi a fisioterapia".

### Sugestão de campanha extra

Sortear uma avaliação fisioterapêutica gratuita entre os seguidores que comentarem com a história de como a fisioterapia mudou sua vida.

## Hashtags sugeridas

#DiaDoFisioterapeuta #Fisioterapia13deOutubro #Movimento #Reabilitação #FisioterapiaSalvaVidas #[nomeDaClinica]
`.trim(),
  },
  "Story Dica da Semana": {
    summary: "Sugestão de série semanal de stories educativos.",
    tags: ["marketing", "stories", "redes sociais"],
    body: `
## Conceito

Série semanal de stories educativos no formato "Dica da semana", postados toda segunda-feira.

## Estrutura sugerida

### Story 1 — Apresentação do tema
Tópico da semana (ex: "Como aliviar a dor lombar no home office").

### Story 2 — Dica prática 1
Texto curto + ilustração simples.

### Story 3 — Dica prática 2
Vídeo curto demonstrando exercício ou postura.

### Story 4 — Mito ou verdade?
Caixa de enquete: "Verdade ou mito: dormir de bruços causa dor lombar?"

### Story 5 — Chamada para ação
"Quer ajuda personalizada? Mande mensagem ou agende uma avaliação. Estamos aqui para você."

## Calendário sugerido

- Semana 1: Postura no trabalho
- Semana 2: Dores na coluna
- Semana 3: Prevenção de quedas em idosos
- Semana 4: Reabilitação pós-cirúrgica
- Semana 5: Exercícios em casa

## Boas práticas

- Use sempre identidade visual da clínica
- Texto curto, fonte legível, contraste adequado
- Inclua sticker de localização e mencione horários de atendimento ao final
- Salve nos destaques permanentes para consulta
`.trim(),
  },
  "POP Atendimento Domiciliar": {
    summary: "Procedimento Operacional Padrão para atendimentos em domicílio (home care).",
    tags: ["POP", "home care", "qualidade"],
    body: `
## Objetivo

Padronizar o atendimento fisioterapêutico em domicílio, garantindo segurança, qualidade e conformidade ética.

## Responsáveis

Fisioterapeuta executor, coordenação clínica, equipe administrativa.

## Materiais necessários

- Maleta com EPIs (luvas, álcool em gel, máscara)
- Materiais de avaliação (goniômetro, fita métrica, dinamômetro)
- Materiais terapêuticos (elásticos, halteres leves, bola, faixas)
- Prontuário (tablet/celular com FisioOS) ou ficha em papel
- Termo de consentimento (se for primeira visita)

## Procedimento

### 1. Pré-visita
- Confirmar agendamento com paciente/familiar 24h antes
- Revisar prontuário e plano terapêutico
- Conferir materiais

### 2. Chegada ao domicílio
- Apresentar-se com identificação visível
- Higienizar mãos com álcool 70%
- Avaliar ambiente para segurança (riscos de queda, iluminação)

### 3. Atendimento
- Atualizar sinais vitais e queixas
- Executar plano terapêutico
- Orientar paciente e familiar/cuidador
- Registrar evolução no FisioOS antes de sair

### 4. Pós-visita
- Higienizar materiais utilizados
- Comunicar coordenação sobre intercorrências
- Registrar deslocamento e horários

## Critérios de qualidade

- 100% das visitas com evolução registrada no mesmo dia
- 0 não conformidades em auditoria de prontuário
- Avaliação de satisfação ≥ 9/10

## Revisão

Documento revisado anualmente ou em caso de mudança nos processos.
`.trim(),
  },
  "POP Higienização": {
    summary: "Procedimento Operacional Padrão para higienização de equipamentos e ambiente.",
    tags: ["POP", "higienização", "qualidade", "biossegurança"],
    body: `
## Objetivo

Padronizar a higienização de equipamentos, materiais e ambientes da clínica, garantindo segurança ao paciente e à equipe, em conformidade com normas de biossegurança (RDC 63/2011 e correlatas).

## Responsáveis

Toda a equipe clínica e equipe de limpeza.

## Materiais

- Álcool 70%
- Hipoclorito de sódio 1%
- Detergente neutro
- Panos e flanelas exclusivos para cada superfície
- Sabonete líquido e álcool em gel
- EPIs

## Procedimento por área

### 1. Macas e equipamentos de contato direto
- Higienizar com álcool 70% após cada atendimento
- Trocar lençol/papel descartável a cada paciente

### 2. Equipamentos eletroterapêuticos
- Limpar cabos e eletrodos com álcool 70% após uso
- Eletrodos individuais quando possível
- Inspecionar integridade dos cabos antes do uso

### 3. Bolas, elásticos, halteres
- Higienizar com álcool 70% após cada uso
- Inspecionar periodicamente para descarte de itens danificados

### 4. Piso e superfícies
- Limpeza diária com detergente neutro e hipoclorito 1%
- Limpeza imediata em caso de derramamento de fluidos

### 5. Banheiros e vestiários
- Limpeza completa pelo menos 2x ao dia
- Reposição de sabonete, papel higiênico e papel toalha

### 6. Higienização das mãos
- Antes e após cada paciente
- Antes e após uso de luvas
- Técnica completa: 40 a 60 segundos

## Registro

Registrar em planilha diária de limpeza, com horário e responsável.

## Revisão

Revisão semestral ou após qualquer atualização normativa.
`.trim(),
  },
};

console.log("BEGIN;");
for (const [title, item] of Object.entries(items)) {
  const summary = item.summary ?? null;
  const body = item.body;
  const tags = item.tags ?? [];
  const setSummary = summary ? `summary = '${esc(summary)}',` : "";
  const setTags = tags.length ? `tags = ${tagArr(tags)},` : "";
  console.log(`UPDATE public.library_contents SET ${setSummary} ${setTags} body = '${esc(body)}', status = 'active', scope = 'global', clinic_id = NULL, updated_at = now() WHERE title = '${esc(title)}';`);
}
console.log("COMMIT;");

// Centralized configuration for clinical scales used in FisioOS
// Each scale = items (with options/score) + classifier (total -> label + risk_level)

export type RiskLevel = "baixo" | "moderado" | "alto" | "muito_alto";
export type ScaleType =
  | "barthel" | "katz" | "berg" | "tinetti" | "braden"
  | "gds15" | "meem" | "tug" | "ftsst" | "tc6m" | "alcance_funcional"
  | "romberg" | "tandem" | "unipodal" | "preensao_palmar"
  | "panturrilha" | "marcha_velocidade" | "sono_idoso" | "aga";

export type ScaleItem = {
  key: string;
  label: string;
  options?: { value: number; label: string }[];
  kind?: "select" | "numeric";
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
};

export type ScaleConfig = {
  type: ScaleType;
  title: string;
  description: string;
  items: ScaleItem[];
  classify: (total: number) => { classification: string; risk: RiskLevel };
  maxScore: number;
};

// --- Barthel (0-100) ---
const barthel: ScaleConfig = {
  type: "barthel",
  title: "Índice de Barthel",
  description: "Avaliação de independência funcional para atividades básicas de vida diária (AVDs).",
  maxScore: 100,
  items: [
    { key: "alimentacao", label: "Alimentação", options: [
      { value: 0, label: "Dependente (0)" }, { value: 5, label: "Ajuda parcial (5)" }, { value: 10, label: "Independente (10)" }] },
    { key: "banho", label: "Banho", options: [{ value: 0, label: "Dependente (0)" }, { value: 5, label: "Independente (5)" }] },
    { key: "vestir", label: "Vestir-se", options: [
      { value: 0, label: "Dependente (0)" }, { value: 5, label: "Ajuda (5)" }, { value: 10, label: "Independente (10)" }] },
    { key: "higiene", label: "Higiene pessoal", options: [{ value: 0, label: "Dependente (0)" }, { value: 5, label: "Independente (5)" }] },
    { key: "intestinos", label: "Continência intestinal", options: [
      { value: 0, label: "Incontinente (0)" }, { value: 5, label: "Ocasional (5)" }, { value: 10, label: "Continente (10)" }] },
    { key: "urinaria", label: "Continência urinária", options: [
      { value: 0, label: "Incontinente (0)" }, { value: 5, label: "Ocasional (5)" }, { value: 10, label: "Continente (10)" }] },
    { key: "wc", label: "Uso do banheiro", options: [
      { value: 0, label: "Dependente (0)" }, { value: 5, label: "Ajuda (5)" }, { value: 10, label: "Independente (10)" }] },
    { key: "transferencia", label: "Transferência (cama-cadeira)", options: [
      { value: 0, label: "Incapaz (0)" }, { value: 5, label: "Muita ajuda (5)" }, { value: 10, label: "Pouca ajuda (10)" }, { value: 15, label: "Independente (15)" }] },
    { key: "deambulacao", label: "Deambulação", options: [
      { value: 0, label: "Imobilizado (0)" }, { value: 5, label: "Cadeira de rodas (5)" }, { value: 10, label: "Ajuda (10)" }, { value: 15, label: "Independente (15)" }] },
    { key: "escadas", label: "Subir/descer escadas", options: [
      { value: 0, label: "Incapaz (0)" }, { value: 5, label: "Ajuda (5)" }, { value: 10, label: "Independente (10)" }] },
  ],
  classify: (t) => {
    if (t >= 90) return { classification: "Independente", risk: "baixo" };
    if (t >= 60) return { classification: "Dependência leve", risk: "moderado" };
    if (t >= 40) return { classification: "Dependência moderada", risk: "alto" };
    if (t >= 20) return { classification: "Dependência grave", risk: "alto" };
    return { classification: "Dependência total", risk: "muito_alto" };
  },
};

// --- Katz (0-6) ---
const katz: ScaleConfig = {
  type: "katz",
  title: "Índice de Katz",
  description: "Independência em 6 atividades básicas (banho, vestir, higiene, transferência, continência, alimentação).",
  maxScore: 6,
  items: ["Banho", "Vestir-se", "Higiene/Uso WC", "Transferência", "Continência", "Alimentação"].map((label, i) => ({
    key: `katz_${i}`, label,
    options: [{ value: 0, label: "Dependente (0)" }, { value: 1, label: "Independente (1)" }],
  })),
  classify: (t) => {
    if (t === 6) return { classification: "Independente", risk: "baixo" };
    if (t >= 4) return { classification: "Dependência moderada", risk: "moderado" };
    if (t >= 2) return { classification: "Dependência importante", risk: "alto" };
    return { classification: "Dependência total", risk: "muito_alto" };
  },
};

// --- Berg Balance (0-56) ---
const bergItems = [
  "Sentado para em pé", "Em pé sem apoio", "Sentado sem apoio", "Em pé para sentado",
  "Transferências", "Em pé olhos fechados", "Em pé pés juntos", "Inclinação anterior",
  "Apanhar objeto do solo", "Olhar p/ trás", "Girar 360°", "Pisar em degrau",
  "Pé à frente", "Em pé sobre uma perna",
];
const berg: ScaleConfig = {
  type: "berg",
  title: "Escala de Equilíbrio de Berg",
  description: "14 itens (0-4 cada) para avaliação de equilíbrio funcional e risco de queda.",
  maxScore: 56,
  items: bergItems.map((label, i) => ({
    key: `berg_${i}`, label,
    options: [0, 1, 2, 3, 4].map((v) => ({ value: v, label: String(v) })),
  })),
  classify: (t) => {
    if (t >= 45) return { classification: "Baixo risco de queda", risk: "baixo" };
    if (t >= 36) return { classification: "Risco moderado", risk: "moderado" };
    if (t >= 21) return { classification: "Alto risco", risk: "alto" };
    return { classification: "Risco muito alto / cadeirante", risk: "muito_alto" };
  },
};

// --- Tinetti POMA (0-28: marcha 12 + equilíbrio 16) ---
const tinettiBal = [
  ["t_b1", "Equilíbrio sentado", [{value:0,label:"Inclina (0)"},{value:1,label:"Firme (1)"}]],
  ["t_b2", "Levantar-se", [{value:0,label:"Incapaz (0)"},{value:1,label:"Usa braços (1)"},{value:2,label:"Sem braços (2)"}]],
  ["t_b3", "Tentativas de levantar", [{value:0,label:"Incapaz (0)"},{value:1,label:">1 tentativa (1)"},{value:2,label:"Única (2)"}]],
  ["t_b4", "Equilíbrio em pé imediato (5s)", [{value:0,label:"Instável (0)"},{value:1,label:"Apoio (1)"},{value:2,label:"Firme (2)"}]],
  ["t_b5", "Equilíbrio em pé", [{value:0,label:"Instável (0)"},{value:1,label:"Apoio (1)"},{value:2,label:"Firme (2)"}]],
  ["t_b6", "Empurrão esternal", [{value:0,label:"Cai (0)"},{value:1,label:"Cambaleia (1)"},{value:2,label:"Firme (2)"}]],
  ["t_b7", "Olhos fechados", [{value:0,label:"Instável (0)"},{value:1,label:"Firme (1)"}]],
  ["t_b8", "Girar 360°", [{value:0,label:"Descontínuo (0)"},{value:1,label:"Contínuo (1)"}]],
  ["t_b9", "Sentar-se", [{value:0,label:"Inseguro (0)"},{value:1,label:"Usa braços (1)"},{value:2,label:"Seguro (2)"}]],
] as const;
const tinettiGait = [
  ["t_g1", "Início da marcha", [{value:0,label:"Hesitação (0)"},{value:1,label:"Sem hesitação (1)"}]],
  ["t_g2", "Comprimento e altura do passo", [{value:0,label:"Anormal (0)"},{value:1,label:"Normal (1)"}]],
  ["t_g3", "Simetria do passo", [{value:0,label:"Assimétrico (0)"},{value:1,label:"Simétrico (1)"}]],
  ["t_g4", "Continuidade", [{value:0,label:"Descontínuo (0)"},{value:1,label:"Contínuo (1)"}]],
  ["t_g5", "Trajetória", [{value:0,label:"Desvio (0)"},{value:1,label:"Pequeno desvio (1)"},{value:2,label:"Reto (2)"}]],
  ["t_g6", "Tronco", [{value:0,label:"Oscila (0)"},{value:1,label:"Flexiona (1)"},{value:2,label:"Estável (2)"}]],
  ["t_g7", "Postura na marcha", [{value:0,label:"Pés afastados (0)"},{value:1,label:"Pés próximos (1)"}]],
] as const;
const tinetti: ScaleConfig = {
  type: "tinetti",
  title: "Tinetti (POMA)",
  description: "Equilíbrio (16) + marcha (12). Risco de queda.",
  maxScore: 28,
  items: [...tinettiBal, ...tinettiGait].map(([key, label, options]) => ({
    key: key as string, label: label as string, options: options as any,
  })),
  classify: (t) => {
    if (t >= 24) return { classification: "Baixo risco de queda", risk: "baixo" };
    if (t >= 19) return { classification: "Risco moderado", risk: "moderado" };
    return { classification: "Alto risco de queda", risk: "alto" };
  },
};

// --- Braden (6-23) ---
const braden: ScaleConfig = {
  type: "braden",
  title: "Escala de Braden",
  description: "Risco de lesão por pressão.",
  maxScore: 23,
  items: [
    { key: "percepcao", label: "Percepção sensorial",
      options: [1,2,3,4].map((v)=>({value:v,label:`${v} ${["- Limitação total","- Limitação grave","- Pouca limitação","- Sem prejuízo"][v-1]}`})) },
    { key: "umidade", label: "Umidade", options: [1,2,3,4].map((v)=>({value:v,label:`${v}`})) },
    { key: "atividade", label: "Atividade", options: [1,2,3,4].map((v)=>({value:v,label:`${v}`})) },
    { key: "mobilidade", label: "Mobilidade", options: [1,2,3,4].map((v)=>({value:v,label:`${v}`})) },
    { key: "nutricao", label: "Nutrição", options: [1,2,3,4].map((v)=>({value:v,label:`${v}`})) },
    { key: "friccao", label: "Fricção e cisalhamento", options: [1,2,3].map((v)=>({value:v,label:`${v}`})) },
  ],
  classify: (t) => {
    if (t >= 19) return { classification: "Sem risco", risk: "baixo" };
    if (t >= 15) return { classification: "Risco leve", risk: "moderado" };
    if (t >= 13) return { classification: "Risco moderado", risk: "alto" };
    if (t >= 10) return { classification: "Risco alto", risk: "alto" };
    return { classification: "Risco muito alto", risk: "muito_alto" };
  },
};

// ============================================================================
// Avaliações específicas — Geriatria, Marcha, Equilíbrio, Domiciliar
// ============================================================================

// --- GDS-15 (Escala de Depressão Geriátrica) ---
const gds15Items: { key: string; label: string; bad: 0 | 1 }[] = [
  { key: "g1", label: "Está satisfeito(a) com sua vida?", bad: 0 },
  { key: "g2", label: "Abandonou muitas atividades e interesses?", bad: 1 },
  { key: "g3", label: "Sente que sua vida está vazia?", bad: 1 },
  { key: "g4", label: "Sente-se aborrecido(a) com frequência?", bad: 1 },
  { key: "g5", label: "Está de bom humor a maior parte do tempo?", bad: 0 },
  { key: "g6", label: "Teme que algo de ruim lhe aconteça?", bad: 1 },
  { key: "g7", label: "Sente-se feliz a maior parte do tempo?", bad: 0 },
  { key: "g8", label: "Sente-se desamparado(a)?", bad: 1 },
  { key: "g9", label: "Prefere ficar em casa a sair e fazer coisas novas?", bad: 1 },
  { key: "g10", label: "Tem mais problemas de memória que a maioria?", bad: 1 },
  { key: "g11", label: "Acha maravilhoso estar vivo(a)?", bad: 0 },
  { key: "g12", label: "Sente-se inútil nas atuais circunstâncias?", bad: 1 },
  { key: "g13", label: "Sente-se cheio(a) de energia?", bad: 0 },
  { key: "g14", label: "Sente que sua situação é desesperadora?", bad: 1 },
  { key: "g15", label: "Acha que a maioria das pessoas está melhor que você?", bad: 1 },
];
const gds15: ScaleConfig = {
  type: "gds15",
  title: "GDS-15 — Depressão Geriátrica",
  description: "15 itens sim/não. Pontua 1 quando a resposta indica sintoma depressivo.",
  maxScore: 15,
  items: gds15Items.map((i) => ({
    key: i.key, label: i.label,
    options: [
      { value: i.bad === 1 ? 1 : 0, label: "Sim" },
      { value: i.bad === 1 ? 0 : 1, label: "Não" },
    ],
  })),
  classify: (t) => {
    if (t <= 4) return { classification: "Sem depressão", risk: "baixo" };
    if (t <= 10) return { classification: "Depressão leve a moderada", risk: "moderado" };
    return { classification: "Depressão grave", risk: "alto" };
  },
};

// --- MEEM (Mini-Exame do Estado Mental) ---
const meem: ScaleConfig = {
  type: "meem",
  title: "MEEM — Mini-Exame do Estado Mental",
  description: "Triagem cognitiva (0–30). Pontuação por domínio.",
  maxScore: 30,
  items: [
    { key: "orient_tempo", label: "Orientação temporal", options: [0,1,2,3,4,5].map(v=>({value:v,label:`${v}/5`})) },
    { key: "orient_espaco", label: "Orientação espacial", options: [0,1,2,3,4,5].map(v=>({value:v,label:`${v}/5`})) },
    { key: "registro", label: "Registro (3 palavras)", options: [0,1,2,3].map(v=>({value:v,label:`${v}/3`})) },
    { key: "atencao", label: "Atenção e cálculo (100-7 / soletrar)", options: [0,1,2,3,4,5].map(v=>({value:v,label:`${v}/5`})) },
    { key: "evocacao", label: "Evocação (3 palavras)", options: [0,1,2,3].map(v=>({value:v,label:`${v}/3`})) },
    { key: "nomeacao", label: "Nomeação (relógio/lápis)", options: [0,1,2].map(v=>({value:v,label:`${v}/2`})) },
    { key: "repeticao", label: "Repetição da frase", options: [0,1].map(v=>({value:v,label:`${v}/1`})) },
    { key: "comando", label: "Comando em 3 etapas", options: [0,1,2,3].map(v=>({value:v,label:`${v}/3`})) },
    { key: "leitura", label: "Leitura e execução", options: [0,1].map(v=>({value:v,label:`${v}/1`})) },
    { key: "escrita", label: "Escrita de frase", options: [0,1].map(v=>({value:v,label:`${v}/1`})) },
    { key: "copia", label: "Cópia do desenho", options: [0,1].map(v=>({value:v,label:`${v}/1`})) },
  ],
  classify: (t) => {
    if (t >= 24) return { classification: "Sem déficit cognitivo evidente", risk: "baixo" };
    if (t >= 18) return { classification: "Déficit cognitivo leve", risk: "moderado" };
    if (t >= 10) return { classification: "Déficit moderado", risk: "alto" };
    return { classification: "Déficit grave", risk: "muito_alto" };
  },
};

// --- TUG (Timed Up and Go) ---
const tug: ScaleConfig = {
  type: "tug",
  title: "TUG — Timed Up and Go",
  description: "Tempo (s) para levantar, andar 3m, retornar e sentar.",
  maxScore: 60,
  items: [{ key: "tempo_s", label: "Tempo (segundos)", kind: "numeric", unit: "s", min: 0, max: 120, step: 0.1 }],
  classify: (t) => {
    if (t < 10) return { classification: "Mobilidade normal", risk: "baixo" };
    if (t < 20) return { classification: "Mobilidade reduzida — independente", risk: "moderado" };
    if (t < 30) return { classification: "Mobilidade reduzida — risco de queda", risk: "alto" };
    return { classification: "Dependência funcional importante", risk: "muito_alto" };
  },
};

// --- FTSST (Sentar e levantar 5x) ---
const ftsst: ScaleConfig = {
  type: "ftsst",
  title: "Teste de Sentar e Levantar 5x (FTSST)",
  description: "Tempo (s) para 5 repetições sentar-levantar sem usar os braços.",
  maxScore: 60,
  items: [{ key: "tempo_s", label: "Tempo (segundos)", kind: "numeric", unit: "s", min: 0, max: 120, step: 0.1 }],
  classify: (t) => {
    if (t <= 11) return { classification: "Força de MMII adequada", risk: "baixo" };
    if (t <= 13.6) return { classification: "Força limítrofe", risk: "moderado" };
    if (t <= 16.7) return { classification: "Fraqueza — risco de queda", risk: "alto" };
    return { classification: "Fraqueza importante de MMII", risk: "muito_alto" };
  },
};

// --- TC6M (Teste de caminhada de 6 minutos) ---
const tc6m: ScaleConfig = {
  type: "tc6m",
  title: "TC6M — Teste de Caminhada de 6 minutos",
  description: "Distância (m) percorrida em 6 minutos.",
  maxScore: 800,
  items: [{ key: "distancia_m", label: "Distância (m)", kind: "numeric", unit: "m", min: 0, max: 900, step: 1 }],
  classify: (t) => {
    if (t >= 500) return { classification: "Capacidade preservada", risk: "baixo" };
    if (t >= 350) return { classification: "Redução leve", risk: "moderado" };
    if (t >= 200) return { classification: "Redução importante", risk: "alto" };
    return { classification: "Capacidade muito reduzida", risk: "muito_alto" };
  },
};

// --- Alcance Funcional (Functional Reach) ---
const alcance_funcional: ScaleConfig = {
  type: "alcance_funcional",
  title: "Teste de Alcance Funcional",
  description: "Deslocamento anterior máximo do membro superior (cm).",
  maxScore: 60,
  items: [{ key: "cm", label: "Alcance (cm)", kind: "numeric", unit: "cm", min: 0, max: 80, step: 0.5 }],
  classify: (t) => {
    if (t >= 25) return { classification: "Equilíbrio preservado", risk: "baixo" };
    if (t >= 15) return { classification: "Risco moderado de queda", risk: "moderado" };
    if (t >= 6) return { classification: "Alto risco de queda", risk: "alto" };
    return { classification: "Risco muito alto", risk: "muito_alto" };
  },
};

// --- Romberg ---
const romberg: ScaleConfig = {
  type: "romberg",
  title: "Teste de Romberg",
  description: "Equilíbrio estático: olhos abertos e fechados.",
  maxScore: 4,
  items: [
    { key: "olhos_abertos", label: "Olhos abertos", options: [
      { value: 2, label: "Estável (2)" }, { value: 1, label: "Oscilação leve (1)" }, { value: 0, label: "Desequilíbrio/queda (0)" },
    ]},
    { key: "olhos_fechados", label: "Olhos fechados", options: [
      { value: 2, label: "Estável (2)" }, { value: 1, label: "Oscilação leve (1)" }, { value: 0, label: "Desequilíbrio/queda (0)" },
    ]},
  ],
  classify: (t) => {
    if (t === 4) return { classification: "Romberg negativo", risk: "baixo" };
    if (t >= 2) return { classification: "Romberg duvidoso", risk: "moderado" };
    return { classification: "Romberg positivo", risk: "alto" };
  },
};

// --- Tandem ---
const tandem: ScaleConfig = {
  type: "tandem",
  title: "Teste de Marcha Tandem",
  description: "Equilíbrio dinâmico: caminhar em linha pé-ante-pé.",
  maxScore: 2,
  items: [
    { key: "tandem", label: "Resultado", options: [
      { value: 2, label: "≥ 10 passos sem desvio (2)" },
      { value: 1, label: "Conclui com desvios (1)" },
      { value: 0, label: "Incapaz de realizar (0)" },
    ]},
  ],
  classify: (t) => {
    if (t === 2) return { classification: "Equilíbrio dinâmico preservado", risk: "baixo" };
    if (t === 1) return { classification: "Equilíbrio comprometido", risk: "moderado" };
    return { classification: "Equilíbrio dinâmico crítico", risk: "alto" };
  },
};

// --- Equilíbrio unipodal ---
const unipodal: ScaleConfig = {
  type: "unipodal",
  title: "Equilíbrio Unipodal / Ponta dos pés",
  description: "Tempo (s) de manutenção em apoio unipodal e na ponta dos pés.",
  maxScore: 120,
  items: [
    { key: "uni_d", label: "Apoio unipodal direito (s)", kind: "numeric", unit: "s", min: 0, max: 60, step: 1 },
    { key: "uni_e", label: "Apoio unipodal esquerdo (s)", kind: "numeric", unit: "s", min: 0, max: 60, step: 1 },
    { key: "ponta", label: "Ponta dos pés (s)", kind: "numeric", unit: "s", min: 0, max: 60, step: 1 },
  ],
  classify: (t) => {
    const avg = t / 3;
    if (avg >= 30) return { classification: "Equilíbrio preservado", risk: "baixo" };
    if (avg >= 10) return { classification: "Equilíbrio reduzido", risk: "moderado" };
    if (avg >= 5) return { classification: "Equilíbrio insuficiente", risk: "alto" };
    return { classification: "Equilíbrio muito comprometido", risk: "muito_alto" };
  },
};

// --- Força de Preensão Palmar (dinamometria) ---
const preensao_palmar: ScaleConfig = {
  type: "preensao_palmar",
  title: "Força de Preensão Palmar",
  description: "Dinamometria (kgf) em ambas as mãos — média de 3 medidas.",
  maxScore: 200,
  items: [
    { key: "mao_d", label: "Mão dominante (kgf)", kind: "numeric", unit: "kgf", min: 0, max: 80, step: 0.5 },
    { key: "mao_e", label: "Mão não-dominante (kgf)", kind: "numeric", unit: "kgf", min: 0, max: 80, step: 0.5 },
  ],
  classify: (t) => {
    const avg = t / 2;
    if (avg >= 27) return { classification: "Força adequada", risk: "baixo" };
    if (avg >= 20) return { classification: "Força reduzida", risk: "moderado" };
    if (avg >= 14) return { classification: "Risco de sarcopenia", risk: "alto" };
    return { classification: "Sarcopenia provável", risk: "muito_alto" };
  },
};

// --- Perimetria de panturrilha ---
const panturrilha: ScaleConfig = {
  type: "panturrilha",
  title: "Perimetria de Panturrilha",
  description: "Circunferência (cm) — proxy de massa muscular.",
  maxScore: 80,
  items: [
    { key: "pant_d", label: "Panturrilha direita (cm)", kind: "numeric", unit: "cm", min: 0, max: 60, step: 0.1 },
    { key: "pant_e", label: "Panturrilha esquerda (cm)", kind: "numeric", unit: "cm", min: 0, max: 60, step: 0.1 },
  ],
  classify: (t) => {
    const avg = t / 2;
    if (avg >= 33) return { classification: "Massa muscular preservada", risk: "baixo" };
    if (avg >= 31) return { classification: "Limítrofe — atenção", risk: "moderado" };
    return { classification: "Redução de massa muscular", risk: "alto" };
  },
};

// --- Velocidade da marcha ---
const marcha_velocidade: ScaleConfig = {
  type: "marcha_velocidade",
  title: "Velocidade da Marcha (4m)",
  description: "Velocidade habitual (m/s) — proxy de funcionalidade e fragilidade.",
  maxScore: 3,
  items: [{ key: "ms", label: "Velocidade (m/s)", kind: "numeric", unit: "m/s", min: 0, max: 3, step: 0.01 }],
  classify: (t) => {
    if (t >= 1.0) return { classification: "Marcha normal", risk: "baixo" };
    if (t >= 0.8) return { classification: "Marcha reduzida — atenção", risk: "moderado" };
    if (t >= 0.6) return { classification: "Pré-fragilidade", risk: "alto" };
    return { classification: "Fragilidade / risco aumentado", risk: "muito_alto" };
  },
};

// --- Avaliação breve do sono do idoso ---
const sono_idoso: ScaleConfig = {
  type: "sono_idoso",
  title: "Avaliação Breve do Sono do Idoso",
  description: "5 itens (0 = sem prejuízo, 3 = prejuízo importante).",
  maxScore: 15,
  items: [
    { key: "latencia", label: "Dificuldade para iniciar o sono" },
    { key: "manutencao", label: "Despertares noturnos frequentes" },
    { key: "precoce", label: "Despertar precoce" },
    { key: "sonolencia", label: "Sonolência diurna excessiva" },
    { key: "qualidade", label: "Qualidade subjetiva do sono ruim" },
  ].map((i) => ({
    ...i,
    options: [0,1,2,3].map(v=>({value:v,label:`${v} - ${["Nunca","Às vezes","Frequente","Sempre"][v]}`})),
  })),
  classify: (t) => {
    if (t <= 3) return { classification: "Sono adequado", risk: "baixo" };
    if (t <= 7) return { classification: "Distúrbio leve do sono", risk: "moderado" };
    if (t <= 11) return { classification: "Distúrbio moderado", risk: "alto" };
    return { classification: "Distúrbio importante", risk: "muito_alto" };
  },
};

// --- Avaliação Geriátrica Ampla (AGA) — composta ---
const aga: ScaleConfig = {
  type: "aga",
  title: "AGA — Avaliação Geriátrica Ampla (resumo)",
  description: "Domínios sintéticos: cognição, humor, funcionalidade, mobilidade, social, nutricional.",
  maxScore: 12,
  items: [
    { key: "cognicao", label: "Cognição (referente ao MEEM)" },
    { key: "humor", label: "Humor (referente ao GDS-15)" },
    { key: "funcional_avd", label: "Funcionalidade — AVD (Barthel/Katz)" },
    { key: "mobilidade", label: "Mobilidade (TUG/marcha)" },
    { key: "social", label: "Suporte social e ambiente" },
    { key: "nutricional", label: "Estado nutricional (panturrilha/IMC)" },
  ].map((i) => ({
    ...i,
    options: [
      { value: 2, label: "Sem prejuízo (2)" },
      { value: 1, label: "Prejuízo leve/moderado (1)" },
      { value: 0, label: "Prejuízo importante (0)" },
    ],
  })),
  classify: (t) => {
    if (t >= 10) return { classification: "Idoso robusto", risk: "baixo" };
    if (t >= 7) return { classification: "Pré-fragilidade", risk: "moderado" };
    if (t >= 4) return { classification: "Fragilidade", risk: "alto" };
    return { classification: "Fragilidade grave", risk: "muito_alto" };
  },
};

export const SCALES: Record<ScaleType, ScaleConfig> = {
  barthel, katz, berg, tinetti, braden,
  gds15, meem, tug, ftsst, tc6m, alcance_funcional,
  romberg, tandem, unipodal, preensao_palmar,
  panturrilha, marcha_velocidade, sono_idoso, aga,
};

export function computeScale(type: ScaleType, items: Record<string, number>) {
  const cfg = SCALES[type];
  const total = Object.values(items).reduce((s, v) => s + (Number(v) || 0), 0);
  const { classification, risk } = cfg.classify(total);
  return { total, classification, risk, maxScore: cfg.maxScore };
}

// --- MRC muscle groups ---
export const MRC_GROUPS = [
  { key: "flexao_ombro", label: "Flexão de ombro" },
  { key: "abducao_ombro", label: "Abdução de ombro" },
  { key: "flexao_cotovelo", label: "Flexão de cotovelo" },
  { key: "extensao_cotovelo", label: "Extensão de cotovelo" },
  { key: "preensao", label: "Preensão palmar" },
  { key: "flexao_quadril", label: "Flexão de quadril" },
  { key: "extensao_quadril", label: "Extensão de quadril" },
  { key: "flexao_joelho", label: "Flexão de joelho" },
  { key: "extensao_joelho", label: "Extensão de joelho" },
  { key: "dorsiflexao", label: "Dorsiflexão" },
  { key: "flexao_plantar", label: "Flexão plantar" },
];

export const MRC_LEVELS = [
  { value: 0, label: "0 - Sem contração" },
  { value: 1, label: "1 - Contração visível" },
  { value: 2, label: "2 - Movimento sem gravidade" },
  { value: 3, label: "3 - Movimento contra gravidade" },
  { value: 4, label: "4 - Vence resistência parcial" },
  { value: 5, label: "5 - Força normal" },
];

export function classifyMRC(avg: number) {
  if (avg >= 4.5) return { label: "Força preservada", risk: "baixo" as RiskLevel };
  if (avg >= 3.5) return { label: "Fraqueza leve", risk: "moderado" as RiskLevel };
  if (avg >= 2.5) return { label: "Fraqueza moderada", risk: "alto" as RiskLevel };
  return { label: "Fraqueza grave", risk: "muito_alto" as RiskLevel };
}

export const RISK_COLORS: Record<RiskLevel, string> = {
  baixo: "bg-emerald-100 text-emerald-800 border-emerald-300",
  moderado: "bg-amber-100 text-amber-800 border-amber-300",
  alto: "bg-orange-100 text-orange-800 border-orange-300",
  muito_alto: "bg-red-100 text-red-800 border-red-300",
};

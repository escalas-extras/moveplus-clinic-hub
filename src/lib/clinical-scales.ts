// Centralized configuration for clinical scales used in Move+
// Each scale = items (with options/score) + classifier (total -> label + risk_level)

export type RiskLevel = "baixo" | "moderado" | "alto" | "muito_alto";
export type ScaleType = "barthel" | "katz" | "berg" | "tinetti" | "braden";

export type ScaleItem = {
  key: string;
  label: string;
  options: { value: number; label: string }[];
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

export const SCALES: Record<ScaleType, ScaleConfig> = { barthel, katz, berg, tinetti, braden };

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

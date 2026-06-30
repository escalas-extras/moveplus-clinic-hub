import type { LucideIcon } from "lucide-react";
import {
  Brain,
  Dumbbell,
  HeartPulse,
  Layers,
  PlayCircle,
  Sparkles,
} from "lucide-react";
import type { ExerciseLevel, LibraryFilters } from "./types";

export const EXERCISE_LEVEL_LABELS: Record<ExerciseLevel, string> = {
  iniciante: "Iniciante",
  intermediario: "Intermediário",
  avancado: "Avançado",
};

export const BODY_REGIONS = [
  { value: "coluna", label: "Coluna" },
  { value: "superior", label: "Membros superiores" },
  { value: "inferior", label: "Membros inferiores" },
  { value: "cervical", label: "Cervical" },
  { value: "lombar", label: "Lombar" },
  { value: "respiratoria", label: "Respiratória" },
  { value: "neurologia", label: "Neurologia" },
] as const;

export const SPECIALTIES = [
  { value: "ortopedia", label: "Ortopedia" },
  { value: "esportiva", label: "Esportiva" },
  { value: "neurologia", label: "Neurologia" },
  { value: "respiratoria", label: "Respiratória" },
  { value: "pediatria", label: "Pediatria" },
  { value: "pilates", label: "Pilates" },
] as const;

export const OBJECTIVES = [
  { value: "fortalecimento", label: "Fortalecimento" },
  { value: "mobilidade", label: "Mobilidade" },
  { value: "alongamento", label: "Alongamento" },
  { value: "estabilizacao", label: "Estabilização" },
  { value: "funcional", label: "Funcional" },
  { value: "respiracao", label: "Respiração" },
] as const;

export const PATHOLOGIES = [
  { value: "lca", label: "LCA" },
  { value: "manguito-rotador", label: "Manguito rotador" },
  { value: "lombalgia", label: "Lombalgia" },
  { value: "entorse", label: "Entorse" },
] as const;

export const EQUIPMENT_OPTIONS = [
  { value: "livre", label: "Livre" },
  { value: "elastico", label: "Elástico" },
  { value: "bola", label: "Bola" },
  { value: "step", label: "Step" },
  { value: "halter", label: "Halter" },
] as const;

export const DIFFICULTY_OPTIONS: Array<{ value: ExerciseLevel; label: string }> = [
  { value: "iniciante", label: "Iniciante" },
  { value: "intermediario", label: "Intermediário" },
  { value: "avancado", label: "Avançado" },
];

export const DEFAULT_LIBRARY_FILTERS: LibraryFilters = {
  search: "",
  bodyRegion: null,
  pathology: null,
  objective: null,
  specialty: null,
  equipment: null,
  difficulty: null,
  categoryId: null,
};

export type RegionShortcut = {
  key: string;
  label: string;
  description: string;
  icon: LucideIcon;
  filter: Partial<LibraryFilters>;
};

export const REGION_SHORTCUTS: RegionShortcut[] = [
  { key: "coluna", label: "Coluna", description: "Mobilidade, estabilidade e dor", icon: HeartPulse, filter: { bodyRegion: "coluna" } },
  { key: "superior", label: "Superior", description: "Membros superiores", icon: Dumbbell, filter: { bodyRegion: "superior" } },
  { key: "inferior", label: "Inferior", description: "Membros inferiores", icon: Dumbbell, filter: { bodyRegion: "inferior" } },
  { key: "cervical", label: "Coluna Cervical", description: "Pescoço e cintura escapular", icon: HeartPulse, filter: { bodyRegion: "cervical" } },
  { key: "lombar", label: "Coluna Lombar", description: "Core, lombalgia e controle", icon: HeartPulse, filter: { bodyRegion: "lombar" } },
  { key: "neurologia", label: "Neurologia", description: "Controle motor e função", icon: Brain, filter: { bodyRegion: "neurologia", specialty: "neurologia" } },
  { key: "respiratoria", label: "Respiratória", description: "Expansão e condicionamento", icon: HeartPulse, filter: { bodyRegion: "respiratoria", specialty: "respiratoria" } },
  { key: "pilates", label: "Pilates", description: "Controle, respiração e força", icon: Layers, filter: { specialty: "pilates" } },
  { key: "esportiva", label: "Esportiva", description: "Performance e retorno seguro", icon: PlayCircle, filter: { specialty: "esportiva" } },
  { key: "pediatria", label: "Pediatria", description: "Desenvolvimento e ludicidade", icon: Sparkles, filter: { specialty: "pediatria" } },
];

export const AI_FUTURE_FIELDS = [
  "ai_keywords",
  "ai_embedding",
  "ai_description",
  "semantic_group",
] as const;

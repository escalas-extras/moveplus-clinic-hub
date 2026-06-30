export type ExerciseLevel = "iniciante" | "intermediario" | "avancado";
export type ExerciseStatus = "draft" | "active" | "archived";
export type ExerciseOrigin = "global" | "clinic";
export type ExerciseMediaType = "image" | "video" | "gif" | "document";
export type ExerciseTagType =
  | "regiao"
  | "patologia"
  | "objetivo"
  | "especialidade"
  | "equipamento"
  | "dificuldade"
  | "geral";
export type FavoriteType = "exercise" | "protocol";
export type LibraryView = "exercicios" | "protocolos" | "favoritos";

export type ExerciseCategory = {
  id: string;
  clinic_id: string | null;
  parent_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  body_region: string | null;
  joint: string | null;
  sort_order: number;
  origin: ExerciseOrigin;
  active: boolean;
};

export type Exercise = {
  id: string;
  clinic_id: string | null;
  category_id: string | null;
  source_exercise_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  body_region: string | null;
  joint: string | null;
  specialty: string | null;
  objectives: string[];
  level: ExerciseLevel;
  equipment: string[];
  contraindications: string | null;
  instructions: string | null;
  notes: string | null;
  thumbnail_url: string | null;
  video_url: string | null;
  active: boolean;
  status: ExerciseStatus;
  origin: ExerciseOrigin;
  ai_keywords: string[];
  ai_embedding: unknown | null;
  ai_description: string | null;
  semantic_group: string | null;
  created_at: string;
  updated_at: string;
  exercise_tags?: ExerciseTag[];
  exercise_media?: ExerciseMedia[];
};

export type ExerciseTag = {
  id: string;
  clinic_id: string | null;
  name: string;
  slug: string;
  tag_type: ExerciseTagType;
  active: boolean;
};

export type ExerciseMedia = {
  id: string;
  exercise_id: string;
  clinic_id: string | null;
  media_type: ExerciseMediaType;
  storage_path: string | null;
  external_url: string | null;
  thumbnail_path: string | null;
  title: string | null;
  description: string | null;
  duration_seconds: number | null;
  sort_order: number;
  is_primary: boolean;
  active: boolean;
};

export type ExerciseProtocol = {
  id: string;
  clinic_id: string | null;
  source_protocol_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  indication: string | null;
  target_condition: string | null;
  body_region: string | null;
  therapeutic_goal: string | null;
  level: ExerciseLevel;
  estimated_duration_days: number | null;
  frequency: string | null;
  contraindications: string | null;
  notes: string | null;
  status: ExerciseStatus;
  origin: ExerciseOrigin;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
  protocol_exercises?: ProtocolExercise[];
};

/** Protocolos vinculados à clínica (ClinicProtocols) */
export type ClinicProtocol = {
  id: string;
  clinic_id: string;
  protocol_id: string;
  is_favorite: boolean;
  sort_order: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  exercise_protocols?: ExerciseProtocol;
};

export type ProtocolExercise = {
  id: string;
  protocol_id: string;
  exercise_id: string;
  sort_order: number;
  phase: string | null;
  sets: number | null;
  repetitions: number | null;
  duration_seconds: number | null;
  hold_seconds: number | null;
  rest_seconds: number | null;
  frequency: string | null;
  side: string | null;
  instructions_override: string | null;
  notes: string | null;
  exercises?: Exercise;
};

export type ExerciseFavorite = {
  id: string;
  clinic_id: string;
  user_id: string;
  exercise_id: string | null;
  protocol_id: string | null;
  favorite_type: FavoriteType;
  notes: string | null;
  created_at: string;
};

export type LibraryFilters = {
  search: string;
  bodyRegion: string | null;
  pathology: string | null;
  objective: string | null;
  specialty: string | null;
  equipment: string | null;
  difficulty: ExerciseLevel | null;
  categoryId: string | null;
};

export type ProtocolDraftItem = {
  exercise: Exercise;
  sort_order: number;
  sets?: number;
  repetitions?: number;
  notes?: string;
};

export type CreateProtocolInput = {
  name: string;
  description?: string;
  indication?: string;
  body_region?: string;
  therapeutic_goal?: string;
  level?: ExerciseLevel;
  frequency?: string;
  items: Array<{ exercise_id: string; sort_order: number; sets?: number; repetitions?: number; notes?: string }>;
};

import { supabase } from "@/integrations/supabase/client";
import type {
  CreateProtocolInput,
  Exercise,
  ExerciseCategory,
  ExerciseFavorite,
  ExerciseProtocol,
  ProtocolExercise,
} from "@/features/library/types";

const EXERCISE_SELECT = `
  *,
  exercise_media(id, media_type, external_url, thumbnail_path, is_primary, sort_order, active)
`;

export async function fetchExerciseCategories(): Promise<ExerciseCategory[]> {
  const { data, error } = await supabase
    .from("exercise_categories")
    .select("*")
    .eq("active", true)
    .order("sort_order");
  if (error) throw error;
  return (data ?? []) as ExerciseCategory[];
}

export async function fetchExercises(): Promise<Exercise[]> {
  const { data, error } = await supabase
    .from("exercises")
    .select(EXERCISE_SELECT)
    .eq("active", true)
    .eq("status", "active")
    .order("name");
  if (error) throw error;
  return (data ?? []) as Exercise[];
}

export async function fetchExerciseProtocols(): Promise<ExerciseProtocol[]> {
  const { data, error } = await supabase
    .from("exercise_protocols")
    .select(`
      *,
      protocol_exercises(
        id, exercise_id, sort_order, sets, repetitions, notes, phase,
        exercises(id, name, slug, body_region, objectives, level, thumbnail_url)
      )
    `)
    .neq("status", "archived")
    .order("name");
  if (error) throw error;
  return (data ?? []) as ExerciseProtocol[];
}

export async function fetchExerciseFavorites(clinicId: string, userId: string): Promise<ExerciseFavorite[]> {
  const { data, error } = await supabase
    .from("exercise_favorites")
    .select("*")
    .eq("clinic_id", clinicId)
    .eq("user_id", userId);
  if (error) throw error;
  return (data ?? []) as ExerciseFavorite[];
}

export async function toggleExerciseFavorite(params: {
  clinicId: string;
  userId: string;
  exerciseId: string;
  isFavorite: boolean;
}): Promise<void> {
  if (params.isFavorite) {
    const { error } = await supabase
      .from("exercise_favorites")
      .delete()
      .eq("clinic_id", params.clinicId)
      .eq("user_id", params.userId)
      .eq("exercise_id", params.exerciseId);
    if (error) throw error;
    return;
  }
  const { error } = await supabase.from("exercise_favorites").insert({
    clinic_id: params.clinicId,
    user_id: params.userId,
    exercise_id: params.exerciseId,
    favorite_type: "exercise",
  });
  if (error) throw error;
}

export async function toggleProtocolFavorite(params: {
  clinicId: string;
  userId: string;
  protocolId: string;
  isFavorite: boolean;
}): Promise<void> {
  if (params.isFavorite) {
    const { error } = await supabase
      .from("exercise_favorites")
      .delete()
      .eq("clinic_id", params.clinicId)
      .eq("user_id", params.userId)
      .eq("protocol_id", params.protocolId);
    if (error) throw error;
    return;
  }
  const { error } = await supabase.from("exercise_favorites").insert({
    clinic_id: params.clinicId,
    user_id: params.userId,
    protocol_id: params.protocolId,
    favorite_type: "protocol",
  });
  if (error) throw error;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function createProtocol(
  clinicId: string,
  userId: string,
  input: CreateProtocolInput,
): Promise<ExerciseProtocol> {
  const slug = `${slugify(input.name)}-${Date.now()}`;
  const { data: protocol, error } = await supabase
    .from("exercise_protocols")
    .insert({
      clinic_id: clinicId,
      name: input.name,
      slug,
      description: input.description ?? null,
      indication: input.indication ?? null,
      body_region: input.body_region ?? null,
      therapeutic_goal: input.therapeutic_goal ?? null,
      level: input.level ?? "iniciante",
      frequency: input.frequency ?? null,
      status: "active",
      origin: "clinic",
      created_by: userId,
    })
    .select()
    .single();
  if (error) throw error;

  if (input.items.length > 0) {
    const { error: itemsError } = await supabase.from("protocol_exercises").insert(
      input.items.map((item) => ({
        protocol_id: protocol.id,
        exercise_id: item.exercise_id,
        sort_order: item.sort_order,
        sets: item.sets ?? null,
        repetitions: item.repetitions ?? null,
        notes: item.notes ?? null,
      })),
    );
    if (itemsError) throw itemsError;
  }

  await supabase.from("clinic_protocols").upsert(
    { clinic_id: clinicId, protocol_id: protocol.id, created_by: userId },
    { onConflict: "clinic_id,protocol_id" },
  );

  return protocol as ExerciseProtocol;
}

export async function updateProtocol(
  protocolId: string,
  patch: Partial<Pick<ExerciseProtocol, "name" | "description" | "indication" | "therapeutic_goal" | "frequency" | "level">>,
): Promise<void> {
  const { error } = await supabase.from("exercise_protocols").update(patch).eq("id", protocolId);
  if (error) throw error;
}

export async function archiveProtocol(protocolId: string): Promise<void> {
  const { error } = await supabase
    .from("exercise_protocols")
    .update({ status: "archived" })
    .eq("id", protocolId);
  if (error) throw error;
}

export async function duplicateProtocol(
  clinicId: string,
  userId: string,
  source: ExerciseProtocol,
): Promise<ExerciseProtocol> {
  const items = (source.protocol_exercises ?? []).map((item: ProtocolExercise, index: number) => ({
    exercise_id: item.exercise_id,
    sort_order: item.sort_order ?? index,
    sets: item.sets ?? undefined,
    repetitions: item.repetitions ?? undefined,
    notes: item.notes ?? undefined,
  }));

  return createProtocol(clinicId, userId, {
    name: `${source.name} (cópia)`,
    description: source.description ?? undefined,
    indication: source.indication ?? undefined,
    body_region: source.body_region ?? undefined,
    therapeutic_goal: source.therapeutic_goal ?? undefined,
    level: source.level,
    frequency: source.frequency ?? undefined,
    items,
  });
}

export async function syncProtocolItems(
  protocolId: string,
  items: Array<{ exercise_id: string; sort_order: number; sets?: number; repetitions?: number; notes?: string }>,
): Promise<void> {
  const { error: delError } = await supabase.from("protocol_exercises").delete().eq("protocol_id", protocolId);
  if (delError) throw delError;
  if (items.length === 0) return;
  const { error } = await supabase.from("protocol_exercises").insert(
    items.map((item) => ({
      protocol_id: protocolId,
      exercise_id: item.exercise_id,
      sort_order: item.sort_order,
      sets: item.sets ?? null,
      repetitions: item.repetitions ?? null,
      notes: item.notes ?? null,
    })),
  );
  if (error) throw error;
}

import type { Exercise, ExerciseProtocol, LibraryFilters, LibraryView } from "@/features/library/types";

function haystack(exercise: Exercise): string {
  return [
    exercise.name,
    exercise.description,
    exercise.body_region,
    exercise.joint,
    exercise.specialty,
    ...(exercise.objectives ?? []),
    ...(exercise.equipment ?? []),
    ...(exercise.ai_keywords ?? []),
    exercise.instructions,
    exercise.notes,
    exercise.semantic_group,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function matchesFilter(exercise: Exercise, filters: LibraryFilters): boolean {
  const s = filters.search.trim().toLowerCase();
  if (s && !haystack(exercise).includes(s)) return false;

  if (filters.bodyRegion) {
    const region = (exercise.body_region ?? "").toLowerCase();
    if (!region.includes(filters.bodyRegion)) return false;
  }

  if (filters.specialty && (exercise.specialty ?? "").toLowerCase() !== filters.specialty) return false;

  if (filters.difficulty && exercise.level !== filters.difficulty) return false;

  if (filters.objective) {
    const objs = (exercise.objectives ?? []).map((o) => o.toLowerCase());
    if (!objs.some((o) => o.includes(filters.objective!))) return false;
  }

  if (filters.equipment) {
    const eq = (exercise.equipment ?? []).map((e) => e.toLowerCase());
    if (!eq.some((e) => e.includes(filters.equipment!))) return false;
  }

  if (filters.pathology) {
    const text = haystack(exercise);
    if (!text.includes(filters.pathology.replace(/-/g, " ")) && !text.includes(filters.pathology)) return false;
  }

  if (filters.categoryId && exercise.category_id !== filters.categoryId) return false;

  return true;
}

export function filterExercises(
  exercises: Exercise[],
  filters: LibraryFilters,
  view: LibraryView,
  favoriteExerciseIds: Set<string>,
): Exercise[] {
  return exercises.filter((exercise) => {
    if (view === "favoritos" && !favoriteExerciseIds.has(exercise.id)) return false;
    return matchesFilter(exercise, filters);
  });
}

export function filterProtocols(
  protocols: ExerciseProtocol[],
  filters: LibraryFilters,
  view: LibraryView,
  favoriteProtocolIds: Set<string>,
): ExerciseProtocol[] {
  const s = filters.search.trim().toLowerCase();
  return protocols.filter((protocol) => {
    if (view === "exercicios") return false;
    if (view === "favoritos" && !favoriteProtocolIds.has(protocol.id)) return false;
    if (protocol.status === "archived") return false;

    if (filters.bodyRegion && !(protocol.body_region ?? "").toLowerCase().includes(filters.bodyRegion)) return false;
    if (filters.difficulty && protocol.level !== filters.difficulty) return false;
    if (filters.specialty && !(protocol.therapeutic_goal ?? "").toLowerCase().includes(filters.specialty)) return false;

    if (!s) return true;
    const text = [
      protocol.name,
      protocol.description,
      protocol.indication,
      protocol.target_condition,
      protocol.therapeutic_goal,
      protocol.body_region,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return text.includes(s);
  });
}

export function countActiveFilters(filters: LibraryFilters): number {
  return [
    filters.bodyRegion,
    filters.pathology,
    filters.objective,
    filters.specialty,
    filters.equipment,
    filters.difficulty,
    filters.categoryId,
  ].filter(Boolean).length;
}

import { useQuery } from "@tanstack/react-query";
import { fetchExerciseCategories, fetchExercises } from "@/services/library/library-api";

export function useExerciseCategories() {
  return useQuery({
    queryKey: ["library", "categories"],
    queryFn: fetchExerciseCategories,
    staleTime: 60_000,
  });
}

export function useExercises(clinicId: string | null) {
  return useQuery({
    queryKey: ["library", "exercises", clinicId],
    queryFn: fetchExercises,
    enabled: !!clinicId,
    staleTime: 30_000,
  });
}

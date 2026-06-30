import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchExerciseFavorites, toggleExerciseFavorite } from "@/services/library/library-api";
import { useAuth } from "@/lib/auth";
import { useActiveClinic } from "@/lib/active-clinic";
import { useMemo } from "react";

export function useExerciseFavorites(clinicId: string | null) {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ["library", "favorites", clinicId, user?.id],
    queryFn: () => fetchExerciseFavorites(clinicId!, user!.id),
    enabled: !!clinicId && !!user?.id,
    staleTime: 30_000,
  });

  const favoriteExerciseIds = useMemo(
    () => new Set((query.data ?? []).filter((f) => f.favorite_type === "exercise" && f.exercise_id).map((f) => f.exercise_id!)),
    [query.data],
  );

  const favoriteProtocolIds = useMemo(
    () => new Set((query.data ?? []).filter((f) => f.favorite_type === "protocol" && f.protocol_id).map((f) => f.protocol_id!)),
    [query.data],
  );

  return { ...query, favoriteExerciseIds, favoriteProtocolIds };
}

export function useToggleExerciseFavorite() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { clinicId, supportMode } = useActiveClinic();

  return useMutation({
    mutationFn: async ({ exerciseId, isFavorite }: { exerciseId: string; isFavorite: boolean }) => {
      if (supportMode) throw new Error("Modo Suporte ativo: somente leitura.");
      if (!clinicId || !user?.id) throw new Error("Clínica ou usuário não identificado.");
      return toggleExerciseFavorite({
        clinicId,
        userId: user.id,
        exerciseId,
        isFavorite,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["library", "favorites", clinicId] });
    },
  });
}

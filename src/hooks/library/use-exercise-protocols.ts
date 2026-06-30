import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  archiveProtocol,
  createProtocol,
  duplicateProtocol,
  fetchExerciseProtocols,
  syncProtocolItems,
  toggleProtocolFavorite,
  updateProtocol,
} from "@/services/library/library-api";
import type { CreateProtocolInput, ExerciseProtocol } from "@/features/library/types";
import { useAuth } from "@/lib/auth";
import { useActiveClinic } from "@/lib/active-clinic";

export function useExerciseProtocols(clinicId: string | null) {
  return useQuery({
    queryKey: ["library", "protocols", clinicId],
    queryFn: fetchExerciseProtocols,
    enabled: !!clinicId,
    staleTime: 30_000,
  });
}

export function useProtocolMutations() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { clinicId, supportMode } = useActiveClinic();

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["library", "protocols", clinicId] });
    qc.invalidateQueries({ queryKey: ["library", "favorites", clinicId] });
  };

  const guard = () => {
    if (supportMode) throw new Error("Modo Suporte ativo: somente leitura.");
    if (!clinicId || !user?.id) throw new Error("Clínica ou usuário não identificado.");
  };

  const create = useMutation({
    mutationFn: async (input: CreateProtocolInput) => {
      guard();
      return createProtocol(clinicId!, user!.id, input);
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Parameters<typeof updateProtocol>[1] }) => {
      guard();
      return updateProtocol(id, patch);
    },
    onSuccess: invalidate,
  });

  const archive = useMutation({
    mutationFn: async (id: string) => {
      guard();
      return archiveProtocol(id);
    },
    onSuccess: invalidate,
  });

  const duplicate = useMutation({
    mutationFn: async (source: ExerciseProtocol) => {
      guard();
      return duplicateProtocol(clinicId!, user!.id, source);
    },
    onSuccess: invalidate,
  });

  const syncItems = useMutation({
    mutationFn: async ({
      protocolId,
      items,
    }: {
      protocolId: string;
      items: CreateProtocolInput["items"];
    }) => {
      guard();
      return syncProtocolItems(protocolId, items);
    },
    onSuccess: invalidate,
  });

  const toggleFavorite = useMutation({
    mutationFn: async ({ protocolId, isFavorite }: { protocolId: string; isFavorite: boolean }) => {
      guard();
      return toggleProtocolFavorite({
        clinicId: clinicId!,
        userId: user!.id,
        protocolId,
        isFavorite,
      });
    },
    onSuccess: invalidate,
  });

  return { create, update, archive, duplicate, syncItems, toggleFavorite };
}

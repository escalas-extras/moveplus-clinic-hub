import { EmptyState } from "@/components/layout";
import { Dumbbell } from "lucide-react";
import type { Exercise } from "@/features/library/types";
import { ExerciseCard } from "@/components/library/ExerciseCard";

type Props = {
  exercises: Exercise[];
  categoryLabel: (exercise: Exercise) => string;
  favoriteIds: Set<string>;
  onFavorite: (id: string, isFavorite: boolean) => void;
  onSelect: (exercise: Exercise) => void;
  onOpen: (exercise: Exercise) => void;
  onAddToProtocol: (exercise: Exercise) => void;
  onClearFilters?: () => void;
  hasActiveFilters?: boolean;
};

export function ExerciseLibraryGrid({
  exercises,
  categoryLabel,
  favoriteIds,
  onFavorite,
  onSelect,
  onOpen,
  onAddToProtocol,
  onClearFilters,
  hasActiveFilters,
}: Props) {
  if (exercises.length === 0) {
    return (
      <EmptyState
        icon={Dumbbell}
        title={hasActiveFilters ? "Nenhum exercício encontrado" : "Biblioteca ainda vazia"}
        description={
          hasActiveFilters
            ? "Ajuste a busca ou filtros para encontrar mais opções."
            : "Exercícios ativos aparecerão aqui quando cadastrados."
        }
        action={hasActiveFilters && onClearFilters ? { label: "Limpar filtros", onClick: onClearFilters } : undefined}
        className="rounded-2xl border border-[rgba(15,76,92,0.08)] bg-white/80 py-14"
      />
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
      {exercises.map((exercise) => (
        <ExerciseCard
          key={exercise.id}
          exercise={exercise}
          categoryLabel={categoryLabel(exercise)}
          favorite={favoriteIds.has(exercise.id)}
          onFavorite={() => onFavorite(exercise.id, favoriteIds.has(exercise.id))}
          onSelect={() => onSelect(exercise)}
          onOpen={() => onOpen(exercise)}
          onAddToProtocol={() => onAddToProtocol(exercise)}
        />
      ))}
    </div>
  );
}

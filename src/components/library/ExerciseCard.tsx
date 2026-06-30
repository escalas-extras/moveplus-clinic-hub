import { BadgePlus, Eye, Star, StarOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/layout";
import { cn } from "@/lib/utils";
import type { Exercise } from "@/features/library/types";
import { formatExerciseLevel } from "@/components/library/ExerciseLibraryFilters";
import { ExerciseThumbnail } from "@/components/library/ExerciseThumbnail";

type Props = {
  exercise: Exercise;
  categoryLabel: string;
  favorite: boolean;
  onFavorite: () => void;
  onSelect: () => void;
  onOpen: () => void;
  onAddToProtocol: () => void;
};

function MetaCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-2.5 py-2">
      <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className="mt-0.5 truncate font-semibold text-slate-700">{value}</p>
    </div>
  );
}

export function ExerciseCard({
  exercise,
  categoryLabel,
  favorite,
  onFavorite,
  onSelect,
  onOpen,
  onAddToProtocol,
}: Props) {
  const objective = exercise.objectives?.[0] ?? "Funcional";
  const equipment = exercise.equipment?.[0] ?? "Livre";

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onDoubleClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      className="group overflow-hidden rounded-3xl border border-[rgba(15,76,92,0.1)] bg-white p-3 shadow-[var(--fos-card-shadow)] transition-[box-shadow,transform,border-color] hover:-translate-y-px hover:border-primary/25 hover:shadow-[var(--shadow-lift)]"
    >
      <div className="relative">
        <ExerciseThumbnail exercise={exercise} />
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onFavorite();
          }}
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-slate-500 shadow-soft transition hover:text-amber-500"
          aria-label={favorite ? "Remover dos favoritos" : "Favoritar"}
        >
          {favorite ? <Star className="h-4 w-4 fill-amber-400 text-amber-400" /> : <StarOff className="h-4 w-4" />}
        </button>
      </div>

      <div className="space-y-3 p-2 pt-4">
        <div>
          <div className="mb-2 flex flex-wrap gap-1.5">
            <StatusBadge variant="info">{categoryLabel}</StatusBadge>
            <StatusBadge variant={exercise.level === "avancado" ? "warning" : "neutral"}>
              {formatExerciseLevel(exercise.level)}
            </StatusBadge>
          </div>
          <h3 className="line-clamp-2 text-base font-bold tracking-tight text-slate-950">{exercise.name}</h3>
          {exercise.description && (
            <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-slate-600">{exercise.description}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <MetaCell label="Região" value={exercise.body_region ?? "—"} />
          <MetaCell label="Objetivo" value={objective} />
          <MetaCell label="Articulação" value={exercise.joint ?? "—"} />
          <MetaCell label="Equipamento" value={equipment} />
        </div>

        <div className="flex flex-wrap gap-1">
          {(exercise.objectives ?? []).slice(0, 4).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
          ))}
        </div>

        <div className="flex gap-2 border-t border-[rgba(15,76,92,0.08)] pt-3">
          <Button type="button" size="sm" className="flex-1 rounded-xl" onClick={(event) => { event.stopPropagation(); onAddToProtocol(); }}>
            <BadgePlus className="mr-1.5 h-3.5 w-3.5" />
            Adicionar
          </Button>
          <Button type="button" size="sm" variant="outline" className="rounded-xl" onClick={(event) => { event.stopPropagation(); onOpen(); }}>
            <Eye className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </article>
  );
}

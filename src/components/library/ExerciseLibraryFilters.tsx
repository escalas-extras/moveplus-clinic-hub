import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  BODY_REGIONS,
  DIFFICULTY_OPTIONS,
  EQUIPMENT_OPTIONS,
  OBJECTIVES,
  PATHOLOGIES,
  SPECIALTIES,
} from "@/features/library/constants";
import type { ExerciseCategory, LibraryFilters } from "@/features/library/types";
import { EXERCISE_LEVEL_LABELS } from "@/features/library/constants";

type Props = {
  filters: LibraryFilters;
  categories: ExerciseCategory[];
  activeFilterCount: number;
  onPatch: (patch: Partial<LibraryFilters>) => void;
  onClear: () => void;
};

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
        active
          ? "border-transparent bg-primary text-primary-foreground"
          : "border-[rgba(15,76,92,0.12)] bg-white text-slate-600 hover:border-primary/30 hover:text-primary",
      )}
    >
      {label}
    </button>
  );
}

export function ExerciseLibraryFilters({
  filters,
  categories,
  activeFilterCount,
  onPatch,
  onClear,
}: Props) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Região</span>
        <FilterChip label="Todas" active={!filters.bodyRegion} onClick={() => onPatch({ bodyRegion: null })} />
        {BODY_REGIONS.map((r) => (
          <FilterChip
            key={r.value}
            label={r.label}
            active={filters.bodyRegion === r.value}
            onClick={() => onPatch({ bodyRegion: filters.bodyRegion === r.value ? null : r.value })}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Objetivo</span>
        {OBJECTIVES.map((o) => (
          <FilterChip
            key={o.value}
            label={o.label}
            active={filters.objective === o.value}
            onClick={() => onPatch({ objective: filters.objective === o.value ? null : o.value })}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Especialidade</span>
        {SPECIALTIES.map((s) => (
          <FilterChip
            key={s.value}
            label={s.label}
            active={filters.specialty === s.value}
            onClick={() => onPatch({ specialty: filters.specialty === s.value ? null : s.value })}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Patologia</span>
        {PATHOLOGIES.map((p) => (
          <FilterChip
            key={p.value}
            label={p.label}
            active={filters.pathology === p.value}
            onClick={() => onPatch({ pathology: filters.pathology === p.value ? null : p.value })}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Equipamento</span>
        {EQUIPMENT_OPTIONS.map((e) => (
          <FilterChip
            key={e.value}
            label={e.label}
            active={filters.equipment === e.value}
            onClick={() => onPatch({ equipment: filters.equipment === e.value ? null : e.value })}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Dificuldade</span>
        {DIFFICULTY_OPTIONS.map((d) => (
          <FilterChip
            key={d.value}
            label={d.label}
            active={filters.difficulty === d.value}
            onClick={() => onPatch({ difficulty: filters.difficulty === d.value ? null : d.value })}
          />
        ))}
      </div>

      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant={!filters.categoryId ? "default" : "outline"} onClick={() => onPatch({ categoryId: null })}>
            Todas categorias
          </Button>
          {categories.map((c) => (
            <Button
              key={c.id}
              size="sm"
              variant={filters.categoryId === c.id ? "default" : "outline"}
              onClick={() => onPatch({ categoryId: filters.categoryId === c.id ? null : c.id })}
            >
              {c.name}
            </Button>
          ))}
        </div>
      )}

      {activeFilterCount > 0 && (
        <Button size="sm" variant="ghost" onClick={onClear} className="text-slate-500">
          Limpar filtros ({activeFilterCount})
        </Button>
      )}
    </div>
  );
}

export function formatExerciseLevel(level: string) {
  return EXERCISE_LEVEL_LABELS[level as keyof typeof EXERCISE_LEVEL_LABELS] ?? level;
}

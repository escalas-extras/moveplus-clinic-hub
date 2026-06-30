import { BadgePlus, Dumbbell, Eye, Search, Star, StarOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, PageSection, StatusBadge } from "@/components/layout";
import type { Exercise } from "@/features/library/types";
import { formatExerciseLevel } from "@/components/library/ExerciseLibraryFilters";
import { ExerciseThumbnail } from "@/components/library/ExerciseThumbnail";

type Props = {
  exercise: Exercise | null;
  categoryLabel: string | null;
  favorite: boolean;
  onFavorite: () => void;
  onOpen: () => void;
  onAddToProtocol: () => void;
};

function Section({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-[rgba(15,76,92,0.08)] bg-slate-50/70 p-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{title}</p>
      <p className="mt-1 text-sm leading-relaxed text-slate-700">{text}</p>
    </div>
  );
}

export function ExercisePreviewPanel({
  exercise,
  categoryLabel,
  favorite,
  onFavorite,
  onOpen,
  onAddToProtocol,
}: Props) {
  if (!exercise) {
    return (
      <PageSection icon={Dumbbell} title="Preview do exercício" description="Selecione um exercício para ver detalhes.">
        <EmptyState icon={Search} title="Nenhum exercício selecionado" description="Clique em um card para abrir descrição, execução e cuidados." className="py-8" />
      </PageSection>
    );
  }

  return (
    <PageSection icon={Dumbbell} title="Preview lateral" description="Detalhes rápidos do exercício." contentClassName="space-y-4">
      <ExerciseThumbnail exercise={exercise} />
      <div>
        <div className="flex flex-wrap gap-1.5">
          <StatusBadge variant="info">{categoryLabel ?? "Exercício"}</StatusBadge>
          <StatusBadge variant="neutral">{formatExerciseLevel(exercise.level)}</StatusBadge>
        </div>
        <h2 className="mt-3 text-lg font-bold tracking-tight text-slate-950">{exercise.name}</h2>
        {exercise.description && <p className="mt-2 text-sm leading-relaxed text-slate-600">{exercise.description}</p>}
      </div>
      <Section title="Instruções" text={exercise.instructions ?? "Consulte o conteúdo completo em Visualizar."} />
      <Section title="Contraindicações" text={exercise.contraindications ?? "Sem contraindicações registradas."} />
      <Section title="Observações" text={exercise.notes ?? "—"} />
      <div className="grid gap-2">
        <Button className="rounded-xl" onClick={onAddToProtocol}>
          <BadgePlus className="mr-2 h-4 w-4" />
          Adicionar ao protocolo
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" className="rounded-xl" onClick={onFavorite}>
            {favorite ? <Star className="mr-2 h-4 w-4 fill-amber-400 text-amber-400" /> : <StarOff className="mr-2 h-4 w-4" />}
            Favoritar
          </Button>
          <Button variant="outline" className="rounded-xl" onClick={onOpen}>
            <Eye className="mr-2 h-4 w-4" />
            Visualizar
          </Button>
        </div>
      </div>
    </PageSection>
  );
}

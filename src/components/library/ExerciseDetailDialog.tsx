import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Exercise } from "@/features/library/types";
import { formatExerciseLevel } from "@/components/library/ExerciseLibraryFilters";
import { ExerciseThumbnail } from "@/components/library/ExerciseThumbnail";

type Props = {
  exercise: Exercise | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ExerciseDetailDialog({ exercise, open, onOpenChange }: Props) {
  if (!exercise) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">{exercise.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <ExerciseThumbnail exercise={exercise} className="relative aspect-video overflow-hidden rounded-2xl bg-slate-100" />
          {exercise.description && (
            <p className="border-l-2 border-primary/30 pl-3 text-sm italic text-muted-foreground">{exercise.description}</p>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <Detail label="Região" value={exercise.body_region} />
            <Detail label="Articulação" value={exercise.joint} />
            <Detail label="Especialidade" value={exercise.specialty} />
            <Detail label="Nível" value={formatExerciseLevel(exercise.level)} />
          </div>
          {exercise.instructions && (
            <section>
              <h4 className="mb-1 text-sm font-semibold">Instruções</h4>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{exercise.instructions}</p>
            </section>
          )}
          {exercise.contraindications && (
            <section>
              <h4 className="mb-1 text-sm font-semibold">Contraindicações</h4>
              <p className="text-sm leading-relaxed text-slate-700">{exercise.contraindications}</p>
            </section>
          )}
          {exercise.notes && (
            <section>
              <h4 className="mb-1 text-sm font-semibold">Observações</h4>
              <p className="text-sm leading-relaxed text-slate-700">{exercise.notes}</p>
            </section>
          )}
          <div className="flex flex-wrap gap-1 border-t pt-3">
            {(exercise.objectives ?? []).map((t) => (
              <Badge key={t} variant="secondary">{t}</Badge>
            ))}
            {(exercise.equipment ?? []).map((t) => (
              <Badge key={t} variant="outline">{t}</Badge>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="text-sm font-medium text-slate-800">{value}</p>
    </div>
  );
}

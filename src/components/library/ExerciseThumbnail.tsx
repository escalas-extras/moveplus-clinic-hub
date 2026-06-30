import { PlayCircle } from "lucide-react";
import type { Exercise } from "@/features/library/types";

export function ExerciseThumbnail({ exercise, className }: { exercise: Exercise; className?: string }) {
  const primaryMedia = exercise.exercise_media?.find((m) => m.is_primary && m.active)
    ?? exercise.exercise_media?.find((m) => m.active);
  const src = exercise.thumbnail_url
    ?? primaryMedia?.thumbnail_path
    ?? primaryMedia?.external_url;

  if (src) {
    return (
      <div className={className ?? "relative aspect-[4/3] overflow-hidden rounded-2xl bg-slate-100"}>
        <img src={src} alt={exercise.name} className="h-full w-full object-cover" loading="lazy" />
        {exercise.video_url && (
          <span className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white">
            <PlayCircle className="h-4 w-4" />
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={className ?? "relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-2xl bg-[linear-gradient(135deg,rgba(15,76,92,0.08),rgba(43,182,115,0.1))]"}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.8),transparent_36%),radial-gradient(circle_at_70%_75%,rgba(15,76,92,0.12),transparent_42%)]" />
      <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-white/85 text-primary shadow-soft ring-1 ring-white/80">
        <PlayCircle className="h-7 w-7" aria-hidden />
      </span>
    </div>
  );
}

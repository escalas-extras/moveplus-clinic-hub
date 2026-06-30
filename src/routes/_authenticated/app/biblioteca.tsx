import { createFileRoute } from "@tanstack/react-router";
import { ExerciseLibraryPage } from "@/features/library/ExerciseLibraryPage";

export const Route = createFileRoute("/_authenticated/app/biblioteca")({
  component: BibliotecaRoute,
});

function BibliotecaRoute() {
  return <ExerciseLibraryPage />;
}

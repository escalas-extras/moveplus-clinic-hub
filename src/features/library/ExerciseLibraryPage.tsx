import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ClipboardList,
  Dumbbell,
  PackagePlus,
  Sparkles,
  Star,
  WandSparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useBranding } from "@/lib/branding";
import { useActiveClinic } from "@/lib/active-clinic";
import {
  ClinicalSkeleton,
  EmptyState,
  InfoCard,
  KpiCard,
  KpiGrid,
  StatusBadge,
} from "@/components/layout";
import { ActionButton, ModuleStack, PageHero } from "@/components/ui-system";
import { ExerciseLibrarySearch } from "@/components/library/ExerciseLibrarySearch";
import { ExerciseLibraryFilters } from "@/components/library/ExerciseLibraryFilters";
import { ExerciseLibraryGrid } from "@/components/library/ExerciseLibraryGrid";
import { ExercisePreviewPanel } from "@/components/library/ExercisePreviewPanel";
import { ExerciseDetailDialog } from "@/components/library/ExerciseDetailDialog";
import { ProtocolBuilderPanel, ProtocolCard } from "@/components/library/ProtocolPanels";
import { ProtocolFormDialog } from "@/components/library/ProtocolFormDialog";
import { RegionShortcuts } from "@/components/library/RegionShortcuts";
import { useExerciseCategories, useExercises } from "@/hooks/library/use-exercises";
import { useExerciseFavorites, useToggleExerciseFavorite } from "@/hooks/library/use-exercise-favorites";
import { useExerciseProtocols, useProtocolMutations } from "@/hooks/library/use-exercise-protocols";
import { useLibraryFilters } from "@/hooks/library/use-library-filters";
import { filterExercises, filterProtocols } from "@/services/library/filter-exercises";
import { AI_FUTURE_FIELDS } from "@/features/library/constants";
import type { Exercise, ExerciseProtocol, ProtocolDraftItem } from "@/features/library/types";

export function ExerciseLibraryPage() {
  const brand = useBranding();
  const { clinicId } = useActiveClinic();
  const {
    view,
    setView,
    filters,
    setSearch,
    patchFilters,
    clearFilters,
    applyShortcut,
    activeShortcut,
    activeFilterCount,
  } = useLibraryFilters();

  const categoriesQuery = useExerciseCategories();
  const exercisesQuery = useExercises(clinicId);
  const protocolsQuery = useExerciseProtocols(clinicId);
  const favoritesQuery = useExerciseFavorites(clinicId);
  const toggleFavorite = useToggleExerciseFavorite();
  const protocolMutations = useProtocolMutations();

  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [detailExercise, setDetailExercise] = useState<Exercise | null>(null);
  const [protocolDraft, setProtocolDraft] = useState<ProtocolDraftItem[]>([]);
  const [protocolFormOpen, setProtocolFormOpen] = useState(false);
  const [editingProtocol, setEditingProtocol] = useState<ExerciseProtocol | null>(null);

  const categories = categoriesQuery.data ?? [];
  const exercises = exercisesQuery.data ?? [];
  const protocols = protocolsQuery.data ?? [];
  const favoriteExerciseIds = favoritesQuery.favoriteExerciseIds;
  const favoriteProtocolIds = favoritesQuery.favoriteProtocolIds;

  const loading =
    exercisesQuery.isLoading ||
    protocolsQuery.isLoading ||
    favoritesQuery.isLoading ||
    categoriesQuery.isLoading;

  const filteredExercises = useMemo(
    () => filterExercises(exercises, filters, view, favoriteExerciseIds),
    [exercises, filters, view, favoriteExerciseIds],
  );

  const filteredProtocols = useMemo(
    () => filterProtocols(protocols, filters, view, favoriteProtocolIds),
    [protocols, filters, view, favoriteProtocolIds],
  );

  const categoryLabel = (exercise: Exercise) =>
    categories.find((c) => c.id === exercise.category_id)?.name ?? exercise.body_region ?? "Exercício";

  const previewExercise = selectedExercise ?? filteredExercises[0] ?? null;

  function addToProtocol(exercise: Exercise) {
    setProtocolDraft((prev) => {
      if (prev.some((x) => x.exercise.id === exercise.id)) return prev;
      return [...prev, { exercise, sort_order: prev.length }];
    });
    toast.success("Exercício adicionado ao protocolo");
  }

  function moveDraftItem(index: number, direction: -1 | 1) {
    setProtocolDraft((prev) => {
      const next = index + direction;
      if (next < 0 || next >= prev.length) return prev;
      const copy = [...prev];
      const [item] = copy.splice(index, 1);
      copy.splice(next, 0, item);
      return copy.map((x, i) => ({ ...x, sort_order: i }));
    });
  }

  function duplicateDraftItem(exerciseId: string) {
    const item = protocolDraft.find((x) => x.exercise.id === exerciseId);
    if (!item) return;
    setProtocolDraft((prev) => [...prev, { ...item, sort_order: prev.length }]);
  }

  async function handleSaveProtocol(meta: {
    name: string;
    description?: string;
    indication?: string;
    therapeutic_goal?: string;
    frequency?: string;
    level?: import("@/features/library/types").ExerciseLevel;
  }) {
    if (protocolDraft.length === 0) {
      toast.error("Adicione exercícios ao protocolo antes de salvar.");
      return;
    }
    try {
      const items = protocolDraft.map((item, index) => ({
        exercise_id: item.exercise.id,
        sort_order: index,
        sets: item.sets,
        repetitions: item.repetitions,
        notes: item.notes,
      }));

      if (editingProtocol) {
        await protocolMutations.update.mutateAsync({
          id: editingProtocol.id,
          patch: meta,
        });
        await protocolMutations.syncItems.mutateAsync({ protocolId: editingProtocol.id, items });
        toast.success("Protocolo atualizado");
      } else {
        await protocolMutations.create.mutateAsync({ ...meta, items });
        toast.success("Protocolo criado");
      }
      setProtocolDraft([]);
      setEditingProtocol(null);
      setProtocolFormOpen(false);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function handleToggleExerciseFavorite(exerciseId: string, isFavorite: boolean) {
    try {
      await toggleFavorite.mutateAsync({ exerciseId, isFavorite });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  const showExerciseGrid = view === "exercicios" || view === "favoritos";

  return (
    <>
      <ModuleStack className="exercise-library space-y-4 sm:space-y-5">
        <PageHero
          title="Biblioteca Inteligente"
          clinicName={brand.clinicName}
          dateLabel="Monte protocolos completos em poucos minutos."
          primaryColor={brand.primaryColor}
          secondaryColor={brand.secondaryColor}
          daySummary={[
            { label: "exercícios", value: exercises.length },
            { label: "protocolos", value: protocols.length },
            { label: "favoritos", value: favoriteExerciseIds.size + favoriteProtocolIds.size },
          ]}
          actions={
            <>
              <ActionButton
                className="h-10 gap-2 px-4 text-sm"
                style={{ background: brand.primaryColor }}
                onClick={() => {
                  setEditingProtocol(null);
                  setProtocolFormOpen(true);
                }}
              >
                <PackagePlus className="h-4 w-4" />
                Novo protocolo
              </ActionButton>
              <ActionButton variant="secondary" className="h-10 gap-2 bg-white/90 px-4 text-sm" onClick={() => setView("favoritos")}>
                <Star className="h-4 w-4" />
                Favoritos
              </ActionButton>
            </>
          }
        />

        <KpiGrid columns={4} className="gap-2.5 lg:gap-3">
          <KpiCard icon={Dumbbell} label="Total de exercícios" value={exercises.length} subtitle="Catálogo ativo" hideDelta variant="premium" accent={brand.primaryColor} />
          <KpiCard icon={ClipboardList} label="Protocolos" value={protocols.length} subtitle="Modelos disponíveis" hideDelta variant="premium" accent={brand.secondaryColor} />
          <KpiCard icon={Star} label="Favoritos" value={favoriteExerciseIds.size + favoriteProtocolIds.size} subtitle="Seleção do profissional" hideDelta variant="premium" accent="#d97706" />
          <KpiCard icon={Sparkles} label="Campos IA" value={AI_FUTURE_FIELDS.length} subtitle="Preparados (sem IA)" hideDelta variant="premium" accent="#6366f1" />
        </KpiGrid>

        <section className="rounded-2xl border border-[rgba(15,76,92,0.12)] bg-white/90 p-4 shadow-[var(--fos-card-shadow)] sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <ExerciseLibrarySearch value={filters.search} onChange={setSearch} />
            <div className="flex flex-wrap gap-2">
              {[
                { label: "Exercícios", value: "exercicios" as const, icon: Dumbbell },
                { label: "Protocolos", value: "protocolos" as const, icon: ClipboardList },
                { label: "Favoritos", value: "favoritos" as const, icon: Star },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setView(item.value)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-semibold transition-[background-color,border-color,color,transform] hover:-translate-y-px",
                      view === item.value
                        ? "border-transparent bg-[var(--fos-primary)] text-white shadow-soft"
                        : "border-[rgba(15,76,92,0.12)] bg-white text-slate-600 hover:border-[rgba(15,76,92,0.24)]",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="mt-4">
            <ExerciseLibraryFilters
              filters={filters}
              categories={categories}
              activeFilterCount={activeFilterCount}
              onPatch={patchFilters}
              onClear={clearFilters}
            />
          </div>
        </section>

        <RegionShortcuts
          activeShortcut={activeShortcut}
          onSelect={(key, filter) => applyShortcut(key, filter)}
        />

        {loading ? (
          <ClinicalSkeleton variant="split" kpiCount={4} />
        ) : (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="min-w-0 space-y-4">
              {showExerciseGrid && (
                <ExerciseLibraryGrid
                  exercises={filteredExercises}
                  categoryLabel={categoryLabel}
                  favoriteIds={favoriteExerciseIds}
                  onFavorite={handleToggleExerciseFavorite}
                  onSelect={setSelectedExercise}
                  onOpen={setDetailExercise}
                  onAddToProtocol={addToProtocol}
                  onClearFilters={clearFilters}
                  hasActiveFilters={activeFilterCount > 0 || !!filters.search}
                />
              )}

              {(view === "protocolos" || (view === "favoritos" && filteredProtocols.length > 0)) && (
                <div className="grid gap-4 md:grid-cols-2">
                  {filteredProtocols.length === 0 ? (
                    <EmptyState
                      icon={ClipboardList}
                      title="Nenhum protocolo encontrado"
                      description="Crie um protocolo ou ajuste os filtros."
                      className="rounded-2xl border bg-white/80 py-12 md:col-span-2"
                    />
                  ) : (
                    filteredProtocols.map((protocol) => (
                      <ProtocolCard
                        key={protocol.id}
                        name={protocol.name}
                        description={protocol.description}
                        itemCount={protocol.protocol_exercises?.length ?? 0}
                        favorite={favoriteProtocolIds.has(protocol.id)}
                        onFavorite={async () => {
                          try {
                            await protocolMutations.toggleFavorite.mutateAsync({
                              protocolId: protocol.id,
                              isFavorite: favoriteProtocolIds.has(protocol.id),
                            });
                          } catch (e) {
                            toast.error((e as Error).message);
                          }
                        }}
                        onEdit={() => {
                          setEditingProtocol(protocol);
                          setProtocolDraft(
                            (protocol.protocol_exercises ?? [])
                              .sort((a, b) => a.sort_order - b.sort_order)
                              .filter((pe) => pe.exercises)
                              .map((pe, index) => ({
                                exercise: pe.exercises as Exercise,
                                sort_order: index,
                                sets: pe.sets ?? undefined,
                                repetitions: pe.repetitions ?? undefined,
                                notes: pe.notes ?? undefined,
                              })),
                          );
                          setProtocolFormOpen(true);
                        }}
                        onDuplicate={async () => {
                          try {
                            await protocolMutations.duplicate.mutateAsync(protocol);
                            toast.success("Protocolo duplicado");
                          } catch (e) {
                            toast.error((e as Error).message);
                          }
                        }}
                        onArchive={async () => {
                          try {
                            await protocolMutations.archive.mutateAsync(protocol.id);
                            toast.success("Protocolo arquivado");
                          } catch (e) {
                            toast.error((e as Error).message);
                          }
                        }}
                      />
                    ))
                  )}
                </div>
              )}
            </div>

            <aside className="space-y-4 xl:sticky xl:top-4 xl:self-start">
              <ExercisePreviewPanel
                exercise={previewExercise}
                categoryLabel={previewExercise ? categoryLabel(previewExercise) : null}
                favorite={previewExercise ? favoriteExerciseIds.has(previewExercise.id) : false}
                onFavorite={() => previewExercise && handleToggleExerciseFavorite(previewExercise.id, favoriteExerciseIds.has(previewExercise.id))}
                onOpen={() => previewExercise && setDetailExercise(previewExercise)}
                onAddToProtocol={() => previewExercise && addToProtocol(previewExercise)}
              />
              <ProtocolBuilderPanel
                items={protocolDraft}
                onMove={moveDraftItem}
                onRemove={(id) => setProtocolDraft((prev) => prev.filter((x) => x.exercise.id !== id))}
                onDuplicate={duplicateDraftItem}
                onSave={() => setProtocolFormOpen(true)}
                saving={protocolMutations.create.isPending}
              />
              <InfoCard icon={WandSparkles} title="IA — sprint futura" description="Campos preparados no banco; sem inferência nesta etapa." padded={false}>
                <div className="flex flex-wrap gap-2 p-4">
                  {AI_FUTURE_FIELDS.map((field) => (
                    <span key={field} className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600">
                      {field}
                      <StatusBadge variant="neutral" className="text-[10px]">Soon</StatusBadge>
                    </span>
                  ))}
                </div>
              </InfoCard>
            </aside>
          </div>
        )}
      </ModuleStack>

      <ExerciseDetailDialog
        exercise={detailExercise}
        open={!!detailExercise}
        onOpenChange={(open) => !open && setDetailExercise(null)}
      />

      <ProtocolFormDialog
        open={protocolFormOpen}
        onOpenChange={(open) => {
          setProtocolFormOpen(open);
          if (!open) setEditingProtocol(null);
        }}
        title={editingProtocol ? "Editar protocolo" : "Salvar protocolo"}
        initial={editingProtocol ?? undefined}
        loading={protocolMutations.create.isPending || protocolMutations.update.isPending}
        onSubmit={handleSaveProtocol}
      />
    </>
  );
}

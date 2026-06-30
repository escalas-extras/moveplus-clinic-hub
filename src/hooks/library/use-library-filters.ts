import { useMemo, useState } from "react";
import type { LibraryFilters, LibraryView } from "@/features/library/types";
import { DEFAULT_LIBRARY_FILTERS } from "@/features/library/constants";
import { countActiveFilters } from "@/services/library/filter-exercises";

export function useLibraryFilters() {
  const [view, setView] = useState<LibraryView>("exercicios");
  const [filters, setFilters] = useState<LibraryFilters>(DEFAULT_LIBRARY_FILTERS);
  const [activeShortcut, setActiveShortcut] = useState<string | null>(null);

  const activeFilterCount = useMemo(() => countActiveFilters(filters), [filters]);

  const setSearch = (search: string) => setFilters((prev) => ({ ...prev, search }));

  const patchFilters = (patch: Partial<LibraryFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
  };

  const clearFilters = () => {
    setFilters(DEFAULT_LIBRARY_FILTERS);
    setActiveShortcut(null);
  };

  const applyShortcut = (key: string, patch: Partial<LibraryFilters>) => {
    setActiveShortcut(key);
    setFilters((prev) => ({ ...DEFAULT_LIBRARY_FILTERS, search: prev.search, ...patch }));
  };

  return {
    view,
    setView,
    filters,
    setSearch,
    patchFilters,
    clearFilters,
    applyShortcut,
    activeShortcut,
    activeFilterCount,
  };
}

import { PageSection } from "@/components/layout";
import { Layers } from "lucide-react";
import { REGION_SHORTCUTS } from "@/features/library/constants";
import { cn } from "@/lib/utils";

import type { LibraryFilters } from "@/features/library/types";

type Props = {
  activeShortcut: string | null;
  onSelect: (key: string, filter: Partial<LibraryFilters>) => void;
};

export function RegionShortcuts({ activeShortcut, onSelect }: Props) {
  return (
    <PageSection
      icon={Layers}
      title="Categorias"
      description="Atalhos por região, especialidade e objetivo."
      contentClassName="pt-0"
      className="scroll-mt-4"
    >
      <div id="exercise-categories" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        {REGION_SHORTCUTS.map((cat) => {
          const Icon = cat.icon;
          return (
            <button
              key={cat.key}
              type="button"
              onClick={() => onSelect(cat.key, cat.filter)}
              className={cn(
                "group rounded-2xl border bg-white p-3 text-left shadow-sm transition-[box-shadow,transform,border-color] hover:-translate-y-px hover:border-primary/25 hover:shadow-[var(--shadow-lift)]",
                activeShortcut === cat.key && "border-primary/35 bg-primary/[0.04] ring-1 ring-primary/15",
              )}
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <p className="mt-3 text-sm font-bold text-slate-900">{cat.label}</p>
              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">{cat.description}</p>
            </button>
          );
        })}
      </div>
    </PageSection>
  );
}

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { FilterField } from "@/components/layout";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { clinical } from "@/components/layout";

export type StatusFilter = "all" | "ativo" | "inativo" | "tratamento" | "alta";
export type SortMode = "nome_asc" | "nome_desc" | "recentes" | "atualizados";

const STATUS_CHIPS: { value: StatusFilter; label: string }[] = [
  { value: "ativo", label: "Ativos" },
  { value: "tratamento", label: "Em tratamento" },
  { value: "alta", label: "Altas" },
  { value: "all", label: "Todos" },
];

type PatientCrmFiltersProps = {
  filterStatus: StatusFilter;
  onFilterStatus: (v: StatusFilter) => void;
  filterProf: string;
  onFilterProf: (v: string) => void;
  profs: { id: string; nome: string }[];
  filterConvenio: string;
  onFilterConvenio: (v: string) => void;
  convenioOptions: string[];
  sort: SortMode;
  onSort: (v: SortMode) => void;
  className?: string;
};

/** Filtros discretos estilo CRM — chips de status + cards compactos. */
export function PatientCrmFilters({
  filterStatus,
  onFilterStatus,
  filterProf,
  onFilterProf,
  profs,
  filterConvenio,
  onFilterConvenio,
  convenioOptions,
  sort,
  onSort,
  className,
}: PatientCrmFiltersProps) {
  return (
    <div className={cn("space-y-2.5", className)}>
      <div className="flex flex-wrap gap-1.5">
        {STATUS_CHIPS.map((chip) => (
          <button
            key={chip.value}
            type="button"
            onClick={() => onFilterStatus(chip.value)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-semibold transition-all",
              filterStatus === chip.value
                ? "border-[var(--fos-primary)]/30 bg-[rgba(15,76,92,0.08)] text-[var(--fos-primary)] shadow-sm"
                : "border-[rgba(15,76,92,0.1)] bg-white/70 text-slate-600 hover:border-[rgba(15,76,92,0.18)] hover:bg-white",
            )}
          >
            {chip.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <FilterCard label="Profissional">
          <Select value={filterProf} onValueChange={onFilterProf}>
            <SelectTrigger className={cn("h-9 rounded-lg border-0 bg-transparent px-0 shadow-none", clinical.select)}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {profs.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterCard>

        <FilterCard label="Convênio / Plano">
          <Select value={filterConvenio} onValueChange={onFilterConvenio}>
            <SelectTrigger className={cn("h-9 rounded-lg border-0 bg-transparent px-0 shadow-none", clinical.select)}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="particular">Particular</SelectItem>
              {convenioOptions.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterCard>

        <FilterCard label="Ordenar por">
          <Select value={sort} onValueChange={(v) => onSort(v as SortMode)}>
            <SelectTrigger className={cn("h-9 rounded-lg border-0 bg-transparent px-0 shadow-none", clinical.select)}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="nome_asc">Nome A → Z</SelectItem>
              <SelectItem value="nome_desc">Nome Z → A</SelectItem>
              <SelectItem value="recentes">Mais recentes</SelectItem>
              <SelectItem value="atualizados">Última atualização</SelectItem>
            </SelectContent>
          </Select>
        </FilterCard>
      </div>
    </div>
  );
}

function FilterCard({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-[rgba(15,76,92,0.08)] bg-white/75 px-3 py-2 shadow-[0_1px_3px_rgba(15,76,92,0.04)]">
      <FilterField label={label} className="gap-1">
        {children}
      </FilterField>
    </div>
  );
}

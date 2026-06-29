import { useState } from "react";
import { Plus } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DashboardFilters } from "@/lib/finance";
import { FilterField, OutlineActionButton, PrimaryActionButton, clinical } from "@/components/layout";
import { PageToolbar } from "@/components/ui-system";
import { useFinanceExecutiveDashboard } from "./useFinanceExecutiveDashboard";
import { FINANCE_ROUTES } from "./finance-routes";
import { cn } from "@/lib/utils";

const SELECT_ALL = "all";

type FinanceFiltersBarProps = {
  clinicId: string | null;
  filters: DashboardFilters;
  onFiltersChange: (filters: DashboardFilters) => void;
};

export function FinanceFiltersBar({
  clinicId,
  filters,
  onFiltersChange,
}: FinanceFiltersBarProps) {
  const navigate = useNavigate();
  const { lookups } = useFinanceExecutiveDashboard(clinicId, filters);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const hasActiveFilters =
    filters.categoryId !== SELECT_ALL || filters.costCenterId !== SELECT_ALL;

  return (
    <PageToolbar
      showMobileFilters={showMobileFilters}
      onToggleMobileFilters={() => setShowMobileFilters((v) => !v)}
      hasActiveFilters={hasActiveFilters}
      filterColumns={4}
      actions={
        <div className="flex flex-wrap items-end gap-2 lg:col-span-1">
          <PrimaryActionButton
            type="button"
            className="h-9 px-3 text-xs"
            onClick={() => navigate({ to: FINANCE_ROUTES.receber })}
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            Recebimento
          </PrimaryActionButton>
          <OutlineActionButton
            type="button"
            className="h-9 px-3 text-xs"
            onClick={() => navigate({ to: FINANCE_ROUTES.pagar })}
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            Despesa
          </OutlineActionButton>
        </div>
      }
    >
      <FilterField label="Período de">
        <Input
          type="date"
          className={cn(clinical.input, "h-9 text-sm")}
          value={filters.from}
          onChange={(e) => onFiltersChange({ ...filters, from: e.target.value })}
        />
      </FilterField>
      <FilterField label="Período até">
        <Input
          type="date"
          className={cn(clinical.input, "h-9 text-sm")}
          value={filters.to}
          onChange={(e) => onFiltersChange({ ...filters, to: e.target.value })}
        />
      </FilterField>
      <FilterField label="Categoria">
        <Select value={filters.categoryId} onValueChange={(v) => onFiltersChange({ ...filters, categoryId: v })}>
          <SelectTrigger className={cn(clinical.select, "h-9 text-sm")}><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={SELECT_ALL}>Todas</SelectItem>
            {(lookups.data?.categories ?? []).map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterField>
      <FilterField label="Centro de custo">
        <Select value={filters.costCenterId} onValueChange={(v) => onFiltersChange({ ...filters, costCenterId: v })}>
          <SelectTrigger className={cn(clinical.select, "h-9 text-sm")}><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={SELECT_ALL}>Todos</SelectItem>
            {(lookups.data?.costCenters ?? []).map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterField>
    </PageToolbar>
  );
}

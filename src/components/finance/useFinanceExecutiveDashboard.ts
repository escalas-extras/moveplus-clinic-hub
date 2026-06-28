import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  assertFinanceClinicId,
  computeCurrentMonthSummary,
  computeDashboardKpis,
  dashboardFiltersKey,
  financeQueryKeys,
  topCostCenters,
  topExpenseCategories,
  topIncomeCategories,
  upcomingPayables,
  upcomingReceivables,
  type CashFlowEntryRow,
  type DashboardFilters,
} from "@/lib/finance";

export function useFinanceExecutiveDashboard(
  clinicId: string | null,
  filters: DashboardFilters,
) {
  const lookups = useQuery({
    queryKey: financeQueryKeys.dashboardLookups(clinicId),
    enabled: !!clinicId,
    queryFn: async () => {
      assertFinanceClinicId(clinicId);
      const [categories, costCenters] = await Promise.all([
        supabase.from("financial_categories").select("id, name, type").eq("clinic_id", clinicId).order("sort_order"),
        supabase.from("financial_cost_centers").select("id, name").eq("clinic_id", clinicId).eq("is_active", true).order("sort_order"),
      ]);
      if (categories.error) throw categories.error;
      if (costCenters.error) throw costCenters.error;
      return { categories: categories.data ?? [], costCenters: costCenters.data ?? [] };
    },
  });

  const entries = useQuery({
    queryKey: financeQueryKeys.dashboard(clinicId, dashboardFiltersKey(filters)),
    enabled: !!clinicId,
    queryFn: async () => {
      assertFinanceClinicId(clinicId);
      const { data, error } = await supabase
        .from("financial_entries")
        .select(`
          *,
          patients(nome_completo),
          professionals(nome),
          financial_categories(id, name, type),
          financial_cost_centers(id, name, code)
        `)
        .eq("clinic_id", clinicId)
        .in("entry_type", ["receivable", "payable"])
        .neq("status", "cancelado")
        .order("updated_at", { ascending: false })
        .limit(2000);
      if (error) throw error;
      return (data ?? []) as CashFlowEntryRow[];
    },
  });

  const rows = entries.data ?? [];

  const kpis = useMemo(() => computeDashboardKpis(rows, filters), [rows, filters]);
  const monthSummary = useMemo(() => computeCurrentMonthSummary(rows), [rows]);
  const incomeCats = useMemo(() => topIncomeCategories(rows, filters), [rows, filters]);
  const expenseCats = useMemo(() => topExpenseCategories(rows, filters), [rows, filters]);
  const costCentersRank = useMemo(() => topCostCenters(rows, filters), [rows, filters]);
  const nextReceivables = useMemo(() => upcomingReceivables(rows, filters), [rows, filters]);
  const nextPayables = useMemo(() => upcomingPayables(rows, filters), [rows, filters]);

  return {
    lookups,
    entries,
    kpis,
    monthSummary,
    incomeCats,
    expenseCats,
    costCentersRank,
    nextReceivables,
    nextPayables,
    hasData: rows.length > 0,
    isLoading: entries.isLoading || lookups.isLoading,
    error: entries.error ?? lookups.error,
    refetch: () => {
      void entries.refetch();
      void lookups.refetch();
    },
  };
}

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  assertFinanceClinicId,
  computeDelinquencySummary,
  computePayableSummary,
  computeProfessionalRevenueSummary,
  computeReceivableSummary,
  defaultProfessionalRevenueFilters,
  filterProfessionalRevenueRows,
  groupProfessionalRevenue,
  isDelinquentEntry,
  professionalRevenueFiltersKey,
  type DashboardFilters,
  type PayableRow,
  type PatientPackageRow,
  type ReceivableRow,
} from "@/lib/finance";
import { useFinanceExecutiveDashboard } from "./useFinanceExecutiveDashboard";

const OPS_SNAPSHOT_KEY = (clinicId: string | null) => ["finance", clinicId, "ops-snapshot"] as const;

const todayIso = () => new Date().toISOString().slice(0, 10);

function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function countUpcomingDue(rows: { data_vencimento?: string | null; status: string }[], withinDays = 7): number {
  const today = todayIso();
  const limit = addDaysIso(today, withinDays);
  return rows.filter((row) => {
    if (row.status !== "pendente") return false;
    const due = row.data_vencimento;
    return !!due && due >= today && due <= limit;
  }).length;
}

export function useFinanceOperationsSnapshot(
  clinicId: string | null,
  dashboardFilters: DashboardFilters,
) {
  const executive = useFinanceExecutiveDashboard(clinicId, dashboardFilters);

  const snapshot = useQuery({
    queryKey: OPS_SNAPSHOT_KEY(clinicId),
    enabled: !!clinicId,
    queryFn: async () => {
      assertFinanceClinicId(clinicId);

      const [pendingRes, packagesRes, linksRes, revenueRes] = await Promise.all([
        supabase
          .from("financial_entries")
          .select(`
            *,
            patients(nome_completo, cpf),
            professionals(nome),
            financial_categories(id, name, type),
            financial_cost_centers(id, name, code)
          `)
          .eq("clinic_id", clinicId)
          .eq("status", "pendente")
          .in("entry_type", ["receivable", "payable"])
          .order("data_vencimento", { ascending: true })
          .limit(2000),
        supabase
          .from("patient_package_contracts")
          .select(`
            *,
            clinical_package_templates(name, session_count, validity_days),
            patients(nome_completo)
          `)
          .eq("clinic_id", clinicId)
          .order("valid_until", { ascending: true })
          .limit(500),
        supabase
          .from("patient_health_insurances")
          .select("id, is_active, patient_id")
          .eq("clinic_id", clinicId)
          .eq("is_active", true)
          .limit(500),
        supabase
          .from("financial_entries")
          .select(`
            *,
            patients(nome_completo, cpf),
            professionals(nome),
            financial_categories(id, name, type),
            financial_cost_centers(id, name, code)
          `)
          .eq("clinic_id", clinicId)
          .eq("entry_type", "receivable")
          .neq("status", "cancelado")
          .order("updated_at", { ascending: false })
          .limit(5000),
      ]);

      if (pendingRes.error) throw pendingRes.error;
      if (packagesRes.error) throw packagesRes.error;
      if (linksRes.error) throw linksRes.error;
      if (revenueRes.error) throw revenueRes.error;

      return {
        pending: pendingRes.data ?? [],
        packages: packagesRes.data ?? [],
        healthLinks: linksRes.data ?? [],
        revenueRows: revenueRes.data ?? [],
      };
    },
  });

  const metrics = useMemo(() => {
    const pending = snapshot.data?.pending ?? [];
    const receivables = pending.filter((r) => r.entry_type === "receivable") as ReceivableRow[];
    const payables = pending.filter((r) => r.entry_type === "payable") as PayableRow[];
    const receivableSummary = computeReceivableSummary(receivables);
    const payableSummary = computePayableSummary(payables);

    const delinquentRows = receivables.filter((r) => isDelinquentEntry(r));
    const delinquencySummary = computeDelinquencySummary(delinquentRows);
    const delinquentPatients = new Set(
      delinquentRows.map((r) => r.patient_id).filter(Boolean),
    ).size;

    const packages = (snapshot.data?.packages ?? []) as PatientPackageRow[];
    const activePackages = packages.filter((p) => p.status === "ativo");
    const today = todayIso();
    const expiringLimit = addDaysIso(today, 14);
    const expiringSoon = activePackages.filter(
      (p) => p.valid_until >= today && p.valid_until <= expiringLimit,
    ).length;
    const sessionsRemaining = activePackages.reduce(
      (sum, p) => sum + Number(p.sessions_remaining ?? 0),
      0,
    );

    const insuranceReceivables = receivables.filter((r) => r.health_insurance_provider_id);
    const insurancePendingValue = insuranceReceivables.reduce(
      (sum, r) => sum + Number(r.valor ?? 0),
      0,
    );

    const profFilters = defaultProfessionalRevenueFilters();
    const revenueRows = filterProfessionalRevenueRows(
      (snapshot.data?.revenueRows ?? []) as Parameters<typeof filterProfessionalRevenueRows>[0],
      profFilters,
    );
    const groups = groupProfessionalRevenue(revenueRows);
    const profSummary = computeProfessionalRevenueSummary(revenueRows, groups);

    const kpis = executive.kpis;

    return {
      receber: {
        valorAberto: receivableSummary.emAberto,
        quantidade: receivables.length,
        proximosVencimentos: countUpcomingDue(receivables),
      },
      pagar: {
        valorAberto: payableSummary.emAberto,
        quantidade: payables.length,
        proximosVencimentos: countUpcomingDue(payables),
      },
      fluxo: {
        saldo: kpis.saldoRealizado,
        entradas: kpis.receitaRealizada,
        saidas: kpis.despesaRealizada,
        saldoPrevisto: kpis.saldoPrevisto,
      },
      pacotes: {
        ativos: activePackages.length,
        vencendoEmBreve: expiringSoon,
        sessoesRestantes: sessionsRemaining,
      },
      convenios: {
        valorPrevisto: insurancePendingValue,
        guias: snapshot.data?.healthLinks?.length ?? 0,
        pendencias: insuranceReceivables.length,
      },
      inadimplencia: {
        valorVencido: delinquencySummary.totalVencido,
        pacientes: delinquentPatients,
        criticoAcima30: delinquencySummary.vencidosAcima30,
      },
      receitaProfissional: {
        maiorFaturamento: profSummary.maiorReceitaNome,
        maiorFaturamentoValor: profSummary.maiorReceitaValor,
        receitaTotal: profSummary.receitaRealizadaTotal + profSummary.receitaPrevistaTotal,
        ticketMedio: profSummary.ticketMedioGlobal,
      },
    };
  }, [snapshot.data, executive.kpis]);

  return {
    metrics,
    isLoading: executive.isLoading || snapshot.isLoading,
    error: executive.error ?? snapshot.error,
    refetch: () => {
      executive.refetch();
      void snapshot.refetch();
    },
  };
}

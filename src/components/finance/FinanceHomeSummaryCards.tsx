import {
  AlertTriangle,
  Banknote,
  FileText,
  QrCode,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { brl } from "@/lib/format";
import { isReceivableOverdue } from "@/lib/finance";
import { PageSection } from "@/components/layout/PageSection";
import { FinanceKpiCard, FinanceKpiGrid } from "./FinanceKpiCard";
import { FinancePanelGate } from "./FinancePanelGate";
import { FINANCE_ROUTES } from "./finance-routes";

type FinanceHomeSummaryCardsProps = {
  clinicId: string | null;
  clinicLoading: boolean;
};

/** KPIs compactos por forma de recebimento — mês atual. */
export function FinanceHomeSummaryCards({ clinicId, clinicLoading }: FinanceHomeSummaryCardsProps) {
  const monthStart = new Date();
  monthStart.setDate(1);
  const monthIso = monthStart.toISOString().slice(0, 10);

  const paymentBreakdown = useQuery({
    queryKey: ["finance", clinicId, "payment-breakdown", monthIso],
    enabled: !!clinicId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_entries")
        .select("valor, status, forma_pagamento, data_vencimento, data")
        .eq("clinic_id", clinicId!)
        .eq("entry_type", "receivable")
        .neq("status", "cancelado")
        .gte("data", monthIso);
      if (error) throw error;

      let pixRecebido = 0;
      let dinheiroRecebido = 0;
      let boletosAberto = 0;
      let vencidos = 0;

      for (const row of data ?? []) {
        const valor = Number(row.valor ?? 0);
        const method = row.forma_pagamento;
        if (row.status === "pago") {
          if (method === "pix") pixRecebido += valor;
          if (method === "dinheiro") dinheiroRecebido += valor;
        }
        if (row.status === "pendente") {
          if (method === "boleto") boletosAberto += valor;
          if (isReceivableOverdue(row)) vencidos += valor;
        }
      }

      return { pixRecebido, dinheiroRecebido, boletosAberto, vencidos };
    },
  });

  return (
    <FinancePanelGate
      clinicId={clinicId}
      clinicLoading={clinicLoading}
      loading={paymentBreakdown.isLoading}
      error={paymentBreakdown.error}
      onRetry={() => void paymentBreakdown.refetch()}
      loadingLabel="Carregando formas de recebimento…"
      errorFallback="Não foi possível carregar o resumo por forma."
    >
      <PageSection
        title="Formas de recebimento"
        description="PIX, dinheiro, boletos e vencidos no mês atual."
        contentClassName="p-0"
      >
        <FinanceKpiGrid columns={4}>
          <FinanceKpiCard
            icon={QrCode}
            label="PIX recebido"
            value={brl(paymentBreakdown.data?.pixRecebido ?? 0)}
            subtitle="Mês atual"
            hideDelta
            accent="#0ea5e9"
            to={FINANCE_ROUTES.receber}
          />
          <FinanceKpiCard
            icon={Banknote}
            label="Dinheiro recebido"
            value={brl(paymentBreakdown.data?.dinheiroRecebido ?? 0)}
            subtitle="Mês atual"
            hideDelta
            accent="#10b981"
            to={FINANCE_ROUTES.receber}
          />
          <FinanceKpiCard
            icon={FileText}
            label="Boletos em aberto"
            value={brl(paymentBreakdown.data?.boletosAberto ?? 0)}
            subtitle="Mês atual"
            hideDelta
            accent="#6366f1"
            to={FINANCE_ROUTES.receber}
          />
          <FinanceKpiCard
            icon={AlertTriangle}
            label="Vencidos"
            value={brl(paymentBreakdown.data?.vencidos ?? 0)}
            subtitle="Mês atual"
            hideDelta
            accent="#ef4444"
            tone={(paymentBreakdown.data?.vencidos ?? 0) > 0 ? "warning" : "default"}
            to={FINANCE_ROUTES.inadimplencia}
          />
        </FinanceKpiGrid>
      </PageSection>
    </FinancePanelGate>
  );
}

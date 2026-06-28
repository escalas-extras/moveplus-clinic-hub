import type { ReactNode } from "react";
import { Building2, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { financeErrorDetails } from "@/lib/finance/finance-error-helpers";

type FinancePanelGateProps = {
  clinicId: string | null;
  clinicLoading: boolean;
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  loadingLabel?: string;
  errorFallback?: string;
  children: ReactNode;
};

export function FinancePanelLoading({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center py-20 text-muted-foreground">
      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
      {label}
    </div>
  );
}

export function FinanceNoClinicCard() {
  return (
    <Card className="p-8 text-center">
      <Building2 className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
      <p className="text-sm font-medium">Nenhuma clínica ativa</p>
      <p className="mt-2 text-sm text-muted-foreground">
        Selecione ou vincule uma clínica para acessar o financeiro.
      </p>
    </Card>
  );
}

export function FinanceErrorCard({
  error,
  onRetry,
  fallback,
}: {
  error: unknown;
  onRetry?: () => void;
  fallback?: string;
}) {
  const { message, hint } = financeErrorDetails(error, fallback);

  return (
    <Card className="p-8 text-center">
      <p className="text-sm text-destructive">{message}</p>
      {hint && <p className="mt-2 text-sm text-muted-foreground">{hint}</p>}
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
          Tentar novamente
        </Button>
      )}
    </Card>
  );
}

export function FinancePanelGate({
  clinicId,
  clinicLoading,
  loading = false,
  error,
  onRetry,
  loadingLabel = "Carregando…",
  errorFallback,
  children,
}: FinancePanelGateProps) {
  if (clinicLoading) {
    return <FinancePanelLoading label="Carregando clínica ativa…" />;
  }

  if (!clinicId) {
    return <FinanceNoClinicCard />;
  }

  if (loading) {
    return <FinancePanelLoading label={loadingLabel} />;
  }

  if (error) {
    return <FinanceErrorCard error={error} onRetry={onRetry} fallback={errorFallback} />;
  }

  return <>{children}</>;
}

/**
 * Hub legado G1.1 — substituído por FinanceDashboardPanel (G1.7).
 * Mantido exportado para referência; não usado na rota /app/financeiro desde G1.7.
 */
import { Link } from "@tanstack/react-router";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  BarChart3,
  FolderTree,
  Landmark,
  LayoutDashboard,
  Receipt,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InfoCard } from "@/components/layout/InfoCard";
import { KpiGrid } from "@/components/layout/KpiGrid";
import { KpiCard } from "@/components/layout/KpiCard";
import { PageSection } from "@/components/layout/PageSection";
import {
  FINANCE_MODULE_REGISTRY,
  getActiveFinanceModules,
  type FinanceModuleDefinition,
  type FinanceModuleId,
} from "@/lib/finance";
import { brl } from "@/lib/format";

const MODULE_ICONS: Record<FinanceModuleId, LucideIcon> = {
  dashboard: LayoutDashboard,
  categories: FolderTree,
  cost_centers: Landmark,
  receivables: ArrowDownCircle,
  payables: ArrowUpCircle,
  cash_flow: BarChart3,
  legacy_entries: Receipt,
};

type FinanceModuleHubProps = {
  receivedMonth?: number;
  pendingTotal?: number;
  onOpenLegacy?: () => void;
  onOpenCategories?: () => void;
  onOpenCostCenters?: () => void;
  onOpenReceivables?: () => void;
  onOpenPayables?: () => void;
  onOpenCashFlow?: () => void;
};

function statusBadge(status: FinanceModuleDefinition["status"]) {
  if (status === "active") return <Badge>Ativo</Badge>;
  if (status === "legacy") return <Badge variant="secondary">Operacional v1</Badge>;
  return <Badge variant="outline">Em breve</Badge>;
}

export function FinanceModuleHub({
  receivedMonth = 0,
  pendingTotal = 0,
  onOpenLegacy,
  onOpenCategories,
  onOpenCostCenters,
  onOpenReceivables,
  onOpenPayables,
  onOpenCashFlow,
}: FinanceModuleHubProps) {
  const active = getActiveFinanceModules();
  const planned = FINANCE_MODULE_REGISTRY.filter((m) => m.status === "planned");
  const legacy = FINANCE_MODULE_REGISTRY.find((m) => m.id === "legacy_entries");

  function moduleAction(mod: FinanceModuleDefinition) {
    if (mod.id === "categories" && onOpenCategories) {
      return (
        <Button type="button" variant="default" size="sm" onClick={onOpenCategories}>
          Gerenciar categorias
        </Button>
      );
    }
    if (mod.id === "cost_centers" && onOpenCostCenters) {
      return (
        <Button type="button" variant="default" size="sm" onClick={onOpenCostCenters}>
          Gerenciar centros de custo
        </Button>
      );
    }
    if (mod.id === "receivables" && onOpenReceivables) {
      return (
        <Button type="button" variant="default" size="sm" onClick={onOpenReceivables}>
          Abrir contas a receber
        </Button>
      );
    }
    if (mod.id === "payables" && onOpenPayables) {
      return (
        <Button type="button" variant="default" size="sm" onClick={onOpenPayables}>
          Abrir contas a pagar
        </Button>
      );
    }
    if (mod.id === "cash_flow" && onOpenCashFlow) {
      return (
        <Button type="button" variant="default" size="sm" onClick={onOpenCashFlow}>
          Abrir fluxo de caixa
        </Button>
      );
    }
    return statusBadge(mod.status);
  }

  return (
    <div className="space-y-8">
      <KpiGrid columns={3}>
        <KpiCard label="Recebido (mês)" value={brl(receivedMonth)} icon={Wallet} />
        <KpiCard label="A receber" value={brl(pendingTotal)} icon={ArrowDownCircle} tone="warning" />
        <KpiCard
          label="Módulos G1"
          value={String(planned.length)}
          subtitle="Roadmap Financeiro Base"
          icon={LayoutDashboard}
        />
      </KpiGrid>

      {active.length > 0 && (
        <PageSection
          title="Módulos ativos"
          description="Funcionalidades já disponíveis no Financeiro Base."
        >
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {active.map((mod) => {
              const Icon = MODULE_ICONS[mod.id];
              return (
                <InfoCard
                  key={mod.id}
                  icon={Icon}
                  title={mod.title}
                  description={mod.description}
                  hoverable
                  action={statusBadge(mod.status)}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    {moduleAction(mod)}
                    <p className="text-xs text-muted-foreground w-full">
                      Sprint: <strong>{mod.sprint ?? "—"}</strong>
                    </p>
                  </div>
                </InfoCard>
              );
            })}
          </div>
        </PageSection>
      )}

      <PageSection
        title="Módulos do Financeiro Base"
        description="Fundação arquitetural Sprint G1.1 — funcionalidades avançadas serão entregues incrementalmente."
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {planned.map((mod) => {
            const Icon = MODULE_ICONS[mod.id];
            return (
              <InfoCard
                key={mod.id}
                icon={Icon}
                title={mod.title}
                description={mod.description}
                hoverable
                action={statusBadge(mod.status)}
              >
                <p className="text-xs text-muted-foreground">
                  Sprint prevista: <strong>{mod.sprint ?? "—"}</strong>
                </p>
              </InfoCard>
            );
          })}
        </div>
      </PageSection>

      {legacy && (
        <PageSection
          title="Operação atual"
          description="Lançamentos v1 permanecem disponíveis enquanto os novos módulos são implementados."
        >
          <InfoCard
            icon={Receipt}
            title={legacy.title}
            description={legacy.description}
            variant="highlight"
            action={statusBadge(legacy.status)}
          >
            <div className="flex flex-wrap gap-2">
              {onOpenLegacy && (
                <Button type="button" variant="default" size="sm" onClick={onOpenLegacy}>
                  Abrir lançamentos v1
                </Button>
              )}
              <Button type="button" variant="outline" size="sm" asChild>
                <Link to="/app/recibos">Ir para Recibos</Link>
              </Button>
            </div>
          </InfoCard>
        </PageSection>
      )}
    </div>
  );
}

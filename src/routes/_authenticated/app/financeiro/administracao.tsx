import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { FolderTree, Landmark, ScrollText, Settings2 } from "lucide-react";
import { useActiveClinic } from "@/lib/active-clinic";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FinanceModuleShell,
  FinanceCategoriesPanel,
  FinanceCostCentersPanel,
  FinanceLegacyLancamentosPanel,
} from "@/components/finance";

export const Route = createFileRoute("/_authenticated/app/financeiro/administracao")({
  component: FinanceAdministracaoPage,
});

function FinanceAdministracaoPage() {
  const { clinicId, supportMode, loading: clinicLoading } = useActiveClinic();
  const [tab, setTab] = useState("categorias");

  return (
    <FinanceModuleShell
      title="Administração Financeira"
      description="Categorias, centros de custo e lançamentos legados."
      breadcrumb="Administração"
      icon={Settings2}
    >
      <Tabs value={tab} onValueChange={setTab} className="min-w-0 w-full max-w-full">
        <TabsList className="mb-4 h-auto flex-wrap justify-start gap-1 bg-muted/40 p-1">
          <TabsTrigger value="categorias" className="gap-1.5 text-xs">
            <FolderTree className="h-3.5 w-3.5" />
            Categorias
          </TabsTrigger>
          <TabsTrigger value="centros-custo" className="gap-1.5 text-xs">
            <Landmark className="h-3.5 w-3.5" />
            Centros de Custo
          </TabsTrigger>
          <TabsTrigger value="lancamentos" className="gap-1.5 text-xs">
            <ScrollText className="h-3.5 w-3.5" />
            Lançamentos v1
          </TabsTrigger>
        </TabsList>

        <TabsContent value="categorias" className="mt-0 min-w-0">
          <FinanceCategoriesPanel
            clinicId={clinicId}
            clinicLoading={clinicLoading}
            supportMode={supportMode}
          />
        </TabsContent>
        <TabsContent value="centros-custo" className="mt-0 min-w-0">
          <FinanceCostCentersPanel
            clinicId={clinicId}
            clinicLoading={clinicLoading}
            supportMode={supportMode}
          />
        </TabsContent>
        <TabsContent value="lancamentos" className="mt-0 min-w-0">
          <FinanceLegacyLancamentosPanel
            clinicId={clinicId}
            clinicLoading={clinicLoading}
            supportMode={supportMode}
          />
        </TabsContent>
      </Tabs>
    </FinanceModuleShell>
  );
}

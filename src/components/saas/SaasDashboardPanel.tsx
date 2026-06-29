import { useMemo } from "react";
import {
  Activity,
  AlertTriangle,
  Building2,
  CalendarPlus,
  Download,
  FlaskConical,
  HeartPulse,
  History,
  Power,
  Receipt,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { ModuleStack } from "@/components/ui-system";
import {
  ClinicalSkeleton,
  EmptyState,
  InfoCard,
  KpiCard,
  KpiGrid,
  OutlineActionButton,
  PageHeader,
  PageSection,
  PrimaryActionButton,
} from "@/components/layout";
import {
  SAAS_PLATFORM,
  buildExecutiveAttentionItems,
  buildExecutiveAuditGroups,
  formatSaasMoney,
  getExecutiveSoonMonitors,
  totalPlansSold,
  type SaasDashboardData,
  type SaasNavTarget,
} from "@/lib/saas";
import { SaasAttentionPanel, SaasAuditPanel, SaasMetricRow } from "./SaasExecutiveSections";

type SaasDashboardPanelProps = {
  data: SaasDashboardData;
  onNavigate: (target: SaasNavTarget) => void;
  onOpenAudit?: () => void;
  onNewClinic?: () => void;
};

export function SaasDashboardPanel({ data, onNavigate, onOpenAudit, onNewClinic }: SaasDashboardPanelProps) {
  const attentionItems = useMemo(() => buildExecutiveAttentionItems(data), [data]);
  const soonMonitors = useMemo(() => getExecutiveSoonMonitors(), []);
  const auditGroups = useMemo(() => buildExecutiveAuditGroups(data.recent_access), [data.recent_access]);
  const plansSold = totalPlansSold(data);

  const notifySoon = (label: string) => {
    toast.info(`${label} — em breve.`);
  };

  return (
    <ModuleStack className="saas-platform space-y-4 sm:space-y-5">
      <PageHeader
        eyebrow={SAAS_PLATFORM.eyebrow}
        icon={Building2}
        title="Painel Executivo SaaS"
        description="Gestão da plataforma FisioOS."
        actions={
          <>
            {onNewClinic && (
              <PrimaryActionButton className="h-9 px-3 text-xs" onClick={onNewClinic}>
                <Building2 className="mr-1.5 h-3.5 w-3.5" />
                Nova Clínica
              </PrimaryActionButton>
            )}
            <OutlineActionButton className="h-9 px-3 text-xs" onClick={() => notifySoon("Nova Assinatura")}>
              <UserPlus className="mr-1.5 h-3.5 w-3.5" />
              Nova Assinatura
            </OutlineActionButton>
            <OutlineActionButton className="h-9 px-3 text-xs" onClick={() => notifySoon("Exportar Dados")}>
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Exportar Dados
            </OutlineActionButton>
          </>
        }
      />

      <div className="space-y-3">
        <KpiGrid columns={4} className="gap-2.5 lg:gap-3">
          <KpiCard
            icon={Activity}
            label="Clínicas Ativas"
            value={data.clinics.active}
            subtitle={`${data.clinics.total} produção`}
            hideDelta
            variant="premium"
            accent={SAAS_PLATFORM.primaryColor}
          />
          <KpiCard
            icon={Receipt}
            label="MRR"
            value={formatSaasMoney(data.mrr)}
            subtitle={`Ticket ${formatSaasMoney(data.avg_ticket)}`}
            hideDelta
            variant="premium"
            accent="#059669"
          />
          <KpiCard
            icon={TrendingUp}
            label="ARR"
            value={formatSaasMoney(data.arr)}
            subtitle="Projeção anual"
            hideDelta
            variant="premium"
            accent="#0d9488"
          />
          <KpiCard
            icon={HeartPulse}
            label="Health Médio"
            value="Em breve"
            subtitle="Disponível na aba Comercial"
            hideDelta
            variant="premium"
            accent="#6366f1"
            isPlaceholder
          />
        </KpiGrid>

        <section
          aria-label="Indicadores operacionais"
          className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5 lg:gap-3"
        >
          <KpiCard
            icon={FlaskConical}
            label="Trials"
            value={data.trial_count}
            subtitle={`${data.trials_expiring} vencendo`}
            hideDelta
            variant="premium"
            accent={SAAS_PLATFORM.secondaryColor}
            tone={data.trials_expiring > 0 ? "warning" : "default"}
          />
          <KpiCard
            icon={Power}
            label="Suspensas"
            value={data.clinics.suspended}
            subtitle={`${data.clinics.inactive} inativa(s)`}
            hideDelta
            variant="premium"
            accent="#e11d48"
            tone={data.clinics.suspended > 0 ? "warning" : "default"}
          />
          <KpiCard
            icon={CalendarPlus}
            label="Novas este mês"
            value={data.growth.at(-1)?.count ?? data.clinics.new_30d}
            subtitle="Cadastros produção"
            hideDelta
            variant="premium"
            accent="#3b82f6"
          />
          <KpiCard
            icon={Users}
            label="Usuários"
            value={data.users.total}
            subtitle="Membros ativos"
            hideDelta
            variant="premium"
            accent="#8b5cf6"
          />
          <KpiCard
            icon={Building2}
            label="Pacientes"
            value={data.patients.total}
            subtitle="Base consolidada"
            hideDelta
            variant="premium"
            accent="#0891b2"
          />
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <PageSection
          icon={AlertTriangle}
          title="Necessitam Atenção"
          description="Alertas operacionais e comerciais derivados do painel."
          contentClassName="pt-0"
        >
          <SaasAttentionPanel items={attentionItems} soonMonitors={soonMonitors} />
        </PageSection>

        <PageSection
          icon={Receipt}
          title="Comercial"
          description="Receita, planos e movimentações de assinatura."
          contentClassName="pt-0"
        >
          <div className="rounded-xl border bg-card/80 p-3 sm:p-4">
            <SaasMetricRow label="Receita mensal" value={formatSaasMoney(data.mrr)} hint="MRR estimado" />
            <SaasMetricRow label="Receita anual" value={formatSaasMoney(data.arr)} hint="ARR projetado" />
            <SaasMetricRow
              label="Planos vendidos"
              value={String(plansSold)}
              hint={`${data.paid_clients} pagante(s) · ${data.active_plan_contracts} contrato(s)`}
            />
            <SaasMetricRow label="Upgrade recente" soon />
            <SaasMetricRow label="Downgrade recente" soon />
            <SaasMetricRow label="Cancelamentos" value={String(data.canceled_count)} hint="Contratos cancelados" />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <OutlineActionButton className="h-8 px-2.5 text-xs" onClick={() => onNavigate("commercial")}>
              Ver comercial
            </OutlineActionButton>
            <OutlineActionButton className="h-8 px-2.5 text-xs" onClick={() => notifySoon("Cancelar assinatura")}>
              Cancelar
            </OutlineActionButton>
          </div>
        </PageSection>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <PageSection
          icon={Activity}
          title="Operacional"
          description="Uso da plataforma e sinais de adoção."
          contentClassName="pt-0"
        >
          <div className="rounded-xl border bg-card/80 p-3 sm:p-4">
            <SaasMetricRow
              label="Documentos emitidos"
              value={String(data.documents.total)}
              hint={`${data.documents.this_month} neste mês`}
            />
            <SaasMetricRow label="Uploads" soon hint="Arquivos e anexos" />
            <SaasMetricRow label="Storage" soon hint="Consumo por clínica" />
            <SaasMetricRow label="Logins" soon hint="Sessões autenticadas" />
            <SaasMetricRow
              label="Atividade clínica"
              value={String(data.documents.this_month)}
              hint="Documentos no mês corrente"
            />
          </div>
        </PageSection>

        <PageSection
          icon={History}
          title="Auditoria"
          description="Provisionamentos, planos, bloqueios e reativações."
          actions={
            <OutlineActionButton
              className="h-8 px-2.5 text-xs"
              onClick={() => (onOpenAudit ? onOpenAudit() : onNavigate("audit"))}
            >
              Ver auditoria
            </OutlineActionButton>
          }
          contentClassName="pt-0"
        >
          <SaasAuditPanel groups={auditGroups} />
        </PageSection>
      </div>

      <InfoCard
        icon={Building2}
        title="Últimas clínicas cadastradas"
        description="Cadastros recentes em produção."
        padded={false}
        className="overflow-hidden"
      >
        {data.recent_clinics.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="Nenhuma clínica recente"
            description="Novos provisionamentos aparecerão aqui."
            className="py-10"
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.recent_clinics.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">{c.nome}</p>
                  <p className="truncate text-xs text-slate-500">/{c.slug ?? "—"}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                  <span>{c.plan ?? "—"}</span>
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-800">{c.status}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </InfoCard>
    </ModuleStack>
  );
}

export function SaasDashboardSkeleton() {
  return <ClinicalSkeleton variant="dashboard" kpiCount={9} />;
}

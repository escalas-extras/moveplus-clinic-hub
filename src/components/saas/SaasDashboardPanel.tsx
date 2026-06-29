import { useMemo } from "react";
import {
  Activity,
  AlertTriangle,
  Building2,
  Clock,
  DollarSign,
  FlaskConical,
  History,
  Power,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import {
  PageHero,
  ModuleStack,
  OperationalCard,
  OperationalCardsGrid,
  QuickAction,
  ActionButton,
} from "@/components/ui-system";
import { AttentionList } from "@/components/dashboard/AttentionList";
import { ClinicalSkeleton, InfoCard, StatusBadge } from "@/components/layout";
import {
  SAAS_NAV_ITEMS,
  SAAS_PLATFORM,
  SAAS_TRIAL_EXPIRY_DAYS,
  auditToAttentionItems,
  formatSaasMoney,
  type SaasDashboardData,
  type SaasNavTarget,
} from "@/lib/saas";

type SaasDashboardPanelProps = {
  data: SaasDashboardData;
  onNavigate: (target: SaasNavTarget) => void;
  onOpenAudit?: () => void;
  onNewClinic?: () => void;
};

export function SaasDashboardPanel({ data, onNavigate, onOpenAudit, onNewClinic }: SaasDashboardPanelProps) {
  const dateLabel = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const attentionItems = useMemo(() => {
    const auditItems = auditToAttentionItems(data.recent_access).map((item) => ({
      ...item,
      icon: History,
      to: "/app/admin-saas",
    }));
    if (data.trials_expiring > 0) {
      auditItems.unshift({
        id: "trials-expiring",
        icon: AlertTriangle,
        title: `${data.trials_expiring} trial(s) vencendo em ${SAAS_TRIAL_EXPIRY_DAYS} dias`,
        subtitle: "Revisar conversão ou extensão",
        meta: "Atenção",
        tone: "warning" as const,
        to: "/app/admin-saas",
      });
    }
    return auditItems.slice(0, 8);
  }, [data.recent_access, data.trials_expiring]);

  const navQuickItems = SAAS_NAV_ITEMS.map((item) => ({
    label: item.label,
    icon: item.icon,
    to: "/app/admin-saas",
  }));

  return (
    <ModuleStack className="saas-platform space-y-3 sm:space-y-4">
      <PageHero
        className="saas-platform-hero"
        title="Painel SaaS"
        clinicName={SAAS_PLATFORM.eyebrow}
        dateLabel={dateLabel}
        primaryColor={SAAS_PLATFORM.primaryColor}
        secondaryColor={SAAS_PLATFORM.secondaryColor}
        chips={[
          { label: "clínicas", value: data.clinics.total_all },
          { label: "pagantes", value: data.paid_clients },
          { label: "MRR", value: formatSaasMoney(data.mrr) },
        ]}
        actions={
          onNewClinic ? (
            <ActionButton
              className="h-9 px-3.5 text-sm"
              style={{ background: SAAS_PLATFORM.primaryColor }}
              onClick={onNewClinic}
            >
              <Building2 className="h-4 w-4" />
              Nova clínica
            </ActionButton>
          ) : undefined
        }
      />

      <OperationalCardsGrid className="xl:grid-cols-4">
        <OperationalCard
          compact
          title="Total de clínicas"
          icon={Building2}
          value={data.clinics.total_all}
          context={`${data.clinics.test} sandbox · ${data.clinics.total} produção`}
          accent={SAAS_PLATFORM.primaryColor}
          onClick={() => onNavigate("clinics")}
        />
        <OperationalCard
          compact
          title="Clínicas ativas"
          icon={Activity}
          value={data.clinics.active}
          context="Produção com status ativo"
          accent="#059669"
          onClick={() => onNavigate("clinics")}
        />
        <OperationalCard
          compact
          title="Clínicas em trial"
          icon={FlaskConical}
          value={data.trial_count}
          context="Contratos em período de teste"
          accent={SAAS_PLATFORM.secondaryColor}
          onClick={() => onNavigate("trials")}
        />
        <OperationalCard
          compact
          title="Clínicas suspensas"
          icon={Power}
          value={data.clinics.suspended}
          context={`${data.clinics.inactive} inativa(s) adicional(is)`}
          accent="#e11d48"
          alert={data.clinics.suspended > 0}
          onClick={() => onNavigate("clinics")}
        />
        <OperationalCard
          compact
          title="Clientes pagantes"
          icon={Users}
          value={data.paid_clients}
          context="Assinaturas active (produção)"
          accent="#0d9488"
          onClick={() => onNavigate("plans")}
        />
        <OperationalCard
          compact
          title="Receita mensal estimada"
          icon={DollarSign}
          value={formatSaasMoney(data.mrr)}
          context={`Ticket médio ${formatSaasMoney(data.avg_ticket)}`}
          accent="#059669"
          onClick={() => onNavigate("plans")}
        />
        <OperationalCard
          compact
          title="Trials vencendo"
          icon={Clock}
          value={data.trials_expiring}
          context={`Próximos ${SAAS_TRIAL_EXPIRY_DAYS} dias`}
          accent="#d97706"
          alert={data.trials_expiring > 0}
          onClick={() => onNavigate("trials")}
        />
        <OperationalCard
          compact
          title="Acessos recentes"
          icon={History}
          value={data.recent_access.length}
          context="Últimas ações no audit log"
          accent={SAAS_PLATFORM.accent}
          onClick={() => (onOpenAudit ? onOpenAudit() : onNavigate("audit"))}
        />
      </OperationalCardsGrid>

      <section aria-label="Módulos SaaS" className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        {SAAS_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                if (item.placeholder) {
                  toast.info(`${item.label} — módulo previsto para próxima sprint.`);
                  return;
                }
                onNavigate(item.id);
              }}
              className="saas-nav-card group flex flex-col rounded-2xl border border-indigo-100/80 bg-white/90 p-3.5 text-left shadow-[var(--fos-card-shadow)] transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-[0_8px_24px_-12px_rgba(79,70,229,0.25)]"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                {item.placeholder ? (
                  <StatusBadge variant="neutral" className="text-[10px]">
                    Em breve
                  </StatusBadge>
                ) : null}
              </div>
              <p className="mt-2 text-sm font-semibold text-slate-900 group-hover:text-indigo-800">
                {item.label}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">{item.description}</p>
            </button>
          );
        })}
      </section>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <AttentionList
          items={attentionItems}
          emptyTitle="Operação estável"
          emptyDescription="Nenhum trial crítico nem evento recente no audit log."
          className="saas-attention-list"
        />
        <QuickAction
          className="saas-quick-nav"
          items={navQuickItems.map((item, idx) => ({
            ...item,
            to: item.to,
            label: SAAS_NAV_ITEMS[idx]?.label ?? item.label,
          }))}
        />
      </div>

      <InfoCard
        icon={Building2}
        title="Últimas clínicas cadastradas"
        description="Cadastros mais recentes na plataforma."
        padded={false}
        className="overflow-hidden"
      >
        {data.recent_clinics.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-muted-foreground">Nenhuma clínica cadastrada.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.recent_clinics.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">{c.nome}</p>
                  <p className="truncate text-xs text-slate-500">/{c.slug ?? "—"}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <StatusBadge variant="neutral">{c.plan ?? "—"}</StatusBadge>
                  <StatusBadge variant={c.status === "active" ? "success" : "warning"}>
                    {c.status}
                  </StatusBadge>
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
  return <ClinicalSkeleton variant="dashboard" kpiCount={8} />;
}

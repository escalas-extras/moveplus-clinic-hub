import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Ban,
  CalendarClock,
  CreditCard,
  FileText,
  FlaskConical,
  History,
  Layers,
  Package,
  PlugZap,
  Receipt,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  TicketPercent,
  Wallet,
} from "lucide-react";
import { getSaasCommercialCenter } from "@/lib/api/saas-admin.functions";
import {
  BILLING_ENTITY_BLUEPRINT,
  BILLING_FINANCIAL_MODEL,
  BILLING_GATEWAY_READINESS,
  buildBillingCenterProjection,
  formatSaasMoney,
  SAAS_PLATFORM,
  type BillingCenterProjection,
  type SaasCommercialCenterData,
} from "@/lib/saas";
import {
  ClinicalSkeleton,
  EmptyState,
  KpiCard,
  KpiGrid,
  PageHeader,
  PageSection,
  StatusBadge,
} from "@/components/layout";
import { ModuleStack } from "@/components/ui-system";
import { cn } from "@/lib/utils";

const MODEL_ICON = {
  monthly_fee: Receipt,
  discount: TicketPercent,
  coupon: TicketPercent,
  upgrade: ArrowUpRight,
  downgrade: ArrowDownRight,
  trial: FlaskConical,
  suspension: ShieldAlert,
  cancellation: Ban,
} as const;

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("pt-BR");
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    active: "Ativa",
    trial: "Trial",
    suspended: "Suspensa",
    canceled: "Cancelada",
    none: "Sem plano",
    open: "Aberta",
    overdue: "Vencida",
    paid: "Paga",
    draft: "Rascunho",
    void: "Cancelada",
    uncollectible: "Incobrável",
  };
  return labels[status] ?? status;
}

function statusVariant(status: string): "success" | "warning" | "danger" | "info" | "neutral" {
  if (["active", "paid"].includes(status)) return "success";
  if (["trial", "open", "draft"].includes(status)) return "info";
  if (["overdue", "suspended", "uncollectible"].includes(status)) return "warning";
  if (["canceled", "void"].includes(status)) return "danger";
  return "neutral";
}

export function SaasBillingCenter() {
  const fetchCommercial = useServerFn(getSaasCommercialCenter);
  const [clinicFilter, setClinicFilter] = useState<string>("all");
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["saas-commercial-center", "billing"],
    queryFn: () => fetchCommercial(),
  });

  const projection = useMemo(
    () => (data ? buildBillingCenterProjection(data as SaasCommercialCenterData) : null),
    [data],
  );

  const clinics = useMemo(() => {
    const rows = projection?.subscriptions ?? [];
    return rows
      .map((row) => ({ id: row.clinic_id, name: row.clinic_name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [projection]);

  const filteredTimeline = useMemo(() => {
    if (!projection) return [];
    if (clinicFilter === "all") return projection.transactions;
    return projection.transactions.filter((item) => item.clinic_id === clinicFilter);
  }, [clinicFilter, projection]);

  if (isLoading || !projection) return <ClinicalSkeleton variant="dashboard" kpiCount={7} />;

  if (isError) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Não foi possível carregar o Billing SaaS"
        description={(error as Error)?.message ?? "Tente novamente em instantes."}
        action={{ label: "Tentar novamente", onClick: () => void refetch() }}
      />
    );
  }

  return (
    <BillingContent
      projection={projection}
      clinics={clinics}
      clinicFilter={clinicFilter}
      onClinicFilter={setClinicFilter}
      filteredTimeline={filteredTimeline}
    />
  );
}

function BillingContent({
  projection,
  clinics,
  clinicFilter,
  onClinicFilter,
  filteredTimeline,
}: {
  projection: BillingCenterProjection;
  clinics: Array<{ id: string; name: string }>;
  clinicFilter: string;
  onClinicFilter: (id: string) => void;
  filteredTimeline: BillingCenterProjection["transactions"];
}) {
  return (
    <ModuleStack className="saas-billing space-y-4 sm:space-y-5">
      <PageHeader
        eyebrow={SAAS_PLATFORM.eyebrow}
        icon={Wallet}
        title="Centro Financeiro SaaS"
        description="Arquitetura operacional de Billing: assinaturas, invoices, pagamentos e ledger financeiro. Gateway ainda não integrado."
      />

      <KpiGrid columns={4} className="gap-2.5 lg:gap-3">
        <KpiCard icon={Receipt} label="MRR" value={formatSaasMoney(projection.summary.mrr)} subtitle="Recorrência mensal estimada" hideDelta variant="premium" accent="#059669" />
        <KpiCard icon={RefreshCw} label="ARR" value={formatSaasMoney(projection.summary.arr)} subtitle="MRR x 12" hideDelta variant="premium" accent="#0d9488" />
        <KpiCard icon={CalendarClock} label="Receita prevista" value={formatSaasMoney(projection.summary.expected_revenue)} subtitle="Invoices derivadas em aberto" hideDelta variant="premium" accent="#2563eb" />
        <KpiCard icon={CreditCard} label="Receita recebida" value={formatSaasMoney(projection.summary.received_revenue)} subtitle="Aguardando gateway" hideDelta variant="premium" accent="#64748b" isPlaceholder />
      </KpiGrid>

      <section className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-4">
        <KpiCard icon={AlertTriangle} label="Inadimplência" value={formatSaasMoney(projection.summary.delinquency)} subtitle={`${projection.invoices.filter((i) => i.status === "overdue").length} invoice(s) vencida(s)`} hideDelta variant="premium" accent="#e11d48" tone={projection.summary.delinquency > 0 ? "warning" : "default"} />
        <KpiCard icon={FlaskConical} label="Trials" value={projection.summary.trials} subtitle="Contratos em teste" hideDelta variant="premium" accent={SAAS_PLATFORM.secondaryColor} />
        <KpiCard icon={Ban} label="Cancelamentos" value={projection.summary.cancellations} subtitle="Assinaturas canceladas" hideDelta variant="premium" accent="#f97316" />
        <KpiCard icon={Package} label="Assinaturas" value={projection.summary.active_subscriptions} subtitle="Ativas em produção" hideDelta variant="premium" accent={SAAS_PLATFORM.primaryColor} />
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <PageSection
          icon={Layers}
          title="Modelo financeiro"
          description="Estrutura lógica preparada para mensalidade, descontos, cupons e eventos de ciclo de vida."
          contentClassName="pt-0"
        >
          <div className="grid gap-2.5 sm:grid-cols-2">
            {BILLING_FINANCIAL_MODEL.map((item) => {
              const Icon = MODEL_ICON[item.kind];
              return (
                <div key={item.kind} className="rounded-xl border bg-card/80 p-3 shadow-sm">
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700">
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                        <StatusBadge variant={item.persistence === "planned" ? "neutral" : "info"}>
                          {item.persistence === "planned" ? "Planejado" : "Derivado"}
                        </StatusBadge>
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-slate-600">{item.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </PageSection>

        <PageSection
          icon={PlugZap}
          title="Integrações futuras"
          description="Contratos de gateway preparados para Sprint 10B+, ainda sem integração ativa."
          contentClassName="pt-0"
        >
          <div className="space-y-2.5">
            {BILLING_GATEWAY_READINESS.map((gateway) => (
              <div key={gateway.provider} className="rounded-xl border bg-card/80 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{gateway.label}</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">{gateway.notes}</p>
                  </div>
                  <StatusBadge variant="neutral">Planejado</StatusBadge>
                </div>
              </div>
            ))}
          </div>
        </PageSection>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <PageSection
          icon={FileText}
          title="Estrutura de dados"
          description="Entidades-alvo para Billing SaaS sem criar migrations nesta sprint."
          contentClassName="pt-0"
        >
          <div className="grid gap-2.5 sm:grid-cols-2">
            {BILLING_ENTITY_BLUEPRINT.map((entity) => (
              <div key={entity.name} className="rounded-xl border border-dashed bg-slate-50/70 p-3">
                <p className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-slate-700">
                  {entity.name}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-slate-600">{entity.description}</p>
              </div>
            ))}
          </div>
        </PageSection>

        <PageSection
          icon={Receipt}
          title="Invoices e assinaturas"
          description="Projeção somente leitura a partir dos contratos comerciais atuais."
          contentClassName="pt-0"
        >
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-3 py-2 text-left">Clínica</th>
                  <th className="px-3 py-2 text-left">Plano</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Vencimento</th>
                  <th className="px-3 py-2 text-right">Mensalidade</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {projection.subscriptions.slice(0, 12).map((row) => (
                  <tr key={row.clinic_id}>
                    <td className="px-3 py-2">
                      <div className="font-medium text-slate-900">{row.clinic_name}</div>
                      <div className="text-xs text-slate-500">{row.plan_code ?? "sem-codigo"}</div>
                    </td>
                    <td className="px-3 py-2">{row.plan_name}</td>
                    <td className="px-3 py-2">
                      <StatusBadge variant={statusVariant(row.status)}>{statusLabel(row.status)}</StatusBadge>
                    </td>
                    <td className="px-3 py-2">{formatDate(row.next_due_at)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatSaasMoney(row.monthly_value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </PageSection>
      </div>

      <PageSection
        icon={History}
        title="Timeline financeira por clínica"
        description="Ledger derivado de invoices projetadas e eventos de auditoria comercial."
        actions={
          <select
            value={clinicFilter}
            onChange={(event) => onClinicFilter(event.target.value)}
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700"
            aria-label="Filtrar timeline por clínica"
          >
            <option value="all">Todas as clínicas</option>
            {clinics.map((clinic) => (
              <option key={clinic.id} value={clinic.id}>
                {clinic.name}
              </option>
            ))}
          </select>
        }
        contentClassName="pt-0"
      >
        {filteredTimeline.length === 0 ? (
          <EmptyState
            icon={History}
            title="Sem eventos financeiros"
            description="A timeline será preenchida conforme houver contratos, invoices e eventos de auditoria."
            className="py-10"
          />
        ) : (
          <ol className="relative space-y-3 before:absolute before:bottom-2 before:left-4 before:top-2 before:w-px before:bg-gradient-to-b before:from-indigo-200 before:via-slate-200 before:to-transparent">
            {filteredTimeline.slice(0, 24).map((event) => (
              <li key={event.id} className="relative flex gap-3 pl-10">
                <span
                  className={cn(
                    "absolute left-0 top-1 flex h-8 w-8 items-center justify-center rounded-full ring-4 ring-background",
                    event.source === "audit" ? "bg-indigo-100 text-indigo-700" : "bg-emerald-100 text-emerald-700",
                  )}
                >
                  <History className="h-3.5 w-3.5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1 rounded-xl border bg-card/80 px-3 py-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-slate-900">{event.clinic_name ?? "Plataforma"}</p>
                    <span className="text-xs tabular-nums text-slate-500">{formatDate(event.occurred_at)}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <StatusBadge variant={event.source === "audit" ? "info" : "neutral"}>{event.source}</StatusBadge>
                    <span className="text-xs text-slate-600">{event.label}</span>
                    {event.amount != null && (
                      <span className="ml-auto text-xs font-semibold tabular-nums text-slate-900">
                        {formatSaasMoney(event.amount)}
                      </span>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </PageSection>
    </ModuleStack>
  );
}

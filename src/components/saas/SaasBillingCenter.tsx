import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
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
import {
  cleanupOrphanSaasFinancialData,
  generateSaasInvoice,
  getSaasBillingRealCenter,
  getSaasCommercialCenter,
  markSaasInvoicePaid,
  refreshSaasOverdueStatus,
  resetTotalSaasTestFinancialData,
} from "@/lib/api/saas-admin.functions";
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
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

const PAYMENT_METHODS = [
  { value: "pix", label: "Pix" },
  { value: "boleto", label: "Boleto" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "transferencia", label: "Transferência" },
  { value: "cartao", label: "Cartão" },
  { value: "manual", label: "Manual" },
  { value: "outro", label: "Outro" },
] as const;

type SaasBillingRealData = {
  generated_at: string;
  summary: {
    subscriptions: number;
    active_subscriptions: number;
    trials: number;
    suspended: number;
    open_invoices: number;
    overdue_invoices: number;
    expected_revenue: number;
    overdue_amount: number;
    received_revenue: number;
    mrr: number;
    arr: number;
    excluded_orphan_records?: number;
  };
  clinics: Array<{
    id: string;
    nome: string;
    slug: string | null;
    status: string | null;
    active: boolean | null;
    plan: string | null;
  }>;
  subscriptions: Array<{
    id: string;
    clinic_id: string;
    plan_id: string;
    status: string;
    billing_cycle: string;
    current_period_end: string | null;
    trial_ends_at: string | null;
    canceled_at: string | null;
    plans?: { code?: string | null; name?: string | null; monthly_price?: number | null; price_cents?: number | null } | null;
    clinics?: { nome?: string | null; slug?: string | null; status?: string | null; active?: boolean | null } | null;
  }>;
  invoices: Array<{
    id: string;
    clinic_id: string;
    subscription_id: string | null;
    due_date: string | null;
    amount: number;
    status: string;
    paid_at: string | null;
    reference_month: string;
    notes: string | null;
    created_at: string;
    clinics?: { nome?: string | null; slug?: string | null } | null;
  }>;
  payments: Array<{
    id: string;
    invoice_id: string | null;
    amount: number;
    paid_at: string | null;
    method: string;
    external_id: string | null;
    notes: string | null;
  }>;
  events: Array<{
    id: string;
    clinic_id: string | null;
    kind: string;
    amount: number | null;
    metadata: Record<string, unknown> | null;
    created_at: string;
    clinics?: { nome?: string | null } | null;
  }>;
};

type InvoiceRow = SaasBillingRealData["invoices"][number];

type OrphanSaasFinancialReport = {
  dry_run?: boolean;
  groups?: Array<{
    table: string;
    clinic_id: string;
    record_count: number;
    total_amount: number;
    statuses: string[];
    reference_months: string[];
    oldest_at: string | null;
    newest_at: string | null;
    orphan_reason: string;
  }>;
  totals?: {
    groups: number;
    records: number;
    amount: number;
  };
  totals_after?: {
    groups: number;
    records: number;
    amount: number;
  };
  dangling_checks?: {
    invoice_subscription_dangling: number;
    payment_invoice_dangling: number;
  };
  preserved?: string[];
  criteria?: string[];
};

type TotalSaasTestFinancialResetReport = {
  dry_run?: boolean;
  confirmation?: string;
  groups?: Array<{
    table: string;
    available: boolean;
    record_count: number;
    total_amount: number;
    oldest_at: string | null;
    newest_at: string | null;
    clinics: Array<{ id: string; name: string | null; status: string | null }>;
  }>;
  totals?: {
    tables: number;
    records: number;
    amount: number;
    clinics: number;
  };
  deleted?: {
    tables: number;
    records: number;
    amount: number;
    clinics: number;
  };
  totals_after?: {
    tables: number;
    records: number;
    amount: number;
    clinics: number;
  };
  affected_tables?: string[];
  preserved?: string[];
};

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("pt-BR");
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    active: "Ativa",
    trial: "Trial",
    past_due: "Em atraso",
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
  if (["overdue", "past_due", "suspended", "uncollectible"].includes(status)) return "warning";
  if (["canceled", "void"].includes(status)) return "danger";
  return "neutral";
}

function currentReferenceMonth() {
  return new Date().toISOString().slice(0, 7);
}

function defaultDueDate() {
  const d = new Date();
  d.setDate(10);
  return d.toISOString().slice(0, 10);
}

function moneyFromPlan(plan: SaasBillingRealData["subscriptions"][number]["plans"]) {
  return Number(plan?.monthly_price ?? ((plan?.price_cents ?? 0) / 100)) || 0;
}

export function SaasBillingCenter() {
  const queryClient = useQueryClient();
  const mountedRef = useRef(true);
  const fetchCommercial = useServerFn(getSaasCommercialCenter);
  const fetchBilling = useServerFn(getSaasBillingRealCenter);
  const createInvoice = useServerFn(generateSaasInvoice);
  const payInvoice = useServerFn(markSaasInvoicePaid);
  const refreshOverdue = useServerFn(refreshSaasOverdueStatus);
  const cleanupOrphans = useServerFn(cleanupOrphanSaasFinancialData);
  const resetTotalSaasTestFinancial = useServerFn(resetTotalSaasTestFinancialData);

  const [clinicFilter, setClinicFilter] = useState<string>("all");
  const [invoiceClinicId, setInvoiceClinicId] = useState("");
  const [referenceMonth, setReferenceMonth] = useState(currentReferenceMonth());
  const [dueDate, setDueDate] = useState(defaultDueDate());
  const [payTarget, setPayTarget] = useState<InvoiceRow | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("pix");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [orphanDialogOpen, setOrphanDialogOpen] = useState(false);
  const [orphanConfirm, setOrphanConfirm] = useState("");
  const [orphanReport, setOrphanReport] = useState<OrphanSaasFinancialReport | null>(null);
  const [totalResetDialogOpen, setTotalResetDialogOpen] = useState(false);
  const [totalResetConfirm, setTotalResetConfirm] = useState("");
  const [totalResetReport, setTotalResetReport] = useState<TotalSaasTestFinancialResetReport | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const commercialQuery = useQuery({
    queryKey: ["saas-commercial-center", "billing"],
    queryFn: () => fetchCommercial(),
    retry: false,
  });

  const billingQuery = useQuery({
    queryKey: ["saas-billing-real-center"],
    queryFn: () => fetchBilling(),
    retry: false,
  });

  const projection = useMemo(
    () =>
      commercialQuery.data
        ? buildBillingCenterProjection(commercialQuery.data as SaasCommercialCenterData)
        : null,
    [commercialQuery.data],
  );

  const real = billingQuery.data as SaasBillingRealData | undefined;
  const billingClinics = useMemo(() => {
    const source = real?.clinics ?? [];
    return source.map((clinic) => ({ id: clinic.id, name: clinic.nome })).sort((a, b) => a.name.localeCompare(b.name));
  }, [real?.clinics]);

  const timelineClinics = useMemo(() => {
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

  const invalidateBilling = () => {
    void queryClient.invalidateQueries({ queryKey: ["saas-billing-real-center"] });
    void queryClient.invalidateQueries({ queryKey: ["saas-commercial-center", "billing"] });
    void queryClient.invalidateQueries({ queryKey: ["saas-dashboard"] });
  };

  const generateInvoiceMut = useMutation({
    mutationFn: () =>
      createInvoice({
        data: {
          clinic_id: invoiceClinicId,
          reference_month: referenceMonth,
          due_date: dueDate,
        },
      }),
    onSuccess: (result: any) => {
      if (!mountedRef.current) return;
      toast.success(result?.created ? "Mensalidade gerada" : "Mensalidade já existia para a competência");
      invalidateBilling();
    },
    onError: (error: any) => {
      if (!mountedRef.current) return;
      toast.error(error?.message ?? "Não foi possível gerar mensalidade");
    },
  });

  const payInvoiceMut = useMutation({
    mutationFn: () =>
      payInvoice({
        data: {
          invoice_id: payTarget?.id ?? "",
          method: paymentMethod as any,
          notes: paymentNotes || undefined,
        },
      }),
    onSuccess: () => {
      if (!mountedRef.current) return;
      toast.success("Pagamento registrado");
      setPayTarget(null);
      setPaymentNotes("");
      invalidateBilling();
    },
    onError: (error: any) => {
      if (!mountedRef.current) return;
      toast.error(error?.message ?? "Não foi possível registrar pagamento");
    },
  });

  const overdueMut = useMutation({
    mutationFn: () => refreshOverdue({ data: { grace_days: 7 } }),
    onSuccess: (result: any) => {
      if (!mountedRef.current) return;
      toast.success(
        `${result?.marked_overdue ?? 0} mensalidade(s) vencida(s), ${result?.suspended_clinics ?? 0} clínica(s) suspensa(s)`,
      );
      invalidateBilling();
    },
    onError: (error: any) => {
      if (!mountedRef.current) return;
      toast.error(error?.message ?? "Não foi possível atualizar inadimplência");
    },
  });

  const orphanDryRunMut = useMutation({
    mutationFn: () => cleanupOrphans({ data: { dry_run: true } }),
    onSuccess: (result: any) => {
      if (!mountedRef.current) return;
      setOrphanReport(result as OrphanSaasFinancialReport);
      setOrphanDialogOpen(true);
    },
    onError: (error: any) => {
      if (!mountedRef.current) return;
      toast.error(error?.message ?? "Não foi possível executar dry-run de órfãos");
    },
  });

  const orphanCleanupMut = useMutation({
    mutationFn: (confirm: string) =>
      cleanupOrphans({
        data: {
          dry_run: false,
          confirm,
        },
      }),
    onSuccess: (result: any) => {
      if (!mountedRef.current) return;
      setOrphanReport(result as OrphanSaasFinancialReport);
      toast.success("Registros financeiros órfãos removidos");
      invalidateBilling();
    },
    onError: (error: any) => {
      if (!mountedRef.current) return;
      toast.error(error?.message ?? "Não foi possível limpar registros órfãos");
    },
  });

  const totalResetDryRunMut = useMutation({
    mutationFn: () => resetTotalSaasTestFinancial({ data: { dry_run: true } }),
    onSuccess: (result: any) => {
      if (!mountedRef.current) return;
      setTotalResetReport(result as TotalSaasTestFinancialResetReport);
      setTotalResetDialogOpen(true);
    },
    onError: (error: any) => {
      if (!mountedRef.current) return;
      toast.error(error?.message ?? "Não foi possível executar dry-run do reset SaaS");
    },
  });

  const totalResetExecuteMut = useMutation({
    mutationFn: (confirm: string) =>
      resetTotalSaasTestFinancial({
        data: {
          dry_run: false,
          confirm,
        },
      }),
    onSuccess: (result: any) => {
      if (!mountedRef.current) return;
      setTotalResetReport(result as TotalSaasTestFinancialResetReport);
      setTotalResetConfirm("");
      toast.success("Financeiro SaaS de teste zerado");
      invalidateBilling();
    },
    onError: (error: any) => {
      if (!mountedRef.current) return;
      toast.error(error?.message ?? "Não foi possível zerar o financeiro SaaS de teste");
    },
  });

  if (commercialQuery.isError || billingQuery.isError) {
    const error = (billingQuery.error ?? commercialQuery.error) as Error;
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Não foi possível carregar o Billing SaaS"
        description={error?.message ?? "Tente novamente em instantes."}
        action={{
          label: "Tentar novamente",
          onClick: () => {
            void commercialQuery.refetch();
            void billingQuery.refetch();
          },
        }}
      />
    );
  }

  if (commercialQuery.isLoading || billingQuery.isLoading) {
    return <ClinicalSkeleton variant="dashboard" kpiCount={8} />;
  }

  if (!projection || !real) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Billing SaaS indisponível"
        description="A consulta terminou sem dados válidos. Verifique se as migrations de Billing SaaS foram aplicadas."
        action={{
          label: "Tentar novamente",
          onClick: () => {
            void commercialQuery.refetch();
            void billingQuery.refetch();
          },
        }}
      />
    );
  }

  return (
    <>
      <BillingContent
        real={real}
        projection={projection}
        billingClinics={billingClinics}
        timelineClinics={timelineClinics}
        clinicFilter={clinicFilter}
        invoiceClinicId={invoiceClinicId}
        referenceMonth={referenceMonth}
        dueDate={dueDate}
        onClinicFilter={setClinicFilter}
        onInvoiceClinicId={setInvoiceClinicId}
        onReferenceMonth={setReferenceMonth}
        onDueDate={setDueDate}
        onGenerateInvoice={() => generateInvoiceMut.mutate()}
        onRefreshOverdue={() => overdueMut.mutate()}
        onOpenPayment={setPayTarget}
        filteredTimeline={filteredTimeline}
        generatingInvoice={generateInvoiceMut.isPending}
        refreshingOverdue={overdueMut.isPending}
        onOpenOrphanDryRun={() => orphanDryRunMut.mutate()}
        openingOrphanDryRun={orphanDryRunMut.isPending}
        onOpenTotalResetDryRun={() => totalResetDryRunMut.mutate()}
        openingTotalResetDryRun={totalResetDryRunMut.isPending}
        excludedOrphanRecords={real.summary.excluded_orphan_records ?? 0}
      />

      <TotalSaasTestFinancialResetDialog
        open={totalResetDialogOpen}
        onOpenChange={(open) => {
          setTotalResetDialogOpen(open);
          if (!open) {
            setTotalResetConfirm("");
          }
        }}
        report={totalResetReport}
        confirm={totalResetConfirm}
        onConfirmChange={setTotalResetConfirm}
        isDryRunLoading={totalResetDryRunMut.isPending}
        isExecuting={totalResetExecuteMut.isPending}
        onRefreshDryRun={() => totalResetDryRunMut.mutate()}
        onExecute={() => totalResetExecuteMut.mutate(totalResetConfirm)}
      />

      <OrphanSaasFinancialDialog
        open={orphanDialogOpen}
        onOpenChange={(open) => {
          setOrphanDialogOpen(open);
          if (!open) {
            setOrphanConfirm("");
          }
        }}
        report={orphanReport}
        confirm={orphanConfirm}
        onConfirmChange={setOrphanConfirm}
        isDryRunLoading={orphanDryRunMut.isPending}
        isExecuting={orphanCleanupMut.isPending}
        onRefreshDryRun={() => orphanDryRunMut.mutate()}
        onExecute={() => orphanCleanupMut.mutate(orphanConfirm)}
      />

      <Dialog open={!!payTarget} onOpenChange={(open) => !open && setPayTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar pagamento manual</DialogTitle>
            <DialogDescription>
              Registra o recebimento da mensalidade SaaS sem integrar gateway de pagamento.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border bg-slate-50 p-3 text-sm">
              <div className="font-semibold text-slate-900">{payTarget?.clinics?.nome ?? "Clínica"}</div>
              <div className="mt-1 text-xs text-slate-600">
                {payTarget?.reference_month} · {formatSaasMoney(Number(payTarget?.amount ?? 0))}
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="saas-payment-method">Forma de pagamento</Label>
              <select
                id="saas-payment-method"
                value={paymentMethod}
                onChange={(event) => setPaymentMethod(event.target.value)}
                className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700"
              >
                {PAYMENT_METHODS.map((method) => (
                  <option key={method.value} value={method.value}>
                    {method.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="saas-payment-notes">Observações</Label>
              <Input
                id="saas-payment-notes"
                value={paymentNotes}
                onChange={(event) => setPaymentNotes(event.target.value)}
                placeholder="Ex.: pagamento conferido manualmente"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPayTarget(null)}>
                Cancelar
              </Button>
              <Button
                loading={payInvoiceMut.isPending}
                disabled={!payTarget}
                onClick={() => payInvoiceMut.mutate()}
              >
                Marcar como paga
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function BillingContent({
  real,
  projection,
  billingClinics,
  timelineClinics,
  clinicFilter,
  invoiceClinicId,
  referenceMonth,
  dueDate,
  onClinicFilter,
  onInvoiceClinicId,
  onReferenceMonth,
  onDueDate,
  onGenerateInvoice,
  onRefreshOverdue,
  onOpenPayment,
  filteredTimeline,
  generatingInvoice,
  refreshingOverdue,
  onOpenOrphanDryRun,
  openingOrphanDryRun,
  onOpenTotalResetDryRun,
  openingTotalResetDryRun,
  excludedOrphanRecords,
}: {
  real: SaasBillingRealData;
  projection: BillingCenterProjection;
  billingClinics: Array<{ id: string; name: string }>;
  timelineClinics: Array<{ id: string; name: string }>;
  clinicFilter: string;
  invoiceClinicId: string;
  referenceMonth: string;
  dueDate: string;
  onClinicFilter: (id: string) => void;
  onInvoiceClinicId: (id: string) => void;
  onReferenceMonth: (value: string) => void;
  onDueDate: (value: string) => void;
  onGenerateInvoice: () => void;
  onRefreshOverdue: () => void;
  onOpenPayment: (invoice: InvoiceRow) => void;
  filteredTimeline: BillingCenterProjection["transactions"];
  generatingInvoice: boolean;
  refreshingOverdue: boolean;
  onOpenOrphanDryRun: () => void;
  openingOrphanDryRun: boolean;
  onOpenTotalResetDryRun: () => void;
  openingTotalResetDryRun: boolean;
  excludedOrphanRecords: number;
}) {
  const recentInvoices = real.invoices.slice(0, 14);
  const recentEvents = real.events.slice(0, 12);
  const selectedClinic = billingClinics.find((clinic) => clinic.id === invoiceClinicId);

  return (
    <ModuleStack className="saas-billing space-y-4 sm:space-y-5">
      <PageHeader
        eyebrow={SAAS_PLATFORM.eyebrow}
        icon={Wallet}
        title="Centro Financeiro SaaS"
        description="Billing operacional da plataforma: assinaturas, mensalidades, pagamentos manuais, inadimplência e histórico comercial."
      />

      <KpiGrid columns={4} className="gap-2.5 lg:gap-3">
        <KpiCard icon={Receipt} label="MRR real" value={formatSaasMoney(real.summary.mrr)} subtitle="Assinaturas ativas" hideDelta variant="premium" accent="#059669" />
        <KpiCard icon={RefreshCw} label="ARR real" value={formatSaasMoney(real.summary.arr)} subtitle="MRR x 12" hideDelta variant="premium" accent="#0d9488" />
        <KpiCard icon={CalendarClock} label="Receita em aberto" value={formatSaasMoney(real.summary.expected_revenue)} subtitle={`${real.summary.open_invoices} mensalidade(s)`} hideDelta variant="premium" accent="#2563eb" />
        <KpiCard icon={CreditCard} label="Receita recebida" value={formatSaasMoney(real.summary.received_revenue)} subtitle="Pagamentos manuais" hideDelta variant="premium" accent="#64748b" />
      </KpiGrid>

      <section className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-4">
        <KpiCard icon={AlertTriangle} label="Inadimplência" value={formatSaasMoney(real.summary.overdue_amount)} subtitle={`${real.summary.overdue_invoices} vencida(s)`} hideDelta variant="premium" accent="#e11d48" tone={real.summary.overdue_amount > 0 ? "warning" : "default"} />
        <KpiCard icon={FlaskConical} label="Trials" value={real.summary.trials} subtitle="Assinaturas em teste" hideDelta variant="premium" accent={SAAS_PLATFORM.secondaryColor} />
        <KpiCard icon={Ban} label="Suspensas" value={real.summary.suspended} subtitle="Bloqueio comercial" hideDelta variant="premium" accent="#f97316" />
        <KpiCard icon={Package} label="Assinaturas" value={real.summary.active_subscriptions} subtitle={`${real.summary.subscriptions} total(is)`} hideDelta variant="premium" accent={SAAS_PLATFORM.primaryColor} />
      </section>

      <div className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
        <PageSection
          icon={CreditCard}
          title="Ações de billing"
          description="Geração manual de mensalidade e atualização controlada de inadimplência."
          contentClassName="pt-0"
        >
          <div className="grid gap-3 rounded-xl border bg-card/80 p-3">
            <div className="grid gap-3 sm:grid-cols-[1.5fr_0.8fr_0.8fr]">
              <div className="grid gap-1.5">
                <Label htmlFor="saas-invoice-clinic">Clínica</Label>
                <select
                  id="saas-invoice-clinic"
                  value={invoiceClinicId}
                  onChange={(event) => onInvoiceClinicId(event.target.value)}
                  className="h-10 min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700"
                >
                  <option value="">Selecionar clínica</option>
                  {billingClinics.map((clinic) => (
                    <option key={clinic.id} value={clinic.id}>
                      {clinic.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="saas-reference-month">Competência</Label>
                <Input
                  id="saas-reference-month"
                  type="month"
                  value={referenceMonth}
                  onChange={(event) => onReferenceMonth(event.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="saas-due-date">Vencimento</Label>
                <Input
                  id="saas-due-date"
                  type="date"
                  value={dueDate}
                  onChange={(event) => onDueDate(event.target.value)}
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-slate-600">
                {selectedClinic
                  ? `Mensalidade será gerada para ${selectedClinic.name}. Duplicidade por competência é bloqueada.`
                  : "Selecione uma clínica para gerar a mensalidade usando o valor do plano ativo."}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  loading={openingTotalResetDryRun}
                  onClick={onOpenTotalResetDryRun}
                >
                  Zerar dados financeiros SaaS de teste
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  loading={openingOrphanDryRun}
                  onClick={onOpenOrphanDryRun}
                >
                  Registros financeiros órfãos
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  loading={refreshingOverdue}
                  onClick={onRefreshOverdue}
                >
                  Atualizar inadimplência
                </Button>
                <Button
                  size="sm"
                  loading={generatingInvoice}
                  disabled={!invoiceClinicId || !referenceMonth || !dueDate}
                  onClick={onGenerateInvoice}
                >
                  Gerar mensalidade
                </Button>
              </div>
            </div>
            {excludedOrphanRecords > 0 && (
              <p className="text-xs text-amber-700">
                {excludedOrphanRecords} registro(s) financeiro(s) foram ignorados nos KPIs por não possuírem clínica válida.
              </p>
            )}
          </div>
        </PageSection>

        <PageSection
          icon={Receipt}
          title="Mensalidades"
          description="Invoices SaaS persistidas, separadas do financeiro da clínica."
          contentClassName="pt-0"
        >
          {recentInvoices.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="Nenhuma mensalidade gerada"
              description="Use a ação de billing para criar a primeira cobrança mensal de uma clínica."
              className="py-10"
            />
          ) : (
            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full min-w-[780px] text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500">
                  <tr>
                    <th className="px-3 py-2 text-left">Clínica</th>
                    <th className="px-3 py-2 text-left">Competência</th>
                    <th className="px-3 py-2 text-left">Vencimento</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-right">Valor</th>
                    <th className="px-3 py-2 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {recentInvoices.map((invoice) => (
                    <tr key={invoice.id}>
                      <td className="px-3 py-2">
                        <div className="font-medium text-slate-900">{invoice.clinics?.nome ?? "Clínica"}</div>
                        <div className="text-xs text-slate-500">{invoice.clinics?.slug ?? invoice.clinic_id}</div>
                      </td>
                      <td className="px-3 py-2 tabular-nums">{invoice.reference_month}</td>
                      <td className="px-3 py-2">{formatDate(invoice.due_date)}</td>
                      <td className="px-3 py-2">
                        <StatusBadge variant={statusVariant(invoice.status)}>{statusLabel(invoice.status)}</StatusBadge>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatSaasMoney(Number(invoice.amount ?? 0))}</td>
                      <td className="px-3 py-2 text-right">
                        {["open", "overdue"].includes(invoice.status) ? (
                          <Button variant="outline" size="sm" onClick={() => onOpenPayment(invoice)}>
                            Marcar paga
                          </Button>
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </PageSection>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <PageSection
          icon={Layers}
          title="Assinaturas"
          description="Contratos SaaS persistidos por clínica, plano, ciclo e status."
          contentClassName="pt-0"
        >
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-3 py-2 text-left">Clínica</th>
                  <th className="px-3 py-2 text-left">Plano</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Período atual</th>
                  <th className="px-3 py-2 text-right">Mensalidade</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {real.subscriptions.slice(0, 12).map((row) => (
                  <tr key={row.id}>
                    <td className="px-3 py-2">
                      <div className="font-medium text-slate-900">{row.clinics?.nome ?? row.clinic_id}</div>
                      <div className="text-xs text-slate-500">{row.clinics?.slug ?? "sem-slug"}</div>
                    </td>
                    <td className="px-3 py-2">
                      <div>{row.plans?.name ?? "Sem plano"}</div>
                      <div className="text-xs text-slate-500">{row.plans?.code ?? "sem-codigo"}</div>
                    </td>
                    <td className="px-3 py-2">
                      <StatusBadge variant={statusVariant(row.status)}>{statusLabel(row.status)}</StatusBadge>
                    </td>
                    <td className="px-3 py-2">{formatDate(row.current_period_end)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatSaasMoney(moneyFromPlan(row.plans))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </PageSection>

        <PageSection
          icon={History}
          title="Histórico billing"
          description="Eventos financeiros SaaS gravados para auditoria comercial."
          contentClassName="pt-0"
        >
          {recentEvents.length === 0 ? (
            <EmptyState
              icon={History}
              title="Sem eventos de billing"
              description="Eventos aparecerão ao gerar mensalidades, marcar pagamentos ou atualizar inadimplência."
              className="py-10"
            />
          ) : (
            <ol className="relative space-y-3 before:absolute before:bottom-2 before:left-4 before:top-2 before:w-px before:bg-gradient-to-b before:from-indigo-200 before:via-slate-200 before:to-transparent">
              {recentEvents.map((event) => (
                <li key={event.id} className="relative flex gap-3 pl-10">
                  <span className="absolute left-0 top-1 flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 ring-4 ring-background">
                    <History className="h-3.5 w-3.5" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1 rounded-xl border bg-card/80 px-3 py-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-slate-900">{event.clinics?.nome ?? "Plataforma"}</p>
                      <span className="text-xs tabular-nums text-slate-500">{formatDate(event.created_at)}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <StatusBadge variant="info">{event.kind}</StatusBadge>
                      {event.amount != null && (
                        <span className="ml-auto text-xs font-semibold tabular-nums text-slate-900">
                          {formatSaasMoney(Number(event.amount ?? 0))}
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </PageSection>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <PageSection
          icon={Sparkles}
          title="Modelo financeiro"
          description="Estrutura funcional para mensalidade, descontos, cupons e eventos de ciclo de vida."
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
                          {item.persistence === "planned" ? "Planejado" : "Operacional"}
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
          description="Contratos de gateway permanecem preparados, sem checkout ativo nesta sprint."
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
          description="Entidades persistidas para billing SaaS real, sem gateway de pagamento."
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
          title="Projeção comercial"
          description="Leitura derivada dos contratos atuais para comparação com o billing persistido."
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
            {timelineClinics.map((clinic) => (
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

function orphanReasonLabel(reason: string) {
  if (reason === "missing_clinic") return "Clínica inexistente";
  if (reason === "dangling_subscription") return "Assinatura inexistente";
  if (reason === "dangling_invoice") return "Invoice inexistente";
  return reason;
}

function TotalSaasTestFinancialResetDialog({
  open,
  onOpenChange,
  report,
  confirm,
  onConfirmChange,
  isDryRunLoading,
  isExecuting,
  onRefreshDryRun,
  onExecute,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: TotalSaasTestFinancialResetReport | null;
  confirm: string;
  onConfirmChange: (value: string) => void;
  isDryRunLoading: boolean;
  isExecuting: boolean;
  onRefreshDryRun: () => void;
  onExecute: () => void;
}) {
  const groups = report?.groups ?? [];
  const totals = report?.totals ?? report?.deleted ?? { tables: 0, records: 0, amount: 0, clinics: 0 };
  const executed = report?.dry_run === false;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Zerar dados financeiros SaaS de teste</DialogTitle>
          <DialogDescription>
            Remove somente dados das tabelas financeiras SaaS reais. Não altera clínicas, planos, usuários, dados clínicos,
            financeiro clínico, recibos ou templates.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-red-900">
            Esta rotina é para implantação: limpa dados fictícios de <strong>saas_subscriptions</strong>,{" "}
            <strong>saas_invoices</strong>, <strong>saas_payments</strong>, <strong>saas_billing_events</strong> e{" "}
            <strong>saas_transactions</strong> quando existir. <strong>clinic_plans</strong> é preservada.
          </div>

          <div className="grid gap-2 text-xs md:grid-cols-4">
            <div className="rounded border bg-muted/30 px-3 py-2">
              Tabelas: <strong>{totals.tables}</strong>
            </div>
            <div className="rounded border bg-muted/30 px-3 py-2">
              Registros: <strong>{totals.records}</strong>
            </div>
            <div className="rounded border bg-muted/30 px-3 py-2">
              Valor: <strong>{formatSaasMoney(totals.amount)}</strong>
            </div>
            <div className="rounded border bg-muted/30 px-3 py-2">
              Clínicas envolvidas: <strong>{totals.clinics}</strong>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium">{executed ? "Relatório pós-reset" : "Dry-run obrigatório"}</p>
              <p className="text-xs text-muted-foreground">
                Após executar, MRR, ARR e Receita Prevista do Billing SaaS real ficam R$ 0,00 até novas mensalidades serem geradas.
              </p>
            </div>
            <Button variant="outline" size="sm" loading={isDryRunLoading} onClick={onRefreshDryRun}>
              Atualizar dry-run
            </Button>
          </div>

          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[920px] text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-3 py-2 text-left">Tabela</th>
                  <th className="px-3 py-2 text-left">Existe</th>
                  <th className="px-3 py-2 text-right">Qtd</th>
                  <th className="px-3 py-2 text-right">Valor total</th>
                  <th className="px-3 py-2 text-left">Menor data</th>
                  <th className="px-3 py-2 text-left">Maior data</th>
                  <th className="px-3 py-2 text-left">Clínicas envolvidas</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {groups.map((row) => (
                  <tr key={row.table}>
                    <td className="px-3 py-2 font-mono text-xs">{row.table}</td>
                    <td className="px-3 py-2">
                      <StatusBadge variant={row.available ? "success" : "neutral"}>
                        {row.available ? "Sim" : "Não existe"}
                      </StatusBadge>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{row.record_count}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatSaasMoney(row.total_amount)}</td>
                    <td className="px-3 py-2 text-xs">{formatDate(row.oldest_at)}</td>
                    <td className="px-3 py-2 text-xs">{formatDate(row.newest_at)}</td>
                    <td className="px-3 py-2 text-xs">
                      {row.clinics.length === 0
                        ? "-"
                        : row.clinics
                            .slice(0, 4)
                            .map((clinic) => clinic.name ?? clinic.id)
                            .join(", ")}
                      {row.clinics.length > 4 ? ` +${row.clinics.length - 4}` : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {executed && report?.totals_after && (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
              Pós-reset: {report.totals_after.records} registro(s), {formatSaasMoney(report.totals_after.amount)}.
              KPIs financeiros SaaS reais devem recarregar zerados.
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="total-saas-test-reset-confirm">Digite ZERAR SAAS TESTE para executar</Label>
            <Input
              id="total-saas-test-reset-confirm"
              value={confirm}
              onChange={(event) => onConfirmChange(event.target.value)}
              placeholder="ZERAR SAAS TESTE"
              disabled={isExecuting || executed}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
            <Button
              variant="destructive"
              onClick={onExecute}
              disabled={confirm !== "ZERAR SAAS TESTE" || isExecuting || executed || totals.records === 0}
            >
              {isExecuting ? "Executando..." : "Zerar financeiro SaaS de teste"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function OrphanSaasFinancialDialog({
  open,
  onOpenChange,
  report,
  confirm,
  onConfirmChange,
  isDryRunLoading,
  isExecuting,
  onRefreshDryRun,
  onExecute,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: OrphanSaasFinancialReport | null;
  confirm: string;
  onConfirmChange: (value: string) => void;
  isDryRunLoading: boolean;
  isExecuting: boolean;
  onRefreshDryRun: () => void;
  onExecute: () => void;
}) {
  const groups = report?.groups ?? [];
  const totals = report?.totals ?? { groups: 0, records: 0, amount: 0 };
  const executed = report?.dry_run === false;
  const dangling = report?.dangling_checks;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registros financeiros órfãos</DialogTitle>
          <DialogDescription>
            Dry-run de billing SaaS sem clínica válida em <code className="text-xs">clinics</code>, ou com referências quebradas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-900">
            Esta rotina remove ou cancela registros em <strong>saas_subscriptions</strong>, <strong>saas_invoices</strong>,{" "}
            <strong>saas_payments</strong> e <strong>clinic_plans</strong> vinculados a clínicas removidas ou inexistentes.
            Não altera clínicas, usuários, catálogo de planos, pacientes, templates ou financeiro clínico.
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium">{executed ? "Relatório pós-limpeza" : "Dry-run"}</p>
              <p className="text-xs text-muted-foreground">
                {totals.records} registro(s) em {totals.groups} grupo(s) · {formatSaasMoney(totals.amount)}
              </p>
            </div>
            <Button variant="outline" size="sm" loading={isDryRunLoading} onClick={onRefreshDryRun}>
              Atualizar dry-run
            </Button>
          </div>

          {dangling && (
            <div className="grid gap-2 text-xs md:grid-cols-2">
              <div className="rounded border bg-muted/30 px-3 py-2">
                Invoices com subscription inexistente: <strong>{dangling.invoice_subscription_dangling}</strong>
              </div>
              <div className="rounded border bg-muted/30 px-3 py-2">
                Payments com invoice inexistente: <strong>{dangling.payment_invoice_dangling}</strong>
              </div>
            </div>
          )}

          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-3 py-2 text-left">Tabela</th>
                  <th className="px-3 py-2 text-left">Clinic ID órfão</th>
                  <th className="px-3 py-2 text-left">Motivo</th>
                  <th className="px-3 py-2 text-right">Qtd</th>
                  <th className="px-3 py-2 text-right">Valor total</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Competência</th>
                  <th className="px-3 py-2 text-left">Mais antiga</th>
                  <th className="px-3 py-2 text-left">Mais recente</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {groups.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-8 text-center text-muted-foreground">
                      Nenhum registro financeiro órfão encontrado.
                    </td>
                  </tr>
                ) : (
                  groups.map((row) => (
                    <tr key={`${row.table}:${row.clinic_id}:${row.orphan_reason}`}>
                      <td className="px-3 py-2 font-mono text-xs">{row.table}</td>
                      <td className="px-3 py-2 font-mono text-xs">{row.clinic_id}</td>
                      <td className="px-3 py-2">{orphanReasonLabel(row.orphan_reason)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{row.record_count}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatSaasMoney(row.total_amount)}</td>
                      <td className="px-3 py-2 text-xs">{(row.statuses ?? []).join(", ") || "—"}</td>
                      <td className="px-3 py-2 text-xs">{(row.reference_months ?? []).join(", ") || "—"}</td>
                      <td className="px-3 py-2 text-xs">{formatDate(row.oldest_at)}</td>
                      <td className="px-3 py-2 text-xs">{formatDate(row.newest_at)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {executed && report?.totals_after && (
            <p className="text-xs text-emerald-700">
              Após limpeza: {report.totals_after.records} registro(s) órfão(s) restante(s).
            </p>
          )}

          <div className="space-y-2">
            <Label htmlFor="orphan-saas-confirm">Digite LIMPAR ORFAOS para executar</Label>
            <Input
              id="orphan-saas-confirm"
              value={confirm}
              onChange={(event) => onConfirmChange(event.target.value)}
              placeholder="LIMPAR ORFAOS"
              disabled={isExecuting || executed}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
            <Button
              variant="destructive"
              onClick={onExecute}
              disabled={confirm !== "LIMPAR ORFAOS" || isExecuting || executed || totals.records === 0}
            >
              {isExecuting ? "Executando..." : "Limpar dados financeiros órfãos"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

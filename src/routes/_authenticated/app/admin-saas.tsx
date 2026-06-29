import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  getSaasDashboard,
  getSaasClinicDiagnostic,
  listClinicsAdmin,
  setClinicStatus,
  markClinicAsTest,
  startClinicTrial,
  extendClinicTrial,
  convertTrialToActive,
  cancelClinicSubscription,
  provisionClinic,
  listPlans,
  assignPlan,
  createPlan,
  updatePlan,
  deletePlan,
  duplicatePlan,
  togglePlanActive,
  reorderPlans,
  listSaasAudit,
  resendOwnerInvite,
  cancelOwnerInvite,
  changeClinicOwner,
  getClinicCounts,
  softDeleteClinic,
  getSaasCommercialCenter,
} from "@/lib/api/saas-admin.functions";
import { ClinicDetailDialog } from "@/components/clinic-detail-dialog";
import { SaasDashboardPanel, SaasDashboardSkeleton } from "@/components/saas/SaasDashboardPanel";
import {
  OPERATIONAL_STATUS_LABEL,
  resolveOperationalStatus,
  SAAS_NAV_ITEMS,
  type SaasDashboardData,
  type SaasNavTarget,
  type ClinicListSegment,
  type SaasCommercialCenterData,
} from "@/lib/saas";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Building2,
  Plus,
  Users,
  FileText,
  UserCheck,
  Activity,
  MoreVertical,
  Power,
  Eye,
  Package,
  Pencil,
  Copy,
  Trash2,
  ArrowUp,
  ArrowDown,
  Star,
  DollarSign,
  TrendingUp,
  FlaskConical,
  Shield,
  Search,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/admin-saas")({
  beforeLoad: async () => {
    const { data: sess } = await supabase.auth.getUser();
    if (!sess.user) throw redirect({ to: "/auth" });
    const { data: ok } = await supabase.rpc("has_role", {
      _user_id: sess.user.id,
      _role: "super_admin",
    });
    if (!ok) throw redirect({ to: "/app" });
  },
  component: AdminSaasPage,
});

const MODULE_CATALOG: { key: string; label: string }[] = [
  { key: "agenda", label: "Agenda" },
  { key: "pacientes", label: "Pacientes" },
  { key: "avaliacoes", label: "Avaliações" },
  { key: "evolucoes", label: "Evoluções" },
  { key: "home_care", label: "Home Care" },
  { key: "biblioteca", label: "Biblioteca" },
  { key: "documentos", label: "Documentos" },
  { key: "relatorios", label: "Relatórios" },
  { key: "marketing", label: "Marketing" },
  { key: "treinamentos", label: "Treinamentos" },
  { key: "pops", label: "POPs" },
  { key: "teleconsulta", label: "Teleconsulta" },
  { key: "api", label: "API" },
  { key: "multi_unidade", label: "Multiunidade" },
  { key: "assinatura_digital", label: "Assinatura Digital" },
  { key: "inteligencia_clinica", label: "Inteligência Clínica" },
];

const BRL = (v: number | null | undefined) =>
  v == null
    ? "—"
    : Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function AdminSaasPage() {
  const [tab, setTab] = useState("painel");
  const [openNew, setOpenNew] = useState(false);

  const handleSaasNav = (target: SaasNavTarget) => {
    const item = SAAS_NAV_ITEMS.find((entry) => entry.id === target);
    if (item?.tab) {
      setTab(item.tab);
      return;
    }
    if (target === "audit") setTab("audit");
  };

  return (
    <div className="saas-admin space-y-4">
        <Tabs value={tab} onValueChange={setTab}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <TabsList className="h-auto flex-wrap">
              <TabsTrigger value="painel">Painel</TabsTrigger>
              <TabsTrigger value="clinics">Clínicas</TabsTrigger>
              <TabsTrigger value="commercial">Comercial</TabsTrigger>
              <TabsTrigger value="plans">Planos contratados</TabsTrigger>
              <TabsTrigger value="catalog">Catálogo de Planos</TabsTrigger>
              <TabsTrigger value="audit">Auditoria</TabsTrigger>
            </TabsList>
            <Dialog open={openNew} onOpenChange={setOpenNew}>
              <DialogTrigger asChild>
                <Button className="shrink-0">
                  <Plus className="h-4 w-4 mr-2" /> Nova clínica
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Provisionar nova clínica</DialogTitle>
                </DialogHeader>
                <NewClinicForm onDone={() => setOpenNew(false)} />
              </DialogContent>
            </Dialog>
          </div>
          <TabsContent value="painel" className="mt-4">
            <DashboardTab
              onNavigate={handleSaasNav}
              onNewClinic={() => setOpenNew(true)}
              onOpenAudit={() => setTab("audit")}
            />
          </TabsContent>
          <TabsContent value="clinics" className="mt-4">
            <ClinicsTab />
          </TabsContent>
          <TabsContent value="commercial" className="mt-4">
            <CommercialTab />
          </TabsContent>
          <TabsContent value="plans" className="mt-4">
            <PlansShowcaseTab />
          </TabsContent>
          <TabsContent value="catalog" className="mt-4">
            <CatalogTab />
          </TabsContent>
          <TabsContent value="audit" className="mt-4">
            <AuditTab />
          </TabsContent>
        </Tabs>
    </div>
  );
}

const STATUS_LABEL: Record<string, string> = {
  active: "Ativo",
  inactive: "Inativo",
  suspended: "Suspenso",
  trial: "Teste",
  canceled: "Cancelado",
};

const SEGMENT_LABEL: Record<ClinicListSegment, string> = {
  production: "Produção",
  test: "Teste",
  inactive: "Inativa/Cancelada",
  all: "Todas",
};

type ClinicConfirmAction =
  | { kind: "inactive" | "suspend" | "cancel" | "reactivate"; clinic: any }
  | { kind: "mark_test"; clinic: any };

// ============================================================
// Dashboard
// ============================================================
function DashboardTab({
  onNavigate,
  onNewClinic,
  onOpenAudit,
}: {
  onNavigate: (target: SaasNavTarget) => void;
  onNewClinic: () => void;
  onOpenAudit: () => void;
}) {
  const fetchDash = useServerFn(getSaasDashboard);
  const { data, isLoading } = useQuery({
    queryKey: ["saas-dashboard"],
    queryFn: () => fetchDash(),
  });

  if (isLoading || !data) return <SaasDashboardSkeleton />;

  return (
    <div className="space-y-6">
      <SaasDashboardPanel
        data={data as SaasDashboardData}
        onNavigate={onNavigate}
        onNewClinic={onNewClinic}
        onOpenAudit={onOpenAudit}
      />
      <SaasDiagnosticPanel />
    </div>
  );
}

function SaasDiagnosticPanel() {
  const fetchDiagnostic = useServerFn(getSaasClinicDiagnostic);
  const [run, setRun] = useState(false);
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["saas-clinic-diagnostic"],
    queryFn: () => fetchDiagnostic(),
    enabled: run,
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Search className="h-4 w-4" /> Diagnóstico de clínicas (somente leitura)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Inventário completo antes de inativar clínicas de teste. Nenhum dado é alterado nesta
          etapa.
        </p>
        <Button
          variant="outline"
          size="sm"
          disabled={isLoading || isFetching}
          onClick={() => {
            setRun(true);
            void refetch();
          }}
        >
          {isFetching ? "Gerando relatório…" : "Executar diagnóstico"}
        </Button>
        {data && (
          <div className="space-y-3 text-sm">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{data.total} clínicas</Badge>
              <Badge variant="default">{data.protected?.length ?? 0} Move+ protegida(s)</Badge>
              <Badge variant="secondary">{data.test_candidates?.length ?? 0} candidata(s) teste</Badge>
              {(data.active_test_clinics?.length ?? 0) > 0 && (
                <Badge variant="destructive">
                  {data.active_test_clinics.length} teste ainda ativa(s)
                </Badge>
              )}
            </div>
            {(data.recommended_actions?.length ?? 0) > 0 && (
              <div className="rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/20 p-3">
                <p className="font-medium text-amber-900 dark:text-amber-100 mb-2">
                  Ações recomendadas (requer confirmação na aba Clínicas)
                </p>
                <ul className="space-y-1 text-xs">
                  {data.recommended_actions.map((a: any) => (
                    <li key={a.clinic_id}>
                      <strong>{a.nome}</strong> — {a.note}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="max-h-64 overflow-auto border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Clínica</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Segmento</TableHead>
                    <TableHead>Pac.</TableHead>
                    <TableHead>Docs</TableHead>
                    <TableHead>Membros</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data.clinics ?? []).map((c: any) => (
                    <TableRow key={c.id}>
                      <TableCell className="text-xs">
                        <div className="font-medium flex items-center gap-1">
                          {c.protected && <Shield className="h-3 w-3 text-primary" />}
                          {c.nome_fantasia ?? c.nome}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{STATUS_LABEL[c.status] ?? c.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={c.segment === "test" ? "secondary" : "outline"}>
                          {SEGMENT_LABEL[c.segment as ClinicListSegment] ?? c.segment}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-xs">{c.counts.patients}</TableCell>
                      <TableCell className="text-right text-xs">{c.counts.documents}</TableCell>
                      <TableCell className="text-right text-xs">{c.counts.members}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="text-xs text-muted-foreground">
              Gerado em {new Date(data.generated_at).toLocaleString("pt-BR")}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================
// Comercial SaaS
// ============================================================
const COMMERCIAL_STATUS_LABEL: Record<string, string> = {
  active: "Ativa",
  trial: "Trial",
  suspended: "Suspensa",
  canceled: "Cancelada",
  inactive: "Inativa",
  none: "Sem plano",
  open: "Em aberto",
  overdue: "Vencida",
};

const RISK_LABEL: Record<string, string> = {
  baixo: "Baixo",
  medio: "Médio",
  alto: "Alto",
};

function fmtDateTime(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("pt-BR");
}

function CommercialTab() {
  const fetchCommercial = useServerFn(getSaasCommercialCenter);
  const { data, isLoading } = useQuery({
    queryKey: ["saas-commercial-center"],
    queryFn: () => fetchCommercial(),
  });

  if (isLoading || !data) {
    return <p className="text-sm text-muted-foreground">Carregando estrutura comercial...</p>;
  }

  const commercial = data as SaasCommercialCenterData;
  const subscriptions = commercial.subscriptions;
  const fees = commercial.monthly_fees.slice(0, 12);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <CommercialKpi label="MRR estimado" value={BRL(commercial.summary.estimated_mrr)} hint="Contratos ativos, sem gateway" />
        <CommercialKpi label="Assinaturas ativas" value={String(commercial.summary.active_subscriptions)} hint={`${commercial.summary.trials} trial(s)`} />
        <CommercialKpi label="Próximos vencimentos" value={String(commercial.upcoming_due.length)} hint={`${commercial.summary.overdue} vencida(s)`} />
        <CommercialKpi label="Health médio" value={String(commercial.summary.average_health_score)} hint={`${commercial.summary.at_risk} clínica(s) em risco alto`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Visão comercial por clínica</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Clínica</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">Health</TableHead>
                  <TableHead>Risco</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptions.map((row) => (
                  <TableRow key={row.clinic_id}>
                    <TableCell>
                      <div className="font-medium">{row.clinic_name}</div>
                      <div className="text-xs text-muted-foreground">/{row.clinic_slug ?? "sem-slug"}</div>
                    </TableCell>
                    <TableCell>
                      <div>{row.plan_name}</div>
                      <div className="text-xs text-muted-foreground">{row.limits.modules.length} módulo(s)</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={row.plan_status === "active" ? "default" : "secondary"}>
                        {COMMERCIAL_STATUS_LABEL[row.plan_status] ?? row.plan_status}
                      </Badge>
                    </TableCell>
                    <TableCell>{fmtDateTime(row.next_due_at)}</TableCell>
                    <TableCell className="text-right">{BRL(row.monthly_value)}</TableCell>
                    <TableCell className="text-right">{row.health_score}</TableCell>
                    <TableCell>
                      <Badge variant={row.churn_risk === "alto" ? "destructive" : row.churn_risk === "medio" ? "secondary" : "outline"}>
                        {RISK_LABEL[row.churn_risk]}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Alertas comerciais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <CommercialAlertList
              title="Trials vencendo"
              rows={commercial.trials_expiring.map((r) => ({
                id: r.clinic_id,
                title: r.clinic_name,
                meta: fmtDateTime(r.trial_ends_at),
              }))}
            />
            <CommercialAlertList
              title="Inadimplência projetada"
              rows={commercial.overdue.map((r) => ({
                id: r.clinic_id,
                title: r.clinic_name,
                meta: `${BRL(r.amount)} · ${fmtDateTime(r.due_at)}`,
              }))}
            />
            <CommercialAlertList
              title="Risco de churn"
              rows={commercial.at_risk.map((r) => ({
                id: r.clinic_id,
                title: r.clinic_name,
                meta: `Health ${r.health_score} · ${r.usage.clinical_activity_30d} atividade(s)`,
              }))}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Mensalidades SaaS</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Clínica</TableHead>
                  <TableHead>Competência</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fees.map((fee) => (
                  <TableRow key={`${fee.clinic_id}-${fee.competence}`}>
                    <TableCell>{fee.clinic_name}</TableCell>
                    <TableCell>{fee.competence}</TableCell>
                    <TableCell>{fmtDateTime(fee.due_at)}</TableCell>
                    <TableCell>
                      <Badge variant={fee.status === "overdue" ? "destructive" : "outline"}>
                        {COMMERCIAL_STATUS_LABEL[fee.status] ?? fee.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{BRL(fee.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Histórico comercial recente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {commercial.history.slice(0, 12).map((event) => (
                <div key={event.id} className="flex items-start justify-between gap-3 border-b py-2 last:border-0">
                  <div>
                    <div className="text-sm font-medium">{event.clinic_name ?? "Plataforma"}</div>
                    <div className="text-xs text-muted-foreground">{event.action}</div>
                  </div>
                  <div className="text-xs text-muted-foreground">{fmtDateTime(event.created_at)}</div>
                </div>
              ))}
              {commercial.history.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhum evento comercial registrado.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Limites e uso por plano</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Clínica</TableHead>
                <TableHead>Usuários</TableHead>
                <TableHead>Pacientes</TableHead>
                <TableHead>Documentos/mês</TableHead>
                <TableHead>Storage</TableHead>
                <TableHead>Atividade 30d</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscriptions.map((row) => (
                <TableRow key={`limits-${row.clinic_id}`}>
                  <TableCell>{row.clinic_name}</TableCell>
                  <TableCell>{row.usage.users} / {row.limits.max_users ?? "∞"}</TableCell>
                  <TableCell>{row.usage.patients} / {row.limits.max_patients ?? "∞"}</TableCell>
                  <TableCell>{row.usage.documents_month} / {row.limits.max_documents_month ?? "∞"}</TableCell>
                  <TableCell>{row.limits.max_storage_mb ? `${row.limits.max_storage_mb} MB` : "∞"}</TableCell>
                  <TableCell>{row.usage.clinical_activity_30d}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function CommercialKpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="mt-1 text-2xl font-bold">{value}</div>
        {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
      </CardContent>
    </Card>
  );
}

function CommercialAlertList({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ id: string; title: string; meta: string }>;
}) {
  return (
    <div>
      <div className="mb-1 text-xs font-semibold uppercase text-muted-foreground">{title}</div>
      {rows.length ? (
        <div className="space-y-1">
          {rows.slice(0, 5).map((row) => (
            <div key={row.id} className="flex justify-between gap-2 rounded-md border px-2 py-1.5">
              <span className="truncate">{row.title}</span>
              <span className="shrink-0 text-muted-foreground">{row.meta}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Sem alertas.</p>
      )}
    </div>
  );
}

// ============================================================
// Clinics
// ============================================================
function ClinicsTab() {
  const fetchClinics = useServerFn(listClinicsAdmin);
  const fetchPlans = useServerFn(listPlans);
  const setStatus = useServerFn(setClinicStatus);
  const markTest = useServerFn(markClinicAsTest);
  const startTrial = useServerFn(startClinicTrial);
  const extendTrial = useServerFn(extendClinicTrial);
  const convertTrial = useServerFn(convertTrialToActive);
  const cancelSub = useServerFn(cancelClinicSubscription);
  const assign = useServerFn(assignPlan);
  const resendOwner = useServerFn(resendOwnerInvite);
  const cancelOwner = useServerFn(cancelOwnerInvite);
  const changeOwner = useServerFn(changeClinicOwner);
  const qc = useQueryClient();
  const [detail, setDetail] = useState<any | null>(null);
  const [changeOwnerFor, setChangeOwnerFor] = useState<any | null>(null);
  const [deleteFor, setDeleteFor] = useState<any | null>(null);
  const [newOwnerEmail, setNewOwnerEmail] = useState("");
  const [segmentFilter, setSegmentFilter] = useState<ClinicListSegment>("production");
  const [statusFilter, setStatusFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [confirmAction, setConfirmAction] = useState<ClinicConfirmAction | null>(null);
  const [confirmName, setConfirmName] = useState("");

  const listFilters = {
    segment: segmentFilter,
    status: statusFilter !== "all" ? statusFilter : undefined,
    plan_code: planFilter !== "all" ? planFilter : undefined,
  };

  const { data, isLoading, error, isError } = useQuery({
    queryKey: ["admin-saas-clinics", listFilters],
    queryFn: () => fetchClinics({ data: listFilters }),
  });
  const { data: plans } = useQuery({
    queryKey: ["saas-plans"],
    queryFn: () => fetchPlans(),
  });

  const statusMut = useMutation({
    mutationFn: (input: {
      id: string;
      status: "active" | "inactive" | "suspended" | "canceled";
    }) => setStatus({ data: input }),
    onSuccess: () => {
      toast.success("Status atualizado");
      setConfirmAction(null);
      setConfirmName("");
      qc.invalidateQueries({ queryKey: ["admin-saas-clinics"] });
      qc.invalidateQueries({ queryKey: ["saas-dashboard"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const trialMut = useMutation({
    mutationFn: (input: { clinic_id: string; action: "start" | "extend" | "convert"; days?: number }) => {
      if (input.action === "start") {
        return startTrial({ data: { clinic_id: input.clinic_id, days: input.days ?? 14 } });
      }
      if (input.action === "extend") {
        return extendTrial({ data: { clinic_id: input.clinic_id, days: input.days ?? 14 } });
      }
      return convertTrial({ data: { clinic_id: input.clinic_id } });
    },
    onSuccess: () => {
      toast.success("Trial atualizado");
      qc.invalidateQueries({ queryKey: ["admin-saas-clinics"] });
      qc.invalidateQueries({ queryKey: ["saas-dashboard"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const cancelSubMut = useMutation({
    mutationFn: (clinic_id: string) => cancelSub({ data: { clinic_id } }),
    onSuccess: () => {
      toast.success("Assinatura cancelada — dados preservados");
      setConfirmAction(null);
      setConfirmName("");
      qc.invalidateQueries({ queryKey: ["admin-saas-clinics"] });
      qc.invalidateQueries({ queryKey: ["saas-dashboard"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const markTestMut = useMutation({
    mutationFn: (input: { clinic_id: string; confirm_name: string }) =>
      markTest({ data: input }),
    onSuccess: () => {
      toast.success("Clínica marcada como teste — dados preservados");
      setConfirmAction(null);
      setConfirmName("");
      qc.invalidateQueries({ queryKey: ["admin-saas-clinics"] });
      qc.invalidateQueries({ queryKey: ["saas-dashboard"] });
      qc.invalidateQueries({ queryKey: ["saas-clinic-diagnostic"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const executeConfirmAction = () => {
    if (!confirmAction) return;
    const { clinic, kind } = confirmAction as { clinic: any; kind: string };
    if (kind === "mark_test") {
      markTestMut.mutate({ clinic_id: clinic.id, confirm_name: confirmName });
      return;
    }
    if (kind === "inactive") statusMut.mutate({ id: clinic.id, status: "inactive" });
    else if (kind === "suspend") statusMut.mutate({ id: clinic.id, status: "suspended" });
    else if (kind === "cancel") cancelSubMut.mutate(clinic.id);
    else if (kind === "reactivate") statusMut.mutate({ id: clinic.id, status: "active" });
  };

  const planMut = useMutation({
    mutationFn: (input: { clinic_id: string; plan_code: string }) =>
      assign({ data: input }),
    onSuccess: () => {
      toast.success("Plano atualizado");
      qc.invalidateQueries({ queryKey: ["admin-saas-clinics"] });
      qc.invalidateQueries({ queryKey: ["saas-dashboard"] });
      qc.invalidateQueries({ queryKey: ["saas-plans"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const resendMut = useMutation({
    mutationFn: (clinic_id: string) => resendOwner({ data: { clinic_id } }),
    onSuccess: () => {
      toast.success("Convite reenviado ao proprietário.");
      qc.invalidateQueries({ queryKey: ["admin-saas-clinics"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const cancelMut = useMutation({
    mutationFn: (clinic_id: string) => cancelOwner({ data: { clinic_id } }),
    onSuccess: () => {
      toast.success("Convite cancelado.");
      qc.invalidateQueries({ queryKey: ["admin-saas-clinics"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const changeOwnerMut = useMutation({
    mutationFn: (input: { clinic_id: string; new_email: string }) =>
      changeOwner({ data: input }),
    onSuccess: (res: any) => {
      toast.success(
        res?.pending
          ? "Novo proprietário convidado. Ele receberá um e-mail."
          : "Proprietário atualizado.",
      );
      setChangeOwnerFor(null);
      setNewOwnerEmail("");
      qc.invalidateQueries({ queryKey: ["admin-saas-clinics"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando...</p>;
  if (isError) {
    return (
      <Card>
        <CardContent className="p-4 text-sm text-destructive">
          Não foi possível carregar clínicas: {(error as Error)?.message ?? "erro desconhecido"}
        </CardContent>
      </Card>
    );
  }

  const planOptions = (plans ?? []).filter((p: any) => p.active);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Segmento</Label>
            <Select
              value={segmentFilter}
              onValueChange={(v) => setSegmentFilter(v as ClinicListSegment)}
            >
              <SelectTrigger className="h-9 w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(SEGMENT_LABEL) as ClinicListSegment[]).map((k) => (
                  <SelectItem key={k} value={k}>
                    {SEGMENT_LABEL[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {Object.entries(STATUS_LABEL).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Plano</Label>
            <Select value={planFilter} onValueChange={setPlanFilter}>
              <SelectTrigger className="h-9 w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {planOptions.map((p: any) => (
                  <SelectItem key={p.code} value={p.code}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground ml-auto">
            {(data ?? []).length} clínica(s) · padrão: produção ativa
          </p>
        </div>
      </CardHeader>
      <CardContent className="p-0 pt-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Segmento</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Plano</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Trial até</TableHead>
              <TableHead className="text-right">Dias</TableHead>
              <TableHead>Última atualização</TableHead>
              <TableHead>Proprietário</TableHead>
              <TableHead className="text-right">Usuários</TableHead>
              <TableHead className="text-right">Pacientes</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data ?? []).map((c: any) => {
              const operational = resolveOperationalStatus({
                clinic_status: c.status,
                plan_status: c.plan_status,
                trial_ends_at: c.trial_ends_at,
              });
              const blocked = ["inactive", "suspended", "canceled"].includes(c.status);
              const ownerLabel =
                c.owner_status === "active"
                  ? "Ativo"
                  : c.owner_status === "pending"
                    ? "Convite Pendente"
                    : c.owner_status === "expired"
                      ? "Convite Expirado"
                      : "Sem Proprietário";
              const ownerVariant: any =
                c.owner_status === "active"
                  ? "default"
                  : c.owner_status === "expired"
                    ? "destructive"
                    : c.owner_status === "pending"
                      ? "secondary"
                      : "outline";
              return (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-1">
                      {c.protected && <Shield className="h-3.5 w-3.5 text-primary shrink-0" />}
                      <span>{c.nome_fantasia ?? c.nome}</span>
                    </div>
                    {c.test_candidate && !c.is_test && (
                      <Badge variant="outline" className="mt-1 text-[10px]">
                        candidata teste
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={c.segment === "test" ? "secondary" : c.segment === "inactive" ? "outline" : "default"}>
                      {SEGMENT_LABEL[c.segment as ClinicListSegment] ?? c.segment}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    /{c.slug ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={c.plan ?? planOptions[0]?.code ?? ""}
                      onValueChange={(v) =>
                        planMut.mutate({ clinic_id: c.id, plan_code: v })
                      }
                      disabled={c.protected}
                    >
                      <SelectTrigger className="h-8 w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {planOptions.map((p: any) => (
                          <SelectItem key={p.code} value={p.code}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        operational === "active" || operational === "trial"
                          ? "default"
                          : operational === "suspended" || operational === "canceled"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {OPERATIONAL_STATUS_LABEL[operational]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs tabular-nums">
                    {c.trial_ends_at
                      ? new Date(c.trial_ends_at).toLocaleDateString("pt-BR")
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right text-xs tabular-nums">
                    {c.plan_status === "trial" && c.trial_days_left != null
                      ? c.trial_days_left
                      : "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {c.updated_at
                      ? new Date(c.updated_at).toLocaleDateString("pt-BR")
                      : "—"}
                  </TableCell>
                  <TableCell className="text-xs">
                    <div className="flex flex-col gap-1">
                      <Badge variant={ownerVariant} className="w-fit">
                        {ownerLabel}
                      </Badge>
                      {c.owner_email && (
                        <span
                          className="text-muted-foreground truncate max-w-[180px]"
                          title={c.owner_email}
                        >
                          {c.owner_email}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{c.user_count}</TableCell>
                  <TableCell className="text-right">{c.patient_count}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setDetail(c)}>
                          <Eye className="h-4 w-4 mr-2" /> Visualizar / Gerenciar
                        </DropdownMenuItem>
                        {(c.owner_status === "pending" ||
                          c.owner_status === "expired") && (
                          <>
                            <DropdownMenuItem
                              onClick={() => resendMut.mutate(c.id)}
                            >
                              <Users className="h-4 w-4 mr-2" /> Reenviar convite
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => cancelMut.mutate(c.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" /> Cancelar convite
                            </DropdownMenuItem>
                          </>
                        )}
                        <DropdownMenuItem
                          onClick={() => {
                            setNewOwnerEmail("");
                            setChangeOwnerFor(c);
                          }}
                        >
                          <UserCheck className="h-4 w-4 mr-2" /> Alterar
                          proprietário
                        </DropdownMenuItem>
                        {!blocked && !c.protected && (
                          <>
                            {c.plan_status !== "trial" && (
                              <DropdownMenuItem
                                onClick={() =>
                                  trialMut.mutate({ clinic_id: c.id, action: "start", days: 14 })
                                }
                              >
                                <Activity className="h-4 w-4 mr-2" /> Iniciar trial (14d)
                              </DropdownMenuItem>
                            )}
                            {c.plan_status === "trial" && (
                              <>
                                <DropdownMenuItem
                                  onClick={() =>
                                    trialMut.mutate({ clinic_id: c.id, action: "extend", days: 14 })
                                  }
                                >
                                  <Activity className="h-4 w-4 mr-2" /> Estender trial (+14d)
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    trialMut.mutate({ clinic_id: c.id, action: "convert" })
                                  }
                                >
                                  <Power className="h-4 w-4 mr-2" /> Converter trial → ativo
                                </DropdownMenuItem>
                              </>
                            )}
                            {!c.is_test && (c.test_candidate || c.segment === "test") && (
                              <DropdownMenuItem
                                onClick={() => {
                                  setConfirmName("");
                                  setConfirmAction({ kind: "mark_test", clinic: c });
                                }}
                              >
                                <FlaskConical className="h-4 w-4 mr-2" /> Marcar como teste
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => setConfirmAction({ kind: "inactive", clinic: c })}
                            >
                              <Power className="h-4 w-4 mr-2" /> Marcar inativa
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setConfirmAction({ kind: "suspend", clinic: c })}
                            >
                              <Power className="h-4 w-4 mr-2" /> Suspender acesso
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setConfirmAction({ kind: "cancel", clinic: c })}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" /> Cancelar assinatura
                            </DropdownMenuItem>
                          </>
                        )}
                        {blocked && !c.protected && (
                          <DropdownMenuItem
                            onClick={() => setConfirmAction({ kind: "reactivate", clinic: c })}
                          >
                            <Power className="h-4 w-4 mr-2" /> Reativar acesso
                          </DropdownMenuItem>
                        )}
                        {!c.protected && (
                        <DropdownMenuItem
                          onClick={() => setDeleteFor(c)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" /> Excluir clínica
                        </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
            {(data ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={12} className="text-center text-muted-foreground text-sm py-6">
                  Nenhuma clínica neste filtro.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
      <ClinicDetailDialog
        clinic={detail}
        open={!!detail}
        onOpenChange={(b) => !b && setDetail(null)}
      />
      <Dialog
        open={!!confirmAction}
        onOpenChange={(b) => {
          if (!b) {
            setConfirmAction(null);
            setConfirmName("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Confirmar ação · {confirmAction?.clinic?.nome_fantasia ?? confirmAction?.clinic?.nome}
            </DialogTitle>
          </DialogHeader>
          {confirmAction && (
            <div className="space-y-3 text-sm">
              {confirmAction.kind === "mark_test" && (
                <>
                  <p>
                    A clínica será marcada como <strong>teste</strong>, inativada e excluída das
                    métricas de produção. Pacientes, documentos e usuários <strong>não</strong>{" "}
                    serão apagados.
                  </p>
                  <div>
                    <Label>Digite o nome exato da clínica para confirmar</Label>
                    <Input
                      value={confirmName}
                      onChange={(e) => setConfirmName(e.target.value)}
                      placeholder={confirmAction.clinic.nome}
                    />
                  </div>
                </>
              )}
              {confirmAction.kind === "inactive" && (
                <p>
                  Inativar a clínica bloqueia o acesso operacional. Nenhum dado clínico será
                  apagado.
                </p>
              )}
              {confirmAction.kind === "suspend" && (
                <p>
                  Suspender bloqueia o acesso imediatamente. Dados preservados para reativação
                  futura.
                </p>
              )}
              {confirmAction.kind === "cancel" && (
                <p>
                  Cancelar a assinatura encerra o contrato comercial. Dados clínicos, financeiros
                  e usuários permanecem no sistema.
                </p>
              )}
              {confirmAction.kind === "reactivate" && (
                <p>Reativar restaura o acesso operacional conforme o plano vigente.</p>
              )}
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setConfirmAction(null)}>
                  Voltar
                </Button>
                <Button
                  variant={
                    confirmAction.kind === "cancel" || confirmAction.kind === "mark_test"
                      ? "destructive"
                      : "default"
                  }
                  disabled={
                    confirmAction.kind === "mark_test" &&
                    !confirmName.trim()
                  }
                  onClick={executeConfirmAction}
                >
                  Confirmar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!changeOwnerFor}
        onOpenChange={(b) => {
          if (!b) {
            setChangeOwnerFor(null);
            setNewOwnerEmail("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Alterar proprietário · {changeOwnerFor?.nome}
            </DialogTitle>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!changeOwnerFor) return;
              changeOwnerMut.mutate({
                clinic_id: changeOwnerFor.id,
                new_email: newOwnerEmail,
              });
            }}
          >
            <div>
              <Label>Novo e-mail do proprietário</Label>
              <Input
                type="email"
                value={newOwnerEmail}
                onChange={(e) => setNewOwnerEmail(e.target.value)}
                placeholder="novo-owner@clinica.com"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Se o e-mail ainda não tiver conta, o sistema enviará um convite
                automaticamente.
              </p>
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={changeOwnerMut.isPending}
            >
              {changeOwnerMut.isPending ? "Salvando..." : "Confirmar"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
      <DeleteClinicDialog
        clinic={deleteFor}
        open={!!deleteFor}
        onOpenChange={(b) => !b && setDeleteFor(null)}
        onDeleted={() => {
          setDeleteFor(null);
          qc.invalidateQueries({ queryKey: ["admin-saas-clinics"] });
          qc.invalidateQueries({ queryKey: ["saas-dashboard"] });
        }}
      />
    </Card>
  );
}

function DeleteClinicDialog({
  clinic,
  open,
  onOpenChange,
  onDeleted,
}: {
  clinic: any | null;
  open: boolean;
  onOpenChange: (b: boolean) => void;
  onDeleted: () => void;
}) {
  const fetchCounts = useServerFn(getClinicCounts);
  const doDelete = useServerFn(softDeleteClinic);
  const [confirmName, setConfirmName] = useState("");
  const [ackDocs, setAckDocs] = useState(false);

  const { data: info, isLoading } = useQuery({
    queryKey: ["clinic-counts", clinic?.id],
    enabled: !!clinic?.id && open,
    queryFn: () => fetchCounts({ data: { id: clinic.id } }),
  });

  const mut = useMutation({
    mutationFn: () =>
      doDelete({
        data: {
          id: clinic.id,
          confirm_name: confirmName,
          acknowledge_documents: ackDocs,
        },
      }),
    onSuccess: () => {
      toast.success("Clínica excluída (soft delete). Dados preservados para recuperação.");
      setConfirmName("");
      setAckDocs(false);
      onDeleted();
    },
    onError: (e: any) => toast.error(e.message),
  });

  useEffect(() => {
    if (!open) {
      setConfirmName("");
      setAckDocs(false);
    }
  }, [open]);

  if (!clinic) return null;
  const expected = clinic.slug || clinic.nome;
  const requiredText = expected;
  const counts = info?.counts;
  const hasDocs = (counts?.documents ?? 0) > 0;
  const canDelete =
    confirmName.trim() === requiredText && (!hasDocs || ackDocs) && !mut.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-destructive flex items-center gap-2">
            <Trash2 className="h-4 w-4" /> Excluir clínica · {clinic.nome}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-destructive">
            Ação sensível. Será aplicada exclusão lógica (soft delete): a clínica deixa de
            aparecer no Painel e seus membros perdem acesso, mas dados ficam recuperáveis.
          </div>

          {isLoading ? (
            <p className="text-muted-foreground">Carregando contadores…</p>
          ) : counts ? (
            <div className="grid grid-cols-2 gap-2 text-xs">
              <Counter label="Pacientes" value={counts.patients} />
              <Counter label="Documentos clínicos" value={counts.documents} />
              <Counter label="Profissionais" value={counts.professionals} />
              <Counter label="Membros" value={counts.members} />
            </div>
          ) : null}

          {hasDocs && (
            <label className="flex items-start gap-2 text-xs">
              <Checkbox
                checked={ackDocs}
                onCheckedChange={(v) => setAckDocs(!!v)}
              />
              <span>
                Confirmo que esta clínica possui <strong>{counts?.documents}</strong> documentos
                clínicos emitidos e mesmo assim desejo excluí-la.
              </span>
            </label>
          )}

          <div>
            <Label className="text-xs">
              Digite <code className="font-mono">{requiredText}</code> para confirmar:
            </Label>
            <Input
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              placeholder={requiredText}
              className="mt-1"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mut.isPending}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={!canDelete}
              onClick={() => mut.mutate()}
            >
              {mut.isPending ? "Excluindo…" : "Excluir clínica"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Counter({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border bg-muted/40 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-base font-semibold">{value}</div>
    </div>
  );
}




// ============================================================
// Showcase comercial (read-only, exatamente como vendido)
// ============================================================
function PlansShowcaseTab() {
  const fetchPlans = useServerFn(listPlans);
  const { data, isLoading } = useQuery({
    queryKey: ["saas-plans"],
    queryFn: () => fetchPlans(),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando...</p>;

  const visible = (data ?? []).filter((p: any) => p.active);

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {visible.map((p: any) => (
        <Card
          key={p.id}
          className={p.featured ? "border-primary ring-1 ring-primary/40" : ""}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{p.name}</CardTitle>
              {p.featured && (
                <Badge className="gap-1">
                  <Star className="h-3 w-3" /> Destaque
                </Badge>
              )}
            </div>
            {p.description && (
              <p className="text-xs text-muted-foreground mt-1">{p.description}</p>
            )}
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="text-2xl font-bold">
              {BRL(p.monthly_price ?? p.price_cents / 100)}
              <span className="text-xs font-normal text-muted-foreground">/mês</span>
            </div>
            {p.annual_price != null && (
              <div className="text-xs text-muted-foreground">
                ou {BRL(p.annual_price)}/ano
              </div>
            )}
            <ul className="text-xs space-y-1 text-muted-foreground pt-2 border-t">
              <li>
                Usuários:{" "}
                <strong className="text-foreground">{p.max_users ?? "ilimitado"}</strong>
              </li>
              <li>
                Pacientes:{" "}
                <strong className="text-foreground">{p.max_patients ?? "ilimitado"}</strong>
              </li>
              <li>
                Documentos/mês:{" "}
                <strong className="text-foreground">
                  {p.max_documents_month ?? "ilimitado"}
                </strong>
              </li>
              <li>
                Armazenamento:{" "}
                <strong className="text-foreground">
                  {p.max_storage_mb ? `${p.max_storage_mb} MB` : "ilimitado"}
                </strong>
              </li>
            </ul>
            <div className="flex flex-wrap gap-1 pt-2 border-t">
              {(p.modules ?? []).map((m: string) => {
                const lbl = MODULE_CATALOG.find((x) => x.key === m)?.label ?? m;
                return (
                  <Badge key={m} variant="secondary" className="text-[10px]">
                    {lbl}
                  </Badge>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}
      {visible.length === 0 && (
        <p className="text-sm text-muted-foreground col-span-full">
          Nenhum plano ativo. Crie um no catálogo.
        </p>
      )}
    </div>
  );
}

// ============================================================
// Catálogo CRUD
// ============================================================
type PlanRow = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  monthly_price: number | null;
  annual_price: number | null;
  price_cents: number;
  max_users: number | null;
  max_patients: number | null;
  max_documents_month: number | null;
  max_storage_mb: number | null;
  modules: string[];
  active: boolean;
  featured: boolean;
  sort_order: number;
  in_use: number;
};

function CatalogTab() {
  const fetchPlans = useServerFn(listPlans);
  const reorder = useServerFn(reorderPlans);
  const toggle = useServerFn(togglePlanActive);
  const dup = useServerFn(duplicatePlan);
  const del = useServerFn(deletePlan);
  const qc = useQueryClient();

  const [editing, setEditing] = useState<PlanRow | null>(null);
  const [creating, setCreating] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["saas-plans"],
    queryFn: () => fetchPlans(),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["saas-plans"] });
    qc.invalidateQueries({ queryKey: ["saas-dashboard"] });
  };

  const reorderMut = useMutation({
    mutationFn: (order: string[]) => reorder({ data: { order } }),
    onSuccess: invalidate,
    onError: (e: any) => toast.error(e.message),
  });
  const toggleMut = useMutation({
    mutationFn: (v: { id: string; active: boolean }) => toggle({ data: v }),
    onSuccess: () => {
      toast.success("Atualizado");
      invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });
  const dupMut = useMutation({
    mutationFn: (id: string) => dup({ data: { id } }),
    onSuccess: () => {
      toast.success("Plano duplicado");
      invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });
  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      toast.success("Plano excluído");
      invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando...</p>;

  const rows: PlanRow[] = data ?? [];

  const move = (idx: number, dir: -1 | 1) => {
    const next = [...rows];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    reorderMut.mutate(next.map((r) => r.id));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {rows.length} plano(s) no catálogo. Reordene com as setas; planos em uso não podem ser excluídos.
        </p>
        <Dialog open={creating} onOpenChange={setCreating}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" /> Novo plano
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Novo plano</DialogTitle>
            </DialogHeader>
            <PlanForm
              onDone={() => {
                setCreating(false);
                invalidate();
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">Ordem</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Preço</TableHead>
                <TableHead className="text-right">Limites</TableHead>
                <TableHead className="text-right">Em uso</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((p, idx) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        disabled={idx === 0}
                        onClick={() => move(idx, -1)}
                      >
                        <ArrowUp className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        disabled={idx === rows.length - 1}
                        onClick={() => move(idx, 1)}
                      >
                        <ArrowDown className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium flex items-center gap-2">
                      {p.name}
                      {p.featured && <Star className="h-3 w-3 fill-primary text-primary" />}
                    </div>
                    <div className="text-xs text-muted-foreground">{p.code}</div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {BRL(p.monthly_price ?? p.price_cents / 100)}/mês
                    {p.annual_price != null && (
                      <div className="text-xs text-muted-foreground">
                        {BRL(p.annual_price)}/ano
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">
                    {p.max_users ?? "∞"}u · {p.max_patients ?? "∞"}p ·{" "}
                    {p.max_documents_month ?? "∞"}d/mês
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant={p.in_use > 0 ? "default" : "outline"}>
                      {p.in_use}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={p.active}
                      onCheckedChange={(v) =>
                        toggleMut.mutate({ id: p.id, active: v })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditing(p)}>
                          <Pencil className="h-4 w-4 mr-2" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => dupMut.mutate(p.id)}>
                          <Copy className="h-4 w-4 mr-2" /> Duplicar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={p.in_use > 0}
                          onClick={() => {
                            if (confirm(`Excluir plano "${p.name}"?`)) delMut.mutate(p.id);
                          }}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground text-sm py-6">
                    Nenhum plano cadastrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar plano</DialogTitle>
          </DialogHeader>
          {editing && (
            <PlanForm
              initial={editing}
              onDone={() => {
                setEditing(null);
                invalidate();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ------------------------------------------------------------
// Plan form
// ------------------------------------------------------------
function PlanForm({
  initial,
  onDone,
}: {
  initial?: PlanRow;
  onDone: () => void;
}) {
  const create = useServerFn(createPlan);
  const update = useServerFn(updatePlan);

  const [form, setForm] = useState({
    code: initial?.code ?? "",
    name: initial?.name ?? "",
    description: initial?.description ?? "",
    monthly_price: initial?.monthly_price?.toString() ?? "",
    annual_price: initial?.annual_price?.toString() ?? "",
    max_users: initial?.max_users?.toString() ?? "",
    max_patients: initial?.max_patients?.toString() ?? "",
    max_documents_month: initial?.max_documents_month?.toString() ?? "",
    max_storage_mb: initial?.max_storage_mb?.toString() ?? "",
    modules: new Set<string>(initial?.modules ?? []),
    active: initial?.active ?? true,
    featured: initial?.featured ?? false,
    sort_order: initial?.sort_order ?? 0,
  });

  const toNum = (v: string) =>
    v.trim() === "" ? null : Number(v.replace(",", "."));

  const payload = useMemo(
    () => ({
      code: form.code.trim().toLowerCase(),
      name: form.name.trim(),
      description: form.description.trim() || null,
      monthly_price: toNum(form.monthly_price),
      annual_price: toNum(form.annual_price),
      max_users: form.max_users ? parseInt(form.max_users, 10) : null,
      max_patients: form.max_patients ? parseInt(form.max_patients, 10) : null,
      max_documents_month: form.max_documents_month
        ? parseInt(form.max_documents_month, 10)
        : null,
      max_storage_mb: form.max_storage_mb
        ? parseInt(form.max_storage_mb, 10)
        : null,
      modules: Array.from(form.modules),
      active: form.active,
      featured: form.featured,
      sort_order: form.sort_order,
    }),
    [form],
  );

  const mut = useMutation({
    mutationFn: async () => {
      if (initial) return update({ data: { id: initial.id, patch: payload } });
      return create({ data: payload });
    },
    onSuccess: () => {
      toast.success(initial ? "Plano atualizado" : "Plano criado");
      onDone();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleModule = (k: string, on: boolean) => {
    setForm((prev) => {
      const m = new Set(prev.modules);
      if (on) m.add(k);
      else m.delete(k);
      return { ...prev, modules: m };
    });
  };

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        mut.mutate();
      }}
    >
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Código*</Label>
          <Input
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            required
            placeholder="ex: clinic-pro"
            disabled={!!initial}
          />
        </div>
        <div>
          <Label>Nome*</Label>
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </div>
      </div>

      <div>
        <Label>Descrição comercial</Label>
        <Textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Para clínicas em crescimento que precisam..."
          rows={2}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Valor mensal (R$)</Label>
          <Input
            value={form.monthly_price}
            onChange={(e) => setForm({ ...form, monthly_price: e.target.value })}
            inputMode="decimal"
            placeholder="199,00"
          />
        </div>
        <div>
          <Label>Valor anual (R$)</Label>
          <Input
            value={form.annual_price}
            onChange={(e) => setForm({ ...form, annual_price: e.target.value })}
            inputMode="decimal"
            placeholder="1990,00"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Máx. usuários</Label>
          <Input
            value={form.max_users}
            onChange={(e) => setForm({ ...form, max_users: e.target.value })}
            inputMode="numeric"
            placeholder="vazio = ilimitado"
          />
        </div>
        <div>
          <Label>Máx. pacientes</Label>
          <Input
            value={form.max_patients}
            onChange={(e) => setForm({ ...form, max_patients: e.target.value })}
            inputMode="numeric"
            placeholder="vazio = ilimitado"
          />
        </div>
        <div>
          <Label>Documentos/mês</Label>
          <Input
            value={form.max_documents_month}
            onChange={(e) =>
              setForm({ ...form, max_documents_month: e.target.value })
            }
            inputMode="numeric"
            placeholder="vazio = ilimitado"
          />
        </div>
        <div>
          <Label>Armazenamento (MB)</Label>
          <Input
            value={form.max_storage_mb}
            onChange={(e) => setForm({ ...form, max_storage_mb: e.target.value })}
            inputMode="numeric"
            placeholder="vazio = ilimitado"
          />
        </div>
      </div>

      <div>
        <Label className="mb-2 block">Módulos liberados</Label>
        <div className="grid grid-cols-2 gap-2 p-3 border rounded-md">
          {MODULE_CATALOG.map((m) => (
            <label key={m.key} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={form.modules.has(m.key)}
                onCheckedChange={(c) => toggleModule(m.key, c === true)}
              />
              {m.label}
            </label>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-6 flex-wrap">
        <label className="flex items-center gap-2 text-sm">
          <Switch
            checked={form.active}
            onCheckedChange={(v) => setForm({ ...form, active: v })}
          />
          Plano ativo
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Switch
            checked={form.featured}
            onCheckedChange={(v) => setForm({ ...form, featured: v })}
          />
          Destaque comercial
        </label>
        <div className="flex items-center gap-2 text-sm">
          <Label className="m-0">Ordem</Label>
          <Input
            value={String(form.sort_order)}
            onChange={(e) =>
              setForm({ ...form, sort_order: parseInt(e.target.value || "0", 10) })
            }
            inputMode="numeric"
            className="w-20 h-8"
          />
        </div>
      </div>

      <Button type="submit" disabled={mut.isPending} className="w-full">
        {mut.isPending ? "Salvando..." : "Salvar plano"}
      </Button>
    </form>
  );
}

// ============================================================
// New clinic form
// ============================================================
function NewClinicForm({ onDone }: { onDone: () => void }) {
  const provision = useServerFn(provisionClinic);
  const fetchPlans = useServerFn(listPlans);
  const qc = useQueryClient();
  const { data: plans } = useQuery({
    queryKey: ["saas-plans"],
    queryFn: () => fetchPlans(),
  });
  const planOptions = (plans ?? []).filter((p: any) => p.active);

  const [form, setForm] = useState({
    nome: "",
    plan_code: "",
    owner_email: "",
    nome_fantasia: "",
    cidade: "",
    estado: "",
    start_as_trial: false,
    trial_days: "14",
  });

  const set = (k: keyof typeof form, v: string | boolean) =>
    setForm((p) => ({ ...p, [k]: v }));

  const slugPreview = form.nome
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const mut = useMutation({
    mutationFn: (data: typeof form) =>
      provision({
        data: {
          ...data,
          plan_code: data.plan_code || planOptions[0]?.code || "starter",
          start_as_trial: data.start_as_trial,
          trial_days: Number(data.trial_days) || 14,
        },
      }),
    onSuccess: (res: any) => {
      toast.success(
        res?.owner_invited
          ? "Clínica criada com sucesso. O proprietário receberá um convite por e-mail para concluir o acesso."
          : `Clínica criada (/${res.slug ?? "—"})`,
      );
      qc.invalidateQueries({ queryKey: ["admin-saas-clinics"] });
      qc.invalidateQueries({ queryKey: ["saas-dashboard"] });
      onDone();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        mut.mutate(form);
      }}
    >
      <div>
        <Label>Nome da clínica*</Label>
        <Input
          value={form.nome}
          onChange={(e) => set("nome", e.target.value)}
          required
          placeholder="Ex: Fisio Vida"
        />
        {slugPreview && (
          <p className="text-xs text-muted-foreground mt-1">
            Slug previsto: <code>/{slugPreview}</code>
          </p>
        )}
      </div>
      <div>
        <Label>Nome fantasia</Label>
        <Input
          value={form.nome_fantasia}
          onChange={(e) => set("nome_fantasia", e.target.value)}
          placeholder="Opcional — usa nome se vazio"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Cidade</Label>
          <Input value={form.cidade} onChange={(e) => set("cidade", e.target.value)} />
        </div>
        <div>
          <Label>UF</Label>
          <Input
            value={form.estado}
            onChange={(e) => set("estado", e.target.value.toUpperCase())}
            maxLength={2}
          />
        </div>
      </div>
      <div>
        <Label>Plano*</Label>
        <Select value={form.plan_code} onValueChange={(v) => set("plan_code", v)}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione um plano" />
          </SelectTrigger>
          <SelectContent>
            {planOptions.map((p: any) => (
              <SelectItem key={p.code} value={p.code}>
                {p.name} — {BRL(p.monthly_price ?? p.price_cents / 100)}/mês
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
        <Checkbox
          id="start-as-trial"
          checked={form.start_as_trial}
          onCheckedChange={(v) => set("start_as_trial", !!v)}
        />
        <div className="flex-1">
          <Label htmlFor="start-as-trial" className="cursor-pointer">
            Iniciar em trial (liberar configuração sem pagamento)
          </Label>
          {form.start_as_trial && (
            <div className="mt-2 flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Dias</Label>
              <Input
                type="number"
                min={1}
                max={365}
                className="h-8 w-20"
                value={form.trial_days}
                onChange={(e) => set("trial_days", e.target.value)}
              />
            </div>
          )}
        </div>
      </div>
      <div>
        <Label>E-mail do owner (opcional)</Label>
        <Input
          type="email"
          value={form.owner_email}
          onChange={(e) => set("owner_email", e.target.value)}
          placeholder="owner@clinica.com"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Se o e-mail ainda não tiver conta, o sistema enviará um convite automaticamente.
        </p>
      </div>
      <Button type="submit" disabled={mut.isPending} className="w-full">
        {mut.isPending ? "Provisionando..." : "Criar clínica"}
      </Button>
    </form>
  );
}

// ============================================================
// Auditoria administrativa
// ============================================================
const AUDIT_ACTION_LABEL: Record<string, string> = {
  "plan.create": "Plano · criação",
  "plan.update": "Plano · edição",
  "plan.duplicate": "Plano · duplicação",
  "plan.activate": "Plano · ativação",
  "plan.deactivate": "Plano · inativação",
  "plan.delete": "Plano · exclusão",
  "clinic.create": "Clínica · criação",
  "clinic.activate": "Clínica · ativação",
  "clinic.deactivate": "Clínica · inativação",
  "clinic.suspend": "Clínica · suspensão",
  "clinic.cancel": "Clínica · cancelamento",
  "clinic.mark_test": "Clínica · marcada como teste",
  "clinic.trial_start": "Clínica · trial iniciado",
  "clinic.trial_extend": "Clínica · trial estendido",
  "clinic.trial_convert": "Clínica · trial convertido",
  "clinic.plan_change": "Clínica · troca de plano",
  "clinic.branding": "Clínica · identidade visual",
  "clinic.owner_invited": "Clínica · convite enviado",
  "clinic.owner_activated": "Clínica · proprietário ativado",
  "clinic.owner_reinvited": "Clínica · convite reenviado",
  "clinic.owner_changed": "Clínica · proprietário alterado",
  "clinic.owner_invite_canceled": "Clínica · convite cancelado",
};

function AuditTab() {
  const fetchAudit = useServerFn(listSaasAudit);
  const fetchClinics = useServerFn(listClinicsAdmin);
  const [clinicId, setClinicId] = useState<string>("");
  const [action, setAction] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const filters = {
    clinic_id: clinicId || undefined,
    action: action || undefined,
    from: from ? new Date(from).toISOString() : undefined,
    to: to ? new Date(to + "T23:59:59").toISOString() : undefined,
  };

  const { data: clinics } = useQuery({
    queryKey: ["admin-saas-clinics-mini"],
    queryFn: () => fetchClinics({ data: { segment: "all" } }),
  });
  const { data, isLoading } = useQuery({
    queryKey: ["saas-audit", filters],
    queryFn: () => fetchAudit({ data: filters as any }),
  });

  const rows = data ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Auditoria</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-2 sm:grid-cols-4">
          <Select value={clinicId || "__all"} onValueChange={(v) => setClinicId(v === "__all" ? "" : v)}>
            <SelectTrigger><SelectValue placeholder="Clínica" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">Todas as clínicas</SelectItem>
              {(clinics ?? []).map((c: any) => (
                <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input placeholder="Ação (ex: clinic., user., support.)" value={action} onChange={(e) => setAction(e.target.value)} />
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data/hora</TableHead>
              <TableHead>Ação</TableHead>
              <TableHead>Clínica</TableHead>
              <TableHead>Entidade</TableHead>
              <TableHead>Usuário</TableHead>
              <TableHead>Detalhes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center text-sm">Carregando...</TableCell></TableRow>
            ) : rows.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground text-sm py-6">Nenhum evento registrado.</TableCell></TableRow>
            ) : rows.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell className="text-xs whitespace-nowrap">{new Date(r.created_at).toLocaleString("pt-BR")}</TableCell>
                <TableCell><Badge variant="outline">{AUDIT_ACTION_LABEL[r.action] ?? r.action}</Badge></TableCell>
                <TableCell className="text-xs">{r.clinic_name ?? "—"}</TableCell>
                <TableCell className="text-xs">{r.entity_type}{r.entity_id && (<div className="text-muted-foreground font-mono">{String(r.entity_id).slice(0, 8)}…</div>)}</TableCell>
                <TableCell className="text-xs">{r.user_email ?? "—"}</TableCell>
                <TableCell className="text-[11px] text-muted-foreground max-w-md truncate">{r.details ? JSON.stringify(r.details) : r.new_data ? JSON.stringify(r.new_data) : "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}


import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/app-shell";
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
  listClinicsAdmin,
  setClinicStatus,
  provisionClinic,
  listPlans,
  assignPlan,
  createPlan,
  updatePlan,
  deletePlan,
  duplicatePlan,
  togglePlanActive,
  reorderPlans,
} from "@/lib/api/saas-admin.functions";
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
  const [tab, setTab] = useState("dashboard");
  const [openNew, setOpenNew] = useState(false);

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Building2 className="h-6 w-6" /> Admin SaaS
            </h1>
            <p className="text-muted-foreground text-sm">
              Gestão de clínicas, planos e operação multi-tenant do FisioOS.
            </p>
          </div>
          <Dialog open={openNew} onOpenChange={setOpenNew}>
            <DialogTrigger asChild>
              <Button>
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

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="clinics">Clínicas</TabsTrigger>
            <TabsTrigger value="plans">Planos contratados</TabsTrigger>
            <TabsTrigger value="catalog">Catálogo de Planos</TabsTrigger>
          </TabsList>
          <TabsContent value="dashboard" className="mt-4">
            <DashboardTab />
          </TabsContent>
          <TabsContent value="clinics" className="mt-4">
            <ClinicsTab />
          </TabsContent>
          <TabsContent value="plans" className="mt-4">
            <PlansShowcaseTab />
          </TabsContent>
          <TabsContent value="catalog" className="mt-4">
            <CatalogTab />
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}

// ============================================================
// Dashboard
// ============================================================
function DashboardTab() {
  const fetchDash = useServerFn(getSaasDashboard);
  const { data, isLoading } = useQuery({
    queryKey: ["saas-dashboard"],
    queryFn: () => fetchDash(),
  });

  if (isLoading || !data)
    return <p className="text-sm text-muted-foreground">Carregando indicadores...</p>;

  const maxGrowth = Math.max(1, ...data.growth.map((g: any) => g.count));

  return (
    <div className="space-y-6">
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <Kpi
          icon={<Building2 className="h-4 w-4" />}
          label="Clínicas ativas"
          value={String(data.clinics.active)}
          hint={`${data.clinics.inactive} inativa(s)`}
        />
        <Kpi
          icon={<DollarSign className="h-4 w-4" />}
          label="MRR estimado"
          value={BRL(data.mrr)}
          hint="Receita recorrente mensal"
        />
        <Kpi
          icon={<Users className="h-4 w-4" />}
          label="Usuários"
          value={String(data.users.total)}
        />
        <Kpi
          icon={<FileText className="h-4 w-4" />}
          label="Documentos"
          value={String(data.documents.total)}
          hint={`${data.documents.this_month} este mês`}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4" /> Distribuição por plano
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.plans.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem contratos ativos.</p>
            ) : (
              <ul className="space-y-2">
                {data.plans.map((p: any) => (
                  <li key={p.code} className="text-sm">
                    <div className="flex justify-between">
                      <span>{p.name}</span>
                      <span className="text-muted-foreground">
                        {p.count} · MRR {BRL(p.mrr)}
                      </span>
                    </div>
                    <div className="h-1.5 bg-muted rounded mt-1">
                      <div
                        className="h-1.5 bg-primary rounded"
                        style={{
                          width: `${
                            (p.count /
                              Math.max(
                                1,
                                data.plans.reduce(
                                  (a: number, x: any) => a + x.count,
                                  0,
                                ),
                              )) *
                            100
                          }%`,
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Crescimento de clínicas (6 meses)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 h-32">
              {data.growth.map((g: any) => (
                <div key={g.month} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full bg-primary/80 rounded-t"
                    style={{ height: `${(g.count / maxGrowth) * 100}%`, minHeight: 2 }}
                    title={`${g.count} clínica(s)`}
                  />
                  <span className="text-[10px] text-muted-foreground">{g.month}</span>
                  <span className="text-[10px] font-medium">{g.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" /> Últimas clínicas cadastradas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.recent_clinics.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma clínica cadastrada.</p>
          ) : (
            <ul className="divide-y">
              {data.recent_clinics.map((c: any) => (
                <li key={c.id} className="py-2 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sm">{c.nome}</div>
                    <div className="text-xs text-muted-foreground">/{c.slug}</div>
                  </div>
                  <div className="flex gap-2 items-center">
                    <Badge variant="outline">{c.plan ?? "—"}</Badge>
                    <Badge
                      variant={c.status === "active" ? "default" : "secondary"}
                    >
                      {c.status}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{label}</span>
          <span className="text-muted-foreground">{icon}</span>
        </div>
        <div className="text-2xl font-bold mt-1">{value}</div>
        {hint && <div className="text-xs text-muted-foreground mt-0.5">{hint}</div>}
      </CardContent>
    </Card>
  );
}

// ============================================================
// Clinics
// ============================================================
function ClinicsTab() {
  const fetchClinics = useServerFn(listClinicsAdmin);
  const fetchPlans = useServerFn(listPlans);
  const setStatus = useServerFn(setClinicStatus);
  const assign = useServerFn(assignPlan);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-saas-clinics"],
    queryFn: () => fetchClinics(),
  });
  const { data: plans } = useQuery({
    queryKey: ["saas-plans"],
    queryFn: () => fetchPlans(),
  });

  const statusMut = useMutation({
    mutationFn: (input: { id: string; status: "active" | "inactive" | "suspended" }) =>
      setStatus({ data: input }),
    onSuccess: () => {
      toast.success("Status atualizado");
      qc.invalidateQueries({ queryKey: ["admin-saas-clinics"] });
      qc.invalidateQueries({ queryKey: ["saas-dashboard"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

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

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando...</p>;

  const planOptions = (plans ?? []).filter((p: any) => p.active);

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome fantasia</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Plano</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Usuários</TableHead>
              <TableHead className="text-right">Pacientes</TableHead>
              <TableHead>Criada em</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data ?? []).map((c: any) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.nome}</TableCell>
                <TableCell className="text-muted-foreground text-xs">
                  /{c.slug ?? "—"}
                </TableCell>
                <TableCell>
                  <Select
                    value={c.plan ?? planOptions[0]?.code ?? ""}
                    onValueChange={(v) =>
                      planMut.mutate({ clinic_id: c.id, plan_code: v })
                    }
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
                      c.status === "active"
                        ? "default"
                        : c.status === "suspended"
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {c.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">{c.user_count}</TableCell>
                <TableCell className="text-right">{c.patient_count}</TableCell>
                <TableCell className="text-xs">
                  {new Date(c.created_at).toLocaleDateString("pt-BR")}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="ghost" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem disabled>
                        <Eye className="h-4 w-4 mr-2" /> Visualizar (Entrega 3)
                      </DropdownMenuItem>
                      {c.status === "active" ? (
                        <>
                          <DropdownMenuItem
                            onClick={() =>
                              statusMut.mutate({ id: c.id, status: "inactive" })
                            }
                          >
                            <Power className="h-4 w-4 mr-2" /> Inativar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              statusMut.mutate({ id: c.id, status: "suspended" })
                            }
                          >
                            <Power className="h-4 w-4 mr-2" /> Suspender
                          </DropdownMenuItem>
                        </>
                      ) : (
                        <DropdownMenuItem
                          onClick={() =>
                            statusMut.mutate({ id: c.id, status: "active" })
                          }
                        >
                          <Power className="h-4 w-4 mr-2" /> Ativar
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {(data ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground text-sm py-6">
                  Nenhuma clínica cadastrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
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
  });

  const set = (k: keyof typeof form, v: string) =>
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
        data: { ...data, plan_code: data.plan_code || planOptions[0]?.code || "starter" },
      }),
    onSuccess: (res: any) => {
      toast.success(`Clínica criada (/${res.slug ?? "—"})`);
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
      <div>
        <Label>E-mail do owner (opcional)</Label>
        <Input
          type="email"
          value={form.owner_email}
          onChange={(e) => set("owner_email", e.target.value)}
          placeholder="owner@clinica.com"
        />
        <p className="text-xs text-muted-foreground mt-1">
          O usuário precisa já existir no sistema. Gestão de convites: Entrega 2.
        </p>
      </div>
      <Button type="submit" disabled={mut.isPending} className="w-full">
        {mut.isPending ? "Provisionando..." : "Criar clínica"}
      </Button>
    </form>
  );
}

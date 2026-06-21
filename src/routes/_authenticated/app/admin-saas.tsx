import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  getSaasDashboard,
  listClinicsAdmin,
  setClinicStatus,
  provisionClinic,
  listPlans,
  assignPlan,
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

const PLAN_OPTIONS = [
  { code: "starter", label: "Starter" },
  { code: "professional", label: "Professional" },
  { code: "clinic", label: "Clinic" },
  { code: "enterprise", label: "Enterprise" },
] as const;

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
            <TabsTrigger value="plans">Planos</TabsTrigger>
          </TabsList>
          <TabsContent value="dashboard" className="mt-4">
            <DashboardTab />
          </TabsContent>
          <TabsContent value="clinics" className="mt-4">
            <ClinicsTab />
          </TabsContent>
          <TabsContent value="plans" className="mt-4">
            <PlansTab />
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

  if (isLoading || !data) {
    return <p className="text-sm text-muted-foreground">Carregando indicadores...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <Kpi
          icon={<Building2 className="h-4 w-4" />}
          label="Clínicas ativas"
          value={data.clinics.active}
          hint={`${data.clinics.inactive} inativa(s)`}
        />
        <Kpi
          icon={<Users className="h-4 w-4" />}
          label="Usuários"
          value={data.users.total}
        />
        <Kpi
          icon={<UserCheck className="h-4 w-4" />}
          label="Pacientes"
          value={data.patients.total}
        />
        <Kpi
          icon={<FileText className="h-4 w-4" />}
          label="Documentos"
          value={data.documents.total}
          hint={`${data.documents.this_month} este mês`}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
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
                      <Badge variant={c.status === "active" ? "default" : "secondary"}>
                        {c.status}
                      </Badge>
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
              <Package className="h-4 w-4" /> Planos contratados
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.plans.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem contratos ativos.</p>
            ) : (
              <ul className="space-y-1">
                {data.plans.map((p: any) => (
                  <li key={p.code} className="flex justify-between text-sm">
                    <span>{p.name}</span>
                    <span className="font-medium">{p.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Kpi({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: number; hint?: string }) {
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
  const setStatus = useServerFn(setClinicStatus);
  const assign = useServerFn(assignPlan);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-saas-clinics"],
    queryFn: () => fetchClinics(),
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
    mutationFn: (input: { clinic_id: string; plan_code: any }) => assign({ data: input }),
    onSuccess: () => {
      toast.success("Plano atualizado");
      qc.invalidateQueries({ queryKey: ["admin-saas-clinics"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando...</p>;

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
                <TableCell className="text-muted-foreground text-xs">/{c.slug ?? "—"}</TableCell>
                <TableCell>
                  <Select
                    value={c.plan ?? "starter"}
                    onValueChange={(v) => planMut.mutate({ clinic_id: c.id, plan_code: v })}
                  >
                    <SelectTrigger className="h-8 w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PLAN_OPTIONS.map((p) => (
                        <SelectItem key={p.code} value={p.code}>
                          {p.label}
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
                            onClick={() => statusMut.mutate({ id: c.id, status: "inactive" })}
                          >
                            <Power className="h-4 w-4 mr-2" /> Inativar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => statusMut.mutate({ id: c.id, status: "suspended" })}
                          >
                            <Power className="h-4 w-4 mr-2" /> Suspender
                          </DropdownMenuItem>
                        </>
                      ) : (
                        <DropdownMenuItem
                          onClick={() => statusMut.mutate({ id: c.id, status: "active" })}
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
// Plans
// ============================================================
function PlansTab() {
  const fetchPlans = useServerFn(listPlans);
  const { data, isLoading } = useQuery({
    queryKey: ["saas-plans"],
    queryFn: () => fetchPlans(),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando...</p>;

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {(data ?? []).map((p: any) => (
        <Card key={p.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{p.name}</CardTitle>
              <Badge variant="outline">{p.code}</Badge>
            </div>
            {p.description && (
              <p className="text-xs text-muted-foreground mt-1">{p.description}</p>
            )}
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="text-2xl font-bold">
              {(p.price_cents / 100).toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
              <span className="text-xs font-normal text-muted-foreground">/mês</span>
            </div>
            <ul className="text-xs space-y-1 text-muted-foreground pt-2 border-t">
              <li>Usuários: <strong className="text-foreground">{p.max_users ?? "ilimitado"}</strong></li>
              <li>Pacientes: <strong className="text-foreground">{p.max_patients ?? "ilimitado"}</strong></li>
              <li>Documentos/mês: <strong className="text-foreground">{p.max_documents_month ?? "ilimitado"}</strong></li>
              <li>Armazenamento: <strong className="text-foreground">{p.max_storage_mb ? `${p.max_storage_mb} MB` : "ilimitado"}</strong></li>
            </ul>
            <div className="flex flex-wrap gap-1 pt-2 border-t">
              {(p.modules ?? []).map((m: string) => (
                <Badge key={m} variant="secondary" className="text-[10px]">
                  {m}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ============================================================
// New clinic form
// ============================================================
function NewClinicForm({ onDone }: { onDone: () => void }) {
  const provision = useServerFn(provisionClinic);
  const qc = useQueryClient();
  const [form, setForm] = useState({
    nome: "",
    plan_code: "starter" as "starter" | "professional" | "clinic" | "enterprise",
    owner_email: "",
    nome_fantasia: "",
    cidade: "",
    estado: "",
  });

  const set = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const slugPreview = form.nome
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const mut = useMutation({
    mutationFn: (data: typeof form) => provision({ data }),
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
        <Select value={form.plan_code} onValueChange={(v: any) => set("plan_code", v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PLAN_OPTIONS.map((p) => (
              <SelectItem key={p.code} value={p.code}>
                {p.label}
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

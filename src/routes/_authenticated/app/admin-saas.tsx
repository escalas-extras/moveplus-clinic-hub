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
import { listClinics, createClinic, toggleClinicActive } from "@/lib/api/clinics-admin.functions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Building2, Plus, Power } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/admin-saas")({
  beforeLoad: async () => {
    const { data: sess } = await supabase.auth.getUser();
    if (!sess.user) throw redirect({ to: "/auth" });
    const { data: ok } = await supabase.rpc("has_role", { _user_id: sess.user.id, _role: "super_admin" });
    if (!ok) throw redirect({ to: "/app" });
  },
  component: AdminSaasPage,
});

function AdminSaasPage() {
  const fetchClinics = useServerFn(listClinics);
  const createFn = useServerFn(createClinic);
  const toggleFn = useServerFn(toggleClinicActive);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: clinics, isLoading } = useQuery({
    queryKey: ["admin-saas-clinics"],
    queryFn: () => fetchClinics(),
  });

  const create = useMutation({
    mutationFn: (data: any) => createFn({ data }),
    onSuccess: () => { toast.success("Clínica criada"); setOpen(false); qc.invalidateQueries({ queryKey: ["admin-saas-clinics"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: (data: { id: string; active: boolean }) => toggleFn({ data }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-saas-clinics"] }),
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Building2 className="h-6 w-6" /> Admin SaaS</h1>
            <p className="text-muted-foreground text-sm">Gestão de clínicas no FisioOS</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> Nova clínica</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Nova clínica</DialogTitle></DialogHeader>
              <ClinicForm onSubmit={(d) => create.mutate(d)} loading={create.isPending} />
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader><CardTitle>Clínicas</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> : (
              <div className="space-y-2">
                {(clinics ?? []).map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between border rounded-md p-3">
                    <div>
                      <div className="font-medium">{c.nome}</div>
                      <div className="text-xs text-muted-foreground flex gap-2 items-center">
                        <span>/{c.slug}</span>
                        <Badge variant="outline">{c.plan}</Badge>
                        <span>{c.member_count} membro(s)</span>
                      </div>
                    </div>
                    <div className="flex gap-2 items-center">
                      <Badge variant={c.active ? "default" : "secondary"}>{c.active ? "Ativa" : "Inativa"}</Badge>
                      <Button size="sm" variant="outline" onClick={() => toggle.mutate({ id: c.id, active: !c.active })}>
                        <Power className="h-4 w-4 mr-1" /> {c.active ? "Inativar" : "Ativar"}
                      </Button>
                    </div>
                  </div>
                ))}
                {(clinics ?? []).length === 0 && <p className="text-sm text-muted-foreground">Nenhuma clínica.</p>}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

function ClinicForm({ onSubmit, loading }: { onSubmit: (d: any) => void; loading: boolean }) {
  const [form, setForm] = useState({
    nome: "", slug: "", plan: "starter",
    nome_fantasia: "", razao_social: "", cnpj: "",
    cidade: "", estado: "", primary_color: "", secondary_color: "",
    owner_email: "",
  });
  const set = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }));
  const slugify = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        const payload: any = { ...form };
        for (const k of Object.keys(payload)) if (payload[k] === "") delete payload[k];
        if (!payload.slug && payload.nome) payload.slug = slugify(payload.nome);
        onSubmit(payload);
      }}
    >
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2"><Label>Nome*</Label><Input value={form.nome} onChange={(e) => { set("nome", e.target.value); if (!form.slug) set("slug", slugify(e.target.value)); }} required /></div>
        <div><Label>Slug*</Label><Input value={form.slug} onChange={(e) => set("slug", e.target.value)} required /></div>
        <div>
          <Label>Plano*</Label>
          <Select value={form.plan} onValueChange={(v) => set("plan", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="starter">Starter</SelectItem>
              <SelectItem value="professional">Professional</SelectItem>
              <SelectItem value="clinic">Clinic</SelectItem>
              <SelectItem value="enterprise">Enterprise</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2"><Label>Nome fantasia</Label><Input value={form.nome_fantasia} onChange={(e) => set("nome_fantasia", e.target.value)} /></div>
        <div className="col-span-2"><Label>Razão social</Label><Input value={form.razao_social} onChange={(e) => set("razao_social", e.target.value)} /></div>
        <div><Label>CNPJ</Label><Input value={form.cnpj} onChange={(e) => set("cnpj", e.target.value)} /></div>
        <div><Label>Cidade</Label><Input value={form.cidade} onChange={(e) => set("cidade", e.target.value)} /></div>
        <div><Label>UF</Label><Input value={form.estado} onChange={(e) => set("estado", e.target.value)} maxLength={2} /></div>
        <div><Label>Cor primária</Label><Input type="color" value={form.primary_color || "#0F4C5C"} onChange={(e) => set("primary_color", e.target.value)} /></div>
        <div><Label>Cor secundária</Label><Input type="color" value={form.secondary_color || "#2BB673"} onChange={(e) => set("secondary_color", e.target.value)} /></div>
        <div className="col-span-2"><Label>Email do owner (usuário existente)</Label><Input type="email" value={form.owner_email} onChange={(e) => set("owner_email", e.target.value)} placeholder="opcional" /></div>
      </div>
      <Button type="submit" disabled={loading} className="w-full">{loading ? "Criando..." : "Criar clínica"}</Button>
    </form>
  );
}
